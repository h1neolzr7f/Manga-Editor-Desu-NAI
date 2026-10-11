# 审查文档：逻辑框架与设计风险

用途：供 review / 后续维护者理解本次 5 个提交的**逻辑骨架**，并列出已知设计风险与建议。
范围：`3f63362`（fork 起点）→ `2b6558c`。

## 1. 模块与职责

| 文件 | 角色 |
| --- | --- |
| `js/core/manga-page-size.js` | 纯计算层（无 DOM）。A4 预设 mm、DPI 规范化、`planExportPage` 唯一口径、像素↔DPI 反解、导出上限求解。 |
| `js/core/util/image-util.js` | 导出编排层。格式/品质/位深度规范化、倍率兜底、实际写盘、下载链接、剪贴板、体积估算。 |
| `js/core/util/png-bit-depth.js` | PNG 重编码器（纯字节处理）。IHDR/IDAT 解析、inflate/deflate、反过滤/再过滤、RGBA→RGB/灰度合成。 |
| `js/core/util/fabric-text-focus.js` | 对第三方 fabric 的最小补丁（focus 防滚动）。 |
| `js/canvas-manager.js` | 画布菜单 UI 绑定与状态同步（DPI/像素/格式/位深度/品质/预估）。 |
| `js/project-management.js` | 设置持久化（schema 默认值、加载后补同步、保存前校验）。 |
| `css/layout.css` | 新增菜单行的视觉（背景行、像素行、备注）。 |
| `js/ui/third/base-translation/base-*.js` | 8 语言文案（zh/en/ja/ko/fr/ru/es/de）。 |

## 2. 数据流（唯一口径）

```
                       ┌──────────────────────────────┐
   #outputDpi ─────────►  NaiMangaPageSize.planExportPage(dpi, W, H)
   (菜单/像素行/设置)      │   ├─ pageMillimetersForSize  → A4 mm
                       │   ├─ exportMaxLongEdge        → 上限内最大长边
                       │   └─ multiplierForLongEdge    → 倍率(区间中点)
                       └───────────────┬──────────────┘
                                       ▼
                    multiplier  ──►  ImageUtil.exportCanvasDataURL(multiplier, fmt, q)
                                       │   ├─ resolveExportMultiplier  (40MP/8192 兜底)
                                       │   ├─ lastExportWasCapped 标记
                                       │   └─ canvas.toDataURL
                                       ▼
                          getCropAndDownloadLinkByMultiplier
                                       │   ├─ PNG 且非 argb → encodeExportPng (重写位深度)
                                       │   └─ 其它 → buildDownloadLink
                                       ▼
                              <a download>.click()

   预览侧复用同一 planExportPage：竖图/横图像素行、预计导出大小尺寸、
   DPI↔像素反解（resolveDpiForPixelEdge 二分）——保证「所见即所得」。
```

**关键不变量**：预览像素行、预估尺寸、实际导出，三者都来自 `planExportPage`，因此数值一致。这是本次修复的核心设计意图，backport 时必须保留。

## 3. 各功能点逻辑

### 3.1 分辨率与上限
- `exportMaxLongEdge(baseLong, baseShort)`：由 `ratio=短/长` 求 `limit=min(8192, ceil(sqrt(40e6/ratio)))`，再逐像素回退到同时满足长边≤8192 且 长×短≤40MP 的候选。
- `planExportPage`：`idealLong=round(longMm/25.4*dpi)`，`targetLong=min(idealLong, capLong)`，倍率取中点；末尾再加 `guard` 循环（最多 8 次）按 `1-1/baseLong` 收敛，确保 floor 后仍不越界。
- `image-util.resolveExportMultiplier`：独立兜底（直接按目标像素算 shrink），避免调用方绕过 `planExportPage`。

### 3.2 DPI 输入的"两分法"
- `normalizeExportDpi`：**空/负/非数 → `null`**（视为"打错"，由 canvas-manager 回退到 `lastValidExportDpi`）；**范围外正数 → 夹到 96/1800**（视为"指定错"，保留语义）。
- 这是本次修复"DPI 不再莫名跳回 300"的关键：区分了"无意义输入"与"越界输入"。

### 3.3 位深度
- `getExportBitDepthForFormat`：仅 PNG 返回菜单值；jpeg/webp 返回 `null` → 跳过重编码。
- `argb` 时 `convertPixels` 直接原样返回（零拷贝）；`rgb`/`gray` 时按 alpha 与 `getExportBackgroundColor()` 合成到画布背景，并丢弃 alpha 通道。
- `png-bit-depth.js` 只支持 8bit 的 colorType 0/2/4/6；inflate/deflate 优先 `DecompressionStream`/`CompressionStream`，Node 下回退 `zlib`。

### 3.4 文本聚焦
- 只包装 `initHiddenTextarea`，不触碰 `_calcTextareaPosition`/`calcOffset`，故 IME 位置不变。
- `patchTextPrototype` 用 `hasOwnProperty('initHiddenTextarea')` 判断，避免对继承者（Textbox→IText）二次包装。
- 补丁对 `Text` 记录为 `patched=true`，但当前存量 `Text.prototype` 无自有 `initHiddenTextarea`（惰性创建），故实际不生效；无害但冗余。

### 3.5 持久化
- 新增 schema：`outputImageFormat`(png)、`outputBitDepth`(argb)、`outputImageQuality`(0.92)；`canvasDpi` 默认由 450 改 300。
- `sanitizeSettingsValueForStorage`：保存前对 `outputDpi` 校验，非法值时沿用上一次合法保存值（否则 schema 默认）。
- `syncExportPlanAfterSettingsLoad`：设置加载完成后补跑一次预览/预估同步（修复启动初期显示不刷新）。

## 4. 设计风险清单

### [P1] 默认 PNG 导出丢透明度 —— 上游整合已修复
- 上游整合分支已把 `project-management.js`、`index.html`、`png-bit-depth.js` 与 `image-util.js` 的默认位深度统一改为 `argb`。
- 结果：默认 PNG 路径保留 alpha，不再把透明素材意外压平到背景色；24 位 RGB / 灰度仍作为显式用户选项保留。
- 仍需注意：用户主动选择 `rgb` / `gray` 时会触发全分辨率 PNG 重编码，这是功能本身的成本，不属于默认路径回归。

### [P2] 上限常量与算法重复 —— 已修复
- 原位置：`js/core/util/image-util.js:5-6` 与 `js/core/manga-page-size.js:123-124` 各定义一份 `EXPORT_MAX_EDGE/EXPORT_MAX_PIXELS`。
- 修复：`image-util.js` 改为从 `NaiMangaPageSize` 读取（未加载时退避同值默认），`manga-page-size.js` 成为**唯一来源**。
- 现状：代码中只剩 `manga-page-size.js:123-124` 一处字面量；`image-util.js:6-11` 为引用。`resolveExportMultiplier`(兜底) 与 `planExportPage`(口径) 仍是两套实现，但已共用同一常量来源。
- 回归保护：`scripts/image-export-smoke-test.cjs` 新增用例，把来源常量替换为 1024/1MP 后验证 `resolveExportMultiplier` 跟随变化。

### [P3] 小面积重复 —— 已修复（记录保留）
本项整体风险很低：均为"同一逻辑写了两遍"，不影响行为。

1. **`restoreGrid` 完全重复**
   - `js/core/util/image-util.js:674`（`clipCopy` 内）与 `js/core/util/image-util.js:709`（`cropAndDownload` 内）各自定义了一份**逐字符相同**的 `restoreGrid()`：`if(isGridVisible){drawGrid();isGridVisible=true;}`。
   - 背景：导出前需 `removeGrid()`，导出后要把网格恢复，两处都复制了这段收尾逻辑。
   - **修复**：抽成模块级 `restoreGridAfterExport()`（`image-util.js:25-31`），`clipCopy` 与 `cropAndDownload` 均改为调用它；两处局部定义已删除。

2. **十六进制转换重复**
   - `js/canvas-manager.js:220 formatExportColorHex()` 用 `typeof rgbToHex==='function'` 去调用 `js/core/util/image-util.js:775 rgbToHex()`，只多做了一次 `toUpperCase()`；而 `rgbToHex` 已通过 `image-util.js:849` 的别名全局可用。
   - **修复**：删除包装函数，`syncExportBackgroundLabel()` 直接调用 `rgbToHex(...).toUpperCase()`（本项属 [P3.3] 第 3 条）。

3. **`png-bit-depth.js` 与其它模块的字节/base64 工具重复**
   - `js/core/util/png-bit-depth.js` 内部定义了 `toUint8`(57)、`concatBytes`(65)、`base64Lookup`(78)、`bytesToBase64`(88)、`base64ToBytes`(105)；同仓库已有 `js/core/util/array-buffer-utils.js` 等通用字节工具。
   - 现状是"该文件自成一体"（为保持纯函数、可独立在 Node 里跑测试），**属于可接受的设计**，不建议为此强行合并，仅记录。

4. **命名不完全准确（非缺陷）**
   - **修复**：`manga-page-size.js:122-124` 的注释已更新为"这里是唯一定义处（image-util.js 会引用此值）"。

5. **`image-util.js` 尾部 38 个别名中，11 个在 `image-util.js` 之外零引用**（仅定义未使用）：
   `fabricImage2ImageData`(814)、`canvas2DataURL`(827)、`normalizeExportQuality`(829)、`resolveExportBitDepth`(832)、`resolveExportBackground`(833)、`encodeExportPng`(834)、`exportDataUrlByteLength`(835)、`exportCanvasDataURL`(838)、`getCropAndDownloadLink`(840)、`getObjLeft`(844)、`getObjTop`(845)。
   - 结论：这些别名是 `image-util.js` 的**既有约定**（基线 `3f63362` 已有 27 个"镜像全部 API"的全局别名，本次新增的 11 个沿用了同一模式），属有意暴露的全局 API，**不作为缺陷处理、保留不动**。
   - 其中 `getCropAndDownloadLink` 虽无外部引用，但改动它涉及第 4 节的 Promise 契约，清理时需连同 `project-compression.js` 一起看。

### [P4] 启动期多次重算与重复注册 —— 已修复（记录保留）
功能正确，但存在冗余执行与**重复事件注册**：

1. **`canvas.on` 监听重复注册（真实缺陷面，已实证）**
   - `js/canvas-manager.js:618 syncExportSizeEstimate()` 每次被调用都会执行 `canvas.on('object:added'|'object:modified'|'object:removed', ...)`（`:629-633`），该处**没有**像 DOM 元素那样用 `dataset.estimateBound` 去重。
   - 隔离验证（vm 内直接调用该函数，统计 `canvas.on` 次数）：
     ```
     1x: {"object:added":1,"object:modified":1,"object:removed":1}
     2x: {"object:added":2,"object:modified":2,"object:removed":2}
     3x: {"object:added":3,"object:modified":3,"object:removed":3}
     ```
     确认监听器随调用次数**线性累积**。
   - 实际调用点：`:200 syncExportQualityAvailability()` 的 `update()` 内会调 `:529 syncExportSizeEstimate()`，随后 `:202` 又直接调一次 —— **仅启动就会挂 2 组**；此后每次 `#outputImageFormat` 的 `change` 又新增一组。`project-management.js:401` 走的是 `scheduleExportSizeEstimate(0)`（排程），不额外注册。
   - 影响：每次对象增删改会触发 N 次 `scheduleExportSizeEstimate()`。因 `scheduleExportSizeEstimate` 有 350ms 防抖（`:610-616`），最终**只跑一次估算**，故用户可见影响很小；但监听器泄漏属真实缺陷面，长时间编辑会话会持续累积。
   - 对比：同一函数内的 DOM 元素绑定（`:622-628`）用 `dataset.estimateBound` 正确去重；`bindExportPagePlanEvents()`(`:463`) 用 `dataset.planBound` 正确去重。**唯独 canvas 监听缺守卫**。
   - **修复**：新增模块级 `exportEstimateCanvasBound`（`canvas-manager.js:536`），`canvas.on` 段改为 `if(!exportEstimateCanvasBound&&...)`（`:627-633`）。隔离验证：调用 1/2/3 次后 `canvas.on` 计数恒为 1/1/1。
   - 回归断言：`scripts/image-export-smoke-test.cjs` 校验 `exportEstimateCanvasBound` 存在且绑定处有守卫。

2. **启动期多次重算**
   - `canvas-manager.js` 的 DOMContentLoaded 依次调用 `syncExportPagePlan()`(201) 与 `syncExportSizeEstimate()`(202)；`syncExportSizeEstimate` 内又调用 `bindExportPagePlanEvents()`(619)。叠加 `resizeCanvasByNum/resizeCanvas/resizeCanvasToObject` 各自的 `syncExportPagePlan()+scheduleExportSizeEstimate()`(101-102、141-142、183-184)，以及 `project-management.js:399 syncExportPlanAfterSettingsLoad()`（再触发一次），启动阶段存在多次规划/估算排程。
   - 由于 `scheduleExportSizeEstimate` 有防抖，**实际开销有限**；但 `bindExportPagePlanEvents`/`canvas.on` 的重复副作用是上一条。
   - 建议：与第 1 条一并加守卫；规划同步本身较廉价，可保留。

3. **`syncExportPagePlan` 已有重入保护**
   - `:366 syncExportPagePlan()` 用 `exportPagePlanSyncing` 标志防重入（`:368-369`），这部分设计是好的，不需要改。

## 5. 结论

核心修复方向正确、不变量清晰、四个相关测试与集成测试均通过。**唯 [P1] 建议在合并/backport 前定稿**（默认是否丢透明度），其余为一致性/可维护性优化，可与功能解耦处理。