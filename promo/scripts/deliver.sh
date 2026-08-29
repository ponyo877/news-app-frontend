#!/bin/sh
# レンダリング済みマスター(out/*.mov)から各配信先の規格に書き出す。
#   SocialPromo.mov     → out/deliver/social-1080x1920.mp4   YouTube(Play のプロモ動画)/ X / TikTok / Reels
#   AppStorePreview.mov → out/deliver/appstore-886x1920.mp4  App Store(H.264 High 4.0・10〜12Mbps・AAC 256k 48kHz)
set -eu
cd "$(dirname "$0")/.."
mkdir -p out/deliver
V="-loglevel error -stats"

if [ -f out/SocialPromo.mov ]; then
  ffmpeg -y $V -i out/SocialPromo.mov \
    -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p -r 30 \
    -c:a aac -b:a 192k -ar 48000 -movflags +faststart out/deliver/social-1080x1920.mp4
fi

if [ -f out/AppStorePreview.mov ]; then
  ffmpeg -y $V -i out/AppStorePreview.mov \
    -vf "scale=886:1920:flags=lanczos,fps=30" \
    -c:v libx264 -preset slow -profile:v high -level:v 4.0 -pix_fmt yuv420p \
    -b:v 11M -maxrate 12M -bufsize 22M -x264-params keyint=60:min-keyint=30 \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart out/deliver/appstore-886x1920.mp4
fi

ls -la out/deliver
