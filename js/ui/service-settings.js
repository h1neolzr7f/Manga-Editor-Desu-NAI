/* exported ServiceSettings */
// 服务设置: the one place for every backend service. The real inputs other modules read
// (#mangaGptUrl/#mangaGptKey/#mangaGptModel*, #novelaiApiKey/#novelaiRememberToken) are moved in
// here, so each value has exactly one field and all existing listeners/persistence keep working.
var ServiceSettings=(function(){
var GPT_STORE='mnai.services.gpt';
var GPT_SECRET='mnai.services.gpt.key';
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
renderSummary();
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
box.querySelector('[data-role="text"]').textContent='GPT 服务：'+model+' · '+hostOf(($('mangaGptUrl')||{}).value)+' · '+(key?'已填 Key':'未填 Key（用本机 .env）');
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
var model=$('mangaGptModel').value.trim();
var images=data.imageModels||[];
if(images.length&&images.indexOf(model)<0)setStatus('svcGptStatus','warn','已连接，但没有模型 '+model+'。可用：'+images.slice(0,6).join('、'));
else setStatus('svcGptStatus','ok','已连接'+(images.length?' · 图像模型：'+images.slice(0,6).join('、'):''));
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

var cut=section('svcCutout','本机抠图（分层）','可选。没启动时会自动改用浏览器颜色抠图。');
card.appendChild(cut);
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
var tr=el('tr',{id:'usTokenPointer'});
tr.innerHTML='<td></td><td class="us-field-label">访问令牌</td><td colspan="2">Token 统一在「服务设置」里填写。 <button type="button" class="us-btn-s" id="usOpenServiceSettings">打开服务设置</button></td>';
var body=tableKey.querySelector('tbody');
if(body)body.appendChild(tr);
$('usOpenServiceSettings').addEventListener('click',function(){if(window.unifiedSettingsWindow)window.unifiedSettingsWindow.close();open('novelai');});
// remove the now-empty token rows (their inputs moved into 服务设置)
Array.prototype.forEach.call(tableKey.querySelectorAll('tr'),function(r){
if(r.id==='usTokenPointer')return;
if(/访问令牌/.test(r.textContent)&&!r.querySelector('input,select,textarea'))r.remove();
else if(!r.querySelector('input,select,textarea,button')&&!r.textContent.trim())r.remove();
});
}

function open(which){
build();
lastFocus=document.activeElement;
root.hidden=false;
var target=$(which==='novelai'?'svcNai':which==='local'?'svcLocal':which==='cutout'?'svcCutout':'svcGpt');
if(target&&target.scrollIntoView)target.scrollIntoView({block:'start'});
var first=target&&target.querySelector('input,select,button');
if(first)first.focus();
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
addPanelSummary();
addNaiPointer();
renderSummary();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,0);});
else setTimeout(init,0);

return {open:open,close:close,testGpt:testGpt,testNai:testNai,testLocal:testLocal,testCutout:testCutout,isOpen:function(){return !!root&&!root.hidden;}};
})();
if(typeof window!=='undefined')window.ServiceSettings=ServiceSettings;
