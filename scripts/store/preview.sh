#!/usr/bin/env bash
# 目視確認用のプレビューを作る。
#
#   ./scripts/store/preview.sh            # out/ の一覧と「検索結果風の3枚並び」→ out/preview-*.png
#   ./scripts/store/preview.sh props      # props/candidates と props の一覧 → out/preview-props.png
#   ./scripts/store/preview.sh screens    # 撮った実画面の一覧(広告や Test Ad の写り込みを目で確認する)
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=store-assets/out
mkdir -p "$OUT"
shopt -s nullglob

case "${1:-out}" in
  props)
    files=(store-assets/props/candidates/*.png store-assets/props/*.png)
    magick montage "${files[@]}" -tile 6x -geometry 300x300+10+10 -background '#F5824E' -label '%f' -pointsize 14 "$OUT/preview-props.png"
    echo "$OUT/preview-props.png";;
  screens)
    for p in android ios ipad; do
      files=(store-assets/screens/$p/*.png)
      [ ${#files[@]} -eq 0 ] && continue
      magick montage "${files[@]}" -tile 7x1 -geometry 300x+8+8 -background '#ddd' -label '%f' -pointsize 14 "$OUT/preview-screens-$p.png"
      echo "$OUT/preview-screens-$p.png"
    done;;
  *)
    for p in play ios ipad; do
      files=("$OUT"/$p-[0-9].png)
      [ ${#files[@]} -eq 0 ] && continue
      magick montage "${files[@]}" -tile 7x1 -geometry 300x+8+8 -background '#ddd' "$OUT/preview-$p.png"
      # ストアの検索結果に出る 1〜3 枚目を、スマホ実寸相当(1枚 ≈ 236px 幅)まで縮めて並べる
      magick montage "${files[@]:0:3}" -tile 3x1 -geometry 236x+4+0 -background white "$OUT/preview-search-$p.png"
      echo "$OUT/preview-$p.png  $OUT/preview-search-$p.png"
    done
    [ -f "$OUT/feature-graphic.png" ] && echo "$OUT/feature-graphic.png";;
esac
