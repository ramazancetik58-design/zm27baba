/**
 * Deterministik dakika-dakika maç motoru (saf fonksiyon, arayüzden bağımsız).
 * Tohum + takımlar aynıysa sonuç birebir aynıdır. Math.random kullanılmaz.
 *
 * Modeller: topla oynama, şut kalitesi (xG), kaleci etkisi, momentum, yorgunluk, taktik
 * (mantalite/pres/tempo/savunma hattı), hava durumu, kart/sakatlık, oyun içi değişiklik, PPDA.
 */
import { createRng } from './rng';
import type { Mentality, Player, PositionGroup, PressingIntensity, Tempo } from './types';

export type Weather = 'CLEAR' | 'RAIN' | 'HEAT' | 'COLD';
export type EngineSide = 'HOME' | 'AWAY';

export interface EngineTeam {
  clubId: string;
  /** calculateTacticalStrength çıktısı (yaklaşık 35–95). */
  attack: number;
  midfield: number;
  defense: number;
  mentality: Mentality;
  pressing: PressingIntensity;
  tempo: Tempo;
  defensiveLine: number;
  starters: Player[];
  bench: Player[];
}

export interface EngineOptions {
  seed: string;
  neutralVenue?: boolean;
  weather?: Weather;
  maxSubs?: number;
}

export interface EngineEvent {
  minute: number;
  type: 'GOAL' | 'SHOT' | 'SAVE' | 'YELLOW' | 'RED' | 'INJURY' | 'SUB';
  side: EngineSide;
  playerId: string;
  assistId?: string;
  /** SUB olayında giren oyuncu. */
  inId?: string;
  xg?: number;
}

export interface EngineResult {
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  homeShots: number;
  awayShots: number;
  homeOnTarget: number;
  awayOnTarget: number;
  /** 0–100, ev sahibi. */
  homePossession: number;
  homePpda: number;
  awayPpda: number;
  /** Her 10 dakikada bir momentum (-1 deplasman … +1 ev sahibi). */
  momentum: number[];
  events: EngineEvent[];
  /** Maç sonu oyuncu kondisyonu (id -> 0..100). */
  endCondition: Record<string, number>;
  minutesPlayed: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const MENTALITY: Record<Mentality, { atk: number; def: number }> = {
  DEFENSIVE: { atk: -3, def: 2.5 },
  BALANCED: { atk: 0, def: 0 },
  ATTACKING: { atk: 3, def: -2.5 },
  ALL_OUT: { atk: 6, def: -5.5 },
};
const PRESS: Record<PressingIntensity, { mid: number; drain: number; turnover: number; space: number }> = {
  LOW: { mid: -0.8, drain: 0.9, turnover: 0, space: -0.03 },
  MEDIUM: { mid: 0, drain: 1, turnover: 0.25, space: 0 },
  HIGH: { mid: 1, drain: 1.2, turnover: 0.55, space: 0.04 },
  GEGENPRESS: { mid: 1.8, drain: 1.4, turnover: 0.85, space: 0.07 },
};
const TEMPO: Record<Tempo, { rate: number; drain: number }> = {
  SLOW: { rate: 0.92, drain: 0.92 },
  NORMAL: { rate: 1, drain: 1 },
  FAST: { rate: 1.08, drain: 1.12 },
};

/** Kondisyona bağlı etkin güç çarpanı: >=75 tam, 40'ta ~%86. */
const fatigueFactor = (cond: number) => (cond >= 75 ? 1 : 1 - (75 - cond) * 0.004);

interface LivePlayer {
  p: Player;
  cond: number;
  yellow: boolean;
}

interface Live {
  side: EngineSide;
  t: EngineTeam;
  on: LivePlayer[];
  bench: Player[];
  subsUsed: number;
  goals: number;
  xg: number;
  shots: number;
  onTarget: number;
  passes: number;
  defActs: number;
  baseEff: number;
  hasGk: boolean;
}

const effSum = (l: Live) => l.on.reduce((s, x) => s + x.p.ovr * fatigueFactor(x.cond), 0);

function weightedPick<T>(items: T[], weight: (x: T) => number, u: number): T | null {
  let total = 0;
  const w = items.map((x) => {
    const v = Math.max(0, weight(x));
    total += v;
    return v;
  });
  if (total <= 0 || items.length === 0) return null;
  let q = u * total;
  for (let i = 0; i < items.length; i++) {
    q -= w[i];
    if (q < 0) return items[i];
  }
  return items[items.length - 1];
}

const SHOOT_W: Record<PositionGroup, number> = { GK: 0, DEF: 0.6, MID: 2.4, FWD: 5 };
const ASSIST_W: Record<PositionGroup, number> = { GK: 0.05, DEF: 0.8, MID: 3, FWD: 2.2 };
const FOUL_W: Record<PositionGroup, number> = { GK: 0.2, DEF: 3, MID: 3, FWD: 1 };

export function simulateMatch(home: EngineTeam, away: EngineTeam, opts: EngineOptions): EngineResult {
  const rng = createRng(`match:${opts.seed}`);
  const weather: Weather = opts.weather ?? 'CLEAR';
  const maxSubs = opts.maxSubs ?? 5;
  const mk = (t: EngineTeam, side: EngineSide): Live => {
    const on = t.starters.slice(0, 11).map((p) => ({ p, cond: clamp(p.condition ?? 100, 20, 100), yellow: false }));
    const l: Live = {
      side, t, on, bench: [...t.bench], subsUsed: 0, goals: 0, xg: 0, shots: 0, onTarget: 0,
      passes: 0, defActs: 1, baseEff: 1, hasGk: on.some((x) => x.p.positionGroup === 'GK'),
    };
    l.baseEff = Math.max(1, effSum(l));
    return l;
  };
  const H = mk(home, 'HOME');
  const A = mk(away, 'AWAY');
  const events: EngineEvent[] = [];
  const momentum: number[] = [];
  const s1 = rng() < 0.5 ? 1 : rng() < 0.5 ? 2 : 3;
  const s2 = 2 + Math.floor(rng() * 5);
  const total = 90 + s1 + s2;
  const homeAdv = opts.neutralVenue ? 0 : 3;
  const weatherDrain = weather === 'HEAT' ? 1.2 : 1;
  const weatherXg = weather === 'RAIN' ? 0.95 : 1;
  const weatherRate = weather === 'RAIN' ? 0.96 : 1;
  let mom = 0;
  let homePoss = 0;
  let awayPoss = 0;

  const label = (t: number) => (t <= 45 + s1 ? Math.min(t, 45) : Math.min(t - s1, 90));

  const strengths = (me: Live, opp: Live, t: number) => {
    const scale = effSum(me) / me.baseEff;
    const lead = me.goals - opp.goals;
    let atkAdj = MENTALITY[me.t.mentality].atk;
    let defAdj = MENTALITY[me.t.mentality].def;
    if (t > 70 && lead < 0) { atkAdj += 2; defAdj -= 1.5; }
    if (t > 75 && lead > 0) { atkAdj -= 1.5; defAdj += 1.5; }
    const adv = me.side === 'HOME' ? homeAdv : 0;
    return {
      atk: (me.t.attack + atkAdj + adv) * scale,
      mid: (me.t.midfield + PRESS[me.t.pressing].mid + adv) * scale,
      def: (me.t.defense + defAdj + adv) * scale,
    };
  };

  const pushCard = (me: Live, t: number, straightRed = false) => {
    const p = weightedPick(me.on, (x) => FOUL_W[x.p.positionGroup] * (1.3 - (x.p.attributes?.defending ?? 60) / 200), rng());
    if (!p) return;
    if (p.yellow || straightRed) {
      events.push({ minute: label(t), type: 'RED', side: me.side, playerId: p.p.id });
      me.on = me.on.filter((x) => x !== p);
    } else {
      p.yellow = true;
      events.push({ minute: label(t), type: 'YELLOW', side: me.side, playerId: p.p.id });
    }
  };

  const substitute = (me: Live, t: number, forced: LivePlayer | null) => {
    if (me.subsUsed >= maxSubs || me.bench.length === 0) return false;
    const trailing = me.goals < (me === H ? A : H).goals;
    let out = forced;
    if (!out) {
      const tired = me.on.filter((x) => x.p.positionGroup !== 'GK').sort((a, b) => a.cond - b.cond)[0];
      if (!tired) return false;
      if (tired.cond < 62) out = tired;
      else if (trailing && t > 60) {
        out = me.on.filter((x) => x.p.positionGroup === 'DEF' || x.p.positionGroup === 'MID').sort((a, b) => a.p.ovr - b.p.ovr)[0] ?? null;
      }
      if (!out) return false;
    }
    const want: PositionGroup = forced ? out.p.positionGroup : trailing && t > 60 ? 'FWD' : out.p.positionGroup;
    const pool = me.bench.filter((b) => b.positionGroup === want && b.injuredWeeks === 0);
    const cand = (pool.length ? pool : me.bench.filter((b) => b.positionGroup !== 'GK' && b.injuredWeeks === 0)).sort((a, b) => b.ovr - a.ovr)[0];
    if (!cand) return false;
    me.bench = me.bench.filter((b) => b !== cand);
    me.on = me.on.map((x) => (x === out ? { p: cand, cond: clamp(cand.condition ?? 100, 20, 100), yellow: false } : x));
    me.subsUsed++;
    events.push({ minute: label(t), type: 'SUB', side: me.side, playerId: out.p.id, inId: cand.id });
    return true;
  };

  for (let t = 1; t <= total; t++) {
    const hs = strengths(H, A, t);
    const as = strengths(A, H, t);

    // Topla oynama
    const pHome = clamp(0.5 + ((hs.mid - as.mid) / 100) * 1.1 + mom * 0.05 + (TEMPO[H.t.tempo].rate - TEMPO[A.t.tempo].rate) * -0.1, 0.28, 0.72);
    const homeBall = rng() < pHome;
    const atk = homeBall ? H : A;
    const dfn = homeBall ? A : H;
    const aS = homeBall ? hs : as;
    const dS = homeBall ? as : hs;
    if (homeBall) homePoss++; else awayPoss++;
    atk.passes += Math.round((5 + rng() * 5) * (TEMPO[atk.t.tempo].rate));
    dfn.defActs += Math.floor(rng() * 2.2 + PRESS[dfn.t.pressing].turnover * (rng() < 0.6 ? 1.6 : 0.6));

    // Hücum fırsatı
    const ratio = clamp(aS.atk / Math.max(30, dS.def), 0.6, 1.6);
    const momFor = homeBall ? mom : -mom;
    // Yüksek savunma hattı arkada boşluk bırakır, alçak hat boşluğu kapatır.
    const space = dfn.t.defensiveLine > 70 ? 0.04 : dfn.t.defensiveLine < 40 ? -0.03 : 0;
    const chance = clamp(
      0.245 * Math.pow(ratio, 1.8) * TEMPO[atk.t.tempo].rate * TEMPO[dfn.t.tempo].rate * weatherRate * (1 + 0.15 * momFor) * (1 + space + PRESS[atk.t.pressing].space * 0.5),
      0.02, 0.5
    );
    if (rng() < chance) {
      const shooter = weightedPick(atk.on, (x) => SHOOT_W[x.p.positionGroup] * Math.pow((x.p.attributes?.shooting ?? 60) / 70, 2), rng());
      if (shooter) {
        const q = 1 + ((shooter.p.attributes?.shooting ?? 70) - 70) / 150;
        const u = rng();
        const xg = clamp((0.02 + Math.pow(u, 4) * 0.46) * q * Math.pow(ratio, 0.6) * weatherXg, 0.01, 0.8);
        atk.shots++;
        atk.xg += xg;
        const onProb = clamp(0.3 + xg * 1.2 + ((shooter.p.attributes?.shooting ?? 60) - 65) / 300, 0.25, 0.85);
        let result: 'GOAL' | 'SAVE' | 'SHOT' = 'SHOT';
        if (rng() < onProb) {
          atk.onTarget++;
          const gk = dfn.on.find((x) => x.p.positionGroup === 'GK');
          const gkF = dfn.hasGk && gk ? clamp(1 - ((gk.p.attributes?.goalkeeping ?? gk.p.ovr) - 65) / 250, 0.85, 1.15) : 1.15;
          result = rng() < clamp((xg / onProb) * gkF, 0, 0.95) ? 'GOAL' : 'SAVE';
        }
        const ev: EngineEvent = { minute: label(t), type: result, side: atk.side, playerId: shooter.p.id, xg: Math.round(xg * 100) / 100 };
        if (result === 'GOAL') {
          const as2 = weightedPick(atk.on.filter((x) => x !== shooter), (x) => ASSIST_W[x.p.positionGroup] * Math.pow((x.p.attributes?.passing ?? 60) / 70, 2), rng());
          if (as2 && rng() < 0.78) ev.assistId = as2.p.id;
          atk.goals++;
          mom = clamp(mom + (homeBall ? 0.45 : -0.45), -1, 1);
        } else {
          mom = clamp(mom + (homeBall ? 0.05 : -0.05), -1, 1);
        }
        events.push(ev);
      }
    }

    // Kart ve sakatlık
    for (const me of [H, A]) {
      const opp = me === H ? A : H;
      const foul = 0.0105 * (1 + PRESS[me.t.pressing].turnover * 0.3) * (me.goals < opp.goals ? 1.1 : 1);
      if (rng() < foul) pushCard(me, t);
      if (rng() < 0.0003) pushCard(me, t, true);
      const avgCond = me.on.reduce((s, x) => s + x.cond, 0) / Math.max(1, me.on.length);
      if (rng() < 0.0006 * (1 + Math.max(0, 60 - avgCond) / 40)) {
        const inj = weightedPick(me.on, (x) => 1 + (100 - x.cond) / 40, rng());
        if (inj) {
          events.push({ minute: label(t), type: 'INJURY', side: me.side, playerId: inj.p.id });
          if (!substitute(me, t, inj)) me.on = me.on.filter((x) => x !== inj);
        }
      }
    }

    // Yorgunluk
    for (const me of [H, A]) {
      const drain = PRESS[me.t.pressing].drain * TEMPO[me.t.tempo].drain * weatherDrain;
      for (const x of me.on) {
        const stamina = x.p.attributes?.stamina ?? 65;
        x.cond = Math.max(10, x.cond - 0.3 * (1.45 - stamina / 100) * drain);
      }
    }

    // Oyun içi değişiklik (60. dakikadan sonra)
    if (t >= 55 && t <= 88) {
      for (const me of [H, A]) if (rng() < 0.07) substitute(me, t, null);
    }

    mom *= 0.93;
    if (t % 10 === 0) momentum.push(Math.round(mom * 100) / 100);
  }

  const poss = homePoss + awayPoss || 1;
  const dec = (v: number) => Math.round(v * 100) / 100;
  const endCondition: Record<string, number> = {};
  for (const me of [H, A]) for (const x of me.on) endCondition[x.p.id] = Math.round(x.cond);
  return {
    homeGoals: H.goals,
    awayGoals: A.goals,
    homeXg: dec(H.xg),
    awayXg: dec(A.xg),
    homeShots: H.shots,
    awayShots: A.shots,
    homeOnTarget: H.onTarget,
    awayOnTarget: A.onTarget,
    homePossession: Math.round((homePoss / poss) * 100),
    homePpda: dec(A.passes / Math.max(1, H.defActs)),
    awayPpda: dec(H.passes / Math.max(1, A.defActs)),
    momentum,
    events,
    endCondition,
    minutesPlayed: total,
  };
}

export interface ShotContext {
  shooterOvr: number;
  /** 0..100 */
  shooterCondition: number;
  /** Rakip kalecinin kalecilik/ovr değeri; kaleci yoksa null. */
  gkRating: number | null;
  /** Şutu çeken takım açısından -1..+1. */
  momentum: number;
}

/**
 * Şut kalitesi ve gole dönüşüm çarpanları (ortalama ≈ 1). Hem dakika motoru hem 3D canlı maç
 * bunu kullanır: iyi forvet, formda takım ve momentum şans yaratır; iyi kaleci dönüşümü düşürür.
 */
export function shotModifiers(c: ShotContext): { xgMul: number; convMul: number } {
  const shooter = clamp(1 + (c.shooterOvr - 70) / 150, 0.75, 1.3);
  const fatigue = Math.pow(fatigueFactor(clamp(c.shooterCondition, 0, 100)), 1.5);
  const mom = 1 + 0.12 * clamp(c.momentum, -1, 1);
  const gk = c.gkRating == null ? 1.1 : clamp(1 - (c.gkRating - 65) / 250, 0.85, 1.15);
  return { xgMul: shooter * fatigue * mom, convMul: gk };
}

export interface SubCandidate {
  id: string;
  positionGroup: PositionGroup;
  /** 0..100 canlı kondisyon */
  condition: number;
  injured: boolean;
}

/** Canlı değişiklik önerisi: önce sakat oyuncu, yoksa 62'nin altındaki en yorgun saha oyuncusu. */
export function suggestSubOut(onPitch: SubCandidate[]): string | null {
  const injured = onPitch.find((c) => c.injured);
  if (injured) return injured.id;
  const tired = onPitch.filter((c) => c.positionGroup !== 'GK').sort((a, b) => a.condition - b.condition)[0];
  return tired && tired.condition < 62 ? tired.id : null;
}
