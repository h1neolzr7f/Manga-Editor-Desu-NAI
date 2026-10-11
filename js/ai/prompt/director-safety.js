// Director (third-party LLM gateway) credential safety.
// The Director has no built-in gateway; it only runs against a URL the user configured.
// A NovelAI token must never be sent anywhere except official NovelAI endpoints.
var NaiDirectorSafety=(function(){
var NOVELAI_HOSTS=['novelai.net'];
function hostOf(url){
try{return new URL(String(url||'')).hostname.toLowerCase();}catch(error){return '';}
}
function isNovelAiHost(url){
var host=hostOf(url);
if(!host)return false;
return NOVELAI_HOSTS.some(function(h){return host===h||host.slice(-(h.length+1))==='.'+h;});
}
function savedNovelAiToken(){
try{
var el=typeof document!=='undefined'&&document.getElementById('novelaiApiKey');
return el&&el.value?el.value.trim():'';
}catch(error){return '';}
}
function isNovelAiToken(key){
var value=String(key||'').trim().replace(/^Bearer\s+/i,'');
if(!value)return false;
if(/^pst-/i.test(value))return true;
var nai=savedNovelAiToken();
return !!nai&&value===nai.replace(/^Bearer\s+/i,'');
}
return {isNovelAiHost:isNovelAiHost,isNovelAiToken:isNovelAiToken};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=NaiDirectorSafety;
