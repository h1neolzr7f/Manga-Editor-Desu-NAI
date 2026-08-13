# Phase2: RunPod ComfyUI対応

## 概要
RunPod上で動作するComfyUIにHTTPS経由で接続する。
既存のComfyUIワークフローがそのまま使えるため、比較的互換性が高い。

## 主な違い（ローカルComfyUI vs RunPod ComfyUI）

| 項目 | ローカル | RunPod |
|------|---------|--------|
| URL | `http://127.0.0.1:8188` | `https://{pod-id}-8188.proxy.runpod.net/` |
| WebSocket | `ws://` | `wss://` |
| 認証 | 不要 | `Authorization: Bearer {apiKey}` |
| APIキー | なし | RunPodダッシュボードで取得 |
| ワークフロー | 共通 | 共通 |

## 実装タスク

### 1. runpod-comfyui-provider.js 新規作成
- `AIProvider`を継承
- `needsApiKey()` → `true`
- `getApiKey()` → RunPod APIキー入力欄から取得
- `getEndpointUrl()` → RunPod URL入力欄から取得
- 既存のComfyUI API呼び出し関数をラップ
  - fetch時に`Authorization`ヘッダーを注入
  - WebSocket接続を`wss://`に変更

### 2. 認証ヘッダー注入の仕組み
- `comfyui-management.js`のfetch呼び出しにヘッダー注入ポイントを追加
- 案A: fetch関数をラップして、プロバイダーからヘッダーを取得
- 案B: ComfyUIEndpointsクラスに認証オプションを追加
- 案Bが既存構造を活かせて良い

### 3. UI追加（index.html）
- 設定ドロップダウンにRunPod ComfyUI欄を追加
  - Pod URL入力欄
  - APIキー入力欄（type=password）
  - デフォルトURLリセットボタン
- サイドバーのexternalApiGroupにRunPodボタンを追加

### 4. 設定保存対応（project-management.js）
- SETTINGS_SCHEMAに追加:
  - `runpodComfyUIUrl`
  - `runpodApiKey`
- localStorageに保存/読込

### 5. apis定数とapiModeの拡張
- `apis.RUNPOD_COMFYUI = "runpodComfyUI"` 追加
- `providerRegistry.mapApiMode(apis.RUNPOD_COMFYUI, 'runpodComfyUI')`
- `ai-roles.js`のrolesにRUNPOD_COMFYUIエントリ追加（ComfyUIと同じ能力）

### 6. ハートビート対応
- RunPod ComfyUIの`/settings`エンドポイントに認証付きGET
- 接続ステータス表示

### 7. 翻訳追加（i18next.js）
- RunPod関連のUI文言を10言語追加

## 注意点
- RunPod ComfyUIはローカルComfyUIと同じAPIなので、ワークフローエディタ等はそのまま使える
- ただしノード（カスタムノード）の有無はRunPod環境に依存する
- APIキーをlocalStorageに平文保存することのリスクを考慮
  - file://プロトコルなので外部からのアクセスリスクは低い
