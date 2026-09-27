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

## 出力サイズ概算（画布メニュー）

画布ドロップダウンの `#outputImageEstimateRow` は、导出格式 / 导出品质 / 下载 DPI の現在値から書き出しサイズを見積もる。

- 実装は `ImageUtil.estimateExportSize`（`js/core/util/image-util.js`）。目標倍率で canvas を 6x6 に割り、各行から別の列を黄金比で選んで実際に `toDataURL` する。
- PNG はタイルごとにコンテナ固定費が乗るため、8x8 の極小タイルを 1 回測って差し引く。これを忘れると白紙ページを 2.5 倍過大評価する。
- タイルは目標解像度のまま切り出す。小さい倍率で測って外挿すると 50〜500% ずれる。
- 表示は `js/canvas-manager.js` の `syncExportSizeEstimate` / `scheduleExportSizeEstimate`。入力変更と canvas の object:added / modified / removed で更新し、連打は遅延でまとめる。
- 表示は点推定と幅。ツールチップに「概算 / 幅 / 出力画素 / 形式 / 品質」を出す。
- 幅には最低でも概算の 50% を持たせる。タイル数枚では統計的なばらつきが過小評価になるため。
- 全タイルがほぼ同じ値（変動係数 < 0.1）のページは、タイルごとのコンテナ固定費を重複して数える分だけ必ず過大になる。この場合は点推定を「至多」（上限）として表示する。
- 精度の限界: 実測では点推定の誤差は中央値 9%、幅は 54 ケース中 51 を被覆する。小さい canvas を JPEG/WebP で出す場合と、内容が数タイルしかない疎なページは 2 倍程度外すことがある。ここは過小評価側に出る（内容を取りこぼす）ため、過大なファイルを作る心配をする用途では安全側。

## 导出位深度と出力画素（画布メニュー）

导出位深度 `#outputBitDepth` は PNG のみに効く（`ImageUtil.getExportBitDepthForFormat` が PNG 以外で null を返し、UI も `syncExportBitDepthState` で無効化する）。既定は `rgb`（24bit RGB）。

- 実際の変換は `js/core/util/png-bit-depth.js` の `NaiPngBitDepth`。PNG を自前でデコード → `gray`(colorType 0) / `rgb`(2) / `argb`(6) で IHDR/IDAT を書き直す。canvas は介さない。
- `gray` / `rgb` は透過を下地色で合成する。下地は `ImageUtil.getExportBackgroundColor`（`canvas.backgroundColor` 優先、無ければ `#bg-color`）。ARGB 以外は透明度を使わない = 完全不透明として扱う。
- `resolveExportBackground` は `fabric.Color.fromHex` の戻りを検証する。`fromHex('not-a-color')` は例外を投げずに変な色を返すため、そのまま使うとゴミ色が下地になる。
- `getCropAndDownloadLinkByMultiplier` / `getCropAndDownloadLink` は位深度変換が入るので `Promise<HTMLAnchorElement>` を返す。呼び出し側（`cropAndDownload` / `clipCopy` / `project-compression`）は必ず await する。`clipCopy` は元画素を保つため `argb` を強制する。
- 画布背景の行は `#bgColorButton`（左に `#bgColorValue` の十六進値、右に `#bgColorSwatch` の色正方形）。入力本体 `#bg-color` は 1px の不可視 input で、ボタンから `picker.jscolor.show()` を呼ぶ。`syncExportBackgroundLabel` が両者を同期する。行の下のグレー注記は `.nai-bg-note`（未启用 ARGB 时透明度不生效）。

### 実出力画素とプレビューの一致

`#outputDpi` と `#exportPxPortraitWidth/Height` / `#exportPxLandscapeWidth/Height` は双方向に同期する。

- 唯一の真実は `NaiMangaPageSize.planExportPage(dpi, baseWidth, baseHeight)`（`js/core/manga-page-size.js`）。`ImageUtil.resolveExportMultiplierForDpi` もプレビューもこの関数を通るので、表示画素と実出力は構造上必ず一致する。
- 基準は `PAGE_MM` の A4（竖 210x297mm / 横 297x210mm）。倍率は「切り捨て後の長辺が目標値と一致する区間の中点」を採る。単純な `target/base` だと丸めで 1px ずれ、プレビューと実出力が食い違う。
- 上限は `EXPORT_MAX_EDGE` 8192 / `EXPORT_MAX_PIXELS` 40M。`planExportPage` が上限内に収まる最大長辺を返し、`capped` が立つと `#exportPxCappedNote` を表示する。
- 画素欄の確定は `commitExportPixelEdge`。`resolveDpiForPixelEdge`（0.01 DPI 刻みの二分探索）で DPI を逆算する。往復しても画素がぶれないのはこのため。範囲外は null を返す。
- **入力中は値を書き戻さない。** 穋所の無効値リバート（旧 `scheduleExportPixelRevert` / 800ms タイマー）は廃止した。打っている途中に数字が戻ると入力できないため。検証と確定は **blur（フォーカスが外れた時）と Enter** のみで行う。number の `change` はブラウザ次第で発火しないため、Enter は `keydown` で明示的に拾う。
- 編集中の欄は `exportPixelEditing` / `exportDpiEditing` で記録し、`updateExportPagePlanDisplay` と `syncExportDpiField` はその欄に触らない。
- DPI は `SETTINGS_SCHEMA.canvasDpi`、位深度は `SETTINGS_SCHEMA.outputBitDepth` として自動保存される（再起動しても保持）。`setExportDpi` はプログラム書き換え時に `input` を明示発火して自動保存に載せる（`change` は発火しないため）。
- 範囲外や無効な DPI を入れた場合は、既定値 300 ではなく **直前の有効値**へ戻す。`lastValidExportDpi` がその値を覚え、`exportDpiFallback()` が返す。負数や空欄など「意味の無い」入力は `NaiMangaPageSize.normalizeExportDpi` が null を返し、範囲外の正数は従来どおり `EXPORT_DPI_MIN` / `EXPORT_DPI_MAX` へ丸める。丸めた場合は `notifyExportDpiRange` が一度だけ通知する。
- 画素欄の範囲外は `notifyExportPixelRange` が一度だけ通知し、確定値へ戻す（入力中は戻さない）。
- `saveSettingsLocalStrage` は `sanitizeSettingsValueForStorage` で保存前に DPI を検証する。入力途中の `-5` をそのまま保存すると、次回起動時に読み込んだ値が 300 に化けて「設定が勝手に戻る」ように見える。不正値の間は直前の保存値を据え置く。
- 保存値の読み込みは `canvas-manager.js` の DOMContentLoaded より後れるため、読み込み後に `syncExportPlanAfterSettingsLoad`（project-management.js）がプレビューを作り直す。これを忘れると起動直後だけ DPI と画素表示が食い違う。

## テキスト編集と画面スクロール（fabric の隠し textarea）

fabric の `IText` / `Textbox` は編集開始時に、1px の隠し `<textarea data-fabric-hiddentextarea>` を生成して `document.body` 直下に置く。位置は **文書座標**（`position:absolute; top/left` = `canvas._offset` + canvas 内の座標）で、`hiddenTextareaContainer` を指定しない限り canvas の大きさぶんしかクランプされない。

- `enterEditing()` は `this.hiddenTextarea.focus()` を呼ぶ。textarea が画面外（viewport の外）にあると、ブラウザは **document 全体をスクロール**して見せようとする。
- その結果 `#resizable-container` の scrollTop/scrollLeft が動き、`canvas.calcOffset()` を通る `canvas._offset` が古くなる。次のクリック座標がずれ、「オブジェクトを再クリックしただけで視野が飛ぶ」ように見える。
- 症状は配置に依存する。キャンバスの右側に置けば横へ、下側に置けば縦へ飛ぶ。左上付近では起きない。

対策は `js/core/util/fabric-text-focus.js`。`initHiddenTextarea` をラップし、生成直後の textarea の `focus` を `{preventScroll:true}` 付きに差し替える。

- `patchTextPrototype` は **そのプロトタイプ自身が `initHiddenTextarea` を持っている場合だけ**パッチする。`Textbox` は `IText` を継承して持たないため、`IText` を押さえれば `Textbox` もアプリ固有の `VerticalTextbox`（`js/sidebar/text/vertical-textbox.js`、`fabric.IText` を継承）も同時に直る。二重ラップは `__naiFocusNoScrollPatched` で防ぐ。
- `preventScroll` を渡せない、あるいは黙って無視する実装への保険として、`focus()` の前後で `document.scrollingElement` の scrollTop/scrollLeft を保存し、動いた時だけ戻す。例外時も同じ経路を通る。
- **`_calcTextareaPosition` の座標系は変えない。** 文書座標のままにしておかないと、IME（日本語入力）の候補ウィンドウが編集位置から離れた場所に出る。抑えるのはスクロールだけ。
- `index.html` では fabric 本体（2531）の直後、`defer` を付けずに読む。`VerticalTextbox`（2676）や `fabric-management.js`（2721）より先に当てる必要がある。
- 回帰テストは `npm run test:fabric-text-focus`。継承関係・スクロール不変・二重パッチ防止に加え、**対策を外すとスクロールが再現すること**も検証する（テストが空振りしていないことの確認）。

## ModeManager
操作モード切り替え: SELECT, FREEHAND, KNIFE, PEN各種, CROP
```javascript
ModeManager.getCurrent()
  ModeManager.MODE.SELECT

```

## Simulator panel

左侧「剧情」(`#simulator-chat-area`) 继续只写对白，并提供「打开对应模拟器」和「生成漫画分镜」。

左侧「模拟器」打开 `#simulatorStudioOverlay`：先是启动页，再单开一种模拟器工作区。预览用独立 `fabric.StaticCanvas`，不占用主画布。播放在工作区内完成；「放入漫画」才调用现有 `placeOnCanvas` / `insertTemplate`，成功后必须关掉 overlay，让用户立刻看见画布。聊天对白框进入时要写入可编辑示例（或剧情灌入的对白），预览与编辑框必须同一份文字，禁止空脚本静默借用剧情。右侧坞的「放入漫画 / 播放」钉在底部，不跟皮肤网格一起滚走。零件只出现在影片站 / 弹幕 / 图区工作区。左侧「模板」只套分镜格子。

空画布提示 `#canvasEmptyHint` 不要把 `canvasInitMessage` 占位字算成内容。提示可关闭（右上角 ×、「自己裁剪」、Esc），关闭后写入 `nai_empty_canvas_hint_dismissed`。教程跳过/完成后不再挡住画布。启动时的 `loadBookSize(..., false)` 不得持久关闭提示；只有用户点「自定义页面 / 竖页 / 横页」才关闭。自定义页面与 A4 一样铺满整页格子，刀才能切。页面管理 HUD 不要复用形状文案。出图 preflight 要同时提示「页面 → 切割格子」和「模板」。引导正文在「帮助 → 新手教程」。

`NaiComicSimulatorStudio.open({tab,templateId,assetId,story})` 仍可用：`tab:'chat'|'web'|'part'` 会映射到对应单开模式。旧画布对象 `simulatorChat` / `simulatorExtra` 仍可通过「从画布读回来」回读。素材库站点卡的「打开对应模拟器」只进对应工作区，不再偷偷往画布插整页。
