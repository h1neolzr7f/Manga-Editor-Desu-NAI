# Manga Editor Desu · nai学长魔改版：实现说明

对外产品名：**Manga Editor Desu · nai学长魔改版** 1.0.3。下文模块名仍沿用开发期的 NAI Comic Studio。

# NAI Comic Studio / Manga Editor Desu 增强版：完整实现说明

## 范围

本实现覆盖任务书阶段 2–7，并保留原有 Manga Editor Desu 编辑器、NovelAI、Tagger、AI 导演及批量流程。新增能力都通过现有 Fabric Canvas、项目保存、图层和 Undo/Redo 接入，没有替换原有编辑器核心。

## 模块总览

### 素材库（阶段 2）

- `js/assets/asset-manifest.js`：素材元数据 schema、校验、来源与授权字段。
- `js/assets/asset-scanner.js`：文件类型/大小校验、SHA-256 哈希、缩略图和扫描结果。
- `js/assets/asset-store.js`：localStorage manifest、会话文件、去重、搜索、标签、缺失检测和 Canvas 插入。
- `js/assets/asset-pack.js`：素材清单 JSON 导入/导出。
- `js/assets/asset-library-controller.js`：侧栏 UI、拖放、筛选、授权展示和插入操作。

用户素材及私有缓存目录已加入 `.gitignore`；仓库不包含用户素材、模型权重或生成结果。

### 背景移除 Sidecar（阶段 3）

- `local_tools/server.py`：127.0.0.1:8765 loopback API，支持健康检查、模型列表、单图和批量抠图；失败时返回明确错误，不把原图伪装成处理结果。
- `local_tools/model_manager.py`：按需加载 rembg session，支持 `isnet-anime` 和 `birefnet-general`，不在启动时下载或加载模型。
- `js/local-tools/background-removal-client.js`：模型选择、替换/新建/叠加三种动作、预览、Fabric 插入和历史记录。
- `local_tools/requirements.txt`：可选处理器依赖；未安装时 API 仍可提供健康检查和明确的 `PROCESSOR_NOT_INSTALLED` 错误。

没有复制第三方 rembg-ui 或其它项目代码，也没有把模型权重提交到仓库。

### 九种单开模拟器

入口是左侧「模拟器」（`js/simulator/simulator-studio.js` + `#simulatorStudioOverlay`）。先显示启动页，点一种界面就进入该模拟器工作区：左侧实时预览，右侧改字 / 播放，「放入漫画」才写主画布并关闭 overlay。聊天对白进入时写入示例或剧情对白，预览与编辑框同一份文字。零件挂在影片站、弹幕、图区内部，不再作为第三种主入口。左侧「模板」只套分镜格子。空画布提示忽略 `canvasInitMessage` 占位字；可关闭且自定义页面时不得挡住画布；自定义页面会铺满整页格子供切割。引导放在「帮助 → 新手教程」。启动时 `loadBookSize(..., false)` 不得把提示永久关掉。

通用场景序列化位于 `js/simulator/scene-serializer.js`，渲染器工厂位于 `js/simulator/extra-renderer-factory.js`。当前类型为：

- 聊天：`generic-chat-dark` 等 8 套皮肤（`template-registry.js`）
- `video-tube-generic`：影片站
- `danmaku-player-generic`：弹幕投稿页
- `image-board-generic`：图区
- `visual-novel-generic`：视觉小说对话框
- `social-feed-generic`：社交动态流
- `phone-generic`：手机通知/聊天界面
- `forum-generic`：论坛帖子与回复
- `livestream-generic`：直播间、弹幕与互动区

对应渲染器位于 `js/simulator/renderers/`。每个模板使用原创 CSS/Fabric 结构和原始授权元数据，不使用第三方品牌 Logo 或素材。

剧情引擎（MayerTalk 交互参考，原创实现）：

- `js/simulator/story-engine.js`：角色、对白类型、剧情节点、剧本解析。
- `js/simulator/story-adapters.js`：同一段剧情套到聊天 / 视觉小说 / 社交 / 论坛 / 手机 / 直播 / 影片站 / 弹幕 / 图区。
- `js/simulator/story-composer-controller.js`：选角色、发送对白、+1、解析剧本；「打开对应模拟器」进入单开工作区，「生成漫画分镜」才拆格子。
- 聊天皮肤：`story-log-dark`、`discord-chat-dark`、`instant-chat-light`、`sms-chat-light`。

### 回放、时间轴和长截图（阶段 5）

- `js/simulator/timeline.js`：从消息、对白和事件生成可回放时间轴。
- `js/simulator/playback-controller.js`：前后帧、自动播放、选中模拟器回放、关键帧导出和批量插入。
- `js/simulator/longshot-exporter.js`：按子对象边界分页，避免在气泡/卡片中间裁切；支持多页 PNG 导出。

插入长截图页会创建带 `customType=simulatorPage` 的 Fabric 图层，并通过现有 `saveStateByManual()` 记录一次历史状态。

### Image2 资产接口（阶段 6）

- `js/assets/image2-job-store.js`：提示词、反向提示词、尺寸、透明背景、标签、提供商、状态、重试次数和错误信息持久化。
- `js/assets/image2-client.js`：可插拔 Provider Registry、提交/重试、任务状态和成功结果入库；生成素材自动使用 `generated` / `image2` / `transparent` 等来源标签，并进行名称冲突消解。
- `js/assets/image2-controller.js`：Image2 表单、任务列表和失败重试 UI。

默认不配置远程提供商，不会偷偷发起网络请求。接入真实 Image2 时只需注册一个 provider 的 `generate(job)` 适配器。

### AI 导演 ScenePlan（阶段 7）

- `js/ai/director/scene-plan-schema.js`：ScenePlan v1 的 schema、默认值、解析与校验。
- `js/ai/director/scene-plan-service.js`：预览、显式应用、按计划回滚和步骤重试；应用前不修改 Canvas。
- `js/ai/director/scene-plan-controller.js`：自然语言到计划的本地启发式解析、JSON 编辑、预览/应用/回滚 UI。

计划可以描述页面、格数、对白和模拟器面板。应用会写入 `scenePlanId`、`panelIndex` 等元数据并进入现有历史系统；回滚只移除最近一次计划创建的对象，不影响计划前的对象。原有 `novelai-composition-director.js` 和 AI 导演入口仍然保留。

## 数据与历史约束

新增 Fabric 对象统一使用 `commonProperties` 中的 simulator、asset、backgroundRemoval 和 scenePlan 字段。修改/替换/删除/批量插入均在关闭对象历史监听后完成，并通过一次手动保存形成可撤销状态。场景和素材元数据都可序列化，资源文件本体不会被写入源码仓库。

## 验证入口

```text
npm run test:simulator
npm run test:story-engine
npm run test:assets
npm run test:simulator-extra
npm run test:timeline
npm run test:image2
npm run test:scene-plan
npm run lint
```

浏览器回归覆盖：通用聊天第三条消息编辑、插入、Undo/Redo、素材库空态、社交动态插入、ScenePlan 预览/应用/回滚。现有代理服务 404 和 Fabric 字体基线 warning 属于项目既有环境问题，不由本次新增模块产生。
