# promo — まとめくん 紹介動画の制作パイプライン

iOS シミュレータ上のアプリを Maestro で自動操作しながら `xcrun simctl` で録画し、Remotion で合成し、ffmpeg で各配信先の規格に書き出す。
すべて CLI から再実行できる。設計と経緯は `../docs/PROMO-VIDEO.md`。Totalizer の `promo/` を流用している。

```
capture/sim/flow.yaml(操作の台本。Maestro)
  └─ capture/sim/run.ts   status_bar 整形 → cue サーバ → maestro test → simctl recordVideo → timeline.json
       └─ capture/sim/postprocess.ts   30fps CFR 化 → 領域輝度の段差で 9 つの基準点を検出 → 各イベントに映像フレームを付与
src/(Remotion) AppStorePreview 886×1920 / SocialPromo 1080×1920
       └─ npm run render:* → scripts/deliver.sh → scripts/verify.sh
```

## 前提

- Node 24、ffmpeg / ffprobe、Xcode + iOS シミュレータ(iPhone 17 Pro Max)、Maestro(`~/.maestro/bin`。`curl -fsSL https://get.maestro.mobile.dev | bash`)
- `npm install && npm run setup`(ルートからフォント・アイコン・装飾 PNG を同期し、Totalizer の promo から音源をコピー)
- ルートの `tsconfig.json` / `eslint.config.mjs` は `promo/` を除外している(Remotion の DOM コードを巻き込まないため)

## 1. 撮影用ビルド(初回・アプリを変えたとき)

```bash
cd ..
xcrun simctl boot "iPhone 17 Pro Max"; open -a Simulator
CI=1 EXPO_PUBLIC_ADS_ENV=off npx expo run:ios --device "iPhone 17 Pro Max" --configuration Release --no-bundler
```

`EXPO_PUBLIC_ADS_ENV=off` で広告枠(記事下のバナー・新着のインフィード)と UMP/ATT が出なくなる(`src/lib/ads.ts` の `adsHidden`)。
ストアビルドは未設定なので影響しない。Release の JS バンドルは Xcode の bundle フェーズが環境変数を継承して作る。

## 2. 状態づくり(1 回だけ。MMKV に残る)

```bash
npm run precheck          # 日間ランキング Top8 と祭りのクラスタを表示。祭りが 0 件なら撮らない(🔥 が出ない)
# 映したくない題名があれば NG ワードで正規に間引く(引数は撮影日の precheck を見て決める)
~/.maestro/bin/maestro --device <udid> test -e NG1=容疑者 -e NG2=胸 -e NG3=デカすぎる capture/sim/prep-ng.yaml
# 記事を 3 本開いて通知プレ許諾を「あとで」で消化(押しておかないと録画中に白いモーダルが被さる)
~/.maestro/bin/maestro --device <udid> test capture/sim/prep-notify.yaml
```

## 3. 撮影

```bash
npm run capture:dry -- --take smoke     # 録画せず台本だけ流してセレクタを確かめる
npm run capture -- --take m3 --debug    # 録画 → 後処理(--debug で輝度エッジを全部ダンプ)
npm run postprocess -- --take m3        # 後処理だけやり直す(minDelta / minGap を調整したあと)
```

- `flow.yaml`: S1 ランキング(日間)→ 1 位をタップ / S2 ⋮ → 読み上げ → 1.8 秒 → 速度を 2.0x に → 9 秒 / S3 ✕ → 戻る → ホーム → 🔥 → 祭り一覧(静止)/ S4 祭りの 1 件目 → 本文をスクロール
- 各操作の**直前**に `cue.js` で合図を送る。`hold.js` が待ち。録画中に `optional: true` の tapOn は置かない
- **同期は映像基準**(`postprocess.ts`)。`simctl recordVideo` の時間軸は壁時計より前にも後ろにもずれる(m1: +1 秒、m2: −4 秒)ので、
  撮影順に並ぶ 9 つの画面変化(記事の白背景 ⇄ 一覧の暗い背景、読み上げバーの出現/消失、タブバーの白円)を領域ごとの輝度の段差で拾い、
  **順序**で対応づける(時刻の近さは使わない)。取れた基準点は `captures/<take>/timeline.json` の `sync.anchors`
- セレクタの癖: ランキングのカードは `"1, .*"`(順位 + 題名)。⋮ メニューは RN Modal で 1 要素に潰れるので `".*読み上げ.*"` で待って座標で押す。
  速度ピルの `2x` はボタンのラベルに潰れて見えないので待たない。祭り一覧は swipe すると離し際がタップになって記事が開く(m1)ので静止で撮る

## 4. 合成とレンダリング(Remotion)

```bash
npx tsx scripts/poster.ts --take m2     # カット割り・尺・ポスターフレームを表示
npm run studio                          # http://localhost:3000(テイクは src/Root.tsx の TAKE か --props で指定)
npm run render:appstore && npm run render:social
npm run deliver && npm run verify
npx remotion still AppStorePreview out/deliver/poster-appstore.png --frame=<posterFrame>
```

- カット割りは `src/lib/beats.ts`。再生速度は操作 1.5×・読み上げ 1×・本文スクロール 1.25×。待ち時間は `parts` でジャンプカット
- テロップ文言は `CAPTIONS`(beats.ts)。App Store 版は見出しを 1 行に連結し、桃色ピル(`CaptionPill`)をステータスバーの下・ヘッダーの上に 1 枚だけ置く(サブ文言は見出しの後に入れ替え)。Social 版は 2 行の見出し(`Headline`)+ 端末フレーム(`PhoneFrame`。スクショ v2 と同じ意匠)+ ブランド背景
- App Store 版は端末フレーム・手・エンドカード・ストアバッジ・URL・生成 AI 素材を入れない。886×1920・15〜30 秒・H.264 High 4.0
- 音は `public/audio/` の `bgm.mp3` `sfx-tap.mp3` `sfx-pop.mp3` を自動で使う(無ければ省略)。ナレーションなし

## 5. 素材とライセンス台帳

| 素材 | 出所 | 条件 | 状態 |
| --- | --- | --- | --- |
| フォント M PLUS Rounded 1c | Google Fonts(`../node_modules/@expo-google-fonts/m-plus-rounded-1c`) | SIL OFL 1.1 | `npm run setup` で同期(git 管理外) |
| アプリアイコン | `../assets/app/icon-1024.png` | 自作 | 同期 |
| 装飾 PNG(吹き出し・音波・炎・王冠) | `../store-assets/props/`(scenario.com GPT Image 2 で生成) | 生成物の商用利用可 | 同期 |
| BGM `bgm.mp3` | 甘茶の音楽工房「ハッピータイム」 https://amachamusic.chagasi.com/music_happytime.html | 商用可・クレジット任意(「甘茶の音楽工房」推奨)・**ファイル単体の再配布不可**・**YouTube Content ID 登録不可**・改変可 | Totalizer の promo からコピー(git 管理外) |
| 効果音 `sfx-tap.mp3` | 効果音ラボ「決定ボタンを押す3」 https://soundeffect-lab.info/ | 商用可・クレジット不要・再配布不可 | 同上 |
| 効果音 `sfx-pop.mp3` | 効果音ラボ「決定ボタンを押す12」 | 同上 | 同上 |

YouTube にアップロードするときは「甘茶の音楽工房」をクレジットに書く(任意だが推奨)。

## 6. 読み上げの実音声を入れたくなったら(未実装)

`brew install blackhole-2ch` → Audio MIDI 設定で「複数出力装置(内蔵スピーカー + BlackHole 2ch)」を作りシステム出力にする →
`run.ts` に `ffmpeg -f avfoundation -i ":BlackHole 2ch" -ac 2 -ar 48000 captures/<take>/tts.wav` を recordVideo と同時に spawn し、
`silencedetect` で最初の発声を `ttsStarted` に揃えて S2 にだけ `<Audio>` を置く(S2 は等速なのでズレない)。
