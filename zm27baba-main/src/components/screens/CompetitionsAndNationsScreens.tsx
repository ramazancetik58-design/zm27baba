import React, { useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  Coins,
  Flag,
  GitBranch,
  Globe2,
  Play,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import {
  formatMoney,
  getClubDisplayName,
  getClubShortName,
  getPlayerDisplayName,
} from '../../engine/hardcoreRules';
import {
  advanceNationsLeagueForWeek,
  computeNationsLeagueStandings,
  computeSwissStandings,
  EURO_DROP_WEEK,
  EURO_FINAL_WEEK,
  EURO_LEAGUE_PHASE_WEEKS,
  EURO_PLAYOFF_WEEKS,
  EURO_QF_WEEKS,
  EURO_R16_WEEKS,
  EURO_SF_WEEKS,
  EUROPEAN_PRIZE_TABLE,
  getCupTitle,
  getNationDisplayName,
  getNationShortName,
  getStageLabel,
  UNL_FINAL_WEEK,
  UNL_GROUP_WEEKS,
  UNL_SEMI_WEEK,
} from '../../engine/tournamentEngine';
import {
  Club,
  EuropeanCupId,
  EuropeanTournamentState,
  Fixture,
  FormationId,
  KnockoutTie,
  Language,
  LicenseMode,
  NationalTeam,
  NationalTeamTier,
  NationsLeagueState,
  TacticsConfig,
} from '../../engine/types';
import {
  ClubCrest,
  NationalFlagBadge,
  PlayerAvatarSvg,
  TournamentEmblemSvg,
} from '../BrandArt';

interface EuropeCupsScreenProps {
  tournaments: Record<EuropeanCupId, EuropeanTournamentState>;
  allClubs: Club[];
  myClubId: string | null;
  currentWeek: number;
  licenseMode: LicenseMode;
  language: Language;
  onLaunchEuropeanMatch: (cupId: EuropeanCupId, fixture: Fixture) => void;
  onOpenNationsHub: () => void;
}

export const EuropeCupsScreen: React.FC<EuropeCupsScreenProps> = ({
  tournaments,
  allClubs,
  myClubId,
  currentWeek,
  licenseMode,
  language,
  onLaunchEuropeanMatch,
  onOpenNationsHub,
}) => {
  const tr = language === 'tr';
  const clubMap = useMemo(() => new Map(allClubs.map((c) => [c.id, c])), [allClubs]);

  // Auto-default to whichever cup the user's club participates in
  const initialCup: EuropeanCupId = useMemo(() => {
    if (myClubId) {
      if (tournaments.UCL.participantIds.includes(myClubId)) return 'UCL';
      if (tournaments.UEL.participantIds.includes(myClubId)) return 'UEL';
      if (tournaments.UECL.participantIds.includes(myClubId)) return 'UECL';
    }
    return 'UCL';
  }, [myClubId, tournaments]);

  const [activeCup, setActiveCup] = useState<EuropeanCupId>(initialCup);
  const [subTab, setSubTab] = useState<'STANDINGS' | 'FIXTURES' | 'BRACKET' | 'PRIZES'>('STANDINGS');
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number>(currentWeek);

  const cup = tournaments[activeCup];
  const swissRows = useMemo(() => computeSwissStandings(cup, clubMap), [cup, clubMap]);

  const myClubCupFixtureThisWeek = useMemo(() => {
    if (!myClubId) return null;
    for (const cid of ['UCL', 'UEL', 'UECL'] as EuropeanCupId[]) {
      const found = tournaments[cid].fixtures.find(
        (f) =>
          !f.played &&
          f.week === currentWeek &&
          (f.homeClubId === myClubId || f.awayClubId === myClubId)
      );
      if (found) return { cupId: cid, fixture: found };
    }
    return null;
  }, [tournaments, currentWeek, myClubId]);

  const availableScheduleWeeks = useMemo(() => {
    const wks = Array.from(new Set(cup.fixtures.map((f) => f.week))).sort((a, b) => a - b);
    return wks;
  }, [cup.fixtures]);

  const effectiveWeek = availableScheduleWeeks.includes(selectedWeekFilter)
    ? selectedWeekFilter
    : availableScheduleWeeks.find((w) => w >= currentWeek) ?? availableScheduleWeeks[0] ?? 1;

  const weekFixtures = useMemo(
    () => cup.fixtures.filter((f) => f.week === effectiveWeek),
    [cup.fixtures, effectiveWeek]
  );

  const myEarnedPrize = myClubId ? cup.prizeAwardedByClub[myClubId] ?? 0 : 0;

  const accentColor =
    activeCup === 'UCL'
      ? 'text-blue-400 border-blue-500/40'
      : activeCup === 'UEL'
        ? 'text-orange-400 border-orange-500/40'
        : 'text-emerald-400 border-emerald-500/40';

  const getWeekTag = (w: number): string => {
    const mdIdx = EURO_LEAGUE_PHASE_WEEKS.indexOf(w as (typeof EURO_LEAGUE_PHASE_WEEKS)[number]);
    if (mdIdx >= 0) return `Lig Aşaması ${mdIdx + 1}. Hafta`;
    if (w === EURO_PLAYOFF_WEEKS[0]) return 'Play-off 1. Maç';
    if (w === EURO_PLAYOFF_WEEKS[1]) return 'Play-off Rövanş';
    if (w === EURO_DROP_WEEK) return 'Geçiş Play-offu';
    if (w === EURO_R16_WEEKS[0]) return 'Son 16 (1. Maç)';
    if (w === EURO_R16_WEEKS[1]) return 'Son 16 (Rövanş)';
    if (w === EURO_QF_WEEKS[0]) return 'Çeyrek Final (1)';
    if (w === EURO_QF_WEEKS[1]) return 'Çeyrek Final (2)';
    if (w === EURO_SF_WEEKS[0]) return 'Yarı Final (1)';
    if (w === EURO_SF_WEEKS[1]) return 'Yarı Final (2)';
    if (w === EURO_FINAL_WEEK) return 'Büyük Final';
    return `Takvim Haftası ${w}`;
  };

  const renderTieCard = (tie: KnockoutTie) => {
    const hClub = clubMap.get(tie.homeClubId);
    const aClub = clubMap.get(tie.awayClubId);
    if (!hClub || !aClub) return null;
    const isMyTie = tie.homeClubId === myClubId || tie.awayClubId === myClubId;
    return (
      <div
        key={tie.id}
        className={`p-3 rounded-lg border text-xs space-y-1.5 ${
          isMyTie ? 'bg-[#0a1128] border-[#b7ff4a]/50' : 'bg-[#080d11] border-white/10'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{getStageLabel(tie.stage, language)}</span>
          {tie.fromHigherCup && (
            <span className="text-orange-300 font-semibold">
              {tie.fromHigherCup} Düşen Takım
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ClubCrest club={hClub} licenseMode={licenseMode} size={22} />
            <span
              className={`truncate font-semibold ${
                tie.winnerId === hClub.id ? 'text-[#b7ff4a]' : 'text-white'
              }`}
            >
              {getClubDisplayName(hClub, licenseMode)}
            </span>
          </div>
          <span className="font-mono-num font-bold text-white shrink-0">
            {tie.homeAgg !== undefined ? tie.homeAgg : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ClubCrest club={aClub} licenseMode={licenseMode} size={22} />
            <span
              className={`truncate font-semibold ${
                tie.winnerId === aClub.id ? 'text-[#b7ff4a]' : 'text-white'
              }`}
            >
              {getClubDisplayName(aClub, licenseMode)}
            </span>
          </div>
          <span className="font-mono-num font-bold text-white shrink-0">
            {tie.awayAgg !== undefined ? tie.awayAgg : '-'}
          </span>
        </div>
        {(tie.penaltiesNote || tie.droppedToCupId) && (
          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
            <span className="text-[#00e5ff]">{tie.penaltiesNote ?? ''}</span>
            {tie.droppedToCupId && (
              <span className="text-amber-300">
                Elenen → {tie.droppedToCupId} Geçişi
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const stagesOrder: Array<{ stage: KnockoutTie['stage']; title: string }> = [
    { stage: 'PLAYOFF', title: tr ? '9–24 Play-off Turu' : '9–24 Play-offs' },
    { stage: 'DROP_PLAYOFF', title: tr ? 'Avrupa Geçiş Play-offu' : 'Drop-Down Play-offs' },
    { stage: 'R16', title: tr ? 'Son 16 Turu' : 'Round of 16' },
    { stage: 'QF', title: tr ? 'Çeyrek Final' : 'Quarter-Finals' },
    { stage: 'SF', title: tr ? 'Yarı Final' : 'Semi-Finals' },
    { stage: 'FINAL', title: tr ? 'Final' : 'Final' },
  ];

  return (
    <div className="space-y-6">
      {/* Competition Selector Hero */}
      <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <TournamentEmblemSvg cupId={activeCup} size={70} />
          <div>
            <div className={`text-xs font-mono-num uppercase tracking-wider font-bold ${accentColor.split(' ')[0]}`}>
              {tr ? 'Avrupa Kulüpler Arenası · 36 Takımlı İsviçre Modeli' : 'European Arena · 36-Club Swiss Format'}
            </div>
            <h1 className="font-display font-bold text-2xl text-white mt-0.5">
              {getCupTitle(activeCup, language)}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {tr
                ? `Mevcut Aşama: ${getStageLabel(
                    cup.phase === 'COMPLETED' ? 'FINAL' : (cup.phase as Fixture['stage']),
                    language
                  )} · İlk 8 direkt Son 16, 9–24 Play-off oynar.`
                : `Stage: ${cup.phase} · Top 8 reach R16 directly, 9–24 enter Play-offs.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['UCL', 'UEL', 'UECL'] as EuropeanCupId[]).map((cid) => {
            const selected = activeCup === cid;
            const inThisCup = myClubId && tournaments[cid].participantIds.includes(myClubId);
            return (
              <button
                key={cid}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveCup(cid);
                }}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-display font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                  selected
                    ? 'bg-[#b7ff4a] text-[#080d11] border-[#b7ff4a]'
                    : 'bg-[#080d11] text-slate-200 border-white/10 hover:border-white/30'
                }`}
              >
                <TournamentEmblemSvg cupId={cid} size={22} />
                <span>{cid}</span>
                {inThisCup && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono-num ${
                      selected ? 'bg-[#080d11] text-[#b7ff4a]' : 'bg-[#00e5ff]/20 text-[#00e5ff]'
                    }`}
                  >
                    {tr ? 'KULÜBÜN' : 'YOU'}
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenNationsHub();
            }}
            className="px-3.5 py-2.5 rounded-xl bg-[#080d11] border border-cyan-400/35 text-cyan-300 hover:bg-cyan-500/15 text-xs font-display font-bold flex items-center gap-2 cursor-pointer"
          >
            <TournamentEmblemSvg cupId="UNL" size={22} />
            <span>{tr ? 'Uluslar Ligi' : 'Nations League'}</span>
          </button>
        </div>
      </div>

      {/* Launch User's Midweek European Match CTA if scheduled this week */}
      {myClubCupFixtureThisWeek && (
        <div className="rounded-xl bg-[#0a1428] border border-blue-400/45 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <TournamentEmblemSvg cupId={myClubCupFixtureThisWeek.cupId} size={46} />
            <div>
              <div className="text-xs font-mono-num text-[#00e5ff]">
                {getCupTitle(myClubCupFixtureThisWeek.cupId, language)} ·{' '}
                {myClubCupFixtureThisWeek.fixture.dayLabel ?? 'Hafta İçi'} (Hafta {currentWeek})
              </div>
              <div className="font-display font-bold text-base text-white mt-0.5">
                {getClubDisplayName(
                  clubMap.get(myClubCupFixtureThisWeek.fixture.homeClubId)!,
                  licenseMode
                )}{' '}
                vs{' '}
                {getClubDisplayName(
                  clubMap.get(myClubCupFixtureThisWeek.fixture.awayClubId)!,
                  licenseMode
                )}
              </div>
              <div className="text-[11px] text-amber-300 mt-0.5">
                {tr
                  ? 'Hardcore Mod: Hafta içi Avrupa maçı ekstra seyahat kondisyon düşüşü uygular!'
                  : 'Hardcore Mode: Midweek European fixture drains extra travel stamina!'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onLaunchEuropeanMatch(myClubCupFixtureThisWeek.cupId, myClubCupFixtureThisWeek.fixture);
            }}
            className="px-5 py-3 rounded-xl bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{tr ? '3D Avrupa Maçına Çık' : 'Play 3D European Match'}</span>
          </button>
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'STANDINGS', label: tr ? '36 Takımlı İsviçre Tablosu' : '36-Club Swiss Table', icon: <Trophy className="w-3.5 h-3.5" /> },
          { id: 'FIXTURES', label: tr ? 'Hafta İçi Fikstür' : 'Midweek Fixtures', icon: <Calendar className="w-3.5 h-3.5" /> },
          { id: 'BRACKET', label: tr ? 'Eleme Ağacı & Düşenler' : 'Knockout Bracket', icon: <GitBranch className="w-3.5 h-3.5" /> },
          { id: 'PRIZES', label: tr ? 'UEFA Ödül Havuzu' : 'UEFA Prize Money', icon: <Coins className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id as typeof subTab)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              subTab === tab.id
                ? 'bg-[#00e5ff] text-[#080d11] font-bold'
                : 'bg-[#111b21] text-slate-300 border border-white/10 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: 36-Team Swiss Standings */}
      {subTab === 'STANDINGS' && (
        <div className="rounded-xl bg-[#111b21] border border-white/10 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="font-display font-bold text-sm text-white">
              {getCupTitle(activeCup, language)} — {tr ? 'İsviçre Ligi Puan Durumu (8 Maç)' : 'Swiss Phase Table'}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className="text-emerald-400 font-semibold">1–8: Son 16</span>
              <span className="text-cyan-400 font-semibold">9–16: Seri Başı PO</span>
              <span className="text-amber-300 font-semibold">17–24: Play-off</span>
              <span className="text-red-400 font-semibold">25–36: Elendi</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080d11] text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">{tr ? 'Kulüp' : 'Club'}</th>
                  <th className="py-2.5 px-2 text-center">Torba</th>
                  <th className="py-2.5 px-2 text-center">O</th>
                  <th className="py-2.5 px-2 text-center">G</th>
                  <th className="py-2.5 px-2 text-center">B</th>
                  <th className="py-2.5 px-2 text-center">M</th>
                  <th className="py-2.5 px-2 text-center">AV</th>
                  <th className="py-2.5 px-3 text-center">P</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">{tr ? 'Durum' : 'Zone'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {swissRows.map((row, idx) => {
                  const club = clubMap.get(row.clubId);
                  if (!club) return null;
                  const rank = idx + 1;
                  const isMine = club.id === myClubId;
                  const rankColor =
                    rank <= 8
                      ? 'border-l-4 border-l-emerald-400'
                      : rank <= 16
                        ? 'border-l-4 border-l-cyan-400'
                        : rank <= 24
                          ? 'border-l-4 border-l-amber-400'
                          : 'border-l-4 border-l-red-500/70';

                  const zoneLabel =
                    row.zone === 'DIRECT_R16'
                      ? 'Direkt Son 16'
                      : row.zone === 'DROPPED_UEL'
                        ? "UEL'e Düştü"
                        : row.zone === 'DROPPED_UECL'
                          ? "UECL'e Düştü"
                          : row.zone === 'PLAYOFF_SEEDED'
                            ? 'Seri Başı PO'
                            : row.zone === 'PLAYOFF_UNSEEDED'
                              ? 'Seri Başsız PO'
                              : 'Elendi';

                  return (
                    <tr
                      key={row.clubId}
                      className={`${rankColor} ${isMine ? 'bg-[#b7ff4a]/12' : 'hover:bg-white/[0.03]'}`}
                    >
                      <td className="py-2 px-3 font-mono-num font-bold text-slate-300">{rank}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ClubCrest club={club} licenseMode={licenseMode} size={24} />
                          <span className={`truncate font-semibold ${isMine ? 'text-[#b7ff4a]' : 'text-white'}`}>
                            {getClubDisplayName(club, licenseMode)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center font-mono-num text-slate-400">T{row.pot}</td>
                      <td className="py-2 px-2 text-center font-mono-num text-slate-300">{row.played}</td>
                      <td className="py-2 px-2 text-center font-mono-num text-slate-300">{row.won}</td>
                      <td className="py-2 px-2 text-center font-mono-num text-slate-300">{row.drawn}</td>
                      <td className="py-2 px-2 text-center font-mono-num text-slate-300">{row.lost}</td>
                      <td className="py-2 px-2 text-center font-mono-num text-slate-300">
                        {row.gd > 0 ? `+${row.gd}` : row.gd}
                      </td>
                      <td className="py-2 px-3 text-center font-mono-num font-bold text-white">{row.points}</td>
                      <td className="py-2 px-3 hidden sm:table-cell text-[11px]">
                        <span
                          className={
                            row.zone === 'DIRECT_R16'
                              ? 'text-emerald-400'
                              : row.zone === 'DROPPED_UEL' || row.zone === 'DROPPED_UECL'
                                ? 'text-orange-300'
                                : row.zone === 'PLAYOFF_SEEDED'
                                  ? 'text-cyan-300'
                                  : row.zone === 'PLAYOFF_UNSEEDED'
                                    ? 'text-amber-300'
                                    : 'text-red-400'
                          }
                        >
                          {zoneLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Midweek Fixtures */}
      {subTab === 'FIXTURES' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {availableScheduleWeeks.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setSelectedWeekFilter(w)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono-num border cursor-pointer ${
                  effectiveWeek === w
                    ? 'bg-[#b7ff4a] text-[#080d11] border-[#b7ff4a] font-bold'
                    : 'bg-[#111b21] text-slate-300 border-white/10 hover:border-white/30'
                }`}
              >
                H{w} · {getWeekTag(w)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {weekFixtures.map((f) => {
              const h = clubMap.get(f.homeClubId);
              const a = clubMap.get(f.awayClubId);
              if (!h || !a) return null;
              const isMine = h.id === myClubId || a.id === myClubId;
              return (
                <div
                  key={f.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    isMine ? 'bg-[#0a1128] border-[#b7ff4a]/50' : 'bg-[#111b21] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ClubCrest club={h} licenseMode={licenseMode} size={24} />
                    <span className="truncate font-semibold text-white">
                      {getClubDisplayName(h, licenseMode)}
                    </span>
                  </div>

                  <div className="text-center shrink-0 px-2">
                    {f.played ? (
                      <div className="font-mono-num font-bold text-sm text-[#b7ff4a]">
                        {f.homeGoals} - {f.awayGoals}
                      </div>
                    ) : (
                      <div className="font-mono-num text-[11px] text-[#00e5ff]">
                        {f.dayLabel ?? 'Hafta İçi'}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                    <span className="truncate font-semibold text-white">
                      {getClubDisplayName(a, licenseMode)}
                    </span>
                    <ClubCrest club={a} licenseMode={licenseMode} size={24} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Knockout Bracket & Drop-Down Transfer Flow */}
      {subTab === 'BRACKET' && (
        <div className="space-y-5">
          {cup.droppedFromHigherIds.length > 0 && (
            <div className="rounded-xl bg-orange-500/10 border border-orange-400/35 p-4 space-y-2">
              <div className="text-xs font-display font-bold text-orange-300">
                {activeCup === 'UEL'
                  ? 'UCL Play-off Elenenleri → UEL Geçiş Turuna Katıldı'
                  : 'UEL Play-off Elenenleri → UECL Geçiş Turuna Katıldı'}
              </div>
              <div className="flex flex-wrap gap-2">
                {cup.droppedFromHigherIds.map((cid) => {
                  const c = clubMap.get(cid);
                  if (!c) return null;
                  return (
                    <div
                      key={cid}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#080d11] border border-white/10 text-xs text-white"
                    >
                      <ClubCrest club={c} licenseMode={licenseMode} size={18} />
                      <span>{getClubShortName(c, licenseMode)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {cup.championClubId && (
            <div className="rounded-xl bg-[#0a1428] border border-[#b7ff4a]/60 p-5 flex items-center gap-4">
              <TournamentEmblemSvg cupId={activeCup} size={56} />
              <div>
                <div className="text-xs font-mono-num text-[#b7ff4a] uppercase">
                  {tr ? 'Sezon Şampiyonu' : 'Tournament Champion'}
                </div>
                <div className="font-display font-bold text-xl text-white">
                  {clubMap.get(cup.championClubId)
                    ? getClubDisplayName(clubMap.get(cup.championClubId)!, licenseMode)
                    : cup.championClubId}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stagesOrder.map(({ stage, title }) => {
              const ties = cup.knockoutTies.filter((t) => t.stage === stage);
              return (
                <div key={stage} className="rounded-xl bg-[#111b21] border border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 className="font-display font-bold text-sm text-[#00e5ff]">{title}</h3>
                    <span className="font-mono-num text-[11px] text-slate-400">
                      {ties.length > 0 ? `${ties.length} Eşleşme` : 'Bekleniyor'}
                    </span>
                  </div>
                  {ties.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      {tr
                        ? 'Önceki tur tamamlandığında kura eşleşmeleri burada oluşur.'
                        : 'Draw unlocks once the preceding round concludes.'}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {ties.map(renderTieCard)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: UEFA Financial Rewards */}
      {subTab === 'PRIZES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-3">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#b7ff4a]" />
              <span>{getCupTitle(activeCup, language)} — Performans Primleri</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { label: 'Maç Galibiyeti', val: EUROPEAN_PRIZE_TABLE[activeCup].WIN },
                { label: 'Beraberlik', val: EUROPEAN_PRIZE_TABLE[activeCup].DRAW },
                { label: 'Play-off Turu', val: EUROPEAN_PRIZE_TABLE[activeCup].PLAYOFF },
                { label: 'Son 16 Turu', val: EUROPEAN_PRIZE_TABLE[activeCup].R16 },
                { label: 'Çeyrek Final', val: EUROPEAN_PRIZE_TABLE[activeCup].QF },
                { label: 'Yarı Final', val: EUROPEAN_PRIZE_TABLE[activeCup].SF },
                { label: 'Finalist Primi', val: EUROPEAN_PRIZE_TABLE[activeCup].FINAL },
                { label: 'Şampiyonluk', val: EUROPEAN_PRIZE_TABLE[activeCup].CHAMPION },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-[#080d11] border border-white/10">
                  <div className="text-[11px] text-slate-400">{item.label}</div>
                  <div className="font-mono-num font-bold text-[#b7ff4a] text-sm mt-1">
                    +{formatMoney(item.val)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-3">
            <h3 className="font-display font-bold text-base text-white">
              {tr ? 'Kulübünün Turnuva Geliri' : 'Your Club Earnings'}
            </h3>
            <div className="p-4 rounded-xl bg-[#080d11] border border-[#00e5ff]/35">
              <div className="text-xs text-slate-400">
                {getCupTitle(activeCup, language)} · Toplam Aktarılan UEFA Ödülü
              </div>
              <div className="font-mono-num font-bold text-2xl text-[#b7ff4a] mt-1">
                {formatMoney(myEarnedPrize)}
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {tr
                ? 'Her hafta içi Avrupa galibiyeti, beraberliği ve tur atlama primi otomatik olarak kulüp kasasına ve transfer bütçesine aktarılır.'
                : 'Every matchday bonus and knockout prize is automatically credited to club cash and transfer budget.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface NationalTeamsScreenProps {
  nationsLeague: NationsLeagueState;
  myNationalTeamId: string | null;
  myNationalTactics: TacticsConfig | null;
  currentWeek: number;
  licenseMode: LicenseMode;
  language: Language;
  onSelectNationalTeam: (teamId: string) => void;
  onUpdateNationalTactics: (next: TacticsConfig) => void;
  onLaunchNationalMatch: (fixture: Fixture) => void;
  onSimulateInternationalWeek: () => void;
}

export const NationalTeamsScreen: React.FC<NationalTeamsScreenProps> = ({
  nationsLeague,
  myNationalTeamId,
  myNationalTactics,
  currentWeek,
  licenseMode,
  language,
  onSelectNationalTeam,
  onUpdateNationalTactics,
  onLaunchNationalMatch,
  onSimulateInternationalWeek,
}) => {
  const tr = language === 'tr';
  const [tierFilter, setTierFilter] = useState<'ALL' | NationalTeamTier>('ALL');
  const [tab, setTab] = useState<'NATIONS' | 'SQUAD' | 'STANDINGS' | 'FINALS'>('STANDINGS');

  const teamMap = useMemo(
    () => new Map(nationsLeague.teams.map((t) => [t.id, t])),
    [nationsLeague.teams]
  );

  const activeNation: NationalTeam | null = myNationalTeamId
    ? teamMap.get(myNationalTeamId) ?? null
    : null;

  const standingsByGroup = useMemo(
    () => computeNationsLeagueStandings(nationsLeague),
    [nationsLeague]
  );

  const myNextNationFixture = useMemo(() => {
    if (!myNationalTeamId) return null;
    const exactWeek = nationsLeague.fixtures.find(
      (f) =>
        !f.played &&
        f.week === currentWeek &&
        (f.homeClubId === myNationalTeamId || f.awayClubId === myNationalTeamId)
    );
    if (exactWeek) return exactWeek;
    return (
      nationsLeague.fixtures
        .filter(
          (f) =>
            !f.played &&
            (f.homeClubId === myNationalTeamId || f.awayClubId === myNationalTeamId)
        )
        .sort((a, b) => a.week - b.week)[0] ?? null
    );
  }, [nationsLeague.fixtures, myNationalTeamId, currentWeek]);

  const filteredNations = useMemo(() => {
    return nationsLeague.teams.filter((t) => tierFilter === 'ALL' || t.tier === tierFilter);
  }, [nationsLeague.teams, tierFilter]);

  const groupKeys = Object.keys(standingsByGroup).sort();

  const formations: FormationId[] = ['4-2-3-1', '4-3-3', '3-5-2', '4-4-2', '3-4-2-1', '5-3-2'];

  const isIntlWeekNow =
    (UNL_GROUP_WEEKS as readonly number[]).includes(currentWeek) ||
    currentWeek === UNL_SEMI_WEEK ||
    currentWeek === UNL_FINAL_WEEK;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <TournamentEmblemSvg cupId="UNL" size={68} />
          <div>
            <div className="text-xs font-mono-num text-[#00e5ff] uppercase tracking-wider font-bold">
              {tr ? 'UEFA Uluslar Ligi · 32 Milli Takım (Lig A–D)' : 'UEFA Nations League · 32 National Teams'}
            </div>
            <h1 className="font-display font-bold text-2xl text-white mt-0.5">
              {activeNation
                ? `${getNationDisplayName(activeNation, licenseMode)} (Lig ${activeNation.tier} · ${activeNation.group})`
                : tr
                  ? 'Milli Takımlar & Uluslar Ligi'
                  : 'National Teams Hub'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {tr
                ? '32 ülkeden birinin başına geç, 23 kişilik milli kadronu yönet ve Lig A Dörtlü Final kupasını kaldır.'
                : 'Take charge of any of 32 nations, manage your 23-man international squad, and win the Nations League.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {myNextNationFixture && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onLaunchNationalMatch(myNextNationFixture);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isIntlWeekNow
                  ? tr
                    ? '3D Milli Maça Çık'
                    : 'Play 3D International Match'
                  : tr
                    ? `Sıradaki Milli Maçı Oyna (H${myNextNationFixture.week})`
                    : `Play Next Intl Match (W${myNextNationFixture.week})`}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onSimulateInternationalWeek();
            }}
            className="px-3.5 py-2.5 rounded-xl bg-[#080d11] border border-white/15 text-slate-200 hover:border-[#00e5ff] text-xs font-semibold cursor-pointer"
          >
            {tr ? 'Milli Ara Haftasını Simüle Et' : 'Sim Next Intl Matchday'}
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'STANDINGS', label: tr ? 'Lig A / B / C / D Grupları' : 'League A–D Groups', icon: <Trophy className="w-3.5 h-3.5" /> },
          { id: 'NATIONS', label: tr ? '32 Milli Takım Seç' : '32 National Teams', icon: <Globe2 className="w-3.5 h-3.5" /> },
          { id: 'SQUAD', label: tr ? 'Milli Kadro & Taktik' : 'National Squad', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'FINALS', label: tr ? 'Play-off & Dörtlü Final' : 'Play-offs & Finals Four', icon: <Award className="w-3.5 h-3.5" /> },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as typeof tab)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === item.id
                ? 'bg-[#00e5ff] text-[#080d11] font-bold'
                : 'bg-[#111b21] text-slate-300 border border-white/10 hover:text-white'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: Groups A1..D2 */}
      {tab === 'STANDINGS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupKeys.map((gKey) => {
            const rows = standingsByGroup[gKey] ?? [];
            const tier = gKey[0] as NationalTeamTier;
            const tierAccent =
              tier === 'A'
                ? 'text-cyan-300'
                : tier === 'B'
                  ? 'text-emerald-300'
                  : tier === 'C'
                    ? 'text-amber-300'
                    : 'text-slate-300';
            return (
              <div key={gKey} className="rounded-xl bg-[#111b21] border border-white/10 overflow-hidden">
                <div className="px-4 py-2.5 bg-[#080d11] border-b border-white/10 flex items-center justify-between text-xs">
                  <span className={`font-display font-bold ${tierAccent}`}>
                    Lig {tier} — Grup {gKey}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {tier === 'A' ? '1. Dörtlü Final · 3. Play-off' : '1. Yükselir · 2. Play-off'}
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 border-b border-white/5">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">{tr ? 'Ülke' : 'Nation'}</th>
                      <th className="py-2 px-2 text-center">O</th>
                      <th className="py-2 px-2 text-center">G</th>
                      <th className="py-2 px-2 text-center">B</th>
                      <th className="py-2 px-2 text-center">M</th>
                      <th className="py-2 px-2 text-center">AV</th>
                      <th className="py-2 px-3 text-center">P</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((r, idx) => {
                      const t = teamMap.get(r.teamId);
                      if (!t) return null;
                      const isMine = t.id === myNationalTeamId;
                      return (
                        <tr
                          key={t.id}
                          className={isMine ? 'bg-[#b7ff4a]/12' : 'hover:bg-white/[0.03]'}
                        >
                          <td className="py-2 px-3 font-mono-num font-bold text-slate-300">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <NationalFlagBadge
                                code={t.code}
                                primaryColor={t.primaryColor}
                                secondaryColor={t.secondaryColor}
                                accentColor={t.accentColor}
                                size={22}
                              />
                              <span className={`font-semibold ${isMine ? 'text-[#b7ff4a]' : 'text-white'}`}>
                                {getNationDisplayName(t, licenseMode)}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center font-mono-num text-slate-300">{r.played}</td>
                          <td className="py-2 px-2 text-center font-mono-num text-slate-300">{r.won}</td>
                          <td className="py-2 px-2 text-center font-mono-num text-slate-300">{r.drawn}</td>
                          <td className="py-2 px-2 text-center font-mono-num text-slate-300">{r.lost}</td>
                          <td className="py-2 px-2 text-center font-mono-num text-slate-300">
                            {r.gd > 0 ? `+${r.gd}` : r.gd}
                          </td>
                          <td className="py-2 px-3 text-center font-mono-num font-bold text-white">{r.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: 32 National Teams Picker */}
      {tab === 'NATIONS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'A', 'B', 'C', 'D'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierFilter(tier)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  tierFilter === tier
                    ? 'bg-[#b7ff4a] text-[#080d11] border-[#b7ff4a] font-bold'
                    : 'bg-[#111b21] text-slate-300 border-white/10'
                }`}
              >
                {tier === 'ALL' ? 'Tüm Ülkeler (32)' : `Lig ${tier}`}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {filteredNations.map((nation) => {
              const isSelected = nation.id === myNationalTeamId;
              const topStar = [...nation.players].sort((a, b) => b.ovr - a.ovr)[0];
              return (
                <div
                  key={nation.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#0a1428] border-[#b7ff4a]'
                      : 'bg-[#111b21] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <NationalFlagBadge
                      code={nation.code}
                      primaryColor={nation.primaryColor}
                      secondaryColor={nation.secondaryColor}
                      accentColor={nation.accentColor}
                      size={40}
                    />
                    <div className="min-w-0">
                      <div className="font-display font-bold text-sm text-white truncate">
                        {getNationDisplayName(nation, licenseMode)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Lig {nation.tier} · Grup {nation.group} · Güç {nation.reputation}
                      </div>
                    </div>
                  </div>

                  {topStar && (
                    <div className="text-[11px] text-slate-300 bg-[#080d11] rounded px-2.5 py-1.5 flex items-center justify-between">
                      <span className="truncate">
                        ★ {getPlayerDisplayName(topStar, licenseMode)}
                      </span>
                      <span className="font-mono-num text-[#b7ff4a] font-bold">
                        {topStar.ovr}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSuccess();
                      onSelectNationalTeam(nation.id);
                      setTab('SQUAD');
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-display font-bold cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#b7ff4a] text-[#080d11]'
                        : 'bg-[#17242c] hover:bg-[#00e5ff] hover:text-[#080d11] text-white'
                    }`}
                  >
                    {isSelected
                      ? tr
                        ? 'Aktif Milli Takımın'
                        : 'Active Nation'
                      : tr
                        ? 'Milli Takımın Başına Geç'
                        : 'Manage National Team'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: National Squad & Quick Formation */}
      {tab === 'SQUAD' && (
        <div className="space-y-4">
          {!activeNation || !myNationalTactics ? (
            <div className="rounded-xl bg-[#111b21] border border-white/10 p-6 text-center space-y-3">
              <p className="text-sm text-slate-300">
                {tr
                  ? 'Henüz bir milli takım seçmedin. 32 ülke arasından birini seçerek kadroyu yönet.'
                  : 'No national team selected yet.'}
              </p>
              <button
                type="button"
                onClick={() => setTab('NATIONS')}
                className="px-4 py-2 rounded-lg bg-[#b7ff4a] text-[#080d11] font-display font-bold text-xs cursor-pointer"
              >
                {tr ? '32 Milli Takıma Göz At' : 'Browse 32 Nations'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#111b21] border border-white/10 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <NationalFlagBadge
                    code={activeNation.code}
                    primaryColor={activeNation.primaryColor}
                    secondaryColor={activeNation.secondaryColor}
                    accentColor={activeNation.accentColor}
                    size={42}
                  />
                  <div>
                    <div className="font-display font-bold text-base text-white">
                      {getNationDisplayName(activeNation, licenseMode)} — 23 Kişilik Aday Kadro
                    </div>
                    <div className="text-xs text-slate-400">
                      Diziliş: <strong className="text-[#00e5ff]">{myNationalTactics.formation}</strong> · Oyun Anlayışı: {myNationalTactics.mentality}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {formations.map((fm) => (
                    <button
                      key={fm}
                      type="button"
                      onClick={() =>
                        onUpdateNationalTactics({
                          ...myNationalTactics,
                          formation: fm,
                        })
                      }
                      className={`px-2.5 py-1.5 rounded text-xs font-mono-num border cursor-pointer ${
                        myNationalTactics.formation === fm
                          ? 'bg-[#b7ff4a] text-[#080d11] border-[#b7ff4a] font-bold'
                          : 'bg-[#080d11] text-slate-300 border-white/10'
                      }`}
                    >
                      {fm}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeNation.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-[#111b21] border border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatarSvg
                        appearance={p.appearance}
                        shirtColor={activeNation.primaryColor}
                        accentColor={activeNation.accentColor}
                        size={36}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">
                          #{p.shirtNumber} {getPlayerDisplayName(p, licenseMode)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {p.naturalRole} · {p.age} yaş · {idx < 11 ? 'İlk 11' : 'Yedek'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono-num font-bold text-sm text-[#b7ff4a]">{p.ovr}</div>
                      <div className="text-[10px] text-slate-400">POT {p.potential}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Promotion/Relegation Play-offs & League A Finals Four */}
      {tab === 'FINALS' && (
        <div className="space-y-5">
          {nationsLeague.championTeamId && (
            <div className="rounded-xl bg-[#0a1428] border border-[#b7ff4a]/60 p-5 flex items-center gap-4">
              <TournamentEmblemSvg cupId="UNL" size={54} />
              <div>
                <div className="text-xs font-mono-num text-[#b7ff4a]">UEFA ULUSLAR LİGİ ŞAMPİYONU</div>
                <div className="font-display font-bold text-xl text-white">
                  {teamMap.get(nationsLeague.championTeamId)
                    ? getNationDisplayName(teamMap.get(nationsLeague.championTeamId)!, licenseMode)
                    : nationsLeague.championTeamId}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-3">
              <h3 className="font-display font-bold text-base text-[#00e5ff] flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>{tr ? 'Lig A Dörtlü Final (Finals Four)' : 'League A Finals Four'}</span>
              </h3>
              {nationsLeague.finalsTies.length === 0 ? (
                <p className="text-xs text-slate-400">
                  {tr
                    ? 'A1 ve A2 gruplarının 6 maçlık grup aşaması bittiğinde (Hafta 12 sonrası) Dörtlü Final eşleşmeleri oluşur.'
                    : 'Unlocked after Group Matchday 6.'}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {nationsLeague.finalsTies.map((tie) => {
                    const h = teamMap.get(tie.homeClubId);
                    const a = teamMap.get(tie.awayClubId);
                    if (!h || !a) return null;
                    return (
                      <div key={tie.id} className="p-3 rounded-lg bg-[#080d11] border border-white/10 text-xs space-y-1">
                        <div className="text-[10px] text-[#00e5ff] font-semibold">
                          {getStageLabel(tie.stage, language)}
                        </div>
                        <div className="flex justify-between font-semibold text-white">
                          <span>{getNationDisplayName(h, licenseMode)}</span>
                          <span className="font-mono-num text-[#b7ff4a]">{tie.homeAgg ?? '-'}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-white">
                          <span>{getNationDisplayName(a, licenseMode)}</span>
                          <span className="font-mono-num text-[#b7ff4a]">{tie.awayAgg ?? '-'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-3">
              <h3 className="font-display font-bold text-base text-amber-300 flex items-center gap-2">
                <Flag className="w-4 h-4" />
                <span>{tr ? 'Yükselme / Düşme Play-offları (A↔B↔C↔D)' : 'Promotion / Relegation Play-offs'}</span>
              </h3>
              {nationsLeague.promoPlayoffTies.length === 0 ? (
                <p className="text-xs text-slate-400">
                  {tr
                    ? 'Grup 3.leri ve alt lig 2.leri arasındaki yükselme/düşme play-offları Hafta 16\'da oynanır.'
                    : 'Promotion/Relegation play-offs unlock at Week 16.'}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {nationsLeague.promoPlayoffTies.map((tie) => {
                    const h = teamMap.get(tie.homeClubId);
                    const a = teamMap.get(tie.awayClubId);
                    if (!h || !a) return null;
                    return (
                      <div key={tie.id} className="p-3 rounded-lg bg-[#080d11] border border-white/10 text-xs space-y-1">
                        <div className="text-[10px] text-amber-300">
                          Lig {h.tier} vs Lig {a.tier} Play-off
                        </div>
                        <div className="flex justify-between font-semibold text-white">
                          <span>{getNationDisplayName(h, licenseMode)}</span>
                          <span className="font-mono-num text-[#b7ff4a]">{tie.homeAgg ?? '-'}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-white">
                          <span>{getNationDisplayName(a, licenseMode)}</span>
                          <span className="font-mono-num text-[#b7ff4a]">{tie.awayAgg ?? '-'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
