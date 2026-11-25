/**
 * Uygulama depolaması: IndexedDB (kota sorunu yok) + senkron okuma/yazma API'si.
 *
 * Açılışta (main.tsx) `await appStorage.ready()` ile tüm anahtarlar belleğe alınır. Sonrasında
 * getItem/setItem/removeItem senkron çalışır, yazmalar arka planda IndexedDB'ye aktarılır
 * (write-behind, aynı anahtar için son değer). Böylece mevcut senkron kayıt kodu aynen çalışır.
 * IndexedDB yoksa localStorage'a, o da yoksa belleğe düşer. İlk açılışta eski localStorage
 * kayıtları (zm27_*) IndexedDB'ye taşınır; eskiler silinmez (geri dönüş yedeği).
 */
import type { StorageLike } from './saveStore';

export interface AsyncKv {
  loadAll(): Promise<Record<string, string>>;
  put(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

export type StorageMode = 'indexeddb' | 'localstorage' | 'memory';

export interface AppStorage extends StorageLike {
  ready(): Promise<void>;
  /** Bekleyen tüm yazmaların IndexedDB'ye ulaşmasını bekler. */
  flush(): Promise<void>;
  mode(): StorageMode;
  onError(cb: (err: unknown) => void): () => void;
}

const PREFIX = 'zm27_';
const MIGRATED_FLAG = 'zm27_migrated_ls_v1';

export function createIdbKv(dbName = 'zm27', storeName = 'kv'): AsyncKv | null {
  if (typeof indexedDB === 'undefined') return null;
  let dbp: Promise<IDBDatabase> | null = null;
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(storeName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  const db = () => (dbp ??= open());
  const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> => {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(storeName, mode);
      const req = fn(tx.objectStore(storeName));
      // İşlem tamamlanana (kalıcılaşana) kadar bekle.
      tx.oncomplete = () => resolve(req ? (req.result as T) : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  };
  return {
    async loadAll() {
      const d = await db();
      return new Promise<Record<string, string>>((resolve, reject) => {
        const out: Record<string, string> = {};
        const tx = d.transaction(storeName, 'readonly');
        const cur = tx.objectStore(storeName).openCursor();
        cur.onsuccess = () => {
          const c = cur.result;
          if (c) {
            if (typeof c.value === 'string') out[String(c.key)] = c.value;
            c.continue();
          }
        };
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
      });
    },
    async put(key, value) {
      await run('readwrite', (s) => s.put(value, key));
    },
    async del(key) {
      await run('readwrite', (s) => s.delete(key));
    },
  };
}

export function createAppStorage(backend: AsyncKv | null, legacy: StorageLike & { length?: number; key?: (i: number) => string | null } | null): AppStorage {
  const mem = new Map<string, string>();
  const dirty = new Map<string, string | null>();
  const listeners = new Set<(err: unknown) => void>();
  let mode: StorageMode = backend ? 'indexeddb' : legacy ? 'localstorage' : 'memory';
  let inflight: Promise<void> = Promise.resolve();
  let scheduled = false;
  let readyP: Promise<void> | null = null;

  const emit = (e: unknown) => listeners.forEach((l) => l(e));

  const legacyKeys = (): string[] => {
    const out: string[] = [];
    try {
      const n = legacy?.length ?? 0;
      for (let i = 0; i < n; i++) {
        const k = legacy!.key!(i);
        if (k && k.startsWith(PREFIX)) out.push(k);
      }
    } catch {
      /* yoksay */
    }
    return out;
  };

  async function drain(): Promise<void> {
    while (dirty.size > 0 && backend) {
      const batch = [...dirty.entries()];
      dirty.clear();
      for (const [k, v] of batch) {
        try {
          if (v === null) await backend.del(k);
          else await backend.put(k, v);
        } catch (err) {
          // Başarısız yazma tekrar denenebilsin diye kirli işaretle (daha yeni değer yoksa).
          if (!dirty.has(k)) dirty.set(k, v);
          emit(err);
          return;
        }
      }
    }
  }
  function schedule() {
    if (!backend || scheduled) return;
    scheduled = true;
    inflight = inflight.then(() => {
      scheduled = false;
      return drain();
    });
  }

  async function hydrate(): Promise<void> {
    if (backend) {
      try {
        const all = await backend.loadAll();
        for (const [k, v] of Object.entries(all)) mem.set(k, v);
        // Bir kereye mahsus localStorage -> IndexedDB göçü.
        if (!mem.has(MIGRATED_FLAG) && legacy) {
          const hasData = [...mem.keys()].some((k) => k.startsWith(PREFIX) && k !== MIGRATED_FLAG);
          if (!hasData) {
            for (const k of legacyKeys()) {
              const v = legacy.getItem(k);
              if (v != null) {
                mem.set(k, v);
                dirty.set(k, v);
              }
            }
          }
          mem.set(MIGRATED_FLAG, '1');
          dirty.set(MIGRATED_FLAG, '1');
          schedule();
          await inflight;
        }
        return;
      } catch (err) {
        emit(err);
        backend = null; // IndexedDB kullanılamıyor: localStorage'a düş
        mode = legacy ? 'localstorage' : 'memory';
      }
    }
    for (const k of legacyKeys()) {
      const v = legacy!.getItem(k);
      if (v != null) mem.set(k, v);
    }
  }

  return {
    ready: () => (readyP ??= hydrate()),
    flush: async () => {
      schedule();
      await inflight;
      if (dirty.size > 0) {
        schedule();
        await inflight;
      }
    },
    mode: () => mode,
    onError(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    getItem: (k) => mem.get(k) ?? null,
    setItem(k, v) {
      if (!backend && legacy) legacy.setItem(k, v); // kota hatası çağırana yansır
      mem.set(k, v);
      if (backend) {
        dirty.set(k, v);
        schedule();
      }
    },
    removeItem(k) {
      if (!backend && legacy) {
        try {
          legacy.removeItem(k);
        } catch {
          /* yoksay */
        }
      }
      mem.delete(k);
      if (backend) {
        dirty.set(k, null);
        schedule();
      }
    },
  };
}

function defaultStorage(): AppStorage {
  if (typeof window === 'undefined') return createAppStorage(null, null);
  let legacy: (StorageLike & { length: number; key: (i: number) => string | null }) | null = null;
  try {
    legacy = window.localStorage ?? null;
  } catch {
    legacy = null;
  }
  return createAppStorage(createIdbKv(), legacy);
}

export const appStorage: AppStorage = defaultStorage();
