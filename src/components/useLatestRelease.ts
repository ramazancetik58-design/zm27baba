import { useEffect, useState } from 'react';
import { DOWNLOAD_CONFIG, latestReleaseApi } from '../config/downloads';
import { parseRelease, type ReleaseInfo } from '../engine/releaseInfo';

export type ReleaseState =
  | { status: 'loading' }
  | { status: 'ok'; info: ReleaseInfo }
  /** Depoda henüz yayın yok. */
  | { status: 'none' }
  | { status: 'error' };

let cache: Promise<ReleaseState> | null = null;

/** Son sürümü GitHub'dan okur (oturum başına bir kez; hata olursa tekrar denenebilir). */
export function fetchLatestRelease(): Promise<ReleaseState> {
  if (!cache) {
    cache = (async (): Promise<ReleaseState> => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(latestReleaseApi(DOWNLOAD_CONFIG.githubRepo), {
          signal: ctrl.signal,
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (res.status === 404) return { status: 'none' };
        if (!res.ok) return { status: 'error' };
        const info = parseRelease(await res.json(), DOWNLOAD_CONFIG.apkName);
        return info ? { status: 'ok', info } : { status: 'error' };
      } catch {
        return { status: 'error' };
      } finally {
        clearTimeout(timer);
      }
    })().then((s) => {
      if (s.status === 'error') cache = null; // sonraki açılışta yeniden dene
      return s;
    });
  }
  return cache;
}

export function useLatestRelease(enabled = true): ReleaseState {
  const [state, setState] = useState<ReleaseState>({ status: 'loading' });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void fetchLatestRelease().then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return state;
}
