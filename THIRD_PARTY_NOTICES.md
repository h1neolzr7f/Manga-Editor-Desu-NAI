# 第三方声明

## 本项目基础

**Manga Editor Desu · nai学长魔改版** 基于 [Manga Editor Desu](https://github.com/new-sankaku/manga-editor-desu)。项目根目录保留其 GPL-3.0 许可证（`LICENSE`），并在 `NOTICE.md` 向原作者致谢。

## 本魔改新增代码

`js/simulator/`、`js/local-tools/`、`local_tools/`、`js/assets/`（本包增量）、一键启动脚本等为本修改版新增或改写，不复制 MayerTalk / rembg-ui 等第三方源码、模型或图片素材。

## 参考项目（未打包）

- MayerTalk：仅参考对话编辑器的产品交互思路（选角色、发对白、独白/旁白/选项、长图导出）；没有复制其角色、图片、代码或明日方舟素材。本项目的剧情编辑器使用原创模板，并可把同一段剧情套到聊天、视觉小说、社交动态、论坛和手机界面。
- rembg-ui：仅参考抠图工作流；没有复制其源码、二进制或模型。
- rembg：可选 MIT 许可处理器，由本地 Sidecar 按需加载；模型权重不进 Git。
- fabric-brush：项目原有笔刷实现，自定义印章笔沿用其 dab/spacing 思路。
- perfect-freehand：仅参考起收笔与平滑的公开算法思路，未复制其源码。
- Image2：当前默认不调用，也没有将生成结果加入仓库。

## 现有依赖

项目原有的 Fabric、Bootstrap、i18next、LZ4/CryptoJS 等第三方依赖及其许可证以项目已有的 `third/`、`cdn-local/`、`package.json` 和根目录许可证/声明为准。本魔改不把 NovelAI 令牌或模型权重打进仓库。

## Windows 安装器内置运行时

自包含 EXE 安装器额外打包 Python 3.12、Node.js 和 Pillow。各组件的许可证文本会复制到安装目录的 `licenses/`。安装界面的简体中文语言文件来自 kira-96 的 Inno Setup Chinese Simplified Translation（MIT），并保留其许可证。rembg 及模型权重不随安装器分发。

## 打包的免费素材（assets/public）

这些文件带明确许可证，可以随包装发。重新拉取：`node scripts/vendor-free-public-assets.cjs`。

- Kenney.nl UI Pack / Game Icons / UI Pack Adventure / Input Prompts（键盘鼠标触摸，不含主机/VR 品牌文件夹）/ Pattern Pack / Particle Pack / Pixel UI Pack：CC0 1.0，https://kenney.nl
- Heroicons（optimized/24/outline）：MIT，https://github.com/tailwindlabs/heroicons
- Tabler Icons 子集（聊天/手机/天气/情绪相关 outline SVG）：MIT，https://github.com/tabler/tabler-icons
- David Revoy 气泡模板：CC BY 4.0，署名 David Revoy / www.peppercarrot.com

没有打包 MayerTalk、明日方舟、微信、Discord、PlayStation、Xbox 等官方或粉丝素材。

## 分发注意

如果分发修改后的程序副本，应同时提供 GPL-3.0 要求的相应源码和许可证信息。私人素材、模型权重、缓存和生成输出不属于公开源码内容。

