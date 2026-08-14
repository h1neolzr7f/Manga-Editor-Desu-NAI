<div align="center">

# Manga Editor Desu · NovelAI Edition

### A local manga workspace tailored for NovelAI creators

**Panels & layers · Speech bubbles · NovelAI generation · UI simulators · Local cutout · One-click Windows host**

[中文](README.md) · [日本語](README_JP.md)

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/h1neolzr7f/Manga-Editor-Desu-NAI)](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/latest)
[![Upstream](https://img.shields.io/badge/upstream-manga--editor--desu-0A7EA4)](https://github.com/new-sankaku/manga-editor-desu)

[Download v1.0.0](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/tag/v1.0.0) ·
[Changes from upstream](CHANGELOG.md) ·
[Report an issue](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/issues)

</div>

<p align="center">
  <img src="03_images/PagePreview/Git/Preview.png" alt="Manga Editor Desu editor interface" width="880">
</p>
<p align="center"><sub>The core editor UI comes from Manga Editor Desu. Fork-specific additions are listed below and in CHANGELOG.</sub></p>

## Why this edition?

The upstream editor already provides panels, bubbles, layers, the knife tool, tones, brushes, and multi-page projects. This edition keeps that foundation and packages a narrower **NovelAI-first local workflow**:

| Addition | What it does |
|---|---|
| **NovelAI-only generation** | Keeps text-to-image and image-to-image inside the editor without unrelated backend setup |
| **One-click Windows host** | Starts a local server and opens the editor from a batch launcher |
| **Simulator workspace** | Generic chat, web-page, and UI components for in-story screens |
| **Local cutout** | Optional rembg sidecar with a color-key fallback |
| **Beginner Chinese layout** | Grouped settings, tool hints, empty-canvas guidance, and token status |
| **Canvas view tools** | Ctrl+wheel zoom, page scaling, and fit-to-panel controls |

> [!IMPORTANT]
> This is an unofficial GPL-3.0 modified distribution of [new-sankaku/manga-editor-desu](https://github.com/new-sankaku/manga-editor-desu). It is not affiliated with or endorsed by the upstream author.

## Quick start on Windows

1. Download and fully extract the [v1.0.0 archive](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/tag/v1.0.0).
2. Double-click `一键启动.bat`.
3. Wait for `http://127.0.0.1:8000/index.html` to open.
4. Open NovelAI settings and paste your own access token.

Do not open `index.html` through `file://`. Image generation spends NovelAI credits.

## Requirements

- Windows 10 or 11
- Python 3
- Chrome or Edge
- A NovelAI access token only when generating images

## Attribution and development

The original editor, English name, and core editing features come from [new-sankaku/manga-editor-desu](https://github.com/new-sankaku/manga-editor-desu). Modifications are identified in [NOTICE.md](NOTICE.md) and [CHANGELOG.md](CHANGELOG.md).

Please report NovelAI, launcher, simulator, and cutout issues in this repository. Only report them upstream when the same issue reproduces on unmodified Desu.

## License

GNU GPL v3.0, the same license as upstream. Keep [LICENSE](LICENSE), [NOTICE.md](NOTICE.md), and the corresponding source when redistributing. Third-party assets are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
