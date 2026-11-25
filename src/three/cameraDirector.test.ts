import assert from 'node:assert/strict';
import test from 'node:test';
import { AutoDirector, DEFAULT_CAMERA_SETTINGS, applyDistance, cameraRig, lookRate, posRate, sanitizeCameraSettings, type CameraMode } from './cameraDirector';

const modes: CameraMode[] = ['broadcast', 'tactical', 'behind_goal', 'dynamic', 'follow', 'sideline', 'orbit'];
const ctx = (bx: number, bz: number, t = 0) => ({ ball: { x: bx, z: bz }, carrier: { x: bx, z: bz, vx: 5, vz: -3 }, t, halfW: 34, halfL: 52.5 });

test('tüm kamera kurguları sınırlar içinde, sonlu ve bakış noktasından yeterince uzak', () => {
  for (const m of modes) for (const bx of [-30, 0, 30]) for (const bz of [-50, -10, 0, 25, 50]) {
    const r = cameraRig(m, ctx(bx, bz, bx + bz));
    for (const v of [...r.pos, ...r.look]) assert.ok(Number.isFinite(v));
    assert.ok(r.pos[1] >= 1.4 && r.pos[1] < 60, `${m} yükseklik ${r.pos[1]}`);
    assert.ok(Math.hypot(r.pos[0] - r.look[0], r.pos[1] - r.look[1], r.pos[2] - r.look[2]) > 4, `${m} bakış noktasına çok yakın`);
    assert.ok(Math.abs(r.pos[0]) <= 70 && Math.abs(r.pos[2]) <= 75, `${m} stadyum dışı`);
  }
});

test('takip kamerası topu taşıyanın arkasında ve gittiği yöne bakar', () => {
  const r = cameraRig('follow', { ball: { x: 0, z: 0 }, carrier: { x: 0, z: 0, vx: 0, vz: 6 }, t: 0, halfW: 34, halfL: 52.5 });
  assert.ok(r.pos[2] < 0 && r.look[2] > 0, 'arkadan ileri bakar');
  const still = cameraRig('follow', { ball: { x: 0, z: 20 }, carrier: null, t: 0, halfW: 34, halfL: 52.5 });
  assert.ok(Number.isFinite(still.pos[0]));
});

test('uzaklık çarpanı kamerayı bakış noktasına göre ölçekler; yakınlık yere gömmez', () => {
  const base = cameraRig('broadcast', ctx(0, 0));
  const near = applyDistance(base, 0.7), far = applyDistance(base, 1.4);
  const dist = (r: typeof base) => Math.hypot(r.pos[0] - r.look[0], r.pos[1] - r.look[1], r.pos[2] - r.look[2]);
  assert.ok(dist(near) < dist(base) && dist(far) > dist(base));
  assert.ok(applyDistance(cameraRig('sideline', ctx(0, 0)), 0.7).pos[1] >= 1.4);
});

test('ayarlar sınırlanır, bozuk girdi varsayılana döner', () => {
  assert.deepEqual(sanitizeCameraSettings(null), DEFAULT_CAMERA_SETTINGS);
  const s = sanitizeCameraSettings({ fov: 999, smoothing: -4, distance: 'x', shake: 'evet' });
  assert.equal(s.fov, 56); assert.equal(s.smoothing, 0); assert.equal(s.distance, 1); assert.equal(s.shake, true); assert.equal(s.replay, true);
  assert.equal(sanitizeCameraSettings({ replay: false }).replay, false);
  assert.ok(posRate(1) < posRate(0) && lookRate(1) < lookRate(0), 'yumuşak = daha düşük hız');
});

test('otomatik yönetmen: gol→takip, şut→dinamik, normal→yayın; sık geçiş yapmaz', () => {
  const d = new AutoDirector();
  assert.equal(d.pick({ pendingShot: false, celebrating: false }, 0), 'broadcast');
  assert.equal(d.pick({ pendingShot: true, celebrating: false }, 1), 'dynamic');
  assert.equal(d.pick({ pendingShot: false, celebrating: false }, 2), 'dynamic', '2,5 sn tutar');
  assert.equal(d.pick({ pendingShot: false, celebrating: true }, 4), 'follow');
  assert.equal(d.pick({ pendingShot: false, celebrating: false }, 7), 'broadcast');
});
