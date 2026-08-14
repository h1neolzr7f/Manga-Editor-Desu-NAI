<div align="center">

# Manga Editor Desu · NovelAI Edition

### 面向 NovelAI 创作者的本地漫画工作台

**分镜与图层 · 对话气泡 · NovelAI 出图 · 模拟器场景 · 本地抠图 · Windows 一键启动**

[English](README_EN.md) · [日本語](README_JP.md)

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/h1neolzr7f/Manga-Editor-Desu-NAI)](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/latest)
[![Upstream](https://img.shields.io/badge/upstream-manga--editor--desu-0A7EA4)](https://github.com/new-sankaku/manga-editor-desu)

[下载 v1.0.0 一键包](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/tag/v1.0.0) ·
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
| **Windows 一键启动** | 双击批处理文件，自动启动本地服务器并打开编辑器 |
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

## Requirements

- Windows 10 or 11
- Python 3
- Chrome or Edge
- A NovelAI access token, if you generate images

---

## Quick start (Windows)

1. Download the source or the [v1.0.0 one-click zip](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/tag/v1.0.0).
2. Extract the **entire** folder.
3. Double-click `一键启动.bat`.
4. Wait for `http://127.0.0.1:8000/index.html`.
5. Open **NovelAI 设置** and paste your token.

Step-by-step notes (Chinese): [先看我.txt](先看我.txt) · [使用说明.txt](使用说明.txt)

If the UI looks stale after a code change, hard-refresh with **Ctrl+F5**.

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

To rebuild the Windows zip (excludes `.git`, `.env`, and `user_data`):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\make-one-click-zip.ps1
```

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
