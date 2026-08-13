# AI生成システム

## アーキテクチャ
```
ai-management.js（ルーター）
├─ provider/
│   ├─ ai-provider.js（基底クラス）
│   ├─ local-sdwebui-provider.js
│   ├─ local-comfyui-provider.js
│   ├─ runpod-comfyui-provider.js
│   ├─ falai-provider.js
│   └─ provider-registry.js（プロバイダ登録・ロール割り当て）
├─ queue/
│   ├─ task-queue.js（並行実行制御）
│   └─ generation-task-manager.js（aiTaskMap）
├─ comfyui/（ワークフロー、エディタ、v2）
├─ sdwebui/（設定、API呼び出し）
├─ inpainting/（マスクエディタ、ワークフロー）
├─ angle/（カメラアングルエディタ、Three.js使用）
├─ role/（ロール割り当てUI）
├─ ui/
│   ├─ unified-settings-window.js（APIサービス設定）
│   ├─ model-settings-window.js（モデル・ワークフロー設定フローティングウインドウ）
│   └─ ai-ui-util.js
└─ prompt/auto/（自動プロンプト生成）
```

## プロバイダ基底クラス（ai-provider.js）
```javascript
class AIProvider{
  async executeT2I(layer,spinnerId)
  async executeI2I(layer,spinnerId)
  async executeRembg(layer,spinnerId)
  async executeUpscale(layer,spinnerId)
  async executeInpaint(layer,spinnerId)
  async executeAngle(layer,spinnerId,anglePrompt)
  async fetchModels()
  async fetchSamplers()
  async fetchUpscalers()
}
```

## TaskQueue（task-queue.js）
Promise-based並行実行。プロバイダ別にキューが分かれる。
| キュー | 対象 | 並行数 |
|--------|------|--------|
| `sdQueue` | SD WebUI | 1 |
| `comfyuiQueue` | ComfyUI | 1 |
| `falaiQueue` | Fal AI | 1-10 |

## ロール割り当て（provider-registry.js）
タスク種別ごとにどのプロバイダを使うか設定。
- T2I, I2I, UP, BG, IP, ANG, TAG

## タスクライフサイクル（generation-task-manager.js）
→ `layer-structure.md`のAIタスク進捗管理セクション参照

## ComfyUI プロバイダ切り替え（comfyui-management.js）
`_comfyUIExecProvider` グローバル変数でリクエスト単位のプロバイダを制御する。
```javascript
async function comfyUIExecWithProvider(provider, fn){
  _comfyUIExecProvider = provider;
  try { return await fn(); }
  finally { _comfyUIExecProvider = null; }
}
```
- `getComfyUIServerAddress()` / `getComfyUIAuthHeaders()` / `getComfyUIProviderTag()` はすべて `_comfyUIExecProvider || providerRegistry.getActive()` を参照
- `comfyUIUrls` は Proxy で、プロパティアクセスのたびに `getComfyUIServerAddress()` を呼ぶ動的URL
- **注意**: `fn()` 内で長時間の await（WebSocket待機等）を行うと、その間に別の非同期タスク（ワークフローエディタ更新等）が `comfyUIExecWithProvider` を呼び `_comfyUIExecProvider` を上書きする。await 後に `comfyUIUrls.*` や `comfyuiFetch()` を使うと別プロバイダのURLに接続してしまう
- **対処**: 関数冒頭で `getComfyUIServerAddress()` / `getComfyUIAuthHeaders()` をローカル変数にキャプチャし、await後はそのローカル変数を使って直接 `fetch()` する

## ComfyUI v2ワークフロー
- `comfyui-workflow-repository.js` でワークフロー保存/読み込み（ファクトリパターン）
  - `createWorkflowRepository(providerKey)` でプロバイダー別インスタンス生成
  - `comfyUIWorkflowRepo_local` / `comfyUIWorkflowRepo_runpod`
- `comfyui-object-info-repository.js` でノード情報キャッシュ（同様のファクトリパターン）
  - `comfyObjectInfoRepo_local` / `comfyObjectInfoRepo_runpod`
- `comfyui-workflow-editor.js` でビジュアルエディタ（オプションで providerKey, workflowRepo, objectInfoRepo, provider, containerEl を受け取る）
- デフォルトワークフロー: t2i, inpaint, angle, upscale, rembg

## モデル設定フローティングウインドウ（model-settings-window.js）
3タブ構成：
1. **ComfyUI Workflow** — Local ComfyUIのワークフロー管理（ObjectInfo: comfyUIPageUrl）
2. **RunPod ComfyUI Workflow** — RunPod ComfyUIの独立ワークフロー管理（ObjectInfo: runpodComfyUIUrl）
3. **SD WebUI** — モデル・サンプラー等のSD WebUI固有コントロール

各タブは遅延初期化。ComfyUIタブはそれぞれ独立した `ComfyUIWorkflowEditor` + `ComfyUIWorkflowWindow` インスタンスを持つ。
## Local background-removal Sidecar

The first-round js/local-tools client only talks to loopback addresses and reports connection or processor errors explicitly. local_tools/server.py is a no-model interface stub; it does not replace an image, load rembg/SAM, or download weights. Future processing must remain optional and use the existing image replacement/history helpers.

## NAI 自动审查 (Auto Review) - 2026 更新
- 生图成功后默认执行自动审查 (onPanelGenerationSuccess + finishBatchGenerationReview)。
- 新状态：AUTO_OK（自动审查通过，成品优先）、AUTO_FLAGGED（自动标记待改）。
- 手动审阅 (MANUAL_REVIEW) 变为可选双保险（checkbox 仍存在，但默认行为以自动为主）。
- 目的：减少用户每格必点确认负担，“最好成品给人”。
- 配合导演 system prompt 强化 Pixiv 一流水平描述（一致性、成熟浪漫氛围、灯光、构图）。
- 相关文件：js/ai/panel-pipeline-review.js 、 index.html 帮助文本、project-management.js 默认 prompt。
- 语言：已按用户要求完全移除多语言选项和 UI（index.html 语言栏、i18next 仅保留 zh、相关 helper 清理），锁定中文避免误触。

注意：当前自动审查主要基于生成成功 + 导演规划文本审查（无 vision 时）。如需更强 vision review，可扩展 callDirectorApi 带 image data（若模型支持）。
## 灵活生成尺寸 + 日漫多样分镜 (NSFW PM 竞品打击特性, 2026)
- 目标：原漫画预设（4/5 panels per page） + 每页/每分镜不同尺寸 + 不规则日本漫画分镜（非均匀grid），支持成熟NSFW故事节奏。
- 新模板：manga-4-varied 等（layout-templates.js）。
- 灵活尺寸UI + multi page varied checkbox + batch per-page sizes。
- 竞品优势：灵活分镜+尺寸控制 > 死板竞品。
- 用法见 index.html 帮助和随机切分区。
