import assert from 'node:assert/strict';
import test from 'node:test';
import { createSaveStore, type StorageLike } from './saveStore';
import { createRng, hashSeed } from './rng';

class Mem implements StorageLike {
  d = new Map<string, string>();
  limit = Infinity;
  getItem(k: string) { return this.d.get(k) ?? null; }
  setItem(k: string, v: string) {
    let used = 0;
    this.d.forEach((val, key) => { if (key !== k) used += val.length; });
    if (used + v.length > this.limit) throw new Error('QuotaExceededError');
    this.d.set(k, v);
  }
  removeItem(k: string) { this.d.delete(k); }
}
const opts = { key: 'm', backupKey: 'b', corruptKey: 'c', legacyKeys: ['old'], debounceMs: 0, backupEveryMs: 0 };

test('RNG: aynı tohum aynı dizi, farklı tohum farklı dizi, [0,1) aralığı', () => {
  const a = createRng('maç-1'), b = createRng('maç-1'), c = createRng('maç-2');
  const sa = Array.from({ length: 50 }, a), sb = Array.from({ length: 50 }, b), sc = Array.from({ length: 50 }, c);
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every((x) => x >= 0 && x < 1));
  assert.equal(hashSeed('x'), hashSeed('x'));
  const mean = Array.from({ length: 5000 }, createRng(7)).reduce((s, x) => s + x, 0) / 5000;
  assert.ok(mean > 0.47 && mean < 0.53);
});

test('bozuk ana kayıt silinmez: karantinaya alınır, yedekten yüklenir', () => {
  const m = new Mem();
  m.setItem('m', '{"week":3,'); // yarım yazılmış
  m.setItem('b', JSON.stringify({ week: 2 }));
  const s = createSaveStore(m, opts);
  const r = s.load();
  assert.equal(r.status, 'recovered');
  assert.deepEqual(r.value, { week: 2 });
  assert.equal(r.quarantined, true);
  assert.equal(m.getItem('c'), '{"week":3,');
});

test('bozuk kayıt + yedek yok: boş döner ama bozuk kopya korunur', () => {
  const m = new Mem();
  m.setItem('m', 'xxx');
  const r = createSaveStore(m, opts).load();
  assert.equal(r.value, null);
  assert.equal(r.status, 'empty');
  assert.equal(m.getItem('c'), 'xxx');
});

test('eski sürüm (v6) anahtarından göç eder', () => {
  const m = new Mem();
  m.setItem('old', JSON.stringify({ v: 6 }));
  assert.deepEqual(createSaveStore(m, opts).load().value, { v: 6 });
});

test('yazma: önceki sağlam kayıt yedeğe girer', () => {
  const m = new Mem();
  const s = createSaveStore(m, opts);
  s.schedule({ week: 1 });
  s.schedule({ week: 2 });
  assert.deepEqual(JSON.parse(m.getItem('m')!), { week: 2 });
  assert.deepEqual(JSON.parse(m.getItem('b')!), { week: 1 });
});

test('kota dolunca yedek silinip tekrar denenir; yine olmazsa hata bildirilir', () => {
  const m = new Mem();
  const s = createSaveStore(m, opts);
  const errs: string[] = [];
  s.onError((k) => errs.push(k));
  s.schedule({ w: 'a'.repeat(10) });
  s.schedule({ w: 'b'.repeat(10) });
  m.limit = 60; // ana + yedek sığmaz, ana tek başına sığar
  s.schedule({ w: 'c'.repeat(10) });
  assert.equal(JSON.parse(m.getItem('m')!).w, 'c'.repeat(10));
  assert.equal(errs.length, 0);
  m.limit = 5; // hiçbir şey sığmaz
  s.schedule({ w: 'd'.repeat(10) });
  assert.deepEqual(errs, ['quota']);
  assert.equal(JSON.parse(m.getItem('m')!).w, 'c'.repeat(10)); // eski kayıt bozulmadı
});

test('karantina yazılamazsa yazma kilitlenir (bozuk kaydın üstüne yazılmaz)', () => {
  const m = new Mem();
  m.setItem('m', 'bozuk');
  m.limit = 5; // karantinaya yer yok
  const s = createSaveStore(m, opts);
  const errs: string[] = [];
  s.onError((k) => errs.push(k));
  const r = s.load();
  assert.equal(r.status, 'locked');
  s.schedule({ yeni: 1 });
  assert.equal(m.getItem('m'), 'bozuk');
  assert.ok(errs.includes('locked'));
});

test('parseImport yalnızca nesne kabul eder', () => {
  const s = createSaveStore(new Mem(), opts);
  assert.deepEqual(s.parseImport('{"a":1}'), { a: 1 });
  assert.equal(s.parseImport('[1'), null);
  assert.equal(s.parseImport('5'), null);
});
