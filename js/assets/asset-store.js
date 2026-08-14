(function(root){
"use strict";

var manifest=root.NaiComicAssetManifest;
var IMPORTED_PREFIX='user_data/asset_packs/imported/';

function safeStorage(){
try{return typeof localStorage!=='undefined'?localStorage:null;}catch(error){return null;}
}

function AssetStore(options){
var opts=options||{};
this.storageKey=String(opts.storageKey||'nai_comic_asset_manifest_v1');
this.assets=[];
this.files=new Map();
this.byId=new Map();
this.byHash=new Map();
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

AssetStore.prototype.rebuildIndex=function(){
this.byId=new Map();
this.byHash=new Map();
var self=this;
this.assets.forEach(function(asset){
if(asset&&asset.id)self.byId.set(asset.id,asset);
if(asset&&asset.hash)self.byHash.set(asset.hash,asset);
});
return this;
};

AssetStore.prototype.indexAsset=function(asset){
if(!asset)return this;
if(asset.id)this.byId.set(asset.id,asset);
if(asset.hash)this.byHash.set(asset.hash,asset);
return this;
};

AssetStore.prototype.unindexAsset=function(asset){
if(!asset)return this;
if(asset.id)this.byId.delete(asset.id);
if(asset.hash)this.byHash.delete(asset.hash);
return this;
};

AssetStore.prototype.findDuplicate=function(normalized){
if(!normalized)return null;
if(normalized.id&&this.byId.has(normalized.id))return this.byId.get(normalized.id);
if(normalized.hash&&this.byHash.has(normalized.hash))return this.byHash.get(normalized.hash);
return null;
};

AssetStore.prototype.load=function(){
var storage=safeStorage();
if(!storage){this.rebuildIndex();return this;}
try{
var raw=storage.getItem(this.storageKey);
if(raw){var parsed=JSON.parse(raw);this.assets=Array.isArray(parsed.assets)?parsed.assets.map(manifest.normalize):[];}
}catch(error){this.assets=[];}
this.rebuildIndex();
if(typeof this.detectMissing==='function')this.detectMissing();
return this;
};

AssetStore.prototype.save=function(){
var storage=safeStorage();
if(storage){try{storage.setItem(this.storageKey,JSON.stringify(this.toJSON()));}catch(error){}}
return this;
};

AssetStore.prototype.toJSON=function(){
var assets=this.assets.filter(function(asset){
return !isBundledPath(asset.path)&&!isBundledPath(asset.relativePath);
}).map(manifest.clone);
return {schemaVersion:manifest.SCHEMA_VERSION,assets:assets,updatedAt:new Date().toISOString()};
};

AssetStore.prototype.list=function(){return this.assets.map(manifest.clone);};

AssetStore.prototype.get=function(id){
var result=this.byId.get(id);
if(!result)result=this.assets.find(function(asset){return asset.id===id;});
return result?manifest.clone(result):null;
};

function isBundledPath(value){
var path=String(value||'').replace(/\\/g,'/');
return path.indexOf('assets/original/')===0||path.indexOf('assets/public/')===0;
}

function isPersistentPath(value){
var path=String(value||'').replace(/\\/g,'/');
return isBundledPath(path)||path.indexOf('user_data/asset_packs/')===0;
}

AssetStore.isBundledPath=isBundledPath;
AssetStore.isPersistentPath=isPersistentPath;

AssetStore.prototype.hasLoadableSource=function(asset){
if(!asset)return false;
if(this.files.has(asset.id))return true;
return isPersistentPath(asset.path)||isPersistentPath(asset.relativePath);
};

AssetStore.prototype.register=function(record,file,options){
var opts=options||{};
var normalized=manifest.normalize(record);
var duplicate=this.findDuplicate(normalized);
if(duplicate){
if(file)this.files.set(duplicate.id,file);
if(normalized.path)duplicate.path=normalized.path;
if(normalized.relativePath)duplicate.relativePath=normalized.relativePath;
if(normalized.thumbnail)duplicate.thumbnail=normalized.thumbnail;
if(this.hasLoadableSource(duplicate))duplicate.missing=false;
this.indexAsset(duplicate);
if(!opts.silent){this.save();this.emit();}
return {asset:manifest.clone(duplicate),duplicate:true};
}
var validation=manifest.validate(normalized);
if(!validation.ok)throw new Error(validation.errors.join('; '));
this.assets.push(normalized);
this.indexAsset(normalized);
if(file)this.files.set(normalized.id,file);
if(!opts.silent){this.save();this.emit();}
return {asset:manifest.clone(normalized),duplicate:false};
};

function persistToServer(asset,file){
if(typeof fetch!=='function'||typeof FileReader==='undefined')return Promise.resolve('');
if(typeof location!=='undefined'&&location.protocol==='file:')return Promise.resolve('');
return new Promise(function(resolve){
var reader=new FileReader();
reader.onload=function(){
var dataUrl=String(reader.result||'');
var comma=dataUrl.indexOf(',');
var base64=comma>=0?dataUrl.slice(comma+1):'';
fetch('/user-assets',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({id:asset.id,name:file.name||asset.name,type:file.type||asset.mime,data:base64})
}).then(function(response){return response.ok?response.json():null;}).then(function(payload){
resolve(payload&&payload.path?payload.path:'');
}).catch(function(){resolve('');});
};
reader.onerror=function(){resolve('');};
reader.readAsDataURL(file);
});
}

AssetStore.prototype.persistImported=function(asset,file){
var self=this;
if(!asset||!file)return Promise.resolve(asset);
var blobStore=root.NaiComicAssetBlobStore;
var idb=blobStore?blobStore.put(asset.id,file,{name:file.name||asset.name,type:file.type}):Promise.resolve(false);
return Promise.all([idb,persistToServer(asset,file)]).then(function(result){
var path=result[1];
if(!path)return asset;
var current=self.assets.find(function(item){return item.id===asset.id;});
if(current){
current.path=path;
current.relativePath=path;
current.missing=false;
self.save();
self.emit();
}
return self.get(asset.id)||asset;
});
};

AssetStore.prototype.addFile=function(file,options){
var self=this;
return root.NaiComicAssetScanner.inspect(file,options).then(function(result){
var registered=self.register(result.record,file);
if((options&&options.sourceType)==='imported'||result.record.sourceType==='imported'){
return self.persistImported(registered.asset,file).then(function(){return registered;});
}
return registered;
});
};

AssetStore.prototype.addFiles=function(files,options){
var self=this;
return Promise.all(Array.from(files||[]).map(function(file){return self.addFile(file,options);}));
};

AssetStore.prototype.hydrateBlobs=function(){
var self=this;
var blobStore=root.NaiComicAssetBlobStore;
if(!blobStore||typeof blobStore.all!=='function')return Promise.resolve(this);
return blobStore.all().then(function(entries){
(entries||[]).forEach(function(entry){
var file=blobStore.toFile(entry);
if(file&&entry.id)self.files.set(entry.id,file);
});
self.detectMissing();
self.emit();
return self;
});
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

AssetStore.prototype.recent=function(limit){
var size=Number(limit)||24;
return this.list().filter(function(asset){return asset.lastUsedAt;}).sort(function(a,b){
return String(b.lastUsedAt).localeCompare(String(a.lastUsedAt));
}).slice(0,size);
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
var changed=false;
this.assets.forEach(function(asset){
var missing=!self.hasLoadableSource(asset);
if(asset.missing!==missing){
asset.missing=missing;
changed=true;
}
});
if(changed)this.save();
return this.list().filter(function(asset){return asset.missing;});
};

AssetStore.prototype.registerMany=function(records,options){
var opts=options||{};
var added=0;
var skipped=0;
var self=this;
(records||[]).forEach(function(record){
var result=self.register(record,null,{silent:true});
if(result.duplicate){
skipped+=1;
if(opts.updateExisting){
var current=self.byId.get(result.asset.id)||self.assets.find(function(asset){return asset.id===result.asset.id;});
if(current){
var next=manifest.normalize(record);
current.path=next.path||current.path;
current.relativePath=next.relativePath||current.relativePath;
current.thumbnail=next.thumbnail||current.thumbnail;
current.tags=next.tags.length?next.tags:current.tags;
current.license=next.license;
current.private=next.private;
current.missing=!self.hasLoadableSource(current);
}
}
}else added+=1;
});
this.save();
this.emit();
return {added:added,skipped:skipped,total:Array.isArray(records)?records.length:0};
};

AssetStore.prototype.touch=function(id){
var asset=this.assets.find(function(item){return item.id===id;});
if(!asset)return;
asset.lastUsedAt=new Date().toISOString();
this.save();
};

AssetStore.prototype.remove=function(id){
var existing=this.byId.get(id);
var before=this.assets.length;
this.assets=this.assets.filter(function(asset){return asset.id!==id;});
this.files.delete(id);
this.unindexAsset(existing||{id:id});
if(root.NaiComicAssetBlobStore)root.NaiComicAssetBlobStore.remove(id);
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

AssetStore.prototype.bundledPath=function(asset){
if(!asset)return '';
if(isPersistentPath(asset.path))return asset.path;
if(isPersistentPath(asset.relativePath))return asset.relativePath;
return '';
};

AssetStore.prototype.getDataUrl=function(id){
var file=this.files.get(id);
if(file){
return new Promise(function(resolve,reject){
var reader=new FileReader();
reader.onload=function(event){resolve(event.target.result);};
reader.onerror=function(){reject(new Error('素材读取失败。'));};
reader.readAsDataURL(file);
});
}
var asset=this.get(id);
if(!asset)return Promise.reject(new Error('素材不存在：'+id));
var persistent=this.bundledPath(asset);
if(persistent){
if(typeof fetch==='function'&&typeof document!=='undefined'){
return fetch(persistent).then(function(response){
if(!response.ok)throw new Error('素材无法读取：'+persistent);
return response.blob();
}).then(function(blob){
return new Promise(function(resolve,reject){
var reader=new FileReader();
reader.onload=function(event){resolve(event.target.result);};
reader.onerror=function(){reject(new Error('素材读取失败。'));};
reader.readAsDataURL(blob);
});
}).catch(function(){return persistent;});
}
return Promise.resolve(persistent);
}
return Promise.reject(new Error('素材文件未加载：'+id+'。请重新导入，或点击「恢复入门包」。请用 http://127.0.0.1:8000 打开。'));
};

function selectedPanel(current){
if(!current||typeof current.getActiveObject!=='function')return null;
var object=current.getActiveObject();
if(!object)return null;
if(object.isPanel)return object;
if(typeof isPanel==='function'&&isPanel(object))return object;
return null;
}

function fitIntoPanel(image,panel){
var width=Number(panel.width)||1;
var height=Number(panel.height)||1;
var iw=Number(image.width)||1;
var ih=Number(image.height)||1;
var scale=Math.min(width/iw,height/ih,1);
image.set({
left:Number(panel.left)||0,
top:Number(panel.top)||0,
scaleX:scale,
scaleY:scale
});
}

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
var panel=selectedPanel(current);
if(panel)fitIntoPanel(image,panel);
else{
var point=position||{left:50,top:50};
image.set({left:Number(point.left)||50,top:Number(point.top)||50});
}
image.set({name:asset.name,assetId:asset.id,assetHash:asset.hash});
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
