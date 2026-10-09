/* Optional local masked inpainting: preview first, commit as editable Fabric image layer.
 * Never erase the underlying page; original pixels outside the mask are not composited.
 */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const MAX_PIXELS=3_000_000;
  let controller=null;
  let ongoing=false, ticket=0, approved=null, prepared=null, brushMode='add', brushRadius=12, painting=false, lastPointer=null, drawScheduled=false;
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
      sourceCanvas:input,maskCanvas:mask,maskRect:m};
  }
  // Mask painter works only on a local crop, never directly on the Fabric page.
  // A white mask pixel means "ask LaMa to rebuild", black means "keep source".
  function drawMask() {
    if(!prepared)return;
    const crop=prepared.crop, surface=$('mangaLamaMaskCanvas');
    if(!surface)return;
    // Resizing a canvas resets its bitmap and can disrupt pointer capture.
    // Only resize when the crop dimensions actually change.
    if(surface.width!==crop.width)surface.width=crop.width;
    if(surface.height!==crop.height)surface.height=crop.height;
    const ctx=surface.getContext('2d');
    ctx.drawImage(crop.sourceCanvas,0,0,crop.width,crop.height);
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
  function scheduleDraw(){
    if(drawScheduled)return;
    drawScheduled=true;
    requestAnimationFrame(()=>{
      drawScheduled=false;
      drawMask();
    });
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
    g.fillStyle=brushMode==='add'?'#fff':'#000';
    const gap=lastPointer?Math.hypot(x-lastPointer.x,y-lastPointer.y):0;
    const steps=Math.max(1,Math.ceil(gap/Math.max(1,brushRadius*.5)));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const px=lastPointer?lastPointer.x+(x-lastPointer.x)*t:x;
      const py=lastPointer?lastPointer.y+(y-lastPointer.y)*t:y;
      g.beginPath();g.arc(px,py,brushRadius,0,Math.PI*2);g.fill();
    }
    lastPointer={x,y};
    approved=null;
    $('mangaLamaConfirm').disabled=true;
    $('mangaLamaPreviewImg').hidden=true;
    scheduleDraw();
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
  // This is only a conservative proposal. Failure MUST preserve the user's mask,
  // and success still requires explicit local-model preview and human approval.
  function proposeInkMask(){
    if(!prepared || ongoing)return;
    const crop=prepared.crop;
    const detector=window.MangaTextInkMask;
    if(!detector || typeof detector.propose!=='function')
      return show('深色文字候选提取模块未加载；原蒙版保持不变。',true);
    let proposal;
    try{
      const sourcePixels=crop.sourceCanvas.getContext('2d',{willReadFrequently:true})
        .getImageData(0,0,crop.width,crop.height);
      proposal=detector.propose(sourcePixels,crop.maskRect);
    }catch(e){return show('候选提取失败：'+(e.message||String(e))+'。原蒙版保持不变。',true);}
    if(!proposal.ok)
      return show('无法安全提取深色文字：'+proposal.reason+' 原蒙版保持不变。',true);
    const ctx=crop.maskCanvas.getContext('2d');
    const mask=ctx.createImageData(crop.width,crop.height);
    for(let i=0;i<proposal.mask.length;i++){
      const val=proposal.mask[i],k=i*4;
      mask.data[k]=val;mask.data[k+1]=val;mask.data[k+2]=val;mask.data[k+3]=255;
    }
    ctx.putImageData(mask,0,0);
    approved=null;
    $('mangaLamaConfirm').disabled=true;
    $('mangaLamaPreviewImg').hidden=true;
    drawMask();
    show('已生成深色文字候选蒙版（占文字框 '+Math.round(proposal.textCoverage*100)+'%）。仅是未验证候选，请检查红色区域，必要时用画笔纠错，再手动生成修复预览。');
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
    const autoInk=node('button','提取深色文字候选');
    autoInk.type='button';autoInk.id='mangaLamaAutoInk';
    autoInk.title='仅对浅色纯净底色试探性提取墨迹；复杂背景会拒绝，绝不直接擦字。';
    tools.append(add,erase,reset,autoInk,sizeLabel);
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
    autoInk.addEventListener('click',proposeInkMask);
    size.addEventListener('input',()=>{brushRadius=Number(size.value)||12;});
    maskCanvas.addEventListener('pointerdown',e=>{
      if(e.button!==0||!prepared||ongoing)return;
      e.preventDefault();
      painting=true;lastPointer=null;maskCanvas.setPointerCapture(e.pointerId);markPoint(e);
    });
    maskCanvas.addEventListener('pointermove',e=>{if(painting)markPoint(e);});
    maskCanvas.addEventListener('pointerup',()=>{painting=false;lastPointer=null;});
    maskCanvas.addEventListener('pointercancel',()=>{painting=false;lastPointer=null;});
    return panel;
  }
  function cancel(){
    ticket++;
    // Abort an in-flight local inference request; any late answer is ignored by ticket.
    if(controller){controller.abort();controller=null;}
    ongoing=false;
    approved=null;
    prepared=null;
    painting=false;lastPointer=null;
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
    show('开始本地 LaMa 推理（可点「取消」中止）。模型未下载时会先询问是否下载。');
    controller=typeof AbortController==='function'?new AbortController():null;
    try{
      const data=await window.MangaModelRequest.post('/manga-smart/lama-inpaint',{
        image:now.crop.modelInput,
        mask:now.crop.maskCanvas.toDataURL('image/png')
      },{signal:controller&&controller.signal});
      if(id!==ticket)return;
      if(!data.ok||!/^data:image\/png;base64,/.test(data.image||''))
        throw Error(data.error||'LaMa 没有返回有效的修复预览。');
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
    finally{if(id===ticket){ongoing=false;controller=null;$('mangaLamaGenerate').disabled=false;}}
  }
  function alphaMaskedCanvas(source,crop){
    const output=document.createElement('canvas');
    output.width=crop.width;output.height=crop.height;
    const ctx=output.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,0,0,crop.width,crop.height);
    const pixels=ctx.getImageData(0,0,crop.width,crop.height);
    const mask=crop.maskCanvas.getContext('2d',{willReadFrequently:true})
      .getImageData(0,0,crop.width,crop.height).data;
    const soft=document.createElement('canvas');
    soft.width=crop.width;soft.height=crop.height;
    const sg=soft.getContext('2d',{willReadFrequently:true});
    // Feather the INNER edge of an irregular brush mask without touching
    // any original pixel outside the user's explicitly painted region.
    sg.filter='blur(3px)';
    sg.drawImage(crop.maskCanvas,0,0);
    const feather=sg.getImageData(0,0,crop.width,crop.height).data;
    for(let i=0;i<mask.length;i+=4){
      pixels.data[i+3]=mask[i]>=128
        ?Math.round(pixels.data[i+3]*(Math.min(mask[i],feather[i])/255))
        :0;
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
