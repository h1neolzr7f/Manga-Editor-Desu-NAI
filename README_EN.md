<div align="center">

# Manga-NAI-GPT

**A beginner-friendly manga editing and lettering tool**: swap characters, rewrite captions, remove objects, split layers and draw whole pages — most jobs take 2–4 clicks.

[![Release](https://img.shields.io/github/v/release/h1neolzr7f/Manga-NAI-GPT)](https://github.com/h1neolzr7f/Manga-NAI-GPT/releases/latest)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)
[![CI](https://github.com/h1neolzr7f/Manga-NAI-GPT/actions/workflows/manga-full-acceptance.yml/badge.svg)](https://github.com/h1neolzr7f/Manga-NAI-GPT/actions/workflows/manga-full-acceptance.yml)
[![Windows checks](https://github.com/h1neolzr7f/Manga-NAI-GPT/actions/workflows/windows-checks.yml/badge.svg)](https://github.com/h1neolzr7f/Manga-NAI-GPT/actions/workflows/windows-checks.yml)

[中文](README.md) · **English** · [Quick start (Chinese)](docs/QUICK_START_BEGINNER.md) · [Docs](docs/README.md) · [Changelog](CHANGELOG.md)

![Open → pick a task → done](docs/images/hero.gif)

</div>

Manga-NAI-GPT is built on [Manga Editor Desu](https://github.com/new-sankaku/manga-editor-desu) and turns common jobs into task cards: open a page, pick a task, follow steps 1-2-3. Text detection, OCR, text removal, cutouts and panel detection run **on your own computer, CPU only**. Redrawing (character swap, drawing a page) uses **the OpenAI-compatible image service you configure**; image generation uses NovelAI. Every result lands on a new layer — the original stays untouched and `Ctrl+Z` undoes it in one step. The UI is Chinese-first (Japanese, English, Korean and others are available).

## Features

| Task | What it does | Needs |
|---|---|---|
| **换角色 Character swap** | Finds the characters → click the one to replace → upload a reference → preview / compare → apply; can repeat for the same character in other panels (face matching) | Image service + local detection |
| **改字幕 Captions** | Text is detected on import → edit the lines → old text erased, new text typeset to the bubble (CJK line-breaking, keep SFX option) | Local (free) |
| **修瑕疵 / 去杂物 Fix / remove** | Box it → preview → apply; seams and tone are matched | Local LaMa or image service |
| **分层 Layers** | Smart click-select (3 candidates) or split by panels in one click | Local (free) |
| **画一页 Draw a page** | Choose panel count or reuse this page's grid → one line of scene + dialogue per panel → generate | Image service |
| **AI 生图 Generate** | NovelAI text-to-image / image-to-image | NovelAI token |
| **专业模式 Pro mode** | All original tools: panels, bubbles, screentones, brushes, multi-page, simulator, export | — |

| Character swap (before / after) | Finished page |
|---|---|
| ![swap](docs/images/swap-before-after.jpg) | ![page](docs/images/comic-page.jpg) |
| **Captions**: OCR cached per page | **Layers**: split by panels |
| ![captions](docs/images/caption.jpg) | ![layers](docs/images/panel-split.jpg) |

## Install (3 steps)

Requires **Python 3.10+** and Chrome / Edge / Firefox. No GPU needed.

| | Windows 10/11 | macOS | Linux |
|---|---|---|---|
| 1. Download | Source ZIP from [Releases](https://github.com/h1neolzr7f/Manga-NAI-GPT/releases/latest), unzip to a short path (e.g. `D:\MangaNAI`) | same, or `git clone` | same, or `git clone` |
| 2. Start | double-click **`一键启动.bat`** | `./start.sh` | `./start.sh` |
| 3. Local AI (optional) | double-click **`安装AI功能.bat`**, then `winget install UB-Mannheim.TesseractOCR` | `bash scripts/install-ai.sh` + `brew install tesseract tesseract-lang` | `bash scripts/install-ai.sh` + `sudo apt install tesseract-ocr tesseract-ocr-jpn tesseract-ocr-chi-sim` |

The browser opens `http://127.0.0.1:8000/index.html`. The launcher window is the local server; closing it stops the server. Local models are downloaded only when first needed, after you confirm (size and license shown, SHA-256 verified).

## Quick start

1. Click **导入漫画页 (Import pages)** on the home screen.
2. Pick a task, e.g. **改字幕 (Captions)**, and follow steps 1, 2, 3 on the card.
3. Apply, or `Ctrl+Z`. **导出全部 (Export all)** gives a ZIP with one PNG per page plus the project file.

## Service settings — every address and key in one place

`⋯` menu → **服务设置 (Service settings)**. Each service has its own *Test connection* button; tests cost nothing.

![Service settings](docs/images/settings.jpg)

| Service | What you enter |
|---|---|
| GPT image (swap, fix, custom, draw a page) | *OpenAI official* or *Custom* (any OpenAI Images compatible service, base URL ending in `/v1`) + API key; after testing, pick from the models that service lists |
| NovelAI | Access token |
| AI Director / import tagger (optional) | Your own chat-model service / local tagger URL |
| Local OCR, text removal, cutout | No key; status only |

- **No built-in relay.** Images are only sent to services you configure.
- Keys stay on this computer. A key in `.env` is only ever sent to the base URL saved in Service settings.
- Starting a GPT task without a configured service opens Service settings with a hint.

## Known limitations

- **Character swap is unstable in complex multi-person panels** — it may touch the other person or distort proportions; always check the before/after compare.
- **Panel detection needs white gutters** — borderless, full-bleed or black-gutter pages need manual boxes.
- **Local AI is CPU-only** — first character detection takes 20–60 s; slow on machines with < 8 GB RAM.
- **Windows is not yet verified on a real machine** (static review + `windows-latest` CI only); see [docs/dev/WINDOWS_READINESS.md](docs/dev/WINDOWS_READINESS.md).
- OCR targets Japanese manga; handwriting and stylised lettering are weaker.

## FAQ

**Double-clicking `index.html` doesn't work?** Use the launcher; browsers disable most features on `file://`.

**Port 8000 in use?** If an editor is already running the launcher just opens the browser; otherwise close the program using the port.

**Do I need GPT / NovelAI?** No. Lettering, captions, text removal, layers and pro mode work fully offline; only swap, draw-a-page and custom edits need an image service.

**GPU?** Not needed.

**Where are models stored?** `~/.cache/manga-editor/` (Windows: `%USERPROFILE%\.cache\manga-editor\`); set `XDG_CACHE_HOME` to move it.

**Prompt-helper thumbnails are blank?** Open the prompt helper and click *下载示例图* (download examples, verified per file).

## Privacy & security

The local server listens on `127.0.0.1` only and every local endpoint checks same-origin; there is no analytics or tracking. Report vulnerabilities privately per [SECURITY.md](SECURITY.md).

## Credits

- Upstream **[Manga Editor Desu](https://github.com/new-sankaku/manga-editor-desu)** by new-sankaku — the editor itself comes from there. This is an unofficial fork, not affiliated with upstream; please file issues here.
- Local models and libraries: comic-text-detector, LaMa, SAM 2, isnet-anime, manga-ocr, Tesseract, deepghs anime face / CCIP and more — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md); developer docs live in [docs/dev/](docs/dev/).

## License

[GPL-3.0](LICENSE), same as upstream.
