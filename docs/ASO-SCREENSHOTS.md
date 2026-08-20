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

# アプリアイコンの最適化（2026-08-20 実施）

## 実寸で確認してわかったこと

旧アイコンは**オレンジ地に白い笑顔＋吹き出し**（ブランドオレンジ `#F39800`）。
これを実際のマスクとサイズに落として確認した結果、**2つの実害**が見つかった。

![before / after](assets/icon-before-after.png)

### 1. Android のアダプティブアイコンが壊れていた（実バグ）

`assets/app/adaptive-foreground.png` が `icon-1024.png` と**バイト単位で同一**だった
（`magick compare -metric AE` の差分が 0）。

Android のアダプティブアイコンは 108dp の前景のうち**中央 72dp（66.7%）しか表示されない**。
全面に描いた画像を前景として渡していたため、ランチャーでは外周が切り落とされ、
**吹き出しがほぼ消え、笑顔が円からはみ出す**状態で表示されていた（上図「Android launcher / before」）。

さらに `adaptiveIcon.backgroundColor` は `#E0AEE7`（淡い紫）で、
ブランドオレンジでもアプリのダークテーマでもない値が入っていた。前景が不透明だったため
表示上は見えていなかったが、通知アイコンの色 `notification_icon_color` にも同じ紫が使われており、
こちらは**ステータスバーで実際に紫に着色されていた**。

### 2. iOS でも吹き出しがマスクに切られていた

吹き出しが 1024px の枠を上にはみ出していたため、iOS の角丸マスク（半径約 229px）で上端が削られ、
「切れた白い塊」になっていた（上図「iOS mask / before」）。

### 3. 48px でカテゴリが伝わらない

Play の検索結果相当まで落とすと、残るのは笑顔だけになる。
笑顔＋吹き出しは**チャット／メッセージアプリ**に見え、2ch/5ch まとめのリーダーだと分かる手がかりがない。

## 4案を実際に描いて比較した

方針だけで決めず、SVG で描いて 48px まで落として突き合わせた。

| 案 | 内容 | 48px での結果 |
|---|---|---|
| A | 吹き出しを左右対称に2枚配置＋笑顔 | 左右の吹き出しが**耳に見えて猫の顔**と読める。不採用 |
| B | 吹き出し1枚＋書き込み3本 | **潰れずに読めた**。ただし SMS / メッセージ系の汎用アイコンに酷似。不採用 |
| F | B＋背面に1枚 | 同上。チャットアプリの読みから抜けられない |
| **A2** | **左上へ後退する重なり3枚＋笑顔（採用）** | **重なりが残り、笑顔も判別できる** |

> 補足: 事前には「案B は 48px で線が潰れる」と見ていたが、**実際には潰れなかった**。
> 落選理由は可読性ではなく、汎用のメッセージアプリと見分けがつかないこと。

### A2 を選んだ理由

- **アプリの本質をそのまま形にしている** — 69サイトを横断して同じ話題を1か所に集める。
  1.49 で入れた話題検知とも符合する
- **既存の笑顔を残している** — 置き換えではなく発展。インストール済みユーザーが見失わない
- **48px で成立する** — 重なりのシルエットが残る
- **どのマスクでも切れない** — iOS の角丸、Android の円・角丸のいずれでも枠内に収まる

なお、アイコン変更のリスクは今なら実質ゼロだった。Play Console の実測で
月間アクティブ 1 台・インストール 2 件しかない。失うブランド認知が無いうちに切り替えた。

## 実装

原本は SVG で、そこから全解像度を書き出す。

| ファイル | 役割 |
|---|---|
| `assets/app/design/icon-source.svg` | アイコン原本 |
| `assets/app/design/notification-source.svg` | 通知アイコン原本（目・口は alpha を抜いて表現） |
| `scripts/build-icons.sh` | 上記2つから全 PNG / WebP を生成 |

```bash
./scripts/build-icons.sh   # 要: brew install librsvg imagemagick
```

守っている制約:

- **要素は2つまで**（重なり・笑顔）。3つ以上は 48px で潰れる
- **線幅は 1024px 時に 46px 以上**。これ以下だと白同士がつながって塊になる
- **アダプティブ前景は 70% に縮めて中央配置**（`ADAPTIVE_SCALE`）。全面に描かない
- **背景は単色オレンジ**。グラデーションは小サイズで濁る
- 通知アイコンは Android が alpha しか見ないため、**目・口・重なりの境目はすべて透明**

`android/` と `ios/` は `.gitignore` 済みの prebuild 生成物（Expo CNG）なので、
正本は `assets/app/*.png`。ビルドのたびにそこから作り直される。
`build-icons.sh` が `android/` 配下も更新するのは、prebuild を挟まずに
`npm run android` で確認したいときのため。

## 残っている確認

- [ ] 実機／エミュレータでホーム画面のアイコンを目視（iOS シミュレータと Android エミュレータの両方）
- [ ] 通知を1件出してステータスバーのアイコンが白いシルエットで出ること（紫の着色が消えたこと）
- [ ] スプラッシュ画面の見え方
- [ ] ストア掲載アイコンの差し替え（Play Console / App Store Connect）。**次のバージョン提出時に併せて行う**

## 8/22 に scenario.com で別案も見るなら

採用案で確定しているので必須ではない。方向性を広げたいときだけ使う。

**生成結果はそのまま提出しない。** アプリアイコンは左右対称・線幅の統一・角丸半径の統一といった
幾何学的な精度が要る。AI はここを崩すので、**探索に留めて確定案は SVG で清書**し、
必ず 48px に落として検証する。

共通ネガティブプロンプト:

```
text, letters, words, japanese characters, numbers, watermark, signature, realistic photo,
3d render, drop shadow, gradient background, thin lines, cluttered, multiple panels, border frame
```

集約をより強く出す方向（笑顔なし）:

```
Flat vector app icon, solid warm orange #F39800 background, several white rounded speech bubbles
funnelling into one larger bubble at the center, sense of many sources merging into one,
bold thick shapes, minimal, symmetrical, generous margins, no gradient, no shadow,
flat design, app store icon, square, crisp edges
```

読み上げを出す方向:

```
Flat vector app icon, solid warm orange #F39800 background, a white circular smiling face
with thick clean strokes, two concentric white arc waves radiating from the right side
suggesting sound, bold minimal geometry, centered, generous margins, no gradient, no shadow,
flat design, app store icon, square, crisp edges
```

## 効果測定

Play Console 「ストアのパフォーマンス」で、**ストア掲載ページの表示回数に対するインストール率**を
差し替え前後で比較する。アイコンは検索結果でのタップ率（表示→訪問）に効くため、訪問数の変化も併せて見る。
