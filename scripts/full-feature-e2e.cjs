// Full-feature end-to-end walk-through in real Chromium against the real 99_server.py.
// Every step is isolated (a failure is recorded, the run continues) and leaves a screenshot
// in artifacts/e2e/. Kinds: UI = real browser + local code only, REAL = real model / API,
// MOCK = browser-side mocked API.
//   PYTHON=<python with tesseract/manga-ocr/simple-lama> node scripts/full-feature-e2e.cjs
//   E2E_REAL_GPT=1 GPT_TEST_ENV_FILE=<outside repo> GPT_REAL_BASE_URL=<relay>/v1 GPT_REAL_MODEL=gpt-image-2 \
//     E2E_REFERENCE=<character.png> node scripts/full-feature-e2e.cjs     (2 billable GPT calls)
// Keys are read from the env file and handed only to the local server process environment.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SERVER = 'http://127.0.0.1:8000';
const OUT = path.join(ROOT, 'artifacts', 'e2e');
fs.mkdirSync(OUT, { recursive: true });
const REAL_GPT = process.env.E2E_REAL_GPT === '1';
const BASE_URL = process.env.GPT_REAL_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.GPT_REAL_MODEL || 'gpt-image-1';
const REFERENCE = process.env.E2E_REFERENCE || path.join(ROOT, '03_images/imgPromptHelper/novelai/pose-action-pose/回头看.png');
const POSE = path.join(ROOT, '03_images/imgPromptHelper/novelai/pose-action-pose/回头看.png');
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const results = []; const dialogs = []; const failedRequests = []; const consoleErrors = []; const pageErrors = [];
let server, browser, page, shot = 0;

function readKey() {
  if (!REAL_GPT) return '';
  const line = fs.readFileSync(process.env.GPT_TEST_ENV_FILE, 'utf8').split(/\r?\n/).find(l => l.startsWith('GPT_IMAGE_API_KEY='));
  return line ? line.slice('GPT_IMAGE_API_KEY='.length).trim() : '';
}
async function snap(name) {
  const file = path.join(OUT, String(++shot).padStart(2, '0') + '-' + name + '.png');
  await page.screenshot({ path: file }).catch(() => {});
  return path.relative(ROOT, file);
}
async function step(name, kind, fn) {
  const t = Date.now();
  let pass = false, detail = {};
  const limit = kind === 'REAL' && /GPT/.test(name) ? 480000 : 180000;
  let timer;
  const guard = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('step timed out after ' + limit / 1000 + 's')), limit); });
  try { const r = await Promise.race([fn(), guard]); pass = !!r.pass; detail = r.detail || {}; }
  catch (e) { detail = { error: String(e.message || e).split('\n')[0].slice(0, 300) }; }
  finally { clearTimeout(timer); }
  const shotFile = await snap(name.replace(/[^\w\u4e00-\u9fff-]+/g, '_').slice(0, 40));
  results.push({ name, kind, pass, ms: Date.now() - t, screenshot: shotFile, detail });
  console.log((pass ? 'PASS ' : 'FAIL ') + '[' + kind + '] ' + name + ' ' + JSON.stringify(detail).slice(0, 400));
}
const count = () => page.evaluate(() => canvas.getObjects().filter(o => !(typeof isPlaceholderCanvasObject === 'function' && isPlaceholderCanvasObject(o))).length);
const pageImage = () => page.evaluate(() => { canvas.discardActiveObject(); canvas.renderAll(); return canvas.toDataURL({ format: 'png', multiplier: 1 }); });
async function diff(a, b, rect) {
  return page.evaluate(async ([a, b, rect]) => {
    const load = async u => { const i = new Image(); i.src = u; await i.decode(); const c = document.createElement('canvas');
      c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, c.width, c.height); };
    const A = await load(a), B = await load(b);
    if (A.width !== B.width || A.height !== B.height) return { size: [A.width, A.height, B.width, B.height], changed: -1 };
    let changed = 0, outside = 0;
    for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
      const i = (y * A.width + x) * 4;
      if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2] || A.data[i + 3] !== B.data[i + 3]) {
        changed++;
        if (rect && !(x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height)) outside++;
      }
    }
    return { size: [A.width, A.height], changed, outside };
  }, [a, b, rect]);
}
async function menu(id) {
  await page.locator('#navbarDropdownFile').click();
  await page.locator('#' + id).click();
}
async function toCanvasPoint(p) {
  const b = await page.evaluate(() => { const r = canvas.upperCanvasEl.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cw: canvas.getWidth(), ch: canvas.getHeight() }; });
  return { x: b.x + p[0] * b.w / b.cw, y: b.y + p[1] * b.h / b.ch };
}

async function main() {
  if (await new Promise(r => { const s = net.connect(8000, '127.0.0.1'); s.once('connect', () => { s.destroy(); r(true); }); s.once('error', () => r(false)); }))
    throw new Error('port 8000 busy');
  server = spawn(python, ['99_server.py'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, NAI_QUIET: '1', GPT_IMAGE_API_KEY: readKey(), GPT_IMAGE_TRUSTED_BASE_URL: REAL_GPT ? BASE_URL : '',
      NOVELAI_API_KEY: '', DIRECTOR_API_KEY: '' } });
  for (let i = 0; ; i++) {
    try { if ((await fetch(SERVER + '/index.html')).ok) break; } catch {}
    if (i > 150) throw new Error('server not ready'); await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  page = await context.newPage();
  page.on('dialog', d => { dialogs.push(d.type() + ': ' + d.message().slice(0, 120)); d.accept(); });
  page.on('requestfailed', r => failedRequests.push(r.url()));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => pageErrors.push(e.message.slice(0, 200)));
  await page.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort()); // nothing leaves the box from the page itself
  if (!REAL_GPT) {
    await page.route('**/gpt-image-proxy', async route => {
      const p = route.request().postDataJSON();
      if (/127\.0\.0\.1:9\//.test(p.baseUrl || '')) return route.continue(); // the readable-error step talks to the real local server
      const image = await page.evaluate(async ({ src, size, op }) => {
        const [w, h] = (size === 'auto' ? '1024x1024' : size).split('x').map(Number); const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d');
        if (op === 'generate' || !src) { g.fillStyle = '#d8e8ff'; g.fillRect(0, 0, w, h); g.fillStyle = '#333'; g.fillRect(w / 3, h / 3, w / 3, h / 3); }
        else { const i = new Image(); i.src = src; await i.decode(); g.drawImage(i, 0, 0, w, h); g.fillStyle = 'rgba(255,200,0,.35)'; g.fillRect(0, 0, w, h); }
        return c.toDataURL('image/png'); }, { src: p.image, size: p.size, op: p.operation });
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, image }) });
    });
  }
  const gptKind = REAL_GPT ? 'REAL' : 'MOCK';
  const GPT_WAIT = REAL_GPT ? 400000 : 60000;

  // ---------------- 1. first run ----------------
  await step('first run: tutorial shown, no failed requests or console errors', 'UI', async () => {
    await page.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0 && typeof saveStateByManual === 'function', null, { timeout: 60000 });
    await page.waitForTimeout(3000);
    const tutorial = await page.locator('#tutorialSkipBtn').isVisible();
    return { pass: tutorial && failedRequests.length === 0 && consoleErrors.length === 0 && pageErrors.length === 0,
      detail: { tutorial, failedRequests: failedRequests.slice(), consoleErrors: consoleErrors.slice(), pageErrors: pageErrors.slice() } };
  });
  await page.locator('#tutorialSkipBtn').click().catch(() => {});
  await page.keyboard.press('Escape');

  // ---------------- 2. original editor ----------------
  await step('template: first template on a fresh page applies without a scary confirm', 'UI', async () => {
    const d0 = dialogs.length;
    await page.locator('#svg-container-template img, #svg-container-template .svg-preview').nth(2).click(); // ab_2_1: two stacked panels
    await page.waitForFunction(() => canvas.getObjects().filter(o => o.isPanel).length >= 2, null, { timeout: 15000 });
    const panels = await page.evaluate(() => canvas.getObjects().filter(o => o.isPanel).map(o => { const r = o.getBoundingRect(true); return [r.left, r.top, r.width, r.height].map(Math.round); }));
    return { pass: dialogs.length === d0 && panels.length >= 2, detail: { panels, dialogs: dialogs.slice(d0) } };
  });
  const panels = await page.evaluate(() => canvas.getObjects().filter(o => o.isPanel).map(o => { const r = o.getBoundingRect(true); return { left: r.left, top: r.top, width: r.width, height: r.height }; }).sort((a, b) => a.top - b.top));

  await step('import image via File menu into the page', 'UI', async () => {
    const before = await count();
    const chooser = page.waitForEvent('filechooser', { timeout: 10000 });
    await page.locator('#navbarDropdownFile').click();
    await page.locator('a.dropdown-item').filter({ hasText: /导入图片|画像|Import/ }).first().click();
    await (await chooser).setFiles(POSE);
    await page.waitForFunction(n => canvas.getObjects().length > n, before, { timeout: 15000 });
    return { pass: (await count()) > before, detail: { before, after: await count(), types: await page.evaluate(() => canvas.getObjects().map(o => o.type).join(',')) } };
  });

  await step('speech bubble template adds a bubble', 'UI', async () => {
    const before = await count();
    await page.evaluate(() => toggleVisibility('speech-bubble-area'));
    await page.locator('#speech-bubble-area .svg-preview').first().click();
    await page.waitForFunction(n => canvas.getObjects().length > n, before, { timeout: 10000 });
    return { pass: (await count()) > before, detail: { before, after: await count() } };
  });

  await step('horizontal text box: add and type Japanese text', 'UI', async () => {
    await page.evaluate(() => toggleVisibility('text-area'));
    const before = await count();
    await page.locator('#text-area .visual-preset-card').first().click();
    await page.waitForFunction(n => canvas.getObjects().length > n, before, { timeout: 10000 });
    const text = await page.evaluate(() => { const t = canvas.getActiveObject() || canvas.getObjects().slice(-1)[0];
      t.enterEditing && t.enterEditing(); t.selectAll && t.selectAll(); return t.type; });
    await page.keyboard.type('こんにちは世界');
    const value = await page.evaluate(() => { const t = canvas.getActiveObject(); t.exitEditing && t.exitEditing(); canvas.renderAll(); return t.text; });
    return { pass: value === 'こんにちは世界', detail: { type: text, value } };
  });

  await step('vertical text box', 'UI', async () => {
    const before = await count();
    await page.locator('#verticalText').click();
    await page.waitForFunction(n => canvas.getObjects().length > n, before, { timeout: 10000 });
    return { pass: true, detail: { type: await page.evaluate(() => canvas.getObjects().slice(-1)[0].type) } };
  });

  await step('shape: star (pick tool, drag on the page)', 'UI', async () => {
    await page.evaluate(() => toggleVisibility('shape-area'));
    const before = await count();
    await page.locator('#shape-area .visual-preset-card').filter({ hasText: '星形' }).click();
    const box = await page.locator('.upper-canvas').first().boundingBox();
    const x = box.x + box.width * 0.7, y = box.y + Math.min(box.height, 500) * 0.6;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + 60, y + 60, { steps: 6 }); await page.mouse.up();
    await page.waitForFunction(n => canvas.getObjects().length > n, before, { timeout: 10000 });
    await page.keyboard.press('Escape').catch(() => {});
    const last = await page.evaluate(() => { const o = canvas.getObjects().slice(-1)[0]; return { type: o.type, w: Math.round(o.getScaledWidth()), h: Math.round(o.getScaledHeight()) }; });
    const after = await count();
    return { pass: after === before + 1 && last.w > 10 && last.h > 10, detail: { before, after, last } };
  });

  await step('layers panel: eye button hides and shows one layer', 'UI', async () => {
    const vis = () => page.evaluate(() => canvas.getObjects().map(o => o.visible !== false));
    const v0 = await vis();
    await page.locator('#viewButton-0').click(); await page.waitForTimeout(400); const v1 = await vis();
    await page.locator('#viewButton-0').click(); await page.waitForTimeout(400); const v2 = await vis();
    const hiddenIdx = v1.map((v, i) => v0[i] && !v ? i : -1).filter(i => i >= 0);
    return { pass: hiddenIdx.length === 1 && JSON.stringify(v2) === JSON.stringify(v0), detail: { hiddenIdx, restored: JSON.stringify(v2) === JSON.stringify(v0), layers: await page.locator('[id^=viewButton-]').count() } };
  });

  await step('undo / redo toolbar buttons', 'UI', async () => {
    // layer show/hide is an undoable edit too, so the last history entry may be a visibility toggle:
    // undo must change the page state (objects or visibility) and redo must restore it exactly.
    const sig = () => page.evaluate(() => canvas.getObjects().length + ':' + canvas.getObjects().map(o => o.visible === false ? 0 : 1).join(''));
    const n0 = await sig();
    await page.locator('#undo').click(); await page.waitForTimeout(1200); const n1 = await sig();
    await page.locator('#redo').click(); await page.waitForTimeout(1200); const n2 = await sig();
    return { pass: n1 !== n0 && n2 === n0, detail: { n0, afterUndo: n1, afterRedo: n2 } };
  });

  let projectFile = null;
  const beforeSave = await pageImage();
  await step('save project via File menu (download)', 'UI', async () => {
    const dl = page.waitForEvent('download', { timeout: 20000 });
    await menu('projectSave');
    const d = await dl; projectFile = path.join(OUT, 'project-' + d.suggestedFilename());
    await d.saveAs(projectFile);
    return { pass: fs.statSync(projectFile).size > 1000, detail: { file: path.relative(ROOT, projectFile), bytes: fs.statSync(projectFile).size } };
  });

  await step('clear canvas, then load project via File menu restores identical pixels', 'UI', async () => {
    await page.evaluate(() => allRemove()); await page.waitForTimeout(800);
    const cleared = await count();
    const chooser = page.waitForEvent('filechooser', { timeout: 10000 });
    await menu('projectLoad');
    await (await chooser).setFiles(projectFile);
    await page.waitForFunction(() => canvas.getObjects().length > 3, null, { timeout: 30000 });
    await page.waitForTimeout(2500);
    const d = await diff(beforeSave, await pageImage());
    return { pass: cleared === 0 && d.changed === 0, detail: { cleared, ...d } };
  });

  await step('export PNG via File menu (Ctrl+D path): page resolution, not blank', 'UI', async () => {
    const dl = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('#navbarDropdownFile').click(); await page.locator('#imageDownload').click();
    const d = await dl; const file = path.join(OUT, 'export-' + d.suggestedFilename()); await d.saveAs(file);
    const buf = fs.readFileSync(file);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    return { pass: buf.slice(1, 4).toString() === 'PNG' && w >= 1654 && h >= 2339 && buf.length > 20000, detail: { file: path.relative(ROOT, file), w, h, bytes: buf.length } };
  });

  await step('export SVG via File menu', 'UI', async () => {
    const dl = page.waitForEvent('download', { timeout: 30000 });
    await menu('svgDownload');
    const d = await dl; const file = path.join(OUT, 'export-' + d.suggestedFilename()); await d.saveAs(file);
    const text = fs.readFileSync(file, 'utf8');
    return { pass: /<svg[\s>]/.test(text) && text.length > 1000, detail: { file: path.relative(ROOT, file), bytes: text.length } };
  });

  await step('screentone on the selected panel', 'UI', async () => {
    // like a user: click inside the bottom panel (panels are not selectable), then pick the tone
    await page.evaluate(() => { canvas.discardActiveObject(); canvas.renderAll(); });
    const bottom = panels[panels.length - 1];
    const pt = await toCanvasPoint([bottom.left + bottom.width / 2, bottom.top + bottom.height - 60]);
    await page.mouse.click(pt.x, pt.y);
    await page.evaluate(() => toggleVisibility('manga-tone-area'));
    const before = await pageImage(); const n0 = await count();
    await page.locator('#ToneButton').click(); await page.waitForTimeout(1500);
    const after = await pageImage();
    const d = await diff(before, after);
    const tone = await page.evaluate(() => { const o = canvas.getObjects().find(x => x.name === 'Tone'); return o && o.clipPath ? Math.round(o.clipPath.top) : null; });
    return { pass: d.changed > 0 && tone !== null && Math.abs(tone - bottom.top) < 40, detail: { objects: [n0, await count()], changedPixels: d.changed, toneClipTop: tone, panelTop: Math.round(bottom.top) } };
  });

  // ---------------- 3. manga tools ----------------
  // Put a manga-like bubble with Japanese text and a figure into the panels.
  await page.evaluate(async ([pose, p]) => {
    const keep = o => o.isPanel && p.some(r => { const b = o.getBoundingRect(true); return Math.abs(b.left - r.left) < 2 && Math.abs(b.top - r.top) < 2 && Math.abs(b.width - r.width) < 2; });
    canvas.getObjects().filter(o => !keep(o)).forEach(o => canvas.remove(o));
    const top = p[0], bot = p[p.length - 1];
    const cv = document.createElement('canvas'); cv.width = Math.round(bot.width); cv.height = Math.round(bot.height);
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#666'; for (let y = 0; y < cv.height; y += 7) for (let x = (y / 7 % 2) * 3; x < cv.width; x += 7) g.fillRect(x, y, 2, 2);
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 4; g.beginPath(); g.ellipse(cv.width * 0.3, cv.height * 0.35, 230, 100, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    await document.fonts.load('52px "Noto Sans CJK JP"'); g.fillStyle = '#000'; g.font = '52px "Noto Sans CJK JP"'; g.fillText('ありがとう', cv.width * 0.3 - 130, cv.height * 0.35 + 18);
    const art = await new Promise(r => fabric.Image.fromURL(cv.toDataURL('image/png'), r)); art.set({ left: bot.left, top: bot.top, name: 'bubble-art' }); canvas.add(art);
    const fig = await new Promise(r => fabric.Image.fromURL(pose, r)); const s = Math.min(top.width / fig.width, top.height / fig.height) * 0.95;
    fig.set({ left: top.left + (top.width - fig.width * s) / 2, top: top.top + (top.height - fig.height * s) / 2, scaleX: s, scaleY: s, name: 'figure' }); canvas.add(fig);
    canvas.getObjects().filter(o => o.isPanel).forEach(o => canvas.bringToFront(o));
    canvas.discardActiveObject(); canvas.renderAll(); saveStateByManual();
  }, ['data:image/png;base64,' + fs.readFileSync(POSE).toString('base64'), panels]);

  await step('page structure: detects panels in reading order', 'UI', async () => {
    await page.locator('#mangaPageOpen').click();
    await page.locator('#mangaPageAnalyze').click();
    await page.locator('.manga-page-entry').first().waitFor({ timeout: 20000 });
    const entries = await page.locator('.manga-page-entry').count();
    return { pass: entries >= 2, detail: { entries, status: await page.locator('#mangaPageStatus').textContent().catch(() => '') } };
  });
  await page.locator('#mangaPageClose').click().catch(() => {});

  await step('smart subtitles: REAL Tesseract finds the bubble text (inside a closed outline)', 'REAL', async () => {
    await page.locator('#mangaSmartOpen').click();
    await page.locator('#mangaSmartLanguage').selectOption('jpn+eng');
    await page.locator('#mangaSmartDetect').click();
    await page.waitForFunction(() => document.querySelector('.manga-smart-item textarea') || /失败|错误|未安装|0 条/.test(document.getElementById('mangaSmartStatus').textContent), null, { timeout: 90000 });
    const texts = await page.evaluate(() => [...document.querySelectorAll('.manga-smart-item textarea')].map(t => t.value));
    return { pass: texts.some(t => (t.match(/[ありがとう]/g) || []).length >= 4), detail: { texts } };
  });

  const bubbleItemIndex = () => page.evaluate(() => Math.max(0, [...document.querySelectorAll('.manga-smart-item')].findIndex(el => /[ありがとう]{3,}/.test(el.querySelector('textarea')?.value || ''))));
  await step('Manga OCR refine (REAL model)', 'REAL', async () => {
    const idx = await bubbleItemIndex();
    const item = page.locator('.manga-smart-item').nth(idx);
    await item.locator('button').filter({ hasText: 'Manga OCR 精修' }).click();
    await page.waitForFunction(i => /ありがとう/.test(document.querySelectorAll('.manga-smart-item textarea')[i]?.value || '') || /失败|错误|未安装/.test(document.getElementById('mangaSmartStatus').textContent), idx, { timeout: 170000 });
    const v = await page.evaluate(i => document.querySelectorAll('.manga-smart-item textarea')[i].value, idx);
    return { pass: /ありがとう/.test(v), detail: { value: v } };
  });

  let lamaBefore;
  await step('ink mask candidate + REAL LaMa preview + apply as layer', 'REAL', async () => {
    lamaBefore = await pageImage();
    await page.locator('.manga-smart-item').nth(await bubbleItemIndex()).locator('button').filter({ hasText: '本地 LaMa 去字' }).first().click();
    await page.waitForFunction(() => document.getElementById('mangaLamaMaskCanvas')?.width > 10 && !document.getElementById('mangaLamaGenerate').disabled, null, { timeout: 30000 });
    await page.locator('#mangaLamaAutoInk').click(); await page.waitForTimeout(800);
    const ink = await page.locator('#mangaLamaStatus').textContent();
    await page.locator('#mangaLamaGenerate').click(); await page.waitForTimeout(300);
    await page.waitForFunction(() => !document.getElementById('mangaLamaConfirm').disabled ||
      (!document.getElementById('mangaLamaGenerate').disabled && !/^开始/.test(document.getElementById('mangaLamaStatus').textContent)), null, { timeout: 600000 });
    const status = await page.locator('#mangaLamaStatus').textContent();
    await page.locator('#mangaLamaConfirm').click();
    await page.waitForFunction(() => canvas.getObjects().some(o => o.mangaSmartText === 'lama-erase-patch'), null, { timeout: 20000 });
    const patch = await page.evaluate(() => { const o = canvas.getObjects().find(o => o.mangaSmartText === 'lama-erase-patch'); const r = o.getBoundingRect(true); return { left: Math.floor(r.left), top: Math.floor(r.top), width: Math.ceil(r.width) + 1, height: Math.ceil(r.height) + 1 }; });
    const d = await diff(lamaBefore, await pageImage(), patch);
    return { pass: d.outside === 0 && d.changed > 0, detail: { ink: ink.slice(0, 80), status: status.slice(0, 60), patch, ...d } };
  });

  await step('smart subtitle: replace text as an editable Fabric textbox', 'UI', async () => {
    await page.locator('.manga-smart-item textarea').nth(await bubbleItemIndex()).fill('どうもありがとう');
    // Default settings: 自动去字 stays on (also after LaMa) so no ghost of the old text remains.
    const erase = page.locator('.manga-smart-item').nth(await bubbleItemIndex()).locator('label').filter({ hasText: '自动去字' }).locator('input').first();
    const eraseDefault = await erase.isChecked().catch(() => null);
    await page.locator('#mangaSmartApply').click();
    await page.waitForFunction(() => canvas.getObjects().some(o => o.mangaSmartText === 'editable-subtitle' && o.text.replace(/\n/g, '') === 'どうもありがとう'), null, { timeout: 20000 });
    const m = await page.evaluate(async () => {
      const t = canvas.getObjects().find(o => o.mangaSmartText === 'editable-subtitle' && o.text.replace(/\n/g, '') === 'どうもありがとう');
      const box = t.mangaSmartFit.box; const lineW = Math.max(...t._textLines.map((l, i) => t.getLineWidth(i)));
      // Ghost check: hide the new text, render the page, count dark pixels left inside the old text box.
      t.visible = false; canvas.renderAll();
      const url = canvas.toDataURL({ format: 'png', multiplier: 1 }); t.visible = true; canvas.renderAll();
      const img = new Image(); img.src = url; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(Math.floor(box.x), Math.floor(box.y), Math.ceil(box.width), Math.ceil(box.height)).data;
      let dark = 0, grey = 0;
      for (let i = 0; i < d.length; i += 4) { const l = .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; if (l < 120) dark++; else if (l < 230) grey++; }
      return { text: t.text, fontSize: t.fontSize, lineWidth: Math.round(lineW), box: { w: Math.round(box.width), h: Math.round(box.height) },
        erasePatch: canvas.getObjects().some(o => o.mangaSmartText === 'erase-patch'), ghostDark: dark, ghostGrey: grey };
    });
    return { pass: eraseDefault === true && m.lineWidth <= m.box.w + 2 && m.ghostDark === 0 && m.ghostGrey < 30,
      detail: { eraseDefault, ...m } };
  });
  await page.locator('#mangaSmartClose').click().catch(() => {});

  await step('character bible: save a character with a reference picture (local only)', 'UI', async () => {
    await page.locator('#mangaCharacterOpen').click();
    await page.locator('#mangaCharacterName').fill('雨衣少女');
    await page.locator('#mangaCharacterTraits').fill('红色短发、绿色眼睛、黄色连帽雨衣、星形发卡');
    await page.locator('#mangaCharacterNotes').fill('保持原动作和构图');
    await page.locator('#mangaCharacterPhotos').setInputFiles(REFERENCE);
    await page.locator('#mangaCharacterSave').click();
    await page.locator('.manga-character-card').first().waitFor({ timeout: 20000 });
    await page.locator('.manga-character-card button').filter({ hasText: '用于 GPT 改图' }).first().click();
    const s = await page.evaluate(() => ({ prompt: document.getElementById('mangaGptPrompt').value, list: document.getElementById('mangaGptReferenceList').textContent }));
    return { pass: /黄色连帽雨衣/.test(s.prompt) && /1 张参考图/.test(s.list), detail: s };
  });

  const top = panels[0];
  let gptRect = null;
  await step('GPT region edit: character swap with the character card (' + gptKind + ')', gptKind, async () => {
    await page.evaluate(() => { document.getElementById('mangaGptPanel').hidden = false; });
    await page.locator('#mangaGptMode').selectOption('edit');
    await page.locator('#mangaGptUrl').fill(BASE_URL);
    await page.locator('#mangaGptModel').fill(MODEL);
    await page.locator('#mangaGptKey').fill('');
    const before = await pageImage();
    await page.locator('#mangaGptSelect').click();
    const a = await toCanvasPoint([top.left + top.width * 0.2, Math.max(2, top.top - 8)]);
    const z = await toCanvasPoint([top.left + top.width * 0.8, top.top + top.height + 30]);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(z.x, z.y, { steps: 10 }); await page.mouse.up();
    const selected = await page.locator('#mangaGptStatus').textContent();
    if (!/已选中/.test(selected)) return { pass: false, detail: { selection: selected } };
    await page.locator('#mangaGptGenerate').click();
    await page.waitForFunction(() => !document.getElementById('mangaGptApply').disabled || document.getElementById('mangaGptStatus').dataset.error === 'true', null, { timeout: GPT_WAIT });
    if (await page.locator('#mangaGptApply').isDisabled()) return { pass: false, detail: { status: await page.locator('#mangaGptStatus').textContent() } };
    const status1 = await page.locator('#mangaGptStatus').textContent();
    await page.locator('#mangaGptApply').click();
    await page.waitForFunction(() => canvas.getObjects().some(o => o.mangaGptSource), null, { timeout: 20000 });
    const info = await page.evaluate(() => { const o = canvas.getObjects().find(o => o.mangaGptSource); const r = o.getBoundingRect(true);
      return { rect: { left: Math.floor(r.left), top: Math.floor(r.top), width: Math.ceil(r.width) + 1, height: Math.ceil(r.height) + 1 }, crop: o.mangaGptCrop }; });
    const after = await pageImage();
    fs.writeFileSync(path.join(OUT, 'gpt-swap-after.png'), Buffer.from(after.split(',')[1], 'base64'));
    const d = await diff(before, after, info.rect);
    // the panel borders crossing the selection must still be there: sample the top border inside the selection
    const border = await page.evaluate(([u, y, x0, x1]) => new Promise(res => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
      const g = c.getContext('2d'); g.drawImage(i, 0, 0); let dark = 0, n = 0; for (let x = x0; x < x1; x += 4) { for (let dy = -6; dy <= 6; dy++) { const p = g.getImageData(x, y + dy, 1, 1).data; if (p[0] + p[1] + p[2] < 200) { dark++; break; } } n++; } res(dark / n); }; i.src = u; }),
      [after, Math.round(top.top), Math.round(info.rect.left + 10), Math.round(info.rect.left + info.rect.width - 10)]);
    return { pass: d.outside === 0 && d.changed > 0 && border > 0.9 && info.crop && info.crop.keepLines,
      detail: { status: status1.slice(0, 80), ...d, panelBorderKeptRatio: +border.toFixed(3), keepLines: info.crop && info.crop.keepLines } };
  });

  await step('GPT text-to-image as a new layer (' + gptKind + ')', gptKind, async () => {
    await page.locator('#mangaGptMode').selectOption('generate');
    await page.locator('#mangaGptPrompt').fill('A small rainy-city background illustration, clean manga screentone style, no text.');
    const before = await count();
    await page.locator('#mangaGptGenerate').click();
    await page.waitForFunction(() => !document.getElementById('mangaGptApply').disabled || document.getElementById('mangaGptStatus').dataset.error === 'true', null, { timeout: GPT_WAIT });
    if (await page.locator('#mangaGptApply').isDisabled()) return { pass: false, detail: { status: await page.locator('#mangaGptStatus').textContent() } };
    const status = await page.locator('#mangaGptStatus').textContent();
    await page.locator('#mangaGptApply').click();
    await page.waitForFunction(n => canvas.getObjects().length > n, before, { timeout: 20000 });
    const o = await page.evaluate(() => { const o = canvas.getObjects().filter(o => o.mangaGptSource).slice(-1)[0]; return { name: o.name, w: Math.round(o.getScaledWidth()), h: Math.round(o.getScaledHeight()) }; });
    await page.evaluate(() => { const o = canvas.getObjects().filter(x => x.mangaGptSource).slice(-1)[0]; canvas.remove(o); canvas.renderAll(); });
    return { pass: /生图/.test(o.name), detail: { status: status.slice(0, 80), ...o } };
  });

  await step('GPT error is readable (unreachable API address, no charge)', 'UI', async () => {
    await page.locator('#mangaGptMode').selectOption('generate');
    await page.locator('#mangaGptUrl').fill('http://127.0.0.1:9/v1');
    await page.locator('#mangaGptKey').fill('sk-test-not-a-real-key');
    await page.locator('#mangaGptGenerate').click();
    await page.waitForFunction(() => !document.getElementById('mangaGptGenerate').disabled, null, { timeout: 60000 });
    const status = await page.locator('#mangaGptStatus').textContent();
    const isError = await page.locator('#mangaGptStatus').getAttribute('data-error');
    await page.locator('#mangaGptKey').fill(''); await page.locator('#mangaGptUrl').fill(BASE_URL);
    return { pass: isError === 'true' && /[\u4e00-\u9fff]/.test(status) && !/undefined|\[object|TypeError|Traceback/.test(status), detail: { isError, status: status.slice(0, 200) } };
  });

  await step('final page export (evidence)', 'UI', async () => {
    await page.evaluate(() => { document.getElementById('mangaGptPanel').hidden = true; });
    const img = await pageImage();
    fs.writeFileSync(path.join(OUT, 'final-page.png'), Buffer.from(img.split(',')[1], 'base64'));
    return { pass: true, detail: { file: 'artifacts/e2e/final-page.png' } };
  });

  await step('no uncaught page errors during the whole run', 'UI', async () => ({ pass: pageErrors.length === 0, detail: { pageErrors, consoleErrors: consoleErrors.slice(0, 8) } }));
}

main().catch(e => { results.push({ name: 'harness', kind: 'UI', pass: false, detail: { error: e.message } }); console.error('ERROR', e.message); })
  .finally(async () => {
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ realGpt: REAL_GPT, results, dialogs, failedRequests, consoleErrors, pageErrors }, null, 1));
    if (browser) await browser.close(); if (server) server.kill();
    const fails = results.filter(r => !r.pass);
    console.log(`${results.length - fails.length} PASS, ${fails.length} FAIL`);
    process.exit(fails.length ? 1 : 0);
  });
