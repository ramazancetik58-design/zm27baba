import assert from 'node:assert/strict';
import test from 'node:test';
import { INTRO_GAP_MS, frameAt, introSteps, totalMs } from './introTimeline';

const steps = introSteps(false);

test('toplam süre adımların toplamı + boşluk; sonunda done', () => {
  const total = totalMs(steps);
  assert.equal(total, steps.reduce((a, s) => a + s.fadeIn + s.hold + s.fadeOut, 0) + INTRO_GAP_MS);
  assert.ok(total > 4000 && total < 7500, `süre ${total}`);
  assert.equal(frameAt(total + 1, steps).done, true);
  assert.equal(frameAt(total - 50, steps).done, false);
});

test('başlangıçta görünmez, bekleme anında tam opak, sonunda tekrar görünmez', () => {
  assert.equal(frameAt(0, steps).opacity, 0);
  assert.equal(frameAt(steps[0].fadeIn + 10, steps).opacity, 1);
  const s0End = steps[0].fadeIn + steps[0].hold + steps[0].fadeOut;
  assert.ok(frameAt(s0End, steps).opacity < 0.001);
  assert.equal(frameAt(s0End + INTRO_GAP_MS / 2, steps).opacity, 0, 'boşlukta boş');
});

test('önce stüdyo sonra oyun logosu', () => {
  assert.equal(frameAt(1000, steps).index, 0);
  const s1Start = steps[0].fadeIn + steps[0].hold + steps[0].fadeOut + INTRO_GAP_MS;
  assert.equal(frameAt(s1Start + 1000, steps).index, 1);
  assert.equal(steps[0].id, 'studio');
  assert.equal(steps[1].id, 'game');
});

test('opaklık sürekli (sıçrama yok) ve 0..1 aralığında; ölçek makul', () => {
  const total = totalMs(steps);
  let prev = frameAt(0, steps);
  for (let t = 5; t <= total; t += 5) {
    const f = frameAt(t, steps);
    assert.ok(f.opacity >= 0 && f.opacity <= 1 && f.scale >= 0.94 && f.scale <= 1.06, `t=${t}`);
    assert.ok(Math.abs(f.opacity - prev.opacity) < 0.12, `sıçrama t=${t} ${prev.opacity}->${f.opacity}`);
    prev = f;
  }
});

test('ilerleme monoton artar; arka plan geçişli ve sonda oyun zemini', () => {
  let p = 0;
  for (let t = 0; t <= totalMs(steps); t += 50) { const f = frameAt(t, steps); assert.ok(f.progress >= p); p = f.progress; }
  assert.equal(frameAt(steps[0].fadeIn + 100, steps).bg, 'rgb(35,36,40)');
  assert.equal(frameAt(totalMs(steps) - 10, steps).bg, 'rgb(10,28,50)');
  const mid = frameAt(steps[0].fadeIn + steps[0].hold + steps[0].fadeOut + 70, steps).bg;
  assert.notEqual(mid, 'rgb(35,36,40)');
  assert.notEqual(mid, 'rgb(10,28,50)');
});

test('hareket azaltma: ölçek sabit, süre daha kısa', () => {
  const r = introSteps(true);
  assert.ok(totalMs(r) < totalMs(steps));
  for (let t = 0; t < totalMs(r); t += 40) assert.equal(frameAt(t, r, true).scale === 1 || frameAt(t, r, true).opacity === 0, true);
});
