import assert from 'node:assert/strict';
import test from 'node:test';
import { createClubsForLeague, generateRoundRobinFixtures } from './database';
import { simulateAiFixture } from './aiMatch';
import { shotModifiers, simulateMatch, suggestSubOut, type EngineResult, type EngineTeam } from './matchEngine';
import type { Player, PositionGroup } from './types';

function mkPlayer(id: string, group: PositionGroup, ovr: number, cond = 95): Player {
  return {
    id, fictionalName: id, realName: id, positionGroup: group, ovr, condition: cond, injuredWeeks: 0,
    attributes: { pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, stamina: 70, goalkeeping: ovr },
  } as unknown as Player;
}
function mkTeam(id: string, rating: number, o: Partial<EngineTeam> = {}): EngineTeam {
  const g: PositionGroup[] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD'];
  const bg: PositionGroup[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD'];
  return {
    clubId: id, attack: rating, midfield: rating, defense: rating,
    mentality: 'BALANCED', pressing: 'MEDIUM', tempo: 'NORMAL', defensiveLine: 55,
    starters: g.map((x, i) => mkPlayer(`${id}-s${i}`, x, rating)),
    bench: bg.map((x, i) => mkPlayer(`${id}-b${i}`, x, rating - 6)),
    ...o,
  };
}
const run = (n: number, a: () => EngineTeam, b: () => EngineTeam, tag: string, extra = {}): EngineResult[] =>
  Array.from({ length: n }, (_, i) => simulateMatch(a(), b(), { seed: `${tag}-${i}`, ...extra }));
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

test('motor deterministik: aynı tohum aynı sonuç, farklı tohum farklı', () => {
  const a = simulateMatch(mkTeam('A', 70), mkTeam('B', 70), { seed: 's1' });
  const b = simulateMatch(mkTeam('A', 70), mkTeam('B', 70), { seed: 's1' });
  assert.deepEqual(a, b);
  const diff = Array.from({ length: 10 }, (_, i) => JSON.stringify(simulateMatch(mkTeam('A', 70), mkTeam('B', 70), { seed: `x${i}` })));
  assert.ok(new Set(diff).size > 5);
});

test('denge: eşit takımlarda gol, galibiyet/beraberlik, şut ve kart oranları gerçekçi', () => {
  const r = run(800, () => mkTeam('H', 70), () => mkTeam('A', 70), 'eq');
  const goals = avg(r.map((x) => x.homeGoals + x.awayGoals));
  const homeWin = r.filter((x) => x.homeGoals > x.awayGoals).length / r.length;
  const draw = r.filter((x) => x.homeGoals === x.awayGoals).length / r.length;
  const shots = avg(r.map((x) => (x.homeShots + x.awayShots) / 2));
  const xg = avg(r.map((x) => (x.homeXg + x.awayXg) / 2));
  const yellows = avg(r.map((x) => x.events.filter((e) => e.type === 'YELLOW').length));
  assert.ok(goals > 2.2 && goals < 3.3, `gol/maç ${goals.toFixed(2)}`);
  assert.ok(homeWin > 0.38 && homeWin < 0.54, `ev galibiyeti ${homeWin.toFixed(2)}`);
  assert.ok(draw > 0.18 && draw < 0.33, `beraberlik ${draw.toFixed(2)}`);
  assert.ok(shots > 8 && shots < 16, `şut ${shots.toFixed(1)}`);
  assert.ok(xg > 0.9 && xg < 1.8, `xG ${xg.toFixed(2)}`);
  assert.ok(yellows > 1 && yellows < 4.5, `sarı ${yellows.toFixed(2)}`);
});

test('güçlü takım belirgin şekilde daha çok kazanır; ev sahibi avantajı var', () => {
  const r = run(500, () => mkTeam('S', 78), () => mkTeam('Z', 62), 'str', { neutralVenue: true });
  const win = r.filter((x) => x.homeGoals > x.awayGoals).length / r.length;
  const loss = r.filter((x) => x.homeGoals < x.awayGoals).length / r.length;
  assert.ok(win > 0.62 && loss < 0.2, `kazanma ${win.toFixed(2)} kayıp ${loss.toFixed(2)}`);
  const eq = run(600, () => mkTeam('H', 70), () => mkTeam('A', 70), 'adv');
  assert.ok(avg(eq.map((x) => x.homeGoals)) > avg(eq.map((x) => x.awayGoals)));
});

test('orta saha üstünlüğü topla oynamayı artırır', () => {
  const r = run(300, () => mkTeam('H', 70, { midfield: 82 }), () => mkTeam('A', 70, { midfield: 70 }), 'poss');
  assert.ok(avg(r.map((x) => x.homePossession)) > 54);
});

test('yüksek pres PPDA\'yı düşürür ve yorgunluğu artırır', () => {
  const hi = run(250, () => mkTeam('H', 70, { pressing: 'GEGENPRESS' }), () => mkTeam('A', 70), 'press');
  const lo = run(250, () => mkTeam('H', 70, { pressing: 'LOW' }), () => mkTeam('A', 70), 'press');
  assert.ok(avg(hi.map((x) => x.homePpda)) < avg(lo.map((x) => x.homePpda)));
  const cond = (rs: EngineResult[]) => avg(rs.map((x) => avg(Object.entries(x.endCondition).filter(([k]) => k.startsWith('H-')).map(([, v]) => v))));
  assert.ok(cond(hi) < cond(lo));
});

test('yorgun kadro daha kötü oynar; değişiklikler en fazla 5 ve olay dakikaları geçerli', () => {
  const fresh = run(300, () => mkTeam('H', 70), () => mkTeam('A', 70), 'fat');
  const tired = run(300, () => ({ ...mkTeam('H', 70), starters: mkTeam('H', 70).starters.map((p) => ({ ...p, condition: 45 }) as Player) }), () => mkTeam('A', 70), 'fat');
  assert.ok(avg(tired.map((x) => x.homeGoals - x.awayGoals)) < avg(fresh.map((x) => x.homeGoals - x.awayGoals)));
  for (const x of fresh) {
    for (const side of ['HOME', 'AWAY'] as const) assert.ok(x.events.filter((e) => e.type === 'SUB' && e.side === side).length <= 5);
    for (const e of x.events) assert.ok(e.minute >= 1 && e.minute <= 90);
    for (const e of x.events.filter((e) => e.type === 'SUB')) assert.notEqual(e.playerId, e.inId);
  }
  assert.ok(fresh.some((x) => x.events.some((e) => e.type === 'SUB')), 'hiç değişiklik yapılmadı');
});

test('kırmızı kart ve sakatlık görülür; momentum serisi üretilir', () => {
  const r = run(1500, () => mkTeam('H', 70), () => mkTeam('A', 70), 'misc');
  assert.ok(r.some((x) => x.events.some((e) => e.type === 'RED')));
  assert.ok(r.some((x) => x.events.some((e) => e.type === 'INJURY')));
  assert.ok(r[0].momentum.length >= 9 && r[0].momentum.every((m) => m >= -1 && m <= 1));
});

test('AI uyarlayıcı: gerçek kulüp verisiyle deterministik, tutarlı maç üretir', () => {
  const clubs = createClubsForLeague('SUPER_LIG');
  const fixtures = generateRoundRobinFixtures(clubs).slice(0, 40);
  const goals: number[] = [];
  for (const f of fixtures) {
    const a = simulateAiFixture(f, clubs);
    const b = simulateAiFixture(f, clubs);
    assert.deepEqual(a.fixture, b.fixture);
    assert.ok(Number.isInteger(a.fixture.homeGoals) && Number.isInteger(a.fixture.awayGoals));
    assert.equal([...a.scorers.values()].reduce((s, v) => s + v.goals, 0), a.fixture.homeGoals + a.fixture.awayGoals);
    assert.ok(a.fixture.homePossession >= 20 && a.fixture.homePossession <= 80);
    goals.push(a.fixture.homeGoals + a.fixture.awayGoals);
  }
  const m = avg(goals);
  assert.ok(m > 1.6 && m < 3.8, `lig gol ortalaması ${m.toFixed(2)}`);
});

test('shotModifiers: tipik şutta ≈1; iyi forvet/momentum artırır, iyi kaleci ve yorgunluk düşürür', () => {
  const base = shotModifiers({ shooterOvr: 70, shooterCondition: 90, gkRating: 65, momentum: 0 });
  assert.ok(Math.abs(base.xgMul - 1) < 0.02 && Math.abs(base.convMul - 1) < 0.02);
  assert.ok(shotModifiers({ shooterOvr: 88, shooterCondition: 90, gkRating: 65, momentum: 0 }).xgMul > 1.1);
  assert.ok(shotModifiers({ shooterOvr: 70, shooterCondition: 40, gkRating: 65, momentum: 0 }).xgMul < 0.85);
  assert.ok(shotModifiers({ shooterOvr: 70, shooterCondition: 90, gkRating: 65, momentum: 1 }).xgMul > base.xgMul);
  assert.ok(shotModifiers({ shooterOvr: 70, shooterCondition: 90, gkRating: 88, momentum: 0 }).convMul < 1);
  assert.ok(shotModifiers({ shooterOvr: 70, shooterCondition: 90, gkRating: 45, momentum: 0 }).convMul > 1);
});

test('suggestSubOut: sakat öncelikli, sonra 62 altı en yorgun saha oyuncusu; kaleci önerilmez', () => {
  const c = (id: string, g: PositionGroup, cond: number, injured = false) => ({ id, positionGroup: g, condition: cond, injured });
  assert.equal(suggestSubOut([c('a', 'MID', 50), c('b', 'FWD', 90, true)]), 'b');
  assert.equal(suggestSubOut([c('a', 'MID', 58), c('b', 'DEF', 49), c('gk', 'GK', 20)]), 'b');
  assert.equal(suggestSubOut([c('a', 'MID', 80), c('gk', 'GK', 20)]), null);
});
