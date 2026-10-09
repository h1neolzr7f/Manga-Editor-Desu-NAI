# Grok Linux 验收报告：Manga-NAI-GPT 局部改图分支

- 按 `docs/GROK_LINUX_ACCEPTANCE.md` 执行。
- 测试日期：2026-10-09（Asia/Shanghai，UTC+8）。
- 执行人：Grok Bot（Linux 盒子）。
- 修复分支：`fix/grok-linux-acceptance`
- PR base：`feat/manga-nai-gpt-region-editor`
- 基线 commit：`6bbe3b8`（feat 分支顶端）。对照的 main 为 `d612c84`。
- **main 未被修改、推送或合并。**

## 0. 结论

**READY（Linux 验收范围）**：已知的 P0/P1 均已修复，并有回归测试。

- **真实 API 验证**：用户放宽额度后，真实 `gpt-image-2` 局部改图在浏览器 UI 中跑了 15 次，全部成功，详见 §5。
  - 已覆盖：角色参考图 A/B、横/竖/方选区与输出比例交叉、页角选区、可编辑文字。
  - 真实结果暴露出的接缝和偏色问题已修复，修复后又用真实调用复测。
- **Windows 全部为 NOT TESTED**（文档 §6 规定只能这样标记）。发布 Windows 包前仍需实机验证 PowerShell 启动器、双击 BAT、Clash TUN 和 EXE。
- 剩余问题都是 P2，见 §6。

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
| `2a8c3ee` | **P1 超时**：上游超时从 120 s 改为 300 s，可用 `GPT_IMAGE_TIMEOUT` 调整（限制在 30–900 s）。超时返回可读的 504，不再是笼统的 500。前端等待 330 s，确保先收到服务端的超时提示。 | `test_upstream_timeout_is_generous_and_readable`（gpt-proxy-network-guard-test） |
| `bc58c0f` | **P1 接缝（真实 API 发现）**：白色补白会渗进补丁边缘，形成 1 px 白线；模型偏色会留下硬边矩形。<br>改为用选区周围的真实画面填充补白，并提供勾选项，可改回纯白、只上传选区。<br>补丁按原生分辨率烘焙，只在选区内侧做羽化，宽度为短边的 3%，限制在 4–32 px；贴着页面边界的边保持硬边，选区外像素逐字节不变。<br>源裁剪信息记录在 `mangaGptCrop` 并随项目保存。 | 浏览器测试 `letterbox padding uses page context`、`feathered edge reduces seam`（+40 偏色模型下接缝从 38 降到 2）；smoke 测试的单元断言 |
| `85f3407` | **P1 偏色（真实 API 发现）**：用上下文边带测量模型的整体偏色并从补丁中扣除，限制在 ±48，可关闭。记录在 `toneOffset`。 | `tone matching removes model colour drift` |
| `b73ccde` | **P1 误着色（真实 API 发现）**：case F 中模型重新构图，边带偏移为 [+15,+30,+50]，补丁被染成蓝色。<br>现在只在“去掉平均偏移后的残差 ≤ 20/255”时才校正：真实偏色样本的残差为 2–16，重新构图的为 33–51。<br>另外新增 opt-in 的真实 API 验收脚本。 | `tone matching is skipped when the model recomposed`（镜像模型）；用 `GPT_REAL_REPLAY` 把已保存的真实结果在新代码上免费重放验证 |
| `91b7ee8` | **P2**：强制尺寸与选区比例差别较大时，提示改用“自动”。真实 case F 在这种情况下发生了重新构图和裁头。 | smoke 测试 `aspectMismatch` 断言 |
| 报告提交 | 报告与脱敏证据：`docs/acceptance/grok-linux/` | — |

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
| 2d | 局部改图（真实 API，浏览器 UI） | **PASS** | 15/15 次 HTTP 200，单次 23–35 s。选区外改变像素全部为 0；补丁等比（scaleX/scaleY 偏差 < 0.2%）；保存后重新加载像素一致；pageErrors = 0；浏览器请求不带 Authorization（key 只在服务端 env）。<br>最终代码的边缘接缝（白底合成后边界一像素差的均值）：A 0.24→1.34，C 1.49→2.14，F 1.49→1.84，G 0→1.32。旧 letterbox 代码分别为 47.7、17.5、18.7、13.4。见 `real-seams-old-vs-final.png`、`real-api-runs.json` |
| 2e | 人物参考图替换 A/B（原创立绘） | **PASS（不保证 100% 一致）** | 参考立绘由调用 #1 生成：红短发、绿眼、黄连帽雨衣、星形发卡。<br>**带参考图（A/C/D/E/F 共 9 次）**：发色、瞳色、发卡、雨衣每次都保持；回头姿势、朝向、画风基本保持。<br>**只用文字描述（B）**：发色和雨衣正确，但下装沿用了原图的百褶裙，细节和参考图一致性更弱。<br>**已知局限**：选区边缘如果切过人物，新旧身体在边缘处会衔接不上（如 D 只框了脸）；所以替换人物时应框住整个人物。见 `real-ab-character.png` |
| 3 | 第三方 OpenAI 兼容 API | **PASS（生图 + 局部改图 + 参考图）** | `https://litangking.12gg.workers.dev/v1` + `gpt-image-2`。错误路径（401/403/429/500、无效 JSON、错误地址、取消、超时、重定向拒绝）由 mock 与 HTTP 集成测试覆盖。OpenAI 官方 API：**NOT TESTED**（无官方 key） |
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
| gpt-browser-acceptance（真实 Chromium） | — | FAIL（旧版测试假设错误，且旧代码会拉伸/裁切） | **PASS 31/31** |

汇总：main 18/23，feat 24/26，本分支 32/33。唯一的 FAIL 是 check-translations，属于既有问题，未新增。

## 5. 真实 API 调用记录

未经授权的真实调用：**0**。

已授权的调用逐个列出如下。全部调用经本地代理发往 `https://litangking.12gg.workers.dev/v1`，模型为 `gpt-image-2`，key 来自服务端 env。

| # | 时间 (UTC+8) | 内容 | 结果 |
|---|---|---|---|
| 1 | 14:17:11 | 生图（参考立绘） | 成功，1024×1536 |
| 2 | 14:17:54 | 局部改图 | 请求已发出，**结果丢失**（一次性脚本的超时写错；按已计费处理） |
| 3–9 | 14:33–14:37 | 第 1 轮 A–G，旧 letterbox 代码 | 7/7 成功，暴露出白边接缝和偏色问题 |
| 10–14 | 14:40–14:43 | 第 2 轮 A、C、D、F、G，上下文填充 + 羽化 | 5/5 成功，接缝明显下降 |
| 15–17 | 14:45–14:47 | 第 3 轮 F、G、A，加上偏色校正 | 3/3 成功。F 暴露了误着色，`b73ccde` 已修复，并用重放验证 |

- **合计**：本轮 17 次（2 次生图/改图 + 15 次改图），上一轮 zip 版本 2 次。用户先授权“1 次生图 + 1 次改图”，后来改为宽松额度（约 15 次）；用量没有超出。
- **调用方式**：所有改图都由 `scripts/gpt-real-api-acceptance.cjs` 通过真实 UI 发起。结果会先写入磁盘，等待上限 400 s。
- **免费复核**：`GPT_REAL_REPLAY=<目录>` 可以把已保存的真实结果在当前代码上重放，不产生费用。
- **key 安全**：key 已脱敏为 `sk-oXT6…6Ui`，只保存在仓库外权限为 600 的文件中，并且只传给本地服务进程的环境变量。仓库、日志、截图和 HAR 中都没有 key（已扫描 diff 和证据文件）。

## 6. 问题清单

- **P0**：无未修复项。
- **P1**：无未修复项。Windows 实机属于 NOT TESTED，不是已知缺陷，但在发布 Windows 包前必须验证。
- **P2**
  1. `check-translations`：多语言缺失 key，main 同样如此。GPT 面板文字是硬编码中文，没有走 i18n。
  2. NovelAI 返回 401 时向前端传 HTML，而不是可读的 JSON 错误。这是既有问题。
  3. 不支持 Ctrl+Shift+Z 重做（只有 Ctrl+Y）。这是既有问题。
  4. `local_tools/server.py`（8765 端口）接受 `Origin: null` 并且不校验 Host。它不涉及密钥，但跨站可以触发本地抠图或模型下载，消耗 CPU 和带宽。建议与 99_server 共用同一套 trusted-local 判定。
  5. 没有 workflow 权限（gh token 缺 `workflow` scope），所以没有修改 `.github/workflows`。新测试通过现有 CI 已调用的脚本串联执行，CI 仍会覆盖。
  6. 强制尺寸与选区比例差别很大时（例如宽选区强制 1024×1536），真实模型会重新构图：人物移位或裁头，且无法用色调校正修复。现在会提示改用“自动”（`91b7ee8`）。
  7. 选区内原本透明的区域在应用后会变成不透明，因为模型输出不透明。合成到白纸后看起来一样，但导出透明 PNG 时会有差异。
  8. 人物一致性依赖模型，不能保证 100%。选区边缘切过人物时会产生衔接断层，应框住整个人物。

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
- 真实 API（计费，需显式开启）：
  ```bash
  GPT_REAL_API=1 GPT_TEST_ENV_FILE=<仓库外env文件> GPT_REAL_BASE_URL=<中转>/v1 GPT_REAL_MODEL=gpt-image-2 GPT_REAL_REFERENCE=<立绘> GPT_REAL_CASES=A,B,C,D,E,F,G node scripts/gpt-real-api-acceptance.cjs
  ```
  - 免费演练：`GPT_REAL_MOCK=1`
  - 免费重放已保存的真实结果：`GPT_REAL_REPLAY=<目录>`
- 真实 API 证据：`docs/acceptance/grok-linux/real-ab-character.png`、`real-seams-old-vs-final.png`、`real-run3-A-ui.png`（UI 中 key 输入框为空，使用服务端 env），以及 `real-api-runs.json`（每次调用的尺寸、耗时、接缝、toneOffset、保存与重载结果）
