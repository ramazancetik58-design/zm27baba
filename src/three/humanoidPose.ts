/**
 * İnsan figürü poz çözücü (saf matematik, THREE'ye bağımlı değil; Node'da test edilir).
 *
 * Açı kuralları (anatomik, hepsi radyan):
 *  hip/sh  : + = bacak/kol ÖNE      → rig rotation.x = -değer
 *  knee    : + = diz bükülmesi      → rig rotation.x = +değer
 *  elb     : + = dirsek bükülmesi   → rig rotation.x = -değer
 *  abd     : + = kol DIŞA açılır    → sol kol rotation.z = -abd, sağ kol = +abd  (sol = -x tarafı)
 *  lean    : + = gövde öne eğilir;  twist: + = rotation.y;  roll: + = rotation.z
 *  headPitch: + = aşağı bakar
 * Karakter +z yönüne bakar. Ölçüler /models/player.glb ile aynıdır.
 */
export interface Pose {
  rootPitch: number; rootRoll: number; air: number;
  lean: number; twist: number; roll: number;
  headPitch: number; headYaw: number;
  hipL: number; hipR: number; kneeL: number; kneeR: number;
  shL: number; shR: number; abdL: number; abdR: number; elbL: number; elbR: number;
}
/** Zemin teması: 0 = yalnız ayaklar (ayakta), 1 = ayaklar+dizler (diz çökme), 2 = tüm vücut (dalış), 3 = leğen zeminde (kayarak müdahale). */
export type GroundMode = 0 | 1 | 2 | 3;
export interface Target { pose: Pose; ground: GroundMode; rate: number }

export const REST: Pose = {
  rootPitch: 0, rootRoll: 0, air: 0, lean: 0.03, twist: 0, roll: 0, headPitch: 0, headYaw: 0,
  hipL: 0, hipR: 0, kneeL: 0.05, kneeR: 0.05, shL: 0, shR: 0, abdL: 0.12, abdR: 0.12, elbL: 0.2, elbR: 0.2,
};
export const clonePose = (p: Pose): Pose => ({ ...p });
const POSE_KEYS = Object.keys(REST) as (keyof Pose)[];

/** Poz ↔ düz dizi (tekrar kaydı için). Sıra REST anahtar sırasıdır. */
export const POSE_LEN = POSE_KEYS.length;
export function poseToArray(p: Pose, out: Float32Array, offset: number): void {
  for (let i = 0; i < POSE_LEN; i++) out[offset + i] = p[POSE_KEYS[i]];
}
export function arrayToPose(arr: Float32Array, offset: number, out: Pose): void {
  for (let i = 0; i < POSE_LEN; i++) out[POSE_KEYS[i]] = arr[offset + i];
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };

/** Anahtar kare örnekleme: keys = [[u, değer], ...] (u artan), aralarda smoothstep. */
export function sampleKeys(u: number, keys: [number, number][]): number {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) {
      const [u0, v0] = keys[i - 1];
      const [u1, v1] = keys[i];
      return lerp(v0, v1, smooth((u - u0) / Math.max(1e-6, u1 - u0)));
    }
  }
  return keys[keys.length - 1][1];
}

/** Açıyı en kısa yoldan hedefe doğru sönümle (yüz dönüşü için). */
export function dampAngle(cur: number, target: number, rate: number, dt: number): number {
  let d = (target - cur) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return cur + d * (1 - Math.exp(-rate * dt));
}
export const angleDiff = (a: number, b: number) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/** Pozu hedefe üstel sönümle: durum geçişlerinde ani sıçrama olmaz. */
export function approachPose(cur: Pose, tgt: Pose, rate: number, dt: number): void {
  const k = 1 - Math.exp(-rate * dt);
  for (const key of POSE_KEYS) cur[key] += (tgt[key] - cur[key]) * k;
}

// ───────────── Hareket kalıpları ─────────────

type Fourier = { a0: number; a: number[]; b: number[] };
const fourier = (f: Fourier, c: number): number => {
  let v = f.a0;
  for (let k = 1; k <= f.a.length; k++) v += f.a[k - 1] * Math.cos(2 * Math.PI * k * c) + f.b[k - 1] * Math.sin(2 * Math.PI * k * c);
  return v;
};
// Koşu döngüsü: c=0 ayağın yere basışı, ~0.38 itiş bitişi, ~0.72 diz yukarı savrulma (anahtar noktalara Fourier uydurması).
const HIP_RUN: Fourier = { a0: 0.39121, a: [0.1658, -0.06423, -0.01956, 0.01854, 0.00114, 0.00295], b: [-0.6, 0.1816, -0.01965, 0.01062, 0.00877, 0.00006] };
const KNEE_RUN: Fourier = { a0: 0.71687, a: [-0.4623, 0.02544, -0.05913, -0.03872, -0.01371, -0.00966], b: [-0.52258, 0.25975, 0.02953, 0.01419, 0.00622, -0.00155] };
const hipWalk = (c: number) => 0.03 + 0.31 * Math.cos(2 * Math.PI * c);
const kneeWalk = (c: number) => 0.06 + 0.5 * Math.pow(Math.max(0, -Math.sin(2 * Math.PI * c)), 1.2);

/** Oyuncuya özgü koşu tarzı: herkes aynı anda aynı hareketi yapmasın (kalabalık gerçekçiliği). */
export interface GaitStyle {
  /** Bacak salınım ölçeği (~0.92–1.08). */
  stride: number;
  /** Ek gövde eğimi (rad). */
  lean: number;
  /** Kol sallama ölçeği (~0.85–1.15). */
  arm: number;
}
export const NEUTRAL_STYLE: GaitStyle = { stride: 1, lean: 0, arm: 1 };

/** Koşu/yürüyüş döngüsü. phase: 2π = tam adım çifti. speed: m/s. */
export function gaitTarget(phase: number, speed: number, style: GaitStyle = NEUTRAL_STYLE): Target {
  const s = clamp(speed / 8, 0, 1.15);
  const r = smooth((speed - 2.5) / 4); // yürüyüş → koşu geçişi
  const c = phase / (Math.PI * 2);
  const hipOf = (cc: number) => lerp(hipWalk(cc), fourier(HIP_RUN, cc), r);
  const kneeOf = (cc: number) => lerp(kneeWalk(cc), fourier(KNEE_RUN, cc), r);
  const aAmp = lerp(0.30, 0.85, s);
  const aCenter = lerp(0.02, 0.18, s);
  // sağ kol, sol bacak öndeyken (c≈0.22) en önde; sol kol yarım döngü sonra
  const armF = (cc: number) => Math.cos(2 * Math.PI * (cc - 0.22));
  const elbBase = lerp(0.35, 1.45, s);
  const pose: Pose = {
    rootPitch: 0, rootRoll: 0, air: 0,
    lean: lerp(0.03, 0.20, s) + 0.015 * Math.sin(4 * Math.PI * c),
    twist: -lerp(0.05, 0.20, s) * armF(c),
    roll: 0.04 * s * Math.cos(2 * Math.PI * c),
    headPitch: -lerp(0.0, 0.14, s), headYaw: 0,
    hipR: hipOf(c), hipL: hipOf(c + 0.5),
    kneeR: kneeOf(c), kneeL: kneeOf(c + 0.5),
    shR: aCenter + aAmp * armF(c), shL: aCenter + aAmp * armF(c + 0.5),
    abdR: lerp(0.12, 0.26, s), abdL: lerp(0.12, 0.26, s),
    elbR: elbBase + 0.25 * s * armF(c), elbL: elbBase + 0.25 * s * armF(c + 0.5),
  };
  if (style !== NEUTRAL_STYLE) {
    const hc = 0.3;
    pose.hipR = hc + (pose.hipR - hc) * style.stride; pose.hipL = hc + (pose.hipL - hc) * style.stride;
    pose.lean += style.lean;
    pose.shR = aCenter + (pose.shR - aCenter) * style.arm; pose.shL = aCenter + (pose.shL - aCenter) * style.arm;
  }
  return { pose, ground: 0, rate: 16 };
}

/** Oyuncu kimliğinden (tohum) kararlı bir koşu tarzı üretir. */
export function styleFromSeed(u1: number, u2: number, u3: number): GaitStyle {
  return { stride: 0.92 + u1 * 0.16, lean: -0.02 + u2 * 0.06, arm: 0.85 + u3 * 0.3 };
}

/** Sakat/topallayan yürüyüş. */
export function limpTarget(phase: number): Target {
  const g = gaitTarget(phase, 2.2).pose;
  g.hipR *= 0.45; g.kneeR = 0.14 + 0.1 * Math.max(0, Math.cos(phase));
  g.lean = 0.2; g.roll = 0.14 * Math.sin(phase); g.headPitch = 0.28;
  g.shR = 0.3; g.elbR = 1.0; g.abdR = 0.35; // elini sakat bacağına götürür
  return { pose: g, ground: 0, rate: 10 };
}

/** Boşta bekleme: nefes, ağırlık aktarma, topa bakma. gk = hazır kaleci duruşu. */
export function idleTarget(t: number, lookYaw: number, gk: boolean): Target {
  const breath = Math.sin(t * 1.9);
  const sway = Math.sin(t * 0.65);
  const p = clonePose(REST);
  p.lean = (gk ? 0.2 : 0.04) + 0.012 * breath;
  p.roll = 0.02 * sway;
  p.headYaw = clamp(lookYaw, -1.0, 1.0);
  p.headPitch = gk ? 0.05 : 0.0;
  p.hipL = (gk ? 0.22 : 0.04) + 0.015 * sway; p.hipR = (gk ? 0.22 : 0.04) - 0.015 * sway;
  p.kneeL = p.kneeR = gk ? 0.5 : 0.07;
  p.shL = p.shR = gk ? 0.15 : 0.03 + 0.02 * breath;
  p.abdL = p.abdR = gk ? 0.55 : 0.13 + 0.01 * breath;
  p.elbL = p.elbR = gk ? 0.85 : 0.22 + 0.03 * breath;
  return { pose: p, ground: 0, rate: 9 };
}

export const KICK_DUR = 0.35;
/** Şut/pas vuruşu (sağ ayak). u: 0..1. */
export function kickTarget(u: number): Target {
  const p = clonePose(REST);
  p.hipR = sampleKeys(u, [[0, 0.1], [0.28, -0.6], [0.5, 1.15], [0.7, 0.95], [1, 0.4]]);
  p.kneeR = sampleKeys(u, [[0, 0.3], [0.28, 1.5], [0.5, 0.25], [0.7, 0.45], [1, 0.3]]);
  p.hipL = sampleKeys(u, [[0, 0.1], [0.28, 0.12], [0.6, 0.05], [1, 0.05]]); // basan bacak
  p.kneeL = sampleKeys(u, [[0, 0.25], [0.28, 0.3], [0.6, 0.22], [1, 0.15]]);
  p.lean = sampleKeys(u, [[0, 0.08], [0.28, -0.04], [0.5, 0.12], [1, 0.1]]);
  p.twist = sampleKeys(u, [[0, 0], [0.28, -0.22], [0.55, 0.28], [1, 0.1]]);
  p.shL = sampleKeys(u, [[0, 0.3], [0.28, 0.6], [0.55, -0.3], [1, 0.1]]);
  p.shR = sampleKeys(u, [[0, -0.2], [0.28, -0.5], [0.55, 0.4], [1, 0.1]]);
  p.abdL = p.abdR = sampleKeys(u, [[0, 0.3], [0.5, 0.65], [1, 0.3]]);
  p.elbL = p.elbR = 0.6;
  p.headPitch = 0.28;
  return { pose: p, ground: 0, rate: 24 };
}

/** Kafa vuruşu: sıçrama + geriye gerilip öne vuruş. u: 0..1 (timer/0.42 tersi). */
export function headerTarget(u: number): Target {
  const p = clonePose(REST);
  const lift = Math.sin(clamp(u, 0, 1) * Math.PI);
  p.air = 0.55 * lift;
  p.lean = sampleKeys(u, [[0, 0.1], [0.4, -0.38], [0.6, 0.5], [1, 0.1]]);
  p.headPitch = sampleKeys(u, [[0, 0], [0.4, -0.25], [0.6, 0.4], [1, 0]]);
  p.hipL = p.hipR = 0.5 * lift; p.kneeL = p.kneeR = 0.9 * lift + 0.1;
  p.abdL = p.abdR = 0.9 * lift + 0.12; p.shL = p.shR = -0.2 * lift;
  p.elbL = p.elbR = 0.5;
  return { pose: p, ground: 0, rate: 22 };
}

/** Kayarak müdahale. u: 0..1. */
export function tackleTarget(u: number): Target {
  const p = clonePose(REST);
  const e = sampleKeys(u, [[0, 0], [0.25, 1], [0.7, 1], [1, 0]]);
  p.rootPitch = -0.9 * e; // geriye yatış: öndeki bacak uzanır, arkadaki bacak altında kıvrılır
  p.hipR = 0.55 * e; p.kneeR = 0.1 * e;
  p.hipL = 1.4 * e; p.kneeL = 2.0 * e;
  p.lean = 0.1 * e; p.headPitch = -0.25 * e;
  p.abdL = p.abdR = 0.12 + 0.9 * e; p.shL = p.shR = -0.2 * e;
  p.elbL = p.elbR = 0.4;
  return { pose: p, ground: 3, rate: 18 };
}

/** Kaleci dalışı. dir: -1/+1 yan. u: 0..1. */
export function diveTarget(u: number, dir: number): Target {
  const p = clonePose(REST);
  const e = sampleKeys(u, [[0, 0], [0.28, 1], [0.62, 1], [1, 0]]);
  p.rootRoll = dir * 1.3 * e;
  p.air = 0.22 * sampleKeys(u, [[0, 0], [0.3, 1], [0.55, 0.2], [1, 0]]);
  p.lean = 0.1;
  p.abdL = p.abdR = 0.12 + 2.5 * e; p.shL = p.shR = -0.15 * e;
  p.elbL = p.elbR = 0.12;
  p.hipL = 0.35 * e; p.hipR = -0.1 * e; p.kneeL = 0.4 * e + 0.05; p.kneeR = 0.15 * e + 0.05;
  p.headPitch = -0.2 * e;
  return { pose: p, ground: 2, rate: 20 };
}

/** Gol sevinci: diz kayması veya kollar havada zıplama. */
export function celebrateTarget(kind: 'KNEE_SLIDE' | 'ARM_JUMP', timer: number, total = 2.2): Target {
  const p = clonePose(REST);
  if (kind === 'KNEE_SLIDE') {
    p.rootPitch = 0; p.lean = -0.42; p.headPitch = -0.3;
    p.hipL = p.hipR = 0.05; p.kneeL = p.kneeR = 1.85;
    p.abdL = p.abdR = 1.6; p.shL = p.shR = 0; p.elbL = p.elbR = 0.15;
    return { pose: p, ground: 1, rate: 12 };
  }
  const t = total - timer;
  const hop = Math.abs(Math.sin(t * 7.5));
  p.air = 0.42 * hop;
  p.abdL = p.abdR = 2.45; p.shL = p.shR = 0.1; p.elbL = p.elbR = 0.2;
  p.hipL = p.hipR = 0.3 * hop; p.kneeL = p.kneeR = 0.6 * hop + 0.1;
  p.lean = -0.1; p.headPitch = -0.35; p.twist = 0.08 * Math.sin(t * 7.5);
  return { pose: p, ground: 0, rate: 16 };
}

// ───────────── İleri kinematik (zemin teması + testler) ─────────────
type V3 = [number, number, number];
const rotX = (v: V3, a: number): V3 => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
const rotY = (v: V3, a: number): V3 => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
const rotZ = (v: V3, a: number): V3 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
/** THREE 'XYZ' Euler: R = Rx·Ry·Rz */
const euler = (v: V3, x: number, y: number, z: number): V3 => rotX(rotY(rotZ(v, z), y), x);
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const RIG = { hipY: 0.89, hipX: 0.112, thigh: 0.41, shoulderX: 0.265, shoulderY: 1.43, spineY: 0.95, forearm: 0.28, headY: 1.68 };
export const PELVIS_REST = 0.2;
export const FOOT_PTS: V3[] = [[0, -0.4475, -0.01], [0, -0.48, 0.075], [0, -0.45, 0.17]];

const root = (v: V3, p: Pose): V3 => euler(v, p.rootPitch, 0, p.rootRoll);
export function legPoint(p: Pose, side: 'L' | 'R', local: V3): V3 {
  const hip = side === 'L' ? p.hipL : p.hipR;
  const knee = side === 'L' ? p.kneeL : p.kneeR;
  let v = rotX(local, knee);
  v = add(v, [0, -RIG.thigh, 0]);
  v = rotX(v, -hip);
  v = add(v, [side === 'L' ? -RIG.hipX : RIG.hipX, RIG.hipY, 0]);
  return root(v, p);
}
export function armPoint(p: Pose, side: 'L' | 'R', local: V3): V3 {
  const elb = side === 'L' ? p.elbL : p.elbR;
  const sh = side === 'L' ? p.shL : p.shR;
  const abd = side === 'L' ? p.abdL : p.abdR;
  let v = rotX(local, -elb);
  v = add(v, [0, -RIG.forearm, 0]);
  v = euler(v, -sh, 0, side === 'L' ? -abd : abd);
  v = add(v, [side === 'L' ? -RIG.shoulderX : RIG.shoulderX, RIG.shoulderY - RIG.spineY, 0]);
  v = euler(v, p.lean, p.twist, p.roll);
  v = add(v, [0, RIG.spineY, 0]);
  return root(v, p);
}
export function headPoint(p: Pose): V3 {
  let v: V3 = [0, RIG.headY - RIG.spineY, 0];
  v = euler(v, p.lean, p.twist, p.roll);
  return root(add(v, [0, RIG.spineY, 0]), p);
}
export function pelvisPoint(p: Pose): V3 { return root([0, 0.91, 0], p); }
const shoulderPoint = (p: Pose, side: 'L' | 'R'): V3 => {
  let v: V3 = [side === 'L' ? -RIG.shoulderX : RIG.shoulderX, RIG.shoulderY - RIG.spineY, 0];
  v = euler(v, p.lean, p.twist, p.roll);
  return root(add(v, [0, RIG.spineY, 0]), p);
};

/** Pozun zemine oturması için gereken dikey kaydırma (m). */
export function groundOffset(p: Pose, mode: GroundMode): number {
  let minFeet = Infinity;
  for (const side of ['L', 'R'] as const) for (const f of FOOT_PTS) minFeet = Math.min(minFeet, legPoint(p, side, f)[1]);
  if (mode === 0) return -minFeet;
  if (mode === 3) return Math.max(PELVIS_REST - pelvisPoint(p)[1], -minFeet); // leğen zeminde ama ayaklar yere girmez
  let min = minFeet;
  for (const side of ['L', 'R'] as const) min = Math.min(min, legPoint(p, side, [0, 0, 0])[1] - 0.06);
  if (mode === 1) return -min;
  min = Math.min(min, pelvisPoint(p)[1] - 0.17, headPoint(p)[1] - 0.12);
  for (const side of ['L', 'R'] as const) {
    min = Math.min(min, shoulderPoint(p, side)[1] - 0.08, armPoint(p, side, [0, -0.28, 0])[1] - 0.05);
  }
  return -min;
}
