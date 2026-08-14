(function(root){
"use strict";

var STORAGE_KEY="manga-editor-brush-presets-v1";

var BUILTIN=[
{id:"ink-taper",name:"尖头墨笔",builtin:true,engine:"taper",size:16,opacity:0.92,color:"#111111",spacing:0.12,hardness:0.86,scatter:0,angleJitter:0,taperStart:0.08,taperEnd:0.55,smoothing:0.62,followPath:true,tip:""},
{id:"soft-pencil",name:"软铅笔",builtin:true,engine:"taper",size:10,opacity:0.55,color:"#2b2b2b",spacing:0.08,hardness:0.35,scatter:0.08,angleJitter:6,taperStart:0.2,taperEnd:0.35,smoothing:0.48,followPath:true,tip:""},
{id:"marker-flat",name:"平头马克笔",builtin:true,engine:"stamp",size:28,opacity:0.72,color:"#1d4ed8",spacing:0.18,hardness:0.92,scatter:0,angleJitter:0,taperStart:0,taperEnd:0,smoothing:0.2,followPath:true,tip:""},
{id:"spray-dot",name:"喷雾网点",builtin:true,engine:"stamp",size:22,opacity:0.38,color:"#111827",spacing:0.42,hardness:0.15,scatter:0.55,angleJitter:180,taperStart:0,taperEnd:0,smoothing:0.1,followPath:false,tip:""},
{id:"speed-line",name:"速度线刷",builtin:true,engine:"stamp",size:18,opacity:0.8,color:"#0f172a",spacing:0.22,hardness:0.7,scatter:0.05,angleJitter:4,taperStart:0.05,taperEnd:0.7,smoothing:0.35,followPath:true,shape:"line",tip:""},
{id:"tone-stamp",name:"网点印章",builtin:true,engine:"stamp",size:26,opacity:0.65,color:"#111111",spacing:0.7,hardness:1,scatter:0.12,angleJitter:20,taperStart:0,taperEnd:0,smoothing:0,followPath:false,shape:"dot",tip:""},
{id:"charcoal",name:"木炭",builtin:true,engine:"taper",size:22,opacity:0.42,color:"#2a2a2a",spacing:0.1,hardness:0.18,scatter:0.22,angleJitter:14,taperStart:0.15,taperEnd:0.45,smoothing:0.28,followPath:true,tip:""},
{id:"dry-ink",name:"枯笔",builtin:true,engine:"stamp",size:20,opacity:0.82,color:"#111111",spacing:0.28,hardness:0.55,scatter:0.2,angleJitter:18,taperStart:0,taperEnd:0,smoothing:0.12,followPath:true,tip:""},
{id:"hatch",name:"排线",builtin:true,engine:"stamp",size:14,opacity:0.78,color:"#0f172a",spacing:0.12,hardness:0.85,scatter:0.05,angleJitter:8,taperStart:0,taperEnd:0,smoothing:0.2,followPath:true,shape:"line",tip:""},
{id:"rain-streak",name:"雨丝刷",builtin:true,engine:"stamp",size:24,opacity:0.32,color:"#64748b",spacing:0.38,hardness:0.7,scatter:0.42,angleJitter:16,taperStart:0,taperEnd:0,smoothing:0.08,followPath:true,shape:"line",tip:""},
{id:"splat",name:"飞溅",builtin:true,engine:"stamp",size:16,opacity:0.7,color:"#7f1d1d",spacing:0.85,hardness:0.4,scatter:0.95,angleJitter:180,taperStart:0,taperEnd:0,smoothing:0,followPath:false,tip:""},
{id:"soft-glow",name:"柔光笔",builtin:true,engine:"taper",size:36,opacity:0.22,color:"#fbbf24",spacing:0.16,hardness:0.08,scatter:0.04,angleJitter:0,taperStart:0.2,taperEnd:0.2,smoothing:0.55,followPath:true,tip:""},
{id:"felt-tip",name:"水性笔",builtin:true,engine:"taper",size:8,opacity:0.95,color:"#111827",spacing:0.08,hardness:0.92,scatter:0,angleJitter:0,taperStart:0.05,taperEnd:0.28,smoothing:0.4,followPath:true,tip:""},
{id:"cloud-soft",name:"白云笔",builtin:true,engine:"stamp",size:40,opacity:0.16,color:"#e2e8f0",spacing:0.42,hardness:0.06,scatter:0.32,angleJitter:40,taperStart:0,taperEnd:0,smoothing:0.2,followPath:false,tip:""},
{id:"white-out",name:"修正白",builtin:true,engine:"taper",size:18,opacity:0.92,color:"#f8fafc",spacing:0.1,hardness:0.88,scatter:0,angleJitter:0,taperStart:0.1,taperEnd:0.22,smoothing:0.4,followPath:true,tip:""},
{id:"fine-tone",name:"细网点",builtin:true,engine:"stamp",size:12,opacity:0.5,color:"#111111",spacing:0.55,hardness:1,scatter:0.08,angleJitter:0,taperStart:0,taperEnd:0,smoothing:0,followPath:false,shape:"dot",tip:""},
{id:"wind-brush",name:"风线刷",builtin:true,engine:"stamp",size:20,opacity:0.45,color:"#64748b",spacing:0.28,hardness:0.62,scatter:0.18,angleJitter:10,taperStart:0,taperEnd:0.6,smoothing:0.22,followPath:true,shape:"line",tip:""},
{id:"sparkle-brush",name:"闪光点刷",builtin:true,engine:"stamp",size:14,opacity:0.85,color:"#fbbf24",spacing:0.9,hardness:0.2,scatter:0.7,angleJitter:180,taperStart:0,taperEnd:0,smoothing:0,followPath:false,tip:""},
{id:"thick-outline",name:"粗勾线",builtin:true,engine:"taper",size:26,opacity:0.96,color:"#0f172a",spacing:0.1,hardness:0.95,scatter:0,angleJitter:0,taperStart:0.04,taperEnd:0.18,smoothing:0.5,followPath:true,tip:""},
{id:"watercolor",name:"水彩晕",builtin:true,engine:"taper",size:42,opacity:0.18,color:"#7dd3fc",spacing:0.2,hardness:0.05,scatter:0.12,angleJitter:8,taperStart:0.25,taperEnd:0.25,smoothing:0.6,followPath:true,tip:""},
{id:"blood-drip",name:"滴溅",builtin:true,engine:"stamp",size:18,opacity:0.78,color:"#7f1d1d",spacing:0.7,hardness:0.35,scatter:0.8,angleJitter:90,taperStart:0,taperEnd:0,smoothing:0,followPath:false,tip:""},
{id:"ice-crystal",name:"冰晶",builtin:true,engine:"stamp",size:16,opacity:0.55,color:"#bae6fd",spacing:0.62,hardness:0.25,scatter:0.45,angleJitter:60,taperStart:0,taperEnd:0,smoothing:0.1,followPath:false,tip:""},
{id:"screen-fill",name:"网点填",builtin:true,engine:"stamp",size:30,opacity:0.28,color:"#111827",spacing:0.5,hardness:0.9,scatter:0.06,angleJitter:0,taperStart:0,taperEnd:0,smoothing:0,followPath:false,shape:"dot",tip:""}
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
