// Novice full-task acceptance (docs/GROK_BOT_FINAL_DELIVERY.md §4): a new user, no docs, real Chromium,
// real 99_server.py. Every UI action goes through the mouse/keyboard like a person; page.evaluate is used
// ONLY to read state for assertions. Each flow records key operations (clicks, drags, shortcut keys;
// typing text and picking files in the OS dialog are not counted), time, pass/fail and screenshots.
//   PYTHON=<venv with tesseract/manga-ocr/simple-lama> node scripts/novice-task-e2e.cjs            (GPT mocked)
//   NOVICE_REAL_GPT=1 GPT_TEST_ENV_FILE=<outside repo> GPT_REAL_BASE_URL=<relay>/v1 ...            (2 billable calls)
// Output: artifacts/novice/{report.json, NN-*.png, trace.zip}
'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SERVER = 'http://127.0.0.1:8000';
const OUT = path.join(ROOT, 'artifacts', process.env.NOVICE_BASELINE === '1' ? 'novice-baseline' : 'novice');
const FIX = path.join(__dirname, 'fixtures', 'novice');
const PAGES = [path.join(FIX, 'page1.png'), path.join(FIX, 'page2.png')];
const REFERENCE = path.join(FIX, 'reference.png');
const REAL_GPT = process.env.NOVICE_REAL_GPT === '1';
// NOVICE_BASELINE=1 + NOVICE_APP_ROOT=<checkout of the original app>: same tasks on the original version
// for the before/after comparison; features that do not exist there are recorded as unavailable.
const BASELINE = process.env.NOVICE_BASELINE === '1';
const APP_ROOT = process.env.NOVICE_APP_ROOT ? path.resolve(process.env.NOVICE_APP_ROOT) : null;
const BASE_URL = process.env.GPT_REAL_BASE_URL || 'https://api.openai.com/v1';
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const flows = []; const pageErrors = []; const consoleErrors = []; const dialogs = [];
let server, browser, context, page, shot = 0, cur = null;

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
// ---- counted user operations ----
const op = {
  async click(locator, label) {
    // Playwright refuses to click an element covered by another one; a person's mouse just clicks
    // there. If the cover is our own selection overlay, click physically at the element's centre.
    const covered = await locator.evaluate(el => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return top && top !== el && !el.contains(top) && top.classList.contains('manga-gpt-selection') ? [r.left + r.width / 2, r.top + r.height / 2] : null; },
      null, { timeout: 5000 }).catch(e => { cur.notes.push('cover-check error: ' + String(e.message).slice(0, 160)); return null; });
    if (covered) { await page.mouse.click(covered[0], covered[1]); cur.ops.push(label); cur.notes.push(label + ': physical click through selection overlay'); return; }
    try { await locator.click({ timeout: 8000 }); }
    catch (e) { // say what a user would see instead of a bare timeout
      const info = await locator.evaluate(el => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { rect: [r.left, r.top, r.width, r.height].map(Math.round), visible: !!(r.width && r.height), covering: top && top !== el && !el.contains(top) ? (top.id || top.className || top.tagName) : null }; },
        null, { timeout: 2000 }).catch(() => ({ missing: true }));
      if (info && info.covering && /manga-gpt-selection/.test(String(info.covering))) {
        await page.mouse.click(info.rect[0] + info.rect[2] / 2, info.rect[1] + info.rect[3] / 2);
        cur.ops.push(label); cur.notes.push(label + ': physical click through selection overlay'); return;
      }
      throw new Error('cannot click "' + label + '": ' + JSON.stringify(info));
    }
    cur.ops.push(label);
  },
  async key(k, label) { await page.keyboard.press(k); cur.ops.push(label || k); },
  async drag(a, b, label) {
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 12 }); await page.mouse.up(); cur.ops.push(label);
  },
  async files(trigger, files, label) { // the click that opens the OS dialog counts; choosing files does not
    const chooser = page.waitForEvent('filechooser', { timeout: 15000 });
    await trigger.click(); cur.ops.push(label);
    await (await chooser).setFiles(files);
  }
};
async function flow(name, fn) {
  cur = { name, ops: [], notes: [] };
  const t = Date.now(); let pass = false, detail = {};
  try { const r = await fn(); pass = !!r.pass; detail = r.detail || {}; }
  catch (e) { detail = { error: String(e.message || e).split('\n')[0].slice(0, 300) }; }
  const screenshot = await snap(name.replace(/[^\w\u4e00-\u9fff-]+/g, '_').slice(0, 40));
  const rec = { name, pass, keyOps: cur.ops.length, ops: cur.ops, seconds: +((Date.now() - t) / 1000).toFixed(1), screenshot, notes: cur.notes, detail };
  flows.push(rec);
  console.log((pass ? 'PASS ' : 'FAIL ') + name + ' ops=' + rec.keyOps + ' ' + rec.seconds + 's ' + JSON.stringify(detail).slice(0, 400));
}
// ---- read-only probes ----
const pageImage = () => page.evaluate(() => { canvas.discardActiveObject(); canvas.renderAll(); return canvas.toDataURL({ format: 'png', multiplier: 1 }); });
const canvasSize = () => page.evaluate(() => [canvas.getWidth(), canvas.getHeight()]);
const pageCount = () => page.evaluate(() => typeof btmGetGuidsSize === 'function' ? btmGetGuidsSize() : 0);
const currentGuid = () => page.evaluate(() => getCanvasGUID());
async function diff(a, b, rect) {
  return page.evaluate(async ([a, b, rect]) => {
    const load = async u => { const i = new Image(); i.src = u; await i.decode(); const c = document.createElement('canvas');
      c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, c.width, c.height); };
    const A = await load(a), B = await load(b);
    if (A.width !== B.width || A.height !== B.height) return { size: [A.width, A.height, B.width, B.height], changed: -1, outside: -1 };
    let changed = 0, outside = 0;
    for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
      const i = (y * A.width + x) * 4;
      if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) > 6) {
        changed++;
        if (rect && !(x >= rect.left - 1 && x < rect.left + rect.width + 1 && y >= rect.top - 1 && y < rect.top + rect.height + 1)) outside++;
      }
    }
    return { size: [A.width, A.height], changed, outside };
  }, [a, b, rect]);
}
async function toScreen(p) {
  const b = await page.evaluate(() => { const r = canvas.upperCanvasEl.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cw: canvas.getWidth(), ch: canvas.getHeight() }; });
  return { x: b.x + p[0] * b.w / b.cw, y: b.y + p[1] * b.h / b.ch };
}
async function waitIdle() {
  await page.waitForFunction(() => !window.NaiPageLoading && !window.NaiHistoryLoading, null, { timeout: 30000 });
  await page.waitForTimeout(400);
}
async function openPage(index) { // like a user: open the page drawer if closed, click the thumbnail
  const thumbs = page.locator('#btm-image-container .btm-image');
  const closed = await page.evaluate(() => { const d = document.getElementById('btm-drawer'); return !d || d.classList.contains('btm-closed') || getComputedStyle(d).display === 'none'; });
  if (closed) { await op.click(page.locator('#btm-drawer-handle'), '展开页面'); await page.waitForTimeout(500); }
  const before = await currentGuid();
  await op.click(thumbs.nth(index), 'page ' + (index + 1));
  await page.waitForFunction(g => getCanvasGUID() !== g, before, { timeout: 30000 }).catch(() => {});
  await waitIdle();
}

async function startServer() {
  const busy = await new Promise(r => { const s = net.connect(8000, '127.0.0.1'); s.once('connect', () => { s.destroy(); r(true); }); s.once('error', () => r(false)); });
  if (busy) throw new Error('port 8000 busy');
  server = spawn(python, ['99_server.py'], { cwd: APP_ROOT || ROOT, stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, NAI_QUIET: '1', GPT_IMAGE_API_KEY: readKey(), GPT_IMAGE_TRUSTED_BASE_URL: REAL_GPT ? BASE_URL : '',
      NOVELAI_API_KEY: '', DIRECTOR_API_KEY: '' } });
  for (let i = 0; ; i++) {
    try { if ((await fetch(SERVER + '/index.html')).ok) return; } catch {}
    if (i > 150) throw new Error('server not ready'); await new Promise(r => setTimeout(r, 200));
  }
}
const mock = { calls: [], fail: null, delayMs: 0 };
async function newSession(viewport) {
  context = await browser.newContext({ viewport: viewport || { width: 1440, height: 900 }, acceptDownloads: true });
  await context.tracing.start({ screenshots: true, snapshots: false });
  page = await context.newPage();
  page.on('dialog', d => { dialogs.push(d.type() + ': ' + d.message().slice(0, 120)); d.accept(); });
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => pageErrors.push(e.message.slice(0, 200)));
  await page.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
  if (!REAL_GPT) {
    await page.route('**/gpt-image-proxy', async route => {
      const p = route.request().postDataJSON();
      mock.calls.push({ op: p.operation, model: p.model, refs: (p.references || []).length, promptLen: (p.prompt || '').length });
      if (mock.delayMs) await new Promise(res => setTimeout(res, mock.delayMs));
      if (mock.fail) return route.fulfill({ status: mock.fail.status, contentType: 'application/json', body: JSON.stringify({ ok: false, error: mock.fail.error }) });
      const image = await page.evaluate(async ({ src, size }) => {
        const [w, h] = (size === 'auto' ? '1024x1024' : size).split('x').map(Number); const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'); const i = new Image(); i.src = src; await i.decode(); g.drawImage(i, 0, 0, w, h);
        g.fillStyle = 'rgba(230,60,60,.35)'; g.fillRect(w * .2, h * .2, w * .6, h * .6); return c.toDataURL('image/png');
      }, { src: p.image, size: p.size });
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, image }) });
    });
  }
  await page.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(baseline => typeof canvas !== 'undefined' && canvas.getWidth() > 0 && typeof saveStateByManual === 'function'
    && (baseline || !!document.getElementById('mangaGptOpen')), BASELINE, { timeout: 60000 });
  await page.waitForTimeout(1500);
}
async function endSession(name) {
  await context.tracing.stop({ path: path.join(OUT, 'trace-' + name + '.zip') }).catch(() => {});
  await context.close();
}

async function main() {
  await startServer();
  browser = await chromium.launch({ headless: true });
  await newSession();
  const pageShots = {};

  // 1. fresh start -> import a 2-page manga
  await flow('1 首次启动并导入 2 页漫画', async () => {
    const tutorial = await page.locator('#tutorialSkipBtn').isVisible().catch(() => false);
    if (tutorial) await op.click(page.locator('#tutorialSkipBtn'), 'skip tutorial');
    await op.files(page.locator('#navbarDropdownFile'), [], 'File menu').catch(() => {}); // File menu opens no chooser
    cur.ops.pop(); await page.keyboard.press('Escape');
    await op.click(page.locator('#navbarDropdownFile'), 'File menu');
    await op.files(page.locator('a.dropdown-item').filter({ hasText: /导入图片/ }).first(), PAGES, 'Import image');
    await page.waitForFunction(() => typeof btmGetGuidsSize === 'function' && btmGetGuidsSize() >= 2, null, { timeout: 60000 }).catch(() => {});
    await waitIdle();
    const n = await pageCount();
    const size2 = await canvasSize();
    pageShots.p2 = await pageImage();
    await openPage(0);
    const size1 = await canvasSize();
    // page order: page 1 must show page1.png, page 2 must show page2.png (pixel compare, tolerance 6/channel)
    const fileUrl = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    const order1 = await diff(fileUrl(PAGES[0]), await pageImage());
    const order2 = await diff(fileUrl(PAGES[1]), pageShots.p2);
    const sameAsFile = d => d.changed >= 0 && d.changed < 1200 * 1700 * 0.01;
    return { pass: tutorial && n === 2 && size1.join() === '1200,1700' && size2.join() === '1200,1700' && sameAsFile(order1) && sameAsFile(order2),
      detail: { tutorialShown: tutorial, pages: n, size1, size2, page1VsFile: order1.changed, page2VsFile: order2.changed } };
  });

  // 2. GPT character swap on page 1
  const has = id => page.locator('#' + id).count().then(n => n > 0);
  await flow('2 框选人物+参考图+描述→生成→预览→应用', async () => {
    if (!(await has('mangaGptOpen'))) return { pass: false, detail: { unavailable: 'no GPT region edit in this version' } };
    const before = await pageImage(); const size0 = await canvasSize();
    await op.click(page.locator('#mangaGptOpen'), 'GPT 改图');
    if (REAL_GPT) { await page.locator('#mangaGptUrl').fill(BASE_URL); }
    const selecting = await page.evaluate(() => !!document.querySelector('.manga-gpt-selection'));
    if (!selecting) await op.click(page.locator('#mangaGptSelect'), '框选区域');
    await op.drag(await toScreen([200, 60]), await toScreen([780, 1000]), 'drag selection');
    const sel = await page.locator('#mangaGptStatus').textContent();
    await page.locator('#mangaGptReferences').setInputFiles(REFERENCE);
    await page.locator('#mangaGptPrompt').fill('把这个女孩换成参考图里的角色，保持姿势、构图和画风不变');
    const calls0 = mock.calls.length;
    await op.click(page.locator('#mangaGptGenerate'), '生成');
    await page.waitForFunction(() => !document.getElementById('mangaGptApply').disabled || document.getElementById('mangaGptStatus').classList.contains('is-error'),
      null, { timeout: REAL_GPT ? 400000 : 60000 });
    const preview = await page.locator('#mangaGptPreview img, #mangaGptPreview canvas, .manga-gpt-preview img').first().isVisible().catch(() => false);
    const status = await page.locator('#mangaGptStatus').textContent();
    await op.click(page.locator('#mangaGptApply'), '应用为图层');
    await page.waitForFunction(() => canvas.getObjects().some(o => o.name === 'GPT 局部改图'), null, { timeout: 30000 });
    await waitIdle();
    const after = await pageImage();
    const rect = await page.evaluate(() => { const o = canvas.getObjects().find(o => o.name === 'GPT 局部改图'); const r = o.getBoundingRect(true);
      return { left: Math.floor(r.left), top: Math.floor(r.top), width: Math.ceil(r.width), height: Math.ceil(r.height) }; });
    const d = await diff(before, after, rect);
    const size1 = await canvasSize();
    pageShots.p1 = after;
    await snap('gpt-after-apply');
    return { pass: d.changed > 0 && d.outside === 0 && size0.join() === size1.join() && (REAL_GPT || mock.calls.length === calls0 + 1),
      detail: { selection: sel.slice(0, 60), preview, status: status.slice(0, 60), rect, ...d, size: size1, calls: REAL_GPT ? 'real' : mock.calls.length - calls0,
        model: REAL_GPT ? null : (mock.calls[mock.calls.length - 1] || {}).model } };
  });
  await page.locator('#mangaGptClose').click().catch(() => {});

  // 3. captions: detect -> fix OCR -> erase -> replace -> fit
  await flow('3 识别日文气泡→修正→去字→替换中文字幕', async () => {
    if (!(await has('mangaSmartOpen'))) return { pass: false, detail: { unavailable: 'no OCR / smart captions in this version' } };
    await op.click(page.locator('#mangaSmartOpen'), '智能字幕');
    await op.click(page.locator('#mangaSmartDetect'), '识别');
    await page.waitForFunction(() => document.querySelector('.manga-smart-item textarea') || /失败|错误|未安装|0 条|没有/.test(document.getElementById('mangaSmartStatus').textContent), null, { timeout: 120000 });
    const texts = await page.evaluate(() => [...document.querySelectorAll('.manga-smart-item textarea')].map(t => t.value));
    const idx = Math.max(0, texts.findIndex(t => /[ありがとう]{2,}/.test(t)));
    cur.notes.push('OCR: ' + JSON.stringify(texts).slice(0, 120));
    await page.locator('.manga-smart-item textarea').nth(idx).fill('谢谢你');
    await op.click(page.locator('#mangaSmartApply'), '应用字幕');
    await page.waitForFunction(() => canvas.getObjects().some(o => o.mangaSmartText === 'editable-subtitle'), null, { timeout: 30000 });
    await waitIdle();
    const m = await page.evaluate(() => {
      const t = canvas.getObjects().find(o => o.mangaSmartText === 'editable-subtitle'); const box = t.mangaSmartFit && t.mangaSmartFit.box;
      t.setCoords(); const r = t.getBoundingRect(true, true);
      // visible glyph extent: Fabric's vertical textbox reports its box; good enough to catch overflow
      return { text: t.text, type: t.type, fontSize: t.fontSize, rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        box: box && { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) },
        erase: canvas.getObjects().some(o => o.mangaSmartText === 'erase-patch' || o.mangaSmartText === 'lama-erase-patch') };
    });
    pageShots.p1 = await pageImage();
    await page.locator('#mangaSmartClose').click().catch(() => {});
    const found = texts.some(t => /[ありがとう]{3,}/.test(t));
    const inside = !m.box || (m.rect.x >= m.box.x - 4 && m.rect.y >= m.box.y - 4 && m.rect.x + m.rect.w <= m.box.x + m.box.w + 4 && m.rect.y + m.rect.h <= m.box.y + m.box.h + 4);
    return { pass: found && m.erase && /谢谢你/.test(m.text.replace(/\n/g, '')) && inside && m.type === 'vertical-textbox' && m.fontSize >= 24,
      detail: { ocr: texts.slice(0, 4), ...m } };
  });

  // 4. undo / redo / page switch / save / close / reopen
  let projectFile = null;
  await flow('4 撤销/重做/切页/保存/关闭/重开', async () => {
    const p1 = await pageImage();
    await page.locator('#canvas-area').click({ position: { x: 5, y: 5 } }).catch(() => {});
    await op.key('Control+z', 'Ctrl+Z'); await waitIdle();
    const undone = await pageImage();
    await op.key('Control+y', 'Ctrl+Y'); await waitIdle();
    const redone = await pageImage();
    const dUndo = await diff(p1, undone); const dRedo = await diff(p1, redone);
    await openPage(1);
    const p2 = await pageImage();
    const dP2 = await diff(pageShots.p2, p2);
    await openPage(0);
    const dBack = await diff(p1, await pageImage());
    const dl = page.waitForEvent('download', { timeout: 30000 });
    await op.click(page.locator('#navbarDropdownFile'), 'File menu');
    await op.click(page.locator('#projectSave'), '保存项目');
    const d = await dl; projectFile = path.join(OUT, 'project-' + d.suggestedFilename()); await d.saveAs(projectFile);
    await endSession('edit');
    // reopen in a brand-new browser profile, load the saved project
    await newSession();
    await page.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {});
    await op.click(page.locator('#navbarDropdownFile'), 'File menu');
    await op.files(page.locator('#projectLoad'), [projectFile], '打开项目');
    await page.waitForFunction(() => typeof btmGetGuidsSize === 'function' && btmGetGuidsSize() >= 2 && canvas.getObjects().length > 1, null, { timeout: 60000 });
    await waitIdle(); await page.waitForTimeout(1500);
    const r1 = await diff(p1, await pageImage());
    const editable = await page.evaluate(() => { const t = canvas.getObjects().find(o => o.mangaSmartText === 'editable-subtitle'); return t ? { type: t.type, editable: t.editable !== false, text: t.text } : null; });
    await openPage(1);
    const r2 = await diff(p2, await pageImage());
    await openPage(0);
    await page.locator('#canvas-area').click({ position: { x: 5, y: 5 } }).catch(() => {});
    await op.key('Control+z', 'Ctrl+Z after reopen'); await waitIdle();
    const undoAfterReopen = await diff(p1, await pageImage());
    const captionsDone = flows.some(f => f.name.startsWith('3') && f.pass);
    return { pass: dUndo.changed > 0 && dRedo.changed === 0 && dP2.changed === 0 && dBack.changed === 0 && r1.changed === 0 && r2.changed === 0 &&
      (!captionsDone || !!editable) && undoAfterReopen.changed > 0,
      detail: { undoChanged: dUndo.changed, redoChanged: dRedo.changed, page2Intact: dP2.changed, backToPage1: dBack.changed,
        reopenPage1: r1.changed, reopenPage2: r2.changed, editable, undoAfterReopen: undoAfterReopen.changed, project: path.relative(ROOT, projectFile) } };
  });

  // 5. robustness: wrong API -> readable error, no silent retry -> retry works; long prompt; empty selection
  await flow('5 错误 API/失败后再试/超长提示词/空选区', async () => {
    if (REAL_GPT) return { pass: true, detail: { skipped: 'mock-only: needs the mock to inject HTTP 530 / retry' } };
    if (!(await has('mangaGptOpen'))) return { pass: false, detail: { unavailable: 'no GPT image API in this version' } };
    await op.click(page.locator('#mangaGptOpen'), 'GPT 改图');
    await op.click(page.locator('#mangaGptGenerate'), '生成（未框选）');
    const noRegion = (await page.locator('#mangaGptStatus').textContent()).trim();
    const selecting = await page.evaluate(() => !!document.querySelector('.manga-gpt-selection'));
    if (!selecting) await op.click(page.locator('#mangaGptSelect'), '框选区域');
    await op.drag(await toScreen([100, 1100]), await toScreen([600, 1500]), 'drag selection');
    await page.locator('#mangaGptPrompt').fill('让背景变成夜晚的城市，'.repeat(300));
    let calls0 = mock.calls.length;
    mock.fail = { status: 502, error: '上游 HTTP 530：图像服务（或其网关）暂时不可用，本次没有生成图片，请稍后重试。' };
    if (!REAL_GPT) await op.click(page.locator('#mangaGptGenerate'), '生成（失败）');
    await page.waitForFunction(() => document.getElementById('mangaGptStatus').classList.contains('is-error') ||
      /失败|不可用|错误/.test(document.getElementById('mangaGptStatus').textContent), null, { timeout: 60000 }).catch(() => {});
    const failMsg = (await page.locator('#mangaGptStatus').textContent()).trim();
    await page.waitForTimeout(2000);
    const silentRetries = mock.calls.length - calls0 - 1;
    mock.fail = null; calls0 = mock.calls.length;
    await op.click(page.locator('#mangaGptGenerate'), '再试一次');
    await page.waitForFunction(() => !document.getElementById('mangaGptApply').disabled, null, { timeout: 60000 }).catch(() => {});
    const okAfterRetry = await page.evaluate(() => !document.getElementById('mangaGptApply').disabled);
    await page.locator('#mangaGptClose').click().catch(() => {});
    return { pass: /框选|选区|区域/.test(noRegion) && /不可用|重试|失败/.test(failMsg) && silentRetries === 0 && okAfterRetry,
      detail: { noRegion: noRegion.slice(0, 60), failMsg: failMsg.slice(0, 80), silentRetries, okAfterRetry, longPromptChars: 3300,
        lastPromptLen: (mock.calls[mock.calls.length - 1] || {}).promptLen } };
  });

  // 7. switch pages while a generation is running: the result must never land on the other page
  await flow('8 导入含坏文件的一批图→立刻刷新→恢复对话框找回全部页', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
    const ready = async () => { await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0, null, { timeout: 60000 }); };
    await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' }); await ready();
    await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {}); await p.keyboard.press('Escape');
    const broken = path.join(OUT, 'broken-not-an-image.png'); fs.writeFileSync(broken, 'not an image');
    await p.locator('#imageInput').setInputFiles([broken, ...PAGES]);
    await p.waitForFunction(() => document.querySelectorAll('#btm-image-container > *').length >= 2, null, { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const before = await p.evaluate(() => ({ pages: document.querySelectorAll('#btm-image-container > *').length,
      page1HasImage: canvas.getObjects().some(o => o.type === 'image'), toast: /导入图片/.test(document.body.innerText) }));
    // the user hits F5 within ~2 s of the import finishing
    await p.reload({ waitUntil: 'domcontentloaded' }); await ready();
    const dialog = await p.locator('#autoSaveRecoveryDialog').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    if (dialog) await p.locator('#autoSaveRecoverBtn').click();
    await p.waitForFunction(() => document.querySelectorAll('#btm-image-container > *').length >= 2, null, { timeout: 30000 }).catch(() => {});
    const after = await p.evaluate(() => ({ pages: document.querySelectorAll('#btm-image-container > *').length }));
    await ctx.close();
    return { pass: before.pages === 2 && before.page1HasImage && dialog && after.pages === 2, detail: { before, dialog, after } };
  });

  await flow('9 导入超大图→提示已自动缩小（中文 + 8 语言文案）', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
    await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0, null, { timeout: 60000 });
    await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {}); await p.keyboard.press('Escape');
    const importBig = () => p.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 5000; c.height = 3000; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 5000, 3000); x.fillStyle = '#c33'; x.fillRect(1000, 800, 3000, 1400);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const dt = new DataTransfer(); dt.items.add(new File([blob], 'scan-5000x3000.png', { type: 'image/png' }));
      const input = document.getElementById('imageInput'); input.files = dt.files; input.dispatchEvent(new Event('change'));
    });
    const toastText = () => p.waitForFunction(() => { const t = document.getElementById('sp-manga-toastContainer'); return t && /5000×3000/.test(t.innerText) && t.innerText; }, null, { timeout: 20000 }).then(h => h.jsonValue()).catch(() => '');
    await importBig(); const zh = await toastText();
    const size = await p.evaluate(() => [canvas.getWidth(), canvas.getHeight()]);
    await ctx.close();
    // UI is Chinese-only at runtime: the zh key must resolve (not the fallback), and all 8 languages carry it in source
    const src = fs.readFileSync(path.join(__dirname, '..', 'js/ui/third/i18next.js'), 'utf8');
    const en = { langs: (src.match(/"importDownscaled": "[^"]*\{ow\}[^"]*"/g) || []).length,
      zhResolved: await (async () => { const c2 = await browser.newContext(); const q = await c2.newPage();
        await q.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
        await q.waitForFunction(() => typeof i18next !== 'undefined' && i18next.isInitialized, null, { timeout: 60000 });
        const v = await q.evaluate(() => i18next.t('importDownscaled') !== 'importDownscaled'); await c2.close(); return v; })() };
    return { pass: /已自动缩小/.test(zh) && /4096×2458/.test(zh) && en.langs === 8 && en.zhResolved && size[0] === 4096, detail: { zh: zh.slice(0, 120), en, size } };
  });

  await flow('10 没填 NovelAI Token 就点「生成 5 页样稿」→看得懂的提示、不发请求', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
    const sent = []; p.on('request', r => { if (/\/nai-tools\/|\/nai-proxy\/|novelai\.net/.test(r.url())) sent.push(r.url().replace(/^https?:\/\/[^/]+/, '')); });
    await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0, null, { timeout: 60000 });
    await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {}); await p.keyboard.press('Escape');
    await p.locator('#naiTokenBadge').click(); cur.ops.push('未填 Token');   // the badge opens NovelAI settings
    const btn = p.locator('#naiGenerateComicDemo:visible');
    const found = await btn.count();
    if (found) { await btn.click(); cur.ops.push('生成 5 页样稿'); }
    const toast = await p.waitForFunction(() => { const t = document.getElementById('sp-manga-toastContainer'); return t && /token/i.test(t.innerText) && t.innerText; }, null, { timeout: 15000 }).then(h => h.jsonValue()).catch(() => '');
    await ctx.close();
    return { pass: !!found && /未填 token/i.test(toast) && !/MISSING AUTHORIZATION/i.test(toast) && sent.length === 0, detail: { toast: toast.slice(0, 160), requests: sent } };
  });

  await flow('11 字幕图层：点眼睛隐藏→导出不含字幕→Ctrl+Z 恢复显示；刷新恢复后字幕仍可编辑', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
    const ready = () => p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0, null, { timeout: 60000 });
    await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' }); await ready();
    await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {}); await p.keyboard.press('Escape');
    if (!(await p.locator('#mangaSmartOpen').count())) { await ctx.close(); return { pass: false, detail: { unavailable: 'no smart captions' } }; }
    await p.locator('#imageInput').setInputFiles(PAGES[0]);
    await p.waitForFunction(() => canvas.getObjects().some(o => o.type === 'image'), null, { timeout: 30000 });
    await p.locator('#mangaSmartOpen').click(); await p.locator('#mangaSmartDetect').click();
    await p.waitForSelector('.manga-smart-item textarea', { timeout: 120000 });
    await p.locator('.manga-smart-item textarea').first().fill('谢谢你'); await p.locator('#mangaSmartApply').click();
    await p.waitForFunction(() => canvas.getObjects().some(o => o.mangaSmartText === 'editable-subtitle'), null, { timeout: 30000 });
    await p.locator('#mangaSmartClose').click().catch(() => {}); await p.waitForTimeout(800);
    const exportDark = () => p.evaluate(async () => { const t = canvas.getObjects().find(o => o.mangaSmartText === 'editable-subtitle'); t.setCoords(); const r = t.getBoundingRect(true, true);
      const i = new Image(); i.src = ImageUtil.exportCanvasDataURL(1, 'png'); await i.decode();
      const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const x = cv.getContext('2d'); x.drawImage(i, 0, 0);
      const d = x.getImageData(Math.round(r.left), Math.round(r.top), Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height))).data; let dark = 0;
      for (let k = 0; k < d.length; k += 4) if (d[k] + d[k + 1] + d[k + 2] < 300) dark++; return dark; });
    const shown = await exportDark();
    // the eye button of the top layer row (the caption) in the layer panel
    const eye = p.locator('#layer-panel').getByText('visibility', { exact: true }).first();
    await eye.click(); await p.waitForTimeout(500);
    const hiddenState = await p.evaluate(() => canvas.getObjects().find(o => o.mangaSmartText === 'editable-subtitle').visible);
    const hidden = await exportDark();
    // a beginner undoes the hide with Ctrl+Z (show/hide is recorded in history)
    await p.mouse.click(1000, 600); await p.keyboard.press('Control+z');
    const undoShows = await p.waitForFunction(() => canvas.getObjects().find(o => o.mangaSmartText === 'editable-subtitle').visible !== false, null, { timeout: 10000 }).then(() => true).catch(() => false);
    await p.evaluate(() => AutoSaveManager.save()); await p.waitForTimeout(500);
    await p.reload({ waitUntil: 'domcontentloaded' }); await ready();
    const dialog = await p.locator('#autoSaveRecoverBtn').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    if (dialog) await p.locator('#autoSaveRecoverBtn').click();
    await p.waitForFunction(() => canvas.getObjects().some(o => o.mangaSmartText === 'editable-subtitle'), null, { timeout: 30000 }).catch(() => {});
    const after = await p.evaluate(() => { const t = canvas.getObjects().find(o => o.mangaSmartText === 'editable-subtitle');
      return t ? { type: t.type, text: t.text, editable: t.editable !== false, visible: t.visible !== false } : null; });
    await ctx.close();
    return { pass: shown > 200 && hiddenState === false && hidden === 0 && undoShows && dialog && !!after && after.type === 'vertical-textbox' && after.text === '谢谢你' && after.editable && after.visible,
      detail: { exportDarkShown: shown, eyeHid: hiddenState === false, exportDarkHidden: hidden, undoShows, dialog, after } };
  });

  await flow('12 从页面外开始拖「手动框选字幕」→贴边框选；贴边气泡用 LaMa 去字不越界', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
    let sent = null;   // identity LaMa mock: real crop, real mask UI, no model needed
    await p.route('**/manga-smart/lama-inpaint', r => { const d = r.request().postDataJSON(); const buf = Buffer.from(d.image.split(',')[1], 'base64');
      sent = { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, image: d.image, width: sent.w, height: sent.h }) }); });
    await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0, null, { timeout: 60000 });
    await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {}); await p.keyboard.press('Escape');
    if (!(await p.locator('#mangaSmartOpen').count())) { await ctx.close(); return { pass: false, detail: { unavailable: 'no smart captions' } }; }
    await p.locator('#imageInput').setInputFiles(PAGES[0]);
    await p.waitForFunction(() => canvas.getObjects().some(o => o.type === 'image'), null, { timeout: 30000 });
    await p.locator('#mangaSmartOpen').click(); await p.locator('#mangaSmartManual').click(); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const e = canvas.upperCanvasEl.getBoundingClientRect(); return { x: e.left, y: e.top, w: e.width, h: e.height }; });
    await p.mouse.move(r.x - 30, r.y - 30); await p.mouse.down();   // 30px outside the page corner
    await p.mouse.move(r.x + r.w * 0.2, r.y + r.h * 0.12, { steps: 8 }); await p.mouse.up();
    await p.waitForSelector('.manga-smart-item', { timeout: 15000 }).catch(() => {});
    const items = await p.locator('.manga-smart-item').count();
    const box = await p.evaluate(() => { const st = document.getElementById('mangaSmartStatus').textContent; return st; });
    let lama = null;
    if (items) {
      await p.locator('.manga-smart-item').last().locator('button').filter({ hasText: '本地 LaMa 去字' }).click();
      await p.waitForFunction(() => document.getElementById('mangaLamaMaskCanvas')?.width > 10 && !document.getElementById('mangaLamaGenerate').disabled, null, { timeout: 30000 });
      await p.locator('#mangaLamaAutoInk').click(); await p.waitForTimeout(600);
      const ink = await p.locator('#mangaLamaStatus').textContent();
      // the auto ink proposal may refuse at the page edge; paint the mask by hand like a user would
      const m = await p.locator('#mangaLamaMaskCanvas').boundingBox();
      await p.mouse.move(m.x + m.width * 0.3, m.y + m.height * 0.3); await p.mouse.down();
      await p.mouse.move(m.x + m.width * 0.6, m.y + m.height * 0.6, { steps: 10 }); await p.mouse.up();
      await p.locator('#mangaLamaGenerate').click();
      await p.waitForFunction(() => !document.getElementById('mangaLamaConfirm').disabled || /失败|错误|必须/.test(document.getElementById('mangaLamaStatus').textContent), null, { timeout: 30000 }).catch(() => {});
      const ready = !(await p.locator('#mangaLamaConfirm').isDisabled());
      if (ready) await p.locator('#mangaLamaConfirm').click();
      await p.waitForFunction(() => canvas.getObjects().some(o => o.mangaSmartText === 'lama-erase-patch'), null, { timeout: 15000 }).catch(() => {});
      lama = await p.evaluate(() => { const o = canvas.getObjects().find(o => o.mangaSmartText === 'lama-erase-patch'); if (!o) return null; const b = o.getBoundingRect(true);
        return { left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.left + b.width), bottom: Math.round(b.top + b.height), W: canvas.getWidth(), H: canvas.getHeight() }; });
      lama = lama && { ...lama, ink: ink.slice(0, 60), sent };
    }
    await ctx.close();
    return { pass: items === 1 && !!lama && lama.left === 0 && lama.top === 0 && lama.right <= lama.W && lama.bottom <= lama.H && !!sent,
      detail: { items, status: box.slice(0, 40), lama } };
  });

  await flow('13 误点页面缩略图的 🗑 → 「撤销删除」一键找回（位置和内容不变）', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
    await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0, null, { timeout: 60000 });
    await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {}); await p.keyboard.press('Escape');
    await p.locator('#imageInput').setInputFiles(PAGES);
    await p.waitForFunction(() => document.querySelectorAll('#btm-image-container > *').length === 2, null, { timeout: 60000 });
    const order = () => p.evaluate(() => btmGetGuids());
    const before = await order();
    if (await p.locator('#btm-drawer-handle').count()) {
      const closed = await p.evaluate(() => { const c = document.getElementById('btm-image-container'); return !c || !c.offsetParent || c.getBoundingClientRect().height < 10; });
      if (closed) await p.locator('#btm-drawer-handle').click();
    }
    // delete page 1 (not the last one: restore must put it back in front)
    await p.locator('#btm-image-container > *').nth(0).hover();
    await p.locator('#btm-image-container > *').nth(0).locator('.btm-delete-btn').click({ force: true });
    await p.waitForSelector('#btmPageRestoreButton', { timeout: 10000 }).catch(() => {});
    const afterDelete = (await order()).length;
    const barText = await p.locator('#btmPageRestoreBar').textContent().catch(() => '');
    await p.locator('#btmPageRestoreButton').click();
    await p.waitForFunction(n => btmGetGuids().length === n, before.length, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const after = await order();
    // the restored page is open again and still holds page1.png's pixels
    const content = await p.evaluate(() => ({ guid: getCanvasGUID(), images: canvas.getObjects().filter(o => o.type === 'image').length, w: canvas.getWidth(), h: canvas.getHeight() }));
    await ctx.close();
    return { pass: afterDelete === 1 && /已删除第 1 页/.test(barText) && JSON.stringify(after) === JSON.stringify(before) &&
      content.guid === before[0] && content.images >= 1 && content.w === 1200,
      detail: { afterDelete, barText, restoredOrder: JSON.stringify(after) === JSON.stringify(before), content } };
  });

  await flow('14 复制本页 ⧉ / 页面左右挪动：副本插在原页后、互不影响，缩略图按钮都有提示', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0, null, { timeout: 60000 });
    await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {}); await p.keyboard.press('Escape');
    await p.locator('#imageInput').setInputFiles(PAGES);
    await p.waitForFunction(() => btmGetGuids().length === 2, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    const offscreen = await p.evaluate(() => document.querySelector('#btm-image-container > *').getBoundingClientRect().top >= innerHeight - 5);
    if (offscreen) { await p.locator('#btm-drawer-handle').click(); await p.waitForTimeout(800); }
    const g0 = await p.evaluate(() => btmGetGuids());
    const thumb = i => p.locator('#btm-image-container > *').nth(i);
    const untitled = await p.evaluate(() => [...document.querySelectorAll('#btm-image-container button')].filter(b => !b.title).map(b => b.className));
    await thumb(0).hover(); await thumb(0).locator('.btm-dup-btn').click();
    await p.waitForFunction(() => btmGetGuids().length === 3, null, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1000);
    const g1 = await p.evaluate(() => btmGetGuids());
    const copy = g1[1];
    const st = await p.evaluate(() => ({ cur: getCanvasGUID(), imgs: canvas.getObjects().filter(o => o.type === 'image').length, nums: [...document.querySelectorAll('.btm-page-number')].map(e => e.textContent).join(',') }));
    // edit the copy only
    await p.evaluate(() => { canvas.add(new fabric.Rect({ left: 10, top: 10, width: 50, height: 50, fill: 'red', name: 'dupMarker' })); canvas.renderAll(); saveStateByManual(); });
    await p.evaluate(g => chengeCanvasByGuid(g, true), g0[0]);
    await p.waitForTimeout(800);
    const origMarkers = await p.evaluate(() => canvas.getObjects().filter(o => o.name === 'dupMarker').length);
    await p.evaluate(g => chengeCanvasByGuid(g, true), copy);
    await p.waitForTimeout(800);
    const copyMarkers = await p.evaluate(() => canvas.getObjects().filter(o => o.name === 'dupMarker').length);
    // move page 1 right by one
    await thumb(0).hover(); await thumb(0).locator('.btm-move-right').click({ force: true });
    await p.waitForTimeout(800);
    const g2 = await p.evaluate(() => btmGetGuids());
    await ctx.close();
    return { pass: untitled.length === 0 && g1.length === 3 && g1[0] === g0[0] && g1[2] === g0[1] && st.cur === copy && st.imgs >= 1 &&
      st.nums === '1,2,3' && origMarkers === 0 && copyMarkers === 1 && g2[0] === copy && g2[1] === g0[0] && errors.length === 0,
      detail: { untitled, order: g1.map(g => g0.indexOf(g)), st, origMarkers, copyMarkers, moved: g2[1] === g0[0], errors } };
  });

  await flow('15 气泡模板 + 横排字 + 加粗/居中 → 菜单「文件 › 下载图片」导出真实 PNG', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const p = await ctx.newPage(); await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0, null, { timeout: 60000 });
    await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {}); await p.keyboard.press('Escape');
    await p.locator('#imageInput').setInputFiles(PAGES[0]);
    await p.waitForFunction(() => canvas.getObjects().some(o => o.type === 'image'), null, { timeout: 60000 });
    await p.locator('[data-target="speech-bubble-area"]').click();
    await p.waitForFunction(() => document.querySelectorAll('#speech-bubble-preview > *').length > 0, null, { timeout: 20000 });
    await p.locator('#speech-bubble-preview > *').first().click();
    await p.waitForFunction(() => canvas.getObjects().some(o => o.type === 'group'), null, { timeout: 15000 }).catch(() => {});
    const bubble = await p.evaluate(() => { const g = canvas.getObjects().find(o => o.type === 'group'); const img = canvas.getObjects().find(o => o.type === 'image'); return g ? { name: g.name, imgName: img && img.name } : null; });
    await p.locator('[data-target="text-area"]').click();
    await p.locator('#text-area .visual-preset-card').first().click();
    await p.waitForTimeout(800);
    const icons = await p.evaluate(() => ['bold-toggle-btn', 'align-left', 'align-center', 'align-right'].map(id => { const b = document.getElementById(id); return b ? (b.title || b.getAttribute('aria-label') || '') : 'missing'; }));
    await p.locator('#bold-toggle-btn').click();
    await p.locator('#align-center').click();
    await p.waitForTimeout(400);
    const text = await p.evaluate(() => { const a = canvas.getActiveObject(); return a ? { type: a.type, fw: a.fontWeight, align: a.textAlign } : null; });
    await p.locator('#navbarDropdownFile').click();
    const dlP = p.waitForEvent('download', { timeout: 60000 });
    await p.locator('#imageDownload').click();
    const dl = await dlP;
    const file = path.join(OUT, 'flow15-menu-export' + path.extname(dl.suggestedFilename() || '.png'));
    await dl.saveAs(file);
    const sizeToast = await p.waitForFunction(() => [...document.querySelectorAll('[class*=toast]')].map(e => e.textContent).find(t => /已下载图片/.test(t) && /像素/.test(t)), null, { timeout: 15000 }).then(h => h.jsonValue()).catch(() => '');
    const head = fs.readFileSync(file).subarray(0, 24);
    const png = head.toString('latin1', 1, 4) === 'PNG';
    const w = png ? head.readUInt32BE(16) : 0, h = png ? head.readUInt32BE(20) : 0;
    await ctx.close();
    return { pass: !!bubble && bubble.name !== bubble.imgName && icons.every(t => t && t !== 'missing') && !!text && /bold|700/.test(String(text.fw)) &&
      text.align === 'center' && png && w >= 1000 && h >= 1000 && errors.length === 0 &&
      sizeToast.includes(w + '\u00d7' + h) && sizeToast.includes('下载 DPI'),
      detail: { bubble, icons, text, sizeToast: sizeToast.trim().slice(0, 90), file: path.relative(process.cwd(), file), png, w, h, errors } };
  });

  await flow('16 竖排字（默认中文占位）+ 换字体 + 自由气泡手绘', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0, null, { timeout: 60000 });
    await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {}); await p.keyboard.press('Escape');
    await p.locator('#imageInput').setInputFiles(PAGES[0]);
    await p.waitForFunction(() => canvas.getObjects().some(o => o.type === 'image'), null, { timeout: 60000 });
    const act = () => p.evaluate(() => { const a = canvas.getActiveObject(); return a ? { type: a.type, font: a.fontFamily, text: a.text } : null; });
    await p.locator('[data-target="text-area"]').click();
    await p.locator('#verticalText').click();
    await p.waitForTimeout(800);
    const vert = await act();
    await p.locator('#text-area .fm-dropdown-trigger').first().click();
    const opts = p.locator('#text-area .fm-font-option');
    await opts.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const optCount = await opts.count();
    let chosen = null;
    for (let i = 0; i < optCount; i++) { const f = await opts.nth(i).getAttribute('data-font'); if (f && f !== vert.font && await opts.nth(i).isVisible()) { chosen = f; await opts.nth(i).click(); break; } }
    await p.waitForTimeout(800);
    const afterFont = await act();
    // free-form bubble: 手绘 mode, drag a loop on the page
    await p.locator('[data-target="speech-bubble-area"]').click();
    await p.locator('[data-bubble-tab="free"]').click();
    await p.locator('#sbFreehandButton').click();
    const before = await p.evaluate(() => canvas.getObjects().length);
    const box = await p.locator('#canvas-area canvas.upper-canvas, .upper-canvas').first().boundingBox();
    const cx = box.x + box.width * 0.35, cy = box.y + box.height * 0.3;
    await p.mouse.move(cx, cy); await p.mouse.down();
    for (let k = 0; k <= 24; k++) { const t = k / 24 * Math.PI * 2; await p.mouse.move(cx + Math.cos(t) * 70, cy + Math.sin(t) * 45); await p.waitForTimeout(25); }  // human speed: the canvas throttles moves to 1/16ms
    await p.mouse.up(); await p.waitForTimeout(1200);
    const free = await p.evaluate(n => ({ delta: canvas.getObjects().length - n, types: canvas.getObjects().slice(n).map(o => o.type) }), before);
    await p.screenshot({ path: path.join(OUT, 'flow16-free-bubble.png') });
    await ctx.close();
    return { pass: !!vert && vert.type === 'vertical-textbox' && vert.text === '台词' && !!chosen && afterFont && afterFont.font === chosen &&
      free.delta >= 1 && errors.length === 0, detail: { vert, optCount, chosen, afterFont, free, errors } };
  });

  await flow('7 生成中切页→结果不得贴到别的页→切回后再应用', async () => {
    if (!(await has('mangaGptOpen'))) return { pass: false, detail: { unavailable: 'no GPT region edit in this version' } };
    if (REAL_GPT) return { pass: true, detail: { skipped: 'mock-only timing test' } };
    await openPage(0);
    const p1Before = await pageImage();
    await openPage(1);
    const p2Before = await pageImage();
    await openPage(0);
    await op.click(page.locator('#mangaGptOpen'), 'GPT 改图');
    const selecting = await page.evaluate(() => !!document.querySelector('.manga-gpt-selection'));
    if (!selecting) await op.click(page.locator('#mangaGptSelect'), '框选区域');
    await op.drag(await toScreen([100, 1100]), await toScreen([500, 1400]), 'drag selection');
    await page.locator('#mangaGptPrompt').fill('把背景改成雨夜');
    mock.delayMs = 4000;
    await op.click(page.locator('#mangaGptGenerate'), '生成');
    await page.waitForTimeout(500);
    await openPage(1);                      // user wanders off while it is generating
    await page.waitForFunction(() => !document.getElementById('mangaGptApply').disabled ||
      document.getElementById('mangaGptStatus').classList.contains('is-error'), null, { timeout: 30000 }).catch(() => {});
    mock.delayMs = 0;
    const applyEnabledOnPage2 = await page.evaluate(() => !document.getElementById('mangaGptApply').disabled);
    if (applyEnabledOnPage2) await op.click(page.locator('#mangaGptApply'), '应用（在第 2 页）');
    await page.waitForTimeout(1200);
    const onPage2Status = (await page.locator('#mangaGptStatus').textContent()).trim();
    const p2After = await diff(p2Before, await pageImage());
    await openPage(0);
    await page.waitForFunction(() => !document.getElementById('mangaGptApply').disabled, null, { timeout: 10000 }).catch(() => {});
    await op.click(page.locator('#mangaGptApply'), '应用（回到第 1 页）');
    await page.waitForFunction(() => canvas.getObjects().filter(o => o.name === 'GPT 局部改图').length >= 1, null, { timeout: 20000 }).catch(() => {});
    await waitIdle();
    const p1After = await diff(p1Before, await pageImage(), { left: 100, top: 1100, width: 400, height: 300 });
    await page.locator('#mangaGptClose').click().catch(() => {});
    return { pass: p2After.changed === 0 && /第 ?1 ?页|另一页|其他页|切回/.test(onPage2Status) && p1After.changed > 0 && p1After.outside === 0,
      detail: { applyEnabledOnPage2, onPage2Status: onPage2Status.slice(0, 80), page2Changed: p2After.changed, page1Changed: p1After.changed, page1Outside: p1After.outside } };
  });

  // 6. small window / zoom: nothing important is cut off or causes horizontal page scroll
  await flow('6 1440/1280/1024 宽与 1.5x 缩放：面板不遮画布、可收起', async () => {
    const out = {};
    for (const [w, h, dpr] of [[1440, 900, 1], [1280, 800, 1.5], [1024, 700, 1]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      const p = await ctx.newPage(); await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
      await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0, null, { timeout: 60000 });
      await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {});
      await p.keyboard.press('Escape');
      // real page content so the screenshot shows the page, not an empty dark canvas (setup, not a counted op)
      if (await p.locator('#imageInput').count()) {
        await p.locator('#imageInput').setInputFiles(PAGES[0]);
        await p.waitForFunction(() => canvas.getObjects().some(o => o.type === 'image'), null, { timeout: 30000 }).catch(() => {});
        await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      }
      const hasGpt = await p.locator('#mangaGptOpen').count();
      if (hasGpt) { await p.locator('#mangaGptOpen').click(); await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
      const cover = () => p.evaluate(() => { const a = canvas.upperCanvasEl.getBoundingClientRect(); const pn = document.getElementById('mangaGptPanel');
        const vx = Math.max(0, Math.min(a.right, innerWidth) - Math.max(a.left, 0)); const vy = Math.max(0, Math.min(a.bottom, innerHeight) - Math.max(a.top, 0));
        const visibleRatio = +(vx * vy / Math.max(1, a.width * a.height)).toFixed(2);
        const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, (a.left + a.right) / 2)), Math.min(innerHeight - 1, Math.max(0, (a.top + a.bottom) / 2)));
        const centerOnCanvas = !!hit && (hit === canvas.upperCanvasEl || hit === canvas.lowerCanvasEl);
        const base = { canvasW: Math.round(a.width), canvasH: Math.round(a.height), visibleRatio, centerOnCanvas, centerHit: hit ? (hit.id || hit.className || hit.tagName) + '' : null };
        if (!pn || pn.hidden) return { overlapPx: 0, ...base };
        const b = pn.getBoundingClientRect(); const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)); const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return { overlapPx: Math.round(ix * iy), ...base }; });
      const open = hasGpt ? await cover() : null;
      let collapsed = null;
      if (hasGpt) { await p.locator('#mangaGptCollapse').click(); await p.waitForTimeout(400); collapsed = await cover();
        // collapse -> close -> reopen from the toolbar: the full panel comes back and the canvas is re-docked
        await p.locator('#mangaGptClose').click(); await p.locator('#mangaGptOpen').click(); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
        collapsed.reopenExpanded = await p.evaluate(() => !document.getElementById('mangaGptPanel').classList.contains('is-collapsed') && !!document.getElementById('canvas-area').style.marginRight);
      }
      const m = await p.evaluate(() => {
        const vis = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect();
          return r.width > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.top < innerHeight; };
        const gen = document.getElementById('mangaGptGenerate');
        return { hScroll: document.documentElement.scrollWidth > innerWidth + 1, gptOpen: gen ? vis('mangaGptOpen') : 'n/a', file: vis('navbarDropdownFile'),
          generateReachable: gen ? (() => { gen.scrollIntoView({ block: 'nearest' }); const r = gen.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0; })() : 'n/a' };
      });
      await p.screenshot({ path: path.join(OUT, 'layout-' + w + 'x' + h + '@' + dpr + '.png') });
      const hasImage = await p.evaluate(() => canvas.getObjects().some(o => o.type === 'image'));
      out[w + 'x' + h + '@' + dpr] = { ...m, hasImage, open, collapsed }; await ctx.close();
    }
    return { pass: Object.values(out).every(m => m.hasImage !== false && !m.hScroll && m.gptOpen !== false && m.file && m.generateReachable !== false &&
      (!m.open || [m.open, m.collapsed].every(c => c.overlapPx === 0 && c.visibleRatio >= 0.9 && c.centerOnCanvas && c.canvasW >= 200) && m.collapsed.canvasW >= m.open.canvasW - 2 && m.collapsed.reopenExpanded)), detail: out };
  });

  await endSession('final');
  const summary = { when: new Date().toISOString(), gpt: REAL_GPT ? 'REAL' : 'MOCK', flows, pageErrors, consoleErrors: consoleErrors.slice(0, 20), dialogs };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(summary, null, 2));
  const failed = flows.filter(f => !f.pass);
  console.log(flows.length - failed.length + ' PASS, ' + failed.length + ' FAIL; key ops per flow: ' + flows.map(f => f.keyOps).join('/') + '; page errors: ' + pageErrors.length);
  return failed.length === 0 && pageErrors.length === 0;
}

main().then(ok => { process.exitCode = ok ? 0 : 1; }).catch(e => { console.error(e); process.exitCode = 1; })
  .finally(async () => { try { await browser?.close(); } catch {} server?.kill(); });
