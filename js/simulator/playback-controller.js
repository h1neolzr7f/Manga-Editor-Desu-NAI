(function(root){
"use strict";

var timeline=null;
var timer=null;
var selected=null;
var initialized=false;

function element(id){return typeof document!=='undefined'?document.getElementById(id):null;}
function canvas(){return root.canvas||null;}
function status(message,isError){var target=element('simulatorPlaybackStatus');if(target){target.textContent=message;target.classList.toggle('is-error',!!isError);}}
function currentGroup(){
var current=canvas();
var object=current&&typeof current.getActiveObject==='function'?current.getActiveObject():null;
var factory=root.NaiComicExtraRendererFactory;
var resolved=factory&&typeof factory.resolvePage==='function'?factory.resolvePage(object,current):null;
if(resolved){selected=resolved;return resolved;}
if(object&&(object.customType==='simulatorChat'||object.customType==='simulatorExtra'))return object;
if(object&&object.group&&(object.group.customType==='simulatorChat'||object.group.customType==='simulatorExtra'))return object.group;
return selected&&selected.canvas?selected:null;
}
function sceneForGroup(group){if(!group||!group.simulatorScene)return null;try{return JSON.parse(group.simulatorScene);}catch(error){return null;}}
function updateControls(snapshot){var index=element('simulatorPlaybackIndex'),total=element('simulatorPlaybackTotal');if(index)index.textContent=String(Math.max(0,snapshot.index+1));if(total)total.textContent=String(snapshot.total);}
function makeVisibleScene(scene,index){
var value=JSON.parse(JSON.stringify(scene||{}));
if(value.sceneType==='visual-novel'||value.templateId==='visual-novel-generic'){
value.activeNodeIndex=Math.max(0,index);
return value;
}
if(Array.isArray(value.messages))value.messages=value.messages.slice(0,index+1);
if(Array.isArray(value.events))value.events=value.events.slice(0,index+1);
if(Array.isArray(value.dialogue))value.dialogue=value.dialogue.slice(0,index+1);
if(Array.isArray(value.nodes)){
value.nodes=value.nodes.slice(0,index+1);
value.currentIndex=Math.max(0,index);
}
return value;
}
function copyGroupIdentity(from,to){
if(!from||!to)return to;
['guid','name','opacity','angle','flipX','flipY'].forEach(function(key){if(from[key]!==undefined)to.set(key,from[key]);});
to.guid=from.guid;
['simulatorStory','scenePlanId','scenePlanPanelIndex','assetId'].forEach(function(key){
if(from[key]!==undefined&&(to[key]===undefined||to[key]===null||to[key]===''))to[key]=from[key];
});
return to;
}
function renderAt(index){
var group=currentGroup(),current=canvas();
if(!group||!current){status('请先选中一个模拟器对象。',true);return Promise.reject(new Error('没有选中的模拟器对象。'));}
var scene=sceneForGroup(group);if(!scene){status('模拟器场景 JSON 损坏。',true);return Promise.reject(new Error('场景 JSON 损坏。'));}
timeline=timeline||root.NaiComicTimeline.fromScene(scene);var snapshot=timeline.seek(index);updateControls(snapshot);
function place(next){
var factory=root.NaiComicExtraRendererFactory;
copyGroupIdentity(group,next);
var origin=null;
var keepFit=true;
var parts=group.simulatorPageId&&factory&&typeof factory.pageObjects==='function'?factory.pageObjects(current,group.simulatorPageId):[];
if(parts.length>1&&typeof factory.pageBounds==='function'){
var bounds=factory.pageBounds(current,group.simulatorPageId);
if(bounds)origin={left:bounds.left,top:bounds.top};
}else{
next.set({left:group.left,top:group.top,scaleX:group.scaleX,scaleY:group.scaleY});
keepFit=false;
}
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
var placed;
if(factory&&typeof factory.placeOnCanvas==='function'&&(next.customType==='simulatorExtra'||next.customType==='simulatorChat'||next.simulatorExplode)){
placed=factory.placeOnCanvas(next,current,{previous:group,replacePageId:group.simulatorPageId,fit:keepFit,origin:origin});
}else{
current.remove(group);
current.add(next);
placed={root:next,objects:[next]};
}
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
selected=placed.root;
current.setActiveObject(placed.root);
current.renderAll();
status('已显示事件 '+(index+1)+'。',false);
return placed.root;
}
if(group.simulatorType==='chat'&&root.NaiComicChatRenderer){
return root.NaiComicChatRenderer.renderScene(scene,root.NaiComicTemplateRegistry.get(group.simulatorTemplateId),{visibleCount:Math.max(0,index+1)}).then(place);
}
var renderer=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(group.simulatorTemplateId);
if(!renderer){status('找不到对应模拟器渲染器。',true);return Promise.reject(new Error('Renderer missing'));}
return Promise.resolve(renderer.render(makeVisibleScene(scene,index))).then(place);
}
function setupTimeline(){if(timeline)return timeline;var group=currentGroup();if(!group){status('请先选中一个模拟器对象。',true);return null;}var scene=sceneForGroup(group);if(!scene){status('模拟器场景 JSON 损坏。',true);return null;}timeline=root.NaiComicTimeline.fromScene(scene);updateControls(timeline.snapshot());return timeline;}
function previous(){if(!setupTimeline()&& !timeline)return;return renderAt((timeline?timeline.index:-1)-1);}
function next(){if(!setupTimeline()&& !timeline)return;return renderAt((timeline?timeline.index:-1)+1);}
function stop(){if(timer){clearInterval(timer);timer=null;}status('自动播放已停止。',false);}
function play(){stop();if(!setupTimeline())return;var delay=Number(element('simulatorPlaybackInterval')&&element('simulatorPlaybackInterval').value)||900;timer=setInterval(function(){if(!timeline||!timeline.hasNext()){stop();return;}renderAt(timeline.index+1).catch(stop);},delay);status('正在自动播放。',false);}
function exportKeyframes(){var group=currentGroup(),current=canvas();if(!group||!current){status('请先选中一个模拟器对象。',true);return false;}var scene=sceneForGroup(group),events=root.NaiComicTimeline.eventsFromScene(scene);if(!events.length){status('当前场景没有事件。',true);return false;}var index=0;function step(){return renderAt(index).then(function(rendered){var outputs=root.NaiComicLongShot.exportPages(current,rendered,Number(element('simulatorPlaybackPageHeight')&&element('simulatorPlaybackPageHeight').value)||1800,(group.name||'keyframe')+'_'+String(index+1));index+=1;if(index<events.length)return step();return outputs;});}return step();}
function insertPages(){var group=currentGroup(),current=canvas();if(!group||!current){status('请先选中一个模拟器对象。',true);return false;}var factory=root.NaiComicExtraRendererFactory;var captureTarget=group.simulatorPageId&&factory&&typeof factory.pageView==='function'?factory.pageView(current,group.simulatorPageId)||group:group;var outputs=root.NaiComicLongShot.capturePages(current,captureTarget,Number(element('simulatorPlaybackPageHeight')&&element('simulatorPlaybackPageHeight').value)||1800,'inserted_page',false);if(!root.fabric||!root.fabric.Image)return Promise.reject(new Error('Fabric 图片工厂不可用。'));return Promise.all(outputs.map(function(item,index){return new Promise(function(resolve,reject){root.fabric.Image.fromURL(item.dataUrl,function(image){if(!image){reject(new Error('分页图层载入失败。'));return;}var column=index%2,row=Math.floor(index/2),availableWidth=(Number(current.width)||1000)/2-70;image.set({left:40+column*((Number(current.width)||1000)/2),top:40+row*220,scaleX:Math.min(1,availableWidth/(image.width||1)),scaleY:Math.min(1,180/(image.height||1)),name:item.filename,customType:'simulatorPage',simulatorSourceGuid:group.guid});resolve(image);});});})).then(function(images){if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();images.forEach(function(image){current.add(image);});if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();current.renderAll();if(typeof updateLayerPanel==='function')updateLayerPanel();if(typeof saveStateByManual==='function')saveStateByManual();status('已将 '+images.length+' 个分页插入为漫画分镜图层。',false);return images;});}
function bind(){if(initialized)return;initialized=true;var prev=element('simulatorPlaybackPrevious'),nextButton=element('simulatorPlaybackNext'),playButton=element('simulatorPlaybackPlay'),stopButton=element('simulatorPlaybackStop'),keyframes=element('simulatorPlaybackExportKeyframes'),pages=element('simulatorPlaybackExportPages');if(prev)prev.addEventListener('click',function(){previous();});if(nextButton)nextButton.addEventListener('click',function(){next();});if(playButton)playButton.addEventListener('click',play);if(stopButton)stopButton.addEventListener('click',stop);if(keyframes)keyframes.addEventListener('click',function(){var result=exportKeyframes();if(result&&typeof result.catch==='function')result.catch(function(error){status(error.message,true);});});if(pages)pages.addEventListener('click',function(){var result=insertPages();if(result&&typeof result.catch==='function')result.catch(function(error){status(error.message,true);});});var current=canvas();if(current&&typeof current.on==='function'){current.on('selection:created',function(event){selected=event&&event.selected&&event.selected[0];timeline=null;});current.on('selection:updated',function(event){selected=event&&event.selected&&event.selected[0];timeline=null;});}}
root.NaiComicPlaybackController={previous:previous,next:next,play:play,stop:stop,exportKeyframes:exportKeyframes,exportPages:insertPages};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
