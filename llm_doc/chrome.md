# Chrome連携（Claude in Chrome）

## 制約
- `navigate`ツールは`file://`非対応（`https://`が自動付加される）
- `javascript_tool`の`window.location.href`でも`file://`遷移不可
- `chrome://newtab`等のChrome内部ページはスクリーンショット取得不可

## 手順
1. `tabs_context_mcp`で`createIfEmpty:true`を指定してタブグループ作成
2. ユーザーに手動で`file:///C:/01_work/00_Git/manga-editor-desu/index.html`を開いてもらう
3. `tabs_context_mcp`でタブIDを取得してから操作開始

## 接続できない場合
`tabs_context_mcp`に接続できない場合はユーザーに`/claude`コマンドの実行を求める。
