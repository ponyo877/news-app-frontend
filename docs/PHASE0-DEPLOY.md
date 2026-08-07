# Phase 0 リリース手順(計測基盤+緊急修理)

作成: 2026-08-07。docs/GROWTH-PLAN.md の Phase 0 実装分を本番に反映する手順。
**コード対応は backend(develop)・frontend(main)とも完了済み。** 以下は人手が必要な作業。

## 実装済みの内容(サマリ)

### backend(news-app-backend-refactor, develop)
| 修正 | ファイル |
|---|---|
| 検索: FULLTEXT を WHERE 句に移動+新着順+LIMIT 30(旧: 23秒/全件返却) | `repository/articleMySQL.go` |
| 検索: スペース区切りをAND検索化+演算子記号の無害化 | `entity/keyword.go` |
| ページング終端の500修正(0件時は空配列の200) | `api/handler/article.go` |
| 欠損記事IDをランキングでスキップ(重複削除の前提) | `repository/articleMySQL.go` Get/List |
| GET系に Cache-Control 付与(新着60s/人気・検索300s/サイト3600s) | `api/handler/middleware.go` |
| `GET /v1/user` 閉鎖(全devicehash無認証公開の解消) | `api/handler/user.go` |
| `/v1/stock`・`/v1/stock/mlindex` に X-Cron-Token 認証(CRON_TOKEN 環境変数) | `api/handler/middleware.go` ほか |
| クローラ: サイト更新・記事INSERTの失敗をスキップして継続 | `usecase/stock/service.go` |
| DBマイグレーションSQL(カラム拡張・重複排除・UNIQUE・アバター修復) | `scripts/2026-08-07-phase0-db-migration.sql` |
| クロール停止検知スクリプト(公開APIベース・Webhook通知対応) | `scripts/check-crawl-health.sh` |

### frontend(news-app-frontend, main)— 1.46 として提出する
| 修正 | ファイル |
|---|---|
| Firebase Analytics + Crashlytics(設定ファイル配置で有効化) | `src/lib/analytics.ts`, `app.config.ts` |
| イベント計測: screen_view / article_open / article_read_done / search / share / favorite / site_block / comment_post | 各画面・ストア |
| 履歴の重複排除+上限500件(ヘビーユーザーの劣化解消) | `src/stores/articleStatusStore.ts` |
| 全リスト+記事画面のエラー状態UI(無言の空リスト・無限スピナー解消) | `src/components/ErrorState.tsx` ほか |
| ErrorBoundary(白画面固まり防止+Crashlytics送信) | `src/components/ErrorBoundary.tsx` |
| 記事取得の8秒タイムアウト | `src/scraper/fetchHtml.ts` |
| スプラッシュ制御(フォント読込完了まで保持、失敗時はシステムフォントで続行) | `App.tsx` |
| 検索のプレースホルダー・空状態文言 | `src/features/search/SearchScreen.tsx` |
| Maestro E2E 2本を現行UIに追従、バージョン 1.46 / build 47 / vc 49 | `.maestro/`, `app.config.ts` |

## 手順1: バックエンドのデプロイ

```bash
# 1-1. developの変更をコミットしてpush(app/Dockerfileがdevelopをcloneするため必須)
cd ~/Documents/workspace/news-app-backend-refactor
git add -A && git commit && git push origin develop

# 1-2. VMでイメージをビルドして反映(gcloud認証失効中のためVM上ビルド。DEPLOY-2026-08.md参照)
# その際 docker-compose.yml の app 環境変数に CRON_TOKEN を追加する:
#   environment:
#     - CRON_TOKEN=<openssl rand -hex 24 で生成した値>

# 1-3. systemdタイマーのcurlにトークンを付ける(VM上)
sudo systemctl edit stock.service  # ExecStartのcurlに -H "X-Cron-Token: <値>" を追加
sudo systemctl daemon-reload

# 1-4. マイグレーションSQL(バックアップ→実行)
scp scripts/2026-08-07-phase0-db-migration.sql keisuke877jp@34.173.153.189:/tmp/
ssh keisuke877jp@34.173.153.189
  mysqldump -h127.0.0.1 -uroot -ppassword matome articles users comments sites > /tmp/phase0-backup.sql
  mysql -h 127.0.0.1 -P 3306 -u root -ppassword -D matome < /tmp/2026-08-07-phase0-db-migration.sql
```

> これで `d517eff`(WebDAV PUT検証)も一緒にデプロイされる(SITE-EXPANSION.md の申し送り解消)。

### 動作確認

```bash
time curl -s "https://matome.folks-chat.com/v1/article/search?keyword=ゲーム" | wc -c   # 1秒以内・30件
curl -s -o /dev/null -w "%{http_code}\n" "https://matome.folks-chat.com/v1/article?lastPublishedAt=2024-01-01T00:00:00Z"  # 200(旧: 500)
curl -s -o /dev/null -w "%{http_code}\n" "https://matome.folks-chat.com/v1/user"       # 404
curl -s -o /dev/null -w "%{http_code}\n" "https://matome.folks-chat.com/v1/stock"      # 404(トークンなし)
curl -sI "https://matome.folks-chat.com/v1/article" | grep -i cache-control            # public, max-age=60
```

## 手順2: Cloudflare の Cache Rule 作成 ✅ 2026-08-07 完了

作成済みルール「**api-cache**」(folks-chat.com ゾーン、アクティブ):
- 式: `(http.host eq "matome.folks-chat.com" and starts_with(http.request.uri.path, "/v1/"))`
- アクション: キャッシュの対象、エッジTTL「**Cache-Controlヘッダーが存在する場合は使用し、存在しない場合はバイパス**」
  → バックエンドが Cache-Control を返すエンドポイントだけがキャッシュされる安全設計。
  現時点の実測は `cf-cache-status: BYPASS`(ヘッダー未デプロイのため)。**手順1のデプロイ後に `HIT` になることを確認すること**:
  ```bash
  curl -sI "https://matome.folks-chat.com/v1/article" | grep -i "cf-cache-status"  # 2回目で HIT
  ```

## 手順3: 監視の設置

```bash
# 3-1. クロール停止検知(手元Mac or VM の cron に毎朝9時で登録)
# Discord等のWebhook URLを用意して:
0 9 * * * WEBHOOK_URL=<url> ~/Documents/workspace/news-app-backend-refactor/scripts/check-crawl-health.sh

# 3-2. 外形監視: UptimeRobot(無料)で https://matome.folks-chat.com/health を5分間隔監視
```

> 現在の停止サイト(2026-08-07実測): クローラは正常で**サイト側が休止**。
> ワラノート(2024-03停止)・稲妻速報/ツイッター速報/暇人速報(2025-07停止)は
> RSS・本体とも更新が止まっており復旧見込みなし。当面は放置で実害なし
> (Phase 2 でサイト選択画面から非表示にするか検討)。

## 手順4: Firebase プロジェクト作成 ✅ 2026-08-07 完了

作成済みの構成:
- プロジェクト: **matome-kun**(project_number: 595509297360、Sparkプラン)
- Google Analytics: 有効(GAアカウント「matome-kun」新規作成、ロケーション: 日本)
- Androidアプリ: `com.matomebeta_app`(nickname: matome-kun Android)
- iOSアプリ: `com.matomebeta-app`(nickname: matome-kun iOS)
- `google-services.json` / `GoogleService-Info.plist` は**リポジトリ直下に配置済み**。
  `npx expo config` で RNFirebase プラグイン・useFrameworks static・googleServicesFile の有効化を確認済み
- Crashlytics ページは初期化済み(実データはアプリ初回起動後に流れる)

残り: プロジェクトのイベントデータは 1.46 ビルドの実機起動後に Firebase DebugView で確認する

## 手順5: ストア申告の更新(1.46提出前)

Firebase Analytics/Crashlytics 追加に伴うデータ収集の申告:

- **Play Console → アプリのコンテンツ → データセーフティ**:
  「アプリのアクティビティ(アプリ内の操作)」「クラッシュログ」「診断」を収集ありに更新
  (共有なし・暗号化転送・削除リクエスト不可のまま)
- **App Store Connect → Appのプライバシー**:
  既存申告に「製品の操作・その他の使用状況データ・パフォーマンスデータ」が**含まれているため原則変更不要**。
  クラッシュデータの項目が未申告なら「診断: クラッシュデータ / 個人に関連付けない / トラッキングなし」を追加

## 手順6: 1.46 ビルド・提出

```bash
cd ~/Documents/workspace/news-app-frontend
npx expo run:android           # 実機確認(下記チェックリスト)
eas build --profile production --platform all
npx eas-cli@latest submit -p android --latest --non-interactive
eas submit -p ios --latest
```

### 実機チェックリスト(Phase 0 固有)

- [ ] 起動: スプラッシュ→ホームが白画面を挟まず表示される
- [ ] 機内モードで起動: 各タブに「読み込みに失敗しました+再読み込み」が出る(無言の空リストでない)
- [ ] 機内モードで記事を開く: エラー表示→通信復帰後「再読み込み」で表示される
- [ ] 検索: プレースホルダー表示・0件時メッセージ・結果が新着順
- [ ] 新着の無限スクロールを最後まで送っても止まらない(終端で500にならない)
- [ ] 同じ記事を2回開いても履歴に1件(最新閲覧が先頭)
- [ ] Firebase DebugView でイベント(screen_view / article_open 等)が届く
      (`adb shell setprop debug.firebase.analytics.app com.matomebeta_app`)
- [ ] 記事画面下部の広告まわりのレイアウトが1.45と同一(タップ要素が増えていない)

### リリースノート案(ja-JP)

```
・記事の検索を高速化し、結果を新しい順にしました
・通信エラー時に再読み込みできるようになりました
・読み込みが遅いサイトで画面が固まる問題を修正しました
・起動時の表示のちらつきを改善しました
・安定性向上のため、匿名の利用状況・不具合情報の収集を始めました(個人を特定する情報は含まれません)
```

## 手順7: 計測開始後(1週間)

- Firebase コンソールで DAU / リテンション / クラッシュフリー率のベースラインを記録し、
  docs/GROWTH-PLAN.md §7 の表を実測値で更新する
- タブ別 screen_view と article_open の導線内訳を確認 → Phase 1(プッシュ通知)の設計に入る
