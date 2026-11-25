import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Camera,
  Check,
  CheckCircle2,
  Globe2,
  ImagePlus,
  Move3d,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import { getLeagueLabel, LEAGUE_CATALOG } from '../../engine/database';
import { validateLicenseCode } from '../../engine/hardcoreRules';
import {
  FacialHair,
  Language,
  LeagueId,
  LicenseMode,
  ManagerOutfit,
  ManagerPersonality,
  ManagerProfile,
  PlayerHairStyle,
  ViewDimensionMode,
} from '../../engine/types';
import { Manager3DPreviewCanvas, ManagerCamPreset } from '../../three/Manager3DPreviewCanvas';
import { ManagerPortraitSvg } from '../BrandArt';

interface ManagerSetupScreenProps {
  initialManager: ManagerProfile;
  leagueId: LeagueId;
  activeLeagues: LeagueId[];
  licenseMode: LicenseMode;
  language: Language;
  onSwitchLeague: (leagueId: LeagueId) => void;
  onToggleActiveLeague: (leagueId: LeagueId) => void;
  onActivateLicense: (mode: LicenseMode) => void;
  onCompleteSetup: (profile: ManagerProfile, startMode: 'CLUB_SELECT' | 'UNEMPLOYED') => void;
  onBack: () => void;
}

const COUNTRIES = [
  'Türkiye',
  'Almanya',
  'İngiltere',
  'İspanya',
  'İtalya',
  'Fransa',
  'Portekiz',
  'Hollanda',
  'Brezilya',
  'Arjantin',
];

const SKIN_TONES = ['#f4ccb0', '#eac09e', '#d9a67c', '#b88258', '#8d5524', '#5c3416'];
const HAIR_COLORS = ['#111827', '#3b2416', '#784822', '#caa14b', '#94a3b8'];
const HAIR_STYLES: Array<{ id: PlayerHairStyle; labelTr: string; labelEn: string }> = [
  { id: 'SHORT', labelTr: 'Kısa', labelEn: 'Short' },
  { id: 'FADE', labelTr: 'Fade', labelEn: 'Fade' },
  { id: 'CURLY', labelTr: 'Kıvırcık', labelEn: 'Curly' },
  { id: 'MOHAWK', labelTr: 'Mohawk', labelEn: 'Mohawk' },
  { id: 'PONYTAIL', labelTr: 'At Kuyruğu', labelEn: 'Ponytail' },
  { id: 'AFRO', labelTr: 'Afro', labelEn: 'Afro' },
  { id: 'BALD', labelTr: 'Kel', labelEn: 'Bald' },
];

const PERSONALITIES: Array<{
  id: ManagerPersonality;
  titleTr: string;
  titleEn: string;
  descTr: string;
  descEn: string;
  accent: string;
}> = [
  {
    id: 'DESPOT',
    titleTr: 'Despot / Otoriter',
    titleEn: 'Strict Disciplinarian',
    descTr: 'Sert ve tavizsiz. Devre arası öfkeli konuşmalarda takıma ekstra hırs (+1.5 güç) verir.',
    descEn: 'Uncompromising authority. Aggressive team talks grant extra tactical fire (+1.5).',
    accent: '#ef4444',
  },
  {
    id: 'ENCOURAGING',
    titleTr: 'Cesaretlendirici',
    titleEn: 'Motivational Mentor',
    descTr: 'Oyuncu dostu lider. Moral & coşkulu konuşmalarda yüksek bonus (+9 moral) sağlar.',
    descEn: 'Players love playing for you. Passionate talks surge morale and cohesion.',
    accent: '#b7ff4a',
  },
  {
    id: 'TACTICIAN',
    titleTr: 'Taktik Dehası',
    titleEn: 'Master Tactician',
    descTr: 'Saha içi yerleşim uzmanı. Taktiksel konuşmalarda (+1.8 güç) ve iş görüşmelerinde avantajlı.',
    descEn: 'Positional specialist. Tactical briefings boost discipline and on-pitch strength.',
    accent: '#00e5ff',
  },
  {
    id: 'NEGOTIATOR',
    titleTr: 'Kurt Pazarlıkçı',
    titleEn: 'Master Negotiator',
    descTr: 'Finans & transfer kurdu. İnatçı kulüplerin bonservis/maaş taleplerini %7 aşağı çeker.',
    descEn: 'Boardroom shark. Cuts stubborn selling-club transfer and wage demands by 7%.',
    accent: '#f59e0b',
  },
];

function drawSquareAvatarToDataUrl(
  source: HTMLImageElement | HTMLVideoElement,
  srcWidth: number,
  srcHeight: number
): string | null {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx || srcWidth === 0 || srcHeight === 0) return null;

  const side = Math.min(srcWidth, srcHeight);
  const sx = (srcWidth - side) / 2;
  const sy = (srcHeight - side) / 2;
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.8);
}

export const ManagerSetupScreen: React.FC<ManagerSetupScreenProps> = ({
  initialManager,
  leagueId,
  activeLeagues,
  licenseMode,
  language,
  onSwitchLeague,
  onToggleActiveLeague,
  onActivateLicense,
  onCompleteSetup,
  onBack,
}) => {
  const tr = language === 'tr';
  const [profile, setProfile] = useState<ManagerProfile>(initialManager);
  const [studioMode, setStudioMode] = useState<ViewDimensionMode>(initialManager.studioViewMode ?? '3D');
  const [cameraPreset, setCameraPreset] = useState<ManagerCamPreset>('FULL');
  const [licenseCode, setLicenseCode] = useState('');
  const [licenseMsg, setLicenseMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleOpenCamera = async () => {
    setCameraError(null);
    setPhotoFeedback(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        tr
          ? 'Bu tarayıcıda canlı kamera desteklenmiyor. "Resim Ekle" ile cihazınızdan fotoğraf yükleyebilirsiniz.'
          : 'Camera capture is unavailable in this browser. Use Upload Photo instead.'
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 512 }, height: { ideal: 512 } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(
        tr
          ? 'Kamera izni verilmedi veya cihazda kamera bulunamadı. "Resim Ekle" butonunu kullanabilirsiniz.'
          : 'Camera access denied or no camera detected. Use Upload Image instead.'
      );
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const dataUrl = drawSquareAvatarToDataUrl(video, video.videoWidth, video.videoHeight);
    if (dataUrl) {
      soundEngine.playSuccess();
      setProfile((prev) => ({ ...prev, customPhotoDataUrl: dataUrl, studioViewMode: '2D' }));
      setStudioMode('2D');
      setPhotoFeedback(tr ? 'Kamera fotoğrafı menajer profiline eklendi!' : 'Camera photo saved!');
    }
    stopCamera();
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCameraError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const img = new Image();
      img.onload = () => {
        const dataUrl = drawSquareAvatarToDataUrl(img, img.width, img.height);
        if (dataUrl) {
          soundEngine.playSuccess();
          setProfile((prev) => ({ ...prev, customPhotoDataUrl: dataUrl, studioViewMode: '2D' }));
          setStudioMode('2D');
          setPhotoFeedback(tr ? 'Fotoğraf yüklendi ve profil resminiz güncellendi.' : 'Photo uploaded successfully.');
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCode = () => {
    if (validateLicenseCode(licenseCode)) {
      soundEngine.playSuccess();
      onActivateLicense('FULL_LICENSE');
      setLicenseMsg(tr ? 'Full Lisans (ZEPHYR-FULL) aktif!' : 'Full License activated!');
    } else {
      soundEngine.playReject();
      setLicenseMsg(tr ? 'Geçersiz kod (ZEPHYR-FULL deneyin).' : 'Invalid code (try ZEPHYR-FULL).');
    }
  };

  const canContinue = profile.firstName.trim().length > 0 && profile.lastName.trim().length > 0;
  const activeTrait = PERSONALITIES.find((p) => p.id === profile.personality);

  return (
    <div className="min-h-screen bg-[#080d11] text-slate-100 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onBack();
              }}
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{tr ? 'Ana Menüye Dön' : 'Back to Main Menu'}</span>
            </button>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
              {tr ? '3D & 2D Menajer Stüdyosu & Çoklu Lig Kurulumu' : '3D & 2D Manager Studio & Multi-League Setup'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {tr
                ? 'Menajerini 3D veya 2D stüdyoda tasarla, cihazından resim ekle ya da kameradan fotoğraf çek; kariyerinde aktif olacak ligleri seç.'
                : 'Design your manager in 3D or 2D, upload/capture your photo, and pick active leagues.'}
            </p>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#111b21] border border-white/10 text-xs">
            <span className="text-slate-400">{tr ? 'Ana Lig: ' : 'Primary: '}</span>
            <span className="font-display font-bold text-[#b7ff4a]">{getLeagueLabel(leagueId)}</span>
            <span className="text-slate-500 mx-2">·</span>
            <span className="text-[#00e5ff] font-mono-num font-bold">
              {activeLeagues.length}/{LEAGUE_CATALOG.length} {tr ? 'Lig Aktif' : 'Active'}
            </span>
          </div>
        </div>

        {/* Multi-League Selection Strip */}
        <div className="rounded-xl bg-[#111b21] border border-white/10 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Globe2 className="w-4 h-4 text-[#00e5ff]" />
              <span>
                {tr
                  ? 'Çoklu Lig Kariyer Seçimi (Simüle edilecek ligleri işaretle & Başlangıç ligini seç)'
                  : 'Multi-League Career Start (Select leagues to simulate concurrently & pick primary league)'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {tr
                ? 'Aktif tüm liglerin puan durumu & fikstürleri her hafta canlı işlenir.'
                : 'All active leagues simulate matches & tables every week.'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {LEAGUE_CATALOG.map((l) => {
              const isPrimary = leagueId === l.id;
              const isActive = activeLeagues.includes(l.id);
              return (
                <div
                  key={l.id}
                  className={`p-2.5 rounded-xl border transition-colors flex flex-col justify-between gap-2 ${
                    isPrimary
                      ? 'bg-[#0a1128] border-[#b7ff4a]'
                      : isActive
                      ? 'bg-[#080d11] border-[#00e5ff]/45'
                      : 'bg-[#080d11]/70 border-white/10 opacity-75'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onSwitchLeague(l.id);
                    }}
                    className="text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display font-bold text-xs text-white truncate">
                        {l.shortName}
                      </span>
                      {isPrimary && (
                        <span className="px-1.5 py-0.5 rounded bg-[#b7ff4a] text-[#080d11] text-[9px] font-bold">
                          ANA
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {tr ? l.countryTr : l.countryEn}
                    </div>
                    <div className="text-[10px] font-mono-num text-slate-300 mt-1">
                      {l.teams}T · {l.weeks}H
                    </div>
                  </button>

                  <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                    <button
                      type="button"
                      disabled={isPrimary}
                      onClick={() => {
                        soundEngine.playClick();
                        onToggleActiveLeague(l.id);
                      }}
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold cursor-pointer disabled:cursor-default ${
                        isActive ? 'text-[#00e5ff]' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          isActive
                            ? 'bg-[#00e5ff] border-[#00e5ff] text-[#080d11]'
                            : 'border-slate-600'
                        }`}
                      >
                        {isActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      <span>{isActive ? (tr ? 'Aktif' : 'Active') : tr ? 'Ekle' : 'Add'}</span>
                    </button>

                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onSwitchLeague(l.id);
                        }}
                        className="text-[10px] text-slate-400 hover:text-[#b7ff4a] cursor-pointer"
                      >
                        {tr ? 'Ana Lig Yap' : 'Set Primary'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Live Interactive 3D / 2D Manager Studio + Photo/Camera */}
          <div className="lg:col-span-5 rounded-xl bg-[#111b21] border border-white/10 overflow-hidden flex flex-col">
            {/* Top Toolbar: 3D / 2D + Photo Upload + Camera */}
            <div className="p-3 border-b border-white/10 bg-[#0d151b] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080d11] border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setStudioMode('3D');
                    setProfile((prev) => ({ ...prev, studioViewMode: '3D' }));
                  }}
                  className={`px-3 py-1 rounded text-xs font-display font-bold cursor-pointer transition-colors ${
                    studioMode === '3D' ? 'bg-[#b7ff4a] text-[#080d11]' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  3D
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setStudioMode('2D');
                    setProfile((prev) => ({ ...prev, studioViewMode: '2D' }));
                  }}
                  className={`px-3 py-1 rounded text-xs font-display font-bold cursor-pointer transition-colors ${
                    studioMode === '2D' ? 'bg-[#00e5ff] text-[#080d11]' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  2D
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  className="hidden"
                  aria-label={tr ? 'Resim Ekle' : 'Upload Image'}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-[#080d11] border border-white/15 hover:border-[#00e5ff] text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-[#00e5ff]" />
                  <span>{tr ? 'Resim Ekle' : 'Upload'}</span>
                </button>
                <button
                  type="button"
                  onClick={cameraOpen ? stopCamera : handleOpenCamera}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                    cameraOpen
                      ? 'bg-red-500/20 border-red-400/60 text-red-200'
                      : 'bg-[#080d11] border-white/15 hover:border-[#b7ff4a] text-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5 text-[#b7ff4a]" />
                  <span>{cameraOpen ? (tr ? 'Kamerayı Kapat' : 'Close Cam') : tr ? 'Fotoğraf Çek' : 'Camera'}</span>
                </button>
                {profile.customPhotoDataUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfile((prev) => ({ ...prev, customPhotoDataUrl: null }));
                      setPhotoFeedback(null);
                    }}
                    title={tr ? 'Fotoğrafı Kaldır' : 'Remove Photo'}
                    className="p-1.5 rounded-lg bg-[#080d11] border border-red-500/30 text-red-300 hover:bg-red-500/15 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {(cameraError || photoFeedback) && (
              <div
                className={`px-3.5 py-2 text-[11px] border-b ${
                  cameraError
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-[#b7ff4a]/10 border-[#b7ff4a]/30 text-[#b7ff4a]'
                }`}
              >
                {cameraError ?? photoFeedback}
              </div>
            )}

            <div className="relative flex-1 min-h-[370px] sm:min-h-[430px] bg-[#091119]">
              {cameraOpen ? (
                <div className="h-full min-h-[370px] flex flex-col items-center justify-center p-4 gap-4 bg-[#070d12]">
                  <div className="relative w-64 h-64 rounded-2xl overflow-hidden border-2 border-[#00e5ff] bg-black">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="px-4 py-2 rounded-lg bg-[#b7ff4a] text-[#080d11] font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{tr ? 'Fotoğrafı Çek & Kullan' : 'Capture & Save'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3.5 py-2 rounded-lg bg-[#111b21] border border-white/15 text-xs text-slate-300 flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{tr ? 'İptal' : 'Cancel'}</span>
                    </button>
                  </div>
                </div>
              ) : studioMode === '2D' ? (
                <div className="h-full min-h-[370px] p-6 flex flex-col items-center justify-center text-center gap-4 bg-gradient-to-b from-[#0b1523] to-[#080d11]">
                  <div className="relative">
                    <ManagerPortraitSvg
                      appearance={profile.appearance}
                      photoUrl={profile.customPhotoDataUrl}
                      size={148}
                    />
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-[#0a1128] border border-[#00e5ff]/50 text-[10px] font-mono-num font-bold text-[#00e5ff] whitespace-nowrap">
                      {profile.customPhotoDataUrl
                        ? tr
                          ? 'ÖZEL FOTOĞRAF'
                          : 'CUSTOM PHOTO'
                        : tr
                        ? '2D PORTRE KARTI'
                        : '2D PORTRAIT'}
                    </span>
                  </div>

                  <div className="space-y-1 max-w-xs mt-1">
                    <div className="font-display font-bold text-xl text-white">
                      {profile.firstName.trim() || (tr ? 'Yeni' : 'New')}{' '}
                      {profile.lastName.trim() || (tr ? 'Menajer' : 'Manager')}
                    </div>
                    <div className="text-xs text-slate-300">
                      {profile.nationality} · {profile.age} {tr ? 'Yaş' : 'yrs'}
                    </div>
                    {activeTrait && (
                      <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-lg bg-[#111b21] border border-white/10 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeTrait.accent }} />
                        <span className="font-semibold text-white">
                          {tr ? activeTrait.titleTr : activeTrait.titleEn}
                        </span>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 pt-2">
                      {tr
                        ? 'Yüklediğiniz fotoğraf veya 2D avatar; menü, basın toplantısı ve maç günü soyunma odası konuşmalarında otomatik kullanılır.'
                        : 'Your uploaded photo or 2D avatar automatically syncs across menus, press, and matchday team talks.'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Manager3DPreviewCanvas
                    appearance={profile.appearance}
                    personality={profile.personality}
                    age={profile.age}
                    cameraPreset={cameraPreset}
                  />

                  <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between gap-3">
                    <div className="rounded-lg bg-[#080d11]/92 border border-white/10 px-3.5 py-2.5">
                      <div className="text-[11px] font-mono-num text-[#00e5ff]">
                        {tr ? '3D TEKNİK DİREKTÖR MODELİ' : '3D MANAGER MODEL'}
                      </div>
                      <div className="font-display font-bold text-lg text-white leading-tight mt-0.5">
                        {profile.firstName.trim() || (tr ? 'Yeni' : 'New')}{' '}
                        {profile.lastName.trim() || (tr ? 'Menajer' : 'Manager')}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {profile.nationality} · {profile.age} {tr ? 'Yaş' : 'yrs'} ·{' '}
                        <span className="text-[#b7ff4a] font-semibold">
                          {activeTrait?.[tr ? 'titleTr' : 'titleEn']}
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#080d11]/92 border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300">
                      <Move3d className="w-3.5 h-3.5 text-[#00e5ff]" />
                      <span>{tr ? '360° Döndür' : 'Drag 360°'}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080d11]/92 border border-white/10">
                      <Camera className="w-3.5 h-3.5 text-slate-400 mx-1.5" />
                      {(
                        [
                          ['FULL', tr ? 'Tam Boy' : 'Full Body'],
                          ['HEAD', tr ? 'Yüz & Saç' : 'Close-Up'],
                          ['SIDE', tr ? 'Yan Profil' : 'Profile'],
                        ] as Array<[ManagerCamPreset, string]>
                      ).map(([preset, lbl]) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setCameraPreset(preset);
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer whitespace-nowrap transition-colors ${
                            cameraPreset === preset
                              ? 'bg-[#b7ff4a] text-[#080d11] font-bold'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Start Buttons under Studio Viewport */}
            <div className="p-4 border-t border-white/10 bg-[#111b21] space-y-2.5">
              {!canContinue && (
                <p className="text-[11px] text-amber-300">
                  {tr
                    ? 'Devam etmek için ad ve soyad kutularını doldurun (Örn: Arda / Turan).'
                    : 'Enter first and last name to continue (e.g. Pep / Guardiola).'}
                </p>
              )}
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => {
                  stopCamera();
                  soundEngine.playSuccess();
                  onCompleteSetup({ ...profile, studioViewMode: studioMode }, 'CLUB_SELECT');
                }}
                className="w-full py-3.5 px-5 rounded-xl bg-[#b7ff4a] hover:bg-[#c8ff70] disabled:opacity-40 text-[#080d11] font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>
                  {tr
                    ? `${getLeagueLabel(leagueId)} Kulübü Seç & Başla`
                    : `Choose ${getLeagueLabel(leagueId)} Club & Start`}
                </span>
              </button>

              <button
                type="button"
                disabled={!canContinue}
                onClick={() => {
                  stopCamera();
                  soundEngine.playClick();
                  onCompleteSetup({ ...profile, studioViewMode: studioMode }, 'UNEMPLOYED');
                }}
                className="w-full py-3 px-5 rounded-xl bg-[#080d11] hover:bg-[#17242c] disabled:opacity-40 border border-[#00e5ff]/45 text-white font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Briefcase className="w-4 h-4 text-[#00e5ff]" />
                <span>{tr ? 'Kulüpsüz (İşsiz) Başla & İş Ara' : 'Start Unemployed & Apply for Jobs'}</span>
              </button>
            </div>
          </div>

          {/* Center & Right: Identity, 3D/2D Appearance, Personality & License */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-7 rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label htmlFor="mgr-first" className="block text-slate-400 mb-1">
                    {tr ? 'Menajer Adı' : 'First Name'}
                  </label>
                  <input
                    id="mgr-first"
                    type="text"
                    value={profile.firstName}
                    placeholder={tr ? 'Örn: Arda yazabilirsiniz' : 'e.g. Pep'}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="w-full rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#b7ff4a]"
                  />
                </div>
                <div>
                  <label htmlFor="mgr-last" className="block text-slate-400 mb-1">
                    {tr ? 'Soyadı' : 'Last Name'}
                  </label>
                  <input
                    id="mgr-last"
                    type="text"
                    value={profile.lastName}
                    placeholder={tr ? 'Örn: Turan yazabilirsiniz' : 'e.g. Guardiola'}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className="w-full rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#b7ff4a]"
                  />
                </div>
                <div>
                  <label htmlFor="mgr-nat" className="block text-slate-400 mb-1">
                    {tr ? 'Ülke / Uyruk' : 'Nationality'}
                  </label>
                  <select
                    id="mgr-nat"
                    value={profile.nationality}
                    onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
                    className="w-full rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-sm text-white"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>{tr ? 'Yaş (Kırlaşma Efekti)' : 'Age'}</span>
                    <span className="font-mono-num font-bold text-[#b7ff4a]">{profile.age}</span>
                  </div>
                  <input
                    type="range"
                    min={28}
                    max={68}
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                    className="w-full accent-[#b7ff4a] mt-1.5"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 space-y-4 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00e5ff]" />
                  <span>{tr ? '3D & 2D Tip, Saç & Kıyafet Özelleştirme' : '3D & 2D Appearance Customization'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-slate-400 mb-1.5">{tr ? 'Ten Rengi' : 'Skin Tone'}</div>
                    <div className="flex gap-2">
                      {SKIN_TONES.map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() =>
                            setProfile({ ...profile, appearance: { ...profile.appearance, skinTone: tone } })
                          }
                          className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                            profile.appearance.skinTone === tone ? 'border-[#b7ff4a] scale-110' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: tone }}
                          aria-label={tone}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 mb-1.5">{tr ? 'Saç & Sakal Rengi' : 'Hair Color'}</div>
                    <div className="flex gap-2">
                      {HAIR_COLORS.map((hc) => (
                        <button
                          key={hc}
                          type="button"
                          onClick={() =>
                            setProfile({ ...profile, appearance: { ...profile.appearance, hairColor: hc } })
                          }
                          className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                            profile.appearance.hairColor === hc ? 'border-[#00e5ff] scale-110' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: hc }}
                          aria-label={hc}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 mb-1.5">{tr ? 'Saç Modeli' : 'Hair Style'}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {HAIR_STYLES.map((hs) => (
                      <button
                        key={hs.id}
                        type="button"
                        onClick={() =>
                          setProfile({ ...profile, appearance: { ...profile.appearance, hairStyle: hs.id } })
                        }
                        className={`px-2.5 py-1.5 rounded text-[11px] cursor-pointer whitespace-nowrap ${
                          profile.appearance.hairStyle === hs.id
                            ? 'bg-[#00e5ff] text-[#080d11] font-bold'
                            : 'bg-[#080d11] text-slate-300 border border-white/10'
                        }`}
                      >
                        {tr ? hs.labelTr : hs.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 mb-1.5">{tr ? 'Sakal & Gözlük' : 'Facial Hair & Glasses'}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['NONE', tr ? 'Sakalsız' : 'Clean'],
                        ['STUBBLE', tr ? 'Kirli Sakal' : 'Stubble'],
                        ['BEARD', tr ? 'Tam Sakal' : 'Beard'],
                      ] as Array<[FacialHair, string]>
                    ).map(([fid, lbl]) => (
                      <button
                        key={fid}
                        type="button"
                        onClick={() =>
                          setProfile({ ...profile, appearance: { ...profile.appearance, facialHair: fid } })
                        }
                        className={`px-2.5 py-1.5 rounded text-[11px] cursor-pointer whitespace-nowrap ${
                          profile.appearance.facialHair === fid
                            ? 'bg-[#b7ff4a] text-[#080d11] font-bold'
                            : 'bg-[#080d11] text-slate-300 border border-white/10'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setProfile({
                          ...profile,
                          appearance: { ...profile.appearance, glasses: !profile.appearance.glasses },
                        })
                      }
                      className={`px-2.5 py-1.5 rounded text-[11px] cursor-pointer whitespace-nowrap ${
                        profile.appearance.glasses
                          ? 'bg-[#00e5ff] text-[#080d11] font-bold'
                          : 'bg-[#080d11] text-slate-300 border border-white/10'
                      }`}
                    >
                      {tr ? 'Gözlük' : 'Glasses'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 mb-1.5">{tr ? 'Kenar Çizgisi Kıyafeti' : 'Touchline Outfit'}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['SUIT', tr ? 'Takım Elbise' : 'Suit'],
                        ['TRACKSUIT', tr ? 'Eşofman' : 'Tracksuit'],
                        ['TURTLENECK', tr ? 'Boğazlı Kazak' : 'Turtleneck'],
                      ] as Array<[ManagerOutfit, string]>
                    ).map(([oid, lbl]) => (
                      <button
                        key={oid}
                        type="button"
                        onClick={() =>
                          setProfile({ ...profile, appearance: { ...profile.appearance, outfit: oid } })
                        }
                        className={`py-2 px-2.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
                          profile.appearance.outfit === oid
                            ? 'bg-[#b7ff4a] text-[#080d11] font-bold'
                            : 'bg-[#080d11] text-slate-300 border border-white/10'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Personality + License Column */}
            <div className="md:col-span-5 space-y-5">
              <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-3">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#b7ff4a]" />
                  <span>{tr ? 'Karakter & Yönetim Tarzı' : 'Personality'}</span>
                </div>

                <div className="space-y-2">
                  {PERSONALITIES.map((p) => {
                    const selected = profile.personality === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setProfile({ ...profile, personality: p.id });
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#0a1128] border-[#b7ff4a]'
                            : 'bg-[#080d11] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-sm text-white">
                            {tr ? p.titleTr : p.titleEn}
                          </span>
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.accent }} />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{tr ? p.descTr : p.descEn}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#00e5ff]" />
                    <span>{tr ? 'Lisans Modu' : 'License Mode'}</span>
                  </span>
                  <span className={licenseMode === 'FULL_LICENSE' ? 'text-[#b7ff4a] font-bold' : 'text-slate-400'}>
                    {licenseMode === 'FULL_LICENSE' ? 'Full Lisans' : 'No Data'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={licenseCode}
                    onChange={(e) => setLicenseCode(e.target.value)}
                    placeholder={tr ? 'Örn: ZEPHYR-FULL' : 'e.g. ZEPHYR-FULL'}
                    className="flex-1 min-w-0 rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-xs font-mono-num text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCode}
                    className="px-3 py-2 rounded-lg bg-[#17242c] hover:bg-[#00e5ff] hover:text-[#080d11] text-xs font-bold text-white cursor-pointer whitespace-nowrap"
                  >
                    {tr ? 'Doğrula' : 'Apply'}
                  </button>
                </div>
                {licenseMsg && (
                  <div className="text-[11px] text-[#b7ff4a] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{licenseMsg}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
