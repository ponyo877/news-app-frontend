#!/usr/bin/env bash
# store-assets/out/ の出力がストアに上げられる状態かを機械的に検査する。
#
#   ./scripts/store/verify.sh
#
# 検査項目:
#   - 寸法(play 1080x1920 / ios 1320x2868 / ipad 2064x2752 / feature-graphic 1024x500)
#   - アルファ無し(channels=srgb, opaque=True)。ストアは透過 PNG を受け付けない
#   - 上端 24 行の平均輝度 ≥ 0.60(黒帯の回帰ガード。ピーチ地は ≈0.70、旧黒帯は ≈0.45。
#     旧 build-store-screenshots.sh は影マスクを -roll で巡回させて上端を 42% 暗くしていた)
#   - 左上ピクセルが背景色 #FCC3A8 ±3(色プロファイル変換の混入検知)
#   - ファイルサイズ 8MB 以下(Play の上限)
#   - manifest.json の文字領域 ≤ 20%(フィーチャーグラフィックは対象外)/ 画面の可視率 ≤ 75% / フォント検証済み
set -uo pipefail
cd "$(dirname "$0")/../.."
OUT=store-assets/out
fail=0
ng () { echo "  ✗ $1"; fail=$((fail+1)); }

expect_size () {
  case "$1" in
    play-*) echo 1080x1920 ;; ios-*) echo 1320x2868 ;; ipad-*) echo 2064x2752 ;; feature-graphic) echo 1024x500 ;;
    *) echo "" ;;
  esac
}

shopt -s nullglob
files=("$OUT"/play-[0-9].png "$OUT"/ios-[0-9].png "$OUT"/ipad-[0-9].png "$OUT"/feature-graphic.png)
[ ${#files[@]} -eq 0 ] && { echo "出力が無い。先に node scripts/store/build.mjs を実行する"; exit 1; }

for f in "${files[@]}"; do
  name=$(basename "$f" .png)
  echo "$name"
  read -r w h opaque <<<"$(magick identify -format '%w %h %[opaque]' "$f")"
  ch=$(magick identify -format '%[channels]' "$f" | awk '{print $1}')   # 版によって "srgb 3.0" の2トークンで返る
  want=$(expect_size "$name")
  [ "${w}x${h}" = "$want" ] || ng "寸法 ${w}x${h}(期待 $want)"
  [ "$ch" = "srgb" ] || ng "チャンネル $ch(アルファが残っている)"
  [ "$opaque" = "True" ] || ng "透過ピクセルがある"
  mean=$(magick "$f" -gravity north -crop 100%x24+0+0 +repage -colorspace Gray -format '%[fx:mean]' info:)
  awk -v m="$mean" 'BEGIN{exit !(m>=0.60)}' || ng "上端の平均輝度 $mean < 0.60(黒帯)"
  read -r pr pg pb <<<"$(magick "$f" -format '%[fx:int(255*p{4,4}.r)] %[fx:int(255*p{4,4}.g)] %[fx:int(255*p{4,4}.b)]' info:)"
  if [ "$name" != "feature-graphic" ]; then
    ok=1; for pair in "$pr:252" "$pg:195" "$pb:168"; do v=${pair%%:*}; e=${pair##*:}; d=$((v-e)); [ ${d#-} -le 3 ] || ok=0; done
    [ $ok = 1 ] || ng "左上の色 rgb($pr,$pg,$pb) が #FCC3A8 からずれている"
  fi
  bytes=$(stat -f %z "$f")
  [ "$bytes" -le $((8*1024*1024)) ] || ng "サイズ $((bytes/1024/1024))MB > 8MB"
  if [ -f "$OUT/manifest.json" ]; then
    python3 - "$OUT/manifest.json" "$name" <<'PY' || fail=$((fail+1))
import json, sys
m = json.load(open(sys.argv[1])).get(sys.argv[2])
if not m: print("  ✗ manifest に無い(build.mjs で作り直す)"); sys.exit(1)
bad = []
if m["devices"] and m["textAreaRatio"] > 0.20: bad.append(f"文字領域 {m['textAreaRatio']*100:.1f}% > 20%")
for d in m["devices"]:
    if d["visible"] > 0.75: bad.append(f"可視率 {d['visible']*100:.0f}% > 75%")
if not m["fontsChecked"]: bad.append("フォント未検証")
for b in bad: print("  ✗ " + b)
sys.exit(1 if bad else 0)
PY
  fi
done
echo
if [ $fail -gt 0 ]; then echo "NG: $fail 件"; exit 1; else echo "OK: ${#files[@]} 枚すべて合格"; fi
