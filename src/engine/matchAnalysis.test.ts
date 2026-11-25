import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeMatch, groupOf, ratePlayer, type PlayerMatchStats } from './matchAnalysis';

const P = (o: Partial<PlayerMatchStats> = {}): PlayerMatchStats => ({
  id: 'p', name: 'P', team: 'HOME', role: 'ST', minutes: 90, goals: 0, assists: 0, shots: 0, onTarget: 0, xg: 0, passes: 0, passesOk: 0, defActions: 0, saves: 0, ...o,
});

test('rol grupları', () => {
  assert.equal(groupOf('GK'), 'GK'); assert.equal(groupOf('CB'), 'DEF'); assert.equal(groupOf('LB'), 'DEF');
  assert.equal(groupOf('ST'), 'FWD'); assert.equal(groupOf('RW'), 'FWD'); assert.equal(groupOf('CM'), 'MID'); assert.equal(groupOf('CDM'), 'MID');
});

test('üçlü yapan forvet 9.5+; katkısız forvet mağlubiyette düşük', () => {
  const hat = ratePlayer(P({ goals: 3, shots: 6, onTarget: 4, xg: 1.6, passes: 20, passesOk: 17 }), 4, 1);
  assert.ok(hat >= 9.5, `hat-trick ${hat}`);
  const dud = ratePlayer(P({ shots: 2, passes: 18, passesOk: 12 }), 0, 2);
  assert.ok(dud <= 5.8, `katkısız ${dud}`);
});

test('gol sayısı arttıkça puan artar (monoton) ve 3–10 aralığında kalır', () => {
  let prev = 0;
  for (let g = 0; g <= 6; g++) { const r = ratePlayer(P({ goals: g, onTarget: g }), 3, 1); assert.ok(r >= prev && r >= 3 && r <= 10); prev = r; }
  assert.equal(ratePlayer(P({ goals: 9, assists: 5, onTarget: 20, passes: 40, passesOk: 40, defActions: 9 }), 9, 0), 10);
  assert.ok(ratePlayer(P({ role: 'CB', defActions: 0, passes: 40, passesOk: 8 }), 0, 9) >= 3);
});

test('defans/kaleci: gol yememek ve kurtarışlar ödüllendirilir, yenen gol cezalandırılır', () => {
  const cs = ratePlayer(P({ role: 'CB', defActions: 5, passes: 40, passesOk: 36 }), 2, 0);
  assert.ok(cs >= 7.5, `clean sheet stoper ${cs}`);
  const gk = ratePlayer(P({ role: 'GK', saves: 6, passes: 20, passesOk: 15 }), 2, 1);
  assert.ok(gk >= 7.3, `kaleci ${gk}`);
  const bad = ratePlayer(P({ role: 'CB', defActions: 1, passes: 30, passesOk: 20 }), 0, 4);
  assert.ok(bad < cs - 1.5);
  assert.ok(ratePlayer(P({ role: 'GK', saves: 6 }), 2, 1) > ratePlayer(P({ role: 'GK', saves: 1 }), 2, 1));
});

test('kısa süre oynayanın puanı 6.0\'a yaklaşır; oynamayan listede yok', () => {
  const full = ratePlayer(P({ goals: 2, onTarget: 2 }), 3, 0), sub = ratePlayer(P({ goals: 2, onTarget: 2, minutes: 10 }), 3, 0);
  assert.ok(Math.abs(sub - 6) < Math.abs(full - 6));
  const a = analyzeMatch([P({ id: 'a' }), P({ id: 'b', minutes: 0 })], [], 0, 0);
  assert.deepEqual(a.ratings.map((r) => r.id), ['a']);
});

test('maçın adamı en yüksek puanlı; eşitlikte gol+asist, sonra kazanan takım', () => {
  const a = analyzeMatch([
    P({ id: 'h9', team: 'HOME', goals: 2, assists: 0, onTarget: 3 }),
    P({ id: 'a9', team: 'AWAY', goals: 1, onTarget: 1 }),
    P({ id: 'hgk', team: 'HOME', role: 'GK', saves: 3 }),
  ], [], 2, 1);
  assert.equal(a.motm?.id, 'h9');
  assert.equal(a.ratings[0].id, 'h9');
  assert.equal(analyzeMatch([], [], 0, 0).motm, null);
  const tie = analyzeMatch([P({ id: 'x', team: 'AWAY', goals: 0 }), P({ id: 'y', team: 'HOME', goals: 0 })], [], 1, 0);
  assert.equal(tie.motm?.id, 'y', 'eşitlikte kazanan takım');
});
