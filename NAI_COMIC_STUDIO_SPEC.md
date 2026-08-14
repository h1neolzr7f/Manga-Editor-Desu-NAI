# Manga Editor Desu · nai学长魔改版 / NAI Comic Studio 规格说明

> 内部设计笔记。对外名称是 **Manga Editor Desu · nai学长魔改版** 1.0.0。下文「第一轮」指早期增量范围，以仓库代码为准。

# NAI Comic Studio / Manga Editor Desu 增强版规格（第一轮）

## 目标与范围

本轮在现有 Manga Editor Desu 的 Fabric Canvas、项目保存和 Undo/Redo 机制上做增量扩展，目标是先跑通一个可编辑的通用聊天模板和本地抠图 Sidecar 接口 Stub。

本轮包含：

- 保留原漫画编辑器、NovelAI、Tagger、AI 导演及其现有批量流程。
- 建立 `generic-chat-dark` 通用聊天模板。
- 将聊天场景数据与模板样式分离。
- 使用 Fabric Group 插入画布，消息、头像、文本和图片消息保持为子对象。
- 通过现有 `commonProperties`、项目压缩保存和 `saveStateByManual()` 接入持久化及 Undo/Redo。
- 建立本地抠图 Sidecar 的 API 契约、标准库 Stub 和前端健康检查/调用 Stub。
- 记录素材目录、来源和许可规则。

本轮明确不做：

- 不重写原有 Canvas、图层或历史系统。
- 不实现六种模拟器模板；只实现通用聊天模板。
- 不下载模型、不打包模型、不调用 Image2。
- 不复制 MayerTalk、rembg-ui 或其他第三方项目代码和素材。
- 不删除或改写 AI 导演功能。

## 现有项目接入点

| 能力 | 现有机制 | 本轮接入方式 |
| --- | --- | --- |
| 画布 | 全局 `canvas`（Fabric Canvas） | `js/simulator/chat-renderer.js` 创建 Fabric Group |
| 自定义对象保存 | `js/core/settings.js` 的 `commonProperties` | 增加模拟器元数据字段 |
| 项目保存/读取 | `js/layer/image-history-management.js`、项目压缩模块 | 父 Group 保存 `simulatorScene` JSON 字符串 |
| Undo/Redo | `saveStateByManual()`、`changeDoNotSaveHistory()` | 替换/删除 Group 时只登记最终状态 |
| UI | 现有侧栏、CSS 变量、Toast/i18next | 增加模拟器侧栏和独立 CSS |
| 本地 AI | 浏览器 `file://` + 可选 localhost | `js/local-tools/` 只提供明确失败的接口 Stub |

## 模板与场景数据

模板只描述样式和可编辑字段，场景只描述角色和事件。模板注册表位于 `js/simulator/template-registry.js`，场景规范位于 `js/simulator/chat-scene.js`。

模板示例：

```json
{
  "schemaVersion": 1,
  "id": "generic-chat-dark",
  "name": "通用深色聊天",
  "category": "chat",
  "canvas": { "width": 1000, "height": 1800, "background": "#111827" },
  "theme": {
    "fontFamily": "system-ui",
    "primaryColor": "#f8fafc",
    "secondaryColor": "#94a3b8",
    "bubbleRadius": 22
  },
  "editableFields": ["title", "participants", "messages", "theme"],
  "assets": [],
  "license": { "type": "original", "source": "", "publicAllowed": true }
}
```

场景示例：

```json
{
  "schemaVersion": 1,
  "sceneType": "chat",
  "templateId": "generic-chat-dark",
  "title": "夜间对话",
  "participants": [
    { "id": "character_a", "name": "角色A", "side": "left", "avatar": "" },
    { "id": "character_b", "name": "角色B", "side": "right", "avatar": "" }
  ],
  "messages": [
    { "id": "message_1", "type": "text", "speaker": "character_a", "content": "你终于来了。", "time": "22:31" },
    { "id": "message_2", "type": "image", "speaker": "character_b", "content": "", "image": "", "time": "22:32" }
  ]
}
```

角色删除后不会静默改写消息：渲染器显示“角色已删除”，校验器同时报告缺失角色 ID，用户可以重新选择角色或删除消息。

## 画布对象与编辑流程

1. 用户在“模拟器 → 通用聊天”编辑场景。
2. 点击“插入/更新到画布”。
3. 渲染器创建一个 `customType=simulatorChat` 的 Fabric Group。
4. Group 的子对象分别保存背景、标题、消息 Group、头像、气泡、文字和图片资源。
5. 父 Group 保存 `simulatorScene`、`simulatorTemplateId` 和 schema 版本，项目保存时一并序列化。
6. 再次打开项目后，选中 Group 并点击“读取选中对象”，可回到编辑面板继续修改。
7. 更新或删除 Group 时暂时关闭对象事件历史，只用一次 `saveStateByManual()` 登记最终状态。

## 本地抠图接口

接口定义见 `local_tools/API.md`。默认地址为 `http://127.0.0.1:8765`，服务未启动、请求失败或处理未实现时前端明确报错，不把原图冒充为处理结果。

第一轮 Stub 只验证契约和错误路径，不加载 `rembg`、SAM 或任何模型。后续实现处理器时必须保持原图不变，并把替换/新建图层纳入既有历史系统。

## 验收基线

- `npm run lint` 可执行且无新增错误。
- 模板注册表、场景校验器、聊天渲染器可在无服务器、无模型情况下加载。
- 聊天 Group 的插入、更新、删除各只产生一个历史结果。
- `simulatorScene` 能通过项目 JSON 保存并在读取后恢复。
- 缺失角色、缺失图片资源和抠图服务未启动时均有明确状态。
- 原有 AI 导演和 NovelAI 代码未被删除或改写。

## 当前分支

第一轮开发分支：`feat/nai-comic-studio`。

