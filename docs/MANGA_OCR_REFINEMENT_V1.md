# Manga OCR 日漫字幕精修（V1）

> 开发 PR #10，基于 Character Bible PR #9；当前仅为功能开发，未做最终 Windows / 漫画实机验收。

## 用户操作

1. 安装基础 `Tesseract`，按常规方式进入 **智能字幕 → 检测本页文字**；也可以直接 **手动框选字幕**，不必先完成全文 OCR。
2. 在任何一条候选字幕右侧点击 **Manga OCR 精修**。
3. 前端会从**未修改的画布截图**中裁剪该条文字的局部区域，适度扩展四周上下文，并发送给**本机** `/manga-smart/manga-ocr`。坐标不变，没有任何新图层或去字操作。
4. 可选 `manga-ocr` Python 依赖对裁剪区域进行日文识别，结果回填当前**候选文字框**。用户可以继续编辑，再点原有 **应用为可编辑图层**。
5. 识别期间如果画面、候选项或用户已经输入的文字发生变化，延迟返回结果会被丢弃，避免覆盖用户改好的字幕。
6. 不点击按钮时 **不会初始化模型或下载权重**。此功能不调用 GPT Image、NovelAI、第三方中转站，也不扣生图额度。

## 可选安装

请在运行 `99_server.py` 使用的同一个本地 Python 环境中执行：

```bash
python -m pip install manga-ocr
```

参考项目 <https://github.com/kha-white/manga-ocr>。首次**主动**点击精修时，服务端先返回 428 并弹窗询问；确认后下载预训练模型（transformers 5.x 会同时取 `model.safetensors` 与 `pytorch_model.bin`，实测共约 850MB），之后可以缓存离线使用。它的依赖通常包含 PyTorch、Transformers 和 Pillow；安装与模型体积远大于 Tesseract，因此不会作为默认强制依赖，也不会在轻量 CI 自动安装。

## 为什么是“先检测候选框，再精修文字”

Manga OCR 的 `MangaOcr(PIL.Image)` API 返回 **文字，不是检测框**。它能识别日漫复杂文字、注音和竖排，但对不含文字的画面也可能生成看似合理的文字。直接整页调用后强行给结果配位置，会产生假坐标和错擦画面。<https://github.com/kha-white/manga-ocr>

因此这次只做独立 `TextRecognizerAdapter`：

- Tesseract 或手动框选负责提供可确认的像素区域；
- Manga OCR 对选区重新识别，返回 `{text, verified:false, width, height, engine}`；
- Fabric 字幕仍由人确认和保存，原始画布从未被识别请求修改；
- 真正的气泡检测器仍是另一个模块，与这个文字识别器彻底分离。

## 代码与借鉴方式

| 文件 | 职责 | 上游 |
|---|---|---|
| `manga_ocr_refiner.py` | 按需导入 `manga_ocr.MangaOcr()`、复用进程内模型、校验 PNG 裁剪图、推理互斥锁 | **只调用** [kha-white/manga-ocr](https://github.com/kha-white/manga-ocr) 的官方 Python API，不复制其源码或模型 |
| `manga_smart_ocr.py` | 新增受本机同源验证保护的 `/manga-smart/manga-ocr` 路由，普通 `/manga-smart/ocr` 不变 | 本仓原有服务端 |
| `js/ai/manga-smart-text-editor.js` | 每条候选框新增精修按钮、选择区域截图、回填文本、校验画布与旧文字状态 | 本仓 Fabric UI 原创代码 |
| `scripts/manga-ocr-refiner-test.py` | 模拟模型缓存、返回格式、没有结果、拒绝外站请求和无依赖时的可读错误 | 原创测试，不下载模型 |
| `scripts/gpt-browser-acceptance.cjs` | 真 Chromium 点击 Manga OCR 精修并检查只改变候选文字、不改画布、不扣 GPT 额度 | 原项目测试工作流 |

来源与未来许可审计记录在 [UPSTREAM_BORROWING_LEDGER.md](UPSTREAM_BORROWING_LEDGER.md)。

## 当前尚未验收

- 真实日文漫画样本中不同竖排/注音/手写字体的准确率；
- 重模型首次下载耗时、低内存电脑性能和 GPU 配置；
- Windows GUI 安装 `manga-ocr` 后的完整用户体验；
- 精确气泡识别、角色自动分割和 LaMa 复杂背景修复。

以上均需在后续综合实机验收阶段完成，不能因为模拟测试通过就标成 PASS。
