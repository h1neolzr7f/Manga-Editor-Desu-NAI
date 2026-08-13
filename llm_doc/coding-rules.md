# コーディング規約詳細

## 変数名・プロパティ名
- 変数名: camelCase（例: `var promptId=response.prompt_id;`）
- APIレスポンスのプロパティ名はAPI仕様のまま（camelCase変換しない）

## コメント
- コード内コメントは基本不要
- JSファイル先頭にファイル概要のみ記載
- JSDoc不要

## ログ
- `console.log`禁止 → `js/core/logger.js`のSimpleLoggerを使用
- ロガーは`js/core/logger.js`に集約定義（各ファイルで`new SimpleLogger()`しない）
- 新規ロガー追加時は`logger.js`末尾に`const xxxLogger=SimpleLogger('xxx',LogLevel.WARN);`を追加
- レベル: TRACE, DEBUG, INFO, WARN, ERROR, SILENT（デフォルトWARN）
- 使用例: `logger.debug("msg");`, `comfyuiLogger.error("msg");`

## フォーマットスクリプト
```bash
npm run format
```

削除対象:
- 行頭インデント、行末空白
- 演算子周りのスペース
- カンマ/セミコロン後のスペース
- 括弧内側のスペース

保持対象:
- 文字列リテラル内のスペース
- コメント内のスペース
- 改行
