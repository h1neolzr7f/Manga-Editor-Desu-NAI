(function(root){
"use strict";

var DB_NAME='nai_comic_imported_assets_v1';
var STORE='blobs';

function openDb(){
if(typeof indexedDB==='undefined')return Promise.reject(new Error('IndexedDB 不可用'));
return new Promise(function(resolve,reject){
var request=indexedDB.open(DB_NAME,1);
request.onupgradeneeded=function(){
if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);
};
request.onsuccess=function(){resolve(request.result);};
request.onerror=function(){reject(request.error||new Error('IndexedDB 打开失败'));};
});
}

function put(id,blob,meta){
return openDb().then(function(db){
return new Promise(function(resolve,reject){
var tx=db.transaction(STORE,'readwrite');
tx.objectStore(STORE).put({id:id,blob:blob,name:(meta&&meta.name)||id,type:(meta&&meta.type)||blob.type||'application/octet-stream',updatedAt:Date.now()},id);
tx.oncomplete=function(){resolve(true);};
tx.onerror=function(){reject(tx.error);};
});
});
}

function get(id){
return openDb().then(function(db){
return new Promise(function(resolve,reject){
var tx=db.transaction(STORE,'readonly');
var request=tx.objectStore(STORE).get(id);
request.onsuccess=function(){resolve(request.result||null);};
request.onerror=function(){reject(request.error);};
});
}).catch(function(){return null;});
}

function remove(id){
return openDb().then(function(db){
return new Promise(function(resolve){
var tx=db.transaction(STORE,'readwrite');
tx.objectStore(STORE).delete(id);
tx.oncomplete=function(){resolve(true);};
tx.onerror=function(){resolve(false);};
});
}).catch(function(){return false;});
}

function all(){
return openDb().then(function(db){
return new Promise(function(resolve,reject){
var tx=db.transaction(STORE,'readonly');
var request=tx.objectStore(STORE).getAll();
request.onsuccess=function(){resolve(request.result||[]);};
request.onerror=function(){reject(request.error);};
});
}).catch(function(){return [];});
}

function toFile(entry){
if(!entry||!entry.blob)return null;
try{return new File([entry.blob],entry.name||entry.id,{type:entry.type||entry.blob.type||'application/octet-stream'});}
catch(error){return entry.blob;}
}

root.NaiComicAssetBlobStore={put:put,get:get,remove:remove,all:all,toFile:toFile};
})(typeof window!=='undefined'?window:globalThis);
