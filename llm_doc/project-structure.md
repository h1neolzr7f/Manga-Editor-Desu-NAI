# プロジェクト構造

## まず索引を引く

ディレクトリを眺める前に、目的別の索引を使ってください。

| 知りたいこと | 見るファイル |
|-------------|-------------|
| 機能から入口ファイル・主要関数・DOM id・テストを引く | `llm_doc/feature-map.md` |
| 横断索引の入口（シンボル / DOM id / ファイル / 読み込み順 / テスト） | `llm_doc/project-index.md` |
| 関数やグローバルがどこで定義されているか | `llm_doc/index/symbols.md` |
| id を参照している JS を逆引き | `llm_doc/index/dom-ids.md` |
| script/CSS の読み込み順と `?v=` の現在値 | `llm_doc/index/load-order.md` |
| 本機サービスの構成・停止方法・オフラインで開ける理由 | `llm_doc/backend-and-offline.md` |

索引は `npm run index` で再生成、`npm run check:index` で鮮度確認できます（`llm_doc/feature-map.md` は手作業）。

## ディレクトリ構成
```
manga-editor-desu/
├── index.html          メインHTML（script/CSS読み込み順が重要）
├── js/
│   ├── core/           基盤（logger, settings, auto-save, compression, font, util）
│   ├── fabric/         fabric.js Canvas管理（fabric-management.js）
│   ├── layer/          レイヤー管理（layer-management.js, blend, floating-window）
│   ├── ui/             UI部品（toast, overlay, control, event-delegator, prompt-manager）
│   ├── sidebar/        サイドバーツール
│   │   ├── pen/        ブラシ（crayon, ink, marker, spray, drip, stroke）
│   │   ├── text/       テキスト（vertical-text, custom effects 10種）
│   │   ├── speechBubble/ 吹き出し
│   │   ├── tone/       トーン（speedline, focusline, snow, noise）
│   │   ├── effect/     エフェクト（c2bw, c2c）
│   │   └── panel/      コマ割り（panel-manager, knife/）
│   ├── ai/             AI生成系（→ ai-system.md参照）
│   ├── simulator/      可编辑模拟器模板与 Canvas 渲染器
│   ├── local-tools/    本地 Sidecar 客户端与前端 Stub
│   ├── db/             永続化（user-font-repository）
│   ├── dashboard/      ダッシュボード（統計、プロンプト頻度）
│   ├── svg/            SVGテンプレート（コマ割り、吹き出し）
│   ├── canvas-manager.js    キャンバスリサイズ・ズーム
│   ├── project-management.js プロジェクト保存/読み込み
│   └── shortcut.js     キーボードショートカット
├── css/
│   ├── root.css        CSS変数（カラー、z-index）
│   ├── layout.css      メインレイアウト
│   ├── layout-layer.css レイヤーパネル
│   ├── components.css  共通コンポーネント
│   ├── form.css        フォーム
│   ├── responsive.css  レスポンシブ
│   └── ui/             機能別CSS
├── html/               HTMLテンプレート
├── llm_doc/            LLM向けドキュメント
└── scripts/            ユーティリティスクリプト（format, translation check）
```

## 主要グローバル変数
| 変数 | 説明 |
|------|------|
| `canvas` | fabric.js Canvasインスタンス |
| `stateStack` / `currentStateIndex` | Undo/Redo履歴 |
| `ModeManager` | 操作モード管理（SELECT, FREEHAND, KNIFE, PEN等） |
| `providerRegistry` | AIプロバイダ登録・ロール割り当て |
| `aiTaskMap` | AI生成タスク状態（generation-task-manager.js） |
| `sdQueue` / `comfyuiQueue` / `runpodEndpointQueue` / `falaiQueue` | プロバイダ別TaskQueue |

| NaiComicTemplateRegistry | 模拟器模板注册表 |
| NaiComicSimulatorStudio | 模拟器启动页与九种单开工作区 |
| NaiComicChatController | 通用聊天场景编辑与 Fabric Group 接入 |
| NaiBackgroundRemovalClient | 本地抠图 Sidecar 前端 Stub |

## Canvas初期化
```javascript
new fabric.Canvas("mangaImageCanvas",{
  enableRetinaScaling:true,
  renderOnAddRemove:false,
  renderer:fabric.isWebglSupported?"webgl":"canvas"
});
```
- 最小サイズ: 600x400
- `blendScale=3`（fabric→HTMLキャンバス変換倍率）

## モジュール間通信
1. **DOM Events** - `addEventListener`/`dispatchEvent`
2. **fabric.js Canvas Events** - `canvas.on('selection:created')`等
3. **EventDelegator** - `data-action`属性によるクリック委譲
4. **グローバル変数** - `canvas`, `stateStack`, `ModeManager`等

## script読み込み順（index.html）
正確な現在値（ファイルごとの `?v=` と行番号）は `llm_doc/index/load-order.md` にあります。以下は概略です。
1. サードパーティ（fabric.js, i18next, hotkeys等）
2. core（logger, settings, error handler）
3. fabric管理
4. UI（toast, overlay, mode管理）
5. プロジェクト・キャンバス管理
6. レイヤー
7. サイドバーツール
8. AI系
9. simulator/local-tools 扩展（依赖 Canvas、历史和 UI）
10. auto-save, compression
11. font, service worker

## 起動スクリプト（一键启动）

入口は 3 段。ユーザーが触るのは `一键启动.bat` だけ。

| ファイル | 役割 |
|---------|------|
| `一键启动.bat` | 入口。**ASCII のみ**で書く（コードページ切替をまたぐと cmd.exe がバイト位置ずれを起こし、非 ASCII 行を壊して別コマンドとして実行してしまう） |
| `start_manga_editor_nai.bat` | `powershell.exe -STA -File start_manga_editor_nai.ps1` を呼ぶ。他のスクリプトからも呼べる |
| `start_manga_editor_nai.ps1` | 本体。中国語 UI 文言はすべてここ（UTF-8 BOM 付き）に置く |

- サービスは**同じコンソールのフォアグラウンド**で動く。ウィンドウは閉じない。
- 就緒後に `http://127.0.0.1:8000/index.html#` をブラウザで開く（`-NoBrowser` で抑止、`-NoPrompt` でダイアログ抑止）。
- 子プロセスは **Windows Job Object**（`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`）+ `taskkill /T /F` で管理。ウィンドウを閉じると python も終了しポート 8000 が解放される。
- 8000 が既に本機サービスなら**ブラウザだけ**開き、他人のプロセスは殺さない。別プログラムが占めている場合は友好なエラーを出して終了コード 1。
- `NAI_QUIET=1` を付けて起動するのでアクセスログは出ない（未設定時は従来どおり）。失敗時は `user_data\start.log`。

バックエンドのルート一覧、プロキシの詳細、Service Worker キャッシュの挙動、「サーバーを止めてもページが開く」理由は `llm_doc/backend-and-offline.md` を参照。
