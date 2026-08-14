(function(root){
"use strict";

var STORAGE_KEY='manga-editor-sfx-custom-v1';
var STYLE_NAMES={wild:'爆炸',broken:'碎裂',scratch:'刮痕',thrill:'震动',layered:'层叠',cloud:'云朵',zebra:'条纹',mesh:'网点',shadow:'阴影'};

var BUILTIN=[
{id:'don',text:'ドン',style:'wild'},
{id:'baki',text:'バキッ',style:'broken'},
{id:'gogogo',text:'ゴゴゴゴ',style:'scratch'},
{id:'zawa',text:'ザワ…',style:'thrill'},
{id:'dokun',text:'ドクン',style:'layered'},
{id:'shaan',text:'シャーン',style:'zebra'},
{id:'peng',text:'砰！',style:'wild'},
{id:'sou',text:'嗖—',style:'scratch'},
{id:'ka',text:'咔！',style:'broken'},
{id:'hua',text:'哗啦',style:'cloud'},
{id:'dong',text:'咚咚',style:'layered'},
{id:'si',text:'嘶—',style:'thrill'},
{id:'ga',text:'ガーン',style:'wild'},
{id:'ban',text:'バン！',style:'broken'},
{id:'dokan',text:'ドカーン',style:'wild'},
{id:'pishari',text:'ピシャリ',style:'zebra'},
{id:'kii',text:'キーッ',style:'scratch'},
{id:'zuun',text:'ズーン',style:'thrill'},
{id:'waku',text:'ワクワク',style:'layered'},
{id:'kira',text:'キラッ',style:'zebra'},
{id:'peta',text:'ペタ',style:'cloud'},
{id:'gacha',text:'ガチャ',style:'broken'},
{id:'hyuu',text:'ヒュー',style:'scratch'},
{id:'jiii',text:'ジッ…',style:'thrill'},
{id:'ha',text:'哈！',style:'wild'},
{id:'hong',text:'轰隆',style:'wild'},
{id:'pa',text:'啪！',style:'broken'},
{id:'ding',text:'叮—',style:'zebra'},
{id:'huhu',text:'呼呼',style:'cloud'},
{id:'guji',text:'咕叽',style:'cloud'},
{id:'ceng',text:'噌！',style:'scratch'},
{id:'sha',text:'刷—',style:'scratch'},
{id:'tong',text:'嗵',style:'layered'},
{id:'ling',text:'铃铃',style:'zebra'},
{id:'huaa',text:'哗——',style:'cloud'},
{id:'silence',text:'……',style:'thrill'},
{id:'dotan',text:'ドタン',style:'broken'},
{id:'suu',text:'スー',style:'thrill'},
{id:'peta2',text:'啪嗒',style:'layered'},
{id:'zan',text:'唰！',style:'wild'}
];

function clone(value){return JSON.parse(JSON.stringify(value));}

function readUser(){
try{
var raw=root.localStorage?root.localStorage.getItem(STORAGE_KEY):null;
var parsed=raw?JSON.parse(raw):[];
return Array.isArray(parsed)?parsed:[];
}catch(error){return [];}
}

function writeUser(list){
if(root.localStorage)root.localStorage.setItem(STORAGE_KEY,JSON.stringify(list||[]));
}

function normalize(item){
item=item&&typeof item==='object'?item:{};
return {
id:String(item.id||('sfx-'+Date.now().toString(36))),
text:String(item.text||'').trim(),
style:String(item.style||'wild')
};
}

function list(){
return BUILTIN.map(clone).concat(readUser().map(normalize));
}

function saveCustom(item){
var next=normalize(item);
if(!next.text)throw new Error('拟声词不能为空。');
var current=readUser().filter(function(entry){return entry.id!==next.id&&entry.text!==next.text;});
current.push(next);
writeUser(current);
return clone(next);
}

function removeCustom(id){
writeUser(readUser().filter(function(item){return item.id!==id;}));
}

function insert(item){
var value=normalize(item);
if(!value.text)throw new Error('拟声词不能为空。');
var style=value.style||'wild';
if(typeof switchText2==='function')switchText2(style);
var input=typeof document!=='undefined'?document.getElementById(style+'-Text'):null;
if(input){
input.value=value.text;
input.dispatchEvent(new Event('input',{bubbles:true}));
}
if(root.sidebarValueMap&&typeof root.sidebarValueMap.set==='function')root.sidebarValueMap.set(style+'-Text',value.text);
if(typeof updateText2==='function')updateText2();
if(root.NaiVisualStudio&&typeof root.NaiVisualStudio.refresh==='function')root.NaiVisualStudio.refresh();
return value;
}

function renderPalette(){
var container=typeof document!=='undefined'?document.getElementById('sfxPaletteList'):null;
if(!container)return;
container.innerHTML='';
list().forEach(function(item){
var button=document.createElement('button');
button.type='button';
button.className='sfx-chip';
button.textContent=item.text;
button.title=item.text+' · '+(STYLE_NAMES[item.style]||item.style)+' · 点一下套到当前文字';
button.addEventListener('click',function(){insert(item);});
container.appendChild(button);
});
}

function bind(){
if(typeof document==='undefined'||document.documentElement.getAttribute('data-sfx-palette')==='1')return;
document.documentElement.setAttribute('data-sfx-palette','1');
renderPalette();
var add=document.getElementById('sfxPaletteAdd');
var input=document.getElementById('sfxPaletteInput');
var style=document.getElementById('sfxPaletteStyle');
if(add)add.addEventListener('click',function(){
try{
saveCustom({text:input&&input.value,style:style&&style.value});
if(input)input.value='';
renderPalette();
}catch(error){
if(typeof createToastError==='function')createToastError('拟声词',error.message,3000);
}
});
}

root.NaiSfxPalette={
BUILTIN:BUILTIN,
list:list,
saveCustom:saveCustom,
removeCustom:removeCustom,
insert:insert,
renderPalette:renderPalette
};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
