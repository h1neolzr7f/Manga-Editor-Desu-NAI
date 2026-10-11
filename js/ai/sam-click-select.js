/* 智能点选 (SAM 2.1 tiny, local, CPU): click on a character/object → 3 candidate shapes (small → large)
 * → pick one, refine with ＋/－ clicks → use it as the GPT selection (换角色 / 修瑕疵 / 自定义) or cut it
 * out into a new layer (分层). Weights download only after the user confirms (428 flow, SHA-256 pinned).
 * When the local model is unavailable the caller keeps rectangle / lasso selection.
 */
(function () {
  'use strict';
  const URL_ = '/manga-smart/sam-click';
  const TINT = 'rgba(37, 99, 235, 0.42)';
  let cur = null; // active session

  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
    if (text != null) e.textContent = text;
    return e;
  }
  function fabricCanvas() { return typeof canvas !== 'undefined' ? canvas : null; }
  function gpt() { return window.MangaGPTRegionEditor; }

  // Stable per page content: a new id whenever the page pixels the model saw change.
  function hashString(s) { let h = 2166136261; for (let i = 0; i < s.length; i += 97) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + '-' + s.length.toString(36); }

  function status(text, isError) {
    if (!cur) return;
    cur.status.textContent = text;
    cur.status.classList.toggle('is-error', !!isError);
  }

  function drawMask() {
    if (!cur) return;
    const ctx = cur.view.getContext('2d');
    ctx.clearRect(0, 0, cur.view.width, cur.view.height);
    const cand = cur.cands[cur.pick];
    const paint = () => {
      if (cand && cand.img) {
        ctx.save();
        ctx.drawImage(cand.img, 0, 0, cur.view.width, cur.view.height);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = TINT;
        ctx.fillRect(0, 0, cur.view.width, cur.view.height);
        ctx.restore();
        // outline so the edge is readable on dark art
        if (cand.polygon && cand.polygon.length > 2) {
          const sx = cur.view.width / cur.W, sy = cur.view.height / cur.H;
          ctx.beginPath();
          cand.polygon.forEach(([x, y], i) => (i ? ctx.lineTo(x * sx, y * sy) : ctx.moveTo(x * sx, y * sy)));
          ctx.closePath(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.setLineDash([6, 4]); ctx.stroke();
        }
      }
      cur.points.forEach(([x, y, l]) => {
        const px = x * cur.view.width / cur.W, py = y * cur.view.height / cur.H;
        ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fillStyle = l ? '#16a34a' : '#dc2626'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.setLineDash([]); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(l ? '+' : '−', px, py + 0.5);
      });
    };
    if (cand && cand.mask && !cand.img) {
      const img = new Image();
      img.onload = () => { cand.img = img; if (cur && cur.cands[cur.pick] === cand) drawMask(); };
      img.src = cand.mask;
      cand.img = null;
    }
    paint();
  }

  function renderPicks() {
    if (!cur) return;
    cur.pickRow.innerHTML = '';
    const names = ['只选这一块', '中等', '整个'];
    cur.cands.forEach((c, i) => {
      const b = el('button', { type: 'button', class: 'ui-btn sam-pick' + (i === cur.pick ? ' is-on' : ''), id: 'samPick' + (i + 1),
        'aria-pressed': i === cur.pick ? 'true' : 'false', title: '候选 ' + (i + 1) + '（数字键 ' + (i + 1) + '）' }, (i + 1) + ' ' + (names[i] || ''));
      b.addEventListener('click', () => { cur.pick = i; renderPicks(); drawMask(); });
      cur.pickRow.appendChild(b);
    });
    cur.useBtn.disabled = !cur.cands.length;
    cur.undoBtn.disabled = !cur.points.length;
  }

  async function run() {
    if (!cur || !cur.points.length) return;
    const s = cur, seq = ++s.seq;
    if (s.ctrl) s.ctrl.abort();
    s.ctrl = new AbortController();
    status(s.sent ? '正在计算…' : '正在分析这一页（首次约 2–8 秒，之后每次点击不到 1 秒）…');
    s.box.classList.add('is-busy');
    const body = { imageId: s.imageId, points: s.points };
    if (!s.sent) body.image = s.image;
    let r = await window.MangaModelRequest.post(URL_, body, { signal: s.ctrl.signal });
    if (r && r.status === 409 && cur === s) { // server dropped the page embedding: send it once more
      body.image = s.image;
      r = await window.MangaModelRequest.post(URL_, body, { signal: s.ctrl.signal });
    }
    if (cur !== s || seq !== s.seq) return;
    s.box.classList.remove('is-busy');
    if (!r || !r.ok) {
      if (r && r.cancelled) return;
      s.points.pop(); drawMask(); renderPicks();
      const fallback = r && (r.declined || r.status === 501) ? ' 可以改用矩形或套索框选。' : '';
      status((r && r.error ? r.error : '智能点选失败。') + fallback, true);
      if (r && (r.declined || r.status === 501)) s.unavailable = true;
      return;
    }
    s.sent = true;
    const keep = s.cands.length ? s.pick : null;
    s.cands = r.candidates || [];
    s.pick = keep != null ? Math.min(keep, s.cands.length - 1) : Math.min(1, s.cands.length - 1);
    s.timing = { embed: r.embedSeconds, click: r.clickSeconds };
    renderPicks(); drawMask();
    status(s.cands.length ? '蓝色就是选中的部分。不对就换 1/2/3，或者用「－ 去掉」点多出来的地方、「＋ 加上」点漏掉的地方。' : '没有找到可选的形状，换个位置点一下。', !s.cands.length);
  }

  function pagePoint(event) {
    const r = cur.view.getBoundingClientRect();
    return [Math.round((event.clientX - r.left) * cur.W / r.width), Math.round((event.clientY - r.top) * cur.H / r.height)];
  }

  function finish() {
    if (!cur || !cur.cands.length) return;
    const s = cur, cand = s.cands[s.pick];
    end();
    if (s.target === 'layer') return cutToLayer(s, cand);
    const api = gpt();
    const ok = api && api.selectPolygon && api.selectPolygon(cand.polygon);
    if (s.onDone) s.onDone(!!ok, cand);
  }

  // 分层: page pixels inside the chosen shape → a new image object at the same place (undo removes it)
  function cutToLayer(s, cand) {
    const c = fabricCanvas();
    const [x0, y0, x1, y1] = cand.box, w = x1 - x0, h = y1 - y0;
    const page = new Image(), mask = new Image();
    let left = 2;
    const go = () => {
      if (--left) return;
      const out = document.createElement('canvas'); out.width = w; out.height = h;
      const g = out.getContext('2d');
      g.drawImage(mask, x0, y0, w, h, 0, 0, w, h);   // mask PNG: white where selected, transparent elsewhere
      g.globalCompositeOperation = 'source-in';
      g.drawImage(page, x0, y0, w, h, 0, 0, w, h);
      fabric.Image.fromURL(out.toDataURL('image/png'), img => {
        img.set({ left: x0, top: y0, name: '点选抠图' });
        c.add(img); c.setActiveObject(img); c.requestRenderAll();
        if (typeof updateLayerPanel === 'function') updateLayerPanel();
        if (s.onDone) s.onDone(true, cand);
      });
    };
    page.onload = go; mask.onload = go;
    page.src = s.image; mask.src = cand.mask;
  }

  function end() {
    if (!cur) return;
    if (cur.ctrl) cur.ctrl.abort();
    window.removeEventListener('keydown', cur.onKey, true);
    window.removeEventListener('resize', cur.onResize);
    cur.box.remove();
    cur = null;
  }

  function cancel() { const s = cur; end(); if (s && s.onDone) s.onDone(false, null, true); }

  /** begin({target: 'gpt' | 'layer', onDone(ok, candidate, cancelled)}) → false when it cannot start. */
  function begin(opts) {
    opts = opts || {};
    end();
    const c = fabricCanvas(), api = gpt();
    if (!c || !c.upperCanvasEl || !api || !api.pageImage || !window.MangaModelRequest) return false;
    const rect = c.upperCanvasEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    if (api.cancelSelection) api.cancelSelection();
    const pg = api.pageImage(false);
    if (!pg || !pg.image) return false;
    const box = el('div', { class: 'sam-select', id: 'samSelect', role: 'dialog', 'aria-label': '智能点选' });
    box.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;';
    const view = el('canvas', { class: 'sam-view', id: 'samView' });
    view.width = Math.round(rect.width); view.height = Math.round(rect.height);
    box.appendChild(view);
    const bar = el('div', { class: 'sam-bar ui-card', id: 'samBar' });
    const modeRow = el('div', { class: 'sam-row' });
    const add = el('button', { type: 'button', class: 'ui-btn sam-mode is-on', id: 'samAdd', 'aria-pressed': 'true', title: '点一下要选的东西（左键）' }, '＋ 加上');
    const sub = el('button', { type: 'button', class: 'ui-btn sam-mode', id: 'samSub', 'aria-pressed': 'false', title: '点多选进来的地方（右键或按住 Alt 也行）' }, '－ 去掉');
    const undo = el('button', { type: 'button', class: 'ui-btn', id: 'samUndo', title: '撤销上一个点（Backspace）' }, '撤销一点');
    modeRow.append(add, sub, undo);
    const pickRow = el('div', { class: 'sam-row', id: 'samPicks' });
    const st = el('p', { class: 'sam-status', id: 'samStatus', role: 'status', 'aria-live': 'polite' }, '在要选的人物或物体上点一下。');
    const actRow = el('div', { class: 'sam-row' });
    const use = el('button', { type: 'button', class: 'ui-btn ui-btn-primary', id: 'samUse', title: 'Enter' }, opts.target === 'layer' ? '抠成新图层' : '用这个选区');
    const cancelBtn = el('button', { type: 'button', class: 'ui-btn', id: 'samCancel', title: 'Esc' }, '取消');
    actRow.append(use, cancelBtn);
    bar.append(st, modeRow, pickRow, actRow);
    // keep the page clear: put the bar in the gutter left of the page when there is room
    if (rect.left >= 316) { bar.style.position = 'fixed'; bar.style.left = (rect.left - 308) + 'px'; bar.style.top = Math.max(8, rect.top) + 'px'; bar.style.right = 'auto'; }
    box.appendChild(bar);
    document.body.appendChild(box);
    const imageId = hashString(pg.image);
    cur = { target: opts.target || 'gpt', onDone: opts.onDone, box, view, status: st, pickRow, useBtn: use, undoBtn: undo,
      W: pg.width, H: pg.height, image: pg.image, imageId, sent: false, points: [], cands: [], pick: 0, seq: 0, neg: false };
    const setNeg = on => { cur.neg = on; add.classList.toggle('is-on', !on); sub.classList.toggle('is-on', on);
      add.setAttribute('aria-pressed', String(!on)); sub.setAttribute('aria-pressed', String(on)); };
    add.addEventListener('click', () => setNeg(false));
    sub.addEventListener('click', () => setNeg(true));
    undo.addEventListener('click', () => { if (!cur.points.length) return; cur.points.pop(); if (cur.points.length) run(); else { cur.cands = []; renderPicks(); drawMask(); } });
    use.addEventListener('click', finish);
    cancelBtn.addEventListener('click', cancel);
    view.addEventListener('contextmenu', e => e.preventDefault());
    view.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      if (cur.unavailable) return;
      const negative = cur.neg || e.button === 2 || e.altKey;
      if (negative && !cur.points.some(p => p[2])) { status('先用「＋ 加上」点一下要选的东西。', true); return; }
      cur.points.push(pagePoint(e).concat([negative ? 0 : 1]));
      drawMask(); renderPicks(); run();
    });
    cur.onKey = e => {
      if (!cur) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
      else if (e.key === 'Enter' && cur.cands.length) { e.preventDefault(); e.stopPropagation(); finish(); }
      else if (/^[123]$/.test(e.key) && cur.cands[+e.key - 1]) { cur.pick = +e.key - 1; renderPicks(); drawMask(); }
      else if (e.key === 'Backspace' && cur.points.length && !/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); undo.click(); }
    };
    window.addEventListener('keydown', cur.onKey, true);
    cur.onResize = () => { status('窗口大小变了，请重新开始点选。', true); cancel(); };
    window.addEventListener('resize', cur.onResize);
    renderPicks();
    return true;
  }

  async function available() {
    try {
      const r = await fetch('/manga-smart/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const d = await r.json();
      return !!(d && d.samSelect && d.samSelect.ready);
    } catch (_) { return false; }
  }

  window.SamClickSelect = { begin, cancel, available, active: () => !!cur,
    state: () => cur && { points: cur.points.length, candidates: cur.cands.map(c => ({ score: c.score, area: c.area, box: c.box })), pick: cur.pick, sent: cur.sent, timing: cur.timing || null } };
})();
