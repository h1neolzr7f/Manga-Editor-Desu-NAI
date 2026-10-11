/* Prompt-helper example images are not in the repository; they are downloaded on first use
 * (prompt_helper_images.py: pinned upstream source, SHA-256 per file) and then served at the original URLs.
 * This adds a small banner to the Image Prompt Helper window while any pack is missing. */
(function(root){
  'use strict';
  const BASE='/manga-smart/';
  async function call(route,body){
    const r=await fetch(BASE+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});
    let data;try{data=await r.json();}catch(_){data={ok:false,error:'本地服务未返回 JSON（HTTP '+r.status+'）。'};}
    if(!r.ok&&data.ok!==false)data.ok=false;
    return data;
  }
  function mb(n){return Math.max(1,Math.round(n/1048576));}
  // pure: banner model from the server status (exported for tests)
  function describe(st){
    const missing=(st&&st.packs||[]).filter(p=>p.have<p.files);
    if(!missing.length)return null;
    return missing.map(p=>({id:p.id,downloadable:p.downloadable,
      text:p.downloadable
        ?p.label+'：还差 '+(p.files-p.have)+' 张（约 '+mb(p.bytes)+' MB），下载一次即可离线使用。'
        :p.label+'：没有附带，也暂时没有公开下载地址，这部分示例图会显示为空白；提示词本身照常可用。'}));
  }
  async function banner(container){
    if(!container||container.querySelector('.iph-images-banner'))return;
    let st;
    try{st=await call('prompt-helper-status');}
    catch(_){return;} // opened without the local server: images simply load from the folder if present
    const items=describe(st);if(!items)return;
    const box=document.createElement('div');box.className='iph-images-banner ui-card';box.setAttribute('role','status');
    for(const it of items){
      const row=document.createElement('div');row.className='iph-images-row';
      const span=document.createElement('span');span.textContent=it.text;row.appendChild(span);
      if(it.downloadable){
        const btn=document.createElement('button');btn.type='button';btn.className='ui-btn ui-btn-primary';btn.textContent='下载示例图';
        btn.id='iphDownload-'+it.id;
        btn.addEventListener('click',async()=>{
          btn.disabled=true;span.textContent='正在下载…';
          const hide=root.MangaModelRequest&&root.MangaModelRequest.showProgress?root.MangaModelRequest.showProgress('/manga-smart/x'):()=>{};
          let res;
          try{res=await call('prompt-helper-download',{pack:it.id});}
          catch(e){res={ok:false,error:'连不上本机服务：请先运行「一键启动」。'};}
          finally{hide();}
          if(!res.ok){span.textContent=res.error||'下载失败。';btn.disabled=false;btn.textContent='重试';return;}
          span.textContent=res.warning||'下载完成。';btn.remove();
          container.querySelectorAll('img[src*="imgPromptHelper"]').forEach(img=>{const s=img.getAttribute('src');img.src=s.split('#')[0]+'#r'+Date.now();});
        });
        row.appendChild(btn);
      }
      box.appendChild(row);
    }
    container.insertBefore(box,container.firstChild);
  }
  root.PromptHelperImages={banner,describe};
})(typeof window!=='undefined'?window:globalThis);
