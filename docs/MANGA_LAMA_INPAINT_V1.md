# LaMa 局部去字：本地蒙版、预览和可撤销图层（V1）

> 开发分支 `feat/manga-lama-inpainting-v1`，Draft PR #11，依赖 PR #10。当前没有完成 Windows GUI、真实漫画和真实 LaMa 模型实机验收。

## 操作

1. 用现有 Tesseract OCR 或手动框选获得候选字幕框。
2. 点击该条字幕旁的 **本地 LaMa 去字**。
3. 程序对**当前 OCR 文字矩形**周围自动留出上下文，并在本机生成一张白色代表擦除区、黑色代表保留区的 PNG 蒙版。模型只从本机 `/manga-smart/lama-inpaint` 收到图像和蒙版。
4. 本地安装可选 `simple-lama` 的情况下，调用 LaMa 重建文字区域的背景。后端与前端均限制画布范围：**蒙版外始终恢复原始像素**。
5. 显示修复图片预览。只有用户点击 **确认并作为独立图层应用**，才在 Fabric 画布上添加新修复层；不会修改底层原图，支持撤销/重做、图层删除与原有工程保存。
6. 应用后自动取消这一条字幕的「纯色覆盖擦字」开关，避免第二次给 LaMa 修好的图叠加白色遮盖。继续修改该条文字后可以用原生 Fabric Textbox 插入新的文字。

## 安装

在启动 `99_server.py` 所使用的本地 Python 环境中执行：

```bash
python -m pip install simple-lama
```

真正的运行时调用来自 [okaris/simple-lama](https://github.com/okaris/simple-lama) 的公开 Python API：`SimpleLama()(PIL.Image, PIL.Image mask)`；首次可能联网下载模型。未安装时仅提示安装，不改变原图。普通纯色气泡去字仍能不用 LaMa 免费执行。

**注意**：当前使用的是 OCR 文字区域生成的**矩形蒙版**，不是逐像素文字笔画遮罩。即使 LaMa 模型正常运行，也可能移除 OCR 框中的边线、衣服花纹和拟声词。确认预览前绝不应用到漫画。这是后续精确 Text Mask/SAM 分割工作的重点，不可把 V1 宣称为专业笔画级去字。

## 模块与上游来源

| 文件 | 实际职责 | 是否复制上游源码 |
|---|---|---|
| `manga_lama_inpaint.py` | 可选 `simple_lama.SimpleLama()` 惰性初始化，校验尺寸/蒙版覆盖比例，返回局部 PNG，并在服务端恢复蒙版外像素 | 没有复制；运行时通过公开 Python API 调用上游包 |
| `manga_smart_ocr.py` | 在原同源安全验证下注册 `/manga-smart/lama-inpaint` | 本仓已有 HTTP 路由扩展 |
| `js/ai/manga-lama-inpaint-ui.js` | 本地蒙版裁切、修复结果预览、用户确认后添加透明修复 Fabric 图层 | 本仓原创代码 |
| `js/ai/manga-smart-text-editor.js` | 每条 OCR 候选的 LaMa 去字入口及与编辑层/撤销的协作 | 本仓原创代码 |
| `scripts/manga-lama-inpaint-test.py` | 模拟模型初始化、缺失依赖、结果结构与坏输入拒绝 | 本仓原创离线测试 |
| `scripts/gpt-browser-acceptance.cjs` | 实际 Chromium 路径，通过本机模拟模型验证去字前不修改、确认后新图层、一次撤销/重做 | 本仓测试，无真实模型费用 |

详见 [UPSTREAM_BORROWING_LEDGER.md](UPSTREAM_BORROWING_LEDGER.md)。

## 验收边界

- 有测试的是端点、图片+蒙版协议、分辨率和图层交互；**不是**真 LaMa 推理质量。
- Windows 本机安装大型 Python/PyTorch 依赖、显存/内存峰值、真实漫画底纹修复质量还未测试。
- 当前没有多边形蒙版、画笔擦字、精确笔画分割，也没有自动识别气泡尾巴或人物分割。
- 未点击修复时不加载模型；用户主动运行模型后需要等本地推理完成。无需 GPT/NovelAI Key，但首用模型下载依赖上游服务。
