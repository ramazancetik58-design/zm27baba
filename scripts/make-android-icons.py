#!/usr/bin/env python3
"""Capacitor'un `cap add android` ile ürettiği varsayılan simge ve açılış görsellerini Zephyr Manager ile değiştirir.

Kullanım: python3 scripts/make-android-icons.py android/app/src/main/res
Kaynaklar: resources/icon-source.png (kare simge), resources/icon-foreground.png (şeffaf kalkan).
"""
import glob
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = sys.argv[1] if len(sys.argv) > 1 else "android/app/src/main/res"
NAVY = (10, 28, 50)
NAVY_HEX = "#0A1C32"

src = Image.open(os.path.join(ROOT, "resources/icon-source.png")).convert("RGB")
fg = Image.open(os.path.join(ROOT, "resources/icon-foreground.png")).convert("RGBA")

DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}


def round_mask(size: int) -> Image.Image:
    m = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    return m.resize((size, size), Image.LANCZOS)


written = []
for name, size in DENSITIES.items():
    folder = os.path.join(RES, f"mipmap-{name}")
    os.makedirs(folder, exist_ok=True)
    legacy = src.resize((size, size), Image.LANCZOS)
    legacy.save(os.path.join(folder, "ic_launcher.png"))
    rnd = legacy.convert("RGBA")
    rnd.putalpha(round_mask(size))
    rnd.save(os.path.join(folder, "ic_launcher_round.png"))
    fsz = round(size * 108 / 48)  # adaptive ikon tuvali 108dp
    fg.resize((fsz, fsz), Image.LANCZOS).save(os.path.join(folder, "ic_launcher_foreground.png"))
    written.append(folder)

# Adaptive ikon tanımları: zemin = lacivert renk, ön plan = kalkan (PNG).
adaptive = (
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
    '    <background android:drawable="@color/ic_launcher_background"/>\n'
    '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
    "</adaptive-icon>\n"
)
any_dir = os.path.join(RES, "mipmap-anydpi-v26")
os.makedirs(any_dir, exist_ok=True)
for n in ("ic_launcher.xml", "ic_launcher_round.xml"):
    with open(os.path.join(any_dir, n), "w", encoding="utf-8") as f:
        f.write(adaptive)

os.makedirs(os.path.join(RES, "values"), exist_ok=True)
with open(os.path.join(RES, "values/ic_launcher_background.xml"), "w", encoding="utf-8") as f:
    f.write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{NAVY_HEX}</color>\n</resources>\n')

# Eski vektör ön plan/zemin (varsa) artık kullanılmıyor: çakışmasın diye kaldır.
for stale in glob.glob(os.path.join(RES, "drawable*/ic_launcher_foreground.xml")) + glob.glob(os.path.join(RES, "drawable*/ic_launcher_background.xml")):
    os.remove(stale)

# Yerel açılış görseli (WebView açılmadan önce): lacivert zemin + ortada kalkan, mevcut boyutlar korunur.
splashes = glob.glob(os.path.join(RES, "drawable*/splash.png"))
for path in splashes:
    with Image.open(path) as im:
        w, h = im.size
    canvas = Image.new("RGB", (w, h), NAVY)
    side = int(min(w, h) * 0.42)
    logo = fg.resize((side, side), Image.LANCZOS)
    canvas.paste(logo, ((w - side) // 2, (h - side) // 2), logo)
    canvas.save(path)

print(f"simgeler: {len(written)} yoğunluk, açılış görseli: {len(splashes)} dosya")
