import { MENTALITY, PRESS, TEMPO } from './matchEngine';
import type { Mentality, PressingIntensity, TacticsConfig, Tempo } from './types';

export interface TacticPreset {
  id: string;
  tr: string;
  en: string;
  descTr: string;
  descEn: string;
  mentality: Mentality;
  pressing: PressingIntensity;
  tempo: Tempo;
  defensiveLine: number;
}

export const TACTIC_PRESETS: TacticPreset[] = [
  { id: 'tiki', tr: 'Tiki-Taka', en: 'Tiki-Taka', descTr: 'Kısa paslarla topa sahip ol, yüksek hat.', descEn: 'Short passing, high line.', mentality: 'ATTACKING', pressing: 'HIGH', tempo: 'NORMAL', defensiveLine: 72 },
  { id: 'gegen', tr: 'Gegenpress', en: 'Gegenpress', descTr: 'Top kaybında anında baskı. Çok yorar.', descEn: 'Instant counter-press. Very tiring.', mentality: 'ATTACKING', pressing: 'GEGENPRESS', tempo: 'FAST', defensiveLine: 78 },
  { id: 'counter', tr: 'Kontra', en: 'Counter', descTr: 'Geride bekle, hızlı çık.', descEn: 'Sit deep, break fast.', mentality: 'BALANCED', pressing: 'LOW', tempo: 'FAST', defensiveLine: 38 },
  { id: 'park', tr: 'Katı Savunma', en: 'Park the Bus', descTr: 'Sonucu koru: alçak blok, sabırlı oyun.', descEn: 'Protect the result: low block.', mentality: 'DEFENSIVE', pressing: 'LOW', tempo: 'SLOW', defensiveLine: 28 },
  { id: 'control', tr: 'Kontrol', en: 'Control', descTr: 'Dengeli baskı, sakin tempo.', descEn: 'Balanced, calm tempo.', mentality: 'BALANCED', pressing: 'MEDIUM', tempo: 'SLOW', defensiveLine: 55 },
  { id: 'allout', tr: 'Son Hamle', en: 'All-Out', descTr: 'Gol lazım: her şeyi öne at.', descEn: 'Need a goal: everyone forward.', mentality: 'ALL_OUT', pressing: 'HIGH', tempo: 'FAST', defensiveLine: 85 },
];

export type TacticFields = Pick<TacticsConfig, 'mentality' | 'pressing' | 'tempo' | 'defensiveLine'>;

export function applyPreset(t: TacticsConfig, p: TacticPreset): TacticsConfig {
  return { ...t, mentality: p.mentality, pressing: p.pressing, tempo: p.tempo, defensiveLine: p.defensiveLine, tacticalStyle: 'CUSTOM' };
}

export function matchPreset(t: TacticFields): TacticPreset | null {
  return TACTIC_PRESETS.find((p) => p.mentality === t.mentality && p.pressing === t.pressing && p.tempo === t.tempo && p.defensiveLine === t.defensiveLine) ?? null;
}

export interface TacticImpact {
  /** Hücum / orta saha / savunma güç farkı (puan). */
  attack: number;
  midfield: number;
  defense: number;
  /** % olarak: yaratılan ve yenilen şans hacmi, ek yorgunluk. */
  chancesFor: number;
  chancesAgainst: number;
  fatigue: number;
}

/** Maç motoru modelinden türetilen tahmini etki (dengeli/orta/normal/55 çizgisine göre). */
export function previewImpact(t: TacticFields): TacticImpact {
  const m = MENTALITY[t.mentality], pr = PRESS[t.pressing], tp = TEMPO[t.tempo];
  const lineSpace = t.defensiveLine > 70 ? 0.04 : t.defensiveLine < 40 ? -0.03 : 0;
  const r = (v: number) => Math.round(v * 10) / 10;
  return {
    attack: r(m.atk),
    midfield: r(pr.mid),
    defense: r(m.def),
    chancesFor: r((tp.rate - 1) * 100 + pr.space * 50),
    chancesAgainst: r((tp.rate - 1) * 100 + lineSpace * 100),
    fatigue: r((pr.drain * tp.drain - 1) * 100),
  };
}
