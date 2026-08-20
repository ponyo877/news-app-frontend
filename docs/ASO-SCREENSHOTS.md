# ストアスクリーンショット刷新（2026-08 / scenario.com 用プロンプト付き）

## なぜ作り直すか

現行のスクリーンショットは **2021年のFlutter版**のまま。実測した証拠:

- 記事の日付が `2021-06-22`（東京五輪の話題）
- タブバーが英語（`Ranking / Search / My Page / Setting`）。現行は `79aa8e7` で日本語化済み
- タブが `NEW / for You`。現行は `NEW / あなたへ`
- **3枚目に、AdMobから違反と指摘された当のUI（画面下部の「記事を開く」ボタン＋直下の広告）が写っている**。1.44で撤去した画面
- **同じ3枚目にテスト広告（Test mode）が写り込んでいる**

とくに下2つは、9/14以降のAdMob審査リクエストでレビュアーの目に触れる可能性がある。
「修正済み」と主張しながら違反時の画面をストアに掲示している状態は避けたい。

## 訴求の方針

**「広告カット」「広告なし」は使わない。** AdMobで収益化していることと矛盾し、
他パブリッシャーの広告を除去していると自ら宣言する形になる
（2026-08-14の違反の引き金。docs/GROWTH-PLAN.md の⚠️を参照）。

打ち出すのは **競合に存在せず、かつ自社が生成した情報**である3点:

1. **読み上げ**（ハイライト追従つき） — 1.49〜1.51で実装。競合になし
2. **話題検知**（複数サイトが同じスレをまとめたら検知） — 1.49で実装。競合になし
3. **69サイト横断**（ランキング・検索） — 単一サイトでは作れない指標

整形の読み口に触れる場合も「本文だけを読みやすく」まで。除去の対象は列挙しない。

## 構成（6枚）

検索結果に出るのは最初の1〜3枚。**1枚目に最大の差別化＝読み上げを置く。**
文字は3〜7語、画面の上1/3に大きく。実画面は下2/3に配置する。

| # | キャッチ（案） | サブ | 必要な実画面 | 狙い |
|---|---|---|---|---|
| 1 | **読まずに、聴く。** | 通勤中も、作業中も、耳だけで | 記事画面＋読み上げバー＋ハイライト行 | 競合にない機能を最初に見せる。「ながら聴き」は利用時間を伸ばす=DAUに直結 |
| 2 | **盛り上がってるスレが、わかる。** | 複数サイトが同じ話題を扱うと自動で検知 | 祭り画面 or 新着の🔥バッジ付きカード | 「見逃したくない」動機。再訪の理由になる |
| 3 | **69サイトを、ひとつに。** | なんJもVIPもニュースも、まとめて | サイト選択画面（チェックの並び） | 網羅性。競合の「サイト数が少ない」不満への回答 |
| 4 | **本文だけ、すぐ読める。** | サイドバーも目次もない画面で | 記事画面（整形後の本文＋出典） | 読み口の良さ。※広告に触れない表現 |
| 5 | **今日いちばん読まれたスレ。** | 日間・週間・月間のランキング | ランキング画面 | 「何を読むか決まっていない」層の入口 |
| 6 | **読むほど、好みに寄る。** | あなた向けのおすすめと関連記事 | Home「あなたへ」タブ | 継続利用の訴求 |

Play は8枚まで、App Store は10枚まで。まず6枚で出し、反応を見て増やす。

## デザイン方針（2026年のストア面で浮くもの）

- **ダークベース＋オレンジの発光**。アプリ本体がダークテーマ（`#303030` / `#212121`）なので、
  背景も暗くすると実画面が浮き上がり、境目が自然になる。旧スクショの淡い黄色背景は
  実画面（ダーク）と分離してしまい古く見える
- **端末フレームは薄く**。太いベゼルのiPhoneフレームは古い。角丸と細い縁だけにする
- **キャッチは1行、最大でも2行**。読点で切って余白を残す
- **1枚目だけ縦にパース無し**（正面）。2枚目以降は軽い傾きを入れて連続性を出す

### ブランド実値

| 用途 | 値 |
|---|---|
| ブランドオレンジ | `#F39800`（アイコンから抽出） |
| 背景（アプリ本体） | `#303030` / AppBar `#212121` |
| アクセント（稲妻・祭り） | `#FFC107` |
| タブバー | `#607D8B` |
| サイト名 | `#EF9A9A` |

---

## scenario.com へのプロンプト

**重要: 日本語のキャッチコピーをAIに描かせない。** 生成モデルは日本語の字形を崩す。
scenario.com で作るのは**背景と装飾のみ**で、テキストと実画面は後から重ねる。

全プロンプト共通で末尾に付けるもの:

```
9:16 vertical composition, generous empty space in the upper third for text overlay,
premium mobile app store marketing aesthetic, subtle film grain, no text, no letters, no logo
```

共通のネガティブプロンプト:

```
text, letters, words, japanese characters, typography, watermark, logo, ui mockup, phone frame,
people, faces, hands, cluttered, busy composition, low contrast, muddy colors, jpeg artifacts
```

### 1枚目（読み上げ）— 最重要

```
Dark premium background for a mobile app store screenshot, deep charcoal gradient from #17181C at top
to #232428 at bottom, warm amber-orange #F39800 light blooming from the lower center like a speaker glow,
concentric audio waveform rings expanding softly outward and fading, thin luminous arcs,
floating dust particles catching the orange light, cinematic rim light, calm and focused mood,
9:16 vertical composition, generous empty space in the upper third for text overlay,
premium mobile app store marketing aesthetic, subtle film grain, no text, no letters, no logo
```

### 2枚目（話題検知・祭り）

```
Dark premium background for a mobile app store screenshot, near-black #15161A base,
multiple glowing nodes connected by thin light threads converging into one bright hotspot,
ember-orange #F39800 and amber #FFC107 accents, sparks rising from the convergence point,
sense of many sources igniting the same topic, subtle radial heat haze, deep shadows,
9:16 vertical composition, generous empty space in the upper third for text overlay,
premium mobile app store marketing aesthetic, subtle film grain, no text, no letters, no logo
```

### 3枚目（69サイト横断）

```
Dark premium background for a mobile app store screenshot, charcoal #1A1B1F base,
an orderly grid of many small softly glowing tiles receding into depth, gentle perspective,
a few tiles highlighted in warm orange #F39800 while others rest in cool grey,
sense of abundance organized into one place, soft vignette, clean and architectural,
9:16 vertical composition, generous empty space in the upper third for text overlay,
premium mobile app store marketing aesthetic, subtle film grain, no text, no letters, no logo
```

### 4枚目（読み口）

```
Dark premium background for a mobile app store screenshot, smooth deep grey #1C1D21 gradient,
minimal composition, a single clean vertical column of soft light suggesting a decluttered reading surface,
faint horizontal lines fading at the edges like settled text, warm orange #F39800 used sparingly
as a thin accent line, calm, spacious, restrained,
9:16 vertical composition, generous empty space in the upper third for text overlay,
premium mobile app store marketing aesthetic, subtle film grain, no text, no letters, no logo
```

### 5枚目（ランキング）

```
Dark premium background for a mobile app store screenshot, deep charcoal #18191D base,
three ascending podium-like light columns of increasing height, the tallest crowned with
warm orange #F39800 glow, soft upward light streaks, subtle confetti-like particles,
sense of daily ranking and momentum, cinematic depth,
9:16 vertical composition, generous empty space in the upper third for text overlay,
premium mobile app store marketing aesthetic, subtle film grain, no text, no letters, no logo
```

### 6枚目（パーソナライズ）

```
Dark premium background for a mobile app store screenshot, charcoal #1A1B20 base,
soft orbiting rings of light gradually tightening toward a warm orange #F39800 core,
suggesting personalization converging on a single taste, gentle gradient bloom,
delicate particle trails, intimate and warm,
9:16 vertical composition, generous empty space in the upper third for text overlay,
premium mobile app store marketing aesthetic, subtle film grain, no text, no letters, no logo
```

### 予備: アイコンを活かした装飾素材（任意）

キャラクター（オレンジ地に白い笑顔＋吹き出し）をあしらう場合。
**アイコンそのものを再生成させない**（崩れる）。あくまで背景の飾り。

```
Abstract speech bubble shapes floating in a dark space, rounded soft silhouettes,
warm orange #F39800 and white, varying sizes and depths, soft blur on distant ones,
playful but premium, minimal, lots of negative space,
9:16 vertical composition, no text, no letters, no faces, no logo
```

---

## 制作手順（8/22 にクレジット復活後）

1. **実画面を撮る**（このリポジトリの担当。iOSシミュレータ iPhone 17 Pro）
   - 上表「必要な実画面」の6枚。読み上げ中・ハイライト表示中の状態を含む
   - **本番広告ユニットを踏まないこと**。debug ビルドか `EXPO_PUBLIC_ADS_ENV` 未設定で撮る
     （1.51以降は production ビルド以外なら自動でテスト広告）
   - テスト広告が写る場合は、広告の出ない画面を選ぶか、撮影後に該当領域を実画面の別部分で覆う
2. **scenario.com で背景6枚を生成**（上記プロンプト。9:16）
3. **合成**: 背景 → 実画面（角丸・薄い縁）→ キャッチ（後乗せ）
4. **書き出しサイズ**
   - App Store 6.5インチ: **1284 × 2778**（必須）
   - Play: **1080 × 1920** 以上、最大8枚
5. **アップロード前の確認**
   - 画面内に広告枠が写っていないか
   - 画面下部にタップ要素が写っていないか（AdMob違反時のUIと誤解されないため）
   - 表示中の記事タイトルが不適切でないか（年齢区分の申告と整合するか）

## 効果測定

差し替え後、Play Console の「ストアのパフォーマンス」でストア掲載ページの
**表示回数→インストール率**を差し替え前後で比較する。
GROWTH-PLAN の目標は新規インストール 8件/月 → 300件/月。

---

# アプリアイコンの最適化

## 現状評価（実寸で確認した結果）

現行アイコンは**オレンジ地に白い笑顔＋吹き出し**（`assets/app/icon-1024.png`、ブランドオレンジ `#F39800`）。
これを検索結果の実寸に落として確認した。

| サイズ | 見え方 |
|---|---|
| 1024px（提出用） | 笑顔と吹き出しが明瞭。意図どおり |
| 96px（Play 検索結果相当） | 笑顔は識別できる。**吹き出しは形が曖昧になる** |
| 48px（一覧・通知相当） | **吹き出しが潰れて白い塊になる**。笑顔だけが残る |

### 問題は3つ

1. **カテゴリが伝わらない** — 笑顔＋吹き出しは「チャット／メッセージアプリ」に見える。
   2ch/5chまとめのリーダーだと分かる手がかりがない。検索結果で競合と並んだとき、
   何のアプリか判別できないのは致命的
2. **吹き出しが上端で切れている** — 1024の枠からはみ出しており、意図的な断ち切りに見えにくい。
   小さくすると「切れた白い塊」になる
3. **情報量が笑顔1つ** — 記憶に残るフックがない

### 一方で維持すべきもの

- **オレンジ `#F39800`** — まとめ系アプリは赤・青・黒が多く、暖色は棚で目立つ。差別化として機能している
- **親しみやすさ** — 2ch/5chまとめという題材の硬さ・とっつきにくさを和らげている

## いま変えるべき理由

アイコン変更は通常「既存ユーザーが見失う」リスクを伴うが、**現在の実測値ではそのリスクがほぼ無い**。

- 1か月間のアクティブデバイス数: **1**
- インストール: **2件**（Play Console 実測）

失うものが無い。むしろ新規獲得（GROWTH-PLAN の目標: 8件/月 → 300件/月）に振り切れる、
数少ないタイミングにある。

## 方向性（推奨は A）

### A. 複数の吹き出しが1つに集まる（推奨）

アプリの本質「**69サイトを横断して、同じ話題を1か所に集める**」をそのまま形にする。
1.49で実装した話題検知（複数サイトが同じスレをまとめたら検知）とも符合する。
笑顔を1つ残せば親しみも保てる。

- 大小の吹き出し2〜3個が中央に収束
- いちばん手前の吹き出しに小さく笑顔
- 48pxでも「複数のかたまりが1つに寄っている」シルエットは残る

### B. 吹き出し＋スレッドの線

吹き出しの中に横線を数本入れて「書き込みの積み重なり＝スレッド」を示す。
掲示板らしさは出るが、48pxで線が潰れる懸念がある。

### C. 笑顔＋音波（読み上げ推し）

スクリーンショット1枚目と揃うが、アイコンに機能を詰めると小サイズで破綻しやすい。
アイコンは「何のアプリか」、スクショは「何ができるか」と役割を分けたい。

## デザイン制約（小サイズで成立させる条件）

- **要素は2つまで**。3つ以上入れると48pxで潰れる
- **線は太く**（1024pxで最低40px相当）。現行の笑顔の線は細めで、縮小に弱い
- **枠内に収める**。断ち切りは小サイズで事故になる
- **背景は単色オレンジのまま**。グラデーションは小サイズで濁る
- iOS は角丸マスクが自動で掛かる。**四隅から10%は重要要素を置かない**

---

## scenario.com へのプロンプト（アイコン）

**注意: 生成結果をそのまま提出しない。** アプリアイコンは幾何学的な精度が要る。
AIは曲線や対称性を崩すので、**方向性の探索**に使い、確定案はベクターで清書する
（このリポジトリで SVG を書き起こせる）。

共通ネガティブプロンプト:

```
text, letters, words, japanese characters, numbers, watermark, signature, realistic photo,
3d render, drop shadow, gradient background, thin lines, cluttered, multiple panels, border frame
```

### 案A（推奨）: 集まる吹き出し

```
Flat vector app icon, solid warm orange #F39800 background, three white rounded speech bubbles
of different sizes converging toward the center and slightly overlapping, the frontmost bubble
carries a simple smiling face drawn with thick clean strokes, bold minimal geometry,
generous margins, perfectly centered composition, high contrast, no gradient, no shadow,
flat design, app store icon, square, crisp edges
```

### 案A': 集約をより強く（笑顔なし）

```
Flat vector app icon, solid warm orange #F39800 background, several white rounded speech bubbles
funnelling into one larger bubble at the center, sense of many sources merging into one,
bold thick shapes, minimal, symmetrical, generous margins, no gradient, no shadow,
flat design, app store icon, square, crisp edges
```

### 案B: スレッドの積み重なり

```
Flat vector app icon, solid warm orange #F39800 background, one large white rounded speech bubble
containing three short thick horizontal bars suggesting stacked posts, bold geometry,
very thick strokes, minimal, centered, generous margins, no gradient, no shadow,
flat design, app store icon, square, crisp edges
```

### 案C: 笑顔＋音波

```
Flat vector app icon, solid warm orange #F39800 background, a white circular smiling face
with thick clean strokes, two concentric white arc waves radiating from the right side
suggesting sound, bold minimal geometry, centered, generous margins, no gradient, no shadow,
flat design, app store icon, square, crisp edges
```

## 確定までの進め方

1. 8/22 に scenario.com で A / A' / B / C を各4〜8枚生成し、方向を決める
2. 選んだ方向を **SVG で清書**（左右対称・線幅の統一・角丸半径の統一をコードで担保）
3. **48px / 96px に縮小して検証**。ここで潰れたら要素を1つ減らす
4. 書き出し
   - `assets/app/icon-1024.png`（1024×1024・角丸なし・透過なし）
   - `assets/app/adaptive-foreground.png`（Android アダプティブ。**内側66%に収める**）
   - `assets/app/notification-icon.png`（Android 通知用。**白のシルエットのみ**）
5. `app.config.ts` の参照は変更不要（同じパスを差し替える）
6. ストア掲載のアイコンも別途差し替える（Play Console / App Store Connect）

## 変更後に見る指標

Play Console 「ストアのパフォーマンス」で、**ストア掲載ページの表示回数に対するインストール率**を
差し替え前後で比較する。アイコンは検索結果でのタップ率（表示→訪問）に効くため、
訪問数の変化も併せて見る。
