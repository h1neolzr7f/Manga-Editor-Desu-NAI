(function(){
if(typeof window==='undefined'||window.Tagify)return;
var exported=null;
if(typeof module!=='undefined'&&module&&module.exports){
exported=module.exports;
}else if(typeof exports!=='undefined'&&exports){
exported=exports;
}
if(typeof exported==='function'){
window.Tagify=exported;
return;
}
if(exported&&typeof exported.default==='function'){
window.Tagify=exported.default;
return;
}
if(exported&&typeof exported.Tagify==='function'){
window.Tagify=exported.Tagify;
}
})();
