(function(root){
"use strict";

var store=root.NaiComicAssetStoreDefault;
var initialized=false;

function element(id){return typeof document!=='undefined'?document.getElementById(id):null;}

function status(message,isError){
var target=element('assetLibraryStatus');
if(!target)return;
target.textContent=message;
target.classList.toggle('is-error',!!isError);
}

function render(){
var list=element('assetLibraryList');
if(!list||!store)return;
var query=element('assetLibrarySearch');
var tags=element('assetLibraryTags');
var wanted=String(tags&&tags.value||'').split(',').map(function(value){return value.trim();}).filter(Boolean);
var assets=store.search(query&&query.value,wanted);
list.innerHTML='';
if(!assets.length){list.textContent='暂无匹配素材。';return;}
assets.forEach(function(asset){
var row=document.createElement('div');
row.className='asset-library-row'+(asset.missing?' is-missing':'');
row.draggable=!asset.missing;
row.addEventListener('dragstart',function(event){event.dataTransfer.setData('text/nai-asset-id',asset.id);});
if(asset.thumbnail){
var image=document.createElement('img');
image.src=asset.thumbnail;
image.alt=asset.name;
row.appendChild(image);
}
var details=document.createElement('div');
details.className='asset-library-details';
var title=document.createElement('strong');
title.textContent=asset.name;
details.appendChild(title);
var meta=document.createElement('small');
meta.textContent=(asset.tags.length?'#'+asset.tags.join(' #')+' · ':'')+(asset.missing?'素材文件未加载':'许可证：'+asset.license.type);
details.appendChild(meta);
row.appendChild(details);
var add=document.createElement('button');
add.type='button';
add.className='simulator-chat-small-button';
add.textContent='拖入/添加';
add.disabled=asset.missing;
add.addEventListener('click',function(){
store.addToCanvas(asset.id).then(function(){status('已将 '+asset.name+' 添加到画布。',false);}).catch(function(error){status(error.message,true);});
});
row.appendChild(add);
var remove=document.createElement('button');
remove.type='button';
remove.className='simulator-chat-small-button';
remove.textContent='移除';
remove.addEventListener('click',function(){store.remove(asset.id);render();});
row.appendChild(remove);
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
store.addToCanvas(id,point).then(function(){status('素材已拖入画布。',false);}).catch(function(error){status(error.message,true);});
});
}

function bind(){
if(initialized)return;
initialized=true;
var input=element('assetLibraryInput');
if(input)input.addEventListener('change',function(){
store.addFiles(input.files,{sourceType:'imported',license:{type:'unknown',publicAllowed:false}}).then(function(results){
status('已处理 '+results.length+' 个素材文件。',false);render();
}).catch(function(error){status(error.message,true);});
});
var search=element('assetLibrarySearch');
var tags=element('assetLibraryTags');
if(search)search.addEventListener('input',render);
if(tags)tags.addEventListener('input',render);
var exportButton=element('assetLibraryExportButton');
if(exportButton)exportButton.addEventListener('click',function(){root.NaiComicAssetPack.downloadJson('nai-comic-assets.json',store.exportPack({includeThumbnails:true}));});
var importButton=element('assetLibraryImportButton');
var packInput=element('assetLibraryPackInput');
if(importButton&&packInput){
importButton.addEventListener('click',function(){packInput.click();});
packInput.addEventListener('change',function(){if(packInput.files&&packInput.files[0])importPack(packInput.files[0]);});
}
store.onChange(render);
bindCanvasDrop();
render();
}

root.NaiComicAssetLibraryController={render:render,store:store};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
