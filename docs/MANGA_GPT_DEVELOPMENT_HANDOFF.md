# Manga-NAI-GPT · 最新开发交接与验收门禁

> 状态：**开发版 / Draft / 不可发布**。更新时间：2026-10-09。该文档记录“已核对的源码存在性”与“尚待验收”，不把模拟测试当成真实模型性能。

## 1. 唯一有效的开发入口

- 原仓库：[h1neolzr7f/Manga-Editor-Desu-NAI](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI)
- 原始正式分支：`main`（检查时提交 `d612c841e75c2c675499b710ebeeeb7f39590973`）。**这不是最新 GPT 漫画编辑代码。**
- 已有叠加式开发链：PR [#5](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/pull/5) GPT 兼容接口 → [#6](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/pull/6) 网络与秘密保护 → [#7](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/pull/7) OCR 字幕 → [#8](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/pull/8) 分镜和编辑计划 → [#9](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/pull/9) Character Bible → [#10](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/pull/10) Manga OCR → [#11](https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/pull/11) LaMa。
- PR #11 之后继续新增的 `feat/manga-auto-ink-mask-v1`（检查时 `8c2f48637da02aa6497eaa4c13216de91939e4f6`）包含保守的深色文字蒙版候选算法。它此前只有源码，**没有加入 HTML 载入、LaMa 交互和测试入口**。
- **本次交接维护分支**：`fix/manga-gpt-handoff-ink-mask-20261009`，从上述最新蒙版分支创建；该分支把候选算法接入 LaMa 弹窗、补离线/浏览器回归、更新交接文档。接手人以该分支最新提交为准，切勿按旧手册的 PR #11 SHA 覆盖代码。
- **不要将上面各个层叠 PR 独立 cherry-pick 或全部分别 merge 到 main**：先按依赖顺序确认，之后一次性集成并复测。当前不得修改正式 Release。

## 2. 功能边界（事实与缺口）

| 功能 | 当前可在源码中定位到的能力 | 尚未证明 / 缺口 |
|---|---|---|
| 原有漫画编辑、NovelAI、PNG 导出 | 基于 main 原有链路，新增 GPT 功能以独立模块嵌入 | 全部 Windows GUI 回归尚未复测 |
| GPT Image / 兼容第三方中转 | `js/ai/gpt-region-editor.js` + `gpt_image_proxy.py` + `99_server.py`：框选、参考图、预览、图层 | 任意第三方接口都兼容、身份必然一致、无误改图 **均不可保证** |
| 本地 OCR → 字幕 | `manga_smart_ocr.py` + `manga-smart-text-*.js`：候选行、改字、Fabric 文字层 | 日漫复杂竖排/注音实图准确率、字体兼容 |
| 分镜与气泡 | `manga-page-structure*.js` + `manga-bubble-detector.js`：启发式候选、阅读顺序、人工修正 | 真正的分镜/气泡语义检测与尾巴归属 |
| 自然语言修改 | `manga-edit-planner*.js`：本地规则识别、计划预览、人确认 | 不是视觉大模型、不能可靠自动锁定单个人物 |
| 角色一致性 | `manga-character-bible-*.js`：本地参考图/角色锚点复用 | 无真正角色分割/跟踪与跨页身份锁定 |
| 可选 Manga OCR | `manga_ocr_refiner.py`：区域文字精修（不输出 bbox） | 首次模型加载/下载、Windows 可用性和真实日漫效果 |
| 可选本机 LaMa | `manga_lama_inpaint.py`、`manga-lama-inpaint-ui.js`：画笔蒙版、预览、独立 Fabric 修复层 | 真实模型质量、性能、首次下载与复杂背景误擦 |
| **深色文字候选** | `manga-text-ink-mask.js` → `manga-lama-inpaint-ui.js`：浅色干净底色启发式提取；拒绝不可靠底色；仍需确认和预览 | 不是字符语义分割 / SAM / OCR；可能漏字或误把深色纹理当文字 |

## 3. 本轮代码更新与可重复测试

1. HTML 新增先于 LaMa UI 的 `manga-text-ink-mask.js` 载入；在 LaMa 蒙版编辑器新增 **提取深色文字候选** 按钮。
2. 算法先检查裁剪区域外缘颜色是否均匀、不透明、亮度足够，再识别文字框内深色像素并做 1 px 安全扩张；没有可靠候选时**不覆盖用户现有蒙版**。
3. 成功也只覆盖“局部离线蒙版草稿”，标记 `verified:false`；**不会直接启动模型、发 GPT 付费请求或应用图层**。仍需人工检查、点击“生成修复预览”和“确认应用”两个独立步骤。
4. 测试：`npm run test:ink-mask`（纯白气泡/边界/复杂背景/无字/全黑/无效坐标）；`npm test` 把此项并入离线测试；`npm run test:gpt-browser` 验证真实 Chromium UI，模拟服务而非实际 LaMa 模型。
5. **本次执行状态**：源代码变更已提交到交接分支。新提交的 CI 和上述命令必须按 PR Checks 逐项判定；没有新日志时不得填写 PASS。现有旧运行的绿色不能迁移作为本分支的通过证明。

## 4. 发布门禁与 P0/P1 执行顺序

**P0 最新修复（本交接 PR）：** `99_server.py` 已增加代理入口的同源门禁：不可信 `Origin: null`、跨端口、DNS rebinding Host、跨站 `Sec-Fetch-Site` 在读取请求体和转发到 NovelAI / Director / Tagger 前被拒绝；OPTIONS 同样受保护；不会再向 `null` 返回允许读取的 CORS 头。HTTP 负测已写入 `scripts/local-secret-guard-test.py`（含攻击者自带 Token 的路径）。**修复代码存在不等于新 CI 已通过，需查看 PR #12 新提交的 Checks；其他模块仍待全面安全审查。**

**P0：安全必须先核对。** 全面复核 `99_server.py` / 代理：不可信 Origin 和 `null` 来源、不同 Host、跨站 preflight、`/tagger-proxy`、`/director-proxy`、loopback SSRF、重定向、DNS rebinding、上传尺寸/超时与敏感 Key。加入真实 HTTP 恶意请求负例（上游接收次数应为 0）。**曾有旧脚本把 NovelAI Persistent API Token 发往第三方 Director 网关的记录：使用该旧 Token 的账号应主动更换 Token。** 不把 Key 写入仓库、测试日志、截图和报告；用户过去在聊天里给出的第三方 Key 不允许从历史消息直接复制到项目。

**P1：功能可用性。** 真漫画日文 OCR、真实 LaMa（含 CPU/GPU/首用模型）、人物参考图与区域对齐、项目保存与重载、撤销重做、mask 外像素一致性、局部改图清晰度、中文路径 Windows 10/11、启动器与便携 ZIP、代理/TUN、原有 NovelAI 真调用。存在任意缺口时保留 Draft。

**质量门禁：** 按顺序执行 `npm test`、`npm run test:proxy-guards`、`npm run test:secret-guard`、`npm run test:gpt-http`、`npm run test:ink-mask`、`npm run test:gpt-browser`、`npm run check-translations`；Windows 工作流的 ZIP 静态校验不代表机器上真的能启动。真实模型只在有授权、成本上限和本地隔离凭据时测；无条件时标 `NOT TESTED`。

## 5. 对接方式、不能做的事与最终交付

- 首先读：[Grok 综合交接](GROK_BOT_FINAL_HANDOFF_2026-10-09.md)、[安全验收报告](../GROK_LINUX_ACCEPTANCE_REPORT.md)、[LaMa 工作流](MANGA_LAMA_INPAINT_V1.md)、[借鉴台账](UPSTREAM_BORROWING_LEDGER.md)。
- 借鉴来源：BallonsTranslator（模块分层）、Comic Translator（候选人工纠错）、Manga OCR（可选运行时接口）、Simple LaMa（可选运行时接口）、PhotoDemon（非破坏式 UX）、自有 NovelAI Harness / AI Manga Factory（角色参考与编辑计划）。**文档里明确区分“借鉴思路 / 真正调用的包 / 原创代码 / 未实现功能”。**
- 不静默更新远程依赖到未经测试的“大版本”；所谓“最新代码”指跟上当日已存在的最新开发分支，不意味着不加选择升级全部库。
- 不把模拟图片、mock 响应和 CI 静态 ZIP 当作真实模型/Windows 实机成功；不提前改 main、打 Release 或声明最终验收完成。
- 最终应提交 `GROK_MANGA_FINAL_ACCEPTANCE_REPORT.md`，填入 commit SHA、运行环境、逐条通过/失败测试、截图、耗时、模型版本、真实页面质量、回归与阻断项，达到门禁后再请用户最终体验验收。

**目前状态：已完成开发交接、候选墨迹工作流接入；仍在开发验收阶段，不具备发布条件。**
