# LaMa 局部去字：本地蒙版、预览和可撤销图层（V1）

> 开发分支 `feat/manga-lama-inpainting-v1`，Draft PR #11，依赖 PR #10。当前没有完成 Windows GUI、真实漫画和真实 LaMa 模型实机验收。

## 操作

1. 用现有 Tesseract OCR 或手动框选获得候选字幕框。
2. 点击该条字幕旁的 **本地 LaMa 去字**。
3. 程序对**当前 OCR 文字矩形**周围自动留出上下文，先生成蒙版编辑面板：红色半透明区域代表擦除区。用户可用 **标记去字 / 保留原图** 两种画笔修改蒙版、调节笔刷尺寸、重置到初始 OCR 框；此时不启动模型。
4. 用户确认蒙版范围后，再点击 **根据蒙版生成本地修复预览**。只有此时才把裁剪图片与实际编辑的 PNG 蒙版送至本机 `/manga-smart/lama-inpaint`，执行可选 LaMa 模型；首次使用前会弹窗询问是否下载约 200MB 权重，拒绝则不发出推理请求，推理中可点「取消」中止。
5. 本地安装可选 `simple-lama-inpainting` 的情况下，调用 LaMa 重建文字区域的背景。后端与前端均限制画布范围：**蒙版外始终恢复原始像素**。输出的 Fabric 图层透明度同样按照实际画笔蒙版，而不再使用 OCR 的粗矩形边框。
6. 显示修复图片预览。只有用户点击 **确认并作为独立图层应用**，才在 Fabric 画布上添加新修复层；不会修改底层原图，支持撤销/重做、图层删除与原有工程保存。
7. 应用后自动取消这一条字幕的「纯色覆盖擦字」开关，避免第二次给 LaMa 修好的图叠加白色遮盖。继续修改该条文字后可以用原生 Fabric Textbox 插入新的文字。

## 新增：保守深色文字候选（2026-10-09）

在手绘 LaMa 蒙版旁新增 **提取深色文字候选**。加载 `js/ai/manga-text-ink-mask.js`，对 OCR 文字框周围的亮色不透明、低纹理背景取样，再提出深色像素蒙版。复杂、暗色、不透明度不足或贴近图像边界时直接拒绝并**保留原蒙版**；候选未被识别为语义文字（`verified:false`），需要手动补画/擦回，然后分别点击生成预览与确认应用。候选提取本身不下载模型、不调用 LaMa、GPT/NovelAI API、不修改 Fabric 原图。

新增测试 `npm run test:ink-mask`，并通过 `npm test` 与 `npm run test:gpt-browser` 纳入功能回归。综合现状详见 [最新交接](MANGA_GPT_DEVELOPMENT_HANDOFF.md)。

## 安装

在启动 `99_server.py` 所使用的本地 Python 环境中执行：

```bash
python -m pip install simple-lama-inpainting
```

> PyPI 上**不存在** `simple-lama` 包（404）；正确包名是 `simple-lama-inpainting`（模块 `simple_lama_inpainting`）。
> 该包 0.1.2 版钉死 `numpy<2`、`pillow<10`，在 Python 3.12/3.13 上没有对应 wheel，直接安装会编译 numpy 失败。已在 Linux / Python 3.13.5 + torch 2.14.1 CPU + numpy 2.5.2 + Pillow 12.3.0 上实测可用的安装方式：
>
> ```bash
> python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
> python -m pip install --no-deps simple-lama-inpainting
> python -m pip install opencv-python-headless fire
> ```

真正的运行时调用来自 [enesmsahin/simple-lama-inpainting](https://github.com/enesmsahin/simple-lama-inpainting) 的公开 Python API：`SimpleLama()(PIL.Image, PIL.Image mask)`。权重 `big-lama.pt`（约 196MB）缓存于 `TORCH_HOME/hub/checkpoints/`，也可用环境变量 `LAMA_MODEL` 指向本地文件。服务端未缓存时返回 HTTP 428 `needs_download`，只有用户在弹窗中确认后才带 `allow_download:true` 重发并下载。未安装时仅提示安装，不改变原图。普通纯色气泡去字仍能不用 LaMa 免费执行。

**注意**：默认蒙版以 OCR 文字区域生成的**矩形蒙版**为起点，用户可以用画笔涂抹或擦回，但它仍然不是自动识别出的逐笔画字符分割掩模。即使 LaMa 模型正常运行，也可能移除 OCR 框中的边线、衣服花纹和拟声词。确认预览前绝不应用到漫画。这是后续精确 Text Mask/SAM 分割工作的重点，不可把 V1 宣称为专业笔画级去字。

## 模块与上游来源

| 文件 | 实际职责 | 是否复制上游源码 |
|---|---|---|
| `manga_lama_inpaint.py` | 可选 `simple_lama_inpainting.SimpleLama()`（兼容旧 `simple_lama`）惰性初始化、下载前 428 确认、单任务 429 忙碌保护，校验尺寸/蒙版覆盖比例，返回局部 PNG，并在服务端恢复蒙版外像素 | 没有复制；运行时通过公开 Python API 调用上游包 |
| `manga_smart_ocr.py` | 在原同源安全验证下注册 `/manga-smart/lama-inpaint` | 本仓已有 HTTP 路由扩展 |
| `js/ai/manga-lama-inpaint-ui.js` | 本地蒙版裁切、修复结果预览、用户确认后添加透明修复 Fabric 图层 | 本仓原创代码 |
| `js/ai/manga-smart-text-editor.js` | 每条 OCR 候选的 LaMa 去字入口及与编辑层/撤销的协作 | 本仓原创代码 |
| `scripts/manga-lama-inpaint-test.py` | 模拟模型初始化、缺失依赖、结果结构与坏输入拒绝 | 本仓原创离线测试 |
| `scripts/gpt-browser-acceptance.cjs` | 实际 Chromium 路径，通过本机模拟模型验证去字前不修改、确认后新图层、一次撤销/重做 | 本仓测试，无真实模型费用 |

详见 [UPSTREAM_BORROWING_LEDGER.md](UPSTREAM_BORROWING_LEDGER.md)。

## 验收边界

- 有测试的是端点、图片+蒙版协议、分辨率和图层交互；**不是**真 LaMa 推理质量。
- Windows 本机安装大型 Python/PyTorch 依赖、显存/内存峰值、真实漫画底纹修复质量还未测试。
- 当前没有自动字符级分割、智能边缘吸附、矢量多边形蒙版，也没有自动识别气泡尾巴或人物分割。
- 未点击修复时不加载模型；用户主动运行模型后需要等本地推理完成。无需 GPT/NovelAI Key，但首用模型下载依赖上游服务。

## 可编辑画笔蒙版追加（PR #11 后续迭代）

- `js/ai/manga-lama-inpaint-ui.js` 新增与本机裁剪像素一一对应的 Canvas 蒙版笔刷、双向增删、宽度控制、重置和显式 **生成修复预览** 按钮。
- 未点击「生成」时，无 LaMa 请求、无模型下载；用户修改蒙版时会自动废弃旧推理预览，避免把过期遮罩结果应用到新区域。
- 生成后还需要单独点「确认并作为独立图层应用」。修复层的 alpha 通道来自**最终实际画笔蒙版**，避免矩形透明图层误覆盖修复区外的衣服和背景。
- 浏览器验收包含擦回中心区域、把修改后的蒙版发给模拟本地服务、确认后撤销/重做、取消不调用模型的负测试。未将模拟模型测试解释为真实 LaMa 画质合格。
