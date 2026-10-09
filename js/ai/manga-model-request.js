/* Shared POST helper for the optional local models (Tesseract, Manga OCR, LaMa).
 * - Cancellable: pass an AbortController signal; aborts surface as {cancelled:true}.
 * - Download consent: the server answers 428 {needs_download} when model weights are
 *   not cached; only after the user confirms is the request repeated with
 *   allow_download:true. Nothing is downloaded silently.
 * - Busy (429) and other errors keep the server's readable message.
 */
(function(root){
  'use strict';
  async function readJson(response){
    try{return await response.json();}
    catch(_){return {ok:false,error:'本地服务未返回 JSON（HTTP '+response.status+'）。'};}
  }
  async function send(url,body,signal){
    const response=await fetch(url,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body),signal
    });
    return {response,data:await readJson(response)};
  }
  async function post(url,body,options){
    options=options||{};
    const ask=options.confirmDownload||(text=>typeof confirm==='function'&&confirm(text));
    try{
      let result=await send(url,body,options.signal);
      if(result.response.status===428&&result.data&&result.data.needs_download){
        const text=(result.data.error||'模型尚未下载。')+
          '\n\n点击“确定”开始下载（只需一次，之后离线使用）；点击“取消”不下载。';
        if(!ask(text))return {ok:false,declined:true,error:'已取消：未下载模型，没有发出推理请求。'};
        result=await send(url,Object.assign({},body,{allow_download:true}),options.signal);
      }
      const data=result.data||{};
      if(!result.response.ok||!data.ok){
        return Object.assign({},data,{ok:false,status:result.response.status,
          error:data.error||('本地模型请求失败（HTTP '+result.response.status+'）。')});
      }
      return data;
    }catch(error){
      if(error&&error.name==='AbortError')return {ok:false,cancelled:true,error:'已取消。'};
      return {ok:false,error:'无法连接本地服务：'+((error&&error.message)||error)};
    }
  }
  root.MangaModelRequest={post};
})(typeof window!=='undefined'?window:globalThis);
