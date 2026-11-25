import React, { useState } from 'react';
import { CheckCircle2, Code2, ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import { getLeagueLabel } from '../../engine/database';
import { validateLicenseCode } from '../../engine/hardcoreRules';
import { AppSettings, CameraAngle, Club, Language, LicenseMode } from '../../engine/types';
import { ClubCrest, ClubKitSvg } from '../BrandArt';
import { PWAInstallButton } from '../PwaControls';

interface LicenseScreenProps {
  sampleClubs: Club[];
  activeClub: Club | null;
  licenseMode: LicenseMode;
  language: Language;
  onActivateLicense: (mode: LicenseMode) => void;
}

export const LicenseScreen: React.FC<LicenseScreenProps> = ({
  sampleClubs,
  activeClub,
  licenseMode,
  language,
  onActivateLicense,
}) => {
  const tr = language === 'tr';
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateLicenseCode(code)) {
      soundEngine.playSuccess();
      onActivateLicense('FULL_LICENSE');
      setFeedback({
        ok: true,
        msg: tr
          ? 'ZEPHYR-FULL doğrulandı! Tüm kulüp/oyuncu isimleri gerçeğe dönüştürüldü ve gerçek arma/forma modülü aktif edildi.'
          : 'ZEPHYR-FULL activated! Real clubs, players, and live crest fetching enabled.',
      });
    } else {
      soundEngine.playReject();
      setFeedback({
        ok: false,
        msg: tr ? 'Geçersiz lisans kodu. Full Lisans için ZEPHYR-FULL girin.' : 'Invalid code. Enter ZEPHYR-FULL.',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-xl bg-[#111b21] border border-white/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-2xl text-white">
              {tr ? 'Lisans & Görsel Paket Yönetimi' : 'License & Visual Pack Management'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {tr
                ? 'Oyun iki modda çalışır: No Data (Kurgusal isimler & kodla çizilmiş vektör kalkanlar) ve Full Lisans (Gerçek isimler & otomatik arma çekme).'
                : 'Switch between No Data (fictional + vector shields) and Full License (real names + auto crest loader).'}
            </p>
          </div>

          <div
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
              licenseMode === 'FULL_LICENSE'
                ? 'bg-[#b7ff4a]/15 text-[#b7ff4a] border border-[#b7ff4a]/40'
                : 'bg-[#080d11] text-slate-300 border border-white/10'
            }`}
          >
            {licenseMode === 'FULL_LICENSE' ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-[#00e5ff]" />
            )}
            <span>{licenseMode === 'FULL_LICENSE' ? 'FULL LİSANS AKTİF' : 'NO DATA MODU'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="license-code-input" className="sr-only">
              {tr ? 'Lisans Kodu' : 'License Code'}
            </label>
            <input
              id="license-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={tr ? 'Örn: ZEPHYR-FULL yazabilirsiniz' : 'e.g. ZEPHYR-FULL'}
              className="w-full px-4 py-3 rounded-lg bg-[#080d11] border border-white/15 text-sm font-mono-num text-white placeholder:text-slate-500 focus:outline-none focus:border-[#b7ff4a]"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-sm cursor-pointer whitespace-nowrap"
          >
            {tr ? 'Kodu Etkinleştir' : 'Activate Code'}
          </button>
          {licenseMode === 'FULL_LICENSE' && (
            <button
              type="button"
              onClick={() => {
                onActivateLicense('NO_DATA');
                setFeedback(null);
              }}
              className="px-4 py-3 rounded-lg bg-[#17242c] text-slate-200 text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              {tr ? 'No Data Moduna Dön' : 'Revert to No Data'}
            </button>
          )}
        </form>

        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
              feedback.ok ? 'bg-[#b7ff4a]/10 text-[#b7ff4a]' : 'bg-red-500/10 text-red-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.msg}</span>
          </div>
        )}
      </div>

      {/* Live Preview of Current Mode (Never assumes Galatasaray if no club chosen) */}
      <div className="rounded-xl bg-[#111b21] border border-white/10 p-6">
        <div className="text-xs text-slate-400 mb-4">
          {activeClub
            ? tr
              ? 'Seçili Kulübünüz ve 9 Lig Önizlemesi:'
              : 'Your Selected Club & 9-League Preview:'
            : tr
            ? '9 Lig Önizleme Örneği (Henüz bir kulüp seçmediniz):'
            : '9-League Visual Mode Preview (No club selected):'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeClub
            ? [activeClub, ...sampleClubs.filter((c) => c.id !== activeClub.id).slice(0, 8)]
            : sampleClubs.slice(0, 9)
          ).map((c) => (
            <div
              key={c.id}
              className={`p-4 rounded-lg bg-[#080d11] border flex items-center justify-between gap-3 ${
                activeClub?.id === c.id ? 'border-[#b7ff4a]/60' : 'border-white/5'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <ClubCrest club={c} licenseMode={licenseMode} size={42} />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono-num text-[#00e5ff] truncate">
                    {getLeagueLabel(c.leagueId)}
                  </div>
                  <div className="font-display font-bold text-sm text-white truncate">
                    {licenseMode === 'FULL_LICENSE' ? c.realName : c.fictionalName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {licenseMode === 'FULL_LICENSE' ? c.stadiumReal : c.stadiumFictional}
                  </div>
                </div>
              </div>
              <ClubKitSvg club={c} size={40} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
}

const ANDROID_FILES_SUMMARY = [
  { path: 'android-project/build.gradle.kts', desc: 'Root Gradle + Compose + KSP plugins' },
  { path: 'android-project/app/build.gradle.kts', desc: 'Compose BOM, Room DB 2.6.1, Coil 2.7.0, OpenGL ES 3.0' },
  { path: 'android-project/app/src/main/AndroidManifest.xml', desc: 'INTERNET + glEsVersion 0x00030000' },
  { path: 'android-project/app/src/main/java/com/zephyr/manager27/ui/components/ZephyrLogos.kt', desc: 'Compose Canvas Cyan Shield + Gold Splash Logo' },
  { path: 'android-project/app/src/main/java/com/zephyr/manager27/engine3d/MatchGLRenderer.kt', desc: 'OpenGL ES 3.0 PBR Turf + Instanced 3D Crowd Shaders' },
  { path: 'android-project/app/src/main/java/com/zephyr/manager27/data/ZephyrDatabase.kt', desc: 'Room DB Entities & DAO' },
  { path: 'android-project/app/src/main/java/com/zephyr/manager27/data/KitImageFetcher.kt', desc: 'Coil Auto Badge Fetcher + Vector Fallback' },
  { path: 'android-project/app/src/main/java/com/zephyr/manager27/domain/HardcoreEngine.kt', desc: 'ZEPHYR-FULL License & Stubborn AI' },
  { path: 'android-project/app/src/main/java/com/zephyr/manager27/MainActivity.kt', desc: 'Compose Navigation + 2s Splash + GLSurfaceView' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, onUpdateSettings }) => {
  const tr = settings.language === 'tr';
  const [showAndroidFiles, setShowAndroidFiles] = useState(false);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-xl bg-[#111b21] border border-white/10 p-6 space-y-5">
        <h2 className="font-display font-bold text-2xl text-white">
          {tr ? 'Oyun, Ses ve 3D/2D Motor Ayarları' : 'Game, Audio & 3D/2D Engine Settings'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{tr ? 'Arayüz Dili' : 'Language'}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['tr', 'en'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, language: lang })}
                  className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    settings.language === lang
                      ? 'bg-[#b7ff4a] text-[#080d11]'
                      : 'bg-[#080d11] text-slate-300 border border-white/10'
                  }`}
                >
                  {lang === 'tr' ? 'Türkçe' : 'English'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {tr ? 'Varsayılan 3D Maç Kamerası' : 'Default 3D Match Camera'}
            </label>
            <select
              value={settings.defaultCamera}
              onChange={(e) =>
                onUpdateSettings({ ...settings, defaultCamera: e.target.value as CameraAngle })
              }
              className="w-full rounded-lg bg-[#080d11] border border-white/10 px-3 py-2 text-xs text-white"
            >
              <option value="broadcast">{tr ? 'Yayın (TV)' : 'Broadcast'}</option>
              <option value="tactical">{tr ? 'Taktik Kuşbakışı' : 'Tactical'}</option>
              <option value="behind_goal">{tr ? 'Kale Arkası' : 'Behind Goal'}</option>
              <option value="dynamic">{tr ? 'Dinamik Takip' : 'Dynamic'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {tr ? 'Oyun Zorluk Seviyesi' : 'Game Difficulty'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['EASY', tr ? 'Kolay' : 'Easy'],
                  ['NORMAL', tr ? 'Normal' : 'Normal'],
                  ['HARD', tr ? 'Zor' : 'Hard'],
                ] as const
              ).map(([diff, label]) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, difficulty: diff })}
                  className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    (settings.difficulty ?? 'NORMAL') === diff
                      ? 'bg-[#b7ff4a] text-[#080d11]'
                      : 'bg-[#080d11] text-slate-300 border border-white/10 hover:border-white/25'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {tr ? 'Varsayılan Maç Görünümü' : 'Default Match View Mode'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['3D', '2D'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, matchViewMode: mode })}
                  className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    settings.matchViewMode === mode
                      ? 'bg-[#b7ff4a] text-[#080d11]'
                      : 'bg-[#080d11] text-slate-300 border border-white/10'
                  }`}
                >
                  {mode === '3D' ? (tr ? '3D Stadyum' : '3D Stadium') : tr ? '2D Taktik Radar' : '2D Radar'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {tr ? 'Varsayılan Taktik Görünümü' : 'Default Tactics View Mode'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['3D', '2D'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, tacticsViewMode: mode })}
                  className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    settings.tacticsViewMode === mode
                      ? 'bg-[#00e5ff] text-[#080d11]'
                      : 'bg-[#080d11] text-slate-300 border border-white/10'
                  }`}
                >
                  {mode === '3D' ? (tr ? '3D Saha' : '3D Pitch') : tr ? '2D Tahta' : '2D Board'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {tr ? '3D Taraftar Yoğunluğu (InstancedMesh)' : '3D Crowd Density'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['HIGH', 'MEDIUM'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, crowdDensity: d })}
                  className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    settings.crowdDensity === d
                      ? 'bg-[#00e5ff] text-[#080d11]'
                      : 'bg-[#080d11] text-slate-300 border border-white/10'
                  }`}
                >
                  {d === 'HIGH' ? '3,200+' : '1,800'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {tr ? '3D Sahada Oyuncu İsimleri' : '3D Player Nameplates'}
            </label>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, showPlayerNamesIn3D: !settings.showPlayerNamesIn3D })
              }
              className="w-full py-2 px-3 rounded-lg bg-[#080d11] border border-white/10 text-xs font-medium text-white text-left cursor-pointer"
            >
              {settings.showPlayerNamesIn3D
                ? tr
                  ? 'Açık (Top Taşıyan Gösterilir)'
                  : 'Visible'
                : tr
                ? 'Gizli'
                : 'Hidden'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>{tr ? 'Menü Müziği Ses Seviyesi' : 'Menu Music Volume'}</span>
              <span className="font-mono-num text-[#00e5ff] font-bold">{settings.musicVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.musicVolume}
              onChange={(e) => onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) })}
              className="w-full accent-[#00e5ff]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>{tr ? 'Stadyum Efekt Sesi' : 'Stadium SFX Volume'}</span>
              <span className="font-mono-num text-[#b7ff4a] font-bold">{settings.sfxVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.sfxVolume}
              onChange={(e) => onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) })}
              className="w-full accent-[#b7ff4a]"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {tr ? 'Genel Ses' : 'Master Audio'}
            </label>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, muted: !settings.muted })}
              className="w-full py-2 px-3 rounded-lg bg-[#080d11] border border-white/10 text-xs font-medium text-white text-left cursor-pointer"
            >
              {settings.muted ? (tr ? 'Sessiz (Kapalı)' : 'Muted') : tr ? 'Açık (Stadyum, Direk & Ağ)' : 'Enabled'}
            </button>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {tr ? 'Ana Menü Müziği' : 'Menu Ambient Loop'}
            </label>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, menuMusicEnabled: !settings.menuMusicEnabled })}
              className="w-full py-2 px-3 rounded-lg bg-[#080d11] border border-white/10 text-xs font-medium text-white text-left cursor-pointer"
            >
              {settings.menuMusicEnabled
                ? tr
                  ? 'Açık (Yumuşak Piyano & Ped)'
                  : 'Enabled (Soft Ambient)'
                : tr
                ? 'Kapalı'
                : 'Disabled'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile PWA & Android APK Installation */}
      <div className="rounded-xl bg-[#111b21] border border-[#00e5ff]/25 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-[#b7ff4a]" />
            <div>
              <h3 className="font-display font-bold text-base text-white">
                {tr ? 'Mobil Sürüm (PWA) & Android APK Kurulumu' : 'Mobile App (PWA) & Android APK Install'}
              </h3>
              <p className="text-xs text-slate-400">
                {tr
                  ? 'Telefonunuza doğrudan mobil uygulama olarak yükleyebilir veya Android Studio üzerinden APK derleyebilirsiniz.'
                  : 'Install as a standalone mobile PWA or build the native Android APK from /android-project.'}
              </p>
            </div>
          </div>
          <PWAInstallButton language={settings.language} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#080d11] border border-white/10 space-y-1.5">
            <div className="font-bold text-[#00e5ff]">
              {tr ? '1. Telefon Tarayıcısından Doğrudan Kurulum (PWA)' : '1. Direct Mobile Browser Install (PWA)'}
            </div>
            <p className="text-slate-300 leading-relaxed">
              {tr
                ? 'Android Chrome menüsünden (⋮ > Uygulamayı Yükle) veya iOS Safari (Paylaş > Ana Ekrana Ekle) ile tam ekran ve çevrimdışı çalışan mobil uygulama kurabilirsiniz.'
                : 'Use Chrome (Install App) or Safari (Add to Home Screen) for full-screen offline mobile play.'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#080d11] border border-white/10 space-y-1.5">
            <div className="font-bold text-[#b7ff4a]">
              {tr ? '2. Native Android APK Derleme & Kurulum' : '2. Build & Install Native Android APK'}
            </div>
            <p className="text-slate-300 leading-relaxed">
              {tr
                ? 'android-project klasörünü Android Studio ile açıp Build > Build APK(s) seçin (veya Gradle ile "gradle assembleDebug" çalıştırın). Oluşan app-debug.apk dosyasını telefona kopyalayıp "Bilinmeyen kaynaklara izin ver" onayıyla kurun.'
                : 'Open /android-project in Android Studio > Build > Build APK(s) (or run "gradle assembleDebug"), then install app-debug.apk on Android.'}
            </p>
          </div>
        </div>
      </div>

      {/* Android Studio Project Reference */}
      <div className="rounded-xl bg-[#111b21] border border-white/10 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Code2 className="w-5 h-5 text-[#00e5ff]" />
            <div>
              <h3 className="font-display font-bold text-base text-white">
                {tr ? 'Native Android (Kotlin / Compose / OpenGL ES 3.0) Kaynak Yapısı' : 'Native Android Kotlin/Compose Source Tree'}
              </h3>
              <p className="text-xs text-slate-400">
                {tr
                  ? 'Proje kökündeki /android-project klasöründe tam Gradle, Manifest, Room DB, Coil ve OpenGL ES 3.0 dosyaları hazır.'
                  : 'Complete Gradle, Manifest, Room DB, Coil, and OpenGL ES 3.0 files included in /android-project.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAndroidFiles((v) => !v)}
            className="px-3.5 py-2 rounded-lg bg-[#080d11] border border-white/15 text-xs font-medium text-white hover:border-[#b7ff4a] cursor-pointer whitespace-nowrap"
          >
            {showAndroidFiles ? (tr ? 'Gizle' : 'Hide') : tr ? 'Dosyaları Gör' : 'View Files'}
          </button>
        </div>

        {showAndroidFiles && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs">
            {ANDROID_FILES_SUMMARY.map((f) => (
              <div key={f.path} className="flex flex-col sm:flex-row sm:justify-between gap-1 py-1.5 border-b border-white/5">
                <span className="font-mono-num text-[#b7ff4a]">{f.path}</span>
                <span className="text-slate-400">{f.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
