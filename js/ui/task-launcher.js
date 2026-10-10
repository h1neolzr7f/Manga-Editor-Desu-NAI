/* exported TaskLauncher */
// 新手任务: a task-first entry on top of the existing editor. Each task is a short wizard that
// drives an existing feature in a simplified view (preset parameters hidden); 高级 reveals the full
// controls, and 专业模式 brings back the complete original UI.
var TaskLauncher=(function(){
var MODE_KEY='mnai.uiMode';
var active=null;
var timer=null;

function $(id){return document.getElementById(id);}
function el(tag,attrs,html){var e=document.createElement(tag);Object.keys(attrs||{}).forEach(function(k){e.setAttribute(k,attrs[k]);});if(html!=null)e.innerHTML=html;return e;}
function toast(title,msg,isError){
if(isError&&typeof createToastError==='function')return createToastError(title,msg);
if(typeof createToast==='function')createToast(title,msg,3200);
}
function hasPage(){
try{return typeof canvas!=='undefined'&&canvas&&canvas.getObjects().some(function(o){return o.type==='image';});}catch(e){return false;}
}

var GPT_PRESETS={
swap:'Replace the character inside the selected area with the character shown in the reference image(s): face, hair, outfit and colours. '+
'Keep the original pose, framing, camera angle, lighting, line art and screentone style. Keep everything outside the character unchanged.',
fix:'Remove the unwanted object, mark or blemish inside the selected area and rebuild what was behind it so it blends naturally with the '+
'surroundings (same line art, screentone and lighting). Do not add anything new. Keep everything else unchanged.'
};

var TASKS=[
{id:'swap',icon:'switch_account',title:'换角色',desc:'把画里的人换成你的角色',kind:'gpt',
steps:['在画布上拖一个框，框住要换的人物','上传新角色的参考图（推荐）','点「生成预览」，可用「对比原图」看前后','满意就点「作为新图层应用」'],
placeholder:'补充要求（可不填），例如：表情改成微笑',preset:GPT_PRESETS.swap},
{id:'caption',icon:'translate',title:'改字幕',desc:'识别气泡里的字，改成新台词',kind:'caption',
steps:['点「检测本页文字」（识别不到就点「手动框选字幕」）','在每条下面改成新台词','点「应用为可编辑图层」，旧字会自动盖掉']},
{id:'fix',icon:'healing',title:'修瑕疵 / 去杂物',desc:'框住不想要的东西，AI 补好背景',kind:'gpt',
steps:['在画布上拖一个框，框住要去掉的东西','点「生成预览」，可用「对比原图」看前后','满意就点「作为新图层应用」'],
placeholder:'补充说明（可不填），例如：去掉右下角的水印',preset:GPT_PRESETS.fix},
{id:'layer',icon:'layers',title:'分层',desc:'把人物或物体抠成独立图层',kind:'layer',
steps:['点「开始框选」，在画布上框住要分出来的人物或物体','自动抠图并放到新图层（原图不变，可撤销）']},
{id:'custom',icon:'auto_fix_high',title:'自定义修改',desc:'框一块区域，用一句话描述怎么改',kind:'gpt',
steps:['在画布上拖一个框，框住要改的地方','写一句想怎么改（可加参考图）','点「生成预览」，满意就应用'],
placeholder:'想怎么改？例如：把天空改成黄昏',preset:''},
{id:'nai',icon:'brush',title:'AI 生图',desc:'用 NovelAI 从文字生成新画面',kind:'nai',
steps:['在「服务设置」里填好 NovelAI Token','在「自动生成」面板写画面描述','点生成（会花 Anlas，先看提示）']}
];
function task(id){return TASKS.filter(function(t){return t.id===id;})[0];}

// ---------- mode ----------
function mode(){try{return localStorage.getItem(MODE_KEY)==='pro'?'pro':'beginner';}catch(e){return 'beginner';}}
function applyMode(m){
document.body.classList.toggle('ui-beginner',m==='beginner');
document.body.classList.toggle('ui-pro',m==='pro');
var t=$('uiModeToggle');
if(t){t.textContent=m==='beginner'?'专业模式':'新手模式';t.title=m==='beginner'?'显示全部工具和参数（原版界面）':'回到按任务操作的简洁界面';t.setAttribute('aria-pressed',String(m==='pro'));}
updateHome();
}
function setMode(m){try{localStorage.setItem(MODE_KEY,m);}catch(e){}if(m==='pro')stop();applyMode(m);}

// ---------- task bar + home ----------
function buildBar(){
var header=document.querySelector('#canvas-area .area-header');
if(!header||$('taskBar'))return;
var bar=el('div',{id:'taskBar',class:'task-bar',role:'toolbar','aria-label':'新手任务'});
TASKS.forEach(function(t){
var b=el('button',{type:'button',class:'ui-btn task-btn','data-task':t.id,id:'taskBtn-'+t.id,title:t.desc},'<i class="material-icons" aria-hidden="true">'+t.icon+'</i>'+t.title);
b.addEventListener('click',function(){start(t.id);});
bar.appendChild(b);
});
var gear=el('button',{type:'button',class:'ui-btn task-util',id:'taskServiceSettings',title:'GPT / NovelAI / 本机服务的地址和 Key'},'<i class="material-icons" aria-hidden="true">settings</i>服务设置');
gear.addEventListener('click',function(){if(window.ServiceSettings)ServiceSettings.open('gpt');});
bar.appendChild(gear);
var toggle=el('button',{type:'button',class:'ui-btn ui-btn-ghost task-util',id:'uiModeToggle'},'专业模式');
toggle.addEventListener('click',function(){setMode(mode()==='beginner'?'pro':'beginner');});
bar.appendChild(toggle);
header.insertBefore(bar,header.firstChild);
}
function buildHome(){
if($('taskHome'))return;
var area=$('canvas-area');
if(!area)return;
var home=el('section',{id:'taskHome',class:'ui-card task-home','aria-labelledby':'taskHomeTitle'});
home.innerHTML='<h2 id="taskHomeTitle">想做什么？</h2><p class="ui-muted">先导入漫画页，再选一个任务。每个任务只有几步，参数已经帮你选好。</p>';
var imp=el('button',{type:'button',class:'ui-btn ui-btn-primary task-import',id:'taskHomeImport'},'<i class="material-icons" aria-hidden="true">upload_file</i>导入漫画页（可多选）');
imp.addEventListener('click',function(){var input=$('imageInput');if(input)input.click();});
home.appendChild(imp);
var grid=el('div',{class:'task-grid'});
TASKS.forEach(function(t){
var c=el('button',{type:'button',class:'task-tile','data-task':t.id},'<i class="material-icons" aria-hidden="true">'+t.icon+'</i><strong>'+t.title+'</strong><span>'+t.desc+'</span>');
c.addEventListener('click',function(){start(t.id);});
grid.appendChild(c);
});
home.appendChild(grid);
var close=el('button',{type:'button',class:'ui-btn ui-btn-ghost task-home-close',title:'先不选','aria-label':'关闭'},'×');
close.addEventListener('click',function(){home.dataset.dismissed='1';updateHome();});
home.appendChild(close);
area.appendChild(home);
}
function updateHome(){
var home=$('taskHome');
if(!home)return;
home.hidden=mode()!=='beginner'||hasPage()||home.dataset.dismissed==='1'||!!active;
}

// ---------- wizard head (inside the driven panel) ----------
function head(t,container,before){
var old=$('mangaGptTaskHead');if(old)old.remove();
var h=el('div',{id:'mangaGptTaskHead',class:'task-head'});
h.innerHTML='<div class="task-head-top"><strong>'+t.title+'</strong><span class="ui-muted">新手任务</span></div>';
var ol=el('ol',{class:'task-steps'});
t.steps.forEach(function(s,i){ol.appendChild(el('li',{'data-step':String(i)},s));});
h.appendChild(ol);
var row=el('div',{class:'task-head-row'});
var adv=el('label',{class:'task-adv'},'<input type="checkbox" id="taskAdvanced"> 高级（显示全部参数）');
row.appendChild(adv);
var back=el('button',{type:'button',class:'ui-btn ui-btn-ghost',id:'taskBack'},'换个任务');
row.appendChild(back);
h.appendChild(row);
container.insertBefore(h,before||container.firstChild);
$('taskAdvanced').addEventListener('change',function(e){
if(t.kind==='gpt'&&window.MangaGPTRegionEditor)MangaGPTRegionEditor.setSimple(!e.target.checked);
if(t.kind==='caption'&&window.MangaSmartTextEditor)MangaSmartTextEditor.setSimple(!e.target.checked);
});
back.addEventListener('click',function(){stop(true);});
return h;
}
function markStep(n,doneAll){
var h=$('mangaGptTaskHead');if(!h)return;
Array.prototype.forEach.call(h.querySelectorAll('li'),function(li,i){
li.classList.toggle('is-done',doneAll||i<n);
li.classList.toggle('is-current',!doneAll&&i===n);
});
}

// ---------- wizard card (分层 / AI 生图) ----------
function card(t){
var old=$('taskWizardCard');if(old)old.remove();
var c=el('section',{id:'taskWizardCard',class:'ui-card task-card',role:'dialog','aria-labelledby':'taskWizardTitle'});
c.innerHTML='<header><strong id="taskWizardTitle">'+t.title+'</strong><button type="button" class="ui-btn ui-btn-ghost" id="taskWizardClose" aria-label="关闭">×</button></header>';
document.body.appendChild(c);
head(t,c,null);
$('taskWizardClose').addEventListener('click',function(){stop(true);});
var body=el('div',{class:'task-card-body',id:'taskWizardBody'});
c.appendChild(body);
return body;
}

// ---------- start / stop ----------
function start(id){
var t=task(id);if(!t)return;
stop(false);
if(t.kind!=='nai'&&!hasPage()){
toast('先导入漫画页','点「导入漫画页」选一张或多张图片，然后再选任务。');
var home=$('taskHome');if(home){home.dataset.dismissed='';updateHome();}
return;
}
active={id:id,kind:t.kind,startApplied:0};
updateHome();
document.querySelectorAll('.task-btn').forEach(function(b){b.classList.toggle('is-active',b.dataset.task===id);});
if(t.kind==='gpt')startGpt(t);
else if(t.kind==='caption')startCaption(t);
else if(t.kind==='layer')startLayer(t);
else startNai(t);
timer=setInterval(tick,400);
}
function stop(showHome){
if(timer){clearInterval(timer);timer=null;}
var was=active;active=null;
document.querySelectorAll('.task-btn').forEach(function(b){b.classList.remove('is-active');});
var h=$('mangaGptTaskHead');if(h)h.remove();
var c=$('taskWizardCard');if(c)c.remove();
cancelPick();
if(was&&was.kind==='gpt'&&window.MangaGPTRegionEditor){
MangaGPTRegionEditor.exitTask();
var p=$('mangaGptPanel');if(p&&showHome!==undefined)p.hidden=true;
}
if(was&&was.kind==='caption'&&window.MangaSmartTextEditor){
MangaSmartTextEditor.setSimple(false);
var sp=$('mangaSmartTextPanel');if(sp&&showHome!==undefined)sp.hidden=true;
}
if(showHome){var home=$('taskHome');if(home)home.dataset.dismissed='';}
updateHome();
}

function startGpt(t){
var api=window.MangaGPTRegionEditor;
if(!api||!api.openTask){toast('GPT 改图还没准备好','请稍等页面加载完再试。',true);return;}
api.openTask({id:t.id,preset:t.preset,placeholder:t.placeholder,prompt:''});
active.startApplied=api.wizardState().applied;
var panel=$('mangaGptPanel');
var anchor=$('mangaGptServiceSummary')||(panel&&panel.children[1]);
head(t,panel,anchor);
markStep(0);
}
function startCaption(t){
var api=window.MangaSmartTextEditor;
if(!api||!api.open){toast('智能字幕还没准备好','请稍等页面加载完再试。',true);return;}
api.open(true);
active.startApplied=api.progress().applied;
var panel=$('mangaSmartTextPanel');
head(t,panel,panel.querySelector('header')?panel.querySelector('header').nextSibling:null);
markStep(0);
}
function startNai(t){
var body=card(t);
var token=(($('novelaiApiKey')||{}).value||'').trim();
if(!token){
markStep(0);
body.innerHTML='<p>AI 生图用的是 NovelAI，需要先填 Token（测试连接不花 Anlas）。</p>';
var b=el('button',{type:'button',class:'ui-btn ui-btn-primary',id:'taskNaiSettings'},'去填 Token');
b.addEventListener('click',function(){if(window.ServiceSettings)ServiceSettings.open('novelai');});
body.appendChild(b);
return;
}
markStep(1);
body.innerHTML='<p>已为你打开左侧「自动生成」面板。写好画面描述后点生成；花 Anlas 之前会先提示。</p>';
var area=$('auto-generate-area');
if(area&&getComputedStyle(area).display==='none'){var icon=document.querySelector('#sidebar [data-target="auto-generate-area"]');if(icon)icon.click();}
}

// 分层: drag a box on the page, then cut it out into a new layer with the existing local cutout
var pick=null;
function cancelPick(){if(pick){pick.remove();pick=null;}}
function startLayer(t){
var body=card(t);
markStep(0);
var go=el('button',{type:'button',class:'ui-btn ui-btn-primary',id:'taskLayerPick'},'开始框选');
body.appendChild(go);
body.appendChild(el('p',{class:'ui-muted',id:'taskLayerStatus'},'白底或纯色背景效果最好；本机抠图服务开着时会用神经网络抠图。'));
go.addEventListener('click',beginPick);
}
function beginPick(){
cancelPick();
if(typeof canvas==='undefined'||!canvas||!canvas.upperCanvasEl)return;
var r=canvas.upperCanvasEl.getBoundingClientRect();
pick=el('div',{class:'task-pick',id:'taskLayerOverlay'});
pick.style.cssText='position:fixed;left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px;';
var box=el('div',{class:'task-pick-box'});pick.appendChild(box);
document.body.appendChild(pick);
var start=null;
setLayerStatus('在画布上按住鼠标拖一个框（Esc 取消）。');
pick.addEventListener('pointerdown',function(e){start={x:e.clientX,y:e.clientY,ev:e};pick.setPointerCapture(e.pointerId);});
pick.addEventListener('pointermove',function(e){
if(!start)return;
var x=Math.min(start.x,e.clientX)-r.left,y=Math.min(start.y,e.clientY)-r.top;
box.style.cssText='left:'+x+'px;top:'+y+'px;width:'+Math.abs(e.clientX-start.x)+'px;height:'+Math.abs(e.clientY-start.y)+'px;display:block';
});
pick.addEventListener('pointerup',function(e){
if(!start)return;
var a=canvas.getPointer(start.ev),b=canvas.getPointer(e);
start=null;
cancelPick();
var rect={left:Math.min(a.x,b.x),top:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)};
cutRect(rect);
});
}
function setLayerStatus(t,isError){var s=$('taskLayerStatus');if(s){s.textContent=t;s.classList.toggle('is-error',!!isError);}}
function cutRect(rect){
if(!(rect.width>4&&rect.height>4)){setLayerStatus('框太小了，请重新框选。',true);return;}
var cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
var images=canvas.getObjects().filter(function(o){return o.type==='image'&&o.visible!==false;});
var hit=images.slice().reverse().filter(function(o){var b=o.getBoundingRect(true,true);return cx>=b.left&&cx<=b.left+b.width&&cy>=b.top&&cy<=b.top+b.height;})[0];
if(!hit){setLayerStatus('框里没有图片，请框在漫画页上。',true);return;}
var client=window.NaiBackgroundRemovalClient;
if(!client||!client.processRegion){setLayerStatus('抠图模块还没准备好。',true);return;}
markStep(1);
setLayerStatus('正在抠图…');
client.processRegion(hit,rect,'new').then(function(){
markStep(2,true);
setLayerStatus('完成：已放到新图层，原图不变（Ctrl+Z 可撤销）。可以再框一个。');
}).catch(function(error){setLayerStatus('没抠成：'+(error&&error.message||error),true);});
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&pick){e.preventDefault();cancelPick();setLayerStatus('已取消框选。');}},true);

// ---------- progress ----------
function tick(){
if(!active)return;
if(active.kind==='gpt'&&window.MangaGPTRegionEditor){
var s=MangaGPTRegionEditor.wizardState();
if(!s.open||s.task!==active.id){stop(false);return;}
var t=task(active.id);
var n;
if(s.applied>active.startApplied)n=-1;
else if(s.result)n=t.steps.length-1;
else if(!s.region)n=0;
else if(active.id==='swap')n=s.references?2:1;
else if(active.id==='custom')n=($('mangaGptPrompt').value.trim()?2:1);
else n=1;
if(n<0)markStep(0,true);else markStep(n);
}else if(active.kind==='caption'&&window.MangaSmartTextEditor){
var p=MangaSmartTextEditor.progress();
if(!p.open){stop(false);return;}
if(p.applied>active.startApplied)markStep(0,true);else markStep(p.drafts?1:0);
}
}

function init(){
buildBar();
buildHome();
applyMode(mode());
setInterval(updateHome,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,0);});
else setTimeout(init,0);

return {start:start,stop:stop,setMode:setMode,mode:mode,TASKS:TASKS,active:function(){return active&&active.id;}};
})();
if(typeof window!=='undefined')window.TaskLauncher=TaskLauncher;
