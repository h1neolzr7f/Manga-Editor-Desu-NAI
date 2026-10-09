/* Manga page structure inspector: Fabric snapshot -> sampled pixels -> reviewable panels.
 * No network or paid API calls. Metadata is exported as JSON for later model adapters.
 */
(function () {
  'use strict';
  const core = window.MangaPageStructure;
  if (!core) return;
  const state = {
    graph:null, canvas:null, snapshot:'', previewPixels:null, pending:false,
    overlay:null, overlayVisible:true
  };
  const $ = id => document.getElementById(id);
  const getCanvas = () => typeof canvas !== 'undefined' && canvas && canvas.upperCanvasEl &&
    typeof canvas.toDataURL === 'function' ? canvas : null;
  const el = (tag, text, className) => {
    const node=document.createElement(tag);
    if (text!==undefined) node.textContent=text;
    if (className) node.className=className;
    return node;
  };
  const say = (msg, error) => {
    const status=$('mangaPageStatus');
    if(status) {status.textContent=msg;status.dataset.error=error?'true':'false';}
  };
  function snapshotCanvas(c) { return c.toDataURL({format:'png',multiplier:1}); }
  function readImage(uri) {
    return new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error('页面无法读取，请检查画布图像。'));
      image.src=uri;
    });
  }
  async function scan(c, original) {
    const image=await readImage(original);
    const minDimension=320;
    const factor=Math.min(1,minDimension/Math.max(image.width,image.height));
    const sampled=document.createElement('canvas');
    sampled.width=Math.max(1,Math.round(image.width*factor));
    sampled.height=Math.max(1,Math.round(image.height*factor));
    const ctx=sampled.getContext('2d',{willReadFrequently:true});
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(image,0,0,sampled.width,sampled.height);
    return ctx.getImageData(0,0,sampled.width,sampled.height);
  }
  function currentDrafts() {
    const smart=window.MangaSmartTextEditor;
    return smart && typeof smart.getDrafts==='function' ? smart.getDrafts() : [];
  }
  function updateAssociations() {
    if(!state.graph) return;
    const linked=core.attachText(state.graph.panels,currentDrafts(),state.graph);
    state.graph.texts=linked.texts;
    const detector=window.MangaBubbleDetector;
    const detected=detector && state.previewPixels &&
      typeof detector.findCandidates==='function' ?
      detector.findCandidates(state.previewPixels,state.graph.panels,linked.texts,state.graph) : [];
    const linkedTextIds=new Set(detected.flatMap(b=>b.textIds||[]));
    state.graph.bubbleCandidates=[
      ...detected,
      ...linked.bubbleCandidates.filter(b=>!linkedTextIds.has(b.textId))
    ];
    const textEditor=window.MangaSmartTextEditor;
    if(textEditor && typeof textEditor.setPanelAssignments==='function') {
      textEditor.setPanelAssignments(linked.texts.map(t=>({
        sourceIndex:t.sourceIndex,panelId:t.panelId
      })));
    }
  }
  function exportGraph() {
    if(!state.graph) return null;
    return JSON.parse(JSON.stringify(state.graph));
  }
  function invalidate(reason) {
    state.graph=null;
    state.snapshot='';
    state.previewPixels=null;
    state.canvas=null;
    clearOverlay();
    const list=$('mangaPageList');
    if(list) list.replaceChildren();
    say(reason||'画布已修改，请重新识别分镜。');
  }
  function clearOverlay() {
    if(state.overlay) state.overlay.remove();
    state.overlay=null;
  }
  function drawOverlay() {
    clearOverlay();
    const c=getCanvas();
    if(!state.overlayVisible || !state.graph || !c || c!==state.canvas) return;
    if(c.getWidth()!==state.graph.width || c.getHeight()!==state.graph.height) {
      invalidate('页面尺寸已更改，请重新识别分镜。');
      return;
    }
    const rect=c.upperCanvasEl.getBoundingClientRect();
    if(!rect.width||!rect.height) return;
    const overlay=el('div',undefined,'manga-page-overlay');
    overlay.id='mangaPageOverlay';
    Object.assign(overlay.style,{
      left:rect.left+'px',top:rect.top+'px',
      width:rect.width+'px',height:rect.height+'px'
    });
    for(const panel of state.graph.panels){
      const node=el('div',panel.order+'','manga-page-outline');
      node.dataset.panelId=panel.id;
      const x=panel.x/state.graph.width*rect.width;
      const y=panel.y/state.graph.height*rect.height;
      const w=panel.width/state.graph.width*rect.width;
      const h=panel.height/state.graph.height*rect.height;
      Object.assign(node.style,{
        left:x+'px',top:y+'px',width:w+'px',height:h+'px'
      });
      overlay.append(node);
    }
    document.body.appendChild(overlay);
    state.overlay=overlay;
  }
  function panelInput(panel, field, maximum) {
    const input=el('input');
    input.type='number';
    input.value=String(panel[field]);
    input.min='0';input.max=String(maximum);input.step='1';
    input.setAttribute('aria-label',panel.id+' '+field);
    input.addEventListener('change',()=>{
      const value=Number(input.value);
      if(!Number.isInteger(value)||value<0) {
        input.value=String(panel[field]);
        return say('坐标必须是非负整数。',true);
      }
      const changed={...panel,[field]:value};
      const within=window.MangaSmartTextCore &&
        window.MangaSmartTextCore.normalizeBox(changed,state.graph.width,state.graph.height);
      if(!within || within.x!==changed.x || within.y!==changed.y ||
          within.width!==changed.width || within.height!==changed.height){
        input.value=String(panel[field]);
        return say('分镜边界超出画布或尺寸无效。',true);
      }
      Object.assign(panel,{[field]:value,verified:true,source:'manual-correction'});
      updateAssociations();
      renderPanels();
      drawOverlay();
      say(panel.id+' 已人工修订；OCR 文字已重新关联。');
    });
    return input;
  }
  function renderPanels() {
    const list=$('mangaPageList');
    if(!list) return;
    list.replaceChildren();
    if(!state.graph)return;
    const textCounts=new Map();
    for(const t of state.graph.texts||[]){
      if(t.panelId) textCounts.set(t.panelId,(textCounts.get(t.panelId)||0)+1);
    }
    for(const panel of state.graph.panels){
      const row=el('div',undefined,'manga-page-entry');
      const header=el('div',undefined,'manga-page-entry-head');
      const name=el('strong','第 '+panel.order+' 格'+(panel.verified?' · 已校对':' · 推测'));
      const meta=el('span',(textCounts.get(panel.id)||0)+' 条文字');
      header.append(name,meta);
      const coords=el('div',undefined,'manga-page-coordinates');
      for(const [field,label,max] of [
        ['x','X',state.graph.width],['y','Y',state.graph.height],
        ['width','宽',state.graph.width],['height','高',state.graph.height]
      ]) {
        const l=el('label',label);
        l.append(panelInput(panel,field,max));
        coords.append(l);
      }
      const actions=el('div',undefined,'manga-page-actions');
      const select=el('button','GPT 编辑本格');select.type='button';
      select.addEventListener('click',()=>{
        const c=getCanvas();
        if(!c||!state.graph || c!==state.canvas ||
            c.getWidth()!==state.graph.width||c.getHeight()!==state.graph.height||
            snapshotCanvas(c)!==state.snapshot) {
          invalidate('画布已变化，旧的分镜不能继续用于 GPT 编辑；请重新分析。');
          return;
        }
        const gpt=window.MangaGPTRegionEditor;
        if(!gpt || typeof gpt.selectRegionForPanel!=='function' || !gpt.selectRegionForPanel(panel)) {
          return say('GPT 选区功能尚未加载。',true);
        }
        $('mangaPagePanel').hidden=true;
        say('已定位本格到 GPT 面板。请检查选区和费用再手动生成。');
      });
      const mark=el('button','确认分镜');mark.type='button';
      mark.addEventListener('click',()=>{
        panel.verified=true;
        renderPanels();drawOverlay();
        say('第 '+panel.order+' 格已手动确认。');
      });
      const splitX=el('button','左右拆分');splitX.type='button';
      const splitY=el('button','上下拆分');splitY.type='button';
      const remove=el('button','删除误识别');remove.type='button';
      function updatePanels(next,message){
        if(!next) return say('无法执行：当前分镜尺寸过小或已到上限。',true);
        state.graph.panels=next;
        updateAssociations();renderPanels();drawOverlay();say(message);
      }
      splitX.addEventListener('click',()=>updatePanels(
        core.splitPanel(state.graph.panels,panel.id,'x',state.graph.direction),
        '已拆分分镜，请核对边界。'));
      splitY.addEventListener('click',()=>updatePanels(
        core.splitPanel(state.graph.panels,panel.id,'y',state.graph.direction),
        '已拆分分镜，请核对边界。'));
      remove.addEventListener('click',()=>updatePanels(
        core.removePanel(state.graph.panels,panel.id,state.graph.direction),
        '已删除误识别分镜，请确认剩余区域。'));
      actions.append(select,mark,splitX,splitY,remove);
      row.append(header,coords,actions);
      list.append(row);
    }
    const unknown=(state.graph.texts||[]).filter(x=>!x.panelId).length;
    const bubbleCount=(state.graph.bubbleCandidates||[]).length;
    const enclosed=(state.graph.bubbleCandidates||[]).filter(
      x=>x.source==='enclosed-light-region').length;
    say('识别到 '+state.graph.panels.length+' 个候选分镜、'+bubbleCount+
      ' 个气泡候选（封闭浅色区域 '+enclosed+' 个、其余为文字框外扩）；有 '+
      unknown+' 条文字归属不明确。都需要人工核对。');
  }
  async function analyze() {
    const c=getCanvas();
    if(!c)return say('画布尚未准备好。',true);
    if(state.pending)return;
    state.pending=true;
    $('mangaPageAnalyze').disabled=true;
    say('正在本地分析分镜留白和阅读顺序……');
    try{
      const screenshot=snapshotCanvas(c);
      const pixels=await scan(c,screenshot);
      if(c!==getCanvas() || screenshot!==snapshotCanvas(c))
        throw new Error('分析期间画布发生改变，请重新分析。');
      const next=core.analyze(pixels,{
        direction:$('mangaPageDirection').value,
        pageWidth:c.getWidth(),pageHeight:c.getHeight(),
        maxPanels:12
      });
      state.graph={...next,texts:[],bubbleCandidates:[]};
      state.previewPixels=pixels;
      state.canvas=c;
      state.snapshot=screenshot;
      updateAssociations();
      renderPanels();
      drawOverlay();
    }catch(error){
      invalidate('分镜分析失败：'+(error.message||String(error)));
    }finally{
      state.pending=false;
      $('mangaPageAnalyze').disabled=false;
    }
  }
  function refreshFromOCR(){
    if(!state.graph) return;
    if(state.canvas!==getCanvas()) {
      invalidate('已切换画布，请重新分析分镜。');
      return;
    }
    if(snapshotCanvas(state.canvas)!==state.snapshot){
      invalidate('OCR 时画布与上次分析结果不同，请重新分析分镜。');
      return;
    }
    updateAssociations();
    renderPanels();
    drawOverlay();
  }
  function isCurrent() {
    const c=getCanvas();
    return Boolean(c && c===state.canvas && state.graph &&
      c.getWidth()===state.graph.width && c.getHeight()===state.graph.height &&
      snapshotCanvas(c)===state.snapshot);
  }
  function downloadJSON(){
    const graph=exportGraph();
    if(!graph)return say('请先分析分镜。',true);
    const blob=new Blob([JSON.stringify(graph,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=el('a');
    a.href=url;a.download='manga-page-structure.json';
    document.body.appendChild(a);
    a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function render(){
    if($('mangaPagePanel'))return;
    const header=document.querySelector('#canvas-area .area-header');
    if(!header)return;
    const open=el('button','分镜结构');
    open.type='button';open.id='mangaPageOpen';
    header.append(open);
    const panel=el('section',undefined,'manga-page-panel');
    panel.id='mangaPagePanel';panel.hidden=true;
    panel.innerHTML=[
      '<header><strong>漫画分镜结构</strong><button type="button" id="mangaPageClose">×</button></header>',
      '<p>本地识别分镜留白、关联 OCR 文字。所有结果为候选，允许人工核对。</p>',
      '<div class="manga-page-actions"><label>阅读顺序 <select id="mangaPageDirection">',
      '<option value="rtl">日漫：从右到左</option>',
      '<option value="ltr">普通：从左到右</option></select></label>',
      '<button type="button" id="mangaPageAnalyze">分析本页</button></div>',
      '<label><input type="checkbox" id="mangaPageShowOverlay" checked>画布标注候选分镜</label>',
      '<div id="mangaPageList" class="manga-page-list"></div>',
      '<div class="manga-page-actions"><button id="mangaPageExport" type="button">导出结构 JSON</button></div>',
      '<p class="manga-page-hint">白色分隔线算法并非语义模型，复杂斜框/无框漫画可手动调整或拆分。',
      '气泡候选只是 OCR 框外围估计，不能当作实际气泡分割。</p>',
      '<div id="mangaPageStatus" role="status"></div>'
    ].join('');
    document.body.append(panel);
    open.addEventListener('click',()=>{panel.hidden=!panel.hidden;});
    $('mangaPageClose').addEventListener('click',()=>{panel.hidden=true;});
    $('mangaPageAnalyze').addEventListener('click',analyze);
    $('mangaPageDirection').addEventListener('change',()=>{
      if(state.graph) invalidate('阅读顺序已改变，请重新分析。');
    });
    $('mangaPageShowOverlay').addEventListener('change',e=>{
      state.overlayVisible=e.target.checked;
      drawOverlay();
    });
    $('mangaPageExport').addEventListener('click',downloadJSON);
    window.addEventListener('resize',drawOverlay);
    window.addEventListener('scroll',drawOverlay,true);
    say('点击「分析本页」，查看可校正的分镜候选。');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);
  else render();
  window.MangaPageStructureUI={analyze,getAnalysis:exportGraph,refreshFromOCR,invalidate,isCurrent};
})();
