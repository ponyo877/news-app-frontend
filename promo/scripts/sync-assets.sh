#!/bin/sh
# ルート(アプリ)の生成物を promo/public/ に同期する。
#   フォント: アプリ本文と同じ M PLUS Rounded 1c(OFL) — Remotion 側から ../src を import しない
#   アイコン: assets/app/icon-1024.png
#   装飾:     store-assets/props/*.png(scenario.com で生成した透過 PNG。スクショ v2 と同じ素材)
#   音源:     Totalizer の promo から bgm / sfx-tap / sfx-pop をコピー(README の台帳参照。再配布不可なので git 管理外)
set -eu
cd "$(dirname "$0")/.."
FONTS=../node_modules/@expo-google-fonts/m-plus-rounded-1c
mkdir -p public/fonts public/brand public/props public/audio
cp "$FONTS/500Medium/MPLUSRounded1c_500Medium.ttf" public/fonts/
cp "$FONTS/700Bold/MPLUSRounded1c_700Bold.ttf" public/fonts/
cp "$FONTS/900Black/MPLUSRounded1c_900Black.ttf" public/fonts/
cp ../assets/app/icon-1024.png public/brand/icon.png
cp ../store-assets/props/*.png public/props/

AUDIO_SRC=${PROMO_AUDIO_SRC:-../../github.com/ponyo877/totalizer-mobile/promo/public/audio}
for f in bgm.mp3 sfx-tap.mp3 sfx-pop.mp3; do
  if [ -f "public/audio/$f" ]; then continue; fi
  if [ -f "$AUDIO_SRC/$f" ]; then
    cp "$AUDIO_SRC/$f" public/audio/
  else
    echo "warn: $AUDIO_SRC/$f が無い。README の台帳から取得して public/audio/$f に置く(無くても音抜きで合成できる)"
  fi
done
echo "synced: $(ls public/fonts | wc -l | tr -d ' ') fonts, icon, $(ls public/props | wc -l | tr -d ' ') props, $(ls public/audio | grep -c mp3) audio"
