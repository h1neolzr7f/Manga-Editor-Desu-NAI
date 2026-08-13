(function(root){
"use strict";

var STORAGE_KEY="manga-editor-cutout-presets-v1";

var BUILTIN=[
{id:"anime-clean",name:"动漫干净抠图",builtin:true,options:{engine:"rembg",model:"isnet-anime",alpha_matting:false,fg_threshold:240,bg_threshold:10,erode_size:10,post_process_mask:true,only_mask:false,crop:true,feather:1,key_color:"#ffffff",key_tolerance:28,invert:false,action:"new"}},
{id:"anime-matte",name:"动漫精细边缘",builtin:true,options:{engine:"rembg",model:"isnet-anime",alpha_matting:true,fg_threshold:240,bg_threshold:10,erode_size:8,post_process_mask:true,only_mask:false,crop:false,feather:2,key_color:"#ffffff",key_tolerance:28,invert:false,action:"replace"}},
{id:"portrait",name:"人像抠图",builtin:true,options:{engine:"rembg",model:"birefnet-portrait",alpha_matting:true,fg_threshold:230,bg_threshold:20,erode_size:6,post_process_mask:true,only_mask:false,crop:true,feather:2,key_color:"#ffffff",key_tolerance:28,invert:false,action:"new"}},
{id:"white-bg",name:"白底颜色抠图",builtin:true,options:{engine:"color-key",model:"color-key",alpha_matting:false,fg_threshold:240,bg_threshold:10,erode_size:10,post_process_mask:false,only_mask:false,crop:true,feather:1,key_color:"#ffffff",key_tolerance:24,invert:false,action:"replace"}},
{id:"green-screen",name:"绿幕抠图",builtin:true,options:{engine:"color-key",model:"color-key",alpha_matting:false,fg_threshold:240,bg_threshold:10,erode_size:10,post_process_mask:false,only_mask:false,crop:false,feather:2,key_color:"#00ff00",key_tolerance:48,invert:false,action:"new"}}
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

function validate(preset){
if(!preset||typeof preset!=="object")return{ok:false,error:"预设不是对象"};
if(!preset.name||!String(preset.name).trim())return{ok:false,error:"预设需要名称"};
if(!preset.options||typeof preset.options!=="object")return{ok:false,error:"预设缺少 options"};
var engine=String(preset.options.engine||"rembg");
if(["rembg","color-key"].indexOf(engine)<0)return{ok:false,error:"不支持的抠图引擎"};
return{ok:true};
}

function normalize(preset){
var item=clone(preset||{});
item.id=item.id||("cutout-"+Date.now().toString(36));
item.name=String(item.name||"未命名抠图预设").trim();
item.builtin=!!item.builtin;
item.options=item.options||{};
item.options.engine=item.options.engine||"rembg";
item.options.model=item.options.model||(item.options.engine==="color-key"?"color-key":"isnet-anime");
item.options.action=item.options.action||"new";
return item;
}

function list(){
return BUILTIN.map(clone).concat(readUser().map(normalize));
}

function get(id){
var found=list().filter(function(item){return item.id===id;})[0];
return found?clone(found):null;
}

function saveUserPreset(preset){
var checked=validate(preset);
if(!checked.ok)throw new Error(checked.error);
var item=normalize(preset);
item.builtin=false;
if(BUILTIN.some(function(entry){return entry.id===item.id;}))item.id="cutout-"+Date.now().toString(36);
var current=readUser().filter(function(entry){return entry.id!==item.id;});
current.push(item);
writeUser(current);
return clone(item);
}

function removeUserPreset(id){
writeUser(readUser().filter(function(entry){return entry.id!==id;}));
}

function exportPack(){
return JSON.stringify({schemaVersion:1,kind:"manga-editor-cutout-presets",presets:readUser()},null,2);
}

function importPack(raw){
var data=typeof raw==="string"?JSON.parse(raw):raw;
var presets=data&&Array.isArray(data.presets)?data.presets:(Array.isArray(data)?data:[]);
var imported=0;
presets.forEach(function(preset){
var checked=validate(preset);
if(!checked.ok)return;
saveUserPreset(preset);
imported+=1;
});
return imported;
}

root.NaiCutoutPresets={
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
