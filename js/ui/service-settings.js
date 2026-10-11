/* exported ServiceSettings */
// 服务设置: the one place for every backend service. The real inputs other modules read
// (#mangaGptUrl/#mangaGptKey/#mangaGptModel*, #novelaiApiKey/#novelaiRememberToken) are moved in
// here, so each value has exactly one field and all existing listeners/persistence keep working.
var ServiceSettings=(function(){
var GPT_STORE='mnai.services.gpt';
var GPT_SECRET='mnai.services.gpt.key';
var OFFICIAL_GPT='https://api.openai.com/v1';
var lastTrusted=null;
var root=null;
var lastFocus=null;

function $(id){return document.getElementById(id);}
function el(tag,attrs,html){var e=document.createElement(tag);Object.keys(attrs||{}).forEach(function(k){e.setAttribute(k,attrs[k]);});if(html!=null)e.innerHTML=html;return e;}

function readGptStore(){
try{return JSON.parse(localStorage.getItem(GPT_STORE)||'null');}catch(e){return null;}
}
function gptRemember(){var box=$('svcGptRemember');return !box||box.checked;}
function saveGpt(){
var url=$('mangaGptUrl'),model=$('mangaGptModel'),key=$('mangaGptKey');
if(!url||!model)return;
try{
localStorage.setItem(GPT_STORE,JSON.stringify({baseUrl:url.value.trim(),model:model.value.trim(),remember:gptRemember()}));
var k=key?key.value.trim():'';
if(gptRemember()){if(k)localStorage.setItem(GPT_SECRET,k);else localStorage.removeItem(GPT_SECRET);sessionStorage.removeItem(GPT_SECRET);}
else{if(k)sessionStorage.setItem(GPT_SECRET,k);else sessionStorage.removeItem(GPT_SECRET);localStorage.removeItem(GPT_SECRET);}
}catch(e){/* storage blocked: values stay for this page */}
syncUrlPreset();
trustUrl(url.value.trim());
renderSummary();
}
// the server sends its .env key only to the URL saved here (gpt_image_proxy.py 'trust'); private/IP/http are refused
function trustUrl(u){
u=(u||'').replace(/\/+$/,'');
if(!u||u===lastTrusted||typeof fetch!=='function'||typeof location==='undefined'||!/^https?:$/.test(location.protocol))return;
lastTrusted=u;
fetch('/gpt-image-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'trust',baseUrl:u})})
.then(function(r){return r.json();}).then(function(d){if(d&&d.ok===false){lastTrusted=null;setStatus('svcGptStatus','error',d.error||'这个地址不能使用。');}})
.catch(function(){lastTrusted=null;});
}
function syncUrlPreset(){
var sel=$('svcGptUrlPreset'),url=$('mangaGptUrl');if(!sel||!url)return;
sel.value=url.value.trim().replace(/\/+$/,'')===OFFICIAL_GPT?'official':'custom';
}
// pure: which model to select after /v1/models (exported for tests). gpt-image-2.5 only when the service lists it.
function pickModel(images,current){
images=(images||[]).filter(Boolean);
if(!images.length)return current||'';
if(current&&images.indexOf(current)>=0)return current;
if(images.indexOf('gpt-image-2.5')>=0)return 'gpt-image-2.5';
return images[0];
}
function applyModelList(images){
var preset=$('mangaGptModelPreset'),model=$('mangaGptModel');if(!preset||!model||!images||!images.length)return;
var chosen=pickModel(images,model.value.trim());
preset.innerHTML='';
images.forEach(function(id){var o=document.createElement('option');o.value=id;o.textContent=id+(id===chosen?'（推荐）':'');preset.appendChild(o);});
var c=document.createElement('option');c.value='custom';c.textContent='自定义…';preset.appendChild(c);
preset.value=chosen;model.value=chosen;
model.dispatchEvent(new Event('input',{bubbles:true}));model.dispatchEvent(new Event('change',{bubbles:true}));
}
function restoreGpt(){
var saved=readGptStore();
var url=$('mangaGptUrl'),model=$('mangaGptModel'),preset=$('mangaGptModelPreset'),key=$('mangaGptKey');
if(!url||!model)return;
if(saved){
if(saved.baseUrl)url.value=saved.baseUrl;
if(saved.model){
model.value=saved.model;
if(preset){var known=Array.prototype.some.call(preset.options,function(o){return o.value===saved.model;});preset.value=known?saved.model:'custom';}
}
if($('svcGptRemember'))$('svcGptRemember').checked=saved.remember!==false;
}
try{var k=localStorage.getItem(GPT_SECRET)||sessionStorage.getItem(GPT_SECRET)||'';if(key&&k&&!key.value)key.value=k;}catch(e){}
}

function hostOf(u){try{return new URL(u).host;}catch(e){return u||'';}}
function renderSummary(){
var box=$('mangaGptServiceSummary');
if(!box)return;
var model=($('mangaGptModel')||{}).value||'';
var key=($('mangaGptKey')||{}).value||'';
var t=box.querySelector('[data-role="text"]');
// beginner wording; the technical details (host, key source) stay in the tooltip
t.textContent='AI 改图：'+(model||'未选模型')+(key?' · 已设置':' · 未填 Key（可用本机 .env 的 Key；不行就点「服务设置」）');
t.title=hostOf(($('mangaGptUrl')||{}).value)+' · '+(key?'已填 Key':'未填 Key（用本机 .env）');
}

function setStatus(id,kind,text){
var s=$(id);if(!s)return;
s.className='ui-badge '+(kind==='ok'?'is-ok':kind==='error'?'is-error':kind==='warn'?'is-warn':'');
s.textContent=text;
}

async function testGpt(){
saveGpt();
setStatus('svcGptStatus','', '正在连接…');
var key=($('mangaGptKey').value||'').trim().replace(/^Bearer\s+/i,'');
try{
var data=await ServiceRequest.request('gpt','/gpt-image-proxy',{body:{operation:'models',baseUrl:$('mangaGptUrl').value.trim()},
headers:key?{Authorization:'Bearer '+key}:{},timeoutMs:35000});
var images=data.imageModels||[];
if(images.length){applyModelList(images);saveGpt();setStatus('svcGptStatus','ok','已连接 · 已选模型 '+$('mangaGptModel').value+'（共 '+images.length+' 个图像模型）');}
else setStatus('svcGptStatus','warn','已连接，但服务没有列出图像模型；请在「模型」里手动填写。');
}catch(error){setStatus('svcGptStatus','error',error.userMessage||error.message);}
}
async function testNai(){
setStatus('svcNaiStatus','','正在连接…');
var token=(($('novelaiApiKey')||{}).value||'').trim();
if(!token){setStatus('svcNaiStatus','warn','还没填 NovelAI Token。');return;}
try{
var data=await ServiceRequest.request('novelai','/nai-proxy/health',{headers:{Authorization:/^bearer /i.test(token)?token:'Bearer '+token},timeoutMs:30000});
setStatus('svcNaiStatus','ok','已连接 · 订阅等级 '+(data.tier!=null?data.tier:'?')+(data.anlas!=null?' · Anlas '+data.anlas:''));
}catch(error){setStatus('svcNaiStatus','error',error.userMessage||error.message);}
}
async function testLocal(){
setStatus('svcLocalStatus','','正在检查…');
try{
var d=await ServiceRequest.request('local','/manga-smart/status',{body:{},timeoutMs:20000});
var parts=['文字识别 '+(d.ocr&&d.ocr.ready?'✓':'✗'),'LaMa 去字 '+(d.lama&&d.lama.ready?'✓':'✗'),'Manga OCR 精修 '+(d.mangaOcr&&d.mangaOcr.ready?'✓':'✗')];
setStatus('svcLocalStatus',d.ocr&&d.ocr.ready?'ok':'warn',parts.join(' · '));
}catch(error){setStatus('svcLocalStatus','error',error.userMessage||error.message);}
}
async function testCutout(){
setStatus('svcCutoutStatus','','正在检查…');
var base=(($('cutoutServiceUrl')||{}).value||'http://127.0.0.1:8765').replace(/\/+$/,'');
try{
var d=await ServiceRequest.request('cutout',base+'/health',{timeoutMs:5000});
setStatus('svcCutoutStatus','ok','已连接'+(d&&d.rembg?' · 神经网络抠图可用':' · 只有颜色抠图'));
}catch(error){
setStatus('svcCutoutStatus','warn',error.network?'未启动：会自动改用浏览器颜色抠图（白底/纯色背景可直接抠）。':(error.userMessage||error.message));
}
}

async function testDirector(){
setStatus('svcDirectorStatus','','正在测试…');
var d=window.NovelAICompositionDirector;
if(!d||typeof d.testDirectorApi!=='function'){setStatus('svcDirectorStatus','warn','AI 导演模块还没加载，稍后再试。');return;}
if(!(($('naiDirectorApiUrl')||{}).value||'').trim()){setStatus('svcDirectorStatus','warn','还没填导演 API 地址。');return;}
try{var r=await d.testDirectorApi();setStatus('svcDirectorStatus',r&&r.prompt?'ok':'warn',r&&r.prompt?'已连接 · 返回了提示词':'有响应，但没有返回提示词 JSON。');}
catch(error){setStatus('svcDirectorStatus','error',error.message||'测试失败。');}
}
var WHITE_PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFUlEQVR4nGP8//8/AzbAhFV00EoAAFbUAw037MyjAAAAAElFTkSuQmCC';
async function testTagger(){
setStatus('svcTaggerStatus','','正在测试…');
var u=(($('mangaImportTaggerUrl')||{}).value||'').trim();
if(!u){setStatus('svcTaggerStatus','warn','还没填 Tagger 地址。');return;}
var viaProxy=!$('mangaImportUseTaggerProxy')||$('mangaImportUseTaggerProxy').checked;
try{
var r=await fetch(viaProxy?'/tagger-proxy/interrogate':u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:WHITE_PNG,threshold:0.35,format:'danbooru',tagger_url:u})});
setStatus('svcTaggerStatus',r.ok?'ok':'warn',r.ok?'已连接':'没连上（HTTP '+r.status+'）：导入时会改用保守的默认标签。');
}catch(e){setStatus('svcTaggerStatus','warn','没连上：导入时会改用保守的默认标签。');}
}

function section(id,title,desc){
var s=el('section',{class:'svc-section',id:id});
s.appendChild(el('h3',{},title));
if(desc)s.appendChild(el('p',{class:'ui-muted'},desc));
return s;
}
function moveField(inputId,labelText,container){
var input=$(inputId);
if(!input)return null;
var oldLabel=input.closest('label');
var wrap=el('label',{class:'ui-field'});
wrap.appendChild(el('span',{},labelText));
wrap.appendChild(input);
container.appendChild(wrap);
if(oldLabel&&!oldLabel.querySelector('input,select,textarea'))oldLabel.remove();
return wrap;
}
function row(container){var r=el('div',{class:'svc-row'});container.appendChild(r);return r;}

function build(){
if(root)return root;
root=el('div',{class:'ui-modal-backdrop',id:'serviceSettings',role:'dialog','aria-modal':'true','aria-labelledby':'serviceSettingsTitle',hidden:''});
var card=el('div',{class:'ui-card ui-modal svc-modal'});
root.appendChild(card);
card.appendChild(el('h2',{id:'serviceSettingsTitle'},'服务设置'));
card.appendChild(el('p',{class:'ui-muted'},'所有 AI 服务都在这里设置一次，各个功能会自动使用。Key / Token 只保存在这台电脑。'));

var gpt=section('svcGpt','GPT 图像（换角色、修瑕疵、自定义修改）','填写兼容 OpenAI Images 的地址和 Key。测试连接只读取模型列表，不会生成图片、不花钱。');
card.appendChild(gpt);
var up=el('label',{class:'ui-field'});up.appendChild(el('span',{},'服务'));
var upSel=el('select',{id:'svcGptUrlPreset'},'<option value="official">OpenAI 官方（api.openai.com）</option><option value="custom">自定义 / 兼容服务（自己填地址）</option>');
up.appendChild(upSel);gpt.appendChild(up);
moveField('mangaGptUrl','API 地址（以 /v1 结尾）',gpt);
var keyWrap=moveField('mangaGptKey','API Key（可留空：使用本机 .env 里的 Key）',gpt);
var preset=$('mangaGptModelPreset'),model=$('mangaGptModel');
if(preset&&model){
var mWrap=el('label',{class:'ui-field'});mWrap.appendChild(el('span',{},'默认模型'));
var pair=el('div',{class:'svc-row'});
var pl=preset.closest('label'),ml=model.closest('label');
pair.appendChild(preset);pair.appendChild(model);mWrap.appendChild(pair);gpt.appendChild(mWrap);
[pl,ml].forEach(function(l){if(l&&l!==mWrap&&!l.querySelector('input,select,textarea'))l.remove();});
}
var gr=row(gpt);
gr.appendChild(el('label',{class:'nai-inline-check'},'<input type="checkbox" id="svcGptRemember" checked> 本机记住 Key'));
var gk=el('button',{type:'button',class:'ui-btn',id:'svcGptKeyToggle'},'显示 Key');gr.appendChild(gk);
var gt=el('button',{type:'button',class:'ui-btn ui-btn-primary',id:'svcGptTest'},'测试连接');gr.appendChild(gt);
gr.appendChild(el('span',{class:'ui-badge',id:'svcGptStatus'},'未测试'));

var nai=section('svcNai','NovelAI（AI 生图）','只在 AI 生图时使用。测试连接只读取订阅信息，不花 Anlas。');
card.appendChild(nai);
moveField('novelaiApiKey','NovelAI 访问令牌（Token）',nai);
var naiAdv=el('details',{class:'svc-adv'});naiAdv.appendChild(el('summary',{},'高级：API 地址 / 本地代理'));nai.appendChild(naiAdv);
moveField('novelaiApiUrl','NovelAI API 地址（一般不用改）',naiAdv);
var np=$('novelaiUseLocalProxy');if(np&&np.closest('label'))naiAdv.appendChild(np.closest('label'));
var nb=row(naiAdv);['novelaiApiUrlDefaultUrl','novelaiDashboard'].forEach(function(id){var b=$(id);if(b){b.classList.add('ui-btn');nb.appendChild(b);}});
var nr=row(nai);
var remember=$('novelaiRememberToken');
if(remember){var rl=remember.closest('label');if(rl){nr.appendChild(rl);}}
var toggle=$('novelaiApiKeyToggle');if(toggle){toggle.classList.add('ui-btn');nr.appendChild(toggle);}
nr.appendChild(el('button',{type:'button',class:'ui-btn ui-btn-primary',id:'svcNaiTest'},'测试连接'));
nr.appendChild(el('span',{class:'ui-badge',id:'svcNaiStatus'},'未测试'));
nr.appendChild(el('button',{type:'button',class:'ui-btn ui-btn-ghost',id:'svcNaiAdvanced'},'NovelAI 高级设置…'));

var local=section('svcLocal','本机文字识别 / 去字（改字幕）','在这台电脑上运行，免费、不联网。');
card.appendChild(local);
var lr=row(local);
lr.appendChild(el('button',{type:'button',class:'ui-btn ui-btn-primary',id:'svcLocalTest'},'检查状态'));
lr.appendChild(el('span',{class:'ui-badge',id:'svcLocalStatus'},'未检查'));

var dir=section('svcDirector','AI 导演（可选：AI 生图前自动优化提示词）','任意 OpenAI 兼容的聊天模型服务。不填就不使用，AI 生图照常可用。');
card.appendChild(dir);
var dirUse=$('naiDirectorUseApi');if(dirUse&&dirUse.closest('label'))dir.appendChild(dirUse.closest('label'));
var dirRow=$('naiDirectorApiUrl')&&$('naiDirectorApiUrl').closest('.nai-director-api-row');
if(dirRow){var dw=el('label',{class:'ui-field'});dw.appendChild(el('span',{},'导演 API 地址 / 模型'));dw.appendChild(dirRow);dir.appendChild(dw);}
moveField('naiDirectorApiKey','导演 API Key',dir);
var dr=row(dir);
var dp=$('naiDirectorUseProxy');if(dp&&dp.closest('label'))dr.appendChild(dp.closest('label'));
var dk=$('naiDirectorApiKeyToggle');if(dk){dk.classList.add('ui-btn');dr.appendChild(dk);}
var oldDirTest=$('naiDirectorTestApi');if(oldDirTest)oldDirTest.remove();
dr.appendChild(el('button',{type:'button',class:'ui-btn ui-btn-primary',id:'svcDirectorTest'},'测试连接'));
dr.appendChild(el('span',{class:'ui-badge',id:'svcDirectorStatus'},'未测试'));

var tag=section('svcTagger','导入漫画自动打标签（可选）','本机运行的 Danbooru Tagger（例如 WebUI 的 tagger 扩展）。没有也能导入，会使用保守的默认标签。');
card.appendChild(tag);
moveField('mangaImportTaggerUrl','Tagger 地址',tag);
var tr2=row(tag);
var tp=$('mangaImportUseTaggerProxy');if(tp&&tp.closest('label'))tr2.appendChild(tp.closest('label'));
tr2.appendChild(el('button',{type:'button',class:'ui-btn ui-btn-primary',id:'svcTaggerTest'},'测试连接'));
tr2.appendChild(el('span',{class:'ui-badge',id:'svcTaggerStatus'},'未测试'));

var cut=section('svcCutout','本机抠图（分层）','可选。没启动时会自动改用浏览器颜色抠图。');
card.appendChild(cut);
moveField('cutoutServiceUrl','抠图服务地址',cut);
var cr=row(cut);
cr.appendChild(el('button',{type:'button',class:'ui-btn ui-btn-primary',id:'svcCutoutTest'},'测试连接'));
cr.appendChild(el('span',{class:'ui-badge',id:'svcCutoutStatus'},'未测试'));

var foot=el('div',{class:'svc-foot'});
foot.appendChild(el('button',{type:'button',class:'ui-btn ui-btn-primary',id:'svcDone'},'完成'));
card.appendChild(foot);
document.body.appendChild(root);

root.addEventListener('click',function(e){if(e.target===root)close();});
$('svcDone').addEventListener('click',close);
$('svcGptTest').addEventListener('click',testGpt);
$('svcNaiTest').addEventListener('click',testNai);
$('svcLocalTest').addEventListener('click',testLocal);
$('svcCutoutTest').addEventListener('click',testCutout);
$('svcDirectorTest').addEventListener('click',testDirector);
$('svcTaggerTest').addEventListener('click',testTagger);
upSel.addEventListener('change',function(){var u=$('mangaGptUrl');if(!u)return;
if(upSel.value==='official'){u.value=OFFICIAL_GPT;saveGpt();}
else{if(u.value.trim().replace(/\/+$/,'')===OFFICIAL_GPT)u.value='';u.placeholder='https://你的服务地址/v1';u.focus();}});
$('svcNaiAdvanced').addEventListener('click',function(){close();if(window.unifiedSettingsWindow)window.unifiedSettingsWindow.open();});
gk.addEventListener('click',function(){var k=$('mangaGptKey');if(!k)return;var show=k.type==='password';k.type=show?'text':'password';gk.textContent=show?'隐藏 Key':'显示 Key';});
['mangaGptUrl','mangaGptKey','mangaGptModel','mangaGptModelPreset','svcGptRemember'].forEach(function(id){var x=$(id);if(x)x.addEventListener('change',saveGpt);});
if(keyWrap)keyWrap.querySelector('input').setAttribute('autocomplete','off');
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&root&&!root.hidden){e.preventDefault();e.stopPropagation();close();}},true);
return root;
}

function addPanelSummary(){
var panel=$('mangaGptPanel');
if(!panel||$('mangaGptServiceSummary'))return;
var box=el('div',{id:'mangaGptServiceSummary',class:'svc-summary'});
box.appendChild(el('span',{'data-role':'text'}));
var b=el('button',{type:'button',class:'ui-btn',id:'mangaGptServiceOpen'},'服务设置');
b.addEventListener('click',function(){open('gpt');});
box.appendChild(b);
var head=panel.querySelector('header')||panel.firstElementChild;
if(head&&head.nextSibling)panel.insertBefore(box,head.nextSibling);else panel.appendChild(box);
}
function addNaiPointer(){
var tableKey=document.querySelector('#unifiedSettingsOverlay .us-conn-table');
if(!tableKey||$('usTokenPointer'))return;
// every address / token / key now lives in 服务设置: drop the rows left with only a label, add one pointer
Array.prototype.forEach.call(tableKey.querySelectorAll('tbody tr'),function(r){
if(r.querySelector('input,select,textarea,button'))return;
var span=r.querySelector('td[rowspan]'),next=r.nextElementSibling;
if(span&&next)next.insertBefore(span,next.firstChild); // keep the service-name cell
r.remove();
});
var body=tableKey.querySelector('tbody');
if(!body)return;
var spanCell=body.querySelector('td[rowspan]');
var tr=el('tr',{id:'usTokenPointer'});
tr.innerHTML=(spanCell?'':'<td></td>')+'<td class="us-field-label">地址 / 令牌 / Key</td><td colspan="2">所有服务的地址、Token 和 Key 统一在「服务设置」里填写和测试。 <button type="button" class="us-btn-s" id="usOpenServiceSettings">打开服务设置</button></td>';
var host=spanCell?spanCell.parentNode:null;
if(host)body.insertBefore(tr,host.nextSibling);else body.insertBefore(tr,body.firstChild);
if(spanCell){var n=0,r2=spanCell.parentNode;while(r2){n++;r2=r2.nextElementSibling;}spanCell.setAttribute('rowspan',String(n));}
$('usOpenServiceSettings').addEventListener('click',function(){if(window.unifiedSettingsWindow)window.unifiedSettingsWindow.close();open('novelai');});
}

function showHint(text){
var h=$('svcHint');
if(!text){if(h)h.remove();return;}
if(!h){h=el('div',{id:'svcHint',class:'svc-hint',role:'status'});var card=root.querySelector('.ui-modal');card.insertBefore(h,card.children[2]||null);}
h.textContent=text;
}
// Is a service configured enough to try? gpt: a key here, or the server's .env key bound to this URL.
async function ready(kind){
if(kind==='novelai')return !!((($('novelaiApiKey')||{}).value||'').trim());
if(kind!=='gpt')return true;
var url=(($('mangaGptUrl')||{}).value||'').trim().replace(/\/+$/,'');
if(!url)return false;
if((($('mangaGptKey')||{}).value||'').trim())return true;
try{
var r=await fetch('/gpt-image-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'config'})});
var d=await r.json();
return !!(d&&d.envKey&&String(d.trustedBaseUrl||'').replace(/\/+$/,'')===url);
}catch(e){return true;} // cannot tell (offline page): let the task report its own error
}
var HINTS={gpt:'这个功能要用 GPT 图像服务。请先选服务、填 API 地址和 Key，点「测试连接」，然后点「完成」回到刚才的任务。',
novelai:'AI 生图要用 NovelAI。请先填访问令牌（Token），点「测试连接」，然后点「完成」。'};
async function ensureReady(kind){
if(await ready(kind))return true;
open(kind);showHint(HINTS[kind]||'');
return false;
}

function open(which){
build();
showHint('');
lastFocus=document.activeElement;
root.hidden=false;
var target=$({novelai:'svcNai',local:'svcLocal',cutout:'svcCutout',director:'svcDirector',tagger:'svcTagger'}[which]||'svcGpt');
var modal=root.querySelector('.ui-modal');
// the first section opens at the very top (title visible); others scroll to their section
if(target&&target.id!=='svcGpt'&&target.scrollIntoView)target.scrollIntoView({block:'start'});else if(modal)modal.scrollTop=0;
var first=target&&target.querySelector('input,select,button');
if(first)try{first.focus({preventScroll:true});}catch(e){first.focus();}
}
function close(){
if(!root||root.hidden)return;
saveGpt();
root.hidden=true;
var key=$('novelaiApiKey');
if(key){key.dispatchEvent(new Event('input',{bubbles:true}));key.dispatchEvent(new Event('change',{bubbles:true}));}
if(lastFocus&&lastFocus.focus)try{lastFocus.focus();}catch(e){}
}

function init(){
build();
restoreGpt();
syncUrlPreset();
addPanelSummary();
addNaiPointer();
renderSummary();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,0);});
else setTimeout(init,0);

return {open:open,close:close,testGpt:testGpt,testNai:testNai,testLocal:testLocal,testCutout:testCutout,testDirector:testDirector,testTagger:testTagger,
ready:ready,ensureReady:ensureReady,pickModel:pickModel,isOpen:function(){return !!root&&!root.hidden;}};
})();
if(typeof window!=='undefined')window.ServiceSettings=ServiceSettings;
