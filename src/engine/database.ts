import { buildBundesligaClubs } from './bundesligaData';
import { buildChampionshipClubs } from './championshipData';
import {
  buildBelgianProLeagueClubs,
  buildEredivisieClubs,
  buildLigaPortugalClubs,
  buildLigue1Clubs,
} from './europeanLeaguesData';
import { buildLaLigaClubs } from './laLigaData';
import { buildPremierLeagueClubs, ClubSeed as PremierClubSeed } from './premierLeagueData';
import { buildSerieAClubs } from './serieAData';
import { createExpandedStaffMarketPool, createResearchedClubStaff } from './staffDatabase';
import {
  buildTurkey1LigClubs,
  buildTurkey2LigBeyazClubs,
  buildTurkey2LigKirmiziClubs,
} from './turkeyLowerLeaguesData';
import {
  AchievementDef,
  Club,
  ClubEmblemType,
  CrestShape,
  FacialHair,
  Fixture,
  FormationId,
  KitPattern,
  LeagueId,
  ManagerProfile,
  MarketListing,
  Mentality,
  Player,
  PlayerAppearance,
  PlayerBuild,
  PlayerHairStyle,
  PlayerRole,
  PositionGroup,
  PressingIntensity,
  StaffMember,
  StaffRole,
  TacticalSlot,
  TacticalStyleId,
  Tempo,
  TrainingPlan,
} from './types';

export interface TacticalStylePreset {
  id: TacticalStyleId;
  labelTr: string;
  labelEn: string;
  summaryTr: string;
  summaryEn: string;
  mentality: Mentality;
  pressing: PressingIntensity;
  tempo: Tempo;
  defensiveLine: number;
}

export const TACTICAL_STYLE_PRESETS: TacticalStylePreset[] = [
  {
    id: 'VERTICAL_TIKI_TAKA',
    labelTr: 'Dikey Tiki-Taka',
    labelEn: 'Vertical Tiki-Taka',
    summaryTr: 'Kısa ama doğrudan öne oynayan, yarı alanlardan dikine delici üçgen pas sistemi.',
    summaryEn: 'Crisp short combinations focused on rapid vertical progression through half-spaces.',
    mentality: 'ATTACKING',
    pressing: 'HIGH',
    tempo: 'FAST',
    defensiveLine: 68,
  },
  {
    id: 'TIKI_TAKA',
    labelTr: 'Tiki-Taka',
    labelEn: 'Tiki-Taka',
    summaryTr: 'Topu asla rakibe vermeyen sabırlı pas ağı, yüksek hakimiyet ve yakın destek.',
    summaryEn: 'Patient possession triangles, short passes, and suffocating ball retention.',
    mentality: 'ATTACKING',
    pressing: 'HIGH',
    tempo: 'NORMAL',
    defensiveLine: 66,
  },
  {
    id: 'CONTROL_POSSESSION',
    labelTr: 'Topa Sahip Ol',
    labelEn: 'Control Possession',
    summaryTr: 'Oyunun temposunu kontrollü tutup risksiz paslarla rakibin yorulmasını bekleyen sistem.',
    summaryEn: 'Controlled ball circulation that dictates rhythm and probes low blocks patiently.',
    mentality: 'BALANCED',
    pressing: 'MEDIUM',
    tempo: 'SLOW',
    defensiveLine: 58,
  },
  {
    id: 'GEGENPRESS',
    labelTr: 'Gegenpress',
    labelEn: 'Gegenpress',
    summaryTr: 'Top kaybedildiği an boğucu şok pres ve doğrudan kaleye dikine geçiş.',
    summaryEn: 'Immediate counter-pressing on ball loss with relentless physical intensity.',
    mentality: 'ATTACKING',
    pressing: 'GEGENPRESS',
    tempo: 'FAST',
    defensiveLine: 74,
  },
  {
    id: 'WING_PLAY',
    labelTr: 'Kanat Oyunu',
    labelEn: 'Wing Play',
    summaryTr: 'Bek-kanat bindirmeleriyle çizgiye inip ceza sahasına etkili ortalar açan yapı.',
    summaryEn: 'Overloading flanks with overlapping full-backs and early crosses into the box.',
    mentality: 'ATTACKING',
    pressing: 'MEDIUM',
    tempo: 'NORMAL',
    defensiveLine: 56,
  },
  {
    id: 'DIRECT_LONG_BALL',
    labelTr: 'Uzun Top',
    labelEn: 'Direct Long Ball',
    summaryTr: 'Orta sahayı hızla atlayıp pivot santrafora uzun toplarla ikinci topları toplayan oyun.',
    summaryEn: 'Direct balls over the midfield targeting aerial strength and second-ball duels.',
    mentality: 'BALANCED',
    pressing: 'LOW',
    tempo: 'FAST',
    defensiveLine: 44,
  },
  {
    id: 'STRUCTURED_COUNTER',
    labelTr: 'Organize Kontra Atak',
    labelEn: 'Structured Counter',
    summaryTr: 'Orta blokta düzeni koruyup kazanılan topları planlı pas bağlantılarıyla hücuma taşıma.',
    summaryEn: 'Compact mid-block shape transitioning via rehearsed passing lanes.',
    mentality: 'BALANCED',
    pressing: 'MEDIUM',
    tempo: 'NORMAL',
    defensiveLine: 46,
  },
  {
    id: 'FAST_COUNTER',
    labelTr: 'Hızlı Kontra Atak',
    labelEn: 'Fast Counter',
    summaryTr: 'Geride bekleyip topu kaptığı anda hızlı kanat ve forvetlerle yıldırım hızında çıkış.',
    summaryEn: 'Absorb pressure deep and spring explosive vertical sprints into open space.',
    mentality: 'DEFENSIVE',
    pressing: 'MEDIUM',
    tempo: 'FAST',
    defensiveLine: 36,
  },
  {
    id: 'CATENACCIO',
    labelTr: 'Catenaccio',
    labelEn: 'Catenaccio',
    summaryTr: 'Demir gibi savunma disiplini, sıfır risk ve kilidi tek golle kıran İtalyan ekolü.',
    summaryEn: 'Ultra-compact Italian defensive lock with tactical fouls and clinical transition.',
    mentality: 'DEFENSIVE',
    pressing: 'LOW',
    tempo: 'SLOW',
    defensiveLine: 28,
  },
  {
    id: 'LOW_BLOCK_PRESS',
    labelTr: 'Derinde Pres',
    labelEn: 'Low-Block Press',
    summaryTr: 'Kendi yarı sahasında daralan ancak ceza sahası önünde sert ikili baskı kuran tuzak presi.',
    summaryEn: 'Drop deep into a tight block, then trigger fierce midfield traps inside own half.',
    mentality: 'DEFENSIVE',
    pressing: 'HIGH',
    tempo: 'NORMAL',
    defensiveLine: 32,
  },
  {
    id: 'CUSTOM',
    labelTr: 'Özel Sistem',
    labelEn: 'Custom System',
    summaryTr: 'Menajere özgü serbest zihniyet, pres, tempo ve savunma çizgisi ayarları.',
    summaryEn: 'Bespoke manager blueprint with hand-tuned mentality, pressing, tempo, and line.',
    mentality: 'BALANCED',
    pressing: 'MEDIUM',
    tempo: 'NORMAL',
    defensiveLine: 55,
  },
];

export const FORMATION_TEMPLATES: Record<FormationId, Array<{ role: PlayerRole; x: number; z: number }>> = {
  '4-3-3': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'LB', x: -0.68, z: -0.52 },
    { role: 'CB', x: -0.24, z: -0.58 },
    { role: 'CB', x: 0.24, z: -0.58 },
    { role: 'RB', x: 0.68, z: -0.52 },
    { role: 'CDM', x: 0, z: -0.22 },
    { role: 'CM', x: -0.4, z: 0.02 },
    { role: 'CM', x: 0.4, z: 0.02 },
    { role: 'LW', x: -0.62, z: 0.48 },
    { role: 'ST', x: 0, z: 0.64 },
    { role: 'RW', x: 0.62, z: 0.48 },
  ],
  '4-2-3-1': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'LB', x: -0.68, z: -0.52 },
    { role: 'CB', x: -0.24, z: -0.58 },
    { role: 'CB', x: 0.24, z: -0.58 },
    { role: 'RB', x: 0.68, z: -0.52 },
    { role: 'CDM', x: -0.26, z: -0.22 },
    { role: 'CDM', x: 0.26, z: -0.22 },
    { role: 'LW', x: -0.58, z: 0.22 },
    { role: 'CAM', x: 0, z: 0.24 },
    { role: 'RW', x: 0.58, z: 0.22 },
    { role: 'ST', x: 0, z: 0.64 },
  ],
  '3-5-2': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'CB', x: -0.46, z: -0.56 },
    { role: 'CB', x: 0, z: -0.6 },
    { role: 'CB', x: 0.46, z: -0.56 },
    { role: 'LB', x: -0.74, z: -0.04 },
    { role: 'CDM', x: -0.24, z: -0.18 },
    { role: 'CM', x: 0.24, z: -0.18 },
    { role: 'CAM', x: 0, z: 0.2 },
    { role: 'RB', x: 0.74, z: -0.04 },
    { role: 'ST', x: -0.26, z: 0.62 },
    { role: 'ST', x: 0.26, z: 0.62 },
  ],
  '5-4-1': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'LB', x: -0.72, z: -0.44 },
    { role: 'CB', x: -0.36, z: -0.6 },
    { role: 'CB', x: 0, z: -0.64 },
    { role: 'CB', x: 0.36, z: -0.6 },
    { role: 'RB', x: 0.72, z: -0.44 },
    { role: 'LW', x: -0.56, z: 0.04 },
    { role: 'CM', x: -0.2, z: -0.08 },
    { role: 'CM', x: 0.2, z: -0.08 },
    { role: 'RW', x: 0.56, z: 0.04 },
    { role: 'ST', x: 0, z: 0.58 },
  ],
  '4-4-2': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'LB', x: -0.68, z: -0.52 },
    { role: 'CB', x: -0.24, z: -0.58 },
    { role: 'CB', x: 0.24, z: -0.58 },
    { role: 'RB', x: 0.68, z: -0.52 },
    { role: 'LW', x: -0.64, z: 0.05 },
    { role: 'CM', x: -0.22, z: -0.06 },
    { role: 'CM', x: 0.22, z: -0.06 },
    { role: 'RW', x: 0.64, z: 0.05 },
    { role: 'ST', x: -0.24, z: 0.6 },
    { role: 'ST', x: 0.24, z: 0.6 },
  ],
  '4-1-4-1': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'LB', x: -0.68, z: -0.52 },
    { role: 'CB', x: -0.24, z: -0.58 },
    { role: 'CB', x: 0.24, z: -0.58 },
    { role: 'RB', x: 0.68, z: -0.52 },
    { role: 'CDM', x: 0, z: -0.26 },
    { role: 'LW', x: -0.64, z: 0.14 },
    { role: 'CM', x: -0.24, z: 0.04 },
    { role: 'CM', x: 0.24, z: 0.04 },
    { role: 'RW', x: 0.64, z: 0.14 },
    { role: 'ST', x: 0, z: 0.64 },
  ],
  '4-3-2-1': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'LB', x: -0.68, z: -0.52 },
    { role: 'CB', x: -0.24, z: -0.58 },
    { role: 'CB', x: 0.24, z: -0.58 },
    { role: 'RB', x: 0.68, z: -0.52 },
    { role: 'CM', x: -0.44, z: -0.08 },
    { role: 'CDM', x: 0, z: -0.2 },
    { role: 'CM', x: 0.44, z: -0.08 },
    { role: 'CAM', x: -0.34, z: 0.3 },
    { role: 'CAM', x: 0.34, z: 0.3 },
    { role: 'ST', x: 0, z: 0.66 },
  ],
  '3-4-3': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'CB', x: -0.48, z: -0.56 },
    { role: 'CB', x: 0, z: -0.6 },
    { role: 'CB', x: 0.48, z: -0.56 },
    { role: 'LB', x: -0.7, z: -0.02 },
    { role: 'CM', x: -0.22, z: -0.1 },
    { role: 'CM', x: 0.22, z: -0.1 },
    { role: 'RB', x: 0.7, z: -0.02 },
    { role: 'LW', x: -0.58, z: 0.48 },
    { role: 'ST', x: 0, z: 0.64 },
    { role: 'RW', x: 0.58, z: 0.48 },
  ],
  '3-4-2-1': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'CB', x: -0.48, z: -0.56 },
    { role: 'CB', x: 0, z: -0.6 },
    { role: 'CB', x: 0.48, z: -0.56 },
    { role: 'LB', x: -0.72, z: -0.02 },
    { role: 'CDM', x: -0.22, z: -0.16 },
    { role: 'CDM', x: 0.22, z: -0.16 },
    { role: 'RB', x: 0.72, z: -0.02 },
    { role: 'CAM', x: -0.38, z: 0.3 },
    { role: 'CAM', x: 0.38, z: 0.3 },
    { role: 'ST', x: 0, z: 0.66 },
  ],
  '4-4-2-DIAMOND': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'LB', x: -0.68, z: -0.5 },
    { role: 'CB', x: -0.24, z: -0.58 },
    { role: 'CB', x: 0.24, z: -0.58 },
    { role: 'RB', x: 0.68, z: -0.5 },
    { role: 'CDM', x: 0, z: -0.26 },
    { role: 'CM', x: -0.44, z: -0.02 },
    { role: 'CM', x: 0.44, z: -0.02 },
    { role: 'CAM', x: 0, z: 0.26 },
    { role: 'ST', x: -0.26, z: 0.62 },
    { role: 'ST', x: 0.26, z: 0.62 },
  ],
  '5-3-2': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'LB', x: -0.72, z: -0.4 },
    { role: 'CB', x: -0.36, z: -0.6 },
    { role: 'CB', x: 0, z: -0.64 },
    { role: 'CB', x: 0.36, z: -0.6 },
    { role: 'RB', x: 0.72, z: -0.4 },
    { role: 'CM', x: -0.4, z: -0.02 },
    { role: 'CDM', x: 0, z: -0.16 },
    { role: 'CM', x: 0.4, z: -0.02 },
    { role: 'ST', x: -0.26, z: 0.6 },
    { role: 'ST', x: 0.26, z: 0.6 },
  ],
  '4-2-4': [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'LB', x: -0.68, z: -0.52 },
    { role: 'CB', x: -0.24, z: -0.58 },
    { role: 'CB', x: 0.24, z: -0.58 },
    { role: 'RB', x: 0.68, z: -0.52 },
    { role: 'CM', x: -0.24, z: -0.12 },
    { role: 'CM', x: 0.24, z: -0.12 },
    { role: 'LW', x: -0.68, z: 0.44 },
    { role: 'ST', x: -0.24, z: 0.64 },
    { role: 'ST', x: 0.24, z: 0.64 },
    { role: 'RW', x: 0.68, z: 0.44 },
  ],
  CUSTOM: [
    { role: 'GK', x: 0, z: -0.88 },
    { role: 'LB', x: -0.68, z: -0.52 },
    { role: 'CB', x: -0.24, z: -0.58 },
    { role: 'CB', x: 0.24, z: -0.58 },
    { role: 'RB', x: 0.68, z: -0.52 },
    { role: 'CDM', x: -0.24, z: -0.2 },
    { role: 'CM', x: 0.24, z: -0.06 },
    { role: 'LW', x: -0.58, z: 0.3 },
    { role: 'CAM', x: 0, z: 0.26 },
    { role: 'RW', x: 0.58, z: 0.3 },
    { role: 'ST', x: 0, z: 0.64 },
  ],
};

function roleToGroup(role: PlayerRole): PositionGroup {
  if (role === 'GK') return 'GK';
  if (role === 'LB' || role === 'CB' || role === 'RB') return 'DEF';
  if (role === 'CDM' || role === 'CM' || role === 'CAM') return 'MID';
  return 'FWD';
}

export function generatePlayerAppearance(seed: number, nationality: string, role: PlayerRole): PlayerAppearance {
  const lightSkin = ['#f4ccb0', '#eac09e', '#ddb08b'];
  const oliveSkin = ['#d9a67c', '#c99368', '#b88258'];
  const deepSkin = ['#8d5524', '#6b3e1b', '#522f14'];

  const afroNats = new Set(['NGA', 'SEN', 'COD', 'GHA', 'CIV', 'CMR', 'BRA', 'FRA', 'MLI', 'GAB', 'GAM', 'CGO', 'CPV', 'GUI']);
  const medNats = new Set(['TUR', 'ESP', 'ITA', 'POR', 'ARG', 'MAR', 'COL', 'URU', 'ALB', 'LBY', 'EGY', 'ALG', 'GRE', 'ROU', 'BIH']);

  let skinPool = lightSkin;
  if (afroNats.has(nationality) && seed % 3 !== 0) skinPool = deepSkin;
  else if (medNats.has(nationality) || seed % 4 === 1) skinPool = oliveSkin;

  const hairStyles: PlayerHairStyle[] = ['SHORT', 'FADE', 'CURLY', 'MOHAWK', 'PONYTAIL', 'BALD', 'AFRO'];
  const hairColors = ['#111827', '#291d14', '#4b311e', '#784822', '#caa14b', '#94a3b8'];
  const facialStyles: FacialHair[] = ['NONE', 'STUBBLE', 'BEARD'];
  const bootColors = ['#b7ff4a', '#00e5ff', '#f8fafc', '#ef4444', '#f59e0b', '#a855f7'];

  const hairStyle =
    skinPool === deepSkin && seed % 3 === 0
      ? 'AFRO'
      : hairStyles[(seed * 5 + role.length) % hairStyles.length];
  const hairColor =
    skinPool === deepSkin && hairStyle !== 'MOHAWK'
      ? '#111827'
      : hairColors[(seed * 3) % (hairColors.length - 1)];

  const build: PlayerBuild =
    role === 'CB' || role === 'ST'
      ? seed % 3 === 0
        ? 'STOCKY'
        : 'ATHLETIC'
      : role === 'LW' || role === 'RW' || role === 'CAM'
      ? seed % 2 === 0
        ? 'SLIM'
        : 'ATHLETIC'
      : 'ATHLETIC';

  return {
    skinTone: skinPool[seed % skinPool.length],
    hairStyle,
    hairColor,
    facialHair: facialStyles[(seed * 7) % facialStyles.length],
    build,
    bootColor: bootColors[(seed * 11) % bootColors.length],
  };
}

export function createDefaultManagerProfile(): ManagerProfile {
  return {
    firstName: '',
    lastName: '',
    nationality: 'Türkiye',
    age: 41,
    personality: 'TACTICIAN',
    appearance: {
      skinTone: '#d9a67c',
      hairStyle: 'FADE',
      hairColor: '#111827',
      facialHair: 'BEARD',
      outfit: 'SUIT',
      glasses: false,
    },
    reputation: 64,
    trophies: 0,
    matchesManaged: 0,
    wins: 0,
  };
}

export function makePlayer(
  id: string,
  fictionalName: string,
  realName: string,
  age: number,
  nationality: string,
  role: PlayerRole,
  ovr: number,
  potential: number,
  shirtNumber: number,
  seed: number,
  leagueScale = 1.0
): Player {
  const group = roleToGroup(role);
  const bump = (offset: number) => Math.max(35, Math.min(98, ovr + offset + ((seed * 7) % 5) - 2));
  const isGK = group === 'GK';
  const isDEF = group === 'DEF';
  const isMID = group === 'MID';

  const attributes = {
    pace: isGK ? bump(-26) : bump(role === 'LW' || role === 'RW' || role === 'LB' || role === 'RB' ? 6 : 0),
    shooting: isGK ? bump(-40) : isDEF ? bump(-14) : isMID ? bump(-2) : bump(6),
    passing: isGK ? bump(-18) : isMID ? bump(6) : isDEF ? bump(-3) : bump(0),
    dribbling: isGK ? bump(-35) : isDEF ? bump(-10) : bump(4),
    defending: isGK ? bump(-32) : isDEF ? bump(7) : role === 'CDM' ? bump(4) : bump(-20),
    physical: bump(role === 'CB' || role === 'ST' ? 5 : -1),
    stamina: Math.max(58, Math.min(94, ovr + (age < 26 ? 4 : -4))),
    goalkeeping: isGK ? bump(4) : 14,
  };

  // Hardcore realistic market values & tight league-calibrated wage structures
  const ageFactor = age <= 23 ? 1.25 : age >= 31 ? 0.65 : 1.0;
  const marketValue = Math.round(Math.pow(Math.max(2, ovr - 58), 3.05) * 850 * ageFactor * leagueScale);
  const weeklyWage = Math.max(
    2500,
    Math.round((Math.pow(Math.max(2, ovr - 58), 2.02) * 115 * leagueScale) / 100) * 100
  );

  return {
    id,
    fictionalName,
    realName,
    age,
    nationality,
    naturalRole: role,
    positionGroup: group,
    ovr,
    potential,
    growthProgress: 0.15 + ((seed % 5) * 0.12),
    condition: 88 + (seed % 11),
    morale: 72 + (seed % 16),
    sharpness: 80 + (seed % 15),
    injuredWeeks: 0,
    injuryName: null,
    marketValue,
    weeklyWage,
    contractYears: 1 + (seed % 4),
    goals: 0,
    assists: 0,
    yellowCards: 0,
    shirtNumber,
    attributes,
    trainingFocus: 'BALANCED',
    appearance: generatePlayerAppearance(seed, nationality, role),
  };
}

interface ClubSeed {
  id: string;
  fictionalName: string;
  realName: string;
  fictionalShort: string;
  realShort: string;
  city: string;
  stadiumFictional: string;
  stadiumReal: string;
  capacity: number;
  primary: string;
  secondary: string;
  accent: string;
  pattern: KitPattern;
  emblemType: ClubEmblemType;
  crestShape: CrestShape;
  stars: number;
  foundedYear: number;
  budget: number; // Strictly limited hardcore budget!
  wageCap: number;
  rep: number;
  expectation: string;
  formation: FormationId;
  roster: Array<[string, string, number, string, PlayerRole, number, number, number]>;
}

/**
 * 2026-27 Trendyol Süper Lig (Adnan Süvari Sezonu) — 18 Takım, 34 Hafta
 */
const CLUB_SEEDS: ClubSeed[] = [
  {
    id: 'gs',
    fictionalName: 'Kuzey Yıldızı SK',
    realName: 'Galatasaray SK',
    fictionalShort: 'KYZ',
    realShort: 'GS',
    city: 'İstanbul',
    stadiumFictional: 'Boğaz Aslan Arena',
    stadiumReal: 'RAMS Park',
    capacity: 53978,
    primary: '#A90432',
    secondary: '#FDB912',
    accent: '#FEF08A',
    pattern: 'HALVES',
    emblemType: 'STARS_4',
    crestShape: 'OVAL',
    stars: 5,
    foundedYear: 1905,
    budget: 17500000,
    wageCap: 2100000,
    rep: 84,
    expectation: 'Mutlak Şampiyonluk & Avrupa Çeyrek Final',
    formation: '4-2-3-1',
    roster: [
      ['U. Çakıroğlu', 'Uğurcan Çakır', 30, 'TUR', 'GK', 81, 82, 1],
      ['I. Yakup', 'Ismail Jakobs', 26, 'SEN', 'LB', 78, 81, 4],
      ['D. Sancak', 'Davinson Sánchez', 30, 'COL', 'CB', 83, 83, 6],
      ['A. Bardak', 'Abdülkerim Bardakcı', 31, 'TUR', 'CB', 80, 80, 42],
      ['K. Ayhanoğlu', 'Kaan Ayhan', 31, 'TUR', 'RB', 77, 77, 23],
      ['L. Torero', 'Lucas Torreira', 30, 'URU', 'CDM', 83, 83, 34],
      ['M. Lemin', 'Mario Lemina', 32, 'GAB', 'CDM', 79, 79, 99],
      ['G. Serra', 'Gabriel Sara', 27, 'BRA', 'CM', 82, 85, 20],
      ['B. A. Yılmaz', 'Barış Alper Yılmaz', 26, 'TUR', 'RW', 81, 84, 53],
      ['R. Leaoğlu', 'Rafael Leão', 27, 'POR', 'LW', 85, 87, 17],
      ['V. Osmanoğlu', 'Victor Osimhen', 27, 'NGA', 'ST', 87, 89, 45],
      ['M. Ilgaz', 'Mauro Icardi', 33, 'ARG', 'ST', 82, 82, 9],
      ['A. Batrak', 'Aleksey Batrakov', 21, 'RUS', 'CAM', 79, 87, 10],
      ['R. Şallı', 'Roland Sallai', 29, 'HUN', 'RW', 78, 79, 7],
      ['E. Elmalı', 'Eren Elmalı', 26, 'TUR', 'LB', 76, 80, 17],
      ['G. Güvenç', 'Günay Güvenç', 35, 'TUR', 'GK', 74, 74, 19],
      ['Y. Akgün', 'Yunus Akgün', 26, 'TUR', 'RW', 79, 82, 11],
      ['E. Jelert', 'Elias Jelert', 23, 'DEN', 'RB', 75, 82, 24],
      ['K. Demirbay', 'Kerem Demirbay', 33, 'GER', 'CM', 75, 75, 8],
      ['E. Akman', 'Efe Akman', 20, 'TUR', 'CDM', 70, 82, 83],
      ['A. Ünyay', 'Arda Ünyay', 19, 'TUR', 'CB', 69, 81, 91],
    ],
  },
  {
    id: 'fb',
    fictionalName: 'Anadolu Feneri SK',
    realName: 'Fenerbahçe SK',
    fictionalShort: 'ANF',
    realShort: 'FB',
    city: 'İstanbul',
    stadiumFictional: 'Kadıköy Şehir Parkı',
    stadiumReal: 'Chobani Stadyumu',
    capacity: 47430,
    primary: '#0F295C',
    secondary: '#FACC15',
    accent: '#FFFFFF',
    pattern: 'STRIPES',
    emblemType: 'CANARY',
    crestShape: 'SHIELD',
    stars: 3,
    foundedYear: 1907,
    budget: 16800000,
    wageCap: 2050000,
    rep: 83,
    expectation: 'Şampiyonluk Kupası & Derbi Üstünlüğü',
    formation: '4-2-3-1',
    roster: [
      ['E. Moraes', 'Ederson', 32, 'BRA', 'GK', 84, 84, 31],
      ['A. Kahverengi', 'Archie Brown', 24, 'ENG', 'LB', 78, 84, 3],
      ['M. Şkrin', 'Milan Škriniar', 31, 'SVK', 'CB', 83, 83, 37],
      ['N. Akeoğlu', 'Nathan Aké', 31, 'NED', 'CB', 82, 82, 6],
      ['N. Semedo', 'Nélson Semedo', 32, 'POR', 'RB', 79, 79, 2],
      ['İ. Yüksek', 'İsmail Yüksek', 27, 'TUR', 'CDM', 80, 83, 5],
      ['F. Santos', 'Fred', 33, 'BRA', 'CM', 81, 81, 35],
      ['K. Aktürk', 'Kerem Aktürkoğlu', 27, 'TUR', 'LW', 81, 83, 7],
      ['M. Asensio', 'Marco Asensio', 30, 'ESP', 'CAM', 82, 82, 11],
      ['M. Greenwood', 'Mason Greenwood', 24, 'ENG', 'RW', 82, 86, 11],
      ['Y. Nesyri', 'Youssef En-Nesyri', 29, 'MAR', 'ST', 81, 82, 19],
      ['A. Talisca', 'Anderson Talisca', 32, 'BRA', 'CAM', 80, 80, 94],
      ['S. Szyman', 'S. Szymański', 27, 'POL', 'CM', 80, 82, 53],
      ['J. Ooster', 'J. Oosterwolde', 25, 'NED', 'CB', 79, 83, 24],
      ['Ç. Söyüncü', 'Çağlar Söyüncü', 30, 'TUR', 'CB', 78, 79, 4],
      ['T. Çetin', 'Tarık Çetin', 29, 'TUR', 'GK', 73, 74, 13],
      ['M. Müldür', 'Mert Müldür', 27, 'TUR', 'RB', 76, 78, 16],
      ['İ. Kahveci', 'İrfan Can Kahveci', 31, 'TUR', 'RW', 78, 78, 17],
      ['O. Aydın', 'Oğuz Aydın', 25, 'TUR', 'LW', 76, 81, 70],
      ['C. Tosun', 'Cenk Tosun', 35, 'TUR', 'ST', 73, 73, 23],
      ['Y. Demir', 'Yusuf Demir', 23, 'AUT', 'CAM', 72, 80, 30],
    ],
  },
  {
    id: 'bjk',
    fictionalName: 'Boğaz Kartalları JK',
    realName: 'Beşiktaş JK',
    fictionalShort: 'BGK',
    realShort: 'BJK',
    city: 'İstanbul',
    stadiumFictional: 'Dolmabahçe Kalesi',
    stadiumReal: 'Tüpraş Stadyumu',
    capacity: 42445,
    primary: '#111827',
    secondary: '#F8FAFC',
    accent: '#EF4444',
    pattern: 'STRIPES',
    emblemType: 'EAGLE',
    crestShape: 'BANNER',
    stars: 3,
    foundedYear: 1903,
    budget: 11500000,
    wageCap: 1550000,
    rep: 80,
    expectation: 'Şampiyonluk Yarışı & Avrupa Kupası',
    formation: '4-2-3-1',
    roster: [
      ['A. Nübel', 'Alexander Nübel', 29, 'GER', 'GK', 81, 82, 1],
      ['R. Yılmaz', 'Rıdvan Yılmaz', 25, 'TUR', 'LB', 76, 80, 33],
      ['T. Djaló', 'Tiago Djaló', 26, 'POR', 'CB', 79, 83, 3],
      ['E. Topçu', 'Emirhan Topçu', 25, 'TUR', 'CB', 78, 83, 53],
      ['K. Ouattara', 'Kassoum Ouattara', 21, 'FRA', 'RB', 76, 84, 22],
      ['S. Özcan', 'Salih Özcan', 28, 'TUR', 'CDM', 78, 80, 6],
      ['O. Kökçü', 'Orkun Kökçü', 25, 'TUR', 'CM', 82, 86, 10],
      ['L. Trossard', 'Leandro Trossard', 31, 'BEL', 'LW', 82, 82, 19],
      ['R. Silvan', 'Rafa Silva', 33, 'POR', 'CAM', 81, 81, 27],
      ['V. Černý', 'Václav Černý', 28, 'CZE', 'RW', 79, 80, 7],
      ['D. Vlahović', 'Dušan Vlahović', 26, 'SRB', 'ST', 83, 86, 9],
      ['S. Kılıçsoy', 'Semih Kılıçsoy', 20, 'TUR', 'ST', 77, 87, 90],
      ['G. Fernandes', 'Gedson Fernandes', 27, 'POR', 'CM', 80, 82, 83],
      ['M. Rashica', 'Milot Rashica', 30, 'KOS', 'RW', 77, 77, 7],
      ['Y. Özcan', 'Yasin Özcan', 20, 'TUR', 'CB', 74, 84, 14],
      ['D. Alemdar', 'Doğan Alemdar', 23, 'TUR', 'GK', 75, 82, 30],
      ['F. Uduokhai', 'Felix Uduokhai', 29, 'GER', 'CB', 77, 78, 14],
      ['E. Muçi', 'Ernest Muçi', 25, 'ALB', 'CAM', 76, 82, 23],
      ['J. Svensson', 'Jonas Svensson', 33, 'NOR', 'RB', 74, 74, 2],
      ['N. Uysal', 'Necip Uysal', 35, 'TUR', 'CDM', 71, 71, 20],
      ['E. Destanoğ', 'Ersin Destanoğlu', 25, 'TUR', 'GK', 73, 77, 30],
    ],
  },
  {
    id: 'ts',
    fictionalName: 'Karadeniz Fırtınası',
    realName: 'Trabzonspor',
    fictionalShort: 'KDF',
    realShort: 'TS',
    city: 'Trabzon',
    stadiumFictional: 'Akyazı Fırtına Arena',
    stadiumReal: 'Papara Park',
    capacity: 40980,
    primary: '#7C1D35',
    secondary: '#38BDF8',
    accent: '#FFFFFF',
    pattern: 'HALVES',
    emblemType: 'STORM_T',
    crestShape: 'SHIELD',
    stars: 1,
    foundedYear: 1967,
    budget: 8400000,
    wageCap: 1150000,
    rep: 78,
    expectation: 'İlk 4 & Türkiye Kupası Finali',
    formation: '4-2-3-1',
    roster: [
      ['T. Tepe', 'Taha Tepe', 25, 'TUR', 'GK', 75, 79, 1],
      ['A. Boşluk', 'Arif Boşluk', 23, 'TUR', 'LB', 73, 80, 77],
      ['A. Batagov', 'Arseniy Batagov', 24, 'UKR', 'CB', 77, 83, 44],
      ['S. Savić', 'Stefan Savić', 35, 'MNE', 'CB', 78, 78, 15],
      ['P. Malheiro', 'Pedro Malheiro', 25, 'POR', 'RB', 77, 81, 79],
      ['B. Mendy', 'Batista Mendy', 26, 'FRA', 'CDM', 79, 82, 8],
      ['O. Tufan', 'Ozan Tufan', 31, 'TUR', 'CM', 76, 76, 11],
      ['M. Cham', 'Muhammed Cham', 25, 'AUT', 'CAM', 78, 82, 10],
      ['M. Eskihellaç', 'Mustafa Eskihellaç', 29, 'TUR', 'LW', 75, 75, 19],
      ['E. Višća', 'Edin Višća', 36, 'BIH', 'RW', 77, 77, 7],
      ['P. Onuachu', 'Paul Onuachu', 32, 'NGA', 'ST', 80, 80, 30],
      ['D. Drăguș', 'Denis Drăguș', 27, 'ROU', 'ST', 76, 78, 70],
      ['C. Nwaiwu', 'Chibuike Nwaiwu', 23, 'NGA', 'CB', 75, 81, 5],
      ['C. Çanak', 'Cihan Çanak', 21, 'TUR', 'LW', 74, 83, 61],
      ['S. Saatçı', 'Serdar Saatçı', 23, 'TUR', 'CB', 74, 80, 29],
      ['O. Çevikkan', 'Onuralp Çevikkan', 20, 'TUR', 'GK', 70, 83, 88],
      ['O. Yokuşlu', 'Okay Yokuşlu', 32, 'TUR', 'CDM', 76, 76, 35],
      ['A. Nwakaeme', 'Anthony Nwakaeme', 37, 'NGA', 'LW', 74, 74, 9],
      ['E. Elmalı2', 'Eren Aydın', 23, 'TUR', 'ST', 71, 79, 94],
      ['U. Güneş', 'Umut Güneş', 26, 'TUR', 'CM', 73, 76, 23],
      ['A. Türkmen', 'Ali Şahin Yılmaz', 22, 'TUR', 'CB', 70, 79, 84],
    ],
  },
  {
    id: 'bfk',
    fictionalName: 'Boztepe Başkent FK',
    realName: 'RAMS Başakşehir',
    fictionalShort: 'BBF',
    realShort: 'BFK',
    city: 'İstanbul',
    stadiumFictional: 'Başak Arena',
    stadiumReal: 'Fatih Terim Stadyumu',
    capacity: 17156,
    primary: '#EA580C',
    secondary: '#1E293B',
    accent: '#F8FAFC',
    pattern: 'SOLID',
    emblemType: 'OWL',
    crestShape: 'HEX',
    stars: 0,
    foundedYear: 2014,
    budget: 5600000,
    wageCap: 790000,
    rep: 74,
    expectation: 'İlk 5 & Avrupa Bileti',
    formation: '4-3-3',
    roster: [
      ['M. Şengezer', 'Muhammed Şengezer', 29, 'TUR', 'GK', 76, 78, 16],
      ['B. Diallo', 'Baïla Diallo', 25, 'SEN', 'LB', 74, 78, 21],
      ['L. Duarte', 'Léo Duarte', 30, 'BRA', 'CB', 77, 78, 5],
      ['J. Opoku', 'Jerome Opoku', 27, 'GHA', 'CB', 77, 80, 3],
      ['Ö. Şahiner', 'Ömer Ali Şahiner', 34, 'TUR', 'RB', 74, 74, 42],
      ['B. Özdemir', 'Berat Özdemir', 28, 'TUR', 'CDM', 76, 78, 6],
      ['L. Lima', 'Lucas Lima', 34, 'BRA', 'CM', 75, 75, 13],
      ['D. Pelkas', 'Dimitris Pelkas', 32, 'GRE', 'CAM', 76, 76, 17],
      ['S. Gürler', 'Serdar Gürler', 34, 'TUR', 'LW', 74, 74, 7],
      ['D. Türüç', 'Deniz Türüç', 33, 'TUR', 'RW', 76, 76, 23],
      ['E. Shomurodov', 'Eldor Shomurodov', 31, 'UZB', 'ST', 78, 79, 14],
      ['K. Piątek', 'Krzysztof Piątek', 31, 'POL', 'ST', 79, 79, 9],
      ['D. Selke', 'Davie Selke', 31, 'GER', 'ST', 75, 75, 27],
      ['H. Güreler', 'Hamza Güreler', 20, 'TUR', 'CB', 71, 81, 35],
      ['O. Kemen', 'Olivier Kemen', 30, 'CMR', 'CM', 75, 76, 8],
      ['V. Babacan', 'Volkan Babacan', 37, 'TUR', 'GK', 72, 72, 1],
      ['Y. Sarı', 'Yusuf Sarı', 27, 'TUR', 'RW', 75, 77, 77],
      ['O. Ba', 'Ousseynou Ba', 30, 'SEN', 'CB', 74, 75, 27],
      ['C. Ebosele', 'Festus Ebosele2', 24, 'IRL', 'RB', 73, 78, 12],
      ['Ö. Beyaz', 'Ömer Faruk Beyaz', 23, 'TUR', 'CAM', 71, 80, 20],
    ],
  },
  {
    id: 'goz',
    fictionalName: 'İzmir Körfez SK',
    realName: 'Göztepe SK',
    fictionalShort: 'İKS',
    realShort: 'GÖZ',
    city: 'İzmir',
    stadiumFictional: 'Güzelyalı Stadyumu',
    stadiumReal: 'Gürsel Aksel Stadyumu',
    capacity: 20756,
    primary: '#B91C1C',
    secondary: '#FACC15',
    accent: '#FFFFFF',
    pattern: 'SASH',
    emblemType: 'GOZ',
    crestShape: 'OVAL',
    stars: 0,
    foundedYear: 1925,
    budget: 4800000,
    wageCap: 680000,
    rep: 73,
    expectation: 'Üst Sıra Mücadelesi (İlk 7)',
    formation: '3-5-2',
    roster: [
      ['M. Lis', 'Mateusz Lis', 29, 'POL', 'GK', 76, 78, 97],
      ['H. Silva', 'Heliton', 30, 'BRA', 'CB', 76, 76, 5],
      ['T. Altıkardeş', 'Taha Altıkardeş', 22, 'TUR', 'CB', 74, 82, 4],
      ['K. Günter', 'Koray Günter', 31, 'GER', 'CB', 75, 75, 21],
      ['D. Köybaşı', 'İsmail Köybaşı', 36, 'TUR', 'LB', 72, 72, 3],
      ['O. Bayrak', 'Ogün Bayrak', 27, 'TUR', 'RB', 74, 76, 20],
      ['A. Dennis', 'Anthony Dennis', 22, 'NGA', 'CDM', 76, 83, 30],
      ['I. Solet', 'Isaac Solet', 25, 'CTA', 'CM', 75, 79, 8],
      ['Y. Kayan', 'Yalçın Kayan', 27, 'TUR', 'CAM', 74, 76, 10],
      ['R. Cardoso', 'Romulo', 24, 'BRA', 'ST', 79, 85, 79],
      ['J. Santos', 'Juan', 24, 'BRA', 'ST', 77, 83, 11],
      ['D. Fofana', 'David Datro Fofana', 23, 'CIV', 'ST', 76, 83, 9],
      ['D. Erdoğan', 'Doğan Erdoğan', 29, 'TUR', 'CDM', 73, 74, 6],
      ['N. Sangaré', 'Nazım Sangaré', 32, 'TUR', 'RB', 73, 73, 2],
      ['K. Matsuki', 'Kuryu Matsuki', 23, 'JPN', 'CM', 74, 81, 7],
      ['A. Özçimen', 'Arda Özçimen', 24, 'TUR', 'GK', 71, 77, 1],
      ['M. Bokele', 'Malcom Bokele', 26, 'CMR', 'CB', 74, 78, 26],
      ['D. Tijanić', 'David Tijanić', 29, 'SVN', 'CAM', 74, 74, 43],
      ['E. Ekincier', 'Emirhan Ekincier', 26, 'AZE', 'LW', 70, 74, 77],
      ['F. Kanatsız', 'Furkan Kanatsızkuş', 29, 'TUR', 'ST', 71, 71, 99],
    ],
  },
  {
    id: 'sam',
    fictionalName: '19 Mayıs Güneşi',
    realName: 'Samsunspor',
    fictionalShort: 'OMG',
    realShort: 'SAM',
    city: 'Samsun',
    stadiumFictional: 'Karadeniz 19 Mayıs',
    stadiumReal: 'Yeni 19 Mayıs Stadyumu',
    capacity: 33303,
    primary: '#DC2626',
    secondary: '#F8FAFC',
    accent: '#111827',
    pattern: 'STRIPES',
    emblemType: 'ATATURK',
    crestShape: 'CIRCLE',
    stars: 0,
    foundedYear: 1965,
    budget: 4500000,
    wageCap: 640000,
    rep: 73,
    expectation: 'Avrupa Potası & İstikrar',
    formation: '4-2-3-1',
    roster: [
      ['O. Kocuk', 'Okan Kocuk', 31, 'TUR', 'GK', 76, 77, 1],
      ['M. Bola', 'Marc Bola', 28, 'ENG', 'LB', 74, 75, 18],
      ['R. Drongelen', 'Rick van Drongelen', 27, 'NED', 'CB', 77, 79, 4],
      ['L. Šatka', 'Lubomír Šatka', 30, 'SVK', 'CB', 76, 76, 37],
      ['Z. Yavru', 'Zeki Yavru', 34, 'TUR', 'RB', 73, 73, 18],
      ['Y. Bennasser', 'Youssef Aït Bennasser', 30, 'MAR', 'CDM', 75, 76, 6],
      ['O. Ntcham', 'Olivier Ntcham', 30, 'CMR', 'CM', 77, 77, 10],
      ['C. Holse', 'Carlo Holse', 27, 'DEN', 'CAM', 77, 80, 21],
      ['E. Kılınç', 'Emre Kılınç', 31, 'TUR', 'LW', 75, 75, 11],
      ['A. Muja', 'Arbnor Muja', 27, 'ALB', 'RW', 74, 76, 7],
      ['M. Mouandil', 'Marius Mouandilmadji', 28, 'CHA', 'ST', 76, 78, 9],
      ['L. Dimata', 'Landry Dimata', 28, 'BEL', 'ST', 74, 75, 19],
      ['F. Tait', 'Flavien Tait', 33, 'FRA', 'CM', 74, 74, 20],
      ['C. Aydoğdu', 'Soner Aydoğdu', 35, 'TUR', 'CM', 73, 73, 8],
      ['S. Gönül', 'Soner Gönül', 29, 'TUR', 'LB', 72, 73, 28],
      ['H. Yeral', 'Halil Yeral', 26, 'TUR', 'GK', 69, 73, 64],
      ['K. Schindler', 'Kingsley Schindler', 33, 'GHA', 'RW', 73, 73, 17],
      ['C. Çift', 'Yunus Emre Çift', 23, 'TUR', 'CB', 72, 79, 55],
      ['E. Kara', 'Ercan Kara', 30, 'AUT', 'ST', 73, 73, 27],
      ['M. Ali', 'Muhammet Ali Özbaskıcı', 21, 'TUR', 'CAM', 69, 78, 29],
    ],
  },
  {
    id: 'riz',
    fictionalName: 'Doğu Karadeniz Çay',
    realName: 'Çaykur Rizespor',
    fictionalShort: 'DKÇ',
    realShort: 'RİZ',
    city: 'Rize',
    stadiumFictional: 'Yeşil Vadi Stadyumu',
    stadiumReal: 'Çaykur Didi Stadyumu',
    capacity: 14850,
    primary: '#15803D',
    secondary: '#0284C7',
    accent: '#FFFFFF',
    pattern: 'STRIPES',
    emblemType: 'TEA_LEAF',
    crestShape: 'SHIELD',
    stars: 0,
    foundedYear: 1953,
    budget: 3300000,
    wageCap: 510000,
    rep: 70,
    expectation: 'Orta Sıra Güvencesi',
    formation: '4-2-3-1',
    roster: [
      ['Y. Fofana', 'Yahia Fofana', 25, 'CIV', 'GK', 76, 81, 1],
      ['C. Højer', 'Casper Højer', 31, 'DEN', 'LB', 73, 73, 5],
      ['A. Mocsi', 'Attila Mocsi', 26, 'HUN', 'CB', 75, 79, 4],
      ['K. Alikulov', 'Khusniddin Alikulov', 27, 'UZB', 'CB', 75, 78, 2],
      ['M. Şahin', 'M. Taha Şahin', 25, 'TUR', 'RB', 74, 78, 37],
      ['Q. Laci', 'Qazim Laci', 30, 'ALB', 'CDM', 75, 75, 20],
      ['G. Hadžiah', 'Amir Hadžiahmetović', 29, 'BIH', 'CM', 75, 76, 19],
      ['D. Varesan', 'Dal Varesanovic', 25, 'BIH', 'CAM', 75, 80, 10],
      ['I. Olawoyin', 'Ibrahim Olawoyin', 28, 'NGA', 'LW', 76, 78, 11],
      ['V. Mihăilă', 'Valentin Mihăilă', 26, 'ROU', 'RW', 75, 79, 28],
      ['A. Sowe', 'Ali Sowe', 32, 'GAM', 'ST', 76, 76, 9],
      ['G. Borrelli', 'Gennaro Borrelli', 26, 'ITA', 'ST', 74, 78, 90],
      ['M. Sagnan', 'Modibo Sagnan', 27, 'MLI', 'CB', 74, 77, 15],
      ['M. Pala', 'Mithat Pala', 26, 'TUR', 'CM', 73, 76, 54],
      ['E. Bulut', 'Emrecan Bulut', 23, 'TUR', 'LW', 71, 78, 77],
      ['Z. Görgen', 'Zafer Görgen', 26, 'TUR', 'GK', 70, 74, 23],
      ['A. Akintola', 'David Akintola', 30, 'NGA', 'RW', 73, 73, 7],
      ['G. Papanik', 'Giannis Papanikolaou', 27, 'GRE', 'CDM', 74, 76, 6],
      ['E. Yaşar', 'Efe Korkut Yaşar', 20, 'TUR', 'CB', 69, 78, 44],
      ['V. Jurečka', 'Václav Jurečka', 32, 'CZE', 'ST', 73, 73, 18],
    ],
  },
  {
    id: 'aln',
    fictionalName: 'Akdeniz Güneşi SK',
    realName: 'Corendon Alanyaspor',
    fictionalShort: 'AGS',
    realShort: 'ALN',
    city: 'Antalya',
    stadiumFictional: 'Alanya Kıyı Park',
    stadiumReal: 'GAİN Park',
    capacity: 9784,
    primary: '#F97316',
    secondary: '#15803D',
    accent: '#FFFFFF',
    pattern: 'CHEVRON',
    emblemType: 'SUN_WAVE',
    crestShape: 'SHIELD',
    stars: 0,
    foundedYear: 1948,
    budget: 2900000,
    wageCap: 470000,
    rep: 69,
    expectation: 'Ligde Kalma & Genç Satışı',
    formation: '4-2-3-1',
    roster: [
      ['E. Taşkıran', 'Ertuğrul Taşkıran', 36, 'TUR', 'GK', 74, 74, 1],
      ['J. Balkovec', 'Jure Balkovec', 31, 'SVN', 'LB', 74, 74, 29],
      ['N. Lima', 'Nuno Lima', 25, 'POR', 'CB', 74, 79, 5],
      ['F. Aliti', 'Fidan Aliti', 32, 'KOS', 'CB', 73, 73, 3],
      ['F. Hadergjon', 'F. Hadergjonaj', 32, 'KOS', 'RB', 74, 74, 94],
      ['G. Makouta', 'Gaius Makouta', 29, 'CGO', 'CDM', 74, 75, 21],
      ['M. Maestro', 'Maestro', 22, 'ANG', 'CM', 73, 81, 8],
      ['I. Hagi', 'Ianis Hagi', 27, 'ROU', 'CAM', 76, 78, 10],
      ['M. Elia', 'Meschack Elia', 29, 'COD', 'LW', 75, 76, 17],
      ['E. Karaca', 'Efecan Karaca', 36, 'TUR', 'RW', 72, 72, 7],
      ['U. Hwang', 'Hwang Ui-jo', 33, 'KOR', 'ST', 75, 75, 16],
      ['I. Cédric', 'Ivan Cédric', 24, 'CMR', 'ST', 73, 79, 9],
      ['B. Gezek', 'Baran Ali Gezek', 20, 'TUR', 'CM', 70, 81, 18],
      ['E. Demir', 'Emre Demir', 22, 'TUR', 'CAM', 71, 80, 14],
      ['F. Aksoy', 'Fatih Aksoy', 28, 'TUR', 'CB', 72, 73, 20],
      ['P. Victor', 'Paulo Victor', 25, 'BRA', 'GK', 71, 76, 99],
      ['Y. Özdemir', 'Yusuf Özdemir', 25, 'TUR', 'LB', 74, 78, 88],
      ['R. Janvier', 'Nicolas Janvier', 28, 'FRA', 'CM', 73, 74, 26],
      ['S. Córdova', 'Sergio Córdova', 29, 'VEN', 'ST', 73, 74, 11],
      ['B. Toy', 'Buluthan Bulut', 24, 'TUR', 'RW', 70, 75, 70],
    ],
  },
  {
    id: 'kas',
    fictionalName: 'Haliç Tersane SK',
    realName: 'Kasımpaşa SK',
    fictionalShort: 'HTS',
    realShort: 'KAS',
    city: 'İstanbul',
    stadiumFictional: 'Kasımpaşa Sahası',
    stadiumReal: 'Recep Tayyip Erdoğan Stadyumu',
    capacity: 13797,
    primary: '#1E3A8A',
    secondary: '#F8FAFC',
    accent: '#00E5FF',
    pattern: 'STRIPES',
    emblemType: 'ANCHOR',
    crestShape: 'CIRCLE',
    stars: 0,
    foundedYear: 1921,
    budget: 2800000,
    wageCap: 460000,
    rep: 69,
    expectation: 'Orta Sıra & Mücadeleci Oyun',
    formation: '4-3-3',
    roster: [
      ['A. Gianniot', 'Andreas Gianniotis', 33, 'GRE', 'GK', 74, 74, 1],
      ['K. Rodrigues', 'Kévin Rodrigues', 32, 'POR', 'LB', 73, 73, 12],
      ['K. Mouanga', 'Kévin Mouanga', 26, 'FRA', 'CB', 73, 77, 4],
      ['Y. Özcanlı', 'Nicholas Opoku', 28, 'GHA', 'CB', 73, 75, 5],
      ['C. Winck', 'Cláudio Winck', 32, 'BRA', 'RB', 74, 74, 2],
      ['G. Gül', 'Gökhan Gül', 28, 'TUR', 'CDM', 73, 74, 6],
      ['A. Kara', 'Aytaç Kara', 33, 'TUR', 'CM', 74, 74, 35],
      ['H. Hajradin', 'Haris Hajradinović', 32, 'BIH', 'CAM', 76, 76, 10],
      ['M. Fall', 'Mamadou Fall', 34, 'SEN', 'RW', 74, 74, 7],
      ['A. Benedycz', 'Adrian Benedyczak', 25, 'POL', 'LW', 74, 79, 17],
      ['P. Guèye', 'Pape Habib Guèye', 26, 'SEN', 'ST', 74, 77, 9],
      ['N. Da Costa', 'Nuno Da Costa', 35, 'CPV', 'ST', 73, 73, 19],
      ['A. Karapo', 'Ayberk Karapo', 22, 'TUR', 'CB', 70, 79, 24],
      ['Ö. Bayram', 'Ömer Bayram', 35, 'TUR', 'LB', 71, 71, 19],
      ['C. Keleş', 'Can Keleş', 24, 'AUT', 'RW', 72, 77, 11],
      ['A. Yanar', 'Ali Emre Yanar', 28, 'TUR', 'GK', 70, 72, 25],
      ['C. Brekalo', 'Josip Brekalo', 28, 'CRO', 'LW', 75, 76, 18],
      ['S. Çiftpınar', 'Sadık Çiftpınar', 33, 'TUR', 'CB', 71, 71, 20],
      ['C. Cafú', 'Cafú', 33, 'POR', 'CM', 72, 72, 8],
      ['M. Ben Ouan', 'Mortadha Ben Ouanes', 32, 'TUN', 'LB', 72, 72, 13],
    ],
  },
  {
    id: 'kon',
    fictionalName: 'Selçuklu Kartalı SK',
    realName: 'TÜMOSAN Konyaspor',
    fictionalShort: 'SLK',
    realShort: 'KON',
    city: 'Konya',
    stadiumFictional: 'Anadolu Kartal Arena',
    stadiumReal: 'Medaş Konya Büyükşehir Stadyumu',
    capacity: 41600,
    primary: '#15803D',
    secondary: '#F8FAFC',
    accent: '#14532D',
    pattern: 'HOOPS',
    emblemType: 'EAGLE_DOUBLE',
    crestShape: 'SHIELD',
    stars: 0,
    foundedYear: 1922,
    budget: 3400000,
    wageCap: 520000,
    rep: 70,
    expectation: 'Ligde Kalıcılık & Evinde Baskı',
    formation: '4-2-3-1',
    roster: [
      ['D. Ertaş', 'Deniz Ertaş', 21, 'TUR', 'GK', 73, 82, 1],
      ['G. Sitya', 'Guilherme Sitya', 36, 'BRA', 'LB', 74, 74, 12],
      ['A. Demirbağ', 'Adil Demirbağ', 28, 'TUR', 'CB', 75, 76, 4],
      ['R. Baniya', 'Riechedly Baniya', 27, 'TUR', 'CB', 74, 77, 3],
      ['N. Boranija', 'N. Boranijašević', 30, 'SRB', 'RB', 73, 73, 22],
      ['M. Jevtović', 'Marko Jevtović', 33, 'SRB', 'CDM', 74, 74, 16],
      ['O. Ülgün', 'Oğulcan Ülgün', 28, 'TUR', 'CM', 73, 75, 35],
      ['D. Aleksić', 'Danijel Aleksić', 35, 'SRB', 'CAM', 74, 74, 10],
      ['H. Keyta', 'Hamidou Keyta', 31, 'FRA', 'LW', 73, 73, 7],
      ['A. Ndao', 'Alassane Ndao', 29, 'SEN', 'RW', 74, 75, 18],
      ['B. Kramer', 'Blaž Kramer', 30, 'SVN', 'ST', 75, 76, 99],
      ['U. Nayir', 'Umut Nayir', 33, 'TUR', 'ST', 73, 73, 22],
      ['M. İbrahimoğ', 'Melih İbrahimoğlu', 26, 'TUR', 'CM', 72, 76, 77],
      ['U. Yazğılı', 'Uğurcan Yazğılı', 27, 'TUR', 'CB', 72, 75, 5],
      ['F. Damjan', 'Filip Damjanović', 28, 'SRB', 'CB', 72, 74, 15],
      ['B. Güngördü', 'Bahri Güngördü', 26, 'TUR', 'GK', 69, 73, 13],
      ['P. Pedrinho', 'Pedrinho Moreira', 29, 'POR', 'CAM', 74, 74, 8],
      ['Y. Erdoğan', 'Yusuf Erdoğan', 34, 'TUR', 'LW', 72, 72, 11],
      ['J. Slowik', 'Jakub Słowik', 35, 'POL', 'GK', 72, 72, 27],
      ['E. Boateng', 'Emmanuel Boateng', 30, 'GHA', 'CDM', 72, 73, 20],
    ],
  },
  {
    id: 'gfk',
    fictionalName: 'Gazişehir Şahinleri',
    realName: 'Gaziantep FK',
    fictionalShort: 'GŞH',
    realShort: 'GFK',
    city: 'Gaziantep',
    stadiumFictional: 'Kalyon Güney Arena',
    stadiumReal: 'Gaziantep Stadyumu',
    capacity: 30320,
    primary: '#B91C1C',
    secondary: '#111827',
    accent: '#FFFFFF',
    pattern: 'STRIPES',
    emblemType: 'FALCON',
    crestShape: 'HEX',
    stars: 0,
    foundedYear: 1988,
    budget: 2750000,
    wageCap: 455000,
    rep: 69,
    expectation: 'Orta Sıra & İç Saha Direnci',
    formation: '4-2-3-1',
    roster: [
      ['K. Tobiasz', 'Kacper Tobiasz', 23, 'POL', 'GK', 74, 81, 1],
      ['K. Çalhan', 'Kerim Çalhanoğlu', 24, 'TUR', 'LB', 72, 77, 13],
      ['A. Kızıldağ', 'Arda Kızıldağ', 27, 'TUR', 'CB', 74, 76, 4],
      ['M. Abena', 'Myenty Abena', 31, 'SUR', 'CB', 73, 74, 14],
      ['L. Pérez', 'Luis Pérez', 31, 'ESP', 'RB', 73, 73, 2],
      ['O. Özçiçek', 'Ogün Özçiçek', 27, 'TUR', 'CDM', 73, 76, 6],
      ['J. Bacuna', 'Juninho Bacuna', 29, 'CUW', 'CM', 75, 76, 7],
      ['A. Maxim', 'Alexandru Maxim', 36, 'ROU', 'CAM', 75, 75, 44],
      ['S. Hansen', 'Sontje Hansen', 24, 'CUW', 'LW', 74, 80, 11],
      ['D. Sorescu', 'Deian Sorescu', 28, 'ROU', 'RW', 75, 76, 18],
      ['H. Derviş', 'Halil Dervişoğlu', 26, 'TUR', 'ST', 74, 77, 9],
      ['K. Kodro', 'Kenan Kodro', 32, 'BIH', 'ST', 74, 74, 19],
      ['K. Kozłowski', 'Kacper Kozłowski', 22, 'POL', 'CM', 75, 83, 10],
      ['E. Ersoy', 'Ertuğrul Ersoy', 29, 'TUR', 'CB', 73, 74, 5],
      ['S. M\'Bakata', 'Salem M\'Bakata', 28, 'COD', 'RB', 72, 74, 22],
      ['A. Dadakdeniz', 'Ataberk Dadakdeniz', 27, 'TUR', 'GK', 69, 72, 71],
      ['C. Lungoyi', 'Christopher Lungoyi', 26, 'SUI', 'LW', 72, 75, 17],
      ['B. Ndiaye', 'Badou Ndiaye', 35, 'SEN', 'CM', 73, 73, 8],
      ['M. Eski', 'Mustafa Burak Bozan', 26, 'TUR', 'GK', 70, 74, 12],
      ['E. Taşdemir', 'Emre Taşdemir', 31, 'TUR', 'LB', 71, 71, 3],
    ],
  },
  {
    id: 'eyp',
    fictionalName: 'Altınboynuz FK',
    realName: 'ikas Eyüpspor',
    fictionalShort: 'ABF',
    realShort: 'EYP',
    city: 'İstanbul',
    stadiumFictional: 'Eyüp Park Arena',
    stadiumReal: 'Eyüp Stadyumu',
    capacity: 13797,
    primary: '#6D28D9',
    secondary: '#FACC15',
    accent: '#FFFFFF',
    pattern: 'SASH',
    emblemType: 'WAVE',
    crestShape: 'CIRCLE',
    stars: 0,
    foundedYear: 1919,
    budget: 3700000,
    wageCap: 540000,
    rep: 70,
    expectation: 'Taktiksel Futbol & İlk 10',
    formation: '4-2-3-1',
    roster: [
      ['B. Özer', 'Berke Özer', 26, 'TUR', 'GK', 77, 82, 1],
      ['U. Meraş', 'Umut Meraş', 30, 'TUR', 'LB', 73, 73, 77],
      ['R. Yalçın', 'Robin Yalçın', 32, 'TUR', 'CB', 74, 74, 6],
      ['L. Claro', 'Luiz Claro', 34, 'BRA', 'CB', 73, 73, 4],
      ['T. Bingöl', 'Tayfur Bingöl', 33, 'TUR', 'RB', 73, 73, 70],
      ['M. Kabasakal', 'Melih Kabasakal', 30, 'TUR', 'CDM', 74, 75, 57],
      ['F. Midtsjø', 'Fredrik Midtsjø', 33, 'NOR', 'CM', 75, 75, 28],
      ['E. Akbaba', 'Emre Akbaba', 33, 'TUR', 'CAM', 75, 75, 8],
      ['A. Kutucu', 'Ahmed Kutucu', 26, 'TUR', 'LW', 77, 81, 23],
      ['H. Akbunar', 'Halil Akbunar', 32, 'TUR', 'RW', 74, 74, 7],
      ['M. Thiam', 'Mame Thiam', 33, 'SEN', 'ST', 77, 77, 9],
      ['U. Bozok', 'Umut Bozok', 29, 'TUR', 'ST', 73, 74, 19],
      ['M. Łęgowski', 'Mateusz Łęgowski', 23, 'POL', 'CM', 73, 80, 14],
      ['J. Shelvey', 'Jonjo Shelvey', 34, 'ENG', 'CM', 74, 74, 88],
      ['A. Yaşar', 'Anıl Yaşar', 24, 'TUR', 'CB', 71, 77, 15],
      ['M. Felipe', 'Marcos Felipe', 30, 'BRA', 'GK', 73, 74, 22],
      ['L. Dubois', 'Léo Dubois', 32, 'FRA', 'RB', 74, 74, 15],
      ['S. Saiz', 'Samú Sáiz', 35, 'ESP', 'CAM', 73, 73, 10],
      ['C. Erkin', 'Caner Erkin', 37, 'TUR', 'LB', 71, 71, 88],
      ['B. Ampem', 'Prince Ampem', 28, 'GHA', 'LW', 73, 74, 40],
    ],
  },
  {
    id: 'gb',
    fictionalName: 'Başkent Alınteri SK',
    realName: 'Gençlerbirliği',
    fictionalShort: 'BAS',
    realShort: 'GB',
    city: 'Ankara',
    stadiumFictional: 'Ankara 19 Mayıs Park',
    stadiumReal: 'Eryaman Stadyumu',
    capacity: 20000,
    primary: '#DC2626',
    secondary: '#111827',
    accent: '#FFFFFF',
    pattern: 'HALVES',
    emblemType: 'WINDMILL',
    crestShape: 'SHIELD',
    stars: 0,
    foundedYear: 1923,
    budget: 2200000,
    wageCap: 395000,
    rep: 67,
    expectation: 'Süper Ligde Kalma Mücadelesi',
    formation: '4-4-2',
    roster: [
      ['G. Akkan', 'Gökhan Akkan', 31, 'TUR', 'GK', 73, 74, 1],
      ['A. Dursun', 'Abdurrahim Dursun', 27, 'TUR', 'LB', 71, 73, 3],
      ['D. Goutas', 'Dimitrios Goutas', 32, 'GRE', 'CB', 74, 74, 4],
      ['T. Kelven', 'Thalisson Kelven', 28, 'BRA', 'CB', 72, 74, 5],
      ['P. Pereira', 'Pedro Pereira', 28, 'POR', 'RB', 73, 74, 2],
      ['C. Niasse', 'Cheikh Niasse', 26, 'SEN', 'CDM', 73, 77, 6],
      ['S. Uçan', 'Salih Uçan', 32, 'TUR', 'CM', 74, 74, 8],
      ['F. Tongya', 'Franco Tongya', 24, 'ITA', 'LW', 73, 79, 11],
      ['M. Mimaroğ', 'Metehan Mimaroğlu', 32, 'TUR', 'RW', 72, 72, 7],
      ['S. Koïta', 'Sékou Koïta', 26, 'MLI', 'ST', 75, 79, 9],
      ['A. Gaúcho', 'Amilton', 36, 'BRA', 'ST', 71, 71, 17],
      ['P. Etebo', 'Peter Etebo', 30, 'NGA', 'CM', 72, 72, 16],
      ['R. Luís', 'Rafael Luís', 21, 'POR', 'CM', 70, 81, 20],
      ['M. Baltacı', 'Metehan Baltacı', 23, 'TUR', 'CB', 72, 78, 90],
      ['F. Üzüm', 'Fıratcan Üzüm', 27, 'TUR', 'RB', 70, 72, 22],
      ['B. Çukurcu', 'Berk Çukurcu', 22, 'TUR', 'GK', 67, 74, 23],
      ['M. Yatabaré', 'Mustapha Yatabaré', 40, 'MLI', 'ST', 69, 69, 99],
      ['Y. Güçlü', 'Yasin Güreler', 25, 'TUR', 'LB', 70, 74, 15],
      ['B. Özkan', 'Buğra Çağıran', 31, 'TUR', 'CDM', 71, 71, 14],
      ['K. Karataş', 'Kazımcan Karataş', 23, 'TUR', 'LB', 71, 79, 88],
    ],
  },
  {
    id: 'koc',
    fictionalName: 'Marmara Körfez JK',
    realName: 'Kocaelispor',
    fictionalShort: 'MKJ',
    realShort: 'KOC',
    city: 'Kocaeli',
    stadiumFictional: 'İzmit Körfez Arena',
    stadiumReal: 'Kocaeli Stadyumu',
    capacity: 34829,
    primary: '#16A34A',
    secondary: '#0F172A',
    accent: '#FFFFFF',
    pattern: 'STRIPES',
    emblemType: 'CHIMNEY',
    crestShape: 'SHIELD',
    stars: 0,
    foundedYear: 1966,
    budget: 2900000,
    wageCap: 480000,
    rep: 68,
    expectation: 'Taraftar Desteğiyle Ligde Kalıcılık',
    formation: '4-2-3-1',
    roster: [
      ['A. Jovanović', 'Aleksandar Jovanović', 33, 'SRB', 'GK', 75, 75, 1],
      ['M. Haïdara', 'Massadio Haïdara', 33, 'MLI', 'LB', 73, 73, 3],
      ['M. Maglica', 'Matej Maglica', 27, 'CRO', 'CB', 73, 76, 4],
      ['E. Ortakaya', 'Emir Ortakaya', 22, 'TUR', 'CB', 72, 81, 5],
      ['A. Oğuz', 'Ahmet Oğuz', 33, 'TUR', 'RB', 72, 72, 2],
      ['M. Cafumana', 'Show', 27, 'ANG', 'CDM', 74, 76, 6],
      ['B. Kutlu', 'Berkan Kutlu', 28, 'TUR', 'CM', 75, 76, 18],
      ['T. Gulliksen', 'Tobias Gulliksen', 23, 'NOR', 'CAM', 74, 82, 10],
      ['D. Agyei', 'Dan Agyei', 29, 'ENG', 'LW', 73, 74, 11],
      ['M. Baku', 'Makana Baku', 28, 'GER', 'RW', 73, 74, 7],
      ['B. Petković', 'Bruno Petković', 31, 'CRO', 'ST', 78, 78, 9],
      ['F. Ayé', 'Florian Ayé', 29, 'FRA', 'ST', 74, 75, 19],
      ['A. Dijksteel', 'Anfernee Dijksteel', 29, 'SUR', 'RB', 72, 73, 22],
      ['T. Zoukrou', 'Tanguy Zoukrou', 23, 'FRA', 'CB', 71, 78, 15],
      ['M. Susoho', 'Mahamadou Susoho', 21, 'ESP', 'CM', 70, 80, 24],
      ['O. Piri', 'Onurcan Piri', 32, 'TUR', 'GK', 70, 70, 35],
      ['R. Mendes', 'Ryan Mendes', 36, 'CPV', 'LW', 72, 72, 17],
      ['P. Cihat', 'Cihat Çelik', 30, 'TUR', 'CDM', 71, 71, 8],
      ['B. Gedik', 'Burak Öksüz', 30, 'TUR', 'CB', 70, 71, 41],
      ['G. Değirmenci', 'Gökhan Değirmenci', 37, 'TUR', 'GK', 69, 69, 34],
    ],
  },
  {
    id: 'amd',
    fictionalName: 'Dicle Sur FK',
    realName: 'Amed Sportif',
    fictionalShort: 'DSF',
    realShort: 'AMD',
    city: 'Diyarbakır',
    stadiumFictional: 'Mezopotamya Stadyumu',
    stadiumReal: 'Diyarbakır Stadyumu',
    capacity: 33000,
    primary: '#15803D',
    secondary: '#DC2626',
    accent: '#FFFFFF',
    pattern: 'HALVES',
    emblemType: 'STAR_GREEN',
    crestShape: 'CIRCLE',
    stars: 0,
    foundedYear: 1972,
    budget: 2350000,
    wageCap: 415000,
    rep: 67,
    expectation: 'Yeni Çıkan Takım — Süper Ligde Kalma',
    formation: '4-2-3-1',
    roster: [
      ['A. Lafont', 'Alban Lafont', 27, 'FRA', 'GK', 76, 80, 1],
      ['Ö. Ali', 'Ömer Bayramlı', 27, 'TUR', 'LB', 70, 72, 3],
      ['D. Bates', 'David Bates', 29, 'SCO', 'CB', 73, 74, 4],
      ['M. Yeşil', 'Mehmet Yeşil', 28, 'TUR', 'CB', 72, 74, 5],
      ['M. Uçar', 'Murat Uçar', 35, 'TUR', 'RB', 71, 71, 2],
      ['A. Raveloson', 'Rayan Raveloson', 29, 'MAD', 'CDM', 74, 75, 6],
      ['S. Cassubie', 'Yohan Cassubie', 25, 'FRA', 'CM', 72, 76, 8],
      ['D. Sabia', 'Diaa Sabi\'a', 33, 'ISR', 'CAM', 74, 74, 10],
      ['A. Traoré', 'Adama Traoré', 31, 'MLI', 'LW', 73, 73, 7],
      ['Y. Ceylan', 'Yılmaz Ceylan', 27, 'TUR', 'RW', 72, 74, 11],
      ['G. Orban', 'Gift Orban', 24, 'NGA', 'ST', 76, 82, 9],
      ['M. Diagne', 'Mbaye Diagne', 34, 'SEN', 'ST', 74, 74, 99],
      ['V. Çetin', 'Veli Çetin', 31, 'TUR', 'CB', 70, 70, 21],
      ['B. Gradel', 'Max Gradel', 38, 'CIV', 'LW', 71, 71, 17],
      ['O. Çek', 'Özgür Çek', 35, 'TUR', 'LB', 69, 69, 33],
      ['N. Üner', 'Nurullah Aslan', 29, 'TUR', 'GK', 69, 71, 25],
      ['O. Louiserre', 'Bruno Louiserre', 28, 'FRA', 'CM', 72, 74, 14],
      ['U. Akyüz', 'Uğur Adem Gezer', 31, 'TUR', 'CB', 70, 70, 20],
      ['S. Yılmazer', 'Serkan Odabaşoğlu', 31, 'TUR', 'CDM', 70, 70, 21],
      ['B. Assombal', 'Britt Assombalonga', 33, 'COD', 'ST', 72, 72, 19],
    ],
  },
  {
    id: 'cor',
    fictionalName: 'Hitit Güneşi FK',
    realName: 'Arca Çorum FK',
    fictionalShort: 'HGF',
    realShort: 'ÇOR',
    city: 'Çorum',
    stadiumFictional: 'Anadolu Şehir Parkı',
    stadiumReal: 'Çorum Şehir Stadyumu',
    capacity: 15000,
    primary: '#DC2626',
    secondary: '#18181B',
    accent: '#FACC15',
    pattern: 'CHEVRON',
    emblemType: 'CASTLE',
    crestShape: 'HEX',
    stars: 0,
    foundedYear: 1997,
    budget: 2150000,
    wageCap: 390000,
    rep: 66,
    expectation: 'Tarihi İlk Sezon — Kümede Kalma',
    formation: '4-2-3-1',
    roster: [
      ['E. Erentürk', 'Erhan Erentürk', 31, 'TUR', 'GK', 72, 73, 1],
      ['S. Borza', 'Sebastian Borza', 20, 'ROU', 'LB', 72, 81, 3],
      ['H. Smolčić', 'Hrvoje Smolčić', 26, 'CRO', 'CB', 74, 78, 4],
      ['A. Penetra', 'Alexandre Penetra', 24, 'POR', 'CB', 74, 80, 5],
      ['G. Sazdağı', 'Gökhan Sazdağı', 31, 'TUR', 'RB', 73, 73, 2],
      ['Y. Ramadani', 'Ylber Ramadani', 30, 'ALB', 'CDM', 74, 74, 6],
      ['M. Diomande', 'Mohamed Diomande', 24, 'CIV', 'CM', 74, 80, 8],
      ['A. Kyziridis', 'Alexandros Kyziridis', 25, 'GRE', 'CAM', 72, 77, 10],
      ['A. Ildız', 'Ahmet Ildız', 29, 'TUR', 'CM', 71, 72, 14],
      ['C. Ünder', 'Cengiz Ünder', 29, 'TUR', 'RW', 77, 78, 17],
      ['Y. Moukoko', 'Youssoufa Moukoko', 21, 'GER', 'ST', 76, 84, 9],
      ['J. Ramirez', 'Jesus Ramirez', 28, 'VEN', 'ST', 72, 73, 19],
      ['A. Şengül', 'Arda Şengül', 22, 'TUR', 'LB', 69, 77, 23],
      ['F. Bal', 'Fredy', 36, 'ANG', 'CM', 72, 72, 16],
      ['E. Karaağaç', 'Erkan Kaş', 34, 'TUR', 'CB', 69, 69, 15],
      ['H. Akınay', 'Hasan Hüseyin Akınay', 32, 'TUR', 'GK', 68, 68, 34],
      ['F. Geraldo', 'Geraldo', 34, 'ANG', 'LW', 71, 71, 7],
      ['T. Verheydt', 'Thomas Verheydt', 34, 'NED', 'ST', 71, 71, 90],
      ['K. Nal', 'Kerem Kalafat', 25, 'TUR', 'RB', 70, 74, 22],
      ['L. Landre', 'Loïck Landre', 34, 'FRA', 'CB', 70, 70, 12],
    ],
  },
  {
    id: 'erz',
    fictionalName: 'Palandöken Mavi FK',
    realName: 'Erzurumspor FK',
    fictionalShort: 'PMF',
    realShort: 'ERZ',
    city: 'Erzurum',
    stadiumFictional: 'Dadaşlar Arena',
    stadiumReal: 'Kâzım Karabekir Stadyumu',
    capacity: 21374,
    primary: '#0284C7',
    secondary: '#F8FAFC',
    accent: '#0F172A',
    pattern: 'STRIPES',
    emblemType: 'SNOW_PEAK',
    crestShape: 'SHIELD',
    stars: 0,
    foundedYear: 2005,
    budget: 1900000,
    wageCap: 365000,
    rep: 66,
    expectation: 'Yüksek Rakım Avantajıyla Ligde Kalma',
    formation: '4-4-2',
    roster: [
      ['M. Orbanić', 'Matija Orbanić', 26, 'CRO', 'GK', 72, 76, 1],
      ['G. Giorbel', 'Guram Giorbelidze', 30, 'GEO', 'LB', 71, 72, 3],
      ['N. Mujakić', 'Nihad Mujakić', 28, 'BIH', 'CB', 73, 75, 4],
      ['M. Yumlu', 'Mustafa Yumlu', 38, 'TUR', 'CB', 70, 70, 22],
      ['F. Ebosele', 'Festy Ebosele', 24, 'IRL', 'RB', 74, 80, 2],
      ['E. Owusu', 'Elisha Owusu', 28, 'GHA', 'CDM', 73, 75, 6],
      ['B. Baiye', 'Brandon Baiye', 25, 'BEL', 'CM', 72, 77, 8],
      ['M. Rodríguez', 'Martin Rodríguez', 32, 'CHI', 'LW', 73, 73, 11],
      ['G. Kerk', 'Gyrano Kerk', 30, 'SUR', 'RW', 74, 74, 7],
      ['I. Diabate', 'Ibrahim Diabate', 26, 'CIV', 'ST', 73, 77, 9],
      ['E. Tozlu', 'Eren Tozlu', 35, 'TUR', 'ST', 71, 71, 10],
      ['N. Akhundz', 'Nariman Akhundzada', 22, 'AZE', 'RW', 71, 80, 17],
      ['L. Agyekum', 'Lawrence Agyekum', 22, 'GHA', 'CM', 71, 79, 14],
      ['S. Akgün', 'Sefa Akgün', 26, 'TUR', 'CM', 70, 73, 25],
      ['O. Ovacıklı', 'Orhan Ovacıklı', 37, 'TUR', 'RB', 69, 69, 53],
      ['A. Gerxhaliu', 'Amar Gerxhaliu', 24, 'ALB', 'CB', 70, 75, 15],
      ['T. Roshi', 'Odise Roshi', 35, 'ALB', 'RW', 70, 70, 21],
      ['G. Crociata', 'Giovanni Crociata', 29, 'ITA', 'CM', 71, 72, 18],
      ['F. Atakan', 'Furkan Özhan', 26, 'TUR', 'CAM', 69, 73, 20],
      ['G. Göktuğ', 'Göktuğ Bakırbaş', 30, 'TUR', 'GK', 69, 70, 13],
    ],
  },
];

export interface LeagueZoneRule {
  fromRank: number;
  toRank: number;
  color: string;
  labelTr: string;
  labelEn: string;
}

export interface LeagueMeta {
  id: LeagueId;
  name: string;
  shortName: string;
  countryTr: string;
  countryEn: string;
  teams: number;
  weeks: number;
  fixturesCount: number;
  accentColor: string;
  marketScale: number;
  zones: LeagueZoneRule[];
}

export const LEAGUE_CATALOG: LeagueMeta[] = [
  {
    id: 'SUPER_LIG',
    name: 'Trendyol Süper Lig',
    shortName: 'Süper Lig',
    countryTr: 'Türkiye · 1. Kademe',
    countryEn: 'Türkiye · Tier 1',
    teams: 18,
    weeks: 34,
    fixturesCount: 306,
    accentColor: '#b7ff4a',
    marketScale: 1.0,
    zones: [
      { fromRank: 1, toRank: 2, color: '#b7ff4a', labelTr: '1–2: UEFA Şampiyonlar Ligi', labelEn: '1–2: UEFA Champions League' },
      { fromRank: 3, toRank: 4, color: '#00e5ff', labelTr: '3–4: Avrupa Ligi / Konferans', labelEn: '3–4: UEL / UECL' },
      { fromRank: 16, toRank: 18, color: '#f87171', labelTr: '16–18: Trendyol 1. Lig’e Düşme', labelEn: '16–18: Relegation' },
    ],
  },
  {
    id: 'TR_1_LIG',
    name: 'Trendyol 1. Lig',
    shortName: '1. Lig',
    countryTr: 'Türkiye · 2. Kademe',
    countryEn: 'Türkiye · Tier 2',
    teams: 20,
    weeks: 38,
    fixturesCount: 380,
    accentColor: '#f5b82e',
    marketScale: 0.55,
    zones: [
      { fromRank: 1, toRank: 2, color: '#b7ff4a', labelTr: '1–2: Doğrudan Süper Lig', labelEn: '1–2: Direct Promotion' },
      { fromRank: 3, toRank: 7, color: '#00e5ff', labelTr: '3–7: Yükselme Play-Off', labelEn: '3–7: Promotion Play-Off' },
      { fromRank: 17, toRank: 20, color: '#f87171', labelTr: '17–20: Nesine 2. Lig’e Düşme', labelEn: '17–20: Relegation' },
    ],
  },
  {
    id: 'TR_2_LIG_BEYAZ',
    name: 'Nesine 2. Lig Beyaz Grup',
    shortName: '2. Lig Beyaz',
    countryTr: 'Türkiye · 3. Kademe',
    countryEn: 'Türkiye · Tier 3',
    teams: 18,
    weeks: 34,
    fixturesCount: 306,
    accentColor: '#e2e8f0',
    marketScale: 0.35,
    zones: [
      { fromRank: 1, toRank: 1, color: '#b7ff4a', labelTr: '1: Doğrudan 1. Lig’e Yükselme', labelEn: '1: Direct Promotion' },
      { fromRank: 2, toRank: 6, color: '#00e5ff', labelTr: '2–6: Yükselme Play-Off', labelEn: '2–6: Promotion Play-Off' },
      { fromRank: 15, toRank: 18, color: '#f87171', labelTr: '15–18: 3. Lig’e Düşme Hattı', labelEn: '15–18: Relegation' },
    ],
  },
  {
    id: 'TR_2_LIG_KIRMIZI',
    name: 'Nesine 2. Lig Kırmızı Grup',
    shortName: '2. Lig Kırmızı',
    countryTr: 'Türkiye · 3. Kademe',
    countryEn: 'Türkiye · Tier 3',
    teams: 18,
    weeks: 34,
    fixturesCount: 306,
    accentColor: '#fb7185',
    marketScale: 0.35,
    zones: [
      { fromRank: 1, toRank: 1, color: '#b7ff4a', labelTr: '1: Doğrudan 1. Lig’e Yükselme', labelEn: '1: Direct Promotion' },
      { fromRank: 2, toRank: 6, color: '#00e5ff', labelTr: '2–6: Yükselme Play-Off', labelEn: '2–6: Promotion Play-Off' },
      { fromRank: 15, toRank: 18, color: '#f87171', labelTr: '15–18: 3. Lig’e Düşme Hattı', labelEn: '15–18: Relegation' },
    ],
  },
  {
    id: 'PREMIER_LEAGUE',
    name: 'Premier League',
    shortName: 'Premier League',
    countryTr: 'İngiltere · 1. Kademe',
    countryEn: 'England · Tier 1',
    teams: 20,
    weeks: 38,
    fixturesCount: 380,
    accentColor: '#00e5ff',
    marketScale: 1.55,
    zones: [
      { fromRank: 1, toRank: 4, color: '#b7ff4a', labelTr: '1–4: UEFA Şampiyonlar Ligi', labelEn: '1–4: UEFA Champions League' },
      { fromRank: 5, toRank: 6, color: '#00e5ff', labelTr: '5–6: UEL / Konferans Ligi', labelEn: '5–6: UEL / UECL' },
      { fromRank: 18, toRank: 20, color: '#f87171', labelTr: '18–20: EFL Championship', labelEn: '18–20: Relegation' },
    ],
  },
  {
    id: 'LA_LIGA',
    name: 'EA Sports La Liga',
    shortName: 'La Liga',
    countryTr: 'İspanya · 1. Kademe',
    countryEn: 'Spain · Tier 1',
    teams: 20,
    weeks: 38,
    fixturesCount: 380,
    accentColor: '#f5b82e',
    marketScale: 1.38,
    zones: [
      { fromRank: 1, toRank: 4, color: '#b7ff4a', labelTr: '1–4: UEFA Şampiyonlar Ligi', labelEn: '1–4: UEFA Champions League' },
      { fromRank: 5, toRank: 6, color: '#00e5ff', labelTr: '5–6: Avrupa / Konferans Ligi', labelEn: '5–6: UEL / UECL' },
      { fromRank: 18, toRank: 20, color: '#f87171', labelTr: '18–20: La Liga Hypermotion', labelEn: '18–20: Relegation' },
    ],
  },
  {
    id: 'SERIE_A',
    name: 'Serie A Enilive',
    shortName: 'Serie A',
    countryTr: 'İtalya · 1. Kademe',
    countryEn: 'Italy · Tier 1',
    teams: 20,
    weeks: 38,
    fixturesCount: 380,
    accentColor: '#38bdf8',
    marketScale: 1.28,
    zones: [
      { fromRank: 1, toRank: 4, color: '#b7ff4a', labelTr: '1–4: UEFA Şampiyonlar Ligi', labelEn: '1–4: UEFA Champions League' },
      { fromRank: 5, toRank: 6, color: '#00e5ff', labelTr: '5–6: UEL / Konferans Ligi', labelEn: '5–6: UEL / UECL' },
      { fromRank: 18, toRank: 20, color: '#f87171', labelTr: '18–20: Serie BKT Düşme', labelEn: '18–20: Serie B Relegation' },
    ],
  },
  {
    id: 'BUNDESLIGA',
    name: 'Bundesliga',
    shortName: 'Bundesliga',
    countryTr: 'Almanya · 1. Kademe',
    countryEn: 'Germany · Tier 1',
    teams: 18,
    weeks: 34,
    fixturesCount: 306,
    accentColor: '#ef4444',
    marketScale: 1.25,
    zones: [
      { fromRank: 1, toRank: 4, color: '#b7ff4a', labelTr: '1–4: UEFA Şampiyonlar Ligi', labelEn: '1–4: UEFA Champions League' },
      { fromRank: 5, toRank: 6, color: '#00e5ff', labelTr: '5–6: UEL / Konferans Ligi', labelEn: '5–6: UEL / UECL' },
      { fromRank: 16, toRank: 18, color: '#f87171', labelTr: '16–18: 2. Bundesliga Play-Out / Düşme', labelEn: '16–18: Relegation Play-Out / Drop' },
    ],
  },
  {
    id: 'LIGUE_1',
    name: 'Ligue 1',
    shortName: 'Ligue 1',
    countryTr: 'Fransa · 1. Kademe',
    countryEn: 'France · Tier 1',
    teams: 18,
    weeks: 34,
    fixturesCount: 306,
    accentColor: '#38bdf8',
    marketScale: 1.05,
    zones: [
      { fromRank: 1, toRank: 3, color: '#b7ff4a', labelTr: '1–3: Şampiyonlar Ligi', labelEn: '1–3: UEFA Champions League' },
      { fromRank: 4, toRank: 6, color: '#00e5ff', labelTr: '4–6: UCL Elemeleri / UEL / UECL', labelEn: '4–6: UCL Qual / UEL / UECL' },
      { fromRank: 16, toRank: 18, color: '#f87171', labelTr: '16–18: Play-Out / Ligue 2', labelEn: '16–18: Relegation Play-Out / Drop' },
    ],
  },
  {
    id: 'EREDIVISIE',
    name: 'Eredivisie',
    shortName: 'Eredivisie',
    countryTr: 'Hollanda · 1. Kademe',
    countryEn: 'Netherlands · Tier 1',
    teams: 18,
    weeks: 34,
    fixturesCount: 306,
    accentColor: '#fb923c',
    marketScale: 0.78,
    zones: [
      { fromRank: 1, toRank: 2, color: '#b7ff4a', labelTr: '1–2: Şampiyonlar Ligi', labelEn: '1–2: UEFA Champions League' },
      { fromRank: 3, toRank: 5, color: '#00e5ff', labelTr: '3–5: UCL Elemeleri / UEL / UECL', labelEn: '3–5: European Spots' },
      { fromRank: 16, toRank: 18, color: '#f87171', labelTr: '16–18: Play-Out / Düşme', labelEn: '16–18: Relegation' },
    ],
  },
  {
    id: 'LIGA_PORTUGAL',
    name: 'Liga Portugal',
    shortName: 'Liga Portugal',
    countryTr: 'Portekiz · 1. Kademe',
    countryEn: 'Portugal · Tier 1',
    teams: 18,
    weeks: 34,
    fixturesCount: 306,
    accentColor: '#34d399',
    marketScale: 0.8,
    zones: [
      { fromRank: 1, toRank: 2, color: '#b7ff4a', labelTr: '1–2: Şampiyonlar Ligi', labelEn: '1–2: UEFA Champions League' },
      { fromRank: 3, toRank: 5, color: '#00e5ff', labelTr: '3–5: UEL / Konferans Ligi', labelEn: '3–5: UEL / UECL' },
      { fromRank: 16, toRank: 18, color: '#f87171', labelTr: '16–18: Play-Out / Düşme', labelEn: '16–18: Relegation' },
    ],
  },
  {
    id: 'BELGIAN_PRO_LEAGUE',
    name: 'Belgian Pro League',
    shortName: 'Pro League',
    countryTr: 'Belçika · 1. Kademe',
    countryEn: 'Belgium · Tier 1',
    teams: 16,
    weeks: 30,
    fixturesCount: 240,
    accentColor: '#facc15',
    marketScale: 0.72,
    zones: [
      { fromRank: 1, toRank: 2, color: '#b7ff4a', labelTr: '1–2: Şampiyonlar Ligi', labelEn: '1–2: UEFA Champions League' },
      { fromRank: 3, toRank: 5, color: '#00e5ff', labelTr: '3–5: UEL / Konferans Ligi', labelEn: '3–5: UEL / UECL' },
      { fromRank: 14, toRank: 16, color: '#f87171', labelTr: '14–16: Düşme Hattı', labelEn: '14–16: Relegation Zone' },
    ],
  },
  {
    id: 'EFL_CHAMPIONSHIP',
    name: 'EFL Championship',
    shortName: 'Championship',
    countryTr: 'İngiltere · 2. Kademe',
    countryEn: 'England · Tier 2',
    teams: 24,
    weeks: 46,
    fixturesCount: 552,
    accentColor: '#60a5fa',
    marketScale: 0.65,
    zones: [
      { fromRank: 1, toRank: 2, color: '#b7ff4a', labelTr: '1–2: Doğrudan Premier League', labelEn: '1–2: Automatic Promotion' },
      { fromRank: 3, toRank: 6, color: '#00e5ff', labelTr: '3–6: Wembley Yükselme Play-Off', labelEn: '3–6: Promotion Play-Offs' },
      { fromRank: 22, toRank: 24, color: '#f87171', labelTr: '22–24: EFL League One Düşme', labelEn: '22–24: Relegation to League One' },
    ],
  },
];

export const ALL_LEAGUE_IDS: LeagueId[] = LEAGUE_CATALOG.map((l) => l.id);

export function getLeagueMeta(leagueId: LeagueId): LeagueMeta {
  return LEAGUE_CATALOG.find((l) => l.id === leagueId) ?? LEAGUE_CATALOG[0];
}

export function getLeagueLabel(leagueId: LeagueId): string {
  return getLeagueMeta(leagueId).name;
}

function buildClubFromGenericSeed(seed: PremierClubSeed, leagueId: LeagueId): Club {
  const players = seed.roster.map((p, pIdx) =>
    makePlayer(
      `${seed.id}_p${pIdx}`,
      p[0],
      p[1],
      p[2],
      p[3],
      p[4],
      p[5],
      p[6],
      p[7],
      seed.foundedYear + pIdx * 13 + seed.rep
    )
  );
  const totalWages = players.reduce((s, p) => s + p.weeklyWage, 0);
  const hardcoreWageCap = Math.max(seed.wageCap, Math.round((totalWages * 1.18) / 1000) * 1000);

  return {
    id: seed.id,
    leagueId,
    fictionalName: seed.fictionalName,
    realName: seed.realName,
    fictionalShort: seed.fictionalShort,
    realShort: seed.realShort,
    city: seed.city,
    stadiumFictional: seed.stadiumFictional,
    stadiumReal: seed.stadiumReal,
    stadiumCapacity: seed.capacity,
    primaryColor: seed.primary,
    secondaryColor: seed.secondary,
    accentColor: seed.accent,
    kitPattern: seed.pattern,
    emblemType: seed.emblemType,
    crestShape: seed.crestShape,
    stars: seed.stars,
    foundedYear: seed.foundedYear,
    realBadgeUrl: '',
    realKitUrl: '',
    transferBudget: seed.budget,
    wageBudgetWeekly: hardcoreWageCap,
    cashBalance: Math.round(seed.budget * 1.55),
    reputation: seed.rep,
    boardExpectation: seed.expectation,
    boardConfidence: 74,
    preferredFormation: seed.formation,
    players,
  };
}

export function createClubsForLeague(leagueId: LeagueId): Club[] {
  if (leagueId === 'PREMIER_LEAGUE') {
    return buildPremierLeagueClubs(makePlayer);
  }
  if (leagueId === 'LA_LIGA') {
    return buildLaLigaClubs(makePlayer);
  }
  if (leagueId === 'SERIE_A') {
    return buildSerieAClubs(makePlayer);
  }
  if (leagueId === 'BUNDESLIGA') {
    return buildBundesligaClubs(makePlayer);
  }
  if (leagueId === 'LIGUE_1') {
    return buildLigue1Clubs(buildClubFromGenericSeed);
  }
  if (leagueId === 'EREDIVISIE') {
    return buildEredivisieClubs(buildClubFromGenericSeed);
  }
  if (leagueId === 'LIGA_PORTUGAL') {
    return buildLigaPortugalClubs(buildClubFromGenericSeed);
  }
  if (leagueId === 'BELGIAN_PRO_LEAGUE') {
    return buildBelgianProLeagueClubs(buildClubFromGenericSeed);
  }
  if (leagueId === 'EFL_CHAMPIONSHIP') {
    return buildChampionshipClubs(makePlayer);
  }
  if (leagueId === 'TR_1_LIG') {
    return buildTurkey1LigClubs(makePlayer);
  }
  if (leagueId === 'TR_2_LIG_BEYAZ') {
    return buildTurkey2LigBeyazClubs(makePlayer);
  }
  if (leagueId === 'TR_2_LIG_KIRMIZI') {
    return buildTurkey2LigKirmiziClubs(makePlayer);
  }
  return CLUB_SEEDS.map((seed, cIdx) => {
    const players = seed.roster.map((p, pIdx) =>
      makePlayer(
        `${seed.id}_p${pIdx}`,
        p[0],
        p[1],
        p[2],
        p[3],
        p[4],
        p[5],
        p[6],
        p[7],
        cIdx * 31 + pIdx * 7 + 3
      )
    );
    const totalWages = players.reduce((s, p) => s + p.weeklyWage, 0);
    const hardcoreWageCap = Math.max(seed.wageCap, Math.round((totalWages * 1.18) / 1000) * 1000);

    return {
      id: seed.id,
      leagueId: 'SUPER_LIG',
      fictionalName: seed.fictionalName,
      realName: seed.realName,
      fictionalShort: seed.fictionalShort,
      realShort: seed.realShort,
      city: seed.city,
      stadiumFictional: seed.stadiumFictional,
      stadiumReal: seed.stadiumReal,
      stadiumCapacity: seed.capacity,
      primaryColor: seed.primary,
      secondaryColor: seed.secondary,
      accentColor: seed.accent,
      kitPattern: seed.pattern,
      emblemType: seed.emblemType,
      crestShape: seed.crestShape,
      stars: seed.stars,
      foundedYear: seed.foundedYear,
      realBadgeUrl: '',
      realKitUrl: '',
      transferBudget: seed.budget,
      wageBudgetWeekly: hardcoreWageCap,
      cashBalance: seed.budget * 2.1,
      reputation: seed.rep,
      boardExpectation: seed.expectation,
      boardConfidence: 68,
      preferredFormation: seed.formation,
      players,
    };
  });
}

export function createInitialClubs(): Club[] {
  return createClubsForLeague('SUPER_LIG');
}

export function createTransferMarketPool(leagueId: LeagueId = 'SUPER_LIG'): MarketListing[] {
  const leagueClubs = createClubsForLeague(leagueId);
  const existingNames = new Set(leagueClubs.flatMap((c) => c.players.map((p) => p.realName)));
  const leagueScale = getLeagueMeta(leagueId).marketScale;

  const transferTargets: Array<{
    clubId: string;
    fictional: string;
    real: string;
    age: number;
    nat: string;
    role: PlayerRole;
    ovr: number;
    pot: number;
    num: number;
  }> = [
    { clubId: 'gs', fictional: 'E. İlkhan', real: 'Emirhan İlkhan', age: 22, nat: 'TUR', role: 'CM', ovr: 74, pot: 83, num: 16 },
    { clubId: 'fb', fictional: 'B. Elmaz', real: 'Bartuğ Elmaz', age: 23, nat: 'TUR', role: 'CDM', ovr: 74, pot: 82, num: 28 },
    { clubId: 'bjk', fictional: 'M. Hekimoğlu', real: 'Mustafa Hekimoğlu', age: 19, nat: 'TUR', role: 'ST', ovr: 72, pot: 85, num: 91 },
    { clubId: 'ts', fictional: 'P. Poyraz', real: 'Poyraz Yıldırım', age: 21, nat: 'TUR', role: 'ST', ovr: 71, pot: 82, num: 94 },
    { clubId: 'goz', fictional: 'E. Doğan', real: 'Emre Bilgin', age: 22, nat: 'TUR', role: 'GK', ovr: 72, pot: 80, num: 12 },
    { clubId: 'sam', fictional: 'Y. Akçiçek', real: 'Yusuf Akçiçek', age: 20, nat: 'TUR', role: 'CB', ovr: 74, pot: 84, num: 95 },
    { clubId: 'bfk', fictional: 'C. Uzun', real: 'Can Uzun', age: 20, nat: 'TUR', role: 'CAM', ovr: 77, pot: 86, num: 10 },
    { clubId: 'gs', fictional: 'K. Yıldızcı', real: 'Kenan Yıldız', age: 21, nat: 'TUR', role: 'LW', ovr: 81, pot: 90, num: 10 },
    { clubId: 'fb', fictional: 'F. Kadıoğlu', real: 'Ferdi Kadıoğlu', age: 26, nat: 'TUR', role: 'LB', ovr: 81, pot: 84, num: 20 },
    { clubId: 'gs', fictional: 'A. Güler', real: 'Arda Güler', age: 21, nat: 'TUR', role: 'CAM', ovr: 82, pot: 91, num: 15 },
    { clubId: 'bjk', fictional: 'H. Çalhan', real: 'Hakan Çalhanoğlu', age: 32, nat: 'TUR', role: 'CDM', ovr: 85, pot: 85, num: 20 },
    { clubId: 'ts', fictional: 'Z. Çelik', real: 'Zeki Çelik', age: 29, nat: 'TUR', role: 'RB', ovr: 77, pot: 78, num: 19 },
    { clubId: 'fb', fictional: 'M. Demiral', real: 'Merih Demiral', age: 28, nat: 'TUR', role: 'CB', ovr: 79, pot: 80, num: 3 },
    { clubId: 'gs', fictional: 'O. Kabak', real: 'Ozan Kabak', age: 26, nat: 'TUR', role: 'CB', ovr: 77, pot: 81, num: 5 },
    { clubId: 'bfk', fictional: 'E. Ünal', real: 'Enes Ünal', age: 29, nat: 'TUR', role: 'ST', ovr: 78, pot: 79, num: 9 },
    { clubId: 'bjk', fictional: 'A. Bayındır', real: 'Altay Bayındır', age: 28, nat: 'TUR', role: 'GK', ovr: 77, pot: 79, num: 1 },
    { clubId: 'riz', fictional: 'T. Cardoso', real: 'Tiago Santos', age: 24, nat: 'POR', role: 'RB', ovr: 77, pot: 83, num: 22 },
    { clubId: 'aln', fictional: 'D. Huijsen', real: 'Dean Huijsen', age: 21, nat: 'ESP', role: 'CB', ovr: 79, pot: 88, num: 2 },
    { clubId: 'eyp', fictional: 'J. Hato', real: 'Jorrel Hato', age: 20, nat: 'NED', role: 'CB', ovr: 78, pot: 88, num: 4 },
    { clubId: 'kon', fictional: 'M. Kerkez', real: 'Milos Kerkez', age: 22, nat: 'HUN', role: 'LB', ovr: 80, pot: 86, num: 3 },
    { clubId: 'kas', fictional: 'S. Savio', real: 'Savinho', age: 22, nat: 'BRA', role: 'RW', ovr: 82, pot: 89, num: 26 },
    { clubId: 'gfk', fictional: 'M. Zubimendi', real: 'Martín Zubimendi', age: 27, nat: 'ESP', role: 'CDM', ovr: 84, pot: 86, num: 4 },
    { clubId: 'koc', fictional: 'B. Sesko', real: 'Benjamin Šeško', age: 23, nat: 'SVN', role: 'ST', ovr: 82, pot: 88, num: 30 },
    { clubId: 'sam', fictional: 'D. Costa', real: 'Diogo Costa', age: 26, nat: 'POR', role: 'GK', ovr: 85, pot: 88, num: 99 },
    { clubId: 'goz', fictional: 'T. Reijnders', real: 'Tijjani Reijnders', age: 28, nat: 'NED', role: 'CM', ovr: 83, pot: 85, num: 14 },
    // Lower-league & Serie A accessible targets
    { clubId: 'tr1_bur', fictional: 'Y. Kurtuluş', real: 'Yunus Emre Konak', age: 20, nat: 'TUR', role: 'CDM', ovr: 72, pot: 84, num: 18 },
    { clubId: 'tr1_ant', fictional: 'B. Karaca-T', real: 'Bünyamin Yardımcı', age: 21, nat: 'TUR', role: 'CM', ovr: 68, pot: 79, num: 24 },
    { clubId: 'tr2b_elz', fictional: 'E. Demir-M', real: 'Efe Sarıkaya', age: 20, nat: 'TUR', role: 'CB', ovr: 67, pot: 80, num: 4 },
    { clubId: 'tr2k_ag', fictional: 'A. Kılıç-M', real: 'Arda Süne', age: 21, nat: 'TUR', role: 'LW', ovr: 66, pot: 78, num: 17 },
    { clubId: 'ita_int', fictional: 'G. Orban-I', real: 'Gift Orban', age: 24, nat: 'NGA', role: 'ST', ovr: 78, pot: 84, num: 20 },
    { clubId: 'ita_mil', fictional: 'L. Sucic', real: 'Luka Sučić', age: 24, nat: 'CRO', role: 'CM', ovr: 79, pot: 85, num: 24 },
    { clubId: 'gb', fictional: 'M. Guéhi', real: 'Marc Guéhi', age: 26, nat: 'ENG', role: 'CB', ovr: 82, pot: 85, num: 6 },
    { clubId: 'amd', fictional: 'J. Frimpong', real: 'Jeremie Frimpong', age: 25, nat: 'NED', role: 'RB', ovr: 84, pot: 86, num: 30 },
    { clubId: 'cor', fictional: 'N. Williams', real: 'Nico Williams', age: 24, nat: 'ESP', role: 'LW', ovr: 85, pot: 89, num: 11 },
    { clubId: 'erz', fictional: 'G. Mamard', real: 'G. Mamardashvili', age: 25, nat: 'GEO', role: 'GK', ovr: 84, pot: 88, num: 25 },
    { clubId: 'ts', fictional: 'R. Silva', real: 'Rafael Leão', age: 27, nat: 'POR', role: 'LW', ovr: 86, pot: 88, num: 10 },
    { clubId: 'ars', fictional: 'J. Musiala', real: 'Jamal Musiala', age: 23, nat: 'GER', role: 'CAM', ovr: 88, pot: 93, num: 42 },
    { clubId: 'che', fictional: 'A. Bastoni', real: 'Alessandro Bastoni', age: 27, nat: 'ITA', role: 'CB', ovr: 87, pot: 89, num: 95 },
    { clubId: 'liv', fictional: 'E. Camavinga', real: 'Eduardo Camavinga', age: 24, nat: 'FRA', role: 'CDM', ovr: 84, pot: 89, num: 6 },
    { clubId: 'mci', fictional: 'B. Barcola', real: 'Bradley Barcola', age: 24, nat: 'FRA', role: 'LW', ovr: 83, pot: 88, num: 29 },
    { clubId: 'mun', fictional: 'W. Zaire-Em', real: 'Warren Zaïre-Emery', age: 20, nat: 'FRA', role: 'CM', ovr: 82, pot: 90, num: 33 },
    { clubId: 'tot', fictional: 'A. Lookman', real: 'Ademola Lookman', age: 29, nat: 'NGA', role: 'RW', ovr: 83, pot: 84, num: 11 },
    { clubId: 'new', fictional: 'J. David', real: 'Jonathan David', age: 26, nat: 'CAN', role: 'ST', ovr: 82, pot: 85, num: 9 },
    { clubId: 'bha', fictional: 'K. Adeyemi', real: 'Karim Adeyemi', age: 24, nat: 'GER', role: 'RW', ovr: 80, pot: 85, num: 27 },
    { clubId: 'bou', fictional: 'F. Lopez', real: 'Fermín López', age: 23, nat: 'ESP', role: 'CAM', ovr: 80, pot: 86, num: 16 },
    { clubId: 'cry', fictional: 'A. Pavlovic', real: 'Aleksandar Pavlović', age: 22, nat: 'GER', role: 'CDM', ovr: 81, pot: 88, num: 45 },
    { clubId: 'eve', fictional: 'S. Omorodion', real: 'Samu Aghehowa', age: 22, nat: 'ESP', role: 'ST', ovr: 80, pot: 87, num: 9 },
    { clubId: 'ful', fictional: 'M. Kone', real: 'Manu Koné', age: 25, nat: 'FRA', role: 'CM', ovr: 80, pot: 84, num: 17 },
    // Bundesliga, Championship & Global Prospects
    { clubId: 'ger_fcb', fictional: 'T. Bischof', real: 'Tom Bischof', age: 21, nat: 'GER', role: 'CM', ovr: 78, pot: 87, num: 20 },
    { clubId: 'ger_bvb', fictional: 'J. Duranville', real: 'Julien Duranville', age: 20, nat: 'BEL', role: 'RW', ovr: 76, pot: 87, num: 16 },
    { clubId: 'ger_rbl', fictional: 'A. Nusa-M', real: 'Antonio Nusa', age: 21, nat: 'NOR', role: 'LW', ovr: 78, pot: 87, num: 7 },
    { clubId: 'ger_sge', fictional: 'H. Larsson-M', real: 'Hugo Larsson', age: 22, nat: 'SWE', role: 'CM', ovr: 80, pot: 87, num: 16 },
    { clubId: 'ger_vfb', fictional: 'E. Millot-M', real: 'Enzo Millot', age: 24, nat: 'FRA', role: 'CAM', ovr: 80, pot: 85, num: 8 },
    { clubId: 'ger_s04', fictional: 'M. Bulut-M', real: 'Taylan Bulut', age: 20, nat: 'GER', role: 'RB', ovr: 73, pot: 84, num: 31 },
    { clubId: 'chp_bur', fictional: 'L. Koleosho', real: 'Luca Koleosho', age: 21, nat: 'ITA', role: 'LW', ovr: 75, pot: 84, num: 30 },
    { clubId: 'chp_sou', fictional: 'T. Dibling-M', real: 'Tyler Dibling', age: 20, nat: 'ENG', role: 'RW', ovr: 76, pot: 86, num: 33 },
    { clubId: 'chp_mid', fictional: 'H. Hackney-M', real: 'Hayden Hackney', age: 24, nat: 'ENG', role: 'CM', ovr: 76, pot: 83, num: 7 },
    { clubId: 'chp_bir', fictional: 'K. Anderson-M', real: 'Keshi Anderson', age: 31, nat: 'ENG', role: 'LW', ovr: 72, pot: 72, num: 17 },
    { clubId: 'chp_wre', fictional: 'M. Cleworth-M', real: 'Max Cleworth', age: 24, nat: 'ENG', role: 'CB', ovr: 72, pot: 79, num: 4 },
    { clubId: 'tr1_bur', fictional: 'E. Çelik-M', real: 'Emirhan Çelik', age: 20, nat: 'TUR', role: 'CB', ovr: 68, pot: 79, num: 44 },
    { clubId: 'tr1_mar', fictional: 'M. Şen-M', real: 'Melih Şen', age: 22, nat: 'TUR', role: 'ST', ovr: 67, pot: 77, num: 19 },
    { clubId: 'ger_b04', fictional: 'J. Belocian-M', real: 'Jeanuel Belocian', age: 21, nat: 'FRA', role: 'CB', ovr: 75, pot: 84, num: 44 },
  ];

  const freeAgents: Array<{
    fictional: string;
    real: string;
    age: number;
    nat: string;
    role: PlayerRole;
    ovr: number;
    pot: number;
    num: number;
  }> = [
    { fictional: 'S. Ramosa', real: 'Sergio Ramos', age: 40, nat: 'ESP', role: 'CB', ovr: 76, pot: 76, num: 4 },
    { fictional: 'M. Depay', real: 'Memphis Depay', age: 32, nat: 'NED', role: 'ST', ovr: 78, pot: 78, num: 9 },
    { fictional: 'A. Rabiot', real: 'Adrien Rabiot', age: 31, nat: 'FRA', role: 'CM', ovr: 80, pot: 80, num: 25 },
    { fictional: 'K. Navas', real: 'Keylor Navas', age: 39, nat: 'CRC', role: 'GK', ovr: 76, pot: 76, num: 1 },
    { fictional: 'M. Hermoso', real: 'Mario Hermoso', age: 31, nat: 'ESP', role: 'CB', ovr: 77, pot: 77, num: 22 },
    { fictional: 'Y. Yazıcı', real: 'Yusuf Yazıcı', age: 29, nat: 'TUR', role: 'CAM', ovr: 77, pot: 78, num: 97 },
    { fictional: 'I. Muniain', real: 'Iker Muniain', age: 33, nat: 'ESP', role: 'CAM', ovr: 74, pot: 74, num: 10 },
    { fictional: 'S. Aurier', real: 'Serge Aurier', age: 33, nat: 'CIV', role: 'RB', ovr: 74, pot: 74, num: 24 },
    { fictional: 'A. Martial', real: 'Anthony Martial', age: 30, nat: 'FRA', role: 'ST', ovr: 75, pot: 75, num: 11 },
    { fictional: 'C. Kouyaté', real: 'Cheikhou Kouyaté', age: 36, nat: 'SEN', role: 'CDM', ovr: 72, pot: 72, num: 8 },
    { fictional: 'L. Kurzawa', real: 'Layvin Kurzawa', age: 33, nat: 'FRA', role: 'LB', ovr: 72, pot: 72, num: 20 },
    { fictional: 'D. Alli', real: 'Dele Alli', age: 30, nat: 'ENG', role: 'CAM', ovr: 71, pot: 73, num: 20 },
    { fictional: 'E. Mor', real: 'Emre Mor', age: 29, nat: 'TUR', role: 'RW', ovr: 73, pot: 74, num: 99 },
    { fictional: 'S. Karius', real: 'Loris Karius', age: 33, nat: 'GER', role: 'GK', ovr: 74, pot: 74, num: 1 },
    { fictional: 'M. Hummels', real: 'Mats Hummels', age: 37, nat: 'GER', role: 'CB', ovr: 76, pot: 76, num: 15 },
    { fictional: 'W. Ben Yedd', real: 'Wissam Ben Yedder', age: 36, nat: 'FRA', role: 'ST', ovr: 75, pot: 75, num: 10 },
    { fictional: 'J. Matip', real: 'Joël Matip', age: 35, nat: 'CMR', role: 'CB', ovr: 75, pot: 75, num: 32 },
    { fictional: 'L. Goretzka-F', real: 'Leon Goretzka', age: 31, nat: 'GER', role: 'CM', ovr: 81, pot: 81, num: 8 },
    { fictional: 'P. Pogba-F', real: 'Paul Pogba', age: 33, nat: 'FRA', role: 'CM', ovr: 77, pot: 78, num: 10 },
    { fictional: 'T. Bakayoko', real: 'Tiémoué Bakayoko', age: 31, nat: 'FRA', role: 'CDM', ovr: 73, pot: 73, num: 14 },
    { fictional: 'J. O’Brien-F', real: 'Lewis O’Brien', age: 27, nat: 'ENG', role: 'CM', ovr: 73, pot: 75, num: 8 },
    { fictional: 'B. Sarr', real: 'Bouna Sarr', age: 34, nat: 'SEN', role: 'RB', ovr: 71, pot: 71, num: 20 },
    { fictional: 'D. Praet', real: 'Dennis Praet', age: 32, nat: 'BEL', role: 'CM', ovr: 73, pot: 73, num: 26 },
    { fictional: 'K. Iheanacho', real: 'Kelechi Iheanacho', age: 29, nat: 'NGA', role: 'ST', ovr: 74, pot: 75, num: 14 },
  ];

  const loanTargets: Array<{
    clubId: string;
    fictional: string;
    real: string;
    age: number;
    nat: string;
    role: PlayerRole;
    ovr: number;
    pot: number;
    num: number;
    wageSharePct: number;
  }> = [
    { clubId: 'gs', fictional: 'E. Felipe', real: 'Endrick', age: 20, nat: 'BRA', role: 'ST', ovr: 78, pot: 90, num: 16, wageSharePct: 70 },
    { clubId: 'fb', fictional: 'V. Roque', real: 'Vitor Roque', age: 21, nat: 'BRA', role: 'ST', ovr: 77, pot: 88, num: 19, wageSharePct: 60 },
    { clubId: 'bjk', fictional: 'C. Echeverri', real: 'Claudio Echeverri', age: 20, nat: 'ARG', role: 'CAM', ovr: 76, pot: 88, num: 19, wageSharePct: 65 },
    { clubId: 'ts', fictional: 'N. Paz', real: 'Nico Paz', age: 22, nat: 'ARG', role: 'CAM', ovr: 79, pot: 88, num: 32, wageSharePct: 65 },
    { clubId: 'bfk', fictional: 'M. Tel', real: 'Mathys Tel', age: 21, nat: 'FRA', role: 'LW', ovr: 79, pot: 88, num: 39, wageSharePct: 75 },
    { clubId: 'goz', fictional: 'D. Doué', real: 'Désiré Doué', age: 21, nat: 'FRA', role: 'LW', ovr: 82, pot: 90, num: 14, wageSharePct: 75 },
    { clubId: 'sam', fictional: 'P. Wanner', real: 'Paul Wanner', age: 20, nat: 'GER', role: 'CAM', ovr: 76, pot: 86, num: 14, wageSharePct: 70 },
    { clubId: 'riz', fictional: 'K. Asllani', real: 'Kristjan Asllani', age: 24, nat: 'ALB', role: 'CDM', ovr: 77, pot: 84, num: 21, wageSharePct: 65 },
    { clubId: 'aln', fictional: 'F. García', real: 'Fran García', age: 26, nat: 'ESP', role: 'LB', ovr: 78, pot: 81, num: 20, wageSharePct: 75 },
    { clubId: 'eyp', fictional: 'H. Fort', real: 'Héctor Fort', age: 20, nat: 'ESP', role: 'RB', ovr: 75, pot: 86, num: 32, wageSharePct: 50 },
    { clubId: 'kon', fictional: 'J. Kiwior', real: 'Jakub Kiwior', age: 26, nat: 'POL', role: 'CB', ovr: 78, pot: 82, num: 15, wageSharePct: 70 },
    { clubId: 'kas', fictional: 'L. Chevalier', real: 'Lucas Chevalier', age: 25, nat: 'FRA', role: 'GK', ovr: 82, pot: 87, num: 30, wageSharePct: 80 },
    { clubId: 'koc', fictional: 'A. Ibrahim', real: 'Arijon Ibrahimović', age: 20, nat: 'GER', role: 'CAM', ovr: 73, pot: 84, num: 46, wageSharePct: 50 },
    { clubId: 'gfk', fictional: 'V. Carboni', real: 'Valentín Carboni', age: 21, nat: 'ARG', role: 'RW', ovr: 75, pot: 86, num: 45, wageSharePct: 60 },
    { clubId: 'bre', fictional: 'R. Bardghji', real: 'Roony Bardghji', age: 20, nat: 'SWE', role: 'RW', ovr: 76, pot: 87, num: 19, wageSharePct: 60 },
    { clubId: 'ful', fictional: 'A. Guler-B', real: 'Assan Ouédraogo', age: 20, nat: 'GER', role: 'CM', ovr: 76, pot: 87, num: 22, wageSharePct: 60 },
    { clubId: 'ger_hsv', fictional: 'M. Karl-L', real: 'Lennart Karl', age: 18, nat: 'GER', role: 'CAM', ovr: 72, pot: 86, num: 42, wageSharePct: 50 },
    { clubId: 'ger_s04', fictional: 'S. El Mala-L', real: 'Said El Mala', age: 20, nat: 'GER', role: 'LW', ovr: 73, pot: 84, num: 19, wageSharePct: 55 },
    { clubId: 'chp_whu', fictional: 'E. Nwaneri-L', real: 'Ethan Nwaneri', age: 19, nat: 'ENG', role: 'CAM', ovr: 76, pot: 89, num: 53, wageSharePct: 65 },
    { clubId: 'chp_der', fictional: 'J. Beyer-L', real: 'Jordan Beyer', age: 26, nat: 'GER', role: 'CB', ovr: 75, pot: 79, num: 5, wageSharePct: 60 },
  ];

  const leagueClubIds = new Set(leagueClubs.map((c) => c.id));
  const fallbackClubId = (idx: number) => leagueClubs[idx % leagueClubs.length].id;

  const transfers: MarketListing[] = transferTargets
    .filter((item) => !existingNames.has(item.real))
    .map((item, i) => ({
      clubId: leagueClubIds.has(item.clubId) ? item.clubId : fallbackClubId(i),
      listingType: 'TRANSFER',
      player: makePlayer(
        `mkt_tr_${i}`,
        item.fictional,
        item.real,
        item.age,
        item.nat,
        item.role,
        item.ovr,
        item.pot,
        item.num,
        100 + i * 13,
        leagueScale
      ),
    }));

  const frees: MarketListing[] = freeAgents
    .filter((item) => !existingNames.has(item.real))
    .map((item, i) => {
      const p = makePlayer(
        `mkt_fa_${i}`,
        item.fictional,
        item.real,
        item.age,
        item.nat,
        item.role,
        item.ovr,
        item.pot,
        item.num,
        500 + i * 17,
        leagueScale
      );
      return {
        clubId: null,
        listingType: 'FREE_AGENT',
        player: { ...p, marketValue: 0 },
      };
    });

  const loans: MarketListing[] = loanTargets
    .filter((item) => !existingNames.has(item.real))
    .map((item, i) => {
      const p = makePlayer(
        `mkt_ln_${i}`,
        item.fictional,
        item.real,
        item.age,
        item.nat,
        item.role,
        item.ovr,
        item.pot,
        item.num,
        900 + i * 19,
        leagueScale
      );
      return {
        clubId: leagueClubIds.has(item.clubId) ? item.clubId : fallbackClubId(i + 3),
        listingType: 'LOAN',
        loanFee: Math.max(85_000, Math.round(p.marketValue * 0.085)),
        wageSharePct: item.wageSharePct,
        player: p,
      };
    });

  return [...transfers, ...frees, ...loans].sort(
    (a, b) => a.player.ovr - b.player.ovr || a.player.marketValue - b.player.marketValue
  );
}

export function buildTacticsForClub(club: Club, formation?: FormationId): TacticalSlot[] {
  const form = formation ?? club.preferredFormation;
  const template = FORMATION_TEMPLATES[form];
  const available = [...club.players].filter((p) => p.injuredWeeks === 0);
  const usedIds = new Set<string>();

  return template.map((slot, index) => {
    let best = available
      .filter((p) => !usedIds.has(p.id) && p.naturalRole === slot.role)
      .sort((a, b) => b.ovr - a.ovr)[0];

    if (!best) {
      const grp = roleToGroup(slot.role);
      best = available
        .filter((p) => !usedIds.has(p.id) && p.positionGroup === grp)
        .sort((a, b) => b.ovr - a.ovr)[0];
    }

    if (!best) {
      best = available
        .filter((p) => !usedIds.has(p.id) && (slot.role === 'GK' || p.naturalRole !== 'GK'))
        .sort((a, b) => b.ovr - a.ovr)[0];
    }

    if (best) usedIds.add(best.id);
    return {
      slotIndex: index,
      role: slot.role,
      x: slot.x,
      z: slot.z,
      playerId: best ? best.id : null,
    };
  });
}

export function buildDefaultBenchForClub(club: Club, slots: TacticalSlot[]): string[] {
  const starterIds = new Set(slots.map((s) => s.playerId).filter(Boolean) as string[]);
  const fitPool = club.players
    .filter((p) => !starterIds.has(p.id) && p.injuredWeeks === 0)
    .sort((a, b) => b.ovr - a.ovr);

  const benchGk = fitPool.find((p) => p.naturalRole === 'GK');
  const others = fitPool.filter((p) => p.id !== benchGk?.id);
  const picked = benchGk ? [benchGk, ...others.slice(0, 8)] : others.slice(0, 9);
  return picked.map((p) => p.id);
}

export function generateRoundRobinFixtures(clubs: Club[]): Fixture[] {
  const ids = clubs.map((c) => c.id);
  const n = ids.length;
  const fixtures: Fixture[] = [];
  const rot = [...ids];

  // Double round-robin (34 weeks / 306 fixtures for 18 clubs; 38 weeks / 380 fixtures for 20 clubs)
  for (let round = 0; round < (n - 1) * 2; round++) {
    const week = round + 1;
    const isSecondHalf = round >= n - 1;
    for (let i = 0; i < n / 2; i++) {
      const t1 = rot[i];
      const t2 = rot[n - 1 - i];
      const home = isSecondHalf ? t2 : t1;
      const away = isSecondHalf ? t1 : t2;
      fixtures.push({
        id: `fix_w${week}_${i}`,
        week,
        homeClubId: home,
        awayClubId: away,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        homeXg: 0,
        awayXg: 0,
        homePossession: 50,
        homeShots: 0,
        awayShots: 0,
        events: [],
      });
    }
    const last = rot.pop()!;
    rot.splice(1, 0, last);
  }

  return fixtures;
}

export function createInitialTrainingPlan(): TrainingPlan {
  return {
    intensity: 'BALANCED',
    sessions: [
      'PHYSICAL_ENDURANCE',
      'TACTICS_SHAPE',
      'ATTACKING_FINISHING',
      'DEFENSIVE_PRESS',
      'MATCH_PREP',
      'RECOVERY_YOGA',
    ],
    appliedWeek: 0,
  };
}

export function createInitialStaffForClub(
  clubId: string,
  reputation: number,
  leagueId?: LeagueId
): StaffMember[] {
  return createResearchedClubStaff(clubId, reputation, leagueId);
}

export function createStaffMarketPool(): StaffMember[] {
  return createExpandedStaffMarketPool();
}

export function generateAllLeagueScoutPool(
  activeClubs: Club[],
  activeLeagueId: LeagueId
): Array<{ player: Player; clubId: string; clubName: string; leagueId: LeagueId; isRealClub: boolean }> {
  const result: Array<{ player: Player; clubId: string; clubName: string; leagueId: LeagueId; isRealClub: boolean }> = [];
  const seenIds = new Set<string>();

  for (const lid of ALL_LEAGUE_IDS) {
    const clubsForLeague = lid === activeLeagueId ? activeClubs : createClubsForLeague(lid);
    for (const c of clubsForLeague) {
      for (const p of c.players) {
        if (seenIds.has(p.id)) continue;
        seenIds.add(p.id);
        result.push({
          player: p,
          clubId: c.id,
          clubName: c.realName,
          leagueId: lid,
          isRealClub: true,
        });
      }
    }
  }
  return result;
}

export function createAchievementsCatalog(): AchievementDef[] {
  return [
    { id: 'first_win', title: 'İlk Galibiyet', description: 'Teknik direktör olarak ilk resmi lig maçını kazan.', category: 'MATCH', unlocked: false, progress: 0, target: 1 },
    { id: 'clean_sheet_3', title: 'Beton Duvar', description: '3 resmi maçta kaleni gole kapat.', category: 'MATCH', unlocked: false, progress: 0, target: 3 },
    { id: 'derby_king', title: 'Derbi Fatihi', description: 'Büyük bir derbi mücadelesinden 3 puanla ayrıl.', category: 'MATCH', unlocked: false, progress: 0, target: 1 },
    { id: 'high_scorer', title: 'Gol Yağmuru', description: 'Tek maçta rakip filelere en az 4 gol gönder.', category: 'MATCH', unlocked: false, progress: 0, target: 1 },
    { id: 'win_streak_5', title: 'Yenilmezlik Serisi', description: 'Üst üste 5 galibiyet serisi yakala.', category: 'MATCH', unlocked: false, progress: 0, target: 5 },
    { id: 'first_signing', title: 'İmza Töreni', description: 'İnatçı transfer pazarlığından galip çıkıp oyuncu transfer et.', category: 'TRANSFER', unlocked: false, progress: 0, target: 1 },
    { id: 'free_master', title: 'Bonservissiz Dahi', description: 'Serbest oyuncu veya kiralık hamlesiyle kadroyu güçlendir.', category: 'TRANSFER', unlocked: false, progress: 0, target: 1 },
    { id: 'scout_guru', title: 'Kıta Kaşifi', description: '9 lig genelinde en az 5 gözlemci raporu hazırla.', category: 'MANAGEMENT', unlocked: false, progress: 0, target: 5 },
    { id: 'training_master', title: 'İdman Sahası Mimarı', description: 'Haftalık özel takım antrenmanı programı uygula.', category: 'MANAGEMENT', unlocked: false, progress: 0, target: 1 },
    { id: 'press_ace', title: 'Medya Ustası', description: 'Basın toplantısında gazetecilerin sorularını başarıyla yanıtla.', category: 'MANAGEMENT', unlocked: false, progress: 0, target: 1 },
    { id: 'staff_upgrade', title: 'Elit Teknik Ekip', description: 'Kulüp kadrosuna yeni bir teknik ekip uzmanı kazandır.', category: 'MANAGEMENT', unlocked: false, progress: 0, target: 1 },
    { id: 'wonderkid_rise', title: 'Akademi Meyvesi', description: '21 yaş altı bir genç oyuncunun OVR değerini +1 yükselt.', category: 'HARDCORE', unlocked: false, progress: 0, target: 1 },
    { id: 'board_darling', title: 'Yönetimin Gözdesi', description: 'Yönetim kurulu güvenini %85 üzerine çıkar.', category: 'HARDCORE', unlocked: false, progress: 0, target: 85 },
    { id: 'full_license', title: 'Tam Lisanslı Efsane', description: 'ZEPHYR-FULL lisans kodunu aktif et.', category: 'HARDCORE', unlocked: false, progress: 0, target: 1 },
  ];
}


