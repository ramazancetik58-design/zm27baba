/**
 * Gol tekrarı için kayıt/oynatma (saf mantık, test edilir).
 * Her kare: [dt, topX, topY, topZ, ...her oyuncu için (x, z, rotY, groundY, ...poz)].
 * Halka tamponu son N kareyi tutar; gol anında son birkaç saniye kopyalanıp yavaş çekimde oynatılır.
 */
import { POSE_LEN } from './humanoidPose';

export const ACTOR_FLOATS = 4 + POSE_LEN;
export const HEADER_FLOATS = 4; // dt, bx, by, bz
export const ROT_Y_OFFSET = 2; // oyuncu bloğu içinde rotY indeksi

export interface ReplayClip {
  actorCount: number;
  stride: number;
  frames: number;
  /** Kronolojik sıra: frame 0 en eski. */
  data: Float32Array;
  /** Toplam süre (sn, gerçek zaman). */
  duration: number;
}

export const strideFor = (actorCount: number) => HEADER_FLOATS + actorCount * ACTOR_FLOATS;

export class ReplayBuffer {
  readonly stride: number;
  private readonly data: Float32Array;
  private head = 0;
  private count = 0;

  constructor(readonly actorCount: number, readonly capacity: number) {
    this.stride = strideFor(actorCount);
    this.data = new Float32Array(capacity * this.stride);
  }

  get size() {
    return this.count;
  }

  /** Yeni karenin yazılacağı dilimi verir; çağıran doldurur. */
  begin(): Float32Array {
    return this.data.subarray(this.head * this.stride, (this.head + 1) * this.stride);
  }
  commit(): void {
    this.head = (this.head + 1) % this.capacity;
    this.count = Math.min(this.capacity, this.count + 1);
  }

  /** Son `seconds` saniyenin kopyası (kronolojik). Kayıt yoksa null. */
  snapshotLast(seconds: number): ReplayClip | null {
    if (this.count === 0) return null;
    let frames = 0;
    let dur = 0;
    for (let k = 0; k < this.count; k++) {
      const idx = (this.head - 1 - k + this.capacity) % this.capacity;
      dur += this.data[idx * this.stride];
      frames++;
      if (dur >= seconds) break;
    }
    const out = new Float32Array(frames * this.stride);
    for (let f = 0; f < frames; f++) {
      const idx = (this.head - frames + f + this.capacity * 2) % this.capacity;
      out.set(this.data.subarray(idx * this.stride, (idx + 1) * this.stride), f * this.stride);
    }
    let duration = 0;
    for (let f = 0; f < frames; f++) duration += out[f * this.stride];
    return { actorCount: this.actorCount, stride: this.stride, frames, data: out, duration };
  }
}

const wrapAngleLerp = (a: number, b: number, t: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

/**
 * Klibin t. saniyesini `out`'a örnekler (komşu kareler arası doğrusal; açılar en kısa yoldan).
 * t klibin sonunu geçtiyse true döner.
 */
export function sampleClip(clip: ReplayClip, t: number, out: Float32Array): boolean {
  const { stride, frames, data } = clip;
  if (frames === 0) return true;
  let acc = 0;
  let i = 0;
  for (; i < frames - 1; i++) {
    const dt = data[(i + 1) * stride]; // kare i → i+1 süresi = i+1. karenin dt'si
    if (t < acc + dt) break;
    acc += dt;
  }
  const a = i;
  const b = Math.min(frames - 1, i + 1);
  const span = a === b ? 1 : Math.max(1e-6, data[b * stride]);
  const k = a === b ? 0 : Math.max(0, Math.min(1, (t - acc) / span));
  for (let j = 0; j < stride; j++) {
    const va = data[a * stride + j];
    const vb = data[b * stride + j];
    out[j] = va + (vb - va) * k;
  }
  for (let n = 0; n < clip.actorCount; n++) {
    const idx = HEADER_FLOATS + n * ACTOR_FLOATS + ROT_Y_OFFSET;
    out[idx] = wrapAngleLerp(data[a * stride + idx], data[b * stride + idx], k);
  }
  return t >= clip.duration - data[0] || (a === frames - 1 && t >= acc);
}
