## 基本ルール
- 常に敬語を使う
- サブエージェントはOpus/Sonnet使用（Haiku禁止）
- `file://`プロトコルで動作必須
- UI変更は既存表示と調和させる
- fallback禁止（ユーザー誤認防止）
- 文言は既存と表記統一（同義で別表記にしない）
- UIはフレキシブル対応を行い固定幅は使わない
- 機能修正時は関連する`llm_doc/`も更新する
- ユーザーから修正ポイントの確認を求められた場合、見落としの可能性が高い。指摘内容を`llm_doc/review-checklist.md`に反映し回数をインクリメントする

## ドキュメント
最初に `llm_doc/feature-map.md`（機能から入口を引く）→ `llm_doc/project-index.md`（横断索引）を読んでください。
プロジェクト全体を読み直す前に、この2つで機能の所在を特定できます。

- `llm_doc/feature-map.md` - 機能から入口ファイル・主要関数・DOM id・テストを引く。索引の起点
- `llm_doc/project-index.md` - 横断索引の入口。シンボル、DOM id、ファイル、読み込み順、テストへのポインタ
- `llm_doc/index/symbols.md` - 関数やグローバルがどこで定義されているか（自動生成）
- `llm_doc/index/dom-ids.md` - id を参照している JS を逆引き（自動生成）
- `llm_doc/index/files.md` - ファイル一覧と行数、用途（自動生成）
- `llm_doc/index/load-order.md` - script/CSS の読み込み順と `?v=` の現在値（自動生成）
- `llm_doc/index/tests.md` - npm script とテストが検証している内容（自動生成）
- `llm_doc/project-structure.md` - ファイルの場所が分からないとき。ディレクトリ構成、グローバル変数、script読み込み順
- `llm_doc/ui-patterns.md` - UI部品の追加・修正時。EventDelegator、Toast、モーダル、CSS変数、i18n、永続化の使い方
- `llm_doc/ai-system.md` - AI画像生成の修正時。プロバイダ構成、TaskQueue、ロール割り当て、ComfyUIワークフロー
- `llm_doc/layer-structure.md` - レイヤーやキャンバスオブジェクトの操作時。GUID連携、リンク機構、AIタスク進捗管理
- `llm_doc/coding-rules.md` - コードを書く前に確認。命名規則、ログ出力、npm run format の挙動
- `llm_doc/history-and-data.md` - Undo/Redo周りや画像保存の修正時。履歴スタック操作、data:URL制約
- `llm_doc/translation.md` - UI文言を追加するとき。i18nextのキー書式と8言語の記載例
- `llm_doc/chrome.md` - Chrome拡張連携の修正時。通信制約と接続手順
- `llm_doc/backend-and-offline.md` - 本機サービスの起動・停止や「サーバーを止めてもページが開く」を調べるとき。バックエンド構成、プロキシ、Service Worker キャッシュ
- `llm_doc/review-checklist.md` - コード修正後の見落とし防止。頻出問題と確認回数


## 索引の再生成
`npm run index` で `llm_doc/index/` と `llm_doc/project-index.md` を再生成します。`npm run check:index` は索引が古い場合に非ゼロ終了するので、コミット前に確認してください。`llm_doc/feature-map.md` は手作業のキュレーションなので自動生成されません。

## 除外フォルダ
検索・読み込み対象外:
`json_js`, `test`, `third`, `01_build`, `02_images_svg`, `03_images`, `99_doc`, `font`
