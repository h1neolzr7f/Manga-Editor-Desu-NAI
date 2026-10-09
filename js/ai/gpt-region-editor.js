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
    characterPromptSuffix: '',
    characterReferenceName: '',
    selectionOverlay: null,
    selectionCleanup: null,
    controller: null
  };

  const TEXT_TYPES = ['text', 'textbox', 'i-text', 'vertical-textbox'];
  const SIZE_ASPECTS = { '1024x1024': [1024, 1024], '1536x1024': [1536, 1024], '1024x1536': [1024, 1536] };
  // Longer than the local relay's upstream timeout (300 s) so its readable 504 arrives first.
  const REQUEST_TIMEOUT_MS = 330000;
  // Mean |residual| (0-255) on the context ring above which the model is considered to have
  // recomposed the surroundings; measured on real gpt-image-2 results (drift 2-16, recomposed 33-51).
  const DRIFT_MAX_RESIDUAL = 20;

  const $g = id => document.getElementById(id);

  // UI text goes through i18next (keys mgpt_* in js/ui/third/i18next.js) with the Chinese
  // text as fallback, so the panel still works when i18next is missing (tests, file://).
  // Placeholders use {name} and are filled here, not by i18next.
  function tr(key, fallback, vars) {
    let text = fallback;
    try {
      if (typeof i18next !== 'undefined' && i18next && typeof i18next.t === 'function' &&
          (typeof i18next.exists !== 'function' || i18next.exists(key))) {
        const value = i18next.t(key);
        if (typeof value === 'string' && value && value !== key) text = value;
      }
    } catch (error) {
      text = fallback;
    }
    if (vars) text = text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
    return text;
  }

  function esc(text) {
    return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
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
        reject(new Error(tr('mgpt_ref_type', '参考图仅支持 PNG、JPEG、WebP。')));
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        reject(new Error(tr('mgpt_ref_size', '单张参考图不得超过 12MB。')));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(tr('mgpt_ref_read', '读取参考图片失败。')));
      reader.readAsDataURL(file);
    });
  }

  // Lettering = editable text and speech bubbles. It stays vector/editable above
  // the GPT patch instead of being baked into (and possibly garbled by) the model.
  function isLettering(obj) {
    if (!obj) return false;
    if (TEXT_TYPES.includes(obj.type)) return true;
    if (obj.isSpeechBubble) return true;
    return obj.customType === 'speechBubbleSVG' || obj.customType === 'speechBubbleText' ||
      (typeof isFreehandBubblePath === 'function' && isFreehandBubblePath(obj));
  }

  function cropCanvas(c, region, excludeLettering) {
    const hidden = [];
    if (excludeLettering && typeof c.getObjects === 'function') {
      c.getObjects().forEach(obj => {
        if (isLettering(obj) && obj.visible !== false) {
          obj.visible = false;
          hidden.push(obj);
        }
      });
    }
    try {
      return c.toDataURL({
        format: 'png',
        multiplier: 1,
        left: region.left,
        top: region.top,
        width: region.width,
        height: region.height
      });
    } finally {
      hidden.forEach(obj => { obj.visible = true; });
    }
  }

  function regionUnchanged(c, r) {
    return !!r && r.canvas === c && r.canvasWidth === c.getWidth() && r.canvasHeight === c.getHeight() &&
      cropCanvas(c, r, r.excludeLettering) === r.image;
  }

  // Pad the selection to an aspect the image API can return (1:1, 3:2, 2:3) instead of
  // letting the API/our code crop it: nothing inside the selection (heads, hands) is lost.
  function letterboxPlan(width, height, size) {
    let key = size;
    if (!SIZE_ASPECTS[key]) {
      const ratio = width / height;
      key = Object.keys(SIZE_ASPECTS).reduce((best, candidate) => {
        const [w, h] = SIZE_ASPECTS[candidate];
        const [bw, bh] = SIZE_ASPECTS[best];
        return Math.abs(Math.log(ratio / (w / h))) < Math.abs(Math.log(ratio / (bw / bh))) ? candidate : best;
      }, '1024x1024');
    }
    const [maxW, maxH] = SIZE_ASPECTS[key];
    const target = maxW / maxH;
    let paddedW = width;
    let paddedH = height;
    if (width / height > target) paddedH = width / target;
    else paddedW = height * target;
    const scale = Math.min(1, maxW / paddedW);
    const outW = Math.max(1, Math.round(paddedW * scale));
    const outH = Math.max(1, Math.round(paddedH * scale));
    const innerW = width * scale;
    const innerH = height * scale;
    return {
      size: key, width: outW, height: outH,
      inner: { x: (outW - innerW) / 2 / outW, y: (outH - innerH) / 2 / outH, w: innerW / outW, h: innerH / outH }
    };
  }

  // A forced output size whose aspect is far from the selection makes the padding dominate;
  // real gpt-image-2 results then recompose the scene (moved/cut heads, tone boxes).
  function aspectMismatch(width, height, size) {
    if (!SIZE_ASPECTS[size]) return false;
    const [w, h] = SIZE_ASPECTS[size];
    return Math.abs(Math.log((width / height) / (w / h))) > 0.45;
  }

  function letterboxImage(dataUrl, plan) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const out = document.createElement('canvas');
        out.width = plan.width;
        out.height = plan.height;
        const ctx = out.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(img, plan.inner.x * out.width, plan.inner.y * out.height,
          plan.inner.w * out.width, plan.inner.h * out.height);
        resolve(out.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error(tr('mgpt_prepare_failed', '无法准备选区图片。')));
      img.src = dataUrl;
    });
  }

  // Page rectangle covered by the whole letterboxed upload (selection + padding), and the
  // part of it that exists on the page. Padding is filled with the real surroundings so the
  // model sees context and the selection edge is not bordered by artificial white.
  function contextRect(region, plan, pageWidth, pageHeight) {
    const fullW = region.width / plan.inner.w;
    const fullH = region.height / plan.inner.h;
    const full = { left: region.left - plan.inner.x * fullW, top: region.top - plan.inner.y * fullH, width: fullW, height: fullH };
    const left = Math.max(0, Math.floor(full.left));
    const top = Math.max(0, Math.floor(full.top));
    const right = Math.min(pageWidth, Math.ceil(full.left + fullW));
    const bottom = Math.min(pageHeight, Math.ceil(full.top + fullH));
    return { full, clip: right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null };
  }

  function contextPaddedImage(c, region, plan) {
    const rect = contextRect(region, plan, c.getWidth(), c.getHeight());
    let contextUrl = null;
    try {
      if (rect.clip) contextUrl = cropCanvas(c, rect.clip, region.excludeLettering);
    } catch (error) {
      contextUrl = null;
    }
    const load = src => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(tr('mgpt_prepare_failed', '无法准备选区图片。')));
      img.src = src;
    });
    return Promise.all([contextUrl ? load(contextUrl) : null, load(region.image)]).then(([context, selection]) => {
      const out = document.createElement('canvas');
      out.width = plan.width;
      out.height = plan.height;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      const k = plan.width / rect.full.width;
      region.contextBox = context ? {
        x0: (rect.clip.left - rect.full.left) * k, y0: (rect.clip.top - rect.full.top) * k,
        x1: (rect.clip.left - rect.full.left + rect.clip.width) * k, y1: (rect.clip.top - rect.full.top + rect.clip.height) * k
      } : null;
      region.sentImage = out;
      if (context) {
        ctx.drawImage(context, (rect.clip.left - rect.full.left) * k, (rect.clip.top - rect.full.top) * k,
          rect.clip.width * k, rect.clip.height * k);
      }
      ctx.drawImage(selection, plan.inner.x * out.width, plan.inner.y * out.height,
        plan.inner.w * out.width, plan.inner.h * out.height);
      return out.toDataURL('image/png');
    });
  }

  // Soft edge (inside the selection only) on sides that border other artwork, hiding small
  // colour/position drift of the model. Sides on the page border stay hard.
  function featherPlan(region, pageWidth, pageHeight) {
    const width = Math.max(4, Math.min(32, Math.round(Math.min(region.width, region.height) * 0.03)));
    return {
      width,
      left: region.left > 0,
      top: region.top > 0,
      right: region.left + region.width < pageWidth,
      bottom: region.top + region.height < pageHeight
    };
  }

  function featherAlpha(x, y, w, h, fw, sides) {
    let a = 1;
    if (sides.left) a = Math.min(a, (x + 0.5) / fw);
    if (sides.right) a = Math.min(a, (w - x - 0.5) / fw);
    if (sides.top) a = Math.min(a, (y + 0.5) / fw);
    if (sides.bottom) a = Math.min(a, (h - y - 0.5) / fw);
    return Math.max(0, Math.min(1, a));
  }

  // Model colour/brightness drift, measured on the padding ring where both the upload and the
  // result show the same untouched page context. Returns a per-channel offset (clamped) to
  // apply to the patch, or null when there is too little context to measure.
  function estimateDrift(sentCanvas, resultElement, plan, box, maxOffset) {
    if (!sentCanvas || !box) return null;
    const w = sentCanvas.width;
    const h = sentCanvas.height;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(resultElement, 0, 0, w, h);
    const got = tctx.getImageData(0, 0, w, h).data;
    const sent = sentCanvas.getContext('2d').getImageData(0, 0, w, h).data;
    const ix0 = plan.inner.x * w - 2, iy0 = plan.inner.y * h - 2;
    const ix1 = (plan.inner.x + plan.inner.w) * w + 2, iy1 = (plan.inner.y + plan.inner.h) * h + 2;
    const sum = [0, 0, 0];
    let n = 0;
    for (let y = Math.max(0, Math.ceil(box.y0)); y < Math.min(h, Math.floor(box.y1)); y++) {
      for (let x = Math.max(0, Math.ceil(box.x0)); x < Math.min(w, Math.floor(box.x1)); x++) {
        if (x >= ix0 && x < ix1 && y >= iy0 && y < iy1) continue;
        const i = (y * w + x) * 4;
        sum[0] += sent[i] - got[i];
        sum[1] += sent[i + 1] - got[i + 1];
        sum[2] += sent[i + 2] - got[i + 2];
        n++;
      }
    }
    if (n < Math.max(200, w * h * 0.01)) return null;
    const mean = sum.map(v => v / n);
    // Only a near-uniform shift is drift. If the model recomposed the scene (moved things,
    // repainted the margins), the ring no longer matches and a global offset would tint the
    // patch, so leave the colours alone.
    let residual = 0;
    for (let y = Math.max(0, Math.ceil(box.y0)); y < Math.min(h, Math.floor(box.y1)); y++) {
      for (let x = Math.max(0, Math.ceil(box.x0)); x < Math.min(w, Math.floor(box.x1)); x++) {
        if (x >= ix0 && x < ix1 && y >= iy0 && y < iy1) continue;
        const i = (y * w + x) * 4;
        residual += (Math.abs(sent[i] - got[i] - mean[0]) + Math.abs(sent[i + 1] - got[i + 1] - mean[1]) +
          Math.abs(sent[i + 2] - got[i + 2] - mean[2])) / 3;
      }
    }
    if (residual / n > DRIFT_MAX_RESIDUAL) return null;
    return mean.map(v => Math.max(-maxOffset, Math.min(maxOffset, Math.round(v))));
  }

  // Bake crop (+ optional colour offset and feather) into a bitmap at the crop's native resolution.
  function bakePatch(imageElement, crop, scale, feather, offset, alphaMask) {
    const w = Math.max(1, Math.round(crop.w));
    const h = Math.max(1, Math.round(crop.h));
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    ctx.drawImage(imageElement, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
    const hasOffset = offset && (offset[0] || offset[1] || offset[2]);
    if (hasOffset) {
      const data = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < data.data.length; i += 4) {
        data.data[i] += offset[0];
        data.data[i + 1] += offset[1];
        data.data[i + 2] += offset[2];
      }
      ctx.putImageData(data, 0, 0);
    }
    if (feather && feather.width > 0 && (feather.left || feather.right || feather.top || feather.bottom)) {
      const fw = feather.width / scale; // page pixels -> source pixels
      const data = ctx.getImageData(0, 0, w, h);
      for (let y = 0; y < h; y++) {
        const nearY = y < fw || h - y <= fw;
        for (let x = 0; x < w; x++) {
          if (!nearY && x >= fw && w - x > fw) continue;
          const i = (y * w + x) * 4 + 3;
          data.data[i] = Math.round(data.data[i] * featherAlpha(x, y, w, h, fw, feather));
        }
      }
      ctx.putImageData(data, 0, 0);
    }
    if (alphaMask && alphaMask.length === w * h) {
      const data = ctx.getImageData(0, 0, w, h);
      for (let k = 0; k < alphaMask.length; k++) {
        const i = k * 4 + 3;
        data.data[i] = Math.round(data.data[i] * alphaMask[k] / 255);
      }
      ctx.putImageData(data, 0, 0);
    }
    return out.toDataURL('image/png');
  }

  // Source rectangle inside the model result that corresponds to the selection.
  function resultCropRect(imageWidth, imageHeight, region) {
    const inner = region.plan ? region.plan.inner : { x: 0, y: 0, w: 1, h: 1 };
    let x = inner.x * imageWidth;
    let y = inner.y * imageHeight;
    let w = inner.w * imageWidth;
    let h = inner.h * imageHeight;
    // If the model ignored the requested aspect, keep uniform scale with a minimal centered trim.
    const aspect = region.width / region.height;
    if (w / h > aspect) { const nw = h * aspect; x += (w - nw) / 2; w = nw; }
    else { const nh = w / aspect; y += (h - nh) / 2; h = nh; }
    return { x, y, w, h };
  }

  function letteringInsertIndex(objects, inserted) {
    let index = objects.length - 1;
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (obj === inserted) continue;
      if (!isLettering(obj)) break;
      index = i;
    }
    return index;
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
    if (state.selectionCleanup) state.selectionCleanup();
    state.selectionCleanup = null;
  }

  // Objects (characters, imported pictures) that the selection only partly covers. The model
  // then sees half a body and cannot continue it consistently at the seam, so warn and offer
  // to grow the selection to the whole object. Small edits inside a big object (a face inside
  // a panel picture), page-sized backgrounds and lettering are not reported.
  function findCutBoxes(boxes, region, pageWidth, pageHeight) {
    const pageArea = pageWidth * pageHeight;
    const out = [];
    for (const box of boxes) {
      if (!box || !(box.width > 0) || !(box.height > 0)) continue;
      const area = box.width * box.height;
      if (area >= pageArea * 0.9) continue;
      const ix = Math.min(region.left + region.width, box.left + box.width) - Math.max(region.left, box.left);
      const iy = Math.min(region.top + region.height, box.top + box.height) - Math.max(region.top, box.top);
      if (ix <= 1 || iy <= 1) continue;
      const covered = (ix * iy) / area;
      if (covered >= 0.98 || covered < 0.15) continue;
      out.push(box);
    }
    return out;
  }

  function expandRegion(region, boxes, pageWidth, pageHeight) {
    let left = region.left, top = region.top;
    let right = region.left + region.width, bottom = region.top + region.height;
    for (const box of boxes) {
      left = Math.min(left, box.left);
      top = Math.min(top, box.top);
      right = Math.max(right, box.left + box.width);
      bottom = Math.max(bottom, box.top + box.height);
    }
    left = Math.max(0, Math.floor(left));
    top = Math.max(0, Math.floor(top));
    right = Math.min(pageWidth, Math.ceil(right));
    bottom = Math.min(pageHeight, Math.ceil(bottom));
    return { left, top, width: right - left, height: bottom - top };
  }

  function candidateBoxes(c) {
    if (typeof c.getObjects !== 'function') return [];
    return c.getObjects().filter(obj => obj && obj.visible !== false && !isLettering(obj) && !obj.mangaGptSource &&
      (obj.type === 'image' || obj.type === 'group') && typeof obj.getBoundingRect === 'function').map(obj => {
      const r = obj.getBoundingRect(true, true);
      return { left: r.left, top: r.top, width: r.width, height: r.height, name: obj.name || obj.type };
    });
  }

  function setRegion(c, region, message) {
    try {
      const excludeLettering = !$g('mangaGptIncludeText') || !$g('mangaGptIncludeText').checked;
      const image = cropCanvas(c, region, excludeLettering);
      const cut = findCutBoxes(candidateBoxes(c), region, c.getWidth(), c.getHeight());
      state.region = { canvas: c, ...region, image, excludeLettering, cut,
        canvasWidth: c.getWidth(), canvasHeight: c.getHeight() };
      state.result = '';
      $g('mangaGptApply').disabled = true;
      $g('mangaGptPreview').src = image;
      if ($g('mangaGptExpand')) $g('mangaGptExpand').hidden = !cut.length;
      feedback(message + (cut.length ? tr('mgpt_cut_warn',
        '注意：选区只框到了 {count} 个对象的一部分（如“{name}”），模型只看到半个人物时容易接不上身体。可点“扩展到完整对象”。',
        { count: cut.length, name: cut[0].name }) : ''));
    } catch (error) {
      if ($g('mangaGptExpand')) $g('mangaGptExpand').hidden = true;
      feedback(tr('mgpt_crop_failed', '截取失败：画布可能包含不允许导出的跨域图片。'), true);
    }
  }

  // Bridge from local OCR: stage an editable region for optional GPT inpainting.
  // This NEVER starts a paid request; the user must inspect and click Generate.
  function selectRegionForTextRemoval(box) {
    const c = pageCanvas();
    if (!c || !box || !Number.isFinite(+box.x) || !Number.isFinite(+box.y) ||
        !Number.isFinite(+box.width) || !Number.isFinite(+box.height)) return false;
    const margin = Math.max(8, Math.round(Math.min(+box.width, +box.height) * 0.25));
    const left = Math.max(0, Math.floor(+box.x - margin));
    const top = Math.max(0, Math.floor(+box.y - margin));
    const right = Math.min(c.getWidth(), Math.ceil(+box.x + +box.width + margin));
    const bottom = Math.min(c.getHeight(), Math.ceil(+box.y + +box.height + margin));
    if (right - left < 2 || bottom - top < 2) return false;
    const panel = $g('mangaGptPanel');
    if (!panel) return false;
    panel.hidden = false;
    $g('mangaGptMode').value = 'edit';
    $g('mangaGptSelect').disabled = false;
    $g('mangaGptPrompt').value = tr('mgpt_ocr_erase_prompt', '擦除框选范围内现有的印刷文字，重建自然背景与气泡边缘，保留原始画风、构图、人物和未选中区域，不要生成新文字。');
    setRegion(c, { left, top, width: right - left, height: bottom - top },
      tr('mgpt_ocr_staged', '已从智能字幕定位擦字区域。请确认选区和费用，再点击“生成预览”。'));
    return true;
  }

  // Page inspector bridge: stage a complete panel; never start an API request.
  function selectRegionForPanel(box, instruction) {
    const c=pageCanvas();
    if(!c || !box || ![box.x,box.y,box.width,box.height].every(Number.isFinite))
      return false;
    const left=Math.max(0,Math.floor(box.x));
    const top=Math.max(0,Math.floor(box.y));
    const right=Math.min(c.getWidth(),Math.ceil(box.x+box.width));
    const bottom=Math.min(c.getHeight(),Math.ceil(box.y+box.height));
    if(right-left<2 || bottom-top<2)return false;
    const panel=$g('mangaGptPanel');
    if(!panel)return false;
    panel.hidden=false;
    $g('mangaGptMode').value='edit';
    $g('mangaGptSelect').disabled=false;
    // A natural-language instruction is optional. Nothing is sent to the provider
    // until the human clicks Generate in the existing GPT editor.
    if(typeof instruction==='string' && instruction.trim())
      $g('mangaGptPrompt').value=instruction.trim().slice(0,3000);
    setRegion(c,{left,top,width:right-left,height:bottom-top},
      '已定位第 '+(Number(box.order)||1)+' 格。请检查框选和费用，并填写修改描述。');
    return true;
  }

  // For instructions targeting an individual character, NEVER preselect a
  // whole panel (which could silently repaint other characters / dialogue).
  // The user must draw a fresh selection before Generate can proceed.
  function prepareManualEdit(instruction) {
    const c=pageCanvas();
    const panel=$g('mangaGptPanel');
    if(!c || !panel || state.pending) return false;
    panel.hidden=false;
    $g('mangaGptMode').value='edit';
    if(typeof instruction==='string' && instruction.trim())
      $g('mangaGptPrompt').value=instruction.trim().slice(0,1800);
    state.region=null;
    state.result='';
    $g('mangaGptApply').disabled=true;
    if($g('mangaGptExpand')) $g('mangaGptExpand').hidden=true;
    $g('mangaGptPreview').removeAttribute('src');
    feedback(tr('mgpt_manual_character_region', '人物区域尚未确认。请在画布中手动框选目标角色，确认后再生成。'));
    startSelection();
    return true;
  }

  // Reuse local Character Bible references; never upload them until the user
  // explicitly clicks Generate Preview. This action changes no canvas pixels.
  function useCharacterCard(raw) {
    const lib=window.MangaCharacterBibleCore;
    if(!lib || state.pending || !$g('mangaGptPanel')) return false;
    try {
      const card=lib.normalize(raw);
      const input=$g('mangaGptPrompt');
      let current=input.value.trim();
      if(state.characterPromptSuffix && current.endsWith(state.characterPromptSuffix))
        current=current.slice(0,-state.characterPromptSuffix.length).trim();
      const composed=lib.withCharacterPrompt('',card);
      input.value=(current?current+'\n\n':'')+composed;
      state.characterPromptSuffix=composed;
      state.characterReferenceName=card.name;
      state.references=card.references.slice(0,3);
      $g('mangaGptReferences').value='';
      $g('mangaGptReferenceList').textContent=
        '角色档案：'+card.name+' · '+card.references.length+' 张参考图（本机读取）';
      $g('mangaGptPanel').hidden=false;
      state.result='';
      $g('mangaGptApply').disabled=true;
      feedback(tr('mgpt_refs_loaded','已载入角色参考图，请确认编辑区域及费用后手动生成。'));
      return true;
    }catch(error){
      feedback(error.message||String(error),true);
      return false;
    }
  }
  function referenceSummary(){
    return {count:state.references.length,character:state.characterReferenceName};
  }

  function expandSelection() {
    const c = pageCanvas();
    const region = state.region;
    if (!c || !region || region.canvas !== c || !region.cut || !region.cut.length) {
      return feedback(tr('mgpt_expand_none', '当前选区没有切到对象，无需扩展。'));
    }
    let next = { left: region.left, top: region.top, width: region.width, height: region.height };
    // Growing can newly cut a neighbour; repeat a few times until stable.
    for (let i = 0; i < 4; i++) {
      const cut = findCutBoxes(candidateBoxes(c), next, c.getWidth(), c.getHeight());
      if (!cut.length) break;
      next = expandRegion(next, cut, c.getWidth(), c.getHeight());
    }
    setRegion(c, next, tr('mgpt_expanded', '选区已扩展到完整对象：{w} × {h} 像素。', { w: next.width, h: next.height }));
  }

  // Forced output size far from the selection aspect: use the closest API aspect instead.
  function effectiveSize(width, height, size, guard) {
    if (guard && aspectMismatch(width, height, size)) {
      return { size: letterboxPlan(width, height, 'auto').size, switchedFrom: size };
    }
    return { size, switchedFrom: null };
  }

  // Alpha of the original selection, resampled to the bake size. Only returned when the
  // selection is partly transparent (an empty, fully transparent area is meant to be filled).
  function loadAlphaMask(dataUrl, w, h) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = w;
          cv.height = h;
          const ctx = cv.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          const alpha = new Uint8ClampedArray(w * h);
          let transparent = 0;
          let opaque = 0;
          for (let i = 0; i < alpha.length; i++) {
            alpha[i] = data[i * 4 + 3];
            if (alpha[i] < 250) transparent++;
            else opaque++;
          }
          resolve(transparent && opaque ? alpha : null);
        } catch (error) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  function startSelection() {
    const c = pageCanvas();
    if (!c || !c.upperCanvasEl) {
      feedback(tr('mgpt_canvas_not_ready', '画布还没有初始化。'), true);
      return;
    }
    cancelSelection();
    const rect = c.upperCanvasEl.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      feedback(tr('mgpt_canvas_hidden', '画布不可见，无法框选。'), true);
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
    // The overlay is fixed to the canvas rectangle captured now; if the page scrolls,
    // zooms or resizes the mapping would be wrong, so abort instead of mis-selecting.
    const abortOnMove = () => {
      if (state.selectionOverlay !== overlay) return;
      cancelSelection();
      feedback(tr('mgpt_canvas_moved', '画布位置已变化（滚动/缩放/窗口大小），请重新点“框选区域”。'), true);
    };
    window.addEventListener('resize', abortOnMove);
    window.addEventListener('scroll', abortOnMove, true);
    state.selectionCleanup = () => {
      window.removeEventListener('resize', abortOnMove);
      window.removeEventListener('scroll', abortOnMove, true);
    };
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
        feedback(tr('mgpt_region_too_small', '框选区域太小，请至少选择 8 × 8 像素。'), true);
        return;
      }
      setRegion(c, region, tr('mgpt_region_selected', '已选中原始画布区域：{w} × {h} 像素。', { w: region.width, h: region.height }));
    });
    overlay.addEventListener('contextmenu', event => event.preventDefault());
    overlay.addEventListener('pointercancel', cancelSelection);
    feedback(tr('mgpt_drag_hint', '拖动鼠标左键或右键框选区域；Esc 可取消。'));
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
    if (!c) return feedback(tr('mgpt_open_canvas', '请先打开画布。'), true);
    if (operation === 'edit' && (!state.region || state.region.canvas !== c)) {
      return feedback(tr('mgpt_select_first', '请先在当前画布框选需要修改的区域。'), true);
    }
    if (operation === 'edit' && !regionUnchanged(c, state.region)) {
      return feedback(tr('mgpt_region_changed', '画布或选中区域已经变化，请重新框选。'), true);
    }
    const apiKey = $g('mangaGptKey').value.trim().replace(/^Bearer\s+/i, '');
    // An empty input lets the localhost relay use optional GPT_IMAGE_API_KEY from .env.
    const prompt = $g('mangaGptPrompt').value.trim();
    if (!prompt) return feedback(tr('mgpt_prompt_required', '请先描述想要的画面修改。'), true);
    state.pending = true;
    state.result = '';
    $g('mangaGptGenerate').disabled = true;
    $g('mangaGptMode').disabled = true;
    $g('mangaGptApply').disabled = true;
    feedback(tr('mgpt_requesting', '正在请求图像模型（可点“取消请求”）。生成可能产生 API 费用。'));
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    state.controller = controller;
    let timedOut = false;
    const timer = controller ? setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS) : null;
    if ($g('mangaGptCancel')) $g('mangaGptCancel').disabled = !controller;
    let sizeChoice = { size: $g('mangaGptSize').value, switchedFrom: null };
    try {
      const payload = {
        baseUrl: $g('mangaGptUrl').value.trim(),
        model: $g('mangaGptModel').value.trim(),
        operation,
        prompt,
        size: $g('mangaGptSize').value,
        references: operation === 'edit' ? state.references : []
      };
      if (operation === 'edit') {
        const guard = !$g('mangaGptAspectGuard') || $g('mangaGptAspectGuard').checked;
        sizeChoice = effectiveSize(state.region.width, state.region.height, payload.size, guard);
        const plan = letterboxPlan(state.region.width, state.region.height, sizeChoice.size);
        state.region.plan = plan;
        payload.size = plan.size;
        state.region.contextBox = null;
        state.region.sentImage = null;
        const useContext = !$g('mangaGptContext') || $g('mangaGptContext').checked;
        payload.image = useContext ? await contextPaddedImage(c, state.region, plan) :
          await letterboxImage(state.region.image, plan);
      }
      const response = await fetch(imageProxyBase() + '/gpt-image-proxy', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' },
          apiKey ? { Authorization: 'Bearer ' + apiKey } : {}),
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      });
      let json;
      try {
        json = await response.json();
      } catch (parseError) {
        throw new Error(tr('mgpt_non_json', '本地服务返回了非 JSON 响应（HTTP {status}）。', { status: response.status }));
      }
      if (!response.ok || !json.ok || !json.image) {
        throw new Error(json.error || tr('mgpt_no_image', '上游没有返回图像。'));
      }
      if (!/^data:image\/(png|jpeg|webp);base64,/.test(json.image)) {
        throw new Error(tr('mgpt_bad_image', '图像响应格式无效。'));
      }
      state.result = json.image;
      $g('mangaGptPreview').src = json.image;
      $g('mangaGptApply').disabled = false;
      const warnAspect = operation === 'edit' && !sizeChoice.switchedFrom &&
        aspectMismatch(state.region.width, state.region.height, sizeChoice.size);
      let note = '';
      if (operation === 'edit' && sizeChoice.switchedFrom) {
        note = tr('mgpt_aspect_switched', '选区比例（{w} × {h}）与所选尺寸 {from} 相差过大，已自动改用 {to}，避免模型重新构图。',
          { w: state.region.width, h: state.region.height, from: sizeChoice.switchedFrom, to: sizeChoice.size });
      } else if (warnAspect) {
        note = tr('mgpt_aspect_warn', '注意：所选尺寸与选区比例相差较大，模型容易重新构图（人物移位/裁头），建议尺寸选“自动”。');
      }
      feedback(tr('mgpt_generated', '图像已生成，请检查预览后点击“作为新图层应用”。') + note);
    } catch (error) {
      if (error && error.name === 'AbortError') {
        feedback(timedOut ? tr('mgpt_timeout', '请求超时（{s} 秒），已取消。', { s: REQUEST_TIMEOUT_MS / 1000 }) : tr('mgpt_cancelled', '已取消请求。'), true);
      } else {
        feedback(error.message || tr('mgpt_request_failed', '请求失败。请检查本地服务和上游接口。'), true);
      }
    } finally {
      if (timer) clearTimeout(timer);
      state.controller = null;
      if ($g('mangaGptCancel')) $g('mangaGptCancel').disabled = true;
      state.pending = false;
      $g('mangaGptGenerate').disabled = false;
      $g('mangaGptMode').disabled = false;
    }
  }

  async function apply() {
    const c = pageCanvas();
    if (!c || !state.result) return feedback(tr('mgpt_nothing_to_apply', '没有可应用的结果。'), true);
    const isEdit = currentOperation() === 'edit';
    const region = state.region;
    if (isEdit && !regionUnchanged(c, region)) {
      return feedback(tr('mgpt_region_changed_regen', '画布或选中区域已经改变，请重新框选并生成。'), true);
    }
    $g('mangaGptApply').disabled = true;
    try {
      let image = await new Promise((resolve, reject) => {
        fabric.Image.fromURL(state.result, img => {
          if (!img || !img.width || !img.height) reject(new Error(tr('mgpt_decode_failed', '生成图片解码失败。')));
          else resolve(img);
        });
      });
      const targetWidth = isEdit ? region.width : image.width;
      const targetHeight = isEdit ? region.height : image.height;
      // Edit: take the selection's own rectangle back out of the letterboxed result and
      // scale X/Y uniformly (no stretching, no lost heads). Generate: fit inside the page.
      let crop = isEdit ? resultCropRect(image.width, image.height, region) :
        { x: 0, y: 0, w: image.width, h: image.height };
      if (isEdit && (crop.w + 0.5 < region.width || crop.h + 0.5 < region.height) &&
          !$g('mangaGptAllowUpscale').checked) {
        throw new Error(tr('mgpt_upscale_blocked',
          '生成图片中对应选区的有效像素 ({cw} × {ch}) 小于选区 ({w} × {h})。已阻止低清晰度放大，可重新生成、缩小选区或勾选允许放大。',
          { cw: Math.floor(crop.w), ch: Math.floor(crop.h), w: region.width, h: region.height }));
      }
      let alphaRestored = false;
      let scale = isEdit ? targetWidth / crop.w :
        Math.min(1, c.getWidth() / targetWidth, c.getHeight() / targetHeight);
      if (isEdit) {
        const featherOn = !$g('mangaGptFeather') || $g('mangaGptFeather').checked;
        const feather = featherOn ? featherPlan(region, c.getWidth(), c.getHeight()) : null;
        const matchOn = !$g('mangaGptMatchTone') || $g('mangaGptMatchTone').checked;
        let offset = null;
        try {
          offset = matchOn ? estimateDrift(region.sentImage, image.getElement(), region.plan, region.contextBox, 48) : null;
        } catch (error) {
          offset = null;
        }
        const keepAlpha = !$g('mangaGptKeepAlpha') || $g('mangaGptKeepAlpha').checked;
        const mask = keepAlpha ? await loadAlphaMask(region.image, Math.max(1, Math.round(crop.w)), Math.max(1, Math.round(crop.h))) : null;
        alphaRestored = !!mask;
        const baked = bakePatch(image.getElement(), crop, scale, feather, offset, mask);
        const sourceCrop = { x: +crop.x.toFixed(2), y: +crop.y.toFixed(2), w: +crop.w.toFixed(2), h: +crop.h.toFixed(2),
          resultWidth: image.width, resultHeight: image.height, feather: feather ? feather.width : 0,
          toneOffset: offset || [0, 0, 0], keepAlpha: alphaRestored };
        image = await new Promise((resolve, reject) => {
          fabric.Image.fromURL(baked, img => (img && img.width ? resolve(img) : reject(new Error(tr('mgpt_decode_failed', '生成图片解码失败。')))));
        });
        scale = region.width / image.width;
        crop = { x: 0, y: 0, w: image.width, h: image.height };
        image.set('mangaGptCrop', sourceCrop);
      }
      image.set({
        left: isEdit ? region.left : (c.getWidth() - targetWidth * scale) / 2,
        top: isEdit ? region.top : (c.getHeight() - targetHeight * scale) / 2,
        cropX: crop.x,
        cropY: crop.y,
        width: crop.w,
        height: crop.h,
        scaleX: isEdit ? region.width / crop.w : scale,
        scaleY: isEdit ? region.height / crop.h : scale,
        objectCaching: false
      });
      image.set('mangaGptSource', 'openai-compatible-image');
      image.set('name', isEdit ? 'GPT 局部改图' : 'GPT 生图');
      if (typeof changeDoNotSaveHistory === 'function') changeDoNotSaveHistory();
      try {
        c.add(image);
        // Keep editable lettering (text / speech bubbles) above the new picture layer.
        if (typeof c.getObjects === 'function' && typeof c.moveTo === 'function') {
          const index = letteringInsertIndex(c.getObjects(), image);
          if (index < c.getObjects().length - 1) c.moveTo(image, index);
        }
        c.setActiveObject(image);
        c.requestRenderAll();
        if (typeof updateLayerPanel === 'function') updateLayerPanel();
      } finally {
        if (typeof changeDoSaveHistory === 'function') changeDoSaveHistory();
      }
      if (typeof saveStateByManual === 'function') saveStateByManual();
      state.result = '';
      state.region = null;
      if ($g('mangaGptExpand')) $g('mangaGptExpand').hidden = true;
      feedback(tr('mgpt_applied', '已添加独立图层：取回选区对应部分并等比例缩放（不拉伸、不裁头）。原图和画布尺寸未改变，可撤销。') +
        (alphaRestored ? tr('mgpt_alpha_restored', '已按原选区的透明区域恢复透明。') : ''));
    } catch (error) {
      feedback(error.message || tr('mgpt_insert_failed', '无法插入图层。'), true);
      $g('mangaGptApply').disabled = false;
    }
  }

  function resolveEditableText(selected, c) {
    if (!selected) return null;
    const textTypes = ['text', 'textbox', 'i-text', 'vertical-textbox'];
    if (textTypes.includes(selected.type)) return selected;
    if (selected.customType === 'speechBubbleSVG' || selected.isSpeechBubble) {
      if (typeof getSpeechBubbleTextBySVG === 'function') {
        const linked = getSpeechBubbleTextBySVG(selected);
        if (linked && textTypes.includes(linked.type)) return linked;
      }
      // Freehand bubbles and SVG bubbles store the linked text as a separate
      // Fabric object with targetObject set to the bubble.
      if (c && typeof c.getObjects === 'function') {
        return c.getObjects().find(obj => obj && obj.customType === 'speechBubbleText' &&
          obj.targetObject === selected && textTypes.includes(obj.type)) || null;
      }
    }
    return null;
  }

  function changeSelectedText() {
    const c = pageCanvas();
    const selected = c && c.getActiveObject && c.getActiveObject();
    const obj = resolveEditableText(selected, c);
    const text = $g('mangaGptSubtitle').value;
    if (!obj) {
      return feedback(tr('mgpt_text_select', '请选中横排、竖排文字或包含可编辑文字的气泡。纯图片字幕还需要 OCR 功能。'), true);
    }
    if (!text.trim()) return feedback(tr('mgpt_text_required', '请填写替换后的字幕内容。'), true);
    if (typeof changeDoNotSaveHistory === 'function') changeDoNotSaveHistory();
    try {
      obj.set('text', text);
      if (typeof obj.initDimensions === 'function') obj.initDimensions();
      if (typeof obj.updateDimensions === 'function') obj.updateDimensions();
      if (typeof obj.setCoords === 'function') obj.setCoords();
      if (obj.customType === 'speechBubbleText' &&
          typeof speechBubbleTextChaged === 'function') {
        speechBubbleTextChaged(obj);
      }
      c.requestRenderAll();
      if (typeof updateLayerPanel === 'function') updateLayerPanel();
    } finally {
      if (typeof changeDoSaveHistory === 'function') changeDoSaveHistory();
    }
    if (typeof saveStateByManual === 'function') saveStateByManual();
    feedback(tr('mgpt_text_updated', '已更新可编辑文字，保留字体样式及竖排方向；气泡已重新计算文字尺寸。'));
  }

  function render() {
    if ($g('mangaGptPanel')) return;
    const header = document.querySelector('#canvas-area .area-header');
    if (!header) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'mangaGptOpen';
    button.textContent = tr('mgpt_open_btn', 'GPT 改图');
    button.title = tr('mgpt_open_title', '框选局部区域并用 GPT 修改，也可生成新图片或替换文字');
    header.appendChild(button);
    const panel = document.createElement('section');
    panel.id = 'mangaGptPanel';
    panel.className = 'manga-gpt-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', tr('mgpt_panel_aria', 'GPT 图像编辑'));
    const t = (key, zh) => esc(tr(key, zh));
    const hint = (id, key, zh, checked) => '<label class="manga-gpt-hint"><input id="' + id + '" type="checkbox"' +
      (checked ? ' checked' : '') + '> ' + t(key, zh) + '</label>';
    panel.innerHTML = [
      '<div class="manga-gpt-head"><strong>Manga-NAI-GPT</strong><button type="button" id="mangaGptClose" aria-label="' + t('mgpt_close', '关闭') + '">×</button></div>',
      '<div class="manga-gpt-row"><label>' + t('mgpt_operation', '操作') + '<select id="mangaGptMode"><option value="edit">' + t('mgpt_mode_edit', '局部改图 / 角色替换') +
        '</option><option value="generate">' + t('mgpt_mode_generate', '文字生图 / 新图层') + '</option></select></label>',
      '<button type="button" id="mangaGptSelect">' + t('mgpt_select_btn', '框选区域') + '</button>',
      '<button type="button" id="mangaGptExpand" hidden>' + t('mgpt_expand_btn', '扩展到完整对象') + '</button></div>',
      '<label>' + t('mgpt_api_url', '兼容 API 地址') + '<input id="mangaGptUrl" type="url" placeholder="https://api.openai.com/v1" value="https://api.openai.com/v1" autocomplete="off"></label>',
      '<div class="manga-gpt-row"><label>' + t('mgpt_model', '图像模型') + '<input id="mangaGptModel" type="text" value="gpt-image-1" placeholder="' + t('mgpt_model_ph', '模型 ID') + '"></label>',
      '<label>' + t('mgpt_size', '尺寸') + '<select id="mangaGptSize"><option value="auto">' + t('mgpt_size_auto', '自动') +
        '</option><option value="1024x1024">1024×1024</option><option value="1536x1024">1536×1024</option><option value="1024x1536">1024×1536</option></select></label></div>',
      '<label>' + t('mgpt_key', 'API Key（可留空读取本地 .env）') + '<input id="mangaGptKey" type="password" placeholder="sk-…" autocomplete="off" spellcheck="false"></label>',
      '<label>' + t('mgpt_prompt', '修改描述') + '<textarea id="mangaGptPrompt" rows="3" placeholder="' +
        t('mgpt_prompt_ph', '将框选人物替换为参考图角色，保持动作、画风、构图与未选中部分。') + '"></textarea></label>',
      '<label>' + t('mgpt_refs', '人物 / 风格参考图（最多 3 张）') + '<input id="mangaGptReferences" type="file" multiple accept="image/png,image/jpeg,image/webp"></label>',
      '<div id="mangaGptReferenceList" class="manga-gpt-hint">' + t('mgpt_refs_none', '尚未选择参考图') + '</div>',
      hint('mangaGptAllowUpscale', 'mgpt_allow_upscale', '允许将低于选区分辨率的生成图放大覆盖（会影响选区清晰度）', false),
      hint('mangaGptContext', 'mgpt_context', '附带选区周围画面作为上下文（接缝更自然；会多上传选区外的少量画面）', true),
      hint('mangaGptMatchTone', 'mgpt_match_tone', '按周围画面校正模型整体偏色（用上下文边带测量，最多 ±48）', true),
      hint('mangaGptFeather', 'mgpt_feather', '选区边缘柔化（只在选区内侧过渡，选区外像素不变）', true),
      hint('mangaGptKeepAlpha', 'mgpt_keep_alpha', '保留原选区的透明区域（透明背景/镂空处不被模型画成实色）', true),
      hint('mangaGptAspectGuard', 'mgpt_aspect_guard', '所选尺寸与选区比例相差过大时自动改用最接近的比例', true),
      hint('mangaGptIncludeText', 'mgpt_include_text', '框选时包含文字/气泡（默认不包含：文字保持可编辑并留在新图层上方）', false),
      '<div class="manga-gpt-row"><button type="button" id="mangaGptGenerate">' + t('mgpt_generate', '生成预览') +
        '</button><button type="button" id="mangaGptCancel" disabled>' + t('mgpt_cancel', '取消请求') +
        '</button><button type="button" id="mangaGptApply" disabled>' + t('mgpt_apply', '作为新图层应用') + '</button></div>',
      '<img id="mangaGptPreview" class="manga-gpt-preview" alt="' + t('mgpt_preview_alt', '当前框选或 GPT 生成预览') + '">',
      '<details><summary>' + t('mgpt_subtitle_summary', '原生字幕修改（无需 API）') + '</summary><label>' + t('mgpt_subtitle_label', '替换选中文字图层') +
        '<input id="mangaGptSubtitle" type="text" placeholder="' + t('mgpt_subtitle_ph', '输入新的字幕内容') + '"></label>',
      '<button type="button" id="mangaGptReplaceText">' + t('mgpt_replace_btn', '替换文字并记录撤销') + '</button></details>',
      '<div id="mangaGptStatus" class="manga-gpt-status" role="status">' + t('mgpt_status_initial', '先框选，再输入修改描述。不会覆盖原图。') + '</div>'
    ].join('');
    document.body.appendChild(panel);
    button.addEventListener('click', () => { panel.hidden = !panel.hidden; });
    $g('mangaGptClose').addEventListener('click', () => { panel.hidden = true; cancelSelection(); });
    $g('mangaGptSelect').addEventListener('click', startSelection);
    if ($g('mangaGptExpand')) $g('mangaGptExpand').addEventListener('click', expandSelection);
    $g('mangaGptGenerate').addEventListener('click', generate);
    if ($g('mangaGptCancel')) {
      $g('mangaGptCancel').addEventListener('click', () => { if (state.controller) state.controller.abort(); });
    }
    $g('mangaGptApply').addEventListener('click', apply);
    $g('mangaGptReplaceText').addEventListener('click', changeSelectedText);
    $g('mangaGptMode').addEventListener('change', () => {
      state.result = '';
      $g('mangaGptApply').disabled = true;
      $g('mangaGptSelect').disabled = currentOperation() !== 'edit';
      feedback(currentOperation() === 'edit' ? tr('mgpt_mode_edit_hint', '先框选修改区域。') : tr('mgpt_mode_generate_hint', '输入提示词，生图后添加为独立图层。'));
    });
    $g('mangaGptReferences').addEventListener('change', async event => {
      try {
        const files = Array.from(event.target.files || []);
        if (files.length > 3) throw new Error(tr('mgpt_refs_max', '最多 3 张参考图。'));
        state.references = await Promise.all(files.map(toDataUrl));
        state.characterPromptSuffix='';
        state.characterReferenceName='';
        $g('mangaGptReferenceList').textContent = files.length ?
          files.map(file => file.name).join(tr('mgpt_list_sep', '、')) : tr('mgpt_refs_none', '尚未选择参考图');
      } catch (error) {
        state.references = [];
        event.target.value = '';
        feedback(error.message, true);
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') cancelSelection();
    });
    feedback(tr('mgpt_ready', '先框选修改区域，也可以切换“文字生图”。'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();

  window.MangaGPTRegionEditor = { normalizeRegion, startSelection, cancelSelection, selectRegionForTextRemoval, selectRegionForPanel, prepareManualEdit, useCharacterCard, referenceSummary,
    letterboxPlan, resultCropRect, letteringInsertIndex, isLettering, contextRect, featherPlan, featherAlpha, estimateDrift, aspectMismatch,
    findCutBoxes, expandRegion, effectiveSize, bakePatch, tr };
})();
