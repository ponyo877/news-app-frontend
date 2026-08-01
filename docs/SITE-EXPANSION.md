# まとめサイト61件追加 — ロールアウト手順

作成: 2026-08-01。対応サイトを8→69件(稼働66件)へ拡充する作業の実行手順。
コード対応は3リポジトリともコミット済み。**本番反映(デプロイ・DB登録・ルール配信)は下記の順序で行う。**

## 完了済みのコード対応

| リポジトリ | 内容 |
|---|---|
| news-app-backend-refactor (develop) | クローラ堅牢化(1サイト失敗で全停止しない・WordPress/FC2形式対応)、`GET /health`、画像ドメイン修正、シードツール(`scripts/seed-sites`) |
| news-app-docker | app v0.0.21・healthcheck・`AP_ROOT`修正・クロールcronコンテナ化・nginx `/health`(手順: `DEPLOY-2026-08.md`) |
| news-app-frontend (main) | defaultRules.json v3(69ルール)、汎用エンジン(WordPress/FC2/Seesaa系5サイト)、検証パイプライン(`npm run fetch-candidates` → `npx jest candidateSites`)、サイト選択画面の一括切替 |

検証状況: 66サイト×2記事=132ケースで「エンジン整形+広告/レコメンド/目次の残留ゼロ」を機械検証済み。

## ロールアウト順序(⚠️ 順序が重要)

### Step 1: バックエンド即時デプロイ(アプリリリース不要)

`news-app-docker/DEPLOY-2026-08.md` の手順どおり:
1. `news-app:v0.0.21` をビルド・push(developの最新を取り込む)
2. VMで compose 反映(旧クロールcrontabの削除を忘れずに)
3. `scripts/2026-08-01-fix-image-domain.sql` で既存8サイトの壊れ画像を修復

### Step 2: アプリ審査プロセス(既存の予定どおり)

1. 1.44 の Play 公開 → AdMob 審査再リクエスト(`docs/REMAINING_TASKS.md`)
2. ⚠️ サイト拡張コードは main にコミット済みのため、**これから作る 1.44 ビルドには同梱される**。
   DB登録するまでアプリの見た目・動作は一切変わらないため AdMob 審査には影響しない
3. iOS も同様に提出(スクレイパー変更はレビューに影響しない)

### Step 3: サイト一括登録(拡張コード入りアプリの公開後)

```bash
# 3-1. アイコンをアップロードしてSQL生成(backend-refactorリポジトリで)
cd ~/Documents/workspace/news-app-backend-refactor
go run ./scripts/seed-sites -upload

# 3-2. 生成されたSQLをVMで実行(61件、冪等)
scp scripts/seed-sites/insert-sites.sql keisuke877jp@34.173.153.189:/tmp/
ssh keisuke877jp@34.173.153.189 "mysql -h 127.0.0.1 -P 3306 -u root -ppassword -D matome < /tmp/insert-sites.sql"

# 3-3. スクレイパールールv3をリモート配信(既存ユーザのアプリにも適用される)
cd ~/Documents/workspace/news-app-frontend
curl -X POST https://matome.folks-chat.com/v1/static -F "file=@src/scraper/defaultRules.json;filename=scraper-rules.json"

# 3-4. クロールは10分ごとのcronで自動実行される。初回は各フィード20〜30件が一括流入する
curl -s https://matome.folks-chat.com/v1/site | python3 -m json.tool | grep titles | wc -l   # 69件
```

**旧バージョンユーザへの影響**: livedoor系61サイトはルールのリモート配信だけで 1.43 以降の全ユーザに正しく整形表示される(エンジンは1.43から同梱済み)。**汎用エンジンの5サイト**(ガジェット2ch・りぷらい速報・働くモノニュース・ニュー速VIPワイド・ネタめし.com)だけは拡張コード入りビルドが必要で、旧バージョンでは生ページ表示になる。気になる場合は insert-sites.sql からこの5行を分離し、新ビルドの普及後に登録する。

### Step 4: 登録後の確認

- [ ] Home「新着」に新サイトの記事が流れてくる(サムネイル表示正常)
- [ ] 新サイト記事を開いて広告・目次・コメント欄・サイドバーが出ないこと(数サイト抜き取り)
- [ ] 既存8サイトの表示にリグレッションがないこと
- [ ] Setting → 表示サイトの選択: 69件表示・一括切替が動くこと
- [ ] `docker compose logs cron` でクロールが回っていること(失敗サイトがあってもスキップされる)

## 運用メモ

- **サイト改装への追従**: `npm run fetch-candidates` → `npx jest candidateSites` で再検証し、
  ルール修正後に `defaultRules.json` の version を上げて Step 3-3 の配信をやり直す(ストア審査不要)
- **アイコン差し替え**: 18サイトはlivedoor既定アイコン(`touch_icon.png`)になっている。
  差し替える場合は任意の画像を `POST /v1/static` へアップロードし `sites.image_url` をUPDATE
- **目視確認**: `DUMP_SCRAPER_OUTPUT=1 npx jest candidateSites` で整形結果が
  `src/scraper/__fixtures__/candidates/__output__/` に出力される(ブラウザで開ける)
