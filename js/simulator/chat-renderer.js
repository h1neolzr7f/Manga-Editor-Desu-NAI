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
var config=Object.assign({
fontFamily:'system-ui',
fontSize:28,
fill:'#fff',
originX:'left',
originY:'top',
editable:true,
selectable:true,
evented:true,
objectCaching:false
},options||{});
var Ctor;
if(config.width&&fabric.Textbox)Ctor=fabric.Textbox;
else if(fabric.IText)Ctor=fabric.IText;
else Ctor=fabric.Textbox||fabric.Text;
return new Ctor(text,config);
}

function makeAvatar(participant,x,y,theme,size){
var fabric=getFabric();
var radius=size||28;
var groupItems=[];
var initial=textValue(participant.name,'?').slice(0,1).toUpperCase();
groupItems.push(new fabric.Circle({left:x,top:y,radius:radius,originX:'left',originY:'top',fill:theme.accentColor||'#38bdf8',stroke:theme.primaryColor||'#fff',strokeWidth:2}));
groupItems.push(makeText(initial,{left:x+radius-8,top:y+radius-14,fontSize:Math.max(14,radius-8),fontWeight:'bold',fill:'#0f172a'}));
return groupItems;
}

async function makeAvatarWithImage(participant,x,y,theme,size){
var items=makeAvatar(participant,x,y,theme,size);
if(!participant.avatar)return items;
try{
var image=await loadImage(participant.avatar);
if(image){
var box=(size||28)*2-4;
fitImage(image,box,box);
image.set({left:x+2,top:y+2,originX:'left',originY:'top'});
items.unshift(image);
}
}catch(error){
if(root.uiLogger&&typeof root.uiLogger.warn==='function')root.uiLogger.warn('聊天头像加载失败：',error);
}
return items;
}

function layoutOf(definition,theme){
return (definition&&definition.layout)||(theme&&theme.layout)||'bubble';
}

function messageHeight(message,layout){
if(message.type==='title')return 96;
if(message.type==='choice'){
var count=String(message.content||'').split(/\r?\n/).filter(Boolean).length||2;
return 36+count*56;
}
if(message.type==='system'||message.type==='narrator'||message.type==='hint')return 78;
if(message.type==='aside')return 118;
if(message.type==='image')return message.image?330:150;
if(layout==='discord')return 108;
if(layout==='story-log')return 128;
return 132;
}

function finishGroup(items,chatScene,definition,renderOptions,visibleMessages){
var fabric=getFabric();
var factory=root.NaiComicExtraRendererFactory;
var pageId='page_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
var payload={
customType:'simulatorChat',
simulatorType:'chat',
simulatorSchemaVersion:root.NaiComicChatScene.SCHEMA_VERSION,
simulatorTemplateId:definition.id,
simulatorEditable:true,
simulatorScene:root.NaiComicChatScene.serialize(chatScene),
simulatorPageId:pageId,
simulatorExplode:true,
name:'模拟器：'+chatScene.title
};
if(chatScene.story)payload.simulatorStory=JSON.stringify(chatScene.story);
if(items[0]&&typeof items[0].set==='function')items[0].set({simulatorRole:'page',name:'页面底'});
if(factory&&typeof factory.tagParts==='function')factory.tagParts(items,payload,pageId,true);
var group=new fabric.Group(items,{left:0,top:0,originX:'left',originY:'top',subTargetCheck:true,interactive:true,objectCaching:false});
group.set(payload);
var parentGuid=ensureGuid(group,'simulator');
group.guids=[];
if(typeof group.getObjects==='function')group.getObjects().forEach(function(child,index){
var childGuid=ensureGuid(child,parentGuid+'_child_'+index);
child.simulatorParentGuid=parentGuid;
group.guids.push(childGuid);
});
group.simulatorSceneObject=chatScene;
group.simulatorPlaybackIndex=typeof renderOptions.visibleCount==='number'?renderOptions.visibleCount:visibleMessages.length;
return group;
}

async function renderSpecialRow(message,width,y,theme,offsetX){
var fabric=getFabric();
var origin=Number(offsetX)||0;
var rowItems=[];
if(message.type==='title'){
rowItems.push(new fabric.Rect({left:origin+80,top:y+8,width:width-160,height:68,rx:6,ry:6,fill:theme.headerBackground||'#0f172a',stroke:theme.accentColor,strokeWidth:2,originX:'left',originY:'top'}));
rowItems.push(makeText(textValue(message.content,'标题'),{left:origin+110,top:y+26,width:width-220,textAlign:'center',fontFamily:theme.fontFamily,fontSize:26,fontWeight:'bold',fill:theme.accentColor||theme.primaryColor}));
return {items:rowItems,height:96};
}
if(message.type==='choice'){
var options=String(message.content||'').split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean);
if(!options.length)options=['继续'];
options.forEach(function(option,index){
rowItems.push(new fabric.Rect({left:origin+140,top:y+8+index*56,width:width-280,height:44,rx:10,ry:10,fill:'transparent',stroke:theme.accentColor||'#fbbf24',strokeWidth:2,originX:'left',originY:'top'}));
rowItems.push(makeText(option,{left:origin+160,top:y+18+index*56,width:width-320,textAlign:'center',fontFamily:theme.fontFamily,fontSize:20,fill:theme.primaryColor}));
});
return {items:rowItems,height:36+options.length*56};
}
rowItems.push(new fabric.Rect({left:origin+width/2-220,top:y+12,width:440,height:48,rx:20,ry:20,fill:theme.systemBubble||'#334155',originX:'left',originY:'top'}));
rowItems.push(makeText(textValue(message.content,message.type==='hint'?'提示':'旁白'),{left:origin+width/2-200,top:y+24,width:400,textAlign:'center',fontFamily:theme.fontFamily,fontSize:18,fill:theme.secondaryColor}));
return {items:rowItems,height:78};
}

async function appendBubbleContent(rowItems,message,participant,missing,bubbleX,bubbleWidth,y,rowHeight,theme,showName){
var label=missing?'角色已删除：'+message.speaker:(showName&&participant?participant.name:'');
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
var fill=message.type==='aside'?(theme.secondaryColor||'#94a3b8'):theme.primaryColor;
rowItems.push(makeText(textValue(message.content,'（空消息）'),{left:bubbleX+20,top:contentTop,width:bubbleWidth-40,fontFamily:theme.fontFamily,fontSize:message.type==='aside'?22:26,fill:fill,fontStyle:message.type==='aside'?'italic':'normal',lineHeight:1.2}));
}
}

async function renderBubble(chatScene,definition,theme,messages){
var fabric=getFabric();
var width=Number(definition.canvas.width)||1000;
var layout=layoutOf(definition,theme);
var showName=theme.showName!==false&&layout!=='sms';
var left=40;
var right=40;
var contentWidth=width-left-right;
var items=[];
var headerHeight=layout==='sms'?88:100;
var y=0;
var frameLeft=0;
var frameWidth=width;
if(layout==='sms'){
items.push(new fabric.Rect({left:0,top:0,width:width,height:Number(definition.canvas.height)||1800,fill:'#0f172a',originX:'left',originY:'top'}));
frameLeft=230;
frameWidth=540;
items.push(new fabric.Rect({left:frameLeft,top:36,width:frameWidth,height:1728,rx:46,ry:46,fill:'#111827',stroke:'#475569',strokeWidth:6,originX:'left',originY:'top'}));
items.push(new fabric.Rect({left:frameLeft+18,top:86,width:frameWidth-36,height:1620,rx:28,ry:28,fill:theme.background||'#f2f2f7',originX:'left',originY:'top'}));
width=frameWidth-36;
left=frameLeft+18;
}
items.push(new fabric.Rect({left:layout==='sms'?left:0,top:layout==='sms'?86:0,width:layout==='sms'?width:Number(definition.canvas.width)||1000,height:headerHeight,fill:theme.headerBackground||theme.background||'#111827',originX:'left',originY:'top'}));
items.push(makeText(textValue(chatScene.title,'聊天'),{left:(layout==='sms'?left+24:44),top:(layout==='sms'?112:30),fontFamily:theme.fontFamily,fontSize:layout==='sms'?22:34,fontWeight:'bold',fill:layout==='sms'?theme.primaryColor:theme.primaryColor,width:layout==='sms'?width-48:undefined,textAlign:layout==='sms'?'center':'left'}));
if(layout!=='sms'){
items.push(makeText(chatScene.participants.map(function(participant){return participant.name;}).join('、'),{left:46,top:72,fontFamily:theme.fontFamily,fontSize:16,fill:theme.secondaryColor}));
}
y=(layout==='sms'?86:0)+headerHeight+24;
var canvasWidth=Number(definition.canvas.width)||1000;
for(var i=0;i<messages.length;i++){
var message=messages[i];
var participant=root.NaiComicChatScene.getParticipant(chatScene,message.speaker);
var missing=!participant&&message.type!=='system'&&message.type!=='narrator'&&message.type!=='hint'&&message.type!=='title'&&message.type!=='choice';
var rowHeight=messageHeight(message,layout);
var rowItems=[];
if(message.type==='system'||message.type==='narrator'||message.type==='hint'||message.type==='title'||message.type==='choice'){
var specialWidth=layout==='sms'?width:canvasWidth;
var specialOffset=layout==='sms'?left:0;
var special=await renderSpecialRow(message,specialWidth,y,theme,specialOffset);
rowItems=special.items;
rowHeight=special.height;
}else{
var side=participant&&participant.side==='right'?'right':'left';
var bubbleWidth=Math.min(layout==='sms'?360:680,contentWidth-140);
var bubbleX=side==='right'?(layout==='sms'?left+width-24-bubbleWidth:canvasWidth-right-bubbleWidth):(layout==='sms'?left+72:96);
var avatarX=side==='right'?(layout==='sms'?left+width-64:canvasWidth-right-56):(layout==='sms'?left+16:24);
var bubbleColor=missing?'#7f1d1d':(side==='right'?(theme.rightBubble||'#075985'):(theme.leftBubble||'#243244'));
var textFill=layout==='sms'&&side==='right'?'#ffffff':(missing?'#fecaca':theme.primaryColor);
var avatarParticipant=participant||{name:'角色已删除',avatar:''};
var avatarItems=await makeAvatarWithImage(avatarParticipant,avatarX,y+10,theme,layout==='sms'?22:28);
rowItems=rowItems.concat(avatarItems);
rowItems.push(new fabric.Rect({left:bubbleX,top:y,width:bubbleWidth,height:rowHeight-18,rx:theme.bubbleRadius||22,ry:theme.bubbleRadius||22,fill:bubbleColor,stroke:missing?'#fca5a5':undefined,strokeWidth:missing?2:0,originX:'left',originY:'top'}));
var savedPrimary=theme.primaryColor;
if(layout==='sms'&&side==='right')theme=Object.assign({},theme,{primaryColor:textFill});
await appendBubbleContent(rowItems,message,participant,missing,bubbleX,bubbleWidth,y,rowHeight,theme,showName);
theme=Object.assign({},theme,{primaryColor:savedPrimary});
if(message.time)rowItems.push(makeText(message.time,{left:side==='right'?bubbleX+20:bubbleX+bubbleWidth-100,top:y+rowHeight-42,width:80,textAlign:side==='right'?'left':'right',fontFamily:theme.fontFamily,fontSize:15,fill:theme.secondaryColor}));
}
var messageGroup=new fabric.Group(rowItems,{left:0,top:0,originX:'left',originY:'top',subTargetCheck:true,interactive:true,simulatorMessageId:message.id,simulatorMessageIndex:i});
items.push(messageGroup);
y+=rowHeight+18;
}
var minHeight=Number(definition.canvas.height)||1800;
var totalHeight=Math.max(minHeight,y+80);
if(layout!=='sms'){
var footer=new fabric.Rect({left:0,top:totalHeight-44,width:canvasWidth,height:44,fill:theme.headerBackground||'#0f172a',originX:'left',originY:'top'});
items.push(footer);
items.unshift(new fabric.Rect({left:0,top:0,width:canvasWidth,height:totalHeight,fill:theme.background||'#111827',originX:'left',originY:'top'}));
}
return {items:items,messages:messages};
}

async function renderStoryLog(chatScene,definition,theme,messages){
var fabric=getFabric();
var width=Number(definition.canvas.width)||1000;
var items=[];
items.push(new fabric.Rect({left:0,top:0,width:width,height:Number(definition.canvas.height)||1800,fill:theme.background||'#0b1220',originX:'left',originY:'top'}));
items.push(new fabric.Rect({left:0,top:0,width:width,height:108,fill:theme.headerBackground||'#020617',originX:'left',originY:'top'}));
items.push(makeText(textValue(chatScene.title,'剧情'),{left:44,top:28,fontFamily:theme.fontFamily,fontSize:32,fontWeight:'bold',fill:theme.primaryColor}));
items.push(makeText('对话日志 · 原创模板',{left:46,top:70,fontFamily:theme.fontFamily,fontSize:16,fill:theme.secondaryColor}));
var y=132;
for(var i=0;i<messages.length;i++){
var message=messages[i];
var participant=root.NaiComicChatScene.getParticipant(chatScene,message.speaker);
var missing=!participant&&(message.type==='text'||message.type==='image'||message.type==='aside');
var rowItems=[];
var rowHeight=messageHeight(message,'story-log');
if(message.type==='system'||message.type==='narrator'||message.type==='hint'||message.type==='title'||message.type==='choice'){
var special=await renderSpecialRow(message,width,y,theme);
rowItems=special.items;
rowHeight=special.height;
}else{
var avatarItems=await makeAvatarWithImage(participant||{name:'？',avatar:''},36,y+8,theme,26);
rowItems=rowItems.concat(avatarItems);
rowItems.push(makeText(missing?'角色已删除':(participant?participant.name:'旁白'),{left:110,top:y+8,fontFamily:theme.fontFamily,fontSize:20,fontWeight:'bold',fill:missing?'#fecaca':(theme.accentColor||'#fbbf24')}));
if(message.type==='image'&&message.image){
try{
var image=await loadImage(message.image);
fitImage(image,720,280);
image.set({left:110,top:y+42,originX:'left',originY:'top'});
rowItems.push(image);
rowHeight=340;
}catch(error){
rowItems.push(makeText('图片资源加载失败',{left:110,top:y+46,fontFamily:theme.fontFamily,fontSize:22,fill:'#fecaca'}));
}
}else{
rowItems.push(makeText(textValue(message.content,'（空）'),{left:110,top:y+42,width:820,fontFamily:theme.fontFamily,fontSize:message.type==='aside'?22:26,fill:message.type==='aside'?theme.secondaryColor:theme.primaryColor,fontStyle:message.type==='aside'?'italic':'normal',lineHeight:1.25}));
}
}
var messageGroup=new fabric.Group(rowItems,{left:0,top:0,originX:'left',originY:'top',subTargetCheck:true,interactive:true,simulatorMessageId:message.id,simulatorMessageIndex:i});
items.push(messageGroup);
y+=rowHeight+16;
}
var totalHeight=Math.max(Number(definition.canvas.height)||1800,y+48);
items[0].set({height:totalHeight});
return {items:items,messages:messages};
}

async function renderDiscord(chatScene,definition,theme,messages){
var fabric=getFabric();
var width=Number(definition.canvas.width)||1000;
var items=[];
items.push(new fabric.Rect({left:0,top:0,width:width,height:Number(definition.canvas.height)||1800,fill:theme.background||'#313338',originX:'left',originY:'top'}));
items.push(new fabric.Rect({left:0,top:0,width:72,height:Number(definition.canvas.height)||1800,fill:'#1e1f22',originX:'left',originY:'top'}));
items.push(new fabric.Rect({left:72,top:0,width:220,height:Number(definition.canvas.height)||1800,fill:'#2b2d31',originX:'left',originY:'top'}));
items.push(makeText('# 剧情',{left:92,top:28,fontFamily:theme.fontFamily,fontSize:22,fontWeight:'bold',fill:theme.primaryColor}));
chatScene.participants.forEach(function(participant,index){
items.push(makeText(participant.name,{left:96,top:90+index*42,fontFamily:theme.fontFamily,fontSize:18,fill:theme.secondaryColor}));
});
items.push(makeText(textValue(chatScene.title,'频道'),{left:316,top:24,fontFamily:theme.fontFamily,fontSize:26,fontWeight:'bold',fill:theme.primaryColor}));
var y=88;
for(var i=0;i<messages.length;i++){
var message=messages[i];
var participant=root.NaiComicChatScene.getParticipant(chatScene,message.speaker);
var rowItems=[];
if(message.type==='system'||message.type==='title'||message.type==='choice'||message.type==='hint'||message.type==='narrator'){
var special=await renderSpecialRow(message,width,y,theme);
rowItems=special.items;
var rowHeight=special.height;
}else{
var avatarItems=await makeAvatarWithImage(participant||{name:'?',avatar:''},316,y+6,theme,20);
rowItems=rowItems.concat(avatarItems);
rowItems.push(makeText(participant?participant.name:'系统',{left:378,top:y+4,fontFamily:theme.fontFamily,fontSize:18,fontWeight:'bold',fill:theme.accentColor||'#5865f2'}));
rowItems.push(makeText(message.time||'',{left:520,top:y+8,fontFamily:theme.fontFamily,fontSize:14,fill:theme.secondaryColor}));
rowItems.push(makeText(textValue(message.content,'（空）'),{left:378,top:y+34,width:560,fontFamily:theme.fontFamily,fontSize:22,fill:theme.primaryColor,lineHeight:1.2}));
rowHeight=108;
}
var messageGroup=new fabric.Group(rowItems,{left:0,top:0,originX:'left',originY:'top',subTargetCheck:true,interactive:true,simulatorMessageId:message.id,simulatorMessageIndex:i});
items.push(messageGroup);
y+=rowHeight+10;
}
items[0].set({height:Math.max(Number(definition.canvas.height)||1800,y+48)});
items[1].set({height:items[0].height});
items[2].set({height:items[0].height});
return {items:items,messages:messages};
}

async function renderScene(scene,template,options){
var chatScene=root.NaiComicChatScene.normalize(scene);
var renderOptions=options||{};
var definition=template||root.NaiComicTemplateRegistry.get(chatScene.templateId)||root.NaiComicTemplateRegistry.get('generic-chat-dark');
var theme=Object.assign({},definition.theme||{},chatScene.theme||{});
var layout=layoutOf(definition,theme);
var messages=chatScene.messages;
if(typeof renderOptions.visibleCount==='number')messages=chatScene.messages.slice(0,Math.max(0,renderOptions.visibleCount));
var rendered;
if(layout==='story-log')rendered=await renderStoryLog(chatScene,definition,theme,messages);
else if(layout==='discord')rendered=await renderDiscord(chatScene,definition,theme,messages);
else rendered=await renderBubble(chatScene,definition,theme,messages);
return finishGroup(rendered.items,chatScene,definition,renderOptions,rendered.messages);
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
