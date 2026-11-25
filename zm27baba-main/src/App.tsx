import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  Award,
  BarChart3,
  Binoculars,
  BookOpen,
  Briefcase,
  Compass,
  Dumbbell,
  GraduationCap,
  HardDrive,
  HeartPulse,
  Home,
  LayoutGrid,
  LogOut,
  Mail,
  Mic,
  Palmtree,
  Save,
  Settings,
  ShieldCheck,
  Star,
  Trophy,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';
import { ClubCrest, ManagerPortraitSvg, ZephyrManagerShieldSvg } from './components/BrandArt';
import {
  CareerFinaleModal,
  HolidayModal,
  MobileBottomNav,
  TurkishPressModal,
  TutorialModal,
} from './components/MegaUpdateModals';
import { OfflineIndicator, PWAInstallButton } from './components/PwaControls';
import {
  AlbumAchievementsScreen,
  GuideScreen,
  JobMarketScreen,
  SaveSlotsScreen,
} from './components/screens/CareerMetaScreens';
import {
  DevelopmentCenterScreen,
  MedicalCenterScreen,
  StaffScreen,
  TeamReportScreen,
  TrainingScreen,
} from './components/screens/ClubOperationsScreens';
import { ClubSelectScreen } from './components/screens/ClubSelectScreen';
import {
  DashboardScreen,
  PressConferenceResult,
  StandingsScreen,
} from './components/screens/DashboardAndStandings';
import { InboxScreen } from './components/screens/InboxScreen';
import { LicenseScreen, SettingsScreen } from './components/screens/LicenseAndSettings';
import { ManagerSetupScreen } from './components/screens/ManagerSetupScreen';
import { MatchdayScreen, MatchResultScreen } from './components/screens/MatchdayAndResult';
import { ScoutingScreen, ShortlistScreen } from './components/screens/ScoutingAndShortlistScreens';
import { MainMenuScreen, SplashScreen } from './components/screens/SplashAndMenu';
import { SquadScreen } from './components/screens/SquadScreen';
import { TacticsScreen } from './components/screens/TacticsScreen';
import { FinanceScreen, TransfersScreen } from './components/screens/TransfersAndFinance';
import { soundEngine } from './engine/audio';
import {
  ALL_LEAGUE_IDS,
  buildDefaultBenchForClub,
  buildTacticsForClub,
  createAchievementsCatalog,
  createClubsForLeague,
  createDefaultManagerProfile,
  createInitialStaffForClub,
  createInitialTrainingPlan,
  createStaffMarketPool,
  createTransferMarketPool,
  generateRoundRobinFixtures,
  getLeagueMeta,
} from './engine/database';
import {
  applyWeeklyTeamTraining,
  applyYouthDevelopment,
  computeStandings,
  deleteSaveSlot,
  evaluateAchievements,
  evaluateMedicalIntervention,
  formatMoney,
  generateInitialInbox,
  generateScoutReport,
  generateWeeklyInbox,
  getClubDisplayName,
  getPlayerDisplayName,
  getStaffDisplayName,
  isDerbyFixture,
  listSaveSlots,
  readSaveSlot,
  stepPlayerFatigueAndInjury,
  writeSaveSlot,
} from './engine/hardcoreRules';
import {
  AchievementDef,
  AppScreen,
  AppSettings,
  Club,
  FinanceRecord,
  Fixture,
  InboxMessage,
  LeagueId,
  LicenseMode,
  ManagerProfile,
  MarketListing,
  MatchMemory,
  MentoringPair,
  NewsItem,
  Player,
  SaveSlotSummary,
  ScoutReport,
  StaffMember,
  TacticsConfig,
  TrainingFocus,
  TrainingPlan,
} from './engine/types';
import {
  DynamicPressQuestion,
  HolidayConfig,
  HolidaySummaryReport,
  MAX_CAREER_SEASONS,
  PressAnswerImpact,
  SeasonHistoryEntry,
} from './engine/types';
import {
  evaluatePressAnswer,
  formatSeasonLabel,
  generateDynamicPressConference,
  getAssistantStaff,
  getAssistantTacticalKnowledge,
  runHolidaySimulation,
} from './engine/megaCareerEngine';
import { LiveMatchSnapshot } from './three/Match3DEngineCanvas';
import { careerStore, type SaveErrorKind, type SaveLoadResult } from './engine/saveStore';
import { appStorage } from './engine/appStorage';
import { createRng } from './engine/rng';
import { simulateAiFixture } from './engine/aiMatch';
import { exitAndroidApp, initAndroidLifecycle } from './native/androidLifecycle';
import { SaveBackupPanel } from './components/SaveBackupPanel';

// Açılışta okunan kayıt durumu (toast için). Bkz. loadSavedState ve kayıt bildirim efekti.
let lastCareerLoad: SaveLoadResult | null = null;

interface CareerStats {
  cleanSheets: number;
  derbyWins: number;
  fourGoalGames: number;
  winStreak: number;
  transfersSigned: number;
  freeOrLoansSigned: number;
  trainingsApplied: number;
  pressDone: number;
  staffHired: number;
  youthOvrGains: number;
}

interface WorldLeagueState {
  clubs: Club[];
  fixtures: Fixture[];
}

interface SavedCareer {
  leagueId: LeagueId;
  activeLeagues: LeagueId[];
  worldLeagues: Partial<Record<LeagueId, WorldLeagueState>>;
  clubs: Club[];
  myClubId: string | null;
  unemployed: boolean;
  manager: ManagerProfile;
  managerConfigured: boolean;
  myTactics: TacticsConfig;
  fixtures: Fixture[];
  currentWeek: number;
  licenseMode: LicenseMode;
  financeRecords: FinanceRecord[];
  marketPool: MarketListing[];
  news: NewsItem[];
  inbox: InboxMessage[];
  recoveryUsedWeek: number;
  pressAnsweredWeek: number;
  staff: StaffMember[];
  staffMarket: StaffMember[];
  trainingPlan: TrainingPlan;
  scoutReports: ScoutReport[];
  shortlistIds: string[];
  mentoringPairs: MentoringPair[];
  memories: MatchMemory[];
  achievements: AchievementDef[];
  stats: CareerStats;
  activeSlotNumber: number | null;
  settings: AppSettings;
  seasonNumber?: number;
  seasonHistory?: SeasonHistoryEntry[];
  holidayConfig?: HolidayConfig;
  mediaRelations?: number;
  fanSupport?: number;
}

const DEFAULT_STATS: CareerStats = {
  cleanSheets: 0,
  derbyWins: 0,
  fourGoalGames: 0,
  winStreak: 0,
  transfersSigned: 0,
  freeOrLoansSigned: 0,
  trainingsApplied: 0,
  pressDone: 0,
  staffHired: 0,
  youthOvrGains: 0,
};

const DEFAULT_SETTINGS: AppSettings = {
  language: 'tr',
  muted: false,
  menuMusicEnabled: true,
  musicVolume: 65,
  sfxVolume: 80,
  defaultCamera: 'broadcast',
  matchViewMode: '3D',
  tacticsViewMode: '3D',
  crowdDensity: 'HIGH',
  graphicsQuality: 'MEDIUM',
  difficulty: 'NORMAL',
  showPlayerNamesIn3D: true,
};

function isValidLeagueId(val: unknown): val is LeagueId {
  return typeof val === 'string' && (ALL_LEAGUE_IDS as string[]).includes(val);
}

function getLeagueNewsCopy(leagueId: LeagueId): { title: string; body: string } {
  const meta = getLeagueMeta(leagueId);
  return {
    title: `${meta.name} 2026–27 Başlıyor`,
    body: `${meta.teams} kulüp, ${meta.weeks} haftalık (${meta.fixturesCount} maç) maraton! Gerçekçi bütçe, sakatlık ve transfer pazarlıkları sizi bekliyor.`,
  };
}

function syncWorldLeagues(
  activeLeagues: LeagueId[],
  primaryLeagueId: LeagueId,
  primaryClubs: Club[],
  primaryFixtures: Fixture[],
  existing: Partial<Record<LeagueId, WorldLeagueState>> = {}
): Partial<Record<LeagueId, WorldLeagueState>> {
  const next: Partial<Record<LeagueId, WorldLeagueState>> = {};
  const uniqueLeagues = Array.from(new Set([primaryLeagueId, ...activeLeagues]));
  for (const lid of uniqueLeagues) {
    if (lid === primaryLeagueId) {
      next[lid] = {
        clubs: primaryClubs,
        fixtures: primaryFixtures.map((f) => ({ ...f, events: [] })),
      };
    } else if (existing[lid] && existing[lid]!.clubs.length > 0 && existing[lid]!.fixtures.length > 0) {
      next[lid] = existing[lid]!;
    } else {
      const c = createClubsForLeague(lid);
      next[lid] = { clubs: c, fixtures: generateRoundRobinFixtures(c) };
    }
  }
  return next;
}

function createFreshState(autostart = false, initialLeague: LeagueId = 'SUPER_LIG'): SavedCareer {
  const clubs = createClubsForLeague(initialLeague);
  const templateClub = clubs[0];
  const slots = buildTacticsForClub(templateClub, templateClub.preferredFormation);
  const myTactics: TacticsConfig = {
    formation: templateClub.preferredFormation,
    tacticalStyle: 'CONTROL_POSSESSION',
    mentality: 'BALANCED',
    pressing: 'MEDIUM',
    tempo: 'NORMAL',
    defensiveLine: 55,
    slots,
    benchPlayerIds: buildDefaultBenchForClub(templateClub, slots),
  };
  const manager = createDefaultManagerProfile();
  const leagueCopy = getLeagueNewsCopy(initialLeague);
  const fixtures = generateRoundRobinFixtures(clubs);
  const activeLeagues: LeagueId[] = [...ALL_LEAGUE_IDS];

  return {
    leagueId: initialLeague,
    activeLeagues,
    worldLeagues: syncWorldLeagues(activeLeagues, initialLeague, clubs, fixtures),
    clubs,
    myClubId: autostart ? templateClub.id : null,
    unemployed: false,
    manager,
    managerConfigured: autostart,
    myTactics,
    fixtures,
    currentWeek: 1,
    licenseMode: 'NO_DATA',
    financeRecords: [],
    marketPool: createTransferMarketPool(initialLeague),
    news: [
      {
        id: 'news_init_1',
        week: 1,
        title: leagueCopy.title,
        body: leagueCopy.body,
        category: 'BOARD',
      },
    ],
    inbox: autostart ? generateInitialInbox(templateClub, initialLeague, manager, 'NO_DATA', 1) : [],
    recoveryUsedWeek: 0,
    pressAnsweredWeek: 0,
    staff: createInitialStaffForClub(templateClub.id, templateClub.reputation, initialLeague),
    staffMarket: createStaffMarketPool(),
    trainingPlan: createInitialTrainingPlan(),
    scoutReports: [],
    shortlistIds: [],
    mentoringPairs: [],
    memories: [],
    achievements: createAchievementsCatalog(),
    stats: { ...DEFAULT_STATS },
    activeSlotNumber: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}

function normalizeCareer(parsed: Partial<SavedCareer>, autostart: boolean): SavedCareer {
  const leagueId: LeagueId = isValidLeagueId(parsed.leagueId) ? parsed.leagueId : 'SUPER_LIG';
  const fresh = createFreshState(autostart, leagueId);
  if (!parsed.clubs || !parsed.myTactics || !parsed.fixtures) return fresh;

  const rawActive = Array.isArray(parsed.activeLeagues)
    ? parsed.activeLeagues.filter(isValidLeagueId)
    : [...ALL_LEAGUE_IDS];
  const activeLeagues = Array.from(new Set([leagueId, ...rawActive]));

  const myClubId = parsed.myClubId ?? (autostart ? parsed.clubs[0]?.id ?? null : null);
  const activeClub = parsed.clubs.find((c) => c.id === myClubId) ?? parsed.clubs[0];
  const benchIds =
    parsed.myTactics.benchPlayerIds && parsed.myTactics.benchPlayerIds.length > 0
      ? parsed.myTactics.benchPlayerIds
      : buildDefaultBenchForClub(activeClub, parsed.myTactics.slots);

  const worldLeagues = syncWorldLeagues(
    activeLeagues,
    leagueId,
    parsed.clubs,
    parsed.fixtures,
    parsed.worldLeagues ?? {}
  );

  return {
    ...fresh,
    ...parsed,
    leagueId,
    activeLeagues,
    worldLeagues,
    myClubId,
    myTactics: {
      ...parsed.myTactics,
      tacticalStyle: parsed.myTactics.tacticalStyle ?? 'CONTROL_POSSESSION',
      benchPlayerIds: benchIds,
    },
    manager: parsed.manager ?? fresh.manager,
    marketPool:
      parsed.marketPool && parsed.marketPool.length > 0 && 'listingType' in parsed.marketPool[0]
        ? parsed.marketPool
        : fresh.marketPool,
    news: parsed.news ?? fresh.news,
    inbox: parsed.inbox ?? fresh.inbox,
    staff: parsed.staff && parsed.staff.length > 0 ? parsed.staff : fresh.staff,
    staffMarket: parsed.staffMarket && parsed.staffMarket.length > 0 ? parsed.staffMarket : fresh.staffMarket,
    trainingPlan: parsed.trainingPlan ?? fresh.trainingPlan,
    scoutReports: parsed.scoutReports ?? [],
    shortlistIds: parsed.shortlistIds ?? [],
    mentoringPairs: parsed.mentoringPairs ?? [],
    memories: parsed.memories ?? [],
    achievements:
      parsed.achievements && parsed.achievements.length > 0 ? parsed.achievements : fresh.achievements,
    stats: { ...DEFAULT_STATS, ...(parsed.stats ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
  };
}

function loadSavedState(autostart: boolean): SavedCareer {
  const res = careerStore.load();
  lastCareerLoad = res;
  if (res.value == null) return createFreshState(autostart);
  try {
    return normalizeCareer(res.value as Partial<SavedCareer>, autostart);
  } catch {
    // Kayıt geçerli JSON ama işlenemedi: üzerine yazmadan önce kopyasını sakla.
    careerStore.quarantineCurrent();
    lastCareerLoad = { ...res, quarantined: true };
    return createFreshState(autostart);
  }
}

function simulateWorldLeaguesWeek(
  worldLeagues: Partial<Record<LeagueId, WorldLeagueState>>,
  activeLeagues: LeagueId[],
  primaryLeagueId: LeagueId,
  primaryClubs: Club[],
  primaryFixtures: Fixture[],
  week: number
): Partial<Record<LeagueId, WorldLeagueState>> {
  const synced = syncWorldLeagues(activeLeagues, primaryLeagueId, primaryClubs, primaryFixtures, worldLeagues);
  const next: Partial<Record<LeagueId, WorldLeagueState>> = { ...synced };

  for (const lid of activeLeagues) {
    if (lid === primaryLeagueId) continue;
    const state = synced[lid];
    if (!state) continue;
    const leagueWeeks = Math.max(1, (state.clubs.length - 1) * 2);
    if (week > leagueWeeks) continue;

    const scorerTotals = new Map<string, { goals: number; assists: number }>();
    const nextFixtures = state.fixtures.map((f) => {
      if (!f.played && f.week === week) {
        const sim = simulateAiFixture(f, state.clubs);
        sim.scorers.forEach((v, k) => {
          const cur = scorerTotals.get(k) ?? { goals: 0, assists: 0 };
          scorerTotals.set(k, { goals: cur.goals + v.goals, assists: cur.assists + v.assists });
        });
        return { ...sim.fixture, events: [] };
      }
      return f;
    });

    const nextClubs = state.clubs.map((c) => ({
      ...c,
      players: c.players.map((p) => {
        const st = scorerTotals.get(p.id);
        return st ? { ...p, goals: p.goals + st.goals, assists: p.assists + st.assists } : p;
      }),
    }));

    next[lid] = { clubs: nextClubs, fixtures: nextFixtures };
  }
  return next;
}

function runAchievementCheck(
  career: SavedCareer,
  overrides?: Partial<{
    stats: CareerStats;
    wins: number;
    boardConfidence: number;
    licenseFull: boolean;
    scoutReportsCount: number;
    week: number;
  }>
): { achievements: AchievementDef[]; newlyUnlocked: AchievementDef[] } {
  const s = overrides?.stats ?? career.stats;
  const activeClub = career.clubs.find((c) => c.id === career.myClubId);
  const res = evaluateAchievements(career.achievements, {
    wins: overrides?.wins ?? career.manager.wins,
    cleanSheets: s.cleanSheets,
    derbyWins: s.derbyWins,
    fourGoalGames: s.fourGoalGames,
    winStreak: s.winStreak,
    transfersSigned: s.transfersSigned,
    freeOrLoansSigned: s.freeOrLoansSigned,
    scoutReports: overrides?.scoutReportsCount ?? career.scoutReports.length,
    trainingsApplied: s.trainingsApplied,
    pressDone: s.pressDone,
    staffHired: s.staffHired,
    youthOvrGains: s.youthOvrGains,
    boardConfidence: overrides?.boardConfidence ?? activeClub?.boardConfidence ?? 60,
    licenseFull: overrides?.licenseFull ?? career.licenseMode === 'FULL_LICENSE',
    week: overrides?.week ?? career.currentWeek,
  });
  return { achievements: res.next, newlyUnlocked: res.newlyUnlocked };
}

export default function App() {
  const autostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [career, setCareer] = useState<SavedCareer>(() => loadSavedState(autostart));
  const [screen, setScreen] = useState<AppScreen>(() => (autostart ? 'DASHBOARD' : 'SPLASH'));
  const [menuContext, setMenuContext] = useState(false);
  const [saveSlots, setSaveSlots] = useState<Array<SaveSlotSummary | null>>(() => listSaveSlots());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [lastMatchSummary, setLastMatchSummary] = useState<{
    fixture: Fixture;
    gateRevenue: number;
    newInjuries: string[];
  } | null>(null);
  const [inspectedStandingsLeague, setInspectedStandingsLeague] = useState<LeagueId | null>(null);
  const [inspectedJobLeague, setInspectedJobLeague] = useState<LeagueId | null>(null);

  // Sample clubs across all 9 leagues for License showcase when no club is selected yet
  const licenseSampleClubs = useMemo(
    () => ALL_LEAGUE_IDS.map((lid) => createClubsForLeague(lid)[0]),
    []
  );

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [lastHolidayReport, setLastHolidayReport] = useState<HolidaySummaryReport | null>(null);
  const [pressModalOpen, setPressModalOpen] = useState(false);
  const [pressQuestionIndex, setPressQuestionIndex] = useState(0);
  const [activePressQuestion, setActivePressQuestion] = useState<DynamicPressQuestion | null>(null);
  const [lastPressImpact, setLastPressImpact] = useState<PressAnswerImpact | null>(null);
  const [finaleModalOpen, setFinaleModalOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const handleStartHoliday = useCallback(
    (config: HolidayConfig) => {
      const result = runHolidaySimulation({
        config,
        seasonNumber: career.seasonNumber ?? 1,
        currentWeek: career.currentWeek,
        leagueId: career.leagueId,
        clubs: career.clubs,
        fixtures: career.fixtures,
        userClubId: career.myClubId,
        tactics: career.myTactics,
        staff: career.staff,
        licenseMode: career.licenseMode,
      });

      setCareer((prev) => ({
        ...prev,
        seasonNumber: result.seasonNumber,
        currentWeek: result.currentWeek,
        clubs: result.clubs,
        fixtures: result.fixtures,
        holidayConfig: config,
        seasonHistory: [...(prev.seasonHistory ?? []), ...result.seasonHistoryAdded],
        inbox: [...result.inboxMessages, ...prev.inbox].slice(0, 80),
      }));
      setLastHolidayReport(result.report);
      if (result.careerCompleted) {
        setFinaleModalOpen(true);
      }
      showToast(`Tatil tamamlandı: ${result.report.weeksSimulated} hafta simüle edildi.`);
    },
    [career, showToast]
  );

  const buildNextPressQuestion = useCallback(
    (nextIndex: number) => {
      const activeClub = career.clubs.find((c) => c.id === career.myClubId) ?? career.clubs[0];
      const upcoming = career.fixtures.find(
        (f) => !f.played && (f.homeClubId === activeClub?.id || f.awayClubId === activeClub?.id)
      );
      const lastPlayed = [...career.fixtures]
        .reverse()
        .find((f) => f.played && (f.homeClubId === activeClub?.id || f.awayClubId === activeClub?.id));

      const oppId = upcoming
        ? upcoming.homeClubId === activeClub?.id
          ? upcoming.awayClubId
          : upcoming.homeClubId
        : career.clubs[1]?.id;
      const oppClub = career.clubs.find((c) => c.id === oppId);
      const clubName = activeClub ? getClubDisplayName(activeClub, career.licenseMode) : 'Kulübümüz';
      const opponentName = oppClub ? getClubDisplayName(oppClub, career.licenseMode) : 'Rakip Takım';

      // Rotate across PRE_MATCH, POST_MATCH (if a match was played), and TRANSFER_IN / TRANSFER_OUT if transfers occurred
      const recentTransferIn = career.financeRecords.find((r) => r.category === 'TRANSFER_IN');
      const recentTransferOut = career.financeRecords.find((r) => r.category === 'TRANSFER_OUT');

      let phase: 'PRE_MATCH' | 'POST_MATCH' | 'TRANSFER_IN' | 'TRANSFER_OUT' = 'PRE_MATCH';
      let transferPlayerName: string | undefined;
      let lastResult: 'W' | 'D' | 'L' | undefined;
      let lastScore: string | undefined;

      if (nextIndex % 4 === 1 && lastPlayed && activeClub) {
        phase = 'POST_MATCH';
        const isHome = lastPlayed.homeClubId === activeClub.id;
        const gf = isHome ? lastPlayed.homeGoals : lastPlayed.awayGoals;
        const ga = isHome ? lastPlayed.awayGoals : lastPlayed.homeGoals;
        lastResult = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
        lastScore = `${gf}-${ga}`;
      } else if (nextIndex % 4 === 2 && recentTransferIn) {
        phase = 'TRANSFER_IN';
        transferPlayerName = recentTransferIn.description.replace(/^Transfer:\s*/i, '');
      } else if (nextIndex % 4 === 3 && recentTransferOut) {
        phase = 'TRANSFER_OUT';
        transferPlayerName = recentTransferOut.description.replace(/^Satış:\s*/i, '');
      }

      return generateDynamicPressConference(phase, {
        week: career.currentWeek,
        seasonNumber: career.seasonNumber ?? 1,
        clubName,
        opponentName,
        questionIndex: nextIndex,
        lastResult,
        lastScore,
        transferPlayerName,
      });
    },
    [career]
  );

  const handleOpenTurkishPress = useCallback(() => {
    const nextIdx = pressQuestionIndex + 1;
    setPressQuestionIndex(nextIdx);
    setActivePressQuestion(buildNextPressQuestion(nextIdx));
    setLastPressImpact(null);
    setPressModalOpen(true);
  }, [buildNextPressQuestion, pressQuestionIndex]);

  const handleResolveTurkishPress = useCallback(
    (
      mode: 'PRESET' | 'CUSTOM' | 'SKIP',
      payload: { tone?: 'CONFIDENT' | 'HUMBLE' | 'PRESSURE_OPP' | 'DIPLOMATIC'; customText?: string }
    ) => {
      if (!activePressQuestion) return;
      const activeClub = career.clubs.find((c) => c.id === career.myClubId);
      const clubName = activeClub ? getClubDisplayName(activeClub, career.licenseMode) : 'Kulübümüz';
      const impact = evaluatePressAnswer(mode, {
        tone: payload.tone,
        customText: payload.customText,
        outlet: activePressQuestion.outlet,
        clubName,
      });
      setLastPressImpact(impact);
      setCareer((prev) => ({
        ...prev,
        mediaRelations: Math.max(0, Math.min(100, (prev.mediaRelations ?? 65) + impact.mediaRelationsDelta)),
        fanSupport: Math.max(0, Math.min(100, (prev.fanSupport ?? 70) + impact.fanSupportDelta)),
        clubs: prev.clubs.map((c) =>
          c.id === prev.myClubId
            ? {
                ...c,
                boardConfidence: Math.max(0, Math.min(100, c.boardConfidence + impact.boardConfidenceDelta)),
                players: c.players.map((pl) => ({
                  ...pl,
                  morale: Math.max(15, Math.min(100, pl.morale + impact.moraleDelta)),
                })),
              }
            : c
        ),
        inbox: [
          {
            id: `media_${Date.now()}`,
            week: prev.currentWeek,
            sender: activePressQuestion.outlet,
            senderRole: activePressQuestion.journalist,
            subject: impact.headline,
            body: `${impact.reactionSummary}\n\nEtki: Moral ${impact.moraleDelta >= 0 ? '+' : ''}${impact.moraleDelta}, Taraftar ${impact.fanSupportDelta >= 0 ? '+' : ''}${impact.fanSupportDelta}, Yönetim ${impact.boardConfidenceDelta >= 0 ? '+' : ''}${impact.boardConfidenceDelta}, Medya ${impact.mediaRelationsDelta >= 0 ? '+' : ''}${impact.mediaRelationsDelta}.`,
            category: 'MEDIA' as const,
            read: false,
          },
          ...prev.inbox,
        ].slice(0, 80),
      }));
    },
    [activePressQuestion, career.clubs, career.licenseMode, career.myClubId]
  );

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 3800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Sync audio mute, volumes, & ambient menu loop
  useEffect(() => {
    soundEngine.setMuted(career.settings.muted);
  }, [career.settings.muted]);

  useEffect(() => {
    soundEngine.setVolumes(career.settings.musicVolume / 100, career.settings.sfxVolume / 100);
  }, [career.settings.musicVolume, career.settings.sfxVolume]);

  useEffect(() => {
    const isMenuScreen =
      screen === 'MAIN_MENU' ||
      screen === 'MANAGER_SETUP' ||
      screen === 'CLUB_SELECT' ||
      (menuContext && (screen === 'SAVE_SLOTS' || screen === 'GUIDE' || screen === 'LICENSE' || screen === 'SETTINGS'));
    if (isMenuScreen && career.settings.menuMusicEnabled && !career.settings.muted) {
      soundEngine.startMenuMusic();
    } else {
      soundEngine.stopMenuMusic();
    }
  }, [screen, menuContext, career.settings.menuMusicEnabled, career.settings.muted]);

  // Auto-persist career state (debounce'lu; bozuk kaydın üstüne yazmaz, hataları bildirir)
  useEffect(() => {
    careerStore.schedule(career);
  }, [career]);

  const totalWeeks = Math.max(1, (career.clubs.length - 1) * 2);

  useEffect(() => {
    if (
      screen === 'SPLASH' ||
      screen === 'MAIN_MENU' ||
      screen === 'CLUB_SELECT' ||
      screen === 'MANAGER_SETUP'
    ) {
      document.body.dataset.state = 'title';
    } else if (career.currentWeek > totalWeeks && screen === 'STANDINGS') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [screen, career.currentWeek, totalWeeks]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showExitModal) {
          setShowExitModal(false);
          return;
        }
        if (screen === 'CLUB_SELECT' || screen === 'MANAGER_SETUP') setScreen('MAIN_MENU');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, showExitModal]);

  const myClub = useMemo(() => {
    if (career.unemployed || !career.myClubId) return null;
    return career.clubs.find((c) => c.id === career.myClubId) ?? null;
  }, [career.clubs, career.myClubId, career.unemployed]);

  const standings = useMemo(
    () => computeStandings(career.clubs, career.fixtures),
    [career.clubs, career.fixtures]
  );

  const nextFixture = useMemo(() => {
    if (!myClub) return null;
    return (
      career.fixtures.find(
        (f) =>
          !f.played &&
          f.week === career.currentWeek &&
          (f.homeClubId === myClub.id || f.awayClubId === myClub.id)
      ) ?? null
    );
  }, [career.fixtures, career.currentWeek, myClub]);

  const tr = career.settings.language === 'tr';

  // Android geri tuşu + arka plana geçişte kayıt/ses (yalnızca APK'da etkin)
  const backStateRef = useRef({ screen, menuContext, tr });
  backStateRef.current = { screen, menuContext, tr };
  const lastBackRef = useRef(0);
  useEffect(() => {
    let remove: (() => void) | undefined;
    let cancelled = false;
    void initAndroidLifecycle({
      onBack: () => {
        const { screen: sc, menuContext: mc, tr: isTr } = backStateRef.current;
        if (sc === 'MATCHDAY') {
          showToast(isTr ? 'Maç sırasında geri tuşu kapalı.' : 'Back is disabled during a match.');
        } else if (sc === 'SPLASH' || sc === 'MAIN_MENU') {
          void exitAndroidApp();
        } else if (sc === 'DASHBOARD') {
          const now = Date.now();
          if (now - lastBackRef.current < 2000) void exitAndroidApp();
          else {
            lastBackRef.current = now;
            showToast(isTr ? 'Çıkmak için tekrar basın.' : 'Press back again to exit.');
          }
        } else if (mc && (sc === 'SAVE_SLOTS' || sc === 'SETTINGS' || sc === 'GUIDE' || sc === 'LICENSE')) {
          setScreen('MAIN_MENU');
        } else {
          setScreen('DASHBOARD');
        }
      },
      onPause: () => {
        careerStore.flush();
        void appStorage.flush();
        soundEngine.stopCrowdAmbience();
      },
    }).then((r) => {
      if (cancelled) r();
      else remove = r;
    });
    return () => {
      cancelled = true;
      remove?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kayıt sağlığı bildirimleri + uygulama arka plana giderken kaydı boşalt
  useEffect(() => {
    const msgs: Record<SaveErrorKind, [string, string]> = {
      quota: ['Kayıt yazılamadı: depolama dolu! Kayıt yuvalarını silin veya yedek alın.', 'Save failed: storage full! Delete slots or export a backup.'],
      locked: ['Bozuk kayıt korunuyor; yeni ilerleme kaydedilemiyor. Yedekten yükleyin.', 'A corrupt save is being preserved; progress cannot be saved. Load a backup.'],
      unavailable: ['Kayıt yapılamıyor (depolama erişilemez).', 'Cannot save (storage unavailable).'],
      large: ['Kayıt boyutu sınıra yaklaşıyor. Kayıt Yuvaları\'ndan yedek alın.', 'Save size is nearing the limit. Export a backup from Save Slots.'],
    };
    const unsub = careerStore.onError((kind) => showToast(msgs[kind][tr ? 0 : 1]));
    const unsubIdb = appStorage.onError(() => showToast(msgs.unavailable[tr ? 0 : 1]));
    const info = lastCareerLoad;
    if (info?.quarantined) {
      showToast(tr ? 'Bozuk kayıt algılandı; kopyası saklandı' + (info.value ? ', yedekten yüklendi.' : '.') : 'Corrupt save detected; a copy was kept' + (info.value ? ' and your backup was loaded.' : '.'));
    } else if (info?.status === 'recovered') {
      showToast(tr ? 'Kayıt yedekten kurtarıldı.' : 'Save recovered from backup.');
    }
    lastCareerLoad = null;
    const flush = () => {
      careerStore.flush();
      void appStorage.flush();
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
      flush();
      unsub();
      unsubIdb();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadInboxCount = useMemo(
    () => career.inbox.filter((m) => !m.read).length,
    [career.inbox]
  );

  const chiefScoutRating = useMemo(
    () => career.staff.find((s) => s.role === 'CHIEF_SCOUT')?.rating ?? 72,
    [career.staff]
  );

  const physioRating = useMemo(
    () => career.staff.find((s) => s.role === 'HEAD_PHYSIO')?.rating ?? 72,
    [career.staff]
  );

  const youthDirRating = useMemo(
    () => career.staff.find((s) => s.role === 'YOUTH_DIRECTOR')?.rating ?? 72,
    [career.staff]
  );

  // Save / Load handlers
  const handleSaveToSlot = useCallback(
    (slot: number) => {
      const managerFullName = `${career.manager.firstName || 'Menajer'} ${career.manager.lastName || ''}`.trim();
      const clubLabel = myClub
        ? getClubDisplayName(myClub, career.licenseMode)
        : career.unemployed
        ? tr
          ? 'Kulüpsüz Kariyer'
          : 'Unemployed'
        : tr
        ? 'Kulüp Seçilmedi'
        : 'No Club';

      const summary: SaveSlotSummary = {
        slot,
        savedAt: new Date().toISOString(),
        managerName: managerFullName,
        clubName: clubLabel,
        leagueId: career.leagueId,
        week: career.currentWeek,
        licenseMode: career.licenseMode,
      };
      const nextCareer = { ...career, activeSlotNumber: slot };
      if (writeSaveSlot(slot, summary, nextCareer)) {
        setCareer(nextCareer);
        setSaveSlots(listSaveSlots());
        soundEngine.playSuccess();
        showToast(
          tr ? `Kariyer Yuva #${slot} üzerine kaydedildi (${clubLabel}).` : `Saved to Slot #${slot}.`
        );
      } else {
        showToast(tr ? `Yuva #${slot} yazılamadı: depolama dolu olabilir.` : `Could not write Slot #${slot}: storage may be full.`);
      }
    },
    [career, myClub, tr, showToast]
  );

  const handleLoadFromSlot = useCallback(
    (slot: number) => {
      const loaded = readSaveSlot<Partial<SavedCareer>>(slot);
      if (!loaded) return;
      const normalized = normalizeCareer({ ...loaded.payload, activeSlotNumber: slot }, false);
      setCareer(normalized);
      setMenuContext(false);
      setScreen(normalized.managerConfigured || normalized.myClubId || normalized.unemployed ? 'DASHBOARD' : 'CLUB_SELECT');
      soundEngine.playSuccess();
      showToast(tr ? `Kayıt Yuva #${slot} başarıyla yüklendi!` : `Loaded Save Slot #${slot}!`);
    },
    [tr, showToast]
  );

  const handleImportBackup = useCallback(
    (value: unknown) => {
      try {
        const normalized = normalizeCareer(value as Partial<SavedCareer>, false);
        setCareer(normalized);
        setMenuContext(false);
        setScreen(normalized.managerConfigured || normalized.myClubId || normalized.unemployed ? 'DASHBOARD' : 'CLUB_SELECT');
        soundEngine.playSuccess();
      } catch {
        showToast(tr ? 'Yedek dosyası işlenemedi.' : 'Backup file could not be processed.');
      }
    },
    [tr, showToast]
  );

  const handleDeleteSlot = useCallback(
    (slot: number) => {
      deleteSaveSlot(slot);
      setSaveSlots(listSaveSlots());
      soundEngine.playClick();
      showToast(tr ? `Kayıt Yuva #${slot} silindi.` : `Deleted Slot #${slot}.`);
    },
    [tr, showToast]
  );

  const handleQuickSave = useCallback(() => {
    const slot = career.activeSlotNumber ?? 1;
    handleSaveToSlot(slot);
  }, [career.activeSlotNumber, handleSaveToSlot]);

  // Toggle active leagues in multi-league career setup
  const handleToggleActiveLeague = useCallback((lid: LeagueId) => {
    soundEngine.playClick();
    setCareer((prev) => {
      const exists = prev.activeLeagues.includes(lid);
      if (exists) {
        if (prev.activeLeagues.length <= 1 || lid === prev.leagueId) return prev;
        return {
          ...prev,
          activeLeagues: prev.activeLeagues.filter((x) => x !== lid),
        };
      }
      const nextActive = [...prev.activeLeagues, lid];
      return {
        ...prev,
        activeLeagues: nextActive,
        worldLeagues: syncWorldLeagues(nextActive, prev.leagueId, prev.clubs, prev.fixtures, prev.worldLeagues),
      };
    });
  }, []);

  // League switch (never auto-selects Galatasaray on club select!)
  const handleSwitchLeague = useCallback((nextLeague: LeagueId) => {
    soundEngine.playClick();
    setCareer((prev) => {
      if (prev.leagueId === nextLeague) return prev;
      const nextActive = prev.activeLeagues.includes(nextLeague)
        ? prev.activeLeagues
        : [...prev.activeLeagues, nextLeague];
      const worldWithPrev = syncWorldLeagues(
        nextActive,
        prev.leagueId,
        prev.clubs,
        prev.fixtures,
        prev.worldLeagues
      );
      const targetWorld = worldWithPrev[nextLeague];
      const clubs = targetWorld?.clubs ?? createClubsForLeague(nextLeague);
      const fixtures = targetWorld?.fixtures ?? generateRoundRobinFixtures(clubs);
      const firstClub = clubs[0];
      const slots = buildTacticsForClub(firstClub, firstClub.preferredFormation);
      const copy = getLeagueNewsCopy(nextLeague);
      return {
        ...prev,
        leagueId: nextLeague,
        activeLeagues: nextActive,
        worldLeagues: worldWithPrev,
        clubs,
        fixtures,
        myClubId: null,
        unemployed: false,
        myTactics: {
          formation: firstClub.preferredFormation,
          tacticalStyle: 'CONTROL_POSSESSION',
          mentality: 'BALANCED',
          pressing: 'MEDIUM',
          tempo: 'NORMAL',
          defensiveLine: 55,
          slots,
          benchPlayerIds: buildDefaultBenchForClub(firstClub, slots),
        },
        financeRecords: [],
        marketPool: createTransferMarketPool(nextLeague),
        news: [
          {
            id: `news_league_${Date.now()}`,
            week: prev.currentWeek,
            title: copy.title,
            body: copy.body,
            category: 'BOARD' as const,
          },
        ],
        inbox: [],
        recoveryUsedWeek: 0,
        pressAnsweredWeek: 0,
        staff: createInitialStaffForClub(firstClub.id, firstClub.reputation, nextLeague),
        trainingPlan: createInitialTrainingPlan(),
        mentoringPairs: [],
      };
    });
  }, []);

  const handleSelectClub = useCallback((clubId: string, targetLeagueId?: LeagueId) => {
    soundEngine.playClick();
    setMenuContext(false);
    setCareer((prev) => {
      const resolvedLeague = targetLeagueId ?? prev.leagueId;
      const nextActive = prev.activeLeagues.includes(resolvedLeague)
        ? prev.activeLeagues
        : [...prev.activeLeagues, resolvedLeague];
      const syncedWorld = syncWorldLeagues(
        nextActive,
        prev.leagueId,
        prev.clubs,
        prev.fixtures,
        prev.worldLeagues
      );
      const switchingLeague = resolvedLeague !== prev.leagueId;
      const leagueClubs = switchingLeague
        ? syncedWorld[resolvedLeague]?.clubs ?? createClubsForLeague(resolvedLeague)
        : prev.clubs;
      const leagueFixtures = switchingLeague
        ? syncedWorld[resolvedLeague]?.fixtures ?? generateRoundRobinFixtures(leagueClubs)
        : prev.fixtures;

      const target = leagueClubs.find((c) => c.id === clubId) ?? leagueClubs[0];
      const clubName = getClubDisplayName(target, prev.licenseMode);
      const slots = buildTacticsForClub(target, target.preferredFormation);
      const initialMsgs = generateInitialInbox(
        target,
        resolvedLeague,
        prev.manager,
        prev.licenseMode,
        prev.currentWeek
      );
      return {
        ...prev,
        leagueId: resolvedLeague,
        activeLeagues: nextActive,
        worldLeagues: syncedWorld,
        clubs: leagueClubs,
        fixtures: leagueFixtures,
        marketPool: switchingLeague ? createTransferMarketPool(resolvedLeague) : prev.marketPool,
        myClubId: target.id,
        unemployed: false,
        managerConfigured: true,
        myTactics: {
          formation: target.preferredFormation,
          tacticalStyle: 'CONTROL_POSSESSION',
          mentality: 'BALANCED',
          pressing: 'MEDIUM',
          tempo: 'NORMAL',
          defensiveLine: 55,
          slots,
          benchPlayerIds: buildDefaultBenchForClub(target, slots),
        },
        staff: createInitialStaffForClub(target.id, target.reputation, resolvedLeague),
        mentoringPairs: [],
        inbox: prev.currentWeek === 1 ? initialMsgs : [...initialMsgs, ...prev.inbox].slice(0, 45),
        news: [
          {
            id: `news_hire_${Date.now()}`,
            week: prev.currentWeek,
            title: `${prev.manager.firstName || 'Menajer'} ${prev.manager.lastName}, ${clubName} başında!`,
            body: `Yeni teknik direktör imza töreninde taraftarlara disiplin ve mücadele sözü verdi.`,
            category: 'MANAGER' as const,
          },
          ...prev.news,
        ].slice(0, 20),
      };
    });
    setInspectedStandingsLeague(null);
    setInspectedJobLeague(null);
    setScreen('DASHBOARD');
  }, []);

  const handleStartUnemployed = useCallback(() => {
    soundEngine.playClick();
    setMenuContext(false);
    setCareer((prev) => ({
      ...prev,
      myClubId: null,
      unemployed: true,
      managerConfigured: true,
      news: [
        {
          id: `news_free_${Date.now()}`,
          week: prev.currentWeek,
          title: 'Kulüpsüz Kariyer Başladı',
          body: `${prev.manager.firstName || 'Menajer'} ${prev.manager.lastName} kulüplerin teknik direktörlük ilanlarına başvuruyor.`,
          category: 'MANAGER' as const,
        },
        ...prev.news,
      ].slice(0, 20),
    }));
    setScreen('DASHBOARD');
  }, []);

  const handleResignCurrentClub = useCallback(
    (reasonLabel?: string, customNote?: string, repImpact?: number) => {
      setCareer((prev) => {
        const oldClub = prev.clubs.find((c) => c.id === prev.myClubId);
        const oldName = oldClub ? getClubDisplayName(oldClub, prev.licenseMode) : 'kulüp';
        const reasonSummary = reasonLabel ? `Gerekçe: ${reasonLabel}.` : 'Karşılıklı fesih ile ayrıldı.';
        const noteText = customNote && customNote.trim() ? ` Açıklama: "${customNote.trim()}"` : '';
        const nextRep = Math.max(30, prev.manager.reputation + (repImpact ?? -1));
        const resignInbox: InboxMessage = {
          id: `inbox_resign_${Date.now()}`,
          week: prev.currentWeek,
          sender: `${oldName} Yönetim Kurulu`,
          senderRole: 'Resmi Veda Bildirimi',
          subject: `İstifa Onayı: ${oldName} Görevinden Ayrıldınız`,
          body: `${oldName} yönetim kurulu istifa başvurunuzu kabul etti.\n${reasonSummary}${noteText}\n\nŞu an kulüpsüz statüdesiniz; İş Piyasası veya Kariyer Merkezi üzerinden kulüplerle yönetim mülakatlarına girebilirsiniz.`,
          category: 'BOARD',
          read: false,
          actionLabel: 'İş Piyasasına Git',
          targetScreen: 'JOB_MARKET',
        };
        return {
          ...prev,
          myClubId: null,
          unemployed: true,
          mentoringPairs: [],
          manager: {
            ...prev.manager,
            reputation: nextRep,
          },
          inbox: [resignInbox, ...prev.inbox].slice(0, 45),
          news: [
            {
              id: `news_resign_${Date.now()}`,
              week: prev.currentWeek,
              title: `İstifa: ${prev.manager.firstName} ${prev.manager.lastName} (${oldName})`,
              body: `${reasonSummary}${noteText} Görevden ayrılan teknik direktör serbest piyasada yönetim görüşmelerini değerlendiriyor.`,
              category: 'MANAGER' as const,
            },
            ...prev.news,
          ].slice(0, 20),
        };
      });
    },
    []
  );

  const handleAdvanceUnemployedWeek = useCallback(() => {
    setCareer((prev) => {
      const weeksCap = Math.max(1, (prev.clubs.length - 1) * 2);
      if (prev.currentWeek > weeksCap) return prev;
      const aiScorerTotals = new Map<string, { goals: number; assists: number }>();
      const updatedFixtures = prev.fixtures.map((f) => {
        if (!f.played && f.week === prev.currentWeek) {
          const sim = simulateAiFixture(f, prev.clubs);
          sim.scorers.forEach((v, k) => {
            const cur = aiScorerTotals.get(k) ?? { goals: 0, assists: 0 };
            aiScorerTotals.set(k, { goals: cur.goals + v.goals, assists: cur.assists + v.assists });
          });
          return sim.fixture;
        }
        return f;
      });
      const updatedClubs = prev.clubs.map((c) => ({
        ...c,
        players: c.players.map((p) => {
          const stat = aiScorerTotals.get(p.id);
          return stat ? { ...p, goals: p.goals + stat.goals, assists: p.assists + stat.assists } : p;
        }),
      }));
      const nextWorldLeagues = simulateWorldLeaguesWeek(
        prev.worldLeagues,
        prev.activeLeagues,
        prev.leagueId,
        updatedClubs,
        updatedFixtures,
        prev.currentWeek
      );

      return {
        ...prev,
        clubs: updatedClubs,
        fixtures: updatedFixtures,
        worldLeagues: nextWorldLeagues,
        currentWeek: prev.currentWeek + 1,
        manager: {
          ...prev.manager,
          reputation: Math.min(90, prev.manager.reputation + 1),
        },
      };
    });
  }, []);

  const handleAnswerPress = useCallback(
    (res: PressConferenceResult) => {
      let unlockedTitle: string | null = null;
      setCareer((prev) => {
        if (prev.pressAnsweredWeek === prev.currentWeek || !prev.myClubId) return prev;
        const nextStats: CareerStats = { ...prev.stats, pressDone: prev.stats.pressDone + 1 };
        const activeClub = prev.clubs.find((c) => c.id === prev.myClubId);
        const nextConf = Math.min(100, (activeClub?.boardConfidence ?? 65) + res.confidenceDelta);
        const ach = runAchievementCheck(prev, { stats: nextStats, boardConfidence: nextConf });
        if (ach.newlyUnlocked.length > 0) unlockedTitle = ach.newlyUnlocked[0].title;

        return {
          ...prev,
          pressAnsweredWeek: prev.currentWeek,
          stats: nextStats,
          achievements: ach.achievements,
          manager: {
            ...prev.manager,
            reputation: Math.min(99, prev.manager.reputation + res.repDelta),
          },
          clubs: prev.clubs.map((c) =>
            c.id === prev.myClubId
              ? {
                  ...c,
                  boardConfidence: Math.min(100, c.boardConfidence + res.confidenceDelta),
                  players: c.players.map((p) => ({
                    ...p,
                    morale: Math.min(100, p.morale + res.moraleDelta),
                  })),
                }
              : c
          ),
          news: [
            {
              id: `news_press_${prev.currentWeek}`,
              week: prev.currentWeek,
              title: res.headline,
              body: res.body,
              category: 'MANAGER' as const,
            },
            ...prev.news,
          ].slice(0, 20),
        };
      });
      if (unlockedTitle) {
        showToast(`Başarım Açıldı: ${unlockedTitle}!`);
      }
    },
    [showToast]
  );

  const handleApplyWeeklyTraining = useCallback(() => {
    let feedbackMsg = '';
    setCareer((prev) => {
      const club = prev.clubs.find((c) => c.id === prev.myClubId);
      if (!club || prev.trainingPlan.appliedWeek === prev.currentWeek) return prev;

      const res = applyWeeklyTeamTraining(club.players, prev.trainingPlan, prev.staff, prev.currentWeek);

      // Extra mentoring progression for U23 mentees paired with veterans
      const menteeSet = new Set(prev.mentoringPairs.map((m) => m.menteeId));
      let extraYouthGains = 0;
      const finalPlayers = res.updatedPlayers.map((p) => {
        if (!menteeSet.has(p.id) || p.ovr >= p.potential || p.injuredWeeks > 0) return p;
        const boosted = p.growthProgress + 0.08;
        if (boosted >= 1) {
          extraYouthGains++;
          return { ...p, ovr: Math.min(p.potential, p.ovr + 1), growthProgress: boosted - 1 };
        }
        return { ...p, growthProgress: Math.round(boosted * 1000) / 1000 };
      });

      const youthOvrGains =
        prev.stats.youthOvrGains +
        extraYouthGains +
        res.progressedNames.filter((name) => {
          const pl = club.players.find((x) => x.realName === name);
          return pl ? pl.age <= 21 : false;
        }).length;

      const nextStats: CareerStats = {
        ...prev.stats,
        trainingsApplied: prev.stats.trainingsApplied + 1,
        youthOvrGains,
      };
      const ach = runAchievementCheck(prev, { stats: nextStats });
      feedbackMsg =
        ach.newlyUnlocked.length > 0
          ? `Antrenman tamamlandı! Başarım: ${ach.newlyUnlocked[0].title}`
          : res.summaryText;

      const trainInbox: InboxMessage = {
        id: `inbox_train_${prev.currentWeek}_${Date.now()}`,
        week: prev.currentWeek,
        sender: 'Yardımcı Antrenör & Kondisyoner',
        senderRole: 'Antrenman Sahası',
        subject: `Hafta ${prev.currentWeek} İdman Raporu (${prev.trainingPlan.intensity})`,
        body:
          res.summaryText +
          (res.strainedNames.length > 0
            ? `\n\nUyarı: Çift idman yükü altında zorlananlar: ${res.strainedNames.join(', ')}.`
            : ''),
        category: 'MATCH',
        read: false,
        actionLabel: 'Antrenmanı İncele',
        targetScreen: 'TRAINING',
      };

      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === club.id ? { ...c, players: finalPlayers } : c)),
        trainingPlan: { ...prev.trainingPlan, appliedWeek: prev.currentWeek },
        stats: nextStats,
        achievements: ach.achievements,
        inbox: [trainInbox, ...prev.inbox].slice(0, 45),
      };
    });
    if (feedbackMsg) showToast(feedbackMsg);
  }, [showToast]);

  const handleUpdatePlayerFocus = useCallback((playerId: string, focus: TrainingFocus) => {
    setCareer((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) =>
        c.id === prev.myClubId
          ? {
              ...c,
              players: c.players.map((p) => (p.id === playerId ? { ...p, trainingFocus: focus } : p)),
            }
          : c
      ),
    }));
  }, []);

  const handleMedicalIntervention = useCallback(
    (playerId: string, mode: 'REST' | 'INJECTION'): string => {
      const club = career.clubs.find((c) => c.id === career.myClubId);
      const target = club?.players.find((p) => p.id === playerId);
      if (!club || !target) return 'Oyuncu bulunamadı.';

      const result = evaluateMedicalIntervention(target, mode, physioRating, createRng(`med:${career.currentWeek}:${playerId}:${mode}`)());
      const pName = getPlayerDisplayName(target, career.licenseMode);
      const cleanMsg = result.message.replace(target.realName, pName);

      setCareer((prev) => ({
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === prev.myClubId
            ? {
                ...c,
                players: c.players.map((p) =>
                  p.id === playerId
                    ? {
                        ...p,
                        injuredWeeks: result.injuredWeeks,
                        injuryName: result.injuryName,
                        condition: result.condition,
                        morale: Math.max(20, Math.min(100, p.morale + result.moraleDelta)),
                      }
                    : p
                ),
              }
            : c
        ),
      }));
      return cleanMsg;
    },
    [career.clubs, career.myClubId, career.licenseMode, physioRating]
  );

  const handleToggleShortlist = useCallback(
    (playerId: string) => {
      setCareer((prev) => {
        const exists = prev.shortlistIds.includes(playerId);
        return {
          ...prev,
          shortlistIds: exists
            ? prev.shortlistIds.filter((id) => id !== playerId)
            : [playerId, ...prev.shortlistIds],
        };
      });
    },
    []
  );

  const handleScoutPlayer = useCallback(
    (player: Player, clubName: string, leagueId: LeagueId) => {
      let msg = '';
      setCareer((prev) => {
        const rep = generateScoutReport(
          player,
          clubName,
          leagueId,
          chiefScoutRating,
          prev.currentWeek,
          prev.licenseMode
        );
        const nextReports = [rep, ...prev.scoutReports.filter((r) => r.playerId !== player.id)].slice(0, 60);
        const ach = runAchievementCheck(prev, { scoutReportsCount: nextReports.length });
        msg =
          ach.newlyUnlocked.length > 0
            ? `${rep.playerName} (${rep.grade}) raporlandı! Başarım: ${ach.newlyUnlocked[0].title}`
            : `${rep.playerName} için gözlemci raporu hazır (${rep.grade}).`;
        return {
          ...prev,
          scoutReports: nextReports,
          achievements: ach.achievements,
        };
      });
      if (msg) showToast(msg);
    },
    [chiefScoutRating, showToast]
  );

  const handleHireStaff = useCallback(
    (candidate: StaffMember) => {
      let hiredToast = '';
      setCareer((prev) => {
        const club = prev.clubs.find((c) => c.id === prev.myClubId);
        if (!club) return prev;
        const signingFee = candidate.weeklyWage * 14;
        if (club.transferBudget < signingFee) return prev;

        const nextStaff = [
          ...prev.staff.filter((s) => s.role !== candidate.role),
          candidate,
        ];
        const nextMarket = prev.staffMarket.filter((m) => m.id !== candidate.id);
        const nextStats: CareerStats = { ...prev.stats, staffHired: prev.stats.staffHired + 1 };
        const ach = runAchievementCheck(prev, { stats: nextStats });
        const displayStaffName = getStaffDisplayName(candidate, prev.licenseMode);
        hiredToast = `${displayStaffName} (${candidate.rating}) teknik ekibe katıldı!`;

        return {
          ...prev,
          staff: nextStaff,
          staffMarket: nextMarket,
          stats: nextStats,
          achievements: ach.achievements,
          clubs: prev.clubs.map((c) =>
            c.id === club.id
              ? {
                  ...c,
                  transferBudget: Math.max(0, c.transferBudget - signingFee),
                  cashBalance: c.cashBalance - signingFee,
                }
              : c
          ),
          financeRecords: [
            {
              id: `fin_staff_${Date.now()}`,
              week: prev.currentWeek,
              category: 'WAGES' as const,
              description: `Teknik Ekip Tazminatı: ${displayStaffName}`,
              amount: -signingFee,
            },
            ...prev.financeRecords,
          ].slice(0, 40),
        };
      });
      if (hiredToast) showToast(hiredToast);
    },
    [showToast]
  );

  const handleResolveInboxDecision = useCallback(
    (id: string, decision: 'APPROVE' | 'REJECT') => {
      setCareer((prev) => {
        const msg = prev.inbox.find((m) => m.id === id);
        if (!msg || msg.decisionDone) return prev;
        const club = prev.clubs.find((c) => c.id === prev.myClubId);

        let updatedClubs = prev.clubs;
        let nextFinance = prev.financeRecords;
        let extraMsg: InboxMessage | null = null;

        if (msg.decisionType === 'BOARD_BUDGET' && club) {
          if (decision === 'APPROVE' && club.boardConfidence >= 55) {
            const grant = Math.max(250_000, Math.round(club.transferBudget * 0.1));
            updatedClubs = prev.clubs.map((c) =>
              c.id === club.id
                ? { ...c, transferBudget: c.transferBudget + grant, cashBalance: c.cashBalance + grant }
                : c
            );
            nextFinance = [
              {
                id: `fin_board_${Date.now()}`,
                week: prev.currentWeek,
                category: 'SPONSOR' as const,
                description: 'Yönetim Ek Bütçe Onayı',
                amount: grant,
              },
              ...prev.financeRecords,
            ].slice(0, 40);
            extraMsg = {
              id: `inbox_board_ok_${Date.now()}`,
              week: prev.currentWeek,
              sender: 'Yönetim Kurulu Başkanı',
              senderRole: getClubDisplayName(club, prev.licenseMode),
              subject: `Ek Bütçe Talebi Onaylandı (+${formatMoney(grant)})`,
              body: `Yüksek yönetim güveniniz sayesinde transfer bütçenize ${formatMoney(grant)} ek kaynak aktarıldı.`,
              category: 'BOARD',
              read: false,
            };
          } else {
            extraMsg = {
              id: `inbox_board_no_${Date.now()}`,
              week: prev.currentWeek,
              sender: 'Yönetim Kurulu Başkanı',
              senderRole: getClubDisplayName(club, prev.licenseMode),
              subject: 'Ek Bütçe Talebi Reddedildi',
              body:
                decision === 'REJECT'
                  ? 'Mali disipline bağlı kalarak mevcut bütçe ile devam etme kararınız takdir edildi.'
                  : 'Mevcut FFP / yönetim güveni koşulları nedeniyle ek bütçe talebi bu hafta onaylanmadı.',
              category: 'BOARD',
              read: false,
            };
          }
        }

        const updatedInbox = prev.inbox.map((m) => (m.id === id ? { ...m, decisionDone: true, read: true } : m));
        return {
          ...prev,
          clubs: updatedClubs,
          financeRecords: nextFinance,
          inbox: extraMsg ? [extraMsg, ...updatedInbox].slice(0, 45) : updatedInbox,
        };
      });
    },
    []
  );

  const handleMatchCompleted = useCallback(
    (snap: LiveMatchSnapshot) => {
      if (!nextFixture || !myClub) return;

      const isHome = nextFixture.homeClubId === myClub.id;
      const oppId = isHome ? nextFixture.awayClubId : nextFixture.homeClubId;
      const derbyLabel = isDerbyFixture(nextFixture.homeClubId, nextFixture.awayClubId);
      const derbyMult = derbyLabel ? 1.25 : 1.0;
      const gateRevenue = isHome
        ? Math.round(myClub.stadiumCapacity * 32 * derbyMult * (0.78 + createRng(`gate:${career.currentWeek}:${nextFixture.id}`)() * 0.2))
        : Math.round(myClub.stadiumCapacity * 6 * derbyMult);
      const weeklyWages = myClub.players.reduce((s, p) => s + p.weeklyWage, 0);

      const newInjuryMessages: string[] = [];
      const newInjuryDetails: Array<{ playerName: string; injuryName: string; weeks: number }> = [];
      const starterIds = new Set(career.myTactics.slots.map((s) => s.playerId).filter(Boolean));
      let newlyUnlockedBanner: string | null = null;

      setCareer((prev) => {
        const liveScorers = new Map<string, { goals: number; assists: number }>();
        const matchGoalEvents = snap.events.filter((e) => e.type === 'GOAL');
        for (const gev of matchGoalEvents) {
          const teamClub = prev.clubs.find((c) => c.id === gev.teamId);
          if (!teamClub) continue;
          const scorer = teamClub.players.find(
            (p) => getPlayerDisplayName(p, prev.licenseMode) === gev.playerName
          );
          if (scorer) {
            const cur = liveScorers.get(scorer.id) ?? { goals: 0, assists: 0 };
            liveScorers.set(scorer.id, { goals: cur.goals + 1, assists: cur.assists });
          }
          if (gev.assistName) {
            const assister = teamClub.players.find(
              (p) => getPlayerDisplayName(p, prev.licenseMode) === gev.assistName
            );
            if (assister) {
              const cur = liveScorers.get(assister.id) ?? { goals: 0, assists: 0 };
              liveScorers.set(assister.id, { goals: cur.goals, assists: cur.assists + 1 });
            }
          }
        }

        const aiScorers = new Map<string, { goals: number; assists: number }>();
        const updatedFixtures = prev.fixtures.map((f) => {
          if (f.id === nextFixture.id) {
            return {
              ...f,
              played: true,
              homeGoals: snap.homeGoals,
              awayGoals: snap.awayGoals,
              homeXg: snap.homeXg,
              awayXg: snap.awayXg,
              homeShots: snap.homeShots,
              awayShots: snap.awayShots,
              homePossession: snap.homePossession,
              events: snap.events,
            };
          }
          if (!f.played && f.week === prev.currentWeek) {
            const sim = simulateAiFixture(f, prev.clubs);
            sim.scorers.forEach((v, k) => {
              const cur = aiScorers.get(k) ?? { goals: 0, assists: 0 };
              aiScorers.set(k, { goals: cur.goals + v.goals, assists: cur.assists + v.assists });
            });
            return sim.fixture;
          }
          return f;
        });

        const myGoals = isHome ? snap.homeGoals : snap.awayGoals;
        const oppGoals = isHome ? snap.awayGoals : snap.homeGoals;
        const won = myGoals > oppGoals;
        const drew = myGoals === oppGoals;
        let youthGainedNow = 0;

        const updatedClubs = prev.clubs.map((c) => {
          if (c.id === prev.myClubId) {
            const updatedPlayers = c.players.map((p) => {
              const stat = liveScorers.get(p.id);
              const withStats = stat
                ? { ...p, goals: p.goals + stat.goals, assists: p.assists + stat.assists }
                : p;

              if (withStats.injuredWeeks > 0) {
                const rem = withStats.injuredWeeks - 1;
                return {
                  ...withStats,
                  injuredWeeks: rem,
                  injuryName: rem === 0 ? null : withStats.injuryName,
                  condition: Math.min(100, withStats.condition + 16),
                };
              }

              const played = starterIds.has(withStats.id);
              if (played) {
                const liveCond = snap.playerConditions[withStats.id] ?? withStats.condition - 18;
                const fatigueRes = stepPlayerFatigueAndInjury(
                  { ...withStats, condition: liveCond },
                  12,
                  prev.myTactics.pressing,
                  snap.injuredIds.includes(withStats.id) ? 0.001 : createRng(`inj:${prev.currentWeek}:${withStats.id}`)()
                );
                if (fatigueRes.injuredWeeks > 0 && fatigueRes.injuryName) {
                  const pName = getPlayerDisplayName(withStats, prev.licenseMode);
                  newInjuryMessages.push(
                    `${pName}: ${fatigueRes.injuryName} (${fatigueRes.injuredWeeks} hafta)`
                  );
                  newInjuryDetails.push({
                    playerName: pName,
                    injuryName: fatigueRes.injuryName,
                    weeks: fatigueRes.injuredWeeks,
                  });
                }
                const dev = applyYouthDevelopment(
                  {
                    ...withStats,
                    condition: fatigueRes.newCondition,
                    injuredWeeks: fatigueRes.injuredWeeks,
                    injuryName: fatigueRes.injuryName,
                  },
                  true
                );
                if (dev.ovr > withStats.ovr && dev.age <= 21) youthGainedNow++;
                return dev;
              }
              const dev = applyYouthDevelopment(
                { ...withStats, condition: Math.min(100, withStats.condition + 14) },
                false
              );
              if (dev.ovr > withStats.ovr && dev.age <= 21) youthGainedNow++;
              return dev;
            });

            const confDelta = won ? 3 : drew ? 0 : -4;
            return {
              ...c,
              cashBalance: c.cashBalance + gateRevenue - weeklyWages,
              boardConfidence: Math.max(15, Math.min(100, c.boardConfidence + confDelta)),
              players: updatedPlayers,
            };
          }

          return {
            ...c,
            players: c.players.map((p) => {
              const stat = liveScorers.get(p.id) ?? aiScorers.get(p.id);
              return stat ? { ...p, goals: p.goals + stat.goals, assists: p.assists + stat.assists } : p;
            }),
          };
        });

        const oppClubObj = updatedClubs.find((c) => c.id === oppId);
        const oppName = oppClubObj ? getClubDisplayName(oppClubObj, prev.licenseMode) : 'Rakip';
        const newFinances: FinanceRecord[] = [
          {
            id: `fin_gate_${prev.currentWeek}`,
            week: prev.currentWeek,
            category: 'GATE',
            description: `${oppName} Maçı Gişe Geliri`,
            amount: gateRevenue,
          },
          {
            id: `fin_wage_${prev.currentWeek}`,
            week: prev.currentWeek,
            category: 'WAGES',
            description: 'Haftalık Kadro Maaş Ödemesi',
            amount: -weeklyWages,
          },
          ...prev.financeRecords,
        ];

        const playedFix: Fixture = {
          ...nextFixture,
          played: true,
          homeGoals: snap.homeGoals,
          awayGoals: snap.awayGoals,
          homeXg: snap.homeXg,
          awayXg: snap.awayXg,
          homeShots: snap.homeShots,
          awayShots: snap.awayShots,
          homePossession: snap.homePossession,
          events: snap.events,
        };

        setLastMatchSummary({
          fixture: playedFix,
          gateRevenue,
          newInjuries: newInjuryMessages,
        });

        const myClubName = getClubDisplayName(myClub, prev.licenseMode);
        const updatedMyClub = updatedClubs.find((c) => c.id === prev.myClubId) ?? myClub;
        const upcomingFixture = updatedFixtures.find(
          (f) =>
            !f.played &&
            f.week === prev.currentWeek + 1 &&
            (f.homeClubId === updatedMyClub.id || f.awayClubId === updatedMyClub.id)
        );
        const weeklyInbox = generateWeeklyInbox(
          updatedMyClub,
          updatedClubs,
          upcomingFixture,
          newInjuryDetails,
          prev.licenseMode,
          prev.currentWeek + 1,
          {
            opponentName: oppName,
            myGoals,
            oppGoals,
          }
        );

        const injuredIdSet = new Set(
          updatedMyClub.players.filter((p) => p.injuredWeeks > 0).map((p) => p.id)
        );

        // Capture memorable matches for the Album
        let newMemory: MatchMemory | null = null;
        if (won && derbyLabel) {
          newMemory = {
            id: `mem_${prev.currentWeek}`,
            week: prev.currentWeek,
            title: `${derbyLabel} Zaferi`,
            opponentName: `${myClubName} vs ${oppName}`,
            score: `${snap.homeGoals}-${snap.awayGoals}`,
            highlight: `${derbyLabel} mücadelesinden unutulmaz 3 puan!`,
            tag: 'DERBY',
          };
        } else if (myGoals >= 4) {
          newMemory = {
            id: `mem_${prev.currentWeek}`,
            week: prev.currentWeek,
            title: 'Gol Yağmuru Gecesi',
            opponentName: `${myClubName} vs ${oppName}`,
            score: `${snap.homeGoals}-${snap.awayGoals}`,
            highlight: `Rakip filelere tam ${myGoals} gol gönderilen tarihi hücum performansı.`,
            tag: 'GOAL_FEST',
          };
        } else if (won && oppClubObj && oppClubObj.reputation >= myClub.reputation + 6) {
          newMemory = {
            id: `mem_${prev.currentWeek}`,
            week: prev.currentWeek,
            title: 'Dev Sürpriz Galibiyeti',
            opponentName: `${myClubName} vs ${oppName}`,
            score: `${snap.homeGoals}-${snap.awayGoals}`,
            highlight: `Güçlü rakip ${oppName} taktik disiplinle mağlup edildi.`,
            tag: 'UPSET',
          };
        } else if (prev.manager.matchesManaged === 0) {
          newMemory = {
            id: `mem_${prev.currentWeek}`,
            week: prev.currentWeek,
            title: 'İlk Resmi Sınav',
            opponentName: `${myClubName} vs ${oppName}`,
            score: `${snap.homeGoals}-${snap.awayGoals}`,
            highlight: `${myClubName} başındaki ilk resmi lig karşılaşması.`,
            tag: 'DEBUT',
          };
        } else if (won && oppGoals === 0) {
          newMemory = {
            id: `mem_${prev.currentWeek}`,
            week: prev.currentWeek,
            title: 'Beton Duvar Savunma',
            opponentName: `${myClubName} vs ${oppName}`,
            score: `${snap.homeGoals}-${snap.awayGoals}`,
            highlight: `Kalenin gole kapatıldığı net 3 puan.`,
            tag: 'CLEAN_SHEET',
          };
        }

        const nextStats: CareerStats = {
          ...prev.stats,
          cleanSheets: prev.stats.cleanSheets + (oppGoals === 0 ? 1 : 0),
          derbyWins: prev.stats.derbyWins + (won && derbyLabel ? 1 : 0),
          fourGoalGames: prev.stats.fourGoalGames + (myGoals >= 4 ? 1 : 0),
          winStreak: won ? prev.stats.winStreak + 1 : 0,
          youthOvrGains: prev.stats.youthOvrGains + youthGainedNow,
        };
        const nextWins = prev.manager.wins + (won ? 1 : 0);
        const ach = runAchievementCheck(prev, {
          stats: nextStats,
          wins: nextWins,
          boardConfidence: updatedMyClub.boardConfidence,
          week: prev.currentWeek,
        });
        if (ach.newlyUnlocked.length > 0) {
          newlyUnlockedBanner = ach.newlyUnlocked[0].title;
        }

        const nextWorldLeagues = simulateWorldLeaguesWeek(
          prev.worldLeagues,
          prev.activeLeagues,
          prev.leagueId,
          updatedClubs,
          updatedFixtures,
          prev.currentWeek
        );

        return {
          ...prev,
          clubs: updatedClubs,
          fixtures: updatedFixtures,
          worldLeagues: nextWorldLeagues,
          myTactics: {
            ...prev.myTactics,
            benchPlayerIds: prev.myTactics.benchPlayerIds.filter((id) => !injuredIdSet.has(id)),
          },
          financeRecords: newFinances.slice(0, 40),
          currentWeek: prev.currentWeek + 1,
          manager: {
            ...prev.manager,
            matchesManaged: prev.manager.matchesManaged + 1,
            wins: nextWins,
            reputation: Math.max(30, Math.min(99, prev.manager.reputation + (won ? 2 : drew ? 0 : -1))),
          },
          inbox: [...weeklyInbox, ...prev.inbox].slice(0, 45),
          memories: newMemory ? [newMemory, ...prev.memories].slice(0, 30) : prev.memories,
          stats: nextStats,
          achievements: ach.achievements,
          news: [
            {
              id: `news_match_${prev.currentWeek}`,
              week: prev.currentWeek,
              title: `${myClubName} ${snap.homeGoals}-${snap.awayGoals} ${oppName}`,
              body: won
                ? 'Kritik 3 puan sonrası yönetim ve taraftarlar teknik heyeti alkışladı.'
                : drew
                ? 'Mücadeleci karşılaşma puanların paylaşılmasıyla sonuçlandı.'
                : 'Zorlu haftada puan kaybı yaşandı. Yönetim taktiksel reaksiyon bekliyor.',
              category: 'MATCH' as const,
            },
            ...prev.news,
          ].slice(0, 20),
        };
      });

      if (newlyUnlockedBanner) {
        showToast(`Yeni Başarım Açıldı: ${newlyUnlockedBanner}!`);
      }
      setScreen('MATCH_RESULT');
    },
    [nextFixture, myClub, career.myTactics.slots, showToast]
  );

  // Full-bleed standalone screens
  if (screen === 'SPLASH') {
    return <SplashScreen onDone={() => setScreen('MAIN_MENU')} />;
  }

  if (screen === 'MAIN_MENU') {
    const hasActiveCareer = Boolean(
      career.myClubId || career.unemployed || career.currentWeek > 1 || career.financeRecords.length > 0
    );
    return (
      <MainMenuScreen
        hasCareer={hasActiveCareer}
        activeClubName={myClub ? getClubDisplayName(myClub, career.licenseMode) : null}
        unemployed={career.unemployed}
        manager={career.manager}
        managerConfigured={career.managerConfigured}
        licenseMode={career.licenseMode}
        language={career.settings.language}
        muted={career.settings.muted}
        menuMusicEnabled={career.settings.menuMusicEnabled}
        onToggleMute={() =>
          setCareer((p) => ({ ...p, settings: { ...p.settings, muted: !p.settings.muted } }))
        }
        onToggleMenuMusic={() =>
          setCareer((p) => ({
            ...p,
            settings: { ...p.settings, menuMusicEnabled: !p.settings.menuMusicEnabled },
          }))
        }
        onStartCareer={() => {
          soundEngine.playClick();
          setMenuContext(false);
          setScreen(career.myClubId || career.unemployed ? 'DASHBOARD' : 'CLUB_SELECT');
        }}
        onOpenManagerSetup={() => {
          soundEngine.playClick();
          setMenuContext(false);
          setScreen('MANAGER_SETUP');
        }}
        onSelectClub={() => {
          soundEngine.playClick();
          setMenuContext(false);
          setScreen('CLUB_SELECT');
        }}
        onOpenSaveSlots={() => {
          soundEngine.playClick();
          setSaveSlots(listSaveSlots());
          setMenuContext(true);
          setScreen('SAVE_SLOTS');
        }}
        onOpenGuide={() => {
          soundEngine.playClick();
          setMenuContext(true);
          setScreen('GUIDE');
        }}
        onOpenLicense={() => {
          soundEngine.playClick();
          setMenuContext(true);
          setScreen('LICENSE');
        }}
        onOpenSettings={() => {
          soundEngine.playClick();
          setMenuContext(true);
          setScreen('SETTINGS');
        }}
      />
    );
  }

  if (screen === 'MANAGER_SETUP') {
    return (
      <ManagerSetupScreen
        initialManager={career.manager}
        leagueId={career.leagueId}
        activeLeagues={career.activeLeagues}
        licenseMode={career.licenseMode}
        language={career.settings.language}
        onSwitchLeague={handleSwitchLeague}
        onToggleActiveLeague={handleToggleActiveLeague}
        onActivateLicense={(mode) =>
          setCareer((p) => {
            const ach = runAchievementCheck(p, { licenseFull: mode === 'FULL_LICENSE' });
            return { ...p, licenseMode: mode, achievements: ach.achievements };
          })
        }
        onCompleteSetup={(profile, startMode) => {
          setCareer((prev) => ({
            ...prev,
            manager: profile,
            managerConfigured: true,
          }));
          if (startMode === 'UNEMPLOYED') {
            handleStartUnemployed();
          } else {
            setScreen('CLUB_SELECT');
          }
        }}
        onBack={() => setScreen('MAIN_MENU')}
      />
    );
  }

  if (screen === 'CLUB_SELECT') {
    return (
      <ClubSelectScreen
        clubs={career.clubs}
        leagueId={career.leagueId}
        activeLeagues={career.activeLeagues}
        activeClubId={career.myClubId}
        manager={career.manager}
        licenseMode={career.licenseMode}
        language={career.settings.language}
        onSwitchLeague={handleSwitchLeague}
        onSelectClub={(cid) => handleSelectClub(cid)}
        onStartUnemployed={handleStartUnemployed}
        onBack={() => setScreen('MAIN_MENU')}
      />
    );
  }

  if (menuContext && (screen === 'SAVE_SLOTS' || screen === 'GUIDE')) {
    return (
      <div className="min-h-screen bg-[#080d11] text-slate-100 p-6 sm:p-10">
        {toastMsg && (
          <div className="max-w-4xl mx-auto mb-4 p-3 rounded-xl bg-[#0a1128] border border-[#b7ff4a]/60 text-xs text-[#b7ff4a] font-medium">
            {toastMsg}
          </div>
        )}
        {screen === 'SAVE_SLOTS' ? (
          <SaveSlotsScreen
            slots={saveSlots}
            canSaveActiveCareer={Boolean(career.myClubId || career.unemployed || career.managerConfigured)}
            language={career.settings.language}
            onSaveToSlot={handleSaveToSlot}
            onLoadFromSlot={handleLoadFromSlot}
            onDeleteSlot={handleDeleteSlot}
            footer={<SaveBackupPanel language={career.settings.language} onImport={handleImportBackup} />}
            onBack={() => {
              setMenuContext(false);
              setScreen('MAIN_MENU');
            }}
          />
        ) : (
          <GuideScreen
            language={career.settings.language}
            onBack={() => {
              setMenuContext(false);
              setScreen('MAIN_MENU');
            }}
          />
        )}
      </div>
    );
  }

  if (screen === 'MATCHDAY' && nextFixture && myClub) {
    const homeClub = career.clubs.find((c) => c.id === nextFixture.homeClubId)!;
    const awayClub = career.clubs.find((c) => c.id === nextFixture.awayClubId)!;
    const oppClub = homeClub.id === myClub.id ? awayClub : homeClub;
    const oppTactics: TacticsConfig = {
      formation: oppClub.preferredFormation,
      tacticalStyle: 'GEGENPRESS',
      mentality: 'BALANCED',
      pressing: 'HIGH',
      tempo: 'FAST',
      defensiveLine: 58,
      slots: buildTacticsForClub(oppClub),
      benchPlayerIds: [],
    };
    const isHome = homeClub.id === myClub.id;

    return (
      <MatchdayScreen
        matchSeed={`${career.currentWeek}:${homeClub.id}:${awayClub.id}`}
        homeClub={homeClub}
        awayClub={awayClub}
        myClubId={myClub.id}
        manager={career.manager}
        homeTactics={isHome ? career.myTactics : oppTactics}
        awayTactics={isHome ? oppTactics : career.myTactics}
        licenseMode={career.licenseMode}
        language={career.settings.language}
        defaultCamera={career.settings.defaultCamera}
        defaultViewMode={career.settings.matchViewMode}
        crowdDensity={career.settings.crowdDensity}
        showPlayerNamesIn3D={career.settings.showPlayerNamesIn3D}
        muted={career.settings.muted}
        onToggleMute={() =>
          setCareer((p) => ({ ...p, settings: { ...p.settings, muted: !p.settings.muted } }))
        }
        onUpdateMyTactics={(t) => setCareer((p) => ({ ...p, myTactics: t }))}
        onApplyTeamTalkMorale={(delta) => {
          setCareer((prev) => ({
            ...prev,
            clubs: prev.clubs.map((c) =>
              c.id === prev.myClubId
                ? {
                    ...c,
                    players: c.players.map((pl) => ({
                      ...pl,
                      morale: Math.max(20, Math.min(100, pl.morale + delta)),
                    })),
                  }
                : c
            ),
          }));
        }}
        onMatchCompleted={handleMatchCompleted}
      />
    );
  }

  type NavGroupItem = {
    id: AppScreen;
    labelTr: string;
    labelEn: string;
    icon: React.ReactNode;
    requiresClub?: boolean;
    badge?: number;
  };

  const navGroups: Array<{ titleTr: string; titleEn: string; items: NavGroupItem[] }> = [
    {
      titleTr: 'Genel',
      titleEn: 'General',
      items: [
        {
          id: 'DASHBOARD',
          labelTr: myClub ? 'Genel Bakış' : 'Kariyer Merkezi',
          labelEn: myClub ? 'Dashboard' : 'Hub',
          icon: <LayoutGrid className="w-4 h-4" />,
        },
        {
          id: 'INBOX',
          labelTr: 'Gelen Kutusu',
          labelEn: 'Inbox',
          icon: <Mail className="w-4 h-4" />,
          badge: unreadInboxCount > 0 ? unreadInboxCount : undefined,
        },
        {
          id: 'STANDINGS',
          labelTr: 'Puan Durumu',
          labelEn: 'Standings',
          icon: <Trophy className="w-4 h-4" />,
        },
        {
          id: 'JOB_MARKET',
          labelTr: 'İş Piyasası',
          labelEn: 'Job Market',
          icon: <Briefcase className="w-4 h-4" />,
        },
      ],
    },
    {
      titleTr: 'Takım & Saha',
      titleEn: 'Squad & Pitch',
      items: [
        { id: 'SQUAD', labelTr: 'Kadro', labelEn: 'Squad', icon: <Users className="w-4 h-4" />, requiresClub: true },
        { id: 'TACTICS', labelTr: '3D/2D Taktik', labelEn: '3D/2D Tactics', icon: <Compass className="w-4 h-4" />, requiresClub: true },
        { id: 'TRAINING', labelTr: 'Antrenman', labelEn: 'Training', icon: <Dumbbell className="w-4 h-4" />, requiresClub: true },
        { id: 'DEVELOPMENT', labelTr: 'Gelişim Merkezi', labelEn: 'Development', icon: <GraduationCap className="w-4 h-4" />, requiresClub: true },
        { id: 'MEDICAL', labelTr: 'Sağlık Merkezi', labelEn: 'Medical', icon: <HeartPulse className="w-4 h-4" />, requiresClub: true },
        { id: 'TEAM_REPORT', labelTr: 'Takım Raporu', labelEn: 'Team Report', icon: <Activity className="w-4 h-4" />, requiresClub: true },
      ],
    },
    {
      titleTr: 'Transfer & Ekip',
      titleEn: 'Recruitment',
      items: [
        { id: 'TRANSFERS', labelTr: 'Transfer', labelEn: 'Transfers', icon: <ArrowLeftRight className="w-4 h-4" />, requiresClub: true },
        { id: 'SCOUTING', labelTr: 'Oyuncu Arama & Gözlemci', labelEn: 'Scouting', icon: <Binoculars className="w-4 h-4" /> },
        {
          id: 'SHORTLIST',
          labelTr: 'Takip Listesi',
          labelEn: 'Shortlist',
          icon: <Star className="w-4 h-4" />,
          badge: career.shortlistIds.length > 0 ? career.shortlistIds.length : undefined,
        },
        { id: 'STAFF', labelTr: 'Kulüp Çalışanları', labelEn: 'Staff', icon: <UserCheck className="w-4 h-4" />, requiresClub: true },
        { id: 'FINANCE', labelTr: 'Finans', labelEn: 'Finance', icon: <Wallet className="w-4 h-4" />, requiresClub: true },
      ],
    },
    {
      titleTr: 'Arşiv & Sistem',
      titleEn: 'Career & System',
      items: [
        { id: 'ALBUM_ACHIEVEMENTS', labelTr: 'Albüm & Başarımlar', labelEn: 'Album & Trophies', icon: <Award className="w-4 h-4" /> },
        { id: 'SAVE_SLOTS', labelTr: 'Kayıt Yuvaları', labelEn: 'Save Slots', icon: <HardDrive className="w-4 h-4" /> },
        { id: 'GUIDE', labelTr: 'Kılavuz', labelEn: 'Guide', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'LICENSE', labelTr: 'Lisans', labelEn: 'License', icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'SETTINGS', labelTr: 'Ayarlar', labelEn: 'Settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  const managerFullName = `${career.manager.firstName || 'Menajer'} ${career.manager.lastName || ''}`.trim();

  const effectiveStandingsLeague =
    inspectedStandingsLeague && career.activeLeagues.includes(inspectedStandingsLeague)
      ? inspectedStandingsLeague
      : career.leagueId;
  const inspectedStandingsData =
    effectiveStandingsLeague === career.leagueId
      ? { clubs: career.clubs, fixtures: career.fixtures }
      : career.worldLeagues[effectiveStandingsLeague] ?? {
          clubs: career.clubs,
          fixtures: career.fixtures,
        };
  const inspectedStandingsRows =
    effectiveStandingsLeague === career.leagueId
      ? standings
      : computeStandings(inspectedStandingsData.clubs, inspectedStandingsData.fixtures);

  const effectiveJobLeague =
    inspectedJobLeague && career.activeLeagues.includes(inspectedJobLeague)
      ? inspectedJobLeague
      : career.leagueId;
  const inspectedJobData =
    effectiveJobLeague === career.leagueId
      ? { clubs: career.clubs, fixtures: career.fixtures }
      : career.worldLeagues[effectiveJobLeague] ?? {
          clubs: career.clubs,
          fixtures: career.fixtures,
        };
  const inspectedJobStandings =
    effectiveJobLeague === career.leagueId
      ? standings
      : computeStandings(inspectedJobData.clubs, inspectedJobData.fixtures);

  return (
    <div className="min-h-screen bg-[#080d11] text-slate-100 flex flex-col lg:flex-row overflow-x-hidden">
      {/* Navigation Sidebar */}
      <aside className="w-full lg:w-64 lg:h-screen lg:sticky lg:top-0 shrink-0 bg-[#111b21] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-between">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMenuContext(false);
                setScreen('MAIN_MENU');
              }}
              className="flex items-center gap-2.5 text-left cursor-pointer"
            >
              <ZephyrManagerShieldSvg size={32} showWordmark={false} />
              <div>
                <div className="font-display font-bold text-sm tracking-wider text-white">ZEPHYR 27</div>
                <div className="text-[11px] text-[#00e5ff]">
                  {career.licenseMode === 'FULL_LICENSE' ? 'Full Lisans' : 'No Data'} ·{' '}
                  {getLeagueMeta(career.leagueId).shortName}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuContext(false);
                setScreen('MAIN_MENU');
              }}
              aria-label="Ana Menü"
              className="p-2 rounded-lg bg-[#080d11] text-slate-300 hover:text-white cursor-pointer"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-2 flex-1 min-h-0 flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-y-auto">
            {navGroups.map((grp) => (
              <div key={grp.titleTr} className="flex lg:flex-col gap-0.5 lg:mb-1.5 shrink-0">
                <div className="hidden lg:block px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {tr ? grp.titleTr : grp.titleEn}
                </div>
                {grp.items.map((item) => {
                  const active = screen === item.id;
                  const disabled = Boolean(item.requiresClub && !myClub);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        soundEngine.playClick();
                        setMenuContext(false);
                        if (item.id === 'SAVE_SLOTS') setSaveSlots(listSaveSlots());
                        setScreen(item.id);
                      }}
                      className={`flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                        active
                          ? 'bg-[#b7ff4a] text-[#080d11] font-bold'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        {item.icon}
                        <span>{tr ? item.labelTr : item.labelEn}</span>
                      </span>
                      {item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono-num text-[10px] font-bold ${
                            active ? 'bg-[#080d11] text-[#b7ff4a]' : 'bg-[#b7ff4a] text-[#080d11]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="hidden lg:block shrink-0 p-3 border-t border-white/10 text-xs space-y-2">
          {myClub ? (
            <div className="flex items-center gap-2.5">
              <ClubCrest club={myClub} licenseMode={career.licenseMode} size={32} />
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">
                  {getClubDisplayName(myClub, career.licenseMode)}
                </div>
                <div className="font-mono-num text-[#b7ff4a]">{formatMoney(myClub.transferBudget)}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <ManagerPortraitSvg
                appearance={career.manager.appearance}
                photoUrl={career.manager.customPhotoDataUrl}
                size={34}
              />
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">{managerFullName}</div>
                <div className="text-[11px] text-[#00e5ff]">
                  {career.unemployed ? (tr ? 'Kulüpsüz' : 'Unemployed') : tr ? 'Kulüp Seçilmedi' : 'No Club'}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleQuickSave}
              className="py-1.5 px-2 rounded bg-[#b7ff4a]/15 border border-[#b7ff4a]/40 text-[#b7ff4a] hover:bg-[#b7ff4a] hover:text-[#080d11] text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Save className="w-3 h-3" />
              <span>{tr ? 'Oyunu Kaydet' : 'Save'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowExitModal(true)}
              className="py-1.5 px-2 rounded bg-red-500/10 border border-red-500/35 text-red-300 hover:bg-red-500 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span>{tr ? 'Oyundan Çık' : 'Exit'}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setScreen('CLUB_SELECT')}
              className="py-1.5 rounded bg-[#080d11] border border-white/10 text-slate-300 hover:text-white text-[11px] cursor-pointer"
            >
              {tr ? 'Kulüp Değiştir' : 'Clubs'}
            </button>
            <button
              type="button"
              onClick={() => setScreen('MANAGER_SETUP')}
              className="py-1.5 rounded bg-[#080d11] border border-white/10 text-slate-300 hover:text-white text-[11px] cursor-pointer"
            >
              {tr ? 'Menajer' : 'Manager'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#080d11] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {myClub ? (
              <>
                <ClubCrest club={myClub} licenseMode={career.licenseMode} size={30} />
                <span className="font-display font-bold text-sm sm:text-base text-white truncate">
                  {getClubDisplayName(myClub, career.licenseMode)}
                </span>
              </>
            ) : (
              <>
                <ManagerPortraitSvg
                  appearance={career.manager.appearance}
                  photoUrl={career.manager.customPhotoDataUrl}
                  size={30}
                />
                <span className="font-display font-bold text-sm sm:text-base text-white truncate">
                  {managerFullName} ({career.unemployed ? (tr ? 'Kulüpsüz' : 'Free Agent') : tr ? 'Hazır' : 'Ready'})
                </span>
              </>
            )}
            <span className="text-slate-500">·</span>
            <span className="text-xs text-emerald-300 font-mono-num shrink-0 font-semibold">
              {formatSeasonLabel(career.seasonNumber ?? 1)} ({career.seasonNumber ?? 1}/{MAX_CAREER_SEASONS})
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300 font-mono-num shrink-0">
              {tr
                ? `Hafta ${Math.min(totalWeeks, career.currentWeek)}/${totalWeeks}`
                : `Week ${Math.min(totalWeeks, career.currentWeek)}/${totalWeeks}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setLastHolidayReport(null);
                setHolidayModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1.5 font-bold text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
            >
              <Palmtree className="w-3.5 h-3.5" />
              <span>{tr ? 'Tatile Git' : 'Go On Holiday'}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenTurkishPress}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1.5 font-bold text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition-colors cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tr ? 'Basın' : 'Press'}</span>
            </button>
            <button
              type="button"
              onClick={() => setTutorialOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#b7ff4a]/40 bg-[#b7ff4a]/10 px-2.5 py-1.5 font-bold text-[#b7ff4a] hover:bg-[#b7ff4a] hover:text-slate-950 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tr ? 'Öğretici' : 'Tutorial'}</span>
            </button>
            {myClub && (
              <div className="hidden sm:flex items-center gap-2 text-slate-300 mr-1">
                <BarChart3 className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span className="font-mono-num">
                  {tr ? 'Bütçe:' : 'Budget:'}{' '}
                  <strong className="text-[#b7ff4a]">{formatMoney(myClub.transferBudget)}</strong>
                </span>
              </div>
            )}
            <PWAInstallButton
              language={career.settings.language}
              compact
              onOpenMobileGuide={() => setScreen('GUIDE')}
            />
            <button
              type="button"
              onClick={handleQuickSave}
              className="lg:hidden px-2.5 py-1.5 rounded-lg bg-[#111b21] border border-[#b7ff4a]/40 text-[#b7ff4a] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{tr ? 'Kaydet' : 'Save'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowExitModal(true)}
              className="lg:hidden px-2.5 py-1.5 rounded-lg bg-[#111b21] border border-red-500/40 text-red-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{tr ? 'Çıkış' : 'Exit'}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setCareer((p) => ({ ...p, settings: { ...p.settings, muted: !p.settings.muted } }))
              }
              aria-label={career.settings.muted ? 'Sesi Aç' : 'Sesi Kapat'}
              className="p-2 rounded-lg bg-[#111b21] border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              {career.settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {toastMsg && (
          <div className="mx-5 sm:mx-8 mt-4 p-3 rounded-xl bg-[#0a1128] border border-[#b7ff4a]/60 text-xs text-[#b7ff4a] font-medium flex items-center justify-between gap-3">
            <span>{toastMsg}</span>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-slate-400 hover:text-white cursor-pointer text-[11px]"
            >
              {tr ? 'Kapat' : 'Dismiss'}
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {screen === 'DASHBOARD' && (
            <DashboardScreen
              club={myClub}
              clubs={career.clubs}
              leagueId={career.leagueId}
              manager={career.manager}
              tactics={career.myTactics}
              nextFixture={nextFixture}
              standings={standings}
              news={career.news}
              unreadInboxCount={unreadInboxCount}
              latestInbox={career.inbox[0]}
              currentWeek={career.currentWeek}
              totalWeeks={totalWeeks}
              pressAnsweredThisWeek={career.pressAnsweredWeek === career.currentWeek}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              onGoTactics={() => setScreen('TACTICS')}
              onPlayMatch={() => setScreen('MATCHDAY')}
              onGoSquad={() => setScreen('SQUAD')}
              onGoTransfers={() => setScreen('TRANSFERS')}
              onGoFinance={() => setScreen('FINANCE')}
              onGoInbox={() => setScreen('INBOX')}
              onNavigateScreen={(target) => {
                if (target === 'SAVE_SLOTS') setSaveSlots(listSaveSlots());
                setScreen(target);
              }}
              onAcceptJob={handleSelectClub}
              onResignClub={handleResignCurrentClub}
              onAdvanceUnemployedWeek={handleAdvanceUnemployedWeek}
              onAnswerPress={handleAnswerPress}
            />
          )}

          {screen === 'INBOX' && (
            <InboxScreen
              messages={career.inbox}
              language={career.settings.language}
              onMarkRead={(id) =>
                setCareer((prev) => ({
                  ...prev,
                  inbox: prev.inbox.map((m) => (m.id === id ? { ...m, read: true } : m)),
                }))
              }
              onMarkAllRead={() =>
                setCareer((prev) => ({
                  ...prev,
                  inbox: prev.inbox.map((m) => ({ ...m, read: true })),
                }))
              }
              onToggleStar={(id) =>
                setCareer((prev) => ({
                  ...prev,
                  inbox: prev.inbox.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)),
                }))
              }
              onDeleteMessage={(id) =>
                setCareer((prev) => ({
                  ...prev,
                  inbox: prev.inbox.filter((m) => m.id !== id),
                }))
              }
              onResolveDecision={handleResolveInboxDecision}
              onNavigate={(target) => {
                if (
                  !myClub &&
                  (target === 'TACTICS' ||
                    target === 'TRANSFERS' ||
                    target === 'FINANCE' ||
                    target === 'SQUAD' ||
                    target === 'TRAINING' ||
                    target === 'MEDICAL')
                ) {
                  setScreen('JOB_MARKET');
                  return;
                }
                setScreen(target);
              }}
            />
          )}

          {screen === 'SQUAD' && myClub && (
            <SquadScreen
              club={myClub}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              recoveryUsedThisWeek={career.recoveryUsedWeek === career.currentWeek}
              onUpdateTraining={handleUpdatePlayerFocus}
              onTeamRecoverySession={() => {
                setCareer((prev) => ({
                  ...prev,
                  recoveryUsedWeek: prev.currentWeek,
                  clubs: prev.clubs.map((c) =>
                    c.id === prev.myClubId
                      ? {
                          ...c,
                          players: c.players.map((p) => ({
                            ...p,
                            condition: Math.min(100, p.condition + 6),
                            morale: Math.min(100, p.morale + 4),
                          })),
                        }
                      : c
                  ),
                }));
              }}
            />
          )}

          {screen === 'TACTICS' && myClub && (
            <TacticsScreen
              club={myClub}
              tactics={career.myTactics}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              defaultViewMode={career.settings.tacticsViewMode}
              hasNextMatch={Boolean(nextFixture)}
              onChangeTactics={(next) => setCareer((p) => ({ ...p, myTactics: next }))}
              onAutoPick={() =>
                setCareer((p) => {
                  const slots = buildTacticsForClub(myClub, p.myTactics.formation);
                  return {
                    ...p,
                    myTactics: {
                      ...p.myTactics,
                      slots,
                      benchPlayerIds: buildDefaultBenchForClub(myClub, slots),
                    },
                  };
                })
              }
              onLaunchMatch={() => setScreen('MATCHDAY')}
            />
          )}

          {screen === 'TRAINING' && myClub && (
            <TrainingScreen
              club={myClub}
              plan={career.trainingPlan}
              staff={career.staff}
              currentWeek={career.currentWeek}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              onUpdatePlan={(nextPlan) => setCareer((p) => ({ ...p, trainingPlan: nextPlan }))}
              onUpdatePlayerFocus={handleUpdatePlayerFocus}
              onApplyWeeklyTraining={handleApplyWeeklyTraining}
            />
          )}

          {screen === 'DEVELOPMENT' && myClub && (
            <DevelopmentCenterScreen
              club={myClub}
              youthDirectorRating={youthDirRating}
              mentoringPairs={career.mentoringPairs}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              onAddMentoringPair={(mentorId, menteeId) => {
                setCareer((prev) => ({
                  ...prev,
                  mentoringPairs: [
                    ...prev.mentoringPairs.filter((m) => m.menteeId !== menteeId),
                    { mentorId, menteeId },
                  ],
                }));
              }}
              onRemoveMentoringPair={(menteeId) => {
                setCareer((prev) => ({
                  ...prev,
                  mentoringPairs: prev.mentoringPairs.filter((m) => m.menteeId !== menteeId),
                }));
              }}
            />
          )}

          {screen === 'MEDICAL' && myClub && (
            <MedicalCenterScreen
              club={myClub}
              physioRating={physioRating}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              onMedicalIntervention={handleMedicalIntervention}
            />
          )}

          {screen === 'TEAM_REPORT' && myClub && (
            <TeamReportScreen
              club={myClub}
              clubs={career.clubs}
              language={career.settings.language}
              onGoTransfers={() => setScreen('TRANSFERS')}
            />
          )}

          {screen === 'STAFF' && myClub && (
            <StaffScreen
              club={myClub}
              staff={career.staff}
              staffMarket={career.staffMarket}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              onHireStaff={handleHireStaff}
            />
          )}

          {screen === 'SCOUTING' && (
            <ScoutingScreen
              clubs={career.clubs}
              myClubId={career.myClubId}
              activeLeagueId={career.leagueId}
              scoutReports={career.scoutReports}
              shortlistIds={career.shortlistIds}
              chiefScoutRating={chiefScoutRating}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              onToggleShortlist={handleToggleShortlist}
              onScoutPlayer={handleScoutPlayer}
              onGoTransfersWithQuery={() => setScreen(myClub ? 'TRANSFERS' : 'JOB_MARKET')}
            />
          )}

          {screen === 'SHORTLIST' && (
            <ShortlistScreen
              clubs={career.clubs}
              activeLeagueId={career.leagueId}
              shortlistIds={career.shortlistIds}
              scoutReports={career.scoutReports}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              onToggleShortlist={handleToggleShortlist}
              onScoutPlayer={handleScoutPlayer}
              onGoScouting={() => setScreen('SCOUTING')}
              onGoTransfers={() => setScreen(myClub ? 'TRANSFERS' : 'JOB_MARKET')}
            />
          )}

          {screen === 'JOB_MARKET' && (
            <JobMarketScreen
              clubs={inspectedJobData.clubs}
              myClub={myClub}
              myClubId={career.myClubId}
              leagueId={effectiveJobLeague}
              activeLeagues={career.activeLeagues}
              onSwitchLeague={(lid) => setInspectedJobLeague(lid)}
              standings={inspectedJobStandings}
              manager={career.manager}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              onApplyForClub={(cid, targetLid) => handleSelectClub(cid, targetLid)}
              onResignCurrentClub={handleResignCurrentClub}
            />
          )}

          {screen === 'MATCH_RESULT' && lastMatchSummary && myClub && (
            <MatchResultScreen
              fixture={lastMatchSummary.fixture}
              homeClub={career.clubs.find((c) => c.id === lastMatchSummary.fixture.homeClubId)!}
              awayClub={career.clubs.find((c) => c.id === lastMatchSummary.fixture.awayClubId)!}
              myClubId={myClub.id}
              manager={career.manager}
              gateRevenue={lastMatchSummary.gateRevenue}
              newInjuries={lastMatchSummary.newInjuries}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              onApplyPostMatchTalk={(res) => {
                setCareer((prev) => ({
                  ...prev,
                  clubs: prev.clubs.map((c) =>
                    c.id === prev.myClubId
                      ? {
                          ...c,
                          players: c.players.map((pl) => ({
                            ...pl,
                            morale: Math.max(20, Math.min(100, pl.morale + res.moraleDelta)),
                          })),
                        }
                      : c
                  ),
                }));
              }}
              onContinue={() => setScreen('STANDINGS')}
            />
          )}

          {screen === 'STANDINGS' && (
            <StandingsScreen
              clubs={inspectedStandingsData.clubs}
              leagueId={effectiveStandingsLeague}
              activeLeagues={career.activeLeagues}
              onSelectInspectedLeague={(lid) => setInspectedStandingsLeague(lid)}
              fixtures={inspectedStandingsData.fixtures}
              currentWeek={career.currentWeek}
              standings={inspectedStandingsRows}
              myClubId={career.myClubId}
              licenseMode={career.licenseMode}
              language={career.settings.language}
            />
          )}

          {screen === 'TRANSFERS' && myClub && (
            <TransfersScreen
              myClub={myClub}
              clubs={career.clubs}
              leagueId={career.leagueId}
              marketPool={career.marketPool}
              shortlistIds={career.shortlistIds}
              managerPersonality={career.manager.personality}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              onToggleShortlist={handleToggleShortlist}
              onScoutPlayer={handleScoutPlayer}
              onCompleteSigning={(listing, fee, weeklyWage) => {
                let unlockedAch: string | null = null;
                setCareer((prev) => {
                  const newPlayer: Player = {
                    ...listing.player,
                    weeklyWage,
                    condition: 94,
                    isOnLoan: listing.listingType === 'LOAN',
                    loanFromClubId: listing.listingType === 'LOAN' ? listing.clubId : null,
                  };
                  const pName = getPlayerDisplayName(listing.player, prev.licenseMode);
                  const categoryLabel =
                    listing.listingType === 'FREE_AGENT'
                      ? 'Serbest İmza'
                      : listing.listingType === 'LOAN'
                      ? 'Kiralama Bedeli'
                      : 'Bonservis';
                  const nextStats: CareerStats = {
                    ...prev.stats,
                    transfersSigned: prev.stats.transfersSigned + 1,
                    freeOrLoansSigned:
                      prev.stats.freeOrLoansSigned +
                      (listing.listingType === 'FREE_AGENT' || listing.listingType === 'LOAN' ? 1 : 0),
                  };
                  const ach = runAchievementCheck(prev, { stats: nextStats });
                  if (ach.newlyUnlocked.length > 0) unlockedAch = ach.newlyUnlocked[0].title;

                  return {
                    ...prev,
                    stats: nextStats,
                    achievements: ach.achievements,
                    clubs: prev.clubs.map((c) =>
                      c.id === prev.myClubId
                        ? {
                            ...c,
                            transferBudget: Math.max(0, c.transferBudget - fee),
                            cashBalance: c.cashBalance - fee,
                            players: [newPlayer, ...c.players],
                          }
                        : c
                    ),
                    marketPool: prev.marketPool.filter((m) => m.player.id !== listing.player.id),
                    financeRecords: [
                      {
                        id: `fin_tr_${Date.now()}`,
                        week: prev.currentWeek,
                        category: listing.listingType === 'LOAN' ? 'LOAN' : 'TRANSFER_IN',
                        description: `${pName} (${categoryLabel})`,
                        amount: -fee,
                      },
                      ...prev.financeRecords,
                    ],
                    inbox: [
                      {
                        id: `inbox_tr_${Date.now()}`,
                        week: prev.currentWeek,
                        sender: 'Futbol Direktörü',
                        senderRole: 'Transfer Masası',
                        subject: `İmza Tamamlandı: ${pName} (${categoryLabel})`,
                        body: `${pName} ile haftalık ${formatMoney(weeklyWage)} maaş ve ${formatMoney(fee)} bedel üzerinden sözleşme imzalandı. Oyuncuyu Taktik ekranından İlk 11 veya Yedek Kulübesine ekleyebilirsiniz.`,
                        category: 'TRANSFER' as const,
                        read: false,
                        actionLabel: 'Taktik & Kadroyu Güncelle',
                        targetScreen: 'TACTICS' as const,
                      },
                      ...prev.inbox,
                    ].slice(0, 45),
                    news: [
                      {
                        id: `news_tr_${Date.now()}`,
                        week: prev.currentWeek,
                        title: `Transfer Resmiyet Kazandı: ${pName}`,
                        body: `${getClubDisplayName(myClub, prev.licenseMode)} yeni oyuncusunu ${formatMoney(fee)} bedelle kadrosuna kattı.`,
                        category: 'TRANSFER' as const,
                      },
                      ...prev.news,
                    ].slice(0, 20),
                  };
                });
                if (unlockedAch) showToast(`Başarım Açıldı: ${unlockedAch}!`);
              }}
              onSellSquadPlayer={(playerId, mode, fee) => {
                setCareer((prev) => {
                  const club = prev.clubs.find((c) => c.id === prev.myClubId);
                  const sold = club?.players.find((p) => p.id === playerId);
                  if (!club || !sold) return prev;
                  const nextPlayers = club.players.filter((p) => p.id !== playerId);
                  const updatedClub = {
                    ...club,
                    transferBudget: club.transferBudget + Math.round(fee * 0.75),
                    cashBalance: club.cashBalance + fee,
                    players: nextPlayers,
                  };
                  const pName = getPlayerDisplayName(sold, prev.licenseMode);
                  const nextSlots = buildTacticsForClub(updatedClub, prev.myTactics.formation);
                  const nextStarterIds = new Set(nextSlots.map((s) => s.playerId).filter(Boolean));
                  const remainingBench = prev.myTactics.benchPlayerIds.filter(
                    (id) => id !== playerId && !nextStarterIds.has(id)
                  );
                  return {
                    ...prev,
                    clubs: prev.clubs.map((c) => (c.id === prev.myClubId ? updatedClub : c)),
                    myTactics: {
                      ...prev.myTactics,
                      slots: nextSlots,
                      benchPlayerIds:
                        remainingBench.length > 0
                          ? remainingBench
                          : buildDefaultBenchForClub(updatedClub, nextSlots),
                    },
                    marketPool:
                      mode === 'SELL'
                        ? [{ player: sold, clubId: null, listingType: 'FREE_AGENT' }, ...prev.marketPool]
                        : prev.marketPool,
                    financeRecords: [
                      {
                        id: `fin_out_${Date.now()}`,
                        week: prev.currentWeek,
                        category: 'TRANSFER_OUT',
                        description: `${pName} (${mode === 'SELL' ? 'Satış' : 'Kiralık Gönderim'})`,
                        amount: fee,
                      },
                      ...prev.financeRecords,
                    ],
                  };
                });
              }}
            />
          )}

          {screen === 'FINANCE' && myClub && (
            <FinanceScreen
              club={myClub}
              records={career.financeRecords}
              language={career.settings.language}
            />
          )}

          {screen === 'ALBUM_ACHIEVEMENTS' && (
            <AlbumAchievementsScreen
              memories={career.memories}
              achievements={career.achievements}
              language={career.settings.language}
            />
          )}

          {screen === 'SAVE_SLOTS' && (
            <SaveSlotsScreen
              slots={saveSlots}
              canSaveActiveCareer={Boolean(myClub || career.unemployed || career.managerConfigured)}
              language={career.settings.language}
              onSaveToSlot={handleSaveToSlot}
              onLoadFromSlot={handleLoadFromSlot}
              onDeleteSlot={handleDeleteSlot}
              footer={<SaveBackupPanel language={career.settings.language} onImport={handleImportBackup} />}
            />
          )}

          {screen === 'GUIDE' && <GuideScreen language={career.settings.language} />}

          {screen === 'LICENSE' && (
            <LicenseScreen
              activeClub={myClub}
              sampleClubs={licenseSampleClubs}
              licenseMode={career.licenseMode}
              language={career.settings.language}
              onActivateLicense={(mode) =>
                setCareer((p) => {
                  const ach = runAchievementCheck(p, { licenseFull: mode === 'FULL_LICENSE' });
                  return { ...p, licenseMode: mode, achievements: ach.achievements };
                })
              }
            />
          )}

          {screen === 'SETTINGS' && (
            <SettingsScreen
              settings={career.settings}
              onUpdateSettings={(next) => setCareer((p) => ({ ...p, settings: next }))}
            />
          )}
        </main>
      </div>

      {/* Exit Game Confirmation Modal */}
      {showExitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Oyundan Çık"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-xl bg-[#111b21] border border-white/15 p-6 space-y-4">
            <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-400" />
              <span>{tr ? 'Oyundan Çıkış' : 'Exit Game'}</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {tr
                ? `Mevcut kariyer ilerlemenizi Yuva #${career.activeSlotNumber ?? 1} üzerine kaydedip Ana Menüye dönmek ister misiniz?`
                : `Save your progress to Slot #${career.activeSlotNumber ?? 1} before returning to the Main Menu?`}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleQuickSave();
                  setShowExitModal(false);
                  setMenuContext(false);
                  setScreen('MAIN_MENU');
                }}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-xs cursor-pointer"
              >
                {tr ? 'Kaydet & Ana Menüye Dön' : 'Save & Exit to Menu'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false);
                  setMenuContext(false);
                  setScreen('MAIN_MENU');
                }}
                className="py-2.5 px-4 rounded-lg bg-red-500/15 border border-red-500/40 hover:bg-red-500 hover:text-white text-red-200 font-bold text-xs cursor-pointer"
              >
                {tr ? 'Kaydetmeden Çık' : 'Exit Without Saving'}
              </button>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="py-2.5 px-4 rounded-lg bg-[#080d11] border border-white/15 text-slate-300 hover:text-white text-xs cursor-pointer"
              >
                {tr ? 'İptal' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <HolidayModal
        open={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
        initialConfig={
          career.holidayConfig ?? {
            mode: 'DAYS',
            days: 14,
            useCurrentTactics: true,
            transferPolicy: 'REJECT_ALL',
            returnOnJobOffer: true,
          }
        }
        assistantName={getAssistantStaff(career.staff)?.name ?? 'Geçici Yardımcı Antrenör'}
        assistantTacticalKnowledge={getAssistantTacticalKnowledge(career.staff)}
        seasonLabel={formatSeasonLabel(career.seasonNumber ?? 1)}
        currentWeek={career.currentWeek}
        lastReport={lastHolidayReport}
        onStartHoliday={handleStartHoliday}
        onClearReport={() => setLastHolidayReport(null)}
      />

      <TurkishPressModal
        open={pressModalOpen}
        question={activePressQuestion}
        lastImpact={lastPressImpact}
        onAnswerPreset={(tone) => handleResolveTurkishPress('PRESET', { tone })}
        onAnswerCustom={(customText) => handleResolveTurkishPress('CUSTOM', { customText })}
        onSkip={() => handleResolveTurkishPress('SKIP', {})}
        onNextQuestion={handleOpenTurkishPress}
        onClose={() => {
          setPressModalOpen(false);
          setLastPressImpact(null);
        }}
      />

      <CareerFinaleModal
        open={finaleModalOpen}
        managerName={managerFullName}
        seasonHistory={career.seasonHistory ?? []}
        onClose={() => setFinaleModalOpen(false)}
      />

      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      <MobileBottomNav
        currentScreen={screen}
        unreadInboxCount={unreadInboxCount}
        onNavigate={(nextScreen) => setScreen(nextScreen)}
        onOpenHoliday={() => {
          setLastHolidayReport(null);
          setHolidayModalOpen(true);
        }}
        onOpenPress={handleOpenTurkishPress}
      />

      <OfflineIndicator language={career.settings.language} />
    </div>
  );
}
