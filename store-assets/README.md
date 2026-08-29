# ストア掲載用の画像素材

`docs/ASO-SCREENSHOTS.md` の設計にもとづく実素材。合成は `scripts/store/`。
**紹介動画**(App Store プレビュー / Play プロモ動画)は `promo/`(`docs/PROMO-VIDEO.md`)。

```
screens/android/  Pixel 10 Pro エミュレータ(1280×2856)で撮った実画面 ★これが本体
screens/ios/      iPhone 17 Pro Max シミュレータ(1320×2868)
screens/ipad/     iPad Pro 13インチ シミュレータ(2064×2752)
props/            scenario.com で生成して採用した透過の装飾(吹き出し・音波・炎・王冠)
props/candidates/ 生成候補(gitignore)。気に入ったものを props/<name>.png にコピーする
out/              合成結果(gitignore)。npm run store:build で作り直せる
```

## 作り直し方

```bash
npm run store:props -- estimate   # scenario.com の消費CUを dryRun で見積もる(課金なし)
npm run store:props -- props      # 装飾の候補を生成(1種 23CU・2候補)。既にあるものは飛ばす
npm run store:build               # 合成 → out/{play,ios,ipad}-N.png, out/feature-graphic.png
npm run store:verify              # 寸法・アルファ・黒帯・文字20%・可視率75% を検査
npm run store:preview             # out/preview-*.png(一覧と、検索結果風の3枚並び)
```

スライドの定義(コピー・実画面・拡大チップの矩形・装飾の配置)は `scripts/store/slides.mjs` だけを触ればよい。
`node scripts/store/build.mjs --formats play --slides 1 --debug` で、文字/チップ/画面に枠を描いた出力と HTML が `out/debug/` に残る。

## 実画面の撮り方

撮る画面: `tts`(記事+読み上げ中)、`matsuri`、`article`、`ranking`(日間)、`search`(キーワード入力後)、`sites`、`foryou`、`ngwords`(数語登録後)、`hide-site`(記事の ⋮ メニューを開いた状態)。
iPad は `tts` `matsuri` `ranking` `search` の4枚。

### iOS(シミュレータ)

```bash
npx expo run:ios --device "iPhone 17 Pro Max" --configuration Release --no-bundler   # EXPO_PUBLIC_ADS_ENV 未設定 = テスト広告
xcrun simctl status_bar "iPhone 17 Pro Max" override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --operatorName "" --batteryState discharging --batteryLevel 100
xcrun simctl openurl "iPhone 17 Pro Max" "matomekun://a/<記事uuid>"     # 記事はディープリンクで直行(「開きますか?」→ 開く)
xcrun simctl io "iPhone 17 Pro Max" screenshot --type=png store-assets/screens/ios/<name>.png
```

- 初回は UMP 同意 → ATT → オンボーディングを消化してから撮る
- 画面操作は `cliclick`(要 `brew install cliclick`)。Simulator のウィンドウ座標は環境で変わるので、
  `screencapture` した画面と `simctl screenshot` を `compare -subimage-search` で突き合わせて原点と倍率を出す
- 日本語の入力は `pbcopy` → `cliclick kd:cmd t:v ku:cmd`(かなキーボードだと `t:` は化ける)
- 記事画面の下部にはテスト広告が出る。**下部をタップしない**(Safari に飛んで「◀ Safari」のパンくずが残る。
  残ったらアプリを terminate → launch で消える)
- 祭り画面は `https://matome-recs.ponyo877.workers.dev/recs/matsuri` が空だと撮れない
- iPad は端末名を `"iPad Pro 13-inch (M5)"` に替えるだけ。ステータスバーに日付が出るので、日をまたいだら揃えて撮り直す

### Android(エミュレータ)

```bash
emulator -avd Pixel_10_Pro_API36 &
npx expo run:android --variant release --no-bundler    # ⚠️ build-preview.apk は dev client なので使えない
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e fully true -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command network -e mobile hide
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
adb shell am start -a android.intent.action.VIEW -d "matomekun://a/<記事uuid>"
adb shell input tap X Y                                # 座標は画面のピクセルそのまま
adb exec-out screencap -p > store-assets/screens/android/<name>.png
```

## 守ること

- **実画面は必ず本物を使う。** ストアのスクリーンショットはアプリの実際の表示でなければならない
  (Play / App Store 双方の規定)。AI に画面を描かせない
- **日本語のコピーも AI に描かせない。** 字形が崩れる。文字は合成時に実フォント(M PLUS Rounded 1c)で乗せる
- **本番の広告ユニットを踏まない。** production ビルドで撮らないこと
- **画面下部を写さない。** 端末を版面外へはみ出させてバナー広告とタブバーを隠す(build.mjs が可視率 ≤ 75% を強制)
- **新着タブは撮らない。** 4件目にインフィード広告(Test Ad)が入る
- **表示中の記事タイトルを確認する。** 年齢区分の申告(Play 12歳以上・軽度のののしりあり)と整合する範囲に収める
- **「広告なし/広告カット」「唯一/初」「具体的なサイト数」は書かない**(`docs/GROWTH-PLAN.md` 5-1)
