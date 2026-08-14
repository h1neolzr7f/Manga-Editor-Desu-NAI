# NOTICE — 修改声明与致谢

本程序英文名仍为 **Manga Editor Desu**，发布名是 **Manga Editor Desu · nai学长魔改版**。

向原作者 **new-sankaku** 与原项目 [manga-editor-desu](https://github.com/new-sankaku/manga-editor-desu) 致敬。没有原作的分镜编辑器，就没有这个魔改包。

- 上游许可证：GNU General Public License v3.0（见根目录 `LICENSE`）  
- 本修改版版本：**1.0.0**  
- 本修改版发布日期：**2026-08-14**  
- 本仓库：https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI  
- 与上游关系：**非正式、非附属**。请勿把本包的问题开到上游仓库。

按 GPL-3.0 要求，本副本已标明为修改版，并继续以 GPL-3.0 提供对应源码。

## 相对上游的主要修改

1. 出图后端从 ComfyUI / A1111 WebUI / Forge 等，改为 **NovelAI API**（需用户自备访问令牌；会消耗 NovelAI 积分）。
2. 增加 Windows **一键启动**本地服务（`99_server.py`），不要用 `file://` 打开页面。
3. 增加中文小白流程：侧栏分组、工具选项条、空画布提示、Token 状态。
4. 增加对话 / 网页 / 零件 **模拟器工作台**（通用界面样式，不含真实站点商标）。
5. 增加画布 Ctrl+滚轮缩放、整页放大缩小、贴合分镜。
6. 增加本地抠图（无服务时回退浏览器颜色抠图）。
7. 导演分镜文案走可选的 OpenAI 兼容网关；最终格子出图仍只走 NovelAI。

上游编辑器本体（分镜、气泡、图层、刀切、网点、撤销、多页等）仍基于原项目。

## 不包含

- NovelAI / 导演网关的账号或令牌  
- 第三方游戏官方素材、真实聊天软件皮肤、真实视频站商标  
- 模型权重
