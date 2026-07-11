# HSS認定制度 案内資料（実技試験・口頭試問）

従業員・関係者への配布用の案内資料。2つの評価アプリを「両輪」で紹介する。

- **実技試験** = 実際の業務が正しく行えているか（このリポジトリ pig-farm-evaluation）
  本番: https://shoichiokada225-sys.github.io/pig-farm-evaluation/
- **口頭試問** = 業務内容を理解し、言葉にできるか（別リポジトリ oral-exam-app）
  本番: https://shoichiokada225-sys.github.io/oral-exam-app/

## 成果物

| ファイル | 用途 |
|---|---|
| `案内資料.png` | **配布用の最終版**（QRなし・URLリンク記載・A4縦1枚・高解像度）。印刷・LINE共有はこれ |
| `案内資料_QRあり.png` | QRコードを載せた版（掲示用に読み取らせたい場合） |
| `案内資料.html` | 上記PNGのソース（画面写真・QRをdata URIで埋め込み済み。ブラウザで開けば確認可） |
| `screenshot_実技試験.png` / `screenshot_口頭試問.png` | 資料内に載せた各アプリの実画面 |

> メモ: claude.ai の Artifact（Webページ公開）では表示できなかったため、**配布はPNG画像を正**とする。

## 内容の考え方（両輪）

- 実技試験＝「**できているか**」（上司が現場で観察して1〜5採点）
- 口頭試問＝「**わかって言えるか**」（回答を録音→文字起こし→模範解答と照合して1〜5採点）
- 具体例はどちらも作業「**除フン**」で揃えている（実技=採点画面、口頭=質問＋模範解答）

## 作り直す手順（URL変更・画面刷新時）

Playwright は farm-shift-app の node_modules を借用している（`C:/Users/so/farm-shift-app/node_modules/playwright`）。

1. **画面写真を撮り直す**: `node build_screenshots.js`
   → 両アプリを開き、作業評価/作業カタログで「除フン」を選んだ画面を `screenshot_*.png` に保存
2. **資料HTMLを更新**: `案内資料.html` 内の `<img>`（data URI）を新しい画面写真で差し替え、URL文言を修正
   （元は scratchpad の `make_noqr.py` / `inject_and_render.py` で生成。ロジックは本READMEの範囲）
3. **PNGを書き出す**: `node build_png.js`（`案内資料.html` を deviceScaleFactor:3 でA4クリップ）

## デザイン

- Noto Sans JP / 高コントラスト・ビジネス調（視認性優先）
- アクセント: 実技=緑 `#2e7d6f`、口頭=青 `#2e5d7d`
- A4縦（比率1.414）に1枚で収まるよう調整
