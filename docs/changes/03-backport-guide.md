# 详细修改文档（Backport 施工单）

用途：把本次「导出分辨率 / 导出格式 / 文本聚焦」三个特性移植到更早的分支（含 fork 起点 `3f63362`）。
基线参照：本仓库当前 `HEAD`。移植前请先 `git fetch` 并核对目标分支的锚点上下文，行号仅作定位参考。

## 0. 移植总览

| 顺序 | 文件 | 动作 | 依赖 |
| --- | --- | --- | --- |
| 1 | `js/core/util/png-bit-depth.js` | **整文件新增**（后端纯函数） | 无 |
| 2 | `js/core/util/fabric-text-focus.js` | **整文件新增** | fabric 已加载 |
| 3 | `js/core/manga-page-size.js` | 追加计算函数 + 扩展导出对象 | 无 |
| 4 | `js/core/util/image-util.js` | 追加常量/函数 + 改造导出编排 | 1、3 |
| 4b | `js/core/compression/project-compression.js` | 预览调用改 `await` + q0.8（见 §12） | 4 |
| 5 | `js/canvas-manager.js` | 追加 UI 同步函数 + 接线 | 3、4 |
| 6 | `js/project-management.js` | schema 默认值 + 加载/保存钩子 | 3 |
| 7 | `index.html` | 菜单 DOM + script 标签 + 版本号 | 1、2 |
| 8 | `css/layout.css` | 新增菜单行样式 | 7 |
| 9 | `js/ui/third/base-translation/base-*.js` | 8 语言文案键 | 7 |
| 10 | `scripts/*`、`package.json` | 测试与 npm 脚本（可选，建议随特性一起移植） | 全部 |

**移植注意**：目标分支若没有 `llm_doc/`，请忽略本次提交中 `llm_doc/**` 的改动（那是索引生成器产物，非功能必需）。

---

## 1. `js/core/util/png-bit-depth.js`（新增文件，约 583 行）

- 动作：把当前 `HEAD` 的该文件 **整文件复制** 到目标分支同路径。
- 导出：`window.NaiPngBitDepth = { MODES, DEFAULT_MODE, normalizeMode, resolveExportMode, describeMode, encodePngBytes, encodePngDataUrl, __internals }`。
- 依赖：浏览器需 `DecompressionStream`/`CompressionStream`；Node（测试）下回退 `require('zlib')`。
- 用途：真正重写 PNG 的 IHDR/IDAT，实现灰度 / 24位 RGB / 32位 ARGB。
- 无需改目标分支其它文件，但 `index.html` 必须新增它的 `<script>`（见第 7 节）。

## 2. `js/core/util/fabric-text-focus.js`（新增文件，约 74 行）

- 动作：整文件复制。
- 导出：`window.NaiFabricTextFocus = { install, patchedFlag }`。
- 用途：包装 `IText/Textbox/Text.prototype.initHiddenTextarea`，强制 `preventScroll`。
- 关键点：`patchTextPrototype` 用 `hasOwnProperty('initHiddenTextarea')` 判断，避免对继承者二次包装；**不修改坐标计算**以保 IME 位置。
- 加载顺序要求：必须在 fabric 之后、且 **非 defer**（当前 `index.html:2593` 即无 `defer`），否则补丁安装时 fabric 尚未就绪。

## 3. `js/core/manga-page-size.js`（在既有 IIFE 内追加）

基线仅有 `DPI/MAX_EDGE/MIN_EDGE`、`mmToPx/clampEdge/resolveMangaPageSize/defaultMangaPageSize/label`，导出对象在基线第 `49` 行结束。移植时：

1. 在导出对象 **之前** 追加以下符号（当前 `HEAD` 行号供对照拷贝）：
   - `npm` 常量：`PAGE_MM`(10)、`EXPORT_DPI_MIN/MAX/DEFAULT`(15-17)、`EXPORT_MAX_EDGE/PIXELS`(123-124)。
   - 函数：`isLandscapeSize`、`pageMillimeters`、`pageMillimetersForSize`、`resolveExportDpi`(71)、`normalizeExportDpi`(83)、`pixelsForDpi`(93)、`dpiForPixelAxis`(102)、`multiplierForLongEdge`(127)、`exportMaxLongEdge`(137)、`planExportPage`(155)、`exportLongEdgeForDpi`(195)、`resolveDpiForPixelEdge`(201)。
2. 扩展尾部导出对象（`HEAD:229` 起）加入以上所有键。
3. 注意基线注释/编码为 **UTF-8**，避免编辑器改写字符集。

- 用途：DPI→倍率→输出像素的**唯一口径**；DPI↔像素反解；导出上限求解。

## 4. `js/core/util/image-util.js`（核心编排改造）

### 4.1 文件头常量（插在 `var ImageUtil={` 之前）
- 新增：`EXPORT_MAX_EDGE/EXPORT_MAX_PIXELS`(5-6)、`EXPORT_FORMATS`(7)、`EXPORT_BIT_DEPTHS/DEFAULT`(8-9)、`EXPORT_QUALITY_MIN/MAX/DEFAULT`(10-12)、`EXPORT_ESTIMATE_*`(13-18)。

### 4.2 新增函数（追加到对象内，紧邻既有导出函数）
- `resolveExportFormat`(383)、`resolveExportMultiplierForDpi`(392)、`resolveExportBitDepth`(412)、`resolveExportBackground`(424)、`encodeExportPng`(453)、`normalizeExportQuality`(463)、`resolveExportMultiplier`(475)、`exportDataUrlByteLength`(492)、`formatByteSize`(505)、`estimateExportSize`(515)、`exportCanvasDataURL`(583)、`notifyExportLimitReached`(593)、`getExportBitDepthForFormat`(601)、`getExportBackgroundColor`(608)、`buildDownloadLink`(632)。

### 4.3 改造既有函数（基线对照）
| 基线函数 | 基线行 | 改造 |
| --- | --- | --- |
| `canvas2DataURL` | 362 | 改为转发 `ImageUtil.exportCanvasDataURL(multiplier,format)` |
| `getCropAndDownloadLinkByMultiplier` | 366 | 加 `quality,bitDepthOverride` 形参；经 `exportCanvasDataURL`；非 `argb` 的 PNG 走 `encodeExportPng`；抽出 `buildDownloadLink`；**改为返回 `Promise<HTMLAnchorElement>`** |
| `getCropAndDownloadLink` | 385 | 加 `forcedFormat` 形参；倍率改为 `resolveExportMultiplierForDpi(outputDpi, canvas.width, canvas.height)`（取代 A5 硬编码） |
| `clipCopy` | 403 | 改为 Promise 链；固定 `'png'` + `'argb'`，经 `getCropAndDownloadLinkByMultiplier` |
| `cropAndDownload` | 431 | 改为 `.then(link=>link.click()).catch(...)`，成功后再 `notifyExportLimitReached()` |

### 4.4 尾部全局导出别名（基线 543 起）
- 追加：`resolveExportFormat`、`normalizeExportQuality`、`resolveExportMultiplier`、`resolveExportMultiplierForDpi`、`resolveExportBitDepth`、`resolveExportBackground`、`encodeExportPng`、`exportDataUrlByteLength`、`formatByteSize`、`estimateExportSize`、`exportCanvasDataURL`。

- **破坏性变更**：`getCropAndDownloadLink*` 由同步返回 `<a>` 变为返回 Promise。目标分支若有其它调用方（基线中为 `js/core/compression/project-compression.js:41`、`js/shortcut.js:202`、`js/core/util/share-util.js:10`），需一并适配（`project-compression` 需 `await`）。

## 5. `js/canvas-manager.js`（UI 同步与接线）

### 5.1 新增函数（追加到文件内，与既有函数并列）
`bindExportBackgroundButton`(206)、`formatExportColorHex`(220)、`syncExportBackgroundLabel`(227)、`syncExportBitDepthState`(238)、`currentExportDpi`(267)、`exportDpiFallback`(278)、`normalizeExportDpiInput`(284)、`setExportDpi`(290)、`currentCanvasSizeForPreview`(304)、`exportPlanForOrientation`(317)、`updateExportPagePlanDisplay`(329)、`syncExportDpiField`(349)、`syncExportPagePlan`(366)、`commitExportPixelEdge`(382)、`notifyExportPixelRange`(418)、`notifyExportDpiRange`(429)、`commitExportDpi`(441)、`bindExportPagePlanEvents`(463)、`syncExportQualityAvailability`(519)、`renderExportSizeEstimate`(540)、`scheduleExportSizeEstimate`(610)、`syncExportSizeEstimate`(618)。
以及模块级状态：`exportPagePlanSyncing`、`exportPixelEditing`、`exportDpiEditing`、`lastValidExportDpi`(256-263)、`exportEstimateTimer/Running/Pending`(536-538)。

### 5.2 接线点（编辑既有代码）
- `resizeCanvasByNum` 内 `fitCanvasViewToContainer(true);` 之后 → `syncExportPagePlan(); scheduleExportSizeEstimate();`（基线 `36` → HEAD `183-184`）。
- `resizeCanvas` 内同理（基线 `100` → HEAD `141-142`）。
- `resizeCanvasToObject`（forcedAdjustCanvasSize 收尾）同理（基线 `178` → HEAD `183-184`）。
- DOMContentLoaded 钩子（基线 `181-189`）内追加：`bindExportBackgroundButton(); syncExportBackgroundLabel(); syncExportBitDepthState(); syncExportQualityAvailability(); syncExportPagePlan(); syncExportSizeEstimate();`。
- `bg-color` 的 `input` 监听回调内追加 `syncExportBackgroundLabel();`。

## 6. `js/project-management.js`

- schema（基线 `193`）：`canvasDpi.default` 由 `'450'` 改 `'300'`；新增 `outputImageFormat`(png)、`outputBitDepth`(argb)、`outputImageQuality`(0.92)。
- 新增 `syncExportPlanAfterSettingsLoad`(399)，并在 `loadSettingsLocalStrage` 的两个返回路径（基线 `405` 附近、`519` 附近）各调用一次。
- 新增 `sanitizeSettingsValueForStorage`(538)；`saveSettingsLocalStrage`(基线 `522`) 中改为 `data[key]=sanitizeSettingsValueForStorage(cfg,el,previous?previous[key]:undefined)`，并在循环前读取 `previous`。

## 7. `index.html`

- 画布下拉菜单（基线 `navbarDropdownCanvas` 的 `<ul>`，约 `424`）：整段替换为 `HEAD:426-500` 的内容，新增：
  - 背景行 `bgColorButton/bgColorValue/bgColorSwatch` + `canvasBGAlphaNote` 备注；
  - `outputDpi` 增加 `max="1800"`、`step="0.01"`；
  - 竖图/横图像素行 `exportPxPortraitWidth/Height`、`exportPxLandscapeWidth/Height` + `exportPxCappedNote`；
  - `导出` 分组标签；
  - `outputImageFormat`、`outputBitDepth` + `outputBitDepthHint`、`outputImageQuality`；
  - `outputImageEstimateRow/outputImageEstimate`。
- script 标签：新增 `js/core/util/png-bit-depth.js?v=1.0" defer`（`HEAD:2554`，紧随 `manga-page-size.js`）；新增 `js/core/util/fabric-text-focus.js?v=1.0"`（`HEAD:2593`，**无 defer**，紧随 `fabric-util.js`）。
- 版本号抬升：`manga-page-size.js` → `v=1.2`、`image-util.js` → `v=7.7`、`canvas-manager.js` → `v=8.6`、`project-management.js` → `v=8.18`（缓存失效用）。
- 依赖顺序不变式：`manga-page-size` → `png-bit-depth` 先于 `image-util` 与 `canvas-manager`。

## 8. `css/layout.css`

- 在文件末尾附近追加 `HEAD:423-497` 的规则：`.nai-bg-item input.jscolor-color-picker`、`.nai-bg-button(:hover)`、`.nai-bg-value`、`.nai-bg-swatch`、`.nai-bg-note`、`.nai-px-note`、`.nai-px-times` 等。
- 用途：把背景输入本体（1px 不可见）视觉上隐藏，改为点击整行按钮唤起 jscolor；像素行与备注排版。

## 9. 语言文件（`js/ui/third/base-translation/base-*.js`）

- 8 个文件（zh/en/ja/ko/fr/ru/es/de）各追加 13 个键：
  `outputImageFormat`、`outputBitDepth`、`bitDepthRgb`、`bitDepthArgb`、`bitDepthGray`、`outputBitDepthHint`、`outputImageQuality`、`outputImageEstimate`、`canvasExport`、`canvasBGAlphaNote`、`outputPortraitPx`、`outputLandscapePx`、`outputPxCappedNote`。
- 参考位置：`base-zh.js:484-494`、`base-en.js:478-488`。

## 10. 测试与脚本（可选但建议）

- 新增：`scripts/image-export-smoke-test.cjs`、`scripts/image-export-integration-test.cjs`、`scripts/png-bit-depth-smoke-test.cjs`、`scripts/fabric-text-focus-smoke-test.cjs`，并更新 `scripts/manga-page-size-smoke-test.cjs`。
- `package.json` 追加别名：`test:image-export`、`test:image-export-integration`、`test:png-bit-depth`、`test:fabric-text-focus`、`test:page-size`。
- 移植后验证（应在目标分支全部通过）：
  `npm run test:image-export && npm run test:image-export-integration && npm run test:png-bit-depth && npm run test:fabric-text-focus && npm run test:page-size`。

## 11. 容易踩错的点

1. **Promise 化**：忘记 `await`/`.then` 处理 `getCropAndDownloadLink*`，会导致 `link.click()` 报错。
2. **脚本顺序**：`png-bit-depth.js` 必须是 `defer` 且早于 `image-util.js`；`fabric-text-focus.js` 必须无 `defer`。
3. **默认位深度**：上游整合采用 `argb` 作为默认值以保留透明度；若目标分支故意使用 `rgb`，应明确接受 PNG 透明度会被压平到背景色。
4. **常量一致性**：`EXPORT_MAX_EDGE/PIXELS` 需要在 `manga-page-size.js` 与 `image-util.js` 保持同值。
5. **缓存版本号**：不改 `?v=` 会造成浏览器沿用旧脚本。
---

## 12. `js/core/compression/project-compression.js`（配套修改）

- 基线第 `41` 行：`var previewLink=getCropAndDownloadLinkByMultiplier(1,'jpeg');`。
- 改为：`var previewLink=await getCropAndDownloadLinkByMultiplier(1,'jpeg',0.8);`（外层函数已是 `async`）。
- 原因：第 4 节已把 `getCropAndDownloadLinkByMultiplier` 改为返回 `Promise`，此处必须 `await`；同时把工程预览缩略图从隐式无损改为 **JPEG q0.8**，减小 `.lz4` 体积。
- 漏改后果：`previewLink` 变成 Promise，`previewLink.href` 为 `undefined`，保存工程会写入损坏预览。
