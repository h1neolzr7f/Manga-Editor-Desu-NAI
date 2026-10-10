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
| js/ai/ai-management.js | 114 | AI機能の中央ルーター: プロバイダーレジストリ経由でディスパッチ |
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
| js/ai/manga-smart-text-core.js | 64 | Shared, dependency-free geometry and light-bubble erase rules. |
| js/ai/manga-smart-text-editor.js | 481 | Smart manga lettering workflow. |
| js/ai/manga-text-ink-mask.js | 92 | Conservative dark-ink proposal for a user-selected TEXT rectangle. |
| js/ai/nai-status-format.js | 25 | Human-readable NovelAI subscription status for the "检查 NAI" toast. |
| js/ai/novelai-only-mode.js | 132 |  |
| js/ai/panel-pipeline-review.js | 223 | 分镜流水线状态 + 生图后人工审阅 |
| js/ai/prompt/auto/auto-generation.js | 105 |  |
| js/ai/prompt/auto/auto-prompt-util.js | 817 | generatePageList(btmGetGuidsSize()); |
| js/ai/prompt/auto/character-card-manager.js | 544 |  |
| js/ai/prompt/auto/prompt-map.js | 193 |  |
| js/ai/prompt/auto/story-prompt-map.js | 106 |  |
| js/ai/prompt/base-event-listener.js | 9 |  |
| js/ai/prompt/director-safety.js | 29 | Director (third-party LLM gateway) credential safety. |
| js/ai/prompt/novelai-composition-director.js | 1214 |  |
| js/ai/provider/ai-provider.js | 52 | AIプロバイダー基底クラス |
| js/ai/provider/novelai-provider.js | 581 | NovelAI provider: direct browser call to the official image API. |
| js/ai/provider/provider-registry.js | 100 | プロバイダーレジストリ: プロバイダー登録とRole→プロバイダーのルーティング管理 |
| js/ai/queue/generation-task-manager.js | 302 |  |
| js/ai/queue/spinner.js | 97 | AI進捗表示（レイヤー上インジケータ、キャンセル） |
| js/ai/queue/task-queue.js | 89 |  |
| js/ai/role/ai-roles.js | 34 | NovelAI-only role definitions. |
| js/ai/role/role-assignment-ui.js | 78 | Role Assignment: Role×プロバイダーのマトリクスUI |
| js/ai/ui/ai-ui-util.js | 8 |  |
| js/ai/ui/unified-settings-window.js | 38 |  |
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
| js/canvas-manager.js | 1015 |  |
| js/core/auto-save.js | 253 | 自動保存機能：IndexedDBへの定期保存と起動時の復元 |
| js/core/compression/lz4.js | 226 |  |
| js/core/compression/project-compression.js | 327 |  |
| js/core/debug.js | 402 |  |
| js/core/font/font-dropdown.js | 295 |  |
| js/core/font/font-manager-core.js | 750 |  |
| js/core/global-error-handler.js | 17 | グローバルエラーハンドラ（未キャッチのエラーとPromise rejectionを検知） |
| js/core/logger.js | 197 | ログ出力ユーティリティ（SimpleLogger） |
| js/core/manga-page-size.js | 256 |  |
| js/core/service/worker-register.js | 115 |  |
| js/core/settings.js | 163 | FabricCanvas2HtmlCanvas Scale |
| js/core/svg/google-icon-helper.js | 229 |  |
| js/core/svg/google-icon-names.js | 12 |  |
| js/core/util/anime-util.js | 11 |  |
| js/core/util/array-buffer-utils.js | 53 |  |
| js/core/util/fabric-text-focus.js | 74 | fabric の IText / Textbox は、入力用の 1px の textarea を |
| js/core/util/fabric-util.js | 865 |  |
| js/core/util/html-canvas-util.js | 91 | html-canvas-util.js - HTMLキャンバスに対する低レベル操作（境界検出、スケーリング、ピクセル処理） |
| js/core/util/image-analyzer-util.js | 121 |  |
| js/core/util/image-util.js | 846 | image-util.js - Fabric.js画像オブジェクトの処理（変換、WebP、クロップ、反転、色変換など） |
| js/core/util/js-util.js | 20 |  |
| js/core/util/load-util.js | 94 | ユーティリティ関数：エラーハンドリングとログ出力を行う |
| js/core/util/log-util.js | 2 |  |
| js/core/util/png-bit-depth.js | 583 | png-bit-depth.js - PNG のビット深度変換（グレースケール / 24bit RGB / 32bit ARGB）を行うブラウザ向けエンコーダ |
| js/core/util/share-util.js | 1 |  |
| js/dashboard/dashboard-ui.js | 1057 | ダッシュボードUIコンポーネント（モーダル表示） |
| js/dashboard/performance-storage.js | 609 | パフォーマンス統計のlocalforage永続化 |
| js/dashboard/prompt-frequency-storage.js | 194 | プロンプトタグ頻度のlocalforage永続化 |
| js/db/user-font-repository.js | 83 | font-repository.js |
| js/fabric/fabric-management.js | 694 |  |
| js/layer/blend/blend.js | 697 | ブレンドモードUI - カテゴリ分類・プレビュー・適用処理 |
| js/layer/floating-window-management.js | 80 |  |
| js/layer/image-history-management.js | 358 |  |
| js/layer/layer-button.js | 94 |  |
| js/layer/layer-management.js | 540 |  |
| js/local-tools/background-removal-client.js | 545 |  |
| js/local-tools/cutout-presets.js | 107 |  |
| js/local-tools/local-tools-client.js | 98 |  |
| js/panel/grid.js | 137 |  |
| js/panel/layout-templates.js | 388 | 常见漫画分镜模板（直线切分，可后期手调刀线） |
| js/panel/random-cut.js | 136 |  |
| js/project-management.js | 712 | Runtime image generation is NovelAI-only. Legacy provider modules may still |
| js/shortcut.js | 538 | simple check if the user is using a mac os , not the best way to detect the OS |
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
| js/sidebar/panel/knife/knife-state.js | 19 | knife-state.js |
| js/sidebar/panel/panel-manager.js | 745 | function handleSelection(e) { |
| js/sidebar/panel/panel-template.js | 404 |  |
| js/sidebar/pen/brush-presets.js | 138 |  |
| js/sidebar/pen/custom-brush.js | 274 |  |
| js/sidebar/pen/fabric/brushes/crayon_brush.js | 120 | CrayonBrush class |
| js/sidebar/pen/fabric/brushes/drip.js | 77 | Drip class |
| js/sidebar/pen/fabric/brushes/ink_brush.js | 155 | InkBrush class |
| js/sidebar/pen/fabric/brushes/marker_brush.js | 96 | MarkerBrush class |
| js/sidebar/pen/fabric/brushes/spray_brush.js | 116 | SprayBrush class |
| js/sidebar/pen/fabric/brushes/stroke.js | 63 | Stroke class |
| js/sidebar/pen/fabric/fabric-brush.min.js | 19 |  |
| js/sidebar/pen/original-brush.js | 481 |  |
| js/sidebar/pen/pen-tools.js | 855 |  |
| js/sidebar/sidebar-ui.js | 211 |  |
| js/sidebar/sidebar.js | 118 |  |
| js/sidebar/speechBubble/speech-bubble-effect.js | 304 |  |
| js/sidebar/speechBubble/speech-bubble-freehand.js | 868 |  |
| js/sidebar/speechBubble/speech-bubble-text.js | 453 |  |
| js/sidebar/text/custom/custom-text-util.js | 32 |  |
| js/sidebar/text/custom/optimized-aurora-text.js | 127 |  |
| js/sidebar/text/custom/optimized-broken-text.js | 137 |  |
| js/sidebar/text/custom/optimized-cloud-text.js | 141 |  |
| js/sidebar/text/custom/optimized-layered-text.js | 101 |  |
| js/sidebar/text/custom/optimized-mesh-text.js | 142 |  |
| js/sidebar/text/custom/optimized-scratch-text.js | 144 |  |
| js/sidebar/text/custom/optimized-shadow-text.js | 168 |  |
| js/sidebar/text/custom/optimized-thrill-text.js | 134 |  |
| js/sidebar/text/custom/optimized-wild-text.js | 123 |  |
| js/sidebar/text/custom/optimized-zebra-text.js | 141 |  |
| js/sidebar/text/sfx-palette.js | 148 |  |
| js/sidebar/text/text-2-manager.js | 401 |  |
| js/sidebar/text/text-effect.js | 318 |  |
| js/sidebar/text/vertical-text.js | 37 |  |
| js/sidebar/text/vertical-textbox.js | 586 |  |
| js/sidebar/tone/focusline.js | 229 |  |
| js/sidebar/tone/rain-tone.js | 106 |  |
| js/sidebar/tone/snow-tone.js | 181 |  |
| js/sidebar/tone/speedline.js | 167 |  |
| js/sidebar/tone/tone-manager.js | 401 |  |
| js/sidebar/tone/tone-noise.js | 145 |  |
| js/sidebar/tone/tone.js | 220 |  |
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
| js/svg/manga-panels-image-landscape.js | 30 |  |
| js/svg/manga-panels-image-vertical.js | 43 |  |
| js/svg/speechbubble.js | 50 |  |
| js/ui/ai/auto-prompt-ui.js | 170 |  |
| js/ui/beginner-guide.js | 523 |  |
| js/ui/bottom-bar.js | 462 | {guid, { imageLink, blob }} blob is lz4 |
| js/ui/canvas-object-menu.js | 714 | Canvas object right-click context menu |
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
| js/ui/overlay-progress.js | 85 |  |
| js/ui/prompt-manager.js | 63 |  |
| js/ui/third/base-translation/base-de.js | 563 |  |
| js/ui/third/base-translation/base-en.js | 578 |  |
| js/ui/third/base-translation/base-es.js | 555 |  |
| js/ui/third/base-translation/base-fr.js | 572 |  |
| js/ui/third/base-translation/base-ja.js | 568 |  |
| js/ui/third/base-translation/base-ko.js | 570 |  |
| js/ui/third/base-translation/base-ru.js | 556 |  |
| js/ui/third/base-translation/base-zh.js | 604 |  |
| js/ui/third/i18next.js | 5750 | "yyyyMMddHHmmss_SSS": { |
| js/ui/third/intro.js | 0 |  |
| js/ui/third/tippy.js | 94 | Tooltip initialization using Tippy.js |
| js/ui/toast.js | 119 | createToast(NieR風): success/info, createToastError(DbD風): error/warning |
| js/ui/tutorial.js | 429 |  |
| js/ui/util/event-delegator.js | 94 | event-delegator.js - document-level event delegation utility |
| js/ui/util/focus-trap.js | 85 | focus-trap.js - モーダル用フォーカストラップユーティリティ |
| js/ui/util/mode-change.js | 171 | mode-change.js - グローバル変数、ダークモード切替、cropモードUI |
| js/ui/util/mode-manager.js | 416 | mode-manager.js - モード管理の統合（ナイフ、ペン、吹き出し、クロップ等） |
| js/ui/util/tagify-util.js | 95 |  |
| js/ui/util/ui-util.js | 67 |  |
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
| scripts/full-feature-e2e.cjs | 425 | Full-feature end-to-end walk-through in real Chromium against the real 99_server.py. |
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
| scripts/manga-smart-text-test.cjs | 45 |  |
| scripts/manga-text-ink-mask-test.cjs | 61 |  |
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
| scripts/tone-target-click-test.cjs | 34 | Regression: panels are not selectable, so "click a panel, then a tone" put the tone on |
| scripts/ux-screenshots.cjs | 44 | Beginner-flow screenshots for UX before/after comparison. |
| scripts/validate-manga-split-samples.py | 546 |  |
| scripts/vendor-free-public-assets.cjs | 274 | Download clearly licensed free assets into assets/public/. |
| service-worker.js | 93 | Service Worker: Cache management for HTTP/HTTPS deployment |
| start_local_tools.bat | 4 |  |
| start_manga_editor_nai.bat | 23 |  |
| start_manga_editor_nai.ps1 | 567 |  |
| 一键启动.bat | 29 |  |
