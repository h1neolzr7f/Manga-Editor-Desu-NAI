# DOM id 索引（逆引き）

`scripts/gen-project-index.cjs` の自動生成。手で編集しない。

- 定義: index.html / html 配下の `id="..."`
- 参照: `$('id')` / `getElementById('id')` / `querySelector('#id')` と、定義済み id と一致する文字列リトラル
  （`['a','b'].forEach(function(id){$(id);})` のような動的参照を抽うため。js と html インライン script が対象）
- 定義 634 件 / 参照 760 件

## id → 定義と参照

| id | 定義 | 参照しているファイル |
|----|------|--------------------|
| `CircleButton` | index.html:1851 |  |
| `Color2BlackLightColorButton` | index.html:1769 |  |
| `Color2BlackWhiteDarkButton` | index.html:1756 |  |
| `Color2BlackWhiteLightButton` | index.html:1752 |  |
| `Color2BlackWhiteNoDotButton` | index.html:1760 |  |
| `Color2BlackWhiteSimpleButton` | index.html:1764 |  |
| `CrayonButton` | index.html:1839 |  |
| `CustomBrushButton` | index.html:1863 |  |
| `CustomPanelButton` | index.html:743 | js/sidebar/panel/panel-template.js:155 |
| `EffectGLFXButton` | index.html:1789 |  |
| `EffectGlowButton` | index.html:1785 |  |
| `EnhanceDarkButton` | index.html:1775 |  |
| `EraserButton` | index.html:1859 |  |
| `ExternalService_Heartbeat_Container` | index.html:2178 | js/ai/ai-management.js:69 |
| `FocusingLineButton` | index.html:1900 |  |
| `InformationCoordinate` | index.html:1926 | js/project-management.js:277, js/ui/control/information-control.js:2 |
| `InformationFPS` | index.html:1920 | js/project-management.js:276, js/ui/control/information-control.js:1 |
| `InkButton` | index.html:1835 |  |
| `Intro_Tutorial` | index.html:490 |  |
| `MarkerButton` | index.html:1831 |  |
| `MosaicButton` | index.html:1855 |  |
| `OutlinePenButton` | index.html:1847 |  |
| `PencilButton` | index.html:1843 |  |
| `ScenarioPromptSelecter` | index.html:1104 | js/ai/ai-settings.js:220, js/ai/prompt/auto/auto-generation.js:10, js/ai/prompt/auto/auto-prompt-util.js:158, js/ai/prompt/auto/story-prompt-map.js:58 |
| `SpeedLineButton` | index.html:1896 |  |
| `ToneButton` | index.html:1880 |  |
| `ToneNoiseButton` | index.html:1884 |  |
| `ToneRainButton` | index.html:1892 |  |
| `ToneSnowButton` | index.html:1888 |  |
| `a` | index.html:63 | index.html:72, js/ai/manga-character-bible-ui.js:149, js/ai/manga-page-structure-ui.js:338, js/ai/panel-pipeline-review.js:154, js/assets/asset-pack.js:8, js/core/compression/lz4.js:207, js/core/util/image-util.js:658, js/dashboard/dashboard-ui.js:967, js/local-tools/background-removal-client.js:494, js/project-management.js:42, js/sidebar/pen/pen-tools.js:637, js/simulator/chat-controller.js:295, js/simulator/longshot-exporter.js:29, js/simulator/simulator-controller.js:100, js/simulator/story-composer-controller.js:264, js/svg/manga-panels-image-vertical.js:2, js/ui/imagePromptHelper/image-prompt-helper.js:118, scripts/manga-bubble-detector-test.cjs:42, scripts/novelai-readable-error-test.cjs:35, scripts/simulator-timeline-smoke-test.cjs:7 |
| `add` | index.html:788 | js/ai/manga-lama-inpaint-ui.js:9, js/core/svg/google-icon-names.js:11, js/layer/blend/blend.js:2, js/ui/third/base-translation/base-de.js:147, js/ui/third/base-translation/base-en.js:152, js/ui/third/base-translation/base-es.js:147, js/ui/third/base-translation/base-fr.js:147, js/ui/third/base-translation/base-ja.js:152, js/ui/third/base-translation/base-ko.js:147, js/ui/third/base-translation/base-ru.js:147, js/ui/third/base-translation/base-zh.js:152 |
| `addHeart` | index.html:892 | js/ui/visual-studio.js:472 |
| `addHexagon` | index.html:884 | js/ui/visual-studio.js:472 |
| `addPentagon` | index.html:880 | js/ui/visual-studio.js:472 |
| `addSquare` | index.html:864 | js/ui/visual-studio.js:471 |
| `addStar` | index.html:888 | js/ui/visual-studio.js:472 |
| `addTallRect` | index.html:868 | js/ui/visual-studio.js:471 |
| `addTriangle` | index.html:876 | js/ui/visual-studio.js:471 |
| `addWideRect` | index.html:872 | js/ui/visual-studio.js:471 |
| `align-center` | index.html:1640 |  |
| `align-left` | index.html:1637 |  |
| `align-right` | index.html:1643 |  |
| `angle-control` | index.html:1935 | js/ui/control/common-control-management.js:2 |
| `apiHeartbeatCheckbox` | index.html:309 | js/ai/ai-management.js:88, js/ai/ai-settings.js:412, js/project-management.js:243 |
| `apiSettingsUrlHelpe` | index.html:2172 |  |
| `applyFlexGenSizeBtn` | index.html:1001 | js/sidebar/panel/panel-template.js:222 |
| `asset-library-area` | index.html:1370 | js/sidebar/sidebar.js:83, js/ui/visual-studio.js:338 |
| `assetLibraryExportButton` | index.html:1380 | js/assets/asset-library-controller.js:270 |
| `assetLibraryGroups` | index.html:1384 | js/assets/asset-library-controller.js:240 |
| `assetLibraryImportButton` | index.html:1381 | js/assets/asset-library-controller.js:272 |
| `assetLibraryInput` | index.html:1377 | js/assets/asset-library-controller.js:230 |
| `assetLibraryList` | index.html:1406 | js/assets/asset-library-controller.js:84 |
| `assetLibraryNext` | index.html:1404 | js/assets/asset-library-controller.js:254 |
| `assetLibraryPackInput` | index.html:1382 | js/assets/asset-library-controller.js:273 |
| `assetLibraryPageLabel` | index.html:1403 | js/assets/asset-library-controller.js:121 |
| `assetLibraryPager` | index.html:1401 | js/assets/asset-library-controller.js:118 |
| `assetLibraryPrev` | index.html:1402 | js/assets/asset-library-controller.js:253 |
| `assetLibraryRestoreButton` | index.html:1379 | js/assets/asset-library-controller.js:257 |
| `assetLibrarySearch` | index.html:1398 | js/assets/asset-library-controller.js:86 |
| `assetLibraryStatus` | index.html:1400 | js/assets/asset-library-controller.js:34 |
| `assetLibraryTags` | index.html:1399 | js/assets/asset-library-controller.js:87 |
| `auto-generate-area` | index.html:914 | js/sidebar/sidebar.js:80 |
| `autoSaveCheckbox` | index.html:291 | js/core/auto-save.js:210, js/project-management.js:244 |
| `autoSaveInterval` | index.html:294 | js/core/auto-save.js:216, js/project-management.js:245 |
| `backgroundRemovalAction` | index.html:1322 | js/core/settings.js:90, js/local-tools/background-removal-client.js:70 |
| `backgroundRemovalAlphaMatting` | index.html:1328 | js/local-tools/background-removal-client.js:59 |
| `backgroundRemovalBgThreshold` | index.html:1335 | js/local-tools/background-removal-client.js:61 |
| `backgroundRemovalCrop` | index.html:1343 | js/local-tools/background-removal-client.js:65 |
| `backgroundRemovalEngine` | index.html:1308 | js/local-tools/background-removal-client.js:53 |
| `backgroundRemovalErode` | index.html:1339 | js/local-tools/background-removal-client.js:62 |
| `backgroundRemovalFeather` | index.html:1346 | js/local-tools/background-removal-client.js:66 |
| `backgroundRemovalFgThreshold` | index.html:1331 | js/local-tools/background-removal-client.js:60 |
| `backgroundRemovalInvert` | index.html:1356 | js/local-tools/background-removal-client.js:69 |
| `backgroundRemovalKeyColor` | index.html:1350 | js/local-tools/background-removal-client.js:67 |
| `backgroundRemovalKeyTolerance` | index.html:1354 | js/local-tools/background-removal-client.js:68 |
| `backgroundRemovalModel` | index.html:1315 | js/core/settings.js:90, js/local-tools/background-removal-client.js:54 |
| `backgroundRemovalOnlyMask` | index.html:1342 | js/local-tools/background-removal-client.js:64 |
| `backgroundRemovalPostMask` | index.html:1341 | js/local-tools/background-removal-client.js:63 |
| `base-controls-mini` | index.html:2191 |  |
| `baseControlsPanel` | index.html:2186 |  |
| `basePrompt_height` | index.html:2217 | js/ai/prompt/base-event-listener.js:8, js/project-management.js:311 |
| `basePrompt_negative` | index.html:2207 | js/ai/prompt/base-event-listener.js:6, js/project-management.js:307 |
| `basePrompt_prompt` | index.html:2201 | js/ai/prompt/base-event-listener.js:5, js/project-management.js:306 |
| `basePrompt_seed` | index.html:2224 | js/ai/prompt/base-event-listener.js:9, js/project-management.js:308 |
| `basePrompt_width` | index.html:2213 | js/ai/prompt/base-event-listener.js:7, js/project-management.js:310 |
| `beginnerToolHud` | index.html:2080 | js/ui/beginner-guide.js:21 |
| `bg-color` | index.html:392 | js/ai/manga-importer.js:1701, js/canvas-manager.js:194, js/core/util/image-util.js:627, js/layer/image-history-management.js:302, js/project-management.js:197, js/sidebar/panel/panel-manager.js:280 |
| `bgColorButton` | index.html:393 | js/canvas-manager.js:214 |
| `bgColorSwatch` | index.html:395 | js/canvas-manager.js:234 |
| `bgColorValue` | index.html:394 | js/canvas-manager.js:228 |
| `blend` | html/Minual/effect.html:45 | js/ui/third/base-translation/base-de.js:173, js/ui/third/base-translation/base-en.js:178, js/ui/third/base-translation/base-es.js:173, js/ui/third/base-translation/base-fr.js:173, js/ui/third/base-translation/base-ja.js:178, js/ui/third/base-translation/base-ko.js:173, js/ui/third/base-translation/base-ru.js:173, js/ui/third/base-translation/base-zh.js:178 |
| `blendButton` | index.html:1781 |  |
| `bold-toggle-btn` | index.html:1613 | js/sidebar/text/text-effect.js:251 |
| `brokenButton` | index.html:1701 |  |
| `brushPresetGrid` | index.html:1829 | js/sidebar/pen/pen-tools.js:758, js/ui/visual-studio.js:94 |
| `btm-drawer` | index.html:2243 | index.html:134, js/ui/bottom-bar.js:4 |
| `btm-drawer-handle` | index.html:2244 | js/ui/bottom-bar.js:5 |
| `btm-image-container` | index.html:2248 | js/core/auto-save.js:178, js/ui/bottom-bar.js:6 |
| `btm-scroll-left` | index.html:2249 | js/ui/bottom-bar.js:7 |
| `btm-scroll-right` | index.html:2250 | js/ui/bottom-bar.js:8 |
| `btn-en` | html/functionList.html:34 | html/functionList.html:312 |
| `btn-ja` | html/functionList.html:33 | html/functionList.html:306 |
| `bubbleFillColor` | index.html:1459 | js/project-management.js:255, js/sidebar/speechBubble/speech-bubble-effect.js:4 |
| `bubbleStrokeColor` | index.html:1455 | js/project-management.js:254, js/sidebar/speechBubble/speech-bubble-effect.js:5 |
| `bubbleStrokewidht` | index.html:1466 | js/project-management.js:257, js/sidebar/speechBubble/speech-bubble-effect.js:3 |
| `c2bw` | html/Minual/effect.html:25 |  |
| `canvas-area` | index.html:2058 | js/canvas-manager.js:911 |
| `canvas-container` | index.html:2124 | js/canvas-manager.js:42, js/sidebar/panel/panel-manager.js:7 |
| `canvas-help-text` | index.html:2084 | js/ui/beginner-guide.js:62, js/ui/util/mode-change.js:29 |
| `canvasEmptyHint` | index.html:2128 | js/ui/beginner-guide.js:152, scripts/layout-smoke-test.cjs:66 |
| `canvasEmptyHintDismiss` | index.html:2140 | js/ui/third/i18next.js:1090 |
| `canvasEmptyHintSimulator` | index.html:2138 |  |
| `canvasEmptyHintTemplate` | index.html:2139 |  |
| `clearMode` | index.html:2064 | js/ui/beginner-guide.js:50, js/ui/third/base-translation/base-de.js:262, js/ui/third/base-translation/base-en.js:268, js/ui/third/base-translation/base-es.js:262, js/ui/third/base-translation/base-fr.js:262, js/ui/third/base-translation/base-ja.js:267, js/ui/third/base-translation/base-ko.js:262, js/ui/third/base-translation/base-ru.js:262, js/ui/third/base-translation/base-zh.js:267, js/ui/third/tippy.js:89, js/ui/util/mode-manager.js:358 |
| `cloudButton` | index.html:1707 |  |
| `control-area` | index.html:1913 | js/sidebar/sidebar.js:93 |
| `control-preview-area` | index.html:1915 |  |
| `controls` | index.html:2164 | js/project-management.js:655, js/shortcut.js:75, js/sidebar/panel/panel-manager.js:651, js/ui/beginner-guide.js:352 |
| `customPanelSizeX` | index.html:749 | js/project-management.js:248, js/sidebar/panel/panel-template.js:156, js/ui/third/base-translation/base-de.js:332, js/ui/third/base-translation/base-en.js:338, js/ui/third/base-translation/base-es.js:331, js/ui/third/base-translation/base-fr.js:332, js/ui/third/base-translation/base-ja.js:337, js/ui/third/base-translation/base-ko.js:332, js/ui/third/base-translation/base-ru.js:332, js/ui/third/base-translation/base-zh.js:343 |
| `customPanelSizeY` | index.html:754 | js/project-management.js:249, js/sidebar/panel/panel-template.js:157, js/ui/third/base-translation/base-de.js:333, js/ui/third/base-translation/base-en.js:339, js/ui/third/base-translation/base-es.js:332, js/ui/third/base-translation/base-fr.js:333, js/ui/third/base-translation/base-ja.js:338, js/ui/third/base-translation/base-ko.js:333, js/ui/third/base-translation/base-ru.js:333, js/ui/third/base-translation/base-zh.js:344 |
| `cutChangeRate` | index.html:987 | js/project-management.js:285, js/sidebar/panel/knife/knife-split-engine.js:73, js/ui/third/base-translation/base-de.js:117, js/ui/third/base-translation/base-en.js:122, js/ui/third/base-translation/base-es.js:117, js/ui/third/base-translation/base-fr.js:117, js/ui/third/base-translation/base-ja.js:121, js/ui/third/base-translation/base-ko.js:117, js/ui/third/base-translation/base-ru.js:117, js/ui/third/base-translation/base-zh.js:122 |
| `cutout-area` | index.html:1286 | js/layer/layer-button.js:29, js/local-tools/background-removal-client.js:519, js/sidebar/sidebar.js:89, js/ui/canvas-object-menu.js:555, js/ui/visual-studio.js:335 |
| `cutoutHealthButton` | index.html:1358 | js/local-tools/background-removal-client.js:478 |
| `cutoutOriginalPreview` | index.html:1363 | js/local-tools/background-removal-client.js:191 |
| `cutoutPresetDeleteButton` | index.html:1301 | js/local-tools/background-removal-client.js:488 |
| `cutoutPresetExportButton` | index.html:1302 | js/local-tools/background-removal-client.js:490 |
| `cutoutPresetImportInput` | index.html:1304 | js/local-tools/background-removal-client.js:500 |
| `cutoutPresetLoadButton` | index.html:1299 | js/local-tools/background-removal-client.js:484 |
| `cutoutPresetSaveButton` | index.html:1300 | js/local-tools/background-removal-client.js:486 |
| `cutoutPresetSelect` | index.html:1296 | js/local-tools/background-removal-client.js:108 |
| `cutoutPreview` | index.html:1362 | js/local-tools/background-removal-client.js:187 |
| `cutoutResultPreview` | index.html:1364 | js/local-tools/background-removal-client.js:192 |
| `cutoutRunButton` | index.html:1359 | js/local-tools/background-removal-client.js:480 |
| `cutoutServiceUrl` | index.html:1292 | js/local-tools/background-removal-client.js:32 |
| `cutoutStatus` | index.html:1361 | js/local-tools/background-removal-client.js:23 |
| `dashboard-close-btn` | index.html:2744 | js/dashboard/dashboard-ui.js:217 |
| `dashboard-modal` | index.html:2742 | js/dashboard/dashboard-ui.js:120 |
| `dashboardAvgSession` | index.html:2884 | js/dashboard/dashboard-ui.js:608, js/ui/third/i18next.js:3473 |
| `dashboardBadgeGrid` | index.html:2966 | js/dashboard/dashboard-ui.js:930 |
| `dashboardCalendar` | index.html:2897 | js/dashboard/dashboard-ui.js:612, js/ui/third/i18next.js:3475 |
| `dashboardChart` | index.html:2808 | js/dashboard/dashboard-ui.js:318 |
| `dashboardClearStats` | index.html:2748 | js/dashboard/dashboard-ui.js:183 |
| `dashboardClearTags` | index.html:2833 | js/dashboard/dashboard-ui.js:193, js/ui/third/i18next.js:4013 |
| `dashboardCoOccurrenceTable` | index.html:2927 | js/dashboard/dashboard-ui.js:817 |
| `dashboardCurrentSession` | index.html:2876 | js/dashboard/dashboard-ui.js:606, js/ui/third/i18next.js:3471 |
| `dashboardCurrentStreak` | index.html:2855 | js/dashboard/dashboard-ui.js:600, js/ui/third/i18next.js:3467 |
| `dashboardDailyGoalInput` | index.html:2946 | js/dashboard/dashboard-ui.js:230, js/project-management.js:293 |
| `dashboardDailyProgressBar` | index.html:2950 | js/dashboard/dashboard-ui.js:904 |
| `dashboardDailyProgressText` | index.html:2950 | js/dashboard/dashboard-ui.js:907 |
| `dashboardDownloadWordcloud` | index.html:2842 | js/dashboard/dashboard-ui.js:204 |
| `dashboardExportCSV` | index.html:2974 | js/dashboard/dashboard-ui.js:253, js/ui/third/i18next.js:3494 |
| `dashboardExportJSON` | index.html:2973 | js/dashboard/dashboard-ui.js:249, js/ui/third/i18next.js:3493 |
| `dashboardFirstLaunch` | index.html:2776 | js/dashboard/dashboard-ui.js:299 |
| `dashboardGlobalAvg` | index.html:2756 | js/dashboard/dashboard-ui.js:294 |
| `dashboardGlobalMax` | index.html:2764 | js/dashboard/dashboard-ui.js:296 |
| `dashboardGlobalMin` | index.html:2760 | js/dashboard/dashboard-ui.js:295 |
| `dashboardHeatmap` | index.html:2815 | js/dashboard/dashboard-ui.js:380 |
| `dashboardLaunchCount` | index.html:2772 | js/dashboard/dashboard-ui.js:298 |
| `dashboardLongestStreak` | index.html:2860 | js/dashboard/dashboard-ui.js:601, js/ui/third/i18next.js:3468 |
| `dashboardModeSelector` | index.html:2802 | js/dashboard/dashboard-ui.js:169 |
| `dashboardModelChart` | index.html:2936 | js/dashboard/dashboard-ui.js:834 |
| `dashboardPromptLengthChart` | index.html:2912 | js/dashboard/dashboard-ui.js:744 |
| `dashboardSaveDailyGoal` | index.html:2947 | js/dashboard/dashboard-ui.js:227 |
| `dashboardSaveWeeklyGoal` | index.html:2955 | js/dashboard/dashboard-ui.js:238 |
| `dashboardSessionGenCount` | index.html:2880 | js/dashboard/dashboard-ui.js:607 |
| `dashboardStatsTable` | index.html:2795 | js/dashboard/dashboard-ui.js:300 |
| `dashboardSuccessRateChart` | index.html:2904 | js/dashboard/dashboard-ui.js:695 |
| `dashboardTodayCount` | index.html:2865 | js/dashboard/dashboard-ui.js:602 |
| `dashboardTopTags` | index.html:2835 | js/dashboard/dashboard-ui.js:517, js/ui/third/i18next.js:4009 |
| `dashboardTotalGenerations` | index.html:2752 | js/dashboard/dashboard-ui.js:293 |
| `dashboardTotalSessions` | index.html:2888 | js/dashboard/dashboard-ui.js:609, js/ui/third/i18next.js:3474 |
| `dashboardTrendChart` | index.html:2827 | js/dashboard/dashboard-ui.js:441 |
| `dashboardTrendSelector` | index.html:2820 | js/dashboard/dashboard-ui.js:176 |
| `dashboardUniqueTags` | index.html:2768 | js/dashboard/dashboard-ui.js:297 |
| `dashboardWeeklyGoalInput` | index.html:2954 | js/dashboard/dashboard-ui.js:241, js/project-management.js:294 |
| `dashboardWeeklyProgressBar` | index.html:2958 | js/dashboard/dashboard-ui.js:916 |
| `dashboardWeeklyProgressText` | index.html:2958 | js/dashboard/dashboard-ui.js:919 |
| `dashboardWordcloud` | index.html:2845 | js/dashboard/dashboard-ui.js:208, js/ui/third/i18next.js:4011 |
| `desu-nav` | index.html:212 | index.html:132 |
| `edit` | index.html:790 | js/ai/gpt-region-editor.js:457, js/core/svg/google-icon-helper.js:78, js/core/svg/google-icon-names.js:11, js/sidebar/panel/panel-manager.js:433, js/ui/canvas-object-menu.js:11, js/ui/util/mode-manager.js:346, scripts/full-feature-e2e.cjs:351, scripts/gpt-browser-acceptance.cjs:880, scripts/gpt-real-api-acceptance.cjs:209, scripts/gpt-region-editor-smoke-test.cjs:66 |
| `esApi-controls-mini` | index.html:2169 |  |
| `esApiControlsPanel` | index.html:2166 |  |
| `exportPxCappedNote` | index.html:424 | js/canvas-manager.js:342 |
| `exportPxLandscapeHeight` | index.html:421 | js/canvas-manager.js:492 |
| `exportPxLandscapeWidth` | index.html:418 | js/canvas-manager.js:492 |
| `exportPxPortraitHeight` | index.html:412 | js/canvas-manager.js:492 |
| `exportPxPortraitWidth` | index.html:409 | js/canvas-manager.js:492 |
| `featureTable` | html/functionList.html:40 |  |
| `flexGenH` | index.html:1000 | js/panel/random-cut.js:85, js/sidebar/panel/panel-template.js:226 |
| `flexGenW` | index.html:998 | js/panel/random-cut.js:84, js/sidebar/panel/panel-template.js:225 |
| `fontSelector` | index.html:1610 | js/core/font/font-dropdown.js:282, js/sidebar/speechBubble/speech-bubble-freehand.js:634, js/sidebar/speechBubble/speech-bubble-text.js:206, js/sidebar/text/text-effect.js:200, js/sidebar/text/vertical-text.js:5 |
| `fontSizeSlider` | index.html:1631 | js/project-management.js:298, js/sidebar/speechBubble/speech-bubble-freehand.js:635, js/sidebar/speechBubble/speech-bubble-text.js:207, js/sidebar/text/text-effect.js:127, js/sidebar/text/vertical-text.js:6 |
| `fontStrokeWidthSlider` | index.html:1634 | js/project-management.js:299, js/sidebar/speechBubble/speech-bubble-freehand.js:636, js/sidebar/speechBubble/speech-bubble-text.js:208, js/sidebar/text/text-effect.js:130, js/sidebar/text/vertical-text.js:7 |
| `gridSizeInput` | index.html:470 | js/panel/grid.js:104, js/project-management.js:202 |
| `head-id` | index.html:603 | index.html:133 |
| `horizontalRandomPanelCount` | index.html:981 | js/panel/random-cut.js:11, js/project-management.js:283 |
| `i` | index.html:96 | index.html:96, js/sidebar/pen/pen-tools.js:672, js/sidebar/sidebar.js:68, js/svg/manga-panels-image-vertical.js:21, js/ui/imagePromptHelper/image-prompt-helper.js:376, js/ui/util/tagify-util.js:13 |
| `image-text-tool-buttons` | index.html:1681 |  |
| `image2-section` | index.html:1268 | js/assets/image2-controller.js:9 |
| `image2AssetName` | index.html:1275 |  |
| `image2Height` | index.html:1277 | js/assets/image2-controller.js:15 |
| `image2JobList` | index.html:1280 | js/assets/image2-controller.js:6 |
| `image2Negative` | index.html:1273 | js/assets/image2-controller.js:15 |
| `image2Prompt` | index.html:1272 | js/assets/image2-controller.js:15 |
| `image2Provider` | index.html:1274 | js/assets/image2-controller.js:7 |
| `image2RunButton` | index.html:1278 | js/assets/image2-controller.js:8 |
| `image2Status` | index.html:1279 | js/assets/image2-controller.js:5 |
| `image2Tags` | index.html:1276 | js/assets/image2-controller.js:15 |
| `image2Transparent` | index.html:1277 | js/assets/image2-controller.js:15 |
| `image2Width` | index.html:1277 | js/assets/image2-controller.js:15 |
| `imageCopy` | index.html:262 | js/ui/third/base-translation/base-de.js:441, js/ui/third/base-translation/base-en.js:400, js/ui/third/base-translation/base-es.js:393, js/ui/third/base-translation/base-fr.js:395, js/ui/third/base-translation/base-ja.js:446, js/ui/third/base-translation/base-ko.js:395, js/ui/third/base-translation/base-ru.js:394, js/ui/third/base-translation/base-zh.js:406 |
| `imageDownload` | index.html:256 | js/ui/third/base-translation/base-de.js:442, js/ui/third/base-translation/base-en.js:399, js/ui/third/base-translation/base-es.js:392, js/ui/third/base-translation/base-fr.js:394, js/ui/third/base-translation/base-ja.js:447, js/ui/third/base-translation/base-ko.js:394, js/ui/third/base-translation/base-ru.js:393, js/ui/third/base-translation/base-zh.js:405, scripts/beginner-ux-guards-test.cjs:29 |
| `imageInput` | index.html:2062 | js/canvas-manager.js:970, scripts/import-image-keeps-page-test.cjs:19 |
| `intro_asset-library-area` | index.html:619 |  |
| `intro_auto-generate-area` | index.html:624 | js/ui/third/tippy.js:49 |
| `intro_content` | index.html:2122 | js/ui/canvas-object-menu.js:701 |
| `intro_control-area` | index.html:695 | js/ui/third/tippy.js:58 |
| `intro_crop-tool` | index.html:641 |  |
| `intro_cutout-area` | index.html:678 |  |
| `intro_eraser-tool` | index.html:649 |  |
| `intro_knife-tool` | index.html:653 |  |
| `intro_links` | index.html:526 |  |
| `intro_manga-effect-area` | index.html:683 | js/ui/third/tippy.js:57 |
| `intro_manga-tone-area` | index.html:670 | js/ui/third/tippy.js:56 |
| `intro_marquee-tool` | index.html:637 |  |
| `intro_move-tool` | index.html:633 |  |
| `intro_page-manager-area` | index.html:691 | js/ui/third/tippy.js:48 |
| `intro_prompt-manager-area` | index.html:628 | js/ui/third/tippy.js:50 |
| `intro_ps-tools-area` | index.html:657 |  |
| `intro_shape-area` | index.html:674 | js/ui/third/tippy.js:59 |
| `intro_simulator-chat-area` | index.html:611 |  |
| `intro_simulator-studio` | index.html:615 |  |
| `intro_speech-bubble-area1` | index.html:661 | js/ui/third/tippy.js:51 |
| `intro_speech-bubble-area2` | index.html:1447 | js/ui/third/tippy.js:52 |
| `intro_svg-container-template` | index.html:607 | js/ui/third/tippy.js:47 |
| `intro_text-area` | index.html:665 | js/ui/third/tippy.js:53 |
| `intro_text-area2` | index.html:687 | js/ui/third/tippy.js:54 |
| `intro_tool-area` | index.html:645 | js/ui/third/tippy.js:55 |
| `j` | index.html:96 | index.html:96, js/svg/manga-panels-image-vertical.js:22 |
| `k` | index.html:96 | index.html:96, js/svg/manga-panels-image-vertical.js:24, js/ui/beginner-guide.js:305 |
| `knifeModeButton` | index.html:762 | js/sidebar/panel/knife/knife-mode.js:10, js/ui/util/mode-manager.js:199 |
| `knifePanelSpaceSize` | index.html:768 | js/project-management.js:196, js/sidebar/panel/knife/knife-split-engine.js:376 |
| `layer-content` | index.html:2158 | js/layer/layer-management.js:119 |
| `layer-panel` | index.html:2149 | js/project-management.js:654, js/shortcut.js:68, js/sidebar/panel/panel-manager.js:648 |
| `layerSelectPageButton` | index.html:2152 | js/ui/beginner-guide.js:497 |
| `layeredButton` | index.html:1713 |  |
| `left-control` | index.html:1944 | js/ui/control/common-control-management.js:2 |
| `mLandscapeButton` | index.html:941 |  |
| `mPortraitButton` | index.html:938 |  |
| `manga-effect-area` | index.html:1747 | js/sidebar/sidebar.js:91, js/ui/visual-studio.js:326 |
| `manga-effect-buttons` | index.html:1750 |  |
| `manga-effect-settings` | index.html:1795 | js/sidebar/effect/effect-manager.js:116, js/ui/glfx-ui.js:197 |
| `manga-tone-area` | index.html:1876 | js/sidebar/sidebar.js:90, js/ui/visual-studio.js:324, scripts/full-feature-e2e.cjs:249 |
| `manga-tone-buttons` | index.html:1879 |  |
| `manga-tone-settings` | index.html:1906 | js/sidebar/tone/tone-manager.js:162 |
| `mangaImageCanvas` | index.html:2125 | js/assets/asset-library-controller.js:195, js/core/settings.js:10 |
| `mangaImportAutoTag` | index.html:1043 | js/ai/manga-importer.js:2397, js/project-management.js:236 |
| `mangaImportCharacterPlaceholders` | index.html:1044 | js/ai/manga-importer.js:2376, js/project-management.js:237 |
| `mangaImportCharacterReferences` | index.html:1045 | js/ai/manga-importer.js:2378, js/project-management.js:238, scripts/manga-import-smoke-test.cjs:51 |
| `mangaImportDirectorButton` | index.html:1028 | js/ai/manga-importer.js:2479, scripts/manga-import-smoke-test.cjs:48 |
| `mangaImportGenerateButton` | index.html:1036 | js/ai/manga-importer.js:2487, scripts/manga-import-smoke-test.cjs:50 |
| `mangaImportInput` | index.html:1009 | js/ai/manga-importer.js:2405 |
| `mangaImportKeepReference` | index.html:1042 | js/ai/manga-importer.js:2365, js/project-management.js:235 |
| `mangaImportMinPanelArea` | index.html:2432 | js/ai/manga-importer.js:1455, js/project-management.js:233 |
| `mangaImportPanelThreshold` | index.html:2431 | js/ai/manga-importer.js:1454, js/project-management.js:232 |
| `mangaImportPickButton` | index.html:1012 | js/ai/manga-importer.js:2475, scripts/manga-import-smoke-test.cjs:44 |
| `mangaImportPreflightButton` | index.html:1032 | js/ai/manga-importer.js:2481, scripts/manga-import-smoke-test.cjs:49 |
| `mangaImportRetagButton` | index.html:1016 | js/ai/manga-importer.js:2477, scripts/manga-import-smoke-test.cjs:45 |
| `mangaImportSelectNextPanelButton` | index.html:1020 | js/ai/manga-importer.js:2483, scripts/manga-import-smoke-test.cjs:46 |
| `mangaImportSelectPlaceholderButton` | index.html:1024 | js/ai/manga-importer.js:2485, scripts/manga-import-smoke-test.cjs:47 |
| `mangaImportStatus` | index.html:1047 | js/ai/manga-importer.js:36 |
| `mangaImportTaggerThreshold` | index.html:2430 | js/ai/manga-importer.js:1920, js/project-management.js:231 |
| `mangaImportTaggerUrl` | index.html:2429 | js/ai/manga-importer.js:1951, js/project-management.js:230 |
| `mangaImportUseTaggerProxy` | index.html:2436 | js/ai/manga-importer.js:1959, js/project-management.js:234 |
| `marginFromPanel` | index.html:476 | js/core/settings.js:26, js/project-management.js:203, js/ui/third/base-translation/base-de.js:456, js/ui/third/base-translation/base-en.js:492, js/ui/third/base-translation/base-es.js:485, js/ui/third/base-translation/base-fr.js:487, js/ui/third/base-translation/base-ja.js:461, js/ui/third/base-translation/base-ko.js:487, js/ui/third/base-translation/base-ru.js:486, js/ui/third/base-translation/base-zh.js:498 |
| `meshButton` | index.html:1719 |  |
| `mode-toggle` | index.html:590 | js/ui/util/mode-change.js:59 |
| `multiPageGenerate` | index.html:930 | js/panel/random-cut.js:136, js/ui/third/base-translation/base-de.js:111, js/ui/third/base-translation/base-en.js:116, js/ui/third/base-translation/base-es.js:111, js/ui/third/base-translation/base-fr.js:111, js/ui/third/base-translation/base-ja.js:115, js/ui/third/base-translation/base-ko.js:111, js/ui/third/base-translation/base-ru.js:111, js/ui/third/base-translation/base-zh.js:116 |
| `nai-scene-plan-section` | index.html:1122 |  |
| `naiBatchAcceptanceButton` | index.html:1081 | js/ai/ai-settings.js:214 |
| `naiBatchAcceptanceConfirmButton` | index.html:1082 | js/ai/ai-settings.js:227 |
| `naiBatchAcceptanceGate` | index.html:1064 | js/ai/ai-settings.js:196, js/ai/prompt/auto/auto-prompt-util.js:295, js/project-management.js:221 |
| `naiBatchAutoGenerateAfterPrompts` | index.html:1068 | js/ai/ai-settings.js:196, js/ai/prompt/auto/auto-prompt-util.js:300, js/project-management.js:222 |
| `naiBatchDirectorEnabled` | index.html:1058 | js/ai/manga-importer.js:2430, js/ai/prompt/auto/auto-prompt-util.js:355, js/project-management.js:290 |
| `naiBatchDirectorGenerateButton` | index.html:1117 |  |
| `naiBatchDirectorPrompt` | index.html:1056 | js/ai/manga-importer.js:2015, js/ai/prompt/auto/auto-prompt-util.js:237, js/project-management.js:289, js/simulator/story-to-manga.js:81 |
| `naiBatchDirectorPromptButton` | index.html:1106 |  |
| `naiBatchSaveTagDnaButton` | index.html:1083 | js/ai/ai-settings.js:236 |
| `naiCharacterAddCard` | index.html:1088 | js/ai/prompt/auto/character-card-manager.js:459 |
| `naiCharacterAddMaterial` | index.html:1096 | js/ai/prompt/auto/character-card-manager.js:461 |
| `naiCharacterCardList` | index.html:1091 | js/ai/prompt/auto/character-card-manager.js:321 |
| `naiCharacterCardPanel` | index.html:1085 |  |
| `naiCharacterMaterialCategory` | index.html:1094 | js/ai/prompt/auto/character-card-manager.js:254 |
| `naiCharacterMaterialTag` | index.html:1095 | js/ai/prompt/auto/character-card-manager.js:255 |
| `naiCharacterTargetSelect` | index.html:1093 | js/ai/prompt/auto/character-card-manager.js:240 |
| `naiCompositionAgent` | index.html:2407 | js/ai/ai-settings.js:196, js/ai/prompt/novelai-composition-director.js:1034, js/project-management.js:216 |
| `naiDirectorAdjustCanvas` | index.html:2407 | js/ai/ai-settings.js:196, js/ai/prompt/novelai-composition-director.js:502, js/project-management.js:217 |
| `naiDirectorApiKey` | index.html:2417 | js/ai/ai-settings.js:102, js/ai/prompt/novelai-composition-director.js:436, js/project-management.js:227 |
| `naiDirectorApiKeyToggle` | index.html:2418 | js/ai/ai-settings.js:139 |
| `naiDirectorApiUrl` | index.html:2412 | js/ai/ai-settings.js:28, js/ai/prompt/novelai-composition-director.js:435, js/project-management.js:226 |
| `naiDirectorHonorCharacterCards` | index.html:2407 | js/ai/ai-settings.js:196, js/ai/prompt/novelai-composition-director.js:274, js/project-management.js:219 |
| `naiDirectorMessageMode` | index.html:2407 | js/ai/ai-settings.js:196, js/ai/prompt/novelai-composition-director.js:306, js/project-management.js:220 |
| `naiDirectorModel` | index.html:2412 | js/ai/ai-settings.js:38, js/ai/prompt/novelai-composition-director.js:437, js/project-management.js:228 |
| `naiDirectorModelList` | index.html:2412 | js/ai/ai-settings.js:72 |
| `naiDirectorRefreshModels` | index.html:2412 | js/ai/ai-settings.js:93 |
| `naiDirectorResetSystemPrompt` | index.html:2408 | js/ai/ai-settings.js:205 |
| `naiDirectorStoreDrafts` | index.html:2407 | js/ai/ai-settings.js:196, js/project-management.js:223, js/ui/ai/auto-prompt-ui.js:63 |
| `naiDirectorSystemPrompt` | index.html:2440 | js/ai/ai-settings.js:196, js/ai/prompt/novelai-composition-director.js:378, js/project-management.js:239 |
| `naiDirectorTestApi` | index.html:2418 | js/ai/ai-settings.js:155 |
| `naiDirectorTimeout` | index.html:2422 | js/ai/ai-settings.js:196, js/ai/prompt/novelai-composition-director.js:438, js/project-management.js:229 |
| `naiDirectorUseApi` | index.html:2407 | js/ai/ai-settings.js:196, js/ai/prompt/novelai-composition-director.js:433, js/project-management.js:224 |
| `naiDirectorUseProxy` | index.html:2413 | js/ai/ai-settings.js:196, js/ai/prompt/novelai-composition-director.js:434, js/project-management.js:225 |
| `naiDirectorUseTagAnchors` | index.html:2407 | js/ai/ai-settings.js:196, js/ai/prompt/novelai-composition-director.js:952, js/project-management.js:218 |
| `naiExportAllPagesPngButton` | index.html:1078 | js/ai/panel-pipeline-review.js:201 |
| `naiGenerateComicDemo` | index.html:2463 | js/ai/ai-settings.js:393 |
| `naiGenerateMaterialPreviews` | index.html:2463 | js/ai/ai-settings.js:361 |
| `naiGoNextReviewPanelButton` | index.html:1077 | js/ai/panel-pipeline-review.js:194 |
| `naiHealthCheck` | index.html:2459 | js/ai/ai-settings.js:384, scripts/nai-real-acceptance.cjs:152 |
| `naiHistoryClose` | index.html:2118 | js/ui/visual-ps-tools.js:591 |
| `naiHistoryList` | index.html:2119 | js/ui/visual-ps-tools.js:536 |
| `naiHistoryPanel` | index.html:2117 | js/ui/visual-ps-tools.js:555 |
| `naiMarkPanelsForManualReview` | index.html:1073 | js/ai/panel-pipeline-review.js:23, js/project-management.js:288 |
| `naiMaterialPreviewStatus` | index.html:2463 | js/ai/ai-settings.js:375 |
| `naiObjectBiggerBtn` | index.html:2113 | js/canvas-manager.js:948 |
| `naiObjectFitBtn` | index.html:2114 | js/canvas-manager.js:950 |
| `naiObjectSmallerBtn` | index.html:2112 | js/canvas-manager.js:949 |
| `naiPageSizeBadge` | index.html:2081 | js/canvas-manager.js:53 |
| `naiPropFill` | index.html:2089 | js/ui/visual-ps-tools.js:229, js/ui/visual-studio.js:227 |
| `naiPropOpacity` | index.html:2092 | js/ui/visual-studio.js:227 |
| `naiPropShadow` | index.html:2093 | js/ui/visual-studio.js:227 |
| `naiPropStrip` | index.html:2088 | js/ui/visual-studio.js:221 |
| `naiPropStroke` | index.html:2090 | js/ui/visual-ps-tools.js:230, js/ui/visual-studio.js:227 |
| `naiPropStrokeW` | index.html:2091 | js/ui/visual-studio.js:227 |
| `naiScenePlanApply` | index.html:1126 | js/ai/director/scene-plan-controller.js:44 |
| `naiScenePlanGenerate` | index.html:1126 | js/ai/director/scene-plan-controller.js:44 |
| `naiScenePlanInput` | index.html:1125 | js/ai/director/scene-plan-controller.js:43 |
| `naiScenePlanJson` | index.html:1129 | js/ai/director/scene-plan-controller.js:6 |
| `naiScenePlanPreview` | index.html:1126 | js/ai/director/scene-plan-controller.js:44 |
| `naiScenePlanRetry` | index.html:1131 | js/ai/director/scene-plan-controller.js:44 |
| `naiScenePlanRollback` | index.html:1131 | js/ai/director/scene-plan-controller.js:44 |
| `naiScenePlanStatus` | index.html:1132 | js/ai/director/scene-plan-controller.js:5 |
| `naiTemplatePlaceMode` | index.html:717 | js/sidebar/speechBubble/speech-bubble-effect.js:151 |
| `naiTokenBadge` | index.html:2082 | js/ui/beginner-guide.js:335 |
| `naiToolJobStatus` | index.html:2464 | js/ai/ai-settings.js:402 |
| `naiToolOptionsBar` | index.html:2086 | js/ui/visual-studio.js:285 |
| `naiToolOptionsControls` | index.html:2103 | js/ui/visual-studio.js:287 |
| `naiToolOptionsMain` | index.html:2087 | js/ui/visual-studio.js:286 |
| `naiZoomFitBtn` | index.html:2109 | js/canvas-manager.js:947 |
| `naiZoomInBtn` | index.html:2108 | js/canvas-manager.js:945 |
| `naiZoomLabel` | index.html:2107 | js/canvas-manager.js:651 |
| `naiZoomLabelHeader` | index.html:2079 | js/canvas-manager.js:651 |
| `naiZoomOutBtn` | index.html:2106 | js/canvas-manager.js:946 |
| `naiZoomTools` | index.html:2104 |  |
| `navbar-logo` | index.html:213 | js/ui/util/mode-change.js:44 |
| `navbarDropdownCanvas` | index.html:383 |  |
| `navbarDropdownDonate` | index.html:566 |  |
| `navbarDropdownFile` | index.html:221 |  |
| `navbarDropdownHelp` | index.html:484 |  |
| `navbarDropdownLinks` | index.html:524 |  |
| `navbarDropdownPrompt` | index.html:362 |  |
| `navbarDropdownView` | index.html:324 |  |
| `navbarNavDropdown` | index.html:218 |  |
| `negativeAreaId` | index.html:2203 | js/ai/novelai-only-mode.js:85, js/ai/ui/ai-ui-util.js:7 |
| `novelaiApiKey` | index.html:2329 | js/ai/ai-settings.js:135, js/ai/prompt/director-safety.js:16, js/ai/provider/novelai-provider.js:16, js/project-management.js:206, js/ui/beginner-guide.js:323, scripts/nai-real-acceptance.cjs:102 |
| `novelaiApiKeyToggle` | index.html:2330 | js/ai/ai-settings.js:133 |
| `novelaiApiUrl` | index.html:2319 | js/ai/ai-settings.js:180, js/ai/provider/novelai-provider.js:24, js/project-management.js:204 |
| `novelaiApiUrlDefaultUrl` | index.html:2320 | js/ai/ai-settings.js:178 |
| `novelaiCfgRescale` | index.html:2382 | js/ai/ai-settings.js:196, js/ai/provider/novelai-provider.js:320, js/project-management.js:212 |
| `novelaiConcurrency` | index.html:2453 | js/ai/ai-management.js:5, js/ai/ai-settings.js:196, js/project-management.js:215 |
| `novelaiDashboard` | index.html:2320 | js/ai/ai-settings.js:182 |
| `novelaiI2INoise` | index.html:2392 | js/ai/ai-settings.js:196, js/ai/provider/novelai-provider.js:357, js/project-management.js:214 |
| `novelaiI2IStrength` | index.html:2387 | js/ai/ai-settings.js:196, js/ai/provider/novelai-provider.js:356, js/project-management.js:213 |
| `novelaiModel` | index.html:2342 | js/ai/ai-settings.js:191, js/ai/provider/novelai-provider.js:46, js/project-management.js:207 |
| `novelaiQualityToggle` | index.html:2397 | js/ai/ai-settings.js:196, js/ai/provider/novelai-provider.js:302, js/project-management.js:240 |
| `novelaiRememberToken` | index.html:2335 | js/project-management.js:326, js/ui/beginner-guide.js:397 |
| `novelaiSM` | index.html:2402 | js/ai/ai-settings.js:196, js/ai/provider/novelai-provider.js:313, js/project-management.js:241 |
| `novelaiSMDyn` | index.html:2402 | js/ai/ai-settings.js:196, js/ai/provider/novelai-provider.js:314, js/project-management.js:242 |
| `novelaiSampler` | index.html:2355 | js/ai/ai-settings.js:196, js/ai/provider/novelai-provider.js:308, js/project-management.js:208 |
| `novelaiScale` | index.html:2372 | js/ai/ai-settings.js:196, js/ai/provider/novelai-provider.js:307, js/project-management.js:210 |
| `novelaiSteps` | index.html:2367 | js/ai/ai-settings.js:196, js/ai/provider/novelai-provider.js:309, js/project-management.js:209, scripts/nai-real-acceptance.cjs:105 |
| `novelaiUcPreset` | index.html:2377 | js/ai/ai-settings.js:196, js/ai/provider/novelai-provider.js:311, js/project-management.js:211 |
| `novelaiUseLocalProxy` | index.html:2324 | js/ai/ai-settings.js:196, js/ai/provider/novelai-provider.js:30, js/project-management.js:205, scripts/nai-real-acceptance.cjs:104 |
| `onePanelGenerateNumber` | index.html:1115 | js/ai/prompt/auto/auto-generation.js:4, js/project-management.js:286, js/ui/third/base-translation/base-ja.js:37, js/ui/third/i18next.js:73 |
| `opacity-control` | index.html:1953 | js/ui/control/common-control-management.js:2 |
| `other-controls-mini` | index.html:2234 | js/ui/ai/auto-prompt-ui.js:83 |
| `otherControlsPanel` | index.html:2231 |  |
| `outputBitDepth` | index.html:439 | js/canvas-manager.js:241, js/core/util/image-util.js:618, js/project-management.js:200, js/ui/third/base-translation/base-de.js:405, js/ui/third/base-translation/base-en.js:485, js/ui/third/base-translation/base-es.js:478, js/ui/third/base-translation/base-fr.js:480, js/ui/third/base-translation/base-ja.js:410, js/ui/third/base-translation/base-ko.js:480, js/ui/third/base-translation/base-ru.js:479, js/ui/third/base-translation/base-zh.js:491, scripts/image-export-smoke-test.cjs:368 |
| `outputBitDepthHint` | index.html:445 | js/canvas-manager.js:249, js/ui/third/base-translation/base-de.js:409, js/ui/third/base-translation/base-en.js:489, js/ui/third/base-translation/base-es.js:482, js/ui/third/base-translation/base-fr.js:484, js/ui/third/base-translation/base-ja.js:414, js/ui/third/base-translation/base-ko.js:484, js/ui/third/base-translation/base-ru.js:483, js/ui/third/base-translation/base-zh.js:495, scripts/image-export-smoke-test.cjs:368 |
| `outputDpi` | index.html:403 | js/canvas-manager.js:269, js/core/util/image-util.js:667, js/project-management.js:198, scripts/image-export-smoke-test.cjs:150 |
| `outputImageEstimate` | index.html:461 | js/canvas-manager.js:545, js/ui/third/base-translation/base-de.js:399, js/ui/third/base-translation/base-en.js:479, js/ui/third/base-translation/base-es.js:472, js/ui/third/base-translation/base-fr.js:474, js/ui/third/base-translation/base-ja.js:404, js/ui/third/base-translation/base-ko.js:474, js/ui/third/base-translation/base-ru.js:473, js/ui/third/base-translation/base-zh.js:485 |
| `outputImageEstimateRow` | index.html:458 |  |
| `outputImageFormat` | index.html:430 | js/canvas-manager.js:240, js/core/util/image-util.js:673, js/project-management.js:199, js/ui/third/base-translation/base-de.js:397, js/ui/third/base-translation/base-en.js:477, js/ui/third/base-translation/base-es.js:470, js/ui/third/base-translation/base-fr.js:472, js/ui/third/base-translation/base-ja.js:402, js/ui/third/base-translation/base-ko.js:472, js/ui/third/base-translation/base-ru.js:471, js/ui/third/base-translation/base-zh.js:483 |
| `outputImageQuality` | index.html:449 | js/canvas-manager.js:522, js/core/util/image-util.js:674, js/project-management.js:201, js/ui/third/base-translation/base-de.js:398, js/ui/third/base-translation/base-en.js:478, js/ui/third/base-translation/base-es.js:471, js/ui/third/base-translation/base-fr.js:473, js/ui/third/base-translation/base-ja.js:403, js/ui/third/base-translation/base-ko.js:473, js/ui/third/base-translation/base-ru.js:472, js/ui/third/base-translation/base-zh.js:484 |
| `page-landscape` | index.html:739 | js/sidebar/panel/panel-template.js:163 |
| `page-portrait` | index.html:735 | js/sidebar/panel/panel-template.js:162 |
| `page-title` | html/functionList.html:37 | html/functionList.html:294 |
| `pageCount` | index.html:935 | js/panel/random-cut.js:71, js/project-management.js:281, js/ui/third/base-translation/base-de.js:112, js/ui/third/base-translation/base-en.js:117, js/ui/third/base-translation/base-es.js:112, js/ui/third/base-translation/base-fr.js:112, js/ui/third/base-translation/base-ja.js:116, js/ui/third/base-translation/base-ko.js:112, js/ui/third/base-translation/base-ru.js:112, js/ui/third/base-translation/base-zh.js:117 |
| `pageEffectAngle` | index.html:840 | js/sidebar/page/page-studio.js:495 |
| `pageEffectApply` | index.html:856 | js/sidebar/page/page-studio.js:551 |
| `pageEffectBehind` | index.html:854 | js/sidebar/page/page-studio.js:499 |
| `pageEffectClear` | index.html:857 | js/sidebar/page/page-studio.js:557 |
| `pageEffectColor` | index.html:852 | js/sidebar/page/page-studio.js:498 |
| `pageEffectDensity` | index.html:836 | js/sidebar/page/page-studio.js:494 |
| `pageEffectLength` | index.html:844 | js/sidebar/page/page-studio.js:497 |
| `pageEffectOpacity` | index.html:848 | js/sidebar/page/page-studio.js:496 |
| `pageEffectPreset` | index.html:832 | js/sidebar/page/page-studio.js:493 |
| `pagePaperApply` | index.html:811 | js/sidebar/page/page-studio.js:533 |
| `pagePaperClear` | index.html:814 | js/sidebar/page/page-studio.js:547 |
| `pagePaperFile` | index.html:813 | js/sidebar/page/page-studio.js:539 |
| `pagePaperPreset` | index.html:808 | js/sidebar/page/page-studio.js:506 |
| `pagePaperReveal` | index.html:816 | js/sidebar/page/page-studio.js:549 |
| `pagePaperSwatches` | index.html:805 | js/sidebar/page/page-studio.js:576 |
| `panel-manager-area` | index.html:728 | js/sidebar/sidebar.js:79, js/ui/beginner-guide.js:179, js/ui/visual-studio.js:328 |
| `panel-manager-items` | index.html:730 |  |
| `panelFillColor` | index.html:780 | js/project-management.js:251, js/sidebar/page/page-studio.js:457, js/sidebar/panel/panel-manager.js:538, js/simulator/story-to-manga.js:89 |
| `panelLayoutModeRandom` | index.html:954 |  |
| `panelLayoutModeTemplate` | index.html:951 |  |
| `panelLayoutRecommendButton` | index.html:969 | js/panel/layout-templates.js:368 |
| `panelLayoutRecommendList` | index.html:970 | js/panel/layout-templates.js:320 |
| `panelLayoutTemplateButton` | index.html:968 | js/panel/layout-templates.js:366 |
| `panelLayoutTemplateSelect` | index.html:966 | js/panel/layout-templates.js:30, js/panel/random-cut.js:106, js/project-management.js:287 |
| `panelLayoutTemplateWrap` | index.html:962 | js/panel/layout-templates.js:69 |
| `panelOpacity` | index.html:786 | js/project-management.js:253, js/sidebar/panel/panel-manager.js:536, js/ui/third/base-translation/base-de.js:362, js/ui/third/base-translation/base-en.js:368, js/ui/third/base-translation/base-es.js:361, js/ui/third/base-translation/base-fr.js:362, js/ui/third/base-translation/base-ja.js:367, js/ui/third/base-translation/base-ko.js:364, js/ui/third/base-translation/base-ru.js:362, js/ui/third/base-translation/base-zh.js:373 |
| `panelRandomCutButton` | index.html:973 | js/panel/random-cut.js:135 |
| `panelStrokeColor` | index.html:776 | js/project-management.js:250, js/sidebar/page/page-studio.js:469, js/sidebar/panel/panel-manager.js:518, js/simulator/story-to-manga.js:90 |
| `panelStrokeWidth` | index.html:783 | js/project-management.js:252, js/sidebar/page/page-studio.js:470, js/sidebar/panel/panel-manager.js:517, js/simulator/story-to-manga.js:91 |
| `panelVariedMangaPerPage` | index.html:959 | js/panel/random-cut.js:81 |
| `pen-tool-buttons` | index.html:1830 |  |
| `projectLoad` | index.html:234 | js/project-management.js:23, js/shortcut.js:190, js/ui/third/base-translation/base-de.js:469, js/ui/third/base-translation/base-en.js:396, js/ui/third/base-translation/base-es.js:389, js/ui/third/base-translation/base-fr.js:391, js/ui/third/base-translation/base-ja.js:474, js/ui/third/base-translation/base-ko.js:391, js/ui/third/base-translation/base-ru.js:390, js/ui/third/base-translation/base-zh.js:402, scripts/beginner-ux-guards-test.cjs:29, scripts/full-feature-e2e.cjs:218 |
| `projectSave` | index.html:228 | js/project-management.js:22, js/shortcut.js:182, js/ui/third/base-translation/base-de.js:470, js/ui/third/base-translation/base-en.js:395, js/ui/third/base-translation/base-es.js:388, js/ui/third/base-translation/base-fr.js:390, js/ui/third/base-translation/base-ja.js:475, js/ui/third/base-translation/base-ko.js:390, js/ui/third/base-translation/base-ru.js:389, js/ui/third/base-translation/base-zh.js:401, scripts/beginner-ux-guards-test.cjs:29, scripts/full-feature-e2e.cjs:208 |
| `prompt-A` | index.html:2197 | js/ai/ui/ai-ui-util.js:2 |
| `prompt-E` | index.html:2211 | js/ai/ui/ai-ui-util.js:3 |
| `prompt-F` | index.html:2222 | js/ai/ui/ai-ui-util.js:4 |
| `prompt-manager-area` | index.html:1412 | js/sidebar/sidebar.js:81 |
| `ps-tools-area` | index.html:1808 | js/ui/visual-studio.js:332 |
| `pwa-install-button` | index.html:585 | js/core/service/worker-register.js:84 |
| `redo` | index.html:2156 | html/Shortcut/shortcut.html:66, js/core/svg/google-icon-names.js:11, js/ui/third/base-translation/base-de.js:316, js/ui/third/base-translation/base-en.js:322, js/ui/third/base-translation/base-es.js:315, js/ui/third/base-translation/base-fr.js:316, js/ui/third/base-translation/base-ja.js:321, js/ui/third/base-translation/base-ko.js:316, js/ui/third/base-translation/base-ru.js:316, js/ui/third/base-translation/base-zh.js:327, js/ui/third/tippy.js:91 |
| `resetFlexGenSizeBtn` | index.html:1002 | js/sidebar/panel/panel-template.js:230 |
| `resizable-container` | index.html:2123 | js/canvas-manager.js:42, js/ui/beginner-guide.js:434 |
| `roleMatrixBody` | index.html:2294 | js/ai/role/role-assignment-ui.js:30 |
| `sbDeleteButton` | index.html:1508 | js/sidebar/speechBubble/speech-bubble-freehand.js:9 |
| `sbFillColor` | index.html:1534 | js/project-management.js:260, js/sidebar/speechBubble/speech-bubble-freehand.js:12 |
| `sbFillOpacity` | index.html:1547 | js/project-management.js:264, js/sidebar/speechBubble/speech-bubble-freehand.js:15 |
| `sbFillOpacity2` | index.html:1553 | js/project-management.js:266 |
| `sbFreehandButton` | index.html:1506 | js/sidebar/speechBubble/speech-bubble-freehand.js:6 |
| `sbFreehandHorizontalText` | index.html:1515 |  |
| `sbFreehandNothingText` | index.html:1511 |  |
| `sbFreehandVerticalText` | index.html:1519 |  |
| `sbHorizontalText` | index.html:1474 |  |
| `sbMoveButton` | index.html:1507 | js/sidebar/speechBubble/speech-bubble-freehand.js:8 |
| `sbNothingText` | index.html:1470 |  |
| `sbPointButton` | index.html:1505 | js/sidebar/speechBubble/speech-bubble-freehand.js:5 |
| `sbPointSpace` | index.html:1544 | js/project-management.js:263, js/sidebar/speechBubble/speech-bubble-freehand.js:17 |
| `sbSelectButton` | index.html:1504 | js/sidebar/speechBubble/speech-bubble-freehand.js:7 |
| `sbSmoothing` | index.html:1538 | js/project-management.js:261, js/sidebar/speechBubble/speech-bubble-freehand.js:11 |
| `sbSornerRadius` | index.html:1550 | js/project-management.js:265, js/sidebar/speechBubble/speech-bubble-freehand.js:16 |
| `sbStrokeColor` | index.html:1530 | js/project-management.js:259, js/sidebar/speechBubble/speech-bubble-freehand.js:13 |
| `sbStrokeWidth` | index.html:1541 | js/project-management.js:262, js/sidebar/speechBubble/speech-bubble-freehand.js:14 |
| `sbVerticalText` | index.html:1478 |  |
| `sb_aButton` | index.html:1559 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_bButton` | index.html:1562 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_cButton` | index.html:1565 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_dButton` | index.html:1568 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_eButton` | index.html:1571 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_fButton` | index.html:1574 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_gButton` | index.html:1577 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `scale-control` | index.html:1938 | js/ui/control/common-control-management.js:2 |
| `scratchButton` | index.html:1695 |  |
| `settingsAutoSaveCheckbox` | index.html:301 | js/project-management.js:246, js/sidebar/sidebar-ui.js:24 |
| `settingsReset` | index.html:244 | js/ui/third/base-translation/base-zh.js:590, js/ui/third/i18next.js:4900, scripts/beginner-ux-guards-test.cjs:29 |
| `settingsSave` | index.html:239 | js/project-management.js:19, js/shortcut.js:212, js/ui/third/base-translation/base-de.js:482, js/ui/third/base-translation/base-en.js:397, js/ui/third/base-translation/base-es.js:390, js/ui/third/base-translation/base-fr.js:392, js/ui/third/base-translation/base-ja.js:487, js/ui/third/base-translation/base-ko.js:392, js/ui/third/base-translation/base-ru.js:391, js/ui/third/base-translation/base-zh.js:403, scripts/beginner-ux-guards-test.cjs:29 |
| `sfxPaletteAdd` | index.html:1678 | js/sidebar/text/sfx-palette.js:125 |
| `sfxPaletteInput` | index.html:1668 | js/sidebar/text/sfx-palette.js:126 |
| `sfxPaletteList` | index.html:1666 | js/sidebar/text/sfx-palette.js:107, js/ui/visual-studio.js:93 |
| `sfxPaletteStyle` | index.html:1669 | js/sidebar/text/sfx-palette.js:127 |
| `shadowButton` | index.html:1683 |  |
| `shape-area` | index.html:1979 | js/sidebar/sidebar.js:92, js/ui/visual-ps-tools.js:162, js/ui/visual-studio.js:330, scripts/full-feature-e2e.cjs:174, scripts/ux-screenshots.cjs:35 |
| `shape-preview-area` | index.html:1981 |  |
| `shortcutGrid` | index.html:2267 | js/shortcut.js:319 |
| `shortcutModal` | index.html:2259 | js/shortcut.js:360 |
| `shortcutPage` | index.html:494 | js/ui/third/base-translation/base-de.js:487, js/ui/third/base-translation/base-en.js:497, js/ui/third/base-translation/base-es.js:490, js/ui/third/base-translation/base-fr.js:492, js/ui/third/base-translation/base-ja.js:492, js/ui/third/base-translation/base-ko.js:492, js/ui/third/base-translation/base-ru.js:491, js/ui/third/base-translation/base-zh.js:503 |
| `sidebar` | index.html:604 |  |
| `sidebarMore` | index.html:681 | js/sidebar/sidebar.js:9, js/ui/tutorial.js:150 |
| `sidebarMoreToggle` | index.html:699 | js/sidebar/sidebar.js:8 |
| `simStudioBack` | index.html:2983 | js/simulator/simulator-studio.js:830, js/ui/third/base-translation/base-de.js:523, js/ui/third/base-translation/base-en.js:538, js/ui/third/base-translation/base-es.js:515, js/ui/third/base-translation/base-fr.js:532, js/ui/third/base-translation/base-ja.js:528, js/ui/third/base-translation/base-ko.js:530, js/ui/third/base-translation/base-ru.js:516, js/ui/third/base-translation/base-zh.js:543 |
| `simStudioChatActions` | index.html:3032 | js/simulator/simulator-studio.js:864 |
| `simStudioChatDock` | index.html:2997 | js/simulator/simulator-studio.js:861 |
| `simStudioChatInsert` | index.html:3033 | js/simulator/simulator-studio.js:1051 |
| `simStudioChatLoad` | index.html:3034 | js/simulator/simulator-studio.js:1053 |
| `simStudioChatScript` | index.html:3010 | js/simulator/simulator-studio.js:116 |
| `simStudioChatStore` | index.html:3003 | js/simulator/simulator-studio.js:441 |
| `simStudioChatTemplate` | index.html:3006 | js/simulator/simulator-studio.js:414 |
| `simStudioChatTitle` | index.html:3000 | js/simulator/simulator-studio.js:125 |
| `simStudioClose` | index.html:2985 | js/simulator/simulator-studio.js:1038, js/ui/third/base-translation/base-de.js:524, js/ui/third/base-translation/base-en.js:539, js/ui/third/base-translation/base-es.js:516, js/ui/third/base-translation/base-fr.js:533, js/ui/third/base-translation/base-ja.js:529, js/ui/third/base-translation/base-ko.js:531, js/ui/third/base-translation/base-ru.js:517, js/ui/third/base-translation/base-zh.js:544 |
| `simStudioFit` | index.html:3056 | js/simulator/simulator-studio.js:1088 |
| `simStudioHome` | index.html:2987 | js/simulator/simulator-studio.js:828 |
| `simStudioHomeGrid` | index.html:2989 | js/simulator/simulator-studio.js:462 |
| `simStudioPartActions` | index.html:3041 | js/simulator/simulator-studio.js:866 |
| `simStudioPartDock` | index.html:3021 | js/simulator/simulator-studio.js:863 |
| `simStudioPartForm` | index.html:3028 | js/simulator/simulator-studio.js:429 |
| `simStudioPartInsert` | index.html:3042 | js/simulator/simulator-studio.js:1072 |
| `simStudioPartLoad` | index.html:3043 | js/simulator/simulator-studio.js:1074 |
| `simStudioPartSelect` | index.html:3026 |  |
| `simStudioPartStore` | index.html:3023 | js/simulator/simulator-studio.js:488 |
| `simStudioPlay` | index.html:3048 | js/simulator/simulator-studio.js:1080, js/ui/third/base-translation/base-de.js:530, js/ui/third/base-translation/base-en.js:545, js/ui/third/base-translation/base-es.js:522, js/ui/third/base-translation/base-fr.js:539, js/ui/third/base-translation/base-ja.js:535, js/ui/third/base-translation/base-ko.js:537, js/ui/third/base-translation/base-ru.js:523, js/ui/third/base-translation/base-zh.js:550 |
| `simStudioPlayIndex` | index.html:3050 | js/simulator/simulator-studio.js:515 |
| `simStudioPlayNext` | index.html:3047 | js/simulator/simulator-studio.js:1078, js/ui/third/base-translation/base-de.js:529, js/ui/third/base-translation/base-en.js:544, js/ui/third/base-translation/base-es.js:521, js/ui/third/base-translation/base-fr.js:538, js/ui/third/base-translation/base-ja.js:534, js/ui/third/base-translation/base-ko.js:536, js/ui/third/base-translation/base-ru.js:522, js/ui/third/base-translation/base-zh.js:549 |
| `simStudioPlayPrev` | index.html:3046 | js/simulator/simulator-studio.js:1076, js/ui/third/base-translation/base-de.js:528, js/ui/third/base-translation/base-en.js:543, js/ui/third/base-translation/base-es.js:520, js/ui/third/base-translation/base-fr.js:537, js/ui/third/base-translation/base-ja.js:533, js/ui/third/base-translation/base-ko.js:535, js/ui/third/base-translation/base-ru.js:521, js/ui/third/base-translation/base-zh.js:548 |
| `simStudioPlayStop` | index.html:3049 | js/simulator/simulator-studio.js:1082 |
| `simStudioPlayTotal` | index.html:3050 | js/simulator/simulator-studio.js:516 |
| `simStudioPreview` | index.html:2993 | js/simulator/simulator-studio.js:570 |
| `simStudioPreviewHost` | index.html:2992 | js/simulator/simulator-studio.js:569 |
| `simStudioScaleDown` | index.html:3054 | js/simulator/simulator-studio.js:1084 |
| `simStudioScaleUp` | index.html:3055 | js/simulator/simulator-studio.js:1086 |
| `simStudioStatus` | index.html:3061 | js/simulator/simulator-studio.js:105 |
| `simStudioTitle` | index.html:2984 | js/simulator/simulator-studio.js:834, js/ui/third/base-translation/base-de.js:521, js/ui/third/base-translation/base-en.js:536, js/ui/third/base-translation/base-es.js:513, js/ui/third/base-translation/base-fr.js:530, js/ui/third/base-translation/base-ja.js:526, js/ui/third/base-translation/base-ko.js:528, js/ui/third/base-translation/base-ru.js:514, js/ui/third/base-translation/base-zh.js:541 |
| `simStudioWebActions` | index.html:3036 | js/simulator/simulator-studio.js:865 |
| `simStudioWebDock` | index.html:3014 | js/simulator/simulator-studio.js:862 |
| `simStudioWebExample` | index.html:3037 | js/simulator/simulator-studio.js:1059 |
| `simStudioWebForm` | index.html:3019 | js/simulator/simulator-studio.js:428 |
| `simStudioWebInsert` | index.html:3038 | js/simulator/simulator-studio.js:1055 |
| `simStudioWebLoad` | index.html:3039 | js/simulator/simulator-studio.js:1057 |
| `simStudioWebTemplate` | index.html:3017 | js/simulator/simulator-studio.js:445 |
| `simStudioWork` | index.html:2991 | js/simulator/simulator-studio.js:829 |
| `simulator-chat-area` | index.html:1140 | js/sidebar/sidebar.js:82, js/ui/beginner-guide.js:198 |
| `simulator-extra-section` | index.html:1249 |  |
| `simulator-playback-section` | index.html:1188 |  |
| `simulatorChatAddMessageButton` | index.html:1232 | js/simulator/chat-controller.js:334 |
| `simulatorChatAddParticipantButton` | index.html:1227 | js/simulator/chat-controller.js:326 |
| `simulatorChatExportButton` | index.html:1238 | js/simulator/chat-controller.js:345 |
| `simulatorChatInsertButton` | index.html:1235 | js/simulator/chat-controller.js:339 |
| `simulatorChatLoadButton` | index.html:1236 | js/simulator/chat-controller.js:341 |
| `simulatorChatMessages` | index.html:1231 | js/simulator/chat-controller.js:121, js/ui/third/base-translation/base-de.js:514, js/ui/third/base-translation/base-en.js:529, js/ui/third/base-translation/base-es.js:506, js/ui/third/base-translation/base-fr.js:523, js/ui/third/base-translation/base-ja.js:519, js/ui/third/base-translation/base-ko.js:521, js/ui/third/base-translation/base-ru.js:507, js/ui/third/base-translation/base-zh.js:534 |
| `simulatorChatParticipants` | index.html:1226 | js/simulator/chat-controller.js:86, js/ui/third/base-translation/base-de.js:512, js/ui/third/base-translation/base-en.js:527, js/ui/third/base-translation/base-es.js:504, js/ui/third/base-translation/base-fr.js:521, js/ui/third/base-translation/base-ja.js:517, js/ui/third/base-translation/base-ko.js:519, js/ui/third/base-translation/base-ru.js:505, js/ui/third/base-translation/base-zh.js:532 |
| `simulatorChatRemoveButton` | index.html:1237 | js/simulator/chat-controller.js:343 |
| `simulatorChatStatus` | index.html:1247 | js/simulator/chat-controller.js:48 |
| `simulatorChatTemplate` | index.html:1215 | js/simulator/chat-controller.js:185 |
| `simulatorChatTheme` | index.html:1219 | js/simulator/chat-controller.js:183, js/ui/third/base-translation/base-de.js:511, js/ui/third/base-translation/base-en.js:526, js/ui/third/base-translation/base-es.js:503, js/ui/third/base-translation/base-fr.js:520, js/ui/third/base-translation/base-ja.js:516, js/ui/third/base-translation/base-ko.js:518, js/ui/third/base-translation/base-ru.js:504, js/ui/third/base-translation/base-zh.js:531 |
| `simulatorChatTitleInput` | index.html:1211 | js/simulator/chat-controller.js:181 |
| `simulatorExtraExportButton` | index.html:1264 | js/simulator/simulator-controller.js:115 |
| `simulatorExtraInsertButton` | index.html:1262 | js/simulator/simulator-controller.js:113 |
| `simulatorExtraLoadButton` | index.html:1261 | js/simulator/simulator-controller.js:112 |
| `simulatorExtraLoadSelectedButton` | index.html:1263 | js/simulator/simulator-controller.js:114 |
| `simulatorExtraSceneJson` | index.html:1258 | js/simulator/simulator-controller.js:29, js/simulator/simulator-studio.js:789 |
| `simulatorExtraStatus` | index.html:1266 | js/simulator/simulator-controller.js:10 |
| `simulatorExtraTemplate` | index.html:1255 | js/simulator/simulator-controller.js:46 |
| `simulatorPlaybackExportKeyframes` | index.html:1200 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackExportPages` | index.html:1201 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackIndex` | index.html:1196 | js/core/settings.js:90, js/simulator/playback-controller.js:23 |
| `simulatorPlaybackInterval` | index.html:1197 | js/simulator/playback-controller.js:97 |
| `simulatorPlaybackNext` | index.html:1192 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackPageHeight` | index.html:1198 | js/simulator/playback-controller.js:98 |
| `simulatorPlaybackPlay` | index.html:1193 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackPrevious` | index.html:1191 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackStatus` | index.html:1203 | js/simulator/playback-controller.js:11 |
| `simulatorPlaybackStop` | index.html:1194 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackTotal` | index.html:1196 | js/simulator/playback-controller.js:23 |
| `simulatorStudioOverlay` | index.html:2981 | js/simulator/simulator-studio.js:85 |
| `simulatorWorkspaceTabs` | index.html:1143 | js/assets/asset-library-controller.js:211 |
| `skewX-control` | index.html:1947 | js/ui/control/common-control-management.js:2 |
| `skewY-control` | index.html:1950 | js/ui/control/common-control-management.js:2 |
| `sp-manga-toastContainer` | index.html:2255 | js/ui/toast.js:13, scripts/nai-real-acceptance.cjs:112 |
| `speech-bubble-area` | index.html:1443 | js/sidebar/sidebar.js:84, js/sidebar/speechBubble/speech-bubble-effect.js:303, js/ui/visual-studio.js:317, scripts/full-feature-e2e.cjs:148 |
| `speech-bubble-area1` | index.html:1449 | js/sidebar/sidebar.js:47, js/sidebar/speechBubble/speech-bubble-effect.js:303 |
| `speech-bubble-area2` | index.html:1494 | js/sidebar/sidebar.js:48 |
| `speech-bubble-preview` | index.html:1488 | js/sidebar/panel/panel-manager.js:404, js/sidebar/speechBubble/speech-bubble-effect.js:137, js/ui/visual-studio.js:92 |
| `speech-bubble-svg-preview-area1` | index.html:1452 |  |
| `speech-bubble-svg-preview-area2` | index.html:1500 |  |
| `speechBubbleLineSizeSlider` | index.html:1485 | js/project-management.js:258 |
| `speechBubbleOpacity` | index.html:1463 | js/project-management.js:256, js/sidebar/speechBubble/speech-bubble-effect.js:6 |
| `speechBubbleTabs` | index.html:1445 | js/sidebar/sidebar.js:37 |
| `story-composer-section` | index.html:1150 |  |
| `storyComposerAddCharacter` | index.html:1163 | js/simulator/story-composer-controller.js:318 |
| `storyComposerCharacters` | index.html:1156 | js/simulator/story-composer-controller.js:32 |
| `storyComposerExportJson` | index.html:1180 | js/simulator/story-composer-controller.js:334 |
| `storyComposerFillPrompt` | index.html:1178 | js/simulator/story-composer-controller.js:327 |
| `storyComposerInput` | index.html:1158 | js/simulator/story-composer-controller.js:121 |
| `storyComposerInsert` | index.html:1171 | js/simulator/story-composer-controller.js:319 |
| `storyComposerLoad` | index.html:1179 | js/simulator/story-composer-controller.js:328 |
| `storyComposerManga` | index.html:1172 | js/simulator/story-composer-controller.js:326 |
| `storyComposerNodes` | index.html:1165 | js/simulator/story-composer-controller.js:59 |
| `storyComposerParse` | index.html:1162 | js/simulator/story-composer-controller.js:317 |
| `storyComposerPlusOne` | index.html:1161 | js/simulator/story-composer-controller.js:316 |
| `storyComposerSelectPage` | index.html:1177 | js/simulator/story-composer-controller.js:329 |
| `storyComposerSend` | index.html:1160 | js/simulator/story-composer-controller.js:315 |
| `storyComposerStatus` | index.html:1184 | js/simulator/story-composer-controller.js:18 |
| `storyComposerTemplate` | index.html:1168 | js/simulator/simulator-studio.js:951, js/simulator/story-composer-controller.js:95 |
| `storyComposerTitle` | index.html:1154 | js/simulator/story-composer-controller.js:110 |
| `storyComposerTypes` | index.html:1157 | js/simulator/story-composer-controller.js:272 |
| `svg-container-template` | index.html:703 | js/sidebar/panel/panel-manager.js:392, js/sidebar/sidebar.js:3, js/sidebar/speechBubble/speech-bubble-effect.js:293, js/ui/beginner-guide.js:187, js/ui/visual-studio.js:315 |
| `svg-preview-area-landscape` | index.html:724 | js/sidebar/sidebar.js:105, js/sidebar/speechBubble/speech-bubble-effect.js:136, js/ui/visual-studio.js:91 |
| `svg-preview-area-vertical` | index.html:723 | js/sidebar/sidebar.js:104, js/sidebar/speechBubble/speech-bubble-effect.js:135, js/ui/visual-studio.js:90 |
| `svgDownload` | index.html:267 | js/project-management.js:697, scripts/full-feature-e2e.cjs:237 |
| `svg_icon_fillColor` | index.html:2020 | js/core/svg/google-icon-helper.js:154, js/project-management.js:269 |
| `svg_icon_fillOpacity` | index.html:2026 | js/core/svg/google-icon-helper.js:155, js/project-management.js:271 |
| `svg_icon_iconStyle` | index.html:2003 | js/core/svg/google-icon-helper.js:55, js/project-management.js:267 |
| `svg_icon_lineColor` | index.html:2016 | js/core/svg/google-icon-helper.js:153, js/project-management.js:268 |
| `svg_icon_lineWidth` | index.html:2023 | js/core/svg/google-icon-helper.js:156, js/project-management.js:270 |
| `svg_icon_results` | index.html:2049 | js/core/svg/google-icon-helper.js:53 |
| `svg_icon_searchInput` | index.html:1996 | js/core/svg/google-icon-helper.js:84 |
| `svg_icon_shadowBlur` | index.html:2037 | js/core/svg/google-icon-helper.js:184, js/project-management.js:273 |
| `svg_icon_shadowColor` | index.html:2034 | js/core/svg/google-icon-helper.js:183, js/project-management.js:272 |
| `svg_icon_shadowOffsetX` | index.html:2040 | js/core/svg/google-icon-helper.js:185, js/project-management.js:274 |
| `svg_icon_shadowOffsetY` | index.html:2043 | js/core/svg/google-icon-helper.js:186, js/project-management.js:275 |
| `table-header` | html/functionList.html:42 | html/functionList.html:293 |
| `template-orientation-toggle` | index.html:707 | js/sidebar/sidebar.js:103, js/sidebar/speechBubble/speech-bubble-effect.js:294 |
| `text-area` | index.html:1586 | js/sidebar/sidebar.js:86, js/ui/visual-studio.js:319, scripts/full-feature-e2e.cjs:155 |
| `text-area2` | index.html:1660 | js/sidebar/sidebar.js:87, js/ui/visual-studio.js:322 |
| `text-area2-settings` | index.html:1739 | js/sidebar/text/text-2-manager.js:126 |
| `text-preview-area` | index.html:1588 |  |
| `textBgColorPicker` | index.html:1628 | js/project-management.js:297, js/sidebar/text/text-effect.js:122, js/sidebar/text/vertical-text.js:19 |
| `textColorPicker` | index.html:1620 | js/project-management.js:295, js/sidebar/speechBubble/speech-bubble-freehand.js:643, js/sidebar/speechBubble/speech-bubble-text.js:217, js/sidebar/text/text-effect.js:113, js/sidebar/text/vertical-text.js:16 |
| `textOutlineColorPicker` | index.html:1624 | js/project-management.js:296, js/sidebar/speechBubble/speech-bubble-freehand.js:644, js/sidebar/speechBubble/speech-bubble-text.js:218, js/sidebar/text/text-effect.js:117, js/sidebar/text/vertical-text.js:17 |
| `thrillButton` | index.html:1726 |  |
| `tiltRandom` | index.html:984 | js/project-management.js:284, js/sidebar/panel/knife/knife-split-engine.js:70 |
| `toggleAiPanelButton` | index.html:2083 | js/ui/beginner-guide.js:409 |
| `toggleGridButton` | index.html:464 | js/panel/grid.js:103 |
| `toneList` | html/Minual/screen-tone.html:61 |  |
| `tool-area` | index.html:1826 | js/sidebar/pen/pen-tools.js:663, js/sidebar/sidebar.js:63, js/ui/util/event-delegator.js:62, js/ui/visual-studio.js:340 |
| `tool-settings` | index.html:1868 | js/sidebar/pen/pen-tools.js:114 |
| `top-control` | index.html:1941 | js/ui/control/common-control-management.js:2 |
| `undo` | index.html:2155 | html/Shortcut/shortcut.html:65, js/core/svg/google-icon-names.js:11, js/ui/third/base-translation/base-de.js:315, js/ui/third/base-translation/base-en.js:321, js/ui/third/base-translation/base-es.js:314, js/ui/third/base-translation/base-fr.js:315, js/ui/third/base-translation/base-ja.js:320, js/ui/third/base-translation/base-ko.js:315, js/ui/third/base-translation/base-ru.js:315, js/ui/third/base-translation/base-zh.js:326, js/ui/third/tippy.js:90 |
| `unifiedSettingsOverlay` | index.html:2273 | js/ai/ui/unified-settings-window.js:4 |
| `usTabAI` | index.html:2280 | js/ui/third/i18next.js:1537 |
| `verticalRandomPanelCount` | index.html:978 | js/panel/random-cut.js:10, js/project-management.js:282, js/ui/third/base-translation/base-de.js:114, js/ui/third/base-translation/base-en.js:119, js/ui/third/base-translation/base-es.js:114, js/ui/third/base-translation/base-fr.js:114, js/ui/third/base-translation/base-ja.js:118, js/ui/third/base-translation/base-ko.js:114, js/ui/third/base-translation/base-ru.js:114, js/ui/third/base-translation/base-zh.js:119 |
| `verticalText` | index.html:1599 | js/layer/layer-management.js:213, js/sidebar/text/vertical-text.js:3, js/ui/visual-studio.js:395 |
| `view_controls_checkbox` | index.html:342 | js/project-management.js:195, js/shortcut.js:75, js/sidebar/panel/panel-manager.js:650, js/ui/beginner-guide.js:349 |
| `view_layers_checkbox` | index.html:333 | js/project-management.js:194, js/shortcut.js:68, js/sidebar/panel/panel-manager.js:647 |
| `view_prompt_checkbox` | index.html:351 | js/project-management.js:247, js/shortcut.js:220, js/sidebar/panel/panel-manager.js:653 |
| `wildButton` | index.html:1689 |  |
| `zebraButton` | index.html:1732 |  |
| `zoomFit` | index.html:2076 | js/ui/third/base-translation/base-de.js:314, js/ui/third/base-translation/base-en.js:320, js/ui/third/base-translation/base-es.js:313, js/ui/third/base-translation/base-fr.js:314, js/ui/third/base-translation/base-ja.js:319, js/ui/third/base-translation/base-ko.js:314, js/ui/third/base-translation/base-ru.js:314, js/ui/third/base-translation/base-zh.js:325, js/ui/third/tippy.js:88 |
| `zoomIn` | index.html:2070 | js/ui/third/base-translation/base-de.js:312, js/ui/third/base-translation/base-en.js:318, js/ui/third/base-translation/base-es.js:311, js/ui/third/base-translation/base-fr.js:312, js/ui/third/base-translation/base-ja.js:317, js/ui/third/base-translation/base-ko.js:312, js/ui/third/base-translation/base-ru.js:312, js/ui/third/base-translation/base-zh.js:323, js/ui/third/tippy.js:86 |
| `zoomOut` | index.html:2073 | js/ui/third/base-translation/base-de.js:313, js/ui/third/base-translation/base-en.js:319, js/ui/third/base-translation/base-es.js:312, js/ui/third/base-translation/base-fr.js:313, js/ui/third/base-translation/base-ja.js:318, js/ui/third/base-translation/base-ko.js:313, js/ui/third/base-translation/base-ru.js:313, js/ui/third/base-translation/base-zh.js:324, js/ui/third/tippy.js:87 |

## 定義が見つからない参照（要確認）

| id | 参照しているファイル |
|----|--------------------|
| `ExternalService_Heartbeat_Label_fw` | js/ai/provider/novelai-provider.js:148 |
| `T2-Orientation-horizontal` | js/sidebar/text/text-2-manager.js:139 |
| `T2-Orientation-vertical` | js/sidebar/text/text-2-manager.js:138 |
| `T2-align-center` | js/sidebar/text/text-2-manager.js:136 |
| `T2-align-left` | js/sidebar/text/text-2-manager.js:135 |
| `T2-align-right` | js/sidebar/text/text-2-manager.js:137 |
| `addGlowEffectCheckBox` | js/sidebar/effect/effect-manager.js:117 |
| `blendApplyButton` | js/layer/blend/blend.js:212 |
| `blendFillColor` | js/layer/blend/blend.js:634 |
| `blendFloatingWindow` | js/layer/blend/blend.js:491 |
| `blendImageListBody` | js/layer/blend/blend.js:418 |
| `blendModes` | js/layer/blend/blend.js:227 |
| `blendSelectedInfo` | js/layer/blend/blend.js:207 |
| `btm-dialog-cancel` | js/ui/bottom-bar.js:430 |
| `btm-dialog-submit` | js/ui/bottom-bar.js:431 |
| `canvas-area .area-header` | js/ai/gpt-region-editor.js:1053, js/ai/manga-character-bible-ui.js:181, js/ai/manga-page-structure-ui.js:346, js/ai/manga-smart-text-editor.js:436 |
| `checSD_WebUI_Announce` | js/ai/ai-management.js:108 |
| `com-fill` | js/ui/canvas-object-menu.js:468 |
| `com-lineWidth` | js/ui/canvas-object-menu.js:432 |
| `com-opacity` | js/ui/canvas-object-menu.js:470 |
| `com-strokeColor` | js/ui/canvas-object-menu.js:469 |
| `comfyGuideDontShow` | js/ui/tutorial.js:362 |
| `customBrushAngle` | js/sidebar/pen/pen-tools.js:501 |
| `customBrushApplyButton` | js/sidebar/pen/pen-tools.js:608 |
| `customBrushColor` | js/sidebar/pen/pen-tools.js:497 |
| `customBrushDeleteButton` | js/sidebar/pen/pen-tools.js:622 |
| `customBrushEngine` | js/sidebar/pen/pen-tools.js:494 |
| `customBrushExportButton` | js/sidebar/pen/pen-tools.js:633 |
| `customBrushFollowPath` | js/sidebar/pen/pen-tools.js:505 |
| `customBrushHardness` | js/sidebar/pen/pen-tools.js:499 |
| `customBrushImportInput` | js/sidebar/pen/pen-tools.js:643 |
| `customBrushName` | js/sidebar/pen/pen-tools.js:493 |
| `customBrushOpacity` | js/sidebar/pen/pen-tools.js:496 |
| `customBrushPresetSelect` | js/sidebar/pen/pen-tools.js:489 |
| `customBrushSaveButton` | js/sidebar/pen/pen-tools.js:610 |
| `customBrushScatter` | js/sidebar/pen/pen-tools.js:500 |
| `customBrushSize` | js/sidebar/pen/pen-tools.js:495 |
| `customBrushSmoothing` | js/sidebar/pen/pen-tools.js:504 |
| `customBrushSpacing` | js/sidebar/pen/pen-tools.js:498 |
| `customBrushTaperEnd` | js/sidebar/pen/pen-tools.js:503 |
| `customBrushTaperStart` | js/sidebar/pen/pen-tools.js:502 |
| `customBrushTipInput` | js/sidebar/pen/pen-tools.js:595 |
| `effectEnhanceDarkIntensity` | js/core/util/image-util.js:321, js/sidebar/effect/effect-manager.js:128 |
| `effectEnhanceDarkSubmit` | js/sidebar/effect/effect-manager.js:129 |
| `fabricjs-delete-btn` | js/ui/canvas-object-menu.js:389 |
| `fabricjs-language-selector` | js/ui/canvas-object-menu.js:2 |
| `featureTable tbody` | html/functionList.html:267 |
| `firstTextEffectColorPicker` | js/sidebar/text/text-effect.js:340 |
| `fm-fontFileUpload` | js/ui/font/user-font-manager.js:107 |
| `fm-fontManagerModal` | js/core/font/font-manager-core.js:500 |
| `fm-localFontInput` | js/core/font/font-manager-core.js:378 |
| `fm-modalOverlay` | js/core/font/font-manager-core.js:503 |
| `fm-registeredFontList` | js/ui/font/user-font-manager.js:65 |
| `fm-styles` | js/core/font/font-dropdown.js:51 |
| `fm-userFontGroup` | js/core/font/font-manager-core.js:362 |
| `fm-webFontUrlInput` | js/core/font/font-manager-core.js:427 |
| `fontSelectorMenu` | js/ui/canvas-object-menu.js:363 |
| `glfxApplyButton` | js/ui/control/glfx-control.js:406 |
| `glfxBlurAngle` | js/ui/control/glfx-control.js:17 |
| `glfxBlurBrightness` | js/ui/control/glfx-control.js:16 |
| `glfxBlurRadius` | js/ui/control/glfx-control.js:15 |
| `glfxBrightness` | js/ui/control/glfx-control.js:5 |
| `glfxBulgeCenterX` | js/ui/control/glfx-control.js:35 |
| `glfxBulgeCenterY` | js/ui/control/glfx-control.js:36 |
| `glfxBulgeRadius` | js/ui/control/glfx-control.js:37 |
| `glfxBulgeStrength` | js/ui/control/glfx-control.js:38 |
| `glfxContrast` | js/ui/control/glfx-control.js:6 |
| `glfxDotAngle` | js/ui/control/glfx-control.js:30 |
| `glfxDotSize` | js/ui/control/glfx-control.js:31 |
| `glfxEdgeRadius` | js/ui/control/glfx-control.js:32 |
| `glfxEndX` | js/ui/control/glfx-control.js:20 |
| `glfxEndY` | js/ui/control/glfx-control.js:21 |
| `glfxFilter` | js/ui/control/glfx-control.js:154 |
| `glfxGradientRadius` | js/ui/control/glfx-control.js:23 |
| `glfxHalftoneAngle` | js/ui/control/glfx-control.js:28 |
| `glfxHalftoneSize` | js/ui/control/glfx-control.js:29 |
| `glfxHexScale` | js/ui/control/glfx-control.js:33 |
| `glfxHue` | js/ui/control/glfx-control.js:7 |
| `glfxInkStrength` | js/ui/control/glfx-control.js:34 |
| `glfxResetButton` | js/ui/control/glfx-control.js:410 |
| `glfxSaturation` | js/ui/control/glfx-control.js:8 |
| `glfxSepiaAmount` | js/ui/control/glfx-control.js:9 |
| `glfxStartX` | js/ui/control/glfx-control.js:18 |
| `glfxStartY` | js/ui/control/glfx-control.js:19 |
| `glfxSwirlAngle` | js/ui/control/glfx-control.js:42 |
| `glfxSwirlCenterX` | js/ui/control/glfx-control.js:39 |
| `glfxSwirlCenterY` | js/ui/control/glfx-control.js:40 |
| `glfxSwirlRadius` | js/ui/control/glfx-control.js:41 |
| `glfxTiltBlurRadius` | js/ui/control/glfx-control.js:22 |
| `glfxTriangleRadius` | js/ui/control/glfx-control.js:24 |
| `glfxUnsharpRadius` | js/ui/control/glfx-control.js:10 |
| `glfxUnsharpStrength` | js/ui/control/glfx-control.js:11 |
| `glfxVibranceAmount` | js/ui/control/glfx-control.js:12 |
| `glfxVignetteAmount` | js/ui/control/glfx-control.js:14 |
| `glfxVignetteSize` | js/ui/control/glfx-control.js:13 |
| `glfxZoomCenterX` | js/ui/control/glfx-control.js:25 |
| `glfxZoomCenterY` | js/ui/control/glfx-control.js:26 |
| `glfxZoomStrength` | js/ui/control/glfx-control.js:27 |
| `glowOutLineColorPicker` | js/sidebar/effect/effect-manager.js:119 |
| `glowOutLineSlider` | js/sidebar/effect/effect-manager.js:118 |
| `gradientDirection` | js/layer/blend/blend.js:602 |
| `gradientEnd` | js/layer/blend/blend.js:627 |
| `gradientStart` | js/layer/blend/blend.js:625 |
| `h div` | index.html:118 |
| `head-id .left_area` | js/ui/visual-studio.js:44 |
| `id` | scripts/gen-project-index.cjs:188 |
| `img2imgScale` | js/ui/ai/auto-prompt-ui.js:138 |
| `img2img_denoise` | js/ui/ai/auto-prompt-ui.js:141 |
| `iph-breadcrumb` | js/ui/imagePromptHelper/image-prompt-helper.js:499 |
| `iph-cat-panel` | js/ui/imagePromptHelper/image-prompt-helper.js:408 |
| `iph-clear-button` | js/ui/imagePromptHelper/image-prompt-helper.js:125 |
| `iph-copy-button` | js/ui/imagePromptHelper/image-prompt-helper.js:105 |
| `iph-download-button` | js/ui/imagePromptHelper/image-prompt-helper.js:114 |
| `iph-free-input` | js/ui/imagePromptHelper/image-prompt-helper.js:676, js/ui/imagePromptHelper/prompt-helper.js:9 |
| `iph-img-grid` | js/ui/imagePromptHelper/image-prompt-helper.js:507 |
| `iph-major-tabs` | js/ui/imagePromptHelper/image-prompt-helper.js:368 |
| `iph-name-input` | js/ui/imagePromptHelper/prompt-helper.js:8 |
| `iph-prompt-box` | js/ui/imagePromptHelper/image-prompt-helper.js:131 |
| `iph-prompt-copy` | js/ui/imagePromptHelper/image-prompt-helper.js:130 |
| `iph-prompt-download` | js/ui/imagePromptHelper/image-prompt-helper.js:139 |
| `iph-save-button` | js/ui/imagePromptHelper/prompt-helper.js:7 |
| `iph-search-input` | js/ui/imagePromptHelper/image-prompt-helper.js:100 |
| `iph-sel-list` | js/ui/imagePromptHelper/image-prompt-helper.js:613 |
| `languageFlag` | js/ui/third/i18next.js:5694 |
| `line-style` | js/sidebar/pen/pen-tools.js:123 |
| `manga-tone-buttons button, #manga-effect-buttons button, #pen-tool-buttons button, #image-text-tool-buttons button, .visual-shape-grid button, .visual-text-grid button` | js/ui/visual-studio.js:110 |
| `mangaBubbleList` | js/ai/manga-page-structure-ui.js:175 |
| `mangaCharacterCards` | js/ai/manga-character-bible-ui.js:85 |
| `mangaCharacterImport` | js/ai/manga-character-bible-ui.js:156 |
| `mangaCharacterName` | js/ai/manga-character-bible-ui.js:126 |
| `mangaCharacterNotes` | js/ai/manga-character-bible-ui.js:130 |
| `mangaCharacterPanel` | js/ai/manga-character-bible-ui.js:103 |
| `mangaCharacterPhotos` | js/ai/manga-character-bible-ui.js:124 |
| `mangaCharacterSave` | js/ai/manga-character-bible-ui.js:121 |
| `mangaCharacterStatus` | js/ai/manga-character-bible-ui.js:50 |
| `mangaCharacterTraits` | js/ai/manga-character-bible-ui.js:129 |
| `mangaGptApply` | scripts/full-feature-e2e.cjs:363, scripts/gpt-browser-acceptance.cjs:1110 |
| `mangaGptGenerate` | scripts/full-feature-e2e.cjs:401, scripts/gpt-browser-acceptance.cjs:197, scripts/gpt-real-api-acceptance.cjs:246 |
| `mangaGptMode` | scripts/gpt-browser-acceptance.cjs:876 |
| `mangaGptOpen` | scripts/gpt-browser-acceptance.cjs:1136 |
| `mangaGptPanel` | scripts/full-feature-e2e.cjs:350, scripts/gpt-browser-acceptance.cjs:608 |
| `mangaGptPreview` | scripts/gpt-browser-acceptance.cjs:877 |
| `mangaGptPrompt` | scripts/full-feature-e2e.cjs:343, scripts/gpt-browser-acceptance.cjs:875 |
| `mangaGptReferenceList` | scripts/full-feature-e2e.cjs:343, scripts/gpt-browser-acceptance.cjs:1087 |
| `mangaGptReplaceText` | scripts/gpt-browser-acceptance.cjs:410 |
| `mangaGptStatus` | scripts/full-feature-e2e.cjs:363, scripts/gpt-browser-acceptance.cjs:204, scripts/gpt-real-api-acceptance.cjs:138 |
| `mangaGptSubtitle` | scripts/gpt-browser-acceptance.cjs:409 |
| `mangaLamaConfirm` | js/ai/manga-lama-inpaint-ui.js:108, scripts/full-feature-e2e.cjs:312, scripts/gpt-browser-acceptance.cjs:741, scripts/manga-real-ui-acceptance.cjs:96 |
| `mangaLamaGenerate` | js/ai/manga-lama-inpaint-ui.js:263, scripts/full-feature-e2e.cjs:308, scripts/gpt-browser-acceptance.cjs:819, scripts/manga-real-ui-acceptance.cjs:92 |
| `mangaLamaMaskCanvas` | js/ai/manga-lama-inpaint-ui.js:61, scripts/full-feature-e2e.cjs:308, scripts/gpt-browser-acceptance.cjs:736, scripts/manga-real-ui-acceptance.cjs:91 |
| `mangaLamaPreviewImg` | js/ai/manga-lama-inpaint-ui.js:109, scripts/gpt-browser-acceptance.cjs:792 |
| `mangaLamaPreviewPanel` | js/ai/manga-lama-inpaint-ui.js:163, scripts/gpt-browser-acceptance.cjs:740 |
| `mangaLamaStatus` | js/ai/manga-lama-inpaint-ui.js:16, scripts/full-feature-e2e.cjs:313, scripts/gpt-browser-acceptance.cjs:750, scripts/manga-real-ui-acceptance.cjs:97 |
| `mangaPageAnalyze` | js/ai/manga-page-structure-ui.js:286 |
| `mangaPageClose` | js/ai/manga-page-structure-ui.js:371 |
| `mangaPageDirection` | js/ai/manga-page-structure-ui.js:294 |
| `mangaPageExport` | js/ai/manga-page-structure-ui.js:383 |
| `mangaPageList` | js/ai/manga-edit-planner-ui.js:116, js/ai/manga-page-structure-ui.js:89 |
| `mangaPageOverlay .manga-page-bubble-outline` | scripts/gpt-browser-acceptance.cjs:930 |
| `mangaPageOverlay .manga-page-outline` | scripts/gpt-browser-acceptance.cjs:903 |
| `mangaPagePanel` | js/ai/manga-edit-planner-ui.js:69, js/ai/manga-page-structure-ui.js:241, scripts/gpt-browser-acceptance.cjs:1013 |
| `mangaPageShowBubbles` | js/ai/manga-page-structure-ui.js:380 |
| `mangaPageShowOverlay` | js/ai/manga-page-structure-ui.js:376 |
| `mangaPageStatus` | js/ai/manga-page-structure-ui.js:22 |
| `mangaPlannerBox` | js/ai/manga-edit-planner-ui.js:89 |
| `mangaPlannerConfirm` | js/ai/manga-edit-planner-ui.js:24 |
| `mangaPlannerInput` | js/ai/manga-edit-planner-ui.js:30 |
| `mangaPlannerPreview` | js/ai/manga-edit-planner-ui.js:22, scripts/gpt-browser-acceptance.cjs:1003 |
| `mangaPlannerStatus` | js/ai/manga-edit-planner-ui.js:11 |
| `mangaSmartApply` | js/ai/manga-smart-text-editor.js:81 |
| `mangaSmartCancel` | js/ai/manga-smart-text-editor.js:13 |
| `mangaSmartClose` | js/ai/manga-smart-text-editor.js:463 |
| `mangaSmartDetect` | js/ai/manga-smart-text-editor.js:80 |
| `mangaSmartLanguage` | js/ai/manga-smart-text-editor.js:218 |
| `mangaSmartManual` | js/ai/manga-smart-text-editor.js:466 |
| `mangaSmartRegions` | js/ai/manga-smart-text-editor.js:120 |
| `mangaSmartStatus` | js/ai/manga-smart-text-editor.js:34, scripts/full-feature-e2e.cjs:289, scripts/manga-real-ui-acceptance.cjs:72 |
| `mangaSmartTextPanel` | js/ai/manga-edit-planner-ui.js:66, js/ai/manga-smart-text-editor.js:149, scripts/gpt-browser-acceptance.cjs:1043 |
| `naiBootGuard` | js/assets/boot-guard.js:25 |
| `naiBootGuardProbe` | js/assets/boot-guard.js:32 |
| `naiBrushCursor` | js/ui/visual-studio.js:125 |
| `naiDirectorDraft` | js/ui/ai/auto-prompt-ui.js:41 |
| `naiDirectorPlanPreview` | js/ui/ai/auto-prompt-ui.js:10 |
| `naiOptBrushSize` | js/ui/visual-studio.js:359 |
| `new-negative-prompt1-new` | js/ui/prompt-manager.js:40 |
| `new-negative-prompt2-new` | js/ui/prompt-manager.js:41 |
| `new-negative-prompt3-new` | js/ui/prompt-manager.js:42 |
| `new-prompt1-new` | js/ui/prompt-manager.js:37 |
| `new-prompt2-new` | js/ui/prompt-manager.js:38 |
| `new-prompt3-new` | js/ui/prompt-manager.js:39 |
| `old-negative-prompt1-old` | js/ui/prompt-manager.js:40 |
| `old-negative-prompt2-old` | js/ui/prompt-manager.js:41 |
| `old-negative-prompt3-old` | js/ui/prompt-manager.js:42 |
| `old-prompt1-old` | js/ui/prompt-manager.js:37 |
| `old-prompt2-old` | js/ui/prompt-manager.js:38 |
| `old-prompt3-old` | js/ui/prompt-manager.js:39 |
| `otherControlsPanel .area-header` | js/ai/novelai-only-mode.js:79 |
| `pen-tool-buttons [data-brush]` | js/sidebar/pen/pen-tools.js:675 |
| `promptRun` | js/ui/ai/auto-prompt-ui.js:119 |
| `sidebar .icon-wrapper i.active` | js/simulator/simulator-studio.js:820 |
| `sidebar .icon-wrapper[data-action="openSimulatorStudio"] i` | js/simulator/simulator-studio.js:821 |
| `sidebar .icon-wrapper[data-action='selectCrop']` | js/sidebar/pen/pen-tools.js:699 |
| `sidebar .icon-wrapper[data-action='selectEraser']` | js/sidebar/pen/pen-tools.js:685 |
| `sidebar .icon-wrapper[data-action='selectMarquee']` | js/sidebar/pen/pen-tools.js:692 |
| `sidebar .icon-wrapper[data-action='selectMove']` | js/sidebar/pen/pen-tools.js:678 |
| `sidebar .icon-wrapper[data-ps-tool]` | js/ui/visual-ps-tools.js:113 |
| `sidebar .icon-wrapper[data-target="tool-area"]` | js/sidebar/pen/pen-tools.js:669 |
| `sidebar .icon-wrapper[data-target]` | js/sidebar/sidebar.js:66, js/ui/visual-studio.js:418 |
| `sourceImages` | js/layer/blend/blend.js:315 |
| `sp-manga-toastMessageContainer` | js/ui/toast.js:49 |
| `speed-line-style` | js/sidebar/tone/speedline.js:81 |
| `t2_shadow_dualShadow` | js/sidebar/text/custom/optimized-shadow-text.js:121 |
| `testCanvas` | js/core/font/font-manager-core.js:611 |
| `text2img_negative` | js/ui/ai/auto-prompt-ui.js:61 |
| `text2img_prompt` | js/ui/ai/auto-prompt-ui.js:40 |
| `tool-settings input[type="range"]` | js/ui/visual-studio.js:65 |
| `tutorialCloseHint` | js/ui/tutorial.js:259 |
| `tutorialDontShow` | js/ui/tutorial.js:252 |
| `tutorialExitBtn` | js/ui/tutorial.js:198 |
| `tutorialGotIt` | js/ui/tutorial.js:260 |
| `tutorialNextBtn` | js/ui/tutorial.js:194 |
| `tutorialSkipBtn` | js/ui/tutorial.js:108 |
| `tutorialStartBtn` | js/ui/tutorial.js:103 |
| `unifiedSettingsOverlay .us-header h2` | js/ai/novelai-only-mode.js:61 |
| `unifiedSettingsOverlay .us-left .us-panel-title` | js/ai/novelai-only-mode.js:63 |

## 参照しているファイル → id

- html/Shortcut/shortcut.html : `redo`, `undo`
- html/functionList.html : `btn-en`, `btn-ja`, `featureTable tbody`, `page-title`, `table-header`
- index.html : `a`, `btm-drawer`, `desu-nav`, `h div`, `head-id`, `i`, `j`, `k`
- js/ai/ai-management.js : `ExternalService_Heartbeat_Container`, `apiHeartbeatCheckbox`, `checSD_WebUI_Announce`, `novelaiConcurrency`
- js/ai/ai-settings.js : `ScenarioPromptSelecter`, `apiHeartbeatCheckbox`, `naiBatchAcceptanceButton`, `naiBatchAcceptanceConfirmButton`, `naiBatchAcceptanceGate`, `naiBatchAutoGenerateAfterPrompts`, `naiBatchSaveTagDnaButton`, `naiCompositionAgent`, `naiDirectorAdjustCanvas`, `naiDirectorApiKey`, `naiDirectorApiKeyToggle`, `naiDirectorApiUrl`, `naiDirectorHonorCharacterCards`, `naiDirectorMessageMode`, `naiDirectorModel`, `naiDirectorModelList`, `naiDirectorRefreshModels`, `naiDirectorResetSystemPrompt`, `naiDirectorStoreDrafts`, `naiDirectorSystemPrompt`, `naiDirectorTestApi`, `naiDirectorTimeout`, `naiDirectorUseApi`, `naiDirectorUseProxy`, `naiDirectorUseTagAnchors`, `naiGenerateComicDemo`, `naiGenerateMaterialPreviews`, `naiHealthCheck`, `naiMaterialPreviewStatus`, `naiToolJobStatus`, `novelaiApiKey`, `novelaiApiKeyToggle`, `novelaiApiUrl`, `novelaiApiUrlDefaultUrl`, `novelaiCfgRescale`, `novelaiConcurrency`, `novelaiDashboard`, `novelaiI2INoise`, `novelaiI2IStrength`, `novelaiModel`, `novelaiQualityToggle`, `novelaiSM`, `novelaiSMDyn`, `novelaiSampler`, `novelaiScale`, `novelaiSteps`, `novelaiUcPreset`, `novelaiUseLocalProxy`
- js/ai/director/scene-plan-controller.js : `naiScenePlanApply`, `naiScenePlanGenerate`, `naiScenePlanInput`, `naiScenePlanJson`, `naiScenePlanPreview`, `naiScenePlanRetry`, `naiScenePlanRollback`, `naiScenePlanStatus`
- js/ai/gpt-region-editor.js : `canvas-area .area-header`, `edit`
- js/ai/manga-character-bible-ui.js : `a`, `canvas-area .area-header`, `mangaCharacterCards`, `mangaCharacterImport`, `mangaCharacterName`, `mangaCharacterNotes`, `mangaCharacterPanel`, `mangaCharacterPhotos`, `mangaCharacterSave`, `mangaCharacterStatus`, `mangaCharacterTraits`
- js/ai/manga-edit-planner-ui.js : `mangaPageList`, `mangaPagePanel`, `mangaPlannerBox`, `mangaPlannerConfirm`, `mangaPlannerInput`, `mangaPlannerPreview`, `mangaPlannerStatus`, `mangaSmartTextPanel`
- js/ai/manga-importer.js : `bg-color`, `mangaImportAutoTag`, `mangaImportCharacterPlaceholders`, `mangaImportCharacterReferences`, `mangaImportDirectorButton`, `mangaImportGenerateButton`, `mangaImportInput`, `mangaImportKeepReference`, `mangaImportMinPanelArea`, `mangaImportPanelThreshold`, `mangaImportPickButton`, `mangaImportPreflightButton`, `mangaImportRetagButton`, `mangaImportSelectNextPanelButton`, `mangaImportSelectPlaceholderButton`, `mangaImportStatus`, `mangaImportTaggerThreshold`, `mangaImportTaggerUrl`, `mangaImportUseTaggerProxy`, `naiBatchDirectorEnabled`, `naiBatchDirectorPrompt`
- js/ai/manga-lama-inpaint-ui.js : `add`, `mangaLamaConfirm`, `mangaLamaGenerate`, `mangaLamaMaskCanvas`, `mangaLamaPreviewImg`, `mangaLamaPreviewPanel`, `mangaLamaStatus`
- js/ai/manga-page-structure-ui.js : `a`, `canvas-area .area-header`, `mangaBubbleList`, `mangaPageAnalyze`, `mangaPageClose`, `mangaPageDirection`, `mangaPageExport`, `mangaPageList`, `mangaPagePanel`, `mangaPageShowBubbles`, `mangaPageShowOverlay`, `mangaPageStatus`
- js/ai/manga-smart-text-editor.js : `canvas-area .area-header`, `mangaSmartApply`, `mangaSmartCancel`, `mangaSmartClose`, `mangaSmartDetect`, `mangaSmartLanguage`, `mangaSmartManual`, `mangaSmartRegions`, `mangaSmartStatus`, `mangaSmartTextPanel`
- js/ai/novelai-only-mode.js : `negativeAreaId`, `otherControlsPanel .area-header`, `unifiedSettingsOverlay .us-header h2`, `unifiedSettingsOverlay .us-left .us-panel-title`
- js/ai/panel-pipeline-review.js : `a`, `naiExportAllPagesPngButton`, `naiGoNextReviewPanelButton`, `naiMarkPanelsForManualReview`
- js/ai/prompt/auto/auto-generation.js : `ScenarioPromptSelecter`, `onePanelGenerateNumber`
- js/ai/prompt/auto/auto-prompt-util.js : `ScenarioPromptSelecter`, `naiBatchAcceptanceGate`, `naiBatchAutoGenerateAfterPrompts`, `naiBatchDirectorEnabled`, `naiBatchDirectorPrompt`
- js/ai/prompt/auto/character-card-manager.js : `naiCharacterAddCard`, `naiCharacterAddMaterial`, `naiCharacterCardList`, `naiCharacterMaterialCategory`, `naiCharacterMaterialTag`, `naiCharacterTargetSelect`
- js/ai/prompt/auto/story-prompt-map.js : `ScenarioPromptSelecter`
- js/ai/prompt/base-event-listener.js : `basePrompt_height`, `basePrompt_negative`, `basePrompt_prompt`, `basePrompt_seed`, `basePrompt_width`
- js/ai/prompt/director-safety.js : `novelaiApiKey`
- js/ai/prompt/novelai-composition-director.js : `naiCompositionAgent`, `naiDirectorAdjustCanvas`, `naiDirectorApiKey`, `naiDirectorApiUrl`, `naiDirectorHonorCharacterCards`, `naiDirectorMessageMode`, `naiDirectorModel`, `naiDirectorSystemPrompt`, `naiDirectorTimeout`, `naiDirectorUseApi`, `naiDirectorUseProxy`, `naiDirectorUseTagAnchors`
- js/ai/provider/novelai-provider.js : `ExternalService_Heartbeat_Label_fw`, `novelaiApiKey`, `novelaiApiUrl`, `novelaiCfgRescale`, `novelaiI2INoise`, `novelaiI2IStrength`, `novelaiModel`, `novelaiQualityToggle`, `novelaiSM`, `novelaiSMDyn`, `novelaiSampler`, `novelaiScale`, `novelaiSteps`, `novelaiUcPreset`, `novelaiUseLocalProxy`
- js/ai/role/role-assignment-ui.js : `roleMatrixBody`
- js/ai/ui/ai-ui-util.js : `negativeAreaId`, `prompt-A`, `prompt-E`, `prompt-F`
- js/ai/ui/unified-settings-window.js : `unifiedSettingsOverlay`
- js/assets/asset-library-controller.js : `assetLibraryExportButton`, `assetLibraryGroups`, `assetLibraryImportButton`, `assetLibraryInput`, `assetLibraryList`, `assetLibraryNext`, `assetLibraryPackInput`, `assetLibraryPageLabel`, `assetLibraryPager`, `assetLibraryPrev`, `assetLibraryRestoreButton`, `assetLibrarySearch`, `assetLibraryStatus`, `assetLibraryTags`, `mangaImageCanvas`, `simulatorWorkspaceTabs`
- js/assets/asset-pack.js : `a`
- js/assets/boot-guard.js : `naiBootGuard`, `naiBootGuardProbe`
- js/assets/image2-controller.js : `image2-section`, `image2Height`, `image2JobList`, `image2Negative`, `image2Prompt`, `image2Provider`, `image2RunButton`, `image2Status`, `image2Tags`, `image2Transparent`, `image2Width`
- js/canvas-manager.js : `bg-color`, `bgColorButton`, `bgColorSwatch`, `bgColorValue`, `canvas-area`, `canvas-container`, `exportPxCappedNote`, `exportPxLandscapeHeight`, `exportPxLandscapeWidth`, `exportPxPortraitHeight`, `exportPxPortraitWidth`, `imageInput`, `naiObjectBiggerBtn`, `naiObjectFitBtn`, `naiObjectSmallerBtn`, `naiPageSizeBadge`, `naiZoomFitBtn`, `naiZoomInBtn`, `naiZoomLabel`, `naiZoomLabelHeader`, `naiZoomOutBtn`, `outputBitDepth`, `outputBitDepthHint`, `outputDpi`, `outputImageEstimate`, `outputImageFormat`, `outputImageQuality`, `resizable-container`
- js/core/auto-save.js : `autoSaveCheckbox`, `autoSaveInterval`, `btm-image-container`
- js/core/compression/lz4.js : `a`
- js/core/font/font-dropdown.js : `fm-styles`, `fontSelector`
- js/core/font/font-manager-core.js : `fm-fontManagerModal`, `fm-localFontInput`, `fm-modalOverlay`, `fm-userFontGroup`, `fm-webFontUrlInput`, `testCanvas`
- js/core/service/worker-register.js : `pwa-install-button`
- js/core/settings.js : `backgroundRemovalAction`, `backgroundRemovalModel`, `mangaImageCanvas`, `marginFromPanel`, `simulatorPlaybackIndex`
- js/core/svg/google-icon-helper.js : `edit`, `svg_icon_fillColor`, `svg_icon_fillOpacity`, `svg_icon_iconStyle`, `svg_icon_lineColor`, `svg_icon_lineWidth`, `svg_icon_results`, `svg_icon_searchInput`, `svg_icon_shadowBlur`, `svg_icon_shadowColor`, `svg_icon_shadowOffsetX`, `svg_icon_shadowOffsetY`
- js/core/svg/google-icon-names.js : `add`, `edit`, `redo`, `undo`
- js/core/util/image-util.js : `a`, `bg-color`, `effectEnhanceDarkIntensity`, `outputBitDepth`, `outputDpi`, `outputImageFormat`, `outputImageQuality`
- js/dashboard/dashboard-ui.js : `a`, `dashboard-close-btn`, `dashboard-modal`, `dashboardAvgSession`, `dashboardBadgeGrid`, `dashboardCalendar`, `dashboardChart`, `dashboardClearStats`, `dashboardClearTags`, `dashboardCoOccurrenceTable`, `dashboardCurrentSession`, `dashboardCurrentStreak`, `dashboardDailyGoalInput`, `dashboardDailyProgressBar`, `dashboardDailyProgressText`, `dashboardDownloadWordcloud`, `dashboardExportCSV`, `dashboardExportJSON`, `dashboardFirstLaunch`, `dashboardGlobalAvg`, `dashboardGlobalMax`, `dashboardGlobalMin`, `dashboardHeatmap`, `dashboardLaunchCount`, `dashboardLongestStreak`, `dashboardModeSelector`, `dashboardModelChart`, `dashboardPromptLengthChart`, `dashboardSaveDailyGoal`, `dashboardSaveWeeklyGoal`, `dashboardSessionGenCount`, `dashboardStatsTable`, `dashboardSuccessRateChart`, `dashboardTodayCount`, `dashboardTopTags`, `dashboardTotalGenerations`, `dashboardTotalSessions`, `dashboardTrendChart`, `dashboardTrendSelector`, `dashboardUniqueTags`, `dashboardWeeklyGoalInput`, `dashboardWeeklyProgressBar`, `dashboardWeeklyProgressText`, `dashboardWordcloud`
- js/layer/blend/blend.js : `add`, `blendApplyButton`, `blendFillColor`, `blendFloatingWindow`, `blendImageListBody`, `blendModes`, `blendSelectedInfo`, `gradientDirection`, `gradientEnd`, `gradientStart`, `sourceImages`
- js/layer/image-history-management.js : `bg-color`
- js/layer/layer-button.js : `cutout-area`
- js/layer/layer-management.js : `layer-content`, `verticalText`
- js/local-tools/background-removal-client.js : `a`, `backgroundRemovalAction`, `backgroundRemovalAlphaMatting`, `backgroundRemovalBgThreshold`, `backgroundRemovalCrop`, `backgroundRemovalEngine`, `backgroundRemovalErode`, `backgroundRemovalFeather`, `backgroundRemovalFgThreshold`, `backgroundRemovalInvert`, `backgroundRemovalKeyColor`, `backgroundRemovalKeyTolerance`, `backgroundRemovalModel`, `backgroundRemovalOnlyMask`, `backgroundRemovalPostMask`, `cutout-area`, `cutoutHealthButton`, `cutoutOriginalPreview`, `cutoutPresetDeleteButton`, `cutoutPresetExportButton`, `cutoutPresetImportInput`, `cutoutPresetLoadButton`, `cutoutPresetSaveButton`, `cutoutPresetSelect`, `cutoutPreview`, `cutoutResultPreview`, `cutoutRunButton`, `cutoutServiceUrl`, `cutoutStatus`
- js/panel/grid.js : `gridSizeInput`, `toggleGridButton`
- js/panel/layout-templates.js : `panelLayoutRecommendButton`, `panelLayoutRecommendList`, `panelLayoutTemplateButton`, `panelLayoutTemplateSelect`, `panelLayoutTemplateWrap`
- js/panel/random-cut.js : `flexGenH`, `flexGenW`, `horizontalRandomPanelCount`, `multiPageGenerate`, `pageCount`, `panelLayoutTemplateSelect`, `panelRandomCutButton`, `panelVariedMangaPerPage`, `verticalRandomPanelCount`
- js/project-management.js : `InformationCoordinate`, `InformationFPS`, `a`, `apiHeartbeatCheckbox`, `autoSaveCheckbox`, `autoSaveInterval`, `basePrompt_height`, `basePrompt_negative`, `basePrompt_prompt`, `basePrompt_seed`, `basePrompt_width`, `bg-color`, `bubbleFillColor`, `bubbleStrokeColor`, `bubbleStrokewidht`, `controls`, `customPanelSizeX`, `customPanelSizeY`, `cutChangeRate`, `dashboardDailyGoalInput`, `dashboardWeeklyGoalInput`, `fontSizeSlider`, `fontStrokeWidthSlider`, `gridSizeInput`, `horizontalRandomPanelCount`, `knifePanelSpaceSize`, `layer-panel`, `mangaImportAutoTag`, `mangaImportCharacterPlaceholders`, `mangaImportCharacterReferences`, `mangaImportKeepReference`, `mangaImportMinPanelArea`, `mangaImportPanelThreshold`, `mangaImportTaggerThreshold`, `mangaImportTaggerUrl`, `mangaImportUseTaggerProxy`, `marginFromPanel`, `naiBatchAcceptanceGate`, `naiBatchAutoGenerateAfterPrompts`, `naiBatchDirectorEnabled`, `naiBatchDirectorPrompt`, `naiCompositionAgent`, `naiDirectorAdjustCanvas`, `naiDirectorApiKey`, `naiDirectorApiUrl`, `naiDirectorHonorCharacterCards`, `naiDirectorMessageMode`, `naiDirectorModel`, `naiDirectorStoreDrafts`, `naiDirectorSystemPrompt`, `naiDirectorTimeout`, `naiDirectorUseApi`, `naiDirectorUseProxy`, `naiDirectorUseTagAnchors`, `naiMarkPanelsForManualReview`, `novelaiApiKey`, `novelaiApiUrl`, `novelaiCfgRescale`, `novelaiConcurrency`, `novelaiI2INoise`, `novelaiI2IStrength`, `novelaiModel`, `novelaiQualityToggle`, `novelaiRememberToken`, `novelaiSM`, `novelaiSMDyn`, `novelaiSampler`, `novelaiScale`, `novelaiSteps`, `novelaiUcPreset`, `novelaiUseLocalProxy`, `onePanelGenerateNumber`, `outputBitDepth`, `outputDpi`, `outputImageFormat`, `outputImageQuality`, `pageCount`, `panelFillColor`, `panelLayoutTemplateSelect`, `panelOpacity`, `panelStrokeColor`, `panelStrokeWidth`, `projectLoad`, `projectSave`, `sbFillColor`, `sbFillOpacity`, `sbFillOpacity2`, `sbPointSpace`, `sbSmoothing`, `sbSornerRadius`, `sbStrokeColor`, `sbStrokeWidth`, `settingsAutoSaveCheckbox`, `settingsSave`, `speechBubbleLineSizeSlider`, `speechBubbleOpacity`, `svgDownload`, `svg_icon_fillColor`, `svg_icon_fillOpacity`, `svg_icon_iconStyle`, `svg_icon_lineColor`, `svg_icon_lineWidth`, `svg_icon_shadowBlur`, `svg_icon_shadowColor`, `svg_icon_shadowOffsetX`, `svg_icon_shadowOffsetY`, `textBgColorPicker`, `textColorPicker`, `textOutlineColorPicker`, `tiltRandom`, `verticalRandomPanelCount`, `view_controls_checkbox`, `view_layers_checkbox`, `view_prompt_checkbox`
- js/shortcut.js : `controls`, `layer-panel`, `projectLoad`, `projectSave`, `settingsSave`, `shortcutGrid`, `shortcutModal`, `view_controls_checkbox`, `view_layers_checkbox`, `view_prompt_checkbox`
- js/sidebar/effect/effect-manager.js : `addGlowEffectCheckBox`, `effectEnhanceDarkIntensity`, `effectEnhanceDarkSubmit`, `glowOutLineColorPicker`, `glowOutLineSlider`, `manga-effect-settings`
- js/sidebar/page/page-studio.js : `pageEffectAngle`, `pageEffectApply`, `pageEffectBehind`, `pageEffectClear`, `pageEffectColor`, `pageEffectDensity`, `pageEffectLength`, `pageEffectOpacity`, `pageEffectPreset`, `pagePaperApply`, `pagePaperClear`, `pagePaperFile`, `pagePaperPreset`, `pagePaperReveal`, `pagePaperSwatches`, `panelFillColor`, `panelStrokeColor`, `panelStrokeWidth`
- js/sidebar/panel/knife/knife-mode.js : `knifeModeButton`
- js/sidebar/panel/knife/knife-split-engine.js : `cutChangeRate`, `knifePanelSpaceSize`, `tiltRandom`
- js/sidebar/panel/panel-manager.js : `bg-color`, `canvas-container`, `controls`, `edit`, `layer-panel`, `panelFillColor`, `panelOpacity`, `panelStrokeColor`, `panelStrokeWidth`, `speech-bubble-preview`, `svg-container-template`, `view_controls_checkbox`, `view_layers_checkbox`, `view_prompt_checkbox`
- js/sidebar/panel/panel-template.js : `CustomPanelButton`, `applyFlexGenSizeBtn`, `customPanelSizeX`, `customPanelSizeY`, `flexGenH`, `flexGenW`, `page-landscape`, `page-portrait`, `resetFlexGenSizeBtn`
- js/sidebar/pen/pen-tools.js : `a`, `brushPresetGrid`, `customBrushAngle`, `customBrushApplyButton`, `customBrushColor`, `customBrushDeleteButton`, `customBrushEngine`, `customBrushExportButton`, `customBrushFollowPath`, `customBrushHardness`, `customBrushImportInput`, `customBrushName`, `customBrushOpacity`, `customBrushPresetSelect`, `customBrushSaveButton`, `customBrushScatter`, `customBrushSize`, `customBrushSmoothing`, `customBrushSpacing`, `customBrushTaperEnd`, `customBrushTaperStart`, `customBrushTipInput`, `i`, `line-style`, `pen-tool-buttons [data-brush]`, `sidebar .icon-wrapper[data-action='selectCrop']`, `sidebar .icon-wrapper[data-action='selectEraser']`, `sidebar .icon-wrapper[data-action='selectMarquee']`, `sidebar .icon-wrapper[data-action='selectMove']`, `sidebar .icon-wrapper[data-target="tool-area"]`, `tool-area`, `tool-settings`
- js/sidebar/sidebar-ui.js : `settingsAutoSaveCheckbox`
- js/sidebar/sidebar.js : `asset-library-area`, `auto-generate-area`, `control-area`, `cutout-area`, `i`, `manga-effect-area`, `manga-tone-area`, `panel-manager-area`, `prompt-manager-area`, `shape-area`, `sidebar .icon-wrapper[data-target]`, `sidebarMore`, `sidebarMoreToggle`, `simulator-chat-area`, `speech-bubble-area`, `speech-bubble-area1`, `speech-bubble-area2`, `speechBubbleTabs`, `svg-container-template`, `svg-preview-area-landscape`, `svg-preview-area-vertical`, `template-orientation-toggle`, `text-area`, `text-area2`, `tool-area`
- js/sidebar/speechBubble/speech-bubble-effect.js : `bubbleFillColor`, `bubbleStrokeColor`, `bubbleStrokewidht`, `naiTemplatePlaceMode`, `speech-bubble-area`, `speech-bubble-area1`, `speech-bubble-preview`, `speechBubbleOpacity`, `svg-container-template`, `svg-preview-area-landscape`, `svg-preview-area-vertical`, `template-orientation-toggle`
- js/sidebar/speechBubble/speech-bubble-freehand.js : `fontSelector`, `fontSizeSlider`, `fontStrokeWidthSlider`, `sbDeleteButton`, `sbFillColor`, `sbFillOpacity`, `sbFreehandButton`, `sbMoveButton`, `sbPointButton`, `sbPointSpace`, `sbSelectButton`, `sbSmoothing`, `sbSornerRadius`, `sbStrokeColor`, `sbStrokeWidth`, `sb_aButton`, `sb_bButton`, `sb_cButton`, `sb_dButton`, `sb_eButton`, `sb_fButton`, `sb_gButton`, `textColorPicker`, `textOutlineColorPicker`
- js/sidebar/speechBubble/speech-bubble-text.js : `fontSelector`, `fontSizeSlider`, `fontStrokeWidthSlider`, `textColorPicker`, `textOutlineColorPicker`
- js/sidebar/text/custom/optimized-shadow-text.js : `t2_shadow_dualShadow`
- js/sidebar/text/sfx-palette.js : `sfxPaletteAdd`, `sfxPaletteInput`, `sfxPaletteList`, `sfxPaletteStyle`
- js/sidebar/text/text-2-manager.js : `T2-Orientation-horizontal`, `T2-Orientation-vertical`, `T2-align-center`, `T2-align-left`, `T2-align-right`, `text-area2-settings`
- js/sidebar/text/text-effect.js : `bold-toggle-btn`, `firstTextEffectColorPicker`, `fontSelector`, `fontSizeSlider`, `fontStrokeWidthSlider`, `textBgColorPicker`, `textColorPicker`, `textOutlineColorPicker`
- js/sidebar/text/vertical-text.js : `fontSelector`, `fontSizeSlider`, `fontStrokeWidthSlider`, `textBgColorPicker`, `textColorPicker`, `textOutlineColorPicker`, `verticalText`
- js/sidebar/tone/speedline.js : `speed-line-style`
- js/sidebar/tone/tone-manager.js : `manga-tone-settings`
- js/simulator/chat-controller.js : `a`, `simulatorChatAddMessageButton`, `simulatorChatAddParticipantButton`, `simulatorChatExportButton`, `simulatorChatInsertButton`, `simulatorChatLoadButton`, `simulatorChatMessages`, `simulatorChatParticipants`, `simulatorChatRemoveButton`, `simulatorChatStatus`, `simulatorChatTemplate`, `simulatorChatTheme`, `simulatorChatTitleInput`
- js/simulator/longshot-exporter.js : `a`
- js/simulator/playback-controller.js : `simulatorPlaybackExportKeyframes`, `simulatorPlaybackExportPages`, `simulatorPlaybackIndex`, `simulatorPlaybackInterval`, `simulatorPlaybackNext`, `simulatorPlaybackPageHeight`, `simulatorPlaybackPlay`, `simulatorPlaybackPrevious`, `simulatorPlaybackStatus`, `simulatorPlaybackStop`, `simulatorPlaybackTotal`
- js/simulator/simulator-controller.js : `a`, `simulatorExtraExportButton`, `simulatorExtraInsertButton`, `simulatorExtraLoadButton`, `simulatorExtraLoadSelectedButton`, `simulatorExtraSceneJson`, `simulatorExtraStatus`, `simulatorExtraTemplate`
- js/simulator/simulator-studio.js : `sidebar .icon-wrapper i.active`, `sidebar .icon-wrapper[data-action="openSimulatorStudio"] i`, `simStudioBack`, `simStudioChatActions`, `simStudioChatDock`, `simStudioChatInsert`, `simStudioChatLoad`, `simStudioChatScript`, `simStudioChatStore`, `simStudioChatTemplate`, `simStudioChatTitle`, `simStudioClose`, `simStudioFit`, `simStudioHome`, `simStudioHomeGrid`, `simStudioPartActions`, `simStudioPartDock`, `simStudioPartForm`, `simStudioPartInsert`, `simStudioPartLoad`, `simStudioPartStore`, `simStudioPlay`, `simStudioPlayIndex`, `simStudioPlayNext`, `simStudioPlayPrev`, `simStudioPlayStop`, `simStudioPlayTotal`, `simStudioPreview`, `simStudioPreviewHost`, `simStudioScaleDown`, `simStudioScaleUp`, `simStudioStatus`, `simStudioTitle`, `simStudioWebActions`, `simStudioWebDock`, `simStudioWebExample`, `simStudioWebForm`, `simStudioWebInsert`, `simStudioWebLoad`, `simStudioWebTemplate`, `simStudioWork`, `simulatorExtraSceneJson`, `simulatorStudioOverlay`, `storyComposerTemplate`
- js/simulator/story-composer-controller.js : `a`, `storyComposerAddCharacter`, `storyComposerCharacters`, `storyComposerExportJson`, `storyComposerFillPrompt`, `storyComposerInput`, `storyComposerInsert`, `storyComposerLoad`, `storyComposerManga`, `storyComposerNodes`, `storyComposerParse`, `storyComposerPlusOne`, `storyComposerSelectPage`, `storyComposerSend`, `storyComposerStatus`, `storyComposerTemplate`, `storyComposerTitle`, `storyComposerTypes`
- js/simulator/story-to-manga.js : `naiBatchDirectorPrompt`, `panelFillColor`, `panelStrokeColor`, `panelStrokeWidth`
- js/svg/manga-panels-image-vertical.js : `a`, `i`, `j`, `k`
- js/ui/ai/auto-prompt-ui.js : `img2imgScale`, `img2img_denoise`, `naiDirectorDraft`, `naiDirectorPlanPreview`, `naiDirectorStoreDrafts`, `other-controls-mini`, `promptRun`, `text2img_negative`, `text2img_prompt`
- js/ui/beginner-guide.js : `beginnerToolHud`, `canvas-help-text`, `canvasEmptyHint`, `clearMode`, `controls`, `k`, `layerSelectPageButton`, `naiTokenBadge`, `novelaiApiKey`, `novelaiRememberToken`, `panel-manager-area`, `resizable-container`, `simulator-chat-area`, `svg-container-template`, `toggleAiPanelButton`, `view_controls_checkbox`
- js/ui/bottom-bar.js : `btm-dialog-cancel`, `btm-dialog-submit`, `btm-drawer`, `btm-drawer-handle`, `btm-image-container`, `btm-scroll-left`, `btm-scroll-right`
- js/ui/canvas-object-menu.js : `com-fill`, `com-lineWidth`, `com-opacity`, `com-strokeColor`, `cutout-area`, `edit`, `fabricjs-delete-btn`, `fabricjs-language-selector`, `fontSelectorMenu`, `intro_content`
- js/ui/control/common-control-management.js : `angle-control`, `left-control`, `opacity-control`, `scale-control`, `skewX-control`, `skewY-control`, `top-control`
- js/ui/control/glfx-control.js : `glfxApplyButton`, `glfxBlurAngle`, `glfxBlurBrightness`, `glfxBlurRadius`, `glfxBrightness`, `glfxBulgeCenterX`, `glfxBulgeCenterY`, `glfxBulgeRadius`, `glfxBulgeStrength`, `glfxContrast`, `glfxDotAngle`, `glfxDotSize`, `glfxEdgeRadius`, `glfxEndX`, `glfxEndY`, `glfxFilter`, `glfxGradientRadius`, `glfxHalftoneAngle`, `glfxHalftoneSize`, `glfxHexScale`, `glfxHue`, `glfxInkStrength`, `glfxResetButton`, `glfxSaturation`, `glfxSepiaAmount`, `glfxStartX`, `glfxStartY`, `glfxSwirlAngle`, `glfxSwirlCenterX`, `glfxSwirlCenterY`, `glfxSwirlRadius`, `glfxTiltBlurRadius`, `glfxTriangleRadius`, `glfxUnsharpRadius`, `glfxUnsharpStrength`, `glfxVibranceAmount`, `glfxVignetteAmount`, `glfxVignetteSize`, `glfxZoomCenterX`, `glfxZoomCenterY`, `glfxZoomStrength`
- js/ui/control/information-control.js : `InformationCoordinate`, `InformationFPS`
- js/ui/font/user-font-manager.js : `fm-fontFileUpload`, `fm-registeredFontList`
- js/ui/glfx-ui.js : `manga-effect-settings`
- js/ui/imagePromptHelper/image-prompt-helper.js : `a`, `i`, `iph-breadcrumb`, `iph-cat-panel`, `iph-clear-button`, `iph-copy-button`, `iph-download-button`, `iph-free-input`, `iph-img-grid`, `iph-major-tabs`, `iph-prompt-box`, `iph-prompt-copy`, `iph-prompt-download`, `iph-search-input`, `iph-sel-list`
- js/ui/imagePromptHelper/prompt-helper.js : `iph-free-input`, `iph-name-input`, `iph-save-button`
- js/ui/prompt-manager.js : `new-negative-prompt1-new`, `new-negative-prompt2-new`, `new-negative-prompt3-new`, `new-prompt1-new`, `new-prompt2-new`, `new-prompt3-new`, `old-negative-prompt1-old`, `old-negative-prompt2-old`, `old-negative-prompt3-old`, `old-prompt1-old`, `old-prompt2-old`, `old-prompt3-old`
- js/ui/third/base-translation/base-de.js : `add`, `blend`, `clearMode`, `customPanelSizeX`, `customPanelSizeY`, `cutChangeRate`, `imageCopy`, `imageDownload`, `marginFromPanel`, `multiPageGenerate`, `outputBitDepth`, `outputBitDepthHint`, `outputImageEstimate`, `outputImageFormat`, `outputImageQuality`, `pageCount`, `panelOpacity`, `projectLoad`, `projectSave`, `redo`, `settingsSave`, `shortcutPage`, `simStudioBack`, `simStudioClose`, `simStudioPlay`, `simStudioPlayNext`, `simStudioPlayPrev`, `simStudioTitle`, `simulatorChatMessages`, `simulatorChatParticipants`, `simulatorChatTheme`, `undo`, `verticalRandomPanelCount`, `zoomFit`, `zoomIn`, `zoomOut`
- js/ui/third/base-translation/base-en.js : `add`, `blend`, `clearMode`, `customPanelSizeX`, `customPanelSizeY`, `cutChangeRate`, `imageCopy`, `imageDownload`, `marginFromPanel`, `multiPageGenerate`, `outputBitDepth`, `outputBitDepthHint`, `outputImageEstimate`, `outputImageFormat`, `outputImageQuality`, `pageCount`, `panelOpacity`, `projectLoad`, `projectSave`, `redo`, `settingsSave`, `shortcutPage`, `simStudioBack`, `simStudioClose`, `simStudioPlay`, `simStudioPlayNext`, `simStudioPlayPrev`, `simStudioTitle`, `simulatorChatMessages`, `simulatorChatParticipants`, `simulatorChatTheme`, `undo`, `verticalRandomPanelCount`, `zoomFit`, `zoomIn`, `zoomOut`
- js/ui/third/base-translation/base-es.js : `add`, `blend`, `clearMode`, `customPanelSizeX`, `customPanelSizeY`, `cutChangeRate`, `imageCopy`, `imageDownload`, `marginFromPanel`, `multiPageGenerate`, `outputBitDepth`, `outputBitDepthHint`, `outputImageEstimate`, `outputImageFormat`, `outputImageQuality`, `pageCount`, `panelOpacity`, `projectLoad`, `projectSave`, `redo`, `settingsSave`, `shortcutPage`, `simStudioBack`, `simStudioClose`, `simStudioPlay`, `simStudioPlayNext`, `simStudioPlayPrev`, `simStudioTitle`, `simulatorChatMessages`, `simulatorChatParticipants`, `simulatorChatTheme`, `undo`, `verticalRandomPanelCount`, `zoomFit`, `zoomIn`, `zoomOut`
- js/ui/third/base-translation/base-fr.js : `add`, `blend`, `clearMode`, `customPanelSizeX`, `customPanelSizeY`, `cutChangeRate`, `imageCopy`, `imageDownload`, `marginFromPanel`, `multiPageGenerate`, `outputBitDepth`, `outputBitDepthHint`, `outputImageEstimate`, `outputImageFormat`, `outputImageQuality`, `pageCount`, `panelOpacity`, `projectLoad`, `projectSave`, `redo`, `settingsSave`, `shortcutPage`, `simStudioBack`, `simStudioClose`, `simStudioPlay`, `simStudioPlayNext`, `simStudioPlayPrev`, `simStudioTitle`, `simulatorChatMessages`, `simulatorChatParticipants`, `simulatorChatTheme`, `undo`, `verticalRandomPanelCount`, `zoomFit`, `zoomIn`, `zoomOut`
- js/ui/third/base-translation/base-ja.js : `add`, `blend`, `clearMode`, `customPanelSizeX`, `customPanelSizeY`, `cutChangeRate`, `imageCopy`, `imageDownload`, `marginFromPanel`, `multiPageGenerate`, `onePanelGenerateNumber`, `outputBitDepth`, `outputBitDepthHint`, `outputImageEstimate`, `outputImageFormat`, `outputImageQuality`, `pageCount`, `panelOpacity`, `projectLoad`, `projectSave`, `redo`, `settingsSave`, `shortcutPage`, `simStudioBack`, `simStudioClose`, `simStudioPlay`, `simStudioPlayNext`, `simStudioPlayPrev`, `simStudioTitle`, `simulatorChatMessages`, `simulatorChatParticipants`, `simulatorChatTheme`, `undo`, `verticalRandomPanelCount`, `zoomFit`, `zoomIn`, `zoomOut`
- js/ui/third/base-translation/base-ko.js : `add`, `blend`, `clearMode`, `customPanelSizeX`, `customPanelSizeY`, `cutChangeRate`, `imageCopy`, `imageDownload`, `marginFromPanel`, `multiPageGenerate`, `outputBitDepth`, `outputBitDepthHint`, `outputImageEstimate`, `outputImageFormat`, `outputImageQuality`, `pageCount`, `panelOpacity`, `projectLoad`, `projectSave`, `redo`, `settingsSave`, `shortcutPage`, `simStudioBack`, `simStudioClose`, `simStudioPlay`, `simStudioPlayNext`, `simStudioPlayPrev`, `simStudioTitle`, `simulatorChatMessages`, `simulatorChatParticipants`, `simulatorChatTheme`, `undo`, `verticalRandomPanelCount`, `zoomFit`, `zoomIn`, `zoomOut`
- js/ui/third/base-translation/base-ru.js : `add`, `blend`, `clearMode`, `customPanelSizeX`, `customPanelSizeY`, `cutChangeRate`, `imageCopy`, `imageDownload`, `marginFromPanel`, `multiPageGenerate`, `outputBitDepth`, `outputBitDepthHint`, `outputImageEstimate`, `outputImageFormat`, `outputImageQuality`, `pageCount`, `panelOpacity`, `projectLoad`, `projectSave`, `redo`, `settingsSave`, `shortcutPage`, `simStudioBack`, `simStudioClose`, `simStudioPlay`, `simStudioPlayNext`, `simStudioPlayPrev`, `simStudioTitle`, `simulatorChatMessages`, `simulatorChatParticipants`, `simulatorChatTheme`, `undo`, `verticalRandomPanelCount`, `zoomFit`, `zoomIn`, `zoomOut`
- js/ui/third/base-translation/base-zh.js : `add`, `blend`, `clearMode`, `customPanelSizeX`, `customPanelSizeY`, `cutChangeRate`, `imageCopy`, `imageDownload`, `marginFromPanel`, `multiPageGenerate`, `outputBitDepth`, `outputBitDepthHint`, `outputImageEstimate`, `outputImageFormat`, `outputImageQuality`, `pageCount`, `panelOpacity`, `projectLoad`, `projectSave`, `redo`, `settingsReset`, `settingsSave`, `shortcutPage`, `simStudioBack`, `simStudioClose`, `simStudioPlay`, `simStudioPlayNext`, `simStudioPlayPrev`, `simStudioTitle`, `simulatorChatMessages`, `simulatorChatParticipants`, `simulatorChatTheme`, `undo`, `verticalRandomPanelCount`, `zoomFit`, `zoomIn`, `zoomOut`
- js/ui/third/i18next.js : `canvasEmptyHintDismiss`, `dashboardAvgSession`, `dashboardCalendar`, `dashboardClearTags`, `dashboardCurrentSession`, `dashboardCurrentStreak`, `dashboardExportCSV`, `dashboardExportJSON`, `dashboardLongestStreak`, `dashboardTopTags`, `dashboardTotalSessions`, `dashboardWordcloud`, `languageFlag`, `onePanelGenerateNumber`, `settingsReset`, `usTabAI`
- js/ui/third/tippy.js : `clearMode`, `intro_auto-generate-area`, `intro_control-area`, `intro_manga-effect-area`, `intro_manga-tone-area`, `intro_page-manager-area`, `intro_prompt-manager-area`, `intro_shape-area`, `intro_speech-bubble-area1`, `intro_speech-bubble-area2`, `intro_svg-container-template`, `intro_text-area`, `intro_text-area2`, `intro_tool-area`, `redo`, `undo`, `zoomFit`, `zoomIn`, `zoomOut`
- js/ui/toast.js : `sp-manga-toastContainer`, `sp-manga-toastMessageContainer`
- js/ui/tutorial.js : `comfyGuideDontShow`, `sidebarMore`, `tutorialCloseHint`, `tutorialDontShow`, `tutorialExitBtn`, `tutorialGotIt`, `tutorialNextBtn`, `tutorialSkipBtn`, `tutorialStartBtn`
- js/ui/util/event-delegator.js : `tool-area`
- js/ui/util/mode-change.js : `canvas-help-text`, `mode-toggle`, `navbar-logo`
- js/ui/util/mode-manager.js : `clearMode`, `edit`, `knifeModeButton`
- js/ui/util/tagify-util.js : `i`
- js/ui/visual-ps-tools.js : `naiHistoryClose`, `naiHistoryList`, `naiHistoryPanel`, `naiPropFill`, `naiPropStroke`, `shape-area`, `sidebar .icon-wrapper[data-ps-tool]`
- js/ui/visual-studio.js : `addHeart`, `addHexagon`, `addPentagon`, `addSquare`, `addStar`, `addTallRect`, `addTriangle`, `addWideRect`, `asset-library-area`, `brushPresetGrid`, `cutout-area`, `head-id .left_area`, `manga-effect-area`, `manga-tone-area`, `manga-tone-buttons button, #manga-effect-buttons button, #pen-tool-buttons button, #image-text-tool-buttons button, .visual-shape-grid button, .visual-text-grid button`, `naiBrushCursor`, `naiOptBrushSize`, `naiPropFill`, `naiPropOpacity`, `naiPropShadow`, `naiPropStrip`, `naiPropStroke`, `naiPropStrokeW`, `naiToolOptionsBar`, `naiToolOptionsControls`, `naiToolOptionsMain`, `panel-manager-area`, `ps-tools-area`, `sfxPaletteList`, `shape-area`, `sidebar .icon-wrapper[data-target]`, `speech-bubble-area`, `speech-bubble-preview`, `svg-container-template`, `svg-preview-area-landscape`, `svg-preview-area-vertical`, `text-area`, `text-area2`, `tool-area`, `tool-settings input[type="range"]`, `verticalText`
- scripts/beginner-ux-guards-test.cjs : `imageDownload`, `projectLoad`, `projectSave`, `settingsReset`, `settingsSave`
- scripts/full-feature-e2e.cjs : `edit`, `manga-tone-area`, `mangaGptApply`, `mangaGptGenerate`, `mangaGptPanel`, `mangaGptPrompt`, `mangaGptReferenceList`, `mangaGptStatus`, `mangaLamaConfirm`, `mangaLamaGenerate`, `mangaLamaMaskCanvas`, `mangaLamaStatus`, `mangaSmartStatus`, `projectLoad`, `projectSave`, `shape-area`, `speech-bubble-area`, `svgDownload`, `text-area`
- scripts/gen-project-index.cjs : `id`
- scripts/gpt-browser-acceptance.cjs : `edit`, `mangaGptApply`, `mangaGptGenerate`, `mangaGptMode`, `mangaGptOpen`, `mangaGptPanel`, `mangaGptPreview`, `mangaGptPrompt`, `mangaGptReferenceList`, `mangaGptReplaceText`, `mangaGptStatus`, `mangaGptSubtitle`, `mangaLamaConfirm`, `mangaLamaGenerate`, `mangaLamaMaskCanvas`, `mangaLamaPreviewImg`, `mangaLamaPreviewPanel`, `mangaLamaStatus`, `mangaPageOverlay .manga-page-bubble-outline`, `mangaPageOverlay .manga-page-outline`, `mangaPagePanel`, `mangaPlannerPreview`, `mangaSmartTextPanel`
- scripts/gpt-real-api-acceptance.cjs : `edit`, `mangaGptGenerate`, `mangaGptStatus`
- scripts/gpt-region-editor-smoke-test.cjs : `edit`
- scripts/image-export-smoke-test.cjs : `outputBitDepth`, `outputBitDepthHint`, `outputDpi`
- scripts/import-image-keeps-page-test.cjs : `imageInput`
- scripts/layout-smoke-test.cjs : `canvasEmptyHint`
- scripts/manga-bubble-detector-test.cjs : `a`
- scripts/manga-import-smoke-test.cjs : `mangaImportCharacterReferences`, `mangaImportDirectorButton`, `mangaImportGenerateButton`, `mangaImportPickButton`, `mangaImportPreflightButton`, `mangaImportRetagButton`, `mangaImportSelectNextPanelButton`, `mangaImportSelectPlaceholderButton`
- scripts/manga-real-ui-acceptance.cjs : `mangaLamaConfirm`, `mangaLamaGenerate`, `mangaLamaMaskCanvas`, `mangaLamaStatus`, `mangaSmartStatus`
- scripts/nai-real-acceptance.cjs : `naiHealthCheck`, `novelaiApiKey`, `novelaiSteps`, `novelaiUseLocalProxy`, `sp-manga-toastContainer`
- scripts/novelai-readable-error-test.cjs : `a`
- scripts/simulator-timeline-smoke-test.cjs : `a`
- scripts/ux-screenshots.cjs : `shape-area`
