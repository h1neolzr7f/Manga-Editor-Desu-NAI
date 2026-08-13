(function(root){
"use strict";

var STORAGE_KEY="manga-editor-brush-presets-v1";

var BUILTIN=[
{id:"ink-taper",name:"尖头墨笔",builtin:true,engine:"taper",size:16,opacity:0.92,color:"#111111",spacing:0.12,hardness:0.86,scatter:0,angleJitter:0,taperStart:0.08,taperEnd:0.55,smoothing:0.62,followPath:true,tip:""},
{id:"soft-pencil",name:"软铅笔",builtin:true,engine:"taper",size:10,opacity:0.55,color:"#2b2b2b",spacing:0.08,hardness:0.35,scatter:0.08,angleJitter:6,taperStart:0.2,taperEnd:0.35,smoothing:0.48,followPath:true,tip:""},
{id:"marker-flat",name:"平头马克笔",builtin:true,engine:"stamp",size:28,opacity:0.72,color:"#1d4ed8",spacing:0.18,hardness:0.92,scatter:0,angleJitter:0,taperStart:0,taperEnd:0,smoothing:0.2,followPath:true,tip:""},
{id:"spray-dot",name:"喷雾网点",builtin:true,engine:"stamp",size:22,opacity:0.38,color:"#111827",spacing:0.42,hardness:0.15,scatter:0.55,angleJitter:180,taperStart:0,taperEnd:0,smoothing:0.1,followPath:false,tip:""},
{id:"speed-line",name:"速度线刷",builtin:true,engine:"stamp",size:18,opacity:0.8,color:"#0f172a",spacing:0.22,hardness:0.7,scatter:0.05,angleJitter:4,taperStart:0.05,taperEnd:0.7,smoothing:0.35,followPath:true,shape:"line",tip:""},
{id:"tone-stamp",name:"网点印章",builtin:true,engine:"stamp",size:26,opacity:0.65,color:"#111111",spacing:0.7,hardness:1,scatter:0.12,angleJitter:20,taperStart:0,taperEnd:0,smoothing:0,followPath:false,shape:"dot",tip:""}
];

function clone(value){
return JSON.parse(JSON.stringify(value));
}

function readUser(){
try{
var raw=root.localStorage?root.localStorage.getItem(STORAGE_KEY):null;
var parsed=raw?JSON.parse(raw):[];
return Array.isArray(parsed)?parsed:[];
}catch(error){
return[];
}
}

function writeUser(list){
if(!root.localStorage)return;
root.localStorage.setItem(STORAGE_KEY,JSON.stringify(list||[]));
}

function clamp(value,min,max,fallback){
var number=Number(value);
if(!isFinite(number))number=fallback;
return Math.max(min,Math.min(max,number));
}

function normalize(preset){
var item=clone(preset||{});
item.id=item.id||("brush-"+Date.now().toString(36));
item.name=String(item.name||"未命名笔刷").trim();
item.builtin=!!item.builtin;
item.engine=["taper","stamp"].indexOf(item.engine)>=0?item.engine:"taper";
item.size=clamp(item.size,1,180,16);
item.opacity=clamp(item.opacity,0.05,1,0.9);
item.color=item.color||"#111111";
item.spacing=clamp(item.spacing,0.04,1.5,0.16);
item.hardness=clamp(item.hardness,0,1,0.75);
item.scatter=clamp(item.scatter,0,1.5,0);
item.angleJitter=clamp(item.angleJitter,0,180,0);
item.taperStart=clamp(item.taperStart,0,1,0.1);
item.taperEnd=clamp(item.taperEnd,0,1,0.4);
item.smoothing=clamp(item.smoothing,0,1,0.45);
item.followPath=item.followPath!==false;
item.shape=item.shape||"";
item.tip=typeof item.tip==="string"?item.tip:"";
return item;
}

function validate(preset){
if(!preset||typeof preset!=="object")return{ok:false,error:"笔刷预设不是对象"};
if(!preset.name||!String(preset.name).trim())return{ok:false,error:"笔刷预设需要名称"};
if(preset.tip&&String(preset.tip).indexOf("data:image/")!==0)return{ok:false,error:"自定义笔尖必须是图片 data URL"};
return{ok:true};
}

function list(){
return BUILTIN.map(clone).concat(readUser().map(normalize));
}

function get(id){
var found=list().filter(function(item){return item.id===id;})[0];
return found?normalize(found):normalize(BUILTIN[0]);
}

function saveUserPreset(preset){
var checked=validate(preset);
if(!checked.ok)throw new Error(checked.error);
var item=normalize(preset);
item.builtin=false;
if(BUILTIN.some(function(entry){return entry.id===item.id;}))item.id="brush-"+Date.now().toString(36);
var current=readUser().filter(function(entry){return entry.id!==item.id;});
current.push(item);
writeUser(current);
return clone(item);
}

function removeUserPreset(id){
writeUser(readUser().filter(function(entry){return entry.id!==id;}));
}

function exportPack(){
return JSON.stringify({schemaVersion:1,kind:"manga-editor-brush-presets",presets:readUser()},null,2);
}

function importPack(raw){
var data=typeof raw==="string"?JSON.parse(raw):raw;
var presets=data&&Array.isArray(data.presets)?data.presets:(Array.isArray(data)?data:[]);
var imported=0;
presets.forEach(function(preset){
if(!validate(preset).ok)return;
saveUserPreset(preset);
imported+=1;
});
return imported;
}

root.NaiBrushPresets={
BUILTIN:BUILTIN,
validate:validate,
normalize:normalize,
list:list,
get:get,
saveUserPreset:saveUserPreset,
removeUserPreset:removeUserPreset,
exportPack:exportPack,
importPack:importPack
};
})(typeof window!=="undefined"?window:globalThis);
