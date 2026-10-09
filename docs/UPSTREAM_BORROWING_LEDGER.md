# Manga-NAI-GPT · 第三方借鉴位置台账

**用途**：开发期统一记录借鉴来源、实际使用/未使用的代码、文件位置以及未来可替换策略。每次新增第三方模块时更新；这份台账本身不代表原项目授权可以被忽略。

| 上游项目 / 来源 | 我们借鉴的功能思路 | Manga-NAI 实际落点 | 当前使用方式 | 当前第三方源码/权重 |
|---|---|---|---|---|
| [BallonsTranslator](https://github.com/dmMaze/BallonsTranslator)（尤其 text detector/OCR/inpainter 分层与可扩展注册机制） | 文本检测、OCR、去字、翻译四阶段分离；人工复核中间产物 | `manga_smart_ocr.py`（OCR 后端），`js/ai/manga-smart-text-core.js` 与 `js/ai/manga-smart-text-editor.js`（字幕复核），后续 `TextInpaintAdapter` | **借鉴分层思想；本轮没有搬运 BallonsTranslator 源码** | 无 |
| [Comic Translator](https://github.com/UnfetteredScholar/comic-translator) | 页面图像→气泡候选→OCR→人工审核→重绘的分段式处理，候选区域可以修改 | `js/ai/manga-page-structure.js`、`js/ai/manga-bubble-detector.js`、`js/ai/manga-page-structure-ui.js`、`docs/MANGA_PAGE_STRUCTURE_V1.md` | **自行实现轻量留白分镜扫描**；保留 detector 替换点，未使用 RT-DETR/LaMa 权重 | 无 |
| [Manga OCR](https://github.com/kha-white/manga-ocr) | 竖排、注音、复杂日文字体由专门识别器处理；应对气泡整体识别 | 计划中的 `MangaOcrAdapter`；当前 `manga_smart_ocr.py` 依旧采用本地 Tesseract | 已标出替换位置；**尚未接入 Manga OCR** | 无 |
| [NovelAI Harness](https://github.com/h1neolzr7f/Novelai-harness)（用户自有仓库） | 焦点超采样、参考图、多角色锚点、局部重绘的工作流 | 现有 `js/ai/gpt-region-editor.js` 的区域上下文与后续人物工作流 `CharacterBible` | 复用交互/架构思路；不直接迁入 Flutter/Dart UI | 无 |
| [PhotoDemon](https://github.com/tannerhelland/PhotoDemon) | 非破坏性图层、选区、撤销/重做、修图预览 | 沿用 Fabric 原生图层和 `js/layer/image-history-management.js` | 借鉴专业编辑的可逆交互体验；**没有引入 PhotoDemon VB6 代码** | 无 |
| [AI Manga Factory（用户自有漫画流水线）](https://github.com/h1neolzr7f/jm-remix-pipeline) | Director 在真正生成前先输出可检查的分镜/编辑计划，避免直接改坏源素材 | `js/ai/manga-edit-planner.js`、`js/ai/manga-edit-planner-ui.js`、`js/ai/gpt-region-editor.js` | **借鉴计划→确认→执行的工作流思想；V1 是自行编写的本地规则解析器**，不调用模型，不声称具备角色视觉识别 | 无 |
| [NovelAI Harness](https://github.com/h1neolzr7f/Novelai-harness) + AI Manga Factory 的角色锚点理念 | Character Bible：角色姓名、服装/外观文字锚点、多张参考图可跨分镜复用 | `js/ai/manga-character-bible-core.js`、`js/ai/manga-character-bible-ui.js`、`js/ai/gpt-region-editor.js` | **只借鉴“角色设定→参考图→修改确认”的产品思路**；角色卡格式、IndexedDB 存储、压缩和桥接均为本仓自行实现 | 无 |
| Manga-NAI 原生 Fabric 页面编辑器 | 画布序列化、结构化对象、已有文字图层及 GPT 代理 | `js/ai/manga-smart-text-editor.js`、`js/ai/gpt-region-editor.js`、`js/core/settings.js` | **直接复用本项目现有代码与接口** | 项目已有依赖 |

## 本轮新增代码模块地图

- `js/ai/manga-page-structure.js`：自编写 **XY-cut 留白递归**，只根据页面像素提出候选分镜，生成 `schemaVersion:1` / `panels[]` / `texts[]` / `bubbleCandidates[]`。**不是**第三方语义模型，也没有神经网络识别。
- `js/ai/manga-bubble-detector.js`：本轮自编写的四邻域连通域扫描，仅在封闭、近白色区域与 OCR 行对应时生成 `enclosed-light-region` 候选；并非语义模型，既不自动去字也不声称识别气泡尾巴。
- `js/ai/manga-edit-planner.js` 与 `js/ai/manga-edit-planner-ui.js`：确定性编辑指令分流、预览、人工确认；人物编辑必须重新框选，不会自动调用 GPT 付费接口。
- `js/ai/manga-page-structure-ui.js`：画布候选框、日漫/普通阅读顺序、人工修订、GPT 整格选区、JSON 导出；用户掌握编辑确认。
- `js/ai/manga-bubble-detector.js`：原创的**封闭近白色连通区域候选检测**，要求区域不接触画布边界且覆盖 OCR 文字；仅标记 `source: enclosed-light-region`、`verified: false`，不识别气泡尾巴或说话人物。借鉴 Comic Translator 与 BallonsTranslator 将候选检测与 OCR 分离的架构，**没有移植权重、训练代码或具体检测函数**。
- `scripts/manga-bubble-detector-test.cjs`：合成封闭/开口气泡、多气泡与空白页负测；不代表真实漫画素材召回率。

- `js/ai/manga-smart-text-editor.js`：OCR 行与分镜关联；文字图层仍使用原生 Fabric，未使用第三方 GUI。
- `js/ai/gpt-region-editor.js`：新增 `selectRegionForPanel(box)`，只预填整个分镜选区，**不自动调用收费 API**。
- `scripts/manga-page-structure-test.cjs`：合成漫画布局的确定性单测。真实模型的检测精度仍待漫画样本验收。
- `js/ai/manga-character-bible-core.js`：角色卡 JSON schema V1、白名单 data-URL、安全上限和参考图文字约束。
- `js/ai/manga-character-bible-ui.js`：本地 IndexedDB、图片缩小压缩、导入导出与 GPT 按钮；不调用第三方角色识别接口。
- `scripts/manga-character-bible-test.cjs`：角色资料完整性、超量与恶意 URL 拦截的离线单测。
- `js/ai/manga-edit-planner.js`：原创的序号解析器，将“第几格 + 修改描述”归为整格、人物手动框选或本地字幕路径；没有复制 AI Manga Factory Director 的代码。
- `js/ai/manga-edit-planner-ui.js`：先显示目标和风险，再由用户点击确认后打开已有编辑工具；最终 GPT 费用仍需在原面板人工确认。


## 明确的边界与未来借鉴

1. **气泡候选 != 语义气泡检测**。V1 `bubbleCandidates` 可以来自封闭浅色连通域，也可来自 OCR 文字框扩大区域，`source='ocr-text-expansion'` 且 `verified=false`；真正的闭合气泡轮廓/尾巴必须由专门检测器提取。参考 Comic Translator 的分段检测思路，后续可用可选的 RT-DETR 等 `BubbleDetectorAdapter` 替代启发式方法。
2. **分镜留白 != 完整漫画理解**。无边框、斜切、多重叠分镜可能识别错误，保留人工修订机制与整页回退，不默默生成错误的语义信息。
3. **去字**：保留 Tesseract + 纯色遮盖的低成本路径；真正复杂场景再加离线 LaMa ONNX 或 GPT Image 局部去字，依赖必须做明确隔离。
4. **人物一致性**：以后才开发 Character Bible / SAM 角色区域检测；不能把现阶段 OCR 分镜识别叫作人物理解。
5. **分发前许可证与依赖审计**：如果未来加入第三方源码/模型，台账增加准确 commit、文件路径、权重、许可证及替代方案。不能因为处于开发期就在发布时遗漏来源或违反使用条件。

本台账是工程事实记录，未移植的上游功能不视为已实现。
