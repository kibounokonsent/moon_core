# MOON CORE ARCHIVE — 未来世界 公式設定資料集

## フォルダ構成

```
moon_core/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js                       ← 画面を生成する処理（通常は編集不要）
│   └── data/
│       ├── 00-categories.js          ← カテゴリー一覧／歴史年表／ARTICLES配列の宣言
│       ├── articles-world-life.js    ← 世界概要・人々の暮らし
│       ├── articles-tech.js          ← 科学技術
│       ├── articles-substance.js     ← 特殊物質
│       ├── articles-creature.js      ← 生物
│       ├── articles-mutant.js        ← 変異体
│       ├── articles-culture.js       ← 宗教・文化
│       ├── glossary.js               ← 用語集
│       ├── nations/                  ← ★国家は1国につき1ファイル（15ファイル）
│       └── org/                      ← ★組織・企業は1団体につき1ファイル（36ファイル）
└── assets/
    ├── mooncore.svg
    └── images/（カテゴリーごとの画像置き場。国旗は images/nation/flags/）
```

「国家」と「組織・企業」はファイル数が多く、今後も増え続けそうなので、
それぞれ**1項目＝1ファイル**に分割しました。新しい国・組織を追加するときは、
`js/data/nations/` または `js/data/org/` に新しいファイルを1つ作り、
`index.html` に `<script src="js/data/nations/新しいid.js"></script>` のような
1行を追加するだけです（既存のファイルをコピーして中身を書き換えるのが簡単です）。

それ以外のカテゴリー（世界概要・人々の暮らし・科学技術・特殊物質・生物・変異体・宗教文化）は
まだ数が少なく増減も緩やかなため、カテゴリーごとに1ファイルへまとめています。

## 今回、内容面で直した点

- 「キューマ」の記事が2つ（id: kyuma / kyuuma）重複していたため、内容がより詳しい方を
  残して1つに統合しました（id は `kyuma` に統一）。
- 更新日の表記ゆれ（`2026.07.029`、`2026.7.30`、`271.04.01` など）を
  `YYYY.MM.DD` 形式に統一しました。
- `related`（関連項目）に、記事が増えて実際にはリンクできるようになったのに文字列のまま
  だった参照（例: `'ニポラン'` → `'niporan'`）を、実際の記事IDへ張り替えました。
  IDの綴りミス（例: `bernea`→`belnea`、`orgalon`→`orgaron`、`fumora`→`fumora-skypill` など
  30件近く）も、対応する記事を特定できたものはすべて修正しています。
  対応する記事が見つからなかった参照（`wolvptas_spinophen`、`name1000` など数件）は
  そのまま残していますので、必要であれば内容をご確認ください。
- 用語集の「変異体」の項目が、`variant`（変異体の専用記事）へリンクしていなかったため、
  リンクするよう修正しました。
- `index.html` の `<head>` 内にあった誤字（`initial-scale=1.0">f` の余分な `f`）を削除しました。

## まだ残っている、内容の判断が必要な点

チャット本文の回答をご覧ください。

## 世界地図（インタラクティブ版）

- `js/world-map.js` と `css/world-map.css` で、世界地図ページの地図を描いています。
- 国境の形は `assets/world-map.svg` から取り出したもので、`js/world-map.js` の `WM_SHAPES` に入っています。
- 国をタップ → 右（スマホでは下）のパネルに概要。もう一度タップ、または「資料を開く」で国家記事へ。
- 新しい国を地図に足すときは、`WM_SHAPES` に `{ id:'記事のid', color:'#色', d:'SVGのパス' }` を、
  `WM_LABELS` に国名の位置を1行ずつ追加してください。パネルの「首都・人口」などは国家記事の info から自動で読みます。

## サウンド

- `js/sound.js` と `css/sound.css`。音声ファイルは使わず、ブラウザ内で音を合成しています。
- ヘッダーのスピーカーボタンで「効果音」「環境音」を別々にオン／オフ、音量も変えられます（設定はブラウザに保存）。
- 最初にどこかをタップ／クリックするまでは音が出ません（ブラウザの決まり）。
- 環境音は2層です。
  - 背景：どのページでも流れる明るいSFの和音（`startBase`）
  - 情景音：場所ごとに重なる音（`SCENE`）。割り当ては `NATION_SCENE`（国ごと）と `CAT_SCENE`（カテゴリーごと）。
    null にするとそのページは背景だけになります。
  - 使える情景音：forest（森）／sea（海）／ice（氷）／sky（空）／blizzard（吹雪）／mist（霧）／workshop（工房）／
    gears（歯車）／city（街）／music（遠くの音楽）／money（お金）／food（食）／data（情報）／crystal（結晶）／
    eerie（不気味）／life（暮らし）／history（鐘と紙）／culture（風鈴と鐘）／office（会社）／law（法廷）

## カテゴリーの背景色

- `css/category-tint.css`。カテゴリー・記事ページの地に、カテゴリー色（国家記事は国の色）をごく薄く混ぜています。

## スマホのカテゴリーバー

- 980px以下ではヘッダー下段に全カテゴリーを横スクロールで表示します（`css/mobile-nav.css`、`app.js` の `renderNav`）。
