/**
 * Güvenli kariyer kayıt katmanı.
 * - Bozuk kayıt ASLA üzerine yazılmaz: önce karantina anahtarına kopyalanır.
 * - Her yazmadan önce son sağlam kayıt yedeğe alınır; yükleme sırası: ana -> yedek -> eski sürüm.
 * - Yazmalar debounce edilir; sayfa gizlenirken flush() çağrılır.
 * - Kota hatası sessizce yutulmaz, dinleyicilere bildirilir.
 */
import { appStorage } from './appStorage';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SaveLoadStatus = 'ok' | 'recovered' | 'empty' | 'locked';
export interface SaveLoadResult {
  value: unknown | null;
  status: SaveLoadStatus;
  /** Ana kayıt okunamadı ve kopyası karantinaya alındı. */
  quarantined: boolean;
}
export type SaveErrorKind = 'quota' | 'locked' | 'unavailable' | 'large';

export interface SaveStoreOptions {
  key: string;
  backupKey: string;
  corruptKey: string;
  legacyKeys?: string[];
  debounceMs?: number;
  backupEveryMs?: number;
  warnChars?: number;
  now?: () => number;
}

export function createSaveStore(storage: StorageLike | null, opts: SaveStoreOptions) {
  const debounceMs = opts.debounceMs ?? 400;
  const backupEveryMs = opts.backupEveryMs ?? 120_000;
  const warnChars = opts.warnChars ?? 3_500_000;
  const now = opts.now ?? (() => Date.now());
  const listeners = new Set<(kind: SaveErrorKind) => void>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { value: unknown } | null = null;
  let locked = false;
  let lastBackupAt = 0;
  let largeWarned = false;

  const emit = (kind: SaveErrorKind) => listeners.forEach((l) => l(kind));
  const isObject = (v: unknown) => v !== null && typeof v === 'object';

  function quarantine(raw: string): boolean {
    if (!storage) return false;
    try {
      storage.setItem(opts.corruptKey, raw);
      return true;
    } catch {
      try {
        storage.removeItem(opts.backupKey); // yer aç
        storage.setItem(opts.corruptKey, raw);
        return true;
      } catch {
        return false;
      }
    }
  }

  function load(): SaveLoadResult {
    if (!storage) return { value: null, status: 'empty', quarantined: false };
    const candidates: Array<[string, SaveLoadStatus]> = [
      [opts.key, 'ok'],
      [opts.backupKey, 'recovered'],
      ...(opts.legacyKeys ?? []).map((k): [string, SaveLoadStatus] => [k, 'recovered']),
    ];
    let corruptRaw: string | null = null;
    let found: SaveLoadResult | null = null;
    for (const [k, status] of candidates) {
      let raw: string | null = null;
      try {
        raw = storage.getItem(k);
      } catch {
        continue;
      }
      if (!raw) continue;
      try {
        const value = JSON.parse(raw);
        if (isObject(value)) {
          // Ana anahtar sağlamsa 'ok'; eski sürüm anahtarı da normal göç sayılır.
          const st: SaveLoadStatus = k === opts.key || k !== opts.backupKey ? (corruptRaw ? 'recovered' : 'ok') : 'recovered';
          found = { value, status: st, quarantined: false };
          break;
        }
        if (k === opts.key) corruptRaw = raw;
      } catch {
        if (k === opts.key) corruptRaw = raw;
      }
    }
    let quarantined = false;
    if (corruptRaw !== null) {
      quarantined = quarantine(corruptRaw);
      if (!quarantined) {
        locked = true;
        emit('locked');
      }
    }
    if (found) return { ...found, quarantined };
    return { value: null, status: locked ? 'locked' : 'empty', quarantined };
  }

  /** Ana kaydı olduğu gibi karantinaya al (örn. normalizeCareer hata verdiğinde). */
  function quarantineCurrent(): boolean {
    if (!storage) return false;
    try {
      const raw = storage.getItem(opts.key);
      if (!raw) return true;
      const ok = quarantine(raw);
      if (!ok) {
        locked = true;
        emit('locked');
      }
      return ok;
    } catch {
      return false;
    }
  }

  function flush(): boolean {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return true;
    const { value } = pending;
    pending = null;
    if (!storage) {
      emit('unavailable');
      return false;
    }
    if (locked) {
      emit('locked');
      return false;
    }
    let json: string;
    try {
      json = JSON.stringify(value);
    } catch {
      emit('unavailable');
      return false;
    }
    if (json.length > warnChars) {
      if (!largeWarned) {
        largeWarned = true;
        emit('large');
      }
    } else largeWarned = false;

    // Son sağlam kaydı yedeğe al (en çok backupEveryMs'de bir, en iyi çaba).
    try {
      const prev = storage.getItem(opts.key);
      if (prev && prev !== json && now() - lastBackupAt >= backupEveryMs) {
        JSON.parse(prev); // bozuk kaydı yedeğe koyma
        storage.setItem(opts.backupKey, prev);
        lastBackupAt = now();
      }
    } catch {
      try {
        storage.removeItem(opts.backupKey);
      } catch {
        /* yoksay */
      }
    }

    try {
      storage.setItem(opts.key, json);
      return true;
    } catch {
      for (const freeKey of [opts.backupKey, opts.corruptKey]) {
        try {
          storage.removeItem(freeKey);
          storage.setItem(opts.key, json);
          return true;
        } catch {
          /* sıradaki anahtarı boşalt */
        }
      }
      emit('quota');
      return false;
    }
  }

  function schedule(value: unknown): void {
    pending = { value };
    if (timer) clearTimeout(timer);
    if (debounceMs <= 0) {
      flush();
      return;
    }
    timer = setTimeout(flush, debounceMs);
  }

  return {
    load,
    schedule,
    flush,
    quarantineCurrent,
    unlock: () => {
      locked = false;
    },
    isLocked: () => locked,
    onError(cb: (kind: SaveErrorKind) => void) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    exportText(): string | null {
      try {
        return storage?.getItem(opts.key) ?? null;
      } catch {
        return null;
      }
    },
    parseImport(text: string): unknown | null {
      try {
        const v = JSON.parse(text);
        return isObject(v) ? v : null;
      } catch {
        return null;
      }
    },
  };
}

export const careerStore = createSaveStore(appStorage, {
  key: 'zm27_career_save_v7',
  backupKey: 'zm27_career_save_v7_bak',
  corruptKey: 'zm27_career_save_v7_corrupt',
  legacyKeys: ['zm27_career_save_v6'],
});
