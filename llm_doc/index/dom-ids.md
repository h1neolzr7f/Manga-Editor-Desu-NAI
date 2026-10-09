# DOM id 索引（逆引き）

`scripts/gen-project-index.cjs` の自動生成。手で編集しない。

- 定義: index.html / html 配下の `id="..."`
- 参照: `$('id')` / `getElementById('id')` / `querySelector('#id')` と、定義済み id と一致する文字列リトラル
  （`['a','b'].forEach(function(id){$(id);})` のような動的参照を抽うため。js と html インライン script が対象）
- 定義 637 件 / 参照 760 件

## id → 定義と参照

| id | 定義 | 参照しているファイル |
|----|------|--------------------|
| `CircleButton` | index.html:1890 |  |
| `Color2BlackLightColorButton` | index.html:1808 |  |
| `Color2BlackWhiteDarkButton` | index.html:1795 |  |
| `Color2BlackWhiteLightButton` | index.html:1791 |  |
| `Color2BlackWhiteNoDotButton` | index.html:1799 |  |
| `Color2BlackWhiteSimpleButton` | index.html:1803 |  |
| `CrayonButton` | index.html:1878 |  |
| `CustomBrushButton` | index.html:1902 |  |
| `CustomPanelButton` | index.html:782 | js/sidebar/panel/panel-template.js:161 |
| `EffectGLFXButton` | index.html:1828 |  |
| `EffectGlowButton` | index.html:1824 |  |
| `EnhanceDarkButton` | index.html:1814 |  |
| `EraserButton` | index.html:1898 |  |
| `ExternalService_Heartbeat_Container` | index.html:2217 | js/ai/ai-management.js:89 |
| `FocusingLineButton` | index.html:1939 |  |
| `InformationCoordinate` | index.html:1965 | js/project-management.js:277, js/ui/control/information-control.js:2 |
| `InformationFPS` | index.html:1959 | js/project-management.js:276, js/ui/control/information-control.js:1 |
| `InkButton` | index.html:1874 |  |
| `Intro_Tutorial` | index.html:529 |  |
| `MarkerButton` | index.html:1870 |  |
| `MosaicButton` | index.html:1894 |  |
| `OutlinePenButton` | index.html:1886 |  |
| `PencilButton` | index.html:1882 |  |
| `ScenarioPromptSelecter` | index.html:1143 | js/ai/ai-settings.js:216, js/ai/prompt/auto/auto-generation.js:10, js/ai/prompt/auto/auto-prompt-util.js:158, js/ai/prompt/auto/story-prompt-map.js:58 |
| `SpeedLineButton` | index.html:1935 |  |
| `ToneButton` | index.html:1919 |  |
| `ToneNoiseButton` | index.html:1923 |  |
| `ToneRainButton` | index.html:1931 |  |
| `ToneSnowButton` | index.html:1927 |  |
| `a` | index.html:64 | index.html:73, js/ai/comfyui/v2/comfyui-workflow-editor-tab.js:615, js/ai/panel-pipeline-review.js:199, js/assets/asset-pack.js:8, js/core/compression/lz4.js:207, js/core/util/image-util.js:658, js/dashboard/dashboard-ui.js:967, js/local-tools/background-removal-client.js:494, js/project-management.js:42, js/sidebar/pen/pen-tools.js:637, js/simulator/chat-controller.js:295, js/simulator/longshot-exporter.js:29, js/simulator/simulator-controller.js:100, js/simulator/story-composer-controller.js:264, js/svg/manga-panels-image-vertical.js:2, js/ui/imagePromptHelper/image-prompt-helper.js:118, scripts/simulator-timeline-smoke-test.cjs:7, scripts/subtitle-editor-smoke-test.cjs:12 |
| `add` | index.html:827 | js/ai/comfyui/v2/comfyui-default-object-info.js:2337, js/core/svg/google-icon-names.js:11, js/layer/blend/blend.js:2, js/ui/third/base-translation/base-de.js:147, js/ui/third/base-translation/base-en.js:152, js/ui/third/base-translation/base-es.js:147, js/ui/third/base-translation/base-fr.js:147, js/ui/third/base-translation/base-ja.js:152, js/ui/third/base-translation/base-ko.js:147, js/ui/third/base-translation/base-ru.js:147, js/ui/third/base-translation/base-zh.js:152 |
| `addHeart` | index.html:931 | js/ui/visual-studio.js:472 |
| `addHexagon` | index.html:923 | js/ui/visual-studio.js:472 |
| `addPentagon` | index.html:919 | js/ui/visual-studio.js:472 |
| `addSquare` | index.html:903 | js/ui/visual-studio.js:471 |
| `addStar` | index.html:927 | js/ui/visual-studio.js:472 |
| `addTallRect` | index.html:907 | js/ui/visual-studio.js:471 |
| `addTriangle` | index.html:915 | js/ui/visual-studio.js:471 |
| `addWideRect` | index.html:911 | js/ui/visual-studio.js:471 |
| `align-center` | index.html:1679 |  |
| `align-left` | index.html:1676 |  |
| `align-right` | index.html:1682 |  |
| `angle-control` | index.html:1974 | js/ui/control/common-control-management.js:2 |
| `apiHeartbeatCheckbox` | index.html:348 | js/ai/ai-management.js:108, js/ai/ai-settings.js:414, js/project-management.js:243 |
| `apiSettingsUrlHelpe` | index.html:2211 | js/ai/comfyui/v2/comfyui-workflow-interact.js:32, js/ai/ui/ai-ui-util.js:9 |
| `applyFlexGenSizeBtn` | index.html:1040 | js/sidebar/panel/panel-template.js:228 |
| `asset-library-area` | index.html:1409 | js/sidebar/sidebar.js:83, js/ui/visual-studio.js:338 |
| `assetLibraryExportButton` | index.html:1419 | js/assets/asset-library-controller.js:270 |
| `assetLibraryGroups` | index.html:1423 | js/assets/asset-library-controller.js:240 |
| `assetLibraryImportButton` | index.html:1420 | js/assets/asset-library-controller.js:272 |
| `assetLibraryInput` | index.html:1416 | js/assets/asset-library-controller.js:230 |
| `assetLibraryList` | index.html:1445 | js/assets/asset-library-controller.js:84 |
| `assetLibraryNext` | index.html:1443 | js/assets/asset-library-controller.js:254 |
| `assetLibraryPackInput` | index.html:1421 | js/assets/asset-library-controller.js:273 |
| `assetLibraryPageLabel` | index.html:1442 | js/assets/asset-library-controller.js:121 |
| `assetLibraryPager` | index.html:1440 | js/assets/asset-library-controller.js:118 |
| `assetLibraryPrev` | index.html:1441 | js/assets/asset-library-controller.js:253 |
| `assetLibraryRestoreButton` | index.html:1418 | js/assets/asset-library-controller.js:257 |
| `assetLibrarySearch` | index.html:1437 | js/assets/asset-library-controller.js:86 |
| `assetLibraryStatus` | index.html:1439 | js/assets/asset-library-controller.js:34 |
| `assetLibraryTags` | index.html:1438 | js/assets/asset-library-controller.js:87 |
| `auto-generate-area` | index.html:953 | js/sidebar/sidebar.js:80 |
| `autoSaveCheckbox` | index.html:330 | js/core/auto-save.js:210, js/project-management.js:244 |
| `autoSaveInterval` | index.html:333 | js/core/auto-save.js:216, js/project-management.js:245 |
| `backgroundRemovalAction` | index.html:1361 | js/core/settings.js:96, js/local-tools/background-removal-client.js:70 |
| `backgroundRemovalAlphaMatting` | index.html:1367 | js/local-tools/background-removal-client.js:59 |
| `backgroundRemovalBgThreshold` | index.html:1374 | js/local-tools/background-removal-client.js:61 |
| `backgroundRemovalCrop` | index.html:1382 | js/local-tools/background-removal-client.js:65 |
| `backgroundRemovalEngine` | index.html:1347 | js/local-tools/background-removal-client.js:53 |
| `backgroundRemovalErode` | index.html:1378 | js/local-tools/background-removal-client.js:62 |
| `backgroundRemovalFeather` | index.html:1385 | js/local-tools/background-removal-client.js:66 |
| `backgroundRemovalFgThreshold` | index.html:1370 | js/local-tools/background-removal-client.js:60 |
| `backgroundRemovalInvert` | index.html:1395 | js/local-tools/background-removal-client.js:69 |
| `backgroundRemovalKeyColor` | index.html:1389 | js/local-tools/background-removal-client.js:67 |
| `backgroundRemovalKeyTolerance` | index.html:1393 | js/local-tools/background-removal-client.js:68 |
| `backgroundRemovalModel` | index.html:1354 | js/core/settings.js:96, js/local-tools/background-removal-client.js:54 |
| `backgroundRemovalOnlyMask` | index.html:1381 | js/local-tools/background-removal-client.js:64 |
| `backgroundRemovalPostMask` | index.html:1380 | js/local-tools/background-removal-client.js:63 |
| `base-controls-mini` | index.html:2230 |  |
| `baseControlsPanel` | index.html:2225 |  |
| `basePrompt_height` | index.html:2256 | js/ai/prompt/base-event-listener.js:8, js/project-management.js:311 |
| `basePrompt_negative` | index.html:2246 | js/ai/prompt/base-event-listener.js:6, js/project-management.js:307 |
| `basePrompt_prompt` | index.html:2240 | js/ai/prompt/base-event-listener.js:5, js/project-management.js:306 |
| `basePrompt_seed` | index.html:2263 | js/ai/prompt/base-event-listener.js:9, js/project-management.js:308 |
| `basePrompt_width` | index.html:2252 | js/ai/prompt/base-event-listener.js:7, js/project-management.js:310 |
| `beginnerToolHud` | index.html:2119 | js/ui/beginner-guide.js:21 |
| `bg-color` | index.html:431 | js/ai/manga-importer.js:1701, js/canvas-manager.js:188, js/core/util/image-util.js:627, js/layer/image-history-management.js:294, js/project-management.js:197, js/sidebar/panel/panel-manager.js:292 |
| `bgColorButton` | index.html:432 | js/canvas-manager.js:208 |
| `bgColorSwatch` | index.html:434 | js/canvas-manager.js:228 |
| `bgColorValue` | index.html:433 | js/canvas-manager.js:222 |
| `blend` | html/Minual/effect.html:45 | js/sidebar/text/custom/optimized-water-text.js:58, js/ui/third/base-translation/base-de.js:173, js/ui/third/base-translation/base-en.js:178, js/ui/third/base-translation/base-es.js:173, js/ui/third/base-translation/base-fr.js:173, js/ui/third/base-translation/base-ja.js:178, js/ui/third/base-translation/base-ko.js:173, js/ui/third/base-translation/base-ru.js:173, js/ui/third/base-translation/base-zh.js:178 |
| `blendButton` | index.html:1820 |  |
| `bold-toggle-btn` | index.html:1652 | js/sidebar/text/text-effect.js:367 |
| `brokenButton` | index.html:1740 |  |
| `brushPresetGrid` | index.html:1868 | js/sidebar/pen/pen-tools.js:758, js/ui/visual-studio.js:94 |
| `btm-drawer` | index.html:2282 | index.html:135, js/ui/bottom-bar.js:4 |
| `btm-drawer-handle` | index.html:2283 | js/ui/bottom-bar.js:5 |
| `btm-image-container` | index.html:2287 | js/core/auto-save.js:178, js/ui/bottom-bar.js:6 |
| `btm-scroll-left` | index.html:2288 | js/ui/bottom-bar.js:7 |
| `btm-scroll-right` | index.html:2289 | js/ui/bottom-bar.js:8 |
| `btn-en` | html/functionList.html:34 | html/functionList.html:312 |
| `btn-ja` | html/functionList.html:33 | html/functionList.html:306 |
| `bubbleFillColor` | index.html:1498 | js/project-management.js:255, js/sidebar/speechBubble/speech-bubble-effect.js:4 |
| `bubbleStrokeColor` | index.html:1494 | js/project-management.js:254, js/sidebar/speechBubble/speech-bubble-effect.js:5 |
| `bubbleStrokewidht` | index.html:1505 | js/project-management.js:257, js/sidebar/speechBubble/speech-bubble-effect.js:3 |
| `c2bw` | html/Minual/effect.html:25 |  |
| `canvas-area` | index.html:2097 | js/canvas-manager.js:905 |
| `canvas-container` | index.html:2163 | js/canvas-manager.js:42, js/sidebar/panel/panel-manager.js:7 |
| `canvas-help-text` | index.html:2123 | js/ui/beginner-guide.js:62, js/ui/util/mode-change.js:29 |
| `canvasEmptyHint` | index.html:2167 | js/ui/beginner-guide.js:152, scripts/layout-smoke-test.cjs:66 |
| `canvasEmptyHintDismiss` | index.html:2179 | js/ui/third/i18next.js:22 |
| `canvasEmptyHintSimulator` | index.html:2177 |  |
| `canvasEmptyHintTemplate` | index.html:2178 |  |
| `clearMode` | index.html:2103 | js/ui/beginner-guide.js:50, js/ui/third/base-translation/base-de.js:262, js/ui/third/base-translation/base-en.js:268, js/ui/third/base-translation/base-es.js:262, js/ui/third/base-translation/base-fr.js:262, js/ui/third/base-translation/base-ja.js:267, js/ui/third/base-translation/base-ko.js:262, js/ui/third/base-translation/base-ru.js:262, js/ui/third/base-translation/base-zh.js:267, js/ui/third/tippy.js:89, js/ui/util/mode-manager.js:358 |
| `cloudButton` | index.html:1746 |  |
| `comfyui` | html/API_Help/comfyui_settings.html:29 | js/ai/comfyui/comfyui-management.js:297, js/ai/inpainting/inpaint-editor.js:109, js/core/logger.js:169 |
| `control-area` | index.html:1952 | js/sidebar/sidebar.js:93 |
| `control-preview-area` | index.html:1954 |  |
| `controls` | index.html:2203 | js/project-management.js:639, js/shortcut.js:73, js/sidebar/panel/panel-manager.js:663, js/ui/beginner-guide.js:352 |
| `customPanelSizeX` | index.html:788 | js/project-management.js:248, js/sidebar/panel/panel-template.js:162, js/ui/third/base-translation/base-de.js:332, js/ui/third/base-translation/base-en.js:338, js/ui/third/base-translation/base-es.js:331, js/ui/third/base-translation/base-fr.js:332, js/ui/third/base-translation/base-ja.js:337, js/ui/third/base-translation/base-ko.js:332, js/ui/third/base-translation/base-ru.js:332, js/ui/third/base-translation/base-zh.js:343 |
| `customPanelSizeY` | index.html:793 | js/project-management.js:249, js/sidebar/panel/panel-template.js:163, js/ui/third/base-translation/base-de.js:333, js/ui/third/base-translation/base-en.js:339, js/ui/third/base-translation/base-es.js:332, js/ui/third/base-translation/base-fr.js:333, js/ui/third/base-translation/base-ja.js:338, js/ui/third/base-translation/base-ko.js:333, js/ui/third/base-translation/base-ru.js:333, js/ui/third/base-translation/base-zh.js:344 |
| `cutChangeRate` | index.html:1026 | js/project-management.js:285, js/sidebar/panel/knife/knife-split-engine.js:73, js/ui/third/base-translation/base-de.js:117, js/ui/third/base-translation/base-en.js:122, js/ui/third/base-translation/base-es.js:117, js/ui/third/base-translation/base-fr.js:117, js/ui/third/base-translation/base-ja.js:121, js/ui/third/base-translation/base-ko.js:117, js/ui/third/base-translation/base-ru.js:117, js/ui/third/base-translation/base-zh.js:122 |
| `cutout-area` | index.html:1325 | js/layer/layer-button.js:55, js/sidebar/sidebar.js:89, js/ui/canvas-object-menu.js:560, js/ui/visual-studio.js:335 |
| `cutoutHealthButton` | index.html:1397 | js/local-tools/background-removal-client.js:478 |
| `cutoutOriginalPreview` | index.html:1402 | js/local-tools/background-removal-client.js:191 |
| `cutoutPresetDeleteButton` | index.html:1340 | js/local-tools/background-removal-client.js:488 |
| `cutoutPresetExportButton` | index.html:1341 | js/local-tools/background-removal-client.js:490 |
| `cutoutPresetImportInput` | index.html:1343 | js/local-tools/background-removal-client.js:500 |
| `cutoutPresetLoadButton` | index.html:1338 | js/local-tools/background-removal-client.js:484 |
| `cutoutPresetSaveButton` | index.html:1339 | js/local-tools/background-removal-client.js:486 |
| `cutoutPresetSelect` | index.html:1335 | js/local-tools/background-removal-client.js:108 |
| `cutoutPreview` | index.html:1401 | js/local-tools/background-removal-client.js:187 |
| `cutoutResultPreview` | index.html:1403 | js/local-tools/background-removal-client.js:192 |
| `cutoutRunButton` | index.html:1398 | js/local-tools/background-removal-client.js:480 |
| `cutoutServiceUrl` | index.html:1331 | js/local-tools/background-removal-client.js:32 |
| `cutoutStatus` | index.html:1400 | js/local-tools/background-removal-client.js:23 |
| `dashboard-close-btn` | index.html:2783 | js/dashboard/dashboard-ui.js:217 |
| `dashboard-modal` | index.html:2781 | js/dashboard/dashboard-ui.js:120 |
| `dashboardAvgSession` | index.html:2923 | js/dashboard/dashboard-ui.js:608, js/ui/third/i18next.js:2405 |
| `dashboardBadgeGrid` | index.html:3005 | js/dashboard/dashboard-ui.js:930 |
| `dashboardCalendar` | index.html:2936 | js/dashboard/dashboard-ui.js:612, js/ui/third/i18next.js:2407 |
| `dashboardChart` | index.html:2847 | js/dashboard/dashboard-ui.js:318 |
| `dashboardClearStats` | index.html:2787 | js/dashboard/dashboard-ui.js:183 |
| `dashboardClearTags` | index.html:2872 | js/dashboard/dashboard-ui.js:193, js/ui/third/i18next.js:2945 |
| `dashboardCoOccurrenceTable` | index.html:2966 | js/dashboard/dashboard-ui.js:817 |
| `dashboardCurrentSession` | index.html:2915 | js/dashboard/dashboard-ui.js:606, js/ui/third/i18next.js:2403 |
| `dashboardCurrentStreak` | index.html:2894 | js/dashboard/dashboard-ui.js:600, js/ui/third/i18next.js:2399 |
| `dashboardDailyGoalInput` | index.html:2985 | js/dashboard/dashboard-ui.js:230, js/project-management.js:293 |
| `dashboardDailyProgressBar` | index.html:2989 | js/dashboard/dashboard-ui.js:904 |
| `dashboardDailyProgressText` | index.html:2989 | js/dashboard/dashboard-ui.js:907 |
| `dashboardDownloadWordcloud` | index.html:2881 | js/dashboard/dashboard-ui.js:204 |
| `dashboardExportCSV` | index.html:3013 | js/dashboard/dashboard-ui.js:253, js/ui/third/i18next.js:2426 |
| `dashboardExportJSON` | index.html:3012 | js/dashboard/dashboard-ui.js:249, js/ui/third/i18next.js:2425 |
| `dashboardFirstLaunch` | index.html:2815 | js/dashboard/dashboard-ui.js:299 |
| `dashboardGlobalAvg` | index.html:2795 | js/dashboard/dashboard-ui.js:294 |
| `dashboardGlobalMax` | index.html:2803 | js/dashboard/dashboard-ui.js:296 |
| `dashboardGlobalMin` | index.html:2799 | js/dashboard/dashboard-ui.js:295 |
| `dashboardHeatmap` | index.html:2854 | js/dashboard/dashboard-ui.js:380 |
| `dashboardLaunchCount` | index.html:2811 | js/dashboard/dashboard-ui.js:298 |
| `dashboardLongestStreak` | index.html:2899 | js/dashboard/dashboard-ui.js:601, js/ui/third/i18next.js:2400 |
| `dashboardModeSelector` | index.html:2841 | js/dashboard/dashboard-ui.js:169 |
| `dashboardModelChart` | index.html:2975 | js/dashboard/dashboard-ui.js:834 |
| `dashboardPromptLengthChart` | index.html:2951 | js/dashboard/dashboard-ui.js:744 |
| `dashboardSaveDailyGoal` | index.html:2986 | js/dashboard/dashboard-ui.js:227 |
| `dashboardSaveWeeklyGoal` | index.html:2994 | js/dashboard/dashboard-ui.js:238 |
| `dashboardSessionGenCount` | index.html:2919 | js/dashboard/dashboard-ui.js:607 |
| `dashboardStatsTable` | index.html:2834 | js/dashboard/dashboard-ui.js:300 |
| `dashboardSuccessRateChart` | index.html:2943 | js/dashboard/dashboard-ui.js:695 |
| `dashboardTodayCount` | index.html:2904 | js/dashboard/dashboard-ui.js:602 |
| `dashboardTopTags` | index.html:2874 | js/dashboard/dashboard-ui.js:517, js/ui/third/i18next.js:2941 |
| `dashboardTotalGenerations` | index.html:2791 | js/dashboard/dashboard-ui.js:293 |
| `dashboardTotalSessions` | index.html:2927 | js/dashboard/dashboard-ui.js:609, js/ui/third/i18next.js:2406 |
| `dashboardTrendChart` | index.html:2866 | js/dashboard/dashboard-ui.js:441 |
| `dashboardTrendSelector` | index.html:2859 | js/dashboard/dashboard-ui.js:176 |
| `dashboardUniqueTags` | index.html:2807 | js/dashboard/dashboard-ui.js:297 |
| `dashboardWeeklyGoalInput` | index.html:2993 | js/dashboard/dashboard-ui.js:241, js/project-management.js:294 |
| `dashboardWeeklyProgressBar` | index.html:2997 | js/dashboard/dashboard-ui.js:916 |
| `dashboardWeeklyProgressText` | index.html:2997 | js/dashboard/dashboard-ui.js:919 |
| `dashboardWordcloud` | index.html:2884 | js/dashboard/dashboard-ui.js:208, js/ui/third/i18next.js:2943 |
| `desu-nav` | index.html:251 | index.html:133 |
| `edit` | index.html:829 | js/ai/gpt/edit-controller.js:250, js/ai/provider/gpt-image-provider.js:41, js/core/svg/google-icon-helper.js:64, js/core/svg/google-icon-names.js:11, js/sidebar/panel/panel-manager.js:445, js/ui/canvas-object-menu.js:11, js/ui/util/mode-manager.js:346, scripts/gpt-provider-test.cjs:58 |
| `esApi-controls-mini` | index.html:2208 |  |
| `esApiControlsPanel` | index.html:2205 |  |
| `exportPxCappedNote` | index.html:463 | js/canvas-manager.js:336 |
| `exportPxLandscapeHeight` | index.html:460 | js/canvas-manager.js:486 |
| `exportPxLandscapeWidth` | index.html:457 | js/canvas-manager.js:486 |
| `exportPxPortraitHeight` | index.html:451 | js/canvas-manager.js:486 |
| `exportPxPortraitWidth` | index.html:448 | js/canvas-manager.js:486 |
| `featureTable` | html/functionList.html:40 |  |
| `flexGenH` | index.html:1039 | js/panel/random-cut.js:85, js/sidebar/panel/panel-template.js:232 |
| `flexGenW` | index.html:1037 | js/panel/random-cut.js:84, js/sidebar/panel/panel-template.js:231 |
| `fontSelector` | index.html:1649 | js/core/font/font-dropdown.js:282, js/sidebar/speechBubble/speech-bubble-freehand.js:634, js/sidebar/speechBubble/speech-bubble-text.js:206, js/sidebar/text/text-effect.js:304, js/sidebar/text/vertical-text.js:5 |
| `fontSizeSlider` | index.html:1670 | js/project-management.js:298, js/sidebar/speechBubble/speech-bubble-freehand.js:635, js/sidebar/speechBubble/speech-bubble-text.js:207, js/sidebar/text/text-effect.js:127, js/sidebar/text/vertical-text.js:6 |
| `fontStrokeWidthSlider` | index.html:1673 | js/project-management.js:299, js/sidebar/speechBubble/speech-bubble-freehand.js:636, js/sidebar/speechBubble/speech-bubble-text.js:208, js/sidebar/text/text-effect.js:130, js/sidebar/text/vertical-text.js:7 |
| `gridSizeInput` | index.html:509 | js/panel/grid.js:120, js/project-management.js:202 |
| `head-id` | index.html:642 | index.html:134 |
| `horizontalRandomPanelCount` | index.html:1020 | js/panel/random-cut.js:11, js/project-management.js:283 |
| `i` | index.html:97 | index.html:97, js/sidebar/pen/pen-tools.js:672, js/sidebar/sidebar.js:68, js/svg/manga-panels-image-vertical.js:21, js/ui/imagePromptHelper/image-prompt-helper.js:376, js/ui/util/tagify-util.js:13 |
| `image-text-tool-buttons` | index.html:1720 |  |
| `image2-section` | index.html:1307 | js/assets/image2-controller.js:9 |
| `image2AssetName` | index.html:1314 |  |
| `image2Height` | index.html:1316 | js/assets/image2-controller.js:15 |
| `image2JobList` | index.html:1319 | js/assets/image2-controller.js:6 |
| `image2Negative` | index.html:1312 | js/assets/image2-controller.js:15 |
| `image2Prompt` | index.html:1311 | js/assets/image2-controller.js:15 |
| `image2Provider` | index.html:1313 | js/assets/image2-controller.js:7 |
| `image2RunButton` | index.html:1317 | js/assets/image2-controller.js:8 |
| `image2Status` | index.html:1318 | js/assets/image2-controller.js:5 |
| `image2Tags` | index.html:1315 | js/assets/image2-controller.js:15 |
| `image2Transparent` | index.html:1316 | js/assets/image2-controller.js:15 |
| `image2Width` | index.html:1316 | js/assets/image2-controller.js:15 |
| `imageCopy` | index.html:301 | js/ui/third/base-translation/base-de.js:440, js/ui/third/base-translation/base-en.js:400, js/ui/third/base-translation/base-es.js:393, js/ui/third/base-translation/base-fr.js:395, js/ui/third/base-translation/base-ja.js:445, js/ui/third/base-translation/base-ko.js:395, js/ui/third/base-translation/base-ru.js:394, js/ui/third/base-translation/base-zh.js:406 |
| `imageDownload` | index.html:295 | js/ui/third/base-translation/base-de.js:441, js/ui/third/base-translation/base-en.js:399, js/ui/third/base-translation/base-es.js:392, js/ui/third/base-translation/base-fr.js:394, js/ui/third/base-translation/base-ja.js:446, js/ui/third/base-translation/base-ko.js:394, js/ui/third/base-translation/base-ru.js:393, js/ui/third/base-translation/base-zh.js:405 |
| `imageInput` | index.html:2101 | js/canvas-manager.js:964 |
| `intro_asset-library-area` | index.html:658 |  |
| `intro_auto-generate-area` | index.html:663 | js/ui/third/tippy.js:49 |
| `intro_content` | index.html:2161 | js/ui/canvas-object-menu.js:718 |
| `intro_control-area` | index.html:734 | js/ui/third/tippy.js:58 |
| `intro_crop-tool` | index.html:680 |  |
| `intro_cutout-area` | index.html:717 |  |
| `intro_eraser-tool` | index.html:688 |  |
| `intro_knife-tool` | index.html:692 |  |
| `intro_links` | index.html:565 |  |
| `intro_manga-effect-area` | index.html:722 | js/ui/third/tippy.js:57 |
| `intro_manga-tone-area` | index.html:709 | js/ui/third/tippy.js:56 |
| `intro_marquee-tool` | index.html:676 |  |
| `intro_move-tool` | index.html:672 |  |
| `intro_page-manager-area` | index.html:730 | js/ui/third/tippy.js:48 |
| `intro_prompt-manager-area` | index.html:667 | js/ui/third/tippy.js:50 |
| `intro_ps-tools-area` | index.html:696 |  |
| `intro_shape-area` | index.html:713 | js/ui/third/tippy.js:59 |
| `intro_simulator-chat-area` | index.html:650 |  |
| `intro_simulator-studio` | index.html:654 |  |
| `intro_speech-bubble-area1` | index.html:700 | js/ui/third/tippy.js:51 |
| `intro_speech-bubble-area2` | index.html:1486 | js/ui/third/tippy.js:52 |
| `intro_svg-container-template` | index.html:646 | js/ui/third/tippy.js:47 |
| `intro_text-area` | index.html:704 | js/ui/third/tippy.js:53 |
| `intro_text-area2` | index.html:726 | js/ui/third/tippy.js:54 |
| `intro_tool-area` | index.html:684 | js/ui/third/tippy.js:55 |
| `j` | index.html:97 | index.html:97, js/svg/manga-panels-image-vertical.js:22 |
| `k` | index.html:97 | index.html:97, js/ai/comfyui/v2/comfyui-default-object-info.js:5671, js/svg/manga-panels-image-vertical.js:24, js/ui/beginner-guide.js:305 |
| `knifeModeButton` | index.html:801 | js/sidebar/panel/knife/knife-mode.js:10, js/ui/util/mode-manager.js:199 |
| `knifePanelSpaceSize` | index.html:807 | js/project-management.js:196, js/sidebar/panel/knife/knife-split-engine.js:376 |
| `layer-content` | index.html:2197 | js/layer/layer-management.js:150 |
| `layer-panel` | index.html:2188 | js/project-management.js:638, js/shortcut.js:66, js/sidebar/panel/panel-manager.js:660 |
| `layerSelectPageButton` | index.html:2191 | js/ui/beginner-guide.js:497 |
| `layeredButton` | index.html:1752 |  |
| `left-control` | index.html:1983 | js/ui/control/common-control-management.js:2 |
| `mLandscapeButton` | index.html:980 |  |
| `mPortraitButton` | index.html:977 |  |
| `manga-effect-area` | index.html:1786 | js/sidebar/sidebar.js:91, js/ui/visual-studio.js:326 |
| `manga-effect-buttons` | index.html:1789 |  |
| `manga-effect-settings` | index.html:1834 | js/sidebar/effect/effect-manager.js:116, js/ui/glfx-ui.js:197 |
| `manga-tone-area` | index.html:1915 | js/sidebar/sidebar.js:90, js/ui/visual-studio.js:324 |
| `manga-tone-buttons` | index.html:1918 |  |
| `manga-tone-settings` | index.html:1945 | js/sidebar/tone/tone-manager.js:139 |
| `mangaImageCanvas` | index.html:2164 | js/assets/asset-library-controller.js:195, js/core/settings.js:10 |
| `mangaImportAutoTag` | index.html:1082 | js/ai/manga-importer.js:2397, js/project-management.js:236 |
| `mangaImportCharacterPlaceholders` | index.html:1083 | js/ai/manga-importer.js:2376, js/project-management.js:237 |
| `mangaImportCharacterReferences` | index.html:1084 | js/ai/manga-importer.js:2378, js/project-management.js:238, scripts/manga-import-smoke-test.cjs:51 |
| `mangaImportDirectorButton` | index.html:1067 | js/ai/manga-importer.js:2479, scripts/manga-import-smoke-test.cjs:48 |
| `mangaImportGenerateButton` | index.html:1075 | js/ai/manga-importer.js:2487, scripts/manga-import-smoke-test.cjs:50 |
| `mangaImportInput` | index.html:1048 | js/ai/manga-importer.js:2405 |
| `mangaImportKeepReference` | index.html:1081 | js/ai/manga-importer.js:2365, js/project-management.js:235 |
| `mangaImportMinPanelArea` | index.html:2472 | js/ai/manga-importer.js:1455, js/project-management.js:233 |
| `mangaImportPanelThreshold` | index.html:2471 | js/ai/manga-importer.js:1454, js/project-management.js:232 |
| `mangaImportPickButton` | index.html:1051 | js/ai/manga-importer.js:2475, scripts/manga-import-smoke-test.cjs:44 |
| `mangaImportPreflightButton` | index.html:1071 | js/ai/manga-importer.js:2481, scripts/manga-import-smoke-test.cjs:49 |
| `mangaImportRetagButton` | index.html:1055 | js/ai/manga-importer.js:2477, scripts/manga-import-smoke-test.cjs:45 |
| `mangaImportSelectNextPanelButton` | index.html:1059 | js/ai/manga-importer.js:2483, scripts/manga-import-smoke-test.cjs:46 |
| `mangaImportSelectPlaceholderButton` | index.html:1063 | js/ai/manga-importer.js:2485, scripts/manga-import-smoke-test.cjs:47 |
| `mangaImportStatus` | index.html:1086 | js/ai/manga-importer.js:36 |
| `mangaImportTaggerThreshold` | index.html:2470 | js/ai/manga-importer.js:1920, js/project-management.js:231 |
| `mangaImportTaggerUrl` | index.html:2469 | js/ai/manga-importer.js:1951, js/project-management.js:230 |
| `mangaImportUseTaggerProxy` | index.html:2476 | js/ai/manga-importer.js:1959, js/project-management.js:234 |
| `marginFromPanel` | index.html:515 | js/core/settings.js:26, js/project-management.js:203, js/ui/third/base-translation/base-de.js:455, js/ui/third/base-translation/base-en.js:491, js/ui/third/base-translation/base-es.js:484, js/ui/third/base-translation/base-fr.js:486, js/ui/third/base-translation/base-ja.js:460, js/ui/third/base-translation/base-ko.js:486, js/ui/third/base-translation/base-ru.js:485, js/ui/third/base-translation/base-zh.js:497 |
| `meshButton` | index.html:1758 |  |
| `mode-toggle` | index.html:629 | js/ui/util/mode-change.js:59 |
| `multiPageGenerate` | index.html:969 | js/panel/random-cut.js:136, js/ui/third/base-translation/base-de.js:111, js/ui/third/base-translation/base-en.js:116, js/ui/third/base-translation/base-es.js:111, js/ui/third/base-translation/base-fr.js:111, js/ui/third/base-translation/base-ja.js:115, js/ui/third/base-translation/base-ko.js:111, js/ui/third/base-translation/base-ru.js:111, js/ui/third/base-translation/base-zh.js:116 |
| `nai-scene-plan-section` | index.html:1161 |  |
| `naiBatchAcceptanceButton` | index.html:1120 | js/ai/ai-settings.js:210 |
| `naiBatchAcceptanceConfirmButton` | index.html:1121 | js/ai/ai-settings.js:223 |
| `naiBatchAcceptanceGate` | index.html:1103 | js/ai/ai-settings.js:192, js/ai/prompt/auto/auto-prompt-util.js:295, js/project-management.js:221 |
| `naiBatchAutoGenerateAfterPrompts` | index.html:1107 | js/ai/ai-settings.js:192, js/ai/prompt/auto/auto-prompt-util.js:300, js/project-management.js:222 |
| `naiBatchDirectorEnabled` | index.html:1097 | js/ai/manga-importer.js:2430, js/ai/prompt/auto/auto-prompt-util.js:355, js/project-management.js:290 |
| `naiBatchDirectorGenerateButton` | index.html:1156 |  |
| `naiBatchDirectorPrompt` | index.html:1095 | js/ai/manga-importer.js:2015, js/ai/prompt/auto/auto-prompt-util.js:237, js/project-management.js:289, js/simulator/story-to-manga.js:81 |
| `naiBatchDirectorPromptButton` | index.html:1145 |  |
| `naiBatchSaveTagDnaButton` | index.html:1122 | js/ai/ai-settings.js:232 |
| `naiCharacterAddCard` | index.html:1127 | js/ai/prompt/auto/character-card-manager.js:459 |
| `naiCharacterAddMaterial` | index.html:1135 | js/ai/prompt/auto/character-card-manager.js:461 |
| `naiCharacterCardList` | index.html:1130 | js/ai/prompt/auto/character-card-manager.js:321 |
| `naiCharacterCardPanel` | index.html:1124 |  |
| `naiCharacterMaterialCategory` | index.html:1133 | js/ai/prompt/auto/character-card-manager.js:254 |
| `naiCharacterMaterialTag` | index.html:1134 | js/ai/prompt/auto/character-card-manager.js:255 |
| `naiCharacterTargetSelect` | index.html:1132 | js/ai/prompt/auto/character-card-manager.js:240 |
| `naiCompositionAgent` | index.html:2447 | js/ai/ai-settings.js:192, js/ai/prompt/novelai-composition-director.js:1028, js/project-management.js:216 |
| `naiDirectorAdjustCanvas` | index.html:2447 | js/ai/ai-settings.js:192, js/ai/prompt/novelai-composition-director.js:502, js/project-management.js:217 |
| `naiDirectorApiKey` | index.html:2457 | js/ai/ai-settings.js:99, js/ai/prompt/novelai-composition-director.js:436, js/project-management.js:227 |
| `naiDirectorApiKeyToggle` | index.html:2458 | js/ai/ai-settings.js:135 |
| `naiDirectorApiUrl` | index.html:2452 | js/ai/ai-settings.js:28, js/ai/prompt/novelai-composition-director.js:435, js/project-management.js:226 |
| `naiDirectorHonorCharacterCards` | index.html:2447 | js/ai/ai-settings.js:192, js/ai/prompt/novelai-composition-director.js:274, js/project-management.js:219 |
| `naiDirectorMessageMode` | index.html:2447 | js/ai/ai-settings.js:192, js/ai/prompt/novelai-composition-director.js:306, js/project-management.js:220 |
| `naiDirectorModel` | index.html:2452 | js/ai/ai-settings.js:37, js/ai/prompt/novelai-composition-director.js:437, js/project-management.js:228 |
| `naiDirectorModelList` | index.html:2452 | js/ai/ai-settings.js:71 |
| `naiDirectorRefreshModels` | index.html:2452 | js/ai/ai-settings.js:92 |
| `naiDirectorResetSystemPrompt` | index.html:2448 | js/ai/ai-settings.js:201 |
| `naiDirectorStoreDrafts` | index.html:2447 | js/ai/ai-settings.js:192, js/project-management.js:223, js/ui/ai/auto-prompt-ui.js:63 |
| `naiDirectorSystemPrompt` | index.html:2480 | js/ai/ai-settings.js:192, js/ai/prompt/novelai-composition-director.js:378, js/project-management.js:239 |
| `naiDirectorTestApi` | index.html:2458 | js/ai/ai-settings.js:151 |
| `naiDirectorTimeout` | index.html:2462 | js/ai/ai-settings.js:192, js/ai/prompt/novelai-composition-director.js:438, js/project-management.js:229 |
| `naiDirectorUseApi` | index.html:2447 | js/ai/ai-settings.js:192, js/ai/prompt/novelai-composition-director.js:433, js/project-management.js:224 |
| `naiDirectorUseProxy` | index.html:2453 | js/ai/ai-settings.js:192, js/ai/prompt/novelai-composition-director.js:434, js/project-management.js:225 |
| `naiDirectorUseTagAnchors` | index.html:2447 | js/ai/ai-settings.js:192, js/ai/prompt/novelai-composition-director.js:946, js/project-management.js:218 |
| `naiExportAllPagesPngButton` | index.html:1117 | js/ai/panel-pipeline-review.js:246 |
| `naiGenerateComicDemo` | index.html:2503 | js/ai/ai-settings.js:395 |
| `naiGenerateMaterialPreviews` | index.html:2503 | js/ai/ai-settings.js:363 |
| `naiGoNextReviewPanelButton` | index.html:1116 | js/ai/panel-pipeline-review.js:239 |
| `naiHealthCheck` | index.html:2499 | js/ai/ai-settings.js:386 |
| `naiHistoryClose` | index.html:2157 | js/ui/visual-ps-tools.js:590 |
| `naiHistoryList` | index.html:2158 | js/ui/visual-ps-tools.js:535 |
| `naiHistoryPanel` | index.html:2156 | js/ui/visual-ps-tools.js:554 |
| `naiMarkPanelsForManualReview` | index.html:1112 | js/ai/panel-pipeline-review.js:23, js/project-management.js:288 |
| `naiMaterialPreviewStatus` | index.html:2503 | js/ai/ai-settings.js:377 |
| `naiObjectBiggerBtn` | index.html:2152 | js/canvas-manager.js:942 |
| `naiObjectFitBtn` | index.html:2153 | js/canvas-manager.js:944 |
| `naiObjectSmallerBtn` | index.html:2151 | js/canvas-manager.js:943 |
| `naiPageSizeBadge` | index.html:2120 | js/canvas-manager.js:53 |
| `naiPropFill` | index.html:2128 | js/ui/visual-ps-tools.js:229, js/ui/visual-studio.js:227 |
| `naiPropOpacity` | index.html:2131 | js/ui/visual-studio.js:227 |
| `naiPropShadow` | index.html:2132 | js/ui/visual-studio.js:227 |
| `naiPropStrip` | index.html:2127 | js/ui/visual-studio.js:221 |
| `naiPropStroke` | index.html:2129 | js/ui/visual-ps-tools.js:230, js/ui/visual-studio.js:227 |
| `naiPropStrokeW` | index.html:2130 | js/ui/visual-studio.js:227 |
| `naiScenePlanApply` | index.html:1165 | js/ai/director/scene-plan-controller.js:44 |
| `naiScenePlanGenerate` | index.html:1165 | js/ai/director/scene-plan-controller.js:44 |
| `naiScenePlanInput` | index.html:1164 | js/ai/director/scene-plan-controller.js:43 |
| `naiScenePlanJson` | index.html:1168 | js/ai/director/scene-plan-controller.js:6 |
| `naiScenePlanPreview` | index.html:1165 | js/ai/director/scene-plan-controller.js:44 |
| `naiScenePlanRetry` | index.html:1170 | js/ai/director/scene-plan-controller.js:44 |
| `naiScenePlanRollback` | index.html:1170 | js/ai/director/scene-plan-controller.js:44 |
| `naiScenePlanStatus` | index.html:1171 | js/ai/director/scene-plan-controller.js:5 |
| `naiTemplatePlaceMode` | index.html:756 | js/sidebar/speechBubble/speech-bubble-effect.js:151 |
| `naiTokenBadge` | index.html:2121 | js/ui/beginner-guide.js:335 |
| `naiToolJobStatus` | index.html:2504 | js/ai/ai-settings.js:404 |
| `naiToolOptionsBar` | index.html:2125 | js/ui/visual-studio.js:285 |
| `naiToolOptionsControls` | index.html:2142 | js/ui/visual-studio.js:287 |
| `naiToolOptionsMain` | index.html:2126 | js/ui/visual-studio.js:286 |
| `naiZoomFitBtn` | index.html:2148 | js/canvas-manager.js:941 |
| `naiZoomInBtn` | index.html:2147 | js/canvas-manager.js:939 |
| `naiZoomLabel` | index.html:2146 | js/canvas-manager.js:645 |
| `naiZoomLabelHeader` | index.html:2118 | js/canvas-manager.js:645 |
| `naiZoomOutBtn` | index.html:2145 | js/canvas-manager.js:940 |
| `naiZoomTools` | index.html:2143 |  |
| `navbar-logo` | index.html:252 | js/ui/util/mode-change.js:44 |
| `navbarDropdownCanvas` | index.html:422 |  |
| `navbarDropdownDonate` | index.html:605 |  |
| `navbarDropdownFile` | index.html:260 |  |
| `navbarDropdownHelp` | index.html:523 |  |
| `navbarDropdownLinks` | index.html:563 |  |
| `navbarDropdownPrompt` | index.html:401 |  |
| `navbarDropdownView` | index.html:363 |  |
| `navbarNavDropdown` | index.html:257 |  |
| `negativeAreaId` | index.html:2242 | js/ai/ui/ai-ui-util.js:47 |
| `novelaiApiKey` | index.html:2369 | js/ai/ai-settings.js:131, js/ai/provider/novelai-provider.js:16, js/project-management.js:206, js/ui/beginner-guide.js:323 |
| `novelaiApiKeyToggle` | index.html:2370 | js/ai/ai-settings.js:129 |
| `novelaiApiUrl` | index.html:2359 | js/ai/ai-settings.js:176, js/ai/provider/novelai-provider.js:24, js/project-management.js:204 |
| `novelaiApiUrlDefaultUrl` | index.html:2360 | js/ai/ai-settings.js:174 |
| `novelaiCfgRescale` | index.html:2422 | js/ai/ai-settings.js:192, js/ai/provider/novelai-provider.js:317, js/project-management.js:212 |
| `novelaiConcurrency` | index.html:2493 | js/ai/ai-management.js:5, js/ai/ai-settings.js:192, js/project-management.js:215 |
| `novelaiDashboard` | index.html:2360 | js/ai/ai-settings.js:178 |
| `novelaiI2INoise` | index.html:2432 | js/ai/ai-settings.js:192, js/ai/provider/novelai-provider.js:354, js/project-management.js:214 |
| `novelaiI2IStrength` | index.html:2427 | js/ai/ai-settings.js:192, js/ai/provider/novelai-provider.js:353, js/project-management.js:213 |
| `novelaiModel` | index.html:2382 | js/ai/ai-settings.js:187, js/ai/provider/novelai-provider.js:46, js/project-management.js:207 |
| `novelaiQualityToggle` | index.html:2437 | js/ai/ai-settings.js:192, js/ai/provider/novelai-provider.js:299, js/project-management.js:240 |
| `novelaiRememberToken` | index.html:2375 | js/project-management.js:326, js/ui/beginner-guide.js:397 |
| `novelaiSM` | index.html:2442 | js/ai/ai-settings.js:192, js/ai/provider/novelai-provider.js:310, js/project-management.js:241 |
| `novelaiSMDyn` | index.html:2442 | js/ai/ai-settings.js:192, js/ai/provider/novelai-provider.js:311, js/project-management.js:242 |
| `novelaiSampler` | index.html:2395 | js/ai/ai-settings.js:192, js/ai/provider/novelai-provider.js:305, js/project-management.js:208 |
| `novelaiScale` | index.html:2412 | js/ai/ai-settings.js:192, js/ai/provider/novelai-provider.js:304, js/project-management.js:210 |
| `novelaiSteps` | index.html:2407 | js/ai/ai-settings.js:192, js/ai/provider/novelai-provider.js:306, js/project-management.js:209 |
| `novelaiUcPreset` | index.html:2417 | js/ai/ai-settings.js:192, js/ai/provider/novelai-provider.js:308, js/project-management.js:211 |
| `novelaiUseLocalProxy` | index.html:2364 | js/ai/ai-settings.js:192, js/ai/provider/novelai-provider.js:30, js/project-management.js:205 |
| `onePanelGenerateNumber` | index.html:1154 | js/ai/prompt/auto/auto-generation.js:4, js/project-management.js:286, js/ui/third/base-translation/base-ja.js:37 |
| `opacity-control` | index.html:1992 | js/ui/control/common-control-management.js:2 |
| `other-controls-mini` | index.html:2273 | js/ui/ai/auto-prompt-ui.js:83 |
| `otherControlsPanel` | index.html:2270 |  |
| `outputBitDepth` | index.html:478 | js/canvas-manager.js:235, js/core/util/image-util.js:618, js/project-management.js:200, js/ui/third/base-translation/base-de.js:404, js/ui/third/base-translation/base-en.js:484, js/ui/third/base-translation/base-es.js:477, js/ui/third/base-translation/base-fr.js:479, js/ui/third/base-translation/base-ja.js:409, js/ui/third/base-translation/base-ko.js:479, js/ui/third/base-translation/base-ru.js:478, js/ui/third/base-translation/base-zh.js:490, scripts/image-export-smoke-test.cjs:368 |
| `outputBitDepthHint` | index.html:484 | js/canvas-manager.js:243, js/ui/third/base-translation/base-de.js:408, js/ui/third/base-translation/base-en.js:488, js/ui/third/base-translation/base-es.js:481, js/ui/third/base-translation/base-fr.js:483, js/ui/third/base-translation/base-ja.js:413, js/ui/third/base-translation/base-ko.js:483, js/ui/third/base-translation/base-ru.js:482, js/ui/third/base-translation/base-zh.js:494, scripts/image-export-smoke-test.cjs:368 |
| `outputDpi` | index.html:442 | js/canvas-manager.js:263, js/core/util/image-util.js:667, js/project-management.js:198, scripts/image-export-smoke-test.cjs:150 |
| `outputImageEstimate` | index.html:500 | js/canvas-manager.js:539, js/ui/third/base-translation/base-de.js:398, js/ui/third/base-translation/base-en.js:478, js/ui/third/base-translation/base-es.js:471, js/ui/third/base-translation/base-fr.js:473, js/ui/third/base-translation/base-ja.js:403, js/ui/third/base-translation/base-ko.js:473, js/ui/third/base-translation/base-ru.js:472, js/ui/third/base-translation/base-zh.js:484 |
| `outputImageEstimateRow` | index.html:497 |  |
| `outputImageFormat` | index.html:469 | js/canvas-manager.js:234, js/core/util/image-util.js:673, js/project-management.js:199, js/ui/third/base-translation/base-de.js:396, js/ui/third/base-translation/base-en.js:476, js/ui/third/base-translation/base-es.js:469, js/ui/third/base-translation/base-fr.js:471, js/ui/third/base-translation/base-ja.js:401, js/ui/third/base-translation/base-ko.js:471, js/ui/third/base-translation/base-ru.js:470, js/ui/third/base-translation/base-zh.js:482 |
| `outputImageQuality` | index.html:488 | js/canvas-manager.js:516, js/core/util/image-util.js:674, js/project-management.js:201, js/ui/third/base-translation/base-de.js:397, js/ui/third/base-translation/base-en.js:477, js/ui/third/base-translation/base-es.js:470, js/ui/third/base-translation/base-fr.js:472, js/ui/third/base-translation/base-ja.js:402, js/ui/third/base-translation/base-ko.js:472, js/ui/third/base-translation/base-ru.js:471, js/ui/third/base-translation/base-zh.js:483 |
| `page-landscape` | index.html:778 | js/sidebar/panel/panel-template.js:169 |
| `page-portrait` | index.html:774 | js/sidebar/panel/panel-template.js:168 |
| `page-title` | html/functionList.html:37 | html/functionList.html:294 |
| `pageCount` | index.html:974 | js/panel/random-cut.js:71, js/project-management.js:281, js/ui/third/base-translation/base-de.js:112, js/ui/third/base-translation/base-en.js:117, js/ui/third/base-translation/base-es.js:112, js/ui/third/base-translation/base-fr.js:112, js/ui/third/base-translation/base-ja.js:116, js/ui/third/base-translation/base-ko.js:112, js/ui/third/base-translation/base-ru.js:112, js/ui/third/base-translation/base-zh.js:117 |
| `pageEffectAngle` | index.html:879 | js/sidebar/page/page-studio.js:495 |
| `pageEffectApply` | index.html:895 | js/sidebar/page/page-studio.js:551 |
| `pageEffectBehind` | index.html:893 | js/sidebar/page/page-studio.js:499 |
| `pageEffectClear` | index.html:896 | js/sidebar/page/page-studio.js:557 |
| `pageEffectColor` | index.html:891 | js/sidebar/page/page-studio.js:498 |
| `pageEffectDensity` | index.html:875 | js/sidebar/page/page-studio.js:494 |
| `pageEffectLength` | index.html:883 | js/sidebar/page/page-studio.js:497 |
| `pageEffectOpacity` | index.html:887 | js/sidebar/page/page-studio.js:496 |
| `pageEffectPreset` | index.html:871 | js/sidebar/page/page-studio.js:493 |
| `pagePaperApply` | index.html:850 | js/sidebar/page/page-studio.js:533 |
| `pagePaperClear` | index.html:853 | js/sidebar/page/page-studio.js:547 |
| `pagePaperFile` | index.html:852 | js/sidebar/page/page-studio.js:539 |
| `pagePaperPreset` | index.html:847 | js/sidebar/page/page-studio.js:506 |
| `pagePaperReveal` | index.html:855 | js/sidebar/page/page-studio.js:549 |
| `pagePaperSwatches` | index.html:844 | js/sidebar/page/page-studio.js:576 |
| `panel-manager-area` | index.html:767 | js/sidebar/sidebar.js:79, js/ui/beginner-guide.js:179, js/ui/visual-studio.js:328 |
| `panel-manager-items` | index.html:769 |  |
| `panelFillColor` | index.html:819 | js/project-management.js:251, js/sidebar/page/page-studio.js:457, js/sidebar/panel/panel-manager.js:550, js/simulator/story-to-manga.js:89 |
| `panelLayoutModeRandom` | index.html:993 |  |
| `panelLayoutModeTemplate` | index.html:990 |  |
| `panelLayoutRecommendButton` | index.html:1008 | js/panel/layout-templates.js:368 |
| `panelLayoutRecommendList` | index.html:1009 | js/panel/layout-templates.js:320 |
| `panelLayoutTemplateButton` | index.html:1007 | js/panel/layout-templates.js:366 |
| `panelLayoutTemplateSelect` | index.html:1005 | js/panel/layout-templates.js:30, js/panel/random-cut.js:106, js/project-management.js:287 |
| `panelLayoutTemplateWrap` | index.html:1001 | js/panel/layout-templates.js:69 |
| `panelOpacity` | index.html:825 | js/project-management.js:253, js/sidebar/panel/panel-manager.js:548, js/ui/third/base-translation/base-de.js:362, js/ui/third/base-translation/base-en.js:368, js/ui/third/base-translation/base-es.js:361, js/ui/third/base-translation/base-fr.js:362, js/ui/third/base-translation/base-ja.js:367, js/ui/third/base-translation/base-ko.js:364, js/ui/third/base-translation/base-ru.js:362, js/ui/third/base-translation/base-zh.js:373 |
| `panelRandomCutButton` | index.html:1012 | js/panel/random-cut.js:135 |
| `panelStrokeColor` | index.html:815 | js/project-management.js:250, js/sidebar/page/page-studio.js:469, js/sidebar/panel/panel-manager.js:530, js/simulator/story-to-manga.js:90 |
| `panelStrokeWidth` | index.html:822 | js/project-management.js:252, js/sidebar/page/page-studio.js:470, js/sidebar/panel/panel-manager.js:529, js/simulator/story-to-manga.js:91 |
| `panelVariedMangaPerPage` | index.html:998 | js/panel/random-cut.js:81 |
| `pen-tool-buttons` | index.html:1869 |  |
| `pinokio` | html/API_Help/comfyui_settings.html:54 |  |
| `projectLoad` | index.html:273 | js/project-management.js:23, js/shortcut.js:188, js/ui/third/base-translation/base-de.js:468, js/ui/third/base-translation/base-en.js:396, js/ui/third/base-translation/base-es.js:389, js/ui/third/base-translation/base-fr.js:391, js/ui/third/base-translation/base-ja.js:473, js/ui/third/base-translation/base-ko.js:391, js/ui/third/base-translation/base-ru.js:390, js/ui/third/base-translation/base-zh.js:402 |
| `projectSave` | index.html:267 | js/project-management.js:22, js/shortcut.js:180, js/ui/third/base-translation/base-de.js:469, js/ui/third/base-translation/base-en.js:395, js/ui/third/base-translation/base-es.js:388, js/ui/third/base-translation/base-fr.js:390, js/ui/third/base-translation/base-ja.js:474, js/ui/third/base-translation/base-ko.js:390, js/ui/third/base-translation/base-ru.js:389, js/ui/third/base-translation/base-zh.js:401 |
| `prompt-A` | index.html:2236 | js/ai/ui/ai-ui-util.js:42 |
| `prompt-E` | index.html:2250 | js/ai/ui/ai-ui-util.js:43 |
| `prompt-F` | index.html:2261 | js/ai/ui/ai-ui-util.js:44 |
| `prompt-manager-area` | index.html:1451 | js/sidebar/sidebar.js:81 |
| `ps-tools-area` | index.html:1847 | js/ui/visual-studio.js:332 |
| `pwa-install-button` | index.html:624 | js/core/service/worker-register.js:84 |
| `redo` | index.html:2195 | html/Shortcut/shortcut.html:66, js/core/svg/google-icon-names.js:11, js/ui/third/base-translation/base-de.js:316, js/ui/third/base-translation/base-en.js:322, js/ui/third/base-translation/base-es.js:315, js/ui/third/base-translation/base-fr.js:316, js/ui/third/base-translation/base-ja.js:321, js/ui/third/base-translation/base-ko.js:316, js/ui/third/base-translation/base-ru.js:316, js/ui/third/base-translation/base-zh.js:327, js/ui/third/tippy.js:91 |
| `resetFlexGenSizeBtn` | index.html:1041 | js/sidebar/panel/panel-template.js:236 |
| `resizable-container` | index.html:2162 | js/canvas-manager.js:42, js/ui/beginner-guide.js:434 |
| `roleMatrixBody` | index.html:2334 | js/ai/role/role-assignment-ui.js:31 |
| `sbDeleteButton` | index.html:1547 | js/sidebar/speechBubble/speech-bubble-freehand.js:9 |
| `sbFillColor` | index.html:1573 | js/project-management.js:260, js/sidebar/speechBubble/speech-bubble-freehand.js:12 |
| `sbFillOpacity` | index.html:1586 | js/project-management.js:264, js/sidebar/speechBubble/speech-bubble-freehand.js:15 |
| `sbFillOpacity2` | index.html:1592 | js/project-management.js:266 |
| `sbFreehandButton` | index.html:1545 | js/sidebar/speechBubble/speech-bubble-freehand.js:6 |
| `sbFreehandHorizontalText` | index.html:1554 |  |
| `sbFreehandNothingText` | index.html:1550 |  |
| `sbFreehandVerticalText` | index.html:1558 |  |
| `sbHorizontalText` | index.html:1513 |  |
| `sbMoveButton` | index.html:1546 | js/sidebar/speechBubble/speech-bubble-freehand.js:8 |
| `sbNothingText` | index.html:1509 |  |
| `sbPointButton` | index.html:1544 | js/sidebar/speechBubble/speech-bubble-freehand.js:5 |
| `sbPointSpace` | index.html:1583 | js/project-management.js:263, js/sidebar/speechBubble/speech-bubble-freehand.js:17 |
| `sbSelectButton` | index.html:1543 | js/sidebar/speechBubble/speech-bubble-freehand.js:7 |
| `sbSmoothing` | index.html:1577 | js/project-management.js:261, js/sidebar/speechBubble/speech-bubble-freehand.js:11 |
| `sbSornerRadius` | index.html:1589 | js/project-management.js:265, js/sidebar/speechBubble/speech-bubble-freehand.js:16 |
| `sbStrokeColor` | index.html:1569 | js/project-management.js:259, js/sidebar/speechBubble/speech-bubble-freehand.js:13 |
| `sbStrokeWidth` | index.html:1580 | js/project-management.js:262, js/sidebar/speechBubble/speech-bubble-freehand.js:14 |
| `sbVerticalText` | index.html:1517 |  |
| `sb_aButton` | index.html:1598 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_bButton` | index.html:1601 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_cButton` | index.html:1604 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_dButton` | index.html:1607 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_eButton` | index.html:1610 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_fButton` | index.html:1613 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `sb_gButton` | index.html:1616 | js/sidebar/speechBubble/speech-bubble-freehand.js:52 |
| `scale-control` | index.html:1977 | js/ui/control/common-control-management.js:2 |
| `scratchButton` | index.html:1734 |  |
| `settingsAutoSaveCheckbox` | index.html:340 | js/project-management.js:246, js/sidebar/sidebar-ui.js:24 |
| `settingsReset` | index.html:283 | js/ui/third/base-translation/base-zh.js:589, js/ui/third/i18next.js:3832 |
| `settingsSave` | index.html:278 | js/project-management.js:19, js/shortcut.js:210, js/ui/third/base-translation/base-de.js:481, js/ui/third/base-translation/base-en.js:397, js/ui/third/base-translation/base-es.js:390, js/ui/third/base-translation/base-fr.js:392, js/ui/third/base-translation/base-ja.js:486, js/ui/third/base-translation/base-ko.js:392, js/ui/third/base-translation/base-ru.js:391, js/ui/third/base-translation/base-zh.js:403 |
| `sfxPaletteAdd` | index.html:1717 | js/sidebar/text/sfx-palette.js:125 |
| `sfxPaletteInput` | index.html:1707 | js/sidebar/text/sfx-palette.js:126 |
| `sfxPaletteList` | index.html:1705 | js/sidebar/text/sfx-palette.js:107, js/ui/visual-studio.js:93 |
| `sfxPaletteStyle` | index.html:1708 | js/sidebar/text/sfx-palette.js:127 |
| `shadowButton` | index.html:1722 |  |
| `shape-area` | index.html:2018 | js/sidebar/sidebar.js:92, js/ui/visual-ps-tools.js:162, js/ui/visual-studio.js:330 |
| `shape-preview-area` | index.html:2020 |  |
| `shortcutGrid` | index.html:2306 | js/shortcut.js:317 |
| `shortcutModal` | index.html:2298 | js/shortcut.js:358 |
| `shortcutPage` | index.html:533 | js/ui/third/base-translation/base-de.js:486, js/ui/third/base-translation/base-en.js:496, js/ui/third/base-translation/base-es.js:489, js/ui/third/base-translation/base-fr.js:491, js/ui/third/base-translation/base-ja.js:491, js/ui/third/base-translation/base-ko.js:491, js/ui/third/base-translation/base-ru.js:490, js/ui/third/base-translation/base-zh.js:502 |
| `sidebar` | index.html:643 |  |
| `sidebarMore` | index.html:720 | js/sidebar/sidebar.js:9, js/ui/tutorial.js:150 |
| `sidebarMoreToggle` | index.html:738 | js/sidebar/sidebar.js:8 |
| `simStudioBack` | index.html:3022 | js/simulator/simulator-studio.js:830, js/ui/third/base-translation/base-de.js:522, js/ui/third/base-translation/base-en.js:537, js/ui/third/base-translation/base-es.js:514, js/ui/third/base-translation/base-fr.js:531, js/ui/third/base-translation/base-ja.js:527, js/ui/third/base-translation/base-ko.js:529, js/ui/third/base-translation/base-ru.js:515, js/ui/third/base-translation/base-zh.js:542 |
| `simStudioChatActions` | index.html:3071 | js/simulator/simulator-studio.js:864 |
| `simStudioChatDock` | index.html:3036 | js/simulator/simulator-studio.js:861 |
| `simStudioChatInsert` | index.html:3072 | js/simulator/simulator-studio.js:1051 |
| `simStudioChatLoad` | index.html:3073 | js/simulator/simulator-studio.js:1053 |
| `simStudioChatScript` | index.html:3049 | js/simulator/simulator-studio.js:116 |
| `simStudioChatStore` | index.html:3042 | js/simulator/simulator-studio.js:441 |
| `simStudioChatTemplate` | index.html:3045 | js/simulator/simulator-studio.js:414 |
| `simStudioChatTitle` | index.html:3039 | js/simulator/simulator-studio.js:125 |
| `simStudioClose` | index.html:3024 | js/simulator/simulator-studio.js:1038, js/ui/third/base-translation/base-de.js:523, js/ui/third/base-translation/base-en.js:538, js/ui/third/base-translation/base-es.js:515, js/ui/third/base-translation/base-fr.js:532, js/ui/third/base-translation/base-ja.js:528, js/ui/third/base-translation/base-ko.js:530, js/ui/third/base-translation/base-ru.js:516, js/ui/third/base-translation/base-zh.js:543 |
| `simStudioFit` | index.html:3095 | js/simulator/simulator-studio.js:1088 |
| `simStudioHome` | index.html:3026 | js/simulator/simulator-studio.js:828 |
| `simStudioHomeGrid` | index.html:3028 | js/simulator/simulator-studio.js:462 |
| `simStudioPartActions` | index.html:3080 | js/simulator/simulator-studio.js:866 |
| `simStudioPartDock` | index.html:3060 | js/simulator/simulator-studio.js:863 |
| `simStudioPartForm` | index.html:3067 | js/simulator/simulator-studio.js:429 |
| `simStudioPartInsert` | index.html:3081 | js/simulator/simulator-studio.js:1072 |
| `simStudioPartLoad` | index.html:3082 | js/simulator/simulator-studio.js:1074 |
| `simStudioPartSelect` | index.html:3065 |  |
| `simStudioPartStore` | index.html:3062 | js/simulator/simulator-studio.js:488 |
| `simStudioPlay` | index.html:3087 | js/simulator/simulator-studio.js:1080, js/ui/third/base-translation/base-de.js:529, js/ui/third/base-translation/base-en.js:544, js/ui/third/base-translation/base-es.js:521, js/ui/third/base-translation/base-fr.js:538, js/ui/third/base-translation/base-ja.js:534, js/ui/third/base-translation/base-ko.js:536, js/ui/third/base-translation/base-ru.js:522, js/ui/third/base-translation/base-zh.js:549 |
| `simStudioPlayIndex` | index.html:3089 | js/simulator/simulator-studio.js:515 |
| `simStudioPlayNext` | index.html:3086 | js/simulator/simulator-studio.js:1078, js/ui/third/base-translation/base-de.js:528, js/ui/third/base-translation/base-en.js:543, js/ui/third/base-translation/base-es.js:520, js/ui/third/base-translation/base-fr.js:537, js/ui/third/base-translation/base-ja.js:533, js/ui/third/base-translation/base-ko.js:535, js/ui/third/base-translation/base-ru.js:521, js/ui/third/base-translation/base-zh.js:548 |
| `simStudioPlayPrev` | index.html:3085 | js/simulator/simulator-studio.js:1076, js/ui/third/base-translation/base-de.js:527, js/ui/third/base-translation/base-en.js:542, js/ui/third/base-translation/base-es.js:519, js/ui/third/base-translation/base-fr.js:536, js/ui/third/base-translation/base-ja.js:532, js/ui/third/base-translation/base-ko.js:534, js/ui/third/base-translation/base-ru.js:520, js/ui/third/base-translation/base-zh.js:547 |
| `simStudioPlayStop` | index.html:3088 | js/simulator/simulator-studio.js:1082 |
| `simStudioPlayTotal` | index.html:3089 | js/simulator/simulator-studio.js:516 |
| `simStudioPreview` | index.html:3032 | js/simulator/simulator-studio.js:570 |
| `simStudioPreviewHost` | index.html:3031 | js/simulator/simulator-studio.js:569 |
| `simStudioScaleDown` | index.html:3093 | js/simulator/simulator-studio.js:1084 |
| `simStudioScaleUp` | index.html:3094 | js/simulator/simulator-studio.js:1086 |
| `simStudioStatus` | index.html:3100 | js/simulator/simulator-studio.js:105 |
| `simStudioTitle` | index.html:3023 | js/simulator/simulator-studio.js:834, js/ui/third/base-translation/base-de.js:520, js/ui/third/base-translation/base-en.js:535, js/ui/third/base-translation/base-es.js:512, js/ui/third/base-translation/base-fr.js:529, js/ui/third/base-translation/base-ja.js:525, js/ui/third/base-translation/base-ko.js:527, js/ui/third/base-translation/base-ru.js:513, js/ui/third/base-translation/base-zh.js:540 |
| `simStudioWebActions` | index.html:3075 | js/simulator/simulator-studio.js:865 |
| `simStudioWebDock` | index.html:3053 | js/simulator/simulator-studio.js:862 |
| `simStudioWebExample` | index.html:3076 | js/simulator/simulator-studio.js:1059 |
| `simStudioWebForm` | index.html:3058 | js/simulator/simulator-studio.js:428 |
| `simStudioWebInsert` | index.html:3077 | js/simulator/simulator-studio.js:1055 |
| `simStudioWebLoad` | index.html:3078 | js/simulator/simulator-studio.js:1057 |
| `simStudioWebTemplate` | index.html:3056 | js/simulator/simulator-studio.js:445 |
| `simStudioWork` | index.html:3030 | js/simulator/simulator-studio.js:829 |
| `simulator-chat-area` | index.html:1179 | js/sidebar/sidebar.js:82, js/ui/beginner-guide.js:198 |
| `simulator-extra-section` | index.html:1288 |  |
| `simulator-playback-section` | index.html:1227 |  |
| `simulatorChatAddMessageButton` | index.html:1271 | js/simulator/chat-controller.js:334 |
| `simulatorChatAddParticipantButton` | index.html:1266 | js/simulator/chat-controller.js:326 |
| `simulatorChatExportButton` | index.html:1277 | js/simulator/chat-controller.js:345 |
| `simulatorChatInsertButton` | index.html:1274 | js/simulator/chat-controller.js:339 |
| `simulatorChatLoadButton` | index.html:1275 | js/simulator/chat-controller.js:341 |
| `simulatorChatMessages` | index.html:1270 | js/simulator/chat-controller.js:121, js/ui/third/base-translation/base-de.js:513, js/ui/third/base-translation/base-en.js:528, js/ui/third/base-translation/base-es.js:505, js/ui/third/base-translation/base-fr.js:522, js/ui/third/base-translation/base-ja.js:518, js/ui/third/base-translation/base-ko.js:520, js/ui/third/base-translation/base-ru.js:506, js/ui/third/base-translation/base-zh.js:533 |
| `simulatorChatParticipants` | index.html:1265 | js/simulator/chat-controller.js:86, js/ui/third/base-translation/base-de.js:511, js/ui/third/base-translation/base-en.js:526, js/ui/third/base-translation/base-es.js:503, js/ui/third/base-translation/base-fr.js:520, js/ui/third/base-translation/base-ja.js:516, js/ui/third/base-translation/base-ko.js:518, js/ui/third/base-translation/base-ru.js:504, js/ui/third/base-translation/base-zh.js:531 |
| `simulatorChatRemoveButton` | index.html:1276 | js/simulator/chat-controller.js:343 |
| `simulatorChatStatus` | index.html:1286 | js/simulator/chat-controller.js:48 |
| `simulatorChatTemplate` | index.html:1254 | js/simulator/chat-controller.js:185 |
| `simulatorChatTheme` | index.html:1258 | js/simulator/chat-controller.js:183, js/ui/third/base-translation/base-de.js:510, js/ui/third/base-translation/base-en.js:525, js/ui/third/base-translation/base-es.js:502, js/ui/third/base-translation/base-fr.js:519, js/ui/third/base-translation/base-ja.js:515, js/ui/third/base-translation/base-ko.js:517, js/ui/third/base-translation/base-ru.js:503, js/ui/third/base-translation/base-zh.js:530 |
| `simulatorChatTitleInput` | index.html:1250 | js/simulator/chat-controller.js:181 |
| `simulatorExtraExportButton` | index.html:1303 | js/simulator/simulator-controller.js:115 |
| `simulatorExtraInsertButton` | index.html:1301 | js/simulator/simulator-controller.js:113 |
| `simulatorExtraLoadButton` | index.html:1300 | js/simulator/simulator-controller.js:112 |
| `simulatorExtraLoadSelectedButton` | index.html:1302 | js/simulator/simulator-controller.js:114 |
| `simulatorExtraSceneJson` | index.html:1297 | js/simulator/simulator-controller.js:29, js/simulator/simulator-studio.js:789 |
| `simulatorExtraStatus` | index.html:1305 | js/simulator/simulator-controller.js:10 |
| `simulatorExtraTemplate` | index.html:1294 | js/simulator/simulator-controller.js:46 |
| `simulatorPlaybackExportKeyframes` | index.html:1239 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackExportPages` | index.html:1240 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackIndex` | index.html:1235 | js/core/settings.js:96, js/simulator/playback-controller.js:23 |
| `simulatorPlaybackInterval` | index.html:1236 | js/simulator/playback-controller.js:97 |
| `simulatorPlaybackNext` | index.html:1231 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackPageHeight` | index.html:1237 | js/simulator/playback-controller.js:98 |
| `simulatorPlaybackPlay` | index.html:1232 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackPrevious` | index.html:1230 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackStatus` | index.html:1242 | js/simulator/playback-controller.js:11 |
| `simulatorPlaybackStop` | index.html:1233 | js/simulator/playback-controller.js:100 |
| `simulatorPlaybackTotal` | index.html:1235 | js/simulator/playback-controller.js:23 |
| `simulatorStudioOverlay` | index.html:3020 | js/simulator/simulator-studio.js:85 |
| `simulatorWorkspaceTabs` | index.html:1182 | js/assets/asset-library-controller.js:211 |
| `skewX-control` | index.html:1986 | js/ui/control/common-control-management.js:2 |
| `skewY-control` | index.html:1989 | js/ui/control/common-control-management.js:2 |
| `sp-manga-toastContainer` | index.html:2294 | js/ui/toast.js:13 |
| `speech-bubble-area` | index.html:1482 | js/sidebar/sidebar.js:84, js/sidebar/speechBubble/speech-bubble-effect.js:294, js/ui/visual-studio.js:317 |
| `speech-bubble-area1` | index.html:1488 | js/sidebar/sidebar.js:47, js/sidebar/speechBubble/speech-bubble-effect.js:294 |
| `speech-bubble-area2` | index.html:1533 | js/sidebar/sidebar.js:48 |
| `speech-bubble-preview` | index.html:1527 | js/sidebar/panel/panel-manager.js:416, js/sidebar/speechBubble/speech-bubble-effect.js:137, js/ui/visual-studio.js:92 |
| `speech-bubble-svg-preview-area1` | index.html:1491 |  |
| `speech-bubble-svg-preview-area2` | index.html:1539 |  |
| `speechBubbleLineSizeSlider` | index.html:1524 | js/project-management.js:258 |
| `speechBubbleOpacity` | index.html:1502 | js/project-management.js:256, js/sidebar/speechBubble/speech-bubble-effect.js:6 |
| `speechBubbleTabs` | index.html:1484 | js/sidebar/sidebar.js:37 |
| `stability` | html/API_Help/comfyui_settings.html:42 |  |
| `story-composer-section` | index.html:1189 |  |
| `storyComposerAddCharacter` | index.html:1202 | js/simulator/story-composer-controller.js:318 |
| `storyComposerCharacters` | index.html:1195 | js/simulator/story-composer-controller.js:32 |
| `storyComposerExportJson` | index.html:1219 | js/simulator/story-composer-controller.js:334 |
| `storyComposerFillPrompt` | index.html:1217 | js/simulator/story-composer-controller.js:327 |
| `storyComposerInput` | index.html:1197 | js/simulator/story-composer-controller.js:121 |
| `storyComposerInsert` | index.html:1210 | js/simulator/story-composer-controller.js:319 |
| `storyComposerLoad` | index.html:1218 | js/simulator/story-composer-controller.js:328 |
| `storyComposerManga` | index.html:1211 | js/simulator/story-composer-controller.js:326 |
| `storyComposerNodes` | index.html:1204 | js/simulator/story-composer-controller.js:59 |
| `storyComposerParse` | index.html:1201 | js/simulator/story-composer-controller.js:317 |
| `storyComposerPlusOne` | index.html:1200 | js/simulator/story-composer-controller.js:316 |
| `storyComposerSelectPage` | index.html:1216 | js/simulator/story-composer-controller.js:329 |
| `storyComposerSend` | index.html:1199 | js/simulator/story-composer-controller.js:315 |
| `storyComposerStatus` | index.html:1223 | js/simulator/story-composer-controller.js:18 |
| `storyComposerTemplate` | index.html:1207 | js/simulator/simulator-studio.js:951, js/simulator/story-composer-controller.js:95 |
| `storyComposerTitle` | index.html:1193 | js/simulator/story-composer-controller.js:110 |
| `storyComposerTypes` | index.html:1196 | js/simulator/story-composer-controller.js:272 |
| `svg-container-template` | index.html:742 | js/sidebar/panel/panel-manager.js:404, js/sidebar/sidebar.js:3, js/sidebar/speechBubble/speech-bubble-effect.js:284, js/ui/beginner-guide.js:187, js/ui/visual-studio.js:315 |
| `svg-preview-area-landscape` | index.html:763 | js/sidebar/sidebar.js:105, js/sidebar/speechBubble/speech-bubble-effect.js:136, js/ui/visual-studio.js:91 |
| `svg-preview-area-vertical` | index.html:762 | js/sidebar/sidebar.js:104, js/sidebar/speechBubble/speech-bubble-effect.js:135, js/ui/visual-studio.js:90 |
| `svgDownload` | index.html:306 | js/project-management.js:681 |
| `svg_icon_fillColor` | index.html:2059 | js/core/svg/google-icon-helper.js:140, js/project-management.js:269 |
| `svg_icon_fillOpacity` | index.html:2065 | js/core/svg/google-icon-helper.js:141, js/project-management.js:271 |
| `svg_icon_iconStyle` | index.html:2042 | js/core/svg/google-icon-helper.js:41, js/project-management.js:267 |
| `svg_icon_lineColor` | index.html:2055 | js/core/svg/google-icon-helper.js:139, js/project-management.js:268 |
| `svg_icon_lineWidth` | index.html:2062 | js/core/svg/google-icon-helper.js:142, js/project-management.js:270 |
| `svg_icon_results` | index.html:2088 | js/core/svg/google-icon-helper.js:39 |
| `svg_icon_searchInput` | index.html:2035 | js/core/svg/google-icon-helper.js:70 |
| `svg_icon_shadowBlur` | index.html:2076 | js/core/svg/google-icon-helper.js:170, js/project-management.js:273 |
| `svg_icon_shadowColor` | index.html:2073 | js/core/svg/google-icon-helper.js:169, js/project-management.js:272 |
| `svg_icon_shadowOffsetX` | index.html:2079 | js/core/svg/google-icon-helper.js:171, js/project-management.js:274 |
| `svg_icon_shadowOffsetY` | index.html:2082 | js/core/svg/google-icon-helper.js:172, js/project-management.js:275 |
| `table-header` | html/functionList.html:42 | html/functionList.html:293 |
| `template-orientation-toggle` | index.html:746 | js/sidebar/sidebar.js:103, js/sidebar/speechBubble/speech-bubble-effect.js:285 |
| `text-area` | index.html:1625 | js/sidebar/sidebar.js:86, js/ui/visual-studio.js:319 |
| `text-area2` | index.html:1699 | js/sidebar/sidebar.js:87, js/ui/visual-studio.js:322 |
| `text-area2-settings` | index.html:1778 | js/sidebar/text/text-2-manager.js:126 |
| `text-preview-area` | index.html:1627 | js/sidebar/text/text-effect.js:494 |
| `textBgColorPicker` | index.html:1667 | js/project-management.js:297, js/sidebar/text/text-effect.js:122, js/sidebar/text/vertical-text.js:19 |
| `textColorPicker` | index.html:1659 | js/project-management.js:295, js/sidebar/speechBubble/speech-bubble-freehand.js:643, js/sidebar/speechBubble/speech-bubble-text.js:217, js/sidebar/text/text-effect.js:113, js/sidebar/text/vertical-text.js:16 |
| `textOutlineColorPicker` | index.html:1663 | js/project-management.js:296, js/sidebar/speechBubble/speech-bubble-freehand.js:644, js/sidebar/speechBubble/speech-bubble-text.js:218, js/sidebar/text/text-effect.js:117, js/sidebar/text/vertical-text.js:17 |
| `thrillButton` | index.html:1765 |  |
| `tiltRandom` | index.html:1023 | js/project-management.js:284, js/sidebar/panel/knife/knife-split-engine.js:70 |
| `toggleAiPanelButton` | index.html:2122 | js/ui/beginner-guide.js:409 |
| `toggleGridButton` | index.html:503 | js/panel/grid.js:119 |
| `toneList` | html/Minual/screen-tone.html:61 |  |
| `tool-area` | index.html:1865 | js/sidebar/pen/pen-tools.js:663, js/sidebar/sidebar.js:63, js/ui/util/event-delegator.js:62, js/ui/visual-studio.js:340 |
| `tool-settings` | index.html:1907 | js/sidebar/pen/pen-tools.js:114 |
| `top-control` | index.html:1980 | js/ui/control/common-control-management.js:2 |
| `undo` | index.html:2194 | html/Shortcut/shortcut.html:65, js/core/svg/google-icon-names.js:11, js/ui/third/base-translation/base-de.js:315, js/ui/third/base-translation/base-en.js:321, js/ui/third/base-translation/base-es.js:314, js/ui/third/base-translation/base-fr.js:315, js/ui/third/base-translation/base-ja.js:320, js/ui/third/base-translation/base-ko.js:315, js/ui/third/base-translation/base-ru.js:315, js/ui/third/base-translation/base-zh.js:326, js/ui/third/tippy.js:90 |
| `unifiedSettingsOverlay` | index.html:2312 | js/ai/ui/unified-settings-window.js:4 |
| `usTabAI` | index.html:2319 | js/ui/third/i18next.js:469 |
| `verticalRandomPanelCount` | index.html:1017 | js/panel/random-cut.js:10, js/project-management.js:282, js/ui/third/base-translation/base-de.js:114, js/ui/third/base-translation/base-en.js:119, js/ui/third/base-translation/base-es.js:114, js/ui/third/base-translation/base-fr.js:114, js/ui/third/base-translation/base-ja.js:118, js/ui/third/base-translation/base-ko.js:114, js/ui/third/base-translation/base-ru.js:114, js/ui/third/base-translation/base-zh.js:119 |
| `verticalText` | index.html:1638 | js/layer/layer-management.js:243, js/sidebar/text/vertical-text.js:3, js/ui/visual-studio.js:395 |
| `view_controls_checkbox` | index.html:381 | js/project-management.js:195, js/shortcut.js:73, js/sidebar/panel/panel-manager.js:662, js/ui/beginner-guide.js:349 |
| `view_layers_checkbox` | index.html:372 | js/project-management.js:194, js/shortcut.js:66, js/sidebar/panel/panel-manager.js:659 |
| `view_prompt_checkbox` | index.html:390 | js/project-management.js:247, js/shortcut.js:218, js/sidebar/panel/panel-manager.js:665 |
| `wildButton` | index.html:1728 |  |
| `zebraButton` | index.html:1771 |  |
| `zoomFit` | index.html:2115 | js/ui/third/base-translation/base-de.js:314, js/ui/third/base-translation/base-en.js:320, js/ui/third/base-translation/base-es.js:313, js/ui/third/base-translation/base-fr.js:314, js/ui/third/base-translation/base-ja.js:319, js/ui/third/base-translation/base-ko.js:314, js/ui/third/base-translation/base-ru.js:314, js/ui/third/base-translation/base-zh.js:325, js/ui/third/tippy.js:88 |
| `zoomIn` | index.html:2109 | js/ui/third/base-translation/base-de.js:312, js/ui/third/base-translation/base-en.js:318, js/ui/third/base-translation/base-es.js:311, js/ui/third/base-translation/base-fr.js:312, js/ui/third/base-translation/base-ja.js:317, js/ui/third/base-translation/base-ko.js:312, js/ui/third/base-translation/base-ru.js:312, js/ui/third/base-translation/base-zh.js:323, js/ui/third/tippy.js:86 |
| `zoomOut` | index.html:2112 | js/ui/third/base-translation/base-de.js:313, js/ui/third/base-translation/base-en.js:319, js/ui/third/base-translation/base-es.js:312, js/ui/third/base-translation/base-fr.js:313, js/ui/third/base-translation/base-ja.js:318, js/ui/third/base-translation/base-ko.js:313, js/ui/third/base-translation/base-ru.js:313, js/ui/third/base-translation/base-zh.js:324, js/ui/third/tippy.js:87 |

## 定義が見つからない参照（要確認）

| id | 参照しているファイル |
|----|--------------------|
| `AdetailerCheck` | js/ai/sdwebui/sdwebui-settings.js:113 |
| `AdetilerModelsNegative` | js/ai/sdwebui/sdwebui-settings.js:118 |
| `AdetilerModelsPrompt` | js/ai/sdwebui/sdwebui-settings.js:117 |
| `ExternalService_Heartbeat_Label_fw` | js/ai/comfyui/comfyui-management.js:161, js/ai/provider/falai-provider.js:191, js/ai/provider/novelai-provider.js:148 |
| `T2-Orientation-horizontal` | js/sidebar/text/text-2-manager.js:139 |
| `T2-Orientation-vertical` | js/sidebar/text/text-2-manager.js:138 |
| `T2-align-center` | js/sidebar/text/text-2-manager.js:136 |
| `T2-align-left` | js/sidebar/text/text-2-manager.js:135 |
| `T2-align-right` | js/sidebar/text/text-2-manager.js:137 |
| `addGlowEffectCheckBox` | js/sidebar/effect/effect-manager.js:117 |
| `angle-camera-prompt-display` | js/ai/angle/angle-editor.js:36 |
| `angle-camera-reset-btn` | js/ai/angle/angle-editor.js:37 |
| `angle-camera-widget-container` | js/ai/angle/angle-editor.js:35 |
| `angle-cancel-btn` | js/ai/angle/angle-editor.js:27 |
| `angle-generate-btn` | js/ai/angle/angle-editor.js:28 |
| `angle-modal` | js/ai/angle/angle-editor.js:21 |
| `angle-original-img` | js/ai/angle/angle-editor.js:56 |
| `angle-prompt` | js/ai/angle/angle-editor.js:45 |
| `ar_height` | js/sidebar/panel/panel-template.js:254 |
| `ar_width` | js/sidebar/panel/panel-template.js:253 |
| `basePrompt_cfg_scale` | js/ai/ui/ai-ui-util.js:22 |
| `basePrompt_model` | js/ai/sdwebui/sdwebui-multi-call-api.js:45 |
| `blendApplyButton` | js/layer/blend/blend.js:220 |
| `blendFillColor` | js/layer/blend/blend.js:652 |
| `blendFloatingWindow` | js/layer/blend/blend.js:121 |
| `blendImageListBody` | js/layer/blend/blend.js:436 |
| `blendModes` | js/layer/blend/blend.js:235 |
| `blendSelectedInfo` | js/layer/blend/blend.js:215 |
| `btm-dialog-cancel` | js/ui/bottom-bar.js:435 |
| `btm-dialog-submit` | js/ui/bottom-bar.js:436 |
| `checSD_WebUI_Announce` | js/ai/ai-management.js:128 |
| `closeButton` | js/ai/comfyui/v2/comfyui-workflow-interact.js:146 |
| `com-fill` | js/ui/canvas-object-menu.js:473 |
| `com-lineWidth` | js/ui/canvas-object-menu.js:437 |
| `com-opacity` | js/ui/canvas-object-menu.js:475 |
| `com-strokeColor` | js/ui/canvas-object-menu.js:474 |
| `comfyGuideDontShow` | js/ui/tutorial.js:362 |
| `comfyUIFwGenerateButton` | js/ai/comfyui/v2/comfyui-workflow-interact.js:67 |
| `comfyUIPageUrl` | js/ai/comfyui/comfyui-management.js:17, js/ai/provider/local-comfyui-provider.js:17 |
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
| `fabricjs-delete-btn` | js/ui/canvas-object-menu.js:394 |
| `fabricjs-language-selector` | js/ui/canvas-object-menu.js:2 |
| `falaiApiKey` | js/ai/provider/falai-provider.js:19 |
| `featureTable tbody` | html/functionList.html:267 |
| `firstTextEffectColorPicker` | js/sidebar/text/text-effect.js:139 |
| `fm-fontFileUpload` | js/ui/font/user-font-manager.js:107 |
| `fm-fontManagerModal` | js/core/font/font-manager-core.js:500 |
| `fm-localFontInput` | js/core/font/font-manager-core.js:378 |
| `fm-modalOverlay` | js/core/font/font-manager-core.js:503 |
| `fm-registeredFontList` | js/ui/font/user-font-manager.js:65 |
| `fm-styles` | js/core/font/font-dropdown.js:51 |
| `fm-userFontGroup` | js/core/font/font-manager-core.js:362 |
| `fm-webFontUrlInput` | js/core/font/font-manager-core.js:427 |
| `fontSelectorMenu` | js/ui/canvas-object-menu.js:368 |
| `generatedImage` | js/ai/comfyui/v2/comfyui-workflow-interact.js:51 |
| `generatedImagePlaceholder` | js/ai/comfyui/v2/comfyui-workflow-interact.js:98 |
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
| `gpt-mask-section` | scripts/gpt-editor-browser-test.cjs:398 |
| `gpt-width` | scripts/gpt-editor-browser-test.cjs:391 |
| `gpt-x` | scripts/gpt-editor-browser-test.cjs:389 |
| `gpt-y` | scripts/gpt-editor-browser-test.cjs:390 |
| `gradientDirection` | js/layer/blend/blend.js:620 |
| `gradientEnd` | js/layer/blend/blend.js:645 |
| `gradientStart` | js/layer/blend/blend.js:643 |
| `h div` | index.html:119 |
| `head-id .left_area` | js/ui/visual-studio.js:44 |
| `id` | scripts/gen-project-index.cjs:188 |
| `img2imgScale` | js/ui/ai/auto-prompt-ui.js:138 |
| `img2img_denoise` | js/ui/ai/auto-prompt-ui.js:141 |
| `inpaint-brush-btn` | js/ai/inpainting/inpaint-editor.js:33 |
| `inpaint-brush-size` | js/ai/inpainting/inpaint-editor.js:38 |
| `inpaint-brush-size-label` | js/ai/inpainting/inpaint-editor.js:47 |
| `inpaint-cancel-btn` | js/ai/inpainting/inpaint-editor.js:32 |
| `inpaint-canvas-area` | js/ai/inpainting/inpaint-editor.js:53 |
| `inpaint-clear-btn` | js/ai/inpainting/inpaint-editor.js:35 |
| `inpaint-denoise` | js/ai/inpainting/inpaint-editor.js:102 |
| `inpaint-denoise-label` | js/ai/inpainting/inpaint-editor.js:162 |
| `inpaint-eraser-btn` | js/ai/inpainting/inpaint-editor.js:34 |
| `inpaint-fillall-btn` | js/ai/inpainting/inpaint-editor.js:36 |
| `inpaint-generate-btn` | js/ai/inpainting/inpaint-editor.js:37 |
| `inpaint-image-canvas` | js/ai/inpainting/inpaint-editor.js:54 |
| `inpaint-mask-canvas` | js/ai/inpainting/inpaint-editor.js:55 |
| `inpaint-modal` | js/ai/inpainting/inpaint-editor.js:26 |
| `inpaint-negative` | js/ai/inpainting/inpaint-editor.js:101 |
| `inpaint-prompt` | js/ai/inpainting/inpaint-editor.js:100 |
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
| `languageFlag` | js/ui/third/i18next.js:4626 |
| `line-style` | js/sidebar/pen/pen-tools.js:123 |
| `manga-tone-buttons button, #manga-effect-buttons button, #pen-tool-buttons button, #image-text-tool-buttons button, .visual-shape-grid button, .visual-text-grid button` | js/ui/visual-studio.js:110 |
| `modelSettingsOverlay` | js/ai/ui/model-settings-window.js:15 |
| `msLocalContainer` | js/ai/comfyui/v2/comfyui-util-v2.js:2, js/ai/ui/model-settings-window.js:47 |
| `msRunpodContainer` | js/ai/ui/model-settings-window.js:73 |
| `msSDWebuiContainer` | js/ai/ui/model-settings-window.js:135 |
| `nai-gpt-editor` | scripts/gpt-editor-browser-test.cjs:381 |
| `nai-subtitle-dialog [role=status]` | scripts/subtitle-editor-browser-test.cjs:38 |
| `naiBootGuard` | js/assets/boot-guard.js:9 |
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
| `openWorkflowButton` | js/ai/comfyui/v2/comfyui-workflow-interact.js:225 |
| `pen-tool-buttons [data-brush]` | js/sidebar/pen/pen-tools.js:675 |
| `promptRun` | js/ui/ai/auto-prompt-ui.js:119 |
| `runpodComfyUIUrl` | js/ai/provider/runpod-comfyui-provider.js:23 |
| `sdWebUIPageUrl` | js/ai/provider/local-sdwebui-provider.js:19, js/ai/sdwebui/sdwebui-settings.js:3 |
| `secondTextEffectColorPicker` | js/sidebar/text/text-effect.js:140 |
| `sidebar .icon-wrapper i.active` | js/simulator/simulator-studio.js:820 |
| `sidebar .icon-wrapper[data-action="openSimulatorStudio"] i` | js/simulator/simulator-studio.js:821 |
| `sidebar .icon-wrapper[data-action='selectCrop']` | js/sidebar/pen/pen-tools.js:699 |
| `sidebar .icon-wrapper[data-action='selectEraser']` | js/sidebar/pen/pen-tools.js:685 |
| `sidebar .icon-wrapper[data-action='selectMarquee']` | js/sidebar/pen/pen-tools.js:692 |
| `sidebar .icon-wrapper[data-action='selectMove']` | js/sidebar/pen/pen-tools.js:678 |
| `sidebar .icon-wrapper[data-ps-tool]` | js/ui/visual-ps-tools.js:113 |
| `sidebar .icon-wrapper[data-target="tool-area"]` | js/sidebar/pen/pen-tools.js:669 |
| `sidebar .icon-wrapper[data-target]` | js/sidebar/sidebar.js:66, js/ui/visual-studio.js:418 |
| `sourceImages` | js/layer/blend/blend.js:333 |
| `sp-manga-toastMessageContainer` | js/ui/toast.js:49 |
| `speed-line-style` | js/sidebar/tone/speedline.js:81 |
| `t2_shadow_dualShadow` | js/sidebar/text/custom/optimized-shadow-text.js:121 |
| `tabContentContainer` | js/ai/comfyui/v2/comfyui-workflow-editor.js:201 |
| `tabList` | js/ai/comfyui/v2/comfyui-workflow-editor.js:179 |
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
| `workflowFile` | js/ai/comfyui/v2/comfyui-workflow-editor.js:167 |

## 参照しているファイル → id

- html/Shortcut/shortcut.html : `redo`, `undo`
- html/functionList.html : `btn-en`, `btn-ja`, `featureTable tbody`, `page-title`, `table-header`
- index.html : `a`, `btm-drawer`, `desu-nav`, `h div`, `head-id`, `i`, `j`, `k`
- js/ai/ai-management.js : `ExternalService_Heartbeat_Container`, `apiHeartbeatCheckbox`, `checSD_WebUI_Announce`, `novelaiConcurrency`
- js/ai/ai-settings.js : `ScenarioPromptSelecter`, `apiHeartbeatCheckbox`, `naiBatchAcceptanceButton`, `naiBatchAcceptanceConfirmButton`, `naiBatchAcceptanceGate`, `naiBatchAutoGenerateAfterPrompts`, `naiBatchSaveTagDnaButton`, `naiCompositionAgent`, `naiDirectorAdjustCanvas`, `naiDirectorApiKey`, `naiDirectorApiKeyToggle`, `naiDirectorApiUrl`, `naiDirectorHonorCharacterCards`, `naiDirectorMessageMode`, `naiDirectorModel`, `naiDirectorModelList`, `naiDirectorRefreshModels`, `naiDirectorResetSystemPrompt`, `naiDirectorStoreDrafts`, `naiDirectorSystemPrompt`, `naiDirectorTestApi`, `naiDirectorTimeout`, `naiDirectorUseApi`, `naiDirectorUseProxy`, `naiDirectorUseTagAnchors`, `naiGenerateComicDemo`, `naiGenerateMaterialPreviews`, `naiHealthCheck`, `naiMaterialPreviewStatus`, `naiToolJobStatus`, `novelaiApiKey`, `novelaiApiKeyToggle`, `novelaiApiUrl`, `novelaiApiUrlDefaultUrl`, `novelaiCfgRescale`, `novelaiConcurrency`, `novelaiDashboard`, `novelaiI2INoise`, `novelaiI2IStrength`, `novelaiModel`, `novelaiQualityToggle`, `novelaiSM`, `novelaiSMDyn`, `novelaiSampler`, `novelaiScale`, `novelaiSteps`, `novelaiUcPreset`, `novelaiUseLocalProxy`
- js/ai/angle/angle-editor.js : `angle-camera-prompt-display`, `angle-camera-reset-btn`, `angle-camera-widget-container`, `angle-cancel-btn`, `angle-generate-btn`, `angle-modal`, `angle-original-img`, `angle-prompt`
- js/ai/comfyui/comfyui-management.js : `ExternalService_Heartbeat_Label_fw`, `comfyUIPageUrl`, `comfyui`
- js/ai/comfyui/v2/comfyui-default-object-info.js : `add`, `k`
- js/ai/comfyui/v2/comfyui-util-v2.js : `msLocalContainer`
- js/ai/comfyui/v2/comfyui-workflow-editor-tab.js : `a`
- js/ai/comfyui/v2/comfyui-workflow-editor.js : `tabContentContainer`, `tabList`, `workflowFile`
- js/ai/comfyui/v2/comfyui-workflow-interact.js : `apiSettingsUrlHelpe`, `closeButton`, `comfyUIFwGenerateButton`, `generatedImage`, `generatedImagePlaceholder`, `openWorkflowButton`
- js/ai/director/scene-plan-controller.js : `naiScenePlanApply`, `naiScenePlanGenerate`, `naiScenePlanInput`, `naiScenePlanJson`, `naiScenePlanPreview`, `naiScenePlanRetry`, `naiScenePlanRollback`, `naiScenePlanStatus`
- js/ai/gpt/edit-controller.js : `edit`
- js/ai/inpainting/inpaint-editor.js : `comfyui`, `inpaint-brush-btn`, `inpaint-brush-size`, `inpaint-brush-size-label`, `inpaint-cancel-btn`, `inpaint-canvas-area`, `inpaint-clear-btn`, `inpaint-denoise`, `inpaint-denoise-label`, `inpaint-eraser-btn`, `inpaint-fillall-btn`, `inpaint-generate-btn`, `inpaint-image-canvas`, `inpaint-mask-canvas`, `inpaint-modal`, `inpaint-negative`, `inpaint-prompt`
- js/ai/manga-importer.js : `bg-color`, `mangaImportAutoTag`, `mangaImportCharacterPlaceholders`, `mangaImportCharacterReferences`, `mangaImportDirectorButton`, `mangaImportGenerateButton`, `mangaImportInput`, `mangaImportKeepReference`, `mangaImportMinPanelArea`, `mangaImportPanelThreshold`, `mangaImportPickButton`, `mangaImportPreflightButton`, `mangaImportRetagButton`, `mangaImportSelectNextPanelButton`, `mangaImportSelectPlaceholderButton`, `mangaImportStatus`, `mangaImportTaggerThreshold`, `mangaImportTaggerUrl`, `mangaImportUseTaggerProxy`, `naiBatchDirectorEnabled`, `naiBatchDirectorPrompt`
- js/ai/panel-pipeline-review.js : `a`, `naiExportAllPagesPngButton`, `naiGoNextReviewPanelButton`, `naiMarkPanelsForManualReview`
- js/ai/prompt/auto/auto-generation.js : `ScenarioPromptSelecter`, `onePanelGenerateNumber`
- js/ai/prompt/auto/auto-prompt-util.js : `ScenarioPromptSelecter`, `naiBatchAcceptanceGate`, `naiBatchAutoGenerateAfterPrompts`, `naiBatchDirectorEnabled`, `naiBatchDirectorPrompt`
- js/ai/prompt/auto/character-card-manager.js : `naiCharacterAddCard`, `naiCharacterAddMaterial`, `naiCharacterCardList`, `naiCharacterMaterialCategory`, `naiCharacterMaterialTag`, `naiCharacterTargetSelect`
- js/ai/prompt/auto/story-prompt-map.js : `ScenarioPromptSelecter`
- js/ai/prompt/base-event-listener.js : `basePrompt_height`, `basePrompt_negative`, `basePrompt_prompt`, `basePrompt_seed`, `basePrompt_width`
- js/ai/prompt/novelai-composition-director.js : `naiCompositionAgent`, `naiDirectorAdjustCanvas`, `naiDirectorApiKey`, `naiDirectorApiUrl`, `naiDirectorHonorCharacterCards`, `naiDirectorMessageMode`, `naiDirectorModel`, `naiDirectorSystemPrompt`, `naiDirectorTimeout`, `naiDirectorUseApi`, `naiDirectorUseProxy`, `naiDirectorUseTagAnchors`
- js/ai/provider/falai-provider.js : `ExternalService_Heartbeat_Label_fw`, `falaiApiKey`
- js/ai/provider/gpt-image-provider.js : `edit`
- js/ai/provider/local-comfyui-provider.js : `comfyUIPageUrl`
- js/ai/provider/local-sdwebui-provider.js : `sdWebUIPageUrl`
- js/ai/provider/novelai-provider.js : `ExternalService_Heartbeat_Label_fw`, `novelaiApiKey`, `novelaiApiUrl`, `novelaiCfgRescale`, `novelaiI2INoise`, `novelaiI2IStrength`, `novelaiModel`, `novelaiQualityToggle`, `novelaiSM`, `novelaiSMDyn`, `novelaiSampler`, `novelaiScale`, `novelaiSteps`, `novelaiUcPreset`, `novelaiUseLocalProxy`
- js/ai/provider/runpod-comfyui-provider.js : `runpodComfyUIUrl`
- js/ai/role/role-assignment-ui.js : `roleMatrixBody`
- js/ai/sdwebui/sdwebui-multi-call-api.js : `basePrompt_model`
- js/ai/sdwebui/sdwebui-settings.js : `AdetailerCheck`, `AdetilerModelsNegative`, `AdetilerModelsPrompt`, `sdWebUIPageUrl`
- js/ai/ui/ai-ui-util.js : `apiSettingsUrlHelpe`, `basePrompt_cfg_scale`, `negativeAreaId`, `prompt-A`, `prompt-E`, `prompt-F`
- js/ai/ui/model-settings-window.js : `modelSettingsOverlay`, `msLocalContainer`, `msRunpodContainer`, `msSDWebuiContainer`
- js/ai/ui/unified-settings-window.js : `unifiedSettingsOverlay`
- js/assets/asset-library-controller.js : `assetLibraryExportButton`, `assetLibraryGroups`, `assetLibraryImportButton`, `assetLibraryInput`, `assetLibraryList`, `assetLibraryNext`, `assetLibraryPackInput`, `assetLibraryPageLabel`, `assetLibraryPager`, `assetLibraryPrev`, `assetLibraryRestoreButton`, `assetLibrarySearch`, `assetLibraryStatus`, `assetLibraryTags`, `mangaImageCanvas`, `simulatorWorkspaceTabs`
- js/assets/asset-pack.js : `a`
- js/assets/boot-guard.js : `naiBootGuard`
- js/assets/image2-controller.js : `image2-section`, `image2Height`, `image2JobList`, `image2Negative`, `image2Prompt`, `image2Provider`, `image2RunButton`, `image2Status`, `image2Tags`, `image2Transparent`, `image2Width`
- js/canvas-manager.js : `bg-color`, `bgColorButton`, `bgColorSwatch`, `bgColorValue`, `canvas-area`, `canvas-container`, `exportPxCappedNote`, `exportPxLandscapeHeight`, `exportPxLandscapeWidth`, `exportPxPortraitHeight`, `exportPxPortraitWidth`, `imageInput`, `naiObjectBiggerBtn`, `naiObjectFitBtn`, `naiObjectSmallerBtn`, `naiPageSizeBadge`, `naiZoomFitBtn`, `naiZoomInBtn`, `naiZoomLabel`, `naiZoomLabelHeader`, `naiZoomOutBtn`, `outputBitDepth`, `outputBitDepthHint`, `outputDpi`, `outputImageEstimate`, `outputImageFormat`, `outputImageQuality`, `resizable-container`
- js/core/auto-save.js : `autoSaveCheckbox`, `autoSaveInterval`, `btm-image-container`
- js/core/compression/lz4.js : `a`
- js/core/font/font-dropdown.js : `fm-styles`, `fontSelector`
- js/core/font/font-manager-core.js : `fm-fontManagerModal`, `fm-localFontInput`, `fm-modalOverlay`, `fm-userFontGroup`, `fm-webFontUrlInput`, `testCanvas`
- js/core/logger.js : `comfyui`
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
- js/local-tools/background-removal-client.js : `a`, `backgroundRemovalAction`, `backgroundRemovalAlphaMatting`, `backgroundRemovalBgThreshold`, `backgroundRemovalCrop`, `backgroundRemovalEngine`, `backgroundRemovalErode`, `backgroundRemovalFeather`, `backgroundRemovalFgThreshold`, `backgroundRemovalInvert`, `backgroundRemovalKeyColor`, `backgroundRemovalKeyTolerance`, `backgroundRemovalModel`, `backgroundRemovalOnlyMask`, `backgroundRemovalPostMask`, `cutoutHealthButton`, `cutoutOriginalPreview`, `cutoutPresetDeleteButton`, `cutoutPresetExportButton`, `cutoutPresetImportInput`, `cutoutPresetLoadButton`, `cutoutPresetSaveButton`, `cutoutPresetSelect`, `cutoutPreview`, `cutoutResultPreview`, `cutoutRunButton`, `cutoutServiceUrl`, `cutoutStatus`
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
- js/sidebar/panel/panel-template.js : `CustomPanelButton`, `applyFlexGenSizeBtn`, `ar_height`, `ar_width`, `customPanelSizeX`, `customPanelSizeY`, `flexGenH`, `flexGenW`, `page-landscape`, `page-portrait`, `resetFlexGenSizeBtn`
- js/sidebar/pen/pen-tools.js : `a`, `brushPresetGrid`, `customBrushAngle`, `customBrushApplyButton`, `customBrushColor`, `customBrushDeleteButton`, `customBrushEngine`, `customBrushExportButton`, `customBrushFollowPath`, `customBrushHardness`, `customBrushImportInput`, `customBrushName`, `customBrushOpacity`, `customBrushPresetSelect`, `customBrushSaveButton`, `customBrushScatter`, `customBrushSize`, `customBrushSmoothing`, `customBrushSpacing`, `customBrushTaperEnd`, `customBrushTaperStart`, `customBrushTipInput`, `i`, `line-style`, `pen-tool-buttons [data-brush]`, `sidebar .icon-wrapper[data-action='selectCrop']`, `sidebar .icon-wrapper[data-action='selectEraser']`, `sidebar .icon-wrapper[data-action='selectMarquee']`, `sidebar .icon-wrapper[data-action='selectMove']`, `sidebar .icon-wrapper[data-target="tool-area"]`, `tool-area`, `tool-settings`
- js/sidebar/sidebar-ui.js : `settingsAutoSaveCheckbox`
- js/sidebar/sidebar.js : `asset-library-area`, `auto-generate-area`, `control-area`, `cutout-area`, `i`, `manga-effect-area`, `manga-tone-area`, `panel-manager-area`, `prompt-manager-area`, `shape-area`, `sidebar .icon-wrapper[data-target]`, `sidebarMore`, `sidebarMoreToggle`, `simulator-chat-area`, `speech-bubble-area`, `speech-bubble-area1`, `speech-bubble-area2`, `speechBubbleTabs`, `svg-container-template`, `svg-preview-area-landscape`, `svg-preview-area-vertical`, `template-orientation-toggle`, `text-area`, `text-area2`, `tool-area`
- js/sidebar/speechBubble/speech-bubble-effect.js : `bubbleFillColor`, `bubbleStrokeColor`, `bubbleStrokewidht`, `naiTemplatePlaceMode`, `speech-bubble-area`, `speech-bubble-area1`, `speech-bubble-preview`, `speechBubbleOpacity`, `svg-container-template`, `svg-preview-area-landscape`, `svg-preview-area-vertical`, `template-orientation-toggle`
- js/sidebar/speechBubble/speech-bubble-freehand.js : `fontSelector`, `fontSizeSlider`, `fontStrokeWidthSlider`, `sbDeleteButton`, `sbFillColor`, `sbFillOpacity`, `sbFreehandButton`, `sbMoveButton`, `sbPointButton`, `sbPointSpace`, `sbSelectButton`, `sbSmoothing`, `sbSornerRadius`, `sbStrokeColor`, `sbStrokeWidth`, `sb_aButton`, `sb_bButton`, `sb_cButton`, `sb_dButton`, `sb_eButton`, `sb_fButton`, `sb_gButton`, `textColorPicker`, `textOutlineColorPicker`
- js/sidebar/speechBubble/speech-bubble-text.js : `fontSelector`, `fontSizeSlider`, `fontStrokeWidthSlider`, `textColorPicker`, `textOutlineColorPicker`
- js/sidebar/text/custom/optimized-shadow-text.js : `t2_shadow_dualShadow`
- js/sidebar/text/custom/optimized-water-text.js : `blend`
- js/sidebar/text/sfx-palette.js : `sfxPaletteAdd`, `sfxPaletteInput`, `sfxPaletteList`, `sfxPaletteStyle`
- js/sidebar/text/text-2-manager.js : `T2-Orientation-horizontal`, `T2-Orientation-vertical`, `T2-align-center`, `T2-align-left`, `T2-align-right`, `text-area2-settings`
- js/sidebar/text/text-effect.js : `bold-toggle-btn`, `firstTextEffectColorPicker`, `fontSelector`, `fontSizeSlider`, `fontStrokeWidthSlider`, `secondTextEffectColorPicker`, `text-preview-area`, `textBgColorPicker`, `textColorPicker`, `textOutlineColorPicker`
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
- js/ui/third/i18next.js : `canvasEmptyHintDismiss`, `dashboardAvgSession`, `dashboardCalendar`, `dashboardClearTags`, `dashboardCurrentSession`, `dashboardCurrentStreak`, `dashboardExportCSV`, `dashboardExportJSON`, `dashboardLongestStreak`, `dashboardTopTags`, `dashboardTotalSessions`, `dashboardWordcloud`, `languageFlag`, `settingsReset`, `usTabAI`
- js/ui/third/tippy.js : `clearMode`, `intro_auto-generate-area`, `intro_control-area`, `intro_manga-effect-area`, `intro_manga-tone-area`, `intro_page-manager-area`, `intro_prompt-manager-area`, `intro_shape-area`, `intro_speech-bubble-area1`, `intro_speech-bubble-area2`, `intro_svg-container-template`, `intro_text-area`, `intro_text-area2`, `intro_tool-area`, `redo`, `undo`, `zoomFit`, `zoomIn`, `zoomOut`
- js/ui/toast.js : `sp-manga-toastContainer`, `sp-manga-toastMessageContainer`
- js/ui/tutorial.js : `comfyGuideDontShow`, `sidebarMore`, `tutorialCloseHint`, `tutorialDontShow`, `tutorialExitBtn`, `tutorialGotIt`, `tutorialNextBtn`, `tutorialSkipBtn`, `tutorialStartBtn`
- js/ui/util/event-delegator.js : `tool-area`
- js/ui/util/mode-change.js : `canvas-help-text`, `mode-toggle`, `navbar-logo`
- js/ui/util/mode-manager.js : `clearMode`, `edit`, `knifeModeButton`
- js/ui/util/tagify-util.js : `i`
- js/ui/visual-ps-tools.js : `naiHistoryClose`, `naiHistoryList`, `naiHistoryPanel`, `naiPropFill`, `naiPropStroke`, `shape-area`, `sidebar .icon-wrapper[data-ps-tool]`
- js/ui/visual-studio.js : `addHeart`, `addHexagon`, `addPentagon`, `addSquare`, `addStar`, `addTallRect`, `addTriangle`, `addWideRect`, `asset-library-area`, `brushPresetGrid`, `cutout-area`, `head-id .left_area`, `manga-effect-area`, `manga-tone-area`, `manga-tone-buttons button, #manga-effect-buttons button, #pen-tool-buttons button, #image-text-tool-buttons button, .visual-shape-grid button, .visual-text-grid button`, `naiBrushCursor`, `naiOptBrushSize`, `naiPropFill`, `naiPropOpacity`, `naiPropShadow`, `naiPropStrip`, `naiPropStroke`, `naiPropStrokeW`, `naiToolOptionsBar`, `naiToolOptionsControls`, `naiToolOptionsMain`, `panel-manager-area`, `ps-tools-area`, `sfxPaletteList`, `shape-area`, `sidebar .icon-wrapper[data-target]`, `speech-bubble-area`, `speech-bubble-preview`, `svg-container-template`, `svg-preview-area-landscape`, `svg-preview-area-vertical`, `text-area`, `text-area2`, `tool-area`, `tool-settings input[type="range"]`, `verticalText`
- scripts/gen-project-index.cjs : `id`
- scripts/gpt-editor-browser-test.cjs : `gpt-mask-section`, `gpt-width`, `gpt-x`, `gpt-y`, `nai-gpt-editor`
- scripts/gpt-provider-test.cjs : `edit`
- scripts/image-export-smoke-test.cjs : `outputBitDepth`, `outputBitDepthHint`, `outputDpi`
- scripts/layout-smoke-test.cjs : `canvasEmptyHint`
- scripts/manga-import-smoke-test.cjs : `mangaImportCharacterReferences`, `mangaImportDirectorButton`, `mangaImportGenerateButton`, `mangaImportPickButton`, `mangaImportPreflightButton`, `mangaImportRetagButton`, `mangaImportSelectNextPanelButton`, `mangaImportSelectPlaceholderButton`
- scripts/simulator-timeline-smoke-test.cjs : `a`
- scripts/subtitle-editor-browser-test.cjs : `nai-subtitle-dialog [role=status]`
- scripts/subtitle-editor-smoke-test.cjs : `a`
