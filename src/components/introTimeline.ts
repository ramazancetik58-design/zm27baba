/**
 * Açılış sekansı zaman çizelgesi (saf mantık, test edilir): stüdyo logosu → oyun logosu.
 * Her adım: yumuşak belirme, bekleme, yumuşak kaybolma; adımlar arasında kısa boşluk.
 */
export interface IntroStep {
  id: 'studio' | 'game';
  src: string;
  alt: string;
  /** Adımın arka plan rengi (görselin zemini ile aynı: kenarlar görünmesin). */
  bg: [number, number, number];
  fadeIn: number;
  hold: number;
  fadeOut: number;
}

export const INTRO_GAP_MS = 140;

export const introSteps = (reduced: boolean): IntroStep[] => [
  {
    id: 'studio', src: '/brand/zephyr-studio.jpg', alt: 'Zephyr Studio', bg: [35, 36, 40],
    fadeIn: reduced ? 250 : 750, hold: reduced ? 900 : 1500, fadeOut: reduced ? 250 : 650,
  },
  {
    id: 'game', src: '/brand/zephyr-manager.jpg', alt: 'Zephyr Manager', bg: [10, 28, 50],
    fadeIn: reduced ? 250 : 750, hold: reduced ? 1000 : 1800, fadeOut: reduced ? 250 : 750,
  },
];

export interface IntroFrame {
  index: number;
  opacity: number;
  scale: number;
  /** 0..1 toplam ilerleme. */
  progress: number;
  bg: string;
  done: boolean;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const stepLen = (s: IntroStep) => s.fadeIn + s.hold + s.fadeOut;

export const totalMs = (steps: IntroStep[], gap = INTRO_GAP_MS) =>
  steps.reduce((a, s) => a + stepLen(s), 0) + gap * (steps.length - 1);

/** t (ms) anındaki görünüm. reduced = ölçek animasyonu yok. */
export function frameAt(t: number, steps: IntroStep[], reduced = false, gap = INTRO_GAP_MS): IntroFrame {
  const total = totalMs(steps, gap);
  const progress = clamp01(t / total);
  // Arka plan: bekleme anlarındaki renkler arasında doğrusal geçiş
  const holds: Array<{ a: number; b: number; c: [number, number, number] }> = [];
  let cursor = 0;
  steps.forEach((s) => {
    holds.push({ a: cursor + s.fadeIn, b: cursor + s.fadeIn + s.hold, c: s.bg });
    cursor += stepLen(s) + gap;
  });
  let bg = holds[0].c;
  if (t >= holds[holds.length - 1].a) bg = holds[holds.length - 1].c;
  else if (t > holds[0].a) {
    for (let i = 0; i < holds.length - 1; i++) {
      if (t >= holds[i].b && t <= holds[i + 1].a) {
        const k = clamp01((t - holds[i].b) / Math.max(1, holds[i + 1].a - holds[i].b));
        bg = holds[i].c.map((v, j) => Math.round(v + (holds[i + 1].c[j] - v) * k)) as [number, number, number];
        break;
      }
      if (t >= holds[i].a && t <= holds[i].b) bg = holds[i].c;
    }
  }
  const bgCss = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
  if (t >= total) return { index: steps.length - 1, opacity: 0, scale: 1, progress: 1, bg: bgCss, done: true };

  let start = 0;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const local = t - start;
    if (local < 0) return { index: i, opacity: 0, scale: 1, progress, bg: bgCss, done: false };
    if (local <= stepLen(s)) {
      let opacity: number;
      let scale: number;
      if (local < s.fadeIn) {
        const k = easeOut(local / s.fadeIn);
        opacity = k;
        scale = reduced ? 1 : 0.95 + 0.05 * k;
      } else if (local < s.fadeIn + s.hold) {
        opacity = 1;
        scale = reduced ? 1 : 1 + 0.025 * ((local - s.fadeIn) / s.hold);
      } else {
        const k = easeIn((local - s.fadeIn - s.hold) / s.fadeOut);
        opacity = 1 - k;
        scale = reduced ? 1 : 1.025 + 0.025 * k;
      }
      return { index: i, opacity, scale, progress, bg: bgCss, done: false };
    }
    start += stepLen(s) + gap;
    if (t < start) return { index: i, opacity: 0, scale: 1, progress, bg: bgCss, done: false }; // adımlar arası boşluk
  }
  return { index: steps.length - 1, opacity: 0, scale: 1, progress: 1, bg: bgCss, done: true };
}
