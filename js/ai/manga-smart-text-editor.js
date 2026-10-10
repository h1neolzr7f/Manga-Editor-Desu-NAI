/* Smart manga lettering workflow.
 * Tesseract runs locally in 99_server.py. Fabric owns all permanent objects,
 * including the non-destructive light-background eraser and editable text.
 */
(function () {
  'use strict';
  const core = window.MangaSmartTextCore;
  if (!core) return;
  const state = { drafts: [], busy: false, canvas: null, sourceImage: '', selection: null, controller: null };
  // Cancellable local model calls (see js/ai/manga-model-request.js).
  function startRequest() {
    state.controller = typeof AbortController === 'function' ? new AbortController() : null;
    const cancel = $('mangaSmartCancel');
    if (cancel) cancel.hidden = false;
    return state.controller && state.controller.signal;
  }
  function endRequest() {
    state.controller = null;
    const cancel = $('mangaSmartCancel');
    if (cancel) cancel.hidden = true;
  }
  function cancelRequest() {
    if (state.controller) state.controller.abort();
  }
  const $ = id => document.getElementById(id);
  const getCanvas = () => typeof canvas !== 'undefined' && canvas && typeof canvas.toDataURL === 'function' ? canvas : null;
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function message(text, bad) {
    const el = $('mangaSmartStatus');
    if (el) {
      el.textContent = text;
      el.dataset.error = bad ? 'true' : 'false';
    }
  }
  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('无法读取漫画画布或图像。'));
      image.src = source;
    });
  }
  function fabricImage(source) {
    return new Promise((resolve, reject) => {
      fabric.Image.fromURL(source, img => {
        if (!img || !img.width) reject(new Error('无法创建擦除图层。'));
        else resolve(img);
      });
    });
  }
  function snapshot(c) {
    // Preserve original pixels and avoid detecting lettering added by this tool.
    const hidden = c.getObjects().filter(obj =>
      ['text', 'textbox', 'i-text', 'vertical-textbox'].includes(obj.type) && obj.visible !== false);
    try {
      hidden.forEach(obj => { obj.visible = false; });
      return c.toDataURL({ format: 'png', multiplier: 1 });
    } finally {
      hidden.forEach(obj => { obj.visible = true; });
      c.requestRenderAll();
    }
  }
  // Manga OCR is a text recognizer, NOT a bubble detector. Crop one candidate
  // from the unmodified canvas snapshot, not the live modified Fabric layers.
  async function refineWithMangaOCR(draft, index) {
    const c=getCanvas();
    if(!c || c!==state.canvas || !state.sourceImage ||
       state.sourceImage!==snapshot(c))
      return message('漫画页面已变化，请重新检测字幕后再精修。',true);
    if(state.busy)return;
    const before=draft.text;
    const box=core.normalizeBox(draft,c.getWidth(),c.getHeight());
    if(!box)return message('文字区域无效，请重新框选。',true);
    state.busy=true;
    $('mangaSmartDetect').disabled=true;
    $('mangaSmartApply').disabled=true;
    message('正在用 Manga OCR 精修第 '+(index+1)+' 条文字。首次运行可能需要下载约 400MB 模型……');
    try {
      const source=await loadImage(state.sourceImage);
      const padX=Math.max(10,Math.round(box.width*.22));
      const padY=Math.max(10,Math.round(box.height*.40));
      const x=Math.max(0,Math.floor(box.x-padX));
      const y=Math.max(0,Math.floor(box.y-padY));
      const right=Math.min(source.width,Math.ceil(box.x+box.width+padX));
      const bottom=Math.min(source.height,Math.ceil(box.y+box.height+padY));
      const w=right-x,h=bottom-y;
      if(w<2 || h<2 || w*h>4_000_000)
        throw new Error('选区过大，请先手动框选更小的文字区域。');
      const crop=document.createElement('canvas');
      crop.width=w;crop.height=h;
      crop.getContext('2d').drawImage(source,x,y,w,h,0,0,w,h);
      const result=await window.MangaModelRequest.post('/manga-smart/manga-ocr',
        {image:crop.toDataURL('image/png')},{signal:startRequest()});
      if(!result.ok || !result.text)
        throw new Error(result.error||'Manga OCR 没有返回有效文本。');
      if(state.canvas!==c || state.sourceImage!==snapshot(c) ||
         state.drafts[index]!==draft || draft.text!==before)
        throw new Error('识别期间页面或文字已修改，结果已丢弃以避免覆盖你的修改。');
      // Suggestion only. Never change canvas pixels or erase old text here.
      draft.text=String(result.text).slice(0,500);
      draft.confidence=0; // Manga OCR provides no calibrated confidence.
      draft.recognizer='manga-ocr-local';
      renderDrafts();
      message('日漫 OCR 已更新第 '+(index+1)+' 条候选文字。请人工核对后再应用；模型可能产生误识别。');
    }catch(error){message(error.message||String(error),true);}
    finally{
      endRequest();
      state.busy=false;
      $('mangaSmartDetect').disabled=false;
      renderDrafts();
    }
  }

  function renderDrafts() {
    const list = $('mangaSmartRegions');
    list.replaceChildren();
    state.drafts.forEach((draft, i) => {
      const row = make('div', undefined, 'manga-smart-item');
      const first = make('div', undefined, 'manga-smart-line');
      const use = document.createElement('input');
      use.type = 'checkbox';
      use.checked = draft.active !== false;
      use.title = '套用这条识别文字';
      use.addEventListener('change', () => { draft.active = use.checked; });
      const label = make('span', '区域 ' + (i + 1) + ' · ' + Math.round(draft.x) +
        ',' + Math.round(draft.y) + ' · ' + Math.round(draft.confidence || 0) + '%' +
        (draft.panelId ? ' · 第' + Number(draft.panelId.split('-')[1]) + '格' : ''));
      const remove = make('button', '删除', 'manga-smart-small');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        state.drafts.splice(i, 1);
        renderDrafts();
      });
      first.append(use, label, remove);
      const ai = make('button', 'GPT 去字', 'manga-smart-small');
      ai.type = 'button';
      ai.title = '仅定位选区并填写擦字提示，不自动调用付费模型。';
      ai.addEventListener('click', () => {
        const bridge = window.MangaGPTRegionEditor;
        if (!bridge || !bridge.selectRegionForTextRemoval || !bridge.selectRegionForTextRemoval(draft)) {
          message('GPT 改图模块尚未初始化。', true);
          return;
        }
        $('mangaSmartTextPanel').hidden = true;
        message('已把区域送到 GPT 改图。请在 GPT 面板确认提示词后手动生成，完成后重新检测字幕。');
      });
      first.append(ai);
      const refine=make('button','Manga OCR 精修','manga-smart-small');
      refine.type='button';
      refine.title='仅重新识别此候选文字区域，不直接修改画布。需本机安装 manga-ocr；首次点击可能下载约 400MB 模型。';
      refine.disabled=state.busy;
      refine.addEventListener('click',()=>refineWithMangaOCR(draft,i));
      first.append(refine);
      const lama=make('button','本地 LaMa 去字','manga-smart-small');
      lama.type='button';
      lama.title='局部蒙版修复并先预览；不会覆盖原画。需要可选 simple-lama-inpainting；首次使用前会询问是否下载约 200MB 模型。';
      lama.addEventListener('click',()=>{
        const bridge=window.MangaLamaInpaintUI;
        const c=getCanvas();
        if(!bridge || !c || !state.sourceImage) {
          return message('LaMa 去字功能尚未准备好，请先检测或框选字幕。',true);
        }
        bridge.preview({
          canvas:c,draft,sourceImage:state.sourceImage,
          validate:()=>state.canvas===c && state.sourceImage===snapshot(c) &&
            state.drafts[i]===draft,
          onApplied:()=>{
            // Keep the light-bubble fill on: it also covers faint LaMa residue ("ghost" glyphs).
            draft.lamaApplied=true;
            state.sourceImage=snapshot(c);
            renderDrafts();
            if(window.MangaPageStructureUI)window.MangaPageStructureUI.invalidate(
              'LaMa 修复层已添加，请重新分析分镜。');
            message('LaMa 修复层已保存为独立图层。现在可以输入新台词并应用（自动去字会再盖掉残影）。');
          }
        });
      });
      first.append(lama);
      const input = document.createElement('textarea');
      input.rows = 2;
      input.value = draft.text;
      input.setAttribute('aria-label', '第 ' + (i + 1) + ' 条字幕内容');
      input.addEventListener('input', () => { draft.text = input.value; });
      const choices = make('div', undefined, 'manga-smart-line');
      const erase = document.createElement('label');
      const eraseCheck = document.createElement('input');
      eraseCheck.type = 'checkbox';
      eraseCheck.checked = draft.erase !== false;
      eraseCheck.addEventListener('change', () => { draft.erase = eraseCheck.checked; });
      erase.append(eraseCheck, document.createTextNode('自动去字（纯色气泡）'));
      const vertical = document.createElement('label');
      const verticalCheck = document.createElement('input');
      verticalCheck.type = 'checkbox';
      verticalCheck.checked = !!draft.vertical;
      verticalCheck.addEventListener('change', () => { draft.vertical = verticalCheck.checked; });
      vertical.append(verticalCheck, document.createTextNode('竖排'));
      choices.append(erase, vertical);
      row.append(first, input, choices);
      list.appendChild(row);
    });
    $('mangaSmartApply').disabled = state.busy || !state.drafts.length;
  }

  async function detect() {
    const c = getCanvas();
    if (!c) return message('请先打开一页漫画。', true);
    if (state.busy) return;
    state.busy = true;
    $('mangaSmartDetect').disabled = true;
    message('正在使用本机 Tesseract 识别当前画布……');
    try {
      const image = snapshot(c);
      const result = await window.MangaModelRequest.post('/manga-smart/ocr',
        { image, language: $('mangaSmartLanguage').value }, { signal: startRequest() });
      if (!result.ok) throw new Error(result.error || 'OCR 无法完成。');
      if (result.width !== c.getWidth() || result.height !== c.getHeight()) {
        throw new Error('画布尺寸在识别期间已变化，请重新检测。');
      }
      if (snapshot(c) !== image) throw new Error('识别期间画布被修改，请重新检测。');
      state.canvas = c;
      state.sourceImage = image;
      state.drafts = core.mapDetections(result.regions, c.getWidth(), c.getHeight())
        .map(d => ({ ...d, active: true }));
      message(state.drafts.length ? '识别到 ' + state.drafts.length + ' 条候选文字。可逐条修改后一次应用。'
        : '这一页没有识别到文字。如果其实有字，可以点「手动框选字幕」把文字区域框出来再识别。');
      renderDrafts();
      const pageUI = window.MangaPageStructureUI;
      if (pageUI && typeof pageUI.refreshFromOCR === 'function') pageUI.refreshFromOCR();
    } catch (error) {
      message(error.message || String(error), true);
    } finally {
      endRequest();
      state.busy = false;
      $('mangaSmartDetect').disabled = false;
      renderDrafts();
    }
  }

  function stopSelection() {
    if (!state.selection) return;
    state.selection.cleanup();
    state.selection.overlay.remove();
    state.selection = null;
  }
  function beginManual() {
    const c = getCanvas();
    if (!c || !c.upperCanvasEl) return message('请先打开一页漫画。', true);
    stopSelection();
    const bounds = c.upperCanvasEl.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return message('画布不可见。', true);
    const overlay = make('div', undefined, 'manga-smart-overlay');
    // A margin around the page so a drag that starts just outside it still counts (clamped to the
    // page edge); beginners aiming at a bubble in the corner rarely start exactly on the page.
    const vw = window.innerWidth || document.documentElement.clientWidth, vh = window.innerHeight || document.documentElement.clientHeight;
    const pad = {
      left: Math.max(0, Math.min(48, bounds.left)), top: Math.max(0, Math.min(48, bounds.top)),
      right: Math.max(0, Math.min(48, vw - bounds.right)), bottom: Math.max(0, Math.min(48, vh - bounds.bottom))
    };
    Object.assign(overlay.style, { left: (bounds.left - pad.left) + 'px', top: (bounds.top - pad.top) + 'px',
      width: (bounds.width + pad.left + pad.right) + 'px', height: (bounds.height + pad.top + pad.bottom) + 'px' });
    const guide = make('div', undefined, 'manga-smart-rectangle');
    overlay.appendChild(guide);
    document.body.appendChild(overlay);
    let start = null;
    const clamp = (v, max) => Math.max(0, Math.min(max, v));
    const toPage = e => ({
      x: clamp((e.clientX - bounds.left) / bounds.width * c.getWidth(), c.getWidth()),
      y: clamp((e.clientY - bounds.top) / bounds.height * c.getHeight(), c.getHeight())
    });
    function dismiss() {
      stopSelection();
    }
    const keyListener = e => { if (e.key === 'Escape') dismiss(); };
    const movement = () => { dismiss(); message('画布已移动，请重新框选。', true); };
    window.addEventListener('resize', movement);
    window.addEventListener('scroll', movement, true);
    document.addEventListener('keydown', keyListener);
    state.selection = { overlay, cleanup: () => {
      window.removeEventListener('resize', movement);
      window.removeEventListener('scroll', movement, true);
      document.removeEventListener('keydown', keyListener);
    } };
    overlay.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      start = toPage(e);
      overlay.setPointerCapture(e.pointerId);
    });
    overlay.addEventListener('pointermove', e => {
      if (!start) return;
      const end = toPage(e);
      const left = Math.min(start.x, end.x), top = Math.min(start.y, end.y);
      Object.assign(guide.style, {
        left: pad.left + left / c.getWidth() * bounds.width + 'px',
        top: pad.top + top / c.getHeight() * bounds.height + 'px',
        width: Math.abs(start.x - end.x) / c.getWidth() * bounds.width + 'px',
        height: Math.abs(start.y - end.y) / c.getHeight() * bounds.height + 'px'
      });
    });
    overlay.addEventListener('pointerup', e => {
      if (!start) return;
      const box = core.normalizeManualDrag(start, toPage(e), c.getWidth(), c.getHeight());
      dismiss();
      if (!box) return message('选区太小，请重新框选。', true);
      const image = snapshot(c);
      if (state.canvas !== c || state.sourceImage !== image) state.drafts = [];
      state.canvas = c;
      state.sourceImage = image;
      state.drafts.push({ ...box, text: '新字幕', erase: true,
        vertical: $('mangaSmartLanguage').value.startsWith('jpn_vert') ||
          ($('mangaSmartLanguage').value === 'auto' && box.height > box.width * 1.3), confidence: 100, active: true });
      renderDrafts();
      if (window.MangaPageStructureUI) window.MangaPageStructureUI.refreshFromOCR();
      message('已添加手动字幕区。修改文字后点击「应用」。');
    });
    message('在画布上拖动框选字幕区域，按 Esc 取消。');
  }

  function boundarySamples(ctx, box, imageWidth, imageHeight) {
    const data = [];
    const extra = Math.max(5, Math.round(Math.min(box.width, box.height) * 0.15));
    const left = Math.floor(box.x), top = Math.floor(box.y);
    const right = Math.ceil(box.x + box.width), bottom = Math.ceil(box.y + box.height);
    const samples = [];
    for (let x = left; x <= right; x += Math.max(1, Math.round(box.width / 16))) {
      samples.push([x, top - extra], [x, bottom + extra]);
    }
    for (let y = top; y <= bottom; y += Math.max(1, Math.round(box.height / 16))) {
      samples.push([left - extra, y], [right + extra, y]);
    }
    for (const [x, y] of samples) {
      if (x < 0 || x >= imageWidth || y < 0 || y >= imageHeight) continue;
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      data.push(pixel[0], pixel[1], pixel[2], pixel[3]);
    }
    return new Uint8ClampedArray(data);
  }

  function makeErasure(source, box, color) {
    const pad = Math.max(5, Math.round(Math.min(box.height, 60) * 0.22));
    const x = Math.max(0, Math.floor(box.x - pad));
    const y = Math.max(0, Math.floor(box.y - pad));
    const right = Math.min(source.width, Math.ceil(box.x + box.width + pad));
    const bottom = Math.min(source.height, Math.ceil(box.y + box.height + pad));
    const patch = document.createElement('canvas');
    patch.width = right - x;
    patch.height = bottom - y;
    const ctx = patch.getContext('2d');
    const feather = Math.min(4, pad / 2);
    const image = ctx.createImageData(patch.width, patch.height);
    for (let yy = 0; yy < patch.height; yy++) for (let xx = 0; xx < patch.width; xx++) {
      const edge = Math.min(xx, yy, patch.width - 1 - xx, patch.height - 1 - yy);
      const i = (yy * patch.width + xx) * 4;
      image.data[i] = color.r;
      image.data[i + 1] = color.g;
      image.data[i + 2] = color.b;
      image.data[i + 3] = Math.round(255 * Math.min(1, Math.max(0, edge / feather)));
    }
    ctx.putImageData(image, 0, 0);
    return { x, y, dataUrl: patch.toDataURL('image/png') };
  }

  let measureContext = null;
  function measureText(text, size) {
    measureContext = measureContext || document.createElement('canvas').getContext('2d');
    measureContext.font = size + 'px Arial';
    return measureContext.measureText(text).width;
  }

  async function apply() {
    const c = getCanvas();
    if (!c || c !== state.canvas) return message('画布已切换，请重新识别或框选。', true);
    if (!state.sourceImage || snapshot(c) !== state.sourceImage) {
      return message('画布在识别后被修改。为了防止错位覆盖，请重新检测本页。', true);
    }
    if (state.busy) return;
    const selected = state.drafts.filter(d => d.active !== false && d.text.trim());
    if (!selected.length) return message('没有选中要添加的文字。', true);
    state.busy = true;
    $('mangaSmartApply').disabled = true;
    let processed = 0, skipped = 0, overflow = 0;
    try {
      const original = await loadImage(snapshot(c));
      const pixelCanvas = document.createElement('canvas');
      pixelCanvas.width = c.getWidth();
      pixelCanvas.height = c.getHeight();
      const px = pixelCanvas.getContext('2d', { willReadFrequently: true });
      px.drawImage(original, 0, 0, pixelCanvas.width, pixelCanvas.height);
      const prepared = [];
      for (const candidate of selected) {
        const box = core.normalizeBox(candidate, c.getWidth(), c.getHeight());
        if (!box) continue;
        let eraseLayer = null;
        if (candidate.erase) {
          const bg = core.boundaryColor(boundarySamples(px, box, pixelCanvas.width, pixelCanvas.height));
          if (!bg.safe && !candidate.lamaApplied) { skipped++; continue; }
          if (bg.safe) {
            const patch = makeErasure(pixelCanvas, box, bg.color);
            eraseLayer = await fabricImage(patch.dataUrl);
            eraseLayer.set({ left: patch.x, top: patch.y, selectable: true });
            eraseLayer.set('name', '智能字幕 · 原字遮盖');
            eraseLayer.set('mangaSmartText', 'erase-patch');
          }
        }
        const vertical = candidate.vertical && typeof fabric.VerticalTextbox === 'function';
        const area = (candidate.textArea && core.normalizeBox(candidate.textArea, c.getWidth(), c.getHeight())) || box;
        // original glyph size = the tight text box's cross dimension (one column / one line)
        const glyph = area === box ? 0 : (vertical ? box.width : box.height) * 1.1;
        const fit = core.fitText(candidate.text, area, vertical, measureText, glyph);
        if (fit.overflow) overflow++;
        const TextClass = vertical ? fabric.VerticalTextbox : fabric.Textbox;
        const lineHeight = 1.16;
        const blockHeight = vertical ? area.height : fit.lines * fit.fontSize * lineHeight;
        const textbox = new TextClass(fit.text, {
          left: area.x, top: vertical ? area.y : area.y + Math.max(0, (area.height - blockHeight) / 2),
          width: Math.max(32, area.width),
          fontFamily: 'Arial', fontSize: fit.fontSize, lineHeight,
          fill: '#151515', textAlign: 'center', breakWords: false
        });
        // centre the lettering in its area (bubble interior), like hand lettering
        if (typeof textbox.getBoundingRect === 'function') {
          textbox.setCoords();
          const r = textbox.getBoundingRect(true, true);
          if (r && r.width > 0 && r.height > 0) {
            textbox.set({ left: textbox.left + (area.x + area.width / 2) - (r.left + r.width / 2),
              top: textbox.top + (area.y + area.height / 2) - (r.top + r.height / 2) });
            textbox.setCoords();
          }
        }
        textbox.set('mangaSmartFit', { fontSize: fit.fontSize, wrapped: fit.wrapped, box: area, textBox: box });
        textbox.set('name', '智能字幕 · 可编辑文字');
        textbox.set('mangaSmartText', 'editable-subtitle');
        prepared.push({ eraseLayer, textbox });
      }
      if (!prepared.length) return message(
        '没有安全的自动去字区域：复杂背景或透明区域请先用 GPT 改图去字，或取消「自动去字」只创建文字层。', true);
      if (typeof changeDoNotSaveHistory === 'function') changeDoNotSaveHistory();
      try {
        // Order matters: raster cover directly above original, vector subtitle above cover.
        prepared.forEach(entry => {
          if (entry.eraseLayer) c.add(entry.eraseLayer);
          c.add(entry.textbox);
          processed++;
        });
        c.setActiveObject(prepared[prepared.length - 1].textbox);
        c.requestRenderAll();
      } finally {
        if (typeof changeDoSaveHistory === 'function') changeDoSaveHistory();
      }
      if (typeof saveStateByManual === 'function') saveStateByManual();
      if (typeof updateLayerPanel === 'function') updateLayerPanel();
      state.drafts = [];
      state.sourceImage = '';
      renderDrafts();
      if (window.MangaPageStructureUI) window.MangaPageStructureUI.invalidate(
        '字幕图层已应用，页面结构可能变化，请重新分析。');
      message('已添加 ' + processed + ' 组可编辑字幕及安全遮盖，跳过复杂背景 ' +
        skipped + ' 组。保留原画布，支持撤销和保存。' +
        (overflow ? ' 有 ' + overflow + ' 组文字太长，缩到最小字号仍放不下气泡，建议精简译文或手动拉大文字框。' : ''));
    } catch (error) {
      message('应用字幕失败：' + (error.message || String(error)), true);
    } finally {
      state.busy = false;
      $('mangaSmartApply').disabled = !state.drafts.length;
    }
  }

  function render() {
    if ($('mangaSmartTextPanel')) return;
    const header = document.querySelector('#canvas-area .area-header');
    if (!header) return;
    const open = make('button', '智能字幕');
    open.type = 'button';
    open.id = 'mangaSmartOpen';
    header.appendChild(open);
    const panel = make('section', undefined, 'manga-smart-panel');
    panel.id = 'mangaSmartTextPanel';
    panel.hidden = true;
    panel.innerHTML = [
      '<header><strong>智能漫画字幕</strong><button id="mangaSmartClose" type="button">×</button></header>',
      '<p>本地 OCR → 文字修改 → 原生图层。不会消耗 GPT 生图额度。</p>',
      '<label>识别语言 <select id="mangaSmartLanguage" title="自动：先找白色对话气泡，竖排和横排都试一遍，取更可信的结果。识别不准时再换成具体语言。"><option value="auto" selected>自动（推荐：日漫气泡，竖排/横排）</option><option value="jpn+eng">日语＋英语（横排）</option>',
      '<option value="jpn_vert+eng">日语竖排＋英语</option><option value="eng">英语</option>',
      '<option value="chi_sim+eng">简体中文＋英语</option><option value="chi_tra+eng">繁体中文＋英语</option>',
      '<option value="kor+eng">韩语＋英语</option></select></label>',
      '<div class="manga-smart-line"><button id="mangaSmartDetect" type="button">检测本页文字</button>',
      '<button id="mangaSmartManual" type="button">手动框选字幕</button>',
      '<button id="mangaSmartCancel" type="button" hidden>取消识别</button></div>',
      '<div id="mangaSmartRegions" class="manga-smart-regions"></div>',
      '<button id="mangaSmartApply" type="button" disabled>应用为可编辑图层</button>',
      '<p class="manga-smart-hint">自动去字仅适合纯色气泡。复杂背景请先用 GPT 改图擦字，或取消勾选仅插入文字。',
      '基础 OCR 需要本机 Tesseract 及所选语言包。复杂背景可点击本地 LaMa 去字，先预览后确认，模型为可选依赖。Manga OCR 精修为可选依赖，首次点击可能联网下载约 400MB 模型；成功后可用缓存离线运行。精修结果须人工确认。</p>',
      '<div id="mangaSmartStatus" role="status"></div>'
    ].join('');
    document.body.appendChild(panel);
    open.addEventListener('click', () => { panel.hidden = !panel.hidden; });
    $('mangaSmartClose').addEventListener('click', () => { panel.hidden = true; stopSelection(); });
    $('mangaSmartDetect').addEventListener('click', detect);
    $('mangaSmartCancel').addEventListener('click', cancelRequest);
    $('mangaSmartManual').addEventListener('click', beginManual);
    $('mangaSmartApply').addEventListener('click', apply);
    message('先检测本页文字，或手动框选区域。');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
  window.MangaSmartTextEditor = {
    detect, apply, beginManual, stopSelection,
    getDrafts: () => state.drafts.map(d => ({ ...d })),
    setPanelAssignments: assignments => {
      const map = new Map((assignments || []).map(x => [x.sourceIndex, x.panelId]));
      state.drafts.forEach((d, index) => { d.panelId = map.get(index) || null; });
      renderDrafts();
    }
  };
})();
