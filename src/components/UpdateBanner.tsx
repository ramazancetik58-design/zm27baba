import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { DOWNLOAD_CONFIG, latestApkUrl } from '../config/downloads';
import { isNewer } from '../engine/releaseInfo';
import { appStorage } from '../engine/appStorage';
import { getInstalledVersion } from '../native/androidLifecycle';
import { fetchLatestRelease } from './useLatestRelease';

const DISMISS_KEY = 'zm27_update_dismissed';

/** Yalnız APK içinde: yayınlanmış sürüm yüklü olandan yeniyse küçük bir "yeni sürüm" bandı gösterir. */
export const UpdateBanner: React.FC<{ language: 'tr' | 'en' | string }> = ({ language }) => {
  const tr = language === 'tr';
  const [latest, setLatest] = useState<{ version: string; url: string } | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let alive = true;
    const timer = window.setTimeout(async () => {
      const [installed, rel] = await Promise.all([getInstalledVersion(), fetchLatestRelease()]);
      if (!alive || rel.status !== 'ok') return;
      if (!isNewer(rel.info.version, installed)) return;
      if (appStorage.getItem(DISMISS_KEY) === rel.info.version) return;
      setLatest({ version: rel.info.version, url: rel.info.apk?.url ?? latestApkUrl(DOWNLOAD_CONFIG.githubRepo, DOWNLOAD_CONFIG.apkName) });
    }, 2500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  if (!latest) return null;
  const dismiss = () => {
    try {
      appStorage.setItem(DISMISS_KEY, latest.version);
    } catch {
      /* depolama dolu: bu oturum için kapat */
    }
    setLatest(null);
  };
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-40 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl border border-[#b7ff4a]/40 bg-[#111b21] px-4 py-2.5 text-xs text-slate-100 shadow-2xl"
    >
      <span>
        {tr ? 'Yeni sürüm hazır' : 'New version available'} <b className="font-mono-num text-[#b7ff4a]">v{latest.version}</b>
      </span>
      <a href={latest.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#b7ff4a] px-3 py-1.5 font-bold text-[#080d11]">
        {tr ? 'İndir' : 'Download'}
      </a>
      <button type="button" onClick={dismiss} aria-label={tr ? 'Kapat' : 'Dismiss'} className="cursor-pointer text-slate-400 hover:text-white">
        ✕
      </button>
    </div>
  );
};
