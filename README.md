# Manga Editor Desu · NovelAI Edition

这是 [new-sankaku/manga-editor-desu](https://github.com/new-sankaku/manga-editor-desu) 的非官方 GPL-3.0 修改发行版。分镜、气泡、图层、刀具、网点、画笔和多页工程等编辑器基础能力来自上游；本仓库维护 NovelAI 接入、本地启动器、模拟器工作区与中文入门流程。

[English](README_EN.md) · [下载 Releases](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/latest) · [相对上游的改动](CHANGELOG.md) · [参与贡献](CONTRIBUTING.md)

![当前源码的编辑器界面](docs/screenshots/editor-home.png)

> 截图由本仓库当前 `main` 源码在本地 HTTP 服务中启动后采集，画布使用内置空白模板；没有调用 NovelAI，也没有使用私人作品或访问令牌。

## 这个版本维护什么

| 范围 | 归属与说明 |
| --- | --- |
| 分镜、气泡、图层、刀具、网点、画笔、多页工程 | 上游 Manga Editor Desu 的核心编辑能力 |
| NovelAI 文生图与图生图 | 本修改版接入；需要用户自己的访问令牌，会消耗相应服务额度 |
| Windows 本地启动 | 通过批处理或安装器启动本地 HTTP 服务，避免 `file://` 限制 |
| 模拟器工作区 | 通用聊天、网页和界面组件，用于漫画中的屏幕场景 |
| 中文入门流程 | 设置分组、工具提示、空画布引导、自定义页面切格子和 Token 状态 |
| 本地抠图 | 可选 rembg sidecar；不可用时保留颜色键回退 |

修改边界和版本记录分别见 [NOTICE.md](NOTICE.md) 与 [CHANGELOG.md](CHANGELOG.md)。本仓库的问题请提交到本仓库；只有在未修改的上游版本中也能复现时，才适合反馈给上游。

## 快速开始

### 使用 Release

1. 从 [Releases](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/releases/latest) 下载安装器或完整便携包。
2. 完整解压后运行 `一键启动.bat`，或从已安装的快捷方式启动。
3. 浏览器会打开 `http://127.0.0.1:8000/index.html`。
4. 只有使用出图功能时才需要在设置中填写自己的 NovelAI 访问令牌。

不要直接双击 `index.html`。本地服务负责静态文件、代理保护和可选本地工具。

### 从源码启动

环境：Windows 10/11、Python 3、Chrome 或 Edge。部分批量素材工具还需要 Node.js。

```powershell
git clone https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI.git
cd Manga-Editor-Desu-NAI
.\一键启动.bat
```

## 开发与验证

```powershell
npm test
npm run test:simulator
npm run test:story-engine
npm run test:cutout
npm run test:proxy-guards
```

上述离线检查覆盖布局、模拟器聊天、故事流程、抠图预设和代理保护。本次文档整理的实际结果见 [docs/VALIDATION.md](docs/VALIDATION.md)。需要真实 NovelAI 账号、积分或第三方网关的测试不属于默认测试范围。

发布工作流位于 [.github/workflows/build-windows-installer.yml](.github/workflows/build-windows-installer.yml)，负责 Windows 安装器、已安装运行时冒烟和 Release 附件。构建产物与源码的版本号应保持一致。

## 数据与凭据

- 不要提交 `.env`、访问令牌、`user_data/` 或私人漫画工程。
- 出图前会显示额度提示；是否产生费用由所使用的外部服务决定。
- 本地服务默认只面向当前电脑，不能当作公网多用户服务。

## 许可证与致谢

本修改版继续使用 [GNU GPL v3.0](LICENSE)。上游作者保留原编辑器相应版权；重新分发修改版时须保留许可证、修改说明与对应源码。第三方素材许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

感谢 [new-sankaku/manga-editor-desu](https://github.com/new-sankaku/manga-editor-desu) 提供编辑器基础。
