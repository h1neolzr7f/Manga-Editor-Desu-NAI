// Runtime image generation is NovelAI-only. Legacy provider modules may still
// exist in the repository, but they are not exposed or selected by this build.
const apis={
NOVELAI: "novelai"
};


const getDataByName=(files,fileName)=>{
const file=files.find(file=>file.name===fileName);
return file ? file.data : null;
};



// Variable to keep track of selected api model to use
var apiMode=apis.NOVELAI;

document.addEventListener("DOMContentLoaded",function () {
var settingsSave=$("settingsSave");
settingsSave.addEventListener("click",function () {saveSettingsLocalStrage();});

var saveButton=$("projectSave");
var loadButton=$("projectLoad");

saveButton.addEventListener("click",async function () {
if (stateStack.length===0) {
createToastError("Save Error","Not Found.");
return;
}

const loading=OP_showLoading({icon: 'process',step: 'Step1',substep: 'Save Project',progress: 0});

btmSaveProjectFile(null,false).then(async ()=>{
OP_updateLoadingState(loading,{icon: 'process',step: 'Step2',substep: 'Process 1',progress: 20});

const lz4BlobList=Array.from(btmProjectsMap.values()).map(data=>data.blob);
let mergeLz4Blob=await lz4Compressor.mergeLz4Blobs(lz4BlobList);

OP_updateLoadingState(loading,{icon: 'process',step: 'Step3',substep: 'Process 2',progress: 20});

var url=window.URL.createObjectURL(mergeLz4Blob);
var a=document.createElement("a");
a.href=url;
a.download="DESU-nai学长魔改.lz4";

document.body.appendChild(a);
a.click();
document.body.removeChild(a);
window.URL.revokeObjectURL(url);
AutoSaveManager.clearAutoSave();
})
.catch((error)=>{
projectLogger.error("error",error);
projectLogger.error("error json,",JSON.stringify(error));
createToastError("Save Error","Failed to save project.");
})
.finally(()=>{
OP_hideLoading(loading);
});
});



loadButton.addEventListener("click",function () {
var fileInput=document.createElement("input");
fileInput.type="file";
fileInput.style.display="none";
document.body.appendChild(fileInput);
fileInput.click();

fileInput.onchange=async function () {
const loading=OP_showLoading({icon: 'process',step: 'Step1',substep: 'Load Project',progress: 0});

try {
var file=this.files[0];
if (file) {
const fileBuffer=await file.arrayBuffer();
const fileName=file.name.toLowerCase();
const isZip=fileName.endsWith('.zip');
const isLz4=fileName.endsWith('.lz4');

if (isZip) {
OP_updateLoadingState(loading,{icon: 'process',step: 'Step2',substep: 'UnZip',progress: 20});

const zip=await JSZip.loadAsync(file);
var hasNestedZip=false;
var fileCount=0;

zip.forEach(function (relativePath,zipEntry) {
fileCount++;
OP_updateLoadingState(loading,{icon: 'process',step: 'Step3',substep: 'UnZip file:'+fileCount,progress: 30});
if (zipEntry.name.toLowerCase().endsWith('.zip')) {
hasNestedZip=true;
}
});

if (hasNestedZip) {
OP_updateLoadingState(loading,{icon: 'process',step: 'Step4',substep: 'UnZip:',progress: 40});
await processZip(zip);
document.body.removeChild(fileInput);
} else {
OP_updateLoadingState(loading,{icon: 'process',step: 'Step4',substep: 'UnZip:',progress: 40});
await multiLoadZip(zip);
}
} else if (isLz4) {
//fileList is {name, data}
OP_updateLoadingState(loading,{icon: 'process',step: 'Step2',substep: 'UnLz4',progress: 20});
let bufferFileLz4List=await lz4Compressor.unLz4FilesByBuffer(fileBuffer);

OP_updateLoadingState(loading,{icon: 'process',step: 'Step3',substep: 'UnLz4',progress: 25});
await multiLoadLz4(bufferFileLz4List);

OP_updateLoadingState(loading,{icon: 'process',step: 'Step4',substep: 'UnLz4',progress: 85});
} else {
let title=getText("unsupportedProjectFileFormat");
let message=getText("unsupportedProjectFileFormatMessage");
createToastError(title,message,4000);
}
}
} catch (error) {
projectLogger.error("error:",error);
createToastError("Load Error","Failed to load project.");
} finally {
OP_hideLoading(loading);
}
};
});
});


function findCanvasGuid(obj) {
if (typeof obj==='string') {
try {
obj=JSON.parse(obj);
} catch (error) {
return null;
}
}
if (typeof obj!=='object'||obj===null) {
return null;
}

if (obj.canvasGuid) {
return obj.canvasGuid;
}

for (let key in obj) {
if (typeof obj[key]==='object') {
const result=findCanvasGuid(obj[key]);
if (result) return result;
}
}
return null;
}

var localSettingsData=null;

function toggleSettingsHighlight(enable){
var flag=(enable!==undefined)?enable:!DEBUG_FLAGS.settingsHighlight;
DEBUG_FLAGS.settingsHighlight=flag;
var styleId='settings-highlight-style';
var existingStyle=$(styleId);
if(flag){
if(!existingStyle){
var style=document.createElement('style');
style.id=styleId;
style.textContent='.settings-highlight{outline:3px solid #ff6b00 !important;box-shadow:0 0 10px #ff6b00 !important;animation:settings-pulse 1s ease-in-out infinite !important;}@keyframes settings-pulse{0%,100%{outline-color:#ff6b00;box-shadow:0 0 10px #ff6b00;}50%{outline-color:#ffaa00;box-shadow:0 0 20px #ffaa00;}}';
document.head.appendChild(style);
}
applyHighlightClass(true);
projectLogger.debug('Settings highlight: ON');
}else{
if(existingStyle)existingStyle.remove();
applyHighlightClass(false);
projectLogger.debug('Settings highlight: OFF');
}
return flag;
}

function applyHighlightClass(add){
var allIds=[];
Object.values(SETTINGS_SCHEMA).forEach(function(cfg){if(cfg.id)allIds.push(cfg.id);});
Object.values(BASEPROMPT_SCHEMA).forEach(function(cfg){if(cfg.id)allIds.push(cfg.id);});
allIds.forEach(function(id){
var el=$(id);
if(el){
if(add)el.classList.add('settings-highlight');
else el.classList.remove('settings-highlight');
}
});
}

var SETTINGS_SCHEMA={
view_layers_checkbox:{id:'view_layers_checkbox',default:true,type:'checkbox'},
view_controls_checkbox:{id:'view_controls_checkbox',default:false,type:'checkbox'},
knifePanelSpaceSize:{id:'knifePanelSpaceSize',default:'20'},
canvasBgColor:{id:'bg-color',default:'#ffffff'},
canvasDpi:{id:'outputDpi',default:'450'},
canvasGridLineSize:{id:'gridSizeInput',default:'10'},
canvasMarginFromPanel:{id:'marginFromPanel',default:20},
novelaiApiUrl:{id:'novelaiApiUrl',default:'https://image.novelai.net'},
novelaiUseLocalProxy:{id:'novelaiUseLocalProxy',default:true,type:'checkbox'},
novelaiApiKey:{id:'novelaiApiKey',default:'',secret:true},
novelaiModel:{id:'novelaiModel',default:'nai-diffusion-4-5-full'},
novelaiSampler:{id:'novelaiSampler',default:'k_euler_ancestral'},
novelaiSteps:{id:'novelaiSteps',default:'28'},
novelaiScale:{id:'novelaiScale',default:'6'},
novelaiUcPreset:{id:'novelaiUcPreset',default:'2'},
novelaiCfgRescale:{id:'novelaiCfgRescale',default:'0'},
novelaiI2IStrength:{id:'novelaiI2IStrength',default:'0.65'},
novelaiI2INoise:{id:'novelaiI2INoise',default:'0'},
novelaiConcurrency:{id:'novelaiConcurrency',default:'1'},
naiCompositionAgent:{id:'naiCompositionAgent',default:true,type:'checkbox'},
naiDirectorAdjustCanvas:{id:'naiDirectorAdjustCanvas',default:true,type:'checkbox'},
naiDirectorUseTagAnchors:{id:'naiDirectorUseTagAnchors',default:true,type:'checkbox'},
naiDirectorHonorCharacterCards:{id:'naiDirectorHonorCharacterCards',default:true,type:'checkbox'},
naiDirectorMessageMode:{id:'naiDirectorMessageMode',default:'armor_first'},
naiBatchAcceptanceGate:{id:'naiBatchAcceptanceGate',default:false,type:'checkbox'},
naiBatchAutoGenerateAfterPrompts:{id:'naiBatchAutoGenerateAfterPrompts',default:false,type:'checkbox'},
naiDirectorStoreDrafts:{id:'naiDirectorStoreDrafts',default:true,type:'checkbox'},
naiDirectorUseApi:{id:'naiDirectorUseApi',default:true,type:'checkbox'},
naiDirectorUseProxy:{id:'naiDirectorUseProxy',default:true,type:'checkbox'},
naiDirectorApiUrl:{id:'naiDirectorApiUrl',default:'https://tokendance.space/gateway/v1'},
naiDirectorApiKey:{id:'naiDirectorApiKey',default:'',secret:true},
naiDirectorModel:{id:'naiDirectorModel',default:'deepseek-v4-flash'},
naiDirectorTimeout:{id:'naiDirectorTimeout',default:'30'},
naiMangaImportTaggerUrl:{id:'mangaImportTaggerUrl',default:'http://127.0.0.1:7860/tag'},
naiMangaImportTaggerThreshold:{id:'mangaImportTaggerThreshold',default:'0.35'},
naiMangaImportPanelThreshold:{id:'mangaImportPanelThreshold',default:'245'},
naiMangaImportMinPanelArea:{id:'mangaImportMinPanelArea',default:'1.2'},
naiMangaImportUseTaggerProxy:{id:'mangaImportUseTaggerProxy',default:true,type:'checkbox'},
naiMangaImportKeepReference:{id:'mangaImportKeepReference',default:true,type:'checkbox'},
naiMangaImportAutoTag:{id:'mangaImportAutoTag',default:true,type:'checkbox'},
naiMangaImportCharacterPlaceholders:{id:'mangaImportCharacterPlaceholders',default:true,type:'checkbox'},
naiMangaImportCharacterReferences:{id:'mangaImportCharacterReferences',default:true,type:'checkbox'},
naiDirectorSystemPrompt:{id:'naiDirectorSystemPrompt',default:'你是 NovelAI 漫画分镜导演，只为 NovelAI 生图服务。\n输入可能是中文自然语言。先理解用户真正想要的角色、动作、场景、边框、画幅、镜头、构图、光影、总体氛围和主体位置。\n输出必须转换成 Danbooru/NovelAI 能识别的英文标签或短英文构图短语，不要把中文原文塞进正向提示词。\n保持角色、服装、动作、场景、画风的层级清晰，优先保证脸、手和主体可读。\n考虑漫画分镜边框：普通分镜用 manga panel / clean panel border；满版或出血画面用 full-bleed illustration；不要同时堆互相矛盾的边框词。\n避免重复标签、同义词堆叠和互相矛盾的构图词。最终提示词要简洁、可执行。\n**Pixiv 一流水平要求（必须严格执行）**：prompt 必须包含 masterpiece, best quality, ultra-detailed, intricate, beautiful detailed face and eyes, professional manga art, cinematic composition, elegant sensual mature romance atmosphere, soft dramatic lighting, volumetric god rays, perfect anatomy, high resolution, pixiv top rated style。Theresa 必须一致：long white hair flowing, elegant Sarkaz horns, regal black/silk clothing or nightrobe slipping, melancholy gentle smile, lavender eyes, detailed fabric folds and hair strands。Doctor：hooded coat open, mask, tender protective gestures, gloved hand touch。成熟 R18 但 tasteful：strategic shadow/fabric censorship, focus on emotion, hands, hair, eyes, intimacy without explicit anatomy。所有面板角色脸、手、发型、服装细节 100% 一致。\n如果调用导演 API，必须只返回 JSON：{"prompt":"英文正向提示词","negative_prompt":"英文反向提示词","mode":"模式","camera":"镜头","composition":"构图","lighting":"光影","atmosphere":"氛围","border":"边框/分镜处理","notes":"简短中文备注"}。\n可选配置：另起一行写“固定标签 = tag1, tag2”会追加正向标签；写“固定反向 = tag1, tag2”会追加反向标签。'},
novelaiQualityToggle:{id:'novelaiQualityToggle',default:true,type:'checkbox'},
novelaiSM:{id:'novelaiSM',default:false,type:'checkbox'},
novelaiSMDyn:{id:'novelaiSMDyn',default:false,type:'checkbox'},
apiHeartbeatCheckbox:{id:'apiHeartbeatCheckbox',default:true,type:'checkbox'},
autoSaveEnabled:{id:'autoSaveCheckbox',default:true,type:'checkbox'},
autoSaveInterval:{id:'autoSaveInterval',default:'60'},
settingsAutoSaveEnabled:{id:'settingsAutoSaveCheckbox',default:true,type:'checkbox'},
view_prompt_checkbox:{id:'view_prompt_checkbox',default:false,type:'checkbox'},
customPanelSizeX:{id:'customPanelSizeX',default:'1654'},
customPanelSizeY:{id:'customPanelSizeY',default:'2339'},
panelStrokeColor:{id:'panelStrokeColor',default:'rgba(0,0,0,1)'},
panelFillColor:{id:'panelFillColor',default:'rgba(255,255,255,1)'},
panelStrokeWidth:{id:'panelStrokeWidth',default:'2'},
panelOpacity:{id:'panelOpacity',default:'100'},
bubbleStrokeColor:{id:'bubbleStrokeColor',default:'rgba(0,0,0,1)'},
bubbleFillColor:{id:'bubbleFillColor',default:'rgba(255,255,255,1)'},
speechBubbleOpacity:{id:'speechBubbleOpacity',default:'100'},
bubbleStrokewidht:{id:'bubbleStrokewidht',default:'4.0'},
speechBubbleLineSizeSlider:{id:'speechBubbleLineSizeSlider',default:'3'},
sbStrokeColor:{id:'sbStrokeColor',default:'rgba(0,0,0,1)'},
sbFillColor:{id:'sbFillColor',default:'rgba(255,255,255,1)'},
sbSmoothing:{id:'sbSmoothing',default:true,type:'checkbox'},
sbStrokeWidth:{id:'sbStrokeWidth',default:'1'},
sbPointSpace:{id:'sbPointSpace',default:'4'},
sbFillOpacity:{id:'sbFillOpacity',default:'100'},
sbSornerRadius:{id:'sbSornerRadius',default:'2'},
sbFillOpacity2:{id:'sbFillOpacity2',default:'100'},
svg_icon_iconStyle:{id:'svg_icon_iconStyle',default:'filled'},
svg_icon_lineColor:{id:'svg_icon_lineColor',default:'rgba(0,0,0,1)'},
svg_icon_fillColor:{id:'svg_icon_fillColor',default:'rgba(255,255,255,1)'},
svg_icon_lineWidth:{id:'svg_icon_lineWidth',default:'1'},
svg_icon_fillOpacity:{id:'svg_icon_fillOpacity',default:'1'},
svg_icon_shadowColor:{id:'svg_icon_shadowColor',default:'rgba(255,255,255,1)'},
svg_icon_shadowBlur:{id:'svg_icon_shadowBlur',default:'3'},
svg_icon_shadowOffsetX:{id:'svg_icon_shadowOffsetX',default:'0'},
svg_icon_shadowOffsetY:{id:'svg_icon_shadowOffsetY',default:'0'},
InformationFPS:{id:'InformationFPS',default:true,type:'checkbox'},
InformationCoordinate:{id:'InformationCoordinate',default:true,type:'checkbox'},
AdetailerCheck:{id:'AdetailerCheck',default:false,type:'checkbox'},
AdetilerModelsPrompt:{id:'AdetilerModelsPrompt',default:''},
AdetilerModelsNegative:{id:'AdetilerModelsNegative',default:''},
pageCount:{id:'pageCount',default:'18'},
verticalRandomPanelCount:{id:'verticalRandomPanelCount',default:'2'},
horizontalRandomPanelCount:{id:'horizontalRandomPanelCount',default:'3'},
tiltRandom:{id:'tiltRandom',default:'6'},
cutChangeRate:{id:'cutChangeRate',default:'10'},
onePanelGenerateNumber:{id:'onePanelGenerateNumber',default:'1'},
panelLayoutTemplate:{id:'panelLayoutTemplateSelect',default:'grid-2x2'},
naiMarkPanelsForManualReview:{id:'naiMarkPanelsForManualReview',default:true,type:'checkbox'},
naiBatchDirectorPrompt:{id:'naiBatchDirectorPrompt',default:''},
naiBatchDirectorEnabled:{id:'naiBatchDirectorEnabled',default:true,type:'checkbox'},
inpaintBrushSize:{id:'inpaint-brush-size',default:'30'},
inpaintDenoise:{id:'inpaint-denoise',default:'0.75'},
dashboardDailyGoalInput:{id:'dashboardDailyGoalInput',default:''},
dashboardWeeklyGoalInput:{id:'dashboardWeeklyGoalInput',default:''},
textColorPicker:{id:'textColorPicker',default:'rgba(0,0,0,1)'},
textOutlineColorPicker:{id:'textOutlineColorPicker',default:'rgba(0,0,0,1)'},
textBgColorPicker:{id:'textBgColorPicker',default:'rgba(0,0,0,0)'},
fontSizeSlider:{id:'fontSizeSlider',default:'32'},
fontStrokeWidthSlider:{id:'fontStrokeWidthSlider',default:'0'},
inpaintPrompt:{id:'inpaint-prompt',default:''},
inpaintNegative:{id:'inpaint-negative',default:''},
anglePrompt:{id:'angle-prompt',default:''}
};

var BASEPROMPT_SCHEMA={
basePrompt_text2img_prompt:{id:'basePrompt_prompt',key:'text2img_prompt'},
basePrompt_text2img_negative:{id:'basePrompt_negative',key:'text2img_negative'},
basePrompt_text2img_seed:{id:'basePrompt_seed',key:'text2img_seed'},
basePrompt_text2img_cfg_scale:{id:'basePrompt_cfg_scale',key:'text2img_cfg_scale'},
basePrompt_text2img_width:{id:'basePrompt_width',key:'text2img_width'},
basePrompt_text2img_height:{id:'basePrompt_height',key:'text2img_height'},
basePrompt_text2img_samplingMethod:{id:'basePrompt_samplingMethod',key:'text2img_samplingMethod'},
basePrompt_text2img_samplingSteps:{id:'basePrompt_samplingSteps',key:'text2img_samplingSteps'},
basePrompt_text2img_scheduler:{id:null,key:'text2img_scheduler'},
basePrompt_text2img_model:{id:'basePrompt_model',key:'text2img_model'},
basePrompt_text2img_hr_upscaler:{id:'text2img_hr_upscaler',key:'text2img_hr_upscaler'},
basePrompt_text2img_hr_scale:{id:'text2img_hr_scale',key:'text2img_hr_scale'},
basePrompt_text2img_hr_step:{id:'text2img_hr_step',key:'text2img_hr_step'},
basePrompt_text2img_hr_denoise:{id:'text2img_hr_denoise',key:'text2img_hr_denoise'}
};

var SECRET_SETTINGS_KEY='sessionSettingsSecrets';
var PERSIST_SECRETS_KEY='localSettingsSecrets';

function rememberTokenEnabled(){
var el=$('novelaiRememberToken');
if(el)return!!el.checked;
try{return localStorage.getItem('nai_remember_token')!=='0';}catch(error){return true;}
}

function readSecretStore(){
var persist={};
var session={};
try{persist=JSON.parse(localStorage.getItem(PERSIST_SECRETS_KEY)||'{}')||{};}catch(error){persist={};}
try{session=JSON.parse(sessionStorage.getItem(SECRET_SETTINGS_KEY)||'{}')||{};}catch(error){session={};}
return Object.assign({},persist,session);
}

function writeSecretStore(data){
try{sessionStorage.setItem(SECRET_SETTINGS_KEY,JSON.stringify(data||{}));}catch(error){/* ignore quota */}
try{
if(rememberTokenEnabled())localStorage.setItem(PERSIST_SECRETS_KEY,JSON.stringify(data||{}));
else localStorage.removeItem(PERSIST_SECRETS_KEY);
}catch(error){/* ignore quota */}
}

function applyBeginnerUxMigration(){
if(localStorage.getItem('nai_beginner_ux_v2')==='1')return;
localStorage.setItem('nai_beginner_ux_v2','1');
var gate=$('naiBatchAcceptanceGate');
if(gate)gate.checked=false;
try{
var raw=localStorage.getItem('localSettingsData');
if(raw){
var parsed=JSON.parse(raw);
parsed.naiBatchAcceptanceGate=false;
localStorage.setItem('localSettingsData',JSON.stringify(parsed));
}
}catch(error){/* ignore */}
}

function applyAssemblyPageSizeMigration(){
if(localStorage.getItem('nai_assembly_page_v1')==='1')return;
localStorage.setItem('nai_assembly_page_v1','1');
var page=typeof NaiMangaPageSize!=='undefined'?NaiMangaPageSize.defaultMangaPageSize(false):{width:1654,height:2339};
var x=$('customPanelSizeX');
var y=$('customPanelSizeY');
if(x)x.value=String(page.width);
if(y)y.value=String(page.height);
try{
var raw=localStorage.getItem('localSettingsData');
if(raw){
var parsed=JSON.parse(raw);
parsed.customPanelSizeX=String(page.width);
parsed.customPanelSizeY=String(page.height);
localStorage.setItem('localSettingsData',JSON.stringify(parsed));
}
}catch(error){/* ignore */}
}

function applyBeginnerLayoutMigration(){
if(localStorage.getItem('nai_beginner_layout_v1')==='1')return;
localStorage.setItem('nai_beginner_layout_v1','1');
var ctrl=$('view_controls_checkbox');
if(ctrl)ctrl.checked=false;
try{
var raw=localStorage.getItem('localSettingsData');
if(raw){
var parsed=JSON.parse(raw);
parsed.view_controls_checkbox=false;
localStorage.setItem('localSettingsData',JSON.stringify(parsed));
}
}catch(error){/* ignore */}
}

function loadSettingsLocalStrage(){
var stored=localStorage.getItem('localSettingsData');
var secrets=readSecretStore();
if(!stored){
Object.keys(SETTINGS_SCHEMA).forEach(function(key){
var cfg=SETTINGS_SCHEMA[key];
if(!cfg.secret)return;
var el=$(cfg.id);
if(el&&secrets[key]!==undefined)el.value=secrets[key];
});
applyBeginnerLayoutMigration();
applyBeginnerUxMigration();
applyAssemblyPageSizeMigration();
if(typeof syncJsColorFromInputs==='function'){
syncJsColorFromInputs();
}
return;
}
var data=JSON.parse(stored);
var migrated=false;
Object.keys(SETTINGS_SCHEMA).forEach(function(key){
var cfg=SETTINGS_SCHEMA[key];
if(!cfg.secret)return;
if(data[key]&&!secrets[key]){secrets[key]=data[key];migrated=true;}
delete data[key];
});
if(migrated){
writeSecretStore(secrets);
try{
var cleaned=JSON.parse(stored);
Object.keys(SETTINGS_SCHEMA).forEach(function(key){if(SETTINGS_SCHEMA[key].secret)delete cleaned[key];});
localStorage.setItem('localSettingsData',JSON.stringify(cleaned));
}catch(error){/* ignore */}
}
Object.keys(SETTINGS_SCHEMA).forEach(function(key){
var cfg=SETTINGS_SCHEMA[key];
var el=$(cfg.id);
if(!el)return;
var val=cfg.secret?((secrets[key]!==undefined)?secrets[key]:''):((data[key]!==undefined)?data[key]:cfg.default);
if(cfg.type==='checkbox')el.checked=val;
else el.value=val;
});
if(data.naiBatchDirectorEnabled===undefined&&$('naiBatchDirectorEnabled')){
$('naiBatchDirectorEnabled').checked=true;
}
if(localStorage.getItem('naiBatchDirectorDefaultMigratedV4')!=='1'&&$('naiBatchDirectorEnabled')){
$('naiBatchDirectorEnabled').checked=true;
data.naiBatchDirectorEnabled=true;
localStorage.setItem('naiBatchDirectorDefaultMigratedV4','1');
}
if(localStorage.getItem('naiDirectorModelMigratedV5')!=='1'){
var modelEl=$('naiDirectorModel');
var legacyModels={'qwen3.5-flash':1,'qwen3-flash':1};
if(modelEl&&legacyModels[modelEl.value]){
modelEl.value='deepseek-v4-flash';
data.naiDirectorModel='deepseek-v4-flash';
}
localStorage.setItem('naiDirectorModelMigratedV5','1');
}
if(localStorage.getItem('letteringFontSizeDefaultMigratedV1')!=='1'){
var sizeEl=$('fontSizeSlider');
if(sizeEl&&(String(sizeEl.value)==='14'||data.fontSizeSlider==='14'||data.fontSizeSlider===undefined)){
sizeEl.value='32';
data.fontSizeSlider='32';
try{
var sizeStore=JSON.parse(localStorage.getItem('localSettingsData')||'{}');
sizeStore.fontSizeSlider='32';
localStorage.setItem('localSettingsData',JSON.stringify(sizeStore));
}catch(e){}
}
localStorage.setItem('letteringFontSizeDefaultMigratedV1','1');
}
if(localStorage.getItem('letteringTextBgTransparentMigratedV1')!=='1'){
var bgPicker=$('textBgColorPicker');
var bgVal=bgPicker?String(bgPicker.value):'';
var savedBg=data.textBgColorPicker;
var factoryWhite={'rgba(255,255,255,1)':1,'rgba(255, 255, 255, 1)':1,'#ffffff':1,'#FFFFFF':1};
if(bgPicker&&(factoryWhite[bgVal]||factoryWhite[savedBg]||savedBg===undefined)){
bgPicker.value='rgba(0,0,0,0)';
data.textBgColorPicker='rgba(0,0,0,0)';
try{
var bgStore=JSON.parse(localStorage.getItem('localSettingsData')||'{}');
bgStore.textBgColorPicker='rgba(0,0,0,0)';
localStorage.setItem('localSettingsData',JSON.stringify(bgStore));
}catch(e){}
}
localStorage.setItem('letteringTextBgTransparentMigratedV1','1');
}
if(typeof syncJsColorFromInputs==='function'){
syncJsColorFromInputs();
}
if(typeof loadPanelLayoutPrefs==='function'){
loadPanelLayoutPrefs(data);
}
applyBeginnerLayoutMigration();
applyBeginnerUxMigration();
applyAssemblyPageSizeMigration();
if(typeof window.NaiBeginnerGuide!=='undefined'&&window.NaiBeginnerGuide.updateTokenBadge){
window.NaiBeginnerGuide.updateTokenBadge();
}
var bgEl=$('bg-color');
bgEl.dispatchEvent(new Event('input',{bubbles:true,cancelable:true}));
svgPagging=data.canvasMarginFromPanel||20;
Object.keys(BASEPROMPT_SCHEMA).forEach(function(key){
var cfg=BASEPROMPT_SCHEMA[key];
var val=(data[key]!==undefined)?data[key]:basePrompt[cfg.key];
if(cfg.id){
var el=$(cfg.id);
if(el)el.value=val;
}
basePrompt[cfg.key]=val;
});
['basePrompt_height','basePrompt_width'].forEach(function(elId){
$(elId).addEventListener('blur',function(){
var v=parseInt(this.value);
if(v!==-1)this.value=Math.round(v/8)*8;
});
});
apiMode=apis.NOVELAI;
providerRegistry.syncFromApiMode(apiMode);
if(data.roleAssignments){
providerRegistry.loadRoleAssignments(data.roleAssignments);
}
if(typeof enforceNovelAIOnlyMode==='function'){
enforceNovelAIOnlyMode();
}
updateWorkflowType();
}

function saveSettingsLocalStrage(silent){
if(!silent)createToast('设置','已保存本机设置。',1500);
apiMode=apis.NOVELAI;
var data={externalAI:apiMode};
var secrets=readSecretStore();
Object.keys(SETTINGS_SCHEMA).forEach(function(key){
var cfg=SETTINGS_SCHEMA[key];
var el=$(cfg.id);
if(!el)return;
if(cfg.secret){secrets[key]=(cfg.type==='checkbox')?el.checked:el.value;return;}
data[key]=(cfg.type==='checkbox')?el.checked:el.value;
});
writeSecretStore(secrets);
if(typeof getSelectedValueByGroup==='function'){
try{data.panelLayoutMode=getSelectedValueByGroup('panelLayoutMode');}catch(error){/* ignore */}
}
if($('panelLayoutTemplateSelect')){
data.panelLayoutTemplate=$('panelLayoutTemplateSelect').value;
}
Object.keys(BASEPROMPT_SCHEMA).forEach(function(key){
var cfg=BASEPROMPT_SCHEMA[key];
data[key]=basePrompt[cfg.key];
});
data.roleAssignments=providerRegistry.getAllRoleAssignments();
data.roleAssignments[AI_ROLES.Text2Image]='novelai';
data.roleAssignments[AI_ROLES.Image2Image]='novelai';
localStorage.setItem('localSettingsData',JSON.stringify(data));
}

function resetAllSettings(){
var items=[
getText('settingsResetItem1')||'API connection settings (URLs, API keys)',
getText('settingsResetItem2')||'AI image generation settings (prompts, models, etc.)',
getText('settingsResetItem3')||'Drawing tool & canvas settings',
getText('settingsResetItem4')||'Custom prompt sets',
getText('settingsResetItem5')||'UI settings (theme, sidebar, etc. - 语言已锁定为中文)',
getText('settingsResetItem6')||'Tutorial progress'
];
var overlay=document.createElement('div');
overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:var(--z-modal)';
var dialog=document.createElement('div');
dialog.style.cssText='background:var(--color-base);color:var(--color-text-primary);border-radius:8px;padding:24px;max-width:420px;width:90%;box-shadow:0 4px 24px rgba(0,0,0,0.5)';
var title=document.createElement('div');
title.style.cssText='font-size:16px;font-weight:bold;margin-bottom:12px';
title.textContent=getText('settingsResetConfirmTitle')||'The following data will be deleted:';
dialog.appendChild(title);
var list=document.createElement('ul');
list.style.cssText='margin:0 0 16px 0;padding-left:20px;line-height:1.8';
items.forEach(function(item){
var li=document.createElement('li');
li.textContent=item;
list.appendChild(li);
});
dialog.appendChild(list);
var btnRow=document.createElement('div');
btnRow.style.cssText='display:flex;justify-content:flex-end;gap:8px';
var cancelBtn=document.createElement('button');
cancelBtn.textContent=getText('settingsResetCancel')||'Cancel';
cancelBtn.style.cssText='padding:6px 16px;border:1px solid var(--color-text-secondary);border-radius:4px;background:var(--color-secondary);color:var(--color-text-primary);cursor:pointer';
var okBtn=document.createElement('button');
okBtn.textContent=getText('settingsResetOk')||'Reset';
okBtn.style.cssText='padding:6px 16px;border:none;border-radius:4px;background:var(--color-accent);color:#fff;cursor:pointer';
btnRow.appendChild(cancelBtn);
btnRow.appendChild(okBtn);
dialog.appendChild(btnRow);
overlay.appendChild(dialog);
document.body.appendChild(overlay);
cancelBtn.addEventListener('click',function(){overlay.remove();});
overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
okBtn.addEventListener('click',function(){
overlay.remove();
localStorage.clear();
sessionStorage.clear();
if('caches' in window){
caches.keys().then(function(names){
names.forEach(function(name){caches.delete(name);});
});
}
createToast('重置设置',['正在清除本机数据…','即将刷新'],1500);
setTimeout(function(){location.reload();},1500);
});
}

document.addEventListener('DOMContentLoaded',function() {
loadSettingsLocalStrage();
changeView("layer-panel",$('view_layers_checkbox').checked);
changeView("controls",$('view_controls_checkbox').checked);
if(DEBUG_FLAGS.settingsHighlight)toggleSettingsHighlight(true);
AutoSaveManager.init();
initSettingsAutoSave();
});

var settingsAutoSaveTimer=null;
function debouncedSettingsSave(){
if(settingsAutoSaveTimer)clearTimeout(settingsAutoSaveTimer);
settingsAutoSaveTimer=setTimeout(function(){
saveSettingsLocalStrage(true);
},500);
}

function initSettingsAutoSave(){
var chk=$('settingsAutoSaveCheckbox');
if(!chk)return;
chk.addEventListener('change',function(){
saveSettingsLocalStrage(true);
});
var idSet={};
Object.keys(SETTINGS_SCHEMA).forEach(function(key){
var cfg=SETTINGS_SCHEMA[key];
if(cfg.id)idSet[cfg.id]=true;
});
Object.keys(BASEPROMPT_SCHEMA).forEach(function(key){
var cfg=BASEPROMPT_SCHEMA[key];
if(cfg.id)idSet[cfg.id]=true;
});
document.addEventListener('input',function(e){
if(!chk.checked||!e.target||!e.target.id)return;
if(e.target.id==='settingsAutoSaveCheckbox')return;
if(idSet[e.target.id])debouncedSettingsSave();
});
document.addEventListener('change',function(e){
if(!chk.checked||!e.target||!e.target.id)return;
if(e.target.id==='settingsAutoSaveCheckbox')return;
if(idSet[e.target.id])debouncedSettingsSave();
});
}

document.addEventListener('DOMContentLoaded',function() {
$('svgDownload').onclick=function () {
var svg=canvas.toSVG();
svgDownload('canvas.svg',svg);
};
});


function svgDownload(filename,content) {
var element=document.createElement('a');
element.setAttribute('href','data:image/svg+xml;charset=utf-8,'+encodeURIComponent(content));
element.setAttribute('download',filename);
element.style.display='none';
document.body.appendChild(element);
element.click();
document.body.removeChild(element);
}
