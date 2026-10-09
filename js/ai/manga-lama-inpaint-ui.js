/* Optional local masked inpainting: preview first, commit as editable Fabric image layer.
 * Never erase the underlying page; original pixels outside the mask are not composited.
 */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const MAX_PIXELS=3_000_000;
  let ongoing=false, ticket=0, approved=null;
  const node=(tag,text)=>{
    const n=document.createElement(tag);
    if(text!==undefined)n.textContent=text;
    return n;
  };
  const show=(text,bad)=>{
    const s=$('mangaLamaStatus');
    if(s){s.textContent=text;s.dataset.error=bad?'true':'false';}
  };
  function loadImage(src){
    return new Promise((resolve,reject)=>{
      const i=new Image();i.onload=()=>resolve(i);
      i.onerror=()=>reject(new Error('无法读取 LaMa 图片或预览。'));i.src=src;
    });
  }
  function makeFabric(src){
    return new Promise((resolve,reject)=>{
      fabric.Image.fromURL(src,img=>{
        if(img && img.width && img.height)resolve(img);
        else reject(new Error('无法创建修复层。'));
      });
    });
  }
  function prepareCrop(c,source,draft) {
    const box=window.MangaSmartTextCore.normalizeBox(draft,c.getWidth(),c.getHeight());
    if(!box)throw Error('字幕范围不存在。');
    const extraX=Math.max(16,Math.round(box.width*.55));
    const extraY=Math.max(16,Math.round(box.height*.65));
    const x=Math.max(0,Math.floor(box.x-extraX));
    const y=Math.max(0,Math.floor(box.y-extraY));
    const right=Math.min(c.getWidth(),Math.ceil(box.x+box.width+extraX));
    const bottom=Math.min(c.getHeight(),Math.ceil(box.y+box.height+extraY));
    const width=right-x,height=bottom-y;
    if(width*height>MAX_PIXELS)throw Error('本地 LaMa 选区超过 300 万像素，请使用较小的字幕框。');
    const input=document.createElement('canvas');
    input.width=width;input.height=height;
    input.getContext('2d').drawImage(source,x,y,width,height,0,0,width,height);
    const mask=document.createElement('canvas');mask.width=width;mask.height=height;
    const g=mask.getContext('2d');
    g.fillStyle='#000';g.fillRect(0,0,width,height);
    const m={x:Math.max(0,Math.floor(box.x-x-3)),y:Math.max(0,Math.floor(box.y-y-3))};
    m.width=Math.min(width-m.x,Math.ceil(box.width+6));
    m.height=Math.min(height-m.y,Math.ceil(box.height+6));
    g.fillStyle='#fff';g.fillRect(m.x,m.y,m.width,m.height);
    return {x,y,width,height,modelInput:input.toDataURL('image/png'),
      modelMask:mask.toDataURL('image/png'),maskRect:m};
  }
  function content(){
    let panel=$('mangaLamaPreviewPanel');
    if(panel)return panel;
    panel=node('section');panel.id='mangaLamaPreviewPanel';
    panel.className='manga-lama-panel';panel.hidden=true;
    const head=node('header');
    const title=node('strong','本地 LaMa 去字预览');
    const close=node('button','×');close.type='button';close.id='mangaLamaClose';
    head.append(title,close);
    const note=node('p','白色蒙版覆盖当前 OCR 文字矩形，不具备精确字体分割。请检查是否误删线条、人物或背景细节。');
    const img=node('img');img.id='mangaLamaPreviewImg';img.alt='本地 LaMa 修复预览';
    const buttons=node('div');buttons.className='manga-lama-actions';
    const yes=node('button','确认并作为独立图层应用');yes.id='mangaLamaConfirm';
    yes.type='button';yes.disabled=true;
    const no=node('button','取消');no.type='button';no.id='mangaLamaCancel';
    buttons.append(yes,no);
    const status=node('div');status.id='mangaLamaStatus';status.setAttribute('role','status');
    panel.append(head,note,img,buttons,status);document.body.append(panel);
    close.addEventListener('click',cancel);
    no.addEventListener('click',cancel);
    yes.addEventListener('click',apply);
    return panel;
  }
  function cancel(){
    ticket++;
    ongoing=false;
    approved=null;
    const panel=$('mangaLamaPreviewPanel');
    if(panel)panel.hidden=true;
    if($('mangaLamaConfirm'))$('mangaLamaConfirm').disabled=true;
    if($('mangaLamaPreviewImg'))$('mangaLamaPreviewImg').removeAttribute('src');
  }
  async function preview(input) {
    if(ongoing)return;
    if(!input || typeof input.validate!=='function' || !input.validate())
      return show('漫画已更改，请重新识别字幕再申请 LaMa 修复。',true);
    const id=++ticket;
    ongoing=true;approved=null;
    const panel=content();panel.hidden=false;
    $('mangaLamaConfirm').disabled=true;
    show('正在本地 LaMa 修复……首次运行可能需要下载模型并占用较多内存。');
    try{
      const source=await loadImage(input.sourceImage);
      const crop=prepareCrop(input.canvas,source,input.draft);
      const response=await fetch('/manga-smart/lama-inpaint',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({image:crop.modelInput,mask:crop.modelMask})
      });
      let data;try{data=await response.json();}
      catch(_){throw Error('LaMa 服务未返回 JSON。');}
      if(!response.ok || !data.ok || !/^data:image\/png;base64,/.test(data.image||''))
        throw Error(data.error||'LaMa 没有返回有效的修复预览。');
      if(id!==ticket)return;
      if(!input.validate())throw Error('模型处理期间画布已变化，结果已丢弃以防错位。');
      if(data.width!==crop.width || data.height!==crop.height)
        throw Error('LaMa 结果分辨率不一致。');
      approved={input,crop,result:data.image};
      $('mangaLamaPreviewImg').src=data.image;
      $('mangaLamaConfirm').disabled=false;
      show('修复预览已生成。原画未变化，确认后才作为新图层应用。');
    }catch(e){
      if(id===ticket)show(e.message||String(e),true);
    }finally{
      if(id===ticket)ongoing=false;
    }
  }
  function alphaMaskedCanvas(source,crop){
    const output=document.createElement('canvas');
    output.width=crop.width;output.height=crop.height;
    const ctx=output.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,0,0,crop.width,crop.height);
    const data=ctx.getImageData(0,0,crop.width,crop.height);
    const r=crop.maskRect,feather=4;
    for(let y=0;y<crop.height;y++){
      for(let x=0;x<crop.width;x++){
        const i=(y*crop.width+x)*4+3;
        if(x<r.x||y<r.y||x>=r.x+r.width||y>=r.y+r.height) {
          data.data[i]=0;continue;
        }
        const edge=Math.min(x-r.x,y-r.y,r.x+r.width-x-1,r.y+r.height-y-1);
        data.data[i]=Math.round(255*Math.min(1,Math.max(0,edge/feather)));
      }
    }
    ctx.putImageData(data,0,0);
    return output.toDataURL('image/png');
  }
  async function apply(){
    if(!approved || ongoing)return;
    const target=approved;
    if(!target.input.validate()){
      approved=null;$('mangaLamaConfirm').disabled=true;
      return show('漫画或文字框已变化。不能应用旧预览，请重新生成。',true);
    }
    ongoing=true;
    $('mangaLamaConfirm').disabled=true;
    try{
      const img=await loadImage(target.result);
      const url=alphaMaskedCanvas(img,target.crop);
      const overlay=await makeFabric(url);
      if(!target.input.validate())throw Error('创建图层期间画布被修改，已取消应用。');
      overlay.set({left:target.crop.x,top:target.crop.y,selectable:true});
      overlay.set('name','本地 LaMa 去字 · 可恢复');
      overlay.set('mangaSmartText','lama-erase-patch');
      const c=target.input.canvas;
      if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
      try{
        c.add(overlay);c.setActiveObject(overlay);c.requestRenderAll();
      }finally{
        if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
      }
      if(typeof saveStateByManual==='function')saveStateByManual();
      if(typeof updateLayerPanel==='function')updateLayerPanel();
      target.input.onApplied();
      cancel();
    }catch(e){show(e.message||String(e),true);}
    finally{ongoing=false;}
  }
  window.MangaLamaInpaintUI={preview,cancel};
})();
