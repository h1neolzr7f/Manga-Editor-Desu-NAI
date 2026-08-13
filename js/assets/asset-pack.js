(function(root){
"use strict";

function downloadJson(filename,value){
if(typeof document==='undefined')return false;
var blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});
var url=URL.createObjectURL(blob);
var link=document.createElement('a');
link.href=url;
link.download=filename;
link.click();
URL.revokeObjectURL(url);
return true;
}

function importText(store,text){
var pack;
try{pack=JSON.parse(text);}catch(error){throw new Error('素材包 JSON 无法解析。');}
return store.importPack(pack);
}

root.NaiComicAssetPack={downloadJson:downloadJson,importText:importText};
})(typeof window!=='undefined'?window:globalThis);
