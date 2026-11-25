import React, { useEffect, useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { Language } from '../engine/types';
import { Capacitor } from '@capacitor/core';
import { ApkDownloadSection } from './ApkDownloadSection';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let indirHandled = false;

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    return outcome;
  };

  return {
    canPromptNatively: !!deferredPrompt,
    isInstalled,
    isIOS,
    promptInstall,
  };
}

interface PWAInstallButtonProps {
  language: Language;
  compact?: boolean;
  onOpenMobileGuide?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  language,
  compact = false,
  onOpenMobileGuide,
}) => {
  const tr = language === 'tr';
  const { canPromptNatively, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showHelper, setShowHelper] = useState(false);

  // Paylaşılabilir doğrudan bağlantı: siteadresi/#indir indirme penceresini açar (oturumda bir kez).
  useEffect(() => {
    if (!indirHandled && typeof window !== 'undefined' && window.location.hash === '#indir') {
      indirHandled = true;
      setShowHelper(true);
    }
  }, []);

  if (isInstalled || Capacitor.isNativePlatform()) {
    return null; // PWA/APK olarak zaten kurulu
  }

  const handleClick = async () => {
    if (canPromptNatively) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') return;
    }
    setShowHelper(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0a1128] border border-[#00e5ff]/40 text-[#00e5ff] hover:bg-[#00e5ff]/10 text-[11px] font-semibold cursor-pointer transition-colors shrink-0'
            : 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0a1128] border border-[#00e5ff]/45 text-[#00e5ff] hover:bg-[#00e5ff]/15 text-xs font-semibold cursor-pointer transition-colors'
        }
      >
        {canPromptNatively ? <Download className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
        <span>
          {canPromptNatively
            ? tr
              ? 'Mobil Uygulamayı Yükle'
              : 'Install App'
            : tr
            ? 'Mobil / APK Kurulumu'
            : 'Mobile / APK'}
        </span>
      </button>

      {showHelper && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111b21] border border-[#00e5ff]/35 p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  {tr ? 'Mobil Kurulum & Android APK' : 'Mobile PWA & Android APK'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {tr
                    ? 'Telefonuna uygulama gibi kurabilir veya Android APK dosyasını indirebilirsin.'
                    : 'Install as a standalone mobile app or download the Android APK.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelper(false)}
                className="p-1.5 rounded-lg bg-[#080d11] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="p-3 rounded-xl bg-[#080d11] border border-white/10 text-xs text-slate-200 space-y-1.5">
                <div className="font-semibold text-[#00e5ff]">
                  {tr ? 'iPhone / iPad (Safari):' : 'iPhone / iPad (Safari):'}
                </div>
                <p>
                  {tr
                    ? '1. Alt menüdeki Paylaş (Share) simgesine dokunun.'
                    : '1. Tap the Share button in Safari toolbar.'}
                </p>
                <p>
                  {tr
                    ? '2. "Ana Ekrana Ekle" (Add to Home Screen) seçeneğini seçin.'
                    : '2. Select "Add to Home Screen".'}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#080d11] border border-white/10 text-xs text-slate-200 space-y-1.5">
                <div className="font-semibold text-[#00e5ff]">
                  {tr ? 'Android / Chrome Mobil Uygulama (PWA):' : 'Android / Chrome Web App (PWA):'}
                </div>
                <p>
                  {tr
                    ? 'Chrome sağ üst (⋮) menüsünden "Uygulamayı Yükle" veya "Ana Ekrana Ekle" seçeneğine dokunarak tam ekran kurabilirsiniz.'
                    : 'Open Chrome menu (⋮) and tap "Install App" or "Add to Home Screen".'}
                </p>
              </div>
            )}

            {!isIOS && <ApkDownloadSection language={language} />}

            <div className="flex justify-end gap-2">
              {onOpenMobileGuide && (
                <button
                  type="button"
                  onClick={() => {
                    setShowHelper(false);
                    onOpenMobileGuide();
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#080d11] border border-white/15 text-xs text-white cursor-pointer"
                >
                  {tr ? 'Detaylı Kılavuzu Aç' : 'Open Full Guide'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowHelper(false)}
                className="px-4 py-2 rounded-lg bg-[#b7ff4a] text-[#080d11] font-display font-bold text-xs cursor-pointer"
              >
                {tr ? 'Anladım' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ language: Language }> = ({ language }) => {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-3 right-3 z-50 px-3 py-2 rounded-lg bg-[#111b21] border border-amber-400/50 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-xl">
      <WifiOff className="w-3.5 h-3.5" />
      <span>
        {language === 'tr'
          ? 'Çevrimdışı Mod — Yerel kariyer verisi aktif'
          : 'Offline Mode — Local career data active'}
      </span>
    </div>
  );
};
