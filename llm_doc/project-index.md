# プロジェクト索引

`scripts/gen-project-index.cjs` の自動生成。手で編集しない。

まず `llm_doc/feature-map.md`（機能から探す）→ このファイル（横断索引）の順に読む。

## どこを見ればいいか

| 知りたいこと | 見るファイル |
|-------------|-------------|
| 機能から入口ファイルを探す | `llm_doc/feature-map.md` |
| この関数はどこで定義されているか | `llm_doc/index/symbols.md` |
| この id を触っているのはどのファイルか | `llm_doc/index/dom-ids.md` |
| ファイルの場所と用途 | `llm_doc/index/files.md` |
| script/CSS の読み込み順と `?v=` | `llm_doc/index/load-order.md` |
| テストが何を検証しているか | `llm_doc/index/tests.md` |
| 設計意図・規約 | `llm_doc/*.md`（project-structure, ui-patterns など） |

## 規模

| 種別 | 件数 |
|------|------|
| .bat | 14 |
| .cjs | 23 |
| .css | 40 |
| .html | 11 |
| .js | 234 |
| .mjs | 2 |
| .ps1 | 3 |
| .py | 9 |
| シンボル | 10969 |
| DOM id 定義 | 637 |
| script 読み込み | 215 |
| stylesheet 読み込み | 38 |

## 除外ディレクトリ

.claude, .git, .github, 01_build, 02_images_svg, 03_images, 99_doc, __pycache__, assets, cdn-local, docs, font, installer, json_js, node_modules, roadmap, test, third, user_data, ロードマップ２, ロードマップ３_複数API対応

## 公開グローバル（root.X= / window.X=）

| グローバル | 定義 |
|-----------|------|
| `ComfyUIGuide` | js/ai/novelai-only-mode.js:121 |
| `MangaImporter` | js/ai/manga-importer.js:2518 |
| `NaiBackgroundRemovalClient` | js/local-tools/background-removal-client.js:514 |
| `NaiBeginnerGuide` | js/ui/beginner-guide.js:504 |
| `NaiBrushPresets` | js/sidebar/pen/brush-presets.js:127 |
| `NaiCanvasView` | js/canvas-manager.js:951 |
| `NaiCharacterCards` | js/ai/prompt/auto/character-card-manager.js:535 |
| `NaiComicAssetBlobStore` | js/assets/asset-blob-store.js:69 |
| `NaiComicAssetLibraryController` | js/assets/asset-library-controller.js:293 |
| `NaiComicAssetManifest` | js/assets/asset-manifest.js:71 |
| `NaiComicAssetPack` | js/assets/asset-pack.js:22 |
| `NaiComicAssetScanner` | js/assets/asset-scanner.js:87 |
| `NaiComicAssetStore` | js/assets/asset-store.js:412 |
| `NaiComicAssetStoreDefault` | js/assets/asset-store.js:413 |
| `NaiComicBootGuard` | js/assets/boot-guard.js:22 |
| `NaiComicChatController` | js/simulator/chat-controller.js:364 |
| `NaiComicChatRenderer` | js/simulator/chat-renderer.js:368 |
| `NaiComicChatScene` | js/simulator/chat-scene.js:117 |
| `NaiComicExtraRendererFactory` | js/simulator/extra-renderer-factory.js:441 |
| `NaiComicExtraRendererKit` | js/simulator/extra-renderers/renderer-kit.js:227 |
| `NaiComicExtraRendererRegistry` | js/simulator/extra-renderer-factory.js:469, js/simulator/extra-renderers/renderer-kit.js:218 |
| `NaiComicFreePack` | js/assets/github-free-pack.js:75 |
| `NaiComicFreePackManifest` | js/assets/github-free-pack.js:48 |
| `NaiComicLongShot` | js/simulator/longshot-exporter.js:44 |
| `NaiComicOriginalStarterPack` | js/assets/original-starter-pack.js:97 |
| `NaiComicPageEditController` | js/simulator/page-edit-controller.js:82 |
| `NaiComicPlaybackController` | js/simulator/playback-controller.js:101 |
| `NaiComicSceneSerializer` | js/simulator/scene-serializer.js:31 |
| `NaiComicSimulatorController` | js/simulator/simulator-controller.js:121 |
| `NaiComicSimulatorStudio` | js/simulator/simulator-studio.js:1099 |
| `NaiComicSiteUiPack` | js/assets/site-ui-pack.js:76 |
| `NaiComicSiteUiParts` | js/simulator/site-ui-parts.js:318 |
| `NaiComicStoryAdapters` | js/simulator/story-adapters.js:405 |
| `NaiComicStoryComposer` | js/simulator/story-composer-controller.js:342 |
| `NaiComicStoryEngine` | js/simulator/story-engine.js:271 |
| `NaiComicStoryToManga` | js/simulator/story-to-manga.js:173 |
| `NaiComicTemplateRegistry` | js/simulator/template-registry.js:251 |
| `NaiComicTimeline` | js/simulator/timeline.js:35 |
| `NaiCustomBrush` | js/sidebar/pen/custom-brush.js:268 |
| `NaiCutoutPresets` | js/local-tools/cutout-presets.js:96 |
| `NaiFabricTextFocus` | js/core/util/fabric-text-focus.js:72 |
| `NaiImage2Client` | js/assets/image2-client.js:38 |
| `NaiImage2Controller` | js/assets/image2-controller.js:16 |
| `NaiImage2JobStore` | js/assets/image2-job-store.js:13 |
| `NaiImage2JobStoreDefault` | js/assets/image2-job-store.js:14 |
| `NaiImage2ProviderRegistry` | js/assets/image2-client.js:37 |
| `NaiImage2UniqueName` | js/assets/image2-client.js:39 |
| `NaiLocalToolsClient` | js/local-tools/local-tools-client.js:96 |
| `NaiLocalToolsDefaultUrl` | js/local-tools/local-tools-client.js:97 |
| `NaiMangaPageSize` | js/core/manga-page-size.js:229 |
| `NaiPageStudio` | js/sidebar/page/page-studio.js:606 |
| `NaiPanelPipelineReview` | js/ai/panel-pipeline-review.js:258 |
| `NaiPngBitDepth` | js/core/util/png-bit-depth.js:563 |
| `NaiPsTools` | js/ui/visual-ps-tools.js:605 |
| `NaiScenePlanController` | js/ai/director/scene-plan-controller.js:64 |
| `NaiScenePlanSchema` | js/ai/director/scene-plan-schema.js:18 |
| `NaiScenePlanService` | js/ai/director/scene-plan-service.js:69 |
| `NaiSfxPalette` | js/sidebar/text/sfx-palette.js:139 |
| `NaiVisualStudio` | js/ui/visual-studio.js:485 |
| `NovelAICompositionDirector` | js/ai/prompt/novelai-composition-director.js:1207 |
| `PANEL_LAYOUT_TEMPLATES` | js/panel/layout-templates.js:385 |
| `TestRunner` | js/core/debug.js:404 |
| `__naiBrushEvt` | js/ui/visual-studio.js:142 |
| `__naiBrushRaf` | js/ui/visual-studio.js:144, js/ui/visual-studio.js:145 |
| `_clipboard` | js/shortcut.js:100 |
| `appendNaiTagExampleFromPanel` | js/ai/prompt/auto/character-card-manager.js:543 |
| `appendNaiTagExampleToCard` | js/ai/prompt/auto/character-card-manager.js:542 |
| `applyFlexGenSizeToPanels` | js/sidebar/panel/panel-template.js:240 |
| `applyPanelLayoutForCurrentPage` | js/panel/layout-templates.js:383 |
| `applyPanelLayoutTemplate` | js/panel/layout-templates.js:382 |
| `autoMultiGenerate` | js/ai/prompt/auto/auto-generation.js:104 |
| `autoMultiPromptSet` | js/ai/prompt/auto/auto-prompt-util.js:829 |
| `buildBatchPanelRoughPrompt` | js/ai/prompt/auto/auto-prompt-util.js:841 |
| `buildBatchStoryboardContext` | js/ai/prompt/auto/auto-prompt-util.js:844 |
| `buildCharacterCardsBrief` | js/ai/prompt/auto/auto-prompt-util.js:843 |
| `getBatchDirectorCharacterCards` | js/ai/prompt/auto/auto-prompt-util.js:842 |
| `getBatchDirectorSignature` | js/ai/prompt/auto/auto-prompt-util.js:839 |
| `getBatchDirectorUserPrompt` | js/ai/prompt/auto/auto-prompt-util.js:838 |
| `getBatchPanelSignature` | js/ai/prompt/auto/auto-prompt-util.js:840 |
| `getNaiCharacterCardsForDirector` | js/ai/prompt/auto/character-card-manager.js:541 |
| `isBatchAcceptanceGateEnabled` | js/ai/prompt/auto/auto-prompt-util.js:835 |
| `isBatchAcceptancePassed` | js/ai/prompt/auto/auto-prompt-util.js:836 |
| `isBatchDirectorEnabled` | js/ai/prompt/auto/auto-prompt-util.js:834 |
| `loadPanelLayoutPrefs` | js/panel/layout-templates.js:384 |
| `mangaImportDirectorCurrentPage` | js/ai/manga-importer.js:2521 |
| `mangaImportGenerateWithNai` | js/ai/manga-importer.js:2523 |
| `mangaImportPickFiles` | js/ai/manga-importer.js:2519 |
| `mangaImportPreflightCurrentPage` | js/ai/manga-importer.js:2522 |
| `mangaImportRetagCurrentPage` | js/ai/manga-importer.js:2520 |
| `markBatchAcceptancePassed` | js/ai/prompt/auto/auto-prompt-util.js:837 |
| `naiBatchAcceptancePreviewPrompt` | js/ai/prompt/auto/auto-prompt-util.js:188 |
| `naiBatchAcceptancePreviewSignature` | js/ai/prompt/auto/auto-prompt-util.js:187 |
| `naiBatchConfirmAcceptance` | js/ai/prompt/auto/auto-prompt-util.js:833 |
| `naiBatchDirectorNeedsRun` | js/ai/prompt/auto/auto-prompt-util.js:831 |
| `naiBatchDirectorSetPrompts` | js/ai/prompt/auto/auto-prompt-util.js:830 |
| `naiBatchRunAcceptancePanel` | js/ai/prompt/auto/auto-prompt-util.js:832 |
| `naiDirectorAvailableModels` | js/ai/ai-settings.js:76 |
| `naiLastBatchAcceptanceSignature` | js/ai/prompt/auto/auto-prompt-util.js:203 |
| `naiLastBatchDirectorSignature` | js/ai/prompt/auto/auto-prompt-util.js:732 |
| `naiPsTool` | js/ui/visual-ps-tools.js:91 |
| `naiSpacePan` | js/ui/beginner-guide.js:440, js/ui/beginner-guide.js:446 |
| `noShowPrompt` | js/ui/ai/auto-prompt-ui.js:178 |
| `onerror` | js/core/global-error-handler.js:3 |
| `recommendPanelLayouts` | js/panel/layout-templates.js:386 |
| `renderPanelLayoutRecommendations` | js/panel/layout-templates.js:387 |
| `resetFlexGenSizeForPanels` | js/sidebar/panel/panel-template.js:241 |
| `runAllTests` | js/core/debug.js:403 |
| `setPanelPipelineStatus` | js/ai/prompt/auto/auto-prompt-util.js:845 |
| `showI2IPrompts` | js/ui/ai/auto-prompt-ui.js:177 |
| `showT2IPrompts` | js/ui/ai/auto-prompt-ui.js:176 |

## 行数の多いファイル（上位25）

| ファイル | 行数 | 用途 |
|---------|------|------|
| js/ai/comfyui/v2/comfyui-default-object-info.js | 10475 |  |
| js/ui/third/i18next.js | 4686 | "yyyyMMddHHmmss_SSS": { |
| index.html | 3102 |  |
| js/ai/manga-importer.js | 2524 |  |
| js/ai/comfyui/v2/comfyui_workflow/comfyui-t2i-default-workflows.js | 2005 |  |
| js/ai/prompt/novelai-composition-director.js | 1208 |  |
| js/simulator/simulator-studio.js | 1110 | 模拟器启动页与各类型单开工作区 |
| js/dashboard/dashboard-ui.js | 1060 | ダッシュボードUIコンポーネント（モーダル表示） |
| js/canvas-manager.js | 1006 |  |
| js/core/util/fabric-util.js | 941 |  |
| js/sidebar/speechBubble/speech-bubble-freehand.js | 868 |  |
| js/sidebar/pen/pen-tools.js | 855 |  |
| css/ui/dashboard.css | 853 | Dashboard Modal Overlay |
| js/ai/prompt/auto/auto-prompt-util.js | 846 | generatePageList(btmGetGuidsSize()); |
| js/core/util/image-util.js | 845 | image-util.js - Fabric.js画像オブジェクトの処理（変換、WebP、クロップ、反転、色変換など） |
| 99_server.py | 810 |  |
| css/simulator-chat.css | 790 | simulator-chat-area .simulator-chat-panel{ |
| js/sidebar/panel/panel-manager.js | 769 | function handleSelection(e) { |
| js/core/font/font-manager-core.js | 750 |  |
| js/ui/canvas-object-menu.js | 734 | Canvas object right-click context menu |
| js/ui/imagePromptHelper/image-prompt-helper.js | 730 |  |
| scripts/gen-project-index.cjs | 722 | プロジェクト索引の自動生成。 |
| js/layer/blend/blend.js | 719 | ブレンドモードUI - カテゴリ分類・プレビュー・適用処理 |
| js/project-management.js | 696 | Runtime image generation is NovelAI-only. Legacy provider modules may still |
| js/fabric/fabric-management.js | 694 |  |

## 再生成

```
npm run index
npm run check:index
```

`check:index` は生成結果と既存ファイルの差分を検知する。索引が古いと非ゼロ終了する。

## メンテナンス手順

1. 機能を追加・移動したら `npm run index` を実行する。
2. `npants` ではなく `npm run check:index` で差分ゼロを確認する。
3. 機能の入口が変わった場合は `llm_doc/feature-map.md` を手で直す（自動生成対象外）。
