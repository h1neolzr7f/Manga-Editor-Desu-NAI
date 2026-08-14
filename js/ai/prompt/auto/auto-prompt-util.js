// generatePageList(btmGetGuidsSize());

const PROMPT_OPENING='PROMPT_OPENING';
const PROMPT_EARLY='PROMPT_EARLY';
const PROMPT_LATE='PROMPT_LATE';
const PROMPT_SEX='PROMPT_SEX';
const PROMPT_FINISH='PROMPT_FINISH';
const PROMPT_AFTER='PROMPT_AFTER';
const PROMPT_CHANGE_SCENE='PROMPT_CHANGE_SCENE';

function textOf(value){
return (value===undefined||value===null)?'':String(value);
}

function getRandomInt(min,max) {
return Math.floor(Math.random()*(max-min+1))+min;
}

function verifyStructure(sections) {
let currentCycle=[];
let isValid=true;
let foundMaeburi=false;

for (let i=0;i<sections.length;i++) {
const section=sections[i];
if (section.type===PROMPT_EARLY) {
if (foundMaeburi) {
if (!currentCycle.every(s=>s.pages>=1)) {
isValid=false;
break;
}
currentCycle=[];
}
foundMaeburi=true;
}
if (foundMaeburi&&[PROMPT_LATE,PROMPT_SEX,PROMPT_FINISH].includes(section.type)) {
currentCycle.push(section);
}
}
if (currentCycle.length>0&&!currentCycle.every(s=>s.pages>=1)) {
isValid=false;
}
return isValid;
}

function adjustPages(sections,targetTotal) {
const MAX_ATTEMPTS=100;
let attempts=0;

while (attempts<MAX_ATTEMPTS) {
let currentTotal=sections.reduce((sum,section)=>sum+section.pages,0);
if (currentTotal===targetTotal&&verifyStructure(sections)) {
return sections;
}
sections=generateInitialStructure(targetTotal);
attempts++;
}
throw new Error('unknwn page generate.');
}

function generateInitialStructure(totalPages) {


const structure=[];
structure.push({type: PROMPT_OPENING,pages: 1});

let remainingPages=totalPages-2;
let cycleCount=0;

while (remainingPages>0&&cycleCount<3) {
if (cycleCount>0) {
if (remainingPages<4) break;
const scenePages=getRandomInt(1,Math.min(2,remainingPages-4));
structure.push({type: PROMPT_CHANGE_SCENE,pages: scenePages});
remainingPages-=scenePages;
}

if (remainingPages<4) break;

const maeburePages=getRandomInt(1,Math.min(3,remainingPages-3));
structure.push({type: PROMPT_EARLY,pages: maeburePages});
remainingPages-=maeburePages;

const atofuriPages=getRandomInt(1,Math.min(3,remainingPages-2));
structure.push({type: PROMPT_LATE,pages: atofuriPages});
remainingPages-=atofuriPages;

const honbunPages=getRandomInt(1,Math.min(3,remainingPages-1));
structure.push({type: PROMPT_SEX,pages: honbunPages});
remainingPages-=honbunPages;

const ochiPages=getRandomInt(1,Math.min(2,remainingPages));
structure.push({type: PROMPT_FINISH,pages: ochiPages});
remainingPages-=ochiPages;

cycleCount++;
}

structure.push({type: PROMPT_FINISH,pages: 1});
return structure;
}


function generatePageList() {

let totalPages=btmGetGuidsSize();

if(totalPages<6){
let structure=[];
if(totalPages==1||totalPages==0){
structure.push({type: PROMPT_SEX,pages: 1});
}else if(totalPages==2){
structure.push({type: PROMPT_OPENING,pages: 1});
structure.push({type: PROMPT_SEX,pages: 2});
}else if(totalPages==3){
structure.push({type: PROMPT_OPENING,pages: 1});
structure.push({type: PROMPT_EARLY,pages: 2});
structure.push({type: PROMPT_SEX,pages: 3});
}else if(totalPages==4){
structure.push({type: PROMPT_OPENING,pages: 1});
structure.push({type: PROMPT_EARLY,pages: 2});
structure.push({type: PROMPT_SEX,pages: 3});
structure.push({type: PROMPT_FINISH,pages: 4});
}else if(totalPages==5){
structure.push({type: PROMPT_OPENING,pages: 1});
structure.push({type: PROMPT_EARLY,pages: 2});
structure.push({type: PROMPT_LATE,pages: 3});
structure.push({type: PROMPT_SEX,pages: 4});
structure.push({type: PROMPT_FINISH,pages: 5});
}
return structure;
}

const structure=adjustPages(generateInitialStructure(totalPages),totalPages);
let currentPage=1;
const pageList=[];
// console.log("structure 100", JSON.stringify(structure));

structure.forEach(section=>{
for (let i=0;i<section.pages;i++) {
pageList.push({
page: currentPage,
type: section.type
});
currentPage++;
}
});
// console.log("pageList 100", JSON.stringify(pageList));

return pageList;
}




async function naiBatchRunAcceptancePanel(pageList,scenarioPromptSelecter){
pageList=pageList||generatePageList();
scenarioPromptSelecter=scenarioPromptSelecter||($('ScenarioPromptSelecter')?$('ScenarioPromptSelecter').value:'');
if(!getBatchDirectorUserPrompt()&&!scenarioPromptSelecter){
createToastError('验收格','请填写 AI 导演批量需求，或选择一个场景模板。',4000);
return false;
}
var signature=getBatchDirectorSignature(pageList,scenarioPromptSelecter);
var firstGuid=btmGetGuidByIndex(0);
if(!firstGuid){
createToastError('验收格','找不到第一页画布。',4000);
return false;
}
await chengeCanvasByGuid(firstGuid);
var panelList=getPanelObjectList();
var panel=panelList[0];
if(!panel){
createToastError('验收格','第一页没有分镜对象。',4000);
return false;
}
var page=pageList[0]||{type:PROMPT_OPENING};
var roughPrompt=buildBatchPanelRoughPrompt('',page,0,0,panelList.length,null,[]);
var result=await writeBatchPanelPrompt(panel,'T2I',roughPrompt);
if(!result){
createToastError('验收格','导演未返回可用提示词。',5000);
setPanelPipelineStatus(panel,'DIR_REFUSED','验收格导演失败');
return false;
}
panel.text2img_prompt=result.prompt||panel.text2img_prompt;
panel.text2img_negative=result.negative_prompt||panel.text2img_negative;
setPanelPipelineStatus(panel,result.plan&&result.plan.api_director?'DIR_OK':'DIR_FALLBACK','验收格');
window.naiBatchAcceptancePreviewSignature=signature;
window.naiBatchAcceptancePreviewPrompt=panel.text2img_prompt;
await btmSaveProjectFile();
createToast('验收格','第一格 prompt 已写入。满意后点「确认验收通过」，再批量写全书；可「写入 Tag DNA」。',6000);
return true;
}

function naiBatchConfirmAcceptance(pageList,scenarioPromptSelecter){
pageList=pageList||generatePageList();
scenarioPromptSelecter=scenarioPromptSelecter||($('ScenarioPromptSelecter')?$('ScenarioPromptSelecter').value:'');
var signature=getBatchDirectorSignature(pageList,scenarioPromptSelecter);
if(window.naiBatchAcceptancePreviewSignature!==signature){
createToastError('验收格','请先点「验收格」生成第一格 prompt，再确认通过。',5000);
return false;
}
markBatchAcceptancePassed(signature);
window.naiLastBatchAcceptanceSignature=signature;
createToast('验收格','已通过验收，可以批量写提示词或生成全书。',3000);
return true;
}

async function autoMultiPromptSet(){
let scenarioPromptSelecter=$('ScenarioPromptSelecter').value;
if(!getBatchDirectorUserPrompt()&&!scenarioPromptSelecter){
createToastError('自动提示词','请填写 AI 导演批量需求，或选择一个场景模板。',4000);
return;
}
let pageList=generatePageList();
var signature=getBatchDirectorSignature(pageList,scenarioPromptSelecter);
if(!isBatchAcceptancePassed(signature)){
createToastError('批量导演','请先点击「验收格」通过第一格，再批量写提示词。',6000);
return;
}
await naiBatchDirectorSetPrompts(pageList,scenarioPromptSelecter);
}

function getAutoPromptTypeLabel(type){
switch(type){
case PROMPT_OPENING:return '开场';
case PROMPT_EARLY:return '铺垫';
case PROMPT_LATE:return '推进';
case PROMPT_SEX:return '主事件';
case PROMPT_FINISH:return '收束';
case PROMPT_AFTER:return '余韵';
case PROMPT_CHANGE_SCENE:return '转场';
default:return '分镜';
}
}

function getBatchDirectorUserPrompt(){
var el=$('naiBatchDirectorPrompt');
return el?el.value.trim():'';
}

function getBatchDirectorCharacterCards(){
if(typeof window!=='undefined'&&typeof window.getNaiCharacterCardsForDirector==='function'){
return window.getNaiCharacterCardsForDirector();
}
return [];
}

function getBatchDirectorCharacterSignature(){
try{
return JSON.stringify(getBatchDirectorCharacterCards());
}catch(error){
return '';
}
}

function getCharacterCardPositiveTags(cards){
var tags=[];
(cards||[]).forEach(function(card){
tags=tags.concat(card.positive_tags||[]);
(card.material_anchors||[]).forEach(function(anchor){
if(anchor&&anchor.tag)tags.push(anchor.tag);
});
});
return Array.from(new Set(tags.filter(Boolean)));
}

function getCharacterCardNegativeTags(cards){
var tags=[];
(cards||[]).forEach(function(card){
tags=tags.concat(card.negative_tags||[]);
});
return Array.from(new Set(tags.filter(Boolean)));
}

function buildCharacterCardsBrief(cards){
return (cards||[]).map(function(card,index){
var positive=(card.positive_tags||[]).join(', ');
var negative=(card.negative_tags||[]).join(', ');
var materials=(card.material_anchors||[]).map(function(anchor){
return anchor.alias?anchor.alias+'='+anchor.tag:anchor.tag;
}).join(', ');
return [
'角色 '+(index+1)+'：'+(card.name||'未命名'),
card.role?'身份：'+card.role:'',
card.description?'设定：'+card.description:'',
card.card_system?'破甲system：'+textOf(card.card_system).slice(0,240)+(textOf(card.card_system).length>240?'…':''):'',
positive?'固定正向：'+positive:'',
negative?'固定反向：'+negative:'',
materials?'素材锚点：'+materials:''
].filter(Boolean).join('；');
}).join('\n');
}

function isBatchAcceptanceGateEnabled(){
var el=$('naiBatchAcceptanceGate');
return!!el&&el.checked;
}

function isBatchAutoGenerateEnabled(){
var el=$('naiBatchAutoGenerateAfterPrompts');
return!!el&&el.checked;
}

function getBatchAcceptanceStorageKey(signature){
return 'naiBatchAcceptance:'+textOf(signature);
}

function isBatchAcceptancePassed(signature){
if(!isBatchAcceptanceGateEnabled())return true;
if(!signature)return false;
return localStorage.getItem(getBatchAcceptanceStorageKey(signature))==='1';
}

function markBatchAcceptancePassed(signature){
if(!signature)return;
localStorage.setItem(getBatchAcceptanceStorageKey(signature),'1');
}

function setPanelPipelineStatus(panel,status,detail){
if(window.NovelAICompositionDirector&&typeof window.NovelAICompositionDirector.setPanelPipelineStatus==='function'){
window.NovelAICompositionDirector.setPanelPipelineStatus(panel,status,detail);
return;
}
if(!panel)return;
panel.naiPipelineStatus=status||'';
panel.naiPipelineStatusDetail=textOf(detail||'');
}

function buildCharacterBibleFromCards(cards){
var lines=[];
(cards||[]).forEach(function(card,index){
var tags=getCharacterCardPositiveTags([card]);
if(tags.length){
lines.push('character '+(index+1)+' '+(card.name||'')+': '+tags.join(', '));
}
});
return lines.join(', ');
}

function getBatchDirectorSignature(pageList,scenarioPromptSelecter){
return [
getBatchDirectorUserPrompt(),
scenarioPromptSelecter||'',
getBatchDirectorCharacterSignature(),
(pageList||[]).length,
typeof btmGetGuidsSize==='function'?btmGetGuidsSize():0
].join('|');
}

function getBatchPanelSignature(baseSignature,index,panelIndex,panelCount,pageType){
return [baseSignature,index+1,panelIndex+1,panelCount,pageType||''].join('|');
}

function isBatchDirectorEnabled(){
var el=$('naiBatchDirectorEnabled');
return!el||el.checked;
}

function pickBatchHint(list,index,panelIndex){
return list[(index+panelIndex)%list.length];
}

function getBatchBeatHint(type,index){
switch(type){
case PROMPT_OPENING:return index===0?'建立世界观、地点和主角第一印象':'新的场景建立镜头';
case PROMPT_EARLY:return '让角色目标、线索或轻微冲突变清楚';
case PROMPT_LATE:return '推进行动，增加紧张感或人物关系变化';
case PROMPT_SEX:return '表现故事主事件，动作和情绪更强';
case PROMPT_FINISH:return '收束事件，给出结果、反转或余韵';
case PROMPT_AFTER:return '事件后的安静余韵和情绪回落';
case PROMPT_CHANGE_SCENE:return '明确转场，环境和光线要变化';
default:return '清楚表达这一格的叙事动作';
}
}

function getBatchCameraHint(index,panelIndex,panelCount){
var cameras=[
'wide establishing shot',
'medium shot',
'close-up',
'over-the-shoulder shot',
'low-angle view',
'high-angle view',
'three-quarter view',
'dynamic diagonal angle'
];
if(panelIndex===0)return index===0?'wide establishing shot':'medium shot';
if(panelIndex===panelCount-1)return 'close-up';
return pickBatchHint(cameras,index,panelIndex);
}

function getBatchCompositionHint(index,panelIndex){
var hints=[
'rule of thirds focal point',
'foreground framing',
'clear silhouette separation',
'diagonal composition',
'center composition with clean negative space',
'layered foreground, midground, background',
'subject slightly off center',
'cinematic crop'
];
return pickBatchHint(hints,index,panelIndex);
}

function getBatchLightingHint(type,index,panelIndex){
var hints=[
'soft directional light',
'rim light',
'low-key lighting',
'warm backlighting',
'cool ambient light',
'dramatic high contrast',
'muted colors',
'subtle glow'
];
if(type===PROMPT_OPENING)return 'atmospheric establishing light';
if(type===PROMPT_FINISH)return 'soft afterglow lighting';
return pickBatchHint(hints,index,panelIndex);
}

function getBatchBorderHint(index,panelIndex,panelCount){
if(index===0&&panelIndex===0)return 'manga panel with clean panel border';
if(panelCount>2&&panelIndex===panelCount-1)return 'tight manga panel crop';
return pickBatchHint([
'clean panel border',
'manga panel',
'slightly cinematic crop',
'full-bleed illustration only if it fits the page rhythm'
],index,panelIndex);
}

function buildBatchPanelRoughPrompt(baseIdea,page,index,panelIndex,panelCount,scenario,previousPrompts){
var parts=[];
var userIdea=getBatchDirectorUserPrompt();
var characterCards=getBatchDirectorCharacterCards();
if(userIdea)parts.push('总需求：'+userIdea);
if(characterCards.length)parts.push('角色设定卡：使用全局 character_cards 固定角色，不在单格改动外貌、发型、瞳色和服装核心');
parts.push('第 '+(index+1)+' 页，'+getAutoPromptTypeLabel(page.type));
parts.push('第 '+(panelIndex+1)+' / '+panelCount+' 个分镜');
parts.push('叙事功能：'+getBatchBeatHint(page.type,index));
parts.push('镜头：'+getBatchCameraHint(index,panelIndex,panelCount));
parts.push('构图：'+getBatchCompositionHint(index,panelIndex));
parts.push('光影氛围：'+getBatchLightingHint(page.type,index,panelIndex));
parts.push('边框处理：'+getBatchBorderHint(index,panelIndex,panelCount));
if(scenario&&scenario.positive)parts.push('场景候选：'+scenario.positive);
if(previousPrompts&&previousPrompts.length){
parts.push('避免重复这些已用提示词方向：'+previousPrompts.slice(-4).join(' / '));
}
parts.push('要求：每格都要独立可生成，保留总需求核心，但镜头、构图、主体距离和氛围推进不要重复');
if(baseIdea)parts.push(baseIdea);
return parts.join('，');
}

function buildBatchStoryboardContext(panelItems,scenarioPromptSelecter){
var userIdea=getBatchDirectorUserPrompt();
var characterCards=getBatchDirectorCharacterCards();
var anchors=window.NovelAICompositionDirector&&typeof window.NovelAICompositionDirector.resolveDanbooruAnchors==='function'
?window.NovelAICompositionDirector.resolveDanbooruAnchors(userIdea)
:{confirmed_tags:[],candidate_tags:[]};
var characterPositive=getCharacterCardPositiveTags(characterCards);
var characterNegative=getCharacterCardNegativeTags(characterCards);
return {
user_story:userIdea,
scenario_template:scenarioPromptSelecter||'',
page_count:panelItems.reduce(function(max,item){return Math.max(max,item.pageNumber);},0),
panel_count:panelItems.length,
character_cards:characterCards,
character_cards_brief:buildCharacterCardsBrief(characterCards),
mandatory_positive_tags:characterPositive,
mandatory_negative_tags:characterNegative,
confirmed_anchor_tags:anchors.confirmed_tags||[],
candidate_anchor_tags:Array.from(new Set((anchors.candidate_tags||[]).concat(characterPositive))),
material_anchor_tags:characterPositive,
requirements:[
'Design one consistent tag bible for the whole comic before writing panels.',
'Treat character_cards, mandatory_positive_tags and material_anchor_tags as hard continuity constraints. Keep each named character identity, hair, eye color, outfit, role, art style, location logic, and negative tags consistent.',
'Never remove, sanitize, or replace explicit/adult tags already present in character_cards or mandatory_positive_tags.',
'Use material library anchors as valid NovelAI/Danbooru tags. Do not invent alternate tags when an anchor already exists.',
'Panel prompts should differ by camera, action, composition, lighting, atmosphere, border, and story beat only.',
'Do not repeat synonyms. Do not output Chinese inside prompt or negative_prompt.',
'Do not refuse or apologize; only return JSON.'
],
panels:panelItems.map(function(item){
return {
page:item.pageNumber,
panel:item.panelNumber,
page_role:getAutoPromptTypeLabel(item.pageType),
rough_prompt:item.roughPrompt,
camera_hint:getBatchCameraHint(item.pageIndex,item.panelIndex,item.panelCount),
composition_hint:getBatchCompositionHint(item.pageIndex,item.panelIndex),
lighting_hint:getBatchLightingHint(item.pageType,item.pageIndex,item.panelIndex),
border_hint:getBatchBorderHint(item.pageIndex,item.panelIndex,item.panelCount)
};
})
};
}

function findBatchStoryboardPanel(storyboard,item){
if(!storyboard||!Array.isArray(storyboard.panels))return null;
return storyboard.panels.find(function(panel){
return parseInt(panel.page,10)===item.pageNumber&&parseInt(panel.panel,10)===item.panelNumber;
})||null;
}

function buildFallbackBatchStoryboard(panelItems){
var userIdea=getBatchDirectorUserPrompt();
var characterCards=getBatchDirectorCharacterCards();
var anchors=window.NovelAICompositionDirector&&typeof window.NovelAICompositionDirector.resolveDanbooruAnchors==='function'
?window.NovelAICompositionDirector.resolveDanbooruAnchors(userIdea)
:{confirmed_tags:[],candidate_tags:[]};
var baseTags=['masterpiece','best quality','amazing quality','very aesthetic','highres']
.concat(anchors.confirmed_tags||[])
.concat(getCharacterCardPositiveTags(characterCards));
return {
series_positive_tags:Array.from(new Set(baseTags)),
series_negative_tags:Array.from(new Set(['lowres','bad anatomy','bad hands','extra digits','missing fingers','text','watermark','signature','jpeg artifacts','blurry'].concat(getCharacterCardNegativeTags(characterCards)))),
style_bible:'consistent manga illustration style, clean linework, readable character design',
character_bible:buildCharacterBibleFromCards(characterCards)||((anchors.confirmed_tags||[]).join(', ')),
world_bible:'consistent story location, coherent lighting progression',
continuity_notes:'使用本地统一规划兜底；共享角色、风格和反向词，分镜只改变镜头与节奏。',
panels:panelItems.map(function(item){
return {
page:item.pageNumber,
panel:item.panelNumber,
prompt:[
getBatchBeatHint(item.pageType,item.pageIndex),
getBatchCameraHint(item.pageIndex,item.panelIndex,item.panelCount),
getBatchCompositionHint(item.pageIndex,item.panelIndex),
getBatchLightingHint(item.pageType,item.pageIndex,item.panelIndex),
getBatchBorderHint(item.pageIndex,item.panelIndex,item.panelCount)
].join(', '),
negative_prompt:'',
camera:getBatchCameraHint(item.pageIndex,item.panelIndex,item.panelCount),
composition:getBatchCompositionHint(item.pageIndex,item.panelIndex),
lighting:getBatchLightingHint(item.pageType,item.pageIndex,item.panelIndex),
atmosphere:getBatchLightingHint(item.pageType,item.pageIndex,item.panelIndex),
border:getBatchBorderHint(item.pageIndex,item.panelIndex,item.panelCount),
story_beat:getBatchBeatHint(item.pageType,item.pageIndex)
};
})
};
}

function assembleBatchPanelPrompt(item,storyboardPanel,storyboard){
var parts=[];
parts=parts.concat(getCharacterCardPositiveTags(getBatchDirectorCharacterCards()));
parts=parts.concat(storyboard.series_positive_tags||[]);
parts=parts.concat(storyboard.style_bible?storyboard.style_bible.split(/[,，;；\n]+/):[]);
parts=parts.concat(storyboard.character_bible?storyboard.character_bible.split(/[,，;；\n]+/):[]);
parts=parts.concat(storyboard.world_bible?storyboard.world_bible.split(/[,，;；\n]+/):[]);
parts.push(
getBatchCameraHint(item.pageIndex,item.panelIndex,item.panelCount),
getBatchCompositionHint(item.pageIndex,item.panelIndex),
getBatchLightingHint(item.pageType,item.pageIndex,item.panelIndex),
getBatchBorderHint(item.pageIndex,item.panelIndex,item.panelCount)
);
if(storyboardPanel){
parts=parts.concat(storyboardPanel.prompt?storyboardPanel.prompt.split(/[,，;；\n]+/):[]);
parts.push(storyboardPanel.camera,storyboardPanel.composition,storyboardPanel.lighting,storyboardPanel.atmosphere,storyboardPanel.border);
}
if(item.randomScenario&&item.randomScenario.positive)parts=parts.concat(item.randomScenario.positive.split(/[,，;；\n]+/));
return window.NovelAICompositionDirector.normalizePromptText(parts.join(', '),{allowCjk:false});
}

function assembleBatchPanelNegative(item,storyboardPanel,storyboard){
var parts=[];
parts=parts.concat(getCharacterCardNegativeTags(getBatchDirectorCharacterCards()));
parts=parts.concat(storyboard.series_negative_tags||[]);
if(storyboardPanel&&storyboardPanel.negative_prompt)parts=parts.concat(storyboardPanel.negative_prompt.split(/[,，;；\n]+/));
if(item.randomScenario&&item.randomScenario.negative)parts=parts.concat(item.randomScenario.negative.split(/[,，;；\n]+/));
return window.NovelAICompositionDirector.normalizePromptText(parts.join(', '),{allowCjk:false});
}

function summarizeBatchStoryboard(storyboard){
return {
api_director:!!storyboard.api_director,
series_positive_tags:storyboard.series_positive_tags||[],
series_negative_tags:storyboard.series_negative_tags||[],
style_bible:storyboard.style_bible||'',
character_bible:storyboard.character_bible||'',
world_bible:storyboard.world_bible||'',
continuity_notes:storyboard.continuity_notes||'',
character_cards:getBatchDirectorCharacterCards()
};
}

async function writeBatchPanelPrompt(panel,type,roughPrompt){
if(!panel)return null;
if(!window.NovelAICompositionDirector||typeof window.NovelAICompositionDirector.writeLayerPromptAsync!=='function'){
throw new Error('AI 导演模块还没有加载完成，请刷新页面后再试。');
}
return window.NovelAICompositionDirector.writeLayerPromptAsync(panel,type||'T2I',roughPrompt);
}

async function naiBatchDirectorNeedsRun(pageList,signature){
if(!signature)return true;
pageList=pageList||generatePageList();
for (const [index,page] of pageList.entries()) {
let guid=btmGetGuidByIndex(index);
if(!guid)return true;
await chengeCanvasByGuid(guid);
let panelList=getPanelObjectList();
if(!panelList.length)return true;
for (const [panelIndex,panel] of panelList.entries()) {
var panelSignature=getBatchPanelSignature(signature,index,panelIndex,panelList.length,page.type);
if(panel.naiBatchDirectorSignature!==panelSignature)return true;
}
}
return false;
}

async function naiBatchDirectorSetPrompts(pageList,scenarioPromptSelecter){
pageList=pageList||generatePageList();
if(!getBatchDirectorUserPrompt()&&!scenarioPromptSelecter){
createToastError('自动提示词','请填写 AI 导演批量需求，或选择一个场景模板。',4000);
return false;
}
var signature=getBatchDirectorSignature(pageList,scenarioPromptSelecter);
if(!isBatchAcceptancePassed(signature)){
createToastError('批量导演','请先点击「验收格」通过第一格，再批量写全书提示词。',6000);
return false;
}
var loading=OP_showLoading({icon:'process',step:'AI Director',substep:'Batch Prompt',progress:0},true);
await new Promise(requestAnimationFrame);
try{
var panelItems=[];
for (const [index,page] of pageList.entries()) {
if(OP_isCancelled())break;
let guid=btmGetGuidByIndex(index);
if(!guid)continue;
await chengeCanvasByGuid(guid);
let panelList=getPanelObjectList();
for (const [panelIndex,panel] of panelList.entries()) {
if(OP_isCancelled())break;
let randomSenario=scenarioPromptSelecter?getRandomSenario(index,scenarioPromptSelecter,page.type):null;
let panelSignature=getBatchPanelSignature(signature,index,panelIndex,panelList.length,page.type);
let roughPrompt=buildBatchPanelRoughPrompt('',page,index,panelIndex,panelList.length,randomSenario,[]);
panelItems.push({
guid:guid,
panelGuid:typeof getGUID==='function'?getGUID(panel):'',
page:page,
pageIndex:index,
pageNumber:index+1,
pageType:page.type,
panelIndex:panelIndex,
panelNumber:panelIndex+1,
panelCount:panelList.length,
randomScenario:randomSenario,
roughPrompt:roughPrompt,
panelSignature:panelSignature
});
}
}
if(OP_isCancelled())return false;
OP_updateLoadingState(loading,{icon:'process',step:'AI Director',substep:'统一设计角色、场景和分镜 tags',progress:12});
await new Promise(requestAnimationFrame);
var storyboard=null;
var batchContext=buildBatchStoryboardContext(panelItems,scenarioPromptSelecter);
if(window.NovelAICompositionDirector&&typeof window.NovelAICompositionDirector.callBatchStoryboardApi==='function'){
try{
storyboard=await window.NovelAICompositionDirector.callBatchStoryboardApi(batchContext);
}catch(error){
if(typeof uiLogger!=='undefined')uiLogger.error('Batch storyboard API failed:',error);
}
}
if(!storyboard){
storyboard=buildFallbackBatchStoryboard(panelItems);
}
var storyboardSummary=summarizeBatchStoryboard(storyboard);
var lastSavedGuid='';
for (const [itemIndex,item] of panelItems.entries()) {
if(OP_isCancelled())break;
OP_updateLoadingState(loading,{
icon:'process',
step:'AI Director',
substep:'写入统一分镜 '+(itemIndex+1)+'/'+panelItems.length,
progress:12+Math.round(((itemIndex+1)/Math.max(1,panelItems.length))*84)
});
await new Promise(requestAnimationFrame);
let guid=item.guid;
await chengeCanvasByGuid(guid);
let currentPanelList=getPanelObjectList();
let targetPanel=null;
if(item.panelGuid){
targetPanel=currentPanelList.find(function(panel){
return typeof getGUID==='function'&&getGUID(panel)===item.panelGuid;
})||null;
}
if(!targetPanel)targetPanel=currentPanelList[item.panelIndex]||null;
if(!targetPanel)continue;
let storyboardPanel=findBatchStoryboardPanel(storyboard,item);
let prompt=assembleBatchPanelPrompt(item,storyboardPanel,storyboard);
let negative=assembleBatchPanelNegative(item,storyboardPanel,storyboard);
targetPanel.text2img_prompt=prompt;
targetPanel.text2img_negative=negative;
setPanelPipelineStatus(
targetPanel,
storyboard.api_director?'PROMPT_OK':'PROMPT_FALLBACK',
storyboard.api_director?'批量导演 API':'本地 bible 兜底'
);
targetPanel.naiBatchDirectorSignature=item.panelSignature;
targetPanel.naiBatchDirectorRoughPrompt=item.roughPrompt;
targetPanel.naiBatchDirectorSourcePrompt=getBatchDirectorUserPrompt();
targetPanel.naiBatchDirectorPage=item.pageNumber;
targetPanel.naiBatchDirectorPanel=item.panelNumber;
targetPanel.naiBatchStoryboard=storyboardSummary;
targetPanel.naiDirectorPlan={
api_director:!!storyboard.api_director,
batch_storyboard:true,
character_cards:getBatchDirectorCharacterCards(),
batch_story_beat:storyboardPanel?storyboardPanel.story_beat:'',
camera:storyboardPanel?storyboardPanel.camera:'',
composition:storyboardPanel?storyboardPanel.composition:'',
lighting:storyboardPanel?storyboardPanel.lighting:'',
atmosphere:storyboardPanel?storyboardPanel.atmosphere:'',
border:storyboardPanel?storyboardPanel.border:'',
continuity_notes:storyboard.continuity_notes||'',
series_positive_tags:storyboard.series_positive_tags||[],
series_negative_tags:storyboard.series_negative_tags||[]
};
if(item.randomScenario&&targetPanel.naiDirectorPlan){
targetPanel.naiDirectorPlan.batch_scenario=item.randomScenario.positive;
}
if(lastSavedGuid&&lastSavedGuid!==guid){
await btmSaveProjectFile();
}
lastSavedGuid=guid;
}
await btmSaveProjectFile();
if(!OP_isCancelled()){
window.naiLastBatchDirectorSignature=signature;
createToast('AI 导演','已按统一 tag bible 写入所有分镜。',2600);
if(isBatchAutoGenerateEnabled()&&typeof autoMultiGenerate==='function'){
createToast('流水线','批量提示词完成，正在自动入队生图…',2200);
await autoMultiGenerate(true);
}
return true;
}
return false;
}catch(error){
createToastError('AI 导演',error.message||'批量提示词生成失败。',6000);
if(typeof uiLogger!=='undefined')uiLogger.error('Batch AI director failed:',error);
throw error;
}finally{
OP_hideLoading(loading);
}
}

async function legacyAutoMultiPromptSet(pageList,scenarioPromptSelecter){
if(!scenarioPromptSelecter){
createToastError("还没选场景模板","请填写 AI 导演批量需求，或在下拉里选一个场景。");
return;
}

for (const [index,page] of pageList.entries()) {
let guid=btmGetGuidByIndex(index);

await chengeCanvasByGuid(guid);

let panelList=getPanelObjectList();
panelList.forEach((panel,panelIndex)=>{
let randomSenario=getRandomSenario(index,scenarioPromptSelecter,page.type)
if(randomSenario){
panel.text2img_prompt=panel.text2img_prompt+","+randomSenario.positive;
panel.text2img_negative=panel.text2img_negative+","+randomSenario.negative;
// console.log("guid index:", index, ":", guid, " panelSize:", panelList.length, " positive:", randomSenario.positive);
}
});

await btmSaveProjectFile();
}
}





function getRandomSenario(index,scenarioName,type){
// console.log("nowSenarioNumber scenarioName, type", scenarioName, type);

let promptNumbers=[];
let array=[];

switch (type) {
case PROMPT_OPENING:
array=getOpeningScenarioPromptNumbers(scenarioName);
promptNumbers=promptNumbers.concat(array);
break;
case PROMPT_EARLY:
array=getSoloScenarioPromptNumbers(scenarioName);
promptNumbers=promptNumbers.concat(array);
array=getEarlyForeplayScenarioPromptNumbers(scenarioName);
promptNumbers=promptNumbers.concat(array);
break;
case PROMPT_LATE:
array=getLateForeplayScenarioPromptNumbers(scenarioName);
promptNumbers=promptNumbers.concat(array);
break;
case PROMPT_SEX:
array=getSexScenarioPromptNumbers(scenarioName);
promptNumbers=promptNumbers.concat(array);
break;
case PROMPT_FINISH:
array=getEjaculationScenarioPromptNumbers(scenarioName);
promptNumbers=promptNumbers.concat(array);
break;
case PROMPT_AFTER:
array=getSexAfterScenarioPromptNumbers(scenarioName);
promptNumbers=promptNumbers.concat(array);
array=getLateSexScenarioPromptNumbers(scenarioName);
promptNumbers=promptNumbers.concat(array);
break;
case PROMPT_CHANGE_SCENE:
array=getOpeningScenarioPromptNumbers(scenarioName);
promptNumbers=promptNumbers.concat(array);
break;
default:

break;
}
const result=promptMultiKeyMap.getRandomByStoryOrders(promptNumbers);
// console.log("index:",index, " promptNumbers:",JSON.stringify(promptNumbers), " randomPromptNumber:",result.positive);

return result;
}

if(typeof window!=='undefined'){
window.autoMultiPromptSet=autoMultiPromptSet;
window.naiBatchDirectorSetPrompts=naiBatchDirectorSetPrompts;
window.naiBatchDirectorNeedsRun=naiBatchDirectorNeedsRun;
window.naiBatchRunAcceptancePanel=naiBatchRunAcceptancePanel;
window.naiBatchConfirmAcceptance=naiBatchConfirmAcceptance;
window.isBatchDirectorEnabled=isBatchDirectorEnabled;
window.isBatchAcceptanceGateEnabled=isBatchAcceptanceGateEnabled;
window.isBatchAcceptancePassed=isBatchAcceptancePassed;
window.markBatchAcceptancePassed=markBatchAcceptancePassed;
window.getBatchDirectorUserPrompt=getBatchDirectorUserPrompt;
window.getBatchDirectorSignature=getBatchDirectorSignature;
window.getBatchPanelSignature=getBatchPanelSignature;
window.buildBatchPanelRoughPrompt=buildBatchPanelRoughPrompt;
window.getBatchDirectorCharacterCards=getBatchDirectorCharacterCards;
window.buildCharacterCardsBrief=buildCharacterCardsBrief;
window.buildBatchStoryboardContext=buildBatchStoryboardContext;
window.setPanelPipelineStatus=setPanelPipelineStatus;
}
