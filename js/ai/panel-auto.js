/* Automatic panel detection (local, CPU, rule-based): the existing white-gutter XY-cut
 * on a downscaled page (port of the server rule), each panel trimmed to its inked area.
 * Results are cached per page (canvas GUID + image signature) and computed in the background on import.
 * Used by 分层 (按格子拆成图层, every panel toggleable = manual override) and offered to other wizards via get(). */
(function (root) {
  'use strict';
  const MAX = 640;

  /** Trim a rect (downscaled px) to the bounding box of non-white pixels inside it. */
  function tighten(img, r) {
    const W = img.width, d = img.data;
    let x0 = r.x + r.width, y0 = r.y + r.height, x1 = r.x - 1, y1 = r.y - 1;
    for (let y = r.y; y < r.y + r.height; y++) for (let x = r.x; x < r.x + r.width; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3] > 200 && (d[i] < 225 || d[i + 1] < 225 || d[i + 2] < 225)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < x0 || y1 < y0) return null;
    return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  }

  /** XY-cut on white gutters (same rule as the server's manga_character_detect.panels: trim to ink, split at the
   *  widest all-white band away from the edges, recurse). Returns rects in downscaled px. */
  function xyCut(img, white, minGutter) {
    const W = img.width, H = img.height, d = img.data, g = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = d[i * 4 + 3] < 200 ? 255 : (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
    const out = [];
    const trim = (x0, y0, x1, y1) => {
      let a = x1, b = y1, c = x0 - 1, e = y0 - 1;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (g[y * W + x] < white) { if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > e) e = y; }
      return c < a ? null : [a, b, c + 1, e + 1];
    };
    const cut = (x0, y0, x1, y1, depth) => {
      const t = trim(x0, y0, x1, y1); if (!t) return;
      [x0, y0, x1, y1] = t;
      if (depth < 8) for (const axis of [0, 1]) {
        const n = axis === 0 ? y1 - y0 : x1 - x0, m = axis === 0 ? x1 - x0 : y1 - y0;
        const full = new Uint8Array(n);
        for (let i = 0; i < n; i++) { let w = 0; for (let j = 0; j < m; j++) { const v = axis === 0 ? g[(y0 + i) * W + x0 + j] : g[(y0 + j) * W + x0 + i]; if (v >= white) w++; } full[i] = w >= 0.985 * m ? 1 : 0; }
        let best = null;
        for (let i = 0; i < n;) {
          if (!full[i]) { i++; continue; }
          let j = i; while (j < n && full[j]) j++;
          if (j - i >= minGutter && i > n * 0.08 && j < n * 0.92 && (!best || j - i > best[1] - best[0])) best = [i, j];
          i = j;
        }
        if (best) {
          const mid = (best[0] + best[1]) >> 1;
          if (axis === 0) { cut(x0, y0, x1, y0 + mid, depth + 1); cut(x0, y0 + mid, x1, y1, depth + 1); }
          else { cut(x0, y0, x0 + mid, y1, depth + 1); cut(x0 + mid, y0, x1, y1, depth + 1); }
          return;
        }
      }
      if ((x1 - x0) * (y1 - y0) >= 0.01 * W * H) out.push({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
    };
    cut(0, 0, W, H, 0);
    return out;
  }

  /** Panels in page pixels from a downscaled ImageData of a W×H page; reading order rows top→bottom, then
   *  right→left (manga, default) or left→right. A blank page gives []. */
  function detectFrom(img, W, H, direction) {
    const rects = xyCut(img, 235, Math.max(2, Math.round(5 * img.width / Math.max(W, 1))));
    const sx = W / img.width, sy = H / img.height, rtl = direction !== 'ltr';
    rects.sort((a, b) => (Math.round(a.y / (img.height * 0.05)) - Math.round(b.y / (img.height * 0.05))) || (rtl ? b.x - a.x : a.x - b.x));
    return rects.map((t, i) => ({ x: Math.round(t.x * sx), y: Math.round(t.y * sy), w: Math.round(t.width * sx), h: Math.round(t.height * sy), n: i + 1 }));
  }

  const cache = new Map();
  function pageKey() {
    if (typeof canvas === 'undefined') return '';
    const img = canvas.getObjects().find(o => o.type === 'image' && !o.autoSwap && !o.panelLayer);
    if (!img) return '';
    const id = typeof getCanvasGUID === 'function' ? getCanvasGUID() : 'page';
    return id + ':' + img.width + 'x' + img.height + ':' + ((img._element && img._element.src) || '').length;
  }
  function loadImg(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }); }

  /** Panels of the current page (cached per page). */
  async function get() {
    const key = pageKey();
    if (!key) return { key: '', panels: [] };
    if (cache.has(key)) return cache.get(key);
    const ed = root.MangaGPTRegionEditor;
    if (!ed || !ed.pageImage) return { key, panels: [] };
    const pg = ed.pageImage(false);
    const im = await loadImg(pg.image);
    const k = Math.min(1, MAX / Math.max(pg.width, pg.height));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(pg.width * k)); c.height = Math.max(1, Math.round(pg.height * k));
    const g = c.getContext('2d'); g.drawImage(im, 0, 0, c.width, c.height);
    const r = { key, W: pg.width, H: pg.height, image: pg.image, panels: detectFrom(g.getImageData(0, 0, c.width, c.height), pg.width, pg.height) };
    cache.set(key, r);
    while (cache.size > 12) cache.delete(cache.keys().next().value);
    return r;
  }

  // ---------- 按格子拆成图层 (overlay with toggles, one undo step) ----------
  let ov = null;
  function close() { if (ov) { ov.root.remove(); ov = null; } }
  async function splitToLayers(hooks) {
    close();
    const r = await get();
    if (!r.panels.length) { if (hooks && hooks.status) hooks.status('这一页没找到分格（需要白色格间留白）。可以用「开始框选」手动框。'); return null; }
    const u = canvas.upperCanvasEl.getBoundingClientRect();
    const on = r.panels.map(() => true);
    const box = document.createElement('div'); box.id = 'panelAutoOverlay'; box.className = 'panel-auto-overlay';
    box.style.cssText = 'position:fixed;left:' + u.left + 'px;top:' + u.top + 'px;width:' + u.width + 'px;height:' + u.height + 'px;';
    const sx = u.width / canvas.getWidth(), sy = u.height / canvas.getHeight();
    r.panels.forEach((p, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'panel-auto-cell is-on'; b.dataset.panel = String(p.n);
      b.style.cssText = 'left:' + p.x * sx + 'px;top:' + p.y * sy + 'px;width:' + p.w * sx + 'px;height:' + p.h * sy + 'px;';
      b.innerHTML = '<span>' + p.n + '</span>'; b.title = '点一下：不拆这一格 / 恢复';
      b.addEventListener('click', () => { on[i] = !on[i]; b.classList.toggle('is-on', on[i]); upd(); });
      box.appendChild(b);
    });
    const bar = document.createElement('div'); bar.className = 'panel-auto-bar ui-card';
    bar.innerHTML = '<span id="panelAutoCount"></span><button type="button" class="ui-btn ui-btn-primary" id="panelAutoApply"></button><button type="button" class="ui-btn ui-btn-ghost" id="panelAutoCancel">取消</button>';
    box.appendChild(bar);
    document.body.appendChild(box);
    ov = { root: box, on, r };
    function upd() { const n = on.filter(Boolean).length; bar.querySelector('#panelAutoCount').textContent = '自动找到 ' + r.panels.length + ' 格，点格子可取消'; const a = bar.querySelector('#panelAutoApply'); a.textContent = '拆成 ' + n + ' 个图层'; a.disabled = !n; }
    upd();
    return new Promise(resolve => {
      bar.querySelector('#panelAutoCancel').addEventListener('click', () => { close(); resolve(null); });
      bar.querySelector('#panelAutoApply').addEventListener('click', async () => {
        const chosen = r.panels.filter((p, i) => on[i]);
        close();
        const n = await apply(r, chosen);
        if (hooks && hooks.status) hooks.status('已拆成 ' + n + ' 个图层（「第 N 格」），Ctrl+Z 一步撤销。');
        resolve(n);
      });
    });
  }

  async function apply(r, chosen) {
    const src = await loadImg(r.image);
    if (typeof changeDoNotSaveHistory === 'function') changeDoNotSaveHistory();
    let n = 0;
    try {
      for (const p of chosen) {
        const c = document.createElement('canvas'); c.width = p.w; c.height = p.h;
        c.getContext('2d').drawImage(src, p.x, p.y, p.w, p.h, 0, 0, p.w, p.h);
        await new Promise(ok => fabric.Image.fromURL(c.toDataURL('image/png'), obj => {
          obj.set({ left: p.x, top: p.y, name: '第' + p.n + '格', panelLayer: p.n }); canvas.add(obj); n++; ok();
        }));
      }
    } finally {
      if (typeof changeDoSaveHistory === 'function') changeDoSaveHistory();
      if (typeof saveStateByManual === 'function') saveStateByManual();
    }
    canvas.requestRenderAll();
    if (typeof updateLayerPanel === 'function') updateLayerPanel();
    return n;
  }

  root.PanelAuto = { tighten, xyCut, detectFrom, get, splitToLayers, close, _cache: cache };
})(typeof window !== 'undefined' ? window : globalThis);
