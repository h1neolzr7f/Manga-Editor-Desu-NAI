# Manga Editor Desu · nai学长魔改版

**Unofficial modified build 1.0.0**（2026-08-14）

[English](README_EN.md) · [日本語](README_JP.md) · [中文短链](README_CN.md)

> **致敬原作。** 本程序基于 [new-sankaku / Manga Editor Desu!](https://github.com/new-sankaku/manga-editor-desu)。  
> 英文名仍为 **Manga Editor Desu**，本包只在后面标明 **nai学长魔改版**。  
> **不是**上游官方发行，与 new-sankaku **无附属关系**。分镜、气泡、图层、刀切等编辑器能力来自原项目。

- 上游源码：https://github.com/new-sankaku/manga-editor-desu  
- 本仓库：https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI  
- 许可证：与原项目相同，[GPL-3.0](LICENSE)  
- 修改声明：[NOTICE.md](NOTICE.md) · [CHANGELOG.md](CHANGELOG.md)  
- 小白步骤：[先看我.txt](先看我.txt) · [使用说明.txt](使用说明.txt)

本包的问题请在**本仓库**提，不要开到上游 Issues。

---

## 小白一键启动（Windows）

1. 解压整个文件夹。  
2. 双击 `一键启动.bat`。  
3. 浏览器打开 `http://127.0.0.1:8000/index.html`。  
4. 在「NovelAI 设置」粘贴你自己的访问令牌。

需要：Windows 10/11、Python 3、Chrome 或 Edge。  
不要用 `file://` 打开 `index.html`。改完前端请 **Ctrl+F5**。

---

## 和原版的差别

| | Manga Editor Desu（上游） | 本包 · nai学长魔改版 |
|---|---|---|
| 启动 | 打开 `index.html` 或官方 demo | 双击 `一键启动.bat` → 本机 8000 端口 |
| 出图 | ComfyUI / WebUI / Forge 等 | **仅 NovelAI**（自备 Token，会花积分） |
| 模拟器 | 无 | 侧栏「模拟器」：对话、假网页、零件 |
| 界面 | 专业编辑器 | 中文小白流程 + 原有画布工具 |

原版功能（模板分镜、刀切、气泡、网点、笔刷、多页、保存）仍在。

---

## 使用注意

- 点「生成」会消耗 **NovelAI 积分**，界面会确认。  
- 模拟器是漫画用的通用界面，不含真实站名或商标。  
- 私人素材、缓存、生成图在 `user_data/`，不要推进 Git。  
- 可选：复制 `.env.example` 为 `.env` 填导演网关（不要提交 `.env`）。

打小白分发包（桌面会生成 `Manga-Editor-Desu-NAI-1.0.0.zip`，不含 `.git` / `.env` / `user_data`）：

```text
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\make-one-click-zip.ps1
```

---

## 开发

```bash
npm test
```

常用：`npm run test:layout`、`npm run test:simulator`、`npm run test:story-engine`。  
贡献说明：[CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 许可证与致谢

Copyright 原项目作者见 [manga-editor-desu](https://github.com/new-sankaku/manga-editor-desu)。  
本修改版在 GPL-3.0 下发布；分发时须提供对应源码和本许可证。  
第三方素材见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
