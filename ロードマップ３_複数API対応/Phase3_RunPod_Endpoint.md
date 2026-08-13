# Phase3: RunPod Endpoint（Serverless）対応

## 概要
RunPodのサーバーレスGPUエンドポイントに対応する。
ComfyUIのAPIとは異なるリクエスト/レスポンス形式を使う。

## RunPod Serverless APIの仕組み

```
1. POST https://api.runpod.ai/v2/{endpoint-id}/run
   → { "id": "job-xxx", "status": "IN_QUEUE" }

2. GET https://api.runpod.ai/v2/{endpoint-id}/status/{job-id}
   → { "status": "IN_PROGRESS" } or { "status": "COMPLETED", "output": {...} }
```

- 非同期実行: POSTでジョブ投入 → ポーリングで結果取得
- WebSocket不要（HTTPポーリングのみ）
- リクエスト形式はエンドポイント側の実装に依存

## 実装タスク

### 1. runpod-endpoint-provider.js 新規作成
- `AIProvider`を継承
- `needsApiKey()` → `true`
- リクエスト変換: アプリの内部パラメータ → RunPod input形式
- レスポンス変換: RunPod output → アプリ内部形式（base64画像等）
- ジョブポーリング機構の実装

### 2. ジョブポーリング機構
- `POST /run` でジョブ投入
- 2秒間隔で `GET /status/{job-id}` をポーリング
- スピナーの進捗表示と連携
- タイムアウト処理（設定可能にする）
- キャンセル: `POST /cancel/{job-id}`

### 3. リクエスト/レスポンス変換レイヤー
- T2I: prompt/negative/seed/width/height → RunPod input形式
- I2I: 画像データの送信方式（base64 or URL）
- 出力: RunPod output → base64 or URL → fabric.Image

### 4. UI追加
- Endpoint ID入力欄
- APIキー入力欄
- タイムアウト設定
- サイドバーにRunPod Endpointボタン追加

### 5. 対応Role
- エンドポイント側の実装次第で対応可能なRoleが変わる
- 最初はT2Iのみ対応し、段階的に拡張

## 注意点
- RunPod Endpointの入出力形式はエンドポイントごとに異なる
- 汎用的な変換レイヤーが必要か、テンプレート方式にするか要検討
- コールドスタート時のレイテンシ（数十秒）を考慮したUX設計
