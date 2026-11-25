/**
 * Kamera sistemi (saf mantık): kamera kurguları, kullanıcı ayarları ve otomatik yönetmen.
 * Saha: genişlik X, uzunluk Z. Hepsi metre; test edilir.
 */
export type CameraMode = 'broadcast' | 'tactical' | 'behind_goal' | 'dynamic' | 'follow' | 'sideline' | 'orbit';
export type CameraChoice = CameraMode | 'auto';
export type V3 = [number, number, number];

export interface CameraSettings {
  /** Görüş açısı (derece). */
  fov: number;
  /** 0 = çevik/sert takip, 1 = sinematik/yumuşak. */
  smoothing: number;
  /** Uzaklık çarpanı (0.7 yakın … 1.4 uzak). */
  distance: number;
  /** Gol/şut sarsıntısı. */
  shake: boolean;
  /** Gol sonrası yavaş çekim tekrar. */
  replay: boolean;
}
export const DEFAULT_CAMERA_SETTINGS: CameraSettings = { fov: 36, smoothing: 0.6, distance: 1, shake: true, replay: true };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function sanitizeCameraSettings(raw: unknown): CameraSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<CameraSettings>;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  return {
    fov: clamp(num(r.fov, DEFAULT_CAMERA_SETTINGS.fov), 26, 56),
    smoothing: clamp(num(r.smoothing, DEFAULT_CAMERA_SETTINGS.smoothing), 0, 1),
    distance: clamp(num(r.distance, DEFAULT_CAMERA_SETTINGS.distance), 0.7, 1.4),
    shake: typeof r.shake === 'boolean' ? r.shake : DEFAULT_CAMERA_SETTINGS.shake,
    replay: typeof r.replay === 'boolean' ? r.replay : DEFAULT_CAMERA_SETTINGS.replay,
  };
}

/** Kamera konumu ve bakış noktası için sönümleme hızları (1/sn). Yumuşak ayar = düşük hız. */
export const posRate = (smoothing: number) => lerp(9, 2.2, clamp(smoothing, 0, 1));
export const lookRate = (smoothing: number) => lerp(16, 2.6, clamp(smoothing, 0, 1));

export interface CameraContext {
  ball: { x: number; z: number };
  carrier?: { x: number; z: number; vx: number; vz: number } | null;
  /** Saniye cinsinden süre (orbit için). */
  t: number;
  halfW: number;
  halfL: number;
}
export interface CameraRig {
  pos: V3;
  look: V3;
}

export function cameraRig(mode: CameraMode, c: CameraContext): CameraRig {
  const { ball } = c;
  switch (mode) {
    case 'tactical':
      return { pos: [42, 26.5, ball.z * 0.22], look: [0, 0, ball.z * 0.3] };
    case 'behind_goal':
      return { pos: [ball.x * 0.32, 8.2, -c.halfL - 9.5], look: [ball.x * 0.55, 2.0, ball.z * 0.65] };
    case 'dynamic':
      return { pos: [ball.x * 0.45 + 14.5, 5.2, ball.z - 13.5], look: [ball.x * 0.9, 1.4, ball.z + 2.2] };
    case 'follow': {
      const p = c.carrier ?? { x: ball.x, z: ball.z, vx: 0, vz: 0 };
      const sp = Math.hypot(p.vx, p.vz);
      const d: [number, number] = sp > 0.8 ? [p.vx / sp, p.vz / sp] : [0, ball.z > 0 ? -1 : 1];
      const px = clamp(p.x - d[0] * 10, -c.halfW - 12, c.halfW + 12);
      const pz = clamp(p.z - d[1] * 10, -c.halfL - 10, c.halfL + 10);
      return { pos: [px, 4.8, pz], look: [p.x + d[0] * 7, 1.3, p.z + d[1] * 7] };
    }
    case 'sideline':
      return { pos: [c.halfW + 6.5, 3.4, ball.z * 0.96], look: [ball.x * 0.6, 1.3, ball.z * 0.98] };
    case 'orbit': {
      const a = c.t * 0.12;
      return { pos: [Math.cos(a) * 46, 27, ball.z * 0.5 + Math.sin(a) * 46], look: [0, 0, ball.z * 0.5] };
    }
    default:
      return { pos: [52, 21.0, ball.z * 0.44], look: [-2, 3.6, ball.z * 0.68] };
  }
}

/** Kamerayı bakış noktasına doğru yaklaştırır/uzaklaştırır. */
export function applyDistance(rig: CameraRig, distance: number): CameraRig {
  const k = clamp(distance, 0.7, 1.4);
  return {
    look: rig.look,
    pos: [rig.look[0] + (rig.pos[0] - rig.look[0]) * k, Math.max(1.4, rig.look[1] + (rig.pos[1] - rig.look[1]) * k), rig.look[2] + (rig.pos[2] - rig.look[2]) * k],
  };
}

/** Otomatik yönetmen: şutta kale arkası/dinamik, golde takip, aksi halde yayın. En az 2,5 sn tutar. */
export class AutoDirector {
  private current: CameraMode = 'broadcast';
  private since = -99;
  pick(state: { pendingShot: boolean; celebrating: boolean }, t: number): CameraMode {
    const want: CameraMode = state.celebrating ? 'follow' : state.pendingShot ? 'dynamic' : 'broadcast';
    if (want !== this.current && t - this.since >= 2.5) {
      this.current = want;
      this.since = t;
    }
    return this.current;
  }
}
