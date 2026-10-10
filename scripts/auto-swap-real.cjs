// 换角色 v2 evidence run: page-4 → auto-detect → click a character → reference → 生成 → 应用 (+ optional propagation).
// SWAP_REAL=1 uses the configured relay (key only in the server env, never in the page); default = mock GPT.
// Env: SWAP_OUT (dir), SWAP_POINT="x,y" (page px), SWAP_PROPAGATE=1, GPT_TEST_ENV_FILE, GPT_IMAGE_BASE_URL.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs'); const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const OUT = process.env.SWAP_OUT || path.join(ROOT, 'artifacts', 'swap2');
const REAL = process.env.SWAP_REAL === '1';
const PORT = 8000, SERVER = 'http://127.0.0.1:' + PORT;
fs.mkdirSync(OUT, { recursive: true });

function startServer() {
  const env = { ...process.env };
  if (REAL) {
    const line = fs.readFileSync(process.env.GPT_TEST_ENV_FILE, 'utf8').split(/\r?\n/).find(l => l.startsWith('GPT_IMAGE_API_KEY='));
    env.GPT_IMAGE_API_KEY = line.slice('GPT_IMAGE_API_KEY='.length).trim();
  }
  const proc = spawn(process.env.PYTHON || 'python3', ['99_server.py'], { cwd: ROOT, env: { ...env, PORT: String(PORT) }, stdio: 'ignore' });
  return new Promise(ok => setTimeout(() => ok(proc), 2500));
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  const log = { real: REAL, started: new Date().toISOString(), steps: [] };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  const calls = [];
  p.on('request', r => { if (r.url().endsWith('/gpt-image-proxy')) { const b = r.postDataJSON(); calls.push({ t: Date.now(), model: b.model, size: b.size, refs: (b.references || []).length, kind: /Remove the person/.test(b.prompt) ? 'bg' : 'char' }); } });
  p.on('response', async r => { if (r.url().endsWith('/gpt-image-proxy')) log.steps.push({ proxy: r.status(), at: new Date().toISOString() }); });
  if (!REAL) {
    await p.route('**/gpt-image-proxy', async route => {
      const body = route.request().postDataJSON(); const kind = /Remove the person/.test(body.prompt) ? 'bg' : 'char';
      const image = await p.evaluate(async ({ src, size, kind }) => {
        const [w, h] = size.split('x').map(Number); const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
        const i = new Image(); i.src = src; await i.decode();
        if (kind === 'bg') { g.drawImage(i, 0, 0, w, h); g.fillStyle = 'rgba(235,235,235,.85)'; g.fillRect(w * .2, h * .1, w * .6, h * .85); }
        else { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#d0507a'; g.beginPath(); g.ellipse(w / 2, h * .55, w * .22, h * .38, 0, 0, 7); g.fill(); }
        return c.toDataURL('image/png');
      }, { src: body.image, size: body.size, kind });
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, image }) });
    });
  }
  try {
    await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0 && !!document.getElementById('taskBar'), null, { timeout: 60000 });
    await p.locator('#tutorialSkipBtn').click({ timeout: 5000 }).catch(() => {}); await p.keyboard.press('Escape');
    await p.evaluate(({ url }) => { const u = document.getElementById('mangaGptUrl'); if (u && url) u.value = url; const m = document.getElementById('mangaGptModel'); if (m) m.value = 'gpt-image-2.5'; const k = document.getElementById('mangaGptKey'); if (k) k.value = ''; },
      { url: process.env.GPT_IMAGE_BASE_URL || '' });
    await p.locator('#imageInput').setInputFiles(path.join(ROOT, 'scripts', 'fixtures', 'ctd', 'page-4.png'));
    await p.waitForFunction(() => canvas.getObjects().some(o => o.type === 'image'), null, { timeout: 30000 }); await p.waitForTimeout(800);
    await p.locator('#taskMore').click(); await p.locator('#uiModeToggle').click();
    await p.locator('#taskBtn-swap').click();
    await p.waitForFunction(() => /找到 \d+ 个人物|没有自动找到/.test((document.getElementById('autoSwapStatus') || {}).textContent || ''), null, { timeout: 240000 });
    await p.screenshot({ path: path.join(OUT, '1-detected.png') });
    const [fx, fy] = (process.env.SWAP_POINT || '150,660').split(',').map(Number);
    const q = await p.evaluate(([x, y]) => { const u = canvas.upperCanvasEl.getBoundingClientRect(); return { x: u.left + x * u.width / canvas.getWidth(), y: u.top + y * u.height / canvas.getHeight() }; }, [fx, fy]);
    await p.mouse.click(q.x, q.y);
    await p.waitForFunction(() => AutoSwap.state() && AutoSwap.state().target, null, { timeout: 60000 });
    await p.locator('#autoSwapRef').setInputFiles(path.join(ROOT, 'scripts', 'fixtures', 'novice', 'reference.png'));
    await p.screenshot({ path: path.join(OUT, '2-target.png') });
    const t0 = Date.now();
    await p.locator('#autoSwapGo').click();
    await p.waitForFunction(() => /预览好了|生成失败/.test(document.getElementById('autoSwapStatus').textContent), null, { timeout: 600000 });
    log.genSeconds = Math.round((Date.now() - t0) / 1000);
    log.status = await p.locator('#autoSwapStatus').textContent();
    log.state = await p.evaluate(() => AutoSwap.state());
    await p.screenshot({ path: path.join(OUT, '3-preview.png') });
    if (log.state.result) {
      await p.locator('#autoSwapCompare').click(); await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(OUT, '4-compare-before.png') }); await p.locator('#autoSwapCompare').click();
      await p.locator('#autoSwapApply').click();
      await p.waitForFunction(() => canvas.getObjects().some(o => o.autoSwap === 'character'), null, { timeout: 30000 });
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      const page = await p.evaluate(() => MangaGPTRegionEditor.pageImage(true).image);
      fs.writeFileSync(path.join(OUT, '5-page-after.png'), Buffer.from(page.split(',')[1], 'base64'));
      // the two layers alone, for inspection
      const parts = await p.evaluate(() => canvas.getObjects().filter(o => o.autoSwap).map(o => ({ name: o.name, src: o.getSrc ? o.getSrc() : o._element.src, left: o.left, top: o.top })));
      parts.forEach((x, i) => fs.writeFileSync(path.join(OUT, '6-layer-' + (i + 1) + '-' + (x.name.includes('背景') ? 'bg' : 'character') + '.png'), Buffer.from(x.src.split(',')[1], 'base64')));
      log.layers = parts.map(x => ({ name: x.name, left: x.left, top: x.top }));
      if (process.env.SWAP_PROPAGATE === '1' && log.state.matches.length) {
        const t1 = Date.now();
        await p.locator('#autoSwapAll').click();
        await p.waitForFunction(() => /已换好/.test(document.getElementById('autoSwapStatus').textContent), null, { timeout: 900000 });
        log.propagate = { seconds: Math.round((Date.now() - t1) / 1000), status: await p.locator('#autoSwapStatus').textContent() };
        const page2 = await p.evaluate(() => MangaGPTRegionEditor.pageImage(true).image);
        fs.writeFileSync(path.join(OUT, '7-page-propagated.png'), Buffer.from(page2.split(',')[1], 'base64'));
      }
    }
  } catch (e) { log.error = String(e && e.message || e); await p.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {}); }
  log.calls = calls.map(c => ({ ...c, t: undefined }));
  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 2));
  console.log(JSON.stringify({ real: REAL, gen: log.genSeconds, status: (log.status || '').slice(0, 80), info: log.state && log.state.info, calls: calls.length, error: log.error, propagate: log.propagate }));
  await browser.close(); server.kill();
})();
