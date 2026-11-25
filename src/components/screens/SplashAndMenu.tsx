import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  HardDrive,
  Music,
  Play,
  ShieldCheck,
  Settings,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import { Language, LicenseMode, ManagerProfile } from '../../engine/types';
import { FootballHeroCanvas } from '../../three/FootballHeroCanvas';
import { ManagerPortraitSvg, ZephyrManagerShieldSvg, ZephyrStudioGoldSvg } from '../BrandArt';
import { PWAInstallButton } from '../PwaControls';
import { UpdateBanner } from '../UpdateBanner';
import { frameAt, introSteps, type IntroFrame } from '../introTimeline';

/**
 * Açılış: Zephyr Studio logosu → Zephyr Manager logosu, yumuşak belirip kaybolur.
 * Dokunma / Enter / Boşluk / Esc ile geçilir. Görseller yüklenmeden başlamaz (ilk logo geç belirmesin).
 */
export const SplashScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const reduced = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const steps = useMemo(() => introSteps(reduced), [reduced]);
  const [frame, setFrame] = useState<IntroFrame>(() => frameAt(0, steps, reduced));
  const [showHint, setShowHint] = useState(false);
  const doneRef = useRef(false);
  const skipRef = useRef<{ at: number; from: number } | null>(null);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  const skip = useCallback(() => {
    if (!skipRef.current) skipRef.current = { at: performance.now(), from: -1 };
  }, []);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    let start = 0;
    let latest = frameAt(0, steps, reduced);
    // Görselleri önceden yükle (en fazla 1,5 sn bekle)
    const loads = steps.map(
      (st) =>
        new Promise<void>((res) => {
          const img = new Image();
          img.onload = img.onerror = () => res();
          img.src = st.src;
        })
    );
    const timeout = new Promise<void>((res) => window.setTimeout(res, 1500));
    void Promise.race([Promise.all(loads).then(() => undefined), timeout]).then(() => {
      if (cancelled) return;
      start = performance.now();
      const tick = () => {
        if (cancelled) return;
        const now = performance.now();
        const sk = skipRef.current;
        if (sk) {
          if (sk.from < 0) sk.from = latest.opacity;
          const k = Math.min(1, (now - sk.at) / 260);
          setFrame({ ...latest, opacity: sk.from * (1 - k) });
          if (k >= 1) return finish();
        } else {
          latest = frameAt(now - start, steps, reduced);
          setFrame(latest);
          if (latest.done) return finish();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    const hint = window.setTimeout(() => setShowHint(true), 1400);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(hint);
      window.removeEventListener('keydown', onKey);
    };
  }, [steps, reduced, finish, skip]);

  const step = steps[frame.index];
  return (
    <div
      onClick={skip}
      role="button"
      tabIndex={0}
      aria-label={`${step.alt} — geçmek için dokun`}
      className="fixed inset-0 z-50 flex cursor-pointer select-none items-center justify-center overflow-hidden"
      style={{ background: frame.bg }}
    >
      <img
        key={step.id}
        src={step.src}
        alt={step.alt}
        draggable={false}
        style={{
          width: 'min(82vmin, 680px)',
          height: 'min(82vmin, 680px)',
          objectFit: 'contain',
          opacity: frame.opacity,
          transform: `scale(${frame.scale})`,
          willChange: 'opacity, transform',
          // Görselin vinyet kenarları zeminle kaynaşsın
          WebkitMaskImage: 'radial-gradient(closest-side, #000 80%, transparent 100%)',
          maskImage: 'radial-gradient(closest-side, #000 80%, transparent 100%)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute', left: '18%', right: '18%', bottom: 'max(28px, env(safe-area-inset-bottom))',
          height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.10)', overflow: 'hidden',
        }}
      >
        <div style={{ width: `${frame.progress * 100}%`, height: '100%', background: 'rgba(0,229,255,0.65)' }} />
      </div>
      <p
        aria-hidden
        style={{
          position: 'absolute', bottom: 'max(44px, calc(env(safe-area-inset-bottom) + 16px))', fontSize: 11,
          letterSpacing: '0.22em', color: 'rgba(226,232,240,0.55)', opacity: showHint ? frame.opacity : 0,
          transition: 'opacity 400ms',
        }}
      >
        GEÇMEK İÇİN DOKUN
      </p>
    </div>
  );
};

interface MainMenuScreenProps {
  hasCareer: boolean;
  activeClubName?: string | null;
  unemployed?: boolean;
  manager: ManagerProfile;
  managerConfigured: boolean;
  licenseMode: LicenseMode;
  language: Language;
  muted: boolean;
  menuMusicEnabled: boolean;
  onToggleMute: () => void;
  onToggleMenuMusic: () => void;
  onStartCareer: () => void;
  onOpenManagerSetup: () => void;
  onSelectClub: () => void;
  onOpenSaveSlots: () => void;
  onOpenGuide: () => void;
  onOpenLicense: () => void;
  onOpenSettings: () => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({
  hasCareer,
  activeClubName,
  unemployed,
  manager,
  managerConfigured,
  licenseMode,
  language,
  muted,
  menuMusicEnabled,
  onToggleMute,
  onToggleMenuMusic,
  onStartCareer,
  onOpenManagerSetup,
  onSelectClub,
  onOpenSaveSlots,
  onOpenGuide,
  onOpenLicense,
  onOpenSettings,
}) => {
  useEffect(() => {
    const unlockAndPlay = () => {
      soundEngine.unlock();
      if (!muted && menuMusicEnabled) {
        soundEngine.startMenuMusic();
      }
    };
    unlockAndPlay();
    window.addEventListener('pointerdown', unlockAndPlay, { once: true });
    window.addEventListener('keydown', unlockAndPlay, { once: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
        e.preventDefault();
        if (managerConfigured) onStartCareer();
        else onOpenManagerSetup();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', unlockAndPlay);
      window.removeEventListener('keydown', unlockAndPlay);
      window.removeEventListener('keydown', onKey);
    };
  }, [muted, menuMusicEnabled, managerConfigured, onStartCareer, onOpenManagerSetup]);

  const tr = language === 'tr';

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#080d11]">
      {/* Isolated 3D Spinning Football Centerpiece */}
      <FootballHeroCanvas />

      {/* Directional gradient scrim */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(8,13,17,0.95) 0%, rgba(8,13,17,0.8) 44%, rgba(8,13,17,0.14) 78%, rgba(8,13,17,0.45) 100%)',
        }}
      />

      {/* Top-right compact audio, PWA & music controls */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20 flex flex-wrap items-center justify-end gap-2">
        <PWAInstallButton language={language} compact onOpenMobileGuide={onOpenGuide} />
        <UpdateBanner language={language} />
        <span className="text-xs font-medium tracking-wider text-slate-300 hidden md:inline">
          {licenseMode === 'FULL_LICENSE'
            ? tr
              ? 'Lisans: Full Lisans'
              : 'License: Full'
            : tr
            ? 'Lisans: No Data'
            : 'License: No Data'}
        </span>
        <button
          type="button"
          onClick={onToggleMenuMusic}
          aria-label={menuMusicEnabled ? 'Menü Müziğini Kapat' : 'Menü Müziğini Aç'}
          title={tr ? 'Menü Müziği' : 'Menu Ambient'}
          className={`h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg bg-[#111b21] border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
            menuMusicEnabled && !muted
              ? 'border-[#00e5ff]/60 text-[#00e5ff]'
              : 'border-white/10 text-slate-400 hover:text-white'
          }`}
        >
          <Music className="w-4 h-4" />
          <span className="hidden sm:inline">
            {menuMusicEnabled ? (tr ? 'Müzik Açık' : 'Music On') : tr ? 'Müzik Kapalı' : 'Music Off'}
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Sesi Aç' : 'Sesi Kapat'}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#111b21] border border-white/10 flex items-center justify-center text-slate-200 hover:border-[#b7ff4a] hover:text-[#b7ff4a] transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Left-Third Title Lockup & Menu Actions */}
      <div className="relative z-10 h-full max-w-xl px-5 sm:px-14 flex flex-col justify-center overflow-y-auto no-scrollbar py-6 sm:py-10">
        <div className="mb-4 sm:mb-5 flex flex-col items-start">
          <ZephyrManagerShieldSvg size={72} showWordmark={false} />
          <h1 className="mt-3 font-display font-bold text-2xl sm:text-4xl tracking-tight text-white">
            ZEPHYR MANAGER <span className="text-[#00e5ff]">27</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed">
            {tr
              ? 'Ultimate Hardcore 3D Edition — Süper Lig, 1. Lig, 2. Lig (Beyaz/Kırmızı), Premier League, La Liga ve Serie A ile çoklu lig kariyerini yönet.'
              : 'Ultimate Hardcore 3D Edition — Manage multi-league careers across Türkiye (1–3), Premier League, La Liga & Serie A.'}
          </p>
        </div>

        {managerConfigured && (
          <div className="mb-4 p-3 rounded-xl bg-[#111b21]/95 border border-white/10 flex items-center gap-3 max-w-xs">
            <ManagerPortraitSvg
              appearance={manager.appearance}
              photoUrl={manager.customPhotoDataUrl}
              size={44}
            />
            <div className="min-w-0">
              <div className="font-display font-bold text-sm text-white truncate">
                {manager.firstName} {manager.lastName}
              </div>
              <div className="text-[11px] text-[#00e5ff] truncate">
                {activeClubName
                  ? activeClubName
                  : unemployed
                  ? tr
                    ? 'Kulüpsüz (İş Piyasası)'
                    : 'Unemployed'
                  : tr
                  ? 'Kulüp Seçilmedi'
                  : 'No Club Selected'}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          {managerConfigured ? (
            <button
              type="button"
              data-start="true"
              onClick={onStartCareer}
              className="w-full py-3.5 px-5 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-base tracking-wide flex items-center justify-between transition-transform active:scale-[0.98] cursor-pointer"
            >
              <span>
                {hasCareer
                  ? tr
                    ? 'Kariyere Devam Et'
                    : 'Continue Career'
                  : tr
                  ? 'Kariyer Paneline Gir'
                  : 'Enter Career Hub'}
              </span>
              <Play className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onOpenManagerSetup}
              className="w-full py-3.5 px-5 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-base tracking-wide flex items-center justify-between transition-transform active:scale-[0.98] cursor-pointer"
            >
              <span>{tr ? 'Yeni Menajer & Kariyer Kur' : 'Create Manager & Start'}</span>
              <UserPlus className="w-4 h-4" />
            </button>
          )}

          {managerConfigured && (
            <button
              type="button"
              onClick={onOpenManagerSetup}
              className="w-full py-2.5 px-5 rounded-lg bg-[#111b21] hover:bg-[#17252e] border border-white/10 text-slate-100 font-medium text-sm flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>{tr ? 'Yeni Menajer Oluştur' : 'New Manager Profile'}</span>
              <Briefcase className="w-4 h-4 text-[#b7ff4a]" />
            </button>
          )}

          <button
            type="button"
            onClick={onSelectClub}
            className="w-full py-2.5 px-5 rounded-lg bg-[#111b21] hover:bg-[#17252e] border border-white/10 text-slate-100 font-medium text-sm flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>{tr ? 'Kulüp Seçimi / İşsiz Başla' : 'Club Select / Unemployed'}</span>
            <Users className="w-4 h-4 text-[#00e5ff]" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenSaveSlots}
              className="py-2.5 px-3 rounded-lg bg-[#111b21] hover:bg-[#17252e] border border-white/10 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <HardDrive className="w-3.5 h-3.5 text-[#b7ff4a]" />
              <span>{tr ? 'Kayıt Yuvaları' : 'Save Slots'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenGuide}
              className="py-2.5 px-3 rounded-lg bg-[#111b21] hover:bg-[#17252e] border border-white/10 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>{tr ? 'Kılavuz' : 'Guide'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenLicense}
              className="py-2.5 px-3 rounded-lg bg-[#111b21] hover:bg-[#17252e] border border-white/10 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>{tr ? 'Lisans' : 'License'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="py-2.5 px-3 rounded-lg bg-[#111b21] hover:bg-[#17252e] border border-white/10 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>{tr ? 'Ayarlar' : 'Settings'}</span>
            </button>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400 tracking-wide">
          {tr
            ? 'Enter / Space Başlat · Fare Sürükle 3D Topu Döndür · Esc Ana Menü'
            : 'Enter / Space Start · Drag to Spin 3D Ball · Esc Main Menu'}
        </p>
      </div>
    </div>
  );
};
