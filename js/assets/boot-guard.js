(function(root){
"use strict";

function isFileProtocol(){
return typeof location!=='undefined'&&location.protocol==='file:';
}

var LOCAL_EDITOR_URL='http://127.0.0.1:8000/index.html';

// file:// pages have Origin 'null', exactly like sandboxed iframes on any website, so the
// local proxies refuse them (PR #6 security review). The safe bridge is to open the same
// editor from the local server. An <img> probe needs no CORS and sends no credentials.
function probeLocalServer(done){
if(typeof Image==='undefined'){done(false);return;}
var img=new Image();
var finished=false;
function finish(ok){if(finished)return;finished=true;done(ok);}
img.onload=function(){finish(true);};
img.onerror=function(){finish(false);};
setTimeout(function(){finish(false);},2500);
img.src='http://127.0.0.1:8000/favicon.ico?boot-probe='+Date.now();
}

function overlay(){
if(typeof document==='undefined'||document.getElementById('naiBootGuard'))return;
var wrap=document.createElement('div');
wrap.id='naiBootGuard';
wrap.className='nai-boot-guard';
wrap.innerHTML='<div class="nai-boot-guard-card"><strong>请用一键启动打开编辑器</strong><p>当前是 file:// 本地文件。出于安全原因，本地代理（NovelAI、GPT、OCR、LaMa、导演）只接受 <code>http://127.0.0.1:8000</code> 页面本身的请求。</p><p>请运行「一键启动.bat」，再从打开的浏览器窗口继续；如果已经启动，点击：<a id="naiBootGuardOpen" href="'+LOCAL_EDITOR_URL+'">'+LOCAL_EDITOR_URL+'</a></p><p id="naiBootGuardProbe">正在检测本地服务…</p></div>';
document.documentElement.appendChild(wrap);
probeLocalServer(function(ok){
var line=document.getElementById('naiBootGuardProbe');
if(line)line.textContent=ok?'已检测到本地服务正在运行，点击上面的链接即可打开（项目数据保存在该地址下）。':'未检测到本地服务（端口 8000），请先运行「一键启动.bat」。';
});
}

function bind(){
if(!isFileProtocol())return;
overlay();
}

root.NaiComicBootGuard={isFileProtocol:isFileProtocol,overlay:overlay,probeLocalServer:probeLocalServer,LOCAL_EDITOR_URL:LOCAL_EDITOR_URL};
if(typeof document!=='undefined'){
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
else bind();
}
})(typeof window!=='undefined'?window:globalThis);
