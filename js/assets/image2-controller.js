(function(root){
"use strict";
var initialized=false;
function element(id){return typeof document!=='undefined'?document.getElementById(id):null;}
function status(message,isError){var target=element('image2Status');if(target){target.textContent=message;target.classList.toggle('is-error',!!isError);}}
function renderJobs(){var list=element('image2JobList');if(!list)return;list.innerHTML='';root.NaiImage2JobStoreDefault.list().slice(0,8).forEach(function(job){var row=document.createElement('div');row.className='asset-library-row';var text=document.createElement('span');text.textContent=job.status+' · '+job.assetName+' · '+job.prompt.slice(0,40);row.appendChild(text);if(job.status==='failed'){var retry=document.createElement('button');retry.type='button';retry.className='simulator-chat-small-button';retry.textContent='重试';retry.addEventListener('click',function(){new root.NaiImage2Client().retry(job.id).then(function(){status('重试成功。',false);renderJobs();}).catch(function(error){status(error.message,true);renderJobs();});});row.appendChild(retry);}list.appendChild(row);});}
function bind(){if(initialized)return;initialized=true;var provider=element('image2Provider');if(provider){root.NaiImage2ProviderRegistry.list().forEach(function(item){var option=document.createElement('option');option.value=item.id;option.textContent=item.name;provider.appendChild(option);});}
var run=element('image2RunButton');
var section=element('image2-section');
if(!root.NaiImage2ProviderRegistry.list().length){
if(section)section.hidden=true;
status('本包没有接入 Image2 生图 Provider。请用「自动生成」里的 NovelAI 出图。',false);
if(run){run.disabled=true;run.textContent='Image2 未配置';}
}
if(run)run.addEventListener('click',function(){var client=new root.NaiImage2Client();var input={prompt:element('image2Prompt')&&element('image2Prompt').value,negativePrompt:element('image2Negative')&&element('image2Negative').value,width:element('image2Width')&&element('image2Width').value,height:element('image2Height')&&element('image2Height').value,transparent:element('image2Transparent')&&element('image2Transparent').checked,tags:String(element('image2Tags')&&element('image2Tags').value||'').split(',').map(function(value){return value.trim();}).filter(Boolean),assetName:element('image2AssetName')&&element('image2AssetName').value,providerId:provider&&provider.value};client.submit(input).then(function(){status('Image2 任务完成并已入库。',false);renderJobs();}).catch(function(error){status(error.message,true);renderJobs();});});renderJobs();}
root.NaiImage2Controller={renderJobs:renderJobs};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
