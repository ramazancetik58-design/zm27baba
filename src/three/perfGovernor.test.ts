import assert from 'node:assert/strict';
import test from 'node:test';
import { PERF_TIERS, PerfGovernor, qualityToTier } from './perfGovernor';

const run = (g: PerfGovernor, ms: number, seconds: number, onChange?: (t: number, atS: number) => void) => {
  let t = 0;
  while (t < seconds * 1000) {
    t += ms;
    const c = g.push(ms);
    if (c !== null) onChange?.(c, t / 1000);
  }
};

test('akıcı 60 FPS: kalite düşmez; rahatken en iyi seviyeye kadar yükselmeyi dener', () => {
  const g = new PerfGovernor({ bestTier: 0 });
  g.tier = 3;
  const seen: number[] = [];
  run(g, 16.7, 120, (t) => seen.push(t));
  assert.ok(seen.every((t, i) => i === 0 || t < seen[i - 1]), 'yalnız yükselme');
  assert.equal(g.tier, 0, 'en iyi seviyeye ulaştı');
});

test('yavaş cihaz (28 ms): hızla en düşük seviyeye iner, daha aşağı gitmez', () => {
  const g = new PerfGovernor({ bestTier: 0 });
  let last = -1;
  run(g, 28, 30, (_t, s) => { last = s; });
  assert.equal(g.tier, PERF_TIERS.length - 1);
  assert.ok(last < 15, `iniş süresi ${last}`);
});

test('kullanıcının seçtiği kaliteyi aşmaz', () => {
  const g = new PerfGovernor({ bestTier: qualityToTier('MEDIUM') });
  run(g, 16.7, 300);
  assert.ok(g.tier >= qualityToTier('MEDIUM'));
});

test('başarısız yükseltme denemesi sonrası bir sonraki deneme gecikir (salınım yok)', () => {
  const g = new PerfGovernor({ bestTier: 0 });
  g.tier = 2;
  const changes: Array<[number, number]> = [];
  let clock = 0;
  // Cihaz modeli: seviye 0-1 yavaş (30 ms), seviye 2 ve üstü rahat (16,7 ms).
  const frame = () => { const ms = g.tier <= 1 ? 30 : 16.7; clock += ms; const c = g.push(ms); if (c !== null) changes.push([c, clock / 1000]); };
  while (clock < 17000) frame(); // rahat → ilk deneme: 2 → 1
  assert.equal(changes[0][0], 1, 'yükseltme denendi');
  while (clock < 24000) frame(); // 1 çok yavaş → geri 2
  assert.equal(g.tier, 2, 'geri indi');
  const downAt = changes.filter(([t]) => t === 2).pop()![1];
  while (clock < downAt * 1000 + 25000) frame(); // 25 sn rahat
  assert.equal(changes.filter(([t, s]) => t === 1 && s > downAt).length, 0, '25 sn içinde tekrar denemedi');
  while (clock < downAt * 1000 + 45000) frame(); // 30 sn sonra tekrar dener
  assert.ok(changes.filter(([t, s]) => t === 1 && s > downAt).length >= 1, 'geç de olsa tekrar denedi');
});

test('ani sıçramalar (sekme değişimi) yok sayılır', () => {
  const g = new PerfGovernor({ bestTier: 1 });
  for (let i = 0; i < 200; i++) assert.equal(g.push(i % 10 === 0 ? 900 : 16.7), null);
  assert.equal(g.tier, 1);
});

test('seviyeler monoton: daha yüksek seviye daha ucuz', () => {
  for (let i = 1; i < PERF_TIERS.length; i++) {
    const a = PERF_TIERS[i - 1], b = PERF_TIERS[i];
    assert.ok(b.pixelScale <= a.pixelScale && b.spots <= a.spots && b.crowdStride >= a.crowdStride && b.shadowEvery >= a.shadowEvery);
  }
});
