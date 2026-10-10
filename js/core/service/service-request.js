/* exported ServiceRequest */
// One request/error layer for every backend service (GPT relay, NovelAI, local OCR/LaMa, cutout):
// same timeout/abort handling and the same localized, beginner-readable error messages.
var ServiceRequest=(function(){
var NAMES={gpt:'GPT 图像服务',novelai:'NovelAI',local:'本机 OCR / LaMa 服务',cutout:'本机抠图服务'};
var VIA_LOCAL_PROXY={gpt:true,novelai:true,local:true};

function serverMessage(body){
if(!body)return '';
var m=typeof body==='string'?body:(body.error&&(body.error.message||body.error))||body.message||'';
if(typeof m!=='string')return '';
if(/<\s*(!doctype|html|head|body)\b/i.test(m))return '';
return m.trim().slice(0,300);
}

// info: {status, network, timeout, aborted, body}
function describe(service,info){
info=info||{};
var name=NAMES[service]||'服务';
if(info.aborted)return '已取消请求。';
if(info.timeout)return name+'响应超时，请稍后再试。';
if(info.network){
return VIA_LOCAL_PROXY[service]?
'连不上本机服务（127.0.0.1:8000）。请用「一键启动」打开编辑器后再试。':
name+'没有启动。可以在「服务设置」里查看状态，或先用浏览器内的替代功能。';
}
var status=Number(info.status)||0;
var hint='';
if(status===401||status===403){
hint=service==='novelai'?'NovelAI Token 无效或已过期，请到「服务设置」重新粘贴。':
service==='gpt'?'API Key 被拒绝，请到「服务设置」检查 Key 和地址。':
'本机服务拒绝了请求，请用 http://127.0.0.1:8000 打开编辑器。';
}else if(status===429){
hint='请求太频繁或额度不足，请稍后再试。';
}else if(status>=500){
hint=name+'暂时不可用（HTTP '+status+'），这次没有生成结果，请稍后重试。';
}else if(status===404){
hint='地址不对（HTTP 404），请到「服务设置」检查地址。';
}
var server=serverMessage(info.body);
if(server&&hint&&server.indexOf(hint)<0)return server+(/[。！？.!?]$/.test(server)?'':'。')+hint;
return server||hint||(name+'请求失败'+(status?'（HTTP '+status+'）':'')+'。');
}

function fail(service,info){
var error=new Error(describe(service,info));
error.userMessage=error.message;
error.status=info.status||0;
error.service=service;
error.network=!!info.network;
return error;
}

// options: {method, headers, body (object -> JSON), timeoutMs, signal}
async function request(service,url,options){
options=options||{};
var controller=new AbortController();
var timedOut=false;
var timer=setTimeout(function(){timedOut=true;controller.abort();},options.timeoutMs||30000);
if(options.signal){
if(options.signal.aborted)controller.abort();
else options.signal.addEventListener('abort',function(){controller.abort();},{once:true});
}
var headers=Object.assign({Accept:'application/json'},options.headers||{});
var body=options.body;
if(body&&typeof body==='object'&&!(body instanceof Blob)&&!(body instanceof FormData)){
headers['Content-Type']='application/json';
body=JSON.stringify(body);
}
var response;
try{
response=await fetch(url,{method:options.method||(body?'POST':'GET'),headers:headers,body:body,signal:controller.signal});
}catch(error){
clearTimeout(timer);
if(timedOut)throw fail(service,{timeout:true});
if(error&&error.name==='AbortError')throw fail(service,{aborted:true});
throw fail(service,{network:true});
}
clearTimeout(timer);
var text='';
try{text=await response.text();}catch(e){text='';}
var data=null;
try{data=text?JSON.parse(text):{};}catch(e){data=text;}
if(!response.ok||(data&&typeof data==='object'&&data.ok===false)){
throw fail(service,{status:response.ok?0:response.status,body:data});
}
return data;
}

return {request:request,describe:describe,NAMES:NAMES};
})();
if(typeof window!=='undefined')window.ServiceRequest=ServiceRequest;
