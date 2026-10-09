/* Optional local masked inpainting: preview first, commit as editable Fabric image layer.
 * Never erase the underlying page; original pixels outside the mask are not composited.
 */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const MAX_PIXELS=3_000_000;
  let ongoing=false, ticket=0, approved=null, prepared=null, brushMode='add', brushRadius=12, painting=false;
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
  // Mask painter works only on a local crop, never directly on the Fabric page.
  // A white mask pixel means "ask LaMa to rebuild", black means "keep source".
  function drawMask() {
    if(!prepared)return;
    const crop=prepared.crop, surface=$('mangaLamaMaskCanvas');
    if(!surface)return;
    surface.width=crop.width;surface.height=crop.height;
    const ctx=surface.getContext('2d');
    ctx.drawImage(prepared.source,0,0,crop.width,crop.height);
    const paint=ctx.getImageData(0,0,crop.width,crop.height);
    const mask=crop.maskCanvas.getContext('2d',{willReadFrequently:true})
      .getImageData(0,0,crop.width,crop.height).data;
    for(let i=0;i<mask.length;i+=4){
      const alpha=(mask[i] / 255)*.48;
      paint.data[i]=Math.round(paint.data[i]*(1-alpha)+238*alpha);
      paint.data[i+1]=Math.round(paint.data[i+1]*(1-alpha)+45*alpha);
      paint.data[i+2]=Math.round(paint.data[i+2]*(1-alpha)+82*alpha);
    }
    ctx.putImageData(paint,0,0);
  }
  function markPoint(event){
    if(!prepared || ongoing)return;
    const surface=$('mangaLamaMaskCanvas'),crop=prepared.crop;
    if(!surface)return;
    const rect=surface.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const x=Math.max(0,Math.min(crop.width,(event.clientX-rect.left)/rect.width*crop.width));
    const y=Math.max(0,Math.min(crop.height,(event.clientY-rect.top)/rect.height*crop.height));
    const g=crop.maskCanvas.getContext('2d');
    g.beginPath();
    g.arc(x,y,brushRadius,0,Math.PI*2);
    g.fillStyle=brushMode==='add'?'#fff':'#000';
    g.fill();
    approved=null;
    $('mangaLamaConfirm').disabled=true;
    $('mangaLamaPreviewImg').hidden=true;
    drawMask();
    show('蒙版已调整。红色部分会被重建，请重新生成预览再确认。');
  }
  function resetMask(){
    if(!prepared||ongoing)return;
    const crop=prepared.crop,g=crop.maskCanvas.getContext('2d');
    g.fillStyle='#000';g.fillRect(0,0,crop.width,crop.height);
    const r=crop.maskRect;
    g.fillStyle='#fff';g.fillRect(r.x,r.y,r.width,r.height);
    approved=null;
    $('mangaLamaConfirm').disabled=true;
    $('mangaLamaPreviewImg').hidden=true;
    drawMask();
    show('已恢复初始文字矩形蒙版；可以再用画笔精修。');
  }
  function coverage(crop){
    const data=crop.maskCanvas.getContext('2d',{willReadFrequently:true})
      .getImageData(0,0,crop.width,crop.height).data;
    let marked=0;
    for(let i=0;i<data.length;i+=4)if(data[i]>=128)marked++;
    return marked/(crop.width*crop.height);
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
    const note=node('p','红色部分会被模型重建。先用画笔精修选区，尽量不要涂到人物轮廓、衣服纹理或气泡边缘。');
    const maskCanvas=node('canvas');maskCanvas.id='mangaLamaMaskCanvas';
    maskCanvas.className='manga-lama-mask';maskCanvas.style.touchAction='none';
    const tools=node('div');tools.className='manga-lama-actions';
    const add=node('button','标记去字');add.id='mangaLamaPaint';
    add.type='button';
    const erase=node('button','保留原图');erase.id='mangaLamaErase';
    erase.type='button';
    const reset=node('button','重置蒙版');reset.id='mangaLamaReset';
    reset.type='button';
    const sizeLabel=node('label','画笔');
    const size=node('input');size.id='mangaLamaBrushSize';
    size.type='range';size.min='3';size.max='100';size.value=String(brushRadius);
    sizeLabel.append(size);
    tools.append(add,erase,reset,sizeLabel);
    const generate=node('button','根据蒙版生成本地修复预览');
    generate.id='mangaLamaGenerate';generate.type='button';
    const img=node('img');img.id='mangaLamaPreviewImg';
    img.alt='本地 LaMa 修复预览';img.hidden=true;
    const buttons=node('div');buttons.className='manga-lama-actions';
    const yes=node('button','确认并作为独立图层应用');yes.id='mangaLamaConfirm';
    yes.type='button';yes.disabled=true;
    const no=node('button','取消');no.type='button';no.id='mangaLamaCancel';
    buttons.append(yes,no);
    const status=node('div');status.id='mangaLamaStatus';status.setAttribute('role','status');
    panel.append(head,note,maskCanvas,tools,generate,img,buttons,status);document.body.append(panel);
    close.addEventListener('click',cancel);
    no.addEventListener('click',cancel);
    yes.addEventListener('click',apply);
    generate.addEventListener('click',generatePreview);
    add.addEventListener('click',()=>{brushMode='add';show('正在标记需要重建的文字笔画。');});
    erase.addEventListener('click',()=>{brushMode='erase';show('正在从去字蒙版中恢复需要保护的原图区域。');});
    reset.addEventListener('click',resetMask);
    size.addEventListener('input',()=>{brushRadius=Number(size.value)||12;});
    maskCanvas.addEventListener('pointerdown',e=>{
      if(e.button!==0||!prepared||ongoing)return;
      e.preventDefault();
      painting=true;maskCanvas.setPointerCapture(e.pointerId);markPoint(e);
    });
    maskCanvas.addEventListener('pointermove',e=>{if(painting)markPoint(e);});
    maskCanvas.addEventListener('pointerup',()=>{painting=false;});
    maskCanvas.addEventListener('pointercancel',()=>{painting=false;});
    return panel;
  }
  function cancel(){
    ticket++;
    ongoing=false;
    approved=null;
    prepared=null;
    painting=false;
    const panel=$('mangaLamaPreviewPanel');
    if(panel)panel.hidden=true;
    if($('mangaLamaConfirm'))$('mangaLamaConfirm').disabled=true;
    if($('mangaLamaPreviewImg'))$('mangaLamaPreviewImg').removeAttribute('src');
  }
  async function preview(input){
    if(ongoing)return;
    if(!input || typeof input.validate!=='function' || !input.validate())
      return show('漫画已更改，请重新识别字幕再申请 LaMa 修复。',true);
    const id=++ticket;
    ongoing=true;approved=null;prepared=null;painting=false;
    const panel=content();panel.hidden=false;
    $('mangaLamaConfirm').disabled=true;
    $('mangaLamaPreviewImg').hidden=true;
    show('正在准备裁剪图和可编辑蒙版……');
    try{
      const source=await loadImage(input.sourceImage);
      if(id!==ticket)return;
      const crop=prepareCrop(input.canvas,source,input.draft);
      if(!input.validate())throw Error('准备蒙版期间画布发生变化，请重新检测。');
      prepared={input,crop,source};
      drawMask();
      show('先调整红色蒙版；确认只覆盖要删除的文字后，再点「生成本地修复预览」。此时尚未加载 LaMa 模型。');
    }catch(e){if(id===ticket)show(e.message||String(e),true);}
    finally{if(id===ticket)ongoing=false;}
  }
  async function generatePreview(){
    if(ongoing||!prepared)return;
    const now=prepared;
    if(!now.input.validate())
      return show('原始漫画已更改，不能使用过期的蒙版。',true);
    const fraction=coverage(now.crop);
    if(fraction===0||fraction>.66)
      return show('红色去字区域必须非空，且不得超过局部图的 66%。请调整画笔。',true);
    const id=++ticket;
    ongoing=true;approved=null;
    $('mangaLamaGenerate').disabled=true;
    $('mangaLamaConfirm').disabled=true;
    $('mangaLamaPreviewImg').hidden=true;
    show('开始本地 LaMa 推理。首次使用可能下载模型，请在预览后人工检查结果。');
    try{
      const response=await fetch('/manga-smart/lama-inpaint',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          image:now.crop.modelInput,
          mask:now.crop.maskCanvas.toDataURL('image/png')
        })
      });
      let data;try{data=await response.json();}
      catch(_){throw Error('LaMa 服务未返回 JSON。');}
      if(!response.ok||!data.ok||!/^data:image\/png;base64,/.test(data.image||''))
        throw Error(data.error||'LaMa 没有返回有效的修复预览。');
      if(id!==ticket)return;
      if(!now.input.validate()||prepared!==now)
        throw Error('模型处理期间画布或蒙版已变化，结果已丢弃。');
      if(data.width!==now.crop.width||data.height!==now.crop.height)
        throw Error('LaMa 结果分辨率不一致。');
      approved={input:now.input,crop:now.crop,result:data.image};
      $('mangaLamaPreviewImg').src=data.image;
      $('mangaLamaPreviewImg').hidden=false;
      $('mangaLamaConfirm').disabled=false;
      show('修复预览已生成。只有点击「确认」才应用图层；原始漫画尚未变化。');
    }catch(e){if(id===ticket)show(e.message||String(e),true);}
    finally{if(id===ticket){ongoing=false;$('mangaLamaGenerate').disabled=false;}}
  }
  function alphaMaskedCanvas(source,crop){
    const output=document.createElement('canvas');
    output.width=crop.width;output.height=crop.height;
    const ctx=output.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,0,0,crop.width,crop.height);
    const pixels=ctx.getImageData(0,0,crop.width,crop.height);
    const mask=crop.maskCanvas.getContext('2d',{willReadFrequently:true})
      .getImageData(0,0,crop.width,crop.height).data;
    for(let i=0;i<mask.length;i+=4) {
      // Only hand-painted mask pixels become part of the overlay layer.
      // All artwork outside this zone remains the underlying original pixels.
      pixels.data[i+3]=Math.round(pixels.data[i+3]*(mask[i]/255));
    }
    ctx.putImageData(pixels,0,0);
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
