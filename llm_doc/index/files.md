# ファイル索引

`scripts/gen-project-index.cjs` の自動生成。手で編集しない。

- 用途はファイル先頭のコメントからのみ抽出する。取れない場合は空欄（推測で埋めない）
- 除外: node_modules, .git, user_data, __pycache__, .claude, .github, test, third, json_js, 01_build, 02_images_svg, 03_images, 99_doc, font, roadmap, docs, installer, assets, cdn-local, ロードマップ２, ロードマップ３_複数API対応

| ファイル | 行数 | 用途 |
|---------|------|------|
| 99_generate_nai_assets.bat | 6 |  |
| 99_server.bat | 4 |  |
| 99_server.py | 1161 |  |
| 99_test_nai_pipeline.bat | 16 |  |
| css/common.css | 222 |  |
| css/components.css | 350 |  |
| css/controls-mini.css | 568 |  |
| css/core/main-component.css | 406 |  |
| css/css2.css | 23 | Bundled locally so icons work offline and where Google Fonts is unreachable; remote copy is only a fallback. |
| css/cutout-brush.css | 43 |  |
| css/form.css | 335 |  |
| css/gpt-region-editor.css | 48 | Optional GPT tools: isolated styles so legacy canvas layout stays intact. |
| css/icon.css | 55 | Bundled locally so icons work offline and where Google Fonts is unreachable; remote copy is only a fallback. |
| css/image-control-manager.css | 100 |  |
| css/layout-layer.css | 372 |  |
| css/layout.css | 528 |  |
| css/manga-character-bible.css | 32 | Private character reference library. |
| css/manga-lama-inpaint.css | 22 | Non-destructive local LaMa preview and explicit confirmation. |
| css/manga-page-structure.css | 75 | Local page-structure inspector. Rectangles are read-only DOM overlays. |
| css/manga-smart-text.css | 37 | Local OCR / editable manga text panel; no external visual framework. |
| css/responsive.css | 144 | Responsive breakpoints for main layout structure |
| css/root.css | 400 |  |
| css/simulator-chat.css | 790 | simulator-chat-area .simulator-chat-panel{ |
| css/styles-css.css | 36 |  |
| css/tagify.css | 42 |  |
| css/tippy.css | 31 |  |
| css/toast.css | 131 |  |
| css/ui/blend.css | 430 | blendFloatingWindow { |
| css/ui/bottom-bar.css | 386 |  |
| css/ui/custom-html-components.css | 110 | input, select, textarea { |
| css/ui/dashboard.css | 853 | Dashboard Modal Overlay |
| css/ui/floating-window.css | 45 |  |
| css/ui/font-manager.css | 339 | styles.css |
| css/ui/image-prompt-helper.css | 592 |  |
| css/ui/intro.css | 76 |  |
| css/ui/mode-change.css | 51 |  |
| css/ui/object-menu.css | 161 |  |
| css/ui/overlay-progress.css | 14 |  |
| css/ui/role-assign-modal.css | 16 |  |
| css/ui/share.css | 153 | Decorative web fonts are no longer fetched from Google at startup (blocked in some regions, adds a failed request); the system sans-serif fallback is used. |
| css/ui/shortcut-modal.css | 16 |  |
| css/ui/tutorial.css | 372 |  |
| css/ui/unified-settings.css | 82 |  |
| css/visual-studio.css | 399 |  |
| gpt_image_proxy.py | 394 |  |
| html/Minual/03_xxx2webp.bat | 20 |  |
| html/Minual/03_xxx2webp_50%.bat | 17 |  |
| html/Minual/SB/st/03_xxx2webp.bat | 20 |  |
| html/Minual/custom-speechBubble.html | 134 |  |
| html/Minual/custom-text.html | 38 |  |
| html/Minual/effect.html | 159 |  |
| html/Minual/screen-tone.html | 228 |  |
| html/PrivacyPolicy/i18n-privacy-dark-complete.html | 165 |  |
| html/Shortcut/shortcut.html | 210 |  |
| html/TermsOfService/terms-of-service.html | 120 |  |
| html/common.css | 343 |  |
| html/functionList.html | 321 |  |
| index.html | 3079 |  |
| js/ai/ai-management.js | 115 | exported I2I, T2I, apiHeartbeat, clearAllQueues, existsWaitQueue |
| js/ai/ai-settings.js | 422 |  |
| js/ai/director/scene-plan-controller.js | 66 |  |
| js/ai/director/scene-plan-schema.js | 19 |  |
| js/ai/director/scene-plan-service.js | 70 |  |
| js/ai/gpt-region-editor.js | 1156 | Manga-NAI-GPT: isolated, non-destructive image editing surface. |
| js/ai/manga-bubble-detector.js | 81 | Conservative local bubble-candidate detector. |
| js/ai/manga-character-bible-core.js | 64 | Character Bible data contract (own implementation). |
| js/ai/manga-character-bible-ui.js | 224 | Private, browser-local character reference cards. |
| js/ai/manga-edit-planner-ui.js | 126 | Natural-language *plan* preview. Deterministic parser, no cloud calls. |
| js/ai/manga-edit-planner.js | 79 | Editable plan, not an AI semantic parser. |
| js/ai/manga-importer.js | 2524 |  |
| js/ai/manga-lama-inpaint-ui.js | 344 | Optional local masked inpainting: preview first, commit as editable Fabric image layer. |
| js/ai/manga-model-request.js | 44 | Shared POST helper for the optional local models (Tesseract, Manga OCR, LaMa). |
| js/ai/manga-page-structure-ui.js | 391 | Manga page structure inspector: Fabric snapshot -> sampled pixels -> reviewable panels. |
| js/ai/manga-page-structure.js | 276 | Manga page structure v1: deterministic, low-cost XY-cut candidates. |
| js/ai/manga-smart-text-core.js | 90 | Shared, dependency-free geometry and light-bubble erase rules. |
| js/ai/manga-smart-text-editor.js | 495 | Smart manga lettering workflow. |
| js/ai/manga-text-ink-mask.js | 106 | Conservative dark-ink proposal for a user-selected TEXT rectangle. |
| js/ai/nai-status-format.js | 25 | Human-readable NovelAI subscription status for the "检查 NAI" toast. |
| js/ai/novelai-only-mode.js | 132 |  |
| js/ai/panel-pipeline-review.js | 223 | 分镜流水线状态 + 生图后人工审阅 |
| js/ai/prompt/auto/auto-generation.js | 105 |  |
| js/ai/prompt/auto/auto-prompt-util.js | 817 | generatePageList(btmGetGuidsSize()); |
| js/ai/prompt/auto/character-card-manager.js | 544 |  |
| js/ai/prompt/auto/prompt-map.js | 193 |  |
| js/ai/prompt/auto/story-prompt-map.js | 107 | exported getEarlyForeplayScenarioPromptNumbers, getEjaculationScenarioPromptNumbers, getLateForeplayScenarioPromptNumbers, getLateSexScenarioPromptNumbers, getOpeningScenarioPromptNumbers, getSexAfterScenarioPromptNumbers, getSexScenarioPromptNumbers, getSoloScenarioPromptNumbers |
| js/ai/prompt/base-event-listener.js | 9 |  |
| js/ai/prompt/director-safety.js | 29 | Director (third-party LLM gateway) credential safety. |
| js/ai/prompt/novelai-composition-director.js | 1214 |  |
| js/ai/provider/ai-provider.js | 53 | exported AIProvider |
| js/ai/provider/novelai-provider.js | 581 | NovelAI provider: direct browser call to the official image API. |
| js/ai/provider/provider-registry.js | 101 | exported providerRegistry |
| js/ai/queue/generation-task-manager.js | 303 | exported applyGeneratedImageToOriginalPage, getAiTask, getAiTasksForLayer, isPageChanged, registerAiTask, registerGenerationTask, removeAiTask, updateAiTaskCancelInfo, updateAiTaskStatus |
| js/ai/queue/spinner.js | 98 | exported createSpinner, removeSpinner, renderAiTaskIndicators, setCurrentAiTask |
| js/ai/queue/task-queue.js | 90 | exported TaskQueue |
| js/ai/role/ai-roles.js | 35 | exported hasNotRole, roles |
| js/ai/role/role-assignment-ui.js | 79 | exported roleAssignmentUI |
| js/ai/ui/ai-ui-util.js | 9 | exported updateWorkflowType |
| js/ai/ui/unified-settings-window.js | 39 | exported unifiedSettingsWindow |
| js/assets/asset-blob-store.js | 70 |  |
| js/assets/asset-library-controller.js | 295 |  |
| js/assets/asset-manifest.js | 79 |  |
| js/assets/asset-pack.js | 23 |  |
| js/assets/asset-scanner.js | 94 |  |
| js/assets/asset-store.js | 414 |  |
| js/assets/boot-guard.js | 47 |  |
| js/assets/github-free-pack.js | 82 |  |
| js/assets/image2-client.js | 40 |  |
| js/assets/image2-controller.js | 18 |  |
| js/assets/image2-job-store.js | 15 |  |
| js/assets/original-starter-pack.js | 107 |  |
| js/assets/site-ui-pack.js | 86 |  |
| js/canvas-manager.js | 1016 | exported aspectRatio, changeView, forcedAdjustCanvasSize, initResizeCanvas, inputImageFile, resizeCanvas, resizeCanvasToObject |
| js/core/auto-save.js | 254 | exported AutoSaveManager |
| js/core/compression/lz4.js | 226 |  |
| js/core/compression/project-compression.js | 328 | exported btmSaveProjectFile, loadLz4BlobProjectFile, multiLoadLz4, multiLoadZip, openFirstLoadedPageIfCanvasEmpty, processZip |
| js/core/debug.js | 403 | exported DEBUG_FLAGS |
| js/core/font/font-dropdown.js | 295 |  |
| js/core/font/font-manager-core.js | 751 | exported fontClassName, fontInit |
| js/core/global-error-handler.js | 17 | グローバルエラーハンドラ（未キャッチのエラーとPromise rejectionを検知） |
| js/core/logger.js | 198 | exported _dbgFabric, _dbgLogger, autoSaveLogger, canvasLogger, compressionLogger, dashboardLogger, dashboardPerfLogger, dashboardTagLogger, dbLogger, delegatorLogger, effectLogger, errorHandlerLogger, eventLogger, focusTrapLogger, fontLogger, freehandBubbleLogger, generationTaskLogger, imageLogger, layerLogger, logger, panelLogger, perfLogger, projectLogger, raLogger, registryLogger, serviceLogger, simulatorStudioLogger, spinnerLogger, textLogger, tutorialLogger, uiLogger, workflowLogger |
| js/core/manga-page-size.js | 257 | exported base |
| js/core/service/worker-register.js | 116 | exported clearCache |
| js/core/settings.js | 164 | exported basePrompt, commonProperties, i2iInit, jsColorSetById, minCanvasSizeHeight, minCanvasSizeWidth, svgPagging, syncJsColorFromInputs, t2iInit, webpQuality |
| js/core/svg/google-icon-helper.js | 230 | exported searchIcon, updateSVGStyles |
| js/core/svg/google-icon-names.js | 13 | exported iconList, initialIcons |
| js/core/util/anime-util.js | 11 |  |
| js/core/util/array-buffer-utils.js | 54 | exported ArrayBufferUtils |
| js/core/util/fabric-text-focus.js | 74 | fabric の IText / Textbox は、入力用の 1px の textarea を |
| js/core/util/fabric-util.js | 866 | exported avtive, canvas, copy, createGUIDMap, deepCopy, fitImageToCanvas, getCanvasGUID, getCenterXByFabricObject, getCenterYByFabricObject, getImageObjectList, getLastObject, getObjectCount, getObjectList, getPointAtDistance, getRandomPanel, haveClipPath, initMessage, initMessageText, isGroup, isHorizontalText, isLayerPreview, isLine, isPanelType, isPath, isShapes, isSpeechBubbleSVG, isSpeechBubbleText, isText, isVerticalText, removeClipPath, removeGUID, replaceGuids, setGUID, tolerance |
| js/core/util/html-canvas-util.js | 92 | exported createClippedCanvas, createOffscreenCanvas, createScaledCanvas, enhanceDarkRegionsCPU, findNonTransparentBounds, renderLayerToCanvas |
| js/core/util/image-analyzer-util.js | 122 | exported createGrid, findLargestRectangle |
| js/core/util/image-util.js | 847 | exported blobUrlToDataUrl, clipCopy, createCanvasFromFabricImage, cropAndDownload, cropImage, enhanceDarkImage, estimateExportSize, exportCanvasDataURL, exportDataUrlByteLength, flipHorizontally, flipVertically, formatByteSize, getCropAndDownloadLink, getCropAndDownloadLinkByMultiplier, getHeight, getLink, getWidth, hexToRgba, imageObject2Base64ImageEffectKeep, imageObject2DataURL, imageObject2DataURLByCrop, imgFile2webpFile, normalizeExportQuality, resolveExportBackground, resolveExportBitDepth, resolveExportFormat, resolveExportMultiplier, resolveExportMultiplierForDpi, rgbToHex, rgbaToHex, sendHtmlCanvas2FabricCanvas |
| js/core/util/js-util.js | 21 | exported generateRandomInt, getRandomNumber |
| js/core/util/load-util.js | 95 | exported loadImage, loadJS, loadVideo |
| js/core/util/log-util.js | 2 |  |
| js/core/util/png-bit-depth.js | 583 | png-bit-depth.js - PNG のビット深度変換（グレースケール / 24bit RGB / 32bit ARGB）を行うブラウザ向けエンコーダ |
| js/core/util/share-util.js | 1 |  |
| js/dashboard/dashboard-ui.js | 1058 | exported openDashboardModal |
| js/dashboard/performance-storage.js | 610 | exported keys |
| js/dashboard/prompt-frequency-storage.js | 195 | exported PromptFrequencyStorage |
| js/db/user-font-repository.js | 84 | exported fmFontRepository |
| js/fabric/fabric-management.js | 695 | exported lastActiveObjectState, moveSettings |
| js/layer/blend/blend.js | 698 | exported addFillLayer, addGradientLayer, handleBlend |
| js/layer/floating-window-management.js | 81 | exported isNotVisibleFloatingWindow, makeDraggable |
| js/layer/image-history-management.js | 359 | exported confirmAllRemove, convertImageMapBlobUrls, initImageHistory, jumpToHistoryIndex, lastRedo, redo, removeByNotSave, saveStateByListener, setNotSave, undo |
| js/layer/layer-button.js | 95 | exported putActionBarSeparator, putActionButton, putDeleteButton, putMoveLockButton, putRembgButton, putViewButton |
| js/layer/layer-management.js | 541 | exported LayersDown, LayersUp, calculateCenter, highlightClear, removeLayer |
| js/local-tools/background-removal-client.js | 545 |  |
| js/local-tools/cutout-presets.js | 107 |  |
| js/local-tools/local-tools-client.js | 98 |  |
| js/panel/grid.js | 138 | exported debounceSnapToGrid |
| js/panel/layout-templates.js | 388 | 常见漫画分镜模板（直线切分，可后期手调刀线） |
| js/panel/random-cut.js | 136 |  |
| js/project-management.js | 713 | exported findCanvasGuid, getDataByName, localSettingsData, resetAllSettings |
| js/shortcut.js | 538 | simple check if the user is using a mac os , not the best way to detect the OS |
| js/sidebar/effect/c2bw_tone.js | 92 | exported C2BWStartDark, C2BWStartLight, C2BWStartRough, C2BWStartSimple |
| js/sidebar/effect/c2c.js | 123 | exported C2CStart |
| js/sidebar/effect/effect-manager.js | 228 | exported switchMangaEffect |
| js/sidebar/page/page-studio.js | 628 |  |
| js/sidebar/panel/knife/knife-constants.js | 56 | exported KNIFE_CONSTANTS |
| js/sidebar/panel/knife/knife-geometry.js | 261 | exported calculateIntersection, calculatePolygonCentroid, getIntersectionByDistance, getPolygonAtPoint, isHorizontal, isSplitPoint, removeDuplicates |
| js/sidebar/panel/knife/knife-index.js | 20 | knife-index.js |
| js/sidebar/panel/knife/knife-line-renderer.js | 175 | exported drawLine |
| js/sidebar/panel/knife/knife-mode.js | 81 | knife-mode.js |
| js/sidebar/panel/knife/knife-split-engine.js | 520 | exported blindSplitPanel, guidedSplitPanel, strokeWidthScale |
| js/sidebar/panel/knife/knife-state.js | 20 | exported currentKnifeLine, currentKnifeObject, knifeAssistAngle, knifeLineAnimationId, knifeLineDashOffset, startKnifeX, startKnifeY |
| js/sidebar/panel/panel-manager.js | 746 | exported Edit, changePanelFillColor, changePanelOpacity, changePanelStrokeColor, changePanelStrokeWidth, initialPutImage, isWithin, loadSVGPlusReset, panelAllChange, replaceImageObject, setPanelValue |
| js/sidebar/panel/panel-template.js | 405 | exported addHeart, addHexagon, addPentagon, addSquare, addStar, addTallRect, addTriangle, addWideRect, ensurePanelForKnife |
| js/sidebar/pen/brush-presets.js | 138 |  |
| js/sidebar/pen/custom-brush.js | 274 |  |
| js/sidebar/pen/fabric/brushes/crayon_brush.js | 120 | CrayonBrush class |
| js/sidebar/pen/fabric/brushes/drip.js | 77 | Drip class |
| js/sidebar/pen/fabric/brushes/ink_brush.js | 155 | InkBrush class |
| js/sidebar/pen/fabric/brushes/marker_brush.js | 96 | MarkerBrush class |
| js/sidebar/pen/fabric/brushes/spray_brush.js | 116 | SprayBrush class |
| js/sidebar/pen/fabric/brushes/stroke.js | 63 | Stroke class |
| js/sidebar/pen/fabric/fabric-brush.min.js | 19 |  |
| js/sidebar/pen/original-brush.js | 482 | exported enhanceBrush |
| js/sidebar/pen/pen-tools.js | 856 | exported finalizeGroup, selectEraserTool, selectMarqueeTool |
| js/sidebar/sidebar-ui.js | 212 | exported addAlignTypeButton, addCheckBox, addColor, addDropDownByDot, addDropDownByGrad, addDropDownBySpeedLine, addDropDownByStyle, addOrientationButton, addSimpleSubmitButton, addSlider, addTextArea, saveEffectValueMap, saveValueMap |
| js/sidebar/sidebar.js | 119 | exported switchTemplateOrientation |
| js/sidebar/speechBubble/speech-bubble-effect.js | 305 | exported getSpeechBubbleTextFill, lazyLoadSvgData |
| js/sidebar/speechBubble/speech-bubble-freehand.js | 869 | exported activePoint, clearJSTSGeometry, createJSTSPolygon, createSpeechBubble, deletePoint, freehandBubbleTextChanged, isDrawing, isNearStartPoint, lastRenderTime, mergeOverlappingShapes, processPoints, sbFreehandTextChange, scaleX, scaleY, selectedObject, updateFreehandBubblePositions, updateJSTSGeometry, updateShape, updateTemporaryShapes |
| js/sidebar/speechBubble/speech-bubble-text.js | 454 | exported createSpeechBubbleMetrics, customSpeechBubbleAllRelocation, fontSize, parseSvg, sbTextChange, textFrameScaling, updateObjectPositions |
| js/sidebar/text/custom/custom-text-util.js | 33 | exported baseStylesDefault, createFilterElement, getFirstNCharsDefault |
| js/sidebar/text/custom/optimized-aurora-text.js | 128 | exported gradients, rects, t2_aurora_updateAll |
| js/sidebar/text/custom/optimized-broken-text.js | 138 | exported t2_broken_updateAll |
| js/sidebar/text/custom/optimized-cloud-text.js | 142 | exported t2_cloud_updateAll |
| js/sidebar/text/custom/optimized-layered-text.js | 102 | exported t2_layered_updateAll |
| js/sidebar/text/custom/optimized-mesh-text.js | 143 | exported t2_mesh_updateAll |
| js/sidebar/text/custom/optimized-scratch-text.js | 145 | exported t2_scratch_updateAll |
| js/sidebar/text/custom/optimized-shadow-text.js | 169 | exported filterElements, t2_shadow_updateAll |
| js/sidebar/text/custom/optimized-thrill-text.js | 135 | exported t2_thrill_updateAll |
| js/sidebar/text/custom/optimized-wild-text.js | 124 | exported t2_wild_updateAll |
| js/sidebar/text/custom/optimized-zebra-text.js | 142 | exported t2_zebra_updateAll |
| js/sidebar/text/sfx-palette.js | 148 |  |
| js/sidebar/text/text-2-manager.js | 402 | exported switchText2 |
| js/sidebar/text/text-effect.js | 319 | exported alignText, changeFontSize, changeOutlineTextColor, changeStrokeWidthSize, changeTextBgColor, changeTextColor, createTextbox, toggleBoldWithUI, updateTextControls |
| js/sidebar/text/vertical-text.js | 37 |  |
| js/sidebar/text/vertical-textbox.js | 586 |  |
| js/sidebar/tone/focusline.js | 230 | exported addFCEventListener, focusLineEnd, focusLineStart, lines |
| js/sidebar/tone/rain-tone.js | 107 | exported addRainToneEventListener, rainToneEnd, rainToneStart |
| js/sidebar/tone/snow-tone.js | 182 | exported addSnowToneEventListener, snowToneEnd, snowToneStart |
| js/sidebar/tone/speedline.js | 168 | exported addSppedLineEventListener, speedLineEnd, speedLineStart |
| js/sidebar/tone/tone-manager.js | 402 | exported convertToSVG, mangaToneRequireTarget, parseColor, switchMangaTone |
| js/sidebar/tone/tone-noise.js | 146 | exported addToneNoiseEventListener, toneNoiseEnd, toneNoiseStart |
| js/sidebar/tone/tone.js | 221 | exported addToneEventListener, toneEnd, toneStart |
| js/simulator/chat-controller.js | 367 |  |
| js/simulator/chat-renderer.js | 373 |  |
| js/simulator/chat-scene.js | 128 |  |
| js/simulator/extra-renderer-factory.js | 470 |  |
| js/simulator/longshot-exporter.js | 45 |  |
| js/simulator/page-edit-controller.js | 84 |  |
| js/simulator/playback-controller.js | 103 |  |
| js/simulator/renderers/danmaku-player-renderer.js | 81 |  |
| js/simulator/renderers/forum-renderer.js | 10 |  |
| js/simulator/renderers/image-board-renderer.js | 69 |  |
| js/simulator/renderers/livestream-renderer.js | 10 |  |
| js/simulator/renderers/phone-renderer.js | 35 |  |
| js/simulator/renderers/social-feed-renderer.js | 10 |  |
| js/simulator/renderers/video-tube-renderer.js | 75 |  |
| js/simulator/renderers/visual-novel-renderer.js | 145 |  |
| js/simulator/scene-serializer.js | 32 |  |
| js/simulator/simulator-controller.js | 123 |  |
| js/simulator/simulator-studio.js | 1110 | 模拟器启动页与各类型单开工作区 |
| js/simulator/site-ui-parts.js | 330 |  |
| js/simulator/story-adapters.js | 423 |  |
| js/simulator/story-composer-controller.js | 353 |  |
| js/simulator/story-engine.js | 295 |  |
| js/simulator/story-to-manga.js | 182 |  |
| js/simulator/template-registry.js | 260 |  |
| js/simulator/timeline.js | 37 |  |
| js/svg/manga-panels-image-landscape.js | 31 | exported MangaPanelsImage_Landscape |
| js/svg/manga-panels-image-vertical.js | 44 | exported MangaPanelsImage_Vertical |
| js/svg/speechbubble.js | 51 | exported SpeechBubble |
| js/ui/ai/auto-prompt-ui.js | 170 |  |
| js/ui/beginner-guide.js | 523 |  |
| js/ui/bottom-bar.js | 462 | {guid, { imageLink, blob }} blob is lz4 |
| js/ui/canvas-object-menu.js | 715 | exported pointer |
| js/ui/control/common-control-management.js | 61 | exported updateControls |
| js/ui/control/glfx-control.js | 457 | exported glfxAddEvent, glfxApplyNoReset |
| js/ui/control/image-control-manager.js | 14 |  |
| js/ui/control/information-control.js | 61 | exported updateCoordinates |
| js/ui/custom-html-component.js | 100 |  |
| js/ui/font/user-font-manager.js | 145 | exported fmUserFontManager |
| js/ui/glfx-ui.js | 237 | exported gpifHTML, setGlfxI18NextLabel |
| js/ui/imagePromptHelper/hc-image-prompt-helper.js | 37 | exported iphHtmlContent |
| js/ui/imagePromptHelper/image-prompt-helper.js | 731 | exported iphGetSelectedTagsText, iphInitializeUI |
| js/ui/imagePromptHelper/prompt-helper.js | 209 | exported createImagePromptHelperFlotingWindow |
| js/ui/overlay-progress.js | 86 | exported OP_hideLoading, OP_isCancelled, OP_showLoading |
| js/ui/prompt-manager.js | 64 | exported openPromptChangeFloatingWindow |
| js/ui/third/base-translation/base-de.js | 563 |  |
| js/ui/third/base-translation/base-en.js | 578 |  |
| js/ui/third/base-translation/base-es.js | 555 |  |
| js/ui/third/base-translation/base-fr.js | 572 |  |
| js/ui/third/base-translation/base-ja.js | 568 |  |
| js/ui/third/base-translation/base-ko.js | 570 |  |
| js/ui/third/base-translation/base-ru.js | 556 |  |
| js/ui/third/base-translation/base-zh.js | 605 | exported base_zh |
| js/ui/third/i18next.js | 5751 | exported changeLanguage, getText, getTranslation |
| js/ui/third/intro.js | 0 |  |
| js/ui/third/tippy.js | 95 | exported addTooltipByElement, setLanguage |
| js/ui/toast.js | 120 | exported checkActiveImage, createToast, lineHeight |
| js/ui/tutorial.js | 429 |  |
| js/ui/util/event-delegator.js | 94 | event-delegator.js - document-level event delegation utility |
| js/ui/util/focus-trap.js | 85 | focus-trap.js - モーダル用フォーカストラップユーティリティ |
| js/ui/util/mode-change.js | 172 | exported MODE_PEN_CIRCLE, MODE_PEN_CRAYON, MODE_PEN_CUSTOM, MODE_PEN_ERASER, MODE_PEN_HLINE, MODE_PEN_INK, MODE_PEN_MARKER, MODE_PEN_MOSAIC, MODE_PEN_OUTLINE, MODE_PEN_PENCIL, MODE_PEN_TEXTURE, MODE_PEN_VLINE, completeCrop, getCssValue, hideCanvasHelpText, isKnifeDrawing, isKnifeMode, isMosaicBrushActive, nowPencil, startCutoutRegionMode |
| js/ui/util/mode-manager.js | 417 | exported activeClearButton, changeCursor, changeDefaultCursor, changeObjectCursor, cropModeClear, knifeModeClear, nonActiveClearButton, operationModeClear, pencilModeClear |
| js/ui/util/tagify-util.js | 95 |  |
| js/ui/util/ui-util.js | 68 | exported changeHiddenById, changeSelected, getSelectedValueByButton, getSelectedValueByGroup, hideById, selectedById, showById, unSelectedById |
| js/ui/visual-ps-tools.js | 630 |  |
| js/ui/visual-studio.js | 491 |  |
| local_tools/cutout.py | 167 |  |
| local_tools/model_manager.py | 207 |  |
| local_tools/processors/__init__.py | 1 |  |
| local_tools/server.py | 340 |  |
| manga_lama_inpaint.py | 153 |  |
| manga_model_guard.py | 86 |  |
| manga_ocr_preclean.py | 139 |  |
| manga_ocr_refiner.py | 88 |  |
| manga_smart_ocr.py | 256 |  |
| scripts/MangaMakerUI.py | 64 |  |
| scripts/asset-library-smoke-test.cjs | 113 |  |
| scripts/beginner-ux-guards-test.cjs | 46 | Beginner UX guards: destructive "clear canvas" asks first, zh menu labels match the |
| scripts/check-translations.cjs | 227 | Translation key validation script - compares keys across all languages in i18next resources |
| scripts/custom-brush-smoke-test.cjs | 44 |  |
| scripts/cutout-color-key-smoke-test.py | 36 |  |
| scripts/cutout-presets-smoke-test.cjs | 34 |  |
| scripts/fabric-text-focus-smoke-test.cjs | 145 | fabric の編集用 textarea がスクロールを起こさないことを検証する。 |
| scripts/full-feature-e2e.cjs | 440 | Full-feature end-to-end walk-through in real Chromium against the real 99_server.py. |
| scripts/gen-project-index.cjs | 722 | プロジェクト索引の自動生成。 |
| scripts/generate-original-starter-svgs.cjs | 326 |  |
| scripts/generate-site-ui-svgs.cjs | 391 |  |
| scripts/gpt-browser-acceptance.cjs | 1180 | Real headless Chromium acceptance test against the actual HTML/Fabric runtime. |
| scripts/gpt-http-integration-test.py | 205 |  |
| scripts/gpt-image-proxy-smoke-test.py | 204 |  |
| scripts/gpt-panel-i18n-test.cjs | 53 | Regression: every mgpt_* key used by the GPT region editor exists in all 8 i18next |
| scripts/gpt-panel-line-protect-test.cjs | 58 | Regression: GPT region edits must not erase panel borders / gutters inside the selection. |
| scripts/gpt-proxy-network-guard-test.py | 160 |  |
| scripts/gpt-real-api-acceptance.cjs | 321 | OPT-IN, BILLABLE real-API acceptance for the GPT region editor (never part of npm test / CI). |
| scripts/gpt-region-editor-smoke-test.cjs | 315 | Offline UI smoke test: verifies the standalone editor parses and maps CSS pixels. |
| scripts/image-export-integration-test.cjs | 324 | 位深度と画素プレビューの統合テスト。 |
| scripts/image-export-smoke-test.cjs | 433 |  |
| scripts/image2-interface-smoke-test.cjs | 19 |  |
| scripts/import-image-keeps-page-test.cjs | 25 | Regression: File > Import image on a page that only had a manga template resized the |
| scripts/layout-smoke-test.cjs | 201 |  |
| scripts/lib-top-level-functions.cjs | 56 | Dependency-free: names of top-level `function name(` declarations in a classic script. |
| scripts/local-secret-guard-test.py | 261 |  |
| scripts/local-tools-origin-test.py | 179 |  |
| scripts/make-one-click-zip.ps1 | 63 | Build a beginner zip without git history, secrets, or machine caches. |
| scripts/manga-bubble-detector-test.cjs | 46 |  |
| scripts/manga-character-bible-test.cjs | 24 |  |
| scripts/manga-edit-planner-test.cjs | 67 |  |
| scripts/manga-import-smoke-test.cjs | 169 |  |
| scripts/manga-lama-inpaint-test.py | 64 |  |
| scripts/manga-lama-pixel-test.py | 92 |  |
| scripts/manga-model-guard-test.py | 161 |  |
| scripts/manga-ocr-preclean-test.py | 119 | !/usr/bin/env python3 |
| scripts/manga-ocr-refiner-test.py | 94 |  |
| scripts/manga-page-size-smoke-test.cjs | 47 |  |
| scripts/manga-page-structure-test.cjs | 116 | Red/green contract: inspect page pixels, split only credible gutters and |
| scripts/manga-real-model-acceptance.py | 133 | !/usr/bin/env python3 |
| scripts/manga-real-ui-acceptance.cjs | 160 | REAL (unmocked) Chromium acceptance for the local OCR -> Manga OCR -> LaMa flow. |
| scripts/manga-smart-ocr-runtime-test.py | 21 |  |
| scripts/manga-smart-ocr-test.py | 108 |  |
| scripts/manga-smart-text-test.cjs | 61 |  |
| scripts/manga-text-ink-mask-test.cjs | 77 |  |
| scripts/nai-error-readable-test.py | 164 |  |
| scripts/nai-pipeline-credentials-test.cjs | 24 | Regression: the NAI pipeline smoke test must never reuse the NovelAI token as the |
| scripts/nai-pipeline-smoke-test.mjs | 324 | NAI-only pipeline smoke test (NovelAI + Director proxy). |
| scripts/nai-real-acceptance.cjs | 178 | OPT-IN real NovelAI acceptance (never part of npm test / CI). Stays inside Opus free |
| scripts/nai-status-format-test.cjs | 18 | Regression: "检查 NAI" must not show the misleading "无限生图：否" for Opus users. |
| scripts/no-duplicate-globals-test.cjs | 25 | Classic <script> files share one global scope: a top-level function declared in two files is |
| scripts/no-third-party-director-test.py | 231 |  |
| scripts/novelai-batch-tools.mjs | 607 |  |
| scripts/novelai-readable-error-test.cjs | 39 | Regression: NovelAI errors shown to the user are readable (JSON from the local proxy, |
| scripts/offline-icon-fonts-test.cjs | 23 | Regression: icon fonts came only from fonts.gstatic.com, so offline (or where Google |
| scripts/page-studio-smoke-test.cjs | 106 |  |
| scripts/png-bit-depth-smoke-test.cjs | 351 |  |
| scripts/portability-smoke-test.cjs | 22 | Portability regressions: npm scripts must not depend on a bare `python` alias (absent on |
| scripts/prepare-installer.ps1 | 118 |  |
| scripts/project-load-open-page-test.cjs | 43 | Regression: "Load project" only added page thumbnails; when the canvas was empty |
| scripts/proxy-chain-negative-test.py | 269 |  |
| scripts/proxy-guard-smoke-test.py | 66 |  |
| scripts/remove-dead-functions.cjs | 36 | Usage: node scripts/remove-dead-functions.cjs list.tsv  (file<TAB>line<TAB>name per row). |
| scripts/remove-spaces.cjs | 84 | JSファイルからインデントと不要なスペースを削除するスクリプト |
| scripts/run-python.cjs | 29 | !/usr/bin/env node |
| scripts/scene-plan-smoke-test.cjs | 9 |  |
| scripts/server-port-conflict-test.py | 44 |  |
| scripts/simulator-chat-smoke-test.cjs | 51 |  |
| scripts/simulator-extra-smoke-test.cjs | 173 |  |
| scripts/simulator-timeline-smoke-test.cjs | 11 |  |
| scripts/story-engine-smoke-test.cjs | 126 |  |
| scripts/sync-eslint-exported.cjs | 57 | !/usr/bin/env node |
| scripts/tone-target-click-test.cjs | 34 | Regression: panels are not selectable, so "click a panel, then a tone" put the tone on |
| scripts/ux-screenshots.cjs | 44 | Beginner-flow screenshots for UX before/after comparison. |
| scripts/validate-manga-split-samples.py | 546 |  |
| scripts/vendor-free-public-assets.cjs | 274 | Download clearly licensed free assets into assets/public/. |
| service-worker.js | 93 | Service Worker: Cache management for HTTP/HTTPS deployment |
| start_local_tools.bat | 4 |  |
| start_manga_editor_nai.bat | 23 |  |
| start_manga_editor_nai.ps1 | 567 |  |
| 一键启动.bat | 29 |  |
