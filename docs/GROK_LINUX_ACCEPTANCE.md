# Grok Bot · Linux 实机全量验收规程

目标：从零下载本分支，在一台真实 Linux 机器上完整启动、使用 Chromium/Firefox 操作、观察日志、实际保存文件并复开；仅模拟接口远远不够。**本任务必须采用“发现 Bug → 修复代码 → 补回归测试 → Linux 实机复测 → 提交 GitHub → 开 PR”闭环，不允许只输出报告后停止。**除明确允许的真实 API 请求外，所有自动测试都必须不消耗生图额度。

**验收分支：** `feat/manga-nai-gpt-region-editor`
**PR：** https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/pull/5

## 0. 工作区和基线

```bash
git clone -b feat/manga-nai-gpt-region-editor https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI.git
cd Manga-Editor-Desu-NAI
git rev-parse HEAD
python3 --version
node --version
npm --version
```

- 使用临时目录和独立浏览器配置，不接触个人数据；`.env` 是本机秘密文件，永远不上传仓库、日志或截图。
- 先在 `main` 运行相同回归命令建立基线，再在开发分支上运行；区分原来已有问题、分支引入问题、环境问题。
- 检查端口 8000、8765 已被其他进程占用的情况；先记录 PID，**不要误杀其他程序**。
- **有修复权限：** 对能够复现的 Bug 直接修复，补针对性测试。请从 `feat/manga-nai-gpt-region-editor` 新建 `fix/grok-linux-acceptance`（已存在就使用新后缀分支），推送到 GitHub，并向 `feat/manga-nai-gpt-region-editor` 发 Pull Request；不要仅保存在本地或只给建议。
- **禁止** push/merge `main` 或自动合并任何 PR。报告中必须附 PR URL、每条修复 commit SHA 和复测记录。

## 1. 完整离线自动回归（不消耗积分）

依次运行，记录每条命令、结果、日志（不得只说“都过了”）：

```bash
python3 -m py_compile 99_server.py gpt_image_proxy.py
python3 scripts/gpt-image-proxy-smoke-test.py
python3 scripts/gpt-http-integration-test.py
python3 scripts/proxy-guard-smoke-test.py
node scripts/gpt-region-editor-smoke-test.cjs

npm test
npm run test:manga-import
npm run test:simulator
npm run test:cutout
npm run test:brushes
npm run test:assets
npm run test:simulator-extra
npm run test:story-engine
npm run test:page-studio
npm run test:timeline
npm run test:image2
npm run test:scene-plan
npm run test:proxy-guards
npm run test:layout
npm run test:page-size
npm run test:fabric-text-focus
npm run test:image-export
npm run test:png-bit-depth
npm run test:image-export-integration
npm run check-translations
```

翻译检查当前存在已有缺失；**必须计为 FAIL**，但同样对照 main，不许当成 GPT 分支独有回归。

如果 Pillow 已安装，可附加 `python3 scripts/cutout-color-key-smoke-test.py`。**不要直接运行 `test:nai-pipeline`，它可能调用收费/计次服务；先单独授权并确认预算。**

## 2. Linux 浏览器真实界面测试

安装需要的浏览器/Playwright 测试依赖（优先使用现有环境，不要污染系统；只有在允许后才运行需要 sudo 的安装）：

```bash
npm install --no-save --ignore-scripts playwright@1.56.1
npx playwright install chromium
node scripts/gpt-browser-acceptance.cjs
```

必要时使用有图形桌面的 Chromium，或 Xvfb。保存可核验截图、控制台错误、Playwright traces。**真实鼠标拖拽**测试左键/右键，检查 onboarding 弹窗遮挡、遮罩、鼠标缩放、空白页、编辑器不同缩放等级、边缘框选、负方向拖拽、重叠分镜。打开多页 1654×2339、横/竖/方形画布。

## 3. GPT 改图与图片质量（使用伪造模型响应 + 可选真实 API）

- 生图模式、局部改图模式、参考图 0/1/3 张、PNG/JPEG/WebP、超大文件拒绝、空 Key、错误模型、错误地址、上游 401/403/429/500、无效 JSON、请求过长、取消、超时。
- 局部生成前后用程序逐像素或 PNG hash 比较：选区**以外**像素不变；原图尺寸、DPI/导出位深与透明度如有要求也验证。
- 模型结果的比例为方形/横/竖，选区为横/竖/方形分别交叉测试；不允许人像横向拉胖或纵向拉长；居中裁切可能失去头部，应报告。测试低分辨率拒绝放大提示。
- 应用后修改图层、撤销/重做、历史多次前进后退、保存项目、重新加载项目、导出 PNG/WebP 后再次读取尺寸和透明度；不能仅仅看屏幕上的成功提示。
- 选中水平文字、vertical-textbox、speechBubbleSVG 对应文字，修改字体尺寸、颜色、文字后验证同步和保存，不能打乱气泡边界。**图片中不可编辑的烘焙字幕/OCR 仍是未实现，不应误报通过。**
- 人物替换要用**真正的原创人物立绘**而不是简笔图进行 A/B 测试。记录身份特征、服装、动作保持、画风是否协调、选区边缘缝合；不许声称 100% 保证一致性。

## 4. 安全攻击与部署边界（必须重点）

- 测试不可信 `Origin`、`Origin: null`、空 `Origin`、恶意 `Host`、非本机连接、`Sec-Fetch-Site: cross-site`、浏览器 DNS rebinding、CORS 预检、直接请求本机 `.env` 和敏感文件、路径 URL 编码、连接中断。
- 当存在 `GPT_IMAGE_API_KEY` 环境密钥时，**不受信任的地址绝对不能借本地代理携带密钥**。自建本地假上游接收站，不需要向真实外站发送泄露验证；报告中不允许包含完整密钥。
- 检查跨站窗口能否触发其他现有代理接口（NovelAI / 导演）代替 GPT 代理泄密；如发现路径直接标为阻断发布。
- 测试 DNS 解析为真实公网 IP / 非公网 IP / Clash TUN 198.18.0.0/15 假 IP；原始数字 IP 和 127.0.0.1 必须拒绝转发。**Linux 模拟测试不能替代 Windows/Clash TUN 真环境**。
- 确认 API Key 不进入 Git、HTML、localStorage、cookies、错误日志、HAR、截图。注意浏览器开发者工具 Network 原始请求可能含 Authorization，上传 HAR 前应脱敏。
- 测试 HTTPS、上游重定向、返回 JSON base64 或图片 URL、Cloudflare User-Agent 以及故障网络。无条件接受内网地址或任意重定向属于严重漏洞。

## 5. Linux 稳定性与压力

- 正常 Linux 原生命令 `python3 99_server.py`（从仓库根目录启动），浏览器进入 `http://127.0.0.1:8000/index.html`，不依赖 Windows .bat/.ps1。
- 做 20 次连续打开/取消框选、连续 10 次假生成结果切换、文件反复保存/读取；观察 RAM 增长、性能、服务端错误、残留蒙层、图层状态同步。
- 测试中断上游/短时离线、同时 2 个编辑器标签、重载页面、浏览器刷新、已有网络代理变量的 Linux 系统。
- 不许用真实 Key 跑压力、异常循环或批量生成。
- 注意 8000 端口与其他服务冲突时给用户清晰的错误，不擅自占用或停止第三方服务。

## 6. Windows 专属（只能标记未测试）

Windows PowerShell 一键启动器、双击 BAT、Clash TUN 真机、Inno Setup EXE 安装/卸载，不能因为 Linux 测试通过就标记通过。CI 的 Windows ZIP 静态打包检查可作为间接证据，但不是 Windows GUI 实测。

## 7. 可选真实上游验收（必须在本地凭据已配置且用户允许使用少量额度时）

仅手工**一次生图 + 一次局部改图**作为第一轮，用用户自己配置的兼容 API 基址和真实模型 ID；先确认配额和预计花费，严禁把 Key 明文显示在输出。OpenAI 官方与 NovelAI 若缺合法令牌明确标记 **NOT TESTED**；不擅自猜测 API 模型名或代替用户申请令牌。

## 8. 报告格式（必须交付）

生成并**提交到 GitHub 修复分支**的 `GROK_LINUX_ACCEPTANCE_REPORT.md`，含：
- 日期、Linux 发行版/内核、Chrome/Chromium、Node、Python、CPU/RAM、commit SHA；
- 每个类别 PASS / FAIL / NOT TESTED、测试数量和代码路径；
- 每个失败的可复现步骤、预期/实际、最小错误日志、截图/录屏路径；
- 业务回归与 main 的对照，以及阻断发布问题清单（P0 / P1 / P2）；
- 未经授权的真实 API 调用次数必须为 0；已授权的调用逐个计数；
- 总体发布结论：READY / BLOCKED（只要存在 P0/P1 一律 BLOCKED）；
- 不要改主分支，不要把令牌和密钥上传远端。

## 9. 修复、提交与交接（强制）

1. 按严重级别优先处理 P0/P1；对每项问题至少提供一个失败前可复现测试，修好后确认该测试 PASS。无法安全修复的说明阻断原因，不得绕过安全检查。
2. 同时运行修复前/后的回归测试，确保没有破坏 NovelAI、漫画导入、画布导出、项目保存、局部改图、字幕、撤销重做等旧功能。
3. 将补丁、测试、复现脚本和脱敏报告全部 `git commit`，`git push` 到 `fix/grok-linux-acceptance`，开一个 **base 为 `feat/manga-nai-gpt-region-editor`** 的 GitHub PR。若存在无法修复的阻断事项，仍要提交已完成修复和明确未完成清单。
4. 报告必须写清“修改了什么 / 为什么 / 哪些用例已通过 / 哪些仍失败或未测”，提供可直接打开的 PR、Actions 链接和提交 SHA。
5. **交付给 ChatGPT 审核**：我会直接在 GitHub 对照 diff、提交历史、CI 和报告复核。不要请求用户反复搬运错误日志。
6. 不要修改、合并 `main`，不得提交任何真实 Token、Key 或包含认证头的 HAR/日志。没有凭据的真实生图必须明确标记 NOT TESTED。

尽量一次性完整检查和修复，不要检查一个功能就停下来问用户；发现确定的 Bug 要实际修到代码里，最终必须在 GitHub 上留下可审核的结果。

