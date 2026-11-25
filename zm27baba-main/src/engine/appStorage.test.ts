import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppStorage, type AsyncKv } from './appStorage';

function fakeBackend(init: Record<string, string> = {}) {
  const data = { ...init };
  const b: AsyncKv & { data: Record<string, string>; fail: boolean; puts: number } = {
    data, fail: false, puts: 0,
    async loadAll() { return { ...data }; },
    async put(k, v) { if (b.fail) throw new Error('idb put failed'); b.puts++; data[k] = v; },
    async del(k) { delete data[k]; },
  };
  return b;
}
class Legacy {
  d = new Map<string, string>();
  limit = Infinity;
  get length() { return this.d.size; }
  key(i: number) { return [...this.d.keys()][i] ?? null; }
  getItem(k: string) { return this.d.get(k) ?? null; }
  setItem(k: string, v: string) { if (v.length > this.limit) throw new Error('QuotaExceededError'); this.d.set(k, v); }
  removeItem(k: string) { this.d.delete(k); }
}

test('açılışta IndexedDB içeriği belleğe alınır; sonra okuma senkron', async () => {
  const s = createAppStorage(fakeBackend({ zm27_a: '1' }), null);
  await s.ready();
  assert.equal(s.getItem('zm27_a'), '1');
  assert.equal(s.getItem('yok'), null);
  assert.equal(s.mode(), 'indexeddb');
});

test('yazma/silme arka planda IndexedDB\'ye ulaşır; aynı anahtar için son değer yazılır', async () => {
  const b = fakeBackend();
  const s = createAppStorage(b, null);
  await s.ready();
  s.setItem('zm27_x', 'v1');
  s.setItem('zm27_x', 'v2');
  s.setItem('zm27_y', 'y');
  assert.equal(s.getItem('zm27_x'), 'v2'); // anında okunur
  await s.flush();
  assert.equal(b.data['zm27_x'], 'v2');
  assert.equal(b.data['zm27_y'], 'y');
  s.removeItem('zm27_y');
  await s.flush();
  assert.equal(b.data['zm27_y'], undefined);
});

test('5 MB sınırı yok: büyük kayıt IndexedDB\'ye yazılır', async () => {
  const b = fakeBackend();
  const s = createAppStorage(b, null);
  await s.ready();
  const big = 'x'.repeat(12_000_000);
  s.setItem('zm27_career_save_v7', big);
  await s.flush();
  assert.equal(b.data['zm27_career_save_v7'].length, 12_000_000);
});

test('ilk açılışta localStorage kayıtları IndexedDB\'ye taşınır, eskiler silinmez; ikinci açılışta tekrar taşınmaz', async () => {
  const legacy = new Legacy();
  legacy.setItem('zm27_career_save_v7', '{"w":5}');
  legacy.setItem('zm27_save_slot_1', '{"s":1}');
  legacy.setItem('baska_uygulama', 'dokunma');
  const b = fakeBackend();
  const s = createAppStorage(b, legacy);
  await s.ready();
  assert.equal(s.getItem('zm27_career_save_v7'), '{"w":5}');
  assert.equal(b.data['zm27_career_save_v7'], '{"w":5}');
  assert.equal(b.data['zm27_save_slot_1'], '{"s":1}');
  assert.equal(b.data['baska_uygulama'], undefined);
  assert.equal(legacy.getItem('zm27_career_save_v7'), '{"w":5}'); // geri dönüş yedeği
  // IndexedDB'de güncel kayıt varken eski localStorage tekrar içeri alınmaz
  b.data['zm27_career_save_v7'] = '{"w":9}';
  const s2 = createAppStorage(b, legacy);
  await s2.ready();
  assert.equal(s2.getItem('zm27_career_save_v7'), '{"w":9}');
});

test('IndexedDB yazması başarısız olursa hata bildirilir, bellekteki değer korunur, sonra tekrar denenir', async () => {
  const b = fakeBackend();
  const s = createAppStorage(b, null);
  const errs: unknown[] = [];
  s.onError((e) => errs.push(e));
  await s.ready();
  b.fail = true;
  s.setItem('zm27_k', 'deger');
  await s.flush();
  assert.ok(errs.length >= 1);
  assert.equal(s.getItem('zm27_k'), 'deger');
  b.fail = false;
  await s.flush();
  assert.equal(b.data['zm27_k'], 'deger');
});

test('IndexedDB yoksa localStorage\'a düşer (kota hatası çağırana yansır)', async () => {
  const legacy = new Legacy();
  legacy.setItem('zm27_a', 'eski');
  const s = createAppStorage(null, legacy);
  await s.ready();
  assert.equal(s.mode(), 'localstorage');
  assert.equal(s.getItem('zm27_a'), 'eski');
  s.setItem('zm27_b', 'yeni');
  assert.equal(legacy.getItem('zm27_b'), 'yeni');
  legacy.limit = 3;
  assert.throws(() => s.setItem('zm27_c', 'cok-uzun-deger'));
});

test('IndexedDB yüklenemezse (hata) localStorage moduna düşer', async () => {
  const bad: AsyncKv = { async loadAll() { throw new Error('open failed'); }, async put() {}, async del() {} };
  const legacy = new Legacy();
  legacy.setItem('zm27_a', 'x');
  const s = createAppStorage(bad, legacy);
  await s.ready();
  assert.equal(s.mode(), 'localstorage');
  assert.equal(s.getItem('zm27_a'), 'x');
});

test('saveStore + appStorage birlikte: kayıt IndexedDB\'ye yazılır ve yeniden açılışta okunur', async () => {
  const { createSaveStore } = await import('./saveStore');
  const b = fakeBackend();
  const s = createAppStorage(b, null);
  await s.ready();
  const store = createSaveStore(s, { key: 'zm27_c', backupKey: 'zm27_c_bak', corruptKey: 'zm27_c_x', debounceMs: 0 });
  store.schedule({ hafta: 7 });
  await s.flush();
  const s2 = createAppStorage(b, null);
  await s2.ready();
  const r = createSaveStore(s2, { key: 'zm27_c', backupKey: 'zm27_c_bak', corruptKey: 'zm27_c_x' }).load();
  assert.deepEqual(r.value, { hafta: 7 });
});
