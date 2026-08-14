(function(root){
"use strict";

var MANIFEST_PATH='assets/public/free-pack-manifest.json';
var seededStores=typeof WeakSet!=='undefined'?new WeakSet():null;
var seededFlag=false;

function seedRecords(store,assets){
if(!store||typeof store.registerMany!=='function')return {added:0,skipped:0,total:0};
return store.registerMany(assets||[],{updateExisting:true});
}

function seedFromObject(store,manifest){
var assets=manifest&&Array.isArray(manifest.assets)?manifest.assets:[];
return seedRecords(store,assets);
}

function hasKenney(store){
if(!store||!Array.isArray(store.assets))return false;
var n=0;
for(var i=0;i<store.assets.length;i++){
var tags=store.assets[i]&&store.assets[i].tags||[];
if(tags.indexOf('kenney')>=0){n+=1;if(n>=10)return true;}
}
return false;
}

function alreadySeeded(store){
if(!store)return seededFlag;
if(seededStores&&seededStores.has(store))return true;
return hasKenney(store);
}

function markSeeded(store){
seededFlag=true;
if(store&&seededStores)seededStores.add(store);
}

function loadManifest(){
if(root.NaiComicFreePackManifest)return Promise.resolve(root.NaiComicFreePackManifest);
if(typeof fetch!=='function'||typeof document==='undefined'){
return Promise.resolve(null);
}
return fetch(MANIFEST_PATH).then(function(response){
if(!response.ok)throw new Error('免费素材清单无法读取');
return response.json();
}).then(function(manifest){
root.NaiComicFreePackManifest=manifest;
return manifest;
});
}

function seed(store){
if(alreadySeeded(store))return Promise.resolve({added:0,skipped:0,total:0,already:true});
return loadManifest().then(function(manifest){
if(!manifest)return {added:0,skipped:0,total:0};
var result=seedFromObject(store,manifest);
markSeeded(store);
return result;
});
}

function restore(store){
return loadManifest().then(function(manifest){
if(!manifest||!store)return {added:0,skipped:0,total:0};
(manifest.assets||[]).forEach(function(asset){
if(asset.id&&store.get(asset.id))store.remove(asset.id);
});
var result=seedFromObject(store,manifest);
markSeeded(store);
return result;
});
}

root.NaiComicFreePack={
MANIFEST_PATH:MANIFEST_PATH,
seed:seed,
restore:restore,
seedFromObject:seedFromObject,
alreadySeeded:alreadySeeded
};
})(typeof window!=='undefined'?window:globalThis);
