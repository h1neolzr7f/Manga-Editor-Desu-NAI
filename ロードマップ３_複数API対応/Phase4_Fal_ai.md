# Phase4: Fal.ai対応

## 概要
Fal.aiのクラウドAI APIに対応する。
モデルIDベースでエンドポイントが決まる独自のAPI形式。

## Fal.ai APIの仕組み

```
同期: POST https://fal.run/{model-id}
非同期:
  1. POST https://queue.fal.run/{model-id}
     → { "request_id": "xxx", "status": "IN_QUEUE" }
  2. GET https://queue.fal.run/{model-id}/requests/{request-id}/status
     → { "status": "COMPLETED" }
  3. GET https://queue.fal.run/{model-id}/requests/{request-id}
     → { "images": [{"url": "https://..."}] }
```

- 認証: `Authorization: Key {api-key}`
- 入出力形式がComfyUI/SDWebUIとは全く異なる
- モデルごとにパラメータ仕様が違う

## 対応予定モデル

| 用途 | Fal.aiモデルID例 |
|------|-----------------|
| T2I (SDXL) | `fal-ai/fast-sdxl` |
| T2I (Flux) | `fal-ai/flux/schnell`, `fal-ai/flux-pro` |
| I2I | `fal-ai/image-to-image` |
| Upscale | `fal-ai/creative-upscaler` |
| RemoveBG | `fal-ai/birefnet` |
| Inpaint | `fal-ai/fast-sdxl/inpainting` |

## 実装タスク

### 1. falai-provider.js 新規作成
- `AIProvider`を継承
- `needsApiKey()` → `true`
- 各AI_ROLEごとに使用するモデルIDを設定可能にする
- リクエスト変換: アプリパラメータ → Fal.ai形式
- レスポンス変換: Fal.ai形式（画像URL） → base64/fabric.Image

### 2. リクエスト/レスポンス変換
- T2I: `{ prompt, image_size: {width, height}, num_inference_steps, seed }`
- I2I: `{ prompt, image_url: "data:...", strength }`
- Upscale: `{ image_url: "data:..." }`
- RemoveBG: `{ image_url: "data:..." }`
- Inpaint: `{ prompt, image_url, mask_url }`
- レスポンス: `{ images: [{url: "https://..."}] }` → fetchして画像取得

### 3. 画像データの送受信
- 入力: base64データURLをそのまま送信可能
- 出力: URLが返るのでfetchして取得 → base64変換 → fabric.Image
- CORS考慮（Fal.aiのCDNからの画像取得）

### 4. Queue APIによる非同期実行
- 大きい画像や高品質生成はQueue API推奨
- ポーリング機構はPhase3と共通化可能

### 5. UI追加
- APIキー入力欄
- モデル選択UI（各Roleに対してどのモデルを使うか）
- サイドバーにFal.aiボタン追加

### 6. 対応Role
- T2I, I2I, Upscaler, RemoveBG, Inpaint を予定
- Fal.aiはAngleやInterrogateには非対応

## 注意点
- Fal.aiの出力はURL形式なので、保存時にdata:URLへの変換が必要
- imageMapへの保存ルール（blob:URLと同様にdata:URLに変換必須）
- Fal.aiのレート制限に注意
- モデルの利用料金がかかる（APIキー = 課金アカウント）
