# Grok Bot 最终交付状态（对照 docs/GROK_BOT_FINAL_DELIVERY.md）· 2026-10-10

集成分支：`integrate/grok-final-delivery-20261010`（= `fix/grok-manga-final-acceptance` = PR #15 分支 `consolidate/manga-nai-gpt-stack-20261010`）。未动 main、无强推。

## 1. 整合
- PR #14（codex，基于 main 的平行 GPT 实现）：没有整体合并（会多出第二套 GPT 编辑器）。只挑了它的两个修复 214fb80、ee05fa5（页面历史/页锁、image2 持久化、NovelAI 离屏结果），用 #14 自己的 4 个回归测试证明我们缺这些修复，再修好。合并冲突中发现 `setSave()` 被我们当死代码删掉、但 #14 又调用了它（运行时会 ReferenceError），已恢复。
- 当前失败的 CI（GPT 模型选择器缺多语言字段）：已修，并把 gpt-i18n 测试加进 `npm test`。

## 2/3/4. 新手任务实测（scripts/novice-task-e2e.cjs，真 Chromium 鼠标/键盘，真 Tesseract，GPT=mock）
| 流程 | 新版 | 关键操作 | 原版（main d612c84） |
|---|---|---|---|
| 1 首启+导入 2 页 | PASS（2 页，各 1200×1700，像素与原图一致，17.7s） | 4 | FAIL：2 张图叠在 1 页，第 2 页丢失，107.9s |
| 2 框选人物+参考图+描述→生成→预览→应用 | PASS（选区外 0 像素变化，分辨率不变） | 4（原 5） | 无此功能 |
| 3 识别竖排日文气泡→改字→去字→中文字幕 | PASS（识别 ありがとう，竖排，字号≈原字，无溢出） | 3 | 无此功能 |
| 4 撤销/重做/切页/保存/关闭/重开 | PASS（重开后两页 0 像素差，字幕仍可编辑，可继续撤销） | 12 | 原版仅能做部分 |
| 5 未框选/HTTP 530/再试/超长提示词 | PASS（可读错误，0 次静默重试计费） | 6 | 无 |
| 7 生成中切页 | PASS（结果不会贴到别页） | 14 | 无 |
| 6 1024×700、1.5x 缩放 | PASS（无横向溢出，生成按钮可达） | 0 | PASS |

证据：`docs/acceptance/novice-20261010/{new,original}/`（截图 + report.json）；CI 作业 “Novice full task” 上传完整截图和 Playwright trace（artifact `manga-novice-task`）。

本轮实测发现并修复的 bug：多图导入只进 1 页且顺序颠倒；默认 OCR 把竖排气泡识别成乱码（新增气泡优先 auto OCR）；替换字幕挤在旧字列/字号过大；状态栏底图尺寸过期；GPT 结果可被贴到别的页；自动框选遮住面板按钮。新增：套索、笔刷选区（只改圈内/涂到的像素）。

## 5. 门槛
- Linux：npm test、真实浏览器 GPT 验收 78 项、全功能 E2E 25 项、新手脚本 7 流程、OCR/LaMa 实模型：PASS；CI 全绿。
- 真实 GPT（gpt-image-2.5）：2026-10-10 上午 case A 实测通过（见 docs/acceptance/gpt-image-2.5/）；之后中转持续 HTTP 530 = **网络阻断**，新手流程的真实 GPT 版本未跑。
- Windows：**实机未验收**（仅 CI 便携 ZIP 检查通过）。
- 请所有者轮换旧 NovelAI Token。

## 未完成
- 真实 GPT 跑新手流程（等中转恢复：`NOVICE_REAL_GPT=1 GPT_TEST_ENV_FILE=… GPT_REAL_BASE_URL=…/v1 node scripts/novice-task-e2e.cjs`，约 2 次计费）。
- Windows 实机全流程；操作录屏（现有 Playwright trace 代替）。
- GPT 面板在 1440 宽下仍遮住画布右半，可再做可停靠/折叠。
