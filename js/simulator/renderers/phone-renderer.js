(function(root){
"use strict";
var factory=root.NaiComicExtraRendererFactory;
var defaults={sceneType:'phone',templateId:'phone-generic',title:'手机界面',time:'22:31',battery:86,signal:4,screen:'notifications',notifications:[],contacts:[],messages:[],events:[]};
var definition={id:'phone-generic',name:'通用手机界面',category:'phone',canvas:{width:1000,height:1800},theme:{background:'#0f172a',primaryColor:'#f8fafc',secondaryColor:'#94a3b8',accentColor:'#38bdf8',leftBubble:'#1e293b',rightBubble:'#2563eb',fontFamily:'system-ui'},editableFields:['title','time','battery','signal','screen','notifications','contacts','messages','events'],license:{type:'original',source:'',publicAllowed:true}};
function normalize(scene){return root.NaiComicSceneSerializer.normalize(scene,'phone',defaults);}
function validate(scene){var normalized=normalize(scene),result=root.NaiComicSceneSerializer.validate(normalized,'phone');return {ok:result.errors.length===0,errors:result.errors,scene:normalized};}
async function render(scene){
var value=normalize(scene),items=[],theme=Object.assign({},definition.theme,value.theme||{});
items.push(factory.rect({left:0,top:0,width:1000,height:1800,fill:'#020617'}));
items.push(factory.rect({left:175,top:40,width:650,height:1720,rx:70,ry:70,fill:'#111827',stroke:'#475569',strokeWidth:8}));
items.push(factory.rect({left:205,top:130,width:590,height:1510,rx:30,ry:30,fill:theme.background}));
items.push(factory.text(value.time,{left:235,top:165,fontSize:24,fill:theme.primaryColor}));
items.push(factory.text('▮'.repeat(Math.max(1,Math.min(4,Number(value.signal)||1)))+'   '+String(value.battery||0)+'%',{left:600,top:165,fontSize:18,fill:theme.secondaryColor}));
items.push(factory.text(value.title,{left:245,top:220,fontSize:30,fontWeight:'bold',fill:theme.primaryColor,width:510,textAlign:'center'}));
var rows=value.messages&&value.messages.length?value.messages:(value.notifications.length?value.notifications:[]);
if(value.messages&&value.messages.length){
rows.slice(0,12).forEach(function(item,index){
var side=item.side==='right'||item.speaker&&String(item.speaker).indexOf('b')>=0?'right':'left';
var bubbleWidth=360;
var x=side==='right'?390:230;
var y=300+index*92;
items.push(factory.rect({left:x,top:y,width:bubbleWidth,height:76,rx:18,ry:18,fill:side==='right'?theme.rightBubble:theme.leftBubble}));
items.push(factory.text((item.sender||item.app||'')+(item.sender?'\n':'')+(item.body||item.content||''),{left:x+16,top:y+12,width:bubbleWidth-32,fontSize:18,lineHeight:1.2,fill:'#fff'}));
});
}else{
rows.slice(0,12).forEach(function(item,index){
items.push(factory.rect({left:235,top:300+index*96,width:530,height:76,rx:16,ry:16,fill:'#1e293b'}));
items.push(factory.text((item.app||item.sender||'通知')+'\n'+(item.body||item.content||''),{left:260,top:314+index*96,width:480,fontSize:18,lineHeight:1.25,fill:theme.primaryColor}));
});
}
return factory.makeGroup(items,definition,value);
}
factory.register({definition:definition,normalize:normalize,validate:validate,render:render,exportModel:normalize});
})(typeof window!=='undefined'?window:globalThis);
