/**
 * APK dağıtım ayarları (tek yer). APK dosyası sitenin içine gömülmez; GitHub Releases'te durur,
 * site "Son sürüm" bilgisini oradan okur. Böylece yeni APK yayınlayınca site otomatik güncellenir.
 */
export const DOWNLOAD_CONFIG = {
  /** GitHub deposu: sahip/depo */
  githubRepo: 'ramazancetik58-design/zm27baba',
  /** Release içindeki APK dosya adı (CI bu adla yükler). */
  apkName: 'zm27.apk',
  /** Sitenin adresi (paylaşım metni için). */
  siteUrl: 'https://zephyrmanager27.ai.studio',
} as const;

export const latestReleaseApi = (repo: string) => `https://api.github.com/repos/${repo}/releases/latest`;
/** GitHub'ın sabit "son sürüm" indirme bağlantısı (API erişilemezse yedek). */
export const latestApkUrl = (repo: string, name: string) => `https://github.com/${repo}/releases/latest/download/${name}`;
export const releasesPage = (repo: string) => `https://github.com/${repo}/releases/latest`;
