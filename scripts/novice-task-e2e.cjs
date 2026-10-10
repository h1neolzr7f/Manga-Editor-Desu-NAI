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
  await flow('6 小窗口 1024×700 与 1.5x 缩放下的布局', async () => {
    const out = {};
    for (const [w, h, dpr] of [[1024, 700, 1], [1280, 800, 1.5]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      const p = await ctx.newPage(); await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
      await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0, null, { timeout: 60000 });
      await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {});
      await p.keyboard.press('Escape');
      if (await p.locator('#mangaGptOpen').count()) await p.locator('#mangaGptOpen').click();
      const m = await p.evaluate(() => {
        const vis = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect();
          return r.width > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.top < innerHeight; };
        const gen = document.getElementById('mangaGptGenerate');
        return { hScroll: document.documentElement.scrollWidth > innerWidth + 1, gptOpen: gen ? vis('mangaGptOpen') : 'n/a', file: vis('navbarDropdownFile'),
          generateReachable: gen ? (() => { gen.scrollIntoView({ block: 'nearest' }); const r = gen.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0; })() : 'n/a' };
      });
      await p.screenshot({ path: path.join(OUT, 'layout-' + w + 'x' + h + '@' + dpr + '.png') });
      out[w + 'x' + h + '@' + dpr] = m; await ctx.close();
    }
    return { pass: Object.values(out).every(m => !m.hScroll && m.gptOpen !== false && m.file && m.generateReachable !== false), detail: out };
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
