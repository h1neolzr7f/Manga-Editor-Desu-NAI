(function(root){
"use strict";

var scene=root.NaiComicChatScene.createDefaultScene();
var selectedGroup=null;
var initialized=false;

function getCanvas(){
if(typeof canvas!=='undefined'&&canvas)return canvas;
return root.canvas||null;
}

function el(id){return document.getElementById(id);}

function text(value){return document.createTextNode(String(value));}

function button(label,className,handler){
var result=document.createElement('button');
result.type='button';
result.className=className||'nai-character-mini-button';
result.appendChild(text(label));
result.addEventListener('click',handler);
return result;
}

function input(type,value,className){
var result=document.createElement('input');
result.type=type||'text';
result.value=value||'';
result.className=className||'simulator-chat-input';
return result;
}

function select(options,value,className){
var result=document.createElement('select');
result.className=className||'simulator-chat-input';
options.forEach(function(option){
var item=document.createElement('option');
item.value=option.value;
item.textContent=option.label;
item.selected=option.value===value;
result.appendChild(item);
});
return result;
}

function setStatus(message,isError){
var status=el('simulatorChatStatus');
if(!status)return;
status.textContent=message;
status.classList.toggle('is-error',!!isError);
}

function updateValidation(){
var result=root.NaiComicChatScene.validate(scene);
var message='场景可用。';
if(result.errors.length)message='需要修复：'+result.errors.join('；');
else if(result.warnings.length)message='提示：'+result.warnings.join('；');
setStatus(message,result.errors.length>0);
return result;
}

function markDirty(){
updateValidation();
}

function readFileAsDataUrl(file,callback){
if(!file){callback('');return;}
var reader=new FileReader();
reader.onload=function(event){callback(event.target.result);};
reader.onerror=function(){setStatus('资源读取失败，原资源未改变。',true);};
reader.readAsDataURL(file);
}

function participantOptions(){
var options=scene.participants.map(function(participant){
return {value:participant.id,label:participant.name+'（'+participant.side+'）'};
});
root.NaiComicChatScene.getMissingSpeakerIds(scene).forEach(function(id){
options.push({value:id,label:'角色已删除：'+id});
});
return options;
}

function renderParticipants(){
var container=el('simulatorChatParticipants');
if(!container)return;
container.innerHTML='';
scene.participants.forEach(function(participant,index){
var row=document.createElement('div');
row.className='simulator-chat-participant';
var name=input('text',participant.name,'simulator-chat-input');
name.setAttribute('aria-label','角色名称');
name.addEventListener('input',function(){participant.name=name.value;renderMessages();markDirty();});
var side=select([{value:'left',label:'左侧'},{value:'right',label:'右侧'}],participant.side,'simulator-chat-input');
side.setAttribute('aria-label','角色位置');
side.addEventListener('change',function(){participant.side=side.value;markDirty();});
var avatar=document.createElement('input');
avatar.type='file';
avatar.accept='image/*';
avatar.className='simulator-chat-file';
avatar.title=participant.avatar?'更换头像':'选择头像';
avatar.addEventListener('change',function(){
readFileAsDataUrl(avatar.files&&avatar.files[0],function(data){
if(data){participant.avatar=data;avatar.title='更换头像';markDirty();}
});
});
row.appendChild(name);
row.appendChild(side);
row.appendChild(avatar);
row.appendChild(button('删除角色','simulator-chat-small-button',function(){
if(scene.participants.length<=1){setStatus('至少保留一个角色。',true);return;}
scene.participants.splice(index,1);
renderEditor();
}));
container.appendChild(row);
});
}

function renderMessages(){
var container=el('simulatorChatMessages');
if(!container)return;
container.innerHTML='';
var options=participantOptions();
scene.messages.forEach(function(message,index){
var row=document.createElement('div');
row.className='simulator-chat-message';
var header=document.createElement('div');
header.className='simulator-chat-message-header';
var type=select([{value:'text',label:'文字消息'},{value:'image',label:'图片消息'},{value:'system',label:'系统提示'}],message.type,'simulator-chat-input');
type.addEventListener('change',function(){message.type=type.value;renderMessages();markDirty();});
var speaker=select(options,message.speaker,'simulator-chat-input');
speaker.disabled=message.type==='system';
speaker.addEventListener('change',function(){message.speaker=speaker.value;markDirty();});
var time=input('text',message.time,'simulator-chat-input');
time.placeholder='时间';
time.addEventListener('input',function(){message.time=time.value;markDirty();});
header.appendChild(type);
header.appendChild(speaker);
header.appendChild(time);
row.appendChild(header);
var content=document.createElement('textarea');
content.className='simulator-chat-textarea';
content.value=message.content;
content.placeholder=message.type==='system'?'系统提示内容':'消息内容';
content.addEventListener('input',function(){message.content=content.value;markDirty();});
row.appendChild(content);
if(message.type==='image'){
var imageRow=document.createElement('div');
imageRow.className='simulator-chat-image-row';
var imageInput=document.createElement('input');
imageInput.type='file';
imageInput.accept='image/*';
imageInput.className='simulator-chat-file';
imageInput.addEventListener('change',function(){
readFileAsDataUrl(imageInput.files&&imageInput.files[0],function(data){
if(data){message.image=data;markDirty();}
});
});
imageRow.appendChild(imageInput);
imageRow.appendChild(text(message.image?'已选择图片（项目内 data URL）':'尚未选择图片'));
row.appendChild(imageRow);
}
var actions=document.createElement('div');
actions.className='simulator-chat-message-actions';
actions.appendChild(button('上移','simulator-chat-small-button',function(){
if(index>0){var previous=scene.messages[index-1];scene.messages[index-1]=scene.messages[index];scene.messages[index]=previous;renderMessages();markDirty();}
}));
actions.appendChild(button('下移','simulator-chat-small-button',function(){
if(index<scene.messages.length-1){var next=scene.messages[index+1];scene.messages[index+1]=scene.messages[index];scene.messages[index]=next;renderMessages();markDirty();}
}));
actions.appendChild(button('删除消息','simulator-chat-small-button',function(){
scene.messages.splice(index,1);renderMessages();markDirty();
}));
row.appendChild(actions);
container.appendChild(row);
});
}

function renderEditor(){
var title=el('simulatorChatTitleInput');
if(title)title.value=scene.title;
var theme=el('simulatorChatTheme');
if(theme)theme.value=scene.theme&&scene.theme.background==='#f8fafc'?'light':'dark';
renderParticipants();
renderMessages();
updateValidation();
}

function themeValue(mode){
if(mode==='light')return {
background:'#f8fafc',headerBackground:'#e2e8f0',primaryColor:'#0f172a',secondaryColor:'#475569',accentColor:'#0284c7',leftBubble:'#e2e8f0',rightBubble:'#bae6fd',systemBubble:'#cbd5e1',bubbleRadius:22
};
return {
background:'#111827',headerBackground:'#0f172a',primaryColor:'#f8fafc',secondaryColor:'#94a3b8',accentColor:'#38bdf8',leftBubble:'#243244',rightBubble:'#075985',systemBubble:'#334155',bubbleRadius:22
};
}

function findSelectedSimulatorGroup(){
var current=getCanvas();
if(!current||typeof current.getActiveObject!=='function')return selectedGroup;
var object=current.getActiveObject();
if(object&&object.customType==='simulatorChat')return object;
if(object&&object.group&&object.group.customType==='simulatorChat')return object.group;
return selectedGroup&&selectedGroup.canvas?selectedGroup:null;
}

function setActiveGroup(group){
if(!group||group.customType!=='simulatorChat')return false;
selectedGroup=group;
try{
scene=root.NaiComicChatScene.deserialize(group.simulatorScene||group.simulatorSceneObject);
}catch(error){
setStatus('选中的聊天对象数据损坏：'+error.message,true);
return false;
}
renderEditor();
return true;
}

function saveHistory(){
if(typeof saveStateByManual==='function')saveStateByManual();
if(typeof updateLayerPanel==='function')updateLayerPanel();
}

async function insertOrUpdate(){
var current=getCanvas();
if(!current){setStatus('Canvas 尚未初始化，无法插入聊天模板。',true);return null;}
var validation=updateValidation();
if(!validation.ok)return null;
var renderer=root.NaiComicChatRenderer;
var registry=root.NaiComicTemplateRegistry;
var template=registry.get(scene.templateId);
if(!template){
setStatus('此模板属于本地资源包，当前未安装。',true);
return null;
}
var group=await renderer.renderScene(validation.scene,template);
renderer.fitGroupToCanvas(group,current);
var previous=findSelectedSimulatorGroup();
if(previous&&previous.canvas===current){
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
current.remove(previous);
current.add(group);
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
}else{
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
current.add(group);
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
}
selectedGroup=group;
current.setActiveObject(group);
current.renderAll();
saveHistory();
setStatus('聊天模板已插入画布，可继续编辑或保存项目。',false);
return group;
}

function loadSelected(){
var group=findSelectedSimulatorGroup();
if(!group){setStatus('请先选中一个通用聊天对象。',true);return false;}
return setActiveGroup(group);
}

function removeSelected(){
var current=getCanvas();
var group=findSelectedSimulatorGroup();
if(!current||!group){setStatus('请先选中一个通用聊天对象。',true);return false;}
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
current.remove(group);
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
selectedGroup=null;
saveHistory();
setStatus('聊天对象已删除，可以使用 Undo 恢复。',false);
return true;
}

function exportSelected(){
var current=getCanvas();
var group=findSelectedSimulatorGroup();
if(!current||!group){setStatus('请先选中一个通用聊天对象。',true);return false;}
var bounds=group.getBoundingRect(true,true);
var data=current.toDataURL({format:'png',left:Math.max(0,bounds.left),top:Math.max(0,bounds.top),width:bounds.width,height:bounds.height,multiplier:1});
var link=document.createElement('a');
link.href=data;
link.download=(scene.title||'chat-scene')+'.png';
link.click();
setStatus('已导出聊天对象 PNG。',false);
return true;
}

function bind(){
if(initialized)return;
initialized=true;
var title=el('simulatorChatTitleInput');
if(title)title.addEventListener('input',function(){scene.title=title.value;markDirty();});
var theme=el('simulatorChatTheme');
if(theme)theme.addEventListener('change',function(){scene.theme=themeValue(theme.value);markDirty();});
var addParticipant=el('simulatorChatAddParticipantButton');
if(addParticipant)addParticipant.addEventListener('click',function(){
var index=scene.participants.length+1;
var id='character_'+index;
while(scene.participants.some(function(item){return item.id===id;})){index+=1;id='character_'+index;}
scene.participants.push({id:id,name:'角色'+index,side:scene.participants.length%2?'right':'left',avatar:''});
renderEditor();
});
var addMessage=el('simulatorChatAddMessageButton');
if(addMessage)addMessage.addEventListener('click',function(){
scene.messages.push({id:'message_'+(scene.messages.length+1),type:'text',speaker:scene.participants[0]?scene.participants[0].id:'character_a',content:'',image:'',time:''});
renderMessages();
});
var insert=el('simulatorChatInsertButton');
if(insert)insert.addEventListener('click',function(){insertOrUpdate().catch(function(error){setStatus('插入聊天模板失败：'+error.message,true);});});
var load=el('simulatorChatLoadButton');
if(load)load.addEventListener('click',loadSelected);
var remove=el('simulatorChatRemoveButton');
if(remove)remove.addEventListener('click',removeSelected);
var exportButton=el('simulatorChatExportButton');
if(exportButton)exportButton.addEventListener('click',exportSelected);
var current=getCanvas();
if(current&&typeof current.on==='function'){
current.on('selection:created',function(event){setActiveGroup(event&&event.selected&&event.selected[0]);});
current.on('selection:updated',function(event){setActiveGroup(event&&event.selected&&event.selected[0]);});
}
renderEditor();
}

var api={
getScene:function(){return root.NaiComicChatScene.clone(scene);},
setScene:function(value){scene=root.NaiComicChatScene.normalize(value);renderEditor();return api.getScene();},
insertOrUpdate:insertOrUpdate,
loadSelected:loadSelected,
removeSelected:removeSelected,
exportSelected:exportSelected,
validate:function(){return root.NaiComicChatScene.validate(scene);}
};
root.NaiComicChatController=api;

if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
