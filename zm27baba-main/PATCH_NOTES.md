# ZM27 yama notları

## Düzeltilenler
1. **Kayıt kaybı (kritik)** — `src/engine/saveStore.ts`: bozuk kayıt artık üzerine yazılmaz, `*_corrupt` anahtarına
   kopyalanır; ana -> yedek -> v6 sırasıyla yüklenir; yazma debounce'lu; `pagehide`/`visibilitychange`'de flush;
   kota hatası kullanıcıya bildirilir; kayıt yuvası yazılamazsa uyarı verilir.
2. **Tohumlu RNG** — `src/engine/rng.ts`. Maç kararları (3D motor), AI maçları, sakatlık, tıbbi müdahale, gişe ve
   ses gürültüsündeki tüm `Math.random` kaldırıldı. Maç tohumu: `hafta:ev:deplasman`.
3. **Yedek paneli** — Kayıt Yuvaları ekranına "Yedeği Dışa Aktar / Yedekten Yükle" eklendi.
4. **ErrorBoundary** — ekran çökerse beyaz ekran yerine kurtarma ekranı.
5. **Derleme** — Capacitor bağımlılıkları eklendi, kullanılmayan `express/dotenv/@google/genai/motion` çıkarıldı,
   Capacitor derlemesinde PWA/service worker kapalı (`npm run build:cap`), `dev-dist/` silindi.
6. **APK otomasyonu** — `.github/workflows/build-apk.yml` (GitHub Actions). `npm test` + derleme + APK.
7. **Boyut** — kullanılmayan ~11 MB görsel `public/` dışına (`design-refs/`) taşındı; APK'ya girmez.
8. **Testler** — `npm test` (tsx + node:test): 29 mevcut + 8 yeni test.

## Maç motoru güncellemesi (v2)
- **`src/engine/matchEngine.ts`** — saf, tohumlu dakika-dakika motor: topla oynama, xG, kaleci etkisi, **momentum**,
  **yorgunluk** (stamina/pres/tempo/hava), **kart** (sarı→kırmızı, direkt kırmızı), **sakatlık**, oyun içi **oyuncu
  değişikliği** (en fazla 5), skor durumuna göre taktik kayması, ev sahibi avantajı, hava durumu, **PPDA**.
  Kalibrasyon (1500 maç, eşit takımlar): ~2,66 gol, ~24 şut, xG ~2,7, ev galibiyeti %46, beraberlik %25, ~2,1 sarı kart.
- **`src/engine/aiMatch.ts`** — AI kulüp maçları artık bu motorla oynanıyor (eski gol tahmini yerine). Gerçek xG,
  şut, topla oynama, golcü ve asist üretir; takım gücü `calculateTacticalStrength`'ten gelir. Yeni testler: 45 test geçiyor.
- **Android** — `@capacitor/app` ile geri tuşu (maçta kapalı, menüde çıkış, ana ekranda çift basış) ve arka plana
  geçişte kayıt boşaltma + ses durdurma (`src/native/androidLifecycle.ts`). Tarayıcıda hiçbir şey yapmaz.
- **3D canlı maç (v3)** — fizik/animasyon aynen duruyor; sonuç kararları artık ortak `shotModifiers` ile veriliyor:
  şutu çeken oyuncunun OVR'ı, anlık kondisyonu, rakip kalecinin gücü ve **momentum** gol/xG olasılığını etkiler
  (çarpanların ortalaması ≈1, yani maç dengesi korunur). Canlı **PPDA** ve **momentum çubuğu** devre arası istatistiğinde.
- **Canlı değişiklik penceresi** zaten vardı (5 hak); sakat veya <%62 kondisyonlu oyuncu için **"ÖNERİLEN ÇIKIŞ"** rozeti eklendi.
- **Kayıt: IndexedDB (v3)** — `src/engine/appStorage.ts`. Kariyer ve kayıt yuvaları artık IndexedDB'de (5 MB sınırı yok).
  Açılışta (`main.tsx`) belleğe alınır; ilk açılışta eski localStorage kayıtları otomatik taşınır, eskiler silinmez.
  IndexedDB yoksa localStorage'a düşer. 54 test geçiyor.

## Yapılmadı / dikkat
- `android-project/` (Kotlin iskeleti, `applicationId com.zephyr.manager27.hardcore`) derlenemez ve kullanılmıyor.
  APK `capacitor.config.ts`'teki `com.zephyrmanager27.game` ile üretilir. Karışıklık yaratıyorsa silin.
- Google Fonts hâlâ internetten geliyor; çevrimdışı için `public/fonts/` altına woff2 koyup `index.html`'i güncelleyin.
- Maç mantığı hâlâ `Match3DEngineCanvas.tsx` içinde (yalnızca RNG tohumlandı). Ayrı motora taşımak sonraki adım.
- Burada `npm install`/`vite build` çalıştırılamadı (ağ kapalı): testler ve sözdizimi doğrulandı, tam derleme CI'da denenmeli.

## Güncelleme kurulumu (önemli)
Telefondaki mevcut APK farklı bir anahtarla imzalıysa yeni APK üstüne kurulmaz. Önce **Kayıt Yuvaları > Yedeği
Dışa Aktar** ile yedek alın, eskiyi silin, yenisini kurun, **Yedekten Yükle** deyin. Bundan sonra için GitHub
Secrets'a `KEYSTORE_B64`, `KEYSTORE_PASS`, `KEY_ALIAS` ekleyip hep aynı anahtarla imzalatın.
