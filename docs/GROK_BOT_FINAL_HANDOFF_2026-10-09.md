# Grok Bot 接手开发与综合验收任务书（2026-10-09）

> **最新交接入口已更新**：请先读 [MANGA_GPT_DEVELOPMENT_HANDOFF.md](MANGA_GPT_DEVELOPMENT_HANDOFF.md)。此文件保留原本的 P0/P1 验收要求与 Grok 任务分工，但下方 PR #11 的 SHA 和 CI 结果是当时快照，不是最新版验收结论。最新工作基于 `feat/manga-auto-ink-mask-v1`，实际交接分支为 `fix/manga-gpt-handoff-ink-mask-20261009`。新增的蒙版候选只是辅助提取，不能代替人工审核/真实模型验收。

**源仓库**：https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI  
**接手分支**：`feat/manga-lama-inpainting-v1`；**Draft PR #11**：https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI/pull/11  
**上游 PR 链**：#6（Grok Linux 安全与 GPT 区域编辑）→ #7（智能字幕）→ #8（漫画结构和计划）→ #9（Character Bible）→ #10（Manga OCR）→ #11（LaMa）。这是叠加开发分支，**不要将每条 PR 单独 cherry-pick 到 main，不要直接合并 main，不要提前标记 Ready for review**。

## 交接状态（务必重新验证，不要照抄本快照）

在 2026-10-09 当前 PR #11 `e2a78c8b53956c8c82d934fdef43fee180c15b9c` 时，GitHub Actions 的四项作业 PASS，包括真实 Chromium（mock API）70 项交互检查、Windows ZIP 静态检查、HTTP 安全和旧功能回归。

- **已实现但仍需真实环境验收**：GPT 兼容接口局部改图、保留画布像素与图层、参考图片、智能字幕 OCR 与 Fabric 可编辑图层、分镜候选与文字归属、气泡候选与人工修订、自然语言编辑计划（本地规则、人工确认）、Character Bible IndexedDB 参考素材、可选 Manga OCR 日文文字精修、可选本地 LaMa 蒙版画笔 + 修复预览 + 独立图层。
- **CI 不能替代的关键测试**：真实 Tesseract 日文竖排/拟声词；安装 `manga-ocr` 后首次下载和真实识别；安装 `simple-lama` 后首次下载、真实复杂背景擦字的精度和 CPU/GPU 性能；Windows 真实 GUI 双击启动/停止/恢复，中文路径、Clash TUN/代理、有无管理员权限、字体/打包分发；真实 GPT Image 第三方兼容 API（只在获得用户有效凭据后运行，不要从历史对话提取 Key）；真实 NovelAI 图像生成。
- **借鉴台账**：`docs/UPSTREAM_BORROWING_LEDGER.md`；先读 `docs/MANGA_CHARACTER_BIBLE_V1.md`、`docs/MANGA_OCR_REFINEMENT_V1.md`、`docs/MANGA_LAMA_INPAINT_V1.md`、`docs/MANGA_PAGE_STRUCTURE_V1.md`。核对哪些是原创实现、哪些依赖第三方 Python API、哪些仅借鉴架构；凡是实际新增源码/模型的来源都注明准确上游与版本，正式开源前再集中许可证审计。

## 优先级 P0：安全和产品阻断问题先修

1. **重新审计 `99_server.py` 的所有代理路由**。特别关注 `NULL_ORIGIN_API_PREFIXES`、`cors_allow_origin`、`do_OPTIONS`、`/tagger-proxy/interrogate` 与 `/director-proxy/chat-completions`、`X-Director-Api-Url`、本地 `/nai-tools/*`。已发现的风险是来自沙箱网页的 `Origin: null` 可以借助本地代理转发至其它 loopback 服务，转发时丢失危险源的浏览器请求头，以 localhost 身份触发敏感操作（SSRF/CSRF 信任边界绕过）。务必拒绝不可信来源，包括 null origin；防止任意 upstream/重定向/DNS 重绑定绕过。补**真实 HTTP 负面集成测试**：恶意 Origin、null、不同 Host、跨站 preflight、内网回环自请求、模拟接收器断言请求次数为零。不能只写纯函数单测。不能因为 UI `file://` 模式需要通信就重新放开不受信任的 null Origin；另选安全桥接方式。
2. 已有记录显示某旧测试曾把 NovelAI Persistent API Token 错误发给第三方 Director 网关。旧错误修复不能消除泄露风险；**请在最终报告明确提醒用户旋转 NovelAI Token**。不能读取、打印、提交、上传任何 API Key、Persistent Token 或 `.env`，不在日志保存完整 Authorization。
3. 检查动态上传图像、蒙版、OCR 路由的内存上限/超时、输入型别、同源拒绝、Python 模型复用并发、任意本地路径访问、可导致模型意外下载的行为和取消按钮的请求状态。安全问题修到有可重复的回归测试为止。

## 优先级 P1：把已有功能变成真正能用的稳定闭环

1. **OCR 字幕**：真实漫画页的竖排日文/注音/混排识别；检测框误差、气泡归属、用户人工纠错；文字层大小和位置、纵排标点、字体 fallback、透明底图、页面分辨率、撤销/重做和保存再打开。Tesseract 不会冒充专用语义检测；`Manga OCR` 是文字识别器，不能伪造 bbox。
2. **LaMa 去字**：真实 `simple-lama` CPU/GPU 推理，首用模型下载失败、依赖缺失、离线缓存、模型初始化时间/内存；涂抹蒙版、擦回保留区域、缩放和指针插值、取消、重复应用、防重复遮盖；确保 mask 外原始像素完全不变（图层渲染/导出/重新加载也检查），检查复杂背景修复是否有明显伪影，不能悄悄把人或线条抹掉。
3. **GPT 改图/人物替换**：自然语言选第 N 格 → 选角色/参考图 → 明确显示要改的区域与保护要求 → 发送预览 → 人工确认 → Fabric 非破坏图层。复核人物、对白、衣服、脸和选区之外像素；参考图多张可用；重复调用或切角色不能串图、叠加旧约束或滥用额度。若不能可靠自动定位单个人物，要给用户手动修正/确认选区的交互，不可用整格替代角色 mask 并误改其他角色。
4. **分镜、气泡与角色一致性**：增加真实漫画布局样本的置信/人工校正机制。把 `panel/bubble/text/character` 的关联数据持久化时保留 schema 版本。优先完成能实际提升人物替换质量的角色分割/Mask、跨格 Character Bible 引用；但不要为了“全自动”损坏成熟编辑功能。
5. **Windows 最终产品**：Windows 10/11 真机安装/运行与双击启动、中文路径、缺失依赖提示、首次下载进度、代理/断网、停止和超时、黑屏/端口冲突、弹窗、多语言、保存项目、导出 PNG。修复后重构生成**真实可运行**的 ZIP/Release；请验证包的 commit SHA 对得上构建产物，不可把只有静态检查的 ZIP 称作实机可用。
6. **代码和体验打磨（关键功能稳定后做）**：删除多余/死代码和重复入口、修复历史包袱，保持 NovelAI 原功能不回归。整理菜单，避免右侧面板过密，鼠标/触屏都可用。不要做层层无意义的 defensive wrappers，也不要为了形式把同一流程拆成大量碎文件。

## 执行节奏与质量门禁

- 从当前 PR #11 的最新远程提交开始；创建自己的 `fix/grok-manga-final-acceptance` 工作分支，以当前顶层特性分支为 base 提交 Draft PR，或直接在 PR #11 的分支修复（若你有写权限）。**不要污染其他仍在更新的分支**；如果发现分支前进先 fetch/rebase、解决冲突再推送。
- **不要问用户接下来先修什么**：自己检查仓库、运行测试、按 P0→P1 推进；遇到失败先复现、查日志、定位根因、修改，再增加能证明修复的测试；不要通过跳过断言、禁用测试、改期望值来“变绿”。
- 每完成一个可交付小阶段，就在 GitHub 提交代码、测试、截图及简短报告；记录通过/失败的准确命令、环境、截图、耗时、分辨率和输出工件。确保最终 CI 全绿，并另补离线端到端与真实模型的证据。
- 安装缺失的开发工具、模拟服务和模型依赖可以自己处理；真实付费 GPT/NovelAI API 只可在用户已授权的账号/环境中测试，设置调用上限，不暴露凭据；没有凭据就明确标记 REAL API NOT TESTED，不能伪造结果或暗自无限调用。
- 覆盖至少：离线测试、Python 模型单测、真实 HTTP 负测、浏览器 Playwright 端到端、真实模型运行、Windows GUI、ZIP 内实际可执行文件、负例和大图/高 DPI、撤销/重做及保存导出像素一致性。**明确区分 mocked PASS 与 real PASS**。
- 严格遵守仓库现有 GitHub Actions 约定；不要修改主分支或发布 Release，直到用户明确授权。不要向用户索要验收，除非代码、CI、实机和模型真实测试都达到最终验收门槛，或出现无法自行解决的物理设备/凭据阻断。
- 最终生成 `GROK_MANGA_FINAL_ACCEPTANCE_REPORT.md`，附功能清单、代码变更、回归摘要、真实 Windows/模型测试证据、性能、关键遗留问题和未测试项；若未达到发布标准，保持 Draft 并清晰列出阻断项。

## 最终目的

做出真正方便用的 Manga-NAI-GPT，而不是看似齐全、实际上功能失灵的大拼盘：保留原有 NovelAI 生图/漫画编辑，支持第三方 OpenAI 兼容 GPT Image 的自然语言改图/换人/去字、人物参考图一致性、字幕图层编辑，以及高分辨率无损输出。等真实实机/全套功能验收就绪，再集中提醒用户进行最终体验验收。

**不允许提前合并 main。**