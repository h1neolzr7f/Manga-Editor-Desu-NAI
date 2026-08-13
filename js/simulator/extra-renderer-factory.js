(function(root){
"use strict";

var renderers=Object.create(null);

function fabric(){
if(!root.fabric)throw new Error('Fabric.js 尚未加载。');
return root.fabric;
}

function text(value,options){
var api=fabric();
var config=Object.assign({fontFamily:'system-ui',fontSize:24,fill:'#f8fafc',originX:'left',originY:'top'},options||{});
return api.Textbox?new api.Textbox(String(value||''),config):new api.Text(String(value||''),config);
}

function rect(options){return new (fabric().Rect)(Object.assign({originX:'left',originY:'top'},options||{}));}

function makeGroup(items,definition,scene){
var api=fabric();
var group=new api.Group(items,{left:0,top:0,originX:'left',originY:'top',objectCaching:false,subTargetCheck:true,interactive:true});
group.set({customType:'simulatorExtra',simulatorType:definition.category,simulatorSchemaVersion:1,simulatorTemplateId:definition.id,simulatorEditable:true,simulatorScene:root.NaiComicSceneSerializer.serialize(scene),name:'模拟器：'+definition.name});
var parentGuid=typeof getGUID==='function'?getGUID(group):('simulator_'+Date.now().toString(36));
group.guids=[];
if(typeof group.getObjects==='function')group.getObjects().forEach(function(child,index){
var childGuid=typeof getGUID==='function'?getGUID(child):parentGuid+'_child_'+index;
child.simulatorParentGuid=parentGuid;
group.guids.push(childGuid);
});
return group;
}

function baseDefinition(definition){
return Object.assign({schemaVersion:1,canvas:{width:1000,height:1800},theme:{fontFamily:'system-ui',primaryColor:'#f8fafc',secondaryColor:'#94a3b8',background:'#111827',accentColor:'#38bdf8'},editableFields:['title','events','theme'],assets:[],license:{type:'original',source:'',publicAllowed:true}},definition);
}

function register(renderer){
var definition=baseDefinition(renderer.definition);
if(root.NaiComicTemplateRegistry){
try{root.NaiComicTemplateRegistry.register(definition);}catch(error){if(!root.NaiComicTemplateRegistry.get(definition.id))throw error;}
}
renderers[definition.id]=Object.assign({},renderer,{definition:definition});
return renderers[definition.id];
}

function get(id){return renderers[id]||null;}
function list(){return Object.keys(renderers).map(function(id){return renderers[id];});}

root.NaiComicExtraRendererFactory={fabric:fabric,text:text,rect:rect,makeGroup:makeGroup,baseDefinition:baseDefinition,register:register,get:get,list:list};
root.NaiComicExtraRendererRegistry={get:get,list:list};
})(typeof window!=='undefined'?window:globalThis);
