# Character Bible V1 · 漫画角色参考资料库

**开发分支**：`feat/manga-character-bible-v1`（Draft PR #9，基于 PR #8；未合并 main）。

## 已实现

1. 在 Manga-NAI 画布顶部点击 **角色档案**。
2. 填写名字、发色/瞳色/服装/标志性饰品等外观锚点以及可选备注。
3. 选 1–3 张 PNG/JPEG/WebP 参考图；在本地自动缩放最长边至 1024px、转为 JPEG 并检查大小后保存到 **IndexedDB**。角色最多 24 个，单图输入限 8MB、解码像素限 2500 万，压缩后 data URL 不超过 3.6MB。
4. 角色在同一网站来源（localhost 本机编辑器）不同页面和标签页之间共享。用户点击 **用于 GPT 改图**，将这张角色卡的参考图与文字外观锚点直接送到现有 GPT 面板。再次换角色会替换旧参考图，不会积累上一角色的图像和同一套提示词。
5. 使用 GPT 时仍需手动框选目标人物、确认生成结果和费用；载入角色卡本身不调用网络 AI，也不消费额度。生成仍保留当前局部改图、边缘羽化和 Fabric 图层流程。
6. 支持手动导出 `manga-character-bible.json`（包含压缩参考图片），并可在同源工具恢复/增量导入；相同 ID 会跳过。JSON **不包含** GPT Key、NovelAI Token 或其它凭据。该文件本身包含角色图片，应由用户自己妥善保管。

## 工程位置与借鉴来源

| 部件 | 代码位置 | 参考关系 |
|---|---|---|
| 角色卡 schema、引用数量上限、Prompt 锚点组合 | `js/ai/manga-character-bible-core.js` | 用户自有 NovelAI Harness 的多角色锚点 / 人设资料概念；新实现，未复制 Flutter 代码 |
| 本地参考图片管理和持久化 | `js/ai/manga-character-bible-ui.js` | 专业漫画编辑器的角色素材库工作流，原生浏览器 IndexedDB 与 Canvas API 新实现 |
| 连接 GPT 改图 | `js/ai/gpt-region-editor.js` | 复用本仓已实现的 GPT Image 多参考图接口，图像仅在用户点击生成后发送 |
| 字幕/分镜/角色三类编辑计划 | `js/ai/manga-edit-planner.js` | 参考 AI Manga Factory 的“先计划、再确认、最后执行”产品逻辑 |
| 来源索引 | `docs/UPSTREAM_BORROWING_LEDGER.md` | 记录每一个借鉴来源、具体模块和是否使用第三方源代码 |

## 严格限制

- Character Bible **不是** Character Segmenter；**还不能**凭一句话自动定位“第二格左边女孩”的像素轮廓。
- 多参考图 + 外观描述能帮助模型更好理解同一角色，但**不能保证**模型的脸/服装在每一格严格一致。以后可加角色人脸身份表征、人物掩模和跨格对比；只有真实漫画样本验证后才能宣称效果。
- 保存到 IndexedDB 是 **浏览器来源级**持久化。使用不同端口、浏览器、隐私模式、清理网站数据或更换电脑，会看不到以前的角色卡；跨设备需要用户手动导入 JSON。它不是云同步，也没有直接写入 .nai 工程格式。
- 参考图包含人物信息。JSON 导出和主动点击“生成预览”之前都在本机；点击 GPT 时，会把参考图和选择的画布区域发往用户配置的图像服务。与第三方模型的隐私与版权责任仍需用户自行考虑。
- 当前只支持**人工录入**角色身份、参考图和锚点，没有自动人像/眼睛/服装标签提取、SAM 分割或跨分镜自动关联。
- **Windows 原生 GUI、真实图像模型输出一致性、长漫画大数据集**均尚未验收。保留 Draft PR，不能用 Chromium mock 代替实机或真实 API 结果。

## 验证

```bash
npm run test:character-bible
npm run test:gpt-browser
npm run test:gpt-region
npm run test:gpt-i18n
```

Playwright 浏览器验收：创建真实 PNG 参考文件、模拟用户上传与压缩、保存到 IndexedDB、再次进入 GPT 面板、更换/重复选卡不累积重复约束、同源新标签页读取角色卡、模型模拟请求为零。所有对外 AI 调用只使用现有的可确认按钮，不在自动测试中付费。
