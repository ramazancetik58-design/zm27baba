import React, { useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { DOWNLOAD_CONFIG, latestApkUrl, releasesPage } from '../config/downloads';
import { formatBytes, noteLines } from '../engine/releaseInfo';
import { useLatestRelease } from './useLatestRelease';
import { Capacitor } from '@capacitor/core';

/** "Android APK indir" bölümü: son sürümü GitHub Releases'ten okur, indirme düğmesi + kurulum adımları gösterir. */
export const ApkDownloadSection: React.FC<{ language: 'tr' | 'en' | string }> = ({ language }) => {
  const tr = language === 'tr';
  const native = Capacitor.isNativePlatform();
  const state = useLatestRelease(!native);
  const [copied, setCopied] = useState(false);
  if (native) return null; // APK içindeyken APK indirmeye gerek yok

  const fallbackUrl = latestApkUrl(DOWNLOAD_CONFIG.githubRepo, DOWNLOAD_CONFIG.apkName);
  const info = state.status === 'ok' ? state.info : null;
  const url = info?.apk?.url ?? fallbackUrl;
  const canDownload = state.status === 'ok' ? !!info?.apk : state.status === 'error';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(DOWNLOAD_CONFIG.siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* pano erişimi yok: sessizce geç */
    }
  };

  return (
    <div className="p-3 rounded-xl bg-[#080d11] border border-[#b7ff4a]/25 text-xs text-slate-200 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-[#b7ff4a]">{tr ? 'Android APK İndir' : 'Download Android APK'}</div>
        {info && <span className="font-mono-num text-[11px] text-slate-400">v{info.version}</span>}
      </div>

      {state.status === 'loading' && <div className="h-9 rounded-lg bg-white/5 animate-pulse" aria-label={tr ? 'Sürüm bilgisi yükleniyor' : 'Loading'} />}

      {state.status === 'none' && (
        <p className="text-slate-400">{tr ? 'APK henüz yayınlanmadı. Çok yakında burada olacak.' : 'The APK has not been published yet. Coming soon.'}</p>
      )}

      {canDownload && (
        <a
          href={url}
          download={DOWNLOAD_CONFIG.apkName}
          rel="noopener"
          className="flex items-center justify-center gap-2 rounded-lg bg-[#b7ff4a] px-4 py-2.5 font-display text-sm font-bold text-[#080d11] hover:brightness-95"
        >
          <Download className="w-4 h-4" />
          {tr ? 'APK\'yı İndir' : 'Download APK'}
          {info?.apk && info.apk.size > 0 && <span className="font-mono-num text-xs font-semibold opacity-70">· {formatBytes(info.apk.size)}</span>}
        </a>
      )}

      {state.status === 'error' && (
        <p className="text-slate-400">
          {tr ? 'Sürüm bilgisi alınamadı; yine de son sürümü indirebilirsin. ' : 'Could not read release info; you can still download the latest build. '}
          <a className="text-[#00e5ff] underline" href={releasesPage(DOWNLOAD_CONFIG.githubRepo)} target="_blank" rel="noopener noreferrer">
            {tr ? 'Tüm sürümler' : 'All releases'}
          </a>
        </p>
      )}

      {info && noteLines(info.notes, 4).length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-slate-300">
          {noteLines(info.notes, 4).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}

      {info?.apk?.sha256 && (
        <p className="flex items-center gap-1.5 text-[10px] text-slate-500" title={info.apk.sha256}>
          <ShieldCheck className="w-3 h-3" /> SHA-256: <span className="font-mono-num">{info.apk.sha256.slice(0, 16)}…</span>
        </p>
      )}

      <ol className="list-decimal space-y-0.5 pl-4 text-slate-300">
        <li>{tr ? 'APK\'yı indirin ve dosyaya dokunun.' : 'Download the APK and tap the file.'}</li>
        <li>{tr ? 'İstenirse "Bu kaynaktan yüklemeye izin ver" seçeneğini açın.' : 'If asked, allow installing from this source.'}</li>
        <li>{tr ? 'Play Protect uyarısı çıkarsa "Yine de yükle"yi seçin.' : 'If Play Protect warns, choose "Install anyway".'}</li>
      </ol>

      <button type="button" onClick={copyLink} className="text-[11px] text-[#00e5ff] underline cursor-pointer">
        {copied ? (tr ? 'Site bağlantısı kopyalandı' : 'Site link copied') : tr ? 'Site bağlantısını kopyala (paylaşmak için)' : 'Copy site link (to share)'}
      </button>
    </div>
  );
};
