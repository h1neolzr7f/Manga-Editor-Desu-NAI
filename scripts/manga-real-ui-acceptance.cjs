// REAL (unmocked) Chromium acceptance for the local OCR -> Manga OCR -> LaMa flow.
// Uses the real 99_server.py, real Tesseract, real manga-ocr and real simple-lama-inpainting
// (start with PYTHON=<python that has them>). /manga-smart/* is NOT intercepted.
// LaMa runs with an empty TORCH_HOME so the real 428 -> confirm dialog -> download path is exercised.
// Checks that pixels outside the LaMa mask are unchanged on canvas, after PNG export and after
// project save/reload.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SERVER = 'http://127.0.0.1:8000';
const OUT = path.join(ROOT, 'artifacts', 'real-ui');
fs.mkdirSync(OUT, { recursive: true });
const python = process.env.PYTHON || 'python3';
const torchHome = process.env.REAL_UI_TORCH_HOME || fs.mkdtempSync(path.join(os.tmpdir(), 'mnai-torch-'));
const results = []; const dialogs = []; const requests = [];
let server, browser, page, failed = 0;
const record = (name, pass, detail) => {
  results.push({ name, pass, detail }); if (!pass) failed++;
  console.log((pass ? 'PASS ' : 'FAIL ') + name + ' ' + JSON.stringify(detail || {}));
};

async function main() {
  server = spawn(python, ['99_server.py'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NAI_QUIET: '1', TORCH_HOME: torchHome, GPT_IMAGE_API_KEY: '', NOVELAI_API_KEY: '' } });
  let logs = ''; server.stdout.on('data', b => logs += b); server.stderr.on('data', b => logs += b);
  for (let i = 0; ; i++) {
    try { if ((await fetch(SERVER + '/index.html')).ok) break; } catch {}
    if (i > 100 || server.exitCode !== null) throw new Error('server failed ' + logs);
    await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch({ headless: true });
  page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  page.on('request', r => { if (r.url().endsWith('/manga-smart/ocr')) fs.writeFileSync(path.join(OUT, 'ocr-request.json'), r.postData() || ''); });
  page.on('request', r => { if (r.url().includes('/manga-smart/')) requests.push(r.url().split('/manga-smart/')[1] + ':' + (JSON.parse(r.postData() || '{}').allow_download === true)); });
  await page.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
  await page.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0 && typeof fabric !== 'undefined' &&
    typeof saveStateByManual === 'function', null, { timeout: 60000 });
  const skip = page.locator('#tutorialSkipBtn'); if (await skip.count() && await skip.isVisible()) await skip.click();
  await page.keyboard.press('Escape');

  // Busy manga-like art: screentone everywhere, a crossing line, white bubble with vertical-free horizontal text.
  const size = await page.evaluate(async () => {
    await document.fonts.load('48px "Noto Sans CJK JP"');
    canvas.clear(); const W = canvas.getWidth(), H = canvas.getHeight();
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#555';
    for (let y = 0; y < H; y += 7) for (let x = (y / 7 % 2) * 3; x < W; x += 7) g.fillRect(x, y, 2, 2);
    g.strokeStyle = '#000'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 520); g.lineTo(W, 380); g.stroke();
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(420, 300, 260, 110, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#000'; g.font = '56px "Noto Sans CJK JP"'; g.fillText('ありがとう', 280, 320);
    const img = await new Promise(r => fabric.Image.fromURL(cv.toDataURL('image/png'), r));
    img.set({ left: 0, top: 0, selectable: true }); canvas.add(img); canvas.renderAll();
    return [W, H];
  });
  const snap = () => page.evaluate(() => canvas.toDataURL({ format: 'png', multiplier: 1 }));
  const exportPng = () => page.evaluate(async () => (await getCropAndDownloadLinkByMultiplier(1, 'png')).href);
  const before = await snap(); const beforeExport = await exportPng();
  fs.writeFileSync(path.join(OUT, 'before.png'), Buffer.from(before.split(',')[1], 'base64'));

  // Real Tesseract OCR.
  await page.locator('#mangaSmartOpen').click();
  await page.locator('#mangaSmartLanguage').selectOption('jpn+eng');
  let t = Date.now();
  await page.locator('#mangaSmartDetect').click();
  await page.waitForFunction(() => document.querySelector('.manga-smart-item textarea') || /失败|错误|未|没有/.test(document.getElementById('mangaSmartStatus')?.textContent || ''), null, { timeout: 60000 });
  console.log('status:', await page.locator('#mangaSmartStatus').textContent());
  await page.screenshot({ path: path.join(OUT, 'after-detect.png') });
  const ocr = await page.evaluate(() => [...document.querySelectorAll('.manga-smart-item textarea')].map(t => t.value));
  record('REAL UI: Tesseract detects the bubble text', ocr.some(v => (v.match(/[ありがとう]/g) || []).length >= 4),
    { ocr, ms: Date.now() - t });
  const item = page.locator('.manga-smart-item').filter({ has: page.locator('textarea') }).first();

  // Real manga-ocr (weights expected in HF cache from the HTTP test; dialog accepted if not).
  t = Date.now();
  await item.locator('button').filter({ hasText: 'Manga OCR 精修' }).click();
  await page.waitForFunction(() => /ありがとう/.test(document.querySelector('.manga-smart-item textarea')?.value || '') ||
    /失败|错误|未安装/.test(document.getElementById('mangaSmartStatus')?.textContent || ''), null, { timeout: 600000 });
  const refined = await page.evaluate(() => document.querySelector('.manga-smart-item textarea').value);
  record('REAL UI: Manga OCR refine returns the text', /ありがとう/.test(refined), { refined, ms: Date.now() - t });

  // Real LaMa with empty TORCH_HOME: 428 -> confirm dialog -> download -> preview -> apply.
  const objectsBefore = await page.evaluate(() => canvas.getObjects().length);
  await item.locator('button').filter({ hasText: '本地 LaMa 去字' }).click();
  await page.waitForFunction(() => document.getElementById('mangaLamaMaskCanvas')?.width > 10 &&
    !document.getElementById('mangaLamaGenerate').disabled, null, { timeout: 30000 });
  const dialogsBefore = dialogs.length; t = Date.now();
  await page.locator('#mangaLamaGenerate').click();
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !document.getElementById('mangaLamaConfirm').disabled ||
    (!document.getElementById('mangaLamaGenerate').disabled && !/^先调整/.test(document.getElementById('mangaLamaStatus').textContent)),
    null, { timeout: 300000 });
  const lamaStatus = await page.locator('#mangaLamaStatus').textContent();
  const lamaDialogs = dialogs.slice(dialogsBefore);
  record('REAL UI: LaMa asks before downloading weights, then downloads and previews',
    lamaDialogs.length === 1 && /LaMa|下载/.test(lamaDialogs[0]) && !(await page.locator('#mangaLamaConfirm').isDisabled()) &&
    fs.existsSync(path.join(torchHome, 'hub', 'checkpoints', 'big-lama.pt')),
    { dialog: lamaDialogs[0], status: lamaStatus, ms: Date.now() - t, requests: requests.filter(r => r.startsWith('lama')) });
  const previewCount = await page.evaluate(() => canvas.getObjects().length);
  record('REAL UI: LaMa preview does not touch the canvas', previewCount === objectsBefore, { previewCount, objectsBefore });
  await page.locator('#mangaLamaConfirm').click();
  await page.waitForFunction(() => canvas.getObjects().some(o => o.mangaSmartText === 'lama-erase-patch'), null, { timeout: 30000 });
  const after = await snap(); const afterExport = await exportPng();
  fs.writeFileSync(path.join(OUT, 'after-lama.png'), Buffer.from(after.split(',')[1], 'base64'));
  // Alpha map of the patch alone in canvas coordinates.
  const alphaMap = await page.evaluate(() => {
    const others = canvas.getObjects().filter(o => o.mangaSmartText !== 'lama-erase-patch');
    const bg = canvas.backgroundColor; others.forEach(o => o.visible = false); canvas.backgroundColor = null;
    const url = canvas.toDataURL({ format: 'png', multiplier: 1 });
    others.forEach(o => o.visible = true); canvas.backgroundColor = bg; canvas.renderAll(); return url;
  });

  const cmp = (a, b, mapUrl) => page.evaluate(async ([a, b, m]) => {
    const load = async u => { const i = new Image(); i.src = u; await i.decode(); const c = document.createElement('canvas');
      c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, c.width, c.height); };
    const A = await load(a), B = await load(b), M = m ? await load(m) : null;
    if (A.width !== B.width || A.height !== B.height) return { sizeMismatch: [A.width, A.height, B.width, B.height] };
    let outsideChanged = 0, insideChanged = 0, inside = 0, maxOutside = 0;
    for (let p = 0; p < A.data.length; p += 4) {
      const masked = M && M.data[p + 3] > 0;
      const d = Math.max(Math.abs(A.data[p] - B.data[p]), Math.abs(A.data[p + 1] - B.data[p + 1]), Math.abs(A.data[p + 2] - B.data[p + 2]));
      if (masked) { inside++; if (d) insideChanged++; } else if (d) { outsideChanged++; maxOutside = Math.max(maxOutside, d); }
    }
    return { size: [A.width, A.height], outsideChanged, maxOutside, inside, insideChanged };
  }, [a, b, mapUrl]);

  const c1 = await cmp(before, after, alphaMap);
  record('REAL UI: canvas pixels outside the LaMa mask are unchanged', c1.outsideChanged === 0 && c1.insideChanged > 0, c1);
  const c2 = await cmp(beforeExport, afterExport, alphaMap);
  record('REAL UI: exported PNG pixels outside the LaMa mask are unchanged', c2.outsideChanged === 0 && c2.insideChanged > 0, c2);
  const textGone = await page.evaluate(async u => {
    const i = new Image(); i.src = u; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
    const g = c.getContext('2d'); g.drawImage(i, 0, 0); const d = g.getImageData(280, 270, 290, 65).data; let dark = 0;
    for (let p = 0; p < d.length; p += 4) if (d[p] + d[p + 1] + d[p + 2] < 200) dark++; return dark;
  }, after);
  record('REAL UI: LaMa removed the dark text strokes in the bubble', textGone < 300, { darkPixelsLeft: textGone });

  const reload = await page.evaluate(async () => {
    const r = await generateBlobProjectFile(); allRemove(); await loadLz4BlobProjectFile(r.lz4Blob);
    await new Promise(res => setTimeout(res, 3000));
    return { bytes: r.lz4Blob.size, patch: canvas.getObjects().some(o => o.mangaSmartText === 'lama-erase-patch') };
  });
  const reloaded = await snap();
  const c3 = await cmp(after, reloaded, null);
  record('REAL UI: project save/reload keeps the LaMa layer pixel-identical', reload.patch && c3.outsideChanged === 0, { ...reload, ...c3 });
  await page.screenshot({ path: path.join(OUT, 'real-ui-final.png') });
}

main().catch(async e => { failed++; console.error('ERROR', e.message); try { console.error('status:', await page.evaluate(() => [document.getElementById('mangaSmartStatus')?.textContent, document.getElementById('mangaLamaStatus')?.textContent, document.querySelectorAll('.manga-smart-item').length])); await page.screenshot({ path: path.join(OUT, 'error.png') }); } catch {} })
  .finally(async () => {
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, dialogs, requests }, null, 1));
    if (browser) await browser.close(); if (server) server.kill();
    console.log(`${results.filter(r => r.pass).length} PASS, ${failed} FAIL`); process.exit(failed ? 1 : 0);
  });
