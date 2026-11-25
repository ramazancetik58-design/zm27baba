import assert from 'node:assert/strict';
import test from 'node:test';
import { TACTIC_PRESETS, applyPreset, matchPreset, previewImpact } from './tacticPresets';
import type { TacticsConfig } from './types';

const base = { formation: '4-3-3', mentality: 'BALANCED', pressing: 'MEDIUM', tempo: 'NORMAL', defensiveLine: 55, slots: [{ role: 'GK' }], benchPlayerIds: ['a'] } as unknown as TacticsConfig;

test('presetler geçerli aralıkta ve benzersiz', () => {
  assert.equal(new Set(TACTIC_PRESETS.map((p) => p.id)).size, TACTIC_PRESETS.length);
  for (const p of TACTIC_PRESETS) { assert.ok(p.defensiveLine >= 20 && p.defensiveLine <= 90); assert.ok(p.tr && p.en && p.descTr && p.descEn); }
});

test('applyPreset kadro/yedekleri korur; matchPreset geri tanır', () => {
  for (const p of TACTIC_PRESETS) {
    const t = applyPreset(base, p);
    assert.deepEqual(t.slots, base.slots); assert.deepEqual(t.benchPlayerIds, base.benchPlayerIds); assert.equal(t.formation, base.formation);
    assert.equal(matchPreset(t)?.id, p.id);
  }
  assert.equal(matchPreset(base), null);
});

test('etki önizlemesi taktikle tutarlı', () => {
  const n = previewImpact({ mentality: 'BALANCED', pressing: 'MEDIUM', tempo: 'NORMAL', defensiveLine: 55 });
  assert.deepEqual([n.attack, n.defense, n.chancesAgainst, n.fatigue], [0, 0, 0, 0]);
  const g = previewImpact({ mentality: 'ATTACKING', pressing: 'GEGENPRESS', tempo: 'FAST', defensiveLine: 78 });
  assert.ok(g.attack > 0 && g.defense < 0 && g.fatigue > 30 && g.chancesAgainst > 8 && g.chancesFor > 8);
  const p = previewImpact({ mentality: 'DEFENSIVE', pressing: 'LOW', tempo: 'SLOW', defensiveLine: 28 });
  assert.ok(p.attack < 0 && p.defense > 0 && p.fatigue < 0 && p.chancesAgainst < 0);
});
