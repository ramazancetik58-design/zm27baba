import {
  buildDefaultBenchForClub,
  buildTacticsForClub,
} from './database';
import {
  calculateTacticalStrength,
  INJURY_CATALOG,
  stepPlayerFatigueAndInjury,
} from './hardcoreRules';
import {
  Club,
  CompetitionId,
  EuropeanCupId,
  EuropeanTournamentState,
  Fixture,
  KnockoutTie,
  LicenseMode,
  MatchDaySlot,
  MatchEventLog,
  NationalTeam,
  NationsLeagueGroupRow,
  NationsLeagueState,
  Player,
  SwissStandingRow,
  SwissStandingZone,
  TournamentStage,
} from './types';
import { buildInitialNationalTeams, nationalTeamToClub } from './tournamentsData';

export const EURO_LEAGUE_PHASE_WEEKS = [1, 3, 5, 7, 9, 11, 13, 15] as const;
export const EURO_PLAYOFF_WEEKS = [18, 19] as const;
export const EURO_DROP_WEEK = 20;
export const EURO_R16_WEEKS = [22, 23] as const;
export const EURO_QF_WEEKS = [25, 26] as const;
export const EURO_SF_WEEKS = [28, 29] as const;
export const EURO_FINAL_WEEK = 31;

export const UNL_GROUP_WEEKS = [2, 4, 6, 8, 10, 12] as const;
export const UNL_SEMI_WEEK = 16;
export const UNL_FINAL_WEEK = 17;

export type EuropeanPrizeEvent =
  | 'WIN'
  | 'DRAW'
  | 'PLAYOFF'
  | 'R16'
  | 'QF'
  | 'SF'
  | 'FINAL'
  | 'CHAMPION';

export const EUROPEAN_PRIZE_TABLE: Record<
  EuropeanCupId,
  Record<EuropeanPrizeEvent, number>
> = {
  UCL: {
    WIN: 2_100_000,
    DRAW: 700_000,
    PLAYOFF: 1_000_000,
    R16: 11_000_000,
    QF: 12_500_000,
    SF: 15_000_000,
    FINAL: 18_500_000,
    CHAMPION: 25_000_000,
  },
  UEL: {
    WIN: 450_000,
    DRAW: 150_000,
    PLAYOFF: 300_000,
    R16: 1_750_000,
    QF: 2_500_000,
    SF: 4_200_000,
    FINAL: 7_000_000,
    CHAMPION: 13_000_000,
  },
  UECL: {
    WIN: 400_000,
    DRAW: 133_000,
    PLAYOFF: 200_000,
    R16: 800_000,
    QF: 1_300_000,
    SF: 2_500_000,
    FINAL: 4_000_000,
    CHAMPION: 7_000_000,
  },
};

export function awardEuropeanPrizeMoney(
  cupId: EuropeanCupId,
  eventType: EuropeanPrizeEvent
): number {
  return EUROPEAN_PRIZE_TABLE[cupId][eventType];
}

export function getCupTitle(cupId: CompetitionId, language: 'tr' | 'en' = 'tr'): string {
  switch (cupId) {
    case 'UCL':
      return language === 'tr' ? 'UEFA Şampiyonlar Ligi' : 'UEFA Champions League';
    case 'UEL':
      return language === 'tr' ? 'UEFA Avrupa Ligi' : 'UEFA Europa League';
    case 'UECL':
      return language === 'tr' ? 'UEFA Konferans Ligi' : 'UEFA Conference League';
    case 'UNL':
      return language === 'tr' ? 'UEFA Uluslar Ligi' : 'UEFA Nations League';
    default:
      return language === 'tr' ? 'Lig' : 'League';
  }
}

export function getStageLabel(stage: TournamentStage | undefined, language: 'tr' | 'en' = 'tr'): string {
  if (!stage) return language === 'tr' ? 'Maç' : 'Match';
  const labels: Record<TournamentStage, { tr: string; en: string }> = {
    LEAGUE_PHASE: { tr: 'Lig Aşaması (İsviçre Modeli)', en: 'League Phase (Swiss)' },
    GROUP: { tr: 'Grup Aşaması', en: 'Group Stage' },
    PLAYOFF: { tr: 'Eleme Play-off Turu', en: 'Knockout Play-off' },
    DROP_PLAYOFF: { tr: 'Avrupa Geçiş Play-offu', en: 'Drop-Down Play-off' },
    R16: { tr: 'Son 16 Turu', en: 'Round of 16' },
    QF: { tr: 'Çeyrek Final', en: 'Quarter-Final' },
    SF: { tr: 'Yarı Final', en: 'Semi-Final' },
    THIRD_PLACE: { tr: 'Üçüncülük Maçı', en: '3rd Place Match' },
    FINAL: { tr: 'Büyük Final', en: 'Grand Final' },
    PROMO_PLAYOFF: { tr: 'Yükselme / Düşme Play-offu', en: 'Promo / Relegation Play-off' },
  };
  return labels[stage][language];
}

export function getNationDisplayName(nation: NationalTeam, mode: LicenseMode): string {
  return mode === 'FULL_LICENSE' ? nation.realName : nation.fictionalName;
}

export function getNationShortName(nation: NationalTeam, mode: LicenseMode): string {
  return mode === 'FULL_LICENSE' ? nation.realShort : nation.fictionalShort;
}

function deterministicHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function assignSwissPots(
  participantIds: string[],
  clubMap: Map<string, Club>
): { orderedIds: string[]; pots: Record<string, 1 | 2 | 3 | 4> } {
  const sorted = [...participantIds].sort((a, b) => {
    const repA = clubMap.get(a)?.reputation ?? 60;
    const repB = clubMap.get(b)?.reputation ?? 60;
    if (repB !== repA) return repB - repA;
    return a.localeCompare(b);
  });
  const pots: Record<string, 1 | 2 | 3 | 4> = {};
  sorted.forEach((id, idx) => {
    const potNum = Math.min(4, Math.floor(idx / 9) + 1) as 1 | 2 | 3 | 4;
    pots[id] = potNum;
  });
  return { orderedIds: sorted, pots };
}

/**
 * Generates an exact 36-club Swiss League Phase schedule:
 * - 8 Matchdays (18 fixtures per matchday, all 36 clubs play once per MD)
 * - ZERO duplicate opponents, ZERO self-matches
 * - Eulerian orientation guarantees EXACTLY 4 Home + 4 Away for ALL 36 clubs
 */
export function generateSwissLeaguePhaseFixtures(
  cupId: EuropeanCupId,
  participantIds: string[],
  clubMap: Map<string, Club>,
  season: number
): { fixtures: Fixture[]; pots: Record<string, 1 | 2 | 3 | 4> } {
  const { orderedIds, pots } = assignSwissPots(participantIds, clubMap);
  const n = orderedIds.length;
  if (n < 4) return { fixtures: [], pots };

  // Interleave pots: P1_0, P2_0, P3_0, P4_0, P1_1, ... so early rounds mix pot tiers
  const circle: string[] = [];
  const potChunks: string[][] = [
    orderedIds.slice(0, 9),
    orderedIds.slice(9, 18),
    orderedIds.slice(18, 27),
    orderedIds.slice(27, 36),
  ];
  for (let i = 0; i < 9; i++) {
    for (let p = 0; p < 4; p++) {
      if (potChunks[p][i]) circle.push(potChunks[p][i]);
    }
  }
  // Ensure any fallback length is still included
  for (const id of orderedIds) {
    if (!circle.includes(id)) circle.push(id);
  }

  const fixed = circle[0];
  const rotating = circle.slice(1);
  const totalTeams = circle.length;
  const roundsCount = Math.min(8, totalTeams - 1);

  interface UndirectedPair {
    md: number;
    u: string;
    v: string;
    idx: number;
  }
  const allPairs: UndirectedPair[] = [];
  const adj = new Map<string, Array<{ neighbor: string; pairIdx: number }>>();
  for (const id of circle) adj.set(id, []);

  // Build 8 round-robin rounds (Berger circle)
  for (let r = 0; r < roundsCount; r++) {
    const arr = [fixed, ...rotating];
    const half = Math.floor(arr.length / 2);
    for (let i = 0; i < half; i++) {
      const u = arr[i];
      const v = arr[arr.length - 1 - i];
      if (!u || !v || u === v) continue;
      const pairIdx = allPairs.length;
      allPairs.push({ md: r + 1, u, v, idx: pairIdx });
      adj.get(u)!.push({ neighbor: v, pairIdx });
      adj.get(v)!.push({ neighbor: u, pairIdx });
    }
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  // Hierholzer Eulerian orientation on the 8-regular graph -> guarantees 4 Home, 4 Away for EVERY team!
  const usedEdge = new Uint8Array(allPairs.length);
  const orientedHome = new Array<string>(allPairs.length);
  const orientedAway = new Array<string>(allPairs.length);
  const ptr = new Map<string, number>();
  for (const id of circle) ptr.set(id, 0);

  for (const startId of circle) {
    const startEdges = adj.get(startId)!;
    while ((ptr.get(startId) ?? 0) < startEdges.length && usedEdge[startEdges[ptr.get(startId)!].pairIdx]) {
      ptr.set(startId, (ptr.get(startId) ?? 0) + 1);
    }
    if ((ptr.get(startId) ?? 0) >= startEdges.length) continue;

    // Iterative Hierholzer with edge tracking
    const stack: Array<{ node: string; viaPairIdx: number | null; prevNode: string | null }> = [
      { node: startId, viaPairIdx: null, prevNode: null },
    ];
    const circuitEdges: Array<{ pairIdx: number; from: string; to: string }> = [];

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const edges = adj.get(top.node)!;
      let p = ptr.get(top.node) ?? 0;
      while (p < edges.length && usedEdge[edges[p].pairIdx]) {
        p++;
      }
      ptr.set(top.node, p);
      if (p < edges.length) {
        const edge = edges[p];
        usedEdge[edge.pairIdx] = 1;
        ptr.set(top.node, p + 1);
        stack.push({ node: edge.neighbor, viaPairIdx: edge.pairIdx, prevNode: top.node });
      } else {
        const popped = stack.pop()!;
        if (popped.viaPairIdx !== null && popped.prevNode !== null) {
          circuitEdges.push({
            pairIdx: popped.viaPairIdx,
            from: popped.prevNode,
            to: popped.node,
          });
        }
      }
    }

    // Reverse circuitEdges to walk in forward Eulerian direction
    for (let k = circuitEdges.length - 1; k >= 0; k--) {
      const ce = circuitEdges[k];
      orientedHome[ce.pairIdx] = ce.from;
      orientedAway[ce.pairIdx] = ce.to;
    }
  }

  const fixtures: Fixture[] = allPairs.map((pair, idx) => {
    const week = EURO_LEAGUE_PHASE_WEEKS[pair.md - 1] ?? pair.md * 2 - 1;
    let slot: MatchDaySlot = 'THU';
    let dayLabel = 'Perşembe';
    if (cupId === 'UCL') {
      const isTue = (idx + pair.md) % 2 === 0;
      slot = isTue ? 'TUE' : 'WED';
      dayLabel = isTue ? 'Salı' : 'Çarşamba';
    }
    return {
      id: `${cupId.toLowerCase()}_s${season}_md${pair.md}_${idx + 1}`,
      week,
      homeClubId: orientedHome[idx] || pair.u,
      awayClubId: orientedAway[idx] || pair.v,
      played: false,
      homeGoals: 0,
      awayGoals: 0,
      homeXg: 0,
      awayXg: 0,
      homePossession: 50,
      homeShots: 0,
      awayShots: 0,
      events: [],
      competitionId: cupId,
      stage: 'LEAGUE_PHASE',
      matchday: pair.md,
      matchDaySlot: slot,
      dayLabel,
    };
  });

  return { fixtures, pots };
}

export function createInitialEuropeanTournaments(
  allClubs: Club[],
  uclIds: string[],
  uelIds: string[],
  ueclIds: string[],
  season: number
): Record<EuropeanCupId, EuropeanTournamentState> {
  const clubMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));

  const buildOne = (cupId: EuropeanCupId, ids: string[]): EuropeanTournamentState => {
    const { fixtures, pots } = generateSwissLeaguePhaseFixtures(cupId, ids, clubMap, season);
    return {
      id: cupId,
      season,
      phase: 'LEAGUE_PHASE',
      currentMatchday: 1,
      participantIds: [...ids],
      pots,
      droppedFromHigherIds: [],
      fixtures,
      knockoutTies: [],
      championClubId: null,
      prizeAwardedByClub: {},
      dropTransferProcessed: false,
    };
  };

  return {
    UCL: buildOne('UCL', uclIds),
    UEL: buildOne('UEL', uelIds),
    UECL: buildOne('UECL', ueclIds),
  };
}

export function computeSwissStandings(
  tournament: EuropeanTournamentState,
  clubMap: Map<string, Club>
): SwissStandingRow[] {
  const rows = new Map<string, SwissStandingRow>();
  for (const clubId of tournament.participantIds) {
    rows.set(clubId, {
      clubId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      form: [],
      pot: tournament.pots[clubId] ?? 4,
      zone: 'ELIMINATED',
    });
  }

  const leagueFixtures = tournament.fixtures
    .filter((f) => f.stage === 'LEAGUE_PHASE' && f.played)
    .sort((a, b) => (a.matchday ?? a.week) - (b.matchday ?? b.week));

  for (const f of leagueFixtures) {
    const h = rows.get(f.homeClubId);
    const a = rows.get(f.awayClubId);
    if (!h || !a) continue;

    h.played++;
    a.played++;
    h.gf += f.homeGoals;
    h.ga += f.awayGoals;
    a.gf += f.awayGoals;
    a.ga += f.homeGoals;

    if (f.homeGoals > f.awayGoals) {
      h.won++;
      h.points += 3;
      h.form.push('W');
      a.lost++;
      a.form.push('L');
    } else if (f.homeGoals < f.awayGoals) {
      a.won++;
      a.points += 3;
      a.form.push('W');
      h.lost++;
      h.form.push('L');
    } else {
      h.drawn++;
      a.drawn++;
      h.points += 1;
      a.points += 1;
      h.form.push('D');
      a.form.push('D');
    }
  }

  const list = Array.from(rows.values());
  for (const r of list) {
    r.gd = r.gf - r.ga;
    r.form = r.form.slice(-5);
  }

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    const repA = clubMap.get(a.clubId)?.reputation ?? 60;
    const repB = clubMap.get(b.clubId)?.reputation ?? 60;
    if (repB !== repA) return repB - repA;
    return a.clubId.localeCompare(b.clubId);
  });

  // Check if any clubs dropped down after Playoff round
  const droppedTieLosers = new Set<string>();
  for (const tie of tournament.knockoutTies) {
    if (tie.stage === 'PLAYOFF' && tie.loserId && tie.droppedToCupId) {
      droppedTieLosers.add(tie.loserId);
    }
  }

  list.forEach((row, idx) => {
    const rank = idx + 1;
    if (rank <= 8) {
      row.zone = 'DIRECT_R16';
    } else if (rank <= 16) {
      if (droppedTieLosers.has(row.clubId)) {
        row.zone = tournament.id === 'UCL' ? 'DROPPED_UEL' : 'DROPPED_UECL';
        row.droppedTo = tournament.id === 'UCL' ? 'UEL' : 'UECL';
      } else {
        row.zone = 'PLAYOFF_SEEDED';
      }
    } else if (rank <= 24) {
      if (droppedTieLosers.has(row.clubId)) {
        row.zone = tournament.id === 'UCL' ? 'DROPPED_UEL' : 'DROPPED_UECL';
        row.droppedTo = tournament.id === 'UCL' ? 'UEL' : 'UECL';
      } else {
        row.zone = 'PLAYOFF_UNSEEDED';
      }
    } else {
      row.zone = 'ELIMINATED';
    }
  });

  return list;
}

export function simulateCupFixtureOutcome(
  fixture: Fixture,
  homeClub: Club,
  awayClub: Club,
  allowPenaltyDecider: boolean = false
): Fixture {
  const homeSlots = buildTacticsForClub(homeClub, homeClub.preferredFormation);
  const awaySlots = buildTacticsForClub(awayClub, awayClub.preferredFormation);
  const homePow =
    calculateTacticalStrength(homeClub, {
      formation: homeClub.preferredFormation,
      mentality: 'BALANCED',
      pressing: 'MEDIUM',
      tempo: 'NORMAL',
      defensiveLine: 55,
      slots: homeSlots,
      benchPlayerIds: [],
    }).overall + 2.8;
  const awayPow = calculateTacticalStrength(awayClub, {
    formation: awayClub.preferredFormation,
    mentality: 'BALANCED',
    pressing: 'MEDIUM',
    tempo: 'NORMAL',
    defensiveLine: 55,
    slots: awaySlots,
    benchPlayerIds: [],
  }).overall;

  const seed = deterministicHash(`${fixture.id}_${homeClub.id}_${awayClub.id}`);
  const r1 = ((seed % 1000) / 1000);
  const r2 = (((seed >> 10) % 1000) / 1000);
  const r3 = (((seed >> 20) % 1000) / 1000);

  const diff = (homePow - awayPow) / 11;
  const homeExp = Math.max(0.35, Math.min(3.5, 1.35 + diff * 0.55));
  const awayExp = Math.max(0.3, Math.min(3.2, 1.15 - diff * 0.45));

  const sampleGoals = (exp: number, rA: number, rB: number) => {
    const raw = exp * (0.45 + rA * 1.15) + (rB > 0.84 ? 0.8 : 0);
    return Math.max(0, Math.min(6, Math.round(raw - 0.15)));
  };

  const homeGoals = sampleGoals(homeExp, r1, r3);
  const awayGoals = sampleGoals(awayExp, r2, 1 - r3);

  const homeShots = Math.max(homeGoals + 2, Math.round(8 + homeExp * 3.8 + r1 * 4));
  const awayShots = Math.max(awayGoals + 2, Math.round(7 + awayExp * 3.5 + r2 * 4));
  const homePoss = Math.max(33, Math.min(68, Math.round(50 + diff * 4.5)));

  const events: MatchEventLog[] = [];
  const homeAttackers = homeClub.players.filter((p) => p.positionGroup !== 'GK');
  const awayAttackers = awayClub.players.filter((p) => p.positionGroup !== 'GK');

  for (let g = 0; g < homeGoals; g++) {
    const scorer = homeAttackers[(seed + g * 7) % Math.max(1, homeAttackers.length)];
    const minute = Math.min(90, Math.max(4, Math.round(((g + 0.5) / (homeGoals + 0.5)) * 86 + (r1 * 8))));
    events.push({
      minute,
      type: 'GOAL',
      teamId: homeClub.id,
      playerName: scorer?.fictionalName ?? homeClub.fictionalShort,
      detail: `${scorer?.realName ?? 'Gol'} (${minute}')`,
    });
  }
  for (let g = 0; g < awayGoals; g++) {
    const scorer = awayAttackers[(seed + g * 11) % Math.max(1, awayAttackers.length)];
    const minute = Math.min(90, Math.max(6, Math.round(((g + 0.6) / (awayGoals + 0.6)) * 85 + (r2 * 7))));
    events.push({
      minute,
      type: 'GOAL',
      teamId: awayClub.id,
      playerName: scorer?.fictionalName ?? awayClub.fictionalShort,
      detail: `${scorer?.realName ?? 'Gol'} (${minute}')`,
    });
  }
  events.sort((a, b) => a.minute - b.minute);

  let penaltyWinnerId: string | undefined;
  if (allowPenaltyDecider && homeGoals === awayGoals) {
    penaltyWinnerId = homePow + (r3 - 0.5) * 8 >= awayPow ? homeClub.id : awayClub.id;
  }

  return {
    ...fixture,
    played: true,
    homeGoals,
    awayGoals,
    homeXg: Number(homeExp.toFixed(2)),
    awayXg: Number(awayExp.toFixed(2)),
    homePossession: homePoss,
    homeShots,
    awayShots,
    events,
    penaltyWinnerId,
  };
}

export interface TravelFatigueReport {
  updatedClub: Club;
  newlyInjured: Array<{ playerId: string; playerName: string; injuryName: string; weeks: number }>;
  avgConditionDrop: number;
}

/**
 * Hardcore Mode: European midweek matches drain heavier condition (especially away flights),
 * mitigated slightly by Head Physio rating. Thin squads face higher injury fatigue pressure.
 */
export function applyEuropeanTravelFatigue(
  club: Club,
  starterIds: string[],
  isAway: boolean,
  headPhysioRating: number = 68,
  weekSeed: number = 1
): TravelFatigueReport {
  const starterSet = new Set(starterIds);
  const physioMitigation = Math.max(0, Math.min(4, Math.floor((headPhysioRating - 65) / 8)));
  const extraDrain = Math.max(4, (isAway ? 15 : 8) - physioMitigation);
  const newlyInjured: TravelFatigueReport['newlyInjured'] = [];

  let totalDrop = 0;
  let counted = 0;

  const updatedPlayers: Player[] = club.players.map((p, idx) => {
    const isStarter = starterSet.has(p.id);
    if (!isStarter) {
      // Bench/reserve players get mild travel wear if away
      const benchWear = isAway ? 3 : 0;
      return {
        ...p,
        condition: Math.max(35, p.condition - benchWear),
      };
    }

    const roll = ((deterministicHash(`${club.id}_${p.id}_${weekSeed}`) % 1000) + 0.5) / 1000;
    const baseStepped = stepPlayerFatigueAndInjury(p, 90, 'GEGENPRESS', roll);
    const afterTravelCond = Math.max(22, baseStepped.newCondition - extraDrain);
    totalDrop += Math.max(0, p.condition - afterTravelCond);
    counted++;

    let injuredWeeks = p.injuredWeeks + baseStepped.injuredWeeks;
    let injuryName = baseStepped.injuryName ?? p.injuryName;

    // Additional travel-overuse injury risk if exhausted below 52 condition
    if (injuredWeeks === 0 && afterTravelCond < 52) {
      const riskHash = deterministicHash(`${club.id}_${p.id}_${weekSeed}_travel`) % 100;
      const riskThreshold = Math.max(8, 22 - physioMitigation * 3);
      if (riskHash < riskThreshold) {
        const catalogEntry = INJURY_CATALOG[riskHash % INJURY_CATALOG.length];
        injuredWeeks = Math.max(1, catalogEntry.weeks);
        injuryName = catalogEntry.name;
        newlyInjured.push({
          playerId: p.id,
          playerName: p.realName,
          injuryName,
          weeks: injuredWeeks,
        });
      }
    } else if (baseStepped.injuredWeeks > 0 && baseStepped.injuryName) {
      newlyInjured.push({
        playerId: p.id,
        playerName: p.realName,
        injuryName: baseStepped.injuryName,
        weeks: baseStepped.injuredWeeks,
      });
    }

    return {
      ...p,
      condition: afterTravelCond,
      injuredWeeks,
      injuryName,
    };
  });

  return {
    updatedClub: {
      ...club,
      players: updatedPlayers,
    },
    newlyInjured,
    avgConditionDrop: counted > 0 ? Math.round(totalDrop / counted) : extraDrain,
  };
}

function buildTwoLegTieFixtures(
  cupId: EuropeanCupId,
  stage: TournamentStage,
  pairings: Array<{ homeId: string; awayId: string; fromHigherCup?: EuropeanCupId }>,
  weeks: readonly [number, number],
  season: number
): { fixtures: Fixture[]; ties: KnockoutTie[] } {
  const fixtures: Fixture[] = [];
  const ties: KnockoutTie[] = [];
  const slot: MatchDaySlot = cupId === 'UCL' ? 'TUE' : 'THU';
  const dayLabel = cupId === 'UCL' ? 'Salı' : 'Perşembe';

  pairings.forEach((p, idx) => {
    const tieId = `${cupId.toLowerCase()}_${stage.toLowerCase()}_s${season}_t${idx + 1}`;
    const f1Id = `${tieId}_leg1`;
    const f2Id = `${tieId}_leg2`;

    fixtures.push({
      id: f1Id,
      week: weeks[0],
      homeClubId: p.awayId, // Unseeded/lower plays Leg 1 at home
      awayClubId: p.homeId,
      played: false,
      homeGoals: 0,
      awayGoals: 0,
      homeXg: 0,
      awayXg: 0,
      homePossession: 50,
      homeShots: 0,
      awayShots: 0,
      events: [],
      competitionId: cupId,
      stage,
      leg: 1,
      tieId,
      matchDaySlot: slot,
      dayLabel,
    });

    fixtures.push({
      id: f2Id,
      week: weeks[1],
      homeClubId: p.homeId, // Seeded plays Leg 2 at home
      awayClubId: p.awayId,
      played: false,
      homeGoals: 0,
      awayGoals: 0,
      homeXg: 0,
      awayXg: 0,
      homePossession: 50,
      homeShots: 0,
      awayShots: 0,
      events: [],
      competitionId: cupId,
      stage,
      leg: 2,
      tieId,
      matchDaySlot: cupId === 'UCL' ? 'WED' : 'THU',
      dayLabel: cupId === 'UCL' ? 'Çarşamba' : 'Perşembe',
    });

    ties.push({
      id: tieId,
      cupId,
      stage,
      homeClubId: p.homeId,
      awayClubId: p.awayId,
      leg1FixtureId: f1Id,
      leg2FixtureId: f2Id,
      fromHigherCup: p.fromHigherCup,
    });
  });

  return { fixtures, ties };
}

function resolveTwoLegTies(
  ties: KnockoutTie[],
  fixtureMap: Map<string, Fixture>,
  clubMap: Map<string, Club>,
  targetStage: TournamentStage,
  droppedToCup?: 'UEL' | 'UECL'
): { updatedTies: KnockoutTie[]; winners: string[]; losers: string[] } {
  const winners: string[] = [];
  const losers: string[] = [];
  const updatedTies = ties.map((tie) => {
    if (tie.stage !== targetStage) return tie;
    const f1 = fixtureMap.get(tie.leg1FixtureId);
    const f2 = tie.leg2FixtureId ? fixtureMap.get(tie.leg2FixtureId) : undefined;
    if (!f1 || !f1.played || (f2 && !f2.played)) return tie;

    let homeAgg = 0;
    let awayAgg = 0;
    if (f1.homeClubId === tie.homeClubId) {
      homeAgg += f1.homeGoals;
      awayAgg += f1.awayGoals;
    } else {
      homeAgg += f1.awayGoals;
      awayAgg += f1.homeGoals;
    }
    if (f2) {
      if (f2.homeClubId === tie.homeClubId) {
        homeAgg += f2.homeGoals;
        awayAgg += f2.awayGoals;
      } else {
        homeAgg += f2.awayGoals;
        awayAgg += f2.homeGoals;
      }
    }

    let winnerId = tie.homeClubId;
    let loserId = tie.awayClubId;
    let penaltiesNote: string | undefined;

    if (homeAgg > awayAgg) {
      winnerId = tie.homeClubId;
      loserId = tie.awayClubId;
    } else if (awayAgg > homeAgg) {
      winnerId = tie.awayClubId;
      loserId = tie.homeClubId;
    } else {
      const f2Pen = f2?.penaltyWinnerId ?? f1.penaltyWinnerId;
      if (f2Pen) {
        winnerId = f2Pen;
        loserId = f2Pen === tie.homeClubId ? tie.awayClubId : tie.homeClubId;
      } else {
        const repH = clubMap.get(tie.homeClubId)?.reputation ?? 70;
        const repA = clubMap.get(tie.awayClubId)?.reputation ?? 70;
        const penHash = deterministicHash(`${tie.id}_pen`) % 100;
        winnerId = repH + (penHash - 50) * 0.25 >= repA ? tie.homeClubId : tie.awayClubId;
        loserId = winnerId === tie.homeClubId ? tie.awayClubId : tie.homeClubId;
      }
      penaltiesNote = 'Penaltılarla';
    }

    winners.push(winnerId);
    losers.push(loserId);

    return {
      ...tie,
      winnerId,
      loserId,
      homeAgg,
      awayAgg,
      penaltiesNote,
      droppedToCupId: droppedToCup,
    };
  });

  return { updatedTies, winners, losers };
}

export interface EuropeanWeekAdvanceResult {
  nextTournaments: Record<EuropeanCupId, EuropeanTournamentState>;
  prizesByClubId: Record<string, number>;
  dropNotices: Array<{ fromCup: EuropeanCupId; toCup: EuropeanCupId; clubIds: string[] }>;
}

/**
 * Advances all 3 European tournaments (UCL, UEL, UECL) for a given calendar week:
 * - Simulates unplayed matches in `week` (skipping matches already played live by the user)
 * - Awards UEFA matchday & round advancement prize money
 * - Transitions Swiss League Phase -> Playoff -> Drop-Down Playoff (UCL->UEL, UEL->UECL) -> R16 -> QF -> SF -> Final -> Completed
 */
export function advanceAllEuropeanTournamentsForWeek(
  tournaments: Record<EuropeanCupId, EuropeanTournamentState>,
  clubMap: Map<string, Club>,
  week: number,
  userPlayedFixtureIds: Set<string> = new Set()
): EuropeanWeekAdvanceResult {
  const prizesByClubId: Record<string, number> = {};
  const dropNotices: EuropeanWeekAdvanceResult['dropNotices'] = [];

  const creditPrize = (cup: EuropeanTournamentState, clubId: string, amount: number) => {
    if (!clubId || amount <= 0) return;
    prizesByClubId[clubId] = (prizesByClubId[clubId] ?? 0) + amount;
    cup.prizeAwardedByClub[clubId] = (cup.prizeAwardedByClub[clubId] ?? 0) + amount;
  };

  // Clone safely
  const next: Record<EuropeanCupId, EuropeanTournamentState> = {
    UCL: {
      ...tournaments.UCL,
      fixtures: tournaments.UCL.fixtures.map((f) => ({ ...f })),
      knockoutTies: tournaments.UCL.knockoutTies.map((t) => ({ ...t })),
      droppedFromHigherIds: [...tournaments.UCL.droppedFromHigherIds],
      prizeAwardedByClub: { ...tournaments.UCL.prizeAwardedByClub },
    },
    UEL: {
      ...tournaments.UEL,
      fixtures: tournaments.UEL.fixtures.map((f) => ({ ...f })),
      knockoutTies: tournaments.UEL.knockoutTies.map((t) => ({ ...t })),
      droppedFromHigherIds: [...tournaments.UEL.droppedFromHigherIds],
      prizeAwardedByClub: { ...tournaments.UEL.prizeAwardedByClub },
    },
    UECL: {
      ...tournaments.UECL,
      fixtures: tournaments.UECL.fixtures.map((f) => ({ ...f })),
      knockoutTies: tournaments.UECL.knockoutTies.map((t) => ({ ...t })),
      droppedFromHigherIds: [...tournaments.UECL.droppedFromHigherIds],
      prizeAwardedByClub: { ...tournaments.UECL.prizeAwardedByClub },
    },
  };

  const cupOrder: EuropeanCupId[] = ['UCL', 'UEL', 'UECL'];

  // 1. Simulate all unplayed fixtures scheduled for `week`, and credit Win/Draw bonuses for newly resolved fixtures
  for (const cupId of cupOrder) {
    const cup = next[cupId];
    cup.fixtures = cup.fixtures.map((f) => {
      if (f.week !== week) return f;
      const home = clubMap.get(f.homeClubId);
      const away = clubMap.get(f.awayClubId);
      if (!home || !away) return f;

      const resolved =
        f.played || userPlayedFixtureIds.has(f.id)
          ? f
          : simulateCupFixtureOutcome(
              f,
              home,
              away,
              f.stage === 'FINAL' || f.stage === 'DROP_PLAYOFF' || f.leg === 2
            );

      // Award League Phase Win/Draw matchday bonus if just completed in this week
      if (resolved.played && resolved.stage === 'LEAGUE_PHASE') {
        if (resolved.homeGoals > resolved.awayGoals) {
          creditPrize(cup, resolved.homeClubId, awardEuropeanPrizeMoney(cupId, 'WIN'));
        } else if (resolved.awayGoals > resolved.homeGoals) {
          creditPrize(cup, resolved.awayClubId, awardEuropeanPrizeMoney(cupId, 'WIN'));
        } else {
          creditPrize(cup, resolved.homeClubId, awardEuropeanPrizeMoney(cupId, 'DRAW'));
          creditPrize(cup, resolved.awayClubId, awardEuropeanPrizeMoney(cupId, 'DRAW'));
        }
      }
      return resolved;
    });

    // Update currentMatchday tracker
    const mdIdx = EURO_LEAGUE_PHASE_WEEKS.indexOf(week as (typeof EURO_LEAGUE_PHASE_WEEKS)[number]);
    if (mdIdx >= 0) {
      cup.currentMatchday = Math.min(8, mdIdx + 2);
    }
  }

  // 2. Check League Phase completion (Week 15 = MD8) -> Generate 9–24 Playoff Ties
  if (week >= EURO_LEAGUE_PHASE_WEEKS[7]) {
    for (const cupId of cupOrder) {
      const cup = next[cupId];
      if (cup.phase === 'LEAGUE_PHASE') {
        const allMd8Played = cup.fixtures
          .filter((f) => f.stage === 'LEAGUE_PHASE')
          .every((f) => f.played);
        if (allMd8Played) {
          const standings = computeSwissStandings(cup, clubMap);
          const seeded = standings.slice(8, 16).map((r) => r.clubId);
          const unseeded = standings.slice(16, 24).map((r) => r.clubId).reverse();
          const pairings = seeded.map((homeId, idx) => ({
            homeId,
            awayId: unseeded[idx] ?? seeded[(idx + 1) % seeded.length],
          }));

          // Direct R16 top-8 advancement bonus
          standings.slice(0, 8).forEach((r) => {
            creditPrize(cup, r.clubId, awardEuropeanPrizeMoney(cupId, 'R16'));
          });
          // Playoff bonus
          standings.slice(8, 24).forEach((r) => {
            creditPrize(cup, r.clubId, awardEuropeanPrizeMoney(cupId, 'PLAYOFF'));
          });

          const { fixtures, ties } = buildTwoLegTieFixtures(
            cupId,
            'PLAYOFF',
            pairings,
            EURO_PLAYOFF_WEEKS,
            cup.season
          );
          cup.fixtures.push(...fixtures);
          cup.knockoutTies.push(...ties);
          cup.phase = 'PLAYOFF';
        }
      }
    }
  }

  // 3. After Playoff Leg 2 (Week 19): Resolve Playoffs & Execute Drop-Down Transfers (UCL -> UEL, UEL -> UECL)
  if (week >= EURO_PLAYOFF_WEEKS[1]) {
    const playoffWinnersByCup: Record<EuropeanCupId, string[]> = { UCL: [], UEL: [], UECL: [] };
    const playoffLosersByCup: Record<EuropeanCupId, string[]> = { UCL: [], UEL: [], UECL: [] };

    for (const cupId of cupOrder) {
      const cup = next[cupId];
      if (cup.phase === 'PLAYOFF') {
        const fMap = new Map(cup.fixtures.map((f) => [f.id, f]));
        const dropTarget = cupId === 'UCL' ? 'UEL' : cupId === 'UEL' ? 'UECL' : undefined;
        const { updatedTies, winners, losers } = resolveTwoLegTies(
          cup.knockoutTies,
          fMap,
          clubMap,
          'PLAYOFF',
          dropTarget
        );
        if (winners.length === 8) {
          cup.knockoutTies = updatedTies;
          playoffWinnersByCup[cupId] = winners;
          playoffLosersByCup[cupId] = losers;
        }
      }
    }

    // UCL -> R16 directly once UCL Playoff resolves
    if (next.UCL.phase === 'PLAYOFF' && playoffWinnersByCup.UCL.length === 8) {
      const uclTop8 = computeSwissStandings(next.UCL, clubMap).slice(0, 8).map((r) => r.clubId);
      const poWinners = playoffWinnersByCup.UCL;
      poWinners.forEach((id) => creditPrize(next.UCL, id, awardEuropeanPrizeMoney('UCL', 'R16')));

      const r16Pairings = uclTop8.map((homeId, idx) => ({
        homeId,
        awayId: poWinners[7 - idx],
      }));
      const { fixtures, ties } = buildTwoLegTieFixtures(
        'UCL',
        'R16',
        r16Pairings,
        EURO_R16_WEEKS,
        next.UCL.season
      );
      next.UCL.fixtures.push(...fixtures);
      next.UCL.knockoutTies.push(...ties);
      next.UCL.phase = 'R16';

      // Drop 8 UCL Playoff losers down into UEL Drop-Down Transition Playoff!
      if (playoffLosersByCup.UCL.length === 8 && !next.UEL.dropTransferProcessed) {
        next.UEL.droppedFromHigherIds = [...playoffLosersByCup.UCL];
        next.UEL.dropTransferProcessed = true;
        dropNotices.push({
          fromCup: 'UCL',
          toCup: 'UEL',
          clubIds: [...playoffLosersByCup.UCL],
        });
      }
    }

    // Drop 8 UEL Playoff losers down into UECL Drop-Down Transition Playoff!
    if (
      next.UEL.phase === 'PLAYOFF' &&
      playoffLosersByCup.UEL.length === 8 &&
      !next.UECL.dropTransferProcessed
    ) {
      next.UECL.droppedFromHigherIds = [...playoffLosersByCup.UEL];
      next.UECL.dropTransferProcessed = true;
      dropNotices.push({
        fromCup: 'UEL',
        toCup: 'UECL',
        clubIds: [...playoffLosersByCup.UEL],
      });
    }

    // Create Week 20 Drop-Down Playoff ties for UEL (UEL Playoff winners vs 8 UCL Drop-downs) and UECL (UECL Playoff winners vs 8 UEL Drop-downs)
    const setupDropPlayoff = (
      cupId: 'UEL' | 'UECL',
      playoffWinners: string[],
      droppedFromHigher: EuropeanCupId
    ) => {
      const cup = next[cupId];
      if (cup.phase !== 'PLAYOFF' || playoffWinners.length !== 8 || cup.droppedFromHigherIds.length !== 8) {
        return;
      }
      const pairings = playoffWinners.map((homeId, idx) => ({
        homeId,
        awayId: cup.droppedFromHigherIds[idx],
        fromHigherCup: droppedFromHigher,
      }));
      pairings.forEach((p, idx) => {
        const tieId = `${cupId.toLowerCase()}_drop_s${cup.season}_t${idx + 1}`;
        const fixId = `${tieId}_leg1`;
        cup.fixtures.push({
          id: fixId,
          week: EURO_DROP_WEEK,
          homeClubId: p.homeId,
          awayClubId: p.awayId,
          played: false,
          homeGoals: 0,
          awayGoals: 0,
          homeXg: 0,
          awayXg: 0,
          homePossession: 50,
          homeShots: 0,
          awayShots: 0,
          events: [],
          competitionId: cupId,
          stage: 'DROP_PLAYOFF',
          leg: 1,
          tieId,
          matchDaySlot: 'THU',
          dayLabel: 'Perşembe',
        });
        cup.knockoutTies.push({
          id: tieId,
          cupId,
          stage: 'DROP_PLAYOFF',
          homeClubId: p.homeId,
          awayClubId: p.awayId,
          leg1FixtureId: fixId,
          fromHigherCup: droppedFromHigher,
        });
      });
      cup.phase = 'DROP_PLAYOFF';
    };

    setupDropPlayoff('UEL', playoffWinnersByCup.UEL, 'UCL');
    setupDropPlayoff('UECL', playoffWinnersByCup.UECL, 'UEL');
  }

  // 4. After Week 20 DROP_PLAYOFF -> Create UEL & UECL R16
  if (week >= EURO_DROP_WEEK) {
    for (const cupId of ['UEL', 'UECL'] as const) {
      const cup = next[cupId];
      if (cup.phase === 'DROP_PLAYOFF') {
        const fMap = new Map(cup.fixtures.map((f) => [f.id, f]));
        const { updatedTies, winners } = resolveTwoLegTies(
          cup.knockoutTies,
          fMap,
          clubMap,
          'DROP_PLAYOFF'
        );
        if (winners.length === 8) {
          cup.knockoutTies = updatedTies;
          const top8 = computeSwissStandings(cup, clubMap).slice(0, 8).map((r) => r.clubId);
          winners.forEach((id) => creditPrize(cup, id, awardEuropeanPrizeMoney(cupId, 'R16')));

          const pairings = top8.map((homeId, idx) => ({
            homeId,
            awayId: winners[7 - idx],
          }));
          const { fixtures, ties } = buildTwoLegTieFixtures(
            cupId,
            'R16',
            pairings,
            EURO_R16_WEEKS,
            cup.season
          );
          cup.fixtures.push(...fixtures);
          cup.knockoutTies.push(...ties);
          cup.phase = 'R16';
        }
      }
    }
  }

  // 5. Progress R16 -> QF -> SF -> FINAL -> COMPLETED
  for (const cupId of cupOrder) {
    const cup = next[cupId];
    const fMap = new Map(cup.fixtures.map((f) => [f.id, f]));

    if (cup.phase === 'R16' && week >= EURO_R16_WEEKS[1]) {
      const { updatedTies, winners } = resolveTwoLegTies(cup.knockoutTies, fMap, clubMap, 'R16');
      if (winners.length === 8) {
        cup.knockoutTies = updatedTies;
        winners.forEach((id) => creditPrize(cup, id, awardEuropeanPrizeMoney(cupId, 'QF')));
        const qfPairings = [
          { homeId: winners[0], awayId: winners[7] },
          { homeId: winners[1], awayId: winners[6] },
          { homeId: winners[2], awayId: winners[5] },
          { homeId: winners[3], awayId: winners[4] },
        ];
        const { fixtures, ties } = buildTwoLegTieFixtures(cupId, 'QF', qfPairings, EURO_QF_WEEKS, cup.season);
        cup.fixtures.push(...fixtures);
        cup.knockoutTies.push(...ties);
        cup.phase = 'QF';
      }
    }

    if (cup.phase === 'QF' && week >= EURO_QF_WEEKS[1]) {
      const { updatedTies, winners } = resolveTwoLegTies(
        cup.knockoutTies,
        new Map(cup.fixtures.map((f) => [f.id, f])),
        clubMap,
        'QF'
      );
      if (winners.length === 4) {
        cup.knockoutTies = updatedTies;
        winners.forEach((id) => creditPrize(cup, id, awardEuropeanPrizeMoney(cupId, 'SF')));
        const sfPairings = [
          { homeId: winners[0], awayId: winners[3] },
          { homeId: winners[1], awayId: winners[2] },
        ];
        const { fixtures, ties } = buildTwoLegTieFixtures(cupId, 'SF', sfPairings, EURO_SF_WEEKS, cup.season);
        cup.fixtures.push(...fixtures);
        cup.knockoutTies.push(...ties);
        cup.phase = 'SF';
      }
    }

    if (cup.phase === 'SF' && week >= EURO_SF_WEEKS[1]) {
      const { updatedTies, winners } = resolveTwoLegTies(
        cup.knockoutTies,
        new Map(cup.fixtures.map((f) => [f.id, f])),
        clubMap,
        'SF'
      );
      if (winners.length === 2) {
        cup.knockoutTies = updatedTies;
        winners.forEach((id) => creditPrize(cup, id, awardEuropeanPrizeMoney(cupId, 'FINAL')));
        const tieId = `${cupId.toLowerCase()}_final_s${cup.season}`;
        const finalFixId = `${tieId}_match`;
        cup.fixtures.push({
          id: finalFixId,
          week: EURO_FINAL_WEEK,
          homeClubId: winners[0],
          awayClubId: winners[1],
          played: false,
          homeGoals: 0,
          awayGoals: 0,
          homeXg: 0,
          awayXg: 0,
          homePossession: 50,
          homeShots: 0,
          awayShots: 0,
          events: [],
          competitionId: cupId,
          stage: 'FINAL',
          leg: 1,
          tieId,
          matchDaySlot: cupId === 'UCL' ? 'WED' : 'THU',
          dayLabel: cupId === 'UCL' ? 'Çarşamba' : 'Perşembe',
        });
        cup.knockoutTies.push({
          id: tieId,
          cupId,
          stage: 'FINAL',
          homeClubId: winners[0],
          awayClubId: winners[1],
          leg1FixtureId: finalFixId,
        });
        cup.phase = 'FINAL';
      }
    }

    if (cup.phase === 'FINAL' && week >= EURO_FINAL_WEEK) {
      const finalTie = cup.knockoutTies.find((t) => t.stage === 'FINAL');
      const finalFix = finalTie
        ? cup.fixtures.find((f) => f.id === finalTie.leg1FixtureId)
        : undefined;
      if (finalTie && finalFix?.played) {
        const winnerId =
          finalFix.homeGoals > finalFix.awayGoals
            ? finalFix.homeClubId
            : finalFix.awayGoals > finalFix.homeGoals
              ? finalFix.awayClubId
              : (finalFix.penaltyWinnerId ?? finalFix.homeClubId);
        const loserId =
          winnerId === finalFix.homeClubId ? finalFix.awayClubId : finalFix.homeClubId;
        cup.championClubId = winnerId;
        cup.knockoutTies = cup.knockoutTies.map((t) =>
          t.id === finalTie.id
            ? {
                ...t,
                winnerId,
                loserId,
                homeAgg: finalFix.homeGoals,
                awayAgg: finalFix.awayGoals,
                penaltiesNote: finalFix.homeGoals === finalFix.awayGoals ? 'Penaltılarla' : undefined,
              }
            : t
        );
        creditPrize(cup, winnerId, awardEuropeanPrizeMoney(cupId, 'CHAMPION'));
        cup.phase = 'COMPLETED';
      }
    }
  }

  return {
    nextTournaments: next,
    prizesByClubId,
    dropNotices,
  };
}

// =========================================================================
// UEFA NATIONS LEAGUE ENGINE (32 Nations across League A, B, C, D)
// =========================================================================

export function createInitialNationsLeagueState(season: number): NationsLeagueState {
  const teams = buildInitialNationalTeams();
  const groups = new Map<string, NationalTeam[]>();
  for (const t of teams) {
    if (!groups.has(t.group)) groups.set(t.group, []);
    groups.get(t.group)!.push(t);
  }

  const fixtures: Fixture[] = [];
  // Double round-robin for each 4-team group -> 6 matchdays!
  for (const [groupCode, groupTeams] of groups.entries()) {
    if (groupTeams.length !== 4) continue;
    const [t0, t1, t2, t3] = groupTeams;
    const rounds: Array<Array<[string, string]>> = [
      [[t0.id, t1.id], [t2.id, t3.id]],
      [[t3.id, t0.id], [t1.id, t2.id]],
      [[t0.id, t2.id], [t1.id, t3.id]],
      [[t1.id, t0.id], [t3.id, t2.id]],
      [[t0.id, t3.id], [t2.id, t1.id]],
      [[t2.id, t0.id], [t3.id, t1.id]],
    ];

    rounds.forEach((pairs, mdIdx) => {
      const md = mdIdx + 1;
      const week = UNL_GROUP_WEEKS[mdIdx] ?? md * 2;
      pairs.forEach(([homeId, awayId], pIdx) => {
        fixtures.push({
          id: `unl_s${season}_${groupCode}_md${md}_${pIdx + 1}`,
          week,
          homeClubId: homeId,
          awayClubId: awayId,
          played: false,
          homeGoals: 0,
          awayGoals: 0,
          homeXg: 0,
          awayXg: 0,
          homePossession: 50,
          homeShots: 0,
          awayShots: 0,
          events: [],
          competitionId: 'UNL',
          stage: 'GROUP',
          matchday: md,
          groupCode,
          matchDaySlot: 'INTL',
          dayLabel: 'Milli Ara',
        });
      });
    });
  }

  return {
    season,
    phase: 'GROUPS',
    currentMatchday: 1,
    teams,
    fixtures,
    promoPlayoffTies: [],
    finalsTies: [],
    championTeamId: null,
  };
}

export function computeNationsLeagueStandings(
  state: NationsLeagueState
): Record<string, NationsLeagueGroupRow[]> {
  const rowMap = new Map<string, NationsLeagueGroupRow>();
  const repMap = new Map<string, number>();

  for (const t of state.teams) {
    repMap.set(t.id, t.reputation);
    rowMap.set(t.id, {
      teamId: t.id,
      group: t.group,
      tier: t.tier,
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

  const groupFixtures = state.fixtures
    .filter((f) => f.stage === 'GROUP' && f.played)
    .sort((a, b) => (a.matchday ?? a.week) - (b.matchday ?? b.week));

  for (const f of groupFixtures) {
    const h = rowMap.get(f.homeClubId);
    const a = rowMap.get(f.awayClubId);
    if (!h || !a) continue;

    h.played++;
    a.played++;
    h.gf += f.homeGoals;
    h.ga += f.awayGoals;
    a.gf += f.awayGoals;
    a.ga += f.homeGoals;

    if (f.homeGoals > f.awayGoals) {
      h.won++;
      h.points += 3;
      h.form.push('W');
      a.lost++;
      a.form.push('L');
    } else if (f.homeGoals < f.awayGoals) {
      a.won++;
      a.points += 3;
      a.form.push('W');
      h.lost++;
      h.form.push('L');
    } else {
      h.drawn++;
      a.drawn++;
      h.points += 1;
      a.points += 1;
      h.form.push('D');
      a.form.push('D');
    }
  }

  const grouped: Record<string, NationsLeagueGroupRow[]> = {};
  for (const row of rowMap.values()) {
    row.gd = row.gf - row.ga;
    row.form = row.form.slice(-5);
    if (!grouped[row.group]) grouped[row.group] = [];
    grouped[row.group].push(row);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return (repMap.get(b.teamId) ?? 75) - (repMap.get(a.teamId) ?? 75);
    });
  }

  return grouped;
}

export function advanceNationsLeagueForWeek(
  state: NationsLeagueState,
  week: number,
  userPlayedFixtureIds: Set<string> = new Set()
): NationsLeagueState {
  const nationClubMap = new Map<string, Club>(
    state.teams.map((t) => [t.id, nationalTeamToClub(t)])
  );

  const next: NationsLeagueState = {
    ...state,
    fixtures: state.fixtures.map((f) => ({ ...f })),
    promoPlayoffTies: state.promoPlayoffTies.map((t) => ({ ...t })),
    finalsTies: state.finalsTies.map((t) => ({ ...t })),
  };

  next.fixtures = next.fixtures.map((f) => {
    if (f.week !== week) return f;
    if (f.played || userPlayedFixtureIds.has(f.id)) return f;
    const h = nationClubMap.get(f.homeClubId);
    const a = nationClubMap.get(f.awayClubId);
    if (!h || !a) return f;
    return simulateCupFixtureOutcome(
      f,
      h,
      a,
      f.stage !== 'GROUP'
    );
  });

  const mdIdx = UNL_GROUP_WEEKS.indexOf(week as (typeof UNL_GROUP_WEEKS)[number]);
  if (mdIdx >= 0) {
    next.currentMatchday = Math.min(6, mdIdx + 2);
  }

  // At end of MD6 (Week 12) -> Build League A Finals Four Semis + A/B, B/C, C/D Promotion/Relegation Play-offs (Week 16)
  if (next.phase === 'GROUPS' && week >= UNL_GROUP_WEEKS[5]) {
    const allGroupsPlayed = next.fixtures
      .filter((f) => f.stage === 'GROUP')
      .every((f) => f.played);
    if (allGroupsPlayed) {
      const grouped = computeNationsLeagueStandings(next);
      const a1 = grouped['A1'] ?? [];
      const a2 = grouped['A2'] ?? [];
      const b1 = grouped['B1'] ?? [];
      const b2 = grouped['B2'] ?? [];
      const c1 = grouped['C1'] ?? [];
      const c2 = grouped['C2'] ?? [];
      const d1 = grouped['D1'] ?? [];
      const d2 = grouped['D2'] ?? [];

      // Finals Four Semi-Finals: A1#1 vs A2#2, A2#1 vs A1#2
      const sfPairs = [
        [a1[0]?.teamId, a2[1]?.teamId],
        [a2[0]?.teamId, a1[1]?.teamId],
      ];
      sfPairs.forEach(([hId, aId], idx) => {
        if (!hId || !aId) return;
        const tieId = `unl_sf_s${next.season}_${idx + 1}`;
        const fId = `${tieId}_m`;
        next.fixtures.push({
          id: fId,
          week: UNL_SEMI_WEEK,
          homeClubId: hId,
          awayClubId: aId,
          played: false,
          homeGoals: 0,
          awayGoals: 0,
          homeXg: 0,
          awayXg: 0,
          homePossession: 50,
          homeShots: 0,
          awayShots: 0,
          events: [],
          competitionId: 'UNL',
          stage: 'SF',
          leg: 1,
          tieId,
          matchDaySlot: 'INTL',
          dayLabel: 'Milli Ara (Dörtlü Final)',
        });
        next.finalsTies.push({
          id: tieId,
          cupId: 'UNL',
          stage: 'SF',
          homeClubId: hId,
          awayClubId: aId,
          leg1FixtureId: fId,
        });
      });

      // Promotion / Relegation Play-offs (A 3rd vs B 2nd, B 3rd vs C 2nd, C 3rd vs D 2nd)
      const promoPairs = [
        [a1[2]?.teamId, b2[1]?.teamId],
        [a2[2]?.teamId, b1[1]?.teamId],
        [b1[2]?.teamId, c2[1]?.teamId],
        [b2[2]?.teamId, c1[1]?.teamId],
        [c1[2]?.teamId, d2[1]?.teamId],
        [c2[2]?.teamId, d1[1]?.teamId],
      ];
      promoPairs.forEach(([hId, aId], idx) => {
        if (!hId || !aId) return;
        const tieId = `unl_promo_s${next.season}_${idx + 1}`;
        const fId = `${tieId}_m`;
        next.fixtures.push({
          id: fId,
          week: UNL_SEMI_WEEK,
          homeClubId: hId,
          awayClubId: aId,
          played: false,
          homeGoals: 0,
          awayGoals: 0,
          homeXg: 0,
          awayXg: 0,
          homePossession: 50,
          homeShots: 0,
          awayShots: 0,
          events: [],
          competitionId: 'UNL',
          stage: 'PROMO_PLAYOFF',
          leg: 1,
          tieId,
          matchDaySlot: 'INTL',
          dayLabel: 'Milli Ara (Play-off)',
        });
        next.promoPlayoffTies.push({
          id: tieId,
          cupId: 'UNL',
          stage: 'PROMO_PLAYOFF',
          homeClubId: hId,
          awayClubId: aId,
          leg1FixtureId: fId,
        });
      });

      next.phase = 'PLAYOFFS_AND_FINALS';
    }
  }

  // At end of Week 16 -> Resolve Semis & Promo Playoffs, create Finals Four Final & 3rd Place Match (Week 17)
  if (next.phase === 'PLAYOFFS_AND_FINALS' && week >= UNL_SEMI_WEEK) {
    const fMap = new Map(next.fixtures.map((f) => [f.id, f]));
    const sfWinners: string[] = [];
    const sfLosers: string[] = [];

    next.finalsTies = next.finalsTies.map((tie) => {
      if (tie.stage !== 'SF') return tie;
      const fx = fMap.get(tie.leg1FixtureId);
      if (!fx || !fx.played) return tie;
      const winnerId =
        fx.homeGoals > fx.awayGoals
          ? fx.homeClubId
          : fx.awayGoals > fx.homeGoals
            ? fx.awayClubId
            : (fx.penaltyWinnerId ?? fx.homeClubId);
      const loserId = winnerId === fx.homeClubId ? fx.awayClubId : fx.homeClubId;
      sfWinners.push(winnerId);
      sfLosers.push(loserId);
      return {
        ...tie,
        winnerId,
        loserId,
        homeAgg: fx.homeGoals,
        awayAgg: fx.awayGoals,
      };
    });

    next.promoPlayoffTies = next.promoPlayoffTies.map((tie) => {
      const fx = fMap.get(tie.leg1FixtureId);
      if (!fx || !fx.played) return tie;
      const winnerId =
        fx.homeGoals > fx.awayGoals
          ? fx.homeClubId
          : fx.awayGoals > fx.homeGoals
            ? fx.awayClubId
            : (fx.penaltyWinnerId ?? fx.homeClubId);
      const loserId = winnerId === fx.homeClubId ? fx.awayClubId : fx.homeClubId;
      return {
        ...tie,
        winnerId,
        loserId,
        homeAgg: fx.homeGoals,
        awayAgg: fx.awayGoals,
      };
    });

    if (sfWinners.length === 2 && sfLosers.length === 2) {
      const finalTieId = `unl_final_s${next.season}`;
      const finalFxId = `${finalTieId}_m`;
      const thirdTieId = `unl_third_s${next.season}`;
      const thirdFxId = `${thirdTieId}_m`;

      next.fixtures.push(
        {
          id: finalFxId,
          week: UNL_FINAL_WEEK,
          homeClubId: sfWinners[0],
          awayClubId: sfWinners[1],
          played: false,
          homeGoals: 0,
          awayGoals: 0,
          homeXg: 0,
          awayXg: 0,
          homePossession: 50,
          homeShots: 0,
          awayShots: 0,
          events: [],
          competitionId: 'UNL',
          stage: 'FINAL',
          leg: 1,
          tieId: finalTieId,
          matchDaySlot: 'INTL',
          dayLabel: 'Uluslar Ligi Finali',
        },
        {
          id: thirdFxId,
          week: UNL_FINAL_WEEK,
          homeClubId: sfLosers[0],
          awayClubId: sfLosers[1],
          played: false,
          homeGoals: 0,
          awayGoals: 0,
          homeXg: 0,
          awayXg: 0,
          homePossession: 50,
          homeShots: 0,
          awayShots: 0,
          events: [],
          competitionId: 'UNL',
          stage: 'THIRD_PLACE',
          leg: 1,
          tieId: thirdTieId,
          matchDaySlot: 'INTL',
          dayLabel: '3.lük Maçı',
        }
      );

      next.finalsTies.push(
        {
          id: finalTieId,
          cupId: 'UNL',
          stage: 'FINAL',
          homeClubId: sfWinners[0],
          awayClubId: sfWinners[1],
          leg1FixtureId: finalFxId,
        },
        {
          id: thirdTieId,
          cupId: 'UNL',
          stage: 'THIRD_PLACE',
          homeClubId: sfLosers[0],
          awayClubId: sfLosers[1],
          leg1FixtureId: thirdFxId,
        }
      );
      next.phase = 'FINAL';
    }
  }

  // At end of Week 17 -> Crown Nations League Champion
  if (next.phase === 'FINAL' && week >= UNL_FINAL_WEEK) {
    const fMap = new Map(next.fixtures.map((f) => [f.id, f]));
    let champ: string | null = null;
    next.finalsTies = next.finalsTies.map((tie) => {
      if (tie.stage !== 'FINAL' && tie.stage !== 'THIRD_PLACE') return tie;
      const fx = fMap.get(tie.leg1FixtureId);
      if (!fx || !fx.played) return tie;
      const winnerId =
        fx.homeGoals > fx.awayGoals
          ? fx.homeClubId
          : fx.awayGoals > fx.homeGoals
            ? fx.awayClubId
            : (fx.penaltyWinnerId ?? fx.homeClubId);
      const loserId = winnerId === fx.homeClubId ? fx.awayClubId : fx.homeClubId;
      if (tie.stage === 'FINAL') champ = winnerId;
      return {
        ...tie,
        winnerId,
        loserId,
        homeAgg: fx.homeGoals,
        awayAgg: fx.awayGoals,
      };
    });
    if (champ) {
      next.championTeamId = champ;
      next.phase = 'COMPLETED';
    }
  }

  return next;
}

export function buildNationDefaultTactics(nation: NationalTeam) {
  const clubLike = nationalTeamToClub(nation);
  const slots = buildTacticsForClub(clubLike, nation.preferredFormation);
  const benchPlayerIds = buildDefaultBenchForClub(clubLike, slots);
  return {
    formation: nation.preferredFormation,
    tacticalStyle: 'CONTROL_POSSESSION' as const,
    mentality: 'BALANCED' as const,
    pressing: 'MEDIUM' as const,
    tempo: 'NORMAL' as const,
    defensiveLine: 52,
    slots,
    benchPlayerIds,
  };
}
