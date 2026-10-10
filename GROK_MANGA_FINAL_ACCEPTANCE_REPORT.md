# Grok Bot 漫画编辑最终验收报告（2026-10-09）

> **状态：Draft，不建议标 Ready / 发版。** 分支 `fix/grok-manga-final-acceptance` → PR #13，base = PR #12 分支 `fix/manga-gpt-handoff-ink-mask-20261009`（c02fe3b）。未修改 `main`，未发布 release。
>
> **⚠️ 请轮换 NovelAI Token。** 旧脚本曾把 NovelAI Persistent API Token 发往第三方 Director 网关；本轮测试用的 Token（`pst-w0Nd…nxBj`）也应在测试结束后到 NovelAI 账户设置里作废并重新生成。GPT 中转 Key（`sk-oXT6…6Ui`）同样建议测试后更换。两个 Key 只保存在仓库外 600 权限文件中，从未写入仓库、日志、截图或本报告。

## 1. 提交

| SHA | 内容 |
|---|---|
| `0649026` | test(security)：真实 HTTP 代理链负例 `scripts/proxy-chain-negative-test.py`（12 项）。在未修复代码上先失败（78 failures / 11 errors）。 |
| `1ab98c4` | fix(security)：所有本地 API 路由（GET/POST/OPTIONS）统一同源门禁；CORS 只回显精确同源，绝不回显 `null`；Tagger/Director 上游限制（仅 http(s)、无 URL 凭据、拒绝本服务端口、link-local/元数据/保留/组播地址，DNS 解析后再校验）；不跟随重定向（避免转发 Authorization）；请求体大小与超时上限；file:// 只跳转到 http://127.0.0.1:8000，不再为 file:// 放开 CORS。 |
| `8f79b06` | fix(models)：模型下载前必须用户同意（HTTP 428 `needs_download`），单任务推理保护（429），Tesseract 最多 2 并发；修正 LaMa 包名为 `simple-lama-inpainting`。 |
| `4f241f7` | merge：合入 PR #12 head c02fe3b（未 rebase，避免强推）。 |
| `0bd9655` | fix(models-ui)：前端统一 `MangaModelRequest`：428 → 弹窗确认 → 才带 `allow_download:true` 重发；OCR / Manga OCR / LaMa 可取消。 |
| `8564ae9` | fix(ocr,lama)：**真实模型才暴露的两个 bug**（见 §3），文档包名/安装方式更正，新增 REAL 验收脚本。 |
| 本报告提交 | 报告 + `docs/acceptance/2026-10-09/` 证据图 + NAI 验收脚本等待修正。 |

## 2. P0 安全：对 PR #12（c02fe3b）的独立攻击验证

用 `scripts/proxy-chain-negative-test.py` 对 c02fe3b **原样**跑：**15 failures / 2 errors**。PR #12 已覆盖 `/nai-proxy`、`/director-proxy`、`/tagger-proxy` 的同源门禁和 OPTIONS，但仍有缺口：

1. `/nai-tools/job`、`/nai-tools/missing-material-previews` 对 `Origin: null` / 跨站调用开放；后者每次 GET 会启动一个 node 子进程。
2. Director / Tagger 可把上游指向本服务自身（二跳进入 `/nai-tools`）或 `169.254.169.254`。
3. Director 模型列表 GET 跟随重定向，会把调用方自带的 `Authorization` 转发到重定向目标。
4. `cors_allow_origin` 不校验 Host。

全部在本分支修复，修复后 12/12 通过。覆盖的攻击：`Origin: null` 的 preflight 与 POST、外域 Origin、`Sec-Fetch-Site: cross-site/same-site`、DNS rebinding Host（`rebind.evil.example`）、Tagger → 本机 nai-tools 二跳、Director 任意上游 + 攻击者自带 Authorization、重定向、所有 API 路由的 null-origin。每项断言假上游接收次数为 0。

## 3. P1：真实模型才发现的 bug（mock 全部通过，所以 CI 一直是绿的）

1. **Tesseract 读不出封闭对话气泡里的字。** Tesseract 5.5（jpn / jpn_vert）对被闭合轮廓包围的文字返回空结果。已对照验证：与网点、页面尺寸、psm 3/6/11/12、各种 tess 配置都无关，只要有闭合气泡框就读不出。修复方法：新增 `manga_ocr_preclean.py`，在 OCR 前把“大而细”的深色连通域（气泡框、分格线、速度线）涂白。字形和大块实心黑保留，坐标不变。只依赖 Pillow，A4（1654×2339）约 0.5 s。OCR 对清理图和原图各跑一次，再合并结果。没有 Pillow 时自动跳过。修复后真实 UI 能读出气泡内的「ありがとう」。
2. **真实 LaMa 每次都被拒绝。** `simple-lama-inpainting` 会把输入在右/下方补到 8 的倍数，并返回补过的尺寸。只要裁剪区域不是 8 的倍数，前端就提示「LaMa 修复图尺寸不一致，已拒绝」，真实用户基本每次都会遇到。之前的测试图恰好是 512×512，所以没暴露。修复：裁掉不足 8 px 的补边，其它尺寸不一致仍然拒绝。已补失败在先的测试，REAL 测试改用 517×389。
3. **文档/安装说明有误。** PyPI 上不存在 `simple-lama`（404），正确包名是 `simple-lama-inpainting`。该包钉死 `numpy<2`、`pillow<10`，在 Python 3.12/3.13 上 `pip install` 会去编译 numpy 并失败，必须用 `--no-deps`（步骤已写入 `docs/MANGA_LAMA_INPAINT_V1.md`）。在 transformers 5 下，manga-ocr 会同时下载 `.safetensors` 和 `.bin`，实测约 850 MB，确认弹窗里的体积说明已更正。

## 4. 结果：REAL vs MOCK

环境：Linux 6.12、8 核 CPU、无 GPU、Python 3.13.5、Node 22.19、Playwright 1.56.1 Chromium、tesseract 5.5.0、torch 2.14.1+cpu、transformers 5.19、manga-ocr 0.1.16、simple-lama-inpainting 0.1.2（`--no-deps`）、numpy 2.5.2、Pillow 12.3.0。

| 项目 | 类型 | 结果 | 证据 / 数据 |
|---|---|---|---|
| 代理链攻击负例（12 项） | REAL HTTP（本机假上游） | PASS | `npm run test:proxy-chain` |
| 质量门禁：`npm test`、test:proxy-guards、secret-guard、gpt-http、ink-mask、proxy-chain、lama-inpaint、manga-ocr-refinement、smart-ocr、model-guard、no-third-party-director、lama-pixel、check-translations | 单元/集成（多数 mock） | 13/13 PASS | 本机 |
| `test:gpt-browser`（真实 Chromium + mock API，含新的 LaMa 下载确认/取消用例） | MOCK API | CI PASS；本机 70 项 PASS 后在第 10 步第二标签页 `#mangaCharacterOpen` 超时 | 本机这个失败在 base 8693f4d 上同样出现，属环境问题；CI 通过 |
| PR #13 CI（0bd9655）：Legacy、Live HTTP/security、Chromium、Windows 启动/便携 ZIP、ocr-native、offline-contract、structure | CI | 7/7 PASS | GitHub Actions |
| Tesseract 横排 / 竖排日文（HTTP） | **REAL** | PASS | 「おはようございます」0.27 s；竖排「今日は晴れです」7/7 字，0.29 s |
| Tesseract 气泡内文字（原始 / 预清理） | **REAL** | 原始：读不出（已证实）；预清理：PASS | `scripts/manga-ocr-preclean-test.py`，`real-ocr-bubble-input.jpg` |
| manga-ocr：未同意 → 428；同意后下载 + 推理 | **REAL** | PASS | 首次 13.5 s（含下载），之后 0.16 s，「やめろ」 |
| LaMa：未同意 → 428；同意后下载 + 推理 | **REAL** | PASS | big-lama.pt 196 MB；首次 8.9 s（含下载），CPU 预热后 1.1–1.8 s |
| LaMa 蒙版外像素不变（HTTP） | **REAL** | PASS | 517×389：蒙版外 0 像素变化，蒙版内残留暗像素 0 |
| 真实 UI：OCR → Manga OCR → LaMa（下载确认弹窗）→ 预览 → 应用图层 | **REAL**（Chromium + 真模型，`scripts/manga-real-ui-acceptance.cjs`） | 8/8 PASS | 画布、导出 PNG、工程保存/重载三处蒙版外变化都是 0；预览阶段不改画布 |
| GPT 角色替换（带参考图 A / 仅文字 B），真实 UI | **REAL**（`gpt-image-2`，中转） | PASS | A 48 s、B 32 s，选区外 0 像素变化；A 正确沿用参考图的牛仔裤/呆毛，B 只按文字描述；`real-gpt-character-swap-A-ref-B-text.jpg` |
| 分格 / 气泡人工校正（删误检格、气泡候选需人工确认、显示/隐藏、选格桥接 GPT 不计费） | 真实 Chromium + 本地像素扫描；OCR 输入为 mock | CI PASS | `gpt-browser-acceptance` 第 10 步之后的记录 |
| NovelAI 免费额度回归（经加固后的 `/nai-proxy`） | **REAL** | 7/7 PASS | Opus tier 3，两次真实文生图 832×1216、28 步、n=1；**Anlas 8005 → 8005，花费 0**；无效 Token 时正确显示 401 |
| Windows 便携 ZIP | CI（Windows runner 启动 + ZIP 静态校验） | PASS | 不等于真机可用 |
| Windows 10/11 真机（双击启动、中文路径、代理/TUN、权限、字体） | — | **NOT TESTED** | 无 Windows 真机 |
| LaMa GPU、真实商业漫画扫描页 | — | **NOT TESTED** | 只有 CPU；测试用的是原创合成页（无版权素材） |
| OpenAI 官方 API | — | **NOT TESTED** | 无官方 Key |

真实计费调用：GPT 3 次（1 次生成原创参考立绘，A、B 各 1 次），全部 HTTP 200。NovelAI 免费生图 2 次，Anlas 0 花费。

## 5. 未解决 / 需要 owner 处理

1. **CI 工作流改动未推送（仍待处理，见 §7.6）。** 推送令牌没有 `workflow` scope。需要 owner 手动修改 `.github/workflows/manga-smart-ocr.yml`：
   - 加入 `manga_ocr_preclean.py`、`manga_model_guard.py` 和对应测试的 paths 触发；
   - apt 安装加 `fonts-noto-cjk`；
   - 运行 `python scripts/manga-ocr-preclean-test.py` 和 `python scripts/manga-model-guard-test.py`。

   在此之前，`npm run test:smart-ocr` 已包含预清理测试，但 CI 上 REAL 部分会因缺少 CJK 字体而 skip。
2. **【已修复 2c50ba2】GPT 局部改图会抹掉选区内的分格线/边框。** 真实 A/B 都出现了：选区外像素保持不变，但横跨选区的分格线在选区内消失了。选区如果切过人物，选区下沿会留下旧服装。建议在 UI 中把分格线作为保护蒙版，或在提示里提醒用户框选整个人物、避开分格线。
3. **【已修复 5e45e8d】LaMa 在白色气泡里留下极淡的矩形边缘**（接近白色，肉眼仔细看才能发现）。CPU 推理可用；GPU 未测。
4. **【已缓解 759292d、6b5833f】OCR 预清理是启发式的。** 超过约 150 px 的细线型手写拟声词可能被当作线条涂白（这类字 Tesseract 本来也读不出）；文字紧贴气泡框时可能连带被清理。原图 OCR 结果会合并作兜底。还需要在真实漫画扫描页上验证。
5. **Windows 便携包不含 torch / manga-ocr / LaMa**（只打包 Pillow）。Windows 用户需要按文档自行安装，Py3.12+ 还需要 `--no-deps`；真机未测。
6. 【已修复 51eb889】「检查 NAI」中「无限生图：否」直接来自 NovelAI `perks.unlimitedImageGeneration`。Opus 免费额度实际可用（Anlas 未扣），但这个显示可能误导用户，建议改为显示“Opus 免费额度（≤1024²、≤28 步）”。
7. 【已修复 4060e37】`gpt-browser-acceptance` 本机第二标签页超时：原因是自动保存恢复弹窗挡住了点击，而且这个弹窗无法用键盘关闭。
8. **轮换 NovelAI Token（再次提醒）。**

## 6. 复现命令（Key 从仓库外文件读取，不会打印）

```bash
# 真实模型（需 tesseract jpn/jpn_vert、manga-ocr、simple-lama-inpainting）
python 99_server.py &  python scripts/manga-real-model-acceptance.py
PYTHON=<venv python> node scripts/manga-real-ui-acceptance.cjs          # 用空的 TORCH_HOME 走真实下载确认
GPT_REAL_API=1 GPT_TEST_ENV_FILE=<仓库外> GPT_REAL_BASE_URL=<中转>/v1 GPT_REAL_MODEL=gpt-image-2 \
  GPT_REAL_REFERENCE=<立绘> GPT_REAL_CASES=A,B node scripts/gpt-real-api-acceptance.cjs
NAI_REAL_API=1 NAI_TEST_ENV_FILE=<仓库外> NAI_REAL_MAX_CALLS=1 node scripts/nai-real-acceptance.cjs
```

## 7. 第二轮（2026-10-09 晚 – 10-10）：全功能端到端、UX、清理

仅限 Linux。Windows 真机测试已按用户要求推迟（**NOT TESTED**）。

### 7.1 提交（分支 `fix/grok-manga-final-acceptance`，PR #13 Draft）

| SHA | 内容 |
|---|---|
| f108028 | 编辑器：导入图片不再把 A4 页改成 512×512；打开工程后会显示第一页（之前画布空白）；新空白页不再弹确认 |
| af5983c / dc7ddf9 | 图标字体和默认图标 SVG 打包到本地；启动时的外部请求从 26 次失败降到 0 |
| c540e10 / d6851d4 | `scripts/full-feature-e2e.cjs` 全功能 Playwright E2E；编辑器回归测试加入 `npm test` |
| cd09c42 | 页面结构按画布上的分镜格排阅读顺序（之前会把相邻格合并） |
| 6b5833f | OCR：丢弃 Tesseract 从网点/线稿里读出的碎片 |
| dadb108 | 清空画布前先确认；文件菜单文案统一（打开项目 / 保存，带快捷键）；改写首次使用引导 |
| 14f1762 | 网点贴到用户点击的那一格 |
| 5c1fcd9 | 无障碍：给图标按钮和输入框加名称；图层面板表头保持一行 |
| 422800b, 32b764b, b007e0d, cc64777, 0c3572f | 清理（见 §7.3） |
| 47e62c4 | 证据图片和真实 E2E 结果 |
| 4060e37 | GPT 框选不再被无关容器的滚动打断（二分定位到 2c50ba2 引入）；自动保存恢复弹窗加无障碍属性，Esc = 稍后决定 |
| 21d2425 | 中转站返回 HTML 错误页（例如 Cloudflare 530）时，显示可读的中文提示，不再显示 HTML 源码 |

### 7.2 功能矩阵

| 功能 | 类型 | 结果 | 证据 |
|---|---|---|---|
| 首次运行引导、模板、导入图片、分镜格、文字（横排/竖排）、气泡、图层、撤销/重做 | 真实 Chromium | PASS | `full-feature-e2e`（mock 25/25；真实 25/25 @47e62c4） |
| 保存 / 打开工程（像素一致）、PNG 导出 2481×3508、SVG 导出 | 真实 Chromium | PASS | 同上 |
| 网点贴到所点的格、页面结构（编辑器分镜格顺序） | 真实 Chromium | PASS | 同上 |
| Tesseract OCR / Manga OCR / 智能字幕 | **REAL** 模型 | PASS | 真实 E2E：「ありがとう」 |
| LaMa 擦除（蒙版外 0 像素变化） | **REAL** 模型 | PASS | 真实 E2E |
| 角色档案、墨迹蒙版 | 真实 Chromium（本地） | PASS | E2E + `test:ink-mask` |
| GPT 局部改图 / 角色替换（分格线保留率 1.0，选区外 0 像素变化） | **REAL** @47e62c4；MOCK @HEAD | PASS | `docs/acceptance/2026-10-09b/e2e-real-gpt-region-swap-top-panel.jpg` |
| GPT 文生图（1254²） | **REAL** @47e62c4 | PASS | `e2e-real-results.json` |
| GPT 局部改图 / 角色替换 + 文生图，重跑 @2d4386f（10-10 08:45） | **REAL** | 25/25 PASS | 选区外 0 像素变化，分格线保留率 1.0；文生图 1312×1199；`docs/acceptance/2026-10-10/e2e-real-{gpt-swap,gpt-t2i,final-page}-2d4386f.jpg`、`e2e-real-results-2d4386f.json`。（10-10 07:50 中转站曾返回 530，期间暴露的 HTML 错误显示问题已在 21d2425 修复） |
| GPT 可读错误（地址无效 / 429 / 取消） | 真实 Chromium + mock | PASS | E2E、`test:gpt-browser` |
| NovelAI 免费生图 832×1216、28 步、n=1 | **REAL** | 7/7 PASS | **Anlas 7980 → 7980，花费 0**（10-10 早） |
| 代理 / 安全 / 密钥防护 | REAL HTTP（本机） | PASS | proxy-chain、proxy-guards、secret-guard |
| `test:gpt-browser`（真实 Chromium，mock API） | MOCK | PASS（CI @4060e37；本机 74 项 @21d2425） | 新增用例：框选不受无关滚动影响；恢复弹窗 Esc 后保留数据 |
| Windows 真机 | — | **NOT TESTED** | 已推迟 |

真实计费调用：GPT 共 7 次成功（另有 2 次因中转站 530 失败，未出图）；NovelAI 0 Anlas。

本机 @21d2425 完整回归：`npm test`、check-translations、check:index、35 个其他套件和 mock E2E，**共 38/38 PASS**。`test:nai-pipeline` 需要服务器和 Token，已由真实 NovelAI 验收代替。

### 7.3 删除 / 重写及理由

共删除约 5.6 万行（`git diff --shortstat c02fe3b..HEAD`：+7261 / −56491）。

| 提交 | 删除内容 | 证明未使用的方法 |
|---|---|---|
| 422800b | 33 个文件中的 86 个函数（−1186 行） | ESLint no-unused-vars，且 `git grep -w` 只找到声明本身；清单见 `docs/acceptance/2026-10-09b/dead-code-removed.tsv` |
| 32b764b | `test/`：上游的独立实验页（169 个文件，1.7 MB） | 未被引用、未打包 |
| b007e0d | `roadmap/`、`ロードマップ２/`、`ロードマップ３_複数API対応/`、`99_doc/` | 过时的多 API 规划，与当前仅 NovelAI 的运行时矛盾 |
| cc64777 | `100_git_push_draft.bat`（`git add .` 可能把密钥提交上去）、`claude --dangerously-skip-permissions.bat`、个人同人漫画预设（含 R18） | 不属于产品，且有安全风险 |
| 0c3572f | 遗留的 ComfyUI / SD-WebUI / fal / RunPod / 角度生成 / 局部重绘代码（28 个 JS、4 个 CSS、`html/API_Help`），以及永远不显示的菜单项和桩函数 | index.html 不加载；按文件名 `git grep -F` 找不到引用；删除后再扫一遍也没有新的孤立文件 |

每次删除后都跑了 `npm test`、其余 JS/Python 测试、check-translations、check:index 和 mock E2E，全部通过。

### 7.4 UX 前后对比

`docs/acceptance/2026-10-09b/ux-before-after-laptop-{1-first-run,2-template-plus-import,3-shape-panel-icons}.jpg`

- 之前：新页面也弹确认框；导入图片后画布变成 512×512；启动时 26 个外部请求失败。
- 之后：不再弹框；画布保持 1654×2339；外部请求失败 0 个；1600 / 1280 宽度下都没有横向溢出。

### 7.5 剩余问题

1. 智能字幕会保留单个 kana 碎片（例如「の」）。这是有意的：日文单字也可能是真对白。
2. GPT 替换后，人物可能越过下方分格线：原画本来就跨格，选区外像素不会被改动。
3. 形状面板的颜色输入框里文字被截断（显示为 `rgba(25`）。
4. 还有 703 个 ESLint 警告（0 个错误）。
5. 其他语言的翻译文件在运行时不加载（应用只显示中文），只给 check-translations 用。暂时保留。
6. **CI 工作流改动仍未推送**（manga-smart-ocr.yml 和 full-acceptance 的触发路径）。提供的 fine-grained PAT 推送时返回 403：它需要对本仓库有 **Contents: Read and write** 和 **Workflows: Read and write** 两项权限。提交已备好：本地分支 `ci-workflow-pending`（6114e98）。
7. 智能字幕替换：新文字「どうもありがとう」比气泡宽，气泡里还能看到原文字的淡淡残影（见 e2e-real-final-page-2d4386f.jpg）。建议换字时自动缩小字号以适配气泡，并默认先擦除原文字。
8. **请轮换 NovelAI Token**（旧 Token 曾泄露给第三方 Director）。
