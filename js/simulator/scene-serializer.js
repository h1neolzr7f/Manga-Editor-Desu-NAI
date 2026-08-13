(function(root){
"use strict";

var VERSION=1;

function clone(value){return JSON.parse(JSON.stringify(value));}

function normalize(scene,sceneType,defaults){
var source=scene&&typeof scene==='object'?clone(scene):{};
var result=Object.assign({},clone(defaults||{}),source);
result.schemaVersion=VERSION;
result.sceneType=sceneType;
if(!Array.isArray(result.events))result.events=[];
return result;
}

function validate(scene,sceneType){
var errors=[];
if(!scene||typeof scene!=='object')errors.push('场景必须是对象。');
else if(scene.sceneType&&scene.sceneType!==sceneType)errors.push('场景类型不匹配：'+scene.sceneType);
return {ok:errors.length===0,errors:errors};
}

function serialize(scene){return JSON.stringify(clone(scene));}

function deserialize(value){
if(typeof value==='object'&&value!==null)return clone(value);
try{return JSON.parse(value);}catch(error){throw new Error('场景 JSON 无法解析：'+error.message);}
}

root.NaiComicSceneSerializer={VERSION:VERSION,clone:clone,normalize:normalize,validate:validate,serialize:serialize,deserialize:deserialize};
})(typeof window!=='undefined'?window:globalThis);
