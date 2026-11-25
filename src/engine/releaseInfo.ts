/** GitHub Release verisini sürüm/boyut/indirme bilgisine çevirir; sürüm karşılaştırma. Saf mantık, test edilir. */
export interface ApkAsset {
  name: string;
  url: string;
  size: number;
  /** Varsa SHA-256 (GitHub "digest" alanı). */
  sha256?: string;
}
export interface ReleaseInfo {
  tag: string;
  version: string;
  publishedAt: string | null;
  notes: string;
  pageUrl: string;
  apk: ApkAsset | null;
}

/** 'v27.14' → [27,14]; sayısal olmayan parçalar atılır. */
export function versionParts(v: string): number[] {
  const m = v.match(/\d+/g);
  return m ? m.map(Number) : [];
}
export function compareVersions(a: string, b: string): number {
  const x = versionParts(a), y = versionParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}
/** latest, installed'dan kesin yeniyse true. Bilgi eksikse false (yanlış alarm verme). */
export function isNewer(latest: string | null | undefined, installed: string | null | undefined): boolean {
  if (!latest || !installed || versionParts(latest).length === 0 || versionParts(installed).length === 0) return false;
  return compareVersions(latest, installed) > 0;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${u[i]}`;
}

/** Sürüm notlarından kısa, işaretlemesiz satırlar (başlık/madde işaretlerini temizler). */
export function noteLines(notes: string, max = 4): string[] {
  return notes
    .split(/\r?\n/)
    .map((l) => l.replace(/^[#>\s*\-+•]+/, '').replace(/[*_`]/g, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, max);
}

export function parseRelease(json: unknown, preferredName: string): ReleaseInfo | null {
  if (!json || typeof json !== 'object') return null;
  const r = json as Record<string, unknown>;
  const tag = typeof r.tag_name === 'string' ? r.tag_name : '';
  if (!tag) return null;
  const assets = Array.isArray(r.assets) ? (r.assets as Array<Record<string, unknown>>) : [];
  const apks = assets.filter((a) => typeof a.name === 'string' && /\.apk$/i.test(a.name as string) && typeof a.browser_download_url === 'string');
  const pick = apks.find((a) => a.name === preferredName) ?? apks[0];
  let apk: ApkAsset | null = null;
  if (pick) {
    const digest = typeof pick.digest === 'string' && pick.digest.startsWith('sha256:') ? pick.digest.slice(7) : undefined;
    apk = { name: pick.name as string, url: pick.browser_download_url as string, size: typeof pick.size === 'number' ? pick.size : 0, sha256: digest };
  }
  return {
    tag,
    version: tag.replace(/^v/i, ''),
    publishedAt: typeof r.published_at === 'string' ? r.published_at : null,
    notes: typeof r.body === 'string' ? r.body : '',
    pageUrl: typeof r.html_url === 'string' ? r.html_url : '',
    apk,
  };
}
