/* Manga-NAI-GPT: isolated, non-destructive image editing surface.
 * Uses the existing Fabric canvas and history APIs; does not change NovelAI.
 * API credentials remain in the input's memory and are never persisted.
 */
(function () {
  'use strict';

  const state = {
    region: null,
    result: '',
    pending: false,
    references: [],
    selectionOverlay: null
  };

  const $g = id => document.getElementById(id);
  const pageCanvas = () => (typeof canvas !== 'undefined' && canvas && typeof canvas.toDataURL === 'function') ? canvas : null;

  function feedback(message, isError) {
    const element = $g('mangaGptStatus');
    if (!element) return;
    element.textContent = message;
    element.dataset.error = isError ? 'true' : 'false';
  }

  function toDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        reject(new Error('参考图仅支持 PNG、JPEG、WebP。'));
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        reject(new Error('单张参考图不得超过 12MB。'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('读取参考图片失败。'));
      reader.readAsDataURL(file);
    });
  }

  function cropCanvas(c, region) {
    return c.toDataURL({
      format: 'png',
      multiplier: 1,
      left: region.left,
      top: region.top,
      width: region.width,
      height: region.height
    });
  }

  function normalizeRegion(startX, startY, endX, endY, rect, c) {
    const factorX = c.getWidth() / rect.width;
    const factorY = c.getHeight() / rect.height;
    const left = Math.max(0, Math.floor(Math.min(startX, endX) * factorX));
    const top = Math.max(0, Math.floor(Math.min(startY, endY) * factorY));
    const right = Math.min(c.getWidth(), Math.ceil(Math.max(startX, endX) * factorX));
    const bottom = Math.min(c.getHeight(), Math.ceil(Math.max(startY, endY) * factorY));
    return { left, top, width: right - left, height: bottom - top };
  }

  function cancelSelection() {
    if (state.selectionOverlay) state.selectionOverlay.remove();
    state.selectionOverlay = null;
  }

  function startSelection() {
    const c = pageCanvas();
    if (!c || !c.upperCanvasEl) {
      feedback('画布还没有初始化。', true);
      return;
    }
    cancelSelection();
    const rect = c.upperCanvasEl.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      feedback('画布不可见，无法框选。', true);
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'manga-gpt-selection';
    Object.assign(overlay.style, {
      position: 'fixed', left: rect.left + 'px', top: rect.top + 'px',
      width: rect.width + 'px', height: rect.height + 'px'
    });
    const rectangle = document.createElement('div');
    rectangle.className = 'manga-gpt-selection-rectangle';
    overlay.appendChild(rectangle);
    document.body.appendChild(overlay);
    state.selectionOverlay = overlay;
    let start = null;
    overlay.addEventListener('pointerdown', event => {
      if (event.button !== 0 && event.button !== 2) return;
      event.preventDefault();
      start = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      overlay.setPointerCapture(event.pointerId);
    });
    overlay.addEventListener('pointermove', event => {
      if (!start) return;
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      rectangle.style.left = Math.min(x, start.x) + 'px';
      rectangle.style.top = Math.min(y, start.y) + 'px';
      rectangle.style.width = Math.abs(x - start.x) + 'px';
      rectangle.style.height = Math.abs(y - start.y) + 'px';
    });
    overlay.addEventListener('pointerup', event => {
      if (!start) return;
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      const region = normalizeRegion(start.x, start.y, x, y, rect, c);
      cancelSelection();
      start = null;
      if (region.width < 8 || region.height < 8) {
        feedback('框选区域太小，请至少选择 8 × 8 像素。', true);
        return;
      }
      try {
        const image = cropCanvas(c, region);
        state.region = { canvas: c, ...region, image, canvasWidth: c.getWidth(), canvasHeight: c.getHeight() };
        state.result = '';
        $g('mangaGptApply').disabled = true;
        $g('mangaGptPreview').src = image;
        feedback('已选中原始画布区域：' + region.width + ' × ' + region.height + ' 像素。');
      } catch (error) {
        feedback('截取失败：画布可能包含不允许导出的跨域图片。', true);
      }
    });
    overlay.addEventListener('contextmenu', event => event.preventDefault());
    overlay.addEventListener('pointercancel', cancelSelection);
    feedback('拖动鼠标左键或右键框选区域；Esc 可取消。');
  }

  function imageProxyBase() {
    return location.protocol === 'file:' ? 'http://127.0.0.1:8000' : location.origin;
  }

  function currentOperation() {
    return $g('mangaGptMode').value;
  }

  async function generate() {
    if (state.pending) return;
    const c = pageCanvas();
    const operation = currentOperation();
    if (!c) return feedback('请先打开画布。', true);
    if (operation === 'edit' && (!state.region || state.region.canvas !== c)) {
      return feedback('请先在当前画布框选需要修改的区域。', true);
    }
    if (operation === 'edit') {
      const r = state.region;
      if (r.canvasWidth !== c.getWidth() || r.canvasHeight !== c.getHeight() || cropCanvas(c, r) !== r.image) {
        return feedback('画布或选中区域已经变化，请重新框选。', true);
      }
    }
    const apiKey = $g('mangaGptKey').value.trim().replace(/^Bearer\s+/i, '');
    // An empty input lets the localhost relay use optional GPT_IMAGE_API_KEY from .env.
    const prompt = $g('mangaGptPrompt').value.trim();
    if (!prompt) return feedback('请先描述想要的画面修改。', true);
    state.pending = true;
    state.result = '';
    $g('mangaGptGenerate').disabled = true;
    $g('mangaGptMode').disabled = true;
    $g('mangaGptApply').disabled = true;
    feedback('正在请求图像模型。生成可能产生 API 费用。');
    try {
      const payload = {
        baseUrl: $g('mangaGptUrl').value.trim(),
        model: $g('mangaGptModel').value.trim(),
        operation,
        prompt,
        size: $g('mangaGptSize').value,
        references: operation === 'edit' ? state.references : []
      };
      if (operation === 'edit') payload.image = state.region.image;
      const response = await fetch(imageProxyBase() + '/gpt-image-proxy', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' },
          apiKey ? { Authorization: 'Bearer ' + apiKey } : {}),
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!response.ok || !json.ok || !json.image) {
        throw new Error(json.error || '上游没有返回图像。');
      }
      if (!/^data:image\/(png|jpeg|webp);base64,/.test(json.image)) {
        throw new Error('图像响应格式无效。');
      }
      state.result = json.image;
      $g('mangaGptPreview').src = json.image;
      $g('mangaGptApply').disabled = false;
      feedback('图像已生成，请检查预览后点击“作为新图层应用”。');
    } catch (error) {
      feedback(error.message || '请求失败。请检查本地服务和上游接口。', true);
    } finally {
      state.pending = false;
      $g('mangaGptGenerate').disabled = false;
      $g('mangaGptMode').disabled = false;
    }
  }

  async function apply() {
    const c = pageCanvas();
    if (!c || !state.result) return feedback('没有可应用的结果。', true);
    const isEdit = currentOperation() === 'edit';
    const region = state.region;
    if (isEdit && (!region || region.canvas !== c || region.canvasWidth !== c.getWidth() ||
                   region.canvasHeight !== c.getHeight() || cropCanvas(c, region) !== region.image)) {
      return feedback('画布或选中区域已经改变，请重新框选并生成。', true);
    }
    $g('mangaGptApply').disabled = true;
    try {
      const image = await new Promise((resolve, reject) => {
        fabric.Image.fromURL(state.result, img => {
          if (!img || !img.width || !img.height) reject(new Error('生成图片解码失败。'));
          else resolve(img);
        });
      });
      const targetWidth = isEdit ? region.width : image.width;
      const targetHeight = isEdit ? region.height : image.height;
      // Center-crop to the selected region's aspect ratio before uniform scaling.
      // Scaling X and Y independently distorted faces and lettering in non-square regions.
      const aspect = targetWidth / targetHeight;
      const cropWidth = isEdit ? Math.min(image.width, image.height * aspect) : image.width;
      const cropHeight = isEdit ? Math.min(image.height, image.width / aspect) : image.height;
      if (isEdit && (cropWidth < region.width || cropHeight < region.height) &&
          !$g('mangaGptAllowUpscale').checked) {
        throw new Error('生成图片中心裁切后的有效像素 (' + Math.floor(cropWidth) + ' × ' +
          Math.floor(cropHeight) + ') 小于选区 (' + region.width + ' × ' + region.height +
          ')。已阻止低清晰度放大，可重新生成或勾选允许放大。');
      }
      const scale = isEdit ? targetWidth / cropWidth :
        Math.min(1, c.getWidth() / targetWidth, c.getHeight() / targetHeight);
      image.set({
        left: isEdit ? region.left : (c.getWidth() - targetWidth * scale) / 2,
        top: isEdit ? region.top : (c.getHeight() - targetHeight * scale) / 2,
        cropX: isEdit ? (image.width - cropWidth) / 2 : 0,
        cropY: isEdit ? (image.height - cropHeight) / 2 : 0,
        width: cropWidth,
        height: cropHeight,
        scaleX: scale,
        scaleY: scale,
        objectCaching: false
      });
      image.set('mangaGptSource', 'openai-compatible-image');
      if (typeof changeDoNotSaveHistory === 'function') changeDoNotSaveHistory();
      try {
        c.add(image);
        c.setActiveObject(image);
        c.requestRenderAll();
        if (typeof updateLayerPanel === 'function') updateLayerPanel();
      } finally {
        if (typeof changeDoSaveHistory === 'function') changeDoSaveHistory();
      }
      if (typeof saveStateByManual === 'function') saveStateByManual();
      state.result = '';
      state.region = null;
      feedback('已添加独立图层，按选区比例居中裁切、等比例缩放（不会拉变形）。原图和画布尺寸未改变，可撤销。');
    } catch (error) {
      feedback(error.message || '无法插入图层。', true);
      $g('mangaGptApply').disabled = false;
    }
  }

  function changeSelectedText() {
    const c = pageCanvas();
    const obj = c && c.getActiveObject && c.getActiveObject();
    const text = $g('mangaGptSubtitle').value;
    if (!obj || !['text', 'textbox', 'i-text'].includes(obj.type)) {
      return feedback('请先选中画布上的文字图层。', true);
    }
    if (!text.trim()) return feedback('请填写替换后的字幕内容。', true);
    if (typeof changeDoNotSaveHistory === 'function') changeDoNotSaveHistory();
    try {
      obj.set('text', text);
      if (typeof obj.setCoords === 'function') obj.setCoords();
      c.requestRenderAll();
      if (typeof updateLayerPanel === 'function') updateLayerPanel();
    } finally {
      if (typeof changeDoSaveHistory === 'function') changeDoSaveHistory();
    }
    if (typeof saveStateByManual === 'function') saveStateByManual();
    feedback('已替换选中文字图层，保留其原有文字样式。');
  }

  function render() {
    if ($g('mangaGptPanel')) return;
    const header = document.querySelector('#canvas-area .area-header');
    if (!header) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'mangaGptOpen';
    button.textContent = 'GPT 改图';
    button.title = '框选局部区域并用 GPT 修改，也可生成新图片或替换文字';
    header.appendChild(button);
    const panel = document.createElement('section');
    panel.id = 'mangaGptPanel';
    panel.className = 'manga-gpt-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'GPT 图像编辑');
    panel.innerHTML = [
      '<div class="manga-gpt-head"><strong>Manga-NAI-GPT</strong><button type="button" id="mangaGptClose" aria-label="关闭">×</button></div>',
      '<div class="manga-gpt-row"><label>操作<select id="mangaGptMode"><option value="edit">局部改图 / 角色替换</option><option value="generate">文字生图 / 新图层</option></select></label>',
      '<button type="button" id="mangaGptSelect">框选区域</button></div>',
      '<label>兼容 API 地址<input id="mangaGptUrl" type="url" placeholder="https://api.openai.com/v1" value="https://api.openai.com/v1" autocomplete="off"></label>',
      '<div class="manga-gpt-row"><label>图像模型<input id="mangaGptModel" type="text" value="gpt-image-1" placeholder="模型 ID"></label>',
      '<label>尺寸<select id="mangaGptSize"><option value="auto">自动</option><option value="1024x1024">1024×1024</option><option value="1536x1024">1536×1024</option><option value="1024x1536">1024×1536</option></select></label></div>',
      '<label>API Key（可留空读取本地 .env）<input id="mangaGptKey" type="password" placeholder="sk-…" autocomplete="off" spellcheck="false"></label>',
      '<label>修改描述<textarea id="mangaGptPrompt" rows="3" placeholder="将框选人物替换为参考图角色，保持动作、画风、构图与未选中部分。"></textarea></label>',
      '<label>人物 / 风格参考图（最多 3 张）<input id="mangaGptReferences" type="file" multiple accept="image/png,image/jpeg,image/webp"></label>',
      '<div id="mangaGptReferenceList" class="manga-gpt-hint">尚未选择参考图</div>',
      '<label class="manga-gpt-hint"><input id="mangaGptAllowUpscale" type="checkbox"> 允许将低于选区分辨率的生成图放大覆盖（会影响选区清晰度）</label>',
      '<div class="manga-gpt-row"><button type="button" id="mangaGptGenerate">生成预览</button><button type="button" id="mangaGptApply" disabled>作为新图层应用</button></div>',
      '<img id="mangaGptPreview" class="manga-gpt-preview" alt="当前框选或 GPT 生成预览">',
      '<details><summary>原生字幕修改（无需 API）</summary><label>替换选中文字图层<input id="mangaGptSubtitle" type="text" placeholder="输入新的字幕内容"></label>',
      '<button type="button" id="mangaGptReplaceText">替换文字并记录撤销</button></details>',
      '<div id="mangaGptStatus" class="manga-gpt-status" role="status">先框选，再输入修改描述。不会覆盖原图。</div>'
    ].join('');
    document.body.appendChild(panel);
    button.addEventListener('click', () => { panel.hidden = !panel.hidden; });
    $g('mangaGptClose').addEventListener('click', () => { panel.hidden = true; cancelSelection(); });
    $g('mangaGptSelect').addEventListener('click', startSelection);
    $g('mangaGptGenerate').addEventListener('click', generate);
    $g('mangaGptApply').addEventListener('click', apply);
    $g('mangaGptReplaceText').addEventListener('click', changeSelectedText);
    $g('mangaGptMode').addEventListener('change', () => {
      state.result = '';
      $g('mangaGptApply').disabled = true;
      $g('mangaGptSelect').disabled = currentOperation() !== 'edit';
      feedback(currentOperation() === 'edit' ? '先框选修改区域。' : '输入提示词，生图后添加为独立图层。');
    });
    $g('mangaGptReferences').addEventListener('change', async event => {
      try {
        const files = Array.from(event.target.files || []);
        if (files.length > 3) throw new Error('最多 3 张参考图。');
        state.references = await Promise.all(files.map(toDataUrl));
        $g('mangaGptReferenceList').textContent = files.length ?
          files.map(file => file.name).join('、') : '尚未选择参考图';
      } catch (error) {
        state.references = [];
        event.target.value = '';
        feedback(error.message, true);
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') cancelSelection();
    });
    feedback('先框选修改区域，也可以切换“文字生图”。');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();

  window.MangaGPTRegionEditor = { normalizeRegion, startSelection, cancelSelection };
})();
