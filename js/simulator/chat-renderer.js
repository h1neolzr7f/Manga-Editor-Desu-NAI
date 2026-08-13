(function(root){
"use strict";

function getFabric(){
if(!root.fabric)throw new Error('Fabric.js 尚未加载，无法渲染聊天模板。');
return root.fabric;
}

function textValue(value,fallback){
var text=typeof value==='string'?value.trim():'';
return text||fallback||'';
}

function loadImage(src){
return new Promise(function(resolve,reject){
if(!src){resolve(null);return;}
try{
getFabric().Image.fromURL(src,function(image){
if(image)resolve(image);else reject(new Error('图片资源加载失败。'));
});
}catch(error){reject(error);}
});
}

function fitImage(image,maxWidth,maxHeight){
var width=Number(image.width)||1;
var height=Number(image.height)||1;
var scale=Math.min(maxWidth/width,maxHeight/height,1);
image.set({scaleX:scale,scaleY:scale});
return {width:width*scale,height:height*scale};
}

function ensureGuid(object,prefix){
if(typeof getGUID==='function')return getGUID(object);
if(object.guid)return object.guid;
object.guid=prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
return object.guid;
}

function makeText(value,options){
var fabric=getFabric();
var text=textValue(value,'');
var config=Object.assign({fontFamily:'system-ui',fontSize:28,fill:'#fff',originX:'left',originY:'top'},options||{});
if(fabric.Textbox)return new fabric.Textbox(text,config);
return new fabric.Text(text,config);
}

function makeAvatar(participant,x,y,theme){
var fabric=getFabric();
var groupItems=[];
var initial=textValue(participant.name,'?').slice(0,1).toUpperCase();
groupItems.push(new fabric.Circle({left:x,top:y,radius:28,originX:'left',originY:'top',fill:theme.accentColor||'#38bdf8',stroke:theme.primaryColor||'#fff',strokeWidth:2}));
groupItems.push(makeText(initial,{left:x+17,top:y+9,fontSize:24,fontWeight:'bold',fill:'#0f172a'}));
return groupItems;
}

async function makeAvatarWithImage(participant,x,y,theme){
var items=makeAvatar(participant,x,y,theme);
if(!participant.avatar)return items;
try{
var image=await loadImage(participant.avatar);
if(image){
fitImage(image,52,52);
image.set({left:x+2,top:y+2,originX:'left',originY:'top'});
items.unshift(image);
}
}catch(error){
if(root.uiLogger&&typeof root.uiLogger.warn==='function')root.uiLogger.warn('聊天头像加载失败：',error);
}
return items;
}

function messageHeight(message){
if(message.type==='system')return 70;
if(message.type==='image')return message.image?330:150;
return 132;
}

async function renderScene(scene,template,options){
var fabric=getFabric();
var chatScene=root.NaiComicChatScene.normalize(scene);
var renderOptions=options||{};
var definition=template||root.NaiComicTemplateRegistry.get(chatScene.templateId)||root.NaiComicTemplateRegistry.get('generic-chat-dark');
var theme=Object.assign({},definition.theme,chatScene.theme||{});
var width=Number(definition.canvas.width)||1000;
var left=40;
var right=40;
var contentWidth=width-left-right;
var items=[];
var headerHeight=100;
var y=0;
var background=new fabric.Rect({left:0,top:0,width:width,height:headerHeight,fill:theme.headerBackground||theme.background||'#111827',originX:'left',originY:'top'});
items.push(background);
items.push(makeText(textValue(chatScene.title,'聊天'),{left:44,top:30,fontFamily:theme.fontFamily,fontSize:34,fontWeight:'bold',fill:theme.primaryColor}));
items.push(makeText(chatScene.participants.map(function(participant){return participant.name;}).join('、'),{left:46,top:72,fontFamily:theme.fontFamily,fontSize:16,fill:theme.secondaryColor}));
y=headerHeight+28;
var messages=chatScene.messages;
if(typeof renderOptions.visibleCount==='number')messages=chatScene.messages.slice(0,Math.max(0,renderOptions.visibleCount));
for(var i=0;i<messages.length;i++){
var message=messages[i];
var participant=root.NaiComicChatScene.getParticipant(chatScene,message.speaker);
var missing=!participant&&message.type!=='system';
var rowHeight=messageHeight(message);
var rowItems=[];
if(message.type==='system'){
rowItems.push(new fabric.Rect({left:width/2-180,top:y+12,width:360,height:42,rx:20,ry:20,fill:theme.systemBubble||'#334155',originX:'left',originY:'top'}));
rowItems.push(makeText(textValue(message.content,'系统消息'),{left:width/2-150,top:y+22,width:300,textAlign:'center',fontFamily:theme.fontFamily,fontSize:18,fill:theme.secondaryColor}));
}else{
var side=participant&&participant.side==='right'?'right':'left';
var bubbleWidth=Math.min(680,contentWidth-140);
var bubbleX=side==='right'?width-right-bubbleWidth:96;
var avatarX=side==='right'?width-right-56:24;
var bubbleColor=missing?'#7f1d1d':(side==='right'?(theme.rightBubble||'#075985'):(theme.leftBubble||'#243244'));
var avatarParticipant=participant||{name:'角色已删除',avatar:''};
var avatarItems=await makeAvatarWithImage(avatarParticipant,avatarX,y+10,theme);
rowItems=rowItems.concat(avatarItems);
rowItems.push(new fabric.Rect({left:bubbleX,top:y,width:bubbleWidth,height:rowHeight-18,rx:theme.bubbleRadius||22,ry:theme.bubbleRadius||22,fill:bubbleColor,stroke:missing?'#fca5a5':undefined,strokeWidth:missing?2:0,originX:'left',originY:'top'}));
var label=missing?'角色已删除：'+message.speaker:(participant?participant.name:'');
if(label)rowItems.push(makeText(label,{left:bubbleX+20,top:y+12,fontFamily:theme.fontFamily,fontSize:16,fontWeight:'bold',fill:missing?'#fecaca':theme.secondaryColor}));
var contentTop=y+(label?38:18);
if(message.type==='image'&&message.image){
try{
var messageImage=await loadImage(message.image);
var fit=fitImage(messageImage,bubbleWidth-40,230);
messageImage.set({left:bubbleX+20,top:contentTop,originX:'left',originY:'top'});
rowItems.push(messageImage);
if(message.content)rowItems.push(makeText(message.content,{left:bubbleX+20,top:contentTop+fit.height+10,width:bubbleWidth-40,fontFamily:theme.fontFamily,fontSize:20,fill:theme.primaryColor}));
}catch(error){
rowItems.push(makeText('图片资源加载失败',{left:bubbleX+20,top:contentTop,fontFamily:theme.fontFamily,fontSize:22,fill:'#fecaca'}));
}
}else if(message.type==='image'){
rowItems.push(makeText('未选择图片',{left:bubbleX+20,top:contentTop,fontFamily:theme.fontFamily,fontSize:22,fill:theme.secondaryColor}));
}else{
rowItems.push(makeText(textValue(message.content,'（空消息）'),{left:bubbleX+20,top:contentTop,width:bubbleWidth-40,fontFamily:theme.fontFamily,fontSize:26,fill:theme.primaryColor,lineHeight:1.2}));
}
if(message.time)rowItems.push(makeText(message.time,{left:side==='right'?bubbleX+20:bubbleX+bubbleWidth-100,top:y+rowHeight-42,width:80,textAlign:side==='right'?'left':'right',fontFamily:theme.fontFamily,fontSize:15,fill:theme.secondaryColor}));
}
var messageGroup=new fabric.Group(rowItems,{left:0,top:0,originX:'left',originY:'top',subTargetCheck:true,interactive:true,simulatorMessageId:message.id,simulatorMessageIndex:i});
items.push(messageGroup);
y+=rowHeight+18;
}
var totalHeight=Math.max(Number(definition.canvas.height)||1800,y+40);
var footer=new fabric.Rect({left:0,top:totalHeight-44,width:width,height:44,fill:theme.headerBackground||'#0f172a',originX:'left',originY:'top'});
items.push(footer);
var group=new fabric.Group(items,{left:0,top:0,originX:'left',originY:'top',subTargetCheck:true,interactive:true,objectCaching:false});
group.set({
customType:'simulatorChat',
simulatorType:'chat',
simulatorSchemaVersion:root.NaiComicChatScene.SCHEMA_VERSION,
simulatorTemplateId:definition.id,
simulatorEditable:true,
simulatorScene:root.NaiComicChatScene.serialize(chatScene),
name:'模拟器：'+chatScene.title
});
var parentGuid=ensureGuid(group,'simulator');
group.guids=[];
if(typeof group.getObjects==='function')group.getObjects().forEach(function(child,index){
var childGuid=ensureGuid(child,parentGuid+'_child_'+index);
child.simulatorParentGuid=parentGuid;
group.guids.push(childGuid);
});
group.simulatorSceneObject=chatScene;
group.simulatorPlaybackIndex=typeof renderOptions.visibleCount==='number'?renderOptions.visibleCount:messages.length;
return group;
}

function fitGroupToCanvas(group,canvas){
if(!group||!canvas)return group;
var maxWidth=Math.max(1,(Number(canvas.width)||1000)-40);
var maxHeight=Math.max(1,(Number(canvas.height)||1000)-40);
var width=Number(group.width)||1;
var height=Number(group.height)||1;
var scale=Math.min(maxWidth/width,maxHeight/height,1);
group.set({scaleX:scale,scaleY:scale});
group.set({left:((Number(canvas.width)||1000)-group.getScaledWidth())/2,top:((Number(canvas.height)||1000)-group.getScaledHeight())/2});
group.setCoords();
return group;
}

root.NaiComicChatRenderer={
renderScene:renderScene,
fitGroupToCanvas:fitGroupToCanvas,
loadImage:loadImage
};
})(typeof window!=='undefined'?window:globalThis);
