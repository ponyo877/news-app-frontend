# ストア掲載用の画像素材

`docs/ASO-SCREENSHOTS.md` の設計にもとづく実素材。

```
bg/       scenario.com で生成した背景(scripts/gen-store-bg.py・要 SCENARIO_API_KEY / SECRET)
screens/  実機(エミュレータ)で撮った実画面。★これが本体。差し替えるときは必ず実物を撮り直すこと
out/      合成結果(gitignore。scripts/build-store-screenshots.sh で作り直せる)
```

## 作り直し方

```bash
python3 scripts/gen-store-bg.py store-assets/bg   # 背景(1枚12CU。既にあるファイルは飛ばす)
./scripts/build-store-screenshots.sh              # 合成
```

## 実画面の撮り方(Android エミュレータ)

```bash
emulator -avd Pixel_10_Pro_API36 &
adb install -r -d build-preview.apk        # ⚠️ preview/development ビルドを使う(テスト広告になる)
adb shell am start -n com.matomebeta_app/.MainActivity

# ステータスバーを整える(時刻固定・電池満・通知なし)
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0930
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false

adb exec-out screencap -p > store-assets/screens/xxx.png
```

タップ位置は `adb shell uiautomator dump /sdcard/ui.xml` で取れる。

## 守ること

- **実画面は必ず本物を使う。** ストアのスクリーンショットはアプリの実際の表示でなければならない
  (Play / App Store 双方の規定)。AI に画面を描かせない
- **日本語のコピーも AI に描かせない。** 字形が崩れる。文字は ImageMagick で後乗せしている
- **本番の広告ユニットを踏まない。** production ビルドで撮らないこと
- **画面下部を写さない。** 合成では端末を意図的に画面外へはみ出させて、バナー広告とタブバーを隠している
  (2024年の AdMob 違反「ナビゲーションと誤認する配置」と誤解されるのを避けるため)
- **表示中の記事タイトルを確認する。** 年齢区分の申告(Play 12歳以上・軽度のののしりあり)と整合する範囲に収める
