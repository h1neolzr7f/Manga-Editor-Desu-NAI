# 機能マップ

機能から入口を引くための手作業キュレーション索引。各行は実コードで裏取り済み。
横断索引（シンボル / DOM id / 読み込み順 / テスト）は `llm_doc/project-index.md` から辿る。

## 読み方

- 入口ファイル: まず読むファイル。主要関数: その機能の中心になる関数。
- 関連 DOM id: `index.html` などで定義されている id。参照元は `llm_doc/index/dom-ids.md` で逆引きできる。
- テスト: `npm run <name>` で実行できる検証。

## 機能一覧

| 機能 | 入口ファイル | 主要関数 | 関連 DOM id | テスト | 関連ドキュメント |
| --- | ----------- | --------- | ------------- | ------ | ---------------- |
| **画布（キャンバス）設定と画像書き出し** |  |  |  |  |  |
| DPI と出力画素の換算 | `js/core/manga-page-size.js` | `resolveExportDpi`:71, `normalizeExportDpi`:83, `exportMaxLongEdge`:137, `planExportPage`:155, `resolveDpiForPixelEdge`:201 | `outputDpi`, `exportPxPortraitWidth`, `exportPxPortraitHeight`, `exportPxLandscapeWidth`, `exportPxLandscapeHeight`, `exportPxCappedNote`, `naiPageSizeBadge` | `npm run test:page-size`, `npm run test:image-export-integration` | `llm_doc/ui-patterns.md` |
| 画素プレビューの UI 配線 | `js/canvas-manager.js` | `exportDpiFallback`:278, `normalizeExportDpiInput`:284, `exportPlanForOrientation`:317, `updateExportPagePlanDisplay`:329, `syncExportDpiField`:349, `syncExportPagePlan`:366, `commitExportPixelEdge`:382, `notifyExportDpiRange`:429, `commitExportDpi`:441, `bindExportPagePlanEvents`:463 | `outputDpi`, `exportPxPortraitWidth`, `exportPxPortraitHeight`, `exportPxLandscapeWidth`, `exportPxLandscapeHeight`, `exportPxCappedNote` | `npm run test:image-export` | `llm_doc/ui-patterns.md` |
| 位深度（灰度 / 24bit RGB / 32bit ARGB） | `js/core/util/png-bit-depth.js`, `js/core/util/image-util.js` | `resolveExportBitDepth`:412, `getExportBitDepthForFormat`:601, `encodeExportPng`:453, `resolveExportBackground`:424, `getCropAndDownloadLinkByMultiplier`:618 | `outputBitDepth`, `outputBitDepthHint`, `outputImageFormat` | `npm run test:png-bit-depth`, `npm run test:image-export-integration` | `llm_doc/ui-patterns.md` |
| 書き出し本体とダウンロード生成 | `js/core/util/image-util.js` | `exportCanvasDataURL`:583, `resolveExportMultiplier`:475, `resolveExportMultiplierForDpi`:392, `buildDownloadLink`:632, `cropAndDownload`:702, `clipCopy`:666 | `imageDownload`, `imageCopy`, `outputImageFormat`, `outputImageQuality`, `outputImageEstimate` | `npm run test:image-export` | `llm_doc/history-and-data.md` |
| 画布背景色とサイズ概算 | `js/canvas-manager.js`, `js/core/util/image-util.js` | `bindExportBackgroundButton`:206, `syncExportBackgroundLabel`:227, `syncExportBitDepthState`:238, `renderExportSizeEstimate`:540, `estimateExportSize`:515 | `bg-color`, `bgColorButton`, `bgColorValue`, `bgColorSwatch`, `outputImageEstimate` | `npm run test:image-export` | `llm_doc/ui-patterns.md` |
| 画布リサイズ | `js/canvas-manager.js` | `resizeCanvasByNum`:92, `resizeCanvas`:105, `resizeCanvasToObject`:173, `resolvePagePixels`:45, `updatePageSizeBadge`:52 | `customPanelSizeX`, `customPanelSizeY`, `naiPageSizeBadge` | `npm run test:page-size` | `llm_doc/project-structure.md` |
| **描画ツール / ブラシ** |  |  |  |  |  |
| ペン種別の切り替え | `js/sidebar/pen/pen-tools.js` | `switchPencilType`:4, `switchPencilTypeUi`:101, `applyBrushSettings`:297, `addPenEventListener`:244 | (サイドバーのブラシ欄) | `npm run test:brushes` | `llm_doc/ui-patterns.md` |
| ブラシ実装 | `js/sidebar/pen/fabric/brushes/crayon_brush.js`, `js/sidebar/pen/fabric/brushes/ink_brush.js`, `js/sidebar/pen/fabric/brushes/marker_brush.js`, `js/sidebar/pen/fabric/brushes/spray_brush.js`, `js/sidebar/pen/fabric/brushes/drip.js`, `js/sidebar/pen/fabric/brushes/stroke.js` | 各ファイルが fabric ブラシを定義 | (サイドバーのブラシ欄) | `npm run test:brushes` | `llm_doc/ui-patterns.md` |
| ブラシのプリセットとカスタム | `js/sidebar/pen/brush-presets.js`, `js/sidebar/pen/custom-brush.js` | `STORAGE_KEY`:4, `BUILTIN`:6, `clone`:32, `makeTipCanvas`:17 | (サイドバーのブラシ欄) | `npm run test:brushes` | `llm_doc/ui-patterns.md` |
| モード管理（選択/手描き/ナイフ等） | `js/ui/util/mode-manager.js` | `ModeManager`:3, `pencilModeClear`:414 | `knifeModeButton`, `edit` | `npm run test:layout` | `llm_doc/project-structure.md` |
| グリッドとスナップ | `js/panel/grid.js` | `drawGrid`:6, `removeGrid`:100, `toggleGrid`:107, `updateGridSize`:124, `snapToGrid`:139 | `gridSizeInput` | - | `llm_doc/ui-patterns.md` |
| **パネル（コマ割り）とナイフ** |  |  |  |  |  |
| コマ生成とテンプレート | `js/sidebar/panel/panel-template.js`, `js/sidebar/panel/panel-manager.js` | `js/sidebar/panel/panel-template.js:27,41`, `js/sidebar/panel/panel-manager.js:280` (`resizeCanvasToObject` 呼び出し) | `customPanelSizeX`, `customPanelSizeY` | `npm run test:layout` | `llm_doc/ui-patterns.md` |
| レイアウトテンプレートと推薦 | `js/panel/layout-templates.js` | `applyPanelLayoutTemplate`:382, `applyPanelLayoutForCurrentPage`:383, `loadPanelLayoutPrefs`:384, `recommendPanelLayouts`:386 | `panelLayoutTemplateSelect` | `npm run test:layout` | `llm_doc/ui-patterns.md` |
| ランダム分割 | `js/panel/random-cut.js` | `rundomPanelCut`:1, `createCuts`:48 | `pageCount`, `flexGenW`, `flexGenH`, `horizontalRandomPanelCount`, `verticalRandomPanelCount` | - | `llm_doc/ui-patterns.md` |
| ナイフ（分割） | `js/sidebar/panel/knife/knife-mode.js`, `js/sidebar/panel/knife/knife-split-engine.js` | `changeKnifeMode`:18, `updateKnifeMode`:29, `changeMovement`:65, `guidedSplitPanel`:19, `blindSplitPanel`:63, `adjustShapesBySplitLineDirection`:374 | `knifeModeButton`, `knifePanelSpaceSize`, `cutChangeRate`, `tiltRandom` | - | `llm_doc/ui-patterns.md` |
| **レイヤー** |  |  |  |  |  |
| レイヤー一覧と並べ替え | `js/layer/layer-management.js` | `friendlyLayerName`:9, `makePageLayerHeader`:50, `js/layer/layer-management.js:150` (`layer-content` の描画) | `layer-panel`, `layer-content`, `layerSelectPageButton` | `npm run test` | `llm_doc/layer-structure.md` |
| レイヤーボタン | `js/layer/layer-button.js` | `js/layer/layer-button.js:55` (`cutout-area` の描画) | `cutout-area` | `npm run test` | `llm_doc/layer-structure.md` |
| 合成モード | `js/layer/blend/blend.js` | `js/layer/blend/blend.js:2` | `add` | - | `llm_doc/layer-structure.md` |
| フローティングウィンドウ | `js/layer/floating-window-management.js` | `makeDraggable`:1, `elementDrag`:18, `closeDragElement`:30, `isNotVisibleFloatingWindow`:46, `isVisibleFloatingWindow`:50 | - | - | `llm_doc/layer-structure.md` |
| **履歴 Undo/Redo** |  |  |  |  |  |
| 状態スタック | `js/layer/image-history-management.js` | `stateStack`:2, `currentStateIndex`:3, `undo`:214, `redo`:259 | `undo`, `redo`, `bg-color` | - | `llm_doc/history-and-data.md` |
| **テキスト / 吹き出し** |  |  |  |  |  |
| 縦書きテキスト | `js/sidebar/text/vertical-text.js`, `js/sidebar/text/vertical-textbox.js` | グローバル関数を定義せずイベント登録のみ（`llm_doc/ui-patterns.md` 参照） | `fontSelector`, `fontSizeSlider` | - | `llm_doc/ui-patterns.md` |
| テキスト効果（10種） | `js/sidebar/text/custom/optimized-aurora-text.js`, `js/sidebar/text/custom/optimized-cloud-text.js`, `js/sidebar/text/custom/optimized-mesh-text.js` | 同ディレクトリに全 10 種 | - | - | `llm_doc/ui-patterns.md` |
| 効果テキストとマネージャ | `js/sidebar/text/text-effect.js`, `js/sidebar/text/text-2-manager.js` | `js/sidebar/text/text-effect.js:304` (`fontSelector` の参照) | `fontSelector`, `fontSizeSlider`, `textColorPicker`, `textOutlineColorPicker`, `textBgColorPicker` | - | `llm_doc/ui-patterns.md` |
| SFX パレット | `js/sidebar/text/sfx-palette.js` | `STORAGE_KEY`:4, `STYLE_NAMES`:5, `BUILTIN`:7, `clone`:50 | - | `npm run test:page-studio` | `llm_doc/ui-patterns.md` |
| 吹き出し（テキスト/手描き） | `js/sidebar/speechBubble/speech-bubble-text.js`, `js/sidebar/speechBubble/speech-bubble-freehand.js` | `createSpeechBubbleMetrics`:143, `updateObjectPositions`:303, `mainSpeechBubbleObjectResize`:350, `speechBubbleTextChaged`:429 | `fontSelector`, `fontSizeSlider`, `bubbleStrokeColor`, `bubbleFillColor`, `speechBubbleOpacity` | - | `llm_doc/ui-patterns.md` |
| 吹き出し SVG | `js/svg/speechbubble.js` | `SpeechBubble`:1 | - | - | `llm_doc/ui-patterns.md` |
| テキスト編集のフォーカス（画面スクロール防止） | `js/core/util/fabric-text-focus.js` | `focusWithoutScroll`:15, `patchTextPrototype`:44, `install`:61 | - | `npm run test:fabric-text-focus` | `llm_doc/ui-patterns.md` |
| **AI 生成** |  |  |  |  |  |
| プロバイダ登録とロール割り当て | `js/ai/provider/provider-registry.js` | `providerRegistry`:2, `register`:7, `setRoleAssignment`:45, `getAllRoleAssignments`:56 | - | `npm run test:nai-pipeline` | `llm_doc/ai-system.md` |
| ロール定義 | `js/ai/role/ai-roles.js` | `AI_ROLES`:2, `hasRole`:33, `hasNotRole`:29 | - | - | `llm_doc/ai-system.md` |
| NovelAI プロバイダ | `js/ai/provider/novelai-provider.js` | `NovelAIProvider`:2 | `novelaiApiKey`, `novelaiApiUrl`, `novelaiModel`, `novelaiSteps`, `novelaiSampler` | `npm run test:nai-pipeline` | `llm_doc/ai-system.md` |
| ComfyUI（ローカル / RunPod / v2 ワークフロー） | `js/ai/comfyui/comfyui-management.js`, `js/ai/comfyui/v2/` | `js/ai/comfyui/comfyui-management.js`, `js/ai/comfyui/v2/comfyui-workflow-editor.js`, `js/ai/comfyui/v2/comfyui-workflow-repository.js`, `js/ai/comfyui/v2/comfyui-util-v2.js` | - | - | `llm_doc/ai-system.md` |
| タスクキューと生成タスク管理 | `js/ai/queue/task-queue.js`, `js/ai/queue/generation-task-manager.js` | `TaskQueue`:1, `aiTaskMap`:3 | - | - | `llm_doc/ai-system.md` |
| AI 設定 UI | `js/ai/ai-settings.js`, `js/ai/ui/unified-settings-window.js` | `js/ai/ai-settings.js`, `js/ai/ui/unified-settings-window.js`, `js/ai/ui/model-settings-window.js` | `novelaiApiKey`, `apiHeartbeatCheckbox` | - | `llm_doc/ai-system.md` |
| 構図ディレクター | `js/ai/prompt/novelai-composition-director.js` | `NovelAICompositionDirector`:1207 | `naiDirectorSystemPrompt`, `naiDirectorModel` | - | `llm_doc/ai-system.md` |
| 漫画インポート | `js/ai/manga-importer.js` | `MangaImporter`:2518 | `mangaImportTaggerUrl`, `mangaImportThreshold` ほか | `npm run test:manga-import` | `llm_doc/ai-system.md` |
| インペイント / 角度 | `js/ai/inpainting/inpaint-editor.js`, `js/ai/angle/angle-editor.js` | `js/ai/inpainting/inpaint-editor.js`, `js/ai/inpainting/inpaint-mask.js`, `js/ai/angle/angle-editor.js`, `js/ai/angle/camera-widget.js` | - | - | `llm_doc/ai-system.md` |
| **素材ライブラリ** |  |  |  |  |  |
| アセットの保管と読み込み | `js/assets/asset-store.js`, `js/assets/asset-blob-store.js` | `NaiComicAssetStore`:412, `NaiComicAssetStoreDefault`:413, `js/assets/asset-blob-store.js:69` | `cutout-area` | `npm run test:assets` | `llm_doc/project-structure.md` |
| ライブラリ UI | `js/assets/asset-library-controller.js` | `render`:83, `addAsset`:73, `insertSiteTemplate` | `cutout-area` | `npm run test:assets` | `llm_doc/project-structure.md` |
| アセットのスキャンとパック | `js/assets/asset-scanner.js`, `js/assets/asset-pack.js`, `js/assets/asset-manifest.js` | `NaiComicAssetScanner`:87, `NaiComicAssetPack`:22, `NaiComicAssetManifest`:71 | - | `npm run test:assets` | `llm_doc/project-structure.md` |
| 同梱パック（starter / site-ui / free） | `js/assets/original-starter-pack.js`, `js/assets/site-ui-pack.js`, `js/assets/github-free-pack.js` | `NaiComicOriginalStarterPack`:97, `NaiComicSiteUiPack`:76, `NaiComicFreePack`:75 | - | `npm run test:assets` | `llm_doc/project-structure.md` |
| **シミュレータ群** |  |  |  |  |  |
| シミュレータ起動と画面 | `js/simulator/simulator-studio.js` | `simulator-studio.js:84-501` | `simulatorStudioOverlay`, `simStudioTitle` | `npm run test:simulator` | `llm_doc/nai-comic-studio-full.md` |
| 追加レンダラ（フォーラム等） | `js/simulator/extra-renderer-factory.js`, `js/simulator/renderers/` | `NaiComicExtraRendererFactory`:441 | - | `npm run test:simulator-extra` | `llm_doc/nai-comic-studio-full.md` |
| チャットシーン | `js/simulator/chat-scene.js`, `js/simulator/chat-renderer.js`, `js/simulator/chat-controller.js` | `NaiComicChatRenderer`:368 | `simulatorChatMessages`, `simulatorChatParticipants`, `simulatorChatTheme` | `npm run test:simulator` | `llm_doc/nai-comic-studio-full.md` |
| タイムラインと再生 | `js/simulator/timeline.js`, `js/simulator/playback-controller.js` | `js/simulator/playback-controller.js:97`, `js/simulator/timeline.js` | `simulatorPlaybackInterval` | `npm run test:timeline` | `llm_doc/nai-comic-studio-full.md` |
| ストーリーエンジン | `js/simulator/story-engine.js`, `js/simulator/story-adapters.js`, `js/simulator/story-to-manga.js` | `js/simulator/story-engine.js`, `js/simulator/story-adapters.js`, `js/simulator/story-to-manga.js` | - | `npm run test:story-engine` | `llm_doc/nai-comic-studio-full.md` |
| ページ編集と長尺書き出し | `js/simulator/page-edit-controller.js`, `js/simulator/longshot-exporter.js` | `js/simulator/page-edit-controller.js`, `js/simulator/longshot-exporter.js` | - | `npm run test:timeline` | `llm_doc/nai-comic-studio-full.md` |
| テンプレート登録 | `js/simulator/template-registry.js` | `NaiComicTemplateRegistry` | - | `npm run test:simulator` | `llm_doc/nai-comic-studio-full.md` |
| **Image2 / ScenePlan** |  |  |  |  |  |
| Image2 生成 | `js/assets/image2-client.js`, `js/assets/image2-controller.js`, `js/assets/image2-job-store.js` | `NaiImage2Client`:38, `NaiImage2ProviderRegistry`:37, `NaiImage2Controller`:16 | `image2Provider`, `image2Prompt`, `image2Width`, `image2Height`, `image2Transparent`, `image2AssetName`, `image2Status`, `image2JobList` | `npm run test:image2` | `llm_doc/ai-system.md` |
| ScenePlan スキーマ | `js/ai/director/scene-plan-schema.js` | `NaiScenePlanSchema`:18, `defaultPlan`:5, `normalize`:6, `parse`:11, `validate`:12 | - | `npm run test:scene-plan` | `llm_doc/ai-system.md` |
| ScenePlan 適用とロールバック | `js/ai/director/scene-plan-service.js`, `js/ai/director/scene-plan-controller.js` | `NaiScenePlanService`:69, `NaiScenePlanController`:64 | - | `npm run test:scene-plan` | `llm_doc/ai-system.md` |
| **ローカルツール（背景除去 sidecar）** |  |  |  |  |  |
| 背景除去クライアント | `js/local-tools/background-removal-client.js` | `NaiBackgroundRemovalClient`:514, `collectOptions`:52, `applyOptions`:74 | - | `npm run test:cutout` | `llm_doc/project-structure.md` |
| 切り抜きプリセット | `js/local-tools/cutout-presets.js` | `NaiCutoutPresets`:96 | - | `npm run test:cutout` | `llm_doc/project-structure.md` |
| サイドカー接続 | `js/local-tools/local-tools-client.js` | `NaiLocalToolsClient`:96, `NaiLocalToolsDefaultUrl`:97 | - | `npm run test:simulator` | `llm_doc/project-structure.md` |
| サイドカー本体（Python） | `local_tools/server.py` | - | - | - | `llm_doc/project-structure.md` |
| **設定の永続化** |  |  |  |  |  |
| 設定スキーマと保存 | `js/project-management.js` | `SETTINGS_SCHEMA` (`canvasDpi`:198, `outputBitDepth`:200), `sanitizeSettingsValueForStorage`:538, `saveSettingsLocalStrage`:551, `loadSettingsLocalStrage`:404, `initSettingsAutoSave`:653 | `settingsSave`, `settingsAutoSaveCheckbox`, `outputDpi`, `outputBitDepth` | - | `llm_doc/history-and-data.md` |
| プロジェクト本体の保存と読み込み | `js/project-management.js`, `js/core/compression/project-compression.js` | `btmSaveProjectFile`, `multiLoadLz4`, `resizeCanvasByNum` 呼び出し: `js/core/compression/project-compression.js:113,358` | `projectSave`, `projectLoad` | - | `llm_doc/history-and-data.md` |
| 自動保存 | `js/core/auto-save.js` | `AutoSaveManager`:2 | `autoSaveCheckbox`, `autoSaveInterval` | - | `llm_doc/history-and-data.md` |
| **i18n** |  |  |  |  |  |
| 翻訳リソース | `js/ui/third/i18next.js` | `resources`:12, `mergeResources`:4579, `getText`:4683 | - | `npm run check-translations` | `llm_doc/translation.md` |
| 言語別辞書 | `js/ui/third/base-translation/base-ja.js`, `js/ui/third/base-translation/base-en.js`, `js/ui/third/base-translation/base-zh.js` | 全 8 言語 | - | `npm run check-translations` | `llm_doc/translation.md` |
| **起動スクリプト** |  |  |  |  |  |
| 入口（ASCII のみ） | `一键启动.bat` | `start_manga_editor_nai.bat` を呼ぶ | - | - | `llm_doc/project-structure.md` |
| 本体 | `start_manga_editor_nai.ps1`, `start_manga_editor_nai.bat` | `start_manga_editor_nai.ps1` | - | - | `llm_doc/project-structure.md` |
| ローカルサーバ（静的配信 + AI プロキシ） | `99_server.py` | `CORSRequestHandler`:393, `do_GET`:693, `do_POST`:625, `is_blocked_static_path`:211, `_proxy_novelai`:458, `_proxy_director`:495, `ThreadedTCPServer`:791 | - | - | `llm_doc/backend-and-offline.md` |
| 背景除去 sidecar（任意・Python 3.13+ で `cgi` 削除のため要修正） | `local_tools/server.py` | `_read_form`:108, `_file_field`:121, `_options_from_form`:136 | - | - | `llm_doc/backend-and-offline.md` |
| **サービスワーカー** |  |  |  |  |  |
| 登録とキャッシュ消去 | `js/core/service/worker-register.js` | `register`:36, `clearCache`:61, `checkInstallState`:72 | `pwa-install-button` | - | `llm_doc/backend-and-offline.md` |
| キャッシュ定義（停止後も開ける原因） | `service-worker.js` | `CACHE_VERSION`:2 | - | - | `llm_doc/backend-and-offline.md` |

## 横断的な入口

- アプリ全体の初期化順は `index.html` の script 読み込み順に依存する。現在値は `llm_doc/index/load-order.md`。
- グローバル公開 API は `root.X=` / `window.X=` で行われている。一覧は `llm_doc/project-index.md` の「公開グローバル」。
- `js/core/logger.js` の SimpleLogger 経由でログを出す（`console.log` は使わない）。
