// Real headless Chromium acceptance test against the actual HTML/Fabric runtime.
// No external model calls or API credits: /gpt-image-proxy is answered in the browser by an
// "identity model" that returns the uploaded (letterboxed) picture resized to the requested size.
// That makes geometric precision measurable: the applied patch must reproduce the original pixels.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SERVER = 'http://127.0.0.1:8000';
const OUT = path.join(ROOT, 'artifacts', 'gpt-browser');
fs.mkdirSync(OUT, { recursive: true });
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const results = [];
const consoleErrors = [];
const pageErrors = [];
let server;
let browser;

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? ' ' + JSON.stringify(detail) : ''));
  if (!pass) throw new Error('Acceptance check failed: ' + name + ' ' + JSON.stringify(detail));
}

function portBusy(port) {
  return new Promise(resolve => {
    const socket = net.connect(port, '127.0.0.1');
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}

async function startServer() {
  if (await portBusy(8000)) {
    throw new Error('Port 8000 is already in use. Stop the other process (not killed automatically) and retry.');
  }
  let logs = '';
  server = spawn(python, ['99_server.py'], {
    cwd: ROOT, env: { ...process.env, NAI_QUIET: '1', GPT_IMAGE_API_KEY: '', NOVELAI_API_KEY: '', DIRECTOR_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', b => { logs += b; });
  server.stderr.on('data', b => { logs += b; });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Python server failed: ' + logs);
    try {
      const response = await fetch(SERVER + '/index.html', { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('local HTTP server not ready: ' + logs);
}

async function openEditor(context) {
  const page = await context.newPage();
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, route => route.abort());
  await page.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#mangaGptOpen').waitFor({ timeout: 60000 });
  await page.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0 &&
    canvas.upperCanvasEl && typeof fabric !== 'undefined' && typeof saveStateByManual === 'function', { timeout: 45000 });
  const skip = page.locator('#tutorialSkipBtn');
  if (await skip.count() && await skip.isVisible()) await skip.click();
  await page.keyboard.press('Escape');
  return page;
}

// Identity "model": returns the uploaded picture resized to the requested (or forced) size.
async function installMockModel(page, state) {
  await page.route('**/gpt-image-proxy', async route => {
    const payload = route.request().postDataJSON();
    state.calls.push({ operation: payload.operation, size: payload.size, refs: (payload.references || []).length,
      auth: Boolean(route.request().headers().authorization), image: payload.image });
    if (state.fail) {
      return route.fulfill({ status: state.fail.status, contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: state.fail.error }) });
    }
    if (state.delayMs) await new Promise(r => setTimeout(r, state.delayMs));
    const image = await page.evaluate(async ({ src, size, force, tint, flip }) => {
      let [w, h] = (size && size !== 'auto' ? size : '1024x1024').split('x').map(Number);
      if (force) [w, h] = force;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      if (src) {
        const img = new Image(); img.src = src; await img.decode();
        x.imageSmoothingQuality = 'high';
        x.drawImage(img, 0, 0, w, h);
      } else { x.fillStyle = '#33aa77'; x.fillRect(0, 0, w, h); }
      if (flip) { // a "recomposing" model: mirrored scene
        const m = document.createElement('canvas'); m.width = w; m.height = h;
        const mx = m.getContext('2d'); mx.translate(w, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0);
        x.clearRect(0, 0, w, h); x.drawImage(m, 0, 0);
      }
      if (tint) {
        const d = x.getImageData(0, 0, w, h);
        for (let i = 0; i < d.data.length; i += 4) { d.data[i] = Math.min(255, d.data[i] + tint);
          d.data[i + 1] = Math.min(255, d.data[i + 1] + tint); d.data[i + 2] = Math.min(255, d.data[i + 2] + tint); }
        x.putImageData(d, 0, 0);
      }
      return c.toDataURL('image/png');
    }, { src: payload.image, size: payload.size, force: state.force, tint: state.tint || 0, flip: !!state.flip });
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, image }) });
  });
}

async function buildScene(page) {
  await page.evaluate(async () => {
    canvas.getObjects().filter(o => o.text === '拖放或生成图片').forEach(o => canvas.remove(o));
    const W = canvas.getWidth(); const H = canvas.getHeight();
    // One raster layer with a sharp-edged checker pattern so 1–2 px misalignment is measurable.
    const art = document.createElement('canvas'); art.width = W; art.height = H;
    const g = art.getContext('2d');
    g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 60) {
      for (let x = (y / 60) % 2 ? 0 : 60; x < W; x += 120) {
        g.fillStyle = `hsl(${(x + y) % 360},55%,45%)`; g.fillRect(x, y, 60, 60);
      }
    }
    g.fillStyle = '#111'; g.beginPath(); g.arc(520, 660, 140, 0, Math.PI * 2); g.fill();
    const img = await new Promise(res => fabric.Image.fromURL(art.toDataURL('image/png'), res));
    img.set({ left: 0, top: 0, name: 'artwork' });
    canvas.add(img); canvas.renderAll();
  });
}

async function canvasBox(page) {
  return page.evaluate(() => {
    const r = canvas.upperCanvasEl.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cw: canvas.getWidth(), ch: canvas.getHeight() };
  });
}

function regionOf(status) {
  const m = /(\d+) × (\d+)/.exec(status || '');
  return m ? [Number(m[1]), Number(m[2])] : null;
}

function near(status, w, h, tol = 2) {
  const r = regionOf(status);
  return !!r && Math.abs(r[0] - w) <= tol && Math.abs(r[1] - h) <= tol;
}

async function dragSelect(page, from, to, button = 'left') {
  await page.locator('#mangaGptSelect').click();
  const b = await canvasBox(page);
  const px = p => ({ x: b.x + p[0] * b.w / b.cw, y: b.y + p[1] * b.h / b.ch });
  const a = px(from); const z = px(to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down({ button });
  await page.mouse.move((a.x + z.x) / 2, (a.y + z.y) / 2, { steps: 4 });
  await page.mouse.move(z.x, z.y, { steps: 6 });
  await page.mouse.up({ button });
  return page.locator('#mangaGptStatus').textContent();
}

async function snapshot(page) {
  return page.evaluate(() => canvas.toDataURL({ format: 'png', multiplier: 1 }));
}

// Compare two full-canvas PNGs: identical outside rect, mean abs diff inside rect.
async function compare(page, before, after, rect) {
  return page.evaluate(async ({ before, after, rect }) => {
    const load = async src => { const i = new Image(); i.src = src; await i.decode();
      const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
      const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
    const A = await load(before); const B = await load(after);
    let outsideChanged = 0; let insideSum = 0; let insideCount = 0;
    for (let y = 0; y < A.height; y++) {
      for (let x = 0; x < A.width; x++) {
        const i = (y * A.width + x) * 4;
        const inside = x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height;
        const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
        if (inside) {
          const edge = x < rect.left + 2 || x >= rect.left + rect.width - 2 || y < rect.top + 2 || y >= rect.top + rect.height - 2;
          if (!edge) { insideSum += d / 3; insideCount++; }
        } else if (d) outsideChanged++;
      }
    }
    return { outsideChanged, insideMeanAbsDiff: insideCount ? insideSum / insideCount : 0, size: [A.width, A.height] };
  }, { before, after, rect });
}

async function lastRegion(page) {
  const text = await page.locator('#mangaGptStatus').textContent();
  return text;
}

async function generateAndApply(page, { allowUpscale = false } = {}) {
  await page.locator('#mangaGptGenerate').click();
  await page.waitForFunction(() => !document.querySelector('#mangaGptGenerate').disabled, { timeout: 30000 });
  const status = await page.locator('#mangaGptStatus').textContent();
  if (await page.locator('#mangaGptApply').isDisabled()) return { applied: false, status };
  await page.locator('#mangaGptAllowUpscale').setChecked(allowUpscale);
  const before = await page.evaluate(() => canvas.getObjects().length);
  await page.locator('#mangaGptApply').click();
  await page.waitForFunction(n => canvas.getObjects().length === n + 1 ||
    document.querySelector('#mangaGptStatus').dataset.error === 'true', before, { timeout: 20000 });
  const applyStatus = await page.locator('#mangaGptStatus').textContent();
  const added = await page.evaluate(n => canvas.getObjects().length === n + 1, before);
  return { applied: added, status: applyStatus };
}

// No stretching: the source rectangle taken from the model result has the selection's aspect
// and the baked bitmap is mapped back with (sub-pixel rounding aside) equal X/Y scale.
function uniform(info) {
  return !!info && !!info.crop && Math.abs(info.scaleX / info.scaleY - 1) < 0.002 &&
    Math.abs((info.crop.w / info.crop.h) / (info.w / info.h) - 1) < 0.002;
}

async function patchInfo(page) {
  return page.evaluate(() => {
    const objs = canvas.getObjects();
    const i = objs.map(o => o.mangaGptSource).lastIndexOf('openai-compatible-image');
    const p = objs[i];
    return p ? { index: i, total: objs.length, left: p.left, top: p.top, scaleX: p.scaleX, scaleY: p.scaleY,
      w: p.getScaledWidth(), h: p.getScaledHeight(), cropX: p.cropX, cropY: p.cropY, name: p.name,
      source: p.mangaGptSource, crop: p.mangaGptCrop } : null;
  });
}

async function run() {
  await startServer();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await openEditor(context);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const heap = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'JSHeapUsedSize').value;
  const base = await page.evaluate(() => ({ w: canvas.getWidth(), h: canvas.getHeight() }));
  record('editor loads with A4 200dpi page', base.w === 1654 && base.h === 2339, base);

  const mock = { calls: [] };
  await installMockModel(page, mock);
  await buildScene(page);
  await page.locator('#mangaGptOpen').click();
  await page.locator('#mangaGptKey').fill('fake-ephemeral-test-key');
  await page.locator('#mangaGptPrompt').fill('identity test');

  // 1. Selection interactions: left / right button, reversed drag, beyond-edge clamping, Esc.
  let status = await dragSelect(page, [240, 380], [840, 680]);
  record('left-drag selection 600x300 (±2px)', near(status, 600, 300), { status });
  status = await dragSelect(page, [840, 680], [240, 380], 'right');
  record('right-button reversed drag gives same region', near(status, 600, 300), { status });
  status = await dragSelect(page, [1500, 2200], [1800, 2600]);
  record('drag beyond canvas edge is clamped to page', near(status, 154, 139), { status });
  await page.locator('#mangaGptSelect').click();
  await page.keyboard.press('Escape');
  record('Esc removes selection overlay', await page.locator('.manga-gpt-selection').count() === 0);
  for (let i = 0; i < 20; i++) { await page.locator('#mangaGptSelect').click(); await page.keyboard.press('Escape'); }
  record('20x open/cancel leaves no overlay', await page.locator('.manga-gpt-selection').count() === 0);
  await page.locator('#mangaGptSelect').click();
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  record('window resize during selection aborts overlay', await page.locator('.manga-gpt-selection').count() === 0,
    { status: await page.locator('#mangaGptStatus').textContent() });

  // 2. Precision matrix with the identity model: wide / tall / square selections.
  const cases = [
    { name: 'wide 600x300', from: [240, 380], to: [840, 680] },
    { name: 'tall 300x900', from: [1100, 300], to: [1400, 1200] },
    { name: 'square 500x500', from: [200, 1300], to: [700, 1800] }
  ];
  for (const c of cases) {
    await dragSelect(page, c.from, c.to);
    const before = await snapshot(page);
    const region = { left: c.from[0], top: c.from[1], width: c.to[0] - c.from[0], height: c.to[1] - c.from[1] };
    const r = await generateAndApply(page);
    const info = await patchInfo(page);
    const after = await snapshot(page);
    // Compare against the region actually selected (mouse -> page pixel rounding, ±2px).
    const diff = await compare(page, before, after,
      { left: info.left, top: info.top, width: Math.round(info.w), height: Math.round(info.h) });
    await page.screenshot({ path: path.join(OUT, 'precision-' + c.name.split(' ')[0] + '.png') });
    record('identity edit ' + c.name + ': uniform scale, outside pixels untouched, inside matches',
      r.applied && uniform(info) && diff.outsideChanged === 0 &&
      diff.insideMeanAbsDiff < 6 && Math.abs(info.w - region.width) <= 2 && Math.abs(info.h - region.height) <= 2,
      { applied: r.applied, size: mock.calls.at(-1).size, info, diff });
  }

  // 3. Model ignores requested aspect (returns 3:2 for a 1:1 request): still no stretching.
  mock.force = [1536, 1024];
  await dragSelect(page, [300, 1900], [800, 2300]);
  let r = await generateAndApply(page);
  let info = await patchInfo(page);
  record('model returns wrong aspect: uniform scale, exact region size', r.applied &&
    uniform(info) && Math.abs(info.w - 500) <= 2 && Math.abs(info.h - 400) <= 2, info);
  mock.force = null;

  // 3b. Letterbox padding carries the real surroundings (context), unless the user opts out.
  const padStats = async (src, plan) => page.evaluate(async ({ src }) => {
    const i = new Image(); i.src = src; await i.decode();
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    // left padding strip of a wide->1:1 letterbox is the top band; sample the top 20 rows.
    const d = x.getImageData(0, 0, i.width, 20).data; let nonWhite = 0;
    for (let k = 0; k < d.length; k += 4) if (d[k] < 240 || d[k + 1] < 240 || d[k + 2] < 240) nonWhite++;
    return { size: [i.width, i.height], nonWhiteRatio: +(nonWhite / (d.length / 4)).toFixed(3) };
  }, { src });
  await page.locator('#mangaGptSize').selectOption('1024x1024');
  await dragSelect(page, [300, 900], [900, 1200]);
  await page.locator('#mangaGptGenerate').click();
  await page.waitForFunction(() => !document.querySelector('#mangaGptGenerate').disabled, null, { timeout: 30000 });
  const ctxPad = await padStats(mock.calls.at(-1).image);
  await page.locator('#mangaGptContext').setChecked(false);
  await page.locator('#mangaGptGenerate').click();
  await page.waitForFunction(() => !document.querySelector('#mangaGptGenerate').disabled, null, { timeout: 30000 });
  const whitePad = await padStats(mock.calls.at(-1).image);
  await page.locator('#mangaGptContext').setChecked(true);
  await page.locator('#mangaGptSize').selectOption('auto');
  record('letterbox padding uses page context (opt-out gives plain white)',
    ctxPad.nonWhiteRatio > 0.3 && whitePad.nonWhiteRatio === 0, { ctxPad, whitePad });

  // 3c. Feathered edge hides model colour drift at the seam; outside pixels still untouched.
  const seamOf = async (before, after, rect) => page.evaluate(async ({ before, after, rect }) => {
    const load = async src => { const i = new Image(); i.src = src; await i.decode();
      const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
      const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
    const B = await load(after);
    const p = (x, y) => { const i = (y * B.width + x) * 4; return (B.data[i] + B.data[i + 1] + B.data[i + 2]) / 3; };
    let s = 0, n = 0;
    for (let y = rect.top + 4; y < rect.top + rect.height - 4; y++) { s += Math.abs(p(rect.left, y) - p(rect.left - 1, y)); n++; }
    return +(s / n).toFixed(2);
  }, { before, after, rect });
  mock.tint = 40;
  await page.locator('#mangaGptMatchTone').setChecked(false);
  const seams = {};
  for (const on of [false, true]) {
    await page.locator('#mangaGptFeather').setChecked(on);
    await dragSelect(page, [300, 900], [900, 1200]);
    const before = await snapshot(page);
    const res = await generateAndApply(page);
    const pi = await patchInfo(page);
    const after = await snapshot(page);
    const rect = { left: Math.round(pi.left), top: Math.round(pi.top), width: Math.round(pi.w), height: Math.round(pi.h) };
    seams[on ? 'feather' : 'hard'] = { applied: res.applied, seam: await seamOf(before, after, rect),
      outside: (await compare(page, before, after, rect)).outsideChanged, featherPx: pi.crop && pi.crop.feather };
    await page.evaluate(() => undo());
    await page.waitForTimeout(800);
  }
  await page.locator('#mangaGptFeather').setChecked(true);
  // 3d. Tone matching: the model brightened everything by +40; the drift measured on the
  // context ring is removed from the patch (inside matches the original again).
  const tone = {};
  for (const on of [false, true]) {
    await page.locator('#mangaGptMatchTone').setChecked(on);
    await dragSelect(page, [300, 900], [900, 1200]);
    const before = await snapshot(page);
    const res = await generateAndApply(page);
    const pi = await patchInfo(page);
    const rect = { left: Math.round(pi.left), top: Math.round(pi.top), width: Math.round(pi.w), height: Math.round(pi.h) };
    const diff = await compare(page, before, await snapshot(page), rect);
    tone[on ? 'matched' : 'raw'] = { applied: res.applied, inside: +diff.insideMeanAbsDiff.toFixed(2),
      outside: diff.outsideChanged, offset: pi.crop && pi.crop.toneOffset };
    await page.evaluate(() => undo());
    await page.waitForTimeout(800);
  }
  record('tone matching removes model colour drift measured on the context ring',
    tone.raw.applied && tone.matched.applied && tone.raw.inside > 20 && tone.matched.inside < tone.raw.inside / 2 &&
    tone.matched.offset.every(v => v <= -20) && tone.matched.outside === 0, tone);
  // Recomposed result (mirrored + tinted): ring does not match, so no global tint is applied.
  mock.flip = true;
  await page.locator('#mangaGptMatchTone').setChecked(true);
  await dragSelect(page, [300, 900], [900, 1200]);
  const flipRes = await generateAndApply(page);
  const flipInfo = await patchInfo(page);
  mock.flip = false;
  await page.evaluate(() => undo());
  await page.waitForTimeout(800);
  record('tone matching is skipped when the model recomposed the surroundings',
    flipRes.applied && flipInfo.crop.toneOffset.every(v => v === 0), { offset: flipInfo.crop.toneOffset });
  mock.tint = 0;
  record('feathered edge reduces seam from colour drift, outside untouched',
    seams.hard.applied && seams.feather.applied && seams.feather.seam < seams.hard.seam / 4 &&
    seams.hard.outside === 0 && seams.feather.outside === 0 && seams.feather.featherPx > 0, seams);

  // 4. Low-resolution guard: full-page selection needs upscale.
  await dragSelect(page, [0, 0], [1654, 2339]);
  r = await generateAndApply(page);
  record('full-page edit blocked without "allow upscale"', !r.applied && /已阻止低清晰度放大/.test(r.status), r);
  r = await generateAndApply(page, { allowUpscale: true });
  record('full-page edit applies with "allow upscale"', r.applied, r);
  await page.evaluate(() => undo());
  await page.waitForTimeout(800);

  // 5. Lettering stays editable above the patch and is not baked into the request image.
  await page.evaluate(() => {
    const t = new fabric.VerticalTextbox('竖排台词', { left: 1250, top: 400, fontSize: 48, name: 'vtext' });
    canvas.add(t); canvas.renderAll(); saveStateByManual();
  });
  await dragSelect(page, [1100, 300], [1500, 900]);
  r = await generateAndApply(page);
  const z = await page.evaluate(() => {
    const o = canvas.getObjects();
    return { text: o.findIndex(x => x.name === 'vtext'), patch: o.map(x => x.mangaGptSource).lastIndexOf('openai-compatible-image') };
  });
  record('editable vertical text stays above GPT patch', r.applied && z.text > z.patch, z);

  // 6. Subtitle replacement on real Textbox and VerticalTextbox, with undo.
  const sub = await page.evaluate(async () => {
    const out = {};
    const t = new fabric.Textbox('Old text', { left: 60, top: 60, width: 300, fontSize: 32, name: 'htext' });
    canvas.add(t); saveStateByManual(); canvas.setActiveObject(t);
    document.getElementById('mangaGptSubtitle').value = '中文新字幕';
    document.getElementById('mangaGptReplaceText').click();
    out.h = canvas.getActiveObject().text;
    const v = canvas.getObjects().find(o => o.name === 'vtext');
    canvas.setActiveObject(v);
    document.getElementById('mangaGptSubtitle').value = '新竖排';
    document.getElementById('mangaGptReplaceText').click();
    out.v = v.text; out.vType = v.type;
    undo(); await new Promise(res => setTimeout(res, 900));
    out.vUndo = canvas.getObjects().find(o => o.name === 'vtext').text;
    redo(); await new Promise(res => setTimeout(res, 900));
    out.vRedo = canvas.getObjects().find(o => o.name === 'vtext').text;
    return out;
  });
  record('subtitle replace horizontal + vertical with undo/redo', sub.h === '中文新字幕' && sub.v === '新竖排' &&
    sub.vType === 'vertical-textbox' && sub.vUndo === '竖排台词' && sub.vRedo === '新竖排', sub);

  // 6b. Keyboard redo: Ctrl+Shift+Z works like Ctrl+Y; never fires while typing in a field.
  const keyText = async () => page.evaluate(() => canvas.getObjects().find(o => o.name === 'vtext').text);
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); canvas.discardActiveObject(); });
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(900);
  const kUndo = await keyText();
  await page.keyboard.press('Control+Shift+z');
  await page.waitForTimeout(900);
  const kRedo = await keyText();
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(900);
  await page.locator('#mangaGptPrompt').focus();
  await page.keyboard.press('Control+Shift+z');
  await page.waitForTimeout(900);
  const kInField = await keyText();
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Control+y');
  await page.waitForTimeout(900);
  const kCtrlY = await keyText();
  record('Ctrl+Shift+Z redoes (like Ctrl+Y), ignored while typing in a text field',
    kUndo === '竖排台词' && kRedo === '新竖排' && kInField === '竖排台词' && kCtrlY === '新竖排', { kUndo, kRedo, kInField, kCtrlY });

  // 7. History round trip and project save / reload keep patch geometry and metadata.
  const hist = await page.evaluate(async () => {
    const count = () => canvas.getObjects().filter(o => o.mangaGptSource).length;
    const start = count();
    const wait = () => new Promise(r => setTimeout(r, 700));
    let steps = 0;
    while (count() >= start && steps < 12) { undo(); await wait(); steps++; }
    const mid = count();
    // Two more steps back, then forward through the whole history again.
    undo(); await wait(); undo(); await wait(); steps += 2;
    for (let i = 0; i < steps; i++) { redo(); await wait(); }
    return { start, mid, end: count(), steps };
  });
  record('multi-step undo/redo restores GPT patches', hist.start === hist.end && hist.mid < hist.start, hist);
  const beforeSave = await snapshot(page);
  const saved = await page.evaluate(async () => {
    const meta = () => canvas.getObjects().filter(o => o.mangaGptSource).map(o =>
      [o.name, o.mangaGptSource, o.mangaGptCrop && Math.round(o.mangaGptCrop.x), Math.round(o.width), Math.round(o.getScaledWidth()), Math.round(o.left)]);
    const before = meta();
    const r = await generateBlobProjectFile();
    allRemove();
    await loadLz4BlobProjectFile(r.lz4Blob);
    await new Promise(res => setTimeout(res, 3000));
    return { before, after: meta(), bytes: r.lz4Blob.size };
  });
  const afterLoad = await snapshot(page);
  const reloadDiff = await compare(page, beforeSave, afterLoad, { left: 0, top: 0, width: 0, height: 0 });
  record('project save/reload keeps GPT patch name/source/crop and identical pixels',
    JSON.stringify(saved.before) === JSON.stringify(saved.after) && saved.after.length > 0 &&
    saved.after.every(m => m[0] && m[0].startsWith('GPT') && m[1] === 'openai-compatible-image') &&
    reloadDiff.outsideChanged === 0, { saved, reloadDiff });
  const exported = await page.evaluate(async () => {
    const l = await getCropAndDownloadLinkByMultiplier(1, 'png');
    const i = new Image(); i.src = l.href; await i.decode(); return [i.width, i.height];
  });
  record('PNG export keeps page resolution', exported[0] === 1654 && exported[1] === 2339, exported);

  // 8. Error handling, cancel and repeated generations.
  mock.fail = { status: 502, error: '上游 HTTP 429：rate limited' };
  await dragSelect(page, [240, 380], [840, 680]);
  await page.locator('#mangaGptGenerate').click();
  await page.waitForFunction(() => !document.querySelector('#mangaGptGenerate').disabled);
  status = await page.locator('#mangaGptStatus').textContent();
  record('upstream 429 surfaces readable error, apply stays disabled',
    /429/.test(status) && await page.locator('#mangaGptApply').isDisabled(), { status });
  mock.fail = null; mock.delayMs = 4000;
  await page.locator('#mangaGptGenerate').click();
  await page.waitForTimeout(300);
  await page.locator('#mangaGptCancel').click();
  await page.waitForFunction(() => !document.querySelector('#mangaGptGenerate').disabled);
  status = await page.locator('#mangaGptStatus').textContent();
  record('cancel button aborts an in-flight request', /已取消/.test(status), { status });
  mock.delayMs = 0;
  const heapBefore = await heap();
  for (let i = 0; i < 10; i++) {
    await page.locator('#mangaGptGenerate').click();
    await page.waitForFunction(() => !document.querySelector('#mangaGptGenerate').disabled);
  }
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  const heapAfter = await heap();
  record('10 consecutive mock generations, heap growth < 80 MB',
    heapAfter - heapBefore < 80 * 1024 * 1024, { heapMB: [heapBefore / 1048576, heapAfter / 1048576].map(v => Math.round(v)) });

  // 9. Landscape and square pages, plus editor zoom.
  for (const [w, h] of [[2339, 1654], [2000, 2000]]) {
    await page.evaluate(([w, h]) => { resizeCanvasByNum(w, h); canvas.renderAll(); }, [w, h]);
    await page.waitForTimeout(500);
    await dragSelect(page, [400, 400], [1000, 700]);
    const before = await snapshot(page);
    r = await generateAndApply(page);
    info = await patchInfo(page);
    const diff = await compare(page, before, await snapshot(page),
      { left: info.left, top: info.top, width: Math.round(info.w), height: Math.round(info.h) });
    record(`page ${w}x${h}: edit applies with uniform scale, outside untouched`, r.applied &&
      uniform(info) && diff.outsideChanged === 0, { info, diff });
  }
  await page.evaluate(() => { zoomIn(); zoomIn(); });
  await page.waitForTimeout(500);
  status = await dragSelect(page, [400, 400], [700, 600]);
  record('selection after zooming in maps to page pixels (±2px)', near(status, 300, 200), { status });
  await page.evaluate(() => zoomFit());
  await page.screenshot({ path: path.join(OUT, 'final.png') });

  // 9b. Extreme forced aspect: the guard switches to the closest API aspect and says so.
  await page.locator('#mangaGptSize').selectOption('1024x1536');
  await dragSelect(page, [300, 300], [1100, 500]);
  await page.locator('#mangaGptGenerate').click();
  await page.waitForFunction(() => !document.querySelector('#mangaGptGenerate').disabled, null, { timeout: 30000 });
  const guardOn = { size: mock.calls.at(-1).size, status: await page.locator('#mangaGptStatus').textContent() };
  await page.locator('#mangaGptAspectGuard').setChecked(false);
  await page.locator('#mangaGptGenerate').click();
  await page.waitForFunction(() => !document.querySelector('#mangaGptGenerate').disabled, null, { timeout: 30000 });
  const guardOff = { size: mock.calls.at(-1).size, status: await page.locator('#mangaGptStatus').textContent() };
  await page.locator('#mangaGptAspectGuard').setChecked(true);
  await page.locator('#mangaGptSize').selectOption('auto');
  record('extreme forced aspect (800x200 into 2:3) auto-switches to 3:2; opt-out keeps size and warns',
    guardOn.size === '1536x1024' && /已自动改用 1536x1024/.test(guardOn.status) &&
    guardOff.size === '1024x1536' && /重新构图/.test(guardOff.status), { guardOn, guardOff });

  // 9c. Selection that cuts a character object: warning + one-click expansion to the whole object.
  await page.evaluate(async () => {
    const art = document.createElement('canvas'); art.width = 300; art.height = 300;
    const g = art.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 300, 300);
    const img = await new Promise(res => fabric.Image.fromURL(art.toDataURL('image/png'), res));
    img.set({ left: 400, top: 1000, name: 'hero' });
    canvas.add(img); canvas.renderAll();
  });
  status = await dragSelect(page, [250, 1050], [550, 1250]);
  const cutWarn = { status, expandVisible: await page.locator('#mangaGptExpand').isVisible() };
  await page.locator('#mangaGptExpand').click();
  const expanded = { status: await page.locator('#mangaGptStatus').textContent(),
    expandVisible: await page.locator('#mangaGptExpand').isVisible() };
  r = await generateAndApply(page);
  info = await patchInfo(page);
  await page.evaluate(() => undo());
  await page.waitForTimeout(800);
  record('selection cutting an object warns and expands to the whole object (450x300), then applies',
    /只框到了 1 个对象/.test(cutWarn.status) && /hero/.test(cutWarn.status) && cutWarn.expandVisible &&
    /已扩展到完整对象：45[01] × 300/.test(expanded.status) && !expanded.expandVisible &&
    r.applied && Math.abs(info.left - 250) <= 1 && info.top === 1000 && Math.abs(info.w - 450) <= 2 && info.h === 300,
    { cutWarn, expanded, info: info && { left: info.left, top: info.top, w: info.w, h: info.h } });
  await page.evaluate(() => { const h = canvas.getObjects().find(o => o.name === 'hero'); if (h) canvas.remove(h); canvas.renderAll(); });

  // 9d. Transparency: a partly transparent selection keeps its transparent pixels (opt-out paints them).
  const bg = await page.evaluate(() => { const b = canvas.backgroundColor; canvas.backgroundColor = ''; canvas.renderAll(); return b; });
  await page.evaluate(async () => {
    const art = document.createElement('canvas'); art.width = 300; art.height = 300;
    const g = art.getContext('2d'); g.fillStyle = '#2a6'; g.fillRect(0, 0, 150, 300); // right half transparent
    const img = await new Promise(res => fabric.Image.fromURL(art.toDataURL('image/png'), res));
    img.set({ left: 1680, top: 1400, name: 'cutout' });
    canvas.add(img); canvas.renderAll();
  });
  const alphaAt = (x, y) => page.evaluate(async ([x, y]) => {
    const i = new Image(); i.src = canvas.toDataURL({ format: 'png', multiplier: 1 }); await i.decode();
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
    const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(x, y, 1, 1).data[3];
  }, [x, y]);
  const alpha = {};
  for (const keep of [true, false]) {
    await page.locator('#mangaGptKeepAlpha').setChecked(keep);
    await dragSelect(page, [1680, 1400], [1980, 1700]);
    const res = await generateAndApply(page);
    const pi = await patchInfo(page);
    alpha[keep ? 'keep' : 'off'] = { applied: res.applied, hole: await alphaAt(1900, 1550), solid: await alphaAt(1720, 1550),
      flag: pi && pi.crop && pi.crop.keepAlpha, status: res.status };
    await page.evaluate(() => undo());
    await page.waitForTimeout(800);
  }
  await page.locator('#mangaGptKeepAlpha').setChecked(true);
  await page.evaluate(b => { const o = canvas.getObjects().find(x => x.name === 'cutout'); if (o) canvas.remove(o);
    canvas.backgroundColor = b; canvas.renderAll(); }, bg);
  record('region apply keeps the original transparency mask (opt-out fills it)',
    alpha.keep.applied && alpha.keep.hole === 0 && alpha.keep.solid === 255 && alpha.keep.flag === true &&
    /恢复透明/.test(alpha.keep.status) && alpha.off.applied && alpha.off.hole === 255 && alpha.off.flag === false, alpha);

  // 10. Smart manga text: real Chromium/Fabric UI, fake OCR only, no model charges.
  await page.evaluate(() => {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    const gpt = document.getElementById('mangaGptPanel');
    if (gpt) gpt.hidden = true;
  });
  let smartOcrCalls = 0;
  await page.route('**/manga-smart/ocr', route => {
    smartOcrCalls++;
    const payload = route.request().postDataJSON();
    assert(/^data:image\/png;base64,/.test(payload.image));
    assert.equal(payload.language, 'jpn+eng');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, width: 2000, height: 2000,
      regions: [{ text: '旧对白', x: 140, y: 220, width: 180, height: 65, confidence: 95 }]
    }) });
  });
  await page.locator('#mangaSmartOpen').click();
  await page.locator('#mangaSmartDetect').click();
  await page.locator('.manga-smart-item textarea').waitFor({ timeout: 20000 });
  let mangaRefineCalls=0;
  await page.route('**/manga-smart/manga-ocr', route=>{
    mangaRefineCalls++;
    const payload=route.request().postDataJSON();
    assert(/^data:image\/png;base64,/.test(payload.image));
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      ok:true,engine:'manga-ocr-local',width:240,height:105,
      text:'ありがとう',verified:false
    })});
  });
  const aiCallsBeforeRefine=mock.calls.length;
  await page.locator('.manga-smart-item button').filter({hasText:'Manga OCR 精修'}).click();
  await page.waitForFunction(()=>document.querySelector('.manga-smart-item textarea')?.value==='ありがとう',
    null,{timeout:18000});
  record('optional Manga OCR refines an editable OCR draft without changing canvas or billing GPT',
    mangaRefineCalls===1 && mock.calls.length===aiCallsBeforeRefine,
    {mangaRefineCalls,aiCalls:mock.calls.length});
  await page.locator('.manga-smart-item textarea').fill('新的台词');
  await page.locator('#mangaSmartApply').click();
  await page.waitForFunction(() => canvas.getObjects().some(o => o.mangaSmartText === 'editable-subtitle'),
    null, { timeout: 25000 });
  const smartText = await page.evaluate(() => {
    const objects = canvas.getObjects();
    const text = objects.find(o => o.mangaSmartText === 'editable-subtitle');
    const erase = objects.find(o => o.mangaSmartText === 'erase-patch');
    const save = JSON.stringify(customToJSON());
    return { text: text?.text, editable: text?.type === 'textbox',
      erased: erase?.type === 'image', persisted: save.includes('mangaSmartText'),
      width: canvas.getWidth(), height: canvas.getHeight() };
  });
  record('smart OCR -> edit -> uniform bubble erase -> editable persistent Fabric subtitle',
    smartOcrCalls === 1 && smartText.text === '新的台词' && smartText.editable &&
    smartText.erased && smartText.persisted && smartText.width === 2000 && smartText.height === 2000,
    { smartOcrCalls, smartText });
  const beforeUndoSmart = await page.evaluate(() => canvas.getObjects().length);
  await page.evaluate(() => undo());
  await page.waitForFunction(before => canvas.getObjects().length < before, beforeUndoSmart, { timeout: 20000 });
  await page.evaluate(() => redo());
  await page.waitForFunction(before => canvas.getObjects().length === before, beforeUndoSmart,
    { timeout: 20000 });
  record('smart subtitle applies as one undo/redo history step', true, { restoredObjects: beforeUndoSmart });
  await page.screenshot({ path: path.join(OUT, 'smart-subtitle.png') });

  // Complex artwork must never be silently painted over by the white-bubble eraser.
  await page.evaluate(async () => {
    canvas.clear();
    const cv = document.createElement('canvas');
    cv.width = 2000; cv.height = 2000;
    const g = cv.getContext('2d');
    g.fillStyle = '#080c22'; g.fillRect(0, 0, 2000, 2000);
    g.fillStyle = '#ffd733'; g.fillRect(0, 0, 2000, 250);
    g.fillStyle = '#c82390'; g.fillRect(0, 260, 2000, 280);
    const img = await new Promise(resolve => fabric.Image.fromURL(cv.toDataURL('image/png'), resolve));
    canvas.add(img);
    canvas.backgroundColor = '#fff';
    canvas.renderAll();
  });
  await page.locator('#mangaSmartDetect').click();
  await page.locator('.manga-smart-item textarea').waitFor({ timeout: 10000 });
  const objectsBeforeUnsafe = await page.evaluate(() => canvas.getObjects().length);
  await page.locator('#mangaSmartApply').click();
  const unsafeResult = {
    message: await page.locator('#mangaSmartStatus').textContent(),
    count: await page.evaluate(() => canvas.getObjects().length)
  };
  record('smart erase refuses complex artwork rather than painting it white',
    unsafeResult.count === objectsBeforeUnsafe && /没有安全的自动去字区域/.test(unsafeResult.message),
    unsafeResult);
  await page.locator('.manga-smart-item label').filter({ hasText: '自动去字' }).locator('input').uncheck();
  await page.locator('#mangaSmartApply').click();
  const manualText = await page.evaluate(() => ({
    text: canvas.getObjects().find(o => o.mangaSmartText === 'editable-subtitle')?.text,
    erased: canvas.getObjects().some(o => o.mangaSmartText === 'erase-patch')
  }));
  record('smart subtitle can add editable text without erasing complex art',
    manualText.text === '旧对白' && !manualText.erased, manualText);

  // Local LaMa: use a fake identity inpainting model, but REAL canvas crop,
  // rectangle mask, human preview and non-destructive Fabric overlay.
  let lamaCalls=0,lamaMaskUrl='';
  await page.route('**/manga-smart/lama-inpaint',route=>{
    lamaCalls++;
    const payload=route.request().postDataJSON();
    assert(/^data:image\/png;base64,/.test(payload.image));
    assert(/^data:image\/png;base64,/.test(payload.mask));
    lamaMaskUrl=payload.mask;
    const b=Buffer.from(payload.image.split(',')[1],'base64');
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      ok:true,engine:'simple-lama-local',applied:false,verified:false,
      width:b.readUInt32BE(16),height:b.readUInt32BE(20),image:payload.image
    })});
  });
  await page.locator('#mangaSmartDetect').click();
  await page.locator('.manga-smart-item textarea').waitFor({timeout:10000});
  const beforeLama=await page.evaluate(()=>canvas.getObjects().length);
  const paidCallsBeforeLama=mock.calls.length;
  await page.locator('.manga-smart-item button').filter({hasText:'本地 LaMa 去字'}).click();
  await page.locator('#mangaLamaMaskCanvas').waitFor({timeout:16000});
  await page.waitForFunction(()=>document.getElementById('mangaLamaMaskCanvas').width>10,
    null,{timeout:16000});
  const beforeLamaMask=await page.evaluate(()=>({
    count:canvas.getObjects().length,
    visible:!document.getElementById('mangaLamaPreviewPanel').hidden,
    disabled:document.getElementById('mangaLamaConfirm').disabled
  }));
  record('LaMa mask editor does not auto-initialize a model or change canvas',
    lamaCalls===0 && beforeLamaMask.visible && beforeLamaMask.disabled &&
    beforeLamaMask.count===beforeLama,beforeLamaMask);
  await page.locator('#mangaLamaAutoInk').click();
  const inkAttempt=await page.evaluate(()=>({
    count:canvas.getObjects().length,
    confirmDisabled:document.getElementById('mangaLamaConfirm').disabled,
    status:document.getElementById('mangaLamaStatus').textContent
  }));
  record('local text ink mask proposal is explicit, non-billable and never commits a layer',
    lamaCalls===0 && inkAttempt.count===beforeLama && inkAttempt.confirmDisabled &&
    /候选蒙版|无法安全提取/.test(inkAttempt.status) &&
    mock.calls.length===paidCallsBeforeLama,inkAttempt);
  await page.locator('#mangaLamaReset').click();
  await page.locator('#mangaLamaErase').click();
  const maskBounds=await page.locator('#mangaLamaMaskCanvas').boundingBox();
  // Simulate a FAST pen stroke spanning > 4 brush diameters with just two
  // pointermove samples. The mask must interpolate so the center is protected.
  await page.mouse.move(maskBounds.x+maskBounds.width*.35,maskBounds.y+maskBounds.height*.5);
  await page.mouse.down();
  await page.mouse.move(maskBounds.x+maskBounds.width*.65,maskBounds.y+maskBounds.height*.5,
    {steps:2});
  await page.mouse.up();
  record('manual LaMa mask correction does not call the model before explicit preview',
    lamaCalls===0 && mock.calls.length===paidCallsBeforeLama,{lamaCalls});
  await page.locator('#mangaLamaGenerate').click();
  await page.waitForFunction(()=>!document.getElementById('mangaLamaConfirm').disabled,
    null,{timeout:25000});
  const maskContents=await page.evaluate(async url=>{
    const img=await new Promise((resolve,reject)=>{
      const element=new Image();
      element.onload=()=>resolve(element);
      element.onerror=reject;
      element.src=url;
    });
    const cv=document.createElement('canvas');
    cv.width=img.width;cv.height=img.height;
    const ctx=cv.getContext('2d');
    ctx.drawImage(img,0,0);
    const sample=x=>ctx.getImageData(Math.floor(cv.width*x),Math.floor(cv.height*.5),1,1).data[0];
    return {center:sample(.5),left:sample(.39),right:sample(.61),
      width:cv.width,height:cv.height};
  },lamaMaskUrl);
  record('LaMa backend receives user-edited mask with preserved center pixels',
    lamaCalls===1 && maskContents.center===0 &&
    maskContents.left===0 && maskContents.right===0,maskContents);
  const previewLama=await page.evaluate(()=>({
    count:canvas.getObjects().length,
    visible:!document.getElementById('mangaLamaPreviewPanel').hidden,
    imageVisible:!document.getElementById('mangaLamaPreviewImg').hidden
  }));
  record('local LaMa preview never changes the original canvas before confirmation',
    lamaCalls===1 && previewLama.visible && previewLama.imageVisible &&
    previewLama.count===beforeLama && mock.calls.length===paidCallsBeforeLama,
    previewLama);
  await page.locator('#mangaLamaConfirm').click();
  await page.waitForFunction(()=>canvas.getObjects().some(o=>o.mangaSmartText==='lama-erase-patch'),
    null,{timeout:20000});
  const appliedLama=await page.evaluate(()=>({
    objects:canvas.getObjects().length,
    layer:canvas.getObjects().find(o=>o.mangaSmartText==='lama-erase-patch')?.type,
    erase:window.MangaSmartTextEditor.getDrafts()[0]?.erase
  }));
  record('confirmed LaMa result is an independent erasable Fabric layer with no GPT charges',
    appliedLama.objects===beforeLama+1 && appliedLama.layer==='image' &&
    appliedLama.erase===false && mock.calls.length===paidCallsBeforeLama,appliedLama);
  await page.evaluate(()=>undo());
  await page.waitForFunction(n=>canvas.getObjects().length===n,beforeLama,{timeout:20000});
  await page.evaluate(()=>redo());
  await page.waitForFunction(n=>canvas.getObjects().length===n,beforeLama+1,{timeout:20000});
  record('local LaMa patch undo and redo works as a single history action',true);
  // Cancelling a mask adjustment must never create another layer or run inference.
  await page.locator('.manga-smart-item button').filter({hasText:'本地 LaMa 去字'}).click();
  await page.waitForFunction(()=>document.getElementById('mangaLamaMaskCanvas').width>10,
    null,{timeout:15000});
  await page.locator('#mangaLamaCancel').click();
  const afterCancel=await page.evaluate(()=>({
    hidden:document.getElementById('mangaLamaPreviewPanel').hidden,
    count:canvas.getObjects().length
  }));
  record('cancelled LaMa mask leaves the saved page unchanged and never invokes model',
    afterCancel.hidden && afterCancel.count===beforeLama+1 && lamaCalls===1,
    {afterCancel,lamaCalls});


  // OCR coordinates are snapshot-based; modifying the picture while a draft is open
  // must not let it erase a different page state.
  await page.locator('#mangaSmartDetect').click();
  await page.locator('.manga-smart-item textarea').waitFor({ timeout: 10000 });
  await page.evaluate(() => {
    canvas.add(new fabric.Rect({ left: 20, top: 30, width: 130, height: 80, fill: '#020102' }));
    canvas.renderAll();
  });
  const beforeStale = await page.evaluate(() => canvas.getObjects().length);
  await page.locator('#mangaSmartApply').click();
  const stale = { status: await page.locator('#mangaSmartStatus').textContent(),
    count: await page.evaluate(() => canvas.getObjects().length) };
  record('OCR application rejects stale page pixels after a canvas edit',
    /画布在识别后被修改/.test(stale.status) && stale.count === beforeStale, stale);
  await page.locator('.manga-smart-item button').filter({ hasText: 'GPT 去字' }).click();
  const staged = await page.evaluate(() => ({
    panelOpen: !document.getElementById('mangaGptPanel').hidden,
    prompt: document.getElementById('mangaGptPrompt').value,
    mode: document.getElementById('mangaGptMode').value,
    selection: document.getElementById('mangaGptPreview').src.startsWith('data:image/')
  }));
  record('smart OCR can stage complex-background text removal in GPT without charging',
    staged.panelOpen && staged.mode === 'edit' && staged.selection &&
    /擦除框选范围内/.test(staged.prompt), staged);

  // Smart page structure: actual browser pixels, real inspector and GPT bridge.
  await page.evaluate(async () => {
    canvas.clear();
    canvas.backgroundColor='#ffffff';
    const bitmap=document.createElement('canvas');
    bitmap.width=2000; bitmap.height=2000;
    const g=bitmap.getContext('2d');
    g.fillStyle='#ffffff'; g.fillRect(0,0,2000,2000);
    g.fillStyle='#242424';
    g.fillRect(100,100,660,1800);
    g.fillRect(1240,100,660,1800);
    const img=await new Promise(resolve => fabric.Image.fromURL(bitmap.toDataURL('image/png'),resolve));
    canvas.add(img);canvas.renderAll();
  });
  await page.locator('#mangaPageOpen').click();
  await page.locator('#mangaPageAnalyze').click();
  await page.waitForFunction(() => window.MangaPageStructureUI?.getAnalysis()?.panels.length===2,
    null, {timeout:30000});
  const structure=await page.evaluate(() => {
    const graph=window.MangaPageStructureUI.getAnalysis();
    const markers=[...document.querySelectorAll('#mangaPageOverlay .manga-page-outline')];
    return {count:graph.panels.length, firstX:graph.panels[0].x,
      secondX:graph.panels[1].x, markers:markers.length,
      verified:graph.panels.map(x=>x.verified)};
  });
  record('actual page pixel scan detects two candidate panels and shows read-only overlays',
    structure.count===2 && structure.firstX>structure.secondX &&
    structure.markers===2 && structure.verified.every(x=>x===false),structure);
  const modelBeforePanel=mock.calls.length;
  // The OCR panel is separate and stays hidden until opened by a user.
  await page.locator('#mangaPageClose').click();
  await page.locator('#mangaSmartOpen').click();
  await page.locator('#mangaSmartDetect').click();
  await page.waitForFunction(() => {
    const g=window.MangaPageStructureUI.getAnalysis();
    return g && g.texts.length===1 && !!g.texts[0].panelId;
  },null,{timeout:20000});
  const linked=await page.evaluate(() => {
    const g=window.MangaPageStructureUI.getAnalysis();
    return {text:g.texts[0], bubbles:g.bubbleCandidates,
      label:document.querySelector('.manga-smart-item span')?.textContent};
  });
  record('OCR text linked to correct RTL panel; bubble region marked provisional',
    linked.text.panelId==='panel-2' && linked.bubbles.length===1 &&
    linked.bubbles[0].verified===false && linked.bubbles[0].source==='ocr-text-expansion' &&
    /第2格/.test(linked.label),linked);
  const bubbleMarkers=await page.evaluate(() =>
    [...document.querySelectorAll('#mangaPageOverlay .manga-page-bubble-outline')]
      .map(x=>({source:x.dataset.source,id:x.dataset.bubbleId})));
  record('actual browser renders tentative OCR bubble as dashed review-only overlay',
    bubbleMarkers.length===1 && bubbleMarkers[0].source==='ocr-text-expansion',bubbleMarkers);
  await page.locator('#mangaSmartClose').click();
  await page.locator('#mangaPageOpen').click();
  const bubbleBefore=await page.evaluate(()=>({
    rows:document.querySelectorAll('.manga-bubble-entry').length,
    contours:document.querySelectorAll('.manga-bubble-outline').length,
    verified:window.MangaPageStructureUI.getAnalysis().bubbleCandidates[0]?.verified
  }));
  await page.locator('.manga-bubble-entry').first().getByRole('button',{name:'确认候选'}).click();
  const bubbleAfter=await page.evaluate(()=>({
    verified:window.MangaPageStructureUI.getAnalysis().bubbleCandidates[0]?.verified,
    green:document.querySelectorAll('.manga-bubble-verified').length
  }));
  record('bubble candidates are visibly distinct, remain provisional until manually confirmed',
    bubbleBefore.rows===1 && bubbleBefore.contours===1 && bubbleBefore.verified===false &&
    bubbleAfter.verified===true && bubbleAfter.green===1,
    {bubbleBefore,bubbleAfter});
  await page.locator('.manga-page-entry').first().getByRole('button',{name:'GPT 编辑本格'}).click();
  const handoff=await page.evaluate(() => ({
    gptOpen:!document.getElementById('mangaGptPanel').hidden,
    status:document.getElementById('mangaGptStatus').textContent,
    preview:document.getElementById('mangaGptPreview').src.startsWith('data:image/')
  }));
  record('panel selection bridges to GPT without a billable API request',
    handoff.gptOpen && handoff.preview && /已定位第 1 格/.test(handoff.status) &&
    mock.calls.length===modelBeforePanel,handoff);
  await page.screenshot({path:path.join(OUT,'page-structure.png')});
  await page.locator('#mangaPageOpen').click();
  await page.locator('#mangaPageShowBubbles').uncheck();
  const hiddenBubbles=await page.evaluate(()=>
    document.querySelectorAll('#mangaPageOverlay .manga-page-bubble-outline').length);
  await page.locator('#mangaPageShowBubbles').check();
  const visibleBubbles=await page.evaluate(()=>
    document.querySelectorAll('#mangaPageOverlay .manga-page-bubble-outline').length);
  record('bubble candidates can be shown/hidden independently of panel overlays',
    hiddenBubbles===0 && visibleBubbles===1,{hiddenBubbles,visibleBubbles});
  await page.locator('#mangaPageDirection').selectOption('ltr');
  await page.locator('#mangaPageAnalyze').click();
  await page.waitForFunction(() => window.MangaPageStructureUI.getAnalysis()?.panels[0].x < 500,
    null, {timeout:25000});
  record('page inspector switches Japanese RTL / comic LTR numbering',true);
  await page.locator('.manga-page-entry').first().getByRole('button',{name:'左右拆分'}).click();
  const splitPreview=await page.evaluate(() => {
    const graph=window.MangaPageStructureUI.getAnalysis();
    return {count:graph.panels.length,verified:graph.panels.filter(p=>p.verified).length,
      shapes:document.querySelectorAll('#mangaPageOverlay .manga-page-outline').length};
  });
  record('manually split borderless comic frame and update overlay',
    splitPreview.count===3 && splitPreview.verified===2 && splitPreview.shapes===3,splitPreview);
  await page.locator('.manga-page-entry').first().getByRole('button',{name:'删除误识别'}).click();
  const afterDelete=await page.evaluate(() => ({
    count:window.MangaPageStructureUI.getAnalysis().panels.length,
    markers:document.querySelectorAll('#mangaPageOverlay .manga-page-outline').length
  }));
  record('delete false-positive frame and keep remaining panel IDs consistent',
    afterDelete.count===2 && afterDelete.markers===2,afterDelete);
  // Preview-first natural-language planner: never modify before explicit confirmation.
  await page.evaluate(() => { document.getElementById('mangaGptPanel').hidden = true; });
  await page.locator('#mangaPlannerInput').fill('修改第一格和第二格的背景');
  await page.locator('#mangaPlannerPreviewBtn').click();
  const ambiguous={
    status:await page.locator('#mangaPlannerStatus').textContent(),
    confirmDisabled:await page.locator('#mangaPlannerConfirm').isDisabled()
  };
  record('natural-language editor rejects multi-panel command without creating an action',
    ambiguous.confirmDisabled && /一次只修改一格/.test(ambiguous.status),ambiguous);
  const callsBeforeNL=mock.calls.length;
  await page.locator('#mangaPlannerInput').fill('把第一格的天空改成夜景，保留人物和对白');
  await page.locator('#mangaPlannerPreviewBtn').click();
  const draft=await page.evaluate(()=>({
    description:document.getElementById('mangaPlannerPreview').textContent,
    gptOpen:!document.getElementById('mangaGptPanel').hidden
  }));
  record('NL edit plan preview does not open model editor or bill user',
    /整格 GPT 编辑预览/.test(draft.description) &&
    !draft.gptOpen && mock.calls.length===callsBeforeNL,draft);
  await page.locator('#mangaPlannerConfirm').click();
  const naturalPlan=await page.evaluate(()=>({
    prompt:document.getElementById('mangaGptPrompt').value,
    gptOpen:!document.getElementById('mangaGptPanel').hidden,
    inspectorHidden:document.getElementById('mangaPagePanel').hidden,
    status:document.getElementById('mangaGptStatus').textContent
  }));
  record('explicit Chinese panel command stages edit prompt only after user confirmation',
    naturalPlan.prompt==='把第一格的天空改成夜景，保留人物和对白' &&
    naturalPlan.gptOpen && naturalPlan.inspectorHidden &&
    /已定位第 1 格/.test(naturalPlan.status) &&
    mock.calls.length===callsBeforeNL,naturalPlan);
  await page.locator('#mangaPageOpen').click();
  await page.locator('#mangaPlannerInput').fill('第二格把蓝发少女换成参考图人物，保留动作和对白');
  await page.locator('#mangaPlannerPreviewBtn').click();
  const characterPreview=await page.locator('#mangaPlannerPreview').textContent();
  record('character edit warns model cannot automatically locate character',
    /必须手动框选/.test(characterPreview), {characterPreview});
  await page.locator('#mangaPlannerConfirm').click();
  const manualMode=await page.evaluate(()=>({
    overlay:!!document.querySelector('.manga-gpt-selection'),
    previewSrc:document.getElementById('mangaGptPreview').getAttribute('src'),
    prompt:document.getElementById('mangaGptPrompt').value
  }));
  record('character edit requires a fresh manual selection and invalidates previous GPT crop',
    manualMode.overlay && !manualMode.previewSrc && /蓝发少女/.test(manualMode.prompt) &&
    mock.calls.length===callsBeforeNL,manualMode);
  await page.keyboard.press('Escape');
  await page.locator('#mangaPageOpen').click();
  await page.locator('#mangaPlannerInput').fill('第二格的对白改成“早上好”');
  await page.locator('#mangaPlannerPreviewBtn').click();
  const subtitlePreview=await page.locator('#mangaPlannerPreview').textContent();
  await page.locator('#mangaPlannerConfirm').click();
  const subtitleRoute=await page.evaluate(()=>({
    smartOpen:!document.getElementById('mangaSmartTextPanel').hidden,
    plannerClosed:document.getElementById('mangaPagePanel').hidden
  }));
  record('dialogue edit routes to editable smart text without a GPT generation',
    /进入原生智能字幕/.test(subtitlePreview) &&
    subtitleRoute.smartOpen && subtitleRoute.plannerClosed &&
    mock.calls.length===callsBeforeNL,subtitleRoute);
  await page.locator('#mangaSmartClose').click();

  // Character Bible: actual Chromium file selection -> image downscale ->
  // IndexedDB -> GPT reference staging. No model request or extra charge.
  const characterCallsBefore=mock.calls.length;
  const tinyPhoto=Buffer.from((await page.evaluate(() => {
    const cv=document.createElement('canvas');
    cv.width=320;cv.height=400;
    const ct=cv.getContext('2d');
    ct.fillStyle='#dbb7a3';ct.fillRect(0,0,320,400);
    ct.fillStyle='#272a42';ct.fillRect(90,30,140,140);
    return cv.toDataURL('image/png');
  })).split(',')[1],'base64');
  await page.locator('#mangaCharacterOpen').click();
  await page.locator('#mangaCharacterName').fill('测试角色A');
  await page.locator('#mangaCharacterTraits').fill('金色太阳眼镜、黑色制服、紫色头发');
  await page.locator('#mangaCharacterNotes').fill('保留原漫画动作');
  await page.locator('#mangaCharacterPhotos').setInputFiles({
    name:'reference.png',mimeType:'image/png',buffer:tinyPhoto
  });
  await page.locator('#mangaCharacterSave').click();
  await page.locator('.manga-character-card').first().waitFor({ timeout:18000 });
  const locallySaved=await page.evaluate(()=>window.MangaCharacterBibleUI.list());
  record('character reference persists in browser-local database with private card fields',
    locallySaved.length===1 && locallySaved[0].name==='测试角色A' &&
    locallySaved[0].referenceCount===1 && mock.calls.length===characterCallsBefore,
    {locallySaved,modelCalls:mock.calls.length});
  await page.evaluate(() => {
    const mode=document.getElementById('mangaGptMode');
    mode.value='generate';
    mode.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('.manga-character-card button').filter({hasText:'用于 GPT 改图'}).click();
  const gptCharacter=await page.evaluate(()=>({
    summary:window.MangaGPTRegionEditor.referenceSummary(),
    mode:document.getElementById('mangaGptMode').value,
    prompt:document.getElementById('mangaGptPrompt').value,
    list:document.getElementById('mangaGptReferenceList').textContent
  }));
  record('Character Bible attaches reference image and traits to GPT editor without generating',
    gptCharacter.summary.count===1 && gptCharacter.mode==='edit' &&
    gptCharacter.summary.character==='测试角色A' &&
    /金色太阳眼镜/.test(gptCharacter.prompt) &&
    /1 张参考图/.test(gptCharacter.list) &&
    mock.calls.length===characterCallsBefore,gptCharacter);
  // Choosing the same character again must not pile up contradictory traits.
  await page.locator('#mangaCharacterOpen').click();
  await page.locator('.manga-character-card button').filter({hasText:'用于 GPT 改图'}).click();
  const notDuplicated=await page.evaluate(()=>{
    const p=document.getElementById('mangaGptPrompt').value;
    return p.split('【角色参考档案：测试角色A】').length - 1;
  });
  record('switching/reselecting a character does not accumulate duplicate constraints',
    notDuplicated===1,{occurrences:notDuplicated});
  // Explicitly click Generate against the in-process fake image server.
  // Verify the saved reference is actually serialized into the GPT request.
  const selected=await page.evaluate(()=>window.MangaGPTRegionEditor.selectRegionForPanel(
    {x:160,y:160,width:240,height:240,order:1}));
  assert(selected,'should be able to set a safe mock edit region');
  await page.locator('#mangaGptGenerate').click();
  await page.waitForFunction(before=>document.getElementById('mangaGptApply').disabled===false &&
    !!document.getElementById('mangaGptPreview').src, null,{timeout:30000});
  const refRequest=mock.calls[mock.calls.length-1];
  record('saved Character Bible image reaches mocked GPT edit payload only after Generate click',
    mock.calls.length===characterCallsBefore+1 &&
    refRequest.refs===1 && refRequest.operation==='edit' && refRequest.auth,
    {modelCalls:mock.calls.length,refs:refRequest.refs,operation:refRequest.operation});
  // Manual file selection must replace card references *and* remove its
  // prompt constraints, so users cannot accidentally send the previous character.
  await page.locator('#mangaGptReferences').setInputFiles({
    name:'new-person.png',mimeType:'image/png',buffer:tinyPhoto
  });
  await page.waitForFunction(()=>window.MangaGPTRegionEditor.referenceSummary().character==='',
    null,{timeout:15000});
  const replaced=await page.evaluate(()=>({
    summary:window.MangaGPTRegionEditor.referenceSummary(),
    prompt:document.getElementById('mangaGptPrompt').value
  }));
  record('manual reference upload clears previous Character Bible identity and trait prompt',
    replaced.summary.count===1 && replaced.summary.character==='' &&
    !replaced.prompt.includes('【角色参考档案：测试角色A】') &&
    mock.calls.length===characterCallsBefore+1,replaced);
  await page.screenshot({path:path.join(OUT,'character-bible.png')});

  // 10. Two editor tabs side by side.
  const page2 = await openEditor(context);
  const two = await page2.evaluate(() => ({ w: canvas.getWidth(), panel: !!document.getElementById('mangaGptOpen') }));
  record('second editor tab loads independently', two.w > 0 && two.panel, two);
  await page2.locator('#mangaCharacterOpen').click();
  await page2.locator('.manga-character-card').first().waitFor({ timeout:15000 });
  const acrossTabs=await page2.evaluate(()=>window.MangaCharacterBibleUI.list());
  record('Character Bible survives opening another page/tab on the same local origin',
    acrossTabs.length===1 && acrossTabs[0].name==='测试角色A',{acrossTabs});

  record('mock model received the UI key, never a .env key', mock.calls.every(c => c.auth), { calls: mock.calls.length });
  record('no uncaught page errors', pageErrors.length === 0, { pageErrors: pageErrors.slice(0, 5) });
}

run().then(() => console.log('PASS real Chromium GPT acceptance (' + results.length + ' checks)'))
  .catch(err => { console.error(err.stack || err); process.exitCode = 1; })
  .finally(async () => {
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ results, consoleErrors: consoleErrors.slice(0, 30), pageErrors }, null, 1));
    if (browser) await browser.close();
    if (server) server.kill();
  });
