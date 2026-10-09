# Grok Linux 验收报告：Manga-NAI-GPT 局部改图分支

- 按 `docs/GROK_LINUX_ACCEPTANCE.md` 执行。
- 测试日期：2026-10-09（Asia/Shanghai，UTC+8）。
- 执行人：Grok Bot（Linux 盒子）。
- 修复分支：`fix/grok-linux-acceptance`
- PR base：`feat/manga-nai-gpt-region-editor`
- 基线 commit：`6bbe3b8`（feat 分支顶端）。对照的 main 为 `d612c84`。
- **main 未被修改、推送或合并。**

## 0. 结论

**BLOCKED**

本轮修好了已知的 P0/P1 代码缺陷：密钥外借、SSRF/DNS rebinding、比例拉伸、字幕、可移植性。

阻断原因是仍有一项 **P1 验证缺口**：新的 letterbox 局部改图代码没有拿到真实模型的结果。真实调用 #2 已经发出，但结果因测试脚本超时而丢失，详见 §5。此外，所有 Windows 项目都是 NOT TESTED。

要转为 READY，需要满足以下条件：
1. 用户再授权 1 次真实局部改图，验证 letterbox 路径和人物 A/B，结果通过。
2. 在 Windows / Clash TUN 上做一次实机验证。

## 1. 环境

| 项目 | 值 |
|---|---|
| 发行版 / 内核 | Debian GNU/Linux 13 (trixie)，kernel 6.12.94+ |
| CPU / RAM | Intel Xeon 8 vCPU / 15 GB |
| 浏览器 | Playwright 1.56.1 自带 Chromium（chromium-1194，headless shell 141） |
| Node / npm | v22.19.0 / 9.2.0 |
| Python | 3.13.5（只有 `python3`，没有 `python` 命令） |
| 启动方式 | 仓库根目录执行 `python3 99_server.py`，访问 `http://127.0.0.1:8000/index.html` |
| playwright 安装 | `npm install --no-save --ignore-scripts playwright@1.56.1`（不写入 package.json） |

## 2. 修复提交

每条修复都有回归测试，测试在修复前 FAIL、修复后 PASS。

| SHA | 内容 | 回归测试 |
|---|---|---|
| `c1ed610` | **P0 密钥外借**：`.env` 中的 NovelAI / 导演 key 只借给“本机回环 + Host 是本机 + Origin 缺失或同源 + Sec-Fetch-Site 为同源/none”的请求。`Origin: null`、外站、相似域名、DNS rebinding Host、text/plain CSRF 一律不带 env key。导演接口的 env key 只发往 `DIRECTOR_API_URL`，自定义 `X-Director-Api-Url` 拿不到 env key（返回 403）。`/nai-tools/*` 启动接口和 `/user-assets` 拒绝跨站请求。提前返回 403 时关闭连接，避免 keep-alive 留下脏数据。 | `scripts/local-secret-guard-test.py`（由 `proxy-guard-smoke-test.py` 调用，CI 覆盖），`npm run test:secret-guard` |
| `c9c015c` | **P0 SSRF / DNS rebinding**：校验过的 DNS 结果在连接时固定（IP pinning，SNI/证书仍用原域名），消除 TOCTOU。拒绝原始数字 IP。配置了 HTTPS 代理时交给代理解析，不再错误拒绝。修复非法端口的处理。上游错误体为列表、字符串或纯文本时不再报 500。 | `scripts/gpt-proxy-network-guard-test.py`（由 `gpt-image-proxy-smoke-test.py` 调用），`npm run test:gpt-network-guard` |
| `e417f02` | **P1 局部改图比例 / 裁头**：选区按 1:1 / 3:2 / 2:3 **补白（letterbox）** 后上传，同时显式传 size，结果按同一映射取回并等比缩放，不拉伸、不裁头。默认框选不含文字/气泡，可编辑文字留在新图层上方。新增“取消请求”按钮和 180 s 超时。非 JSON 响应给出可读错误。窗口缩放或滚动时自动取消框选蒙层。图层命名为“GPT 局部改图”，`mangaGptSource` 会保存进项目。 | `scripts/gpt-region-editor-smoke-test.cjs`（5×4 比例矩阵、z-order）；`scripts/gpt-browser-acceptance.cjs`（真实 Chromium，27 项） |
| `6afcb47` | **P1 `test:proxy-guards` 在 Linux 报 127**：npm 脚本改用 `scripts/run-python.cjs`，依次尝试 `$PYTHON`、python3、python、`py -3`。`.gitattributes` 规定 `*.bat/*.cmd/*.ps1/*.iss` 使用 CRLF。`99_server.bat` 加入 `cd /d "%~dp0"`。bat 中的中文 echo 改为 ASCII，避免 GBK/UTF-8 乱码。 | `scripts/portability-smoke-test.cjs`，`npm run test:portability` |
| `764fc5b` | 按新的 `.gitattributes` 重新规范 `start_manga_editor_nai.bat` 的换行（内容不变） | 同上 |
| `01a73d2` | **P1** 用 `Origin: null` 无法再跨域读取静态文件、`user_data` 或目录列表。null 只保留给 `/nai-proxy/`、`/director-proxy/`、`/tagger-proxy/`，且不附带 env key。 | `test_null_origin_cannot_read_static_or_private_files` |
| `bf5ac9d` | **P2** 8000 端口被占用时，输出中英文提示并以 98 退出，不再打印 traceback。Windows 改用 `SO_EXCLUSIVEADDRUSE`，不再用 `SO_REUSEADDR`（后者会让两个进程悄悄共用同一端口）。不再全局修改 `socketserver.TCPServer`。 | `scripts/server-port-conflict-test.py`（如果 8000 被第三方占用则跳过，不动第三方服务），`npm run test:port-conflict` |
| `8e20694` | 补充 `bf5ac9d`：在非 UTF-8 控制台（如 Windows cp1252）上，端口占用提示不会因编码而崩溃；测试改为按 UTF-8 解码。这个问题由 PR 的 Windows CI 发现。 | 同上（用 `PYTHONIOENCODING=cp1252` 模拟） |
| 本报告提交 | 报告与脱敏截图：`docs/acceptance/grok-linux/` | — |

克隆时 feat 分支已经包含以下修复。本轮逐项复测并补充了测试：
- 同源 GPT 代理
- env key 只发往 `GPT_IMAGE_TRUSTED_BASE_URL`
- Clash 198.18/15 fake-ip 放行
- 补充 Chrome User-Agent（解决 Cloudflare 403）
- 竖排和气泡字幕通过 `resolveEditableText` 替换
- `gpt-http-integration-test.py`

## 3. 分类结果

| # | 类别 | 结果 | 数量 / 路径 |
|---|---|---|---|
| 1 | 原有编辑器加载、分镜、导出 | **PASS** | 浏览器载入 A4 1654×2339，PNG 导出尺寸不变 |
| 1b | NovelAI 真实生图 | **NOT TESTED** | 没有合法 NovelAI 令牌。按文档未运行 `test:nai-pipeline` |
| 2a | GPT 生图（假模型） | **PASS** | `gpt-browser-acceptance.cjs` |
| 2b | GPT 生图（真实中转 API） | **PASS** | 真实调用 #1：1024×1536，约 30 s，走 fake-ip DNS 路径并带 UA。缩略图：`docs/acceptance/grok-linux/real-call1-generate-thumb.png` |
| 2c | 局部框选改图精度（假模型，identity 模型逐像素比较） | **PASS** | 横/竖/方选区 × 横/竖/方结果：选区外改变像素 = 0，选区内平均差 0.7–1.3/255，等比缩放。也覆盖模型返回比例不符、低清放大拦截、边缘框选、反向拖拽、右键拖拽、缩放后框选（误差 ±2 px） |
| 2d | 局部改图（真实 API，新代码） | **NOT TESTED / 验证缺口** | 真实调用 #2 已发出，结果丢失（§5） |
| 2e | 人物参考图替换 A/B（原创立绘） | **NOT TESTED** | 依赖 2d。立绘由调用 #1 生成（红短发、绿眼、黄雨衣、星形发卡）。上一轮旧代码的真实改图成功过一次，但不计入本轮 |
| 3 | 第三方 OpenAI 兼容 API | **PASS（生图）** | `https://litangking.12gg.workers.dev/v1` + `gpt-image-2`。错误路径（401/403/429/500、无效 JSON、错误地址、取消、超时、重定向拒绝）由 mock 与 HTTP 集成测试覆盖。OpenAI 官方 API：**NOT TESTED**（无官方 key） |
| 4 | 字幕修改（横排、vertical-textbox、气泡）、图层插入、撤销/重做 | **PASS** | 浏览器测试：横排与竖排替换后撤销/重做正确，7 步多级历史，GPT 图层位于可编辑文字下方。烘焙字幕 / OCR 未实现，不计为通过 |
| 5 | 分辨率、精度、项目保存与重新加载 | **PASS** | 保存后重新加载，图层名、来源、crop 一致，像素差 0。支持 1654×2339、2339×1654、2000×2000 |
| 6 | JS/Python 报错与回归 | **PASS（有已知 FAIL）** | 浏览器 pageErrors = 0。`check-translations` **FAIL**，与 main 完全相同（是既有问题，见 §4） |
| 7 | 安全攻击面 | **PASS** | 不可信 Origin、null、空、恶意 Host、Sec-Fetch-Site cross-site、DNS rebinding、CORS 预检、`.env` 及编码变体（`%2eenv`、`.%65nv`、`//.env`、`.ENV`、`.git/config`）均返回 403。重定向拒绝、IP 字面量拒绝、198.18/15 允许、内网拒绝。env key 只发往本域上游（本地假上游接收站验证） |
| 8 | Linux 稳定性 | **PASS** | 连续 20 次打开/取消框选无残留蒙层。10 次假生成，heap 18→17 MB。2 个标签页同时使用正常。设置 `HTTPS_PROXY` 指向拒绝连接的代理时返回可读错误。代理挂起时客户端 3 s 中断，服务继续工作。40 个并发静态请求全部 200。端口冲突有清晰提示 |
| 9 | Windows（PowerShell 启动器、双击 BAT、Clash TUN、Inno EXE） | **NOT TESTED** | Linux 测试不能代替。只做了 CRLF 和 ASCII 的静态验证 |

## 4. 与 main 的回归对照

在 Linux 上运行同一个脚本 `run_regress.sh`：

| 测试 | main `d612c84` | feat `6bbe3b8` | 本分支 |
|---|---|---|---|
| py_compile（server + gpt proxy） | FAIL（main 没有 gpt_image_proxy.py） | PASS | PASS |
| test:manga-import | **FAIL** | PASS | PASS |
| test:png-bit-depth | **FAIL** | PASS | PASS |
| test:proxy-guards | FAIL 127（没有 `python`） | FAIL 127 | **PASS** |
| check-translations | **FAIL** | **FAIL** | **FAIL**（输出 407 行，与 main 逐行相同） |
| 其余 18 项 npm/python 测试 | PASS | PASS | PASS |
| 新增 10 项（secret-guard、gpt-network-guard、portability、port-conflict、gpt-region、gpt-http、gpt-proxy 等） | — | — | PASS |
| gpt-browser-acceptance（真实 Chromium） | — | FAIL（旧版测试假设错误，且旧代码会拉伸/裁切） | **PASS 27/27** |

汇总：main 18/23，feat 24/26，本分支 32/33。唯一的 FAIL 是 check-translations，属于既有问题，未新增。

## 5. 真实 API 调用记录

| # | 时间 (UTC+8) | 类型 | 结果 |
|---|---|---|---|
| — | — | 未经授权的调用 | **0** |
| 1 | 2026-10-09 14:17:11 | 生图，`gpt-image-2`，经本地代理 | 成功，1024×1536 |
| 2 | 2026-10-09 14:17:54 | 局部改图（参考图 1 张，选区 800×1024） | **请求已发出，结果丢失**：一次性测试脚本误用了 `page.waitForFunction(fn, {timeout})`，第二个参数被当作函数参数，实际超时变成 30 s，浏览器在响应返回前被关闭。按已计费处理。截图见 `docs/acceptance/grok-linux/real-call2-request-ui.png` |

- 另外，上一轮（zip 版本）经授权做了 2 次调用：1 次生图、1 次改图。
- 文档规定的第一轮预算是“1 次生图 + 1 次改图”，本轮已用完，没有再发起调用。
- 中转 key 已脱敏为 `sk-oXT6…6Ui`，只保存在仓库外的 chmod 600 文件中。仓库、日志、截图和 HAR 中都没有 key（推送前已扫描 diff）。

## 6. 问题清单

- **P0**：无未修复项。
- **P1**
  1. 新 letterbox 局部改图缺少真实模型结果，人物参考替换 A/B 也未完成。复现方法：提供 ref 图，框选 800×1024，生成预览，应用。预期：不拉伸、不裁头，人物特征保持，边缘缝合自然。需要用户再授权 1 次真实改图。
  2. Windows 和 Clash TUN 实机均未测试。
- **P2**
  1. `check-translations`：多语言缺失 key，main 同样如此。GPT 面板文字是硬编码中文，没有走 i18n。
  2. NovelAI 返回 401 时向前端传 HTML，而不是可读的 JSON 错误。这是既有问题。
  3. 不支持 Ctrl+Shift+Z 重做（只有 Ctrl+Y）。这是既有问题。
  4. `local_tools/server.py`（8765 端口）接受 `Origin: null` 并且不校验 Host。它不涉及密钥，但跨站可以触发本地抠图或模型下载，消耗 CPU 和带宽。建议与 99_server 共用同一套 trusted-local 判定。
  5. 没有 workflow 权限（gh token 缺 `workflow` scope），所以没有修改 `.github/workflows`。新测试通过现有 CI 已调用的脚本串联执行，CI 仍会覆盖。

## 7. GitHub Actions（PR #6）

- `Legacy regression suite`：**FAIL**，唯一失败的是 `check-translations`。base 分支 run 37890942759 的失败原因相同。
- `Real Chromium interaction (mock API)`：**PASS**。base 分支在这一项是 FAIL，本分支改写测试并修复代码后转为通过。
- `Live localhost HTTP / security`、`offline-contract`：PASS。
- `Windows startup / portable ZIP check`：第一次因端口测试的编码问题失败，`8e20694` 修复后在 run 37893517685 中 **PASS**。

## 8. 复现与证据

- 浏览器验收：`npm install --no-save --ignore-scripts playwright@1.56.1 && npx playwright install chromium && npm run test:gpt-browser`
  - 输出：`artifacts/gpt-browser/`（已加入 .gitignore）
  - 本次运行结果的副本：`docs/acceptance/grok-linux/gpt-browser-summary.json`，截图 `mock-acceptance-final.png`、`mock-precision-tall.png`
- 安全测试：`npm run test:secret-guard`、`npm run test:gpt-network-guard`、`npm run test:proxy-guards`
- 可移植性测试：`npm run test:portability`、`npm run test:port-conflict`
