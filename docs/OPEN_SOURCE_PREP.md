# 开源前检查（2026-10-11）

## 1. 全历史密钥 / 隐私扫描

范围：所有分支（26 个远端分支，399 个提交），`git log --all -p`（约 105 MB 文本）。

| 工具 | 结果 |
|---|---|
| gitleaks 8.21.2（默认规则） | **0 处泄漏** |
| 已知真实密钥逐字比对（GPT 中转 Key、NovelAI Token、两个 GitHub Token，来自仓库外 600 权限文件；不打印） | **0 处**：任何提交里都没有真实密钥 |
| `sk-…` 通用模式 | 1 处：`214fb80` 测试里的假值 `sk-test-super…`（测试“密钥不进入任务记录”） —— 无害 |
| `github_pat_` 字样 | 2 处：`d7b4041` 报告里描述扫描规则的文字，没有令牌本体 —— 无害 |
| `GPT_IMAGE_API_KEY=` | 6 处：脚本里读取环境变量的代码（`line.slice('GPT_IMAGE_API_KEY=')`），没有值 —— 无害 |
| **私有中转地址**（Cloudflare Workers 域名） | **9 个提交、43 个文件**（`c540e10` 之后的验收报告和 `docs/acceptance/gpt-image-2.5/**` 的请求/摘要 JSON）。**当前分支已替换为 `https://<your-relay>`，历史里仍在** |
| **临时隧道地址**（Cloudflare 临时隧道域名） | `bd311cf`：`docs/acceptance/gpt-image-2.5/caseB-…-relay530-summary.json` 的错误信息。当前已替换，历史仍在（隧道早已失效） |
| 虚拟机 home 目录路径 | `58961a0`、`d7b4041` 的文档（虚拟机路径，不含真实用户名）。当前已替换为 `~/` |
| 邮箱 | 提交作者：`grok123ding@outlook.com`（上游原作者 232 个提交，已公开在上游）、`h1neolzr7f@users.noreply.github.com`、`cursoragent@cursor.com`。文件内其他邮箱都是字体许可证 / 第三方库作者信息 |
| 测试用 env 文件 | 历史中**从未提交**过 `.env` / `*_test_env` |

新增防线：
- `.gitignore`：`.env.*`、`*.env`、`*_test_env`、`.mnai_*`、`*.pem/*.key`、令牌文本、本地模型（`*.onnx/*.pt/*.safetensors`、`models/`）、`artifacts/`。
- `scripts/privacy-guard-test.cjs`（在 `npm test` 第一步）：任何受版本管理的文本文件出现密钥、Cloudflare Workers 域名、Cloudflare 临时隧道域名、虚拟机 home 路径或长 Bearer 串即失败。

### 建议（需要你决定，未改写任何历史）

历史里**没有密钥**，只有私有中转地址和一个早已失效的隧道地址。三个方案：

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| **A（推荐）** 新仓库 + 单个压缩提交 | 从整理好的分支 `git archive` / `--orphan` 建一个只有 1 个提交的新公开仓库；当前仓库保持私有作为开发史 | 中转地址、本机路径、244 MB 的历史大图全部不进公开仓库；体积小 | 公开仓库看不到逐次提交史（可在 README 里注明来源） |
| B 原仓库直接公开 | 只清理当前文件（已完成） | 最省事，保留全部历史 | 任何人都能在历史里看到中转地址；仓库 244 MB |
| C 用 git-filter-repo 改写历史 | 替换掉地址后强推所有分支 | 保留历史又去掉地址 | 需要强推（违反“不强推”规则），所有 PR/克隆失效；不建议 |

无论选哪个：**如果中转地址本身不想被滥用，建议在中转侧换一个地址或加访问控制**（它出现过在私有仓库历史里）。

## 2. 第三方许可证

见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。8 个按需下载的模型、28 个打包前端库、12 套字体逐一核对（GitHub license API / Hugging Face 模型卡 / 文件头）。模型全部不进 Git（`.gitignore` 也排除了 `*.onnx/*.pt/*.safetensors`）。删除了未加载的上游 Google Analytics 脚本（含上游跟踪 ID）。

## 3. README

新 `README.md`（中文为主 + English 段落），截图压缩后放在 `docs/images/`（6 张，共约 0.9 MB）。

## 4. Windows

见 [WINDOWS_READINESS.md](WINDOWS_READINESS.md)。新增 `windows-latest` CI；发现并修复 3 个真实问题：Windows 检出时 JS 被转成 CRLF 导致测试失败（`.gitattributes` 统一 LF）、两个 ps1 缺 BOM（含日文/中文字符）、`tesseract --list-langs` 输出未指定编码。新增一键安装本机 AI：`安装AI功能.bat` / `scripts/install-ai.sh`，Linux/macOS 启动 `start.sh`。

## 5. 仓库卫生

- 已有：`LICENSE`（GPL-3.0）、`CONTRIBUTING.md`（补了 Linux/macOS 与提交前检查）。新增：`SECURITY.md`、Issue 表单（问题 / 建议，含「不要贴密钥」提示）、PR 模板。
- 体积：受版本管理文件约 291 MB，git 包 244 MB。大头是上游的提示词助手示例图 `03_images/imgPromptHelper`（899 张，167 MB，NovelAI 提示词助手在用）、`assets/public`（22 MB）、`docs/acceptance` 验收证据（19 MB）、字体（约 50 MB）。
- `scripts/make-public-tree.sh`：按方案 A 导出干净的公开目录（去掉验收证据与内部报告，并做私密字符串检查），当前约 270 MB；不会创建或推送任何仓库。

## 6. 打磨

- 首次下载模型时显示进度卡片（百分比、MB、剩余时间；LaMa / manga-ocr 由库下载，显示已用时间）。
- 漫画分镜结构、角色档案面板、新手工具提示条、首次引导按钮、intro 提示框统一到主题变量，浅色模式下不再是深色面板 / 淡蓝字。

## 需要你决定

1. **公开方式**：A（推荐）新仓库单提交 / B 原仓库直接公开 / C 改写历史（需强推，不建议）。
2. **中转地址**：它在私有仓库历史里出现过；公开前（尤其选 B 时）建议在中转侧换地址或加访问控制。
3. **intro.js（AGPL-3.0）**：保留，或换成 MIT 的引导实现（约半天）。
4. **おひさまフォント**：公开前告知作者，或移除。**851 字体**：补许可证文本，或移除。
5. **验收证据去处**：`docs/acceptance`（19 MB）在方案 A 中不进入公开仓库；是否还要整理到别处（例如 Release 附件，需要你允许创建 Release）。
6. **提示词助手示例图（167 MB）**：保留（功能完整）或改为首次使用时下载（公开仓库可缩小到约 100 MB）。
