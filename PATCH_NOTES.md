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


## Karakter animasyonu ve rig (v4)
Kaynak: AI Studio'dan gelen `zephyr-manager-27.zip` (kök = senin son durumun; yamalar buna uygulandı. AI Studio'nun
eklediği rakip otomatik değişiklikleri ve gömülü fontlar korundu, `Math.random` kalmadı).

**Sorunun kökü**: dirsek ve baş eklemleri GLB'de vardı ama oyun kullanmıyordu (kollar düz sallanıyordu); diz bükülmesi
adım fazına yanlış oturuyordu; durumlar arası geçişte duruşlar sıçrıyordu; ayak yere bağlı değildi (havada/yere gömülü);
yüz dönüşü anlıktı; bekleyen oyuncu donuk duruyordu.

- `src/three/humanoidPose.ts` (yeni, saf matematik): gerçek koşu döngüsü (Fourier uydurması: basış → itiş → diz yukarı
  savrulma), dirsek bükülmeli ters kol sallanması, gövde eğimi/dönüşü, baş sabitleme, topallama, nefes alan bekleme +
  topa bakma, kaleci hazır duruşu, vuruş (gerilme→vuruş→takip), kafa vuruşu, kayarak müdahale, kaleci dalışı, gol
  sevinçleri. **İleri kinematik** ile ayak zemine oturtulur (`groundOffset`): havada/yere gömülü ayak yok.
- `humanoidBuilder.ts`: yeni eklemler `SpinePivot` (gövde bacaklardan bağımsız eğilir/döner), `ForearmL/RPivot`
  (dirsek), `HeadPivot`. GLB'yi yeniden üretmeden çalışma zamanında kurulur; hem GLB hem prosedürel rig'de aynı.
- `Match3DEngineCanvas.tsx`: eski `if/else` kemik açıları yerine durum → hedef poz → **sönümlü** uygulama. Yüz dönüşü
  en kısa yoldan yumuşak; adım uzunluğu hızla ölçeklenir (ayak kaymaz). Hakem de aynı sistemi kullanır.
- 14 yeni test (toplam 69): simetri, eklem sınırları, süreklilik, ayak/zemin teması, gövde salınımı <12 cm, ellerin
  gövdeye girmemesi, geçiş yumuşaklığı, vuruş geometrisi, dalış/kayma/diz çökme zemin kontrolleri.

**Dürüst not**: bu ortamda WebGL/ekran yok, yani poz matematiği test edildi ama görüntüyü gözle göremedim. Açıların
işaret kuralları `humanoidPose.ts` başında yazılı; bir uzuv ters dönüyorsa yalnızca `applyPoseToRig` içindeki işareti
değiştirmek yeter.


## Akıcılık, kamera, taktik (v5)
**30 FPS'in nedenleri ve çözümler** (`Match3DEngineCanvas.tsx`, `webglUtils.ts`):
- Yazılım-GL tespiti ("Software" kelimesi) yanlış pozitif verirse oyun 25 ms'lik GPU-çit döngüsüne düşüp ~30 FPS'e
  kilitleniyordu; tespit daraltıldı (yalnız SwiftShader/llvmpipe/softpipe/Basic Render).
- `calculateTacticalStrength` kare başına 2 kez çalışıyordu → 4 Hz önbellek (taktik değişince hemen yenilenir).
- Kamera **bakış noktası** topu anında izliyordu (titreme/kare kare his) → ayrı sönümleme.
- `perfGovernor.ts` (yeni, testli): kare süresini izler; 60 FPS tutmazsa kaliteyi kademeli düşürür (çözünürlük, gölge
  güncelleme sıklığı, spot ışık sayısı, kalabalık animasyonu), rahatken kullanıcının seçtiği seviyeye kadar tekrar çıkar,
  başarısız denemeden sonra salınım yapmamak için geç dener. 5 kademe.
- Oyuncu başına koşu tarzı (adım/kol/eğim farkı): herkes aynı anda aynı hareketi yapmaz.

**Kamera** (`cameraDirector.ts`, yeni, testli): yeni modlar **Takip, Yan Hat, Drone, Otomatik yönetmen** (şutta dinamik,
golde takip, aksi halde yayın; en az 2,5 sn tutar). **Kamera Ayarı** paneli: görüş açısı, yumuşaklık, mesafe,
sarsıntı aç/kapa, sıfırla; ayarlar kalıcı.

**Taktik** (`tacticPresets.ts`, yeni, testli): 6 hazır taktik (Tiki-Taka, Gegenpress, Kontra, Katı Savunma, Kontrol,
Son Hamle) ve **"Tahmini etki"** paneli (hücum/savunma/orta saha, yaratılan/yenilen şans, ek yorgunluk; değerler
maç motoru tablolarından türetilir).

84 test geçiyor. Gerçek cihazda kare hızını ben ölçemedim: yönetici otomatik ayarlıyor ama ilk deneme sende.


## Araştırma turu (v6)
**Hata düzeltmesi (kendi regresyonum):** `audio.ts`'te `Math.random` yerine eklediğim `noise()` yardımcısı, aynı isimli
yerel `AudioBufferSourceNode` değişkenleri tarafından gölgelendiği için iki ses efekti çalınırken hata verirdi
(`noise is not a function`). Yardımcı `audioRand` olarak yeniden adlandırıldı. Tüm `engine/` strict tip denetiminden
temiz geçiyor; regresyonu yakalayan kaynak-koruma testleri eklendi (`sourceGuards.test.ts`: Math.random yasağı,
audio gölgeleme, istatistik yardımcılarının tanım sırası).

**Maç Analizi (yeni):** 3D maç artık oyuncu bazlı istatistik ve şut kaydı topluyor (gol, asist, şut, isabet, xG, pas
isabeti, savunma müdahalesi, kurtarış, süre). `matchAnalysis.ts` bunları FM tarzı **3.0–10.0 oyuncu puanına**
çevirir (kısa süre oynayana ayarlı, kaleci/defans/orta saha/forvet farklı ağırlık) ve **Maçın Adamı** seçer. Maç sonu
ekranında yeni kart: **Oyuncu Puanları** ve **Şut Haritası** (xG büyüklüğünde noktalar; gol/kurtarış/direk ayrımı).
Testler: puan monotonluğu, hat-trick ≥9.5, clean-sheet defans ≥7.5, kaleci, kısa süre, MOTM eşitlik kuralı.

93 test geçiyor.


## Açılış sekansı ve marka (v7)
- **Açılış ekranı** (`SplashScreen`): yüklediğin iki logo ile **Zephyr Studio → Zephyr Manager** sırasıyla yumuşakça belirir
  ve kaybolur (~5,2 sn), ardından ana menü. Dokunma/Enter/Boşluk/Esc ile atlanır; Android geri tuşu da atlar.
  Görseller yüklenmeden başlamaz, görsel kenarları vinyet maskesiyle zemine kaynaşır, zemin rengi iki logo arasında
  geçiş yapar, "hareketi azalt" ayarına saygı duyar. Zaman çizelgesi saf mantık (`introTimeline.ts`, 6 test).
- **Uygulama simgeleri**: `pwa-192/512`, `maskable`, `apple-touch-icon`, `favicon.ico`, `icon.svg` yeni kalkan logosundan
  üretildi. Logolar `public/brand/` altında (1024 px, ~50 KB'lık JPEG).
- **Android launcher simgesi ve yerel açılış görseli**: `scripts/make-android-icons.py` (CI'da `cap add android`'den
  sonra çalışır): tüm yoğunluklarda simge, yuvarlak simge, adaptive ön plan, lacivert zemin ve Capacitor logosu yerine
  lacivert + kalkan yerel açılış görseli. Betik sahte `res` klasöründe test edildi; gerçek `cap add android` çıktısıyla
  CI'da ilk kez çalışacak.
- 99 test geçiyor.


## Gol tekrarı (v8)
- `replayBuffer.ts` (yeni, 6 test): halka tamponu son ~600 kareyi (top + 22 oyuncunun konum/yön/tam poz) tutar; gol anında son
  3,6 saniye kopyalanır ve **0,7x yavaş çekimde** oynatılır (kareler arası doğrusal, açılar en kısa yoldan).
- Canvas: gol kutlaması bitince (3,4 sn) simülasyon durur, "TEKRAR" bandıyla yan çizgi kamerasından tekrar oynar,
  ardından canlı maç kaldığı yerden devam eder (canlı konum/durum tekrar sırasında hiç değişmez; yalnız görüntü).
  Tekrar x4 hızda, 89. dakikadan sonra ve ayar kapalıyken atlanır.
- Kamera Ayarı paneline **Gol Tekrarı: Açık/Kapalı** anahtarı eklendi (kalıcı).
- 105 test geçiyor. Gerçek maçta henüz denenmedi: tekrar süresini veya hızını beğenmezsen `REPLAY_SECONDS` / `REPLAY_SPEED`
  (Match3DEngineCanvas.tsx) değiştirmek yeter.


## Siteden APK indirme (v9)
Bkz. `YAYIN_REHBERI.md`. APK siteye gömülmez; **GitHub Releases**'ten okunur.
- Eski pencere kullanıcıya "Android Studio ile kendin derle" diyordu → **gerçek indirme bölümü** (`ApkDownloadSection`):
  son sürüm no, boyut, notlar, SHA-256, **APK'yı İndir** düğmesi, 3 adımlık kurulum, hata/yayın-yok durumları, iPhone'da gizli.
- Paylaşılabilir bağlantı: `site/#indir` pencereyi otomatik açar. Ayarlar tek yerde: `src/config/downloads.ts`.
- **APK içinde** düğme gizlenir; bunun yerine yeni sürüm yayınlandıysa küçük **"Yeni sürüm hazır"** bandı çıkar (`UpdateBanner`,
  yüklü sürüm `@capacitor/app` ile okunur, kapatılan sürüm hatırlanır).
- CI: `workflow_dispatch` → **publish** kutusuyla APK otomatik Release olur. `build:cap` dist/downloads'taki APK/ZIP'i temizler.
- `releaseInfo.ts` (5 test): sürüm karşılaştırma (27.14 > 27.9), APK seçimi, boyut/not biçimlendirme. 111 test geçiyor.
- Henüz Release yayınlanmadıysa site "APK henüz yayınlanmadı" gösterir (yanlış bağlantı vermez).
