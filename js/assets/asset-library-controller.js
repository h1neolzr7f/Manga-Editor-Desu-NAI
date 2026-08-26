(function(root){
"use strict";

var store=root.NaiComicAssetStoreDefault;
var initialized=false;
var currentGroup='site-ui';
var currentPage=0;
var PAGE_SIZE=48;
var renderTimer=0;
var FREE_GROUPS={kenney:true,icon:true,all:true};
var SITE_TEMPLATES={tube:'video-tube-generic',danmaku:'danmaku-player-generic',board:'image-board-generic'};
var GROUPS={
'all':function(){return true;},
'recent':function(){return true;},
'site-ui':function(asset){return hasTag(asset,'site-ui');},
'tube':function(asset){return hasTag(asset,'tube');},
'danmaku':function(asset){return hasTag(asset,'danmaku');},
'board':function(asset){return hasTag(asset,'board');},
'manga':function(asset){return hasTag(asset,'starter');},
'kenney':function(asset){return hasTag(asset,'kenney');},
'icon':function(asset){return hasTag(asset,'heroicons')||hasTag(asset,'tabler')||hasTag(asset,'icon');},
'bubble':function(asset){return hasTag(asset,'bubble');},
'paper':function(asset){return hasTag(asset,'paper')||hasTag(asset,'pattern');},
'imported':function(asset){return asset.sourceType==='imported';}
};

function element(id){return typeof document!=='undefined'?document.getElementById(id):null;}

function hasTag(asset,tag){
return (asset.tags||[]).indexOf(tag)>=0;
}

function status(message,isError){
var target=element('assetLibraryStatus');
if(!target)return;
target.textContent=message;
target.classList.toggle('is-error',!!isError);
}

function templateFor(asset){
if(hasTag(asset,'tube'))return SITE_TEMPLATES.tube;
if(hasTag(asset,'danmaku'))return SITE_TEMPLATES.danmaku;
if(hasTag(asset,'board'))return SITE_TEMPLATES.board;
return '';
}

function renderSoon(){
clearTimeout(renderTimer);
renderTimer=setTimeout(render,80);
}

function ensureFreePack(){
if(!FREE_GROUPS[currentGroup])return Promise.resolve(null);
if(!root.NaiComicFreePack||typeof root.NaiComicFreePack.seed!=='function')return Promise.resolve(null);
if(root.NaiComicFreePack.alreadySeeded&&root.NaiComicFreePack.alreadySeeded(store))return Promise.resolve({already:true});
status('正在加载免费图标包，请稍候…',false);
return root.NaiComicFreePack.seed(store).then(function(result){
if(result&&result.already)return result;
if(result&&result.total)status('已加载免费图标 '+result.total+' 件。可用搜索缩小范围。',false);
return result;
});
}

function insertSiteTemplate(templateId,name){
if(!root.NaiComicSimulatorStudio||typeof root.NaiComicSimulatorStudio.open!=='function'){
return Promise.reject(new Error('模拟器未加载。'));
}
root.NaiComicSimulatorStudio.open({tab:'web',templateId:templateId,message:'已进入对应模拟器。在里面改字、播放，需要时再放入漫画。'});
status('已打开「'+(name||templateId)+'」模拟器。',false);
return Promise.resolve();
}

function addAsset(asset,point){
if(!asset)return Promise.reject(new Error('素材不存在。'));
if(root.NaiComicSiteUiParts&&root.NaiComicSiteUiParts.has(asset.id)){
return root.NaiComicSiteUiParts.place(asset.id,null,{origin:point||{left:48,top:80},previous:null}).then(function(){
status('已添加可改字的 '+asset.name+'。双击文字改播放量、评论、标题。',false);
});
}
return store.addToCanvas(asset.id,point);
}

function render(){
var list=element('assetLibraryList');
if(!list||!store)return;
var query=element('assetLibrarySearch');
var tags=element('assetLibraryTags');
var text=String(query&&query.value||'').trim();
var wanted=String(tags&&tags.value||'').split(',').map(function(value){return value.trim();}).filter(Boolean);
var assets=currentGroup==='recent'?store.recent(24):store.search(text,wanted).filter(function(asset){
var check=GROUPS[currentGroup]||GROUPS.all;
return check(asset);
});
var total=store.list().length;
list.innerHTML='';
list.className='asset-library-list is-grid';
if(!assets.length){
list.className='asset-library-list';
list.textContent=currentGroup==='recent'?'还没有最近使用的素材。拖入或添加后会出现在这里。':(total?'这个分类下没有匹配项。换「站点界面」或搜索名称。':'还没有素材。点「恢复入门包」载入站点界面、漫画装饰和免费包。');
return;
}
var capGroup=currentGroup==='all'||currentGroup==='kenney'||currentGroup==='icon';
var paged=false;
var pageCount=1;
if(capGroup&&!text&&!wanted.length){
pageCount=Math.max(1,Math.ceil(assets.length/PAGE_SIZE));
if(currentPage>=pageCount)currentPage=pageCount-1;
if(currentPage<0)currentPage=0;
assets=assets.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);
paged=pageCount>1;
status('共 '+total+' 件。当前第 '+(currentPage+1)+' / '+pageCount+' 页。搜索名称可直接定位。',false);
}else if(currentGroup==='site-ui'||currentGroup==='tube'||currentGroup==='danmaku'||currentGroup==='board'){
status('站点界面 '+assets.length+' 件。点「添加」放可改字零件，「编辑数据」改播放量/评论，「打开对应模拟器」进入影片站/弹幕/图区。不含真实站名。',false);
}else if(currentGroup==='recent'){
status('最近使用 '+assets.length+' 件。',false);
}else status('当前 '+assets.length+' 件 / 全库 '+total+' 件。选中分镜后再添加会铺进该格。',false);

var pager=element('assetLibraryPager');
if(pager){
pager.hidden=!paged;
var label=element('assetLibraryPageLabel');
if(label&&paged)label.textContent=(currentPage+1)+' / '+pageCount;
}

assets.forEach(function(asset){
var row=document.createElement('div');
row.className='asset-library-card'+(asset.missing?' is-missing':'');
row.draggable=!asset.missing;
row.addEventListener('dragstart',function(event){event.dataTransfer.setData('text/nai-asset-id',asset.id);});
if(asset.thumbnail){
var image=document.createElement('img');
image.src=asset.thumbnail;
image.alt=asset.name;
image.loading='lazy';
row.appendChild(image);
}
var title=document.createElement('strong');
title.textContent=asset.name;
row.appendChild(title);
var actions=document.createElement('div');
actions.className='asset-library-card-actions';
var add=document.createElement('button');
add.type='button';
add.className='simulator-chat-small-button';
add.textContent='添加';
add.disabled=asset.missing;
add.addEventListener('click',function(){
addAsset(asset).then(function(){render();}).catch(function(error){status(error.message,true);});
});
actions.appendChild(add);
var parts=root.NaiComicSiteUiParts;
if(parts&&parts.has(asset.id)){
var edit=document.createElement('button');
edit.type='button';
edit.className='simulator-chat-small-button';
edit.textContent='编辑数据';
edit.addEventListener('click',function(){
if(root.NaiComicSimulatorStudio)root.NaiComicSimulatorStudio.open({tab:'part',assetId:asset.id,message:'已进入对应模拟器。改完零件文字后可放到画布。'});
});
actions.appendChild(edit);
}
var templateId=templateFor(asset);
if(templateId){
var usePage=document.createElement('button');
usePage.type='button';
usePage.className='simulator-chat-small-button';
usePage.textContent='打开对应模拟器';
usePage.addEventListener('click',function(){
insertSiteTemplate(templateId,asset.name).catch(function(error){status(error.message,true);});
});
actions.appendChild(usePage);
}
var remove=document.createElement('button');
remove.type='button';
remove.className='simulator-chat-small-button';
remove.textContent='移除';
remove.addEventListener('click',function(){store.remove(asset.id);render();});
actions.appendChild(remove);
row.appendChild(actions);
list.appendChild(row);
});
}

function importPack(file){
var reader=new FileReader();
reader.onload=function(event){
try{var result=root.NaiComicAssetPack.importText(store,event.target.result);status('已导入 '+result.imported+' 条素材记录。',false);render();}
catch(error){status(error.message,true);}
};
reader.onerror=function(){status('素材索引读取失败。',true);};
reader.readAsText(file);
}

function bindCanvasDrop(){
var target=element('mangaImageCanvas');
if(!target)return;
target.addEventListener('dragover',function(event){event.preventDefault();});
target.addEventListener('drop',function(event){
event.preventDefault();
var id=event.dataTransfer.getData('text/nai-asset-id');
if(!id)return;
var point={left:50,top:50};
var current=typeof canvas!=='undefined'?canvas:root.canvas;
if(current&&typeof current.getPointer==='function')point=current.getPointer(event);
var dropped=store.get(id);
addAsset(dropped||{id:id},point).then(function(){status('素材已拖入画布。',false);render();}).catch(function(error){status(error.message,true);});
});
}

function bindTabs(){
var bar=element('simulatorWorkspaceTabs');
if(!bar)return;
bar.addEventListener('click',function(event){
var button=event.target.closest('[data-sim-tab]');
if(!button)return;
var tab=button.getAttribute('data-sim-tab');
bar.querySelectorAll('[data-sim-tab]').forEach(function(node){
node.classList.toggle('is-active',node.getAttribute('data-sim-tab')===tab);
});
document.querySelectorAll('[data-sim-panel]').forEach(function(panel){
panel.hidden=panel.getAttribute('data-sim-panel')!==tab;
});
});
}

function bind(){
if(initialized)return;
initialized=true;
bindTabs();
var input=element('assetLibraryInput');
if(input)input.addEventListener('change',function(){
store.addFiles(input.files,{sourceType:'imported',license:{type:'unknown',publicAllowed:false}}).then(function(results){
status('已处理 '+results.length+' 个素材文件。刷新后仍可从本机缓存加载。',false);render();
}).catch(function(error){status(error.message,true);});
});
var search=element('assetLibrarySearch');
var tags=element('assetLibraryTags');
if(search)search.addEventListener('input',function(){currentPage=0;render();});
if(tags)tags.addEventListener('input',function(){currentPage=0;render();});
var groups=element('assetLibraryGroups');
if(groups){
groups.addEventListener('click',function(event){
var button=event.target.closest('[data-group]');
if(!button)return;
currentGroup=button.getAttribute('data-group')||'all';
currentPage=0;
groups.querySelectorAll('.asset-library-group').forEach(function(node){
node.classList.toggle('is-active',node.getAttribute('data-group')===currentGroup);
});
ensureFreePack().then(function(){render();}).catch(function(error){status(error.message,true);render();});
});
}
var prev=element('assetLibraryPrev');
var next=element('assetLibraryNext');
if(prev)prev.addEventListener('click',function(){currentPage-=1;render();});
if(next)next.addEventListener('click',function(){currentPage+=1;render();});
var restoreButton=element('assetLibraryRestoreButton');
if(restoreButton)restoreButton.addEventListener('click',function(){
if(!root.NaiComicOriginalStarterPack){status('入门包脚本未加载。',true);return;}
var original=root.NaiComicOriginalStarterPack.restore(store);
var site=root.NaiComicSiteUiPack?root.NaiComicSiteUiPack.restore(store):{total:0};
var finish=function(free){
status('已恢复漫画装饰 '+original.total+'、站点界面 '+(site.total||0)+(free&&free.total?'、免费包 '+free.total:'')+' 件。',false);
render();
};
if(root.NaiComicFreePack&&typeof root.NaiComicFreePack.restore==='function'){
root.NaiComicFreePack.restore(store).then(finish).catch(function(error){status(error.message,true);render();});
}else finish(null);
});
var exportButton=element('assetLibraryExportButton');
if(exportButton)exportButton.addEventListener('click',function(){root.NaiComicAssetPack.downloadJson('nai-comic-assets.json',store.exportPack({includeThumbnails:true}));});
var importButton=element('assetLibraryImportButton');
var packInput=element('assetLibraryPackInput');
if(importButton&&packInput){
importButton.addEventListener('click',function(){packInput.click();});
packInput.addEventListener('change',function(){if(packInput.files&&packInput.files[0])importPack(packInput.files[0]);});
}
store.onChange(renderSoon);
bindCanvasDrop();
if(localStorage.getItem('nai_asset_starter_v1')!=='1'){
try{localStorage.setItem('nai_asset_starter_v1','1');}catch(e){}
if(root.NaiComicOriginalStarterPack&&typeof root.NaiComicOriginalStarterPack.restore==='function'){
root.NaiComicOriginalStarterPack.restore(store);
}
if(root.NaiComicSiteUiPack&&typeof root.NaiComicSiteUiPack.restore==='function'){
root.NaiComicSiteUiPack.restore(store);
}
}
if(store.hydrateBlobs)store.hydrateBlobs().then(render).catch(function(){render();});
else render();
}

root.NaiComicAssetLibraryController={render:render,store:store,insertSiteTemplate:insertSiteTemplate,addAsset:addAsset};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
