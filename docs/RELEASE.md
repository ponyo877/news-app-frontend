# 配信手順・検証手順(RNリプレイス版)

既存ストアアプリのアップデートとして配信するための手順。
**コード側の準備は完了済み**。以下は人手が必要な作業のチェックリスト。

## 0. 前提(識別子・バージョン)

| | iOS | Android |
|---|---|---|
| 識別子 | `com.matomebeta-app`(ハイフン) | `com.matomebeta_app`(アンダースコア) |
| 旧最終バージョン | 1.42 (build 42) | versionName 1.0.44 / versionCode 44 |
| 新リリース要件 | version 1.43 / **build >= 43** | **versionCode >= 45** |

※ Play Console「製品版」画面で実際の最新versionCodeを必ず確認すること(44想定だが要実測)。

## 1. 【最優先・リードタイム最長】Android署名鍵の確認

リポジトリ内の旧AAB(`flutter-legacy`ブランチ `android/app/release/app-release.aab`)の
アップロード署名証明書は実測済み:

- CN=Keisuke Hidaka(自己署名、2020-10-28作成、RSA 2048)
- SHA-1: `AE:DC:DD:26:E2:F5:AB:44:72:D7:F8:22:EE:75:CB:DC:4E:1A:3C:2B`

手順:
1. Play Console → 対象アプリ → テストとリリース → 設定 → **アプリの完全性 → アプリ署名**
2. 「Google Play アプリ署名」が有効か確認(AAB配信実績があるためほぼ確実に有効)
3. 「アップロード鍵の証明書」のSHA-1が上記と一致するか照合
4. 鍵ファイル(`debug.keystore`という名前の可能性が高い)を旧ビルドマシン・バックアップから捜索
5. **見つからない場合**: アップロード鍵リセットを申請(数営業日かかるため初日に着手)
   ```bash
   keytool -genkeypair -alias upload -keyalg RSA -keysize 2048 -validity 9125 -keystore upload-keystore.jks
   keytool -export -rfc -alias upload -file upload_certificate.pem -keystore upload-keystore.jks
   ```
   Play Console「アプリ署名」ページの「アップロード鍵のリセットをリクエスト」からPEMを提出

## 2. EAS セットアップ

```bash
npm install -g eas-cli
eas login
eas init                                # projectIdがapp.config.tsのextraに追記される
eas build:version:set -p android        # → 45(Play Console実測の最新+1)
eas build:version:set -p ios            # → 43
eas credentials                         # iOS: ASC APIキー登録(EASにお任せでOK)
                                        # Android: 既存/リセット後のアップロード鍵JKSを
                                        #          アップロード(★EASに新規生成させない)
```

登録後、`eas credentials`表示のSHA-1がPlay Consoleの「アップロード鍵の証明書」と一致することを確認。

その他アカウント側の確認:
- Apple Developer Program(Team `579Y3Y3699`)が有効・年会費支払済
- App Store Connect APIキー(App Manager権限)発行 → eas.json submitセクションに設定
- Play Console: EAS Submit用サービスアカウントJSON(設定 → APIアクセス)
- AdMobコンソール: アプリID・バナーユニットIDが有効のまま(設定変更不要)

## 3. ビルド

```bash
eas build --profile development --platform all   # dev client(開発・移行検証用)
eas build --profile preview --platform android   # 実機上書き検証用APK
eas build --profile production --platform all    # ストア提出用(autoIncrement有効)
```

## 4. データ移行の検証(重要)

引き継ぐもの: devicehash / ユーザー名 / アイコン / ブロックサイト。
履歴・お気に入り(Hive)は仕様として初期化(What's Newに明記)。

### Android 方式A: エミュレータでレガシー状態を捏造(高速)
```bash
# root化可能なエミュレータ(Google APIs、Playストアなし)で:
adb root
# Flutter版のprefs XMLを作成してpush
cat > FlutterSharedPreferences.xml <<'EOF'
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="flutter.devicehash">0123456789abcdef0123456789abcdef01234567</string>
    <string name="flutter.Name">テスト太郎</string>
    <string name="flutter.Icon">assets/images/icon/myimage_5.png</string>
</map>
EOF
adb push FlutterSharedPreferences.xml /data/data/com.matomebeta_app/shared_prefs/
adb shell "mkdir -p /data/data/com.matomebeta_app/app_flutter && echo -n 'site1,site2' > /data/data/com.matomebeta_app/app_flutter/mySkipIDs.csv"
# アプリを起動し、設定画面で名前・アイコン、サイト選択画面でブロック状態を確認
```

### Android 方式B: 実Flutterビルドから上書き(高忠実)
1. `flutter-legacy`ブランチをFlutter 3.10系でビルドし、テスト用keystoreで署名してインストール
2. アプリ内で名前変更・サイトブロックを実施
3. **同じkeystoreで署名した**RN preview APKを `adb install -r` で上書き
4. 引き継ぎを確認(署名不一致だと`INSTALL_FAILED_UPDATE_INCOMPATIBLE`)

### Android 方式C: Play内部テスト(最終ゲート)
製品版インストール済みの実機をテスターに登録し、Play経由で更新 → 引き継ぎ確認。

### iOS
1. App Store版1.42を実機にインストールし、名前・アイコン・ブロックサイトを設定
2. TestFlight(build 43+)から同じ実機に上書きインストール
3. 引き継ぎ確認(バンドルID同一なのでNSUserDefaults/Documentsは保持される)
4. 現行アプリが無い端末でも起動確認(フォールバックパス)

### 共通チェック
- [ ] 過去に自分が投稿したコメントが「自分」(右側ピンクバブル)として表示される
- [ ] Charles等で `/v1/user` への**再POSTが発生しない**こと(移行成功時)
- [ ] AdMobバナーが記事画面にのみ表示される(検証中はテストデバイス登録)
- [ ] HTTPのまとめサイト(ニュー速クオリティ等)がWebViewで開ける
- [ ] 6サイト(ニュー速クオリティ/暇人速報/VIPPERな俺/稲妻速報/哲学ニュース/ワラノート)の
      代表記事+複数ページ記事+削除済み記事(404)の表示

## 5. UI/UX同一性チェック

旧Flutter版と並置して確認:
- [ ] 初期タブ=Home、5タブ・内側タブとも左右スワイプ可
- [ ] pull-to-refresh、無限スクロール(新着)
- [ ] 既読記事のグレー化が全タブに即時反映
- [ ] ランキングの順位数字表示
- [ ] 記事画面: コメント開閉(100%⇔50%)、稲妻FAB(関連記事があるときのみ)
- [ ] コメント: 自分=右ピンク/他人=左グレー、50文字制限
- [ ] 設定: プロフィール編集、アバター22種、サイト選択

## 6. ストア提出

```bash
eas submit -p ios --latest
eas submit -p android --latest    # 内部テストトラックへ
```

- 段階公開: Android 10%→25%→50%→100%(クラッシュ率監視、問題時は即停止)、
  iOS 7日間の段階的リリースを有効化
- What's New: 「アプリを全面リニューアルしました。閲覧履歴・お気に入りはリセットされます」を明記
- ストア掲載情報は変更不要(スクリーンショット差し替えは推奨)
- iOS審査メモ: ATS無効の理由「外部まとめサイトの一部がHTTPのみ対応のため」を記載
  (既存アプリが同設定で承認済み)

## 7. 既知の注意点

- **iOS Deployment Target が 16.0 → 16.4 に上がる**(Expo SDK 57の下限)。
  iOS 16.0〜16.3端末は更新対象外になる
- targetSdk 35 のエッジツーエッジ表示はdev buildでの実機確認項目に含めること
- `react-native-default-preference`(レガシーprefs読み取り)はdev buildでの動作確認が必要。
  読めない場合もdevicehashはANDROID_ID/IDFVから同一値を再計算するため実害は限定的
