# 评估：导出位深度的「所见即所得」前端联动

范围：**只做可行性评估，不修改代码**（按需求 1）。
结论摘要：**可以做，且能达到与导出文件逐像素一致**；但有两个必须先决策的前提（网格实现方式、默认背景不透明），否则预览会误导用户。

## 1. 需求与现状

- 需求：在 灰度 / 24位 RGB / 32位 ARGB 之间切换时，编辑画面即时反映最终导出效果。
- 现状：位深度**只在导出瞬间**生效，由 `js/core/util/png-bit-depth.js` 编码进 PNG 数据（`encodeExportPng`），编辑画面从不变化。
- 三种模式的真实像素变换（`png-bit-depth.js:412 convertPixels`）：
  - `argb`：原样 RGBA，**零拷贝直接返回**（`convertPixels` 首行）。
  - `rgb`：alpha 与背景色做 source-over 合成后丢弃 alpha。
  - `gray`：在 `rgb` 基础上按 **Rec.601** `luma=round(0.299R+0.587G+0.114B)`（`png-bit-depth.js:12-14,406-408`）。

## 2. 关键事实（先看这里，否则会评估错）

这两点直接决定「联动到底看得到什么」：

**F1｜默认背景是不透明的，所以 argb 与 rgb 常常看不出差别。**
`js/core/settings.js:22` 把 `canvas.backgroundColor` 初始化为 `"gray"`；加载已保存设置时 `js/project-management.js:505-506` 会 `dispatchEvent(input)`，触发 `js/canvas-manager.js:190` 的 `canvas.setBackgroundColor(color, renderAll)`，默认值 `#ffffff`（`project-management.js:197`）。
fabric 的 `_renderBackgroundOrOverlay`（第三方压缩代码内）会**用 `fill()` 把背景色画进 canvas 像素**（`fillStyle=backgroundColor` + `fill()`，非 `globalCompositeOperation` 清空）。因此 `canvas.toDataURL()` 返回的像素大多**已经是 alpha=255**。

推论：
- `argb` vs `rgb` 在常规状态下**预览与导出都相同**（压平是恒等变换）。真正肉眼可见的只有 **gray（灰度）**。
- 只有在**背景被清空/设为带 alpha**、并且画布确实存在透明像素（如去背、橡皮擦、cutout）时，`argb`（保留 alpha）与 `rgb`/`gray`（压平成背景色）才会不同。

**F2｜网格是用「画布背景图」实现的，不是独立图层。**
`drawGrid()` 用 `canvas.setBackgroundImage(gridCanvas.toDataURL(), ...)`（`js/panel/grid.js:75-80`），`removeGrid()` 清空（`:101`）。导出前会 `removeGrid()`，所以**网格不进导出**。
推论：任何作用在整块可视 canvas 上的滤镜都会**连网格一起变换**，而导出里没有网格 → 预览与导出不一致。

## 3. 可行性：做到逐像素一致

Chrome/Edge/Firefox 均支持 SVG 滤镜 `feColorMatrix` / `feComponentTransfer`，可精确表达上述变换：

- `gray`：等价于 `feColorMatrix type="matrix"` 的 Rec.601 行（**不要用 `saturate`，它按 Rec.709**，会和 `luma()` 偏色）。灰度是本次唯一普遍可见的变化，务必用同一组系数与四舍五入。
- `rgb`：`C' = C·a + bg·(1-a)`，输出 `a'=1`。因 F1，默认状态下 `a` 已为 1，此步通常为恒等；仅当画布真透明时才产生压平效果。
- `argb`：清空滤镜，原样。

由于变换是确定的代数运算，屏幕呈现可做到与 `convertPixels` 的输出**完全相等**，而非近似。

## 4. 架构冲突与方案选择

由 F2，整块 canvas 挂滤镜会错误地变换网格。可选：

| 方案 | 做法 | 优点 | 代价 |
| --- | --- | --- | --- |
| **A（推荐）预览遮罩层** | 新增覆盖层，只对**内容层**施滤镜，网格在遮罩之上单独绘制（不经滤镜） | 语义正确、网格无误、可复用 Rec.601 数学 | 新增一层与同步逻辑 |
| **B 整块 canvas 挂滤镜** | `.canvas-container canvas{filter:url(#...)}` | 改动最小 | **网格被一起变换**，与导出不符（F2） |
| **C 按需预览弹窗** | 不常驻，点「位深度/导出」时离屏生成一次真实 PNG 预览 | 与导出**逐字节同源**（可直接复用 `encodeExportPng`），成本最低 | 不是"编辑时实时所见" |

补充实现细节：fabric 会把原始 `<canvas id="mangaImageCanvas">` 替换为 `.canvas-container` 内的 lower/upper canvas（且 `enableRetinaScaling:true`，`settings.js:11`），因此方案 B 的 CSS 选择器要指向容器内实际渲染的 canvas，而不是 `#mangaImageCanvas`。

**建议**：要「实时常驻」选 **A**；只想「能核对」选 **C**（且 C 天然精确，因为它可以复用导出的同一段编码）。

## 5. 性能与触发点

- `argb`：零成本（`convertPixels` 直接返回原像素）。
- `gray`/`rgb`：若用 **CSS 滤镜**（A/B），重绘交给合成器，编辑过程**无逐帧 JS 开销**；只在切换模式、改背景色、画布尺寸变化时更新一次。
- 若用 **像素重算**（C 或 A 的离线变体）：`convertPixels` 是 `O(W×H)`，A4@300dpi（2481×3508）约 **870 万像素**；叠加 `filterScanlines`（`png-bit-depth.js:445`，每行再评 5 种滤波）更重。**不要**挂到常规编辑节拍，只做按需一次性生成。
- 参照：现有 `estimateExportSize`（`image-util.js:515`）已接受"十余次 `toDataURL` 的防抖计算"，但那是 350ms 防抖的估算，不应叠加全画布重算。

触发点清单（若落地）：
1. `#outputBitDepth` 的 `change`（现仅 `syncExportBitDepthState` 切禁用态，`canvas-manager.js:238`）。
2. `#bg-color` 的 `input`（影响压平底色，现为 `syncExportBackgroundLabel`，`:227`）。
3. `#outputImageFormat` 的 `change`：非 PNG 时位深度不生效，预览应回正常显示（现有禁用逻辑已覆盖）。
4. 画布尺寸变化：`resizeCanvasByNum`/`resizeCanvas`/`resizeCanvasToObject`（已有 `syncExportPagePlan()` 调用点）。
5. 网格开关（方案 A 下需保持网格层不被滤镜覆盖）。

## 6. 结论

- **技术可行，且能逐像素一致**：`png-bit-depth.js` 的变换是确定的，可被 CSS 滤镜或离线像素重算精确复现。
- **两个真正的障碍都在"语义"而非"技术"**：
  - F2：网格借画布背景图实现 → 整块加滤镜会错变网格，需方案 A 或 C。
  - F1：默认背景不透明 → `argb` 与 `rgb` 通常无可见差异，联动主要体现为**灰度**；若用户期待"切到 32 位就看到透明"，需要同时把画布背景置为透明才有意义。
- 性能上：实时预览用 CSS 滤镜；核对视图用按需一次性生成；**不要**把全画布 `convertPixels` 放进编辑节拍。

（本评估未改动任何源码；落地前请确认方案 A 还是 C，并确认是否同时调整默认背景透明度。）