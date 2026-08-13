(function(root){
"use strict";

var SCHEMA_VERSION=1;
var DEFAULT_LICENSE={type:'unknown',source:'',publicAllowed:false,notes:''};

function clone(value){
if(value===undefined||value===null)return value;
return JSON.parse(JSON.stringify(value));
}

function now(){return new Date().toISOString();}

function makeId(seed){
var base=String(seed||'asset');
return 'asset_'+base.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48)+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
}

function normalizeLicense(value){
var input=value&&typeof value==='object'?value:{};
return {
type:String(input.type||DEFAULT_LICENSE.type),
source:String(input.source||''),
publicAllowed:input.publicAllowed===true,
notes:String(input.notes||'')
};
}

function normalizeAsset(value){
var input=value&&typeof value==='object'?value:{};
var file=input.file&&typeof input.file==='object'?input.file:{};
var record={
schemaVersion:SCHEMA_VERSION,
id:String(input.id||makeId(input.name||file.name||'asset')),
name:String(input.name||file.name||'未命名素材'),
type:String(input.type||'image'),
path:String(input.path||file.path||''),
relativePath:String(input.relativePath||file.relativePath||''),
mime:String(input.mime||file.mime||''),
size:Number(input.size||file.size||0),
width:Number(input.width||0),
height:Number(input.height||0),
hash:String(input.hash||''),
tags:Array.isArray(input.tags)?input.tags.map(String):[],
sourceType:String(input.sourceType||'imported'),
sourceUrl:String(input.sourceUrl||''),
creator:String(input.creator||''),
license:normalizeLicense(input.license||{type:input.license||''}),
thumbnail:String(input.thumbnail||''),
createdAt:String(input.createdAt||now()),
updatedAt:String(input.updatedAt||now()),
lastUsedAt:String(input.lastUsedAt||''),
missing:input.missing===true,
private:input.private!==false
};
record.tags=Array.from(new Set(record.tags.filter(Boolean)));
return record;
}

function validate(value){
var errors=[];
var record=normalizeAsset(value);
if(!record.id)errors.push('asset id is required');
if(!record.name)errors.push('asset name is required');
if(!record.type)errors.push('asset type is required');
if(record.license.publicAllowed&&!record.license.type)errors.push('public asset license type is required');
if(record.size<0)errors.push('asset size cannot be negative');
return {ok:errors.length===0,errors:errors,asset:record};
}

root.NaiComicAssetManifest={
SCHEMA_VERSION:SCHEMA_VERSION,
DEFAULT_LICENSE:clone(DEFAULT_LICENSE),
makeId:makeId,
clone:clone,
normalize:normalizeAsset,
validate:validate
};
})(typeof window!=='undefined'?window:globalThis);
