import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const SRC = join(process.cwd(), 'src');
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
}
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('proje kuralı: oyun kodunda Math.random yok (tohumlu RNG kullanılır)', () => {
  const offenders = walk(SRC).filter((p) => /Math\.random\s*\(/.test(stripComments(readFileSync(p, 'utf8'))));
  assert.deepEqual(offenders.map((p) => p.replace(SRC, 'src')), []);
});

test('regresyon: audio.ts içinde yerel `noise` düğümü ile RNG yardımcısı çakışmaz', () => {
  const code = stripComments(readFileSync(join(SRC, 'engine/audio.ts'), 'utf8'));
  assert.ok(!/\bnoise\s*\(\s*\)/.test(code), 'noise() çağrısı: yerel AudioBufferSourceNode ile gölgelenir');
  assert.ok(/audioRand\s*\(\s*\)/.test(code), 'tohumlu ses gürültüsü kullanılmalı');
});

test('regresyon: oyuncu istatistik yardımcıları ilk kullanımdan önce tanımlanır (TDZ)', () => {
  const code = readFileSync(join(SRC, 'three/Match3DEngineCanvas.tsx'), 'utf8');
  const def = code.indexOf('const openStat =');
  const firstUse = code.indexOf('openStat(');
  assert.ok(def > 0 && def <= firstUse, 'openStat önce tanımlanmalı');
});

test('regresyon: tekrar altyapısı tick döngüsünden önce kurulur ve kamera tekrar topunu kullanır', () => {
  const code = readFileSync(join(SRC, 'three/Match3DEngineCanvas.tsx'), 'utf8');
  const bufDef = code.indexOf('const replayBuf =');
  const tickDef = code.indexOf('const tick = () => {');
  assert.ok(bufDef > 0 && bufDef < tickDef, 'replayBuf tick\'ten önce tanımlanmalı');
  assert.ok(/replay \? \{ x: replayFrame\[1\], z: replayFrame\[3\] \} : ball/.test(code), 'kamera tekrar sırasında tekrar topunu izlemeli');
  assert.ok(/if \(replay\) \{\s*if \(!isPaused\) advanceReplay\(dt\);/.test(code), 'tekrar sırasında simülasyon durmalı');
});
