/* Smart manga lettering workflow.
 * Tesseract runs locally in 99_server.py. Fabric owns all permanent objects,
 * including the non-destructive light-background eraser and editable text.
 */
(function () {
  'use strict';
  const core = window.MangaSmartTextCore;
  if (!core) return;
  const state = { drafts: [], busy: false, canvas: null, selection: null };
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
        ',' + Math.round(draft.y) + ' · ' + Math.round(draft.confidence || 0) + '%');
      const remove = make('button', '删除', 'manga-smart-small');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        state.drafts.splice(i, 1);
        renderDrafts();
      });
      first.append(use, label, remove);
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
      const response = await fetch('/manga-smart/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, language: $('mangaSmartLanguage').value })
      });
      let result;
      try { result = await response.json(); }
      catch (_) { throw new Error('OCR 返回的不是 JSON，请检查本地服务日志。'); }
      if (!response.ok || !result.ok) throw new Error(result.error || 'OCR 无法完成。');
      if (result.width !== c.getWidth() || result.height !== c.getHeight()) {
        throw new Error('画布尺寸在识别期间已变化，请重新检测。');
      }
      state.canvas = c;
      state.drafts = core.mapDetections(result.regions, c.getWidth(), c.getHeight())
        .map(d => ({ ...d, active: true }));
      message('识别到 ' + state.drafts.length + ' 条候选文字。可逐条修改后一次应用。');
      renderDrafts();
    } catch (error) {
      message(error.message || String(error), true);
    } finally {
      state.busy = false;
      $('mangaSmartDetect').disabled = false;
      $('mangaSmartApply').disabled = !state.drafts.length;
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
    Object.assign(overlay.style, { left: bounds.left + 'px', top: bounds.top + 'px',
      width: bounds.width + 'px', height: bounds.height + 'px' });
    const guide = make('div', undefined, 'manga-smart-rectangle');
    overlay.appendChild(guide);
    document.body.appendChild(overlay);
    let start = null;
    const toPage = e => ({
      x: (e.clientX - bounds.left) / bounds.width * c.getWidth(),
      y: (e.clientY - bounds.top) / bounds.height * c.getHeight()
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
        left: left / c.getWidth() * bounds.width + 'px',
        top: top / c.getHeight() * bounds.height + 'px',
        width: Math.abs(start.x - end.x) / c.getWidth() * bounds.width + 'px',
        height: Math.abs(start.y - end.y) / c.getHeight() * bounds.height + 'px'
      });
    });
    overlay.addEventListener('pointerup', e => {
      if (!start) return;
      const box = core.normalizeManualDrag(start, toPage(e), c.getWidth(), c.getHeight());
      dismiss();
      if (!box) return message('选区太小，请重新框选。', true);
      state.canvas = c;
      state.drafts.push({ ...box, text: '新字幕', erase: true,
        vertical: $('mangaSmartLanguage').value.startsWith('jpn_vert'), confidence: 100, active: true });
      renderDrafts();
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

  async function apply() {
    const c = getCanvas();
    if (!c || c !== state.canvas) return message('画布已切换，请重新识别或框选。', true);
    if (state.busy) return;
    const selected = state.drafts.filter(d => d.active !== false && d.text.trim());
    if (!selected.length) return message('没有选中要添加的文字。', true);
    state.busy = true;
    $('mangaSmartApply').disabled = true;
    let processed = 0, skipped = 0;
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
          if (!bg.safe) { skipped++; continue; }
          const patch = makeErasure(pixelCanvas, box, bg.color);
          eraseLayer = await fabricImage(patch.dataUrl);
          eraseLayer.set({ left: patch.x, top: patch.y, selectable: true });
          eraseLayer.set('name', '智能字幕 · 原字遮盖');
          eraseLayer.set('mangaSmartText', 'erase-patch');
        }
        const size = Math.max(10, Math.min(128, Math.round(box.height * 0.85)));
        const vertical = candidate.vertical && typeof fabric.VerticalTextbox === 'function';
        const TextClass = vertical ? fabric.VerticalTextbox : fabric.Textbox;
        const textbox = new TextClass(candidate.text, {
          left: box.x, top: box.y, width: Math.max(32, box.width),
          fontFamily: 'Arial', fontSize: size,
          fill: '#151515', textAlign: 'center', breakWords: false
        });
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
      renderDrafts();
      message('已添加 ' + processed + ' 组可编辑字幕及安全遮盖，跳过复杂背景 ' +
        skipped + ' 组。保留原画布，支持撤销和保存。');
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
      '<label>识别语言 <select id="mangaSmartLanguage"><option value="jpn+eng">日语＋英语</option>',
      '<option value="jpn_vert+eng">日语竖排＋英语</option><option value="eng">英语</option>',
      '<option value="chi_sim+eng">简体中文＋英语</option><option value="chi_tra+eng">繁体中文＋英语</option>',
      '<option value="kor+eng">韩语＋英语</option></select></label>',
      '<div class="manga-smart-line"><button id="mangaSmartDetect" type="button">检测本页文字</button>',
      '<button id="mangaSmartManual" type="button">手动框选字幕</button></div>',
      '<div id="mangaSmartRegions" class="manga-smart-regions"></div>',
      '<button id="mangaSmartApply" type="button" disabled>应用为可编辑图层</button>',
      '<p class="manga-smart-hint">自动去字仅适合纯色气泡。复杂背景请先用 GPT 改图擦字，或取消勾选仅插入文字。',
      '需要在本机安装 Tesseract 及所选语言包；断网也能识别。</p>',
      '<div id="mangaSmartStatus" role="status"></div>'
    ].join('');
    document.body.appendChild(panel);
    open.addEventListener('click', () => { panel.hidden = !panel.hidden; });
    $('mangaSmartClose').addEventListener('click', () => { panel.hidden = true; stopSelection(); });
    $('mangaSmartDetect').addEventListener('click', detect);
    $('mangaSmartManual').addEventListener('click', beginManual);
    $('mangaSmartApply').addEventListener('click', apply);
    message('先检测本页文字，或手动框选区域。');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
  window.MangaSmartTextEditor = { detect, apply, beginManual, stopSelection };
})();
