// Real headless Chromium test against the actual HTML/Fabric runtime.
// No external model calls or API credits: the GPT response is mocked in the browser.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SERVER = 'http://127.0.0.1:8000';
const screenshots = path.join(ROOT, 'artifacts', 'gpt-browser');
fs.mkdirSync(screenshots, { recursive: true });
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const server = spawn(python, ['99_server.py'], {
  cwd: ROOT, env: { ...process.env, NAI_QUIET: '1', GPT_IMAGE_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
server.stdout.on('data', b => { logs += b.toString(); });
server.stderr.on('data', b => { logs += b.toString(); });
let browser;

async function ready() {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Python server failed: ' + logs);
    try {
      const response = await fetch(SERVER + '/index.html', { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('local HTTP server not ready: ' + logs);
}

async function run() {
  await ready();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const fatalPageErrors = [];
  page.on('pageerror', err => fatalPageErrors.push(err.message));
  await page.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, route => route.abort());
  await page.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#mangaGptOpen').waitFor({ timeout: 60000 });
  await page.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0 &&
    canvas.upperCanvasEl && typeof fabric !== 'undefined', { timeout: 45000 });
  const baseline = await page.evaluate(() => ({
    width: canvas.getWidth(), height: canvas.getHeight(), objects: canvas.getObjects().length
  }));
  console.log('Real browser baseline', JSON.stringify(baseline));
  // A fresh account shows the real first-run tutorial overlay; dismiss it
  // using its supported Skip action before clicking the editor toolbar.
  const tutorial = page.locator('#tutorialSkipBtn');
  if (await tutorial.count()) await tutorial.click();
  await page.locator('#mangaGptOpen').click();
  await page.locator('#mangaGptSelect').click();
  const box = await page.evaluate(() => {
    const r = canvas.upperCanvasEl.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
  assert(box.width > 40 && box.height > 40, 'visible selection surface');
  // Draw on the overlay rather than on Fabric itself.
  const from = { x: box.x + box.width * 0.18, y: box.y + box.height * 0.20 };
  const to = { x: box.x + box.width * 0.48, y: box.y + box.height * 0.46 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await page.locator('#mangaGptStatus').waitFor({ state: 'visible' });
  const selectionStatus = await page.locator('#mangaGptStatus').textContent();
  assert.match(selectionStatus, /已选中原始画布区域/);

  // Generate a valid, high-resolution PNG for Fabric to decode.
  const pngData = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1800; c.height = 1600;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ff44bb'; ctx.fillRect(0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  });
  let modelCalls = 0;
  await page.route('**/gpt-image-proxy', route => {
    modelCalls++;
    const req = route.request();
    assert.equal(req.method(), 'POST');
    const payload = req.postDataJSON();
    assert.equal(payload.operation, 'edit');
    assert(/^data:image\/png;base64,/.test(payload.image));
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, image: pngData })
    });
  });
  await page.locator('#mangaGptKey').fill('fake-ephemeral-test-key');
  await page.locator('#mangaGptPrompt').fill('Replace the chosen character');
  await page.locator('#mangaGptGenerate').click();
  await page.waitForFunction(() => !document.querySelector('#mangaGptApply').disabled,
    { timeout: 20000 });
  await page.locator('#mangaGptAllowUpscale').check();
  await page.screenshot({ path: path.join(screenshots, 'preview.png') });
  await page.locator('#mangaGptApply').click();
  await page.waitForFunction(original => canvas.getObjects().length === original + 1,
    baseline.objects, { timeout: 20000 });
  const result = await page.evaluate(() => {
    const a = canvas.getActiveObject();
    return {
      width: canvas.getWidth(), height: canvas.getHeight(),
      objects: canvas.getObjects().length,
      type: a && a.type,
      scaleX: a && a.scaleX, scaleY: a && a.scaleY,
      cropX: a && a.cropX, cropY: a && a.cropY,
      widthLocal: a && a.width, heightLocal: a && a.height
    };
  });
  assert.equal(result.width, baseline.width);
  assert.equal(result.height, baseline.height);
  assert.equal(result.type, 'image');
  assert(Math.abs(result.scaleX - result.scaleY) < 1e-8, 'aspect ratio must stay uniform');
  assert.equal(modelCalls, 1);
  await page.screenshot({ path: path.join(screenshots, 'applied.png') });
  console.log('Real browser edited image properties', JSON.stringify(result));

  // Restore using the application's actual asynchronous Fabric/history loader.
  const beforeUndo = result.objects;
  await page.evaluate(() => undo());
  await page.waitForFunction(count => canvas.getObjects().length === count - 1,
    beforeUndo, { timeout: 20000 });
  assert.equal(await page.evaluate(() => canvas.getWidth()), baseline.width);
  await page.evaluate(() => redo());
  await page.waitForFunction(count => canvas.getObjects().length === count, beforeUndo,
    { timeout: 20000 });
  console.log('Real browser undo / redo round trip passed');

  // Actual text layer, not a mock object.
  await page.evaluate(() => {
    const text = new fabric.Textbox('Old text', { left: 20, top: 20, width: 200, fontSize: 24 });
    canvas.add(text); canvas.setActiveObject(text); canvas.requestRenderAll();
  });
  await page.locator('#mangaGptSubtitle').fill('中文新字幕');
  await page.locator('#mangaGptReplaceText').click();
  assert.equal(await page.evaluate(() => canvas.getActiveObject().text), '中文新字幕');
  console.log('Real browser editable subtitle replacement passed');
  console.log('Browser uncaught JS errors:', fatalPageErrors.slice(0, 8));
  // Pre-existing page errors are reported rather than silently ignored.
  if (fatalPageErrors.length) throw new Error('Uncaught JS errors: ' + fatalPageErrors.join('; '));
}

run().then(() => console.log('PASS real Chromium + mocked GPT edit, crop, history, text'))
  .catch(err => { console.error(err.stack || err); process.exitCode = 1; })
  .finally(async () => {
    if (browser) await browser.close();
    server.kill();
  });
