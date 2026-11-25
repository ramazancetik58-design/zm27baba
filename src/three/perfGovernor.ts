/**
 * Kare hızı yöneticisi: kare süresini izler, 60 FPS'in altına düşünce kaliteyi kademeli düşürür,
 * rahatken kullanıcının seçtiği en iyi seviyeye kadar tekrar yükseltmeyi dener.
 * Saf mantık (THREE'ye bağımlı değil), Node'da test edilir.
 */
export interface PerfTier {
  /** Çözünürlük çarpanı (devicePixelRatio ile çarpılır). */
  pixelScale: number;
  shadows: boolean;
  /** Gölge haritası her N karede bir güncellenir (1 = her kare). */
  shadowEvery: number;
  /** Açık tutulacak stadyum spot ışığı sayısı. */
  spots: number;
  /** Kalabalık animasyonu her N karede bir güncellenir. */
  crowdStride: number;
}

export const PERF_TIERS: PerfTier[] = [
  { pixelScale: 1.0, shadows: true, shadowEvery: 1, spots: 4, crowdStride: 1 },
  { pixelScale: 1.0, shadows: true, shadowEvery: 1, spots: 2, crowdStride: 2 },
  { pixelScale: 0.85, shadows: true, shadowEvery: 2, spots: 2, crowdStride: 3 },
  { pixelScale: 0.75, shadows: true, shadowEvery: 3, spots: 0, crowdStride: 4 },
  { pixelScale: 0.65, shadows: false, shadowEvery: 3, spots: 0, crowdStride: 6 },
];

export const qualityToTier = (q: 'LOW' | 'MEDIUM' | 'HIGH'): number => (q === 'HIGH' ? 0 : q === 'MEDIUM' ? 1 : 4);

export interface PerfGovernorOptions {
  /** Kullanıcının seçtiği en iyi seviye; yönetici bunun üstüne çıkmaz. */
  bestTier: number;
  /** Bu eşiğin (ms) üstünde ortalama kare süresi düşürmeyi tetikler (varsayılan ≈ 51 FPS). */
  slowMs?: number;
  worstTier?: number;
}

export class PerfGovernor {
  tier: number;
  private readonly best: number;
  private readonly worst: number;
  private readonly slowMs: number;
  private ema = 16.7;
  private slowFrames = 0;
  private sinceChangeMs = 0;
  private stableMs = 0;
  private probeEveryMs = 15_000;
  private lastWasUpgrade = false;

  constructor(o: PerfGovernorOptions) {
    this.best = o.bestTier;
    this.worst = o.worstTier ?? PERF_TIERS.length - 1;
    this.tier = o.bestTier;
    this.slowMs = o.slowMs ?? 19.5;
  }

  /** Kare süresini (ms) bildir. Seviye değiştiyse yeni seviyeyi döndürür, yoksa null. */
  push(frameMs: number): number | null {
    if (frameMs > 250) return null; // sekme arka planda/duraklama: yok say
    this.ema = this.ema * 0.9 + frameMs * 0.1;
    this.sinceChangeMs += frameMs;
    this.slowFrames = this.ema > this.slowMs ? this.slowFrames + 1 : 0;

    if (this.slowFrames >= 40 && this.sinceChangeMs > 1500 && this.tier < this.worst) {
      // Yükseltmeden hemen sonra yavaşladıysa deneme başarısız: sonraki deneme daha geç.
      if (this.lastWasUpgrade && this.sinceChangeMs < 6000) this.probeEveryMs = Math.min(120_000, this.probeEveryMs * 2);
      return this.change(this.tier + 1, false);
    }
    if (this.ema <= this.slowMs) this.stableMs += frameMs;
    else this.stableMs = 0;
    if (this.tier > this.best && this.stableMs >= this.probeEveryMs && this.sinceChangeMs > this.probeEveryMs) {
      return this.change(this.tier - 1, true);
    }
    return null;
  }

  private change(t: number, up: boolean): number {
    this.tier = t;
    this.lastWasUpgrade = up;
    this.sinceChangeMs = 0;
    this.stableMs = 0;
    this.slowFrames = 0;
    this.ema = up ? 16.7 : this.ema;
    return t;
  }
}
