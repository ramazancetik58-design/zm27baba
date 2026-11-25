import { Capacitor } from '@capacitor/core';

export interface LifecycleHandlers {
  onBack: () => void;
  /** Uygulama arka plana gittiğinde: kaydı boşalt, sesi durdur. */
  onPause: () => void;
  onResume?: () => void;
}

/**
 * Android geri tuşu ve uygulama yaşam döngüsü. Tarayıcıda/önizlemede hiçbir şey yapmaz.
 * Dönen fonksiyon dinleyicileri kaldırır.
 */
export async function initAndroidLifecycle(h: LifecycleHandlers): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  const { App } = await import('@capacitor/app');
  const back = await App.addListener('backButton', () => h.onBack());
  const state = await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) h.onResume?.();
    else h.onPause();
  });
  return () => {
    void back.remove();
    void state.remove();
  };
}

/** Yüklü APK'nın sürüm adı (örn. "27.14"); tarayıcıda null. */
export async function getInstalledVersion(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    return info.version || null;
  } catch {
    return null;
  }
}

export async function exitAndroidApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { App } = await import('@capacitor/app');
  await App.exitApp();
}
