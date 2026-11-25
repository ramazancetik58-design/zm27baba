import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTOR_FLOATS, HEADER_FLOATS, ReplayBuffer, ROT_Y_OFFSET, sampleClip } from './replayBuffer';
import { REST, arrayToPose, clonePose, poseToArray, POSE_LEN } from './humanoidPose';

const ACTORS = 3;
function push(buf: ReplayBuffer, dt: number, bx: number, rot = 0) {
  const f = buf.begin();
  f[0] = dt; f[1] = bx; f[2] = 0.11; f[3] = bx * 2;
  for (let n = 0; n < ACTORS; n++) {
    const o = HEADER_FLOATS + n * ACTOR_FLOATS;
    f[o] = bx + n; f[o + 1] = -bx; f[o + ROT_Y_OFFSET] = rot; f[o + 3] = 0;
  }
  buf.commit();
}

test('poz ↔ dizi dönüşümü kayıpsız', () => {
  const p = clonePose(REST); p.hipR = 0.7; p.kneeL = 1.2; p.rootRoll = -0.4;
  const arr = new Float32Array(POSE_LEN + 3);
  poseToArray(p, arr, 3);
  const q = clonePose(REST); arrayToPose(arr, 3, q);
  for (const k of Object.keys(p) as (keyof typeof p)[]) assert.ok(Math.abs(p[k] - q[k]) < 1e-6, k);
});

test('halka tamponu taşınca en eskiyi atar, klip kronolojik', () => {
  const buf = new ReplayBuffer(ACTORS, 10);
  for (let i = 1; i <= 25; i++) push(buf, 0.1, i);
  assert.equal(buf.size, 10);
  const clip = buf.snapshotLast(100)!;
  assert.equal(clip.frames, 10);
  const xs = Array.from({ length: clip.frames }, (_, f) => clip.data[f * clip.stride + 1]);
  assert.deepEqual(xs, [16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
});

test('son N saniyeyi alır (kare sayısı süreye göre)', () => {
  const buf = new ReplayBuffer(ACTORS, 600);
  for (let i = 0; i < 300; i++) push(buf, 1 / 60, i);
  const clip = buf.snapshotLast(2)!;
  assert.ok(clip.frames >= 120 && clip.frames <= 122, `kare ${clip.frames}`);
  assert.ok(Math.abs(clip.duration - 2) < 0.03);
  assert.equal(new ReplayBuffer(ACTORS, 5).snapshotLast(1), null);
});

test('örnekleme: kareler arası doğrusal, uçlarda kenetlenir, bitişte true', () => {
  const buf = new ReplayBuffer(ACTORS, 10);
  push(buf, 0.1, 0); push(buf, 0.1, 10); push(buf, 0.1, 20);
  const clip = buf.snapshotLast(10)!;
  const out = new Float32Array(clip.stride);
  assert.equal(sampleClip(clip, 0, out), false);
  assert.equal(out[1], 0);
  sampleClip(clip, 0.05, out);
  assert.ok(Math.abs(out[1] - 5) < 1e-4, `orta ${out[1]}`);
  sampleClip(clip, 0.15, out);
  assert.ok(Math.abs(out[1] - 15) < 1e-4);
  assert.equal(sampleClip(clip, 5, out), true);
  assert.ok(Math.abs(out[1] - 20) < 1e-4, 'son kareye kenetlenir');
});

test('açı örnekleme ±π sınırında en kısa yoldan', () => {
  const buf = new ReplayBuffer(ACTORS, 10);
  push(buf, 0.1, 0, 3.0); push(buf, 0.1, 1, -3.0);
  const clip = buf.snapshotLast(10)!;
  const out = new Float32Array(clip.stride);
  sampleClip(clip, 0.05, out);
  const rot = out[HEADER_FLOATS + ROT_Y_OFFSET];
  assert.ok(Math.abs(rot) > 3.0 && Math.abs(rot) <= Math.PI + 0.3, `rot ${rot}`); // 0'a (yanlış yola) değil, π'ye yakın
});

test('oynatma süresi: klip süresi / hız', () => {
  const buf = new ReplayBuffer(ACTORS, 700);
  for (let i = 0; i < 240; i++) push(buf, 1 / 60, i);
  const clip = buf.snapshotLast(3.6)!;
  const out = new Float32Array(clip.stride);
  let t = 0, steps = 0;
  while (!sampleClip(clip, t, out) && steps < 10000) { t += (1 / 60) * 0.7; steps++; }
  const realSeconds = steps / 60;
  assert.ok(realSeconds > 4.7 && realSeconds < 5.6, `oynatma ${realSeconds}`);
});
