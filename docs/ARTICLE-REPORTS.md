# 記事表示の不具合報告(article_reports)

記事詳細画面の ⋮ メニュー「表示の不具合を報告」から、ユーザー・管理者が**理由を1つ選ぶだけ**で
記事URL・アプリ内ID・端末情報をサーバに蓄積する仕組み(1.52〜)。

背景: 1.51 で記事内の埋め込み(Xポスト・imgur・YouTube)が消えていた問題は、ユーザーから具体的な記事URLが
届かず、本番の記事を670件自前で取得して初めて実態が掴めた(`docs/REMAINING_TASKS.md` の訂正)。
次からは「どの記事が」「どう変か」が DB に貯まるようにする。

## 導線と送信内容

```
記事画面 ⋮ → 表示の不具合を報告 → 理由を選ぶ → 送信
  → POST https://matome.folks-chat.com/v1/article/report/{articleId}  (application/x-www-form-urlencoded)
```

| フォーム名 | 値 | 由来 |
|---|---|---|
| `url` | 記事URL | `ArticleMeta.url` |
| `sitetitle` | サイト名 | `ArticleMeta.sitetitle`(集計用に非正規化) |
| `devicehash` | 端末識別子 | コメント・通知と同じ `computeDeviceHash()` |
| `platform` | `ios` / `android` | `Platform.OS` |
| `appversion` | `1.52` など | `expo-application`(開発ビルドは空) |
| `rulesversion` | scraper-rules の version | `getActiveRuleSet().version`。どのルールで整形した結果かを突き合わせる |
| `reason` | 下表のコード | ユーザーが選択 |

| reason | 選択肢の文言 |
|---|---|
| `missing_media` | 画像・動画・Xのポストが出ない |
| `ad_remains` | 広告や関係ないリンクが残っている |
| `body_broken` | 本文が欠けている・崩れている |
| `other` | その他 |

- 自由記述は取らない(1タップで送れることを優先)。内容そのものの通報は一覧カードのシートの Google フォームが担う
- **同一端末×同一記事は1行**(`UNIQUE (device_hash, article_id)`)。再報告は `reason` / `app_version` / `rules_version` /
  `updated_at` 等を上書きするだけで、アプリには「報告を受け付けました」と返す
- 管理者向けの GET API や認証は**無い**。閲覧・対応状態の更新は DB に直接 SQL を流す
- コード: フロント `src/lib/articleReport.ts` / `src/features/article/ReportArticleDialog.tsx` / `src/api/queries.ts` `usePostArticleReport`、
  バックエンド `entity/articleReport.go` / `repository/articleReportMySQL.go` / `usecase/report/` / `api/handler/report.go`
- 計測: `article_report`(site, reason)/ `article_report_failed`(kind)。`docs/GROWTH-PLAN.md` §2-1

## テーブル `article_reports`

DDL: `news-app-backend-refactor/scripts/2026-08-25-article-reports.sql`(冪等)。

| 列 | 意味 |
|---|---|
| `article_id` `url` `site_title` | 記事の特定。`articles` への FK は張らない(記事が削除されても残す) |
| `device_hash` `platform` `app_version` `rules_version` | 端末と環境。同じ記事でも「1.51だけ」「iOSだけ」の切り分けに使う |
| `reason` | 上表のコード |
| **`status`** | 対応状態。`open`(未対応、既定)/ `in_progress`(調査中)/ `resolved`(修正済み)/ `ignored`(対応しない) |
| **`admin_note`** | 管理者メモ(原因・対応内容・関連ルールのバージョン等) |
| **`status_updated_at`** | `status` / `admin_note` を変えた日時 |
| `updated_at` | 最終報告日時(再報告で更新) |
| `created_at` | 初回報告日時 |

`status` 系の3列は**アプリからは一切書かない**(`repository/articleReportMySQL.go` の presenter に持たせていない)。
再報告の upsert でも触らないので、対応済みが勝手に未対応へ戻ることはない。
対応後にまた報告が来たかは `updated_at > status_updated_at` で分かる。

## 運用(SQL)

```sql
-- 未対応をサイト・理由別に集計(ルール修正の優先度付け)
SELECT site_title, reason, COUNT(*) AS n, MAX(updated_at) AS latest
FROM article_reports WHERE status = 'open'
GROUP BY site_title, reason ORDER BY n DESC;

-- 未対応の記事一覧(端末数・理由・最終報告時刻)
SELECT article_id, site_title, url, COUNT(*) AS devices, GROUP_CONCAT(DISTINCT reason) AS reasons,
       MAX(rules_version) AS rules_version, MAX(updated_at) AS last_reported_at
FROM article_reports WHERE status = 'open'
GROUP BY article_id, site_title, url ORDER BY last_reported_at DESC LIMIT 50;

-- 調査に着手
UPDATE article_reports SET status = 'in_progress', status_updated_at = NOW() WHERE article_id = '<uuid>';

-- 対応完了(記事単位。メモに原因と対応を残す)
UPDATE article_reports
SET status = 'resolved', admin_note = 'imgur埋め込み: scraper-rules v4 で描画スクリプトを復元', status_updated_at = NOW()
WHERE article_id = '<uuid>';

-- 対応しない(元記事側の問題・再現しない等)
UPDATE article_reports SET status = 'ignored', admin_note = '元記事で既に画像が削除されていた', status_updated_at = NOW() WHERE id = <id>;

-- 対応後に再報告があったもの(修正が効いていない疑い)
SELECT id, article_id, site_title, reason, status, status_updated_at, updated_at
FROM article_reports WHERE status IN ('resolved', 'ignored') AND updated_at > status_updated_at;
```

報告された記事は、監査ハーネス(1.51 調査で使った「記事HTMLを取得 → アプリと同じスクレイパーを流す」手順)に
URL を渡せば、実機を開かなくても整形結果を再現できる。

## デプロイ手順(バックエンド)

1. `news-app-backend-refactor` を `develop` に push
2. `news-app-infra/iac/deploy-app.sh <VM IP>`(バイナリをクロスビルドして systemd 再起動)
3. DDL を適用(冪等):
   ```
   scp scripts/2026-08-25-article-reports.sql <user>@<VM>:/tmp/
   ssh <user>@<VM>
   mysqldump -h127.0.0.1 -uroot -p matome > /tmp/backup-before-article-reports.sql
   mysql -h 127.0.0.1 -P 3306 -u root -p -D matome < /tmp/2026-08-25-article-reports.sql
   ```
   バイナリより先に DDL を入れてもよい(テーブルがあるだけで既存機能に影響しない)。
   逆順にすると DDL 適用までの報告が 500 になり、アプリには「サーバーが混み合っています」と出る
4. 動作確認:
   ```
   curl -s -o /dev/null -w '%{http_code}\n' -X POST https://matome.folks-chat.com/v1/article/report/<記事UUID> \
     -d 'url=https://example.com/1&sitetitle=test&devicehash=curl-test&platform=ios&appversion=1.52&rulesversion=4&reason=other'
   # → 200。2回目も200(upsert)。reason=spam → 400
   mysql> SELECT * FROM article_reports WHERE device_hash = 'curl-test'; → 確認後 DELETE
   ```
5. アプリ側は 1.52 のストア配信が必要(OTA なし)。ストアのデータ収集申告(Play データセーフティ / App Store プライバシー)に
   「記事URL・OS・アプリバージョン」の送信が新たに該当しないか確認する
