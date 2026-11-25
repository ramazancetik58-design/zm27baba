/**
 * Maç analizi: oyuncu puanları (FM tarzı 3.0–10.0), maçın adamı ve şut haritası verisi.
 * Saf fonksiyonlar: 3D maç istatistik toplar, burada puana çevrilir (test edilebilir).
 */
export type Side = 'HOME' | 'AWAY';

export interface PlayerMatchStats {
  id: string;
  name: string;
  team: Side;
  role: string;
  /** Sahada geçirilen dakika (0 = oynamadı). */
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  onTarget: number;
  xg: number;
  passes: number;
  passesOk: number;
  /** Başarılı savunma müdahalesi (top çalma / pas kesme). */
  defActions: number;
  saves: number;
}

export interface ShotRecord {
  minute: number;
  team: Side;
  /** Saha koordinatı (metre): x genişlik, z uzunluk. */
  x: number;
  z: number;
  xg: number;
  outcome: 'GOAL' | 'SAVE' | 'WOODWORK';
  playerId: string;
  name: string;
}

export interface PlayerRating extends PlayerMatchStats {
  rating: number;
}

export interface MatchAnalysis {
  ratings: PlayerRating[];
  motm: PlayerRating | null;
  shots: ShotRecord[];
  homeGoals: number;
  awayGoals: number;
}

type Group = 'GK' | 'DEF' | 'MID' | 'FWD';
export function groupOf(role: string): Group {
  const r = role.toUpperCase();
  if (r === 'GK') return 'GK';
  if (/^(CB|LB|RB|LWB|RWB|SW|DEF|DF)/.test(r)) return 'DEF';
  if (/(ST|CF|FW|LW|RW|SS|WF)/.test(r)) return 'FWD';
  return 'MID';
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function ratePlayer(s: PlayerMatchStats, goalsFor: number, goalsAgainst: number): number {
  const g = groupOf(s.role);
  let r = 6.0;
  r += Math.min(s.goals, 1) * 1.2 + Math.max(0, Math.min(s.goals, 2) - 1) * 1.0 + Math.max(0, s.goals - 2) * 0.8;
  r += Math.min(s.assists, 2) * 0.8;
  r += Math.min(0.5, s.onTarget * 0.1);
  if (g === 'FWD' || g === 'MID') r += clamp((s.goals - s.xg) * 0.25, -0.3, 0.4);
  if (s.passes > 0) {
    const vol = Math.min(1, s.passes / 35);
    r += (s.passesOk / s.passes - 0.78) * 2.2 * vol;
  }
  const defW = g === 'FWD' ? 0.1 : 0.16;
  r += Math.min(1.0, s.defActions * defW);
  if (g === 'GK') r += Math.min(1.6, s.saves * 0.28);
  const concedeW = g === 'GK' ? 0.3 : g === 'DEF' ? 0.2 : g === 'MID' ? 0.08 : 0;
  r -= Math.min(1.2, goalsAgainst * concedeW);
  if (goalsAgainst === 0) r += g === 'GK' ? 0.8 : g === 'DEF' ? 0.55 : g === 'MID' ? 0.15 : 0;
  r += goalsFor > goalsAgainst ? 0.25 : goalsFor < goalsAgainst ? -0.25 : 0;
  if (s.minutes < 30) r = 6 + (r - 6) * (s.minutes / 30); // kısa süre = az etki
  return Math.round(clamp(r, 3, 10) * 10) / 10;
}

export function analyzeMatch(stats: PlayerMatchStats[], shots: ShotRecord[], homeGoals: number, awayGoals: number): MatchAnalysis {
  const ratings: PlayerRating[] = stats
    .filter((s) => s.minutes > 0)
    .map((s) => {
      const gf = s.team === 'HOME' ? homeGoals : awayGoals;
      const ga = s.team === 'HOME' ? awayGoals : homeGoals;
      return { ...s, rating: ratePlayer(s, gf, ga) };
    })
    .sort((a, b) => b.rating - a.rating || b.goals + b.assists - (a.goals + a.assists));
  const winner: Side | null = homeGoals > awayGoals ? 'HOME' : awayGoals > homeGoals ? 'AWAY' : null;
  const motm =
    [...ratings].sort(
      (a, b) =>
        b.rating - a.rating ||
        b.goals + b.assists - (a.goals + a.assists) ||
        Number(b.team === winner) - Number(a.team === winner)
    )[0] ?? null;
  return { ratings, motm, shots, homeGoals, awayGoals };
}
