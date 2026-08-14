# Manga Editor Desu · nai学长魔改版

[中文](README.md) · [日本語](README_JP.md)

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/h1neolzr7f/Manga-Editor-Desu-NAI)](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/latest)
[![Upstream](https://img.shields.io/badge/upstream-manga--editor--desu-0A7EA4)](https://github.com/new-sankaku/manga-editor-desu)

An **unofficial modified distribution** of [Manga Editor Desu!](https://github.com/new-sankaku/manga-editor-desu) by [new-sankaku](https://github.com/new-sankaku).

The original English name **Manga Editor Desu** is kept. **nai学长魔改版** is only the fork label.

This project is **not** an official upstream release and is **not affiliated** with new-sankaku. The panel editor, speech bubbles, layers, knife tool, tones, brushes, and multi-page save/load still come from Desu. This fork switches image generation to **NovelAI** and adds a Windows one-click local server plus a generic chat/web simulator.

## Attribution

This is a modified copy of [new-sankaku/manga-editor-desu](https://github.com/new-sankaku/manga-editor-desu), licensed under [GNU GPL v3.0](LICENSE). Modifications are listed in [NOTICE.md](NOTICE.md).

Please file fork-specific issues **here**. Do not report NovelAI, launcher, or simulator problems upstream unless they also reproduce on unmodified Desu.

## Quick start (Windows)

1. Clone this repository or download the [v1.0.0 zip](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/tag/v1.0.0).
2. Extract the full folder.
3. Run `一键启动.bat`.
4. Open `http://127.0.0.1:8000/index.html`.
5. Paste your own NovelAI token under settings.

Do not use the `file://` protocol. Generation spends NovelAI credits.

## Requirements

Windows 10/11, Python 3, Chrome or Edge, and a NovelAI access token for image generation.

## License

GPL-3.0, same as upstream. Keep `LICENSE` and `NOTICE.md` when you redistribute. Third-party assets: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
