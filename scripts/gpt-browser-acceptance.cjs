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
    cwd: ROOT, env: { ...process.env, NAI_QUIET: '1', GPT_IMAGE_API_KEY: '', NOVELAI_API_KEY: '', TOKENDANCE_API_KEY: '' },
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

  // 10. Two editor tabs side by side.
  const page2 = await openEditor(context);
  const two = await page2.evaluate(() => ({ w: canvas.getWidth(), panel: !!document.getElementById('mangaGptOpen') }));
  record('second editor tab loads independently', two.w > 0 && two.panel, two);
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
