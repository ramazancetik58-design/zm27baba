import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NEUTRAL_STYLE, styleFromSeed, FOOT_PTS, KICK_DUR, REST, angleDiff, approachPose, armPoint, celebrateTarget, clonePose, dampAngle, diveTarget,
  gaitTarget, groundOffset, headPoint, headerTarget, idleTarget, kickTarget, legPoint, limpTarget, pelvisPoint,
  tackleTarget, type Pose,
} from './humanoidPose';

const phases = Array.from({ length: 64 }, (_, i) => (i / 64) * Math.PI * 2);
const speeds = [1.5, 3.5, 6, 8.5];
const keys = Object.keys(REST) as (keyof Pose)[];

test('yürüyüş simetrik: sol bacak sağın yarım döngü gecikmişi', () => {
  for (const sp of speeds) for (const ph of phases) {
    const a = gaitTarget(ph, sp).pose, b = gaitTarget(ph + Math.PI, sp).pose;
    assert.ok(Math.abs(a.hipL - b.hipR) < 1e-9 && Math.abs(a.kneeL - b.kneeR) < 1e-9);
    assert.ok(Math.abs(a.shL - b.shR) < 1e-9 && Math.abs(a.elbL - b.elbR) < 1e-9);
  }
});

test('eklem sınırları: diz/dirsek ters bükülmez, kalça makul aralıkta', () => {
  for (const sp of speeds) for (const ph of phases) {
    const p = gaitTarget(ph, sp).pose;
    assert.ok(p.kneeL >= 0.04 && p.kneeR >= 0.04 && p.kneeL < 2.2 && p.kneeR < 2.2, `diz ${p.kneeL}`);
    assert.ok(p.elbL >= 0 && p.elbR >= 0);
    for (const h of [p.hipL, p.hipR]) assert.ok(h > -0.7 && h < 1.4, `kalça ${h}`);
  }
});

test('diz bükülmesi salınım (ileri savrulma) fazında en yüksek; basma fazında düz', () => {
  const swing = gaitTarget(Math.PI * 2 * 0.62, 7.5).pose; // sağ bacak: c≈0.62 orta salınım
  const stance = gaitTarget(Math.PI * 2 * 0.28, 7.5).pose; // c≈0.28: yere basıyor
  assert.ok(swing.kneeR > 1.4, `salınım dizi ${swing.kneeR}`);
  assert.ok(stance.kneeR < 0.35, `basma dizi ${stance.kneeR}`);
});

test('süreklilik: komşu fazlar arasında ani sıçrama yok', () => {
  for (const sp of speeds) for (const ph of phases) {
    const a = gaitTarget(ph, sp).pose, b = gaitTarget(ph + 0.03, sp).pose;
    for (const k of keys) assert.ok(Math.abs(a[k] - b[k]) < 0.1, `${k} ${Math.abs(a[k] - b[k])}`);
  }
});

test('zemin teması: basan ayak yere oturur, gövde salınımı gerçekçi (<12 cm) ve ayak yere girmez', () => {
  for (const sp of speeds) {
    const offs = phases.map((ph) => groundOffset(gaitTarget(ph, sp).pose, 0));
    const bob = Math.max(...offs) - Math.min(...offs);
    assert.ok(bob < 0.12, `bob ${bob.toFixed(3)} @${sp}`);
    assert.ok(Math.min(...offs) > -0.25 && Math.max(...offs) < 0.06, `ofset ${Math.min(...offs).toFixed(2)}..${Math.max(...offs).toFixed(2)}`);
    for (const ph of phases) {
      const p = gaitTarget(ph, sp).pose, off = groundOffset(p, 0);
      for (const side of ['L', 'R'] as const) for (const f of FOOT_PTS) assert.ok(legPoint(p, side, f)[1] + off >= -1e-9);
    }
  }
});

test('eller gövdeye girmez: koşuda ve beklerken el x konumu ≥ 0.22 m', () => {
  const poses = [idleTarget(1.2, 0, false).pose, idleTarget(1.2, 0, true).pose, ...phases.map((ph) => gaitTarget(ph, 8).pose)];
  for (const p of poses) {
    assert.ok(armPoint(p, 'L', [0, -0.28, 0.014])[0] < -0.22);
    assert.ok(armPoint(p, 'R', [0, -0.28, 0.014])[0] > 0.22);
  }
});

test('koşuda kollar dirsekten bükülü ve sallanır (düz sarkmaz)', () => {
  const ps = phases.map((ph) => gaitTarget(ph, 8).pose);
  assert.ok(ps.every((p) => p.elbL > 1.0 && p.elbR > 1.0));
  assert.ok(Math.max(...ps.map((p) => p.shL)) - Math.min(...ps.map((p) => p.shL)) > 1.2);
});

test('durum geçişi yumuşak: bekleme → koşu 0,3 sn içinde %99 oturur, sıçrama yok', () => {
  const cur = clonePose(idleTarget(0, 0, false).pose), tgt = gaitTarget(0.7, 7).pose;
  let prev = clonePose(cur), maxStep = 0;
  for (let i = 0; i < 18; i++) {
    approachPose(cur, tgt, 16, 1 / 60);
    for (const k of keys) maxStep = Math.max(maxStep, Math.abs(cur[k] - prev[k]));
    prev = clonePose(cur);
  }
  for (let i = 0; i < 18; i++) approachPose(cur, tgt, 16, 1 / 60);
  for (const k of keys) assert.ok(Math.abs(cur[k] - tgt[k]) < 0.01 * Math.max(1, Math.abs(tgt[k] - idleTarget(0, 0, false).pose[k])) + 0.02, k);
  assert.ok(maxStep < 0.45, `adım ${maxStep}`);
});

test('yüz dönüşü en kısa yoldan (±π geçişinde ters dönmez)', () => {
  const a = dampAngle(3.0, -3.0, 10, 0.05);
  assert.ok(a > 3.0, `artmalı (${a}) çünkü en kısa yol π üzerinden`);
  assert.ok(Math.abs(angleDiff(a, -3.0)) < Math.abs(angleDiff(3.0, -3.0)));
});

test('vuruş: önce geriye gerilir, sonra ayak gövdenin önüne çıkar, diz açılır', () => {
  const toe = (u: number) => legPoint(kickTarget(u).pose, 'R', FOOT_PTS[2]);
  assert.ok(toe(0.28)[2] < -0.2, `geri ${toe(0.28)[2]}`);
  assert.ok(toe(0.5)[2] > 0.35, `ön ${toe(0.5)[2]}`);
  assert.ok(kickTarget(0.28).pose.kneeR > 1.3 && kickTarget(0.5).pose.kneeR < 0.4);
  assert.ok(KICK_DUR > 0.2);
});

test('diz kayması: dizler zeminde, gövde geriye yatık, kollar açık', () => {
  const t = celebrateTarget('KNEE_SLIDE', 1);
  const off = groundOffset(t.pose, t.ground);
  for (const s of ['L', 'R'] as const) assert.ok(Math.abs(legPoint(t.pose, s, [0, 0, 0])[1] + off - 0.06) < 0.02, 'diz zeminde');
  assert.ok(pelvisPoint(t.pose)[1] + off < 0.7, `leğen ${pelvisPoint(t.pose)[1] + off}`);
  assert.ok(headPoint(t.pose)[2] < pelvisPoint(t.pose)[2]);
  assert.ok(armPoint(t.pose, 'L', [0, -0.28, 0])[0] < -0.5 && armPoint(t.pose, 'R', [0, -0.28, 0])[0] > 0.5);
});

test('zıplayarak sevinç: eller kafanın üstünde ve dışarıda', () => {
  const t = celebrateTarget('ARM_JUMP', 1.5);
  const hl = armPoint(t.pose, 'L', [0, -0.28, 0]), hr = armPoint(t.pose, 'R', [0, -0.28, 0]);
  assert.ok(hl[1] > 1.8 && hr[1] > 1.8, `el y ${hl[1]}`);
  assert.ok(hl[0] < -0.3 && hr[0] > 0.3, `el x ${hl[0]}`);
});

test('kayarak müdahale ve dalış: hiçbir nokta zemine girmez, gövde alçalır', () => {
  const samples: [string, ReturnType<typeof tackleTarget>][] = [];
  for (const u of [0.15, 0.3, 0.5, 0.8]) { samples.push(['tackle', tackleTarget(u)]); samples.push(['diveL', diveTarget(u, -1)]); samples.push(['diveR', diveTarget(u, 1)]); }
  for (const [name, t] of samples) {
    const off = groundOffset(t.pose, t.ground);
    const tol = name === 'tackle' ? -0.05 : -1e-6; // kayarak müdahalede el/ayak çimene çok az girebilir
    for (const s of ['L', 'R'] as const) {
      assert.ok(legPoint(t.pose, s, FOOT_PTS[1])[1] + off >= tol, `${name} ayak`);
      assert.ok(armPoint(t.pose, s, [0, -0.28, 0])[1] + off - 0.05 >= tol, `${name} el`);
    }
    assert.ok(headPoint(t.pose)[1] + off - 0.12 >= tol, `${name} kafa`);
  }
  const mid = tackleTarget(0.5);
  const pelY = pelvisPoint(mid.pose)[1] + groundOffset(mid.pose, 3);
  assert.ok(pelY > 0.15 && pelY < 0.3, `leğen ${pelY}`);
  assert.ok(legPoint(mid.pose, 'R', FOOT_PTS[1])[1] + groundOffset(mid.pose, 3) < 0.45, 'öndeki ayak zemine yakın');
  const dv = diveTarget(0.45, 1);
  assert.ok(Math.abs(headPoint(dv.pose)[0]) > 0.6, 'kaleci yana uzanmalı');
});

test('kafa vuruşu havada, topal yürüyüş asimetrik, bekleme nefes alır', () => {
  assert.ok(headerTarget(0.5).pose.air > 0.4);
  const l = limpTarget(1.0).pose;
  assert.ok(Math.abs(l.hipR) < Math.abs(l.hipL) + 0.2 && l.headPitch > 0.2);
  assert.ok(idleTarget(0, 0, false).pose.lean !== idleTarget(0.8, 0, false).pose.lean);
  assert.ok(idleTarget(0, 5, false).pose.headYaw <= 1.0, 'baş dönüşü sınırlı');
});

test('koşu stili: varsayılan değişmez, kişisel stil kol/eğim/adımı ölçekler ve sınırlar içinde kalır', () => {
  const base = gaitTarget(1.1, 7).pose;
  assert.deepEqual(gaitTarget(1.1, 7, NEUTRAL_STYLE).pose, base);
  const wide = gaitTarget(1.1, 7, styleFromSeed(1, 1, 1)).pose, small = gaitTarget(1.1, 7, styleFromSeed(0, 0, 0)).pose;
  assert.ok(wide.lean > small.lean);
  const swing = (st: ReturnType<typeof styleFromSeed>) => Math.max(...phases.map((ph) => gaitTarget(ph, 7, st).pose.shR)) - Math.min(...phases.map((ph) => gaitTarget(ph, 7, st).pose.shR));
  assert.ok(swing(styleFromSeed(0, 0, 1)) > swing(styleFromSeed(0, 0, 0)));
  for (const u of [0, 0.5, 1]) for (const ph of phases) { const q = gaitTarget(ph, 8, styleFromSeed(u, u, u)).pose; assert.ok(q.kneeR >= 0.04 && q.hipR > -0.8 && q.hipR < 1.5); }
});
