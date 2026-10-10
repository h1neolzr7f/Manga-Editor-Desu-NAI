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
| .bat | 9 |
| .cjs | 59 |
| .css | 41 |
| .html | 9 |
| .js | 214 |
| .mjs | 2 |
| .ps1 | 3 |
| .py | 34 |
| シンボル | 10173 |
| DOM id 定義 | 634 |
| script 読み込み | 229 |
| stylesheet 読み込み | 43 |

## 除外ディレクトリ

.claude, .git, .github, 01_build, 02_images_svg, 03_images, 99_doc, __pycache__, assets, cdn-local, docs, font, installer, json_js, node_modules, roadmap, test, third, user_data, ロードマップ２, ロードマップ３_複数API対応

## 公開グローバル（root.X= / window.X=）

| グローバル | 定義 |
|-----------|------|
| `ComfyUIGuide` | js/ai/novelai-only-mode.js:121 |
| `MangaBubbleDetector` | js/ai/manga-bubble-detector.js:80 |
| `MangaCharacterBibleCore` | js/ai/manga-character-bible-core.js:60 |
| `MangaCharacterBibleUI` | js/ai/manga-character-bible-ui.js:220 |
| `MangaEditPlanner` | js/ai/manga-edit-planner.js:78 |
| `MangaEditPlannerUI` | js/ai/manga-edit-planner-ui.js:125 |
| `MangaGPTRegionEditor` | js/ai/gpt-region-editor.js:1465 |
| `MangaImporter` | js/ai/manga-importer.js:2518 |
| `MangaLamaInpaintUI` | js/ai/manga-lama-inpaint-ui.js:343 |
| `MangaModelRequest` | js/ai/manga-model-request.js:52 |
| `MangaPageStructure` | js/ai/manga-page-structure.js:273 |
| `MangaPageStructureUI` | js/ai/manga-page-structure-ui.js:390 |
| `MangaSmartTextCore` | js/ai/manga-smart-text-core.js:118 |
| `MangaSmartTextEditor` | js/ai/manga-smart-text-editor.js:511 |
| `MangaTextInkMask` | js/ai/manga-text-ink-mask.js:105 |
| `NaiBackgroundRemovalClient` | js/local-tools/background-removal-client.js:531 |
| `NaiBeginnerGuide` | js/ui/beginner-guide.js:503 |
| `NaiBrushPresets` | js/sidebar/pen/brush-presets.js:127 |
| `NaiCanvasView` | js/canvas-manager.js:962 |
| `NaiCharacterCards` | js/ai/prompt/auto/character-card-manager.js:535 |
| `NaiComicAssetBlobStore` | js/assets/asset-blob-store.js:69 |
| `NaiComicAssetLibraryController` | js/assets/asset-library-controller.js:293 |
| `NaiComicAssetManifest` | js/assets/asset-manifest.js:71 |
| `NaiComicAssetPack` | js/assets/asset-pack.js:22 |
| `NaiComicAssetScanner` | js/assets/asset-scanner.js:87 |
| `NaiComicAssetStore` | js/assets/asset-store.js:418 |
| `NaiComicAssetStoreDefault` | js/assets/asset-store.js:419 |
| `NaiComicBootGuard` | js/assets/boot-guard.js:42 |
| `NaiComicChatController` | js/simulator/chat-controller.js:364 |
| `NaiComicChatRenderer` | js/simulator/chat-renderer.js:368 |
| `NaiComicChatScene` | js/simulator/chat-scene.js:117 |
| `NaiComicExtraRendererFactory` | js/simulator/extra-renderer-factory.js:441 |
| `NaiComicExtraRendererRegistry` | js/simulator/extra-renderer-factory.js:469 |
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
| `NaiHistoryLoading` | js/layer/image-history-management.js:6, js/layer/image-history-management.js:218, js/layer/image-history-management.js:242, js/layer/image-history-management.js:247 |
| `NaiImage2Client` | js/assets/image2-client.js:92 |
| `NaiImage2Controller` | js/assets/image2-controller.js:16 |
| `NaiImage2JobStore` | js/assets/image2-job-store.js:33 |
| `NaiImage2JobStoreDefault` | js/assets/image2-job-store.js:34 |
| `NaiImage2ProviderRegistry` | js/assets/image2-client.js:91 |
| `NaiImage2UniqueName` | js/assets/image2-client.js:93 |
| `NaiLocalToolsClient` | js/local-tools/local-tools-client.js:96 |
| `NaiLocalToolsDefaultUrl` | js/local-tools/local-tools-client.js:97 |
| `NaiMangaPageSize` | js/core/manga-page-size.js:229 |
| `NaiPageLoading` | js/canvas-manager.js:1032, js/canvas-manager.js:1036, js/core/compression/project-compression.js:52, js/sidebar/panel/panel-template.js:10, js/sidebar/panel/panel-template.js:58, js/ui/bottom-bar.js:396, js/ui/bottom-bar.js:404, js/ui/bottom-bar.js:533, js/ui/bottom-bar.js:542 |
| `NaiPageStudio` | js/sidebar/page/page-studio.js:605 |
| `NaiPanelPipelineReview` | js/ai/panel-pipeline-review.js:208 |
| `NaiPngBitDepth` | js/core/util/png-bit-depth.js:563 |
| `NaiPsTools` | js/ui/visual-ps-tools.js:605 |
| `NaiScenePlanController` | js/ai/director/scene-plan-controller.js:64 |
| `NaiScenePlanSchema` | js/ai/director/scene-plan-schema.js:18 |
| `NaiScenePlanService` | js/ai/director/scene-plan-service.js:69 |
| `NaiSfxPalette` | js/sidebar/text/sfx-palette.js:139 |
| `NaiStatusFormat` | js/ai/nai-status-format.js:24 |
| `NaiVisualStudio` | js/ui/visual-studio.js:485 |
| `NovelAICompositionDirector` | js/ai/prompt/novelai-composition-director.js:1206 |
| `PANEL_LAYOUT_TEMPLATES` | js/panel/layout-templates.js:385 |
| `TestRunner` | js/core/debug.js:403 |
| `__naiBrushEvt` | js/ui/visual-studio.js:142 |
| `__naiBrushRaf` | js/ui/visual-studio.js:144, js/ui/visual-studio.js:145 |
| `_clipboard` | js/shortcut.js:102 |
| `appendNaiTagExampleFromPanel` | js/ai/prompt/auto/character-card-manager.js:543 |
| `appendNaiTagExampleToCard` | js/ai/prompt/auto/character-card-manager.js:542 |
| `applyChanges` | js/ui/prompt-manager.js:67 |
| `applyFlexGenSizeToPanels` | js/sidebar/panel/panel-template.js:247 |
| `applyPanelLayoutForCurrentPage` | js/panel/layout-templates.js:383 |
| `applyPanelLayoutTemplate` | js/panel/layout-templates.js:382 |
| `autoMultiGenerate` | js/ai/prompt/auto/auto-generation.js:104 |
| `autoMultiPromptSet` | js/ai/prompt/auto/auto-prompt-util.js:800 |
| `buildBatchPanelRoughPrompt` | js/ai/prompt/auto/auto-prompt-util.js:812 |
| `buildBatchStoryboardContext` | js/ai/prompt/auto/auto-prompt-util.js:815 |
| `buildCharacterCardsBrief` | js/ai/prompt/auto/auto-prompt-util.js:814 |
| `closePromptChangeFloatingWindow` | js/ui/prompt-manager.js:68 |
| `getBatchDirectorCharacterCards` | js/ai/prompt/auto/auto-prompt-util.js:813 |
| `getBatchDirectorSignature` | js/ai/prompt/auto/auto-prompt-util.js:810 |
| `getBatchDirectorUserPrompt` | js/ai/prompt/auto/auto-prompt-util.js:809 |
| `getBatchPanelSignature` | js/ai/prompt/auto/auto-prompt-util.js:811 |
| `getNaiCharacterCardsForDirector` | js/ai/prompt/auto/character-card-manager.js:541 |
| `isBatchAcceptanceGateEnabled` | js/ai/prompt/auto/auto-prompt-util.js:806 |
| `isBatchAcceptancePassed` | js/ai/prompt/auto/auto-prompt-util.js:807 |
| `isBatchDirectorEnabled` | js/ai/prompt/auto/auto-prompt-util.js:805 |
| `loadPanelLayoutPrefs` | js/panel/layout-templates.js:384 |
| `mangaImportDirectorCurrentPage` | js/ai/manga-importer.js:2521 |
| `mangaImportGenerateWithNai` | js/ai/manga-importer.js:2523 |
| `mangaImportPickFiles` | js/ai/manga-importer.js:2519 |
| `mangaImportPreflightCurrentPage` | js/ai/manga-importer.js:2522 |
| `mangaImportRetagCurrentPage` | js/ai/manga-importer.js:2520 |
| `markBatchAcceptancePassed` | js/ai/prompt/auto/auto-prompt-util.js:808 |
| `naiBatchAcceptancePreviewPrompt` | js/ai/prompt/auto/auto-prompt-util.js:188 |
| `naiBatchAcceptancePreviewSignature` | js/ai/prompt/auto/auto-prompt-util.js:187 |
| `naiBatchConfirmAcceptance` | js/ai/prompt/auto/auto-prompt-util.js:804 |
| `naiBatchDirectorNeedsRun` | js/ai/prompt/auto/auto-prompt-util.js:802 |
| `naiBatchDirectorSetPrompts` | js/ai/prompt/auto/auto-prompt-util.js:801 |
| `naiBatchRunAcceptancePanel` | js/ai/prompt/auto/auto-prompt-util.js:803 |
| `naiDirectorAvailableModels` | js/ai/ai-settings.js:77 |
| `naiLastBatchAcceptanceSignature` | js/ai/prompt/auto/auto-prompt-util.js:203 |
| `naiLastBatchDirectorSignature` | js/ai/prompt/auto/auto-prompt-util.js:732 |
| `naiPsTool` | js/ui/visual-ps-tools.js:91 |
| `naiSpacePan` | js/ui/beginner-guide.js:439, js/ui/beginner-guide.js:445 |
| `noShowPrompt` | js/ui/ai/auto-prompt-ui.js:169 |
| `onerror` | js/core/global-error-handler.js:3 |
| `recommendPanelLayouts` | js/panel/layout-templates.js:386 |
| `renderPanelLayoutRecommendations` | js/panel/layout-templates.js:387 |
| `resetFlexGenSizeForPanels` | js/sidebar/panel/panel-template.js:248 |
| `runAllTests` | js/core/debug.js:402 |
| `setPanelPipelineStatus` | js/ai/prompt/auto/auto-prompt-util.js:816 |
| `showI2IPrompts` | js/ui/ai/auto-prompt-ui.js:168 |
| `showT2IPrompts` | js/ui/ai/auto-prompt-ui.js:167 |

## 行数の多いファイル（上位25）

| ファイル | 行数 | 用途 |
|---------|------|------|
| js/ui/third/i18next.js | 5895 | exported changeLanguage, getText, getTranslation |
| index.html | 3078 |  |
| js/ai/manga-importer.js | 2524 |  |
| js/ai/gpt-region-editor.js | 1469 | Manga-NAI-GPT: isolated, non-destructive image editing surface. |
| scripts/gpt-browser-acceptance.cjs | 1283 | Real headless Chromium acceptance test against the actual HTML/Fabric runtime. |
| js/ai/prompt/novelai-composition-director.js | 1207 |  |
| 99_server.py | 1176 |  |
| js/simulator/simulator-studio.js | 1110 | 模拟器启动页与各类型单开工作区 |
| scripts/novice-task-e2e.cjs | 1083 | Novice full-task acceptance (docs/GROK_BOT_FINAL_DELIVERY.md §4): a new user, no docs, real Chromium, |
| js/canvas-manager.js | 1066 | exported aspectRatio, changeView, forcedAdjustCanvasSize, initResizeCanvas, inputImageFile, resizeCanvas, resizeCanvasToObject |
| js/dashboard/dashboard-ui.js | 1058 | exported openDashboardModal |
| js/sidebar/speechBubble/speech-bubble-freehand.js | 894 | exported activePoint, clearJSTSGeometry, createJSTSPolygon, createSpeechBubble, deletePoint, freehandBubbleTextChanged, isDrawing, isNearStartPoint, lastRenderTime, mergeOverlappingShapes, processPoints, sbFreehandTextChange, selectedObject, updateFreehandBubblePositions, updateJSTSGeometry, updateShape, updateTemporaryShapes |
| js/sidebar/pen/pen-tools.js | 856 | exported finalizeGroup, selectEraserTool, selectMarqueeTool |
| js/core/util/image-util.js | 855 | exported blobUrlToDataUrl, clipCopy, createCanvasFromFabricImage, cropAndDownload, cropImage, enhanceDarkImage, estimateExportSize, exportCanvasDataURL, exportDataUrlByteLength, flipHorizontally, flipVertically, formatByteSize, getCropAndDownloadLink, getCropAndDownloadLinkByMultiplier, getHeight, getLink, getWidth, hexToRgba, imageObject2Base64ImageEffectKeep, imageObject2DataURL, imageObject2DataURLByCrop, imgFile2webpFile, normalizeExportQuality, resolveExportBackground, resolveExportBitDepth, resolveExportFormat, resolveExportMultiplier, resolveExportMultiplierForDpi, rgbToHex, rgbaToHex, sendHtmlCanvas2FabricCanvas |
| css/ui/dashboard.css | 853 | Dashboard Modal Overlay |
| js/core/util/fabric-util.js | 832 | exported avtive, copy, createGUIDMap, deepCopy, fitImageToCanvas, getCanvasGUID, getCenterXByFabricObject, getCenterYByFabricObject, getImageObjectList, getLastObject, getObjectCount, getObjectList, getPointAtDistance, getRandomPanel, haveClipPath, initMessage, initMessageText, isGroup, isHorizontalText, isLayerPreview, isLine, isPanelType, isPath, isShapes, isSpeechBubbleSVG, isSpeechBubbleText, isText, isVerticalText, removeClipPath, removeGUID, replaceGuids, setGUID |
| js/ai/prompt/auto/auto-prompt-util.js | 817 | generatePageList(btmGetGuidsSize()); |
| css/simulator-chat.css | 790 | simulator-chat-area .simulator-chat-panel{ |
| js/core/font/font-manager-core.js | 751 | exported fontClassName, fontInit |
| js/sidebar/panel/panel-manager.js | 742 | exported Edit, changePanelFillColor, changePanelOpacity, changePanelStrokeColor, changePanelStrokeWidth, initialPutImage, isWithin, loadSVGPlusReset, panelAllChange, replaceImageObject, setPanelValue |
| js/project-management.js | 731 | exported findCanvasGuid, getDataByName, localSettingsData, resetAllSettings |
| scripts/gen-project-index.cjs | 722 | プロジェクト索引の自動生成。 |
| js/ui/imagePromptHelper/image-prompt-helper.js | 716 | exported iphGetSelectedTagsText, iphInitializeUI |
| js/fabric/fabric-management.js | 712 | exported lastActiveObjectState, moveSettings |
| js/ui/canvas-object-menu.js | 712 | Canvas object right-click context menu |

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
