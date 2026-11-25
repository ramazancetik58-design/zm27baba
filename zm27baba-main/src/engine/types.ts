export type LicenseMode = 'NO_DATA' | 'FULL_LICENSE';

export type Language = 'tr' | 'en';

export const WORLD_SEED = 202627 as const;
export const MAX_CAREER_SEASONS = 30 as const;

export type LeagueId =
  | 'SUPER_LIG'
  | 'TR_1_LIG'
  | 'TR_2_LIG_BEYAZ'
  | 'TR_2_LIG_KIRMIZI'
  | 'PREMIER_LEAGUE'
  | 'LA_LIGA'
  | 'SERIE_A'
  | 'BUNDESLIGA'
  | 'LIGUE_1'
  | 'EREDIVISIE'
  | 'LIGA_PORTUGAL'
  | 'BELGIAN_PRO_LEAGUE'
  | 'EFL_CHAMPIONSHIP';

export type EuropeanCupId = 'UCL' | 'UEL' | 'UECL';
export type CompetitionId = 'LEAGUE' | EuropeanCupId | 'UNL';
export type MatchDaySlot = 'WEEKEND' | 'TUE' | 'WED' | 'THU' | 'INTL';
export type TournamentStage =
  | 'LEAGUE_PHASE'
  | 'GROUP'
  | 'PLAYOFF'
  | 'DROP_PLAYOFF'
  | 'R16'
  | 'QF'
  | 'SF'
  | 'THIRD_PLACE'
  | 'FINAL'
  | 'PROMO_PLAYOFF';

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

export type PlayerRole =
  | 'GK'
  | 'LB'
  | 'CB'
  | 'RB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LW'
  | 'RW'
  | 'ST';

export type FormationId =
  | '4-3-3'
  | '4-2-3-1'
  | '3-5-2'
  | '5-4-1'
  | '4-4-2'
  | '4-1-4-1'
  | '4-3-2-1'
  | '3-4-3'
  | '3-4-2-1'
  | '4-4-2-DIAMOND'
  | '5-3-2'
  | '4-2-4'
  | 'CUSTOM';

export type TacticalStyleId =
  | 'VERTICAL_TIKI_TAKA'
  | 'TIKI_TAKA'
  | 'CONTROL_POSSESSION'
  | 'GEGENPRESS'
  | 'WING_PLAY'
  | 'DIRECT_LONG_BALL'
  | 'STRUCTURED_COUNTER'
  | 'FAST_COUNTER'
  | 'CATENACCIO'
  | 'LOW_BLOCK_PRESS'
  | 'CUSTOM';

export type Mentality = 'DEFENSIVE' | 'BALANCED' | 'ATTACKING' | 'ALL_OUT';
export type PressingIntensity = 'LOW' | 'MEDIUM' | 'HIGH' | 'GEGENPRESS';
export type Tempo = 'SLOW' | 'NORMAL' | 'FAST';

export type CameraAngle = 'broadcast' | 'tactical' | 'behind_goal' | 'dynamic';
export type ViewDimensionMode = '3D' | '2D';

export type KitPattern = 'SOLID' | 'STRIPES' | 'HOOPS' | 'SASH' | 'HALVES' | 'CHEVRON';

export type PlayerHairStyle = 'SHORT' | 'FADE' | 'CURLY' | 'MOHAWK' | 'PONYTAIL' | 'BALD' | 'AFRO';
export type PlayerBuild = 'SLIM' | 'ATHLETIC' | 'STOCKY';
export type FacialHair = 'NONE' | 'STUBBLE' | 'BEARD';

export interface PlayerAppearance {
  skinTone: string;
  hairStyle: PlayerHairStyle;
  hairColor: string;
  facialHair: FacialHair;
  build: PlayerBuild;
  bootColor: string;
}

export type ManagerPersonality = 'DESPOT' | 'ENCOURAGING' | 'TACTICIAN' | 'NEGOTIATOR';
export type ManagerOutfit = 'SUIT' | 'TRACKSUIT' | 'TURTLENECK';

export interface ManagerAppearance {
  skinTone: string;
  hairStyle: PlayerHairStyle;
  hairColor: string;
  facialHair: FacialHair;
  outfit: ManagerOutfit;
  glasses: boolean;
}

export interface ManagerProfile {
  firstName: string;
  lastName: string;
  nationality: string;
  age: number;
  personality: ManagerPersonality;
  appearance: ManagerAppearance;
  customPhotoDataUrl?: string | null;
  studioViewMode?: ViewDimensionMode;
  reputation: number; // 30 to 99
  trophies: number;
  matchesManaged: number;
  wins: number;
}

export type TrainingFocus =
  | 'BALANCED'
  | 'PHYSICAL'
  | 'ATTACK'
  | 'DEFENSE'
  | 'RECOVERY'
  | 'FINISHING'
  | 'PLAYMAKING';

export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  stamina: number;
  goalkeeping: number;
}

export interface Player {
  id: string;
  fictionalName: string;
  realName: string;
  age: number;
  nationality: string;
  naturalRole: PlayerRole;
  positionGroup: PositionGroup;
  ovr: number;
  potential: number;
  growthProgress: number; // 0.0 to 1.0 towards +1 OVR (hardcore slow growth!)
  condition: number; // 0 to 100
  morale: number; // 0 to 100
  sharpness: number; // 0 to 100
  injuredWeeks: number;
  injuryName: string | null;
  marketValue: number; // in EUR
  weeklyWage: number; // in EUR
  contractYears: number;
  goals: number;
  assists: number;
  yellowCards: number;
  shirtNumber: number;
  attributes: PlayerAttributes;
  trainingFocus: TrainingFocus;
  appearance: PlayerAppearance;
  nationalTeamId?: string;
  isOnLoan?: boolean;
  loanFromClubId?: string | null;
}

export interface TacticalSlot {
  slotIndex: number;
  role: PlayerRole;
  // Normalized pitch coords: x in [-1, 1] (width), z in [-1, 1] (-1 = own goal, +1 = opponent goal)
  x: number;
  z: number;
  playerId: string | null;
}

export interface SetPiecesConfig {
  penaltyTakerId: string | null;
  freeKickTakerId: string | null;
  cornerTakerLeftId: string | null;
  cornerTakerRightId: string | null;
  throwInTakerId: string | null;
  cornerRoutine: 'NEAR_POST' | 'FAR_POST' | 'SHORT_PASS' | 'MIXED';
  freeKickRoutine: 'DIRECT_SHOT' | 'CROSS_BOX' | 'SHORT_LAYOFF';
  defensiveSetPiece: 'ZONAL' | 'MAN_MARKING' | 'HYBRID';
}

export interface TacticsConfig {
  formation: FormationId;
  tacticalStyle?: TacticalStyleId;
  mentality: Mentality;
  pressing: PressingIntensity;
  tempo: Tempo;
  defensiveLine: number; // 20 to 90
  slots: TacticalSlot[]; // 11 starters
  benchPlayerIds: string[]; // Up to 9 matchday substitutes
  captainId?: string | null;
  viceCaptainId?: string | null;
  setPieces?: SetPiecesConfig;
}

export type ClubEmblemType =
  | 'STARS_4'
  | 'CANARY'
  | 'EAGLE'
  | 'STORM_T'
  | 'OWL'
  | 'GOZ'
  | 'ATATURK'
  | 'TEA_LEAF'
  | 'SUN_WAVE'
  | 'ANCHOR'
  | 'EAGLE_DOUBLE'
  | 'FALCON'
  | 'WAVE'
  | 'WINDMILL'
  | 'CHIMNEY'
  | 'STAR_GREEN'
  | 'CASTLE'
  | 'SNOW_PEAK'
  // Premier League 2026-27 emblems
  | 'CANNON'
  | 'LION_AV'
  | 'CHERRIES'
  | 'BEE'
  | 'SEAGULL'
  | 'LION_CFC'
  | 'ELEPHANT'
  | 'EAGLE_CP'
  | 'TOWER_EFC'
  | 'CROWN_FFC'
  | 'TIGER_HCA'
  | 'HORSE_ITFC'
  | 'ROSE_LUFC'
  | 'LIVERBIRD'
  | 'SHIP_MCFC'
  | 'TRIDENT_MUFC'
  | 'CASTLE_NUFC'
  | 'TREE_NFFC'
  | 'CAT_SAFC'
  | 'COCKEREL'
  // La Liga 2026-27 emblems
  | 'CROWN_RM'
  | 'STRIPE_FCB'
  | 'BEAR_ATM'
  | 'LION_ATH'
  | 'SUBMARINE_VIL'
  | 'CROWN_RBB'
  | 'CROWN_RSO'
  | 'BALL_SFC'
  | 'BAT_VAL'
  | 'CROSS_CEL'
  | 'CROWN_OSA'
  | 'SHIELD_GET'
  | 'BOLT_RAY'
  | 'CROWN_ESP'
  | 'PENNANT_ALA'
  | 'BAT_LEV'
  | 'TOWER_ELC'
  | 'CROWN_RAC'
  | 'ANCHOR_DEP'
  | 'CASTLE_MAL'
  // Serie A & Turkish Lower Leagues emblems
  | 'SERPENT_INT'
  | 'DEVIL_MIL'
  | 'ZEBRA_JUV'
  | 'WOLF_ROM'
  | 'CROWN_NAP'
  | 'LILY_FIO'
  | 'CROC_BUR'
  // Bundesliga & EFL Championship emblems
  | 'DIAMOND_BVB'
  | 'BULL_RBL'
  | 'HORSE_BMG'
  | 'HORN_KOE'
  | 'SHIP_HSV'
  | 'HAMMERS_WHU'
  | 'WOLF_WOL'
  | 'DRAGON_WRE'
  | 'SWORD_SHU'
  | 'GLOBE_BIR';

export type CrestShape = 'SHIELD' | 'CIRCLE' | 'HEX' | 'OVAL' | 'BANNER';

export interface Club {
  id: string;
  leagueId: LeagueId;
  fictionalName: string;
  realName: string;
  fictionalShort: string;
  realShort: string;
  city: string;
  stadiumFictional: string;
  stadiumReal: string;
  stadiumCapacity: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  kitPattern: KitPattern;
  emblemType: ClubEmblemType;
  crestShape: CrestShape;
  stars: number;
  foundedYear: number;
  realBadgeUrl: string;
  realKitUrl: string;
  transferBudget: number;
  wageBudgetWeekly: number;
  cashBalance: number;
  reputation: number; // 1-100
  boardExpectation: string;
  boardConfidence: number; // 0-100
  preferredFormation: FormationId;
  players: Player[];
}

export interface Fixture {
  id: string;
  week: number;
  homeClubId: string;
  awayClubId: string;
  played: boolean;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  homePossession: number;
  homeShots: number;
  awayShots: number;
  events: MatchEventLog[];
  competitionId?: CompetitionId;
  stage?: TournamentStage;
  matchday?: number;
  groupCode?: string;
  matchDaySlot?: MatchDaySlot;
  dayLabel?: string;
  leg?: 1 | 2;
  tieId?: string;
  penaltyWinnerId?: string;
}

export interface MatchEventLog {
  minute: number;
  type: 'GOAL' | 'SHOT' | 'SAVE' | 'WOODWORK' | 'INJURY' | 'YELLOW' | 'SUB' | 'KICKOFF' | 'FULLTIME';
  teamId: string;
  playerName: string;
  assistName?: string;
  detail: string;
}

export interface StandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export type SwissStandingZone =
  | 'DIRECT_R16'
  | 'PLAYOFF_SEEDED'
  | 'PLAYOFF_UNSEEDED'
  | 'ELIMINATED'
  | 'DROPPED_UEL'
  | 'DROPPED_UECL';

export interface SwissStandingRow extends StandingRow {
  pot: 1 | 2 | 3 | 4;
  zone: SwissStandingZone;
  droppedTo?: 'UEL' | 'UECL';
}

export interface KnockoutTie {
  id: string;
  cupId: CompetitionId;
  stage: TournamentStage;
  homeClubId: string;
  awayClubId: string;
  leg1FixtureId: string;
  leg2FixtureId?: string;
  winnerId?: string;
  loserId?: string;
  homeAgg?: number;
  awayAgg?: number;
  penaltiesNote?: string;
  droppedToCupId?: 'UEL' | 'UECL';
  fromHigherCup?: EuropeanCupId;
}

export type EuropeanTournamentPhase =
  | 'LEAGUE_PHASE'
  | 'PLAYOFF'
  | 'DROP_PLAYOFF'
  | 'R16'
  | 'QF'
  | 'SF'
  | 'FINAL'
  | 'COMPLETED';

export interface EuropeanTournamentState {
  id: EuropeanCupId;
  season: number;
  phase: EuropeanTournamentPhase;
  currentMatchday: number;
  participantIds: string[];
  pots: Record<string, 1 | 2 | 3 | 4>;
  droppedFromHigherIds: string[];
  fixtures: Fixture[];
  knockoutTies: KnockoutTie[];
  championClubId: string | null;
  prizeAwardedByClub: Record<string, number>;
  dropTransferProcessed?: boolean;
}

export type NationalTeamTier = 'A' | 'B' | 'C' | 'D';

export interface NationalTeam {
  id: string;
  code: string;
  fictionalName: string;
  realName: string;
  fictionalShort: string;
  realShort: string;
  tier: NationalTeamTier;
  group: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  reputation: number;
  stadiumFictional: string;
  stadiumReal: string;
  stadiumCapacity: number;
  preferredFormation: FormationId;
  players: Player[];
}

export interface NationsLeagueGroupRow {
  teamId: string;
  group: string;
  tier: NationalTeamTier;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface NationsLeagueState {
  season: number;
  phase: 'GROUPS' | 'PLAYOFFS_AND_FINALS' | 'FINAL' | 'COMPLETED';
  currentMatchday: number;
  teams: NationalTeam[];
  fixtures: Fixture[];
  promoPlayoffTies: KnockoutTie[];
  finalsTies: KnockoutTie[];
  championTeamId: string | null;
}

export interface FinanceRecord {
  id: string;
  week: number;
  category:
    | 'GATE'
    | 'WAGES'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'LOAN'
    | 'SPONSOR'
    | 'MEDICAL'
    | 'UEFA_PRIZE';
  description: string;
  amount: number; // positive = income, negative = expense
}

export type TransferListingType = 'TRANSFER' | 'FREE_AGENT' | 'LOAN';

export interface MarketListing {
  player: Player;
  clubId: string | null; // null when FREE_AGENT
  listingType: TransferListingType;
  loanFee?: number;
  wageSharePct?: number; // % of wage paid by borrowing club (40-100%)
}

export interface TransferNegotiation {
  targetPlayer: Player;
  sellingClubId: string | null;
  listingType: TransferListingType;
  round: number;
  maxRounds: number;
  askingPrice: number;
  currentOffer: number;
  offeredWage: number;
  signingBonus?: number;
  agentFeePct?: number;
  agentFeeAmount?: number;
  refusalReason?: string | null;
  status: 'OPEN' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED_WALKED';
  clubMessage: string;
}

export type TeamTalkPhase = 'PRE_MATCH' | 'HALF_TIME' | 'POST_MATCH';
export type TeamTalkTone = 'PASSIONATE' | 'AGGRESSIVE' | 'CALM' | 'TACTICAL';

export interface TeamTalkResult {
  tone: TeamTalkTone;
  moraleDelta: number;
  tacticalBoost: number; // applied to team power in 3D engine
  staminaSaveBonus: number;
  reactionText: string;
}

export interface NewsItem {
  id: string;
  week: number;
  title: string;
  body: string;
  category: 'MANAGER' | 'MATCH' | 'TRANSFER' | 'BOARD';
}

export type InboxCategory =
  | 'BOARD'
  | 'MEDICAL'
  | 'TRANSFER'
  | 'MATCH'
  | 'SCOUT'
  | 'EUROPE'
  | 'NATIONAL'
  | 'MEDIA'
  | 'HOLIDAY'
  | 'SEASON'
  | 'STAFF';

export interface InboxMessage {
  id: string;
  week: number;
  sender: string;
  senderRole: string;
  subject: string;
  body: string;
  category: InboxCategory;
  read: boolean;
  urgent?: boolean;
  starred?: boolean;
  actionLabel?: string;
  targetScreen?: AppScreen;
  metaKey?: string;
  metaValue?: string;
  decisionType?: 'BOARD_BUDGET' | 'MEDICAL_CHOICE';
  decisionDone?: boolean;
}

export type StaffRole =
  | 'ASSISTANT'
  | 'FITNESS'
  | 'GK_COACH'
  | 'CHIEF_SCOUT'
  | 'HEAD_PHYSIO'
  | 'DOCTOR'
  | 'YOUTH_DIRECTOR';

export interface StaffMember {
  id: string;
  name: string;
  fictionalName?: string;
  role: StaffRole;
  nationality: string;
  age: number;
  rating: number; // 55 - 96
  tacticalKnowledge?: number; // 0 - 100 (especially critical for ASSISTANT during matches & holiday)
  contractYears?: number;
  weeklyWage: number;
  specialty: string;
}

export type TrainingSessionType =
  | 'TACTICS_SHAPE'
  | 'ATTACKING_FINISHING'
  | 'DEFENSIVE_PRESS'
  | 'PHYSICAL_ENDURANCE'
  | 'RECOVERY_YOGA'
  | 'MATCH_PREP'
  | 'REST_DAY';

export type TrainingIntensity = 'LOW' | 'BALANCED' | 'INTENSE' | 'DOUBLE';

export interface TrainingPlan {
  intensity: TrainingIntensity;
  sessions: TrainingSessionType[]; // 6 days (Mon-Sat)
  appliedWeek: number;
}

export interface ScoutReport {
  id: string;
  playerId: string;
  playerName: string;
  clubName: string;
  leagueId: LeagueId;
  role: PlayerRole;
  age: number;
  ovr: number;
  potentialRange: string;
  grade: 'A+' | 'A' | 'B' | 'C';
  estimatedFee: number;
  estimatedWage: number;
  pros: string[];
  cons: string[];
  scoutedWeek: number;
}

export interface PressQuestionOption {
  choice: 'CONFIDENT' | 'HUMBLE' | 'PRESSURE_OPP';
  label: string;
  toneHint?: string;
}

export interface PressQuestion {
  id: string;
  journalist: string;
  outlet: string;
  question: string;
  options: PressQuestionOption[];
}

export interface MentoringPair {
  mentorId: string;
  menteeId: string;
}

export interface MatchMemory {
  id: string;
  week: number;
  title: string;
  opponentName: string;
  score: string;
  highlight: string;
  tag: 'DERBY' | 'UPSET' | 'CLEAN_SHEET' | 'GOAL_FEST' | 'DEBUT';
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: 'MATCH' | 'MANAGEMENT' | 'TRANSFER' | 'HARDCORE';
  unlocked: boolean;
  unlockedWeek?: number;
  progress: number;
  target: number;
}

export interface SaveSlotSummary {
  slot: number;
  savedAt: string;
  managerName: string;
  clubName: string;
  leagueId: LeagueId;
  week: number;
  licenseMode: LicenseMode;
}

export type AppScreen =
  | 'SPLASH'
  | 'MAIN_MENU'
  | 'MANAGER_SETUP'
  | 'CLUB_SELECT'
  | 'DASHBOARD'
  | 'INBOX'
  | 'SQUAD'
  | 'TACTICS'
  | 'TRAINING'
  | 'SCOUTING'
  | 'SHORTLIST'
  | 'STAFF'
  | 'JOB_MARKET'
  | 'DEVELOPMENT'
  | 'MEDICAL'
  | 'TEAM_REPORT'
  | 'MATCHDAY'
  | 'MATCH_RESULT'
  | 'STANDINGS'
  | 'EUROPE_CUPS'
  | 'NATIONAL_TEAMS'
  | 'TRANSFERS'
  | 'FINANCE'
  | 'ALBUM_ACHIEVEMENTS'
  | 'SAVE_SLOTS'
  | 'GUIDE'
  | 'LICENSE'
  | 'SETTINGS';

export type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH';

export type HolidayMode = 'DAYS' | 'NEXT_MATCH' | 'END_OF_SEASON' | 'INDEFINITE';

export type HolidayTransferPolicy = 'REJECT_ALL' | 'ACCEPT_SUITABLE' | 'MANUAL';

export interface HolidayConfig {
  mode: HolidayMode;
  days: number;
  useCurrentTactics: boolean;
  transferPolicy: HolidayTransferPolicy;
  returnOnJobOffer: boolean;
}

export interface HolidayMatchSummary {
  week: number;
  seasonLabel: string;
  opponentName: string;
  isHome: boolean;
  goalsFor: number;
  goalsAgainst: number;
  result: 'W' | 'D' | 'L';
}

export interface HolidaySummaryReport {
  id: string;
  startedSeasonLabel: string;
  endedSeasonLabel: string;
  daysElapsed: number;
  weeksSimulated: number;
  seasonsRolledOver: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  matchLogs: HolidayMatchSummary[];
  injuriesOccurred: string[];
  transfersHandled: string[];
  jobOffersReceived: string[];
  assistantName: string;
  assistantTacticalKnowledge: number;
  tacticalNote: string;
  stopReason: string;
}

export interface SeasonHistoryEntry {
  seasonNumber: number; // 1..30
  seasonLabel: string; // e.g., "2026-27"
  leagueId: LeagueId;
  clubId: string | null;
  clubName: string;
  finalPosition: number;
  points: number;
  won: number;
  drawn: number;
  lost: number;
  championName: string;
  topScorerName: string;
  topScorerGoals: number;
  trophiesWon: string[];
  retiredCount: number;
  regensPromoted: number;
}

export interface ClubVisionEvaluation {
  accepted: boolean;
  score: number;
  requiredScore: number;
  clubVisionSummary: string;
  reason: string;
  inboxSubject: string;
  inboxBody: string;
}

export type DifficultyMode = 'EASY' | 'NORMAL' | 'HARD';

export interface DynamicPressQuestion {
  id: string;
  phase: 'PRE_MATCH' | 'POST_MATCH' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  outlet: 'Habertürk' | 'ATV Spor' | 'TRT Spor' | 'Fanatik';
  journalist: string;
  question: string;
  options: Array<{
    id: string;
    tone: 'CONFIDENT' | 'HUMBLE' | 'PRESSURE_OPP' | 'DIPLOMATIC';
    label: string;
  }>;
}

export interface PressAnswerImpact {
  moraleDelta: number;
  fanSupportDelta: number;
  boardConfidenceDelta: number;
  mediaRelationsDelta: number;
  headline: string;
  reactionSummary: string;
}

export interface AppSettings {
  language: Language;
  muted: boolean;
  menuMusicEnabled: boolean;
  musicVolume: number; // 0 to 100
  sfxVolume: number; // 0 to 100
  defaultCamera: CameraAngle;
  matchViewMode: ViewDimensionMode;
  tacticsViewMode: ViewDimensionMode;
  crowdDensity: 'HIGH' | 'MEDIUM';
  graphicsQuality: GraphicsQuality;
  difficulty?: DifficultyMode;
  showPlayerNamesIn3D: boolean;
}
