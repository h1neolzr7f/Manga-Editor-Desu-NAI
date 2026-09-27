# 改动简述：导出分辨率 / 导出格式 / 文本聚焦漂移

面向 PR 描述的汇总文档。范围：fork 起点 `3f63362` 之后的 5 个提交。

## 提交清单

| 提交 | 说明 |
| --- | --- |
| `b38f896` | fix(export): bound image export size and add compressed formats |
| `8b930a8` | 导出缩放修复 未测试 |
| `6f9da34` | fix(export): keep last valid DPI and add a project structure index |
| `64c1897` | 修复文本选中时的聚焦偏移问题 |
| `2b6558c` | docs: document the local backend and offline Service Worker behavior |

## 一、导出分辨率（尺寸/像素）

**问题**：导出只走一条路径 `canvas.toDataURL({format:'png', multiplier:max(targetW/canvasW, targetH/canvasH)})`，尺寸按 **A5**（148×210mm）换算，而画布是 **A4** 预设，二者在每个 DPI 上都不一致；且没有任何像素上限，DLE 拉高后输出像素呈平方增长，极端值直接产出空下载。另外 UI 存的默认 DPI 是 `450`，菜单显示却是 `300`。

**修复**：

- 新增 `js/core/manga-page-size.js` 的 A4 页预设计算：`planExportPage()` 统一"DPI → 倍率 → 输出像素"的唯一口径，倍率取区间中点（`multiplierForLongEdge`），保证写出的长边像素**精确等于**预览值。
- 导出上限：长边 `8192px`、总量 `40MP`（`exportMaxLongEdge` 求上限内的最大长边；`image-util.resolveExportMultiplier` 兜底），触顶时弹一次 toast，不再产出超大/失败文件。
- `#outputDpi` 增加 `max=1800`，存储默认与菜单统一为 `300`。
- 画布菜单新增 **竖图像素 / 横图像素** 预览行，与 DPI 双向换算（`resolveDpiForPixelEdge` 用二分反解）。
- 新增 **预计导出大小**：`estimateExportSize` 在目标分辨率下分块实采样并外推，反映真实字效页的压缩率。

## 二、导出格式与体积

**问题**：唯一可导出格式是 PNG 无损，几 MB 的源图会变成 7–90MB 的成品。

**修复**：

- 画布菜单新增 **导出格式**（PNG / JPEG / WebP）与 **导出品质**；导出路径统一收敛到 `ImageUtil.exportCanvasDataURL`，PNG 保持无损、JPEG/WebP 才带 `quality`。
- 新增 **导出位深度**（灰度 / 24位 RGB / 32位 ARGB，仅 PNG 生效），由 `js/core/util/png-bit-depth.js` 真正重写 PNG 数据（解析 IHDR/IDAT → 解压 → 反过滤 → RGBA 合成到画布背景色 → 再过滤/压缩 → 重写 IHDR），不是只改菜单。
- 非 PNG 时自动禁用位深度选择；PNG 时禁用品质选择。
- 工程预览缩略图由隐式无损改为 **JPEG q0.8**；剪贴板固定 **PNG + 32bit ARGB**。

## 三、文本聚焦漂移

**问题**：点击已处于编辑态、且位于画布右/下边缘外的文本对象时，整个视图被滚动推走，且此后点击坐标偏移。

**原因**：fabric 在 `enterEditing()` 里调用 `this.hiddenTextarea.focus()`；该 1px textarea 以**文档坐标**绝对定位在 `document.body` 下，浏览器为把它带进视口会滚动 `document`，并让 `canvas._offset` 过期。

**修复**：新增 `js/core/util/fabric-text-focus.js`，包装 `IText/Textbox/Text.prototype.initHiddenTextarea`，把 focus 强制为 `preventScroll:true`（并对静默忽略该选项的实现做滚动位置回退）。**不改坐标计算**，因此 IME 候选窗位置不变。

## 验证

以下脚本在本仓库当前状态均通过：

```
node scripts/image-export-smoke-test.cjs        # image export smoke test passed
node scripts/image-export-integration-test.cjs  # image export integration test passed
node scripts/png-bit-depth-smoke-test.cjs       # png bit depth smoke test passed
node scripts/fabric-text-focus-smoke-test.cjs   # fabric text focus smoke test passed
node scripts/manga-page-size-smoke-test.cjs     # manga page size smoke test passed
```

对应的 `npm run` 别名：`test:image-export`、`test:image-export-integration`、`test:png-bit-depth`、`test:fabric-text-focus`、`test:page-size`。

## 已知注意点（详见 02 审查文档）

- 上游整合时已把 PNG 默认位深度从 `rgb` 改为 `argb`，因此默认导出会保留透明度；用户仍可显式选择 24 位 RGB / 灰度来压平透明度。
- 导出上限常量已统一由 `js/core/manga-page-size.js` 提供，`image-util.js` 仅引用该来源并保留单测回退值。