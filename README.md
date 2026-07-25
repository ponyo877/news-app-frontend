# まとめくん (React Native / Expo)

2ch系まとめブログのアグリゲータアプリ。Flutter版(`flutter-legacy`ブランチに保全)を
React Native + Expo でフルリプレイスしたコードベース。

- バックエンド: `https://matome.folks-chat.com`(API 13本・認証なし)
- ユーザー識別: 端末IDのSHA-1(devicehash)。Flutter版と同一ハッシュを維持
- 配信: 既存ストアアプリ(iOS `com.matomebeta-app` / Android `com.matomebeta_app`)のアップデート

## 技術スタック

| 領域 | 採用 |
|---|---|
| 基盤 | Expo SDK 57 + expo-dev-client(CNG: android/iosは`expo prebuild`で生成) |
| ナビゲーション | React Navigation v7(native-stack + material-top-tabs) |
| サーバー状態 | TanStack Query v5(無限スクロール・キャッシュ) |
| クライアント状態 | zustand v5 + MMKV(persist) |
| 記事整形 | cheerio/slim(`src/scraper/` 宣言的サイトルール) |
| 広告 | react-native-google-mobile-ads(既存AdMobユニット流用) |

## コマンド

```bash
npm run start        # Metro起動(dev clientが必要)
npm run lint         # ESLint(sonarjs/cognitive-complexity <= 20 をerror強制)
npm run typecheck    # tsc --noEmit
npm test             # Jest(スクレイパー/ストア/移行のユニットテスト)
npx expo prebuild    # ネイティブプロジェクト生成(コミットしない)
maestro test .maestro/  # E2Eスモーク(要dev build入り実機/エミュレータ)
```

## ディレクトリ構成

```
src/
├── api/         型付きAPIクライアント(client=BASE_URL唯一の定義 / schemas=zod / queries)
├── stores/      zustand+MMKV(articleStatus=既読・お気に入り・履歴の正規化ストア)
├── scraper/     記事HTML整形。サイト別ルールは siteRules.ts に宣言的に記述
├── migration/   Flutter版からのデータ移行(devicehash/名前/アイコン/ブロックサイト)
├── navigation/  RootNavigator / MainTabs(5タブ)
├── components/  ConvexTabBar(凸型ボトムバー) / NewsCard / PillTab系
├── features/    home / ranking / search / mypage / settings / article / comments / webview
├── theme/       Flutter版から実測したデザイントークン(色・寸法・フォント)
└── lib/         deviceHash / avatars / format / ads / bootstrap
```

## コード品質ルール

- `sonarjs/cognitive-complexity` **<= 20 を lint エラーで強制**(CI必須チェック)
- BASE_URL・devicehash生成・ブロックサイト定数の重複禁止(単一定義に集約済み)

## スクレイパーの構成(記事本体以外の除去)

2層構造+リモートルール配信:

1. **エンジン層**(`src/scraper/engines/`): ブログ種別ごとの構造再構築。
   本文抽出・複数ページ結合・サイドバー/コメント欄/記事外広告の一括除去。
   現在は livedoor 系のみ。新種別はエンジンを1つ実装してレジストリに追加
2. **サイト別ルール**(`src/scraper/defaultRules.json`): 本文内の広告・アフィリンク除去。
   **完全なJSONデータ**(記事URLプレフィックスでマッチ、旧sitetitle一致はフォールバック)
3. **リモート配信**: 起動時に `GET /v1/static/scraper-rules.json` を取得し、
   zod検証+version比較の上でMMKVにキャッシュ。**サイト側のテンプレート変更に
   アプリ更新(ストア審査)なしで追従できる**。配信手順:
   ```bash
   curl -F 'file=@scraper-rules.json' https://matome.folks-chat.com/v1/static
   # defaultRules.jsonと同形式。versionを上げるのを忘れずに
   ```
4. **風化検知**: セレクタが0マッチだった場合、devログ+MMKVカウンタに記録
   (`getRuleMissReport()`)。実サイトHTMLでの検証は `npm run fetch-fixtures` →
   `npm test`(realSites.test.ts が自動でスナップショット的に検証)

## Flutter版から意図的に変えた点(バグ修正)

- コメント通報: Slack Webhook直叩き(`as Uri`キャストで常にクラッシュ)→ Googleフォーム
- アバター選択が再起動で消える → ローカル保存を追加
- 検索の毎打鍵API発行 → 300msデバウンス
- AdMobバナーの`build()`内`load()`多重呼び出し → コンポーネント管理
- App Versionのハードコード表示 → 実バージョン表示

UI/UXはFlutter版と同一に保っている。配信手順・検証手順は `docs/RELEASE.md` を参照。
