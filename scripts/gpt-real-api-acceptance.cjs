// OPT-IN, BILLABLE real-API acceptance for the GPT region editor (never part of npm test / CI).
// Each case = exactly ONE real /gpt-image-proxy request through the real UI in Chromium.
//   GPT_REAL_API=1 GPT_TEST_ENV_FILE=/path/outside/repo/.env GPT_REAL_BASE_URL=https://relay/v1 \
//   GPT_REAL_MODEL=gpt-image-2 GPT_REAL_REFERENCE=/path/char.png GPT_REAL_CASES=A,B \
//   node scripts/gpt-real-api-acceptance.cjs
// The key is read from GPT_TEST_ENV_FILE (GPT_IMAGE_API_KEY=...) and handed only to the local
// server process environment; it is never printed, logged, put on a command line or into the page.
// GPT_REAL_MOCK=1 runs the identical flow against an in-browser identity model (free dry run).
// GPT_REAL_REPLAY=<dir> replays saved real results through the current code (free re-check).
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SERVER = 'http://127.0.0.1:8000';
const REPLAY = process.env.GPT_REAL_REPLAY || ''; // dir with <case>-result.png from an earlier real run (free)
const MOCK = process.env.GPT_REAL_MOCK === '1' || !!REPLAY;
if (!MOCK && process.env.GPT_REAL_API !== '1') {
  console.error('Refusing to run: set GPT_REAL_API=1 to confirm billable calls (or GPT_REAL_MOCK=1).');
  process.exit(2);
}
const OUT = path.join(ROOT, 'artifacts', REPLAY ? 'gpt-real-replay' : MOCK ? 'gpt-real-mock' : 'gpt-real');
fs.mkdirSync(OUT, { recursive: true });
const WAIT_MS = 400000; // > client 330 s > relay 300 s
const BASE_URL = process.env.GPT_REAL_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.GPT_REAL_MODEL || 'gpt-image-1';
const REFERENCE = process.env.GPT_REAL_REFERENCE || '';
const POSE = path.join(ROOT, '03_images/imgPromptHelper/novelai/pose-action-pose/回头看.png');
const CALL_LOG = process.env.GPT_REAL_CALL_LOG || path.join(OUT, 'calls.log');

const REPLACE = 'Replace the girl in this picture with the character from the reference image: short red hair, ' +
  'green eyes, yellow hooded raincoat, star-shaped hairpin. Keep exactly the same pose (looking back over the ' +
  'shoulder), position, size, framing, camera angle, plain gray background and clean anime line-art style. ' +
  'Do not add any text.';
const TEXT_ONLY = 'Change the girl in this picture into a character with short red hair, green eyes, a yellow hooded ' +
  'raincoat and a star-shaped hairpin. Keep exactly the same pose, position, size, framing, camera angle, plain gray ' +
  'background and clean anime line-art style. No text.';

const CASES = {
  A: { title: '竖选区≈2:3 + 参考图（角色替换 A）', from: [430, 320], to: [1230, 1560], size: 'auto', ref: true, prompt: REPLACE },
  B: { title: '同 A 选区，无参考图，仅文字描述（A/B 对照）', from: [430, 320], to: [1230, 1560], size: 'auto', ref: false, prompt: TEXT_ONLY },
  C: { title: '横选区 1000×570 → 3:2 补白 + 参考图', from: [330, 330], to: [1330, 900], size: 'auto', ref: true, prompt: REPLACE },
  D: { title: '方选区 450×450（脸部）→ 1:1 + 参考图', from: [600, 350], to: [1050, 800], size: 'auto', ref: true, prompt: REPLACE },
  E: { title: '竖选区 + 强制 1024×1024（交叉比例）+ 参考图', from: [430, 320], to: [1230, 1560], size: '1024x1024', ref: true, prompt: REPLACE },
  F: { title: '横选区 + 强制 1024×1536（极端交叉）+ 参考图', from: [330, 330], to: [1330, 900], size: '1024x1536', ref: true, prompt: REPLACE },
  G: { title: '页角选区含可编辑竖排字（默认排除文字）', from: [1150, 1300], to: [1654, 2339], size: 'auto', ref: false,
       prompt: 'Add light rain streaks and small puddles on the ground in this picture. Keep everything else the same. No text.' }
};

let server;
function portBusy(port) {
  return new Promise(resolve => {
    const s = net.connect(port, '127.0.0.1');
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
  });
}
function readKey() {
  if (MOCK) return '';
  const file = process.env.GPT_TEST_ENV_FILE;
  if (!file) throw new Error('GPT_TEST_ENV_FILE is required');
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find(l => l.startsWith('GPT_IMAGE_API_KEY='));
  const key = line ? line.slice('GPT_IMAGE_API_KEY='.length).trim() : '';
  if (!key) throw new Error('GPT_IMAGE_API_KEY missing in env file');
  return key;
}
async function startServer() {
  if (await portBusy(8000)) throw new Error('Port 8000 busy; not touching it.');
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  server = spawn(python, ['99_server.py'], {
    cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, NAI_QUIET: '1', GPT_IMAGE_API_KEY: readKey(), GPT_IMAGE_TRUSTED_BASE_URL: BASE_URL,
      NOVELAI_API_KEY: '', TOKENDANCE_API_KEY: '' }
  });
  let err = '';
  server.stderr.on('data', b => { err = (err + b).slice(-4000); });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(SERVER + '/index.html', { signal: AbortSignal.timeout(1000) })).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('server not ready');
}
function log(line) { fs.appendFileSync(CALL_LOG, line + '\n'); console.log(line); }
function stamp() { return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }); }
function saveDataUrl(dataUrl, file) {
  const m = /^data:image\/(\w+);base64,(.*)$/s.exec(dataUrl || '');
  if (!m) return null;
  const target = file + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
  fs.writeFileSync(target, Buffer.from(m[2], 'base64'));
  return target;
}

async function openEditor(context) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.locator('#mangaGptOpen').waitFor({ timeout: 90000 });
  await page.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0 && typeof fabric !== 'undefined' &&
    typeof saveStateByManual === 'function', null, { timeout: 90000 });
  const skip = page.locator('#tutorialSkipBtn');
  if (await skip.count() && await skip.isVisible()) await skip.click();
  await page.keyboard.press('Escape');
  return { page, errors };
}

async function buildScene(page) {
  const pose = 'data:image/png;base64,' + fs.readFileSync(POSE).toString('base64');
  await page.evaluate(async pose => {
    canvas.getObjects().filter(o => o.text === '拖放或生成图片').forEach(o => canvas.remove(o));
    const img = await new Promise(res => fabric.Image.fromURL(pose, res));
    img.set({ left: 190, top: 300, scaleX: 2.5, scaleY: 2.5, name: 'pose' });
    canvas.add(img);
    // Panel frame + gutter lines crossing several selections: seams/misalignment become visible.
    canvas.add(new fabric.Rect({ left: 120, top: 230, width: 1414, height: 1420, fill: '', stroke: '#111', strokeWidth: 10, name: 'frame' }));
    canvas.add(new fabric.Line([120, 1100, 1534, 1100], { stroke: '#111', strokeWidth: 6, name: 'gutter' }));
    canvas.add(new fabric.Rect({ left: 120, top: 1720, width: 1414, height: 560, fill: '#c9d6e3', stroke: '#111', strokeWidth: 10, name: 'panel2' }));
    const t = new fabric.VerticalTextbox('雨が降ってきた', { left: 1430, top: 1760, fontSize: 56, name: 'vtext' });
    canvas.add(t);
    canvas.discardActiveObject(); canvas.renderAll(); saveStateByManual();
  }, pose);
}

async function dragSelect(page, from, to) {
  await page.locator('#mangaGptSelect').click();
  const b = await page.evaluate(() => { const r = canvas.upperCanvasEl.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cw: canvas.getWidth(), ch: canvas.getHeight() }; });
  const px = p => ({ x: b.x + p[0] * b.w / b.cw, y: b.y + p[1] * b.h / b.ch });
  const a = px(from); const z = px(to);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(z.x, z.y, { steps: 8 }); await page.mouse.up();
  return page.evaluate(() => document.querySelector('#mangaGptStatus').textContent);
}

async function metrics(page, before, after, rect) {
  return page.evaluate(async ({ before, after, rect }) => {
    const load = async src => { const i = new Image(); i.src = src; await i.decode();
      const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
      const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
    const A = await load(before); const B = await load(after);
    // composite over white paper (what the page looks like / prints as)
    const px = (D, x, y) => { const i = (y * D.width + x) * 4; const a = D.data[i + 3] / 255;
      return [D.data[i] * a + 255 * (1 - a), D.data[i + 1] * a + 255 * (1 - a), D.data[i + 2] * a + 255 * (1 - a)]; };
    const d = (p, q) => (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2])) / 3;
    let outsideChanged = 0;
    for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
      if (x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height) continue;
      if (d(px(A, x, y), px(B, x, y))) outsideChanged++;
    }
    // Seam: mean |inside edge pixel - outside neighbour| on sides that are not the page border.
    const seam = D => { let s = 0, n = 0;
      const R = rect.left + rect.width, Bm = rect.top + rect.height;
      for (let y = rect.top; y < Bm; y++) {
        if (rect.left > 0) { s += d(px(D, rect.left, y), px(D, rect.left - 1, y)); n++; }
        if (R < D.width) { s += d(px(D, R - 1, y), px(D, R, y)); n++; }
      }
      for (let x = rect.left; x < R; x++) {
        if (rect.top > 0) { s += d(px(D, x, rect.top), px(D, x, rect.top - 1)); n++; }
        if (Bm < D.height) { s += d(px(D, x, Bm - 1), px(D, x, Bm)); n++; }
      }
      return n ? +(s / n).toFixed(2) : 0; };
    let inside = 0, n = 0;
    for (let y = rect.top; y < rect.top + rect.height; y += 2) for (let x = rect.left; x < rect.left + rect.width; x += 2) {
      inside += d(px(A, x, y), px(B, x, y)); n++; }
    return { outsideChanged, seamBefore: seam(A), seamAfter: seam(B), insideMeanDiff: +(inside / n).toFixed(2) };
  }, { before, after, rect });
}

async function runCase(context, id) {
  const spec = CASES[id];
  const { page, errors } = await openEditor(context);
  if (MOCK) {
    await page.route('**/gpt-image-proxy', async route => {
      const p = route.request().postDataJSON();
      if (REPLAY) {
        const file = path.join(REPLAY, id + '-result.png');
        const image = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, image }) });
      }
      const image = await page.evaluate(async ({ src, size }) => {
        const [w, h] = size.split('x').map(Number); const c = document.createElement('canvas'); c.width = w; c.height = h;
        const i = new Image(); i.src = src; await i.decode(); c.getContext('2d').drawImage(i, 0, 0, w, h);
        return c.toDataURL('image/png'); }, { src: p.image, size: p.size });
      await new Promise(r => setTimeout(r, 1500));
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, image }) });
    });
  }
  let requests = 0;
  page.on('request', req => {
    if (!req.url().includes('/gpt-image-proxy')) return;
    requests++;
    try {
      const p = req.postDataJSON();
      saveDataUrl(p.image, path.join(OUT, id + '-sent-letterboxed'));
      fs.writeFileSync(path.join(OUT, id + '-request.json'), JSON.stringify({ operation: p.operation, model: p.model,
        size: p.size, baseUrl: p.baseUrl, references: (p.references || []).length,
        authorizationHeader: Boolean(req.headers().authorization) }, null, 2));
    } catch {}
  });
  await buildScene(page);
  await page.locator('#mangaGptOpen').click();
  await page.locator('#mangaGptMode').selectOption('edit');
  await page.locator('#mangaGptUrl').fill(BASE_URL);
  await page.locator('#mangaGptModel').fill(MODEL);
  await page.locator('#mangaGptKey').fill(''); // relay uses the server-side env key (pinned base URL)
  await page.locator('#mangaGptSize').selectOption(spec.size);
  await page.locator('#mangaGptPrompt').fill(spec.prompt);
  if (spec.ref) await page.locator('#mangaGptReferences').setInputFiles(REFERENCE);
  const selStatus = await dragSelect(page, spec.from, spec.to);
  const region = await page.evaluate(() => {
    const m = /(\d+) × (\d+)/.exec(document.querySelector('#mangaGptStatus').textContent); return m && [+m[1], +m[2]]; });
  const before = await page.evaluate(() => canvas.toDataURL({ format: 'png', multiplier: 1 }));
  saveDataUrl(before, path.join(OUT, id + '-page-before'));
  const t0 = Date.now();
  const responseP = page.waitForResponse(r => r.url().includes('/gpt-image-proxy'), { timeout: WAIT_MS });
  await page.locator('#mangaGptGenerate').click();
  log(`${MOCK ? 'MOCK' : 'REAL'} CALL case ${id} sent ${stamp()} (${spec.title})`);
  const result = { id, title: spec.title, region, selStatus, size: spec.size, ref: spec.ref };
  let json = null;
  try {
    const response = await responseP;
    result.httpStatus = response.status();
    const text = await response.text();
    try { json = JSON.parse(text); } catch { result.error = 'non-JSON ' + text.slice(0, 200); }
  } catch (e) { result.error = 'no response: ' + e.message; }
  result.elapsedS = +((Date.now() - t0) / 1000).toFixed(1);
  if (json && json.ok && json.image) {
    result.resultFile = saveDataUrl(json.image, path.join(OUT, id + '-result')); // saved before anything else
  } else if (json) result.error = json.error;
  log(`  -> case ${id} HTTP ${result.httpStatus} in ${result.elapsedS}s ${result.resultFile ? 'saved ' + path.basename(result.resultFile) : 'ERROR ' + result.error}`);
  await page.waitForFunction(() => !document.querySelector('#mangaGptGenerate').disabled, null, { timeout: WAIT_MS });
  result.uiStatus = await page.evaluate(() => document.querySelector('#mangaGptStatus').textContent);
  result.requests = requests;
  try {
    result.request = JSON.parse(fs.readFileSync(path.join(OUT, id + '-request.json'), 'utf8'));
  } catch {}
  if (result.resultFile && !(await page.locator('#mangaGptApply').isDisabled())) {
    const dims = await page.evaluate(src => new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = src; }), json.image);
    result.resultSize = dims;
    await page.locator('#mangaGptAllowUpscale').setChecked(true);
    await page.locator('#mangaGptApply').click();
    await page.waitForFunction(() => canvas.getObjects().some(o => o.mangaGptSource) ||
      document.querySelector('#mangaGptStatus').dataset.error === 'true', null, { timeout: 60000 });
    result.applyStatus = await page.evaluate(() => document.querySelector('#mangaGptStatus').textContent);
    result.patch = await page.evaluate(() => {
      const o = canvas.getObjects(); const i = o.findIndex(x => x.mangaGptSource); const p = o[i];
      return p && { index: i, vtextIndex: o.findIndex(x => x.name === 'vtext'), left: p.left, top: p.top,
        w: +p.getScaledWidth().toFixed(2), h: +p.getScaledHeight().toFixed(2), scaleX: p.scaleX, scaleY: p.scaleY,
        srcW: +p.width.toFixed(1), srcH: +p.height.toFixed(1), crop: p.mangaGptCrop };
    });
    await page.evaluate(() => canvas.discardActiveObject() || canvas.renderAll());
    const after = await page.evaluate(() => canvas.toDataURL({ format: 'png', multiplier: 1 }));
    saveDataUrl(after, path.join(OUT, id + '-page-after'));
    const rect = result.patch && { left: Math.round(result.patch.left), top: Math.round(result.patch.top),
      width: Math.round(result.patch.w), height: Math.round(result.patch.h) };
    if (rect) result.metrics = await metrics(page, before, after, rect);
    // project save -> reload round trip
    const rt = await page.evaluate(async () => {
      const json = JSON.stringify(canvas.toJSON(commonProperties));
      const n = canvas.getObjects().length;
      await new Promise(res => canvas.loadFromJSON(json, res));
      canvas.renderAll();
      const p = canvas.getObjects().find(o => o.mangaGptSource);
      return { objects: [n, canvas.getObjects().length], name: p && p.name, source: p && p.mangaGptSource, bytes: json.length };
    });
    const reloaded = await page.evaluate(() => canvas.toDataURL({ format: 'png', multiplier: 1 }));
    result.saveReload = { ...rt, pixelsEqual: reloaded === after || (await metrics(page, after, reloaded, { left: 0, top: 0, width: 0, height: 0 })).outsideChanged === 0 };
    await page.screenshot({ path: path.join(OUT, id + '-ui.png') });
  }
  result.pageErrors = errors;
  fs.writeFileSync(path.join(OUT, id + '-summary.json'), JSON.stringify(result, null, 2));
  await page.close();
  return result;
}

(async () => {
  const ids = (process.env.GPT_REAL_CASES || 'A').split(',').map(s => s.trim()).filter(Boolean);
  if (ids.some(id => !CASES[id])) throw new Error('unknown case');
  if (ids.some(id => CASES[id].ref) && !fs.existsSync(REFERENCE)) throw new Error('GPT_REAL_REFERENCE missing');
  await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const all = [];
  try {
    for (const id of ids) {
      try { all.push(await runCase(context, id)); }
      catch (e) { const r = { id, crashed: e.message }; all.push(r); log(`  !! case ${id} script error: ${e.message}`); }
      fs.writeFileSync(path.join(OUT, 'summary-' + ids.join('') + '.json'), JSON.stringify(all, null, 2));
    }
  } finally {
    await browser.close();
    if (server) server.kill();
  }
  for (const r of all) console.log(JSON.stringify({ id: r.id, http: r.httpStatus, s: r.elapsedS, err: r.error || r.crashed,
    result: r.resultSize, region: r.region, patch: r.patch && [Math.abs(r.patch.scaleX / r.patch.scaleY - 1) < 0.002, r.patch.w, r.patch.h], m: r.metrics,
    sr: r.saveReload && r.saveReload.pixelsEqual, tone: r.patch && r.patch.crop && r.patch.crop.toneOffset, req: r.request && [r.request.size, r.request.references, r.request.authorizationHeader] }));
})().catch(e => { console.error(e.message); if (server) server.kill(); process.exit(1); });
