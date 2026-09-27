# テスト索引

`scripts/gen-project-index.cjs` の自動生成。手で編集しない。

- 検証内容はテストファイル先頭のコメントからのみ抽出する（推測で埋めない）

| npm script | テストファイル | 検証内容（先頭コメント） |
|-----------|---------------|--------------------|
| `npm run check-translations` | scripts/check-translations.cjs | Translation key validation script - compares keys across all languages in i18next resources |
| `npm run test` | scripts/layout-smoke-test.cjs |  |
| `npm run test:assets` | scripts/asset-library-smoke-test.cjs |  |
| `npm run test:brushes` | scripts/custom-brush-smoke-test.cjs |  |
| `npm run test:cutout` | scripts/cutout-presets-smoke-test.cjs |  |
| `npm run test:fabric-text-focus` | scripts/fabric-text-focus-smoke-test.cjs | fabric の編集用 textarea がスクロールを起こさないことを検証する。 |
| `npm run test:image-export` | scripts/image-export-smoke-test.cjs |  |
| `npm run test:image-export-integration` | scripts/image-export-integration-test.cjs | 位深度と画素プレビューの統合テスト。 |
| `npm run test:image2` | scripts/image2-interface-smoke-test.cjs |  |
| `npm run test:layout` | scripts/layout-smoke-test.cjs |  |
| `npm run test:manga-import` | scripts/manga-import-smoke-test.cjs |  |
| `npm run test:nai-pipeline` | scripts/nai-pipeline-smoke-test.mjs | NAI-only pipeline smoke test (NovelAI + Director proxy). |
| `npm run test:page-size` | scripts/manga-page-size-smoke-test.cjs |  |
| `npm run test:page-studio` | scripts/page-studio-smoke-test.cjs |  |
| `npm run test:png-bit-depth` | scripts/png-bit-depth-smoke-test.cjs |  |
| `npm run test:proxy-guards` | scripts/proxy-guard-smoke-test.py |  |
| `npm run test:scene-plan` | scripts/scene-plan-smoke-test.cjs |  |
| `npm run test:simulator` | scripts/simulator-chat-smoke-test.cjs |  |
| `npm run test:simulator-extra` | scripts/simulator-extra-smoke-test.cjs |  |
| `npm run test:story-engine` | scripts/story-engine-smoke-test.cjs |  |
| `npm run test:timeline` | scripts/simulator-timeline-smoke-test.cjs |  |

## テストが読む対象ファイル

テスト内の `readFileSync` / リテラルパスから抽出。どの実装を守っているかの目安。

| テスト | 対象ファイル |
|--------|-----------|
| `npm run test` | `css/common.css`, `css/core/main-component.css`, `css/icon.css`, `css/layout-layer.css`, `css/layout.css`, `css/simulator-chat.css`, `js/ai/director/scene-plan-controller.js`, `js/assets/asset-library-controller.js`, `js/assets/asset-store.js`, `js/assets/boot-guard.js`, `js/assets/github-free-pack.js`, `js/assets/image2-controller.js`, `js/canvas-manager.js`, `js/core/font/font-manager-core.js`, `js/core/manga-page-size.js`, `js/core/settings.js`, `js/layer/layer-management.js`, `js/local-tools/background-removal-client.js`, `js/panel/random-cut.js`, `js/project-management.js`, `js/sidebar/panel/panel-template.js`, `js/sidebar/sidebar.js`, `js/simulator/extra-renderer-factory.js`, `js/simulator/page-edit-controller.js`, `js/simulator/playback-controller.js`, `js/simulator/simulator-controller.js`, `js/simulator/simulator-studio.js`, `js/simulator/site-ui-parts.js`, `js/simulator/story-composer-controller.js`, `js/ui/beginner-guide.js`, `js/ui/bottom-bar.js`, `js/ui/canvas-object-menu.js`, `js/ui/tutorial.js`, `js/ui/visual-ps-tools.js`, `js/ui/visual-studio.js`, `scripts/make-one-click-zip.ps1` |
| `npm run test:assets` | `js/assets/asset-manifest.js`, `js/assets/asset-pack.js`, `js/assets/asset-scanner.js`, `js/assets/asset-store.js`, `js/assets/github-free-pack.js`, `js/assets/original-starter-pack.js`, `js/assets/site-ui-pack.js`, `js/simulator/site-ui-parts.js` |
| `npm run test:brushes` | `js/sidebar/pen/brush-presets.js`, `js/sidebar/pen/custom-brush.js` |
| `npm run test:cutout` | `js/local-tools/cutout-presets.js`, `js/local-tools/local-tools-client.js` |
| `npm run test:fabric-text-focus` | `js/core/util/fabric-text-focus.js` |
| `npm run test:image-export` | `js/canvas-manager.js`, `js/core/compression/project-compression.js`, `js/core/manga-page-size.js`, `js/core/util/image-util.js`, `js/project-management.js` |
| `npm run test:image-export-integration` | `js/core/manga-page-size.js`, `js/core/util/image-util.js`, `js/core/util/png-bit-depth.js` |
| `npm run test:image2` | `js/assets/image2-client.js`, `js/assets/image2-job-store.js` |
| `npm run test:layout` | `css/common.css`, `css/core/main-component.css`, `css/icon.css`, `css/layout-layer.css`, `css/layout.css`, `css/simulator-chat.css`, `js/ai/director/scene-plan-controller.js`, `js/assets/asset-library-controller.js`, `js/assets/asset-store.js`, `js/assets/boot-guard.js`, `js/assets/github-free-pack.js`, `js/assets/image2-controller.js`, `js/canvas-manager.js`, `js/core/font/font-manager-core.js`, `js/core/manga-page-size.js`, `js/core/settings.js`, `js/layer/layer-management.js`, `js/local-tools/background-removal-client.js`, `js/panel/random-cut.js`, `js/project-management.js`, `js/sidebar/panel/panel-template.js`, `js/sidebar/sidebar.js`, `js/simulator/extra-renderer-factory.js`, `js/simulator/page-edit-controller.js`, `js/simulator/playback-controller.js`, `js/simulator/simulator-controller.js`, `js/simulator/simulator-studio.js`, `js/simulator/site-ui-parts.js`, `js/simulator/story-composer-controller.js`, `js/ui/beginner-guide.js`, `js/ui/bottom-bar.js`, `js/ui/canvas-object-menu.js`, `js/ui/tutorial.js`, `js/ui/visual-ps-tools.js`, `js/ui/visual-studio.js`, `scripts/make-one-click-zip.ps1` |
| `npm run test:manga-import` | `js/ai/manga-importer.js`, `js/ai/provider/novelai-provider.js` |
| `npm run test:page-size` | `js/core/manga-page-size.js` |
| `npm run test:page-studio` | `js/panel/layout-templates.js`, `js/sidebar/page/page-studio.js`, `js/sidebar/pen/brush-presets.js`, `js/sidebar/text/sfx-palette.js` |
| `npm run test:png-bit-depth` | `js/core/util/png-bit-depth.js` |
| `npm run test:scene-plan` | `js/ai/director/scene-plan-schema.js` |
| `npm run test:simulator` | `js/local-tools/local-tools-client.js`, `js/simulator/chat-scene.js`, `js/simulator/template-registry.js` |
| `npm run test:simulator-extra` | `js/simulator/extra-renderer-factory.js`, `js/simulator/renderers/danmaku-player-renderer.js`, `js/simulator/renderers/forum-renderer.js`, `js/simulator/renderers/image-board-renderer.js`, `js/simulator/renderers/livestream-renderer.js`, `js/simulator/renderers/phone-renderer.js`, `js/simulator/renderers/social-feed-renderer.js`, `js/simulator/renderers/video-tube-renderer.js`, `js/simulator/renderers/visual-novel-renderer.js`, `js/simulator/scene-serializer.js`, `js/simulator/template-registry.js` |
| `npm run test:story-engine` | `js/ai/director/scene-plan-controller.js`, `js/ai/director/scene-plan-schema.js`, `js/simulator/extra-renderer-factory.js`, `js/simulator/renderers/danmaku-player-renderer.js`, `js/simulator/renderers/forum-renderer.js`, `js/simulator/renderers/image-board-renderer.js`, `js/simulator/renderers/livestream-renderer.js`, `js/simulator/renderers/phone-renderer.js`, `js/simulator/renderers/social-feed-renderer.js`, `js/simulator/renderers/video-tube-renderer.js`, `js/simulator/renderers/visual-novel-renderer.js`, `js/simulator/scene-serializer.js`, `js/simulator/story-adapters.js`, `js/simulator/story-engine.js`, `js/simulator/story-to-manga.js`, `js/simulator/template-registry.js`, `js/simulator/timeline.js` |
| `npm run test:timeline` | `js/simulator/longshot-exporter.js`, `js/simulator/timeline.js` |

## テストが見ている条件（アサーションメッセージ）

テスト内のリテラルなアサーションメッセージの抜粋。上限 8 件。

### `npm run test`

- boot-guard script missing
- boot-guard overlay missing
- open-simulator action missing
- token badge missing
- remember token checkbox missing
- acceptance gate should default off
- story tabs missing
- merged bubble panel missing

### `npm run test:brushes`

- 我的墨笔

### `npm run test:cutout`

- http://127.0.0.1:8765

### `npm run test:fabric-text-focus`

- IText にパッチが入っていない
- Textbox がパッチされた initHiddenTextarea を継承していない
- VerticalTextbox が IText のパッチを継承していない
- scroll 位置
- パッチ無しで再現しないとテストが意味をなさない
- preventScroll 無視実装で縦スクロールが戻っていない
- preventScroll 無視実装で横スクロールが戻っていない
- 再実行で initHiddenTextarea が二重ラップされた

### `npm run test:image-export`

- ImageUtil must be defined
- jpeg
- webp
- 未対応形式は png にフォールバック
- パーセント指定も受け付ける
- 2桁のパーセント指定
- 100 は上限クランプ
- 下限クランプ

### `npm run test:image-export-integration`

- PNG 署名
- IEND がある
- 既知のカラータイプ
- 行の長さが一致する
- モジュールが読み込まれている
- function
- 書き出しは 1 回
- 透明は白へ合成 R

### `npm run test:layout`

- boot-guard script missing
- boot-guard overlay missing
- open-simulator action missing
- token badge missing
- remember token checkbox missing
- acceptance gate should default off
- story tabs missing
- merged bubble panel missing

### `npm run test:manga-import`

- portrait panel lost portrait aspect
- wide panel lost wide aspect
- safe panels should pass preflight
- preflight must lock samples=1
- preflight must lock concurrency=1
- preflight should write safe sizes
- single illustration/noisy lines should collapse to one full-page panel
- NovelAI provider must lock n_samples=1

### `npm run test:page-size`

- 1654×2339
- 負数は不正値
- 負数の文字列も不正値
- 0 は不正値
- 空欄は不正値
- 空白のみも不正値
- 非数値は不正値
- 有効値はそのまま

### `npm run test:page-studio`

- rain
- grid-2x2
- splash-full
- function

### `npm run test:png-bit-depth`

- PNG シグネチャ
- チャンク列が末尾まで整合する
- NaiPngBitDepth must be defined
- resolveExportMode は normalizeMode の別名
- gray
- argb
- 空文字は rgb
- 空白のみは rgb

### `npm run test:simulator`

- chat
- story-log
- discord
- #4ade80
- generic-chat-dark
- http://127.0.0.1:8765

### `npm run test:story-engine`

- 雨夜对白
- title
- speech
- aside
- choice
- story-log-dark
- visual-novel
- visual-novel-generic

## テスト以外の script

- `npm run check:index` → `node scripts/gen-project-index.cjs --check`
- `npm run format` → `node scripts/remove-spaces.cjs`
- `npm run generate:site-ui` → `node scripts/generate-site-ui-svgs.cjs`
- `npm run index` → `node scripts/gen-project-index.cjs`
- `npm run lint` → `eslint js/ --ext .js`
- `npm run lint:fix` → `eslint js/ --ext .js --fix`
- `npm run vendor:free-assets` → `node scripts/vendor-free-public-assets.cjs`
