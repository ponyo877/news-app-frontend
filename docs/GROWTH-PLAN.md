# まとめくん DAU 10倍 成長計画

作成: 2026-08-07。frontend / backend-refactor / docker の3リポジトリ全調査と、本番API(`matome.folks-chat.com`)の実測に基づく。

---

## 0. 現在地 — 調査で確定した事実

### プロダクト概況

- 69サイト対応のまとめビューア。RN移行(1.43)→ AdMob対応(1.44)→ サイト拡充(1.45)まで完走済み
- コード品質は高い。スクレイパーのリモートルール配信(審査不要で全ユーザーに反映)は競合にない優れた資産
- **端末上スクレイピングによる「広告・目次・レコメンド抜きの読み口」は、競合(Marimba2log等)が月額課金で売っている価値を無料で提供している** — これが本アプリ最大の差別化点

### 実測で確定した危機的な数値

| 指標 | 実測値 |
|---|---|
| 累計ユニークデバイス(users行数) | 1,772件 |
| 新規登録 直近30日 | **8件** |
| 新規登録 直近7日 | **0件** |
| 記事流入(サイト拡充後) | 165件/日 → **2,443件/日(15倍)** |
| 検索API応答時間(「ゲーム」) | **23.5秒 / 602KB / 1,408件全件返却** |
| 記事の重複率(検索結果ベース) | **28%**(UNIQUE制約欠落) |
| クロール停止サイト | 10/69件が直近6時間記事0、うち**4件は1年以上停止**(誰も気づいていない) |
| 新着フィードの偏り | **上位3サイトで48%**を占有 |

### 構造的な欠落(DAUに直結するもの)

| 領域 | 状態 |
|---|---|
| アナリティクス / クラッシュレポート | **ゼロ**(Firebase/Sentry等なし。DAUすらストアコンソール頼み) |
| プッシュ通知 | **ゼロ**(front/back両方。トークン受け口すらない) |
| パーソナライズ | 名前だけ(「for You」= Daily ランキングの複製。`/v1/article/recommend` はダミー) |
| シェア導線 | ⋮メニュー2タップ奥。文言にアプリ名・ストアリンクなし。**バイラル係数ゼロ** |
| ディープリンク | スキーム宣言のみ。`linking` 未設定・Universal Links なし = **URLから記事が開けない** |
| レビュー依頼 | ゼロ(expo-store-review 未導入) |
| ウィジェット | ゼロ |
| オンボーディング | 実質ゼロ(初回体験の1発目が**広告同意ダイアログ**) |
| ASO | スクリーンショット・説明文が**旧Flutter UIのままの可能性**(REMAINING_TASKS.md 記載) |

### 結論

**「コンテンツ供給(69サイト)は完成したが、①効果を測る手段、②ユーザーを呼び戻す手段、③新規を連れてくる手段が全部ない」**。
新規流入がほぼ止まっている(7日で0件)ため、リテンション改善だけでは10倍に届かない。**計測 → 呼び戻し(通知)→ 獲得(ASO・シェア)の3本柱を順に立てる。**

---

## 1. 戦略 — DAUの方程式と施策の対応

```
DAU = 既存ユーザーの再活性化 + (新規獲得数 × 定着率)
       └─ プッシュ通知           └─ ASO/シェア  └─ 初回体験/通知許諾
```

業界データ(Pushwoosh 2025)では、ニュースアプリの D30 リテンションは平均 3%前後。
**週次以上の通知受信者はリテンションが4〜8倍**になる。通知ゼロの現状は、リテンションの主エンジンを積まずに走っている状態であり、ここが最大のレバー。

順序が重要:
1. **測れないものは改善できない** → 計測が全ての前提(Phase 0)
2. **穴の空いたバケツに水を注がない** → 致命バグ・破綻ポイントを先に塞ぐ(Phase 0)
3. **戻ってくる理由を作る** → プッシュ通知(Phase 1)
4. **来た人が定着する体験** → for You・シェア・レビュー(Phase 2)
5. **新規を連れてくる** → ASO・ウィジェット(Phase 3)

---

## 2. Phase 0 — 計測基盤と緊急修理(1週目、以降の全ての前提)

### 2-1. 計測基盤の導入(フロントエンド)

**@react-native-firebase/app + analytics + crashlytics** を推奨。

- 理由: 無料・DAU/リテンションのダッシュボードが標準装備・後続の FCM(通知)/Remote Config(A/B)と同一基盤
- Expo CNG なので config plugin で導入 → 次回ビルドに同梱(OTAなし運用のため**ストアリリースが1回必要**。早く出すほど早くデータが溜まる)
- 注意: ストア申告の更新が必要(Play データセーフティ / App Store プライバシーラベルに「使用状況データ」追記)

最初に仕込むイベント(これだけで主要ファネルが見える):

| イベント | パラメータ | 何が分かるか |
|---|---|---|
| `screen_view`(自動) | 画面名 | タブ別利用率(Search は本当に使われているか?) |
| `article_open` | site_id, from(latest/popular/search/similar/history) | 中核行動。どの導線が記事を読ませているか |
| `article_read_done` | 滞在秒数 | 読了の質 |
| `search` | keyword有無 | 検索の実需 |
| `share` / `favorite` / `site_block` | site_id | 機能利用率 |
| `notification_open`(Phase 1〜) | type | 通知の呼び戻し効果 |
| `deeplink_open`(Phase 2〜) | article_id | 共有リンク経由の流入 |
| `share`(Phase 2〜 from追加) | site, from(header/list_sheet) | シェア導線の効き |
| `article_open`(Phase 2〜 from追加) | site, article_id, from | 導線内訳(for You評価の中核) |
| `read_end_reached`(Phase 2〜) | site | 記事を最後まで読んだ率 |
| `onboarding_done`(Phase 2〜) | selected_count, skipped | 初回サイト選択の完了率 |
| `font_scale` / `ng_word` / `review_prompt`(Phase 2〜) | scale / action / read_count | 機能利用率 |
| `push_token_failed`(1.50〜) | step(fetch_token/register), reason | プッシュ登録の失敗率。端末要因(Googleアカウント未設定・通信断)が大半なので**Crashlyticsには送らずここで数える**(本物のクラッシュを埋もれさせない) |

### 2-2. バックエンド緊急修理(いずれも数行〜数十行、10倍トラフィックの前提条件)

| # | 修理 | 場所 | 内容 |
|---|---|---|---|
| 1 | 検索の破綻 | `repository/articleMySQL.go:200-216` | `LIMIT 30` + ページング + `score` と `published_at` の複合ソート(現状23秒/2.4MB返却) |
| 2 | ページング終端500 | `api/handler/article.go:69` | 結果0件時の `articles[len-1]` パニック修正。**無限スクロール終端で全ユーザーが踏む** |
| 3 | CDNキャッシュ | Echo ミドルウェア | `/v1/article*`・`/v1/site` の GET に `Cache-Control: public, max-age=60` → Cloudflare に載せる(現状**全リクエストが1GB VMのMySQL直撃**) |
| 4 | 個人情報漏洩 | `api/handler/user.go` + nginx | `GET /v1/user`(全1,772人のdevicehashを無認証公開)を閉鎖。devicehashはコメント本人判定に使われるため**なりすまし投稿が可能な状態** |
| 5 | クロールAPI保護 | nginx | `/v1/stock`・`/v1/stock/mlindex` を内部限定に(後者はBERT推論を外部から起動できるDoSベクタ) |
| 6 | 記事重複28% | スキーマ | `UNIQUE(site_id, title)` 追加 + 既存重複393件の削除(`OnConflict` がユニークキーなしで空振りしている) |
| 7 | アバター全滅 | SQL | `users` テーブル1,770件の失効ドメイン(`matome-kun.ga`)修復。8/1のSQLは sites/articles のみで users が漏れている |
| 8 | INSERT失敗で全停止 | `usecase/stock/service.go:46-51` | 1件のINSERT失敗でサイクル残り記事が全部捨てられる → continue に |
| 9 | 未デプロイ修正 | backend `d517eff` | WebDAV PUT検証をデプロイ(SITE-EXPANSION.md 申し送り) |

### 2-3. クロール監視(「2年停止に気づかない」の再発防止)

- `sites.last_updated_at` が48時間超のサイトを列挙するチェックを日次実行 → 通知(最小構成: cron + curl で Discord/Slack Webhook)
- 外形監視(UptimeRobot 無料枠)で `/health` を監視
- 現在停止中の4サイト(ワラノート2年4ヶ月・稲妻速報ほか1年)はRSS URLの棚卸し → 復旧 or 除外

### 2-4. フロントエンド品質の即効修正

| 修正 | 場所 | 効果 |
|---|---|---|
| 履歴の重複排除 + 上限(例: 500件) | `src/stores/articleStatusStore.ts:38-42` | **ヘビーユーザーほど遅くなる**構造の解消 |
| エラー状態のUI | LatestList / PopularList / SearchScreen | ネットワークエラー時の「無言の空リスト」(壊れたアプリに見える)を解消 |
| `fetchHtml` タイムアウト(8秒) | `src/scraper/fetchHtml.ts:15` | まとめサイト側障害での無限スピナー防止 |
| スプラッシュ制御 | `App.tsx` | `preventAutoHideAsync/hideAsync` 追加。起動直後の白画面解消 |
| ErrorBoundary | RootNavigator | クラッシュ→白画面をリカバリ画面に(Crashlytics 送信込み) |
| package.json バージョン同期・Maestro E2E 2本の修復 | — | 小さい負債の返済 |

**Phase 0 の出口条件**: Firebase で DAU・リテンションのベースラインが取れている。クラッシュフリー率が見えている。検索が1秒以内。500が消えている。

---

## 3. Phase 1 — プッシュ通知エンジン(2〜4週目、リテンションの主砲)

### 設計方針: Expo Push Service を採用

- `expo-notifications` + Expo Push API(`exp.host/--/api/v2/push/send`)。APNs/FCMの鍵管理はEASに任せられ、バックエンドはHTTP POSTだけで送れる。最速で立ち上がる
- バックエンド追加分:
  - `device_tokens` テーブル(device_hash, expo_token, platform, prefs, updated_at)
  - `POST /v1/user/token`(登録・更新)
  - 送信ワーカー: Go の cron ジョブ(最初は systemd タイマーで十分。既存の `stock.timer` と同じ流儀)

### 通知タイプ(v1 → v2)

| タイプ | データソース | 頻度 | 実装時期 |
|---|---|---|---|
| 朝・夜の人気ダイジェスト(「今日の1位: {title}」) | Redis ZSET(既存) | 1日2回・時刻固定 | v1 |
| 急上昇速報(1時間で閲覧数が閾値超え) | `POST /v1/article/view` の増分 | 0〜2回/日 | v1 |
| お気に入りサイトの新着 | favorite(要サーバー同期)or サイト購読 | ユーザー設定 | v2 |
| 類似記事レコメンド | BERT基盤(既存・403封鎖中) | — | v2 |

業界の最適値は**週3〜日1回**。それ以上はオプトアウトが増える。設定画面にタイプ別ON/OFFを必ず置く(低評価レビュー予防)。

### 許諾フローの設計(許諾率がこの施策のKPI)

- **初回起動では出さない**(現状ですら初回体験の1発目がAdMob同意。ここに通知許諾を重ねると即死)
- トリガー: 記事を3本読んだ後、または お気に入り登録時に、自前のプレ許諾画面(「人気記事を1日2回お届けします」)→ OS プロンプト
- Android 13+ は `POST_NOTIFICATIONS` のランタイム許可が必要
- 目標: 許諾率 50%以上(プレ許諾を挟むニュースアプリの標準レンジ)

### 制約への注意

- **`ArticleScreen` 画面下部にタップ要素を追加しない**(AdMobポリシー違反の再発防止。REMAINING_TASKS.md の最重要警告)。通知関連UIはヘッダー・設定画面に置く
- App Store プライバシー: 通知はラベル更新不要だが、リリースノートに機能追加を明記

**Phase 1 の出口条件**: 許諾率50%+、通知CTR 5%+(Media平均は1〜2%、パーソナルダイジェストなら上げられる)、通知経由セッションが計測できている。

---

## 4. Phase 2 — 定着する体験(1〜2ヶ月目)

### 4-1. 「for You」を本物にする(段階方式)

- **v1(端末内・バックエンド変更ゼロ)**: 既にMMKVに溜まっている閲覧履歴からサイト親和度スコアを計算し、新着+人気をリランクして表示。`ForYouList` の差し替えだけで完結
- **v2(サーバー)**: `article_open` に devicehash を付与してサーバー送信 → `/v1/article/recommend` のダミーを共起ベース実装に置換。BERT+Annoy基盤(実装済み・要403解除・索引を100件→全期間に拡大)を転用
- 新着フィードの**サイト別バランシング**(同一サイトは1ページ15件中N件まで)。上位3サイト48%占有の解消。69サイトに拡充した価値をユーザーに見せる

### 4-2. シェア導線とディープリンク(バイラル係数を0から立ち上げる)

1. 一覧カードのアクションシートと記事ヘッダーに**1タップシェア**追加(現状: ⋮メニュー2タップ奥)
2. シェア文言: `{title} - まとめくん` + 着地URL
3. **共有着地ページ** `matome.folks-chat.com/a/{id}`: OGP(タイトル+サムネ)+「アプリで開く」+ ストアバッジ(nginx に静的テンプレ + Go ハンドラ1本)
4. Universal Links / App Links: `apple-app-site-association` と `assetlinks.json` を配信、`associatedDomains` + `autoVerify` intent-filter、`NavigationContainer` に `linking` 設定 → **共有URLタップでアプリの該当記事が直接開く**

### 4-3. ストア評価の底上げ

- `expo-store-review` 導入。トリガー: 「記事10本読了 + インストール3日後」の好機に1回だけ
- 評価改善はASOの表示順位に直結 → Phase 3 の獲得効率を上げる先行投資

### 4-4. 競合標準機能の追いつき(離脱理由の除去)

| 機能 | 根拠 |
|---|---|
| NGワード(タイトルフィルタ) | 競合(Marimba2log等)の主力機能。まとめ読者の必須ニーズ |
| 文字サイズ調整 | 競合標準。スクレイパー整形済みHTMLなのでCSS変数1個で実装可能 |
| オフラインキャッシュ | TanStack Query の `persistQueryClient` + MMKV で一覧を永続化(現状毎起動フルフェッチ)。通勤圏外ユースに効く |
| サイトブロックの全タブ適用 | 現状「新着」のみ有効。ランキング・検索にも適用 |
| UI文言の日本語化統一 | タブ・メニューが英語のまま(設定だけ1.45で日本語化済み)。ストアレビュー指摘実績あり |
| コメントエラーの実文言化 | サーバーダウンでも「不適切な表現〜」と出る誤爆の解消 |

### 4-5. オンボーディング最小構成

初回起動時に1画面だけ: 「よく見るジャンル/サイトを選ぶ」(→ for You の初期シグナル + サイトブロックの逆利用)。広告同意 → 即ホームの現状より、最初の3記事への到達を速くする。

---

## 5. Phase 3 — 獲得の拡大(2〜3ヶ月目)

### 5-1. ASO 全面刷新(新規0件/週の直接対策)

- スクリーンショット: RN版UIで撮り直し(現状旧Flutter UIの可能性大)。1枚目に「**広告・目次カットで読みやすい**」の価値訴求
- タイトル/サブタイトル: 「まとめくん - 2ch 5ch まとめリーダー」等、検索キーワード(2chまとめ/5chまとめ/まとめサイト)を含める
- 説明文冒頭3行に差別化点(69サイト・広告なし整形・ランキング)
- `app-ads.txt` 設置(未完了タスク。広告収益の保全)
- 競合レビュー欄の不満(広告過多・更新停止・サイト数)を説明文で切り返す

### 5-2. ホーム画面ウィジェット(通知が回ってから)

- iOS WidgetKit(`@bacons/apple-targets` で CNG に追加)/ Android は Glance
- 「今日のランキングTOP3」ウィジェット。DAUに直接効くが実装コストが高いため、**通知の効果測定後に投資判断**

### 5-3. 通知の高度化とA/B

- Firebase Remote Config で通知文言・送信時刻・フィード構成のA/B
- お気に入りサイト新着通知(favoriteのサーバー同期とセット。機種変で消える問題も同時解消)

---

## 6. 並行インフラトラック(Phase 1〜2の裏で進める)

| # | 項目 | 理由 |
|---|---|---|
| 1 | VM移行: Ubuntu 18.04(EOL)→ 22.04+、1GB → **2GB(e2-small)** | 記事15倍流入 + BERT常駐 + 通知ワーカーを1GBは支えられない。DEPLOY-2026-08.md にも移行推奨の明記あり。コスト増は月+$10前後 |
| 2 | backend `develop` → `main` 整理、Dockerfile の `git clone develop` 依存排除 | ビルド再現性。現状レジストリと本番バイナリが不一致 |
| 3 | systemd unit(`stock.timer` 等)をリポジトリ管理下に | 構成のコード化。通知ワーカー追加時に必須 |
| 4 | バックエンドにも Sentry(Go SDK)または最低限のエラー通知 | 「全部失敗していても分からない」状態の解消 |
| 5 | 記事のアーカイブ戦略(例: 1年超の記事を別テーブルへ) | 年90万行増でも検索・ページングを維持 |
| 6 | (負荷が実際に伸びてから)検索を Meilisearch 等へ | MySQL FULLTEXT の LIMIT 修正で当面は持つ。過剰投資しない |

---

## 7. KPI 設計 — 「10倍」への算数

計測開始後1週間でベースラインを確定する。それまでの作業仮説:

```
現状推定: DAU 30〜80(累計1,772・直近新規ほぼゼロ・通知なしのD30=3%前後から逆算)
目標:     DAU 300〜800(10倍)
```

到達パス(掛け算で効かせる):

| レバー | 現状 | 目標 | 根拠 |
|---|---|---|---|
| 通知許諾率 | — | 50%+ | プレ許諾画面ありの標準レンジ |
| D7 リテンション | 推定 5%前後 | 15%+ | 週次通知でリテンション4倍超(業界データ)。3倍で見込む |
| 新規インストール | 8件/月 | 300件/月+ | ASO刷新 + レビュー改善 + シェア導線。競合はレビュー数千件=検索ボリュームは実在 |
| 通知CTR | — | 5%+ | パーソナルダイジェストで Media 平均(1〜2%)超えを狙う |
| クラッシュフリー率 | 不明 | 99.5%+ | Crashlytics で初計測 |

月次レビューで「新規 × D7 × 通知許諾」の3点を見る。どれか1つでも動かなければ Phase 3 の投資(ウィジェット等)を止めて原因を潰す。

---

## 8. リスクと制約

| リスク | 対応 |
|---|---|
| **AdMob再違反**: 記事画面下部へのUI追加 | 禁止事項として全タスクに周知(REMAINING_TASKS.md の警告を維持)。新UIはヘッダー/設定へ |
| Firebase導入によるストア申告漏れ | Play データセーフティ + App Store プライバシーラベルを提出前に更新(手順は RELEASE.md に追記する) |
| 通知の出し過ぎによる低評価・オプトアウト | 週3〜日1上限、タイプ別設定、送信前に自分の端末でN日間ドッグフーディング |
| 1GB VMの容量枯渇 | Phase 1 着手前に VM 移行を完了させる(インフラトラック#1を先行) |
| まとめ市場自体の縮小 | 差別化点(整形読み口・69サイト・リモートルール)をASOで前面に。市場内シェア奪取で10倍は狙える規模(競合レビュー数千件) |
| 個人開発の帯域 | Phase 0 を1週で終える規模に絞ってある。Phase 1 が最大の山(front+back+運用)。Phase 2 以降は効果測定を見て取捨選択 |

---

## 9. 今週やること(Phase 0 チェックリスト)

**2026-08-07 コード対応完了。残りの人手作業は `docs/PHASE0-DEPLOY.md` の手順どおり。**

- [x] backend: 検索 LIMIT + 新着順ソート + AND検索化(`repository/articleMySQL.go`, `entity/keyword.go`)
- [x] backend: ページング終端500修正(`api/handler/article.go`)
- [x] backend: GET系に Cache-Control 付与(`api/handler/middleware.go`)→ ⏳ Cloudflare Cache Rule作成(手順2)
- [x] backend: `GET /v1/user` 閉鎖、`/v1/stock*` に CRON_TOKEN 認証
- [x] DB: マイグレーションSQL作成(カラム拡張+重複排除+UNIQUE+アバター修復)→ ⏳ VMで実行(手順1)
- [x] backend: INSERT失敗時 continue 化 → ⏳ `d517eff` 込みでデプロイ(手順1)
- [x] 運用: クロール停止検知スクリプト(`scripts/check-crawl-health.sh`)→ ⏳ cron登録 + UptimeRobot(手順3)
- [x] 棚卸し: 停止サイトはクローラ正常・**サイト側休止**と判明(ワラノート/稲妻速報/ツイッター速報/暇人速報。復旧見込みなし)
- [x] frontend: Firebase Analytics + Crashlytics 導入、イベント8種実装 → ⏳ Firebaseプロジェクト作成(手順4)
- [x] frontend: 履歴上限・エラー状態UI・fetchHtmlタイムアウト・スプラッシュ制御・ErrorBoundary
- [x] frontend: Maestro E2E修復・バージョン1.46同期(lint/typecheck/test 208件全通過)
- [x] ストア: プライバシー申告更新 → **1.46 としてビルド・提出**(手順5・6)— 2026-08-08 Android internal / iOS TestFlight 提出済み
- [ ] 計測開始1週間後: ベースラインDAU・リテンションを本ドキュメントに記録し、Phase 1 の詳細設計へ(手順7)

## 10. Phase 1 実装状況(2026-08-08)

**プッシュ通知エンジン v1(ダイジェスト)実装・デプロイ完了。**

- [x] backend: `device_tokens` テーブル + `POST /v1/user/token`(upsert・Expoトークン形式バリデーション)
- [x] backend: `POST /v1/notification/digest`(CronGuard保護)— 人気1位記事を全許諾端末へExpo Push送信
  - daily→weekly→monthly フォールバック / DeviceNotRegistered トークン自動削除 / 100件チャンク
  - 通知dataに記事メタ一式(一覧APIと同形式)を積み、アプリがタップで記事画面を直接開ける
- [x] インフラ: `digest.timer`(朝7時・夜19時 JST)をOCIに設置・有効化。`iac/setup.sh` にも組込
- [x] frontend 1.47: expo-notifications 導入・起動時トークン同期(許諾済み端末のみ)
- [x] frontend: プレ許諾ダイアログ(記事3本読了後にタブへ戻った瞬間・1回だけ)→ OSプロンプト
- [x] frontend: 設定画面「人気記事の通知(朝・夜)」トグル(OFFはサーバ配信対象からも除外)
- [x] frontend: 通知タップ(kill起動含む)→ 記事画面直行 + `notification_open` / `notification_permission` / `notification_prompt` / `digest_toggle` 計測
- [x] 1.47 ストア提出完了(2026-08-08): Android → Play internal / iOS → TestFlight。FCM V1キー・APNsキー(V4S7K968ZP)登録済みで両OS送信可能。残りは実機確認→本番昇格のみ
- [ ] 通知タイプ第2弾: 急上昇速報(閲覧数の増分検知)— ダイジェストのCTR計測後に判断
- 出口条件の計測: 許諾率(notification_permission)・CTR(notification_open ÷ 送信数)・通知経由セッション

## 11. Phase 2 実装状況(2026-08-08)

**「定着する体験」9機能を実装・デプロイ完了。1.48 として両ストアへ提出。**

### 推薦基盤(Cloudflare・月額$0で検証開始)
- [x] `news-app-infra/workers/recs/` — Workers AI bge-m3(日本語対応・1024次元)+ Vectorize Free
- [x] 取り込みはVMの `recs-ingest.timer`(5分毎)→ `POST /internal/ingest`(CRON_TOKEN保護)。
      Workers Freeのcron枠(5個)が他プロジェクトで満杯のための回避策
- [x] `POST /recs/foryou`(人単位: 時間減衰ユーザーベクトルのtopK)/ `POST /recs/related`(人×記事: 0.7記事+0.3人)
- [x] 保持48時間(Free 5M次元制約)。**Paid昇格($5/月)は `RETENTION_MS` を14日に変えるだけ**。
      クエリ枠30M/月superação(≈DAU 300)が昇格トリガー
- [x] 検証済み: 別サイトの同一トピック記事を1位検出する精度

### R1(backend/infra、デプロイ・検証済み)
- [x] 共有着地ページ `GET /a/{id}` — OGP付きSSR(go:embed)、スマートバナー、`matomekun://`、
      Cache-Control自己管理(200=CFエッジ1日/404=no-store)。CF Cache Rule「landing-cache」でHIT確認
- [x] `GET /v1/article/meta/{id}`(ディープリンク着地のID→メタ復元)
- [x] Universal Links/App Links: AASA+assetlinks.json配信(Apple CDN取り込み・Google API検証済み)。
      assetlinksにはPlayアプリ署名鍵とEASアップロード鍵のSHA-256を両方登録
- [x] コメントerr握り潰しバグ修正(DB障害でも200が返っていた)

### R2(アプリ1.48、テスト249件通過)
- [x] for You本物化: recs第一候補+端末内リランク縮退(`lib/forYou.ts`)。旧daily複製を廃止
- [x] ⚡関連記事 = 人×記事推薦に置換(BERT封印の後継)。記事末尾到達で⚡点灯
- [x] シェア1タップ化(ヘッダー+一覧シート)、着地URL化、ArticleMenuからShare撤去
- [x] ディープリンク: RN標準Linkingで受けて通知タップと同じpendingArticle機構に合流。
      scheme=matomekun、associatedDomains、intentFilters(AndroidはManifest直編集が正)
- [x] オンボーディング1画面(サイト選択→preferredSiteIds。自動ブロックはしない。停止サイト除外)
- [x] NGワード(上限50・NFKC部分一致)+ブロックの全タブ適用(`useVisibleArticles`)
- [x] 文字サイズS/M/L/XL(Android textZoom / iOS text-size-adjust。ArticleMenu内ピル)
- [x] 新着サイト別バランシング(ページ内上限5・連続2。並べ替えのみ)
- [x] ストアレビュー依頼(既読10本+3日+1回だけ)
- [x] 日本語化統一・コメントエラー実文言化(backendにNG検査は存在しなかった)

### 残タスク(1.49以降)
- [ ] オフラインキャッシュ(persistQueryClient。起動経路変更のため単独リリース)
- [ ] Vectorize Paid昇格判断(from=foryouのCTRを1〜2週間観測後)
- [x] Apex @ DNSレコードの復元 — 2026-08-09に 35.247.107.215(えびてんチャット)へ復元。
      経緯と再発防止は news-app-infra の README「DNSインベントリ」節を参照

## 12. Phase 2.5 — 「祭り」検知 & スレ読み上げ(設計済み・実装待ち)

競合に存在しない差別化2機能。設計の全容は **docs/PHASE2.5-DESIGN.md**。

- 🔥 **祭り検知**: 複数サイトが同じスレを一斉にまとめたら検知(Worker内コサイン類似・KVベクトルキャッシュ方式でコストゼロ)。新着バッジ・読み比べ・祭り速報通知(1日2件上限・深夜帯除外)
- 🎧 **スレ読み上げ**: 整形済みHTMLを2声で交互読みする擬似ラジオ(expo-speech・端末内無料)。v1は画面表示中のみ、v2でバックグラウンド+ラジオモード
- リリース: **1.49**(persistは1.50へ)。工数約4.5人日

## 13. Phase 2.5 実装状況(2026-08-09)

**「祭り検知」「スレ読み上げ」を実装完了。1.49 として内部テストへ提出。**

### 祭り検知 🔥
- [x] Worker: 直近6hの正規化ベクトルをKV保持しWorker内で内積計算(Vectorize query不使用=コストゼロ)。
      別サイト間の類似(閾値0.90)でクラスタ併合、5サイト到達で祭り(当初3→2026-08-10に引き上げ)
- [x] 通知: Worker→VM `/v1/notification/matsuri`(CronGuard)→既存PushExpo。
      頻度制御は同一クラスタ1回・日1件・JST23〜7時抑止(digest 2件と合わせ日3通上限)。
      掲載基準(MATSURI_SITE_COUNT)と通知基準(NOTIFY_SITE_COUNT)は定数を分けてあり、
      現在はどちらも5。§12は当初の設計値(3サイト・日2件)のままの歴史記録なので注意
- [x] `GET /recs/matsuri`(サイト数降順・エッジ60秒キャッシュ)
- [x] アプリ: 新着カード🔥バッジ、MatsuriScreen(読み比べ)、ホームヘッダー🔥(アクティブ時のみ)、
      設定トグル(matsuri_enabled)。通知タップは既存機構がそのまま動く(data同形式)
- 閾値0.90は /recs/matsuri を数日観測して調整する

### スレ読み上げ 🎧(文字色で読み手が変わる)
- [x] ttsScript: 実効文字色の解決(style/fontタグ・祖先継承)→色相バケット(近似色は同一話者)→
      **色の出現順に声を割り当て**(黒=ナレーター固定)。色なし記事は交互2声に縮退
- [x] ノイズ除去: URL・安価・大量の草・AA(記号率>50%)・script/style
- [x] useTtsPlayer: expo-speechキュー再生。iOSはja-JPボイス列挙、不足分とAndroidはpitch差。
      速度1.0/1.25/1.5/2.0。世代カウンタで速度変更・停止の競合を防止
- [x] UI: ArticleMenu「読み上げ」→ヘッダー直下のTtsPlayerBar(⚡関連シートと排他)
- 制約: v1は画面表示中のみ(バックグラウンド再生+ラジオモードはv2)
- **iOSは `useApplicationAudioSession: false` が必須**(1.49で無音バグ・1.50で修正)。既定のtrueだと
  AVSpeechSynthesizerがアプリの音声セッションを使うが、本アプリは音声セッションを設定していない
  ため消音スイッチで無音になる。合成自体は完走するので**進捗だけ進んで聞こえない**症状になり、
  ログにも何も残らない。falseにするとsynthesizerが再生用セッションを自前で持つ
- 既知の弱点(未対処): ①`Speech.speak`はネイティブ例外を握り潰す(expo-speech側でPromiseを捨てて
  いるためonErrorも呼ばれない)②onErrorが次セグメントへ進むだけなので全滅しても「完了」になる
  ③iOSのgetAvailableVoicesAsyncはSiri音声も返すが再生できず無音になる(voiceIndex 0に当たると
  記事の大半が無音)④メニューの「読み上げ」はバーを出すだけで自動再生しない

### 計測(新規イベント)
`matsuri_open` / `matsuri_toggle` / `tts_start` / `tts_complete` / `tts_rate`
