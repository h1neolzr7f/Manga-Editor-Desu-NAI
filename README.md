<div align="center">

# Manga Editor Desu · NovelAI Edition

### 面向 NovelAI 创作者的本地漫画工作台

**分镜与图层 · 对话气泡 · NovelAI 出图 · 模拟器场景 · 本地抠图 · Windows 一键启动**

[English](README_EN.md) · [日本語](README_JP.md)

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/h1neolzr7f/Manga-Editor-Desu-NAI)](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/latest)
[![Verify](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/actions/workflows/verify.yml/badge.svg)](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/actions/workflows/verify.yml)
[![Upstream](https://img.shields.io/badge/upstream-manga--editor--desu-0A7EA4)](https://github.com/new-sankaku/manga-editor-desu)

[下载最新版](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/latest) ·
[查看相对上游的改动](CHANGELOG.md) ·
[问题反馈](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/issues)

</div>

<p align="center">
  <img src="03_images/PagePreview/Git/Preview.png" alt="Manga Editor Desu 漫画编辑器界面" width="880">
</p>
<p align="center"><sub>编辑器基础界面继承自 Manga Editor Desu；本版本新增能力见下表与 CHANGELOG。</sub></p>

## 为什么做这个版本？

原版 Desu 已经拥有分镜、气泡、图层、刀具、网点、画笔和多页工程。本版本不重新造漫画编辑器，而是把它改造成一套更适合 **NovelAI 本地创作流程**的发行版：

| 新增能力 | 作用 |
|---|---|
| **NovelAI 专用生成** | 直接在编辑流程里完成文生图与图生图，不再暴露无关后端 |
| **Windows 小白安装器** | 安装一次，从快捷方式启动；无需另装 Python 或 Node.js |
| **模拟器工作区** | 通用聊天、网页与 UI 组件，用于漫画中的手机和社交场景 |
| **本地抠图** | 可选 rembg sidecar；缺少模型时保留颜色键回退 |
| **中文新手布局** | 设置分组、工具提示、空画布引导和 Token 状态 |
| **画布视图工具** | Ctrl+滚轮缩放、整页适配与面板缩放 |

> [!IMPORTANT]
> 这是 [new-sankaku/manga-editor-desu](https://github.com/new-sankaku/manga-editor-desu) 的非官方 GPL-3.0 修改发行版，不代表上游作者。基础编辑能力来自 Desu；本仓库负责 NovelAI、启动器、模拟器与抠图相关改动。

## Attribution

This work is a modified copy of [new-sankaku/manga-editor-desu](https://github.com/new-sankaku/manga-editor-desu), licensed under the [GNU GPL v3.0](LICENSE).

Per GPL-3.0, the modifications are identified in [NOTICE.md](NOTICE.md) and [CHANGELOG.md](CHANGELOG.md). Corresponding source is provided in this repository.

Please file issues for **this fork** here. Do not open NovelAI / launcher / simulator reports on the upstream tracker unless the same defect reproduces on unmodified Desu.

| | |
|---|---|
| Upstream | https://github.com/new-sankaku/manga-editor-desu |
| This repository | https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI |
| License | [GPL-3.0](LICENSE) (same as upstream) |
| Third-party assets | [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) |

---

## What this fork adds

- **NovelAI-only generation** — ComfyUI / A1111 WebUI / Forge backends are disabled. You supply your own access token; generation spends NovelAI credits.
- **Windows one-click host** — `一键启动.bat` starts a local server at `http://127.0.0.1:8000`. Do not open `index.html` via `file://`.
- **Beginner Chinese layout** — grouped sidebar, tool hints, empty-canvas guide, token status.
- **Simulator workspace** — generic chat, mock web pages, and UI parts for comic staging. No real site trademarks.
- **Canvas view tools** — Ctrl+wheel zoom, page scale, fit-to-panel.
- **Local cutout** — optional rembg sidecar; color-key fallback when the sidecar is absent.

---

## 安装方式（Windows）

### 普通用户：EXE 安装器（推荐，从 v1.0.1 起）

1. 打开 [Releases](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/latest)，下载 `Manga-Editor-Desu-NAI-Setup-*.exe`。
2. 双击安装，可选择创建桌面快捷方式。
3. 从开始菜单或桌面打开 **Manga Editor Desu NAI**。
4. 打开 **NovelAI 设置**，粘贴你自己的令牌。

安装器内置 Python 3.12、Node.js 和 Pillow；不需要另装开发环境，也不需要管理员权限。体积较大的 rembg 模型仍为可选项，不会偷偷下载。

### 便携包 / 源码

1. 下载 ZIP 或源码并解压**整个文件夹**。
2. 确保 Windows 10/11 已安装 Python 3；批量素材工具还需要 Node.js。
3. 双击 `一键启动.bat`。
4. 等待浏览器打开 `http://127.0.0.1:8000/index.html`。

浏览器推荐 Chrome 或 Edge。只有使用出图功能时才需要 NovelAI 访问令牌（会消耗 NovelAI 积分）。

分步说明：[先看我.txt](先看我.txt) · [使用说明.txt](使用说明.txt)

如果更新后仍显示旧界面，请按 **Ctrl+F5** 强制刷新。

---

## Compared with upstream

| | Manga Editor Desu | This fork |
|---|---|---|
| Launch | `index.html` or the official demo | `一键启动.bat` → `127.0.0.1:8000` |
| Generation | ComfyUI / WebUI / Forge | NovelAI API only |
| Simulator | — | Chat / mock web / parts |
| UI | Professional editor | Same canvas tools, plus a Chinese beginner path |

---

## Operational notes

- Confirm the credit dialog before generate or batch generate.
- Simulator skins are generic comic chrome. They are not NovelAI prompts by themselves; place them in panels to generate.
- Keep `.env`, tokens, and `user_data/` off git and off public uploads.
- Optional director text uses an OpenAI-compatible gateway. Final panel images still go through NovelAI.

To rebuild the portable Windows zip (excludes `.git`, `.env`, and `user_data`):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\make-one-click-zip.ps1
```

The self-contained EXE is built by [Build Windows installer](.github/workflows/build-windows-installer.yml). A `v*` tag builds, smoke-tests, and publishes the installer to that GitHub Release.

---

## Development

```bash
npm test
```

Related checks: `npm run test:layout`, `npm run test:simulator`, `npm run test:story-engine`.  
See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License and credits

Copyright for the original editor belongs to the upstream authors. See [manga-editor-desu](https://github.com/new-sankaku/manga-editor-desu).

This modified version is released under **GPL-3.0**. Redistribution must include the corresponding source and this license.

Thanks to **new-sankaku** for Manga Editor Desu. This fork exists because that editor already solved panels, bubbles, layers, and project persistence.

---

**💬 QQ 测试 / 反馈群：762652608**
