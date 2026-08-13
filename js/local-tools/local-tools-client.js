(function(root){
"use strict";

var DEFAULT_BASE_URL="http://127.0.0.1:8765";

function normalizeBaseUrl(value){
var candidate=String(value||DEFAULT_BASE_URL).replace(/\/+$/,"");
var parsed;
try{parsed=new URL(candidate);}catch(error){throw new Error("本地工具地址无效。");}
var host=parsed.hostname.toLowerCase();
if(["127.0.0.1","localhost","::1"].indexOf(host)<0)throw new Error("本地工具只允许连接 127.0.0.1、localhost 或 ::1。");
if(parsed.protocol!=="http:"&&parsed.protocol!=="https:")throw new Error("本地工具只支持 HTTP(S)。");
return parsed.toString().replace(/\/+$/,"");
}

function appendOption(form,key,value){
if(value===undefined||value===null||value==="")return;
form.append(key,typeof value==="boolean"?(value?"1":"0"):String(value));
}

function NaiLocalToolsClient(baseUrl){
this.baseUrl=normalizeBaseUrl(baseUrl||DEFAULT_BASE_URL);
}

NaiLocalToolsClient.prototype.request=function(path,options){
var requestOptions=Object.assign({},options||{});
var url=this.baseUrl+(path.charAt(0)==="/"?path:"/"+path);
return fetch(url,requestOptions).then(function(response){
return response.text().then(function(body){
var data=null;
try{data=body?JSON.parse(body):null;}catch(error){data={raw:body};}
if(!response.ok){
var message=data&&data.error?data.error:"本地工具请求失败（HTTP "+response.status+"）。";
var err=new Error(message);
err.status=response.status;
err.code=data&&data.code;
throw err;
}
return data;
});
});
};

NaiLocalToolsClient.prototype.health=function(){return this.request("/health");};
NaiLocalToolsClient.prototype.models=function(){return this.request("/models");};
NaiLocalToolsClient.prototype.engines=function(){return this.request("/engines");};

NaiLocalToolsClient.prototype.removeBackground=function(file,mode,options){
var form=new FormData();
form.append("file",file,"input.png");
var settings=Object.assign({},options||{});
if(mode)settings.model=mode;
appendOption(form,"mode",settings.model||mode||"isnet-anime");
appendOption(form,"model",settings.model||mode||"isnet-anime");
appendOption(form,"engine",settings.engine);
appendOption(form,"alpha_matting",settings.alpha_matting);
appendOption(form,"fg_threshold",settings.fg_threshold);
appendOption(form,"bg_threshold",settings.bg_threshold);
appendOption(form,"erode_size",settings.erode_size);
appendOption(form,"post_process_mask",settings.post_process_mask);
appendOption(form,"only_mask",settings.only_mask);
appendOption(form,"crop",settings.crop);
appendOption(form,"feather",settings.feather);
appendOption(form,"key_color",settings.key_color);
appendOption(form,"key_tolerance",settings.key_tolerance);
appendOption(form,"invert",settings.invert);
form.append("options",JSON.stringify(settings));
return this.request("/remove-background",{method:"POST",body:form});
};

NaiLocalToolsClient.prototype.segment=function(file,points){
var form=new FormData();
form.append("file",file,"input.png");
form.append("points",JSON.stringify(points||[]));
return this.request("/segment",{method:"POST",body:form});
};

NaiLocalToolsClient.prototype.refineMask=function(file,mask,options){
var form=new FormData();
form.append("file",file,"input.png");
form.append("mask",mask,"mask.png");
form.append("options",JSON.stringify(options||{}));
return this.request("/refine-mask",{method:"POST",body:form});
};

NaiLocalToolsClient.prototype.batchRemoveBackground=function(files,mode,options){
var form=new FormData();
(files||[]).forEach(function(file,index){form.append("files",file,"input_"+index+".png");});
var settings=Object.assign({},options||{});
if(mode)settings.model=mode;
appendOption(form,"mode",settings.model||mode||"isnet-anime");
form.append("options",JSON.stringify(settings));
return this.request("/batch-remove-background",{method:"POST",body:form});
};

root.NaiLocalToolsClient=NaiLocalToolsClient;
root.NaiLocalToolsDefaultUrl=DEFAULT_BASE_URL;
})(typeof window!=="undefined"?window:globalThis);
