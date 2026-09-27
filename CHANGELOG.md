# Changelog

Version numbers apply to **this fork only**, not to upstream Manga Editor Desu.

## Unreleased

- Document the local backend. New `llm_doc/backend-and-offline.md` explains the two Python stdlib servers (`99_server.py` on :8000 for static files + AI proxying, the optional cutout sidecar on :8765), how to stop them, and why the page still opens after the server is closed: the service worker caches `index.html` and js/css for offline/PWA use, so it is not a stray process. Also records that the cutout sidecar cannot start on Python 3.13+ because `local_tools/server.py` imports the removed `cgi` module.
- Fix 画布: clicking an already-focused text object no longer shifts the whole view. fabric parks a 1px hidden `<textarea>` under `document.body` in document coordinates, so `enterEditing()` scrolled the page to reveal it and left `canvas._offset` stale. The new `js/core/util/fabric-text-focus.js` focuses that textarea with `preventScroll:true` while keeping its original coordinates, so IME candidate placement is unchanged.
- Fix 下载 DPI jumping to 300 when the field holds an invalid value. Typing a negative number (or clearing the field) now restores the last confirmed DPI instead of silently resetting to the default; out-of-range positives still clamp to 96 / 1800 with a toast either way.
- 画布 → 预计导出大小 tooltip now reports the same pixel dimensions as the 竖图/横图 preview rows. It used to round where the real export truncates, so it could claim one pixel more than you actually got.
- Stop the 画布 pixel and DPI fields from rewriting what you are typing. Validation and commit now happen on blur or Enter only, replacing the old 800ms idle timer that reverted numbers mid-keystroke. Meanwhile, values that are obviously mid-edit (blank, negative) are no longer written to localStorage, so an interrupted edit can no longer come back as 300 after a restart.
- Add 画布 → 导出格式 (PNG / JPEG / WebP) and 导出品质 so a finished page can be saved as a compressed image instead of a multi-hundred-megabyte PNG.
- Bound export size: the longest edge is capped at 8192px and the total at 40MP, so an oversized 下载 DPI no longer produces a failure-prone, gigantic file. Exports that hit the cap show a toast.
- 下载 DPI now has a maximum of 1800 in the UI, and its stored default matches the 300 shown in the menu.
- The project preview thumbnail is written as JPEG at quality 0.8 instead of the implicit 1.0, shrinking saved `.lz4` projects.
- 画布 → 预计导出大小 shows the estimated output size before exporting. It samples a few tiles at the real target resolution and extrapolates, so it reflects the lettering-heavy pages this tool produces.
- Export format stays a user choice: PNG / JPEG / WebP are only ever applied because the 导出格式 menu says so. Nothing switches the format automatically.
- Add 画布 → 导出位深度 (灰度 / 24位 RGB / 32位 ARGB, default 32位 ARGB). It applies to PNG only and is enforced on the actually written file, not just the menu. 灰度 and 24位 RGB flatten transparency onto the canvas background color; 32位 ARGB keeps it. The upstream integration intentionally defaults to ARGB so existing transparent assets are not flattened by surprise.
- 画布 → 导出格式 now disables 导出位深度 for JPEG / WebP, since those formats ignore it.
- Rework 画布 → 画布背景 into a full-width row: the hex value on the left, the color square on the right, with a note that transparency only takes effect in 32-bit ARGB mode.
- Add 竖图像素 / 横图像素 (WxH) preview rows that convert to and from 下载 DPI. Editing any DPI or pixel field updates the others. The numbers match the real export because the preview and the export path both call `NaiMangaPageSize.planExportPage`; the export multiplier is now taken from the A4 page preset (it previously assumed A5, which disagreed with the A4 canvas at every DPI) and is chosen so the written pixel count equals the preview exactly.
- 下载 DPI and 导出位深度 persist across restarts.
- 一键启动 no longer spawns a hidden server you cannot find or stop. The console window now stays open and shows the startup log, the browser opens at `http://127.0.0.1:8000/index.html#` once the server is ready, and closing the window stops the backend (the python child is attached to a Job Object with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, with an explicit `taskkill /T /F` as a safety net). A server that was already running on port 8000 is never killed by this launcher.
- 一键启动.bat is ASCII-only now. It ran `chcp 65001` while containing non-ASCII text, which made cmd.exe resume reading at a shifted byte offset and drop the rest of the file, so the window flashed and vanished.

## 1.0.3 — 2026-08-31

- Empty-canvas overlay can be dismissed (× / 自己裁剪 / Esc) and is remembered; it no longer blocks custom pages.
- Custom pages now lay a full-page panel, so 切割格子 can slice the page without first picking a template.
- Help → 新手教程 includes the custom-page knife path. Skipping or finishing the tutorial stops the overlay from auto-showing.
- Generate preflight and random-cut copy mention 页面 / 自定义页面, not only 模板.
- Startup no longer persist-dismisses the overlay via the initial blank `loadBookSize`.
- GitHub Release now attaches both the EXE installer and the portable ZIP.

## 1.0.2 — 2026-08-26

- Open each fake UI as its own simulator: chat, video site, danmaku, phone, social, forum, live, image board, visual novel.
- Edit and play inside the simulator; placing on the manga canvas is optional and then shows the canvas.
- Fix CJK lettering so changing fonts actually changes the words on the canvas.
- Beginner empty-canvas hint, clearer autosave restore copy, and story/asset buttons that open the matching simulator.

## 1.0.1 — 2026-08-14

- Add a self-contained Windows EXE installer with Chinese/English UI, Start Menu and optional desktop shortcuts, repair/uninstall support.
- Bundle Python 3.12, Node.js and Pillow so ordinary users do not need to configure a development environment.
- Smoke-test the installed application, local server, Node runtime and color-key cutout service on a Windows GitHub Actions runner.
- Keep rembg and its large model weights optional.

## 1.0.0 — 2026-08-14

First public release as **Manga Editor Desu · nai学长魔改版**.

- Retain the original English name; credit [new-sankaku/manga-editor-desu](https://github.com/new-sankaku/manga-editor-desu); keep GPL-3.0.
- NovelAI-only generation and a Windows one-click local server.
- Simulator workspace, canvas zoom, Chinese beginner layout, local cutout.
