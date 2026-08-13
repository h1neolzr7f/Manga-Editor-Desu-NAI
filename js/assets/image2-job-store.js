(function(root){
"use strict";
var KEY='nai_comic_image2_jobs_v1';
function clone(value){return JSON.parse(JSON.stringify(value));}
function storage(){try{return typeof localStorage!=='undefined'?localStorage:null;}catch(error){return null;}}
function JobStore(){this.jobs=[];this.load();}
JobStore.prototype.load=function(){var target=storage();if(!target)return this;try{var raw=target.getItem(KEY);if(raw){var parsed=JSON.parse(raw);this.jobs=Array.isArray(parsed)?parsed:[];}}catch(error){this.jobs=[];}return this;};
JobStore.prototype.save=function(){var target=storage();if(target){try{target.setItem(KEY,JSON.stringify(this.jobs));}catch(error){}}return this;};
JobStore.prototype.create=function(input){var now=new Date().toISOString(),job={id:'image2_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),status:'queued',prompt:String(input&&input.prompt||''),negativePrompt:String(input&&input.negativePrompt||''),width:Number(input&&input.width||1024),height:Number(input&&input.height||1024),transparent:input&&input.transparent===true,tags:Array.isArray(input&&input.tags)?input.tags.map(String):['original','image2'],assetName:String(input&&input.assetName||'generated_asset'),providerId:String(input&&input.providerId||''),attempts:0,error:'',createdAt:now,updatedAt:now,resultAssetId:''};this.jobs.unshift(job);this.save();return clone(job);};
JobStore.prototype.update=function(id,patch){var job=this.jobs.find(function(item){return item.id===id;});if(!job)return null;Object.assign(job,patch||{},{updatedAt:new Date().toISOString()});this.save();return clone(job);};
JobStore.prototype.get=function(id){var job=this.jobs.find(function(item){return item.id===id;});return job?clone(job):null;};
JobStore.prototype.list=function(){return this.jobs.map(clone);};
root.NaiImage2JobStore=JobStore;
root.NaiImage2JobStoreDefault=new JobStore();
})(typeof window!=='undefined'?window:globalThis);
