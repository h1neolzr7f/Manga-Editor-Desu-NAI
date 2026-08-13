(function(root){
"use strict";

var manifest=root.NaiComicAssetManifest;

function safeStorage(){
try{return typeof localStorage!=='undefined'?localStorage:null;}catch(error){return null;}
}

function AssetStore(options){
var opts=options||{};
this.storageKey=String(opts.storageKey||'nai_comic_asset_manifest_v1');
this.assets=[];
this.files=new Map();
this.listeners=[];
this.load();
}

AssetStore.prototype.onChange=function(listener){
if(typeof listener==='function')this.listeners.push(listener);
return this;
};

AssetStore.prototype.emit=function(){
var self=this;
this.listeners.forEach(function(listener){listener(self.list());});
};

AssetStore.prototype.load=function(){
var storage=safeStorage();
if(!storage)return this;
try{
var raw=storage.getItem(this.storageKey);
if(raw){var parsed=JSON.parse(raw);this.assets=Array.isArray(parsed.assets)?parsed.assets.map(manifest.normalize):[];}
}catch(error){this.assets=[];}
if(typeof this.detectMissing==='function')this.detectMissing();
return this;
};

AssetStore.prototype.save=function(){
var storage=safeStorage();
if(storage){try{storage.setItem(this.storageKey,JSON.stringify(this.toJSON()));}catch(error){}}
return this;
};

AssetStore.prototype.toJSON=function(){
return {schemaVersion:manifest.SCHEMA_VERSION,assets:this.assets.map(manifest.clone),updatedAt:new Date().toISOString()};
};

AssetStore.prototype.list=function(){return this.assets.map(manifest.clone);};

AssetStore.prototype.get=function(id){
var result=this.assets.find(function(asset){return asset.id===id;});
return result?manifest.clone(result):null;
};

AssetStore.prototype.register=function(record,file){
var normalized=manifest.normalize(record);
var duplicate=this.assets.find(function(asset){return normalized.hash&&asset.hash===normalized.hash;});
if(duplicate){
if(file)this.files.set(duplicate.id,file);
return {asset:manifest.clone(duplicate),duplicate:true};
}
var validation=manifest.validate(normalized);
if(!validation.ok)throw new Error(validation.errors.join('; '));
this.assets.push(normalized);
if(file)this.files.set(normalized.id,file);
this.save();
this.emit();
return {asset:manifest.clone(normalized),duplicate:false};
};

AssetStore.prototype.addFile=function(file,options){
var self=this;
return root.NaiComicAssetScanner.inspect(file,options).then(function(result){
return self.register(result.record,file);
});
};

AssetStore.prototype.addFiles=function(files,options){
var self=this;
return Promise.all(Array.from(files||[]).map(function(file){return self.addFile(file,options);}));
};

AssetStore.prototype.search=function(query,tags){
var text=String(query||'').trim().toLowerCase();
var wanted=Array.isArray(tags)?tags.map(function(tag){return String(tag).toLowerCase();}).filter(Boolean):[];
return this.assets.filter(function(asset){
var haystack=[asset.name,asset.path,asset.type,asset.creator].concat(asset.tags).join(' ').toLowerCase();
var matchesText=!text||haystack.indexOf(text)>=0;
var matchesTags=!wanted.length||wanted.every(function(tag){return asset.tags.map(function(value){return value.toLowerCase();}).indexOf(tag)>=0;});
return matchesText&&matchesTags;
}).map(manifest.clone);
};

AssetStore.prototype.markMissing=function(id,missing){
var asset=this.assets.find(function(item){return item.id===id;});
if(!asset)return false;
asset.missing=missing!==false;
asset.updatedAt=new Date().toISOString();
this.save();
this.emit();
return true;
};

AssetStore.prototype.detectMissing=function(){
var self=this;
this.assets.forEach(function(asset){asset.missing=!self.files.has(asset.id);});
this.save();
return this.list().filter(function(asset){return asset.missing;});
};

AssetStore.prototype.touch=function(id){
var asset=this.assets.find(function(item){return item.id===id;});
if(!asset)return;
asset.lastUsedAt=new Date().toISOString();
this.save();
};

AssetStore.prototype.remove=function(id){
var before=this.assets.length;
this.assets=this.assets.filter(function(asset){return asset.id!==id;});
this.files.delete(id);
if(this.assets.length!==before){this.save();this.emit();return true;}
return false;
};

AssetStore.prototype.exportPack=function(options){
var opts=options||{};
var assets=this.assets.map(manifest.clone);
if(!opts.includeThumbnails)assets.forEach(function(asset){asset.thumbnail='';});
return {schemaVersion:1,type:'nai-comic-asset-pack',assets:assets,createdAt:new Date().toISOString()};
};

AssetStore.prototype.importPack=function(pack){
if(!pack||pack.type!=='nai-comic-asset-pack')throw new Error('素材包格式不受支持。');
var imported=0;
var self=this;
(pack.assets||[]).forEach(function(asset){
var result=self.register(asset,null);
if(!result.duplicate)imported+=1;
});
return {imported:imported,total:Array.isArray(pack.assets)?pack.assets.length:0};
};

AssetStore.prototype.getDataUrl=function(id){
var file=this.files.get(id);
if(!file)return Promise.reject(new Error('素材文件未加载：'+id));
return new Promise(function(resolve,reject){
var reader=new FileReader();
reader.onload=function(event){resolve(event.target.result);};
reader.onerror=function(){reject(new Error('素材读取失败。'));};
reader.readAsDataURL(file);
});
};

AssetStore.prototype.addToCanvas=function(id,position){
var self=this;
var current=typeof canvas!=='undefined'?canvas:root.canvas;
if(!current||!root.fabric||!root.fabric.Image) return Promise.reject(new Error('Canvas 或 Fabric 尚未就绪。'));
var asset=this.get(id);
if(!asset)return Promise.reject(new Error('素材不存在：'+id));
return this.getDataUrl(id).then(function(dataUrl){
return new Promise(function(resolve,reject){
root.fabric.Image.fromURL(dataUrl,function(image){
if(!image){reject(new Error('素材无法载入画布。'));return;}
var point=position||{left:50,top:50};
image.set({left:Number(point.left)||50,top:Number(point.top)||50,name:asset.name,assetId:asset.id,assetHash:asset.hash});
if(typeof getGUID==='function')getGUID(image);else image.guid=manifest.makeId(asset.id);
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
current.add(image);
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
if(typeof saveInitialState==='function')saveInitialState(image);
if(typeof updateLayerPanel==='function')updateLayerPanel();
if(typeof saveStateByManual==='function')saveStateByManual();
self.touch(asset.id);
resolve(image);
});
});
});
};

root.NaiComicAssetStore=AssetStore;
root.NaiComicAssetStoreDefault=new AssetStore();
})(typeof window!=='undefined'?window:globalThis);
