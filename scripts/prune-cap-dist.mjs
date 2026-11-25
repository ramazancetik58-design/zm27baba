// Capacitor derlemesinde dist/downloads altındaki APK/ZIP dosyaları APK'nın içine girmesin (APK içinde APK olmaz).
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'dist', 'downloads');
if (existsSync(dir)) {
  for (const f of readdirSync(dir)) {
    if (/\.(apk|aab|zip)$/i.test(f)) {
      rmSync(join(dir, f));
      console.log('dist/downloads/' + f + ' silindi (Capacitor derlemesi)');
    }
  }
}
