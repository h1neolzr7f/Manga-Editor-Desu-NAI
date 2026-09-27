# ファイル索引

`scripts/gen-project-index.cjs` の自動生成。手で編集しない。

- 用途はファイル先頭のコメントからのみ抽出する。取れない場合は空欄（推測で埋めない）
- 除外: node_modules, .git, user_data, __pycache__, .claude, .github, test, third, json_js, 01_build, 02_images_svg, 03_images, 99_doc, font, roadmap, docs, installer, assets, cdn-local, ロードマップ２, ロードマップ３_複数API対応

| ファイル | 行数 | 用途 |
|---------|------|------|
| 100_git_push_draft.bat | 4 |  |
| 99_generate_nai_assets.bat | 6 |  |
| 99_generate_nai_comic_demo.bat | 8 |  |
| 99_generate_theresa_doctor_mature_comic.bat | 9 |  |
| 99_git_fetch.bat | 2 |  |
| 99_server.bat | 1 |  |
| 99_server.py | 810 |  |
| 99_test_nai_pipeline.bat | 16 |  |
| claude --dangerously-skip-permissions.bat | 1 |  |
| css/comfyui-workflow-editor.css | 413 |  |
| css/common.css | 222 |  |
| css/components.css | 350 |  |
| css/controls-mini.css | 568 |  |
| css/core/main-component.css | 406 |  |
| css/css2.css | 23 | fallback |
| css/cutout-brush.css | 43 |  |
| css/flag-icon.min.css | 1 |  |
| css/form.css | 335 |  |
| css/icon.css | 55 | fallback |
| css/image-control-manager.css | 100 |  |
| css/layout-layer.css | 356 |  |
| css/layout.css | 528 |  |
| css/responsive.css | 144 | Responsive breakpoints for main layout structure |
| css/root.css | 400 |  |
| css/simulator-chat.css | 790 | simulator-chat-area .simulator-chat-panel{ |
| css/styles-css.css | 36 |  |
| css/tagify.css | 42 |  |
| css/tippy.css | 31 |  |
| css/toast.css | 131 |  |
| css/ui/angle-editor.css | 180 |  |
| css/ui/blend.css | 430 | blendFloatingWindow { |
| css/ui/bottom-bar.css | 386 |  |
| css/ui/custom-html-components.css | 103 | input, select, textarea { |
| css/ui/dashboard.css | 853 | Dashboard Modal Overlay |
| css/ui/floating-window.css | 45 |  |
| css/ui/font-manager.css | 339 | styles.css |
| css/ui/image-prompt-helper.css | 592 |  |
| css/ui/inpaint-editor.css | 211 |  |
| css/ui/intro.css | 76 |  |
| css/ui/mode-change.css | 51 |  |
| css/ui/object-menu.css | 161 |  |
| css/ui/overlay-progress.css | 14 |  |
| css/ui/role-assign-modal.css | 16 |  |
| css/ui/share.css | 153 |  |
| css/ui/shortcut-modal.css | 16 |  |
| css/ui/tutorial.css | 357 |  |
| css/ui/unified-settings.css | 82 |  |
| css/visual-studio.css | 399 |  |
| html/API_Help/comfyui_settings.html | 170 |  |
| html/API_Help/sd-api-guide.html | 364 |  |
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
| index.html | 3102 |  |
| js/ai/ai-management.js | 153 | AI機能の中央ルーター: プロバイダーレジストリ経由でディスパッチ |
| js/ai/ai-settings.js | 424 |  |
| js/ai/angle/angle-editor.js | 103 | アングル変更エディタ（モーダルオーバーレイ） |
| js/ai/angle/camera-widget.js | 494 | 3Dカメラウィジェット（アングル選択用） |
| js/ai/comfyui/comfyui-management.js | 511 |  |
| js/ai/comfyui/util/comfyui-util.js | 108 |  |
| js/ai/comfyui/util/comfyui-workflow-builder.js | 157 |  |
| js/ai/comfyui/v2/comfyui-default-object-info.js | 10475 |  |
| js/ai/comfyui/v2/comfyui-object-info-repository.js | 57 |  |
| js/ai/comfyui/v2/comfyui-util-v2.js | 502 |  |
| js/ai/comfyui/v2/comfyui-workflow-editor-tab.js | 623 | "Upscaler" |
| js/ai/comfyui/v2/comfyui-workflow-editor.js | 308 |  |
| js/ai/comfyui/v2/comfyui-workflow-interact.js | 239 |  |
| js/ai/comfyui/v2/comfyui-workflow-repository.js | 201 |  |
| js/ai/comfyui/v2/comfyui_workflow/comfyui-angle-default-workflows.js | 185 | Angle default workflow (Qwen Image Edit MultiAngle) |
| js/ai/comfyui/v2/comfyui_workflow/comfyui-default-workflows.js | 120 |  |
| js/ai/comfyui/v2/comfyui_workflow/comfyui-inpaint-default-workflows.js | 139 | Inpaint default workflow (SDXL) |
| js/ai/comfyui/v2/comfyui_workflow/comfyui-rembg-default-workflows.js | 38 |  |
| js/ai/comfyui/v2/comfyui_workflow/comfyui-t2i-default-workflows.js | 2005 |  |
| js/ai/comfyui/v2/comfyui_workflow/comfyui-upscale-default-workflows.js | 64 |  |
| js/ai/director/scene-plan-controller.js | 66 |  |
| js/ai/director/scene-plan-schema.js | 19 |  |
| js/ai/director/scene-plan-service.js | 70 |  |
| js/ai/inpainting/inpaint-editor.js | 181 | Inpaintエディタ（モーダルオーバーレイ） |
| js/ai/inpainting/inpaint-mask.js | 206 | Inpaintマスク描画管理 |
| js/ai/inpainting/inpaint-workflow.js | 68 | Inpaintワークフロー連携 |
| js/ai/manga-importer.js | 2524 |  |
| js/ai/novelai-only-mode.js | 132 |  |
| js/ai/panel-pipeline-review.js | 270 | 分镜流水线状态 + 生图后人工审阅 |
| js/ai/prompt/auto/auto-generation.js | 105 |  |
| js/ai/prompt/auto/auto-prompt-util.js | 846 | generatePageList(btmGetGuidsSize()); |
| js/ai/prompt/auto/character-card-manager.js | 544 |  |
| js/ai/prompt/auto/prompt-map.js | 193 |  |
| js/ai/prompt/auto/story-prompt-map.js | 114 |  |
| js/ai/prompt/base-event-listener.js | 9 |  |
| js/ai/prompt/novelai-composition-director.js | 1208 |  |
| js/ai/provider/ai-provider.js | 58 | AIプロバイダー基底クラス |
| js/ai/provider/falai-provider.js | 407 | Fal.aiクラウドAIプロバイダー: Queue APIで非同期実行（T2I/I2I/Upscale/RemoveBG） |
| js/ai/provider/local-comfyui-provider.js | 49 | ローカルComfyUIプロバイダー: 既存のComfyUI関数をAIProviderインターフェースでラップ |
| js/ai/provider/local-sdwebui-provider.js | 45 | ローカルSDWebUIプロバイダー: 既存のSDWebUI/Forge関数をAIProviderインターフェースでラップ |
| js/ai/provider/novelai-provider.js | 564 | NovelAI provider: direct browser call to the official image API. |
| js/ai/provider/provider-registry.js | 100 | プロバイダーレジストリ: プロバイダー登録とRole→プロバイダーのルーティング管理 |
| js/ai/provider/runpod-comfyui-provider.js | 55 | RunPod ComfyUIプロバイダー: クラウド上のComfyUIに認証付きHTTPS接続 |
| js/ai/queue/generation-task-manager.js | 322 |  |
| js/ai/queue/spinner.js | 119 | AI進捗表示（レイヤー上インジケータ、キャンセル） |
| js/ai/queue/task-queue.js | 89 |  |
| js/ai/role/ai-roles.js | 38 | NovelAI-only role definitions. |
| js/ai/role/role-assignment-ui.js | 78 | Role Assignment: Role×プロバイダーのマトリクスUI |
| js/ai/sdwebui/sdwebui-multi-call-api.js | 214 |  |
| js/ai/sdwebui/sdwebui-settings.js | 148 |  |
| js/ai/sdwebui/sdwebui-single-call-api.js | 143 |  |
| js/ai/ui/ai-ui-util.js | 48 |  |
| js/ai/ui/model-settings-window.js | 198 |  |
| js/ai/ui/unified-settings-window.js | 38 |  |
| js/assets/asset-blob-store.js | 70 |  |
| js/assets/asset-library-controller.js | 295 |  |
| js/assets/asset-manifest.js | 79 |  |
| js/assets/asset-pack.js | 23 |  |
| js/assets/asset-scanner.js | 94 |  |
| js/assets/asset-store.js | 414 |  |
| js/assets/boot-guard.js | 27 |  |
| js/assets/github-free-pack.js | 82 |  |
| js/assets/image2-client.js | 40 |  |
| js/assets/image2-controller.js | 18 |  |
| js/assets/image2-job-store.js | 15 |  |
| js/assets/original-starter-pack.js | 107 |  |
| js/assets/site-ui-pack.js | 86 |  |
| js/canvas-manager.js | 1006 |  |
| js/core/auto-save.js | 235 | 自動保存機能：IndexedDBへの定期保存と起動時の復元 |
| js/core/compression/lz4.js | 226 |  |
| js/core/compression/project-compression.js | 367 |  |
| js/core/debug.js | 404 |  |
| js/core/font/font-dropdown.js | 295 |  |
| js/core/font/font-manager-core.js | 750 |  |
| js/core/global-error-handler.js | 17 | グローバルエラーハンドラ（未キャッチのエラーとPromise rejectionを検知） |
| js/core/logger.js | 206 | ログ出力ユーティリティ（SimpleLogger） |
| js/core/manga-page-size.js | 255 |  |
| js/core/service/worker-register.js | 115 |  |
| js/core/settings.js | 170 | FabricCanvas2HtmlCanvas Scale |
| js/core/svg/google-icon-helper.js | 215 |  |
| js/core/svg/google-icon-names.js | 12 |  |
| js/core/util/anime-util.js | 11 |  |
| js/core/util/array-buffer-utils.js | 53 |  |
| js/core/util/fabric-text-focus.js | 74 | fabric の IText / Textbox は、入力用の 1px の textarea を |
| js/core/util/fabric-util.js | 941 |  |
| js/core/util/html-canvas-util.js | 91 | html-canvas-util.js - HTMLキャンバスに対する低レベル操作（境界検出、スケーリング、ピクセル処理） |
| js/core/util/image-analyzer-util.js | 121 |  |
| js/core/util/image-util.js | 845 | image-util.js - Fabric.js画像オブジェクトの処理（変換、WebP、クロップ、反転、色変換など） |
| js/core/util/js-util.js | 20 |  |
| js/core/util/load-util.js | 94 | ユーティリティ関数：エラーハンドリングとログ出力を行う |
| js/core/util/log-util.js | 48 |  |
| js/core/util/png-bit-depth.js | 583 | png-bit-depth.js - PNG のビット深度変換（グレースケール / 24bit RGB / 32bit ARGB）を行うブラウザ向けエンコーダ |
| js/core/util/share-util.js | 15 |  |
| js/dashboard/dashboard-ui.js | 1060 | ダッシュボードUIコンポーネント（モーダル表示） |
| js/dashboard/performance-storage.js | 609 | パフォーマンス統計のlocalforage永続化 |
| js/dashboard/prompt-frequency-storage.js | 194 | プロンプトタグ頻度のlocalforage永続化 |
| js/db/user-font-repository.js | 83 | font-repository.js |
| js/fabric/fabric-management.js | 694 |  |
| js/layer/blend/blend.js | 719 | ブレンドモードUI - カテゴリ分類・プレビュー・適用処理 |
| js/layer/floating-window-management.js | 80 |  |
| js/layer/image-history-management.js | 359 |  |
| js/layer/layer-button.js | 303 |  |
| js/layer/layer-management.js | 578 |  |
| js/local-tools/background-removal-client.js | 528 |  |
| js/local-tools/cutout-presets.js | 107 |  |
| js/local-tools/local-tools-client.js | 98 |  |
| js/panel/grid.js | 153 |  |
| js/panel/layout-templates.js | 388 | 常见漫画分镜模板（直线切分，可后期手调刀线） |
| js/panel/random-cut.js | 136 |  |
| js/project-management.js | 696 | Runtime image generation is NovelAI-only. Legacy provider modules may still |
| js/shortcut.js | 536 | simple check if the user is using a mac os , not the best way to detect the OS |
| js/sidebar/effect/c2bw_tone.js | 91 |  |
| js/sidebar/effect/c2c.js | 122 |  |
| js/sidebar/effect/effect-manager.js | 227 |  |
| js/sidebar/page/page-studio.js | 628 |  |
| js/sidebar/panel/knife/knife-constants.js | 55 | knife-constants.js |
| js/sidebar/panel/knife/knife-geometry.js | 260 | knife-geometry.js |
| js/sidebar/panel/knife/knife-index.js | 20 | knife-index.js |
| js/sidebar/panel/knife/knife-line-renderer.js | 174 | knife-line-renderer.js |
| js/sidebar/panel/knife/knife-mode.js | 81 | knife-mode.js |
| js/sidebar/panel/knife/knife-split-engine.js | 519 | knife-split-engine.js |
| js/sidebar/panel/knife/knife-state.js | 57 | knife-state.js |
| js/sidebar/panel/panel-manager.js | 769 | function handleSelection(e) { |
| js/sidebar/panel/panel-template.js | 612 |  |
| js/sidebar/pen/brush-presets.js | 138 |  |
| js/sidebar/pen/custom-brush.js | 274 |  |
| js/sidebar/pen/fabric/brushes/crayon_brush.js | 120 | CrayonBrush class |
| js/sidebar/pen/fabric/brushes/drip.js | 77 | Drip class |
| js/sidebar/pen/fabric/brushes/ink_brush.js | 155 | InkBrush class |
| js/sidebar/pen/fabric/brushes/marker_brush.js | 96 | MarkerBrush class |
| js/sidebar/pen/fabric/brushes/sample_brash.js | 112 |  |
| js/sidebar/pen/fabric/brushes/spray_brush.js | 116 | SprayBrush class |
| js/sidebar/pen/fabric/brushes/stroke.js | 63 | Stroke class |
| js/sidebar/pen/fabric/fabric-brush.min.js | 19 |  |
| js/sidebar/pen/fabric/util/point.extend.js | 22 |  |
| js/sidebar/pen/fabric/util/util.extend.js | 13 |  |
| js/sidebar/pen/original-brush.js | 481 |  |
| js/sidebar/pen/pen-tools.js | 855 |  |
| js/sidebar/sidebar-ui.js | 248 |  |
| js/sidebar/sidebar.js | 118 |  |
| js/sidebar/speechBubble/speech-bubble-effect.js | 295 |  |
| js/sidebar/speechBubble/speech-bubble-freehand.js | 868 |  |
| js/sidebar/speechBubble/speech-bubble-text.js | 453 |  |
| js/sidebar/text/custom/custom-text-util.js | 48 |  |
| js/sidebar/text/custom/optimized-aurora-text.js | 127 |  |
| js/sidebar/text/custom/optimized-broken-text.js | 137 |  |
| js/sidebar/text/custom/optimized-cloud-text.js | 141 |  |
| js/sidebar/text/custom/optimized-layered-text.js | 101 |  |
| js/sidebar/text/custom/optimized-mesh-text.js | 142 |  |
| js/sidebar/text/custom/optimized-scratch-text.js | 144 |  |
| js/sidebar/text/custom/optimized-shadow-text.js | 168 |  |
| js/sidebar/text/custom/optimized-thrill-text.js | 134 |  |
| js/sidebar/text/custom/optimized-water-text.js | 189 |  |
| js/sidebar/text/custom/optimized-wild-text.js | 123 |  |
| js/sidebar/text/custom/optimized-zebra-text.js | 141 |  |
| js/sidebar/text/sfx-palette.js | 148 |  |
| js/sidebar/text/text-2-manager.js | 404 |  |
| js/sidebar/text/text-effect.js | 507 |  |
| js/sidebar/text/vertical-text.js | 37 |  |
| js/sidebar/text/vertical-textbox.js | 589 |  |
| js/sidebar/tone/focusline.js | 230 |  |
| js/sidebar/tone/rain-tone.js | 106 |  |
| js/sidebar/tone/snow-tone.js | 181 |  |
| js/sidebar/tone/speedline.js | 184 |  |
| js/sidebar/tone/tone-manager.js | 374 |  |
| js/sidebar/tone/tone-noise.js | 145 |  |
| js/sidebar/tone/tone.js | 220 |  |
| js/simulator/chat-controller.js | 367 |  |
| js/simulator/chat-renderer.js | 373 |  |
| js/simulator/chat-scene.js | 128 |  |
| js/simulator/extra-renderer-factory.js | 470 |  |
| js/simulator/extra-renderers/renderer-kit.js | 249 |  |
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
| js/svg/manga-panels-image-landscape.js | 30 |  |
| js/svg/manga-panels-image-vertical.js | 43 |  |
| js/svg/speechbubble.js | 50 |  |
| js/ui/ai/auto-prompt-ui.js | 179 |  |
| js/ui/beginner-guide.js | 523 |  |
| js/ui/bottom-bar.js | 466 | {guid, { imageLink, blob }} blob is lz4 |
| js/ui/canvas-object-menu.js | 734 | Canvas object right-click context menu |
| js/ui/control/common-control-management.js | 60 |  |
| js/ui/control/glfx-control.js | 456 |  |
| js/ui/control/image-control-manager.js | 14 |  |
| js/ui/control/information-control.js | 60 |  |
| js/ui/custom-html-component.js | 100 |  |
| js/ui/font/user-font-manager.js | 144 | User Font Manager |
| js/ui/glfx-ui.js | 236 |  |
| js/ui/imagePromptHelper/hc-image-prompt-helper.js | 36 |  |
| js/ui/imagePromptHelper/image-prompt-helper.js | 730 |  |
| js/ui/imagePromptHelper/prompt-helper.js | 208 |  |
| js/ui/overlay-progress.js | 94 |  |
| js/ui/prompt-manager.js | 63 |  |
| js/ui/third/base-translation/base-de.js | 562 |  |
| js/ui/third/base-translation/base-en.js | 577 |  |
| js/ui/third/base-translation/base-es.js | 554 |  |
| js/ui/third/base-translation/base-fr.js | 571 |  |
| js/ui/third/base-translation/base-ja.js | 567 |  |
| js/ui/third/base-translation/base-ko.js | 569 |  |
| js/ui/third/base-translation/base-ru.js | 555 |  |
| js/ui/third/base-translation/base-zh.js | 603 |  |
| js/ui/third/i18next.js | 4686 | "yyyyMMddHHmmss_SSS": { |
| js/ui/third/intro.js | 23 |  |
| js/ui/third/tippy.js | 94 | Tooltip initialization using Tippy.js |
| js/ui/toast.js | 130 | createToast(NieR風): success/info, createToastError(DbD風): error/warning |
| js/ui/tutorial.js | 429 |  |
| js/ui/util/event-delegator.js | 94 | event-delegator.js - document-level event delegation utility |
| js/ui/util/focus-trap.js | 85 | focus-trap.js - モーダル用フォーカストラップユーティリティ |
| js/ui/util/mode-change.js | 173 | mode-change.js - グローバル変数、ダークモード切替、cropモードUI |
| js/ui/util/mode-manager.js | 416 | mode-manager.js - モード管理の統合（ナイフ、ペン、吹き出し、クロップ等） |
| js/ui/util/tagify-util.js | 103 |  |
| js/ui/util/ui-util.js | 67 |  |
| js/ui/visual-ps-tools.js | 630 |  |
| js/ui/visual-studio.js | 491 |  |
| local_tools/cutout.py | 167 |  |
| local_tools/model_manager.py | 207 |  |
| local_tools/processors/__init__.py | 1 |  |
| local_tools/server.py | 245 |  |
| scripts/MangaMakerUI.py | 64 |  |
| scripts/asset-library-smoke-test.cjs | 113 |  |
| scripts/check-translations.cjs | 227 | Translation key validation script - compares keys across all languages in i18next resources |
| scripts/custom-brush-smoke-test.cjs | 44 |  |
| scripts/cutout-color-key-smoke-test.py | 36 |  |
| scripts/cutout-presets-smoke-test.cjs | 34 |  |
| scripts/fabric-text-focus-smoke-test.cjs | 145 | fabric の編集用 textarea がスクロールを起こさないことを検証する。 |
| scripts/gen-project-index.cjs | 722 | プロジェクト索引の自動生成。 |
| scripts/generate-original-starter-svgs.cjs | 326 |  |
| scripts/generate-site-ui-svgs.cjs | 391 |  |
| scripts/image-export-integration-test.cjs | 324 | 位深度と画素プレビューの統合テスト。 |
| scripts/image-export-smoke-test.cjs | 403 |  |
| scripts/image2-interface-smoke-test.cjs | 19 |  |
| scripts/layout-smoke-test.cjs | 201 |  |
| scripts/make-one-click-zip.ps1 | 63 | Build a beginner zip without git history, secrets, or machine caches. |
| scripts/manga-import-smoke-test.cjs | 169 |  |
| scripts/manga-page-size-smoke-test.cjs | 47 |  |
| scripts/nai-pipeline-smoke-test.mjs | 314 | NAI-only pipeline smoke test (NovelAI + Director proxy). |
| scripts/novelai-batch-tools.mjs | 680 |  |
| scripts/page-studio-smoke-test.cjs | 106 |  |
| scripts/png-bit-depth-smoke-test.cjs | 351 |  |
| scripts/prepare-installer.ps1 | 118 |  |
| scripts/proxy-guard-smoke-test.py | 31 |  |
| scripts/remove-spaces.cjs | 84 | JSファイルからインデントと不要なスペースを削除するスクリプト |
| scripts/scene-plan-smoke-test.cjs | 9 |  |
| scripts/simulator-chat-smoke-test.cjs | 51 |  |
| scripts/simulator-extra-smoke-test.cjs | 173 |  |
| scripts/simulator-timeline-smoke-test.cjs | 11 |  |
| scripts/story-engine-smoke-test.cjs | 126 |  |
| scripts/validate-manga-split-samples.py | 546 |  |
| scripts/vendor-free-public-assets.cjs | 274 | Download clearly licensed free assets into assets/public/. |
| service-worker.js | 93 | Service Worker: Cache management for HTTP/HTTPS deployment |
| start_local_tools.bat | 4 |  |
| start_manga_editor_nai.bat | 23 |  |
| start_manga_editor_nai.ps1 | 565 |  |
| 一键启动.bat | 29 |  |
