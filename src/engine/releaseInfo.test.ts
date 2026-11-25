import assert from 'node:assert/strict';
import test from 'node:test';
import { compareVersions, formatBytes, isNewer, noteLines, parseRelease, versionParts } from './releaseInfo';

const sample = {
  tag_name: 'v27.14', published_at: '2026-11-24T20:10:00Z', html_url: 'https://github.com/o/r/releases/tag/v27.14',
  body: '## Yenilikler\n- **Gol tekrarı** eklendi\n- Daha akıcı maç\n\n> not',
  assets: [
    { name: 'notlar.txt', browser_download_url: 'https://x/notlar.txt', size: 10 },
    { name: 'baska.apk', browser_download_url: 'https://x/baska.apk', size: 111 },
    { name: 'zm27.apk', browser_download_url: 'https://x/zm27.apk', size: 5238880, digest: 'sha256:abc123' },
  ],
};

test('sürüm parçalama ve karşılaştırma', () => {
  assert.deepEqual(versionParts('v27.14'), [27, 14]);
  assert.equal(compareVersions('27.14', '27.9'), 1, 'sayısal karşılaştırma (metinsel değil)');
  assert.equal(compareVersions('v27.14', '27.14'), 0);
  assert.equal(compareVersions('28', '27.99'), 1);
  assert.equal(compareVersions('27.1', '27.1.0'), 0);
});

test('isNewer: yalnız kesin yeniyse; bilgi eksik/bozuksa alarm vermez', () => {
  assert.equal(isNewer('v27.15', '27.14'), true);
  assert.equal(isNewer('v27.14', '27.14'), false);
  assert.equal(isNewer('v27.13', '27.14'), false);
  assert.equal(isNewer(null, '27.14'), false);
  assert.equal(isNewer('v27.15', undefined), false);
  assert.equal(isNewer('sürüm', '27.14'), false);
});

test('parseRelease: tercih edilen APK seçilir, özet alanları dolar', () => {
  const r = parseRelease(sample, 'zm27.apk')!;
  assert.equal(r.version, '27.14');
  assert.equal(r.apk?.name, 'zm27.apk');
  assert.equal(r.apk?.size, 5238880);
  assert.equal(r.apk?.sha256, 'abc123');
  assert.equal(parseRelease(sample, 'yok.apk')!.apk?.name, 'baska.apk', 'ad eşleşmezse ilk APK');
});

test('parseRelease: APK yok / bozuk girdi', () => {
  assert.equal(parseRelease({ tag_name: 'v1', assets: [] }, 'zm27.apk')!.apk, null);
  assert.equal(parseRelease(null, 'a.apk'), null);
  assert.equal(parseRelease({ assets: [] }, 'a.apk'), null);
  assert.equal(parseRelease({ tag_name: 'v1' }, 'a.apk')!.apk, null);
});

test('formatBytes ve noteLines', () => {
  assert.equal(formatBytes(5238880), '5.0 MB');
  assert.equal(formatBytes(120 * 1024 * 1024), '120 MB');
  assert.equal(formatBytes(0), '—');
  assert.deepEqual(noteLines(sample.body, 3), ['Yenilikler', 'Gol tekrarı eklendi', 'Daha akıcı maç']);
});
