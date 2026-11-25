/** AI kulüp maçlarını matchEngine ile oynatan uyarlayıcı (App.tsx'ten ayrıldı, test edilebilir). */
import { buildTacticsForClub } from './database';
import { calculateTacticalStrength } from './hardcoreRules';
import { simulateMatch, type EngineResult, type EngineTeam } from './matchEngine';
import type { Club, Fixture, TacticsConfig } from './types';

export function buildEngineTeam(club: Club): EngineTeam {
  const tactics: TacticsConfig = {
    formation: club.preferredFormation,
    mentality: 'BALANCED',
    pressing: 'MEDIUM',
    tempo: 'NORMAL',
    defensiveLine: 55,
    slots: buildTacticsForClub(club),
    benchPlayerIds: [],
  };
  const s = calculateTacticalStrength(club, tactics);
  const byId = new Map(club.players.map((p) => [p.id, p]));
  const starters = tactics.slots.map((sl) => (sl.playerId ? byId.get(sl.playerId) : undefined)).filter((p): p is NonNullable<typeof p> => !!p && p.injuredWeeks === 0);
  const used = new Set(starters.map((p) => p.id));
  const bench = club.players.filter((p) => !used.has(p.id) && p.injuredWeeks === 0).sort((a, b) => b.ovr - a.ovr).slice(0, 9);
  return {
    clubId: club.id,
    attack: s.attack,
    midfield: s.midfield,
    defense: s.defense,
    mentality: tactics.mentality,
    pressing: tactics.pressing,
    tempo: tactics.tempo,
    defensiveLine: tactics.defensiveLine,
    starters,
    bench,
  };
}

export function simulateAiFixture(
  f: Fixture,
  clubs: Club[]
): { fixture: Fixture; scorers: Map<string, { goals: number; assists: number }>; result: EngineResult } {
  const hClub = clubs.find((c) => c.id === f.homeClubId)!;
  const aClub = clubs.find((c) => c.id === f.awayClubId)!;
  const result = simulateMatch(buildEngineTeam(hClub), buildEngineTeam(aClub), {
    seed: `ai:${f.id}:${f.week}`,
    neutralVenue: f.stage === 'FINAL' && !!f.competitionId,
  });
  const scorers = new Map<string, { goals: number; assists: number }>();
  const bump = (id: string, g: number, a: number) => {
    const cur = scorers.get(id) ?? { goals: 0, assists: 0 };
    scorers.set(id, { goals: cur.goals + g, assists: cur.assists + a });
  };
  for (const e of result.events) {
    if (e.type !== 'GOAL') continue;
    bump(e.playerId, 1, 0);
    if (e.assistId) bump(e.assistId, 0, 1);
  }
  return {
    fixture: {
      ...f,
      played: true,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      homeXg: result.homeXg,
      awayXg: result.awayXg,
      homeShots: result.homeShots,
      awayShots: result.awayShots,
      homePossession: result.homePossession,
    },
    scorers,
    result,
  };
}
