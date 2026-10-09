# Manga-NAI-GPT 第一阶段：图像接口与局部编辑

> 开发分支：`feat/manga-nai-gpt-region-editor`。本阶段是可操作的基础链路，不是完整的 AI 漫画语义编辑器。NovelAI / AI 导演保持原样。

## 使用方式

1. 运行原来的 `一键启动.bat` 或 `start_manga_editor_nai.ps1`，打开本地编辑器（推荐 `http://127.0.0.1:8000`）。
2. 在画布上方点 **GPT 改图**。默认操作是“局部改图 / 角色替换”，点 **框选区域** 后在画布上按住鼠标左键或右键拖动；Esc 取消。
3. 填写 **HTTPS 兼容 API 基础地址** 和真实的模型 ID。官方示例：`https://api.openai.com/v1` / `gpt-image-1`。第三方中转站示例：`https://litangking.12gg.workers.dev/v1`，模型名必须以服务商实际支持的为准。
4. 输入 API Key、修改描述，按需上传最多 3 张 PNG/JPEG/WebP 参考图；点击 **生成预览**。API 请求可能计费。
5. 检查预览效果后选择 **作为新图层应用**。生成图覆盖的是选区内新图层，原图没有被删除，可以使用编辑器已有的 Undo 撤销。生图模式无需先框选。
6. 选中画布上的文字图层后，展开“原生字幕修改”，输入文本并点击替换。这里只实现文本替换，不包含 GPT OCR/语义重排。

本地服务也支持在未输入 Key 时读取可选环境变量 `GPT_IMAGE_API_KEY`；不要提交含密钥的 `.env`。第三方服务能够读取提交的提示词、源图和参考图，使用前请自行确认其隐私与计费规则。

## 接口契约

编辑器 POST `/gpt-image-proxy`（仅允许本机访问）。请求 JSON：`baseUrl`、`model`、`operation`（`edit` 或 `generate`）、`prompt`、`size`；编辑操作包含 `image` Data URL、可选 `references` Data URL 列表。密钥放在 `Authorization: Bearer <TOKEN>`，不会写入仓库或 localStorage。代理根据操作请求对应的 `/images/edits` multipart 或 `/images/generations` JSON 接口。

返回：`{"ok":true,"image":"data:image/png;base64,...","revisedPrompt":""}`。兼容 `data[0].b64_json` 和 `data[0].url` 响应（仅公开 HTTPS 图像 URL）。部分第三方站点的图片接口格式与 OpenAI 不一致，不保证全部兼容。

安全约束：HTTPS 公网主机，禁止内网地址与跨站重定向；请求体最多 36 MB、单图最多 12 MB。此接口不应暴露为公网转发服务。

## 保真边界

- 保留原有画布宽高，修改结果放置在独立图层，不修改未选区域的像素。
- 生成图的实际像素尺寸可能低于选区；**默认拒绝低于选区分辨率的结果放大覆盖**。如果你明确接受局部清晰度下降，可选择允许放大。预览、API 费用在应用前已经产生。
- 当前只做矩形框选及矩形区域回填，不实现边缘语义分割、遮挡优化、自动多层输出或完美角色一致性。
- 完整“自然语言定位气泡 → OCR → 编辑文本 → 还原字体/描边 → 自动排版”留到后续阶段，不能把简单文本替换冒充这项能力。

## 离线验证

```bash
python -m py_compile gpt_image_proxy.py 99_server.py
python scripts/gpt-image-proxy-smoke-test.py
node scripts/gpt-region-editor-smoke-test.cjs
npm test
```

上述脚本使用假密钥与模拟上游，不消耗额度。真实验收需分别检查官方与第三方中转站至少各一次：生成、图像编辑、参考图、失败提示、图层保存/重新打开、Undo/Redo、原始分辨率与 Windows 安装包。
