// OPT-IN real NovelAI acceptance (never part of npm test / CI). Stays inside Opus free
// generation: <=1024x1024 px, <=28 steps, 1 image, plain text-to-image (no img2img, inpaint,
// upscale, vibe/reference). Every outgoing request is checked in the browser before it is
// allowed through, and the Anlas balance is read before and after; any spend fails the run.
//   NAI_REAL_API=1 NAI_TEST_ENV_FILE=/path/outside/repo/.env node scripts/nai-real-acceptance.cjs
// The token is read from NAI_TEST_ENV_FILE (NOVELAI_API_KEY=...), typed into the password
// field of the settings dialog and sent only to the local proxy. It is never printed.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SERVER = 'http://127.0.0.1:8000';
const OUT = path.join(ROOT, 'artifacts', 'nai-real');
const MAX_CALLS = Math.min(3, Number(process.env.NAI_REAL_MAX_CALLS || 2));
if (process.env.NAI_REAL_API !== '1') {
  console.error('Refusing to run: set NAI_REAL_API=1 (uses the real NovelAI API, free Opus tier only).');
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

function readToken() {
  const file = process.env.NAI_TEST_ENV_FILE;
  if (!file) throw new Error('NAI_TEST_ENV_FILE not set');
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find(l => l.startsWith('NOVELAI_API_KEY='));
  const token = line ? line.slice('NOVELAI_API_KEY='.length).trim() : '';
  if (!token) throw new Error('NOVELAI_API_KEY missing in NAI_TEST_ENV_FILE');
  return token;
}
const TOKEN = readToken();
const mask = s => String(s).split(TOKEN).join('***');

function portBusy(port) {
  return new Promise(resolve => {
    const s = net.connect(port, '127.0.0.1');
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
  });
}

async function balance() {
  const r = await fetch(SERVER + '/nai-proxy/safe-status', { headers: { Authorization: 'Bearer ' + TOKEN, Accept: 'application/json' } });
  const j = await r.json();
  if (!r.ok || !j.ok) throw new Error('safe-status failed: ' + r.status + ' ' + mask(JSON.stringify(j)).slice(0, 300));
  return { tier: j.tier, active: j.active, anlas: j.anlas, safe: j.safeRequest };
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + ' ' + mask(JSON.stringify(detail || {})).slice(0, 600));
}

let server, browser;
async function run() {
  if (await portBusy(8000)) throw new Error('Port 8000 busy; not killing other processes.');
  server = spawn(python, ['99_server.py'], { cwd: ROOT, env: { ...process.env, NAI_QUIET: '1', NOVELAI_API_KEY: '', GPT_IMAGE_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  server.stdout.on('data', b => { logs += b; });
  server.stderr.on('data', b => { logs += b; });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(SERVER + '/index.html')).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  const before = await balance();
  record('subscription readable via image.novelai.net (Opus tier 3, active)', before.tier === 3 && before.active === true,
    { tier: before.tier, active: before.active, anlas: before.anlas, safe: before.safe });
  if (before.tier !== 3) throw new Error('Not Opus: free generation is not guaranteed, stopping before any generation.');

  browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(mask(e.message)));
  const sent = [];
  let blocked = 0;
  await page.route('**/nai-proxy/generate-image', async route => {
    const body = route.request().postDataJSON();
    const p = body.parameters || {};
    const free = body.action === 'generate' && p.width * p.height <= 1024 * 1024 && p.steps <= 28 && p.n_samples === 1 &&
      !p.image && !p.mask && !(p.reference_image_multiple || []).length && !(p.reference_information_extracted_multiple || []).length;
    const auth = route.request().headers().authorization || '';
    const real = auth === 'Bearer ' + TOKEN;
    sent.push({ action: body.action, model: body.model, w: p.width, h: p.height, steps: p.steps, n: p.n_samples, free, real });
    if (!free || (real && sent.filter(c => c.real).length > MAX_CALLS)) { blocked++; return route.abort(); }
    return route.continue();
  });
  await page.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof canvas !== 'undefined' && typeof T2I === 'function' &&
    typeof loadSVGPlusReset === 'function' && typeof MangaPanelsImage_Vertical !== 'undefined', null, { timeout: 60000 });
  const skip = page.locator('#tutorialSkipBtn');
  if (await skip.count() && await skip.isVisible()) await skip.click();

  // 1. Template page with panels, then plain T2I into the first panel through the normal queue.
  await page.evaluate(() => { loadSVGPlusReset(MangaPanelsImage_Vertical[0].svg); });
  await page.waitForFunction(() => getPanelObjectList().length > 0, null, { timeout: 20000 });
  const setToken = token => page.evaluate(t => {
    const el = document.getElementById('novelaiApiKey'); el.value = t; el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    const proxy = document.getElementById('novelaiUseLocalProxy'); if (proxy) proxy.checked = true;
    const steps = document.getElementById('novelaiSteps'); if (steps) steps.value = '50'; // must be clamped to 28
  }, token);
  const runPanel = async (prompt, timeout) => page.evaluate(async ({ prompt, timeout }) => {
    const panel = getPanelObjectList()[0];
    panel.text2img_prompt = prompt;
    const images = () => canvas.getObjects().filter(o => o.type === 'image').length;
    const n0 = images();
    const toasts = () => { const c = document.getElementById('sp-manga-toastContainer'); return c ? c.textContent : ''; };
    const t0 = toasts();
    const spinner = createSpinner(getGUID(panel), 'T2I');
    T2I(panel, spinner);
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await new Promise(r => setTimeout(r, 1000));
      if (images() > n0) {
        const img = canvas.getObjects().filter(o => o.type === 'image').at(-1);
        return { added: true, ms: Date.now() - start, natural: [img.width, img.height], seed: img.tempSeed };
      }
      const t = toasts();
      if (t !== t0 && /NovelAI/.test(t)) return { added: false, ms: Date.now() - start, toast: t.slice(-400) };
    }
    return { added: false, timeout: true, toast: toasts().slice(-400) };
  }, { prompt, timeout });

  // 1a. Invalid token first: real 401 from NovelAI must be readable (no Anlas involved).
  await setToken('pst-invalid-acceptance-token');
  const bad = await runPanel('1girl', 90000);
  record('invalid token: real NovelAI 401 shown as readable message, nothing added',
    !bad.added && /401/.test(bad.toast || '') && /Token/.test(bad.toast || '') && !/<html|<!DOCTYPE/i.test(bad.toast || ''), bad);

  // 1b. Real free generation.
  await setToken(TOKEN);
  const ok = await runPanel('1girl, solo, white hair, shrine maiden, rain, night, manga panel, monochrome, screentone', 240000);
  const lastReal = sent.filter(c => c.real).at(-1) || {};
  record('real text-to-image inside Opus free limits adds a picture to the panel',
    ok.added && lastReal.free && lastReal.steps === 28 && lastReal.w * lastReal.h <= 1024 * 1024 && lastReal.n === 1,
    { ok, request: lastReal });
  if (ok.added) {
    await page.locator('#canvas-container, .canvas-container').first().screenshot({ path: path.join(OUT, 'nai-panel.png') }).catch(() => {});
    const png = await page.evaluate(() => canvas.toDataURL({ format: 'png', multiplier: 0.5 }));
    fs.writeFileSync(path.join(OUT, 'nai-page.png'), Buffer.from(png.split(',')[1], 'base64'));
  }

  // 1c. Health button in the settings dialog reports the subscription (real call, free).
  const health = await page.evaluate(async () => {
    const c = document.getElementById('sp-manga-toastContainer');
    const t0 = c ? c.textContent : '';
    document.getElementById('naiHealthCheck').click();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 500));
      const t = c ? c.textContent : '';
      if (t !== t0 && /NovelAI 状态/.test(t)) return t.replace(/\s+/g, ' ').slice(-300);
    }
    return 'timeout';
  });
  record('"检查 NAI" button works against the moved subscription endpoint (tier + Anlas shown)',
    /会员层级：3/.test(health) && /Anlas 余额：\d+/.test(health) && /步数≤28/.test(health), { health });

  const after = await balance();
  const spent = (before.anlas == null || after.anlas == null) ? null : before.anlas - after.anlas;
  record('no Anlas spent (balance before == after)', spent === 0, { before: before.anlas, after: after.anlas, spent });
  record('every request was free-tier shaped; steps 50 in the UI were clamped to 28', blocked === 0 && sent.every(c => c.free), { sent, blocked });
  record('no uncaught page errors', pageErrors.length === 0, { pageErrors: pageErrors.slice(0, 5) });
  fs.writeFileSync(path.join(OUT, 'summary.json'), mask(JSON.stringify({ results, sent, before: { tier: before.tier, anlas: before.anlas },
    after: { tier: after.tier, anlas: after.anlas } }, null, 1)));
  if (spent) throw new Error('ANLAS SPENT: ' + spent + ' — stop all further NovelAI runs.');
}

run().then(() => {
  const failed = results.filter(r => !r.pass);
  console.log(failed.length ? 'FAILED ' + failed.length + '/' + results.length : 'PASS real NovelAI acceptance (' + results.length + ' checks)');
  process.exitCode = failed.length ? 1 : 0;
}).catch(e => { console.error(mask(e.stack || e)); process.exitCode = 1; })
  .finally(async () => { if (browser) await browser.close(); if (server) server.kill(); });
