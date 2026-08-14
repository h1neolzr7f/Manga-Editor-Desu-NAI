const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/simulator-chat.css'), 'utf8');
const store = fs.readFileSync(path.join(root, 'js/assets/asset-store.js'), 'utf8');
const lib = fs.readFileSync(path.join(root, 'js/assets/asset-library-controller.js'), 'utf8');
const fonts = fs.readFileSync(path.join(root, 'js/core/font/font-manager-core.js'), 'utf8');
const boot = fs.readFileSync(path.join(root, 'js/assets/boot-guard.js'), 'utf8');

function must(cond, message) {
  if (!cond) throw new Error(message);
}

must(html.includes('js/assets/boot-guard.js'), 'boot-guard script missing');
must(html.includes('id="naiBootGuard"') || boot.includes('naiBootGuard'), 'boot-guard overlay missing');
must(html.includes('套用对话模板'), 'insert button copy missing');
must(html.includes('id="naiTokenBadge"'), 'token badge missing');
must(html.includes('id="novelaiRememberToken"'), 'remember token checkbox missing');
must(!html.includes('id="naiBatchAcceptanceGate" checked'), 'acceptance gate should default off');
must(html.includes('id="manga-tone-area" style="display: none;"'), 'tone panel not hidden by default');
must(html.includes('id="manga-effect-area" style="display: none;"'), 'effect panel not hidden by default');
must(html.includes('data-sim-tab="edit"') && html.includes('data-sim-tab="play"') && html.includes('data-sim-tab="advanced"'), 'story tabs missing');
must(html.includes('id="speech-bubble-area"'), 'merged bubble panel missing');
must(html.includes('data-target="speech-bubble-area"'), 'bubble sidebar target missing');
must(html.includes('createImagePromptHelperFlotingWindow()'), 'prompt gallery button missing');
must(html.includes('用作整页') || lib.includes('用作整页'), 'site-ui full-page action missing');
must(html.includes('id="simulatorStudioOverlay"'), 'simulator studio overlay missing');
must(html.includes('data-action="openSimulatorStudio"'), 'simulator studio action missing');
must(html.includes('icon-label">模拟器'), 'simulator sidebar label missing');
must(html.includes('js/simulator/site-ui-parts.js'), 'site-ui-parts script missing');
must(html.includes('js/simulator/simulator-studio.js'), 'simulator-studio script missing');
must(lib.includes('编辑数据'), 'site-ui edit-data action missing');
must(fs.readFileSync(path.join(root, 'js/simulator/simulator-controller.js'), 'utf8').includes('function insertScene'), 'insertScene missing');
must(css.includes('.sim-studio-overlay'), 'simulator studio css missing');

const chat = html.indexOf('id="simulator-chat-area"');
const extra = html.indexOf('id="simulator-extra-section"');
const play = html.indexOf('id="simulator-playback-section"');
const image2 = html.indexOf('id="image2-section"');
const cutout = html.indexOf('id="cutout-area"');
must(chat >= 0 && extra > chat && extra < cutout, 'extra section not inside chat area');
must(play > chat && play < cutout, 'playback section not inside chat area');
must(image2 > chat && image2 < cutout, 'image2 section not inside chat area');
must(html.indexOf('id="simulator-extra-section"', extra + 1) < 0, 'orphan extra section still present');

const auto = html.indexOf('id="auto-generate-area"');
const scene = html.indexOf('id="nai-scene-plan-section"');
must(scene > auto && scene < chat, 'scene plan not inside auto-generate');

must(html.includes('data-action="selectBrush"'), 'brush tools missing');
must(html.includes('data-action="selectMove"'), 'move tool missing');
must(html.includes('icon-label">笔刷'), 'brush sidebar icon missing');
must(html.includes('sidebar-group-label">开始'), 'beginner sidebar group missing');
must(html.includes('id="sidebarMoreToggle"'), 'sidebar more toggle missing');
must(html.includes('id="toggleAiPanelButton"'), 'AI panel toggle missing');
must(!html.includes('sidebar-group-label">笔刷'), 'brush should not be its own group');
must(html.includes('id="brushPresetGrid"'), 'brush preset grid missing');
must(html.includes('data-brush="Eraser"'), 'eraser not listed separately');
must(html.includes('id="canvasEmptyHint"'), 'empty canvas hint missing');
must(html.includes('id="canvasEmptyHintSimulator"'), 'empty hint simulator button missing');
const canvasStart=html.indexOf('id="canvas-container"');
const canvasEl=html.indexOf('id="mangaImageCanvas"');
const hintPos=html.indexOf('id="canvasEmptyHint"');
must(hintPos>=0&&!(hintPos>canvasStart&&hintPos<canvasEl), 'empty hint still inside scaled canvas-container');
must(fs.readFileSync(path.join(root,'css/layout-layer.css'),'utf8').includes('font-size:24px'), 'empty hint title still tiny');
must(html.includes('id="controls" style="display:none;"'), 'AI controls should start hidden');
must(html.includes('NovelAI 设置'), 'NovelAI settings entry missing');
must(html.includes('id="layerSelectPageButton"'), 'select-whole-page button missing');
must(html.includes('创建空白分镜页'), 'blank page generate copy missing');
must(html.includes('生成所有页面（花积分）'), 'credit spend warning missing');
must(!html.includes('discord.gg'), 'discord branding still present');
must(html.includes('href="使用说明.txt"'), 'usage guide link missing');
must(html.includes('致敬原项目 Desu'), 'upstream tribute link missing');
must(html.includes('github.com/new-sankaku/manga-editor-desu'), 'upstream repo link missing');
must(!html.includes('stable-diffusion-webui-simple-manga-maker'), 'menu still points at WebUI extension as this project');
const usageGuide = fs.readFileSync(path.join(root, '使用说明.txt'), 'utf8');
must(usageGuide.includes('Manga Editor Desu · nai学长魔改版'), '使用说明.txt not updated');
must(!usageGuide.includes('C:\\Users\\tzzcomputer'), '使用说明 still has local packing path');
must(html.includes('Manga Editor Desu · nai学长魔改版'), 'product name missing from html');
must(html.includes('nai学长魔改'), 'fork mark missing from navbar');
must(html.includes('>DESU<br>'), 'original DESU mark missing from navbar');
must(!html.includes('Pro Edition'), 'still claiming Desu Pro Edition');
must(!html.includes('new-sankaku.github.io'), 'still pointing identity at upstream github pages');
must(!html.includes('@hypersankaku2'), 'still using upstream twitter handle');
must(html.includes('js/ui/beginner-guide.js'), 'beginner-guide script missing');
must(html.includes('id="naiToolOptionsBar"'), 'tool options bar missing');
must(html.includes('js/ui/visual-studio.js'), 'visual studio script missing');
must(fs.readFileSync(path.join(root,'css/icon.css'),'utf8').includes('flex: 0 0 auto'), 'sidebar icons still shrink');
must(fs.readFileSync(path.join(root,'css/common.css'),'utf8').includes('body > div[itemscope]'), 'main shell wrapper not filling viewport');
must(html.includes('class="visual-shape-grid"'), 'shape visual grid missing');

const layerSrc = fs.readFileSync(path.join(root, 'js/layer/layer-management.js'), 'utf8');
must(layerSrc.includes('beginnerLayerDisplay'), 'layer grouping missing');
must(layerSrc.includes('makePageLayerHeader'), 'page layer header missing');
must(html.includes('退出画笔'), 'exit-brush copy missing');
must(!html.includes('data-action="selectBrush" data-brush="Marker" data-target="tool-area"'), 'nine sidebar brushes should be collapsed');
must(html.includes('js/simulator/page-edit-controller.js'), 'page edit controller script missing');

const factorySrc = fs.readFileSync(path.join(root, 'js/simulator/extra-renderer-factory.js'), 'utf8');
must(factorySrc.includes('explodeOntoCanvas'), 'explodeOntoCanvas missing');
must(factorySrc.includes('simulatorExplode'), 'simulatorExplode missing');
must(factorySrc.includes('function panel('), 'panel helper missing');
must(factorySrc.includes('function selectPage'), 'selectPage missing');
must(store.includes('this.byId=new Map()'), 'asset store index missing');
must(!fs.readFileSync(path.join(root, 'js/assets/github-free-pack.js'), 'utf8').includes("document.addEventListener('DOMContentLoaded'"), 'free pack still auto-seeds on load');

const settingsSrc = fs.readFileSync(path.join(root, 'js/core/settings.js'), 'utf8');
must(settingsSrc.includes('simulatorPageId'), 'page id not persisted');

must(lib.includes('video-tube-generic') && lib.includes('danmaku-player-generic') && lib.includes('image-board-generic'), 'site template map missing');
must(store.includes('user_data/asset_packs/'), 'imported persist path missing');
must(store.includes('hasLoadableSource'), 'hasLoadableSource missing');
must(!store.includes('if(hasDataThumbnail(asset))return Promise.resolve(asset.thumbnail)'), 'thumbnail still used as loadable source');
must(!fonts.includes('{ name: "Anton", bundled: true }'), 'false bundled Anton still present');
must(fonts.includes('{ name: "Klee One", bundled: true }'), 'true bundled Klee One missing');
must(css.includes('.asset-library-list.is-grid'), 'asset grid css missing');
must(css.includes('.simulator-workspace-tabs'), 'workspace tab css missing');
must(fs.readFileSync(path.join(root, 'css/layout.css'), 'utf8').includes('.beginner-tool-hud'), 'beginner HUD css missing');
must(fs.readFileSync(path.join(root, 'js/sidebar/sidebar.js'), 'utf8').includes('setSidebarMoreOpen'), 'sidebar more toggle missing');
must(fs.readFileSync(path.join(root, 'css/core/main-component.css'), 'utf8').includes('width:300px'), 'left panel width not widened');
must(fs.readFileSync(path.join(root, 'js/project-management.js'), 'utf8').includes("view_controls_checkbox:{id:'view_controls_checkbox',default:false"), 'AI panel still default visible');
must(fs.readFileSync(path.join(root, 'js/ui/beginner-guide.js'), 'utf8').includes('generatePreflight'), 'generate preflight missing');
must(fs.readFileSync(path.join(root, 'js/ui/bottom-bar.js'), 'utf8').includes('选择新页尺寸'), 'bottom bar dialog still Japanese');
must(html.includes('id="naiPageSizeBadge"'), 'page size badge missing');
must(html.includes('data-action="selectEraser"'), 'eraser tool missing');
must(html.includes('data-action="selectMarquee"'), 'marquee tool missing');
must(html.includes('data-action="selectCrop"'), 'crop tool missing');
must(html.includes('data-action="selectKnife"'), 'knife sidebar tool missing');
must(html.includes('id="naiPropStrip"'), 'property strip missing');
must(html.includes('js/ui/visual-ps-tools.js'), 'visual ps tools script missing');
must(html.includes('id="ps-tools-area"'), 'paint tools panel missing');
must(html.includes('id="naiZoomTools"'), 'zoom tools missing from tool bar');
must(fs.readFileSync(path.join(root,'js/ui/beginner-guide.js'),'utf8').includes('placed.root'), 'insert still discards selection');
must(fs.readFileSync(path.join(root,'js/simulator/story-composer-controller.js'),'utf8').includes('replace===false'), 'studio insert still replaces selected page');
must(fs.readFileSync(path.join(root,'js/canvas-manager.js'),'utf8').includes('function isMangaPanel'), 'fit still targets simulator video slots');
must(fs.readFileSync(path.join(root,'js/canvas-manager.js'),'utf8').includes('allowFallback'), 'scale still steals last simulator when another object is selected');
must(fs.readFileSync(path.join(root,'js/simulator/story-composer-controller.js'),'utf8').includes('options.story'), 'studio chat insert still overwrites story composer');
must(fs.readFileSync(path.join(root,'js/simulator/page-edit-controller.js'),'utf8').includes("factory.selectPage(current,target.simulatorPageId)"), 'dblclick chrome cannot reselect whole page');
must(html.includes('id="naiZoomInBtn"') && html.includes('id="naiObjectFitBtn"'), 'canvas/object zoom buttons missing');
must(html.includes('id="simStudioChatStore"') && html.includes('id="simStudioWebStore"') && html.includes('id="simStudioPartStore"'), 'simulator store grids missing');
must(html.includes('id="simStudioScaleUp"') && html.includes('贴合分镜'), 'simulator whole-page scale controls missing');
must(css.includes('.sim-store-grid'), 'simulator store css missing');
must(fs.readFileSync(path.join(root,'js/canvas-manager.js'),'utf8').includes('function zoomBy'), 'ctrl-wheel zoomBy missing');
must(fs.readFileSync(path.join(root,'js/canvas-manager.js'),'utf8').includes('NaiCanvasView'), 'NaiCanvasView export missing');
must(factorySrc.includes('function scalePage'), 'scalePage missing');
must(fs.readFileSync(path.join(root,'js/simulator/simulator-studio.js'),'utf8').includes('fillChatStore'), 'simulator store picker missing');
must(fs.readFileSync(path.join(root,'js/local-tools/background-removal-client.js'),'utf8').includes('localColorKeyDataUrl'), 'local color key missing');
must(fs.readFileSync(path.join(root,'js/local-tools/background-removal-client.js'),'utf8').includes('选区改用颜色抠图'), 'region color-key fallback missing');
must(html.includes('data-align="left"'), 'align buttons missing');
must(html.includes('data-i18n="dashboardTotal">生成'), 'dashboard chinese fallback missing');
must(fs.readFileSync(path.join(root,'js/ui/canvas-object-menu.js'),'utf8').includes('confirmSpend'), 'generate spend confirm missing');
must(html.includes('js/core/manga-page-size.js'), 'manga page size script missing');
must(html.includes('value="1654"'), 'assembly page width default missing');
must(html.includes('框选抠图'), 'marquee cutout copy missing');

const pageSizeSrc=fs.readFileSync(path.join(root,'js/core/manga-page-size.js'),'utf8');
must(pageSizeSrc.includes('resolveMangaPageSize'), 'resolveMangaPageSize missing');
must(fs.readFileSync(path.join(root,'js/canvas-manager.js'),'utf8').includes('fitCanvasViewToContainer'), 'canvas view fit missing');
must(fs.readFileSync(path.join(root,'js/ui/canvas-object-menu.js'),'utf8').includes('NaiBackgroundRemovalClient'), 'right-click cutout not wired');
must(fs.readFileSync(path.join(root,'js/local-tools/background-removal-client.js'),'utf8').includes('processRegion'), 'region cutout missing');
must(fs.readFileSync(path.join(root,'js/ui/beginner-guide.js'),'utf8').includes('selectEraserTool'), 'E eraser shortcut missing');
must(fs.readFileSync(path.join(root,'js/ui/bottom-bar.js'),'utf8').includes('defaultMangaPageSize'), 'add-page dialog still uses tiny page size');

const controllers = {
  'js/simulator/simulator-controller.js': 'simulator-controller',
  'js/simulator/playback-controller.js': 'playback-controller',
  'js/assets/image2-controller.js': 'image2-controller',
  'js/ai/director/scene-plan-controller.js': 'scene-plan-controller'
};
Object.keys(controllers).forEach((file) => {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  if (src.includes('function movePanel')) throw new Error('movePanel still in ' + controllers[file]);
});

console.log('layout smoke test passed');
