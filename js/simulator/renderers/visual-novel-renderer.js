(function(root){
"use strict";
var factory=root.NaiComicExtraRendererFactory;
var defaults={sceneType:'visual-novel',templateId:'visual-novel-generic',title:'章节标题',background:'#172033',characters:[{id:'character_a',name:'角色 A',position:'left'},{id:'character_b',name:'角色 B',position:'right'}],dialogue:[{speaker:'character_a',content:'这里是视觉小说对白。'}],choices:['继续','回到上一段'],events:[]};
var definition={id:'visual-novel-generic',name:'通用视觉小说',category:'visual-novel',canvas:{width:1000,height:1800},theme:{background:'#172033',primaryColor:'#f8fafc',secondaryColor:'#cbd5e1',accentColor:'#f59e0b',fontFamily:'system-ui'},editableFields:['title','background','characters','dialogue','choices','events'],license:{type:'original',source:'',publicAllowed:true}};
function normalize(scene){return root.NaiComicSceneSerializer.normalize(scene,'visual-novel',defaults);}
function validate(scene){var normalized=normalize(scene);var result=root.NaiComicSceneSerializer.validate(normalized,'visual-novel');if(!normalized.dialogue.length)result.errors.push('视觉小说至少需要一条对白。');return {ok:result.errors.length===0,errors:result.errors,scene:normalized};}
async function render(scene){
var value=normalize(scene),items=[],theme=Object.assign({},definition.theme,value.theme||{});
items.push(factory.rect({left:0,top:0,width:definition.canvas.width,height:definition.canvas.height,fill:value.background||theme.background}));
items.push(factory.text(value.title,{left:50,top:46,fontSize:38,fontWeight:'bold',fill:theme.primaryColor}));
value.characters.forEach(function(character,index){var x=character.position==='right'?680:90;items.push(factory.rect({left:x,top:300,width:230,height:620,rx:18,ry:18,fill:index%2?'#334155':'#475569',opacity:.86}));items.push(factory.text(character.name,{left:x+20,top:940,fontSize:24,fill:theme.primaryColor}));});
var boxY=1260;items.push(factory.rect({left:42,top:boxY,width:916,height:360,rx:24,ry:24,fill:'rgba(2,6,23,.88)',stroke:theme.accentColor,strokeWidth:3}));
var line=value.dialogue[0]||{};items.push(factory.text((line.speaker||'')+'\n'+(line.content||''),{left:76,top:boxY+48,width:840,fontSize:30,lineHeight:1.35,fill:theme.primaryColor}));
value.choices.forEach(function(choice,index){items.push(factory.rect({left:120,top:1660+index*70,width:760,height:54,rx:15,ry:15,fill:'rgba(14,116,144,.78)'}));items.push(factory.text(choice,{left:150,top:1674+index*70,width:700,textAlign:'center',fontSize:22,fill:'#fff'}));});
return factory.makeGroup(items,definition,value);
}
factory.register({definition:definition,normalize:normalize,validate:validate,render:render,exportModel:normalize});
})(typeof window!=='undefined'?window:globalThis);
