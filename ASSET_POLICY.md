# 素材与本地数据政策

## 目录分层

用户数据和项目源码分开。以下目录用于本地运行时数据，不应提交到公开仓库：

```text
user_data/
├── asset_packs/
│   ├── private/
│   ├── generated/
│   ├── imported/
│   └── public/
├── projects/
├── cache/
├── exports/
└── models/
```

兼容旧启动包的目录也保持忽略：`private_assets/`、`generated_outputs/`、`models/`、`cache/`。

## 素材记录

每一项可复用素材应有 JSON 元数据，至少记录：

```json
{
  "id": "uuid",
  "name": "通用深色对话框边框",
  "type": "frame",
  "path": "generated/frame_001.png",
  "tags": ["chat", "dark"],
  "sourceType": "original",
  "sourceUrl": "",
  "creator": "",
  "license": "project-original",
  "publicAllowed": true,
  "prompt": "",
  "createdAt": ""
}
```

缺少文件时必须在 UI 中显示丢失状态；禁止静默替换成不相关图片。模板可以使用空头像、纯色背景等源码内占位值，不依赖私人素材才能启动。

## 公开入门包

`assets/original/starter/` 是随包发布的原创几何装饰（集中线、情绪符号、剪影、框）。`assets/original/site-ui/` 是原创站点界面零件（深色影片站、弹幕播放页、图区），只仿布局配色，不含真实站名和商标。素材库启动时按稳定 id 写入索引，刷新后从相对路径加载，不依赖内存里的 File。

`assets/public/` 只放已确认可以随项目公开发布的第三方素材，目前包括 Kenney CC0 UI/图标/纸纹/粒子、Heroicons（MIT）、Tabler Icons 子集（MIT），以及 David Revoy 的气泡模板（CC BY 4.0，需署名）。用 `node scripts/vendor-free-public-assets.cjs` 重新拉取。

不要把第三方角色立绘、平台 Logo 或权利不明的图片放进这个目录。不收录微信 / Discord / 明日方舟等官方或粉丝素材。

- `public/` 只放已确认可以随项目公开发布的代码、素材或明确许可资源。
- `private/` 可以放个人收集素材，但只供本机或私下使用，不进入 Git。
- `imported/` 保留原始来源和导入时间；来源不明的素材默认 `publicAllowed=false`。
- `generated/` 记录生成提示词、日期、尺寸、透明背景选项和人工修改记录。
- 不把官方游戏角色、平台 Logo、第三方水印或无法确认权利的素材作为公开默认资源。
- Image2 暂不调用；未来调用时不得覆盖已有文件，必须创建新记录和新文件名。

## 模板资产

第一轮通用聊天模板只使用源码中的颜色、文字和运行时用户选择的头像数据，不新增第三方图片。用户选择的头像会以 `data:` URL 随项目保存；禁止将 `blob:` URL 写入长期项目数据。

