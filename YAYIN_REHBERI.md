# APK'yı siteden indirilebilir yapma (zephyrmanager27.ai.studio)

APK dosyası sitenin içine konmaz; **GitHub Releases**'te durur. Sitedeki "Mobil / APK Kurulumu" penceresi son sürümü oradan
okur (sürüm no, boyut, notlar, SHA-256) ve **APK'yı İndir** düğmesini gösterir. Yeni sürümü yayınlayınca site kendiliğinden güncellenir.

Paylaşılacak doğrudan bağlantı: **https://zephyrmanager27.ai.studio/#indir** (pencere kendiliğinden açılır).

## Telefondan elle yayınlama (en kolay)
1. GitHub'da `ramazancetik58-design/zm27baba` → **Releases** → **Draft a new release**.
2. **Choose a tag** kutusuna `v27.1` yaz → **Create new tag**.
3. Başlık: `Zephyr Manager 27 — v27.1`. Açıklamaya 2-3 satır yenilik yaz (sitede gösterilir).
4. Dosya ekle: APK'yı **`zm27.apk`** adıyla yükle.
5. **Set as the latest release** işaretli olsun → **Publish release**.

Sonraki sürümde etiketi artır (`v27.2` …). Uygulama içindeki "Yeni sürüm hazır" bandı bu etiketi yüklü sürümle karşılaştırır.

## Otomatik (GitHub Actions)
Actions → **Build Android APK** → **Run workflow** → **publish** kutusunu işaretle. APK derlenir ve `v27.<sıra>` etiketiyle yayınlanır.

## Önemli
- **İmza anahtarı**: Her derlemede farklı debug anahtarı kullanılırsa telefon yeni APK'yı eskisinin üstüne kurmaz (kayıtlar silinir).
  Repo **Settings → Secrets**'a `KEYSTORE_B64`, `KEYSTORE_PASS`, `KEY_ALIAS` ekleyin; workflow APK'yı hep aynı anahtarla imzalar.
- Kurulum sırasında Android "bilinmeyen kaynak" ve Play Protect uyarısı gösterir; pencerede adımları yazıyor.
- Resmi kulüp adı/arması içeren bir oyunu herkese açık dağıtırken lisans/marka riski olabilir (oyunda Lisans Modu var).
- APK'yı `public/downloads/` içine koyarsanız `npm run build:cap` onu APK'nın içine almaz (`prune-cap-dist.mjs`), ama site paketi şişer; Releases önerilir.
