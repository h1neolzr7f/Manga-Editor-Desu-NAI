# UIパターン

## DOM操作ユーティリティ（ui-util.js）
```javascript
const $=(id)=>document.getElementById(id);
hideById(id) / showById(id)
toggleVisibility(target)
selectedById(ids) / unSelectedById(id)
```

## EventDelegator（event-delegator.js）
document-levelのクリック委譲。`data-action`属性でハンドラを呼び分ける。
```html
<button data-action="flipHorizontally">Flip</button>
```
```javascript
EventDelegator.register('flipHorizontally',function(el,e){...});
```

## Toast通知（toast.js）
```javascript
createToast(title,messages,time=4000)
createToastError(title,messages,time=4000)
```
- 成功: `toast-nier`テーマ、エラー: `toast-dbd`テーマ
- Bootstrap Toast APIベース

## モーダル
HTML動的挿入＋CSSオーバーレイ。パターン:
- `position:fixed` + `rgba(0,0,0,0.6)` + backdrop blur
- z-index: `var(--z-modal)` / `var(--z-overlay)`
- レスポンシブ: `max-width:720px; width:90%; max-height:80vh`

## スライダー（custom-html-component.js）
```javascript
setupSlider(slider,classname,addButton=true)
```
スライダーにup/downボタンとラベルを自動付与。

## レイヤーパネル更新（layer-management.js）
`updateLayerPanel()`はデバウンス付き（60ms最小間隔）。
```
updateLayerPanel() → 60ms throttle → executeUpdate() → DOM全再構築
```
- GUID階層でネスト表示
- Material Designアイコンでレイヤー種別を識別
- プレビューサムネイル表示

## CSS変数（root.css）
```css
.dark-mode{
  --color-base:#212121;
  --color-secondary:#333333;
  --color-accent:#810000;
  --color-text-primary:#ffffff;
  --odd-layer:#262626;
  --even-layer:#2c2c2c;
  --layer-active-bg:#3a1a1a;
  --layer-active-border:#a03030;
  --btn-bg:rgba(255,255,255,0.07);
  --btn-hover-bg:rgba(255,255,255,0.15);
}
```

## i18n（i18next.js）
HTML属性での翻訳:
```html
<h3 data-i18n="keyName"></h3>
<input data-i18n-placeholder="keyName">
```
JS内:
```javascript
getText("keyName")  // i18next.t()のラッパー
```

## 永続化
| ストア | 用途 |
|--------|------|
| `localforage` | IndexedDB非同期ストレージ（SettingsRepository, auto-save等） |
| `localStorage` | 設定バックアップ、プロバイダ設定 |
- `SettingsRepository`: TTL付きget/set対応
- `localforage.createInstance({name:'xxx'})` で用途別インスタンス

## ModeManager
操作モード切り替え: SELECT, FREEHAND, KNIFE, PEN各種, CROP
```javascript
ModeManager.getCurrent()
  ModeManager.MODE.SELECT

```

## Simulator panel

左侧「剧情」(`#simulator-chat-area`) 继续只写对白，并提供「打开对应模拟器」和「生成漫画分镜」。

左侧「模拟器」打开 `#simulatorStudioOverlay`：先是启动页，再单开一种模拟器工作区。预览用独立 `fabric.StaticCanvas`，不占用主画布。播放在工作区内完成；「放入漫画」才调用现有 `placeOnCanvas` / `insertTemplate`，成功后必须关掉 overlay，让用户立刻看见画布。聊天对白框进入时要写入可编辑示例（或剧情灌入的对白），预览与编辑框必须同一份文字，禁止空脚本静默借用剧情。右侧坞的「放入漫画 / 播放」钉在底部，不跟皮肤网格一起滚走。零件只出现在影片站 / 弹幕 / 图区工作区。左侧「模板」只套分镜格子。

空画布提示 `#canvasEmptyHint` 不要把 `canvasInitMessage` 占位字算成内容。

`NaiComicSimulatorStudio.open({tab,templateId,assetId,story})` 仍可用：`tab:'chat'|'web'|'part'` 会映射到对应单开模式。旧画布对象 `simulatorChat` / `simulatorExtra` 仍可通过「从画布读回来」回读。素材库站点卡的「打开对应模拟器」只进对应工作区，不再偷偷往画布插整页。
