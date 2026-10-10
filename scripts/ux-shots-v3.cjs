// v3 layout before/after shots (TAG=before|after) at 1440x900 and 1280x800, Chinese, mock GPT.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const REAL = process.env.REAL === '1';
const OUT = '/workspace/shots-20261010/v3'; const TAG = process.env.TAG || 'after';
const FIX = path.join(__dirname, 'fixtures', 'novice');
const SERVER = 'http://127.0.0.1:8000';
const RELAY = process.env.GPT_REAL_BASE_URL || '';
fs.mkdirSync(OUT, { recursive: true });
const shots = []; const real = {};
async function startServer() {
  const env = { ...process.env };
  if (REAL) {
    const line = fs.readFileSync(process.env.GPT_TEST_ENV_FILE, 'utf8').split(/\r?\n/).find(l => l.startsWith('GPT_IMAGE_API_KEY='));
    env.GPT_IMAGE_API_KEY = line.slice(18).trim(); env.GPT_IMAGE_TRUSTED_BASE_URL = RELAY;
  }
  const srv = spawn(process.env.PYTHON || 'python3', ['99_server.py'], { cwd: ROOT, env, stdio: 'ignore' });
  for (let i = 0; i < 150; i++) { try { if ((await fetch(SERVER + '/index.html')).ok) return srv; } catch (e) { /* wait */ } await new Promise(r => setTimeout(r, 200)); }
  throw new Error('server not ready');
}
async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.vp || { width: 1440, height: 900 }, locale: 'zh-CN', acceptDownloads: true });
  if (opts.pro) await ctx.addInitScript(() => localStorage.setItem('mnai.uiMode', 'pro'));
  if (opts.light) await ctx.addInitScript(() => localStorage.setItem('mode', 'light-mode'));
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
  if (!REAL) await p.route('**/gpt-image-proxy', async route => {
    const b = route.request().postDataJSON();
    if (b.operation === 'models') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, models: ['gpt-image-2', 'gpt-image-2.5'], imageModels: ['gpt-image-2', 'gpt-image-2.5'] }) });
    const image = await p.evaluate(async ({ src, size }) => { const [w, h] = (size && size !== 'auto' ? size : '1024x1024').split('x').map(Number); const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h);
      if (src) { const i = new Image(); i.src = src; await i.decode(); g.drawImage(i, 0, 0, w, h); } g.fillStyle = 'rgba(60,120,230,.25)'; g.fillRect(w * .25, h * .2, w * .5, h * .6); return c.toDataURL('image/png'); }, { src: b.image, size: b.size });
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, image }) });
  });
  await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0 && !!document.getElementById('taskBar'), null, { timeout: 60000 });
  if (await p.locator('#tutorialSkipBtn').waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false)) await p.keyboard.press('Escape');
  await p.waitForTimeout(1200);
  if (REAL) { await p.locator('#taskMore').click(); await p.locator('#taskServiceSettings').click(); await p.locator('#mangaGptUrl').fill(RELAY); await p.locator('#mangaGptKey').fill(''); await p.locator('#svcDone').click(); }
  if (opts.import !== false) {
    if (opts.pro) await p.locator('#imageInput').setInputFiles(path.join(FIX, 'page1.png')); else { const fc = p.waitForEvent('filechooser'); await p.locator('#taskHomeImport').click(); await (await fc).setFiles(path.join(FIX, 'page1.png')); }
    await p.waitForFunction(() => canvas.getObjects().some(o => o.type === 'image'), null, { timeout: 60000 }); await p.waitForTimeout(1200);
  }
  return { ctx, p };
}
async function shot(p, name, caption) { const f = path.join(OUT, name + '.png'); await p.screenshot({ path: f }); shots.push({ file: f, caption }); }
async function drag(p, a, b) {
  const r = await p.evaluate(() => { const img = canvas.getObjects().find(o => o.type === 'image'); const bb = img.getBoundingRect(); const u = canvas.upperCanvasEl.getBoundingClientRect(); const sx = u.width / canvas.getWidth(), sy = u.height / canvas.getHeight(); return { x: u.left + bb.left * sx, y: u.top + bb.top * sy, w: bb.width * sx, h: bb.height * sy }; });
  await p.mouse.move(r.x + r.w * a[0], r.y + r.h * a[1]); await p.mouse.down(); await p.mouse.move(r.x + r.w * b[0], r.y + r.h * b[1], { steps: 12 }); await p.mouse.up();
}
async function gptResult(p, timeout) { await p.waitForFunction(() => !document.getElementById('mangaGptCompare').hidden || document.getElementById('mangaGptStatus').dataset.error === 'true', null, { timeout }); }
async function main() {
  const server = await startServer(); const browser = await chromium.launch();
  try {
    let s = await open(browser, { import: false });
    await shot(s.p, `${TAG}-1-launcher`, '新手首页（1440x900）'); await s.ctx.close();
    s = await open(browser); let p = s.p;
    await shot(p, `${TAG}-2-editor`, '新手模式·已导入一页（1440x900）');
    await p.locator('#taskBtn-swap').click(); await p.locator('#autoSwapManual').click(); await drag(p, [0.3, 0.1], [0.75, 0.6]); await p.waitForTimeout(500);
    await shot(p, `${TAG}-3-wizard`, '换角色向导·已框选（1440x900）'); await s.ctx.close();
    s = await open(browser, { pro: true }); await shot(s.p, `${TAG}-4-pro`, '专业模式·已导入一页（1440x900）'); await s.ctx.close();
    s = await open(browser, { vp: { width: 1280, height: 800 } }); p = s.p;
    await shot(p, `${TAG}-5-editor-1280`, '新手模式·已导入一页（1280x800）');
    const ov = await p.evaluate(() => { const c = canvas.upperCanvasEl.getBoundingClientRect(); const hits = []; for (const el of document.querySelectorAll('#taskBar, #taskQuickBar, .manga-gpt-panel, #taskMoreMenu')) { const r = el.getBoundingClientRect(); if (!r.width || getComputedStyle(el).display === 'none' || el.hidden) continue; if (r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top) hits.push(el.id || el.className); } return { canvas: [Math.round(c.left), Math.round(c.top), Math.round(c.width), Math.round(c.height)], hits }; });
    shots.push({ overlap1280: ov }); await s.ctx.close();
  } finally { await browser.close(); server.kill(); }
  fs.writeFileSync(path.join(OUT, `${TAG}-index.json`), JSON.stringify(shots, null, 2)); console.log(JSON.stringify(shots.slice(-1)));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
