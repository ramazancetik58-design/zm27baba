/**
 * Deterministik RNG (mulberry32 + FNV-1a). Oyun mantığında Math.random yerine kullanılır:
 * aynı tohum her zaman aynı diziyi verir, böylece maçlar yeniden üretilebilir ve test edilebilir.
 */
export type Rng = () => number;

export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function createRng(seed: number | string): Rng {
  let a = (typeof seed === 'string' ? hashSeed(seed) : seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
