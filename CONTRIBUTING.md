# Contributing

This repository is an unofficial fork of [Manga Editor Desu!](https://github.com/new-sankaku/manga-editor-desu). The English product name remains **Manga Editor Desu**.

Send NovelAI, simulator, and launcher changes **here**. Do not open those issues or pull requests on upstream.

## 本地运行

不要 `start index.html`。请双击 `一键启动.bat`，或：

```text
powershell -NoProfile -ExecutionPolicy Bypass -File .\start_manga_editor_nai.ps1
```

打开 `http://127.0.0.1:8000/index.html`。改完前端请 Ctrl+F5。

需要 Node 时：

```bash
npm install
npm run test:layout
```

## 代码风格（沿用上游）

- 原有 Desu 源码多为无缩进风格；新增 `js/simulator/` 等文件可读性优先。
- 不要用 `console.log()`，用 `js/core/logger.js` 的 Logger。
- 影响画布历史时：单步用 `saveStateByManual()`；多步先 `changeDoNotSaveHistory()`，结束再 `changeDoSaveHistory()` + `saveStateByManual()`。
- 保存到 `imageMap` 用 `data:` 或 JSON，不要用 `blob:`。

## 提交

1. 在本仓库开 Issue / Pull Request。  
2. 不要把 `.env`、`user_data/`、令牌、模型权重推进 Git。  
3. 模拟器皮肤必须是通用界面，禁止真实站点商标。

上游编辑器本体的通用缺陷，若与本魔改无关，可考虑向上游单独报告；请先确认原版也能复现。
