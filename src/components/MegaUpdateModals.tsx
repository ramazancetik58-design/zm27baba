import React, { useState } from 'react';
import {
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Home,
  Inbox,
  Menu,
  Mic,
  Palmtree,
  Play,
  Settings,
  Shield,
  Sliders,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  AppScreen,
  DynamicPressQuestion,
  HolidayConfig,
  HolidayMode,
  HolidaySummaryReport,
  HolidayTransferPolicy,
  PressAnswerImpact,
  SeasonHistoryEntry,
} from '../engine/types';

interface HolidayModalProps {
  open: boolean;
  onClose: () => void;
  initialConfig: HolidayConfig;
  assistantName: string;
  assistantTacticalKnowledge: number;
  seasonLabel: string;
  currentWeek: number;
  lastReport: HolidaySummaryReport | null;
  onStartHoliday: (config: HolidayConfig) => void;
  onClearReport: () => void;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  open,
  onClose,
  initialConfig,
  assistantName,
  assistantTacticalKnowledge,
  seasonLabel,
  currentWeek,
  lastReport,
  onStartHoliday,
  onClearReport,
}) => {
  const [mode, setMode] = useState<HolidayMode>(initialConfig.mode);
  const [days, setDays] = useState<number>(initialConfig.days || 14);
  const [useCurrentTactics, setUseCurrentTactics] = useState<boolean>(initialConfig.useCurrentTactics);
  const [transferPolicy, setTransferPolicy] = useState<HolidayTransferPolicy>(initialConfig.transferPolicy);
  const [returnOnJobOffer, setReturnOnJobOffer] = useState<boolean>(initialConfig.returnOnJobOffer);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-500/30 bg-[#0b1322] p-5 sm:p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Palmtree className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Tatile Git (Hızlı Simülasyon)</h2>
              <p className="text-xs text-slate-400">
                Sezon {seasonLabel} · Hafta {currentWeek} · 3D kapalı hızlı motor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {lastReport ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Tatil Tamamlandı — Özet Rapor
              </div>
              <p className="mt-1 text-xs text-slate-200">{lastReport.stopReason}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <div className="text-[11px] text-slate-400">Geçen Süre</div>
                <div className="text-lg font-bold">{lastReport.daysElapsed} Gün</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <div className="text-[11px] text-slate-400">Maç Karnesi</div>
                <div className="text-lg font-bold text-emerald-400">
                  {lastReport.wins}G {lastReport.draws}B {lastReport.losses}M
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <div className="text-[11px] text-slate-400">Goller</div>
                <div className="text-lg font-bold">
                  {lastReport.goalsFor} : {lastReport.goalsAgainst}
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <div className="text-[11px] text-slate-400">Sezon</div>
                <div className="text-lg font-bold">{lastReport.endedSeasonLabel}</div>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 p-3.5 border border-white/10 text-xs space-y-1.5">
              <div className="font-semibold text-slate-200">
                Asistan: {lastReport.assistantName} (Taktik Bilgi: {lastReport.assistantTacticalKnowledge}/100)
              </div>
              <p className="text-slate-300">{lastReport.tacticalNote}</p>
              {lastReport.injuriesOccurred.length > 0 && (
                <p className="text-amber-300">Sakatlıklar: {lastReport.injuriesOccurred.join(', ')}</p>
              )}
              {lastReport.transfersHandled.length > 0 && (
                <p className="text-cyan-300">Transferler: {lastReport.transfersHandled.join(' | ')}</p>
              )}
            </div>

            {lastReport.matchLogs.length > 0 && (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3 space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Oynanan Maçlar ({lastReport.matchLogs.length})
                </div>
                {lastReport.matchLogs.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                    <span className="text-slate-400">
                      {m.seasonLabel} H{m.week} · {m.isHome ? 'EV' : 'DEP'} vs {m.opponentName}
                    </span>
                    <span
                      className={`font-bold ${
                        m.result === 'W' ? 'text-emerald-400' : m.result === 'L' ? 'text-rose-400' : 'text-amber-300'
                      }`}
                    >
                      {m.goalsFor} - {m.goalsAgainst} ({m.result})
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClearReport}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold hover:bg-white/10"
              >
                Yeni Tatil Planla
              </button>
              <button
                onClick={onClose}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                Kariyere Dön
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Dönüş Modu
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'DAYS', label: 'Belirli Gün Sonra Dön', sub: `${days} gün simüle edilir` },
                    { id: 'NEXT_MATCH', label: 'Sonraki Maçtan Sonra Dön', sub: '1 hafta ileri sarar' },
                    { id: 'END_OF_SEASON', label: 'Sezon Sonuna Kadar Git', sub: 'Tam sezon + yeni sezon geçişi' },
                    { id: 'INDEFINITE', label: 'Süresiz Tatil (16 Hafta Blok)', sub: 'İş teklifi / 30. sezonda durur' },
                  ] as Array<{ id: HolidayMode; label: string; sub: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      mode === item.id
                        ? 'border-emerald-400 bg-emerald-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
              {mode === 'DAYS' && (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3 border border-white/10">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <input
                    type="range"
                    min={7}
                    max={180}
                    step={7}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="flex-1 accent-emerald-400"
                  />
                  <span className="text-sm font-bold text-emerald-300 w-20 text-right">{days} Gün</span>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Asistan Delegasyon Ayarları
              </div>
              <div className="flex items-center justify-between text-xs bg-black/25 rounded-lg p-2.5 border border-white/5">
                <span>
                  Görevdeki Asistan: <strong className="text-white">{assistantName}</strong>
                </span>
                <span className="font-bold text-emerald-400">
                  Taktik Bilgi: {assistantTacticalKnowledge}/100
                </span>
              </div>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="text-sm font-medium">Mevcut Taktiğimi Kullan</div>
                  <div className="text-[11px] text-slate-400">
                    Asistan mevcut diziliş ve oyun planına sadık kalır
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useCurrentTactics}
                  onChange={(e) => setUseCurrentTactics(e.target.checked)}
                  className="h-4 w-4 accent-emerald-400"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="text-sm font-medium">İş Teklifi Gelirse Tatilden Dön</div>
                  <div className="text-[11px] text-slate-400">
                    Başka kulüpten teklif gelirse simülasyon otomatik durur
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={returnOnJobOffer}
                  onChange={(e) => setReturnOnJobOffer(e.target.checked)}
                  className="h-4 w-4 accent-emerald-400"
                />
              </label>

              <div className="pt-1">
                <div className="text-xs font-medium text-slate-300 mb-2">Transfer Teklifi Politikası</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'REJECT_ALL', label: 'Hepsini Reddet' },
                      { id: 'ACCEPT_SUITABLE', label: 'Uygun Teklifi Kabul Et' },
                      { id: 'MANUAL', label: 'Manuel Bırak' },
                    ] as Array<{ id: HolidayTransferPolicy; label: string }>
                  ).map((pol) => (
                    <button
                      key={pol.id}
                      type="button"
                      onClick={() => setTransferPolicy(pol.id)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        transferPolicy === pol.id
                          ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                          : 'border-white/10 bg-black/20 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pol.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold hover:bg-white/10"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() =>
                  onStartHoliday({
                    mode,
                    days,
                    useCurrentTactics,
                    transferPolicy,
                    returnOnJobOffer,
                  })
                }
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                <Play className="h-4 w-4" />
                Tatile Çık
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TurkishPressModalProps {
  open: boolean;
  question: DynamicPressQuestion | null;
  lastImpact: PressAnswerImpact | null;
  onAnswerPreset: (tone: 'CONFIDENT' | 'HUMBLE' | 'PRESSURE_OPP' | 'DIPLOMATIC') => void;
  onAnswerCustom: (text: string) => void;
  onSkip: () => void;
  onNextQuestion?: () => void;
  onClose: () => void;
}

export const TurkishPressModal: React.FC<TurkishPressModalProps> = ({
  open,
  question,
  lastImpact,
  onAnswerPreset,
  onAnswerCustom,
  onSkip,
  onNextQuestion,
  onClose,
}) => {
  const [customText, setCustomText] = useState('');

  if (!open || !question) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/30 bg-[#0b1322] p-5 sm:p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                {question.outlet} ·{' '}
                {question.phase === 'PRE_MATCH'
                  ? 'Maç Önü Basın Toplantısı'
                  : question.phase === 'POST_MATCH'
                    ? 'Maç Sonu Basın Toplantısı'
                    : question.phase === 'TRANSFER_IN'
                      ? 'Yeni Transfer Basın Toplantısı'
                      : 'Transfer Ayrılığı Basın Toplantısı'}
              </div>
              <h2 className="text-base font-bold">{question.journalist}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-4 text-sm leading-relaxed text-slate-100">
          “{question.question}”
        </div>

        {lastImpact ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
              <div className="text-xs font-bold uppercase text-cyan-300">Manşet</div>
              <div className="mt-1 text-sm font-bold text-white">{lastImpact.headline}</div>
              <p className="mt-1 text-xs text-slate-300">{lastImpact.reactionSummary}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                Moral: <strong className={lastImpact.moraleDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{lastImpact.moraleDelta >= 0 ? `+${lastImpact.moraleDelta}` : lastImpact.moraleDelta}</strong>
              </div>
              <div className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                Taraftar: <strong className={lastImpact.fanSupportDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{lastImpact.fanSupportDelta >= 0 ? `+${lastImpact.fanSupportDelta}` : lastImpact.fanSupportDelta}</strong>
              </div>
              <div className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                Yönetim: <strong className={lastImpact.boardConfidenceDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{lastImpact.boardConfidenceDelta >= 0 ? `+${lastImpact.boardConfidenceDelta}` : lastImpact.boardConfidenceDelta}</strong>
              </div>
              <div className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                Medya: <strong className={lastImpact.mediaRelationsDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{lastImpact.mediaRelationsDelta >= 0 ? `+${lastImpact.mediaRelationsDelta}` : lastImpact.mediaRelationsDelta}</strong>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {onNextQuestion && (
                <button
                  type="button"
                  onClick={onNextQuestion}
                  className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25 cursor-pointer"
                >
                  Sonraki Soru →
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 cursor-pointer"
              >
                Toplantıdan Ayrıl
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              {question.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onAnswerPreset(opt.tone)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-xs sm:text-sm text-slate-200 hover:border-cyan-400/60 hover:bg-cyan-500/10 transition"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Kendi Cevabını Yaz (Özel Açıklama)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Örn: Taraftarımızla birlikte şampiyonluğa yürüyoruz..."
                  className="flex-1 rounded-lg border border-white/15 bg-[#0b1322] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!customText.trim()}
                  onClick={() => {
                    onAnswerCustom(customText);
                    setCustomText('');
                  }}
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-40 hover:bg-cyan-400"
                >
                  Gönder
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={onSkip}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
              >
                Soruyu Yanıtsız Bırak / Toplantıyı Bitir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface CareerFinaleModalProps {
  open: boolean;
  managerName: string;
  seasonHistory: SeasonHistoryEntry[];
  onClose: () => void;
}

export const CareerFinaleModal: React.FC<CareerFinaleModalProps> = ({
  open,
  managerName,
  seasonHistory,
  onClose,
}) => {
  if (!open) return null;
  const totalTrophies = seasonHistory.reduce((acc, s) => acc + s.trophiesWon.length, 0);
  const totalWins = seasonHistory.reduce((acc, s) => acc + s.won, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-400/40 bg-[#0b1322] p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-amber-400" />
            <div>
              <h2 className="text-xl font-black text-amber-300">30 Sezonluk Kariyer Finali — Onur Listesi</h2>
              <p className="text-xs text-slate-400">{managerName} · Zephyr Manager 27 Efsanesi</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <div className="text-xs text-slate-400">Tamamlanan Sezon</div>
            <div className="text-2xl font-black text-white">{seasonHistory.length} / 30</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <div className="text-xs text-slate-400">Kazanılan Kupa</div>
            <div className="text-2xl font-black text-amber-400">{totalTrophies}</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <div className="text-xs text-slate-400">Toplam Galibiyet</div>
            <div className="text-2xl font-black text-emerald-400">{totalWins}</div>
          </div>
        </div>

        <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
          {seasonHistory.map((h) => (
            <div key={`${h.seasonNumber}_${h.leagueId}`} className="flex items-center justify-between text-xs border-b border-white/5 pb-2 last:border-0">
              <div>
                <span className="font-bold text-amber-300">{h.seasonLabel}</span> · {h.clubName} (Sıra: {h.finalPosition || '—'})
              </div>
              <div className="text-slate-400">
                Şampiyon: <span className="text-white">{h.championName}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

interface MobileBottomNavProps {
  currentScreen: AppScreen;
  unreadInboxCount: number;
  onNavigate: (screen: AppScreen) => void;
  onOpenHoliday: () => void;
  onOpenPress: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentScreen,
  unreadInboxCount,
  onNavigate,
  onOpenHoliday,
  onOpenPress,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems: Array<{ screen: AppScreen; label: string; icon: React.ReactNode }> = [
    { screen: 'DASHBOARD', label: 'Ana Sayfa', icon: <Home className="h-5 w-5" /> },
    { screen: 'SQUAD', label: 'Kadro', icon: <Users className="h-5 w-5" /> },
    { screen: 'TACTICS', label: 'Taktikler', icon: <Sliders className="h-5 w-5" /> },
    { screen: 'TRANSFERS', label: 'Transfer', icon: <Briefcase className="h-5 w-5" /> },
  ];

  return (
    <>
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/70 backdrop-blur-sm flex items-end" onClick={() => setDrawerOpen(false)}>
          <div
            className="w-full rounded-t-2xl border-t border-white/15 bg-[#0b1322] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-sm font-bold">Daha Fazla Menü</span>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2.5 text-xs">
              <button
                onClick={() => { setDrawerOpen(false); onNavigate('INBOX'); }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 p-3 border border-white/10"
              >
                <Inbox className="h-5 w-5 text-cyan-400" />
                <span>Gelen ({unreadInboxCount})</span>
              </button>
              <button
                onClick={() => { setDrawerOpen(false); onNavigate('STANDINGS'); }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 p-3 border border-white/10"
              >
                <Trophy className="h-5 w-5 text-amber-400" />
                <span>Ligler</span>
              </button>
              <button
                onClick={() => { setDrawerOpen(false); onNavigate('STAFF'); }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 p-3 border border-white/10"
              >
                <Shield className="h-5 w-5 text-emerald-400" />
                <span>Personel</span>
              </button>
              <button
                onClick={() => { setDrawerOpen(false); onNavigate('SCOUTING'); }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 p-3 border border-white/10"
              >
                <ClipboardList className="h-5 w-5 text-purple-400" />
                <span>Gözlemci</span>
              </button>
              <button
                onClick={() => { setDrawerOpen(false); onOpenPress(); }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-cyan-500/15 p-3 border border-cyan-400/30 text-cyan-200"
              >
                <Mic className="h-5 w-5" />
                <span>Basın</span>
              </button>
              <button
                onClick={() => { setDrawerOpen(false); onOpenHoliday(); }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-emerald-500/15 p-3 border border-emerald-400/30 text-emerald-200"
              >
                <Palmtree className="h-5 w-5" />
                <span>Tatile Git</span>
              </button>
              <button
                onClick={() => { setDrawerOpen(false); onNavigate('SAVE_SLOTS'); }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 p-3 border border-white/10"
              >
                <Calendar className="h-5 w-5 text-slate-300" />
                <span>Kayıt / Yedek</span>
              </button>
              <button
                onClick={() => { setDrawerOpen(false); onNavigate('SETTINGS'); }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 p-3 border border-white/10"
              >
                <Settings className="h-5 w-5 text-slate-300" />
                <span>Ayarlar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Mobil Alt Gezinme"
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-white/10 bg-[#080f1c]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const active = currentScreen === item.screen;
            return (
              <button
                key={item.screen}
                type="button"
                onClick={() => onNavigate(item.screen)}
                className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${
                  active ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-white"
          >
            <Menu className="h-5 w-5" />
            <span>Daha Fazla</span>
            {unreadInboxCount > 0 && (
              <span className="absolute top-2 right-4 h-2 w-2 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: '1. 30 Sezonluk Kariyer & 13 Lig',
    body: 'Zephyr Manager 27’de 2026–27 sezonundan başlayarak 30 sezon boyunca kariyerini yönetebilirsin. Süper Lig, Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Liga Portugal ve Belgian Pro League dahil 13 lig aynı anda simüle edilir.',
  },
  {
    title: '2. 3D/2D Taktik, Duran Toplar & Kaptanlar',
    body: '3D/2D Taktik ekranından dizilişini seçebilir, oyuncuları sahada sürükleyip bırakabilir, alt kısımdaki Duran Top & Kaptanlar panelinden 1. Kaptan, Yardımcı Kaptan, penaltıcı, frikikçi, kornerci ve duran top organizasyonlarını belirleyebilirsin.',
  },
  {
    title: '3. Canlı 3D Maç Motoru & Maç İçi Taktik Paneli',
    body: 'Maç esnasında Yayın, Taktik, Kale Arkası ve Dinamik kameralar arasında geçiş yapabilir; alt bardaki "Taktik Paneli" butonuyla maçı duraklatıp anlık diziliş, pres, tempo ve oyuncu değişikliği yapabilirsin.',
  },
  {
    title: '4. Basın Toplantıları, Transfer & Personel',
    body: 'Üst bardaki "Basın" butonuyla maç önü, maç sonu ve transfer olaylarında Türk spor medyası muhabirlerinin sorularını hazır veya kendi yazdığın cevaplarla yanıtlayabilirsin. Asistan Menajerin taktik bilgisi maç ve tatil simülasyonlarını doğrudan etkiler.',
  },
  {
    title: '5. Tatile Git & Zorluk Ayarları',
    body: 'Üst bardaki "Tatile Git" butonuyla belirli gün, sonraki maç veya sezon sonuna kadar hızlı simülasyon yapabilirsin. Ayarlar ekranından oyun zorluğunu Kolay / Normal / Zor olarak değiştirebilir ve grafik kalitesini ayarlayabilirsin.',
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  if (!open) return null;
  const current = TUTORIAL_STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-[#b7ff4a]/35 bg-[#0b1322] p-6 text-slate-100 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#b7ff4a]">
              Zephyr Manager 27 · İnteraktif Öğretici ({step + 1}/{TUTORIAL_STEPS.length})
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">{current.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-slate-200">{current.body}</p>

        <div className="flex items-center gap-1.5">
          {TUTORIAL_STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-1.5 flex-1 rounded-full transition cursor-pointer ${
                i <= step ? 'bg-[#b7ff4a]' : 'bg-white/15'
              }`}
              aria-label={`Adım ${i + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-slate-300 disabled:opacity-35 hover:bg-white/10 cursor-pointer"
          >
            ← Önceki
          </button>
          {step < TUTORIAL_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-xl bg-[#b7ff4a] px-5 py-2 text-xs font-black text-slate-950 hover:bg-[#c8ff70] cursor-pointer"
            >
              Sonraki →
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400 cursor-pointer"
            >
              Öğreticiyi Bitir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
