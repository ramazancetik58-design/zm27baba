import { appStorage } from './appStorage';
import {
  AchievementDef,
  Club,
  Fixture,
  InboxMessage,
  LeagueId,
  LicenseMode,
  ManagerPersonality,
  ManagerProfile,
  MarketListing,
  Player,
  PlayerRole,
  PressQuestion,
  PressingIntensity,
  SaveSlotSummary,
  ScoutReport,
  StaffMember,
  StandingRow,
  TacticsConfig,
  TacticalStyleId,
  TeamTalkPhase,
  TeamTalkResult,
  TeamTalkTone,
  TrainingPlan,
  TransferListingType,
  TransferNegotiation,
} from './types';

export function validateLicenseCode(input: string): boolean {
  return input.trim().toUpperCase() === 'ZEPHYR-FULL';
}

export function getClubDisplayName(club: Club, mode: LicenseMode): string {
  return mode === 'FULL_LICENSE' ? club.realName : club.fictionalName;
}

export function getClubShortName(club: Club, mode: LicenseMode): string {
  return mode === 'FULL_LICENSE' ? club.realShort : club.fictionalShort;
}

export function getStadiumDisplayName(club: Club, mode: LicenseMode): string {
  return mode === 'FULL_LICENSE' ? club.stadiumReal : club.stadiumFictional;
}

export function getStaffDisplayName(staff: StaffMember, mode: LicenseMode): string {
  if (mode === 'FULL_LICENSE') return staff.name;
  return staff.fictionalName ?? staff.name;
}

export function getPlayerDisplayName(player: Player, mode: LicenseMode): string {
  return mode === 'FULL_LICENSE' ? player.realName : player.fictionalName;
}

/**
 * Computes tactical role compatibility penalty when a player is placed out of position.
 */
export function getRoleCompatibility(naturalRole: PlayerRole, assignedRole: PlayerRole): number {
  if (naturalRole === assignedRole) return 1.0;
  if (naturalRole === 'GK' || assignedRole === 'GK') return 0.32;

  const defRoles: PlayerRole[] = ['LB', 'CB', 'RB'];
  const midRoles: PlayerRole[] = ['CDM', 'CM', 'CAM'];
  const fwdRoles: PlayerRole[] = ['LW', 'RW', 'ST'];

  const sameBand =
    (defRoles.includes(naturalRole) && defRoles.includes(assignedRole)) ||
    (midRoles.includes(naturalRole) && midRoles.includes(assignedRole)) ||
    (fwdRoles.includes(naturalRole) && fwdRoles.includes(assignedRole));

  if (sameBand) return 0.88;
  if (
    (naturalRole === 'CDM' && assignedRole === 'CB') ||
    (naturalRole === 'CAM' && (assignedRole === 'LW' || assignedRole === 'RW')) ||
    (naturalRole === 'LB' && assignedRole === 'LW') ||
    (naturalRole === 'RB' && assignedRole === 'RW')
  ) {
    return 0.84;
  }
  return 0.65; // Heavy hardcore out-of-position penalty
}

/**
 * Evaluates effective tactical match strength (Hardcore: poor tactics or tired players crash rating).
 */
export function calculateTacticalStrength(
  club: Club,
  tactics: TacticsConfig,
  opponentTactics?: TacticsConfig
): {
  overall: number;
  attack: number;
  midfield: number;
  defense: number;
  chemistryPenalty: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  let sumEffective = 0;
  let atkSum = 0;
  let atkCount = 0;
  let midSum = 0;
  let midCount = 0;
  let defSum = 0;
  let defCount = 0;
  let outOfPosCount = 0;
  let lowStaminaCount = 0;

  for (const slot of tactics.slots) {
    const player = club.players.find((p) => p.id === slot.playerId);
    if (!player || player.injuredWeeks > 0) {
      sumEffective += 35;
      warnings.push(`Eksik/Sakat oyuncu (${slot.role})`);
      continue;
    }

    const compat = getRoleCompatibility(player.naturalRole, slot.role);
    if (compat < 0.75) outOfPosCount++;

    // Condition penalty is punishing in Hardcore mode
    const fatigueFactor = player.condition < 60 ? 0.72 : player.condition < 75 ? 0.87 : 0.96 + (player.condition - 75) * 0.002;
    if (player.condition < 65) lowStaminaCount++;

    const effectiveOvr = player.ovr * compat * fatigueFactor;
    sumEffective += effectiveOvr;

    if (slot.z > 0.2) {
      atkSum += effectiveOvr;
      atkCount++;
    } else if (slot.z > -0.3) {
      midSum += effectiveOvr;
      midCount++;
    } else {
      defSum += effectiveOvr;
      defCount++;
    }
  }

  if (outOfPosCount > 0) {
    warnings.push(`${outOfPosCount} oyuncu doğal mevkisinin çok dışında!`);
  }
  if (lowStaminaCount >= 3) {
    warnings.push(`${lowStaminaCount} ilk 11 oyuncusu yorgun (sakatlık riski yüksek).`);
  }

  let baseOverall = sumEffective / 11;

  if (tactics.defensiveLine > 75 && tactics.pressing === 'LOW') {
    baseOverall -= 4.0; // Tactical blunder: high line with no pressing!
    warnings.push('Taktik Hata: Baskısız yüksek savunma hattı arkaya koşulara açık!');
  }

  // Tactical style synergy & opponent counter-style modifiers
  const myStyle: TacticalStyleId = tactics.tacticalStyle ?? 'CUSTOM';
  const oppStyle: TacticalStyleId = opponentTactics?.tacticalStyle ?? 'CUSTOM';
  if (myStyle === 'GEGENPRESS' && lowStaminaCount >= 2) {
    baseOverall -= 1.8;
    warnings.push('Gegenpress için kadro kondisyonu düşük — ikinci yarıda pres düşebilir.');
  }
  if ((myStyle === 'TIKI_TAKA' || myStyle === 'VERTICAL_TIKI_TAKA') && tactics.tempo === 'SLOW' && myStyle === 'VERTICAL_TIKI_TAKA') {
    baseOverall -= 0.8;
  }
  if (opponentTactics) {
    if (tactics.mentality === 'ALL_OUT' && opponentTactics.mentality === 'DEFENSIVE' && opponentTactics.tempo === 'FAST') {
      baseOverall -= 3.5; // Vulnerable to fast counter-attacks
      warnings.push('Rakip hızlı kontra ile yüksek savunma hattınızı cezalandırabilir.');
    }
    if ((myStyle === 'TIKI_TAKA' || myStyle === 'CONTROL_POSSESSION') && (oppStyle === 'FAST_COUNTER' || oppStyle === 'LOW_BLOCK_PRESS')) {
      baseOverall -= 0.6;
    } else if (myStyle === 'VERTICAL_TIKI_TAKA' && (oppStyle === 'CATENACCIO' || oppStyle === 'LOW_BLOCK_PRESS')) {
      baseOverall += 1.1; // Vertical passing breaks deep blocks
    } else if (myStyle === 'GEGENPRESS' && (oppStyle === 'TIKI_TAKA' || oppStyle === 'CONTROL_POSSESSION')) {
      baseOverall += 1.2; // Pressing disrupts patient buildup
    } else if ((myStyle === 'FAST_COUNTER' || myStyle === 'STRUCTURED_COUNTER') && (oppStyle === 'GEGENPRESS' || oppStyle === 'WING_PLAY')) {
      baseOverall += 1.0; // Space behind aggressive press/overlapping fullbacks
    } else if (myStyle === 'CATENACCIO' && oppStyle === 'DIRECT_LONG_BALL') {
      baseOverall += 0.9;
    } else if (myStyle === 'WING_PLAY' && oppStyle === 'CATENACCIO') {
      baseOverall += 0.8; // Width stretches narrow backlines
    }
  }

  return {
    overall: Math.round(baseOverall * 10) / 10,
    attack: atkCount > 0 ? Math.round((atkSum / atkCount) * 10) / 10 : 65,
    midfield: midCount > 0 ? Math.round((midSum / midCount) * 10) / 10 : 65,
    defense: defCount > 0 ? Math.round((defSum / defCount) * 10) / 10 : 65,
    chemistryPenalty: outOfPosCount * 2.5,
    warnings,
  };
}

/**
 * Hardcore Transfer Negotiation AI:
 * - NEVER accepts on Round 1!
 * - Selling clubs demand 120% - 155% of market value.
 * - Walks out if insulted (< 85% of market value).
 */
export interface TransferOfferOptions {
  targetClub?: Club;
  targetLeagueId?: LeagueId;
  signingBonus?: number;
  agentFeePct?: number;
}

const LEAGUE_PRESTIGE_SCORE: Record<LeagueId, number> = {
  PREMIER_LEAGUE: 90,
  LA_LIGA: 87,
  SERIE_A: 84,
  BUNDESLIGA: 84,
  LIGUE_1: 82,
  SUPER_LIG: 77,
  EREDIVISIE: 78,
  LIGA_PORTUGAL: 79,
  BELGIAN_PRO_LEAGUE: 75,
  EFL_CHAMPIONSHIP: 71,
  TR_1_LIG: 62,
  TR_2_LIG_BEYAZ: 50,
  TR_2_LIG_KIRMIZI: 50,
};

export function computeAgentFeeAmount(
  baseFee: number,
  offeredWage: number,
  signingBonus: number,
  agentFeePct: number
): number {
  if (agentFeePct <= 0) return 0;
  const contractBasis = Math.max(baseFee, offeredWage * 14) + signingBonus;
  return Math.round((contractBasis * agentFeePct) / 100);
}

/**
 * Hardcore Transfer Negotiation AI:
 * - NEVER accepts on Round 1!
 * - Selling clubs demand 120% - 155% of market value.
 * - Free agents evaluate League Prestige + Club Reputation and demand signing bonuses + agent commission %.
 * - Walks out if insulted (< 85% of market value or league prestige mismatch).
 */
export function evaluateTransferOffer(
  negotiation: TransferNegotiation,
  offerAmount: number,
  offeredWage: number,
  buyerBudget: number,
  buyerWageCap: number,
  buyerCurrentWeeklyWages: number,
  managerPersonality: ManagerPersonality = 'TACTICIAN',
  options?: TransferOfferOptions
): TransferNegotiation {
  const isFreeAgent = negotiation.listingType === 'FREE_AGENT';
  const effectiveFee = isFreeAgent ? 0 : offerAmount;
  const signingBonus = Math.max(0, options?.signingBonus ?? 0);
  const agentFeePct = Math.max(0, options?.agentFeePct ?? 0);
  const agentFeeAmount = computeAgentFeeAmount(effectiveFee, offeredWage, signingBonus, agentFeePct);
  const totalUpfrontCost = effectiveFee + signingBonus + agentFeeAmount;

  if (totalUpfrontCost > buyerBudget) {
    return {
      ...negotiation,
      currentOffer: effectiveFee,
      offeredWage,
      signingBonus,
      agentFeePct,
      agentFeeAmount,
      clubMessage: `Yönetim Kurulu Bütçe Engeli: Bonservis + imza parası + temsilci payı toplamı (${formatMoney(totalUpfrontCost)}) transfer bütçesini aşıyor!`,
    };
  }

  if (buyerCurrentWeeklyWages + offeredWage > buyerWageCap) {
    return {
      ...negotiation,
      currentOffer: effectiveFee,
      offeredWage,
      signingBonus,
      agentFeePct,
      agentFeeAmount,
      clubMessage: 'Maaş Tavanı İhlali: Haftalık maaş bütçeniz bu kontratı karşılamıyor!',
    };
  }

  const nextRound = negotiation.round + 1;
  const negotiatorDiscount = managerPersonality === 'NEGOTIATOR' ? 0.93 : 1.0;

  // FREE AGENT NEGOTIATION: Checks League Prestige, Club Reputation, Wage, Signing Bonus & Agent Commission %
  if (isFreeAgent) {
    if (options?.targetClub || options?.targetLeagueId) {
      const leaguePrestige = LEAGUE_PRESTIGE_SCORE[options.targetLeagueId ?? options.targetClub?.leagueId ?? 'SUPER_LIG'];
      const clubRep = options.targetClub?.reputation ?? leaguePrestige;
      const combinedPrestige = Math.round(leaguePrestige * 0.5 + clubRep * 0.5);
      const ovr = negotiation.targetPlayer.ovr;

      if (
        (ovr >= 78 && combinedPrestige < 65) ||
        (ovr >= 74 && leaguePrestige <= 55) ||
        ovr - combinedPrestige > 11
      ) {
        return {
          ...negotiation,
          round: nextRound,
          currentOffer: 0,
          offeredWage,
          signingBonus,
          agentFeePct,
          agentFeeAmount,
          refusalReason: 'PRESTIGE_MISMATCH',
          status: 'REJECTED_WALKED',
          clubMessage: `Menajer teklifi dinlemeden masadan kalktı: "${negotiation.targetPlayer.realName} bu lig seviyesine ve kulüp prestijine (${combinedPrestige}) imza atmayı düşünmüyor."`,
        };
      }
    }

    const prestigeTax = options?.targetClub && options.targetClub.reputation < negotiation.targetPlayer.ovr ? 1.18 : 1.0;
    const targetWage = Math.round(negotiation.targetPlayer.weeklyWage * 1.15 * prestigeTax * negotiatorDiscount);
    const hasAgentControls = options !== undefined && (options.signingBonus !== undefined || options.agentFeePct !== undefined);
    const requiredSigningBonus = hasAgentControls
      ? Math.round(Math.max(45_000, negotiation.targetPlayer.weeklyWage * 3.5) * negotiatorDiscount)
      : 0;
    const requiredAgentPct = hasAgentControls
      ? negotiation.targetPlayer.ovr >= 78
        ? 12
        : negotiation.targetPlayer.ovr >= 74
        ? 10
        : 8
      : 0;

    if (offeredWage < negotiation.targetPlayer.weeklyWage * 0.78) {
      return {
        ...negotiation,
        round: nextRound,
        currentOffer: 0,
        offeredWage,
        signingBonus,
        agentFeePct,
        agentFeeAmount,
        status: 'REJECTED_WALKED',
        clubMessage: 'Serbest oyuncunun menajeri teklif edilen maaşı yetersiz bulup masadan kalktı!',
      };
    }
    if (negotiation.round === 1) {
      return {
        ...negotiation,
        round: nextRound,
        askingPrice: 0,
        currentOffer: 0,
        offeredWage,
        signingBonus,
        agentFeePct,
        agentFeeAmount,
        status: 'COUNTERED',
        clubMessage: hasAgentControls
          ? `Temsilci ilk şartları reddetti: Haftalık en az €${(targetWage / 1000).toFixed(1)}K maaş, ${formatMoney(requiredSigningBonus)} imza parası ve %${requiredAgentPct} temsilci payı istiyor.`
          : `Menajer ilk maaş teklifini reddetti. Beklentisi haftalık en az €${(targetWage / 1000).toFixed(1)}K.`,
      };
    }
    if (
      offeredWage >= targetWage &&
      signingBonus >= requiredSigningBonus &&
      agentFeePct >= requiredAgentPct
    ) {
      return {
        ...negotiation,
        round: nextRound,
        currentOffer: 0,
        offeredWage,
        signingBonus,
        agentFeePct,
        agentFeeAmount,
        status: 'ACCEPTED',
        clubMessage: hasAgentControls
          ? `Zorlu pazarlık bitti! Oyuncu ve menajeri %${agentFeePct} temsilci payı + ${formatMoney(signingBonus)} imza parası şartlarıyla imzayı attı.`
          : 'Bonservissiz anlaşma sağlandı! Oyuncu sözleşme şartlarını kabul etti.',
      };
    }
    if (nextRound > negotiation.maxRounds) {
      return {
        ...negotiation,
        round: nextRound,
        currentOffer: 0,
        offeredWage,
        signingBonus,
        agentFeePct,
        agentFeeAmount,
        status: 'REJECTED_WALKED',
        clubMessage: 'Serbest oyuncu başka tekliflere yöneldi ve görüşmeleri sonlandırdı.',
      };
    }

    const missingParts: string[] = [];
    if (offeredWage < targetWage) missingParts.push(`€${(targetWage / 1000).toFixed(1)}K/hf maaş`);
    if (signingBonus < requiredSigningBonus) missingParts.push(`${formatMoney(requiredSigningBonus)} imza parası`);
    if (agentFeePct < requiredAgentPct) missingParts.push(`%${requiredAgentPct} menajer payı`);

    return {
      ...negotiation,
      round: nextRound,
      currentOffer: 0,
      offeredWage,
      signingBonus,
      agentFeePct,
      agentFeeAmount,
      status: 'COUNTERED',
      clubMessage: hasAgentControls
        ? `Menajer şartlarda diretiyor — Eksik kalemler: ${missingParts.join(' · ')}.`
        : `Oyuncu menajeri haftalık €${(targetWage / 1000).toFixed(1)}K maaşta ısrarcı.`,
    };
  }

  const baseRefValue =
    negotiation.listingType === 'LOAN'
      ? Math.max(120_000, Math.round(negotiation.targetPlayer.marketValue * 0.085))
      : negotiation.targetPlayer.marketValue;

  // Insultingly low bid -> immediate walk-out
  if (offerAmount < baseRefValue * 0.85) {
    return {
      ...negotiation,
      round: nextRound,
      currentOffer: offerAmount,
      offeredWage,
      signingBonus,
      agentFeePct,
      agentFeeAmount,
      status: 'REJECTED_WALKED',
      clubMessage: `Hakaret sayılan teklif! Kulüp başkanı masadan kalktı (${Math.round(baseRefValue / 1000)}K€ baz bedel için çok düşük).`,
    };
  }

  // HARDCORE RULE: Never accept on the first offer!
  if (negotiation.round === 1) {
    const stubbornAsk = Math.round(
      Math.max(negotiation.askingPrice, offerAmount * 1.24, baseRefValue * 1.32) * negotiatorDiscount
    );
    return {
      ...negotiation,
      round: nextRound,
      askingPrice: stubbornAsk,
      currentOffer: offerAmount,
      offeredWage,
      signingBonus,
      agentFeePct,
      agentFeeAmount,
      status: 'COUNTERED',
      clubMessage:
        negotiation.listingType === 'LOAN'
          ? `İlk kiralama teklifi reddedildi! Kulüp ${(stubbornAsk / 1_000).toFixed(0)}K€ kiralama bedeli istiyor.`
          : `İlk teklif reddedildi! Satıcı kulüp tok satıcı oynuyor ve ${(stubbornAsk / 1_000_000).toFixed(2)}M€ talep ediyor.`,
    };
  }

  // Wage & agent commission check
  const wageFactor = negotiation.listingType === 'LOAN' ? 0.72 : 1.1;
  const minRequiredWage = Math.round(negotiation.targetPlayer.weeklyWage * wageFactor * negotiatorDiscount);
  const minAgentPct = options?.agentFeePct !== undefined ? 5 : 0;
  if (offerAmount >= negotiation.askingPrice * 0.95 && offeredWage >= minRequiredWage && agentFeePct >= minAgentPct) {
    return {
      ...negotiation,
      round: nextRound,
      currentOffer: offerAmount,
      offeredWage,
      signingBonus,
      agentFeePct,
      agentFeeAmount,
      status: 'ACCEPTED',
      clubMessage:
        negotiation.listingType === 'LOAN'
          ? 'Kiralık anlaşması tamamlandı! Kulüp oyuncunun sezon sonuna kadar kiralanmasına onay verdi.'
          : 'Anlaşma sağlandı! İnatçı pazarlık sonucu kulüp ve menajer şartları kabul etti.',
    };
  }

  if (nextRound > negotiation.maxRounds) {
    return {
      ...negotiation,
      round: nextRound,
      currentOffer: offerAmount,
      offeredWage,
      signingBonus,
      agentFeePct,
      agentFeeAmount,
      status: 'REJECTED_WALKED',
      clubMessage: 'Görüşmeler tıkandı! Kulüp bu transfer döneminde oyuncuyu bırakmama kararı aldı.',
    };
  }

  // Counter with slight concession if offer is serious, else hold firm
  const newAsk =
    offerAmount >= negotiation.askingPrice * 0.88
      ? Math.round((negotiation.askingPrice + offerAmount) * 0.54 * negotiatorDiscount)
      : Math.round(negotiation.askingPrice * 0.98);

  const wageNote =
    offeredWage < minRequiredWage
      ? ` Oyuncu menajeri ayrıca en az €${(minRequiredWage / 1000).toFixed(1)}K/hf maaş istiyor.`
      : agentFeePct < minAgentPct
      ? ` Temsilci en az %${minAgentPct} komisyon payı talep ediyor.`
      : '';

  return {
    ...negotiation,
    round: nextRound,
    askingPrice: newAsk,
    currentOffer: offerAmount,
    offeredWage,
    signingBonus,
    agentFeePct,
    agentFeeAmount,
    status: 'COUNTERED',
    clubMessage:
      negotiation.listingType === 'LOAN'
        ? `Kulüp kiralama bedelinde direniyor. Yeni beklenti: €${Math.round(newAsk / 1000)}K.${wageNote}`
        : `Kulüp direnmeye devam ediyor. Yeni beklenti: €${(newAsk / 1_000_000).toFixed(2)}M.${wageNote}`,
  };
}

export const INJURY_CATALOG: ReadonlyArray<{ name: string; weeks: number; severity: 'MINOR' | 'MODERATE' | 'SEVERE' }> = [
  { name: 'Hamstring Zorlanması', weeks: 3, severity: 'MODERATE' },
  { name: 'Arka Adale (Hamstring) Yırtığı', weeks: 6, severity: 'SEVERE' },
  { name: 'Ayak Bileği Burkulması', weeks: 2, severity: 'MINOR' },
  { name: 'Ayak Bileği Dış Bağ Kopması', weeks: 8, severity: 'SEVERE' },
  { name: 'Kasık Çekmesi (Pubalgia)', weeks: 4, severity: 'MODERATE' },
  { name: 'Diz İç Yan Bağ Esnemesi', weeks: 5, severity: 'MODERATE' },
  { name: 'Ön Çapraz Bağ (ACL) Yırtığı', weeks: 16, severity: 'SEVERE' },
  { name: 'Menisküs Yırtığı', weeks: 10, severity: 'SEVERE' },
  { name: 'Baldır (Gastrocnemius) Sertliği', weeks: 2, severity: 'MINOR' },
  { name: 'Aşil Tendon İltihabı', weeks: 6, severity: 'SEVERE' },
  { name: 'Kaval Kemiği Stres Kırığı', weeks: 9, severity: 'SEVERE' },
  { name: 'Kaburga Ezilmesi', weeks: 2, severity: 'MINOR' },
  { name: 'Omuz Çıkığı', weeks: 4, severity: 'MODERATE' },
  { name: 'Beyin Sarsıntısı Protokolü', weeks: 1, severity: 'MINOR' },
  { name: 'Kuadriseps Kas Lif Yırtığı', weeks: 5, severity: 'MODERATE' },
  { name: 'Lomber Bel Spazmı', weeks: 3, severity: 'MODERATE' },
  { name: 'Plantar Fasiit (Topuk Sakatlığı)', weeks: 3, severity: 'MODERATE' },
  { name: 'El Tarak Kemiği Kırığı', weeks: 4, severity: 'MODERATE' },
];

/**
 * Hardcore Stamina Drain & Injury Risk Calculation during match minutes.
 */
export function stepPlayerFatigueAndInjury(
  player: Player,
  minutesPlayed: number,
  pressing: PressingIntensity,
  randomRoll: number // 0..1 deterministic or Math.random
): { newCondition: number; injuredWeeks: number; injuryName: string | null } {
  const pressMultiplier: Record<PressingIntensity, number> = {
    LOW: 0.78,
    MEDIUM: 1.0,
    HIGH: 1.32,
    GEGENPRESS: 1.65,
  };

  const staminaResistance = 0.65 + (player.attributes.stamina / 100) * 0.5; // higher stamina = less drain
  const drain = (minutesPlayed * 0.34 * pressMultiplier[pressing]) / staminaResistance;
  const newCondition = Math.max(12, Math.round(player.condition - drain));

  // Injury risk spikes sharply when condition drops below 58%
  const baseRisk = pressing === 'GEGENPRESS' ? 0.045 : pressing === 'HIGH' ? 0.028 : 0.012;
  const fatigueRisk = newCondition < 58 ? (58 - newCondition) * 0.004 : 0;
  const totalRisk = baseRisk + fatigueRisk;

  if (randomRoll < totalRisk) {
    const ratio = randomRoll / Math.max(0.0001, totalRisk);
    const picked = INJURY_CATALOG[Math.floor(ratio * INJURY_CATALOG.length) % INJURY_CATALOG.length];
    return { newCondition, injuredWeeks: picked.weeks, injuryName: picked.name };
  }

  return { newCondition, injuredWeeks: 0, injuryName: null };
}

/**
 * Hardcore Youth Development:
 * Young players develop VERY slowly; requires age <= 23, headroom (potential > ovr), and match minutes.
 */
export function applyYouthDevelopment(player: Player, playedMatch: boolean): Player {
  if (player.age > 23 || player.ovr >= player.potential || player.injuredWeeks > 0) {
    return player;
  }

  const headroom = player.potential - player.ovr;
  const gain = (playedMatch ? 0.09 : 0.025) * (0.6 + headroom * 0.04);
  let nextProgress = player.growthProgress + gain;
  let nextOvr = player.ovr;

  if (nextProgress >= 1.0) {
    nextProgress -= 1.0;
    nextOvr = Math.min(player.potential, player.ovr + 1);
  }

  return {
    ...player,
    ovr: nextOvr,
    growthProgress: Math.round(nextProgress * 1000) / 1000,
  };
}

export function computeStandings(clubs: Club[], fixtures: Fixture[]): StandingRow[] {
  const map = new Map<string, StandingRow>();
  for (const c of clubs) {
    map.set(c.id, {
      clubId: c.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      form: [],
    });
  }

  const playedFixtures = fixtures.filter((f) => f.played).sort((a, b) => a.week - b.week);

  for (const f of playedFixtures) {
    const h = map.get(f.homeClubId);
    const a = map.get(f.awayClubId);
    if (!h || !a) continue;

    h.played++;
    a.played++;
    h.gf += f.homeGoals;
    h.ga += f.awayGoals;
    a.gf += f.awayGoals;
    a.ga += f.homeGoals;
    h.gd = h.gf - h.ga;
    a.gd = a.gf - a.ga;

    if (f.homeGoals > f.awayGoals) {
      h.won++;
      h.points += 3;
      h.form = [...h.form.slice(-4), 'W'];
      a.lost++;
      a.form = [...a.form.slice(-4), 'L'];
    } else if (f.homeGoals < f.awayGoals) {
      a.won++;
      a.points += 3;
      a.form = [...a.form.slice(-4), 'W'];
      h.lost++;
      h.form = [...h.form.slice(-4), 'L'];
    } else {
      h.drawn++;
      a.drawn++;
      h.points += 1;
      a.points += 1;
      h.form = [...h.form.slice(-4), 'D'];
      a.form = [...a.form.slice(-4), 'D'];
    }
  }

  return Array.from(map.values()).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gd !== x.gd) return y.gd - x.gd;
    return y.gf - x.gf;
  });
}

export function formatMoney(eur: number): string {
  const abs = Math.abs(eur);
  const sign = eur < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}€${Math.round(abs / 1_000)}K`;
  return `${sign}€${abs}`;
}

/**
 * Evaluates Pre-Match, Half-Time, and Post-Match Team Talks with Manager Personality Synergy.
 */
export function evaluateTeamTalk(
  phase: TeamTalkPhase,
  tone: TeamTalkTone,
  personality: ManagerPersonality,
  scoreDiff: number // positive = winning, 0 = tied, negative = losing
): TeamTalkResult {
  let moraleDelta = 2;
  let tacticalBoost = 0.8;
  let staminaSaveBonus = 0;
  let reactionText = 'Takım konuşmanızı dikkatle dinledi.';

  if (tone === 'AGGRESSIVE') {
    const despotSynergy = personality === 'DESPOT' ? 1.5 : 0;
    if (phase === 'HALF_TIME' && scoreDiff < 0) {
      moraleDelta = personality === 'DESPOT' ? 4 : -2;
      tacticalBoost = 2.6 + despotSynergy;
      reactionText = 'Soyunma odasında sesler yükseldi! Oyuncular hırslı ve öfkeli şekilde sahaya dönüyor.';
    } else if (phase === 'POST_MATCH' && scoreDiff > 0) {
      moraleDelta = -4;
      tacticalBoost = 0.5;
      reactionText = 'Galibiyete rağmen sert eleştiriniz bazı yıldızların moralini bozdu.';
    } else {
      moraleDelta = personality === 'DESPOT' ? 2 : -1;
      tacticalBoost = 1.9 + despotSynergy;
      reactionText = 'Sert uyarınız sonrası takım disiplin ve agresifliğini artırdı.';
    }
  } else if (tone === 'PASSIONATE') {
    const encSynergy = personality === 'ENCOURAGING' ? 1.6 : 0;
    moraleDelta = personality === 'ENCOURAGING' ? 9 : 6;
    tacticalBoost = 1.8 + encSynergy;
    staminaSaveBonus = 3;
    reactionText =
      phase === 'POST_MATCH' && scoreDiff < 0
        ? 'Mağlubiyete rağmen oyuncularınıza sahip çıktınız, takım kenetlendi.'
        : 'Cesaretlendirici sözleriniz soyunma odasında büyük coşku ve inanç yarattı!';
  } else if (tone === 'TACTICAL') {
    const tacSynergy = personality === 'TACTICIAN' ? 1.8 : 0;
    moraleDelta = 3;
    tacticalBoost = 2.1 + tacSynergy;
    staminaSaveBonus = 4;
    reactionText = 'Detaylı taktiksel talimatlarınız oyuncuların saha içi pozisyon alma disiplinini yükseltti.';
  } else {
    // CALM
    moraleDelta = scoreDiff > 0 ? 5 : 4;
    tacticalBoost = scoreDiff > 0 ? 1.5 : 1.0;
    staminaSaveBonus = 6;
    reactionText = 'Sakin ve kontrollü yaklaşımınız üzerlerindeki stresi aldı, enerji tasarrufu sağladı.';
  }

  return {
    tone,
    moraleDelta,
    tacticalBoost: Math.round(tacticalBoost * 10) / 10,
    staminaSaveBonus,
    reactionText,
  };
}

export interface TransferFilterCriteria {
  listingType: 'ALL' | TransferListingType;
  query: string;
  role: 'ALL' | PlayerRole;
  minOvr: number;
  maxAge: number;
  maxPrice: number;
  minPotential: number;
  sortBy: 'OVR_DESC' | 'POT_DESC' | 'VAL_ASC' | 'VAL_DESC' | 'AGE_ASC';
}

export function filterTransferMarket(
  listings: MarketListing[],
  criteria: TransferFilterCriteria,
  clubs: Club[],
  licenseMode: LicenseMode
): MarketListing[] {
  const q = criteria.query.trim().toLowerCase();

  return listings
    .filter((item) => {
      if (criteria.listingType !== 'ALL' && item.listingType !== criteria.listingType) return false;
      if (criteria.role !== 'ALL' && item.player.naturalRole !== criteria.role) return false;
      if (item.player.ovr < criteria.minOvr) return false;
      if (item.player.age > criteria.maxAge) return false;
      if (item.player.potential < criteria.minPotential) return false;

      const effectiveCost =
        item.listingType === 'FREE_AGENT'
          ? 0
          : item.listingType === 'LOAN'
          ? item.loanFee ?? 0
          : item.player.marketValue;
      if (criteria.maxPrice > 0 && effectiveCost > criteria.maxPrice) return false;

      if (q) {
        const pName = getPlayerDisplayName(item.player, licenseMode).toLowerCase();
        const nat = item.player.nationality.toLowerCase();
        const seller = item.clubId ? clubs.find((c) => c.id === item.clubId) : null;
        const cName = seller ? getClubDisplayName(seller, licenseMode).toLowerCase() : 'serbest';
        if (!pName.includes(q) && !nat.includes(q) && !cName.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (criteria.sortBy === 'OVR_DESC') return b.player.ovr - a.player.ovr;
      if (criteria.sortBy === 'POT_DESC') return b.player.potential - a.player.potential;
      if (criteria.sortBy === 'AGE_ASC') return a.player.age - b.player.age;
      const costA = a.listingType === 'LOAN' ? a.loanFee ?? 0 : a.player.marketValue;
      const costB = b.listingType === 'LOAN' ? b.loanFee ?? 0 : b.player.marketValue;
      return criteria.sortBy === 'VAL_ASC' ? costA - costB : costB - costA;
    });
}

export function evaluateJobApplication(
  club: Club,
  manager: ManagerProfile
): { accepted: boolean; message: string } {
  const repGap = club.reputation - manager.reputation;
  const personalityBoost =
    manager.personality === 'NEGOTIATOR' ? 8 : manager.personality === 'TACTICIAN' ? 5 : 3;

  if (repGap <= 18 + personalityBoost) {
    return {
      accepted: true,
      message: `${club.fictionalName} / ${club.realName} yönetimi vizyonunuzu beğendi ve sözleşme teklif etti!`,
    };
  }
  return {
    accepted: false,
    message: `Kulüp yönetimi itibarınızı (${manager.reputation}) bu seviye (${club.reputation}) için henüz yeterli görmedi. Önce orta sıra bir kulüpte kendinizi kanıtlayın!`,
  };
}

export function isDerbyFixture(homeClubId: string, awayClubId: string): string | null {
  const pair = [homeClubId, awayClubId].sort().join(':');
  // Trendyol Süper Lig Derbies
  if (pair === 'fb:gs') return 'Kıtalararası Derbi';
  if (pair === 'bjk:gs' || pair === 'bjk:fb') return 'İstanbul Büyük Derbisi';
  if (pair === 'gs:ts' || pair === 'fb:ts' || pair === 'bjk:ts') return 'Büyük Şampiyonlar Derbisi';
  if (pair === 'riz:ts' || pair === 'sam:ts' || pair === 'riz:sam') return 'Karadeniz Derbisi';
  const istanbul = new Set(['gs', 'fb', 'bjk', 'bfk', 'kas', 'eyp']);
  if (istanbul.has(homeClubId) && istanbul.has(awayClubId)) return 'İstanbul İl Derbisi';
  if (pair === 'amd:erz' || pair === 'amd:gfk' || pair === 'erz:gfk') return 'Doğu & Güneydoğu Derbisi';
  if (pair === 'cor:gb' || pair === 'gb:kon' || pair === 'cor:kon') return 'İç Anadolu Derbisi';
  if (pair === 'aln:goz') return 'Ege-Akdeniz Mücadelesi';

  // Premier League 2026-27 Derbies
  if (pair === 'ars:tot') return 'Kuzey Londra Derbisi';
  if (pair === 'mci:mun') return 'Manchester Derbisi';
  if (pair === 'eve:liv') return 'Merseyside Derbisi';
  if (pair === 'liv:mun') return 'North West Derbisi';
  if (pair === 'ars:che') return 'Londra Büyük Derbisi';
  if (pair === 'che:tot') return 'Londra Rekabeti';
  if (pair === 'bre:ful' || pair === 'che:ful' || pair === 'bre:che') return 'Batı Londra Derbisi';
  if (pair === 'new:sun') return 'Tyne-Wear Derbisi';
  if (pair === 'avl:cov') return 'Midlands Derbisi';
  if (pair === 'bha:cry') return 'M23 Derbisi';
  if (pair === 'lee:mun') return 'Roses Derbisi';

  // Spanish La Liga 2026-27 Derbies
  if (pair === 'fcb:rma') return 'El Clásico';
  if (pair === 'atm:rma') return 'El Derbi Madrileño';
  if (pair === 'ath:rso') return 'Euskal Derbia (Bask Derbisi)';
  if (pair === 'rbb:sev') return 'El Gran Derbi (Sevilla)';
  if (pair === 'esp:fcb') return 'Derbi Barceloní';
  if (pair === 'lev:val') return 'Derbi Valencià';
  if (pair === 'cel:dep') return 'O Noso Derbi (Galiçya)';
  if (pair === 'atm:ray' || pair === 'get:rma' || pair === 'atm:get' || pair === 'get:ray')
    return 'Madrid Bölge Derbisi';
  if (pair === 'ala:ath' || pair === 'ala:rso' || pair === 'osa:rso')
    return 'Kuzey İspanya Mücadelesi';

  // Italian Serie A 2026-27 Derbies
  if (pair === 'ita_int:ita_mil') return 'Derby della Madonnina';
  if (pair === 'ita_int:ita_juv') return "Derby d'Italia";
  if (pair === 'ita_laz:ita_rom') return 'Derby della Capitale';
  if (pair === 'ita_juv:ita_tor') return 'Derby della Mole';
  if (pair === 'ita_juv:ita_mil' || pair === 'ita_int:ita_nap' || pair === 'ita_mil:ita_nap' || pair === 'ita_juv:ita_nap')
    return 'Serie A Zirve Klasik';
  if (pair === 'ita_nap:ita_rom') return 'Derby del Sole';
  if (pair === 'ita_ata:ita_mil' || pair === 'ita_ata:ita_int' || pair === 'ita_com:ita_mon')
    return 'Lombardiya Derbisi';
  if (pair === 'ita_bol:ita_fio') return "Derby dell'Appennino";
  if (pair === 'ita_bol:ita_par' || pair === 'ita_bol:ita_sas' || pair === 'ita_par:ita_sas')
    return 'Emilia Derbisi';

  // Trendyol 1. Lig & Nesine 2. Lig Derbies
  if (pair === 'tr1_bod:tr1_mug') return 'Muğla Derbisi';
  if (pair === 'tr1_ant:tr1_bod') return 'Güney Batı Akdeniz Derbisi';
  if (pair === 'tr1_kg:tr1_pen' || pair === 'tr1_erok:tr1_sar' || pair === 'tr1_ist:tr1_umr')
    return 'İstanbul 1. Lig Derbisi';
  if (pair === 'tr1_bat:tr1_mar') return 'Mezopotamya Derbisi';
  if (pair === 'tr2b_ads:tr2b_hat') return 'Çukurova Derbisi';
  if (pair === 'tr2b_elz:tr2b_urf') return 'Doğu & Güneydoğu Klasik';
  if (pair === 'tr2k_ag:tr2k_ankd') return 'Başkent Derbisi';
  if (pair === 'tr2k_1461:tr2k_ord') return 'Doğu Karadeniz Derbisi';
  if (pair === 'tr2k_kar:tr2k_ine') return 'Bursa İl Derbisi';

  // German Bundesliga 2026-27 Derbies
  if (pair === 'ger_bvb:ger_fcb') return 'Der Klassiker';
  if (pair === 'ger_bvb:ger_s04') return 'Revierderby';
  if (pair === 'ger_b04:ger_koe' || pair === 'ger_bmg:ger_koe' || pair === 'ger_b04:ger_bmg')
    return 'Rheinisches Derby (Ren Derbisi)';
  if (pair === 'ger_hsv:ger_svw') return 'Nordderby (Kuzey Derbisi)';
  if (pair === 'ger_fca:ger_fcb') return 'Bavyera Derbisi';
  if (pair === 'ger_fcu:ger_rbl') return 'Doğu Almanya Mücadelesi';
  if (pair === 'ger_m05:ger_sge') return 'Rhein-Main Derbisi';
  if (pair === 'ger_scf:ger_vfb') return 'Baden-Württemberg Derbisi';

  // English EFL Championship 2026-27 Derbies
  if (pair === 'chp_cha:chp_mil' || pair === 'chp_qpr:chp_whu' || pair === 'chp_mil:chp_whu')
    return 'Londra Championship Derbisi';
  if (pair === 'chp_bir:chp_wba' || pair === 'chp_wba:chp_wol' || pair === 'chp_bir:chp_wol')
    return 'Midlands / Black Country Derbisi';
  if (pair === 'chp_bla:chp_bur' || pair === 'chp_bla:chp_pne' || pair === 'chp_bur:chp_pne')
    return 'Lancashire Derbisi';
  if (pair === 'chp_por:chp_sou') return 'South Coast Derbisi';
  if (pair === 'chp_car:chp_swa') return 'South Wales Derbisi';
  if (pair === 'chp_der:chp_stk') return 'Midlands Rekabeti';
  if (pair === 'chp_car:chp_wre') return 'Galler Derbisi';
  return null;
}

export interface ResignReasonOption {
  id: 'BUDGET' | 'BOARD_CONFLICT' | 'NEW_CHALLENGE' | 'STRESS' | 'SQUAD_MORALE' | 'FANS_PRESSURE';
  labelTr: string;
  labelEn: string;
  boardReplyTr: string;
  boardReplyEn: string;
  repImpact: number;
}

export const RESIGN_REASONS: ResignReasonOption[] = [
  {
    id: 'BUDGET',
    labelTr: 'Transfer bütçesi ve maaş limitleri hedefler için yetersiz kaldı',
    labelEn: 'Transfer & wage budgets are insufficient for club targets',
    boardReplyTr: 'Yönetim kurulu FFP / PSR sınırlarını esnetemeyeceğini belirterek mali ayrılığınızı saygıyla kabul etti.',
    boardReplyEn: 'The board noted FFP constraints cannot be bent and respected your resignation.',
    repImpact: -1,
  },
  {
    id: 'BOARD_CONFLICT',
    labelTr: 'Yönetim kurulu ile kulüp vizyonu konusunda görüş ayrılığı yaşadım',
    labelEn: 'Strategic disagreement with the board over club vision',
    boardReplyTr: 'Başkanlık makamı vizyon farkının büyüdüğünü kabul ederek görevden ayrılışınızı onayladı.',
    boardReplyEn: 'The chairman acknowledged the divergence in vision and approved your departure.',
    repImpact: -2,
  },
  {
    id: 'NEW_CHALLENGE',
    labelTr: 'Kariyerimde daha büyük bir lig veya yeni bir macera hedefliyorum',
    labelEn: 'Seeking a new challenge in another project or league',
    boardReplyTr: 'Yönetim hizmetleriniz için teşekkür etti ancak sezon ortası ayrılık yeni görüşmelerde soru işareti yaratabilir.',
    boardReplyEn: 'The board thanked you, though leaving mid-project may raise questions in future interviews.',
    repImpact: -2,
  },
  {
    id: 'SQUAD_MORALE',
    labelTr: 'Soyunma odası kontrolü ve kadro içi uyum artık sürdürülemez durumda',
    labelEn: 'Dressing room cohesion and squad discipline broke down',
    boardReplyTr: 'Yönetim kurulu dürüst özeleştirinizi not etti ve kulübün yeni bir sese ihtiyaç duyduğuna katıldığını bildirdi.',
    boardReplyEn: 'The board appreciated your honesty and agreed a fresh voice was needed.',
    repImpact: -3,
  },
  {
    id: 'FANS_PRESSURE',
    labelTr: 'Tribün ve medya baskısı kulübün sportif huzurunu olumsuz etkiliyor',
    labelEn: 'Media & supporter pressure is hurting club stability',
    boardReplyTr: 'Yönetim basın baskısının ağır olduğunu kabul ederek karşılıklı fesih protokolünü imzaladı.',
    boardReplyEn: 'The board accepted the mutual termination amid intense media scrutiny.',
    repImpact: -2,
  },
  {
    id: 'STRESS',
    labelTr: 'Kişisel nedenler ve dinlenme ihtiyacı sebebiyle ara veriyorum',
    labelEn: 'Personal reasons and taking time away from touchline pressure',
    boardReplyTr: 'Kulüp yönetimi profesyonel vedanız için teşekkür edip kariyerinizin devamında başarılar diledi.',
    boardReplyEn: 'The club thanked you for your professionalism and wished you well.',
    repImpact: -1,
  },
];

export function evaluateResignation(
  club: Club,
  reasonId: ResignReasonOption['id'],
  customNote = '',
  licenseMode: LicenseMode = 'NO_DATA'
): {
  reasonLabel: string;
  boardReactionTitle: string;
  boardReactionBody: string;
  repImpact: number;
} {
  const found = RESIGN_REASONS.find((r) => r.id === reasonId) ?? RESIGN_REASONS[0];
  const noteSuffix = customNote.trim() ? ` Yönetim ek açıklamanızı ("${customNote.trim()}") resmi tutanağa işledi.` : '';
  return {
    reasonLabel: found.labelTr,
    boardReactionTitle: `${getClubDisplayName(club, licenseMode)} Yönetim Kurulu Kararı`,
    boardReactionBody: `${found.boardReplyTr}${noteSuffix}`,
    repImpact: found.repImpact,
  };
}

export interface BoardInterviewQuestion {
  id: string;
  interviewer: string;
  roleTr: string;
  questionTr: string;
  options: Array<{
    labelTr: string;
    scoreWeight: number; // -10 to +16
  }>;
}

export function generateBoardInterview(
  club: Club,
  manager: ManagerProfile,
  leagueId: LeagueId
): BoardInterviewQuestion[] {
  const leagueMetaName =
    leagueId === 'BUNDESLIGA'
      ? 'Bundesliga'
      : leagueId === 'EFL_CHAMPIONSHIP'
      ? 'EFL Championship'
      : leagueId === 'PREMIER_LEAGUE'
      ? 'Premier League'
      : leagueId === 'LA_LIGA'
      ? 'La Liga'
      : leagueId === 'SERIE_A'
      ? 'Serie A'
      : 'Lig';

  const isElite = club.reputation >= 80;
  const isTactician = manager.personality === 'TACTICIAN';
  const isNegotiator = manager.personality === 'NEGOTIATOR';

  return [
    {
      id: 'bi_1',
      interviewer: 'Kulüp Başkanı',
      roleTr: 'Yönetim Kurulu Başkanı',
      questionTr: `${leagueMetaName} hedeflerimiz ("${club.boardExpectation}") doğrultusunda ilk 100 gününüzde sahada nasıl bir futbol kimliği göreceğiz?`,
      options: [
        {
          labelTr: isElite
            ? '"Yüksek baskı, proaktif topa sahip olma ve her maçı domine eden kazanan kültür inşa edeceğim."'
            : '"Rakibi analiz eden, kompakt savunma disiplininden ödün vermeyen sonuç odaklı bir sistem kuracağım."',
          scoreWeight: isTactician ? 15 : 12,
        },
        {
          labelTr: '"Önce kadroya 4-5 yıldız transfer şart, bütçe verilmezse sonuç garanti edemem."',
          scoreWeight: -8,
        },
        {
          labelTr: '"Oyuncuların fiziksel gücünü ve geçiş oyununu yükselterek iç sahada yenilmez bir takım yaratacağım."',
          scoreWeight: 10,
        },
      ],
    },
    {
      id: 'bi_2',
      interviewer: 'Finans Direktörü (CFO)',
      roleTr: 'Mali İşler & FFP Sorumlusu',
      questionTr: `Mevcut transfer bütçemiz ${formatMoney(club.transferBudget)} ve haftalık maaş tavanımız ${formatMoney(club.wageBudgetWeekly)}. Pazarlık ve bütçe disiplinine nasıl yaklaşırsınız?`,
      options: [
        {
          labelTr: '"Kulüp kasasını korurum; serbest oyuncu, kiralama ve değerinin altında satış potansiyeli olan isimlere yönelirim."',
          scoreWeight: isNegotiator ? 16 : 13,
        },
        {
          labelTr: '"Kadro kalitesi için gerekirse maaş tavanını zorlamalı ve yönetimin ek kaynak yaratmasını sağlamalıyız."',
          scoreWeight: isElite ? 2 : -6,
        },
        {
          labelTr: '"Önce mevcut oyuncuların formunu artırır, yalnızca kritik eksik mevkilere nokta atışı takviye isterim."',
          scoreWeight: 11,
        },
      ],
    },
    {
      id: 'bi_3',
      interviewer: 'Sportif Direktör',
      roleTr: 'Futbol Şube Sorumlusu',
      questionTr: `Yoğun fikstürde akademi oyuncularına şans verme ve sakatlık krizlerini yönetme planınız nedir?`,
      options: [
        {
          labelTr: '"Altyapı direktörüyle haftalık raporlama kurar, 21 yaş altı gençlere kupa ve ligde planlı dakika veririm."',
          scoreWeight: 13,
        },
        {
          labelTr: '"Sadece hazır yıldızlarla oynarım; gençlerin gelişimi benim önceliğim değil."',
          scoreWeight: -5,
        },
        {
          labelTr: '"Fizyoterapist ve kondisyoner raporlarına göre rotasyon yapar, gençleri tecrübeli liderlerle eşleştiririm."',
          scoreWeight: 14,
        },
      ],
    },
    {
      id: 'bi_4',
      interviewer: 'Başkan Yardımcısı',
      roleTr: 'Medya & Kriz Yönetimi',
      questionTr: `Üst üste 3 mağlubiyet alındığında tribün ve basın baskısını nasıl göğüslersiniz?`,
      options: [
        {
          labelTr: '"Sorumluluğu tamamen üstlenirim, soyunma odasını basından koruyup taktiksel çözüme odaklanırım."',
          scoreWeight: 13,
        },
        {
          labelTr: '"Suçlu kimse medyada açıkça söylerim, hakemleri ve bütçe yetersizliğini gündeme getiririm."',
          scoreWeight: -7,
        },
        {
          labelTr: '"Soğukkanlı kalır, yönetimle şeffaf istişare içinde oyunu veri analizine göre revize ederim."',
          scoreWeight: 12,
        },
      ],
    },
  ];
}

export function evaluateBoardInterview(
  club: Club,
  manager: ManagerProfile,
  selectedIndices: number[],
  leagueId: LeagueId
): {
  accepted: boolean;
  score: number;
  requiredScore: number;
  verdictTitle: string;
  boardMessage: string;
} {
  const questions = generateBoardInterview(club, manager, leagueId);
  let interviewPoints = 0;
  questions.forEach((q, idx) => {
    const choiceIdx = selectedIndices[idx] ?? 0;
    interviewPoints += q.options[choiceIdx]?.scoreWeight ?? 0;
  });

  const repBonus = Math.round((manager.reputation - 50) * 0.75);
  const personalityBonus =
    manager.personality === 'NEGOTIATOR' ? 6 : manager.personality === 'TACTICIAN' ? 5 : 3;
  const totalScore = interviewPoints + repBonus + personalityBonus;

  // Hardcore threshold: prestigious clubs demand both high score and reasonable reputation!
  const repGap = club.reputation - manager.reputation;
  const requiredScore = Math.max(42, Math.round(club.reputation * 0.78));
  const accepted = repGap <= 26 && totalScore >= requiredScore;

  if (accepted) {
    return {
      accepted: true,
      score: totalScore,
      requiredScore,
      verdictTitle: 'Görüşme Başarılı — Sözleşme Teklifi!',
      boardMessage: `${club.realName} / ${club.fictionalName} yönetim kurulu sunumunuzdan ve taktik vizyonunuzdan etkilendi (Puan: ${totalScore}/${requiredScore}). Göreve hemen başlayabilirsiniz.`,
    };
  }

  const gapMsg =
    repGap > 26
      ? `Menajer itibarınız (${manager.reputation}) bu kulübün seviyesi (${club.reputation}) için henüz çok düşük bulundu.`
      : `Mülakat puanınız (${totalScore}) yönetim kurulunun aradığı seviyenin (${requiredScore}) altında kaldı.`;

  return {
    accepted: false,
    score: totalScore,
    requiredScore,
    verdictTitle: 'Başvuru Reddedildi',
    boardMessage: `${club.realName} / ${club.fictionalName} yönetimi adaylık sürecini olumsuz sonuçlandırdı. ${gapMsg} Önce daha ulaşılabilir bir kulüpte kendinizi kanıtlayın veya yanıtlarınızı güçlendirin.`,
  };
}

export interface SpokenTeamTalkOption {
  id: string;
  tone: TeamTalkTone;
  labelTr: string;
  speechTr: string;
}

export function getTeamTalkOptions(
  phase: TeamTalkPhase,
  scoreDiff: number,
  personality: ManagerPersonality
): SpokenTeamTalkOption[] {
  if (phase === 'PRE_MATCH') {
    return [
      {
        id: 'pre_1',
        tone: 'PASSIONATE',
        labelTr: 'Coşkulu Çağrı',
        speechTr: '"Beyler, bugün bu stadyumda terimizin son damlasına kadar savaşacağız. Taraftarımıza unutamayacağı bir 90 dakika borçluyuz!"',
      },
      {
        id: 'pre_2',
        tone: 'TACTICAL',
        labelTr: 'Taktik Disiplin',
        speechTr: '"Hafta boyunca çalıştığımız blok mesafesini koruyun. Topu kaybettiğimiz ilk 5 saniyede alanları kapatıp rakibi hataya zorlayacağız."',
      },
      {
        id: 'pre_3',
        tone: 'AGGRESSIVE',
        labelTr: 'Sert Uyarı',
        speechTr: '"Sahada gevşeklik, basit pas hatası veya yürüyen oyuncu görmek istemiyorum! İlk düdükten itibaren rakibin nefesini kesin."',
      },
      {
        id: 'pre_4',
        tone: 'CALM',
        labelTr: 'Soğukkanlı Güven',
        speechTr: '"Üzerinizde hiçbir baskı yok. Sadece kendi oyunumuzu sakinlikle oynayın, kalite olarak bu maçı çözecek güce fazlasıyla sahibiz."',
      },
      {
        id: 'pre_5',
        tone: 'PASSIONATE',
        labelTr: 'Forma & Arma Ruhu',
        speechTr: '"Bu formanın ağırlığını bilerek çıkın. İkili mücadelelerden asla kaçmayın, her topa hayatınız bağlıymış gibi saldırın!"',
      },
      {
        id: 'pre_6',
        tone: 'TACTICAL',
        labelTr: 'Kanat & Geçiş Planı',
        speechTr: '"Rakip beklerin arkasındaki boşlukları iyi analiz ettik. Sabırlı pas yapıp doğru anda dikine koşularla fişi çekeceğiz."',
      },
      {
        id: 'pre_7',
        tone: personality === 'DESPOT' ? 'AGGRESSIVE' : 'CALM',
        labelTr: personality === 'DESPOT' ? 'Tavizsiz Otorite' : 'Akılcı Odak',
        speechTr:
          personality === 'DESPOT'
            ? '"Burada patron benim ve sahada sadece verdiğim talimatları eksiksiz uygulayanlar kalacak. Çıkın ve kazanın!"'
            : '"İlk 15 dakikada oyunu kontrol altında tutun, panik yapmadan pas ritmimizi oturttuğumuzda fırsatlar kendiliğinden gelecek."',
      },
    ];
  }

  if (phase === 'HALF_TIME') {
    if (scoreDiff < 0) {
      return [
        {
          id: 'ht_lose_1',
          tone: 'AGGRESSIVE',
          labelTr: 'Soyunma Odası Fırtınası',
          speechTr: '"Bu ilk yarıdaki oyun kesinlikle kabul edilemez! Bu formayı giyiyorsanız ikinci yarıda sahayı rakiplere dar etmek zorundasınız!"',
        },
        {
          id: 'ht_lose_2',
          tone: 'PASSIONATE',
          labelTr: 'Geri Dönüş İnancı',
          speechTr: '"Skor tabelasına bakmayın! Bir tek gol bütün maçı çevirir. Başınızı dik tutun, ben size sonuna kadar inanıyorum!"',
        },
        {
          id: 'ht_lose_3',
          tone: 'TACTICAL',
          labelTr: 'Soğukkanlı Düzeltme',
          speechTr: '"Orta sahada boşluk veriyoruz. Çizgileri biraz daha öne çekip merkezde sayısal üstünlüğü alırsak maçı çevireceğiz."',
        },
        {
          id: 'ht_lose_4',
          tone: 'CALM',
          labelTr: 'Paniği Önle',
          speechTr: '"Acele edip uzun toplara vurmayın. 45 dakika daha var; sabırlı ve akıllı kalırsak eşitliği yakalarız."',
        },
        {
          id: 'ht_lose_5',
          tone: 'AGGRESSIVE',
          labelTr: 'Mücadele Resti',
          speechTr: '"İkinci topların hiçbirini kazanamadınız! Mücadeleye girmeyen herkesi kenara almaktan çekinmem, kendinize gelin!"',
        },
        {
          id: 'ht_lose_6',
          tone: 'PASSIONATE',
          labelTr: 'Taraftar İçin Ayağa Kalk',
          speechTr: '"Tribünde bizi destekleyen binlerce insan için ikinci yarıda bambaşka bir karakter gösterme zamanı. Çıkıp hikayeyi baştan yazın!"',
        },
      ];
    }
    if (scoreDiff === 0) {
      return [
        {
          id: 'ht_draw_1',
          tone: 'PASSIONATE',
          labelTr: 'Vitesi Yükselt',
          speechTr: '"Maç ortada ama üstünlüğü almaya çok yakınız. İkinci yarıda biraz daha cesur ve iştahlı olursak 3 puanı söker alırız!"',
        },
        {
          id: 'ht_draw_2',
          tone: 'TACTICAL',
          labelTr: 'Taktik İnce Ayar',
          speechTr: '"Rakibin merkezini iyi kapattık, şimdi kenar oyuncularımızı daha sık çizgiye indirip ceza sahasını kalabalık tutalım."',
        },
        {
          id: 'ht_draw_3',
          tone: 'AGGRESSIVE',
          labelTr: 'Daha Fazla Istek',
          speechTr: '"Beraberlik bize yetmez! Son paslarda çok cömertsiniz, ceza sahası önünde çok daha acımasız olmalısınız."',
        },
        {
          id: 'ht_draw_4',
          tone: 'CALM',
          labelTr: 'Dengeyi Koru',
          speechTr: '"Oyunun kontrolü bizde, aceleci hatalar yapıp rakibe kontra fırsatı vermeyin. Sabrımız galibiyeti getirecek."',
        },
        {
          id: 'ht_draw_5',
          tone: 'TACTICAL',
          labelTr: 'Pres Tuzağı',
          speechTr: '"Rakip bekler yorulmaya başladı. İkinci yarıda pasları o tarafa yönlendirip yüksek presle hataya zorlayalım."',
        },
        {
          id: 'ht_draw_6',
          tone: 'PASSIONATE',
          labelTr: 'Yedekler Dahil Kenetlenme',
          speechTr: '"Sahadaki 11 kadar kulübedeki herkesin enerjisine ihtiyacımız var. Son düdüğe kadar tek vücut gibi savaşacağız!"',
        },
      ];
    }
    return [
      {
        id: 'ht_win_1',
        tone: 'CALM',
        labelTr: 'Skoru & Enerjiyi Koru',
        speechTr: '"Harika bir ilk yarı çıkardınız. Şimdi rehavete kapılmadan topa sahip olun ve enerjinizi akıllıca yönetin."',
      },
      {
        id: 'ht_win_2',
        tone: 'AGGRESSIVE',
        labelTr: 'Rehavete Geçit Yok',
        speechTr: '"Maç henüz bitmedi! Skorun arkasına saklanırsanız rakibi maça ortak edersiniz. İkinci yarıya 0-0 gibi başlayın!"',
      },
      {
        id: 'ht_win_3',
        tone: 'PASSIONATE',
        labelTr: 'Farkı Açın',
        speechTr: '"İlk yarıdaki temponuz muhteşemdi! Aynı coşkuyla devam edip ikinci golü de bulalım ve rakibin umudunu bitirelim."',
      },
      {
        id: 'ht_win_4',
        tone: 'TACTICAL',
        labelTr: 'Kompakt Kontrol',
        speechTr: '"Öndeyiz ama savunma çizgisini gereksiz yere öne çıkarıp arkaya koşu vermeyin. Kontralarda net şanslar yakalayacağız."',
      },
      {
        id: 'ht_win_5',
        tone: 'CALM',
        labelTr: 'Profesyonel Yönetim',
        speechTr: '"Disiplini elden bırakmayın, kart riskine girmeden akıllı paslarla rakibin direncini kırın."',
      },
      {
        id: 'ht_win_6',
        tone: 'TACTICAL',
        labelTr: 'Büyük Takım Refleksi',
        speechTr: '"İlk 15 dakika rakip risk alıp saldıracaktır. Merkezdeki pas üçgenlerini daraltıp bulduğumuz boşlukları cezalandıralım."',
      },
    ];
  }

  // POST_MATCH
  if (scoreDiff > 0) {
    return [
      {
        id: 'pm_win_1',
        tone: 'PASSIONATE',
        labelTr: 'Coşkulu Kutlama',
        speechTr: '"Harikasınız çocuklar! Bugün hem karakter hem kalite koydunuz, bu galibiyeti sonuna kadar hak ettiniz!"',
      },
      {
        id: 'pm_win_2',
        tone: 'CALM',
        labelTr: 'Ayakları Yere Basan Tebrik',
        speechTr: '"Önemli bir 3 puan aldık ama önümüzde uzun bir yol var. Güzel bir toparlanma yapıp hemen sıradaki maça odaklanacağız."',
      },
      {
        id: 'pm_win_3',
        tone: 'TACTICAL',
        labelTr: 'Plan Övgüsü',
        speechTr: '"Hafta içi çalıştığımız her taktik detayı sahaya kusursuz yansıttınız. Disiplininiz için hepinizi tebrik ediyorum."',
      },
      {
        id: 'pm_win_4',
        tone: 'AGGRESSIVE',
        labelTr: 'Yüksek Standart Uyarısı',
        speechTr: '"Kazandık ama son 20 dakikadaki konsantrasyon düşüşünü kabul etmiyorum. Şampiyonluk istiyorsak daha keskin olmalıyız."',
      },
      {
        id: 'pm_win_5',
        tone: 'PASSIONATE',
        labelTr: 'Takım Ruhu Vurgusu',
        speechTr: '"İlk 11\'den sonradan giren arkadaşlarınıza kadar herkes tek yumruk oldu. Bu ruhla önümüzde kimse duramaz!"',
      },
      {
        id: 'pm_win_6',
        tone: 'CALM',
        labelTr: 'Taraftara Armağan',
        speechTr: '"Bizi 90 dakika destekleyen taraftarımıza güzel bir hediye verdiniz. Soyunma odasında bunun keyfini çıkarın."',
      },
    ];
  }

  return [
    {
      id: 'pm_loss_1',
      tone: 'PASSIONATE',
      labelTr: 'Takıma Sahip Çık',
      speechTr: '"Bugün sonuç istediğimiz gibi olmadı ama sahadaki mücadelenizin arkasındayım. Birlikte düşer, birlikte kalkarız."',
    },
    {
      id: 'pm_loss_2',
      tone: 'AGGRESSIVE',
      labelTr: 'Sert Hesaplaşma',
      speechTr: '"Bu sonuç ve umursamazlık bu kulübün seviyesine yakışmadı! Yarın sabah antrenman sahasında herkesin aynaya bakmasını bekliyorum."',
    },
    {
      id: 'pm_loss_3',
      tone: 'TACTICAL',
      labelTr: 'Analiz & Çözüm',
      speechTr: '"Nerede hata yaptığımızı net gördük. Panik yok; video analizle pozisyon hatalarını düzeltip haftaya çok daha güçlü döneceğiz."',
    },
    {
      id: 'pm_loss_4',
      tone: 'CALM',
      labelTr: 'Stresi Dağıt',
      speechTr: '"Futbolda böyle günler vardır. Kafanızı karıştırmayın, iyi dinlenin ve bir sonraki maça temiz bir zihinle hazırlanın."',
    },
    {
      id: 'pm_loss_5',
      tone: 'AGGRESSIVE',
      labelTr: 'Forma Rekabeti Uyarısı',
      speechTr: '"Kimsenin yeri garanti değil! Bu formayı hak ettiğini göstermeyen herkes gelecek hafta kulübede oturur."',
    },
    {
      id: 'pm_loss_6',
      tone: 'PASSIONATE',
      labelTr: 'Reaksiyon Sözü',
      speechTr: '"Bu kayıp canımızı yakmalı ama bizi yıkamaz. Önümüzdeki hafta sahada nasıl reaksiyon verdiğimizi herkese göstereceğiz!"',
    },
  ];
}

export type PressChoice = 'CONFIDENT' | 'HUMBLE' | 'PRESSURE_OPP';

export function evaluatePressQuestion(
  choice: PressChoice,
  personality: ManagerPersonality
): {
  moraleDelta: number;
  confidenceDelta: number;
  repDelta: number;
  headline: string;
  body: string;
} {
  if (choice === 'CONFIDENT') {
    const bonus = personality === 'DESPOT' || personality === 'NEGOTIATOR' ? 1 : 0;
    return {
      moraleDelta: 3 + bonus,
      confidenceDelta: 2,
      repDelta: 1,
      headline: 'Teknik Direktörden Net Mesaj: "Sahaya Kazanmak İçin Çıkıyoruz"',
      body: 'Basın toplantısındaki özgüvenli tavrınız taraftarları heyecanlandırdı, muhabirler kulüp içi inancın altını çizdi.',
    };
  }
  if (choice === 'PRESSURE_OPP') {
    const bonus = personality === 'DESPOT' || personality === 'TACTICIAN' ? 2 : 0;
    return {
      moraleDelta: 2 + bonus,
      confidenceDelta: 1,
      repDelta: 1,
      headline: 'Mind Games Başladı: "Rakibin Zayıf Noktalarını Biliyoruz"',
      body: 'Rakip teknik heyete gönderilen taktiksel mesaj manşetlere taşındı ve maç öncesi tansiyonu yükseltti.',
    };
  }
  // HUMBLE
  const encBonus = personality === 'ENCOURAGING' ? 2 : 0;
  return {
    moraleDelta: 4 + encBonus,
    confidenceDelta: 3,
    repDelta: 0,
    headline: 'Sakin Duruş: "Saygı Duyuyoruz Ama Planımıza Sadığız"',
    body: 'Ölçülü ve profesyonel açıklamalarınız hem basın mensuplarının hem de yönetim kurulunun takdirini topladı.',
  };
}

export function partitionMatchdaySquad(
  club: Club,
  tactics: TacticsConfig
): {
  starters: Player[];
  bench: Player[];
  reserves: Player[];
  injured: Player[];
} {
  const starterIds = new Set(tactics.slots.map((s) => s.playerId).filter(Boolean) as string[]);
  const starters = tactics.slots
    .map((s) => club.players.find((p) => p.id === s.playerId))
    .filter((p): p is Player => Boolean(p));

  const benchIdSet = new Set<string>();
  const bench: Player[] = [];
  for (const id of tactics.benchPlayerIds ?? []) {
    if (bench.length >= 9) break;
    if (starterIds.has(id) || benchIdSet.has(id)) continue;
    const p = club.players.find((pl) => pl.id === id);
    if (p && p.injuredWeeks === 0) {
      benchIdSet.add(id);
      bench.push(p);
    }
  }

  const reserves = club.players
    .filter((p) => !starterIds.has(p.id) && !benchIdSet.has(p.id) && p.injuredWeeks === 0)
    .sort((a, b) => b.ovr - a.ovr);

  const injured = club.players
    .filter((p) => p.injuredWeeks > 0)
    .sort((a, b) => b.injuredWeeks - a.injuredWeeks);

  return { starters, bench, reserves, injured };
}

export function swapPlayerZone(
  tactics: TacticsConfig,
  club: Club,
  playerId: string,
  targetZone: 'STARTER' | 'BENCH' | 'RESERVES',
  targetSlotIndex?: number
): TacticsConfig {
  const targetPlayer = club.players.find((p) => p.id === playerId);
  if (!targetPlayer || targetPlayer.injuredWeeks > 0) return tactics;

  const currentSlotIdx = tactics.slots.findIndex((s) => s.playerId === playerId);
  const currentBench = (tactics.benchPlayerIds ?? []).filter(
    (id) => club.players.some((p) => p.id === id && p.injuredWeeks === 0)
  );
  const inBench = currentBench.includes(playerId);

  if (targetZone === 'BENCH') {
    if (inBench) return tactics;
    if (currentSlotIdx !== -1) {
      const slotRole = tactics.slots[currentSlotIdx].role;
      const starterIds = new Set(tactics.slots.map((s) => s.playerId).filter(Boolean) as string[]);
      const candidateIds = [
        ...currentBench,
        ...club.players
          .filter((p) => !starterIds.has(p.id) && p.injuredWeeks === 0)
          .sort((a, b) => b.ovr - a.ovr)
          .map((p) => p.id),
      ];
      const replacementId = candidateIds
        .map((id) => club.players.find((p) => p.id === id)!)
        .filter(Boolean)
        .sort(
          (a, b) =>
            getRoleCompatibility(b.naturalRole, slotRole) * b.ovr -
            getRoleCompatibility(a.naturalRole, slotRole) * a.ovr
        )[0]?.id;

      if (!replacementId) return tactics;
      const nextSlots = tactics.slots.map((s, idx) =>
        idx === currentSlotIdx ? { ...s, playerId: replacementId } : s
      );
      const nextBench = [
        playerId,
        ...currentBench.filter((id) => id !== replacementId && id !== playerId),
      ].slice(0, 9);
      return { ...tactics, slots: nextSlots, benchPlayerIds: nextBench };
    }

    const nextBench = [...currentBench.filter((id) => id !== playerId), playerId].slice(-9);
    return { ...tactics, benchPlayerIds: nextBench };
  }

  if (targetZone === 'RESERVES') {
    if (currentSlotIdx !== -1) {
      const slotRole = tactics.slots[currentSlotIdx].role;
      const starterIds = new Set(tactics.slots.map((s) => s.playerId).filter(Boolean) as string[]);
      const replacement = club.players
        .filter((p) => !starterIds.has(p.id) && p.id !== playerId && p.injuredWeeks === 0)
        .sort(
          (a, b) =>
            getRoleCompatibility(b.naturalRole, slotRole) * b.ovr -
            getRoleCompatibility(a.naturalRole, slotRole) * a.ovr
        )[0];
      if (!replacement) return tactics;
      const nextSlots = tactics.slots.map((s, idx) =>
        idx === currentSlotIdx ? { ...s, playerId: replacement.id } : s
      );
      const nextBench = currentBench.filter((id) => id !== replacement.id && id !== playerId);
      return { ...tactics, slots: nextSlots, benchPlayerIds: nextBench };
    }
    return {
      ...tactics,
      benchPlayerIds: currentBench.filter((id) => id !== playerId),
    };
  }

  // targetZone === 'STARTER'
  if (currentSlotIdx !== -1) return tactics;
  let slotIdx = targetSlotIndex ?? -1;
  if (slotIdx < 0 || slotIdx >= tactics.slots.length) {
    let bestScore = -1;
    tactics.slots.forEach((s, idx) => {
      const score = getRoleCompatibility(targetPlayer.naturalRole, s.role);
      if (score > bestScore) {
        bestScore = score;
        slotIdx = idx;
      }
    });
  }
  if (slotIdx < 0) slotIdx = 0;

  const displacedId = tactics.slots[slotIdx].playerId;
  const nextSlots = tactics.slots.map((s, idx) =>
    idx === slotIdx ? { ...s, playerId } : s
  );
  let nextBench = currentBench.filter((id) => id !== playerId);
  if (displacedId && !nextBench.includes(displacedId)) {
    nextBench = [displacedId, ...nextBench].slice(0, 9);
  }
  return { ...tactics, slots: nextSlots, benchPlayerIds: nextBench };
}

export function generateInitialInbox(
  club: Club,
  leagueId: LeagueId,
  manager: ManagerProfile,
  licenseMode: LicenseMode,
  currentWeek: number
): InboxMessage[] {
  const clubName = getClubDisplayName(club, licenseMode);
  const leagueNames: Record<LeagueId, string> = {
    SUPER_LIG: 'Trendyol Süper Lig',
    TR_1_LIG: 'Trendyol 1. Lig',
    TR_2_LIG_BEYAZ: 'Nesine 2. Lig Beyaz Grup',
    TR_2_LIG_KIRMIZI: 'Nesine 2. Lig Kırmızı Grup',
    PREMIER_LEAGUE: 'Premier League',
    LA_LIGA: 'EA Sports La Liga',
    SERIE_A: 'Serie A Enilive',
    BUNDESLIGA: 'Bundesliga',
    LIGUE_1: 'Ligue 1',
    EREDIVISIE: 'Eredivisie',
    LIGA_PORTUGAL: 'Liga Portugal',
    BELGIAN_PRO_LEAGUE: 'Belgian Pro League',
    EFL_CHAMPIONSHIP: 'EFL Championship',
  };
  const leagueName = leagueNames[leagueId] ?? 'Trendyol Süper Lig';
  const starPlayer = [...club.players].sort((a, b) => b.ovr - a.ovr)[0];
  const starName = starPlayer ? getPlayerDisplayName(starPlayer, licenseMode) : 'Kaptan';

  return [
    {
      id: `inbox_init_board_${club.id}_${currentWeek}`,
      week: currentWeek,
      sender: 'Yönetim Kurulu Başkanı',
      senderRole: clubName,
      subject: `${clubName} Göreve Başlama Brifingi & Mali Disiplin`,
      body: `Sayın ${manager.firstName} ${manager.lastName}, ${leagueName} 2026–27 sezonu için ${clubName} teknik direktörlüğüne hoş geldiniz. Yönetim kurulu olarak sezon hedefimizi "${club.boardExpectation}" olarak belirledik. Mevcut transfer bütçemiz ${formatMoney(club.transferBudget)} ve haftalık maaş tavanımız ${formatMoney(club.wageBudgetWeekly)} seviyesindedir. Harcamalarda FFP / PSR kurallarına azami dikkat göstermenizi bekliyoruz.`,
      category: 'BOARD',
      read: false,
      urgent: true,
      actionLabel: 'Finans & Bütçeyi İncele',
      targetScreen: 'FINANCE',
    },
    {
      id: `inbox_init_tactics_${club.id}_${currentWeek}`,
      week: currentWeek,
      sender: 'Baş Antrenör Ekibi',
      senderRole: 'Taktik & Analiz Departmanı',
      subject: `Maç Günü 11, Yedek Kulübesi (9) ve Kadro Dışı Planlaması`,
      body: `Hocam, sezon öncesi ilk taktik raporumuz hazır. 3D Taktik Sahasında hem İlk 11'i sürükleyip düzenleyebilir hem de 9 kişilik maç günü yedek kulübesi ile kadro dışı oyuncuları belirleyebilirsiniz. Takımın kilit ismi ${starName} (${starPlayer?.ovr ?? 78} OVR) kamp dönemini yüksek formla tamamladı.`,
      category: 'MATCH',
      read: false,
      actionLabel: '3D Taktik Tahtasını Aç',
      targetScreen: 'TACTICS',
    },
    {
      id: `inbox_init_scout_${club.id}_${currentWeek}`,
      week: currentWeek,
      sender: 'Baş Gözlemci (Chief Scout)',
      senderRole: 'Transfer İstihbarat',
      subject: `${leagueName} Transfer Penceresi: Serbest & Kiralık Fırsatları`,
      body: `Avrupa genelinde 50'den fazla oyuncu izleme listemize eklendi. Nakit bütçeyi zorlamadan güçlenmek isterseniz Serbest Oyuncular (€0 bonservis) ve Kiralık Genç Yıldızlar listesini kontrol etmenizi öneririz. Rakipler pazarlıklarda çok inatçı davranıyor; ilk teklifte anlaşma beklemiyoruz.`,
      category: 'SCOUT',
      read: false,
      actionLabel: 'Transfer Merkezine Git',
      targetScreen: 'TRANSFERS',
    },
  ];
}

export function generateWeeklyInbox(
  club: Club,
  allClubs: Club[],
  nextFixture: Fixture | undefined,
  newInjuries: Array<{ playerName: string; injuryName: string; weeks: number }>,
  licenseMode: LicenseMode,
  nextWeek: number,
  lastResult?: { opponentName: string; myGoals: number; oppGoals: number }
): InboxMessage[] {
  const messages: InboxMessage[] = [];

  if (lastResult) {
    const won = lastResult.myGoals > lastResult.oppGoals;
    const drew = lastResult.myGoals === lastResult.oppGoals;
    messages.push({
      id: `inbox_post_${nextWeek}_${club.id}`,
      week: nextWeek,
      sender: 'Performans & Medya Masası',
      senderRole: 'Maç Raporu',
      subject: won
        ? `Galibiyet Raporu: ${lastResult.opponentName} (${lastResult.myGoals}-${lastResult.oppGoals})`
        : drew
        ? `Beraberlik Analizi: ${lastResult.opponentName} (${lastResult.myGoals}-${lastResult.oppGoals})`
        : `Mağlubiyet Uyarısı: ${lastResult.opponentName} (${lastResult.myGoals}-${lastResult.oppGoals})`,
      body: won
        ? `Tebrikler hocam! ${lastResult.opponentName} karşısında alınan ${lastResult.myGoals}-${lastResult.oppGoals} skor taraftar ve yönetim güvenini yükseltti. Genç oyuncuların maç ritmi gelişimine yansıdı.`
        : drew
        ? `${lastResult.opponentName} maçı ${lastResult.myGoals}-${lastResult.oppGoals} sona erdi. Önümüzdeki hafta kondisyon ve rol uyumunu gözden geçirmekte fayda var.`
        : `${lastResult.opponentName} karşısındaki ${lastResult.myGoals}-${lastResult.oppGoals} yenilgi sonrası yönetim kurulu taktiksel tepki bekliyor. Pres şiddetini ve yorgun oyuncuları rotasyona almayı değerlendirin.`,
      category: 'MATCH',
      read: false,
      urgent: !won && !drew,
      actionLabel: 'Puan Durumuna Bak',
      targetScreen: 'STANDINGS',
    });
  }

  if (newInjuries.length > 0) {
    const lines = newInjuries
      .map((inj) => `• ${inj.playerName}: ${inj.injuryName} (${inj.weeks} hafta sahalardan uzak)`)
      .join('\n');
    messages.push({
      id: `inbox_med_${nextWeek}_${club.id}`,
      week: nextWeek,
      sender: 'Kulüp Başhekimi',
      senderRole: 'Sağlık Kurulu',
      subject: `Acil Revir Raporu: ${newInjuries.length} Yeni Sakatlık`,
      body: `Haftalık fiziksel tarama sonuçları:\n${lines}\n\nSakatlanan oyuncular maç günü kadrosundan otomatik olarak çıkarıldı. Yedek kulübesini ve ilk 11'i güncellemeniz gerekiyor.`,
      category: 'MEDICAL',
      read: false,
      urgent: true,
      actionLabel: 'Kadro & Yedekleri Düzenle',
      targetScreen: 'TACTICS',
    });
  }

  if (nextFixture) {
    const isHome = nextFixture.homeClubId === club.id;
    const oppClub = allClubs.find((c) => c.id === (isHome ? nextFixture.awayClubId : nextFixture.homeClubId));
    const oppName = oppClub ? getClubDisplayName(oppClub, licenseMode) : 'Rakip';
    const derby = isDerbyFixture(nextFixture.homeClubId, nextFixture.awayClubId);
    if (derby) {
      messages.push({
        id: `inbox_derby_${nextWeek}_${club.id}`,
        week: nextWeek,
        sender: 'Yardımcı Antrenör',
        senderRole: 'Maç Önü Brifingi',
        subject: `DERBİ ALARMI: ${derby} — ${oppName}`,
        body: `${nextWeek}. haftada ${isHome ? 'evimizde' : 'deplasmanda'} ${oppName} ile kritik ${derby} mücadelesine çıkıyoruz! Taraftar beklentisi tavan yapmış durumda; yanlış taktik veya yorgun 11 ağır bedel ödetebilir.`,
        category: 'BOARD',
        read: false,
        urgent: true,
        actionLabel: 'Taktik Hazırlığı',
        targetScreen: 'TACTICS',
      });
    }
  }

  return messages;
}

export function generatePressConferenceQuestions(
  club: Club,
  oppClub: Club | undefined,
  week: number,
  derbyLabel: string | null,
  licenseMode: LicenseMode
): PressQuestion[] {
  const clubName = getClubDisplayName(club, licenseMode);
  const oppName = oppClub ? getClubDisplayName(oppClub, licenseMode) : 'rakibimiz';
  return [
    {
      id: `pq_1_${week}`,
      journalist: 'Burak Özdemir',
      outlet: 'Zephyr Spor Muhabiri',
      question: derbyLabel
        ? `${week}. haftada ${oppName} ile büyük ${derbyLabel} mücadelesine çıkıyorsunuz. Soyunma odasındaki hava ve maça yaklaşımınız nasıl?`
        : `${week}. hafta öncesinde ${clubName} taraftarına ve ${oppName} karşısındaki oyun planınıza dair ne söylemek istersiniz?`,
      options: [
        { choice: 'CONFIDENT', label: '"Sahaya sadece 3 puan için çıkacağız, kimse kalitemizden şüphe etmesin."' },
        { choice: 'HUMBLE', label: '"Rakibe saygı duyuyoruz ama disiplinli planımızla sahadan istediğimizi alacağız."' },
        { choice: 'PRESSURE_OPP', label: '"Rakibin savunma zaaflarını tek tek çözdük, baskımız altında dağılacaklar."' },
      ],
    },
    {
      id: `pq_2_${week}`,
      journalist: 'Elena Martín',
      outlet: 'Avrupa Futbol Masası',
      question: `Sıkışık fikstürde kadro rotasyonu, fiziksel yorgunluk ve yüksek sakatlık riskini nasıl dengelemeyi planlıyorsunuz?`,
      options: [
        { choice: 'HUMBLE', label: '"Sağlık kurulumuz ve kondisyonerlerimizle her oyuncunun yükünü bilimsel verilerle yönetiyoruz."' },
        { choice: 'CONFIDENT', label: '"Kadro derinliğimize ve genç oyuncularımızın enerjisine sonuna kadar güveniyorum."' },
        { choice: 'PRESSURE_OPP', label: '"Bizim fiziksel tempomuza 90 dakika dayanabilecek takım sayısı ligde çok az."' },
      ],
    },
    {
      id: `pq_3_${week}`,
      journalist: 'Serkan Yılmazer',
      outlet: 'Tribün Gündemi',
      question: `Yönetimin sezon hedefi ("${club.boardExpectation}") ve FFP mali disiplin baskısı kararlarınızı nasıl etkiliyor?`,
      options: [
        { choice: 'HUMBLE', label: '"Kulüp bütçesine sadık kalarak sahadaki emeğimiz ve organizasyonumuzla hedefe yürüyoruz."' },
        { choice: 'CONFIDENT', label: '"Baskı büyük kulüplerin doğasında var, bu sorumluluk bizi daha da keskinleştiriyor."' },
        { choice: 'PRESSURE_OPP', label: '"Masada değil sahada konuşuruz; rakiplerimiz bizim oyun gücümüzü hesaplamak zorunda."' },
      ],
    },
    {
      id: `pq_4_${week}`,
      journalist: 'Lukas Weber',
      outlet: 'Taktik Analiz Dergisi',
      question: `Son antrenmanlarda farklı diziliş ve pres varyasyonları denediğiniz konuşuluyor. Rakip teknik direktörün sürpriz hamlelerine karşı B planınız hazır mı?`,
      options: [
        { choice: 'CONFIDENT', label: '"Birden fazla oyun şablonuna hakimiz; maç içinde sistemi değiştirebilecek esnekliğe sahibiz."' },
        { choice: 'PRESSURE_OPP', label: '"Biz kendi oyunumuzu dayatacağız; önlem alması gereken taraf biz değil rakibimiz."' },
        { choice: 'HUMBLE', label: '"Detayları sahaya saklıyoruz; önemli olan oyuncularımızın görev bilincini 90 dakikaya yayması."' },
      ],
    },
    {
      id: `pq_5_${week}`,
      journalist: 'Claire Bennett',
      outlet: 'Transfer & Akademi Dosyası',
      question: `Transfer penceresindeki zorlu pazarlıklar, yüksek menajer komisyonları ve kulüp akademisinden gençlerin A takıma çıkışı hakkında görüşünüz nedir?`,
      options: [
        { choice: 'HUMBLE', label: '"Hak etmeyen hiçbir kontratı kulübe yüklemeyiz; formayı çalışkan gençlere açmaktan çekinmeyiz."' },
        { choice: 'CONFIDENT', label: '"Doğru profilleri kadroya katarken mevcut yıldızlarımızın gelişimine de liderlik ediyoruz."' },
        { choice: 'PRESSURE_OPP', label: '"Transferde kimseye boyun eğmeyiz; elimizdeki kadro bile rakiplere üstünlük kurmaya yeter."' },
      ],
    },
  ];
}

export function applyWeeklyTeamTraining(
  players: Player[],
  plan: TrainingPlan,
  staff: StaffMember[],
  week: number
): {
  updatedPlayers: Player[];
  summaryText: string;
  progressedNames: string[];
  strainedNames: string[];
} {
  const assistant = staff.find((s) => s.role === 'ASSISTANT');
  const fitness = staff.find((s) => s.role === 'FITNESS');
  const youthDir = staff.find((s) => s.role === 'YOUTH_DIRECTOR');

  const asstFactor = 1 + ((assistant?.rating ?? 70) - 70) * 0.008;
  const fitFactor = 1 + ((fitness?.rating ?? 70) - 70) * 0.008;
  const youthFactor = 1 + ((youthDir?.rating ?? 70) - 70) * 0.009;

  const intensityMultiplier =
    plan.intensity === 'LOW' ? 0.55 : plan.intensity === 'BALANCED' ? 1.0 : plan.intensity === 'INTENSE' ? 1.45 : 1.85;
  const conditionDelta =
    plan.intensity === 'LOW' ? 7 : plan.intensity === 'BALANCED' ? 2 : plan.intensity === 'INTENSE' ? -4 : -9;
  const sharpnessDelta =
    plan.intensity === 'LOW' ? 1 : plan.intensity === 'BALANCED' ? 4 : plan.intensity === 'INTENSE' ? 7 : 9;

  const atkCount = plan.sessions.filter((s) => s === 'ATTACKING_FINISHING').length;
  const defCount = plan.sessions.filter((s) => s === 'DEFENSIVE_PRESS').length;
  const phyCount = plan.sessions.filter((s) => s === 'PHYSICAL_ENDURANCE').length;
  const recCount = plan.sessions.filter((s) => s === 'RECOVERY_YOGA' || s === 'REST_DAY').length;
  const tacCount = plan.sessions.filter((s) => s === 'TACTICS_SHAPE' || s === 'MATCH_PREP').length;

  const progressedNames: string[] = [];
  const strainedNames: string[] = [];

  const updatedPlayers = players.map((p, idx) => {
    if (p.injuredWeeks > 0) return p;

    const ageGain = p.age <= 21 ? 0.14 * youthFactor : p.age <= 25 ? 0.08 : 0.025;
    const focusBoost = p.trainingFocus === 'RECOVERY' ? 0.5 : 1.0;
    const rawGrowth = ageGain * intensityMultiplier * asstFactor * focusBoost;

    let nextGrowth = p.growthProgress + rawGrowth;
    let nextOvr = p.ovr;
    if (nextGrowth >= 1 && p.ovr < p.potential) {
      nextOvr += 1;
      nextGrowth -= 1;
      progressedNames.push(p.realName);
    }

    const recRecovery = recCount * 2.5 * fitFactor;
    const extraFatigue = phyCount >= 3 ? -3 : 0;
    const condChange =
      (p.trainingFocus === 'RECOVERY' ? 8 : conditionDelta) + recRecovery + extraFatigue;
    const nextCondition = Math.max(38, Math.min(100, Math.round(p.condition + condChange)));
    const nextSharpness = Math.max(
      40,
      Math.min(100, Math.round(p.sharpness + sharpnessDelta + tacCount * 1.4))
    );

    let nextAttrs = { ...p.attributes };
    if (atkCount > 0 && idx % 2 === 0 && plan.intensity !== 'LOW') {
      nextAttrs.shooting = Math.min(99, nextAttrs.shooting + (atkCount >= 2 ? 1 : 0));
    }
    if (defCount > 0 && p.positionGroup === 'DEF' && plan.intensity !== 'LOW') {
      nextAttrs.defending = Math.min(99, nextAttrs.defending + (defCount >= 2 ? 1 : 0));
    }

    if (plan.intensity === 'DOUBLE' && p.condition < 62 && (idx + week) % 11 === 0) {
      strainedNames.push(p.realName);
    }

    return {
      ...p,
      ovr: nextOvr,
      growthProgress: Math.min(0.99, nextGrowth),
      condition: nextCondition,
      sharpness: nextSharpness,
      attributes: nextAttrs,
    };
  });

  return {
    updatedPlayers,
    summaryText: `${week}. hafta antrenman bloğu (${plan.intensity}) uygulandı. Kondisyon ve maç keskinliği güncellendi.${
      progressedNames.length > 0 ? ` Gelişenler: ${progressedNames.slice(0, 3).join(', ')}.` : ''
    }`,
    progressedNames,
    strainedNames,
  };
}

export function generateScoutReport(
  player: Player,
  clubName: string,
  leagueId: LeagueId,
  chiefScoutRating: number,
  week: number,
  licenseMode: LicenseMode
): ScoutReport {
  const accuracy = Math.min(0.98, 0.72 + (chiefScoutRating - 60) * 0.008);
  const spread = Math.max(1, Math.round((1 - accuracy) * 10));
  const potLow = Math.max(player.ovr, player.potential - spread);
  const potHigh = Math.min(99, player.potential + spread);

  const score = player.ovr + (player.potential - player.ovr) * 0.55 + (player.age <= 23 ? 4 : 0);
  const grade: ScoutReport['grade'] =
    score >= 86 ? 'A+' : score >= 80 ? 'A' : score >= 74 ? 'B' : 'C';

  const pros: string[] = [];
  const cons: string[] = [];
  if (player.attributes.pace >= 82) pros.push('Üst düzey hız ve patlayıcılık');
  if (player.attributes.passing >= 82) pros.push('Elit pas vizyonu ve oyun kurulumu');
  if (player.attributes.shooting >= 82) pros.push('Ceza sahası içi bitiricilik');
  if (player.attributes.defending >= 82) pros.push('Sağlam pozisyon alma & ikili mücadele');
  if (player.potential - player.ovr >= 6) pros.push('Yüksek potansiyel gelişim tavanı');
  if (pros.length === 0) pros.push('Takım disiplinine uyumlu dengeli profil');

  if (player.age >= 32) cons.push('Yaşa bağlı fiziksel düşüş ve yeniden satış değeri riski');
  if (player.attributes.stamina < 70) cons.push('Yüksek pres sistemlerinde erken yorulma');
  if (player.marketValue >= 35_000_000) cons.push('İnatçı kulüp yüksek bonservis talep edecektir');
  if (cons.length === 0) cons.push('Uyum süreci için ilk haftalarda rotasyon gerekebilir');

  return {
    id: `scr_${player.id}_w${week}`,
    playerId: player.id,
    playerName: getPlayerDisplayName(player, licenseMode),
    clubName,
    leagueId,
    role: player.naturalRole,
    age: player.age,
    ovr: player.ovr,
    potentialRange: potLow === potHigh ? `${potHigh}` : `${potLow}–${potHigh}`,
    grade,
    estimatedFee: Math.round(player.marketValue * 1.25),
    estimatedWage: Math.round(player.weeklyWage * 1.15),
    pros,
    cons,
    scoutedWeek: week,
  };
}

export function evaluateMedicalIntervention(
  player: Player,
  mode: 'REST' | 'INJECTION',
  physioRating: number,
  roll: number
): {
  injuredWeeks: number;
  injuryName: string | null;
  condition: number;
  moraleDelta: number;
  message: string;
} {
  if (player.injuredWeeks === 0) {
    return {
      injuredWeeks: 0,
      injuryName: null,
      condition: Math.min(100, player.condition + 6),
      moraleDelta: 1,
      message: `${player.realName} tam dinlenme seansı ile kondisyon topladı.`,
    };
  }

  if (mode === 'REST') {
    const cut = physioRating >= 84 && player.injuredWeeks > 1 ? 1 : 0;
    const nextWeeks = Math.max(1, player.injuredWeeks - cut);
    return {
      injuredWeeks: nextWeeks,
      injuryName: player.injuryName,
      condition: Math.min(82, player.condition + 8),
      moraleDelta: 3,
      message:
        cut > 0
          ? `Fizyoterapi ekibi iyileşmeyi hızlandırdı: ${player.realName} kalan süre ${nextWeeks} hafta.`
          : `${player.realName} güvenli rehabilitasyona devam ediyor (${nextWeeks} hafta).`,
    };
  }

  // INJECTION: High-risk quick return
  const successThreshold = Math.min(0.75, 0.42 + (physioRating - 65) * 0.01);
  if (roll <= successThreshold) {
    return {
      injuredWeeks: 0,
      injuryName: null,
      condition: Math.max(58, player.condition - 6),
      moraleDelta: 4,
      message: `Ağrı kesici iğne protokolü başarılı! ${player.realName} maç kadrosuna acil dönüş yaptı.`,
    };
  }
  const worsenedWeeks = player.injuredWeeks + 2;
  return {
    injuredWeeks: worsenedWeeks,
    injuryName: player.injuryName ?? 'Nükseden Kas Hasarı',
    condition: Math.max(40, player.condition - 12),
    moraleDelta: -8,
    message: `TERSLİK! Riskli iğne ters tepti: ${player.realName} sakatlığı nüksetti (${worsenedWeeks} hafta).`,
  };
}

export interface TeamReportSummary {
  avgOvr: number;
  avgAge: number;
  totalWeeklyWage: number;
  wageUsagePct: number;
  lines: Array<{
    group: 'GK' | 'DEF' | 'MID' | 'FWD';
    label: string;
    avgOvr: number;
    leagueAvg: number;
    count: number;
    stars: number; // 1-5
  }>;
  strengths: string[];
  weaknesses: string[];
}

export function buildTeamReport(club: Club, leagueClubs: Club[]): TeamReportSummary {
  const groups: Array<{ group: 'GK' | 'DEF' | 'MID' | 'FWD'; label: string }> = [
    { group: 'GK', label: 'Kaleciler' },
    { group: 'DEF', label: 'Savunma Hattı' },
    { group: 'MID', label: 'Orta Saha' },
    { group: 'FWD', label: 'Hücum & Kanatlar' },
  ];

  const allLeaguePlayers = leagueClubs.flatMap((c) => c.players);
  const avg = (nums: number[]) =>
    nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : 0;

  const lines = groups.map((g) => {
    const mine = club.players.filter((p) => p.positionGroup === g.group).sort((a, b) => b.ovr - a.ovr);
    const topMine = mine.slice(0, g.group === 'GK' ? 1 : 4).map((p) => p.ovr);
    const leagueTop = allLeaguePlayers
      .filter((p) => p.positionGroup === g.group)
      .map((p) => p.ovr);
    const myAvg = avg(topMine);
    const lAvg = avg(leagueTop);
    const stars = Math.max(1, Math.min(5, Math.round((myAvg - 65) / 5)));
    return {
      group: g.group,
      label: g.label,
      avgOvr: myAvg,
      leagueAvg: lAvg,
      count: mine.length,
      stars,
    };
  });

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const l of lines) {
    if (l.avgOvr >= l.leagueAvg + 2.5) {
      strengths.push(`${l.label} lig ortalamasının üzerinde (${l.avgOvr} vs ${l.leagueAvg})`);
    } else if (l.avgOvr < l.leagueAvg - 1.5) {
      weaknesses.push(`${l.label} lig ortalamasının gerisinde (${l.avgOvr} vs ${l.leagueAvg})`);
    }
    if ((l.group === 'GK' && l.count < 2) || (l.group !== 'GK' && l.count < 5)) {
      weaknesses.push(`${l.label} derinliği kritik düzeyde az (${l.count} oyuncu)`);
    }
  }

  const totalWeeklyWage = club.players.reduce((s, p) => s + p.weeklyWage, 0);
  const wageUsagePct = Math.round((totalWeeklyWage / Math.max(1, club.wageBudgetWeekly)) * 100);
  if (wageUsagePct > 92) weaknesses.push(`Maaş tavanının %${wageUsagePct} kadarı dolu — FFP dar boğazı!`);
  else if (wageUsagePct < 78) strengths.push(`Esnek maaş alanı (%${wageUsagePct} kullanım)`);

  if (strengths.length === 0) strengths.push('Kadro dengesi istikrarlı ve uyumlu.');
  if (weaknesses.length === 0) weaknesses.push('Belirgin yapısal zafiyet görülmüyor; kondisyona odaklanın.');

  return {
    avgOvr: avg(club.players.map((p) => p.ovr)),
    avgAge: avg(club.players.map((p) => p.age)),
    totalWeeklyWage,
    wageUsagePct,
    lines,
    strengths,
    weaknesses,
  };
}

export function evaluateAchievements(
  current: AchievementDef[],
  stats: {
    wins: number;
    cleanSheets: number;
    derbyWins: number;
    fourGoalGames: number;
    winStreak: number;
    transfersSigned: number;
    freeOrLoansSigned: number;
    scoutReports: number;
    trainingsApplied: number;
    pressDone: number;
    staffHired: number;
    youthOvrGains: number;
    boardConfidence: number;
    licenseFull: boolean;
    week: number;
  }
): { next: AchievementDef[]; newlyUnlocked: AchievementDef[] } {
  const progressMap: Record<string, number> = {
    first_win: stats.wins,
    clean_sheet_3: stats.cleanSheets,
    derby_king: stats.derbyWins,
    high_scorer: stats.fourGoalGames,
    win_streak_5: stats.winStreak,
    first_signing: stats.transfersSigned,
    free_master: stats.freeOrLoansSigned,
    scout_guru: stats.scoutReports,
    training_master: stats.trainingsApplied,
    press_ace: stats.pressDone,
    staff_upgrade: stats.staffHired,
    wonderkid_rise: stats.youthOvrGains,
    board_darling: stats.boardConfidence,
    full_license: stats.licenseFull ? 1 : 0,
  };

  const newlyUnlocked: AchievementDef[] = [];
  const next = current.map((ach) => {
    const p = Math.max(ach.progress, progressMap[ach.id] ?? 0);
    const shouldUnlock = ach.unlocked || p >= ach.target;
    if (shouldUnlock && !ach.unlocked) {
      const updated = {
        ...ach,
        unlocked: true,
        unlockedWeek: stats.week,
        progress: ach.target,
      };
      newlyUnlocked.push(updated);
      return updated;
    }
    return { ...ach, progress: Math.min(ach.target, p) };
  });

  return { next, newlyUnlocked };
}

export const SAVE_SLOT_COUNT = 5;

export function getSaveSlotKey(slot: number): string {
  return `zm27_save_slot_${slot}`;
}

export function listSaveSlots(): Array<SaveSlotSummary | null> {
  if (typeof window === 'undefined') {
    return Array.from({ length: SAVE_SLOT_COUNT }, () => null);
  }
  const out: Array<SaveSlotSummary | null> = [];
  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
    try {
      const raw = appStorage.getItem(getSaveSlotKey(i));
      if (!raw) {
        out.push(null);
        continue;
      }
      const parsed = JSON.parse(raw) as { summary?: SaveSlotSummary };
      out.push(parsed.summary ?? null);
    } catch {
      out.push(null);
    }
  }
  return out;
}

export function writeSaveSlot(slot: number, summary: SaveSlotSummary, payload: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    appStorage.setItem(getSaveSlotKey(slot), JSON.stringify({ summary, payload }));
    return true;
  } catch {
    return false;
  }
}

export function readSaveSlot<T>(slot: number): { summary: SaveSlotSummary; payload: T } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = appStorage.getItem(getSaveSlotKey(slot));
    if (!raw) return null;
    return JSON.parse(raw) as { summary: SaveSlotSummary; payload: T };
  } catch {
    return null;
  }
}

export function deleteSaveSlot(slot: number): void {
  if (typeof window === 'undefined') return;
  try {
    appStorage.removeItem(getSaveSlotKey(slot));
  } catch {
    // ignore
  }
}



