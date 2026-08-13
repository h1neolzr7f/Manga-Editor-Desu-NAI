(function(root){
"use strict";
var providers=Object.create(null);
function clone(value){return JSON.parse(JSON.stringify(value));}
function register(provider){
if(!provider||!provider.id||typeof provider.generate!=='function')throw new Error('Image2 Provider 需要 id 和 generate 函数。');
providers[provider.id]=provider;return provider;
}
function get(id){return providers[id]||null;}
function list(){return Object.keys(providers).map(function(id){return {id:id,name:providers[id].name||id};});}
function uniqueName(store,base,extension){
var stem=String(base||'generated_asset').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'generated_asset';
var suffix=extension||'.png';var candidate=stem+suffix;var index=1;
while(store.search(candidate).length){candidate=stem+'_'+index+suffix;index+=1;}
return candidate;
}
function addResultToAssets(job,result){
var store=root.NaiComicAssetStoreDefault;
if(!store||!result)return null;
var name=uniqueName(store,job.assetName,'.png');
var record={name:name,type:'image',mime:'image/png',width:job.width,height:job.height,sourceType:'generated',creator:'Image2 Provider',sourceUrl:result.sourceUrl||'',tags:Array.from(new Set(job.tags.concat(job.transparent?['transparent']:[]))),license:{type:'project-original',source:'Image2 generation record '+job.id,publicAllowed:true},thumbnail:result.thumbnail||result.image||'',path:'user_data/asset_packs/generated/'+name};
var registered=store.register(record,null);
return registered.asset;
}
function Client(options){this.jobs=(options&&options.jobs)||root.NaiImage2JobStoreDefault;}
Client.prototype.submit=function(input){
var self=this;var provider=get(input&&input.providerId);
var job=this.jobs.create(input||{});
if(!provider){self.jobs.update(job.id,{status:'failed',error:'Image2 Provider 未配置，接口只提供可插拔适配器。'});return Promise.reject(new Error('Image2 Provider 未配置。'))}
self.jobs.update(job.id,{status:'running',attempts:1});
return Promise.resolve().then(function(){return provider.generate(clone(job));}).then(function(result){
if(!result||(!result.image&&!result.file))throw new Error('Image2 Provider 未返回素材。');
var asset=addResultToAssets(job,result);self.jobs.update(job.id,{status:'succeeded',resultAssetId:asset&&asset.id||'',error:''});return {job:self.jobs.get(job.id),asset:asset,result:result};
}).catch(function(error){self.jobs.update(job.id,{status:'failed',error:error.message});throw error;});
};
Client.prototype.retry=function(id){var job=this.jobs.get(id);if(!job) return Promise.reject(new Error('Image2 任务不存在。'));return this.submit(Object.assign({},job,{attempts:job.attempts+1}));};
root.NaiImage2ProviderRegistry={register:register,get:get,list:list};
root.NaiImage2Client=Client;
root.NaiImage2UniqueName=uniqueName;
})(typeof window!=='undefined'?window:globalThis);
