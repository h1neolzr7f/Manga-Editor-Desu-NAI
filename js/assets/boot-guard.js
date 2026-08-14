(function(root){
"use strict";

function isFileProtocol(){
return typeof location!=='undefined'&&location.protocol==='file:';
}

function overlay(){
if(typeof document==='undefined'||document.getElementById('naiBootGuard'))return;
var wrap=document.createElement('div');
wrap.id='naiBootGuard';
wrap.className='nai-boot-guard';
wrap.innerHTML='<div class="nai-boot-guard-card"><strong>请用一键启动打开编辑器</strong><p>当前是 file:// 本地文件。免费素材、入门包和 NovelAI 出图都需要 <code>http://127.0.0.1:8000</code>。</p><p>请运行「一键启动.bat」，再从打开的浏览器窗口继续。</p></div>';
document.documentElement.appendChild(wrap);
}

function bind(){
if(!isFileProtocol())return;
overlay();
}

root.NaiComicBootGuard={isFileProtocol:isFileProtocol,overlay:overlay};
if(typeof document!=='undefined'){
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
else bind();
}
})(typeof window!=='undefined'?window:globalThis);
