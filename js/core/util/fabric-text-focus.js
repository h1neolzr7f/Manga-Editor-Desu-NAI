// fabric の IText / Textbox は、入力用の 1px の textarea を
// document.body 直下に「文書座標」で置く（position: absolute + canvas._offset）。
// 画布の外側（右 / 下）にテキストを置いて編集に入ると、
// focus() がその textarea を画面内へ出そうとして document ごとスクロールし、
// 編集画面全体がずれる。その際 canvas._offset も古くなり、
// その後のクリック座標も狂う。
// focus を preventScroll 付きに差し替えて、スクロール自体を起こさせない。
(function(root){
"use strict";

var PATCHED_FLAG="__naiFocusNoScrollPatched";

// preventScroll を付けて focus する。付けられない・無視される環境でも
// スクロール位置を退避して戻すので、document は動かない。
function focusWithoutScroll(textarea){
if(!textarea||typeof textarea.focus!=="function")return;
if(textarea[PATCHED_FLAG])return;
textarea[PATCHED_FLAG]=true;
var originalFocus=textarea.focus;
textarea.focus=function(options){
var opts=options&&typeof options==="object"?options:{preventScroll:true};
if(opts.preventScroll===undefined)opts.preventScroll=true;
var scroller=document.scrollingElement||document.documentElement||document.body;
var left=scroller?scroller.scrollLeft:null;
var top=scroller?scroller.scrollTop:null;
var result;
try{
result=originalFocus.call(this,opts);
}catch(error){
result=originalFocus.call(this);
}
// preventScroll を黙って無視する実装への保険。動いた時だけ戻す。
if(scroller&&left!==null&&(scroller.scrollLeft!==left||scroller.scrollTop!==top)){
scroller.scrollLeft=left;
scroller.scrollTop=top;
}
return result;
};
}

// 位置計算は fabric のものをそのまま使う。
// 座標を変えると IME の候補ウィンドウ位置がずれる。
// スクロールさせないことだけを担当する。
function patchTextPrototype(proto){
if(!proto)return false;
// 自分で initHiddenTextarea を持つプロトタイプだけパッチする。
// Textbox のように IText を継承するものは、継承先の
// パッチをそのまま使う（二重ラップも起こらない）。
if(!Object.prototype.hasOwnProperty.call(proto,"initHiddenTextarea"))return false;
var originalInit=proto.initHiddenTextarea;
if(typeof originalInit!=="function")return false;
if(proto[PATCHED_FLAG])return false;
proto[PATCHED_FLAG]=true;
proto.initHiddenTextarea=function(){
originalInit.call(this);
focusWithoutScroll(this.hiddenTextarea);
};
return true;
}

function install(fabricApi){
if(!fabricApi)return false;
var patched=false;
if(patchTextPrototype(fabricApi.IText&&fabricApi.IText.prototype))patched=true;
if(patchTextPrototype(fabricApi.Textbox&&fabricApi.Textbox.prototype))patched=true;
if(patchTextPrototype(fabricApi.Text&&fabricApi.Text.prototype))patched=true;
return patched;
}

var target=root.fabric||(typeof fabric!=="undefined"?fabric:null);
install(target);
root.NaiFabricTextFocus={install:install,patchedFlag:PATCHED_FLAG};

})(typeof window!=="undefined"?window:globalThis);
