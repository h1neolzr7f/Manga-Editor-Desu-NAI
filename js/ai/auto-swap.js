/* 换角色 — character swap in place.
 * 1. Local detection finds the characters per panel (/manga-smart/characters: panels → anime faces →
 *    isnet-anime + SAM masks, bubbles removed, CCIP identity clusters). Detection only proposes the edit box:
 *    the user clicks a person (or drags a box) and can make the box bigger/smaller.
 * 2. ONE GPT edit: the crop (box + margin, API aspect, inside the panel) + reference image → the same crop with
 *    the character redrawn in place. It is pasted back with the region editor's seam/tone match, optional
 *    change-only mask and a feathered edge, clipped to the panel (borders/neighbours untouched).
 * 3. One undoable layer per panel. Other panels with the same character (CCIP) are offered for one-click apply
 *    (keep-outfit on by default there); uncertain matches are listed unticked.
 * Nothing is sent to the paid API before the user clicks 生成.
 */
(function (root) {
  'use strict';

  // ---------- pure helpers (unit-tested in Node) ----------
  const ASPECTS = [['1024x1024', 1], ['1536x1024', 1.5], ['1024x1536', 2 / 3]];

  /** Same as fitCrop but inside a panel rectangle [x0, y0, x1, y1] (crop never crosses the panel border). */
  function fitCropIn(box, bounds, pad) {
    const [bx0, by0, bx1, by1] = bounds;
    const local = [box[0] - bx0, box[1] - by0, box[2] - bx0, box[3] - by0];
    const r = fitCrop(local, bx1 - bx0, by1 - by0, pad);
    return Object.assign(r, { x: r.x + bx0, y: r.y + by0 });
  }

  /** Crop around box (+pad) grown to the nearest API aspect, kept inside the page (shifted, then shrunk). */
  function fitCrop(box, pageW, pageH, pad) {
    const [x0, y0, x1, y1] = box;
    const bw = x1 - x0, bh = y1 - y0;
    const p = pad == null ? 0.12 : pad;
    let w = bw * (1 + 2 * p), h = bh * (1 + 2 * p);
    const r = w / h;
    let best = ASPECTS[0];
    ASPECTS.forEach(a => { if (Math.abs(Math.log(r / a[1])) < Math.abs(Math.log(r / best[1]))) best = a; });
    if (w / h > best[1]) h = w / best[1]; else w = h * best[1];
    // larger than the page: shrink keeping the aspect (the box itself may then be cut — rare full-page figures)
    const k = Math.min(1, pageW / w, pageH / h);
    w *= k; h *= k;
    let x = (x0 + x1) / 2 - w / 2, y = (y0 + y1) / 2 - h / 2;
    x = Math.max(0, Math.min(pageW - w, x));
    y = Math.max(0, Math.min(pageH - h, y));
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), size: best[0] };
  }

  /** 24-d descriptor: 12 tone bins + 12 hue bins weighted by saturation (grey art: hue barely counts). */
  function descriptor(rgba, mask, n) {
    const tone = new Float64Array(12), hue = new Float64Array(12);
    let cnt = 0, satSum = 0;
    for (let i = 0; i < n; i++) {
      if (!mask[i]) continue;
      const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
      tone[Math.min(11, Math.floor((r + g + b) / 3 / 256 * 12))]++;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      const s = mx ? d / mx : 0;
      if (d) {
        let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        if (hh < 0) hh += 6;
        hue[Math.min(11, Math.floor(hh * 2))] += s;
      }
      satSum += s; cnt++;
    }
    if (!cnt) return new Array(24).fill(0);
    const ts = tone.reduce((a, b) => a + b, 0), hs = hue.reduce((a, b) => a + b, 0) || 1;
    const w = Math.min(1, satSum / cnt * 4);
    return Array.from(tone, v => v / ts).concat(Array.from(hue, v => v / hs * w));
  }

  function similarity(a, b) {
    let tone = 0, wa = 0, wb = 0;
    for (let i = 0; i < 12; i++) tone += Math.min(a[i], b[i]);
    for (let i = 12; i < 24; i++) { wa += a[i]; wb += b[i]; }
    if (Math.min(wa, wb) < 0.2) return tone;
    let hue = 0;
    for (let i = 12; i < 24; i++) hue += Math.min(a[i] / wa, b[i] / wb);
    return 0.5 * tone + 0.5 * hue;
  }

  /** Zero alpha outside the character's panel (inset past the border line) so panel borders and the
   * neighbouring panels are never repainted. crop/panel in page pixels. */
  function clipToPanel(alpha, crop, panel, inset) {
    if (!panel) return alpha;
    const k = inset == null ? 3 : inset;
    const x0 = panel[0] + k - crop.x, y0 = panel[1] + k - crop.y, x1 = panel[2] - k - crop.x, y1 = panel[3] - k - crop.y;
    for (let y = 0; y < crop.h; y++) for (let x = 0; x < crop.w; x++) if (x < x0 || y < y0 || x >= x1 || y >= y1) alpha[y * crop.w + x] = 0;
    return alpha;
  }

  const PROMPT_SWAP = 'Replace the main person in this manga panel crop with the character shown in the reference image (same face, hairstyle, hair color and eye color as the reference), redrawn IN PLACE: exactly the same pose, body size, position, camera angle and facing direction, and the same manga line art, shading and screentone style. Keep everything else in the image unchanged — the background, other people, props, panel borders, speech bubbles and text must stay exactly as they are.';
  const KEEP_OUTFIT = ' Keep the clothing, accessories and props of the person in this image exactly as they are; take ONLY the face, hairstyle, hair color and eye color from the reference character.';

  /** Matching from CCIP identity clusters (server): same cluster = sure; an unclustered face that is close =
   * possible (unchecked); characters in another cluster or without a face are never offered. */
  function identityMatches(identity, targetId, panelOf, possibleMax) {
    if (!identity || !identity.cluster || !(targetId in identity.cluster)) return null;
    const ids = identity.ids, ti = ids.indexOf(targetId), tc = identity.cluster[targetId];
    const size = {}; Object.values(identity.cluster).forEach(k => { size[k] = (size[k] || 0) + 1; });
    const out = [];
    ids.forEach((id, i) => {
      if (id === targetId || panelOf(id) === panelOf(targetId)) return;
      const d = identity.diff[ti][i], k = identity.cluster[id];
      if (k === tc) out.push({ id, d, sure: true });
      else if (size[k] === 1 && size[tc] >= 1 && d <= (possibleMax || 0.22)) out.push({ id, d, sure: false });
    });
    return out.sort((a, b) => a.d - b.d);
  }

  const KEEP_EXPRESSION = ' Keep the facial expression (eyes open or closed, mouth shape, smile, tears, blush) and the head tilt and gaze direction exactly as in this image; the reference only defines who the character is, not their expression.';
  const api = { PROMPT_SWAP, KEEP_OUTFIT, KEEP_EXPRESSION, identityMatches, fitCrop, fitCropIn, clipToPanel, descriptor, similarity };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  if (typeof document === 'undefined') { root.AutoSwap = api; return; }

  // ---------- browser ----------
  const $ = id => document.getElementById(id);
  const gpt = () => root.MangaGPTRegionEditor;
  const fc = () => (typeof canvas !== 'undefined' ? canvas : null);
  let S = null; // wizard session

  function el(tag, attrs, html) { const e = document.createElement(tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (html != null) e.innerHTML = html; return e; }
  function loadImg(src) { return new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('图片解码失败。')); i.src = src; }); }
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function status(t, err) { const s = $('autoSwapStatus'); if (s) { s.textContent = t; s.classList.toggle('is-error', !!err); } }
  function post(url, body, signal) { return root.MangaModelRequest.post(url, body, { signal }); }

  async function gptEdit(image, prompt, size, references, signal) {
    const key = (($('mangaGptKey') || {}).value || '').trim().replace(/^Bearer\s+/i, '');
    const payload = { baseUrl: (($('mangaGptUrl') || {}).value || '').trim(), model: (($('mangaGptModel') || {}).value || '').trim() || 'gpt-image-2.5',
      operation: 'edit', prompt, size, image, references: references || [] };
    const base = location.protocol === 'file:' ? 'http://127.0.0.1:8000' : location.origin;
    // own deadline on top of the user's 取消: a hung relay must never leave the wizard spinning forever
    const limit = root.__autoSwapTimeoutMs || 330000;
    const ctl = new AbortController(); let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, limit);
    if (signal) { if (signal.aborted) ctl.abort(); else signal.addEventListener('abort', () => ctl.abort(), { once: true }); }
    let r;
    try {
      r = await fetch(base + '/gpt-image-proxy', { method: 'POST', signal: ctl.signal,
        headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { Authorization: 'Bearer ' + key } : {}), body: JSON.stringify(payload) });
    } catch (e) {
      if (timedOut) { const t = new Error('图像服务 ' + Math.round(limit / 1000) + ' 秒没有响应（中转站可能卡住了）。画布没有改动，请稍后点「重试」。'); t.name = 'TimeoutError'; throw t; }
      throw e;
    } finally { clearTimeout(timer); }
    let j = null; try { j = await r.json(); } catch (_) { /* below */ }
    if (!r.ok || !j || !j.ok || !/^data:image\//.test(j.image || '')) {
      const msg = (j && j.error) || ('图像服务返回 HTTP ' + r.status);
      throw new Error(root.ServiceRequest && root.ServiceRequest.describe ? root.ServiceRequest.describe('gpt', { status: r.status, body: j }) || msg : msg);
    }
    return j.image;
  }

  // page pixels (lettering hidden) once per session
  async function pagePixels() {
    const pg = gpt().pageImage(false);
    const img = await loadImg(pg.image);
    const c = cv(pg.width, pg.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    return { url: pg.image, W: pg.width, H: pg.height, canvas: c, data: g.getImageData(0, 0, pg.width, pg.height).data };
  }

  // a character's full-page 0/1 mask from its box-cropped (or full-page) LA PNG
  async function maskArray(ch, W, H) {
    if (ch.full) return ch.full;
    const img = await loadImg(ch.mask);
    const c = cv(W, H); const g = c.getContext('2d');
    const [x0, y0, x1, y1] = ch.box;
    if (img.width === W && img.height === H) g.drawImage(img, 0, 0); else g.drawImage(img, x0, y0, x1 - x0, y1 - y0);
    const d = g.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    ch.full = m;
    return m;
  }

  function cropData(pg, r) { const c = cv(r.w, r.h); c.getContext('2d').drawImage(pg.canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h); return c; }

  /** One GPT edit of the character crop (+ reference) → pasted back in place with seam/tone match,
   * optional change-only mask, feathered edge, clipped to the panel. Returns one layer (not yet added). */
  async function swapOne(pg, ch, opts, signal) {
    const ed = gpt();
    const panel = opts.panel || [0, 0, pg.W, pg.H];
    const r = ch.cropBox || fitCropIn(ch.box, panel, opts.pad == null ? 0.18 : opts.pad);
    const crop = cropData(pg, r);
    const cropUrl = crop.toDataURL('image/png');
    const orig = crop.getContext('2d').getImageData(0, 0, r.w, r.h).data;
    const prompt = PROMPT_SWAP + (opts.keepExpression !== false ? KEEP_EXPRESSION : '') + (opts.keepOutfit ? KEEP_OUTFIT : '') + (opts.note ? '\n' + opts.note : '');
    const url = await gptEdit(cropUrl, prompt, r.size, opts.references, signal);
    const img = await loadImg(url);
    const c = cv(r.w, r.h), g = c.getContext('2d');
    g.drawImage(img, 0, 0, r.w, r.h);                       // crop has the request's aspect: 1:1 mapping
    const d = g.getImageData(0, 0, r.w, r.h);
    const w = r.w, h = r.h, n = w * h;
    // edges touching the panel border are not blended (the border must stay the original line)
    const sides = { left: r.x > panel[0] + 4, right: r.x + w < panel[2] - 4, top: r.y > panel[1] + 4, bottom: r.y + h < panel[3] - 4 };
    const info = { crop: [r.x, r.y, w, h], size: r.size };
    const shift = ed.globalShift ? ed.globalShift(d.data, orig, w, h) : null;   // uniform haze over the whole crop
    if (shift) { for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) d.data[i * 4 + k] = Math.max(0, Math.min(255, d.data[i * 4 + k] + shift[k])); info.shift = shift.map(Math.round); }
    let change = null;
    if (opts.changeOnly !== false && ed.changeMask) { change = ed.changeMask(d.data, orig, w, h); info.changed = change ? +change.changedFraction.toFixed(3) : 1; }
    if (ed.seamDiffs && ed.applySeamMatch) { const diffs = ed.seamDiffs(d.data, orig, w, h, sides); info.seamSides = Object.keys(diffs).length; ed.applySeamMatch(d.data, w, h, diffs); }
    const fw = Math.max(6, Math.round(Math.min(w, h) * 0.04));
    const alpha = new Uint8ClampedArray(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = ed.featherAlpha ? ed.featherAlpha(x, y, w, h, fw, sides) : 1;
      alpha[y * w + x] = Math.round(255 * a * (change ? change[y * w + x] / 255 : 1));
    }
    clipToPanel(alpha, r, panel);
    for (let i = 0; i < n; i++) d.data[i * 4 + 3] = alpha[i];
    g.putImageData(d, 0, 0);
    return { crop: r, layer: c.toDataURL('image/png'), before: cropUrl, info };
  }

  /** Adds the swapped crop as one layer (one undo step), below lettering. */
  function applyResult(res, label) {
    const c = fc();
    return new Promise(resolve => {
      fabric.Image.fromURL(res.layer, obj => {
        obj.set({ left: res.crop.x, top: res.crop.y, name: '换角色' + (label || ''), autoSwap: 'character' });
        c.add(obj);
        if (gpt().letteringInsertIndex) { const idx = gpt().letteringInsertIndex(c.getObjects(), obj); if (idx < c.getObjects().indexOf(obj)) obj.moveTo(idx); }
        c.requestRenderAll();
        if (typeof updateLayerPanel === 'function') updateLayerPanel();
        resolve(obj);
      });
    });
  }

  // ---------- wizard UI ----------
  function overlayFor(pg) {
    const c = fc(); const rect = c.upperCanvasEl.getBoundingClientRect();
    const box = el('div', { class: 'auto-swap-pick', id: 'autoSwapPick' });
    box.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;';
    const view = el('canvas', { id: 'autoSwapView' }); view.width = Math.round(rect.width); view.height = Math.round(rect.height);
    box.appendChild(view); document.body.appendChild(box);
    return { box, view, sx: view.width / pg.W, sy: view.height / pg.H };
  }

  // the canvas can move (zoom, card, layout): keep the pick overlay glued to it
  function placeOverlay() {
    if (!S || !S.ov) return;
    const rect = fc().upperCanvasEl.getBoundingClientRect(), o = S.ov;
    o.box.style.left = rect.left + 'px'; o.box.style.top = rect.top + 'px';
    o.box.style.width = rect.width + 'px'; o.box.style.height = rect.height + 'px';
    const w = Math.round(rect.width), h = Math.round(rect.height);
    if (o.view.width !== w || o.view.height !== h) { o.view.width = w; o.view.height = h; o.sx = w / S.pg.W; o.sy = h / S.pg.H; return true; }
    return false;
  }

  function drawPick() {
    if (!S || !S.ov) return;
    placeOverlay();
    const { view, sx, sy } = S.ov; const g = view.getContext('2d');
    g.clearRect(0, 0, view.width, view.height);
    S.chars.forEach((ch, i) => {
      const on = S.target === ch, hover = S.hover === ch;
      g.beginPath(); (ch.polygon || []).forEach(([x, y], k) => (k ? g.lineTo(x * sx, y * sy) : g.moveTo(x * sx, y * sy))); g.closePath();
      g.fillStyle = on ? 'rgba(37,99,235,.40)' : hover ? 'rgba(37,99,235,.22)' : 'rgba(255,255,255,.06)'; g.fill();
      g.lineWidth = on ? 3 : 2; g.strokeStyle = on ? '#2563eb' : '#f59e0b'; g.setLineDash(on ? [] : [6, 4]); g.stroke();
      const [x0, y0] = ch.box; g.setLineDash([]);
      g.fillStyle = on ? '#2563eb' : '#f59e0b'; g.beginPath(); g.arc(x0 * sx + 14, y0 * sy + 14, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), x0 * sx + 14, y0 * sy + 14.5);
    });
    const cr = targetCrop();
    if (cr) { g.setLineDash([8, 5]); g.lineWidth = 2; g.strokeStyle = '#38bdf8'; g.strokeRect(cr.x * sx, cr.y * sy, cr.w * sx, cr.h * sy); g.setLineDash([]); }
    if (S.drag && S.drag.box) { const b = S.drag.box; g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.strokeRect(b[0] * sx, b[1] * sy, (b[2] - b[0]) * sx, (b[3] - b[1]) * sy); }
  }

  function targetCrop() {
    if (!S || !S.target) return null;
    const panel = (S.panels || [])[S.target.panel] || [0, 0, S.pg.W, S.pg.H];
    const base = S.target.userBox || S.target.box;
    // up to the default margin the crop stays inside the panel; enlarging beyond that may take context from
    // across the panel border (the paste is still clipped to the panel)
    if (!S.target.cropBox) S.target.cropBox = S.pad > 0.18 ? fitCrop(base, S.pg.W, S.pg.H, S.pad) : fitCropIn(base, panel, S.pad);
    return S.target.cropBox;
  }

  function hit(px, py) {
    // smallest character whose mask contains the point
    const hits = S.chars.filter(ch => ch.full && ch.full[py * S.pg.W + px]);
    hits.sort((a, b) => a.area - b.area);
    return hits[0] || null;
  }

  async function pickAt(px, py) {
    let ch = hit(px, py);
    if (!ch && root.SamClickSelect) {
      // not on a detected character: use SAM click-select for this spot (manual override)
      status('这里没有自动找到的人物，正在按你点的位置选…');
      const r = await post('/manga-smart/sam-click', { imageId: 'autoswap-' + S.pg.url.length, image: S.pg.url, points: [[px, py, 1]] });
      if (r && r.ok && r.candidates && r.candidates.length) {
        const cand = r.candidates[r.candidates.length > 1 ? 1 : 0];
        ch = { id: 'click', box: cand.box, polygon: cand.polygon, mask: cand.mask, area: cand.area, panel: panelOf(cand.box) };
        const twin = S.chars.filter(c => c.panel === ch.panel).map(c => ({ c, iou: boxIou(c.box, ch.box) })).sort((a, b) => b.iou - a.iou)[0];
        if (twin && twin.iou > 0.4) ch.identityId = twin.c.id;   // same person as a detected one: reuse its identity
        await maskArray(ch, S.pg.W, S.pg.H);
        ch.descriptor = descriptor(S.pg.data, ch.full, S.pg.W * S.pg.H);
        S.chars.push(ch);
      } else { status((r && r.error) || '没能选中，换个位置点一下。', true); return; }
    }
    if (!ch) return;
    S.target = ch; drawPick(); refreshMatches(); step(1);
    if ($('autoSwapBoxRow')) $('autoSwapBoxRow').hidden = false;
    status('已选中第 ' + (S.chars.indexOf(ch) + 1) + ' 个人物。上传新角色的参考图，然后点「生成」。');
    updateButtons();
  }

  function boxIou(a, b) {
    const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    const i = ix * iy, u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i;
    return u > 0 ? i / u : 0;
  }

  function panelOf(box) {
    const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
    const i = (S.panels || []).findIndex(p => cx >= p[0] && cx <= p[2] && cy >= p[1] && cy <= p[3]);
    return i < 0 ? 0 : i;
  }

  function refreshMatches() {
    const list = $('autoSwapMatches'); if (!list) return;
    list.innerHTML = '';
    if (!S.target) return;
    const byId = id => S.chars.find(c => c.id === id);
    let rows = identityMatches(S.identity, S.target.identityId || S.target.id, id => (byId(id) || {}).panel);
    if (rows) rows = rows.map(r => ({ c: byId(r.id), sure: r.sure, label: r.sure ? '同一角色' : '可能是同一角色' }));
    else {
      // no identity models: tone/colour only — never pre-checked
      rows = S.chars.filter(c => c !== S.target && c.panel !== S.target.panel)
        .map(c => ({ c, s: similarity(S.target.descriptor, c.descriptor) })).filter(x => x.s >= 0.9)
        .sort((a, b) => b.s - a.s).slice(0, 6).map(x => ({ c: x.c, sure: false, label: '颜色相近（未装角色比对模型，请自己确认）' }));
    }
    rows = rows.filter(r => r.c);
    S.matches = rows.map(r => r.c);
    $('autoSwapMatchBox').hidden = !rows.length;
    rows.forEach(({ c, sure, label }) => {
      list.appendChild(el('label', { class: 'auto-swap-match', 'data-id': c.id, 'data-sure': sure ? '1' : '0' },
        '<input type="checkbox"' + (sure ? ' checked' : '') + '> 第 ' + (c.panel + 1) + ' 格 · 人物 ' + (S.chars.indexOf(c) + 1) + ' <span class="ui-muted">' + label + '</span>'));
    });
  }

  function step(n) { if (S && S.markStep) S.markStep(n); }
  function updateButtons() {
    const go = $('autoSwapGo'); if (go) go.disabled = !(S && S.target && S.refs.length) || S.busy;
    const ap = $('autoSwapApply'); if (ap) ap.disabled = !(S && S.result) || S.busy;
    const all = $('autoSwapAll'); if (all) all.disabled = !(S && S.target && S.refs.length && S.matches && S.matches.length) || S.busy;
  }

  async function runTarget() {
    if (!S || !S.target || S.busy) return;
    S.busy = true; S.result = null; updateButtons(); step(2);
    S.ctrl = new AbortController();
    const t0 = Date.now();
    const msg = () => '正在生成：按参考图在原位置重画这个人物（通常 30–90 秒，已等 ' + Math.round((Date.now() - t0) / 1000) + ' 秒，可点「取消」）…';
    status(msg());
    const tick = setInterval(() => { if (S && S.busy) status(msg()); }, 1000);
    try {
      S.result = await swapOne(S.pg, S.target, { keepOutfit: !!($('autoSwapKeep') || {}).checked, keepExpression: !!($('autoSwapExpr') || {}).checked, changeOnly: !!($('autoSwapChangeOnly') || {}).checked, panel: (S.panels || [])[S.target.panel], references: S.refs, note: ($('autoSwapNote') || {}).value || '' }, S.ctrl.signal);
      await showPreview(S.result);
      if ($('autoSwapGo')) $('autoSwapGo').textContent = '生成';
      step(3);
      status('预览好了：点「对比原图」看前后；满意就点「应用」（放在一个新图层上，Ctrl+Z 可撤销）。');
    } catch (e) {
      const aborted = e && e.name === 'AbortError';
      status(aborted ? '已取消，没有改动画布。' : (e && e.name === 'TimeoutError' ? '' : '生成失败：') + ((e && e.message) || e), !aborted);
      if (!aborted && $('autoSwapGo')) $('autoSwapGo').textContent = '重试';
    } finally { clearInterval(tick); if (S) { S.busy = false; updateButtons(); } }
  }

  async function showPreview(res) {
    const prev = $('autoSwapPreview'); if (!prev) return;
    const c = cv(res.crop.w, res.crop.h), g = c.getContext('2d');
    g.drawImage(await loadImg(res.before), 0, 0); g.drawImage(await loadImg(res.layer), 0, 0);
    res.afterUrl = c.toDataURL('image/png');
    prev.src = res.afterUrl; prev.hidden = false; prev.dataset.showing = 'after';
    $('autoSwapCompare').hidden = false; $('autoSwapCompare').textContent = '对比原图';
  }

  async function applyTarget() {
    if (!S || !S.result) return;
    await applyResult(S.result, '');
    S.applied = (S.applied || 0) + 1;
    S.doneIds.add(S.target.id);
    status('已应用：图层「换角色」（Ctrl+Z 撤销）。' + (S.matches && S.matches.length ? '下面还有其他格里的同一角色，可以一键换掉。' : ''));
    S.result = null; $('autoSwapPreview').hidden = true; $('autoSwapCompare').hidden = true; updateButtons(); step(4);
    if (S.onApplied) S.onApplied();
  }

  async function applyAll() {
    if (!S || S.busy) return;
    const rows = Array.from(document.querySelectorAll('#autoSwapMatches .auto-swap-match'));
    const picked = rows.filter(r => r.querySelector('input').checked).map(r => S.chars.find(c => c.id === r.dataset.id)).filter(Boolean);
    const todo = (S.result ? [] : [S.target]).filter(t => !S.doneIds.has(t.id)).concat(picked.filter(c => !S.doneIds.has(c.id)));
    if (!todo.length) { status('勾选的格子都已经换好了。'); return; }
    S.busy = true; updateButtons(); S.ctrl = new AbortController();
    let ok = 0, fail = 0;
    if (S.result) { await applyResult(S.result, ''); S.doneIds.add(S.target.id); S.result = null; ok++; }
    for (const [i, ch] of todo.entries()) {
      status('正在换第 ' + (i + 1) + ' / ' + todo.length + ' 个（第 ' + (ch.panel + 1) + ' 格）…');
      try {
        const res = await swapOne(S.pg, ch, { keepOutfit: !!($('autoSwapKeepAll') || {}).checked, keepExpression: !!($('autoSwapExpr') || {}).checked, changeOnly: !!($('autoSwapChangeOnly') || {}).checked, panel: (S.panels || [])[ch.panel], references: S.refs, note: ($('autoSwapNote') || {}).value || '' }, S.ctrl.signal);
        await applyResult(res, ' 第' + (ch.panel + 1) + '格'); S.doneIds.add(ch.id); ok++;
      } catch (e) { if (e && e.name === 'AbortError') break; fail++; }
    }
    S.busy = false; updateButtons(); step(4);
    status('已换好 ' + ok + ' 个' + (fail ? '，' + fail + ' 个失败（可再点一次重试）' : '') + '。每个都是独立图层，可单独撤销或删除。', !!fail);
    if (S.onApplied) S.onApplied();
  }

  function stop() {
    if (!S) return;
    if (S.ctrl) S.ctrl.abort();
    if (S.ov) S.ov.box.remove();
    if (S.onKey) window.removeEventListener('keydown', S.onKey, true);
    if (S.follow) clearInterval(S.follow);
    S = null;
  }

  /** start(container, {markStep, onApplied, manual}) — builds the wizard body inside container. */
  async function start(body, hooks) {
    stop();
    hooks = hooks || {};
    S = { pad: 0.18, chars: [], refs: [], target: null, busy: false, doneIds: new Set(), markStep: hooks.markStep, onApplied: hooks.onApplied };
    body.innerHTML = '';
    body.appendChild(el('p', { id: 'autoSwapStatus', class: 'auto-swap-status', role: 'status', 'aria-live': 'polite' }, '正在准备…'));
    const refRow = el('label', { class: 'auto-swap-row' }, '新角色参考图 <input type="file" id="autoSwapRef" accept="image/*" multiple>');
    body.appendChild(refRow);
    body.appendChild(el('textarea', { id: 'autoSwapNote', rows: '2', placeholder: '补充要求（可不填），例如：表情改成微笑' }));
    body.appendChild(el('label', { class: 'auto-swap-row ui-muted' }, '<input type="checkbox" id="autoSwapExpr" checked> 保留原表情和姿势（推荐）'));
    body.appendChild(el('label', { class: 'auto-swap-row ui-muted' }, '<input type="checkbox" id="autoSwapKeep"> 保留原服装（只换脸、发型和发色）'));
    body.appendChild(el('label', { class: 'auto-swap-row ui-muted' }, '<input type="checkbox" id="autoSwapChangeOnly" checked> 只替换变化的部分（背景保持原图像素）'));
    const boxRow = el('div', { class: 'auto-swap-row', id: 'autoSwapBoxRow', hidden: '' });
    boxRow.innerHTML = '<span class="ui-muted">修改范围：</span><button type="button" class="ui-btn ui-btn-ghost" id="autoSwapBigger">框大一点</button><button type="button" class="ui-btn ui-btn-ghost" id="autoSwapSmaller">框小一点</button><span class="ui-muted">（也可在画布上拖一个框）</span>';
    body.appendChild(boxRow);
    const btns = el('div', { class: 'auto-swap-row' });
    btns.innerHTML = '<button type="button" class="ui-btn ui-btn-primary" id="autoSwapGo" disabled>生成</button>' +
      '<button type="button" class="ui-btn" id="autoSwapApply" disabled>应用</button>' +
      '<button type="button" class="ui-btn ui-btn-ghost" id="autoSwapCancel">取消</button>';
    body.appendChild(btns);
    const prevWrap = el('div', { class: 'auto-swap-preview' });
    prevWrap.innerHTML = '<img id="autoSwapPreview" alt="换角色预览" hidden><button type="button" class="ui-btn ui-btn-ghost" id="autoSwapCompare" hidden>对比原图</button>';
    body.appendChild(prevWrap);
    const mb = el('div', { id: 'autoSwapMatchBox', hidden: '' });
    mb.innerHTML = '<p class="auto-swap-sub">其他格里的同一角色（自动找到的，可取消勾选）</p><div id="autoSwapMatches"></div>' +
      '<label class="auto-swap-row ui-muted"><input type="checkbox" id="autoSwapKeepAll" checked> 保留原服装（推荐：其他格的衣服、道具不变）</label>' +
      '<button type="button" class="ui-btn" id="autoSwapAll" disabled>一键换掉勾选的格子</button>';
    body.appendChild(mb);
    if (hooks.manual) {
      const man = el('button', { type: 'button', class: 'ui-btn ui-btn-ghost', id: 'autoSwapManual' }, '改用手动框选（GPT 面板）');
      man.addEventListener('click', () => { stop(); hooks.manual(); });
      body.appendChild(man);
    }
    $('autoSwapRef').addEventListener('change', async e => {
      const files = Array.from(e.target.files || []).slice(0, 3);
      S.refs = await Promise.all(files.map(f => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(f); })));
      if (S.refs.length && S.target) status('参考图已就绪（' + S.refs.length + ' 张）。点「生成」开始。');
      updateButtons();
    });
    $('autoSwapGo').addEventListener('click', runTarget);
    const resize = k => { if (!S || !S.target) return; S.pad = Math.max(0, Math.min(0.6, S.pad + k)); S.target.cropBox = null; drawPick(); };
    $('autoSwapBigger').addEventListener('click', () => resize(0.08));
    $('autoSwapSmaller').addEventListener('click', () => resize(-0.08));
    $('autoSwapApply').addEventListener('click', applyTarget);
    $('autoSwapAll').addEventListener('click', applyAll);
    $('autoSwapCancel').addEventListener('click', () => { if (S && S.ctrl) S.ctrl.abort(); });
    $('autoSwapCompare').addEventListener('click', () => {
      const p = $('autoSwapPreview'); if (!S || !S.result) return;
      const after = p.dataset.showing === 'after';
      p.src = after ? S.result.before : S.result.afterUrl; p.dataset.showing = after ? 'before' : 'after';
      $('autoSwapCompare').textContent = after ? '看换好的' : '对比原图';
    });
    step(0);
    const s = S;
    s.pg = await pagePixels();
    if (S !== s) return;
    // Pick overlay first: clicking a person always works (SAM click-select) even before detection.
    s.ov = overlayFor(s.pg);
    s.ov.view.addEventListener('pointermove', e => {
      const b = s.ov.view.getBoundingClientRect(); const px = Math.round((e.clientX - b.left) / s.ov.sx), py = Math.round((e.clientY - b.top) / s.ov.sy);
      const h = hit(px, py); if (h !== s.hover) { s.hover = h; drawPick(); }
    });
    const toPage = e => { const b = s.ov.view.getBoundingClientRect(); return [Math.round((e.clientX - b.left) / s.ov.sx), Math.round((e.clientY - b.top) / s.ov.sy)]; };
    s.ov.view.addEventListener('pointerdown', e => { e.preventDefault(); s.drag = { start: toPage(e) }; s.ov.view.setPointerCapture && s.ov.view.setPointerCapture(e.pointerId); });
    s.ov.view.addEventListener('pointermove', e => {
      if (!s.drag) return;
      const [x, y] = toPage(e), [x0, y0] = s.drag.start;
      if (Math.abs(x - x0) + Math.abs(y - y0) > 12) { s.drag.box = [Math.min(x, x0), Math.min(y, y0), Math.max(x, x0), Math.max(y, y0)]; drawPick(); }
    });
    s.ov.view.addEventListener('pointerup', e => {
      const d = s.drag; s.drag = null;
      if (!d) return;
      if (!d.box) { pickAt(d.start[0], d.start[1]); return; }
      // a dragged box: the edit range (snapped to an API aspect inside the panel); picks the person inside too
      const cx = (d.box[0] + d.box[2]) / 2, cy = (d.box[1] + d.box[3]) / 2;
      const inside = s.chars.filter(c => c.box[0] < cx && c.box[2] > cx && c.box[1] < cy && c.box[3] > cy).sort((a, b) => a.area - b.area)[0];
      const t = inside || s.target || { id: 'box', box: d.box, panel: panelOf(d.box), area: 0, descriptor: new Array(24).fill(0) };
      if (!inside && !s.target) { s.chars.push(t); }
      t.userBox = d.box; s.pad = 0;   // the margin buttons now grow/shrink around the dragged box
      t.cropBox = fitCropIn(d.box, (s.panels || [])[t.panel] || [0, 0, s.pg.W, s.pg.H], 0);
      s.target = t; if ($('autoSwapBoxRow')) $('autoSwapBoxRow').hidden = false;
      refreshMatches(); drawPick(); step(1); updateButtons();
      status('已设好修改范围（蓝色虚线框）。上传参考图后点「生成」。');
    });
    s.onKey = e => { if (e.key === 'Escape' && S === s && s.ov) { s.ov.box.remove(); s.ov = null; status('已关闭选人；重新打开向导可再选。'); } };
    window.addEventListener('keydown', s.onKey, true);
    s.follow = setInterval(() => { if (S === s && s.ov) { const before = s.ov.box.style.left + s.ov.box.style.top; if (placeOverlay() || before !== s.ov.box.style.left + s.ov.box.style.top) drawPick(); } }, 400);
    // Detect right away only when the model is already on this computer; a first download needs a click.
    let st = null;
    try { st = await post('/manga-smart/status', {}); } catch (_) { st = null; }
    if (S !== s) return;
    const ch = st && st.characters;
    if (ch && ch.ready && ch.cached) return detect(s);
    if (ch && ch.ready) {
      const b = el('button', { type: 'button', class: 'ui-btn', id: 'autoSwapDetect' }, '自动找人物（首次需下载约 168MB 模型）');
      b.addEventListener('click', () => { b.remove(); detect(s); });
      $('autoSwapStatus').after(b);
      status('点上面的按钮自动找出本页人物；也可以直接点在要换的人物身上。');
    } else status('本机没有安装人物识别组件：直接点在要换的人物身上（智能点选），或改用手动框选。');
  }

  async function detect(s) {
    status('正在自动找本页的人物（约 20–60 秒）…');
    const r = await post('/manga-smart/characters', { image: s.pg.url });
    if (S !== s) return;
    if (r && r.ok) {
      s.panels = r.panels || [];
      s.chars = r.characters || [];
      s.identity = r.identity || null;
      for (const ch of s.chars) { await maskArray(ch, s.pg.W, s.pg.H); ch.descriptor = descriptor(s.pg.data, ch.full, s.pg.W * s.pg.H); }
    }
    drawPick();
    if (r && r.ok) status(s.chars.length ? '找到 ' + s.chars.length + ' 个人物（橙色虚线）。点一下要换掉的那个；没框到的话直接点在人物身上。' : '没有自动找到人物：直接点在要换的人物身上。');
    else status(((r && r.error) || '自动找人物不可用。') + ' 可以直接点在要换的人物身上（智能点选）。', !(r && r.declined));
  }

  /** Warm the server's per-page detection cache in the background (after import). Never prompts: runs only
   * when every model is already on this computer. */
  let prefetchTimer = null;
  function prefetch() {
    clearTimeout(prefetchTimer);
    prefetchTimer = setTimeout(async () => {
      try {
        // stay out of the way: no prefetch while any wizard or smart-select is open
        if (!gpt() || !gpt().pageImage || S || document.querySelector('.sam-select, #taskWizardCard, #mangaGptTaskHead')) return;
        const st = await post('/manga-smart/status', {});
        const ch = st && st.characters;
        if (!(ch && ch.cached && ch.identityCached && st.samSelect && st.samSelect.cached)) return;
        const pg = gpt().pageImage(false);
        if (!pg || !pg.image) return;
        root.__autoSwapPrefetch = 'running';
        const r = await post('/manga-smart/characters', { image: pg.image, background: true });
        root.__autoSwapPrefetch = r && r.ok ? 'done' : 'failed';
      } catch (_) { root.__autoSwapPrefetch = 'failed'; }
    }, 6000);
  }

  root.AutoSwap = Object.assign(api, { start, stop, prefetch, swapOne, applyResult,
    state: () => S && { crop: S.target ? targetCrop() : null, chars: S.chars.length, target: S.target && S.target.id, targetPanel: S.target && S.target.panel, refs: S.refs.length, busy: S.busy,
      result: !!S.result, matches: (S.matches || []).map(c => c.id), done: Array.from(S.doneIds), info: S.result && S.result.info } });
})(typeof window !== 'undefined' ? window : globalThis);
