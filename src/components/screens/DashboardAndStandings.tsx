import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Flame,
  LogOut,
  Mail,
  Mic,
  Newspaper,
  Play,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import { getLeagueMeta } from '../../engine/database';
import {
  calculateTacticalStrength,
  evaluatePressQuestion,
  formatMoney,
  generatePressConferenceQuestions,
  getClubDisplayName,
  getPlayerDisplayName,
  getStadiumDisplayName,
  isDerbyFixture,
} from '../../engine/hardcoreRules';
import { BoardInterviewModal, ResignModal } from '../CareerModals';
import {
  AppScreen,
  Club,
  Fixture,
  InboxMessage,
  Language,
  LeagueId,
  LicenseMode,
  ManagerProfile,
  NewsItem,
  StandingRow,
  TacticsConfig,
} from '../../engine/types';
import { ClubCrest, ClubKitSvg, ManagerPortraitSvg, PlayerAvatarSvg } from '../BrandArt';

export interface PressConferenceResult {
  moraleDelta: number;
  confidenceDelta: number;
  repDelta: number;
  headline: string;
  body: string;
}

interface DashboardScreenProps {
  club: Club | null;
  clubs: Club[];
  leagueId: LeagueId;
  manager: ManagerProfile;
  tactics: TacticsConfig;
  nextFixture: Fixture | null;
  standings: StandingRow[];
  news: NewsItem[];
  unreadInboxCount: number;
  latestInbox?: InboxMessage;
  currentWeek: number;
  totalWeeks: number;
  pressAnsweredThisWeek: boolean;
  licenseMode: LicenseMode;
  language: Language;
  onGoTactics: () => void;
  onPlayMatch: () => void;
  onGoSquad: () => void;
  onGoTransfers: () => void;
  onGoFinance: () => void;
  onGoInbox: () => void;
  onNavigateScreen: (screen: AppScreen) => void;
  onAcceptJob: (clubId: string, targetLeagueId?: LeagueId) => void;
  onResignClub?: (reasonLabel: string, customNote: string, repImpact: number) => void;
  onAdvanceUnemployedWeek: () => void;
  onAnswerPress: (result: PressConferenceResult) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  club,
  clubs,
  leagueId,
  manager,
  tactics,
  nextFixture,
  standings,
  news,
  unreadInboxCount,
  latestInbox,
  currentWeek,
  totalWeeks,
  pressAnsweredThisWeek,
  licenseMode,
  language,
  onGoTactics,
  onPlayMatch,
  onGoSquad,
  onGoTransfers,
  onGoFinance,
  onGoInbox,
  onNavigateScreen,
  onAcceptJob,
  onResignClub,
  onAdvanceUnemployedWeek,
  onAnswerPress,
}) => {
  const tr = language === 'tr';
  const leagueMeta = getLeagueMeta(leagueId);
  const leagueName = leagueMeta.name;
  const leagueShort = leagueMeta.shortName;
  const [interviewTarget, setInterviewTarget] = useState<Club | null>(null);
  const [resignModalOpen, setResignModalOpen] = useState(false);
  const [pressModalOpen, setPressModalOpen] = useState(false);
  const [pressStep, setPressStep] = useState(0);
  const [pressAccum, setPressAccum] = useState<PressConferenceResult>({
    moraleDelta: 0,
    confidenceDelta: 0,
    repDelta: 0,
    headline: '',
    body: '',
  });

  // UNEMPLOYED / FREE AGENT MANAGER CAREER OFFICE
  if (!club) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-[#111b21] border border-white/10 p-6 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <ManagerPortraitSvg appearance={manager.appearance} photoUrl={manager.customPhotoDataUrl} size={76} />
            <div>
              <div className="text-xs font-mono-num text-[#00e5ff] uppercase tracking-wider">
                {tr ? 'Kulüpsüz Teknik Direktör (İş Arayışı)' : 'Unemployed Manager — Job Market'}
              </div>
              <h2 className="font-display font-bold text-2xl text-white mt-0.5">
                {manager.firstName} {manager.lastName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {manager.nationality} · {manager.age} {tr ? 'Yaş' : 'yrs'} ·{' '}
                {tr ? 'İtibar:' : 'Reputation:'}{' '}
                <strong className="font-mono-num text-[#b7ff4a]">{manager.reputation}</strong> ·{' '}
                {tr ? 'Tarz:' : 'Style:'} {manager.personality}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onAdvanceUnemployedWeek();
            }}
            className="px-5 py-3 rounded-xl bg-[#17242c] hover:bg-[#b7ff4a] hover:text-[#080d11] border border-white/15 text-xs font-display font-bold text-white flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FastForward className="w-4 h-4" />
            <span>
              {tr
                ? `Hafta ${Math.min(totalWeeks, currentWeek)}/${totalWeeks} Simüle Et & Fırsat Bekle`
                : `Advance Week ${Math.min(totalWeeks, currentWeek)}`}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clubs.map((c) => {
            const rank = standings.findIndex((s) => s.clubId === c.id) + 1;
            const avgOvr = Math.round(
              c.players.slice(0, 11).reduce((s, p) => s + p.ovr, 0) / Math.min(11, c.players.length)
            );
            return (
              <div
                key={c.id}
                className="rounded-xl bg-[#111b21] border border-white/10 p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ClubCrest club={c} licenseMode={licenseMode} size={46} />
                    <div className="min-w-0">
                      <div className="font-display font-bold text-base text-white truncate">
                        {getClubDisplayName(c, licenseMode)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        #{rank} · {tr ? 'Prestij' : 'Rep'} {c.reputation} · OVR {avgOvr}
                      </div>
                    </div>
                  </div>
                  <ClubKitSvg club={c} size={38} />
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{tr ? 'Transfer Bütçesi' : 'Budget'}</span>
                    <span className="font-mono-num text-[#b7ff4a] font-bold">{formatMoney(c.transferBudget)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{c.boardExpectation}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setInterviewTarget(c);
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#17242c] hover:bg-[#b7ff4a] hover:text-[#080d11] text-white font-display font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{tr ? 'Yönetimle İş Görüşmesine Gir' : 'Enter Board Interview'}</span>
                </button>
              </div>
            );
          })}
        </div>

        {interviewTarget && (
          <BoardInterviewModal
            club={interviewTarget}
            leagueId={interviewTarget.leagueId}
            manager={manager}
            licenseMode={licenseMode}
            language={language}
            onClose={() => setInterviewTarget(null)}
            onHireSuccess={(clubId, hiredLeagueId) => {
              setInterviewTarget(null);
              onAcceptJob(clubId, hiredLeagueId);
            }}
          />
        )}
      </div>
    );
  }

  const myRank = standings.findIndex((s) => s.clubId === club.id) + 1;
  const myRow = standings.find((s) => s.clubId === club.id);
  const strength = calculateTacticalStrength(club, tactics);
  const injuredPlayers = club.players.filter((p) => p.injuredWeeks > 0);
  const tiredPlayers = club.players.filter((p) => p.condition < 68 && p.injuredWeeks === 0);
  const weeklyWages = club.players.reduce((s, p) => s + p.weeklyWage, 0);

  const oppClub = nextFixture
    ? clubs.find((c) => c.id === (nextFixture.homeClubId === club.id ? nextFixture.awayClubId : nextFixture.homeClubId))
    : null;
  const isHome = nextFixture ? nextFixture.homeClubId === club.id : true;
  const derbyLabel = nextFixture ? isDerbyFixture(nextFixture.homeClubId, nextFixture.awayClubId) : null;

  return (
    <div className="space-y-6">
      {/* Top Hero Row: Next Matchday Card + Club Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 rounded-xl bg-[#111b21] border border-white/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
              <span>
                {nextFixture
                  ? tr
                    ? `${leagueShort} Hafta ${currentWeek} / ${totalWeeks}`
                    : `${leagueShort} Week ${currentWeek} / ${totalWeeks}`
                  : tr
                  ? `${totalWeeks} Haftalık Sezon Tamamlandı`
                  : `${totalWeeks}-Week Season Complete`}{' '}
                ·{' '}
                {nextFixture
                  ? getStadiumDisplayName(isHome ? club : oppClub ?? club, licenseMode)
                  : ''}
              </span>
              <span className="font-mono-num text-[#00e5ff]">
                {tactics.formation} · {tactics.mentality}
              </span>
            </div>

            {derbyLabel && nextFixture && (
              <div className="mt-3 px-3.5 py-2 rounded-lg bg-amber-500/10 border border-amber-400/35 flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 font-display font-bold text-amber-300">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{derbyLabel}</span>
                </span>
                <span className="text-[11px] text-amber-200/90">
                  {tr ? '+%25 Derbi Gişe & Atmosfer Primi' : '+25% Derby Gate Bonus'}
                </span>
              </div>
            )}

            {nextFixture && oppClub ? (
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 py-4 px-5 rounded-lg bg-[#080d11]/80 border border-white/5">
                <div className="grid grid-cols-[58px_1fr] sm:flex items-center gap-4 w-full max-w-[290px] sm:max-w-none sm:w-auto min-w-0">
                  <div className="w-[58px] h-[58px] flex items-center justify-center shrink-0">
                    <ClubCrest club={isHome ? club : oppClub} licenseMode={licenseMode} size={58} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">{tr ? 'Ev Sahibi' : 'Home'}</div>
                    <div className="font-display font-bold text-xl text-white truncate">
                      {getClubDisplayName(isHome ? club : oppClub, licenseMode)}
                    </div>
                  </div>
                </div>

                <div className="text-center shrink-0">
                  <div className="font-display font-bold text-2xl text-[#b7ff4a]">VS</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {isHome ? (tr ? 'İç Saha' : 'Home') : tr ? 'Deplasman' : 'Away'}
                  </div>
                </div>

                <div className="grid grid-cols-[58px_1fr] sm:flex items-center gap-4 w-full max-w-[290px] sm:max-w-none sm:w-auto min-w-0 sm:flex-row-reverse sm:text-right">
                  <div className="w-[58px] h-[58px] flex items-center justify-center shrink-0">
                    <ClubCrest club={isHome ? oppClub : club} licenseMode={licenseMode} size={58} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">{tr ? 'Deplasman' : 'Away'}</div>
                    <div className="font-display font-bold text-xl text-white truncate">
                      {getClubDisplayName(isHome ? oppClub : club, licenseMode)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-6 rounded-lg bg-[#080d11]/80 text-center text-slate-300">
                {tr
                  ? `${totalWeeks} haftalık ${leagueName} fikstürü tamamlandı!`
                  : `All ${totalWeeks} matchweeks completed!`}
              </div>
            )}

            {strength.warnings.length > 0 && (
              <div className="mt-4 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                {strength.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {nextFixture && (
              <button
                type="button"
                onClick={onPlayMatch}
                className="py-3 px-6 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{tr ? '3D Maç Gününe Çık' : 'Launch 3D Matchday'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onGoTactics}
              className="py-3 px-5 rounded-lg bg-[#17242c] hover:bg-[#1f313b] border border-white/10 text-white text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>{tr ? '3D Taktik Sahası' : '3D Tactics Pitch'}</span>
              <ArrowRight className="w-4 h-4 text-[#00e5ff]" />
            </button>
          </div>
        </div>

        {/* Club & Manager Snapshot */}
        <div className="lg:col-span-4 rounded-xl bg-[#111b21] border border-white/10 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400">
                {tr ? `${leagueShort} Sıralaması` : 'League Position'}
              </div>
              <div className="font-mono-num text-3xl font-bold text-white mt-0.5">
                #{myRank || '-'} <span className="text-sm font-normal text-slate-400">/ {clubs.length}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                <span className="font-mono-num text-[#b7ff4a]">{myRow?.points ?? 0}</span>{' '}
                {tr ? 'Puan' : 'Pts'} · {myRow?.won ?? 0}G {myRow?.drawn ?? 0}B {myRow?.lost ?? 0}M
              </div>
            </div>
            <ClubKitSvg club={club} size={74} />
          </div>

          <div className="mt-4 p-3 rounded-lg bg-[#080d11] border border-white/5 flex items-center gap-3">
            <ManagerPortraitSvg appearance={manager.appearance} photoUrl={manager.customPhotoDataUrl} size={42} />
            <div className="min-w-0 text-xs">
              <div className="font-semibold text-white truncate">
                {manager.firstName} {manager.lastName}
              </div>
              <div className="text-[11px] text-[#00e5ff]">
                {manager.personality} · {tr ? 'İtibar' : 'Rep'} {manager.reputation}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-slate-400">{tr ? 'Efektif Güç' : 'Tactical OVR'}</div>
              <div className="font-mono-num text-lg font-bold text-[#00e5ff] mt-0.5">{strength.overall}</div>
            </div>
            <div>
              <div className="text-slate-400">{tr ? 'Yönetim Güveni' : 'Board Trust'}</div>
              <div className="font-mono-num text-lg font-bold text-white mt-0.5">{club.boardConfidence}%</div>
            </div>
          </div>

          {onResignClub && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setResignModalOpen(true);
              }}
              className="mt-4 w-full py-2.5 px-3 rounded-lg bg-[#080d11] hover:bg-red-500/15 border border-red-500/35 text-xs font-semibold text-red-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{tr ? 'Kulüpten İstifa Et' : 'Resign from Club'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Pre-Match Press Conference Strip + Interactive 5-Question Modal */}
      {nextFixture && oppClub && (
        <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#080d11] border border-[#00e5ff]/30 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4 text-[#00e5ff]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">
                {tr
                  ? `Hafta ${currentWeek} Maç Öncesi Basın Toplantısı (5 Soru)`
                  : `Week ${currentWeek} Pre-Match Press Conference (5 Questions)`}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {pressAnsweredThisWeek
                  ? tr
                    ? 'Bu haftaki 5 soruluk basın toplantısı tamamlandı. Açıklamalarınız soyunma odasına ve yönetime yansıdı.'
                    : 'Press briefing complete for this week.'
                  : tr
                  ? `Basın mensupları ${getClubDisplayName(oppClub, licenseMode)} maçı öncesi 5 soruyla mikrofonları hazırladı.`
                  : `Journalists are ready with 5 questions ahead of ${getClubDisplayName(oppClub, licenseMode)}.`}
              </p>
            </div>
          </div>

          {!pressAnsweredThisWeek && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setPressStep(0);
                setPressAccum({ moraleDelta: 0, confidenceDelta: 0, repDelta: 0, headline: '', body: '' });
                setPressModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-lg bg-[#080d11] hover:bg-[#b7ff4a] hover:text-[#080d11] border border-[#00e5ff]/50 text-xs font-display font-bold text-[#00e5ff] cursor-pointer whitespace-nowrap transition-colors"
            >
              {tr ? 'Basın Toplantısına Katıl (5 Soru)' : 'Enter Press Room (5 Questions)'}
            </button>
          )}
        </div>
      )}

      {/* FM26 Quick Operations Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(
          [
            ['TRAINING', tr ? 'Antrenman' : 'Training', tr ? 'Haftalık Program' : 'Weekly Plan'],
            ['SCOUTING', tr ? 'Gözlemci & Arama' : 'Scouting', tr ? '9 Lig Havuzu' : '9-League DB'],
            ['MEDICAL', tr ? 'Sağlık Merkezi' : 'Medical', `${injuredPlayers.length} ${tr ? 'Sakat' : 'Injured'}`],
            ['TEAM_REPORT', tr ? 'Takım Raporu' : 'Team Report', tr ? 'Hat Analizi' : 'Positional Depth'],
            ['SAVE_SLOTS', tr ? 'Kayıt Yuvaları' : 'Save Slots', tr ? '5 Yuva · Kaydet' : '5 Slots'],
          ] as Array<[AppScreen, string, string]>
        ).map(([target, title, sub]) => (
          <button
            key={target}
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onNavigateScreen(target);
            }}
            className="p-3.5 rounded-xl bg-[#111b21] hover:bg-[#17242c] border border-white/10 hover:border-[#b7ff4a]/60 text-left cursor-pointer transition-colors"
          >
            <div className="font-display font-bold text-xs text-white">{title}</div>
            <div className="text-[11px] text-[#00e5ff] mt-0.5">{sub}</div>
          </button>
        ))}
      </div>

      {pressModalOpen && nextFixture && oppClub && (() => {
        const questions = generatePressConferenceQuestions(club, oppClub, currentWeek, derbyLabel, licenseMode);
        const q = questions[pressStep];
        if (!q) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-[#111b21] border border-white/15 p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#080d11] border border-[#00e5ff]/40 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-[#00e5ff]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono-num text-[#b7ff4a]">
                      {tr ? `SORU ${pressStep + 1} / ${questions.length}` : `QUESTION ${pressStep + 1}/${questions.length}`}
                    </div>
                    <div className="font-display font-bold text-base text-white">
                      {q.journalist} · <span className="text-slate-400 font-normal text-xs">{q.outlet}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPressModalOpen(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {tr ? 'Kapat' : 'Close'}
                </button>
              </div>

              <p className="text-sm text-slate-100 leading-relaxed bg-[#080d11] p-4 rounded-xl border border-white/10">
                “{q.question}”
              </p>

              <div className="space-y-2.5">
                {q.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      const res = evaluatePressQuestion(opt.choice, manager.personality);
                      const combined: PressConferenceResult = {
                        moraleDelta: Math.min(8, pressAccum.moraleDelta + Math.round(res.moraleDelta * 0.6)),
                        confidenceDelta: Math.min(6, pressAccum.confidenceDelta + Math.round(res.confidenceDelta * 0.6)),
                        repDelta: Math.min(3, pressAccum.repDelta + (pressStep === 0 ? res.repDelta : 0)),
                        headline: pressStep === 0 ? res.headline : pressAccum.headline || res.headline,
                        body: res.body,
                      };
                      if (pressStep + 1 < questions.length) {
                        setPressAccum(combined);
                        setPressStep((s) => s + 1);
                      } else {
                        soundEngine.playSuccess();
                        setPressModalOpen(false);
                        onAnswerPress(combined);
                      }
                    }}
                    className="w-full p-3.5 rounded-xl bg-[#080d11] hover:bg-[#0a1128] border border-white/10 hover:border-[#b7ff4a] text-left cursor-pointer transition-colors"
                  >
                    <div className="text-xs font-medium text-white">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {resignModalOpen && onResignClub && (
        <ResignModal
          club={club}
          licenseMode={licenseMode}
          language={language}
          onClose={() => setResignModalOpen(false)}
          onConfirmResign={(reasonLabel, customNote, repImpact) => {
            setResignModalOpen(false);
            onResignClub(reasonLabel, customNote, repImpact);
          }}
        />
      )}

      {/* FM26-style Gelen Kutusu (Inbox) Preview Strip */}
      <div className="rounded-xl bg-[#111b21] border border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#080d11] border border-[#b7ff4a]/35 flex items-center justify-center shrink-0 relative">
            <Mail className="w-4 h-4 text-[#b7ff4a]" />
            {unreadInboxCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#b7ff4a] text-[#080d11] font-mono-num text-[10px] font-bold flex items-center justify-center">
                {unreadInboxCount}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-display font-bold text-white">
                {tr ? 'Gelen Kutusu (Inbox)' : 'Manager Inbox'}
              </span>
              <span className="text-[#00e5ff] font-mono-num">
                {unreadInboxCount > 0
                  ? tr
                    ? `${unreadInboxCount} okunmamış mesaj`
                    : `${unreadInboxCount} unread`
                  : tr
                  ? 'Tüm mesajlar okundu'
                  : 'All caught up'}
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate mt-1">
              {latestInbox
                ? `${latestInbox.sender}: ${latestInbox.subject}`
                : tr
                ? 'Yönetim kurulu, sağlık ekibi ve gözlemci raporları burada toplanır.'
                : 'Board, medical, and scouting dispatches appear here.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onGoInbox();
          }}
          className="px-4 py-2 rounded-lg bg-[#080d11] hover:bg-[#b7ff4a] hover:text-[#080d11] border border-white/15 text-xs font-display font-bold text-white flex items-center gap-2 cursor-pointer shrink-0 transition-colors"
        >
          <span>{tr ? 'Gelen Kutusunu Aç' : 'Open Inbox'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Economy, Medical, News & Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-400">{tr ? 'Transfer Bütçesi' : 'Transfer Budget'}</div>
            <div className="font-mono-num text-2xl font-bold text-[#b7ff4a] mt-1">
              {formatMoney(club.transferBudget)}
            </div>
            <div className="mt-3 text-xs text-slate-400 flex justify-between">
              <span>{tr ? 'Haftalık Maaş' : 'Wages'}</span>
              <span className="font-mono-num text-slate-200">
                {formatMoney(weeklyWages)} / {formatMoney(club.wageBudgetWeekly)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded bg-[#080d11] overflow-hidden">
              <div
                className={`h-full ${weeklyWages > club.wageBudgetWeekly * 0.9 ? 'bg-red-500' : 'bg-[#00e5ff]'}`}
                style={{ width: `${Math.min(100, (weeklyWages / club.wageBudgetWeekly) * 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onGoTransfers}
              className="text-xs font-medium text-[#b7ff4a] hover:underline cursor-pointer"
            >
              {tr ? 'Transfer →' : 'Transfers →'}
            </button>
            <button
              type="button"
              onClick={onGoFinance}
              className="text-xs font-medium text-slate-300 hover:underline cursor-pointer"
            >
              {tr ? 'Finans →' : 'Finance →'}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{tr ? 'Sağlık & Kondisyon' : 'Medical Watch'}</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {injuredPlayers.length === 0 && tiredPlayers.length === 0 ? (
                <p className="text-slate-300">{tr ? 'Sakat yok. Kondisyon iyi.' : 'No injuries.'}</p>
              ) : (
                <>
                  {injuredPlayers.slice(0, 2).map((p) => (
                    <div key={p.id} className="flex justify-between text-red-300">
                      <span className="truncate">{getPlayerDisplayName(p, licenseMode)}</span>
                      <span className="font-mono-num shrink-0">{p.injuredWeeks}h</span>
                    </div>
                  ))}
                  {tiredPlayers.slice(0, 2).map((p) => (
                    <div key={p.id} className="flex justify-between text-amber-300">
                      <span className="truncate">{getPlayerDisplayName(p, licenseMode)}</span>
                      <span className="font-mono-num shrink-0">{p.condition}%</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onGoSquad}
            className="mt-4 text-left text-xs font-medium text-[#00e5ff] hover:underline cursor-pointer"
          >
            {tr ? 'Kadroyu Yönet →' : 'Manage Squad →'}
          </button>
        </div>

        <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{tr ? 'Takımın Yıldızları' : 'Top Performers'}</span>
              <TrendingUp className="w-4 h-4 text-[#b7ff4a]" />
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {[...club.players]
                .sort((a, b) => b.goals - a.goals || b.ovr - a.ovr)
                .slice(0, 3)
                .map((p) => (
                  <div key={p.id} className="flex justify-between text-slate-200 gap-2">
                    <span className="truncate">{getPlayerDisplayName(p, licenseMode)}</span>
                    <span className="font-mono-num text-slate-400 shrink-0">
                      {p.goals}G {p.assists}A
                    </span>
                  </div>
                ))}
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            {tr ? 'Hardcore: Genç gelişimi yavaştır.' : 'Hardcore: Slow youth growth.'}
          </div>
        </div>

        <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs text-slate-400">{tr ? 'Kulüp Haber Akışı' : 'Club News Feed'}</span>
              <Newspaper className="w-4 h-4 text-[#00e5ff]" />
            </div>
            <div className="space-y-2.5 text-xs">
              {news.slice(0, 2).map((n) => (
                <div key={n.id} className="pb-2 border-b border-white/5 last:border-none last:pb-0">
                  <div className="font-semibold text-white truncate">{n.title}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{n.body}</div>
                </div>
              ))}
              {news.length === 0 && (
                <p className="text-slate-400">{tr ? 'Sezon başlıyor. İlk maçına hazırlan!' : 'Season kickoff awaits.'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StandingsScreenProps {
  clubs: Club[];
  leagueId: LeagueId;
  activeLeagues?: LeagueId[];
  onSelectInspectedLeague?: (leagueId: LeagueId) => void;
  fixtures: Fixture[];
  currentWeek: number;
  standings: StandingRow[];
  myClubId: string | null;
  licenseMode: LicenseMode;
  language: Language;
}

export const StandingsScreen: React.FC<StandingsScreenProps> = ({
  clubs,
  leagueId,
  activeLeagues,
  onSelectInspectedLeague,
  fixtures,
  currentWeek,
  standings,
  myClubId,
  licenseMode,
  language,
}) => {
  const tr = language === 'tr';
  const leagueMeta = getLeagueMeta(leagueId);
  const leagueName = leagueMeta.name;
  const totalWeeks = Math.max(1, (clubs.length - 1) * 2);
  const [view, setView] = useState<'TABLE' | 'FIXTURES' | 'SCORERS'>('TABLE');
  const [selectedWeek, setSelectedWeek] = useState<number>(() => Math.min(totalWeeks, currentWeek));

  useEffect(() => {
    setSelectedWeek((prev) => Math.min(totalWeeks, Math.max(1, prev > totalWeeks ? currentWeek : prev)));
  }, [totalWeeks, currentWeek]);

  const topPlayers = useMemo(() => {
    const all = clubs.flatMap((c) => c.players.map((p) => ({ player: p, club: c })));
    return all
      .sort((a, b) => b.player.goals - a.player.goals || b.player.assists - a.player.assists || b.player.ovr - a.player.ovr)
      .slice(0, 20);
  }, [clubs]);

  const weekFixtures = useMemo(
    () => fixtures.filter((f) => f.week === selectedWeek),
    [fixtures, selectedWeek]
  );

  const visibleLeagues = activeLeagues && activeLeagues.length > 0 ? activeLeagues : [leagueId];

  return (
    <div className="rounded-xl bg-[#111b21] border border-white/10 overflow-hidden">
      {visibleLeagues.length > 1 && onSelectInspectedLeague && (
        <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-[#080d11]/60 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-slate-400 font-medium shrink-0 mr-1">
            {tr ? 'Aktif Ligler:' : 'Active Leagues:'}
          </span>
          {visibleLeagues.map((lid) => {
            const lm = getLeagueMeta(lid);
            const selected = lid === leagueId;
            return (
              <button
                key={lid}
                type="button"
                onClick={() => onSelectInspectedLeague(lid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
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

      <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-white">
            {view === 'TABLE'
              ? tr
                ? `${leagueName} Puan Durumu (${clubs.length} Takım)`
                : `${leagueName} Standings (${clubs.length} Clubs)`
              : view === 'FIXTURES'
              ? tr
                ? `${leagueName} Fikstürü — Hafta ${selectedWeek}/${totalWeeks}`
                : `${leagueName} Fixtures — Week ${selectedWeek}/${totalWeeks}`
              : tr
              ? `${leagueMeta.shortName} Gol & Asist Krallığı`
              : `${leagueMeta.shortName} Top Scorers`}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {leagueMeta.zones.map((z) => (tr ? z.labelTr : z.labelEn)).join(' · ')}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080d11] border border-white/10">
          <button
            type="button"
            onClick={() => setView('TABLE')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap ${
              view === 'TABLE' ? 'bg-[#b7ff4a] text-[#080d11] font-bold' : 'text-slate-300'
            }`}
          >
            {tr ? 'Puan Tablosu' : 'Table'}
          </button>
          <button
            type="button"
            onClick={() => setView('FIXTURES')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              view === 'FIXTURES' ? 'bg-[#b7ff4a] text-[#080d11] font-bold' : 'text-slate-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{tr ? `${totalWeeks} Hafta Fikstür` : `${totalWeeks}w Fixtures`}</span>
          </button>
          <button
            type="button"
            onClick={() => setView('SCORERS')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              view === 'SCORERS' ? 'bg-[#00e5ff] text-[#080d11] font-bold' : 'text-slate-300'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{tr ? 'Gol Krallığı' : 'Top Scorers'}</span>
          </button>
        </div>
      </div>

      {view === 'TABLE' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">{tr ? 'Kulüp' : 'Club'}</th>
                <th className="py-3 px-3 text-right font-mono-num">O</th>
                <th className="py-3 px-3 text-right font-mono-num">G</th>
                <th className="py-3 px-3 text-right font-mono-num">B</th>
                <th className="py-3 px-3 text-right font-mono-num">M</th>
                <th className="py-3 px-3 text-right font-mono-num">A</th>
                <th className="py-3 px-3 text-right font-mono-num">Y</th>
                <th className="py-3 px-3 text-right font-mono-num">AV</th>
                <th className="py-3 px-4 text-right font-mono-num">P</th>
                <th className="py-3 px-4">{tr ? 'Form' : 'Form'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {standings.map((row, index) => {
                const c = clubs.find((cl) => cl.id === row.clubId);
                if (!c) return null;
                const isMine = c.id === myClubId;
                const rank = index + 1;
                const zoneMatch = leagueMeta.zones.find((z) => rank >= z.fromRank && rank <= z.toRank);
                const rankColorClass =
                  zoneMatch?.color === '#b7ff4a'
                    ? 'text-[#b7ff4a]'
                    : zoneMatch?.color === '#00e5ff'
                    ? 'text-[#00e5ff]'
                    : zoneMatch?.color === '#f87171'
                    ? 'text-red-400'
                    : 'text-slate-300';

                return (
                  <tr key={c.id} className={isMine ? 'bg-[#b7ff4a]/10' : 'hover:bg-white/[0.02]'}>
                    <td className="py-2.5 px-4 font-mono-num font-bold">
                      <span className={rankColorClass}>{rank}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3">
                        <ClubCrest club={c} licenseMode={licenseMode} size={30} />
                        <div>
                          <span className={`font-medium ${isMine ? 'text-[#b7ff4a] font-bold' : 'text-white'}`}>
                            {getClubDisplayName(c, licenseMode)}
                          </span>
                          <span className="ml-2 text-[11px] text-slate-500">{c.city}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-slate-300">{row.played}</td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-slate-300">{row.won}</td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-slate-300">{row.drawn}</td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-slate-300">{row.lost}</td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-slate-300">{row.gf}</td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-slate-300">{row.ga}</td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-slate-200">
                      {row.gd > 0 ? `+${row.gd}` : row.gd}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num font-bold text-white">{row.points}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1">
                        {row.form.length === 0 ? (
                          <span className="text-xs text-slate-500">-</span>
                        ) : (
                          row.form.map((f, fi) => (
                            <span
                              key={fi}
                              className={`w-5 h-5 rounded text-[10px] font-mono-num font-bold inline-flex items-center justify-center ${
                                f === 'W'
                                  ? 'bg-[#b7ff4a] text-[#080d11]'
                                  : f === 'D'
                                  ? 'bg-slate-600 text-white'
                                  : 'bg-red-500/80 text-white'
                              }`}
                            >
                              {f}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'FIXTURES' && (
        <div className="p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedWeek <= 1}
                onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
                className="p-2 rounded-lg bg-[#080d11] border border-white/10 text-white disabled:opacity-35 cursor-pointer"
                aria-label="Önceki Hafta"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono-num text-sm font-bold text-white px-3">
                {tr ? `Hafta ${selectedWeek} / ${totalWeeks}` : `Week ${selectedWeek} / ${totalWeeks}`}
              </span>
              <button
                type="button"
                disabled={selectedWeek >= totalWeeks}
                onClick={() => setSelectedWeek((w) => Math.min(totalWeeks, w + 1))}
                className="p-2 rounded-lg bg-[#080d11] border border-white/10 text-white disabled:opacity-35 cursor-pointer"
                aria-label="Sonraki Hafta"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              {[1, 5, 10, 17, 18, 25, 30, 34, 38]
                .filter((w) => w <= totalWeeks)
                .map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setSelectedWeek(w)}
                    className={`px-2.5 py-1 rounded text-xs font-mono-num cursor-pointer ${
                      selectedWeek === w
                        ? 'bg-[#00e5ff] text-[#080d11] font-bold'
                        : 'bg-[#080d11] text-slate-400 border border-white/10'
                    }`}
                  >
                    H{w}
                  </button>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {weekFixtures.map((f) => {
              const h = clubs.find((c) => c.id === f.homeClubId);
              const a = clubs.find((c) => c.id === f.awayClubId);
              if (!h || !a) return null;
              const involvesMe = h.id === myClubId || a.id === myClubId;
              const derby = isDerbyFixture(h.id, a.id);

              return (
                <div
                  key={f.id}
                  className={`p-4 rounded-xl bg-[#080d11] border space-y-2.5 ${
                    involvesMe ? 'border-[#b7ff4a]/60' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{getStadiumDisplayName(h, licenseMode)}</span>
                    {derby && (
                      <span className="text-amber-300 font-semibold flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        <span>{derby}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ClubCrest club={h} licenseMode={licenseMode} size={26} />
                      <span className={`truncate ${h.id === myClubId ? 'text-[#b7ff4a] font-bold' : 'text-white'}`}>
                        {getClubDisplayName(h, licenseMode)}
                      </span>
                    </div>

                    <div className="font-mono-num font-bold text-sm px-2.5 py-1 rounded bg-[#111b21] text-white shrink-0">
                      {f.played ? `${f.homeGoals} - ${f.awayGoals}` : 'v'}
                    </div>

                    <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                      <span className={`truncate ${a.id === myClubId ? 'text-[#b7ff4a] font-bold' : 'text-white'}`}>
                        {getClubDisplayName(a, licenseMode)}
                      </span>
                      <ClubCrest club={a} licenseMode={licenseMode} size={26} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'SCORERS' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">{tr ? 'Oyuncu' : 'Player'}</th>
                <th className="py-3 px-4">{tr ? 'Kulüp' : 'Club'}</th>
                <th className="py-3 px-3 text-right font-mono-num">OVR</th>
                <th className="py-3 px-3 text-right font-mono-num">{tr ? 'Gol' : 'Goals'}</th>
                <th className="py-3 px-4 text-right font-mono-num">{tr ? 'Asist' : 'Assists'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topPlayers.map(({ player, club }, idx) => (
                <tr key={player.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-mono-num font-bold text-slate-300">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <PlayerAvatarSvg
                        appearance={player.appearance}
                        shirtColor={club.primaryColor}
                        accentColor={club.accentColor}
                        size={34}
                      />
                      <div>
                        <div className="font-medium text-white">{getPlayerDisplayName(player, licenseMode)}</div>
                        <div className="text-[11px] text-slate-400">{player.naturalRole}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <ClubCrest club={club} licenseMode={licenseMode} size={24} />
                      <span>{getClubDisplayName(club, licenseMode)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num text-[#00e5ff]">{player.ovr}</td>
                  <td className="py-3 px-3 text-right font-mono-num font-bold text-[#b7ff4a]">{player.goals}</td>
                  <td className="py-3 px-4 text-right font-mono-num text-white">{player.assists}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
