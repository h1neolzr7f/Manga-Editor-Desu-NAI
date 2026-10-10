/* Shared POST helper for the optional local models (Tesseract, Manga OCR, LaMa).
 * - Cancellable: pass an AbortController signal; aborts surface as {cancelled:true}.
 * - Download consent: the server answers 428 {needs_download} when model weights are
 *   not cached; only after the user confirms is the request repeated with
 *   allow_download:true. Nothing is downloaded silently.
 * - Busy (429) and other errors keep the server's readable message.
 */
(function(root){
  'use strict';
  // Beginner-readable next step for the common local-model failures (raw text kept in brackets).
  function explain(raw,status){
    const text=String(raw||'');
    if(/out of memory|CUDA error|MemoryError|cannot allocate/i.test(text))
      return '本地模型内存/显存不足：请框选更小的区域，或关闭其他占用显卡的程序后再试。（'+text.slice(0,120)+'）';
    if(status===502||status===503||status===504)
      return '本地服务暂时不可用（HTTP '+status+'）：请确认「一键启动」窗口仍在运行，稍等几秒再试。';
    return text;
  }
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
          error:explain(data.error||('本地模型请求失败（HTTP '+result.response.status+'）。'),result.response.status)});
      }
      return data;
    }catch(error){
      if(error&&error.name==='AbortError')return {ok:false,cancelled:true,error:'已取消。'};
      return {ok:false,error:'连不上本机服务 http://127.0.0.1:8000：请先运行「一键启动」，并用 http://127.0.0.1:8000 打开编辑器，然后再试。（'+((error&&error.message)||error)+'）'};
    }
  }
  root.MangaModelRequest={post};
})(typeof window!=='undefined'?window:globalThis);
