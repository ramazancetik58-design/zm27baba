import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Briefcase,
  Camera,
  CheckCircle2,
  HardDrive,
  LogOut,
  Search,
  ShieldCheck,
  Trash2,
  Trophy,
  Upload,
  XCircle,
} from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import { getLeagueLabel, getLeagueMeta } from '../../engine/database';
import { formatMoney, getClubDisplayName } from '../../engine/hardcoreRules';
import {
  AchievementDef,
  Club,
  Language,
  LeagueId,
  LicenseMode,
  ManagerProfile,
  MatchMemory,
  SaveSlotSummary,
  StandingRow,
} from '../../engine/types';
import { ClubCrest, ClubKitSvg } from '../BrandArt';
import { BoardInterviewModal, ResignModal } from '../CareerModals';

interface JobMarketScreenProps {
  clubs: Club[];
  myClub?: Club | null;
  myClubId: string | null;
  leagueId: LeagueId;
  activeLeagues?: LeagueId[];
  onSwitchLeague?: (leagueId: LeagueId) => void;
  standings: StandingRow[];
  manager: ManagerProfile;
  licenseMode: LicenseMode;
  language: Language;
  onApplyForClub: (clubId: string, targetLeagueId?: LeagueId) => void;
  onResignCurrentClub: (reasonLabel?: string, customNote?: string, repImpact?: number) => void;
}

export const JobMarketScreen: React.FC<JobMarketScreenProps> = ({
  clubs,
  myClub,
  myClubId,
  leagueId,
  activeLeagues,
  onSwitchLeague,
  standings,
  manager,
  licenseMode,
  language,
  onApplyForClub,
  onResignCurrentClub,
}) => {
  const tr = language === 'tr';
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [interviewTarget, setInterviewTarget] = useState<Club | null>(null);
  const [resignOpen, setResignOpen] = useState(false);
  const visibleLeagues = activeLeagues && activeLeagues.length > 0 ? activeLeagues : [leagueId];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-[#00e5ff]" />
            <span>{tr ? 'İş Piyasası & Çoklu Lig Başvuruları' : 'Manager Job Market'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? `${getLeagueLabel(leagueId)} · İtibarınız: ${manager.reputation} · Açık çoklu liglerdeki tüm kulüplere başvurun.`
              : `${getLeagueLabel(leagueId)} · Your Reputation: ${manager.reputation}`}
          </p>
        </div>

        {myClubId && myClub && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setResignOpen(true);
            }}
            className="px-4 py-2.5 rounded-lg bg-red-500/15 border border-red-500/40 hover:bg-red-500 hover:text-white text-xs font-display font-bold text-red-300 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{tr ? 'Kulüpten İstifa Et' : 'Resign Current Job'}</span>
          </button>
        )}
      </div>

      {visibleLeagues.length > 1 && onSwitchLeague && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {visibleLeagues.map((lid) => {
            const lm = getLeagueMeta(lid);
            const selected = lid === leagueId;
            return (
              <button
                key={lid}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onSwitchLeague(lid);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  selected
                    ? 'bg-[#b7ff4a] text-[#080d11] font-bold'
                    : 'bg-[#111b21] text-slate-300 border border-white/10 hover:text-white'
                }`}
              >
                {lm.shortName} ({lm.teams}T)
              </button>
            );
          })}
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            feedback.ok
              ? 'bg-[#b7ff4a]/10 border-[#b7ff4a]/40 text-[#b7ff4a]'
              : 'bg-red-500/10 border-red-500/40 text-red-300'
          }`}
        >
          {feedback.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubs.map((c) => {
          const isMine = c.id === myClubId;
          const rank = standings.findIndex((s) => s.clubId === c.id) + 1;
          return (
            <div
              key={c.id}
              className={`rounded-xl bg-[#111b21] border p-5 flex flex-col justify-between gap-4 ${
                isMine ? 'border-[#b7ff4a]' : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ClubCrest club={c} licenseMode={licenseMode} size={46} />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-base text-white truncate">
                      {getClubDisplayName(c, licenseMode)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      #{rank || '-'} · {tr ? 'Prestij' : 'Rep'} {c.reputation}
                    </div>
                  </div>
                </div>
                <ClubKitSvg club={c} size={38} />
              </div>

              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">{tr ? 'Transfer Bütçesi' : 'Budget'}</span>
                  <span className="font-mono-num font-bold text-[#b7ff4a]">{formatMoney(c.transferBudget)}</span>
                </div>
                <div className="text-[11px] text-slate-400">{c.boardExpectation}</div>
              </div>

              <button
                type="button"
                disabled={isMine}
                onClick={() => {
                  soundEngine.playClick();
                  setInterviewTarget(c);
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-[#17242c] hover:bg-[#b7ff4a] hover:text-[#080d11] disabled:opacity-40 text-xs font-display font-bold text-white cursor-pointer transition-colors"
              >
                {isMine
                  ? tr
                    ? 'Şu Anki Kulübünüz'
                    : 'Current Club'
                  : tr
                  ? 'Yönetim Görüşmesine Katıl'
                  : 'Attend Board Interview'}
              </button>
            </div>
          );
        })}
      </div>

      {interviewTarget && (
        <BoardInterviewModal
          club={interviewTarget}
          leagueId={leagueId}
          manager={manager}
          licenseMode={licenseMode}
          language={language}
          onClose={() => setInterviewTarget(null)}
          onHireSuccess={(cid, lid) => {
            setInterviewTarget(null);
            onApplyForClub(cid, lid);
            setFeedback({
              ok: true,
              msg: tr ? 'Yönetim kurulu görüşmesi olumlu sonuçlandı ve sözleşme imzalandı!' : 'Interview passed and contract signed!',
            });
          }}
        />
      )}

      {resignOpen && myClub && (
        <ResignModal
          club={myClub}
          licenseMode={licenseMode}
          language={language}
          onClose={() => setResignOpen(false)}
          onConfirmResign={(reasonLabel, customNote, repImpact) => {
            setResignOpen(false);
            onResignCurrentClub(reasonLabel, customNote, repImpact);
            setFeedback({
              ok: true,
              msg: tr ? `İstifanız (${reasonLabel}) yönetim kurulunca onaylandı.` : 'Resignation confirmed by the board.',
            });
          }}
        />
      )}
    </div>
  );
};

interface SaveSlotsScreenProps {
  slots: Array<SaveSlotSummary | null>;
  canSaveActiveCareer: boolean;
  language: Language;
  onSaveToSlot: (slot: number) => void;
  onLoadFromSlot: (slot: number) => void;
  onDeleteSlot: (slot: number) => void;
  onBack?: () => void;
  footer?: React.ReactNode;
}

export const SaveSlotsScreen: React.FC<SaveSlotsScreenProps> = ({
  slots,
  canSaveActiveCareer,
  language,
  onSaveToSlot,
  onLoadFromSlot,
  onDeleteSlot,
  onBack,
  footer,
}) => {
  const tr = language === 'tr';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{tr ? 'Geri Dön' : 'Back'}</span>
            </button>
          )}
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <HardDrive className="w-6 h-6 text-[#b7ff4a]" />
            <span>{tr ? 'Kayıt Yuvaları (5 Yerel Kayıt Yuvası)' : 'Save Slots (5 Local Slots)'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? 'Farklı lig veya kulüp kariyerlerinizi 5 ayrı kayıt yuvasına kaydedip istediğiniz an geri yükleyebilirsiniz.'
              : 'Save and restore up to 5 separate careers directly in browser storage.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {slots.map((summary, idx) => {
          const slotNum = idx + 1;
          return (
            <div
              key={slotNum}
              className="rounded-xl bg-[#111b21] border border-white/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#080d11] border border-[#00e5ff]/40 flex items-center justify-center font-mono-num font-bold text-lg text-[#00e5ff] shrink-0">
                  #{slotNum}
                </div>
                {summary ? (
                  <div>
                    <div className="font-display font-bold text-base text-white">
                      {summary.clubName} · <span className="text-[#b7ff4a]">{summary.managerName}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {getLeagueLabel(summary.leagueId)} · {tr ? `Hafta ${summary.week}` : `Week ${summary.week}`} ·{' '}
                      {new Date(summary.savedAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-display font-bold text-sm text-slate-400">
                      {tr ? `Boş Kayıt Yuvası ${slotNum}` : `Empty Slot ${slotNum}`}
                    </div>
                    <div className="text-xs text-slate-500">
                      {tr ? 'Henüz bir kariyer kaydedilmemiş.' : 'No career saved in this slot.'}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canSaveActiveCareer && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSuccess();
                      onSaveToSlot(slotNum);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-xs cursor-pointer"
                  >
                    {summary ? (tr ? 'Üzerine Kaydet' : 'Overwrite') : tr ? 'Bu Yuvaya Kaydet' : 'Save Here'}
                  </button>
                )}
                {summary && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playSuccess();
                        onLoadFromSlot(slotNum);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#17242c] hover:bg-[#00e5ff] hover:text-[#080d11] text-white font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{tr ? 'Yükle' : 'Load'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSlot(slotNum)}
                      aria-label={`Yuva ${slotNum} Sil`}
                      className="p-2 rounded-lg bg-[#080d11] border border-white/10 text-slate-400 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {footer}
    </div>
  );
};

interface AlbumAchievementsScreenProps {
  memories: MatchMemory[];
  achievements: AchievementDef[];
  language: Language;
}

export const AlbumAchievementsScreen: React.FC<AlbumAchievementsScreenProps> = ({
  memories,
  achievements,
  language,
}) => {
  const tr = language === 'tr';
  const [tab, setTab] = useState<'ACHIEVEMENTS' | 'ALBUM'>('ACHIEVEMENTS');
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <Award className="w-6 h-6 text-[#b7ff4a]" />
            <span>{tr ? 'Kariyer Albümü & Başarımlar' : 'Career Album & Achievements'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? `${unlockedCount} / ${achievements.length} Başarım Açıldı · ${memories.length} Önemli Anı Kaydedildi`
              : `${unlockedCount} / ${achievements.length} Unlocked · ${memories.length} Memories`}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#111b21] border border-white/10">
          <button
            type="button"
            onClick={() => setTab('ACHIEVEMENTS')}
            className={`px-4 py-2 rounded-lg text-xs font-display font-bold cursor-pointer ${
              tab === 'ACHIEVEMENTS' ? 'bg-[#b7ff4a] text-[#080d11]' : 'text-slate-300'
            }`}
          >
            {tr ? `Başarımlar (${unlockedCount}/${achievements.length})` : `Achievements (${unlockedCount}/${achievements.length})`}
          </button>
          <button
            type="button"
            onClick={() => setTab('ALBUM')}
            className={`px-4 py-2 rounded-lg text-xs font-display font-bold cursor-pointer ${
              tab === 'ALBUM' ? 'bg-[#00e5ff] text-[#080d11]' : 'text-slate-300'
            }`}
          >
            {tr ? `Anılar Albümü (${memories.length})` : `Memories Album (${memories.length})`}
          </button>
        </div>
      </div>

      {tab === 'ACHIEVEMENTS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((ach) => {
            const pct = Math.min(100, Math.round((ach.progress / Math.max(1, ach.target)) * 100));
            return (
              <div
                key={ach.id}
                className={`rounded-xl border p-5 flex flex-col justify-between gap-3 ${
                  ach.unlocked
                    ? 'bg-[#0a1128] border-[#b7ff4a]/70'
                    : 'bg-[#111b21] border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono-num uppercase tracking-wider text-[#00e5ff]">
                      {ach.category}
                    </div>
                    <h3 className="font-display font-bold text-base text-white mt-0.5">{ach.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{ach.description}</p>
                  </div>
                  <Trophy className={`w-6 h-6 shrink-0 ${ach.unlocked ? 'text-[#b7ff4a]' : 'text-slate-600'}`} />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono-num text-slate-300 mb-1">
                    <span>{ach.unlocked ? (tr ? `Açıldı (Hafta ${ach.unlockedWeek ?? 1})` : 'Unlocked') : `${ach.progress} / ${ach.target}`}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded bg-[#080d11] overflow-hidden">
                    <div className={`h-full ${ach.unlocked ? 'bg-[#b7ff4a]' : 'bg-[#00e5ff]'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {memories.length === 0 ? (
            <div className="rounded-xl bg-[#111b21] border border-white/10 p-10 text-center space-y-2">
              <Camera className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="font-display font-bold text-base text-white">
                {tr ? 'Kariyer Albümünüz Henüz Boş' : 'Album is Empty'}
              </div>
              <p className="text-xs text-slate-400">
                {tr
                  ? 'Derbi galibiyetleri, büyük skorlar, kupa zaferleri ve kritik imzalar otomatik olarak albümünüze eklenir.'
                  : 'Derbies, big wins, and milestone signings are captured here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memories.map((mem) => (
                <div key={mem.id} className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-num font-bold text-[#00e5ff]">
                      {tr ? `Hafta ${mem.week}` : `Week ${mem.week}`} · {mem.tag}
                    </span>
                    <span className="font-mono-num text-[#b7ff4a] font-bold">{mem.score}</span>
                  </div>
                  <h3 className="font-display font-bold text-base text-white">{mem.title}</h3>
                  <div className="text-[11px] text-slate-400">{mem.opponentName}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{mem.highlight}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface GuideScreenProps {
  language: Language;
  onBack?: () => void;
}

const GUIDE_SECTIONS = [
  {
    id: 'PITCH',
    titleTr: '3D & 2D Taktik Sahası',
    titleEn: '3D & 2D Tactics Pitch',
    bulletsTr: [
      'Taktik ekranının sağ üstünden anlık olarak 3D Saha ile 2D Tahta görünümü arasında geçiş yapabilirsiniz.',
      'Oyuncuları sürükleyip bırakarak saha içi mevkilerini değiştirebilir, alttaki 3 sütunlu kadro planlayıcıdan İlk 11, Yedek Kulübesi (9) ve Kadro Dışı listesini belirleyebilirsiniz.',
      'Ayarlar menüsünden varsayılan Taktik ve Maç görünümünü (3D veya 2D) kalıcı olarak seçebilirsiniz.',
    ],
  },
  {
    id: 'MATCH',
    titleTr: 'Canlı 3D/2D Maç Motoru & Konuşmalar',
    titleEn: 'Match Engine & Team Talks',
    bulletsTr: [
      'Maç öncesi, devre arası ve maç sonu soyunma odası konuşmaları menajer karakterinizle (Despot, Cesaretlendirici, Taktik Dehası) sinerji oluşturur.',
      'Canlı maç sırasında üst panelden "2D Mod" butonuna tıklayarak simülasyonu sıfırlamadan üstten taktik radara geçebilirsiniz.',
      'Şut anlarında top gerçekçi balistik uçuşla kaleye gider; kaleci yana kayarak topu çeler ve yalnızca gol olduğunda ilgili kalenin ağları dalgalanır.',
    ],
  },
  {
    id: 'TRANSFERS',
    titleTr: 'İnatçı Transfer Pazarlığı & Finans',
    titleEn: 'Stubborn Transfers & Finance',
    bulletsTr: [
      'Kulüpler ilk teklifinizi her zaman reddeder veya karşı teklif sunar; Kurt Pazarlıkçı karakteri bonservis/maaş taleplerini %7 aşağı çeker.',
      'Nakit bütçesi sıkı olan kulüplerde Serbest Oyuncular (€0) ve Kiralık opsiyonlarını kullanarak LCPD / PSR / FFP sınırları içinde kalın.',
      'Transfer ve Oyuncu Arama tablolarındaki ★ yıldız ikonuyla oyuncuları Takip Listenize ekleyebilir, dürbün ikonuyla Gözlemci Raporu çıkartabilirsiniz.',
    ],
  },
  {
    id: 'OPERATIONS',
    titleTr: 'Antrenman, Sağlık, Ekip & Kayıt',
    titleEn: 'Training, Medical, Staff & Saves',
    bulletsTr: [
      'Antrenman ekranından haftalık 6 günlük idman planı seçip her oyuncuya bireysel gelişim odağı atayabilirsiniz.',
      'Sağlık Merkezinde sakat oyuncular için Güvenli Rehabilitasyon veya Riskli Ağrı İğnesi (anında dönüş ya da nüks riski) arasında karar verebilirsiniz.',
      'Kayıt Yuvaları menüsünden kariyerinizi 5 farklı yuvaya kaydedebilir, İstediğiniz zaman "Oyundan Çık" ile Ana Menüye dönebilirsiniz.',
    ],
  },
  {
    id: 'LEAGUES',
    titleTr: '9 Lig & Çoklu Lig Kariyeri',
    titleEn: '9 Leagues & Multi-League Career',
    bulletsTr: [
      'Menajer Kurulumunda kariyeriniz boyunca aynı anda simüle edilecek ligleri seçebilirsiniz: Trendyol Süper Lig (18T/34H), Trendyol 1. Lig (20T/38H), Nesine 2. Lig Beyaz Grup (18T/34H), Nesine 2. Lig Kırmızı Grup (18T/34H), Premier League (20T/38H), EFL Championship (24T/46H), EA Sports La Liga (20T/38H), Serie A (20T/38H) ve Bundesliga (18T/34H).',
      'Her hafta maçınızı oynadığınızda seçili tüm aktif liglerdeki fikstürler arka planda canlı simüle edilir; Puan Durumu ve İş Piyasası ekranlarından diğer liglere anlık geçiş yapabilirsiniz.',
    ],
  },
  {
    id: 'MANAGER_STUDIO',
    titleTr: '3D/2D Menajer Stüdyosu & Fotoğraf / Kamera',
    titleEn: '3D/2D Manager Studio & Photo Upload',
    bulletsTr: [
      'Menajer Kurulumu ekranında sağ üstteki 3D / 2D Görünüm anahtarı ile karakterinizi hem 3D stüdyo mankeni hem de 2D teknik direktör portresi olarak düzenleyebilirsiniz.',
      'Bilgisayardan / telefondan resim yükleyebilir veya canlı kameranızla fotoğraf çekip profilinize ekleyebilirsiniz; fotoğrafınız menü, dashboard ve soyunma odası konuşmalarında otomatik görünür.',
    ],
  },
  {
    id: 'MOBILE_APK',
    titleTr: 'Mobil Uygulama (PWA) & Android APK Kurulumu',
    titleEn: 'Mobile App (PWA) & Android APK',
    bulletsTr: [
      'Mobil PWA Kurulumu: Telefonunuzdan Chrome (Android) veya Safari (iOS) ile açtığınızda üst paneldeki "Mobil Uygulamayı Yükle" veya tarayıcı menüsünden "Ana Ekrana Ekle" seçerek tam ekran, çevrimdışı çalışan mobil uygulama gibi kurabilirsiniz.',
      'Native Android APK Üretimi: Proje kökündeki /android-project klasörünü Android Studio ile açın ve üst menüden Build > Build Bundle(s) / APK(s) > Build APK(s) yolunu seçin (veya Gradle kuruluysa android-project içinde "gradle assembleDebug" çalıştırın).',
      'Android Telefona APK Kurulumu: Oluşan app/build/outputs/apk/debug/app-debug.apk dosyasını telefonunuza aktarın (veya USB hata ayıklama ile "adb install -r app-debug.apk" uygulayın), dosya yöneticisinden dokunun ve "Bilinmeyen kaynaklardan uygulama yüklemeye izin ver" onayını vererek kurun.',
    ],
  },
  {
    id: 'LICENSE',
    titleTr: 'Full Lisans (ZEPHYR-FULL) Modu',
    titleEn: 'Full License Guide',
    bulletsTr: [
      'Lisans yönetimi ekranında ZEPHYR-FULL kodunu girdiğinizde 9 ligdeki 176 kulüp, stadyum, teknik ekip ve 3.500+ oyuncu tamamen gerçek isimlerine dönüşür.',
      'No Data modunda ise kurgusal isimler ve özel çizilmiş vektör armalarla oynanır.',
    ],
  },
];

export const GuideScreen: React.FC<GuideScreenProps> = ({ language, onBack }) => {
  const tr = language === 'tr';
  const [search, setSearch] = useState('');

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return GUIDE_SECTIONS;
    return GUIDE_SECTIONS.filter(
      (s) =>
        s.titleTr.toLowerCase().includes(q) ||
        s.bulletsTr.some((b) => b.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{tr ? 'Geri Dön' : 'Back'}</span>
            </button>
          )}
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#00e5ff]" />
            <span>{tr ? 'Zephyr Manager 27 Oyun Kılavuzu' : 'Zephyr Manager 27 Field Guide'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? '3D/2D motor, inatçı transfer ekonomisi, LCPD/FFP kuralları ve lisans rehberi.'
              : 'Quick manual covering 3D/2D match engine, transfers, LCPD rules & licensing.'}
          </p>
        </div>

        <div className="relative w-full sm:w-64 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr ? 'Kılavuzda ara...' : 'Search guide...'}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#111b21] border border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredSections.map((sec) => (
          <div key={sec.id} className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-3">
            <h3 className="font-display font-bold text-lg text-[#b7ff4a] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00e5ff]" />
              <span>{tr ? sec.titleTr : sec.titleEn}</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
              {sec.bulletsTr.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#00e5ff] font-bold">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
