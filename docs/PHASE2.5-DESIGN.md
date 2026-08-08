# Phase 2.5 設計 — 「祭り」検知 & スレ読み上げ

作成: 2026-08-08。競合まとめアプリに存在しない差別化機能2本。
どちらも **Phase 1〜2 で作った資産(推薦基盤・通知・整形HTML)の転用**で、追加ランニングコストはゼロ。
リリースは **1.49** に同梱(オフラインキャッシュ persist は 1.50 に後送)。

---

## A. 「祭り」検知 🔥

### コンセプト

2ch/5ch 文化の核心「祭り」を製品化する。**複数のまとめサイトが同じスレを一斉にまとめ始めたら、それは祭り**。
検知して (1) 新着リストにバッジ、(2) 祭り速報のプッシュ通知、(3) 読み比べ導線 を提供する。
副産物として「同じスレのまとめが新着に何度も出る」既存の不満も解消に向かう。

### 検知アルゴリズム(matome-recs Worker 内・追加コストゼロ)

**方式: KVベクトルキャッシュ + Worker内コサイン類似**

- Vectorize query は使わない(2,500記事/日 × 1024次元 = 月77M queried dims で Free 枠30Mを超過するため)
- 代わりに、**直近6時間分の記事ベクトル(約600件)を KV に保持**し、取り込み時に Worker 内でコサイン計算する
  - 祭りは数時間スケールの現象なので 6h ウィンドウで十分
  - サイズ: 600件 × 1024次元 × float32 base64 ≈ 2.4MB(KV 値上限 25MB 内、読み書き 288回/日で枠内)
  - 計算量: 新記事45件 × 既存600件 = 27,000 コサイン/実行(Workers CPU で余裕)

```
ingest時(既存の埋め込み計算に相乗り):
  recentVectors = KV.get('recent-vectors')          // [{id, siteID, titles, publishedAtTs, vec}]
  for 新記事 a:
    for r in recentVectors where r.siteID != a.siteID:
      if cosine(a.vec, r.vec) >= 0.90:              // 閾値は運用で調整(初期値0.90)
        clusterId = KV article-cluster:{r.id} ?? r.id
        cluster = KV cluster:{clusterId} に a を追加(articleIds, siteIdsを更新)
        KV article-cluster:{a.id} = clusterId
        break                                        // 最初のマッチで確定(貪欲)
  recentVectors に新記事を追加、6h超を除去 → KV書き戻し
  cluster/article-cluster キーは TTL 48h
```

**祭り判定**: クラスタ内の**異なるサイト数 ≥ 3** で「祭り」、**≥ 5** で「大祭り」。

### 通知(祭り速報)

- クラスタが閾値を**初めて**超えた瞬間、Worker が VM の新エンドポイントを叩く:
  `POST /v1/notification/matsuri`(CronGuard保護。WorkerはINGEST_TOKEN=CRON_TOKENを既に保有)
  body: 代表記事のメタ一式 + clusterSize
- backend は `matsuri_enabled=1` のトークンへ既存 PushExpo で送信。
  文言: 「🔥 {N}サイトが一斉にまとめ中」+ 代表記事タイトル。data は digest と同形式(type: 'matsuri')
  → **アプリ側の通知タップ処理は変更ゼロ**(既存の記事メタ復元機構がそのまま動く)
- **頻度制御(鬱陶しさ対策・最重要)**: Worker 側 KV で
  - 同一クラスタは1回だけ(`matsuri-notified:{clusterId}`)
  - **1日最大2件**(日次カウンタ)。digest 2件と合わせて日4通が上限
  - 深夜帯(23時〜7時 JST)は送らない(翌朝のダイジェストに任せる)

### API(Worker に追加)

- `GET /recs/matsuri` — アクティブな祭り一覧(24h以内・サイト数降順・最大10クラスタ)
  ```json
  { "data": [ { "clusterId", "siteCount", "articles": [ArticleMeta...] } ] }
  ```
  レスポンスは Cache API で60秒キャッシュ(全ユーザー同一内容のため)

### backend 変更

| 変更 | 内容 |
|---|---|
| マイグレーション | `device_tokens` に `matsuri_enabled TINYINT(1) NOT NULL DEFAULT 1` |
| `POST /v1/user/token` | `matsuri` パラメータ追加(未指定=true の後方互換) |
| `POST /v1/notification/matsuri` | CronGuard保護。usecase/notification に SendMatsuri 追加(SendDailyDigestと同型・digest_logsに種別付きで記録) |

### frontend 変更(1.49)

| 変更 | 内容 |
|---|---|
| `src/api/recs.ts` | `fetchMatsuri()` 追加 |
| `useMatsuri` query | staleTime 5分。LatestList とホームヘッダーが共有 |
| NewsCard バッジ | 祭り一覧との id マッチで「🔥 {N}サイト」バッジ表示(バッチAPI不要・クラスタは高々10件) |
| MatsuriScreen(新規) | 祭り一覧 → クラスタ展開で読み比べ(クラスタ内の記事リスト)。通知タップ・ホームヘッダー🔥(アクティブ時のみ表示)から遷移 |
| 設定 | 「祭り速報の通知」トグル(digestToggle と同型)。POST /v1/user/token に matsuri を含めて再登録 |
| 計測 | `matsuri_open`(from: badge/header/notification)、通知は既存 notification_open(type=matsuri) |

### 精度に関する注意

- 閾値 0.90 は初期値。緩いと別話題が混ざり、厳しいと改題まとめを取りこぼす。
  `GET /recs/matsuri` を数日観測して調整する(Worker の定数1つ)
- サイトごとに改題が激しいスレは取りこぼすが、v1 は「確実な祭りだけ知らせる」方針(誤検知の方が信頼を毀損する)

---

## B. スレ読み上げ(2声ラジオ)🎧

### コンセプト

整形済みHTMLを持つこのアプリだけができる「**まとめが聞ける**」。
スレの掛け合いを2声で読み分ける擬似ラジオ。通勤・家事の「ながら消費」という新しい利用シーンを開く。

### 実装方式(端末内・無料)

- **expo-speech**(端末内TTS・オフライン可・追加コストゼロ)
- 読み上げスクリプト生成: `src/scraper/` の cheerio 段階でテキスト抽出(新規 `src/scraper/ttsScript.ts`)
  1. 整形済みHTMLから段落単位でテキスト化
  2. 読み上げノイズを除去: URL・安価(`>>123`は「アンカー」と読まずスキップ)・AA(記号率の高い行)・画像alt
  3. **段落を交互に2声に割り当て**(voice/pitch差)。厳密なレス構造解析はしない —
     交互読みだけで「掛け合い感」は十分出る(サイトごとのレス構造セレクタ管理は過剰投資)
- 音声: iOS は日本語ボイス2種(例: Kyoko/Otoya)、Android は既定ボイスで pitch 0.9/1.15 の差分
- 再生制御: `Speech.speak` のキュー(段落ごと)+ onDone で次段落 → 一時停止/再開/速度(1.0/1.25/1.5/2.0)

### UI(AdMob制約: 記事画面下部にタップ要素を置かない)

- 開始: ArticleMenu(⋮)内に「読み上げ」項目(文字サイズの下)
- 再生中: **ヘッダー直下から降りるミニプレイヤーバー**(関連記事シートと同じ top:0 レイヤー)
  再生/一時停止・速度・閉じる。⚡シートとは排他表示
- 読み上げ中の段落をWebView側でハイライト(injectJavaScriptでスクロール追従)は **v2**(まず素の再生体験を出す)

### 制約(正直に)

- **v1 は画面表示中のみ再生**(expo-speech は画面ロックで停止する)。
  バックグラウンド再生は UIBackgroundModes: audio + ネイティブTTSライブラリの検証が必要で v2 送り
- 読み間違い(ネットスラング・固有名詞)は端末TTS品質に依存。「草」「ワイ」等の頻出語は
  読み替え辞書(`ttsScript.ts` 内の置換テーブル)で補正する
- **ラジオモード(読了後に次のおすすめを自動連続再生)は v2 の目玉**として温存
  (バックグラウンド再生とセットで初めて真価が出るため)

### 計測

`tts_start`(site)/ `tts_complete`(完走率)/ `tts_rate`(速度変更)

---

## リリース計画

| リリース | 内容 |
|---|---|
| **1.49 = Phase 2.5** | 祭り検知一式 + 読み上げ v1 |
| 1.50 | オフラインキャッシュ(persist)+ Vectorize Paid 昇格判断 + (蓄積後)共起 |
| v2 候補 | 祭り: 新着リストの重複集約(クラスタ1カード化)/ 読み上げ: バックグラウンド+ラジオモード+ハイライト追従 |

### 工数見積り

| 作業 | 見積 |
|---|---|
| Worker: クラスタリング + /recs/matsuri + 通知トリガ + 頻度制御 | 1日 |
| backend: matsuri通知エンドポイント + マイグレーション | 0.5日 |
| frontend: バッジ + MatsuriScreen + 設定トグル + 計測 | 1日 |
| frontend: ttsScript(抽出・整形・辞書)+ プレイヤーUI | 1.5日 |
| 検証(実機・通知・祭り誤検知の閾値調整) | 0.5日 |
| **合計** | **約4.5人日** |

### KPI(効果測定)

- 祭り: matsuri通知の開封率(digest比)・matsuri_open数・バッジ経由のarticle_open
- 読み上げ: tts_start率(記事オープン比)・完走率・リピート利用(週2回以上使うユーザー割合)
- どちらかが刺されば App Store の「編集者コメント」やASOの訴求点(「まとめが聞ける」「祭りがわかる」)に昇格させる
