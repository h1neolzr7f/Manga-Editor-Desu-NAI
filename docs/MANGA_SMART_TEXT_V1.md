# Manga-NAI 智能漫画编辑：第一条可运行的功能链

> 当前状态：开发分支 `feat/manga-smart-text-v1` / Draft PR #7。先在 Linux / Windows 真实界面验收，再合并。
> 目标：已有漫画 PNG 页 → 本机 OCR 检测 → 修改文本 → 安全去字 → 可编辑 Fabric 图层 → 撤销、保存、导出。

## 操作

1. 启动原有 Manga-NAI，本地浏览器访问 `http://127.0.0.1:8000/index.html`。
2. 打开已有漫画页或导入原图，画布顶部点击 **智能字幕**。
3. 选择 OCR 语言，点击 **检测本页文字**。Tesseract 只在本机执行，**不上传图片到第三方**，不消耗 NovelAI Anlas 或 GPT Image 额度。
4. 每行均可改写文本，勾选需要套用的字幕；日漫竖排可选 **日语竖排＋英语**，新文字默认使用 Fabric VerticalTextbox（若该类不可用则退回 Textbox）。
5. 默认打开 **自动去字（纯色气泡）**。本地采样区域外周背景：只有**不透明且近似纯色**才创建透明边缘遮盖图片，并在其上方创建可编辑文字。图片背景变化大、透明或环采样不足的区域会被跳过，**不会对复杂画面盲目涂白**。
6. 手动调整：点击 **手动框选字幕**，在画布拖动框线，修改新加的「新字幕」文字；按 Esc 取消框选。
7. 点击 **应用为可编辑图层**；每组生成可编辑文字和可选的独立遮盖层，原始图片保持在下层；通过原有保存、撤销、重做、导出功能管理。

## 本机 OCR 安装

程序不捆绑第三方可执行文件；`manga_smart_ocr.py` 自动寻找系统 PATH 中的 `tesseract`，仅通过 Python 标准库与该可执行文件通信。

Debian/Ubuntu Linux：

```bash
sudo apt install tesseract-ocr tesseract-ocr-jpn tesseract-ocr-jpn-vert tesseract-ocr-eng
tesseract --list-langs
```

Windows：安装 Tesseract OCR，并确保 `tesseract.exe` 在 PATH；安装 `jpn.traineddata` 和 `jpn_vert.traineddata`（需要其他语言则另装对应语言数据）。无需额外安装 Python OCR 包。若未安装，界面会明确显示需要安装的组件，并可继续使用手动框选。

## 设计边界 / 目前不能冒充的功能

- 已实现的是 **OCR 文字行区域**，不是任意画面都能准确识别的语义气泡边界。
- **只对纯色背景安全擦字**。复杂背景、纹理、渐变、角色衣服上的印刷字不能保证去干净，需要后续 LaMa / GPT Image 的擦除掩模步骤。
- **自动去字生成的是遮盖图层**，原图没有永久修改；删除遮盖层即可恢复旧字。
- OCR 默认字型/排版会与原画不同；生成的是可编辑 Textbox，用户可继续调字体、尺寸和位置。
- 已有 GPT Image 局部改图、NovelAI 出图不经过 OCR 路由；后续再实现语义定位/人物分割和多面板一致性。
- 目前并未把 BallonsTranslator、PhotoDemon 或其他软件的整套代码复制进来。后续 OCR/分割/去字引擎通过隔离适配器替换，不把桌面软件 GUI 嵌入现有 Fabric 前端。
- PR 依赖 Grok Linux 安全修复分支 `fix/grok-linux-acceptance`；该分支仍需审查原有 Tagger/Director 跨来源代理问题，**绝不能绕过安全验收直接合并**。

## 测试

```bash
npm run test:smart-text
npm run test:smart-ocr
npm run test:gpt-http
npm run test:gpt-browser
npm run test:proxy-guards
npm run check-translations
```

- `scripts/manga-smart-text-test.cjs`：文字框边界、OCR 结果正规化、透明/复杂背景禁止自动擦除。
- `scripts/manga-smart-ocr-test.py`：Tesseract TSV 分行、日文竖排模式、语言白名单、超大图、缺失 OCR 引擎、跨站访问。
- `scripts/gpt-http-integration-test.py`：实际本机 HTTP 请求路径，真实同源允许，恶意 `Origin: null`/cross-site 拒绝。
- `scripts/gpt-browser-acceptance.cjs`：Chromium 真实画布、模拟 OCR 响应、人工修改字幕、纯色背景擦字、可编辑对象序列化、撤销重做、复杂背景不覆盖。

## 后续完成完整智能漫画编辑的工作

1. `MangaOcrAdapter` 支持本地 Manga OCR（日文识别）与现有 Tesseract；`BubbleDetector` 支持模型识别及分镜关联，不依赖页面中的每个文本行都恰好归属一个气泡。
2. `TextInpaintAdapter` 添加 LaMa 局部去字，以透明 mask 而非全页重绘工作；沿用 GPT 现有的上下文补白、羽化和像素保留机制。
3. `RegionSegmenter` 添加人物实例/区域遮罩（SAM 类），自动扩展被截断的角色身体，保留边缘和衣服细节。
4. `EditPlanner` 接受自然语言「第二格人物换成参考图、保留气泡」，解析为显式**待用户确认**的操作列表；真正的生成调用仍经过本地密钥约束、计费确认和预览。
5. 搭建 NovelAI Harness 的焦点重绘、角色锚点和参考图模型能力的隔离适配器；两个前端各保留自己的 UI，避免重复继承 GUI 代码。
6. 各模块的跨项目复用正式分发之前核对每个代码文件/模型权重许可和归属清单，替换不适合的依赖。

## 交付标准

第一阶段在没有额外 API 调用的前提下可以测试；真正的端到端日文 OCR 仍需要安装 Tesseract 和对应语言模型的 Linux/Windows 机器验证。Windows 一键启动、Clash TUN、官方 OpenAI 以及复杂背景智能去字都不能因为模拟测试通过而写为 PASS。
