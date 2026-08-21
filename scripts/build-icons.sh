#!/usr/bin/env bash
# アプリアイコン一式を assets/app/design/icon-master.png から生成し直す。
#
#   ./scripts/build-icons.sh
#
# 必要なもの: ImageMagick 7 (brew install imagemagick)
#
# 原本について:
#   icon-master.png は「角丸なし・余白なしの全面塗り」であること。
#   受け取ったデザインが角丸+白余白つきだった場合は、先に角丸の外側を
#   背景グラデーションで埋めて全面塗りに直す(手順は docs/ASO-SCREENSHOTS.md)。
#   角丸を焼き込んだまま入れると、iOS/Android がさらにマスクを掛けるので
#   二重に丸まり、角に白が残る。
#
# ⚠️ ADAPTIVE_SCALE を上げすぎないこと。
#   Androidのアダプティブアイコンは108dpのうち中央72dp(66.7%)しか表示されない。
#   全面に描くとランチャーで外周が切り落とされる(2026-08まで実際にそうなっていた。
#   adaptive-foreground.png が icon-1024.png と同一で、吹き出しがほぼ消えていた)。
#   外周の余白は端の色を伸ばして埋めるので、視差で少し見えても違和感が出ない。
set -euo pipefail
cd "$(dirname "$0")/.."

MASTER=assets/app/design/icon-master.png
RES=android/app/src/main/res
ADAPTIVE_SCALE=70   # デザインを何%に縮めて中央に置くか
# 通知アイコンの切り出ししきい値。白い吹き出し(彩度3%前後)と
# オレンジの背景(彩度28%以上)を分ける。デザインを差し替えたら実測し直すこと
SAT_THRESHOLD=13%

command -v magick >/dev/null || { echo "magick が見つかりません" >&2; exit 1; }

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# --- Expo が参照するマスター ---
magick "$MASTER" -alpha off -resize 1024x1024 assets/app/icon-1024.png

# 縮めたうえで、外周は端の画素を伸ばして埋める(-virtual-pixel edge)。
# viewport に負のオフセットを渡す書き方は効かなかったので、
# SRT で「元画像の中心を出力の中心へ」写す形にしている(中心がずれていないか
# 生成後に必ず確認すること。ずれるとランチャーで片側だけ切れる)
SMALL=$(( 1024 * ADAPTIVE_SCALE / 100 ))
magick "$MASTER" -resize 1024x1024 -resize ${ADAPTIVE_SCALE}% \
  -virtual-pixel edge -set option:distort:viewport 1024x1024 \
  -distort SRT "$((SMALL / 2)),$((SMALL / 2)) 1 0 512,512" \
  -alpha off assets/app/adaptive-foreground.png

# 通知アイコンは白のシルエットのみ。Androidはalphaしか見ないので、
# 吹き出しの中の線は「透明」で表現される必要がある。
# 白い吹き出しだけを彩度で抜き出すと、オレンジの線が自動的に穴になる
magick "$MASTER" -colorspace HSB -channel G -separate -alpha off \
  -threshold "$SAT_THRESHOLD" -negate \
  -morphology Close Disk:8 -morphology Open Disk:6 \
  "$TMP/bubbles.png"
magick "$TMP/bubbles.png" -fuzz 1% -trim +repage -resize 88x88 \
  -background black -gravity center -extent 96x96 \
  -alpha copy -fill white -colorize 100% assets/app/notification-icon.png

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

  magick assets/app/icon-1024.png -resize ${L}x${L} -alpha off "$RES/mipmap-$d/ic_launcher.webp"

  # 旧API用の丸アイコン。全面が円で切られるので、縮めた版に円マスクを掛ける
  magick -size ${L}x${L} xc:black -fill white -draw "circle $((L/2)),$((L/2)) $((L/2)),0" \
    -alpha off "$TMP/mask-$L.png"
  magick -size ${L}x${L} xc:white \
    \( assets/app/adaptive-foreground.png -resize ${L}x${L} \) \
    "$TMP/mask-$L.png" -composite "$RES/mipmap-$d/ic_launcher_round.webp"

  magick assets/app/adaptive-foreground.png -resize ${F}x${F} -alpha off \
    "$RES/mipmap-$d/ic_launcher_foreground.webp"

  magick assets/app/notification-icon.png -resize ${N}x${N} "$RES/drawable-$d/notification_icon.png"

  # スプラッシュは白地に置くので、アイコンを縮めて透明余白を付けた形にする
  magick assets/app/icon-1024.png -resize 69.4444% -background none -gravity center \
    -extent 1024x1024 -resize ${S}x${S} "$RES/drawable-$d/splashscreen_logo.png"
done

echo "生成しました。app.config.ts の adaptiveIcon.backgroundColor も確認すること"
