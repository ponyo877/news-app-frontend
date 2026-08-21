#!/usr/bin/env bash
# ストア用スクリーンショットを合成する。
#
#   ./scripts/build-store-screenshots.sh
#
# 必要なもの: ImageMagick 7
#
# 素材:
#   store-assets/bg/*.png      … scenario.com で生成した背景(scripts/gen-store-bg.py)
#   store-assets/screens/*.png … 実機/エミュレータで撮った実画面
#
# ⚠️ 実画面は必ず本物を使うこと。ストアのスクリーンショットは
#   アプリの実際の表示でなければならない(Play/App Store 双方の規定)。
#   AIに画面まで描かせない。日本語のコピーもAIに描かせない(字形が崩れる)。
#
# ⚠️ 画面下部を意図的に画面外へはみ出させている。
#   バナー広告とタブバーを写さないため(AdMob違反時のUIと誤解されるのを避ける)。
set -euo pipefail
cd "$(dirname "$0")/.."

BG=store-assets/bg
SC=store-assets/screens
OUT=store-assets/out
FONT_BOLD='.Hiragino-Kaku-Gothic-Interface-W8'
FONT_MED='.Hiragino-Kaku-Gothic-Interface-W5'
INK='#3B2016'
INK_SUB='#7A4A2E'

mkdir -p "$OUT"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# 1枚合成する: compose <背景> <実画面> <見出し> <サブ> <幅> <高さ> <出力>
compose () {
  local bg=$1 screen=$2 head=$3 sub=$4 W=$5 H=$6 out=$7

  # 版面(1080x1920を基準に比率で置く)
  local DEVW=$(( W * 800 / 1080 ))
  local DEVX=$(( (W - DEVW) / 2 ))
  local DEVY=$(( H * 560 / 1920 ))
  local HEADY=$(( H * 300 / 1920 ))
  local SUBY=$(( H * 425 / 1920 ))
  local HEADPT=$(( W * 84 / 1080 ))
  local SUBPT=$(( W * 38 / 1080 ))
  # 日本語は全角なので「1文字≒1ポイント幅」で見積もる。
  # 長い見出しは自動で縮める(固定サイズだと画面外へはみ出す)
  local HEADCHARS; HEADCHARS=$(printf '%s' "$head" | wc -m | tr -d ' ')
  local HEADFIT=$(( W * 86 / 100 / HEADCHARS ))
  [ "$HEADFIT" -lt "$HEADPT" ] && HEADPT=$HEADFIT
  local SUBCHARS; SUBCHARS=$(printf '%s' "$sub" | wc -m | tr -d ' ')
  local SUBFIT=$(( W * 80 / 100 / SUBCHARS ))
  [ "$SUBFIT" -lt "$SUBPT" ] && SUBPT=$SUBFIT
  local RADIUS=$(( DEVW * 6 / 100 ))

  magick "$bg" -resize "${W}x${H}^" -gravity center -extent "${W}x${H}" "$TMP/bg.png"
  magick "$screen" -resize "${DEVW}x" "$TMP/dev.png"
  local DEVH; DEVH=$(magick "$TMP/dev.png" -format '%h' info:)

  # 端末の角丸マスクを版面サイズに配置(アルファを使わず、白黒マスクで合成する)
  magick -size "${DEVW}x${DEVH}" xc:black -fill white \
    -draw "roundrectangle 0,0 $((DEVW-1)),$((DEVH-1)) ${RADIUS},${RADIUS}" -alpha off "$TMP/dmask.png"
  magick -size "${W}x${H}" xc:black "$TMP/dmask.png" -geometry "+${DEVX}+${DEVY}" -composite -alpha off "$TMP/maskfull.png"
  magick -size "${W}x${H}" xc:black "$TMP/dev.png"   -geometry "+${DEVX}+${DEVY}" -composite -alpha off "$TMP/devfull.png"

  # 影: マスクをぼかして下へずらし、その分だけ背景を暗くする
  magick "$TMP/maskfull.png" -blur "0x$(( W * 26 / 1080 ))" -roll "+0+$(( H * 18 / 1920 ))" -alpha off "$TMP/shadow.png"
  magick "$TMP/bg.png" \( "$TMP/bg.png" -fill black -colorize 42% \) "$TMP/shadow.png" -composite "$TMP/bgs.png"

  # 端末を置く
  magick "$TMP/bgs.png" "$TMP/devfull.png" "$TMP/maskfull.png" -composite "$TMP/stage.png"

  # 文字は後乗せ(AIに日本語を描かせない)
  magick "$TMP/stage.png" \
    -font "$FONT_BOLD" -pointsize "$HEADPT" -fill "$INK" \
    -gravity north -annotate "+0+${HEADY}" "$head" \
    -font "$FONT_MED" -pointsize "$SUBPT" -fill "$INK_SUB" \
    -gravity north -annotate "+0+${SUBY}" "$sub" \
    "$out"
  echo "  $out"
}

# 見出しは3〜10字、サブは1行。検索結果に出るのは最初の1〜3枚
build_all () {
  local W=$1 H=$2 tag=$3
  compose "$BG/01-listen.png"  "$SC/tts.png"     '読まずに、聴く。'        '通勤中も作業中も、耳だけでスレを追える'      "$W" "$H" "$OUT/${tag}-1.png"
  compose "$BG/02-detect.png"  "$SC/matsuri.png" '盛り上がってるスレが、わかる。' '複数のサイトが同じ話題を扱うと自動で検知' "$W" "$H" "$OUT/${tag}-2.png"
  compose "$BG/03-clean.png"   "$SC/article.png" '本文だけが、すっと出る。'    'Cookieの確認も、重なってくる表示もなし'   "$W" "$H" "$OUT/${tag}-3.png"
  compose "$BG/04-sites.png"   "$SC/sites.png"   'まとめサイトを、ひとつに。'   '読みたいサイトだけを選んで表示できる'      "$W" "$H" "$OUT/${tag}-4.png"
  compose "$BG/05-ranking.png" "$SC/ranking.png" '今日いちばん読まれたスレ。'   '日間・週間・月間のランキングと検索'       "$W" "$H" "$OUT/${tag}-5.png"
  compose "$BG/06-foryou.png"  "$SC/foryou.png"  '読むほど、好みに寄る。'     'あなた向けのおすすめと、記事ごとの関連'     "$W" "$H" "$OUT/${tag}-6.png"
}

echo "Play (1080x1920):"
build_all 1080 1920 play
echo "App Store 6.5インチ (1284x2778):"
build_all 1284 2778 ios

# Play のフィーチャーグラフィック(1024x500)。文字は左半分に置く
echo "フィーチャーグラフィック:"
magick "$BG/feature-graphic.png" -resize '1024x500^' -gravity center -extent 1024x500 "$TMP/fg.png"
magick "$TMP/fg.png" \
  -font "$FONT_BOLD" -pointsize 88 -fill "$INK" -gravity west -annotate '+56-52' 'まとめくん' \
  -font "$FONT_MED" -pointsize 34 -fill "$INK_SUB" -gravity west -annotate '+60+30' '2ch・5chまとめを、読み上げでながら聴き' \
  -font "$FONT_MED" -pointsize 30 -fill "$INK_SUB" -gravity west -annotate '+60+86' '話題検知・ランキング・サイト横断' \
  "$OUT/feature-graphic.png"
echo "  $OUT/feature-graphic.png"
