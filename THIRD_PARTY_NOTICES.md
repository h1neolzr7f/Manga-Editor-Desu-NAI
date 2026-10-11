# 第三方声明

## 本项目基础

**Manga Editor Desu · nai学长魔改版** 基于 [Manga Editor Desu](https://github.com/new-sankaku/manga-editor-desu)。项目根目录保留其 GPL-3.0 许可证（`LICENSE`），并在 `NOTICE.md` 向原作者致谢。

## 许可证核对结论（2026-10-11）

本项目整体为 **GPL-3.0**。下列组件均已对照来源核对许可证（GitHub license API / Hugging Face 模型卡 / 文件头）。

**已处理（2026-10-11）**：intro.js（AGPL-3.0）已移除，新手引导是本项目自写代码；おひさまフォント 与 851 系列字体已从仓库移除，旧项目里的这些字体名自动改用外观相近的 OFL 字体显示。

## 按需下载的模型（不进 Git，首次使用前弹窗确认 + SHA-256 校验）

| 模型 | 用途 | 来源 | 许可证 | 兼容性 |
|---|---|---|---|---|
| comic-text-detector（`comictextdetector.pt.onnx`，约 91 MB） | 改字幕/去字的文字蒙版 | https://github.com/dmMaze/comic-text-detector ，权重发布于 https://github.com/zyddnys/manga-image-translator/releases/tag/beta-0.3 | GPL-3.0 | ✅ 与本项目相同 |
| SAM 2.1 hiera-tiny（`sam2.1_hiera_tiny.pt`，约 149 MB） | 智能点选 / 人物细分 | https://github.com/facebookresearch/sam2 ，权重 https://dl.fbaipublicfiles.com/segment_anything_2/092824/ | Apache-2.0（代码与权重） | ✅（Apache-2.0 可并入 GPL-3.0） |
| isnet-anime（`isnet-anime.onnx`，约 168 MB） | 换角色：前景人物分割 | https://github.com/SkyTNT/anime-segmentation ，ONNX 由 https://github.com/danielgatis/rembg/releases 提供 | Apache-2.0（rembg 为 MIT） | ✅ |
| 动漫人脸检测 YOLOv8 `face_detect_v1.4_s` | 换角色：找脸、跨格匹配 | https://huggingface.co/deepghs/anime_face_detection | MIT | ✅ |
| CCIP `ccip-caformer-24-randaug-pruned`（特征 + 度量） | 换角色：同一角色识别 | https://huggingface.co/deepghs/ccip_onnx | **OpenRAIL**（带使用限制条款） | ⚠️ 不是 OSI 许可证；因为是**用户按需下载、不随仓库分发**，不影响本项目的 GPL-3.0；README 中提示其使用限制 |
| LaMa（经 `simple-lama-inpainting`，约 200 MB） | 修瑕疵/去字 | https://github.com/advimman/lama ，https://github.com/enesmsahin/simple-lama-inpainting | Apache-2.0 | ✅ |
| manga-ocr（`kha-white/manga-ocr-base`，约 400 MB） | 日文竖排精修识别 | https://github.com/kha-white/manga-ocr ，https://huggingface.co/kha-white/manga-ocr-base | Apache-2.0 | ✅ |
| Tesseract OCR + tessdata | 文字识别（系统安装） | https://github.com/tesseract-ocr/tesseract ，https://github.com/tesseract-ocr/tessdata_best | Apache-2.0 | ✅（不打包，调用系统程序） |

Python 运行依赖（pip 安装，不打包）：PyTorch CPU（BSD-3）、onnxruntime（MIT）、OpenCV（Apache-2.0）、NumPy（BSD-3）、Pillow（MIT-CMU）—— 均兼容。

## 打包的前端库（`third/`、`cdn-local/`、`js/ui/third/`）

| 组件 | 版本 | 许可证 | 来源 |
|---|---|---|---|
| Fabric.js（含 eraser 构建） | 5.3.0 / 5.2.1 | MIT | https://github.com/fabricjs/fabric.js |
| Bootstrap | 5.2.3 | MIT | https://github.com/twbs/bootstrap |
| i18next | — | MIT | https://github.com/i18next/i18next |
| Tippy.js + Popper | 6.x / 2.11.8 | MIT | https://github.com/atomiks/tippyjs |
| JSZip | 3.7.1 | MIT 或 GPL-3.0（双许可，选 MIT） | https://github.com/Stuk/jszip |
| localForage | 1.10.0 | Apache-2.0 | https://github.com/localForage/localForage |
| lodash | 4.x | MIT | https://github.com/lodash/lodash |
| hotkeys-js | 3.13.7 | MIT | https://github.com/jaywcjlove/hotkeys-js |
| interact.js | 1.10.17 | MIT | https://github.com/taye/interact.js |
| JSTS | — | EPL-1.0 或 EDL-1.0（双许可，选 EDL/BSD-3，兼容） | https://github.com/bjornharrtell/jsts |
| PixiJS / pixi advanced-blend-modes | 8.3.4 | MIT | https://github.com/pixijs/pixijs |
| glfx.js | — | MIT | https://github.com/evanw/glfx.js |
| browser-image-compression | 2.0.2 | MIT | https://github.com/Donaldcwl/browser-image-compression |
| crypto-js | — | MIT | https://github.com/brix/crypto-js |
| lz4 (asm/wasm) | — | MIT | https://github.com/Benzinga/lz4js 及原项目 third/lz4 头注释 |
| three.js | — | MIT | https://github.com/mrdoob/three.js |
| Chart.js | 4.5.1 | MIT | https://github.com/chartjs/Chart.js |
| Masonry | 4.2.2 | MIT | https://github.com/desandro/masonry |
| Tagify | 4.37.1 | MIT | https://github.com/yairEO/tagify |
| wordcloud2.js | 1.2.3 | MIT | https://github.com/timdream/wordcloud2.js |
| stacktrace.js | — | MIT | https://github.com/stacktracejs/stacktrace.js |
| jscolor | — | GPL-3.0（或商业） | https://jscolor.com |
| flag-icons | — | MIT | https://github.com/lipis/flag-icons |
| Material Icons / Symbols（`assets/fonts/material`） | — | Apache-2.0 | https://github.com/google/material-design-icons |

已删除：`third/GoogleAnalytics/googleAnalytics.js`（上游的 Google Tag 脚本，内含上游跟踪 ID；本分支从未加载，属死代码且有隐私风险）。

## 打包的字体（`font/`）

| 字体 | 许可证 | 随附文件 |
|---|---|---|
| Bangers、ChalkJP、DokiDokiFont2、DotGothic16、Kalam、Klee One、Rampart One、Stick、Train One | SIL OFL 1.1 | 各目录 `OFL.txt` ✅ |

## 本魔改新增代码

`js/simulator/`、`js/local-tools/`、`local_tools/`、`js/assets/`（本包增量）、一键启动脚本等为本修改版新增或改写，不复制 MayerTalk / rembg-ui 等第三方源码、模型或图片素材。

## 参考项目（未打包）

- MayerTalk：仅参考对话编辑器的产品交互思路（选角色、发对白、独白/旁白/选项、长图导出）；没有复制其角色、图片、代码或明日方舟素材。本项目的剧情编辑器使用原创模板，并可把同一段剧情套到聊天、视觉小说、社交动态、论坛和手机界面。
- rembg-ui：仅参考抠图工作流；没有复制其源码、二进制或模型。
- rembg：可选 MIT 许可处理器，由本地 Sidecar 按需加载；模型权重不进 Git。
- fabric-brush：项目原有笔刷实现，自定义印章笔沿用其 dab/spacing 思路。
- perfect-freehand：仅参考起收笔与平滑的公开算法思路，未复制其源码。
- Image2：当前默认不调用，也没有将生成结果加入仓库。

## Windows 安装器内置运行时

自包含 EXE 安装器额外打包 Python 3.12、Node.js 和 Pillow。各组件的许可证文本会复制到安装目录的 `licenses/`。安装界面的简体中文语言文件来自 kira-96 的 Inno Setup Chinese Simplified Translation（MIT），并保留其许可证。rembg 及模型权重不随安装器分发。

## 打包的免费素材（assets/public）

这些文件带明确许可证，可以随包装发。重新拉取：`node scripts/vendor-free-public-assets.cjs`。

- Kenney.nl UI Pack / Game Icons / UI Pack Adventure / Input Prompts（键盘鼠标触摸，不含主机/VR 品牌文件夹）/ Pattern Pack / Particle Pack / Pixel UI Pack：CC0 1.0，https://kenney.nl
- Heroicons（optimized/24/outline）：MIT，https://github.com/tailwindlabs/heroicons
- Tabler Icons 子集（聊天/手机/天气/情绪相关 outline SVG）：MIT，https://github.com/tabler/tabler-icons
- David Revoy 气泡模板：CC BY 4.0，署名 David Revoy / www.peppercarrot.com

没有打包 MayerTalk、明日方舟、微信、Discord、PlayStation、Xbox 等官方或粉丝素材。

## 按需下载的示例图（提示词助手，不进公开仓库）

提示词助手的示例缩略图（约 167 MB）不随公开仓库分发，清单 `json_js/prompt-helper-images.json` 记录每张图的 SHA-256 和大小；用户在提示词助手里点「下载示例图」后才下载，逐张校验，存到 `user_data/prompt-helper/`。

| 图包 | 数量 / 大小 | 许可 | 下载来源 |
|---|---|---|---|
| 上游示例图 | 446 张 / 约 30 MB | GPL-3.0（与上游项目相同） | https://github.com/new-sankaku/manga-editor-desu ，固定在提交 `04e0cf3de1f3677682f6d1831f2713db70e441ba` |
| NovelAI 素材示例图 | 453 张 / 约 137 MB | 本魔改用 NovelAI 生成，随本项目 GPL-3.0 | https://github.com/h1neolzr7f/Manga-NAI-GPT/releases/tag/v1.0.0 的附件 `prompt-helper-novelai-v1.zip`（整包 SHA-256 + 逐张 SHA-256 校验） |

## 分发注意

如果分发修改后的程序副本，应同时提供 GPL-3.0 要求的相应源码和许可证信息。私人素材、模型权重、缓存和生成输出不属于公开源码内容。


## 待决（需要你决定）

1. **CCIP（OpenRAIL）**：按需下载，不随仓库分发；README 已说明。若希望全部组件都是 OSI 许可，可改用纯人脸特征（会降低跨格匹配准确度）。
