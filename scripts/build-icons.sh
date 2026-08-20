#!/usr/bin/env bash
# アプリアイコン一式を assets/app/design/*.svg から生成し直す。
#
#   ./scripts/build-icons.sh
#
# 必要なもの: rsvg-convert (brew install librsvg) と ImageMagick 7 (brew install imagemagick)
#
# なぜスクリプトにしてあるか:
#   1024pxのアート1枚から、iOS用マスター・Androidアダプティブ前景・通知アイコンの
#   3種類を「それぞれ別の余白ルールで」書き出す必要があるため。手作業だと必ずずれる。
#
#   android/ と ios/ は .gitignore 済みの prebuild 生成物(Expo CNG)で、
#   ビルドのたびに assets/app/*.png から作り直される。つまり正本は assets/app/*.png。
#   このスクリプトが android/ 配下も更新するのは、prebuild を挟まずに
#   `npm run android` で確認したいときのため。無ければスキップする。
#
# ⚠️ ADAPTIVE_SCALE を上げすぎないこと。
#   Androidのアダプティブアイコンは108dpのうち中央72dp(66.7%)しか表示されない。
#   全面に描くとランチャーで外周が切り落とされる(2026-08まで実際にそうなっていた。
#   adaptive-foreground.png が icon-1024.png と同一で、吹き出しがほぼ消えていた)。
set -euo pipefail
cd "$(dirname "$0")/.."

ICON_SVG=assets/app/design/icon-source.svg
NOTI_SVG=assets/app/design/notification-source.svg
RES=android/app/src/main/res
BRAND='#F39800'
ADAPTIVE_SCALE=70   # 1024pxのアートを何%に縮めて中央に置くか
SPLASH_SCALE=69.4444  # 既存のsplashscreen_logo(800/1152)に合わせる

for cmd in rsvg-convert magick; do
  command -v "$cmd" >/dev/null || { echo "$cmd が見つかりません" >&2; exit 1; }
done

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

rsvg-convert -w 1024 -h 1024 "$ICON_SVG" -o "$TMP/icon.png"
rsvg-convert -w 1024 -h 1024 "$NOTI_SVG" -o "$TMP/noti.png"

# --- Expo が参照するマスター ---
magick "$TMP/icon.png" -background "$BRAND" -alpha remove -alpha off assets/app/icon-1024.png
magick "$TMP/icon.png" -resize ${ADAPTIVE_SCALE}% -background "$BRAND" -gravity center \
       -extent 1024x1024 -alpha remove -alpha off assets/app/adaptive-foreground.png
magick "$TMP/noti.png" -resize 96x96 assets/app/notification-icon.png

# --- ローカルの android/ にも反映(prebuild を挟まずに確認するとき用) ---
if [ ! -d "$RES" ]; then
  echo "android/ が無いのでスキップしました(prebuild時に assets/app/*.png から生成されます)"
  exit 0
fi
i=0
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  launcher=(48 72 96 144 192);      L=${launcher[$i]}
  foreground=(108 162 216 324 432); F=${foreground[$i]}
  notif=(24 36 48 72 96);           N=${notif[$i]}
  splash=(288 432 576 864 1152);    S=${splash[$i]}
  i=$((i + 1))

  magick "$TMP/icon.png" -resize ${L}x${L} -background "$BRAND" -alpha remove -alpha off \
         "$RES/mipmap-$d/ic_launcher.webp"

  # 旧API用の丸アイコン。中央72dp相当ではなく全面が円で切られるので、
  # アートを縮めてから円マスクを掛けないと外周が欠ける
  magick -size ${L}x${L} xc:none -fill white -draw "circle $((L/2)),$((L/2)) $((L/2)),0" "$TMP/mask-$L.png"
  magick "$TMP/icon.png" -resize ${ADAPTIVE_SCALE}% -background "$BRAND" -gravity center \
         -extent 1024x1024 -resize ${L}x${L} "$TMP/mask-$L.png" -compose DstIn -composite \
         "$RES/mipmap-$d/ic_launcher_round.webp"

  magick "$TMP/icon.png" -resize ${ADAPTIVE_SCALE}% -background "$BRAND" -gravity center \
         -extent 1024x1024 -resize ${F}x${F} -alpha remove -alpha off \
         "$RES/mipmap-$d/ic_launcher_foreground.webp"

  magick "$TMP/noti.png" -resize ${N}x${N} "$RES/drawable-$d/notification_icon.png"

  magick "$TMP/icon.png" -resize ${SPLASH_SCALE}% -background none -gravity center \
         -extent 1024x1024 -resize ${S}x${S} "$RES/drawable-$d/splashscreen_logo.png"
done

echo "生成しました。app.config.ts の adaptiveIcon.backgroundColor が $BRAND であることも確認すること"
