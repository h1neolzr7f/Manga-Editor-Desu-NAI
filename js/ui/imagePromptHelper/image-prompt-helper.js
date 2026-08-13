let iphData={};
let iphSelected=[];
let iphImageCache=new Map();
let iphMissingImageCache=new Set();
let iphActiveMajorIdx=0;
let iphActiveCat=null;
let iphActiveSub=null;
let iphSearchQuery='';

var iphMajors=[
{name:'iphMajorHuman',icon:'person',color:'human',cats:['Hair','Face','Expression','Body Type','Age','Skin','Makeup']},
{name:'iphMajorOutfit',icon:'checkroom',color:'outfit',cats:['Clothing','Footwear']},
{name:'iphMajorCamera',icon:'photo_camera',color:'camera',cats:['Camera','Pose','Number of People']},
{name:'iphMajorScene',icon:'landscape',color:'scene',cats:['Background','Light Source']},
{name:'iphMajorStyle',icon:'palette',color:'style',cats:['Quality','Color','Art Style','Set Style','Custom Set']}
];
var iphI18nMap={
'Hair':'iphCatHair','Face':'iphCatFace','Expression':'iphCatExpression',
'Body Type':'iphCatBodyType','Age':'iphCatAge','Skin':'iphCatSkin','Makeup':'iphCatMakeup',
'Clothing':'iphCatClothing','Footwear':'iphCatFootwear',
'Camera':'iphCatCamera','Pose':'iphCatPose','Number of People':'iphCatNumberOfPeople',
'Background':'iphCatBackground','Light Source':'iphCatLightSource',
'Quality':'iphCatQuality','Color':'iphCatColor','Art Style':'iphCatArtStyle',
'Set Style':'iphCatSetStyle','Custom Set':'iphCatCustomSet',
'Hair Style':'iphSubHairStyle','Hair Length':'iphSubHairLength',
'Hair Texture':'iphSubHairTexture','Hair Color':'iphSubHairColor',
'Eyes':'iphSubEyes','Mouth':'iphSubMouth','Nose':'iphSubNose',
'Joy':'iphSubJoy','Anger':'iphSubAnger','Sad':'iphSubSad','Anxious':'iphSubAnxious',
'Breast':'iphSubBreast',
'Skin Tone':'iphSubSkinTone','Skin Texture':'iphSubSkinTexture',
'Overall Makeup':'iphSubOverallMakeup','Eyebrows':'iphSubEyebrows',
'Eyeshadow':'iphSubEyeshadow','Cheeks':'iphSubCheeks','Lips':'iphSubLips',
'Tops':'iphSubTops','Outerwear':'iphSubOuterwear','Bottoms':'iphSubBottoms',
'Skirt':'iphSubSkirt','Dress':'iphSubDress',
'Shoes':'iphSubShoes','Socks':'iphSubSocks',
'Gaze':'iphSubGaze','Camera Angle':'iphSubCameraAngle','Shot':'iphSubShot','Focus':'iphSubFocus',
'Gesture':'iphSubGesture','Movement':'iphSubMovement',
'Weather/Sky':'iphSubWeatherSky','Nature':'iphSubNature','Indoor':'iphSubIndoor',
'Commercial':'iphSubCommercial','Public Facility':'iphSubPublicFacility',
'Position':'iphSubPosition','Effect':'iphSubEffect','Intensity':'iphSubIntensity',
'Style':'iphSubStyle',
'NAI Quality':'iphSubNaiQuality','NAI Negative':'iphSubNaiNegative',
'Hair Detail':'iphSubHairDetail','Eye Detail':'iphSubEyeDetail','Mouth Detail':'iphSubMouthDetail',
'School Uniform':'iphSubSchoolUniform','Traditional Outfit':'iphSubTraditionalOutfit',
'Fantasy Outfit':'iphSubFantasyOutfit','Accessories':'iphSubAccessories',
'Hand Gesture':'iphSubHandGesture','Action Pose':'iphSubActionPose',
'Manga Panel':'iphSubMangaPanel','Lens':'iphSubLens','Group':'iphSubGroup',
'Urban':'iphSubUrban','Fantasy Scene':'iphSubFantasyScene','Mood Atmosphere':'iphSubMoodAtmosphere',
'Comic Effect':'iphSubComicEffect','Linework':'iphSubLinework','NAI Preset':'iphSubNaiPreset',
'Core Emotion':'核心表情','Framing':'画面取景','Panel Flow':'分镜流程',
'Director Composition':'导演构图','Time & Weather':'时间天气','Story Locations':'故事地点',
'Director Lighting':'导演光影','Manga Effect':'漫画效果','NAI Render Style':'NAI 渲染风格',
'AI Director Preset':'AI 导演预设'
};

function iphGetTagLabel(tagObj) {
return (tagObj&&tagObj.alias)||((tagObj&&tagObj.tag)||'');
}

function iphGetFallbackInitial(label) {
label=(label||'TAG').toString().trim();
if(!label)return 'TAG';
var words=label.replace(/[_-]+/g,' ').split(/\s+/).filter(Boolean);
if(words.length>=2)return (words[0][0]+words[1][0]).toUpperCase();
return label.slice(0,2).toUpperCase();
}

function iphCreatePreviewFallback(label,small) {
var fallback=document.createElement('div');
fallback.className=small?'iph-thumb-fallback':'iph-card-fallback';
fallback.title=label||'无预览';

var mark=document.createElement('span');
mark.className=small?'iph-thumb-fallback-mark':'iph-card-fallback-mark';
mark.textContent=iphGetFallbackInitial(label);
fallback.appendChild(mark);

if(!small){
var caption=document.createElement('span');
caption.className='iph-card-fallback-caption';
caption.textContent='无预览';
fallback.appendChild(caption);
}
return fallback;
}

function iphShowCardFallback(card,placeholder,label) {
if(placeholder&&placeholder.parentNode)placeholder.remove();
if(card.querySelector('.iph-card-fallback'))return;
card.classList.add('iph-grid-missing-preview');
card.insertBefore(iphCreatePreviewFallback(label,false),card.firstChild);
}

function iphInitializeUI() {
iphLoadJsonAndRefresh();
iphBindEvents();
}

function iphBindEvents() {
$('iph-search-input').addEventListener('input',function(){
iphSearchQuery=this.value.toLowerCase();
iphRenderGrid();
});

$('iph-copy-button').addEventListener('click',function(){
if(iphSelected.length>0){
var content=iphSelected.map(function(s){return s.tag;}).join(',');
navigator.clipboard.writeText(content).catch(function(err){
uiLogger.error('clipboard copy failed:',err);
});
}
});

$('iph-download-button').addEventListener('click',function(){
if(iphSelected.length>0){
var content=iphSelected.map(function(s){return s.tag;}).join(',');
var blob=new Blob([content],{type:'text/plain'});
var a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download='selected_tags.txt';
a.click();
}
});

$('iph-clear-button').addEventListener('click',function(){
iphSelected=[];
iphRenderAll();
});

$('iph-prompt-copy').addEventListener('click',function(){
var box=$('iph-prompt-box');
if(box.textContent){
navigator.clipboard.writeText(box.textContent).catch(function(err){
uiLogger.error('clipboard copy failed:',err);
});
}
});

$('iph-prompt-download').addEventListener('click',function(){
var box=$('iph-prompt-box');
if(box.textContent){
var blob=new Blob([box.textContent],{type:'text/plain'});
var a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download='prompt.txt';
a.click();
}
});
}

function iphLoadJsonAndRefresh() {
iphData={};
iphLoadLocalStorage()
.then(()=>iphLoadData())
.then(()=>{
iphRefreshUI();
});
}

function iphLoadLocalStorage() {
return new Promise((resolve)=>{
var customSetJson=localStorage.getItem('CustomSet');
if(customSetJson){
var customSet=JSON.parse(customSetJson);
if(customSet&&customSet['Custom Set']){
iphData['Custom Set']={};
Object.entries(customSet['Custom Set']).forEach(([name,content])=>{
iphData['Custom Set'][name]={
url:content.url,
alias:content.alias
};
});
}
}
resolve();
});
}

function iphIsPlainObject(value) {
return value&&typeof value==='object'&&!Array.isArray(value);
}

function iphDeepMerge(target,source) {
if(!iphIsPlainObject(source)) return target;
Object.keys(source).forEach(function(key){
var sourceValue=source[key];
var targetValue=target[key];
var isTagObject=iphIsPlainObject(sourceValue)&&sourceValue.hasOwnProperty('url');
if(iphIsPlainObject(sourceValue)&&iphIsPlainObject(targetValue)&&!isTagObject){
iphDeepMerge(targetValue,sourceValue);
}else{
target[key]=sourceValue;
}
});
return target;
}

function iphRefreshUI() {
iphActiveMajorIdx=0;
iphActiveCat=null;
iphActiveSub=null;
iphSelected=[];
iphSearchQuery='';
$('iph-search-input').value='';
iphRenderAll();
}

function iphRenderAll() {
iphRenderMajorTabs();
iphRenderCatPanel();
iphRenderGrid();
iphRenderSelList();

iphRenderPrompt();
iphUpdateButtons();
}

async function iphLoadData() {
// 中文单语言模式：强制中文数据，不做英文过滤
localStorage.setItem('language','zh');

try{
await Promise.all([
loadJS('json_js/00_base.js','head'),
loadJS('json_js/00_novelai_materials.js?v=8.0','head')
]);

iphDeepMerge(iphData,window.base||{});
iphDeepMerge(iphData,window.novelai_materials||{});

// 不再支持英文过滤
uiLogger.debug('Data loaded successfully (中文单语言)');
}catch(error){
uiLogger.error('Error loading data:',error);
}
}

function iphFilterEnglishData(data) {
var filteredData={};
for(var key in data){
if(key==='hr'){
filteredData[key]=data[key];
}else if(data[key].hasOwnProperty('en')){
filteredData[data[key].en]=iphFilterEnglishData(data[key]);
}else if(typeof data[key]==='object'&&!Array.isArray(data[key])){
filteredData[key]=iphFilterEnglishData(data[key]);
}else{
filteredData[key]=data[key];
}
}
return filteredData;
}

function iphGetMajorCats(majorIdx) {
var major=iphMajors[majorIdx];
var result=[];
var dataKeys=Object.keys(iphData).filter(function(k){return!k.startsWith('horizontalLine');});
major.cats.forEach(function(catName){
if(iphData[catName]){
result.push(catName);
}else{
dataKeys.forEach(function(dk){
if(dk.toLowerCase()===catName.toLowerCase()&&result.indexOf(dk)===-1){
result.push(dk);
}else if(iphData[dk]&&iphData[dk].en&&iphData[dk].en.toLowerCase()===catName.toLowerCase()&&result.indexOf(dk)===-1){
result.push(dk);
}
});
}
});
return result;
}

function iphGetDisplayName(dataKey) {
if(!dataKey) return '';
var englishName=dataKey;
var val=iphData[dataKey];
if(val&&typeof val==='object'&&val.en) englishName=val.en;
var i18nKey=iphI18nMap[englishName];
if(i18nKey) return getText(i18nKey);
return dataKey;
}

function iphGetSubDisplayName(catName,subName) {
if(!subName) return '';
var englishName=subName;
var catData=iphData[catName];
if(catData&&catData[subName]&&typeof catData[subName]==='object'&&catData[subName].en) englishName=catData[subName].en;
var i18nKey=iphI18nMap[englishName];
if(i18nKey) return getText(i18nKey);
return subName;
}

function iphGetSubcategories(catName) {
var catData=iphData[catName];
if(!catData||typeof catData!=='object') return [];
var subs=[];
Object.keys(catData).forEach(function(key){
if(key==='en'||key==='hr'||key.startsWith('horizontalLine')) return;
if(key==='url'||key==='alias') return;
var val=catData[key];
if(typeof val==='object'&&!Array.isArray(val)){
if(!val.hasOwnProperty('url')){
subs.push(key);
}
}
});
return subs;
}

function iphGetTags(catName,subName) {
var source;
if(subName){
source=iphData[catName]&&iphData[catName][subName]?iphData[catName][subName]:null;
}else{
source=iphData[catName];
}
if(!source||typeof source!=='object') return [];
var tags=[];
Object.keys(source).forEach(function(key){
if(key==='en'||key==='hr'||key.startsWith('horizontalLine')) return;
if(key==='url'||key==='alias') return;
var val=source[key];
if(typeof val==='object'&&val.hasOwnProperty('url')){
tags.push({tag:key,url:val.url,alias:val.alias||null});
}else if(typeof val==='object'&&!Array.isArray(val)){
var hasUrl=false;
Object.keys(val).forEach(function(k2){
if(k2==='url'||k2==='alias'||k2==='en'||k2==='hr'||k2.startsWith('horizontalLine')) return;
var v2=val[k2];
if(typeof v2==='object'&&v2.hasOwnProperty('url')){
tags.push({tag:k2,url:v2.url,alias:v2.alias||null});
hasUrl=true;
}
});
if(!hasUrl&&Object.keys(val).length>0&&!val.hasOwnProperty('en')){
tags.push({tag:key,url:null,alias:val.alias||null});
}
}else if(typeof val==='string'){
tags.push({tag:key,url:null,alias:null});
}
});
return tags;
}

function iphCountSelectedInMajor(majorIdx) {
var cats=iphGetMajorCats(majorIdx);
var count=0;
iphSelected.forEach(function(s){
if(cats.indexOf(s.cat)!==-1) count++;
});
return count;
}

function iphCountSelectedInCat(catName) {
var count=0;
iphSelected.forEach(function(s){
if(s.cat===catName) count++;
});
return count;
}

function iphIsSelected(tag) {
return iphSelected.some(function(s){return s.tag===tag;});
}

function iphRenderMajorTabs() {
var container=$('iph-major-tabs');
container.innerHTML='';
iphMajors.forEach(function(major,idx){
var btn=document.createElement('button');
btn.className='iph-major-tab';
if(idx===iphActiveMajorIdx) btn.classList.add('active');
btn.setAttribute('data-color',major.color);

var icon=document.createElement('i');
icon.className='material-icons iph-tab-icon';
icon.textContent=major.icon;
btn.appendChild(icon);

var label=document.createElement('span');
label.className='iph-tab-label';
label.textContent=getText(major.name);
btn.appendChild(label);

var count=iphCountSelectedInMajor(idx);
if(count>0){
var badge=document.createElement('span');
badge.className='iph-tab-badge';
badge.textContent=count;
btn.appendChild(badge);
}

btn.addEventListener('click',function(){
iphActiveMajorIdx=idx;
iphActiveCat=null;
iphActiveSub=null;
iphRenderMajorTabs();
iphRenderCatPanel();
iphRenderGrid();
iphUpdateBreadcrumb();
});
container.appendChild(btn);
});
}

function iphRenderCatPanel() {
var container=$('iph-cat-panel');
container.innerHTML='';
var cats=iphGetMajorCats(iphActiveMajorIdx);
if(cats.length===0) return;

if(!iphActiveCat&&cats.length>0){
iphActiveCat=cats[0];
}

cats.forEach(function(catName){
var group=document.createElement('div');
group.className='iph-cat-group';

var subs=iphGetSubcategories(catName);
var selCount=iphCountSelectedInCat(catName);
var isActive=iphActiveCat===catName;

var header=document.createElement('button');
header.className='iph-cat-header';
if(isActive&&!iphActiveSub) header.classList.add('active');

if(subs.length>0){
var arrow=document.createElement('span');
arrow.className='iph-cat-arrow';
if(isActive) arrow.classList.add('open');
arrow.textContent='\u25B6';
header.appendChild(arrow);
}

var nameSpan=document.createElement('span');
nameSpan.className='iph-cat-name';
nameSpan.textContent=iphGetDisplayName(catName);
header.appendChild(nameSpan);

if(selCount>0){
var countSpan=document.createElement('span');
countSpan.className='iph-cat-count';
countSpan.textContent='('+selCount+')';
header.appendChild(countSpan);
}

header.addEventListener('click',function(){
iphActiveCat=catName;
iphActiveSub=null;
iphRenderCatPanel();
iphRenderGrid();
iphUpdateBreadcrumb();
});
group.appendChild(header);

if(subs.length>0&&isActive){
var subList=document.createElement('div');
subList.className='iph-sub-list open';
subs.forEach(function(subName){
var subBtn=document.createElement('button');
subBtn.className='iph-sub-item';
if(iphActiveSub===subName) subBtn.classList.add('active');

var subNameSpan=document.createElement('span');
subNameSpan.textContent=iphGetSubDisplayName(catName,subName);
subBtn.appendChild(subNameSpan);

var subSelCount=0;
iphSelected.forEach(function(s){
if(s.cat===catName&&s.sub===subName) subSelCount++;
});
if(subSelCount>0){
var subCountSpan=document.createElement('span');
subCountSpan.className='iph-sub-count';
subCountSpan.textContent='('+subSelCount+')';
subBtn.appendChild(subCountSpan);
}

subBtn.addEventListener('click',function(e){
e.stopPropagation();
iphActiveSub=subName;
iphRenderCatPanel();
iphRenderGrid();
iphUpdateBreadcrumb();
});
subList.appendChild(subBtn);
});
group.appendChild(subList);
}

container.appendChild(group);
});
iphUpdateBreadcrumb();
}

function iphUpdateBreadcrumb() {
var bc=$('iph-breadcrumb');
var parts=[getText(iphMajors[iphActiveMajorIdx].name)];
if(iphActiveCat) parts.push(iphGetDisplayName(iphActiveCat));
if(iphActiveSub) parts.push(iphGetSubDisplayName(iphActiveCat,iphActiveSub));
bc.textContent=parts.join(' > ');
}

function iphRenderGrid() {
var container=$('iph-img-grid');
container.innerHTML='';
if(!iphActiveCat) return;

var tags;
var subs=iphGetSubcategories(iphActiveCat);
var isCustomSet=iphActiveCat==='Custom Set';

if(subs.length===0||iphActiveSub){
tags=iphGetTags(iphActiveCat,iphActiveSub);
}else{
tags=iphGetTags(iphActiveCat,null);
if(tags.length===0){
tags=[];
subs.forEach(function(s){
iphGetTags(iphActiveCat,s).forEach(function(t){
t._sub=s;
tags.push(t);
});
});
}
}

if(iphSearchQuery){
tags=tags.filter(function(t){
var text=(t.alias||t.tag).toLowerCase();
return text.indexOf(iphSearchQuery)!==-1;
});
}

tags.forEach(function(tagObj){
var card=document.createElement('div');
card.className='iph-grid-card';
if(iphIsSelected(tagObj.tag)) card.classList.add('selected');
if(!tagObj.url) card.classList.add('iph-grid-noimg');
var tagLabel=iphGetTagLabel(tagObj);

if(isCustomSet) card.classList.add('iph-custom-set-button');

if(tagObj.url&&!iphMissingImageCache.has(tagObj.url)){
var placeholder=document.createElement('div');
placeholder.className='iph-card-placeholder';
placeholder.textContent=getText("loading_image");
card.appendChild(placeholder);

iphLoadImage(tagObj.url).then(function(img){
placeholder.remove();
img.className='iph-card-img';
img.alt=tagLabel;
card.insertBefore(img,card.firstChild);
}).catch(function(){
iphMissingImageCache.add(tagObj.url);
iphShowCardFallback(card,placeholder,tagLabel);
});
}else{
iphShowCardFallback(card,null,tagLabel);
}

var check=document.createElement('span');
check.className='iph-card-check';
check.textContent='\u2713';
card.appendChild(check);

var label=document.createElement('div');
label.className='iph-card-label';
label.textContent=tagLabel;
card.appendChild(label);

if(isCustomSet){
var removeCS=document.createElement('span');
removeCS.className='iph-remove-custom-set';
removeCS.textContent='\u2715';
removeCS.addEventListener('click',function(e){
e.stopPropagation();
iphRemoveCustomSetItem(tagObj.tag);
});
card.appendChild(removeCS);
}

card.addEventListener('click',function(){
iphToggleTag(tagObj.tag,iphActiveCat,tagObj._sub||iphActiveSub,tagObj.url);
});
container.appendChild(card);
});
}

function iphToggleTag(tag,cat,sub,url) {
var idx=-1;
for(var i=0;i<iphSelected.length;i++){
if(iphSelected[i].tag===tag){idx=i;break;}
}
if(idx!==-1){
iphSelected.splice(idx,1);
}else{
iphSelected.push({tag:tag,cat:cat,sub:sub||null,url:url||null});
}
iphRenderGrid();
iphRenderSelList();

iphRenderPrompt();
iphRenderMajorTabs();
iphRenderCatPanel();
iphUpdateButtons();
}

function iphRenderSelList() {
var container=$('iph-sel-list');
container.innerHTML='';
if(iphSelected.length===0) return;

var groups={};
iphSelected.forEach(function(s,idx){
var majorName='';
for(var i=0;i<iphMajors.length;i++){
var cats=iphGetMajorCats(i);
if(cats.indexOf(s.cat)!==-1){
majorName=getText(iphMajors[i].name);
break;
}
}
if(!groups[majorName]) groups[majorName]=[];
groups[majorName].push({sel:s,idx:idx});
});

Object.keys(groups).forEach(function(gName){
var header=document.createElement('div');
header.className='iph-sel-group-header';
header.textContent=gName;
container.appendChild(header);

groups[gName].forEach(function(item){
var row=document.createElement('div');
row.className='iph-sel-item';

if(item.sel.url){
var thumb=document.createElement('img');
thumb.className='iph-sel-item-thumb';
thumb.src=item.sel.url;
thumb.alt='';
thumb.onerror=function(){
thumb.replaceWith(iphCreatePreviewFallback(item.sel.tag,true));
};
row.appendChild(thumb);
}else{
row.appendChild(iphCreatePreviewFallback(item.sel.tag,true));
}

var text=document.createElement('span');
text.className='iph-sel-item-text';
text.textContent=item.sel.tag;
row.appendChild(text);

var remove=document.createElement('span');
remove.className='iph-sel-item-remove';
remove.textContent='\u2715';
remove.addEventListener('click',function(e){
e.stopPropagation();
iphSelected.splice(item.idx,1);
iphRenderAll();
});
row.appendChild(remove);
container.appendChild(row);
});
});
}


function iphRenderPrompt() {
var box=$('iph-prompt-box');
var freeInput=$('iph-free-input');
var tags=iphSelected.map(function(s){return s.tag;});
var freeText=freeInput?freeInput.value.trim():'';
var parts=[];
if(freeText) parts.push(freeText);
if(tags.length>0) parts.push(tags.join(','));
box.textContent=parts.join(',');
}

function iphUpdateButtons() {
var hasSelected=iphSelected.length>0;
$('iph-copy-button').disabled=!hasSelected;
$('iph-download-button').disabled=!hasSelected;
$('iph-clear-button').disabled=!hasSelected;
var promptText=$('iph-prompt-box').textContent;
$('iph-prompt-copy').disabled=!promptText;
$('iph-prompt-download').disabled=!promptText;
}

function iphLoadImage(url) {
if(iphImageCache.has(url)){
return Promise.resolve(iphImageCache.get(url).cloneNode());
}
return new Promise(function(resolve,reject){
var img=new Image();
img.onload=function(){
iphImageCache.set(url,img);
resolve(img.cloneNode());
};
img.onerror=reject;
img.src=url;
img.alt="";
});
}

function iphRemoveCustomSetItem(itemName) {
var customSet=JSON.parse(localStorage.getItem('CustomSet')||'{"Custom Set":{}}');
if(customSet['Custom Set']&&customSet['Custom Set'][itemName]){
delete customSet['Custom Set'][itemName];
localStorage.setItem('CustomSet',JSON.stringify(customSet));
if(iphData['Custom Set']&&iphData['Custom Set'][itemName]){
delete iphData['Custom Set'][itemName];
}
var idx=-1;
for(var i=0;i<iphSelected.length;i++){
if(iphSelected[i].tag===itemName){idx=i;break;}
}
if(idx!==-1) iphSelected.splice(idx,1);
iphRenderAll();
}
}

function iphGetSelectedTagsText() {
return iphSelected.map(function(s){return s.tag;}).join(', ');
}
