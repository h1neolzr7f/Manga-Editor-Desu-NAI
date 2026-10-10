// 1440x900 Chinese screenshots of the beginner UI (launcher, every wizard, 服务设置) with mock GPT.
// REAL=1 instead runs the 换角色 and 改字幕 wizards for real (gpt-image-2.5 via the relay; 改字幕 is local OCR).
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const REAL = process.env.REAL === '1';
const OUT = process.env.SHOTS_OUT || (REAL ? '/workspace/shots-20261010/v2/real' : '/workspace/shots-20261010/v2');
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
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', acceptDownloads: true });
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
    const fc = p.waitForEvent('filechooser'); await p.locator('#taskHomeImport').click(); await (await fc).setFiles(path.join(FIX, 'page1.png'));
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

async function shotsMock(browser) {
  let s = await open(browser, { import: false });
  await shot(s.p, '01-launcher', '新手首页：先导入漫画页，再选 7 个任务之一；顶栏是同样的任务按钮');
  await s.ctx.close();
  s = await open(browser); const p = s.p;
  await shot(p, '02-taskbar-page-loaded', '导入后首页让位：画布上方一排任务按钮 + 服务设置 + 专业模式');
  await p.locator('#taskBtn-swap').click(); await p.locator('#autoSwapManual').click(); await drag(p, [0.3, 0.1], [0.75, 0.6]);
  const fc = p.waitForEvent('filechooser'); await p.locator('#mangaGptReferences').click(); await (await fc).setFiles(path.join(FIX, 'reference.png'));
  await p.waitForTimeout(600);
  await shot(p, '03-wizard-swap-steps', '换角色向导：已框选人物、已上传参考图，第 3 步高亮；尺寸/模型/Key 等参数都隐藏');
  await p.locator('#mangaGptGenerate').click(); await gptResult(p, 60000); await p.waitForTimeout(500);
  await shot(p, '04-wizard-swap-preview', '换角色向导：生成预览（mock）后可「对比原图」，再点「作为新图层应用」');
  await p.locator('#taskAdvanced').check(); await p.waitForTimeout(300);
  await shot(p, '05-wizard-advanced', '勾选「高级」后展开原有全部参数（尺寸、套索、保护线稿等）');
  await p.locator('#taskBack').click();
  await p.locator('#taskBtn-caption').click(); await p.locator('#mangaSmartDetect').click();
  await p.waitForFunction(() => document.querySelectorAll('.manga-smart-item textarea').length > 0, null, { timeout: 60000 });
  await p.locator('.manga-smart-item textarea').first().fill('谢谢你'); await p.waitForTimeout(400);
  await shot(p, '06-wizard-caption', '改字幕向导：检测到气泡文字，直接改成新台词；语言/精修/LaMa 等选项收进「高级」');
  await p.locator('#taskBack').click();
  await p.locator('#taskBtn-fix').click(); await drag(p, [0.1, 0.65], [0.5, 0.95]); await p.waitForTimeout(400);
  await shot(p, '07-wizard-fix', '修瑕疵/去杂物向导：框住不想要的东西，直接点「生成预览」（无需写字）');
  await p.locator('#taskBack').click();
  await p.locator('#taskBtn-custom').click(); await drag(p, [0.1, 0.05], [0.9, 0.3]); await p.locator('#mangaGptPrompt').fill('把背景改成黄昏的天空'); await p.waitForTimeout(400);
  await shot(p, '08-wizard-custom', '自定义修改向导：框一块区域 + 一句话描述');
  await p.locator('#taskBack').click();
  await p.locator('#taskBtn-layer').click(); await p.locator('#taskLayerPick').click(); await drag(p, [0.25, 0.05], [0.8, 0.7]);
  await p.waitForFunction(() => /完成|没抠成/.test((document.getElementById('taskLayerStatus') || {}).textContent || ''), null, { timeout: 30000 });
  await shot(p, '09-wizard-layer', '分层向导：拖一个框，人物抠成独立新图层（原图不变，可撤销）');
  await p.locator('#taskWizardClose').click();
  await p.locator('#taskBtn-nai').click(); await p.waitForTimeout(300);
  await shot(p, '10-wizard-nai', 'AI 生图向导：未填 NovelAI Token 时只给一个「去填 Token」按钮，不发任何请求');
  await p.locator('#taskWizardClose').click();
  await p.locator('#taskBtn-page').click(); await p.locator('#taskPage3').click();
  const sc = ['清晨，少女在车站等车', '列车进站，风吹起头发', '少女回头挥手']; const ln = ['今天也要加油！', '', '明天见！'];
  for (let k = 0; k < 3; k++) { await p.locator(`[data-scene="${k}"]`).fill(sc[k]); await p.locator(`[data-line="${k}"]`).fill(ln[k]); }
  await shot(p, '11-wizard-page-form', '画一页漫画向导：选 3 格，写每格画面和对白，一键「生成整页」');
  await p.locator('#taskPageGo').click();
  await p.waitForFunction(() => /整页完成|没成功/.test(document.getElementById('taskPageStatus').textContent) && !document.getElementById('taskPageGo').disabled, null, { timeout: 120000 });
  await shot(p, '12-wizard-page-done', '画一页漫画向导（mock 画面）：每格画面裁进格子，对白气泡自动放在右上角');
  await p.locator('#taskWizardClose').click();
  await p.locator('#taskMore').click(); await p.locator('#taskServiceSettings').click(); await p.locator('#svcLocalTest').click();
  await p.waitForFunction(() => !/正在|未检查/.test(document.getElementById('svcLocalStatus').textContent), null, { timeout: 30000 });
  await p.locator('#mangaGptUrl').fill('https://relay.example.com/v1'); await p.locator('#svcGptTest').click();
  await p.waitForFunction(() => !/正在|未测试/.test(document.getElementById('svcGptStatus').textContent), null, { timeout: 30000 });
  await shot(p, '13-service-settings', '服务设置：GPT / NovelAI / 本机 OCR·LaMa / 抠图 都在一页，每项一个「测试连接」');
  await p.keyboard.press('Escape');
  await p.locator('#taskMore').click(); await p.locator('#uiModeToggle').click(); await p.waitForTimeout(500);
  await shot(p, '14-pro-mode', '专业模式：原有完整界面（GPT 改图、智能字幕等入口回到顶栏）');
  await s.ctx.close();
  s = await open(browser, { import: false, light: true });
  await shot(s.p, '15-launcher-light', '浅色模式下同一套主题变量');
  await s.ctx.close();
}

async function realRuns(browser) {
  const s = await open(browser); const p = s.p;
  let t0 = Date.now();
  await p.locator('#taskBtn-swap').click(); await p.locator('#autoSwapManual').click(); await drag(p, [0.3, 0.1], [0.75, 0.6]);
  const fc = p.waitForEvent('filechooser'); await p.locator('#mangaGptReferences').click(); await (await fc).setFiles(process.env.REAL_REFERENCE || path.join(FIX, 'reference.png'));
  await p.locator('#mangaGptPrompt').fill('保持原来的姿势和构图');
  await p.locator('#mangaGptGenerate').click(); await gptResult(p, 600000);
  real.swap = { seconds: Math.round((Date.now() - t0) / 1000), status: (await p.locator('#mangaGptStatus').innerText()).slice(0, 160), error: await p.locator('#mangaGptStatus').getAttribute('data-error') };
  await shot(p, 'real-01-swap-preview', '真实 gpt-image-2.5：换角色向导预览');
  if (real.swap.error !== 'true') { await p.locator('#mangaGptApply').click(); await p.waitForTimeout(2500); await shot(p, 'real-02-swap-applied', '真实 gpt-image-2.5：换角色结果已作为新图层应用'); }
  await p.locator('#taskBack').click();
  t0 = Date.now();
  await p.locator('#taskBtn-caption').click(); await p.locator('#mangaSmartDetect').click();
  await p.waitForFunction(() => document.querySelectorAll('.manga-smart-item textarea').length > 0, null, { timeout: 120000 });
  const n = await p.locator('.manga-smart-item textarea').count();
  const ocr = await p.locator('.manga-smart-item textarea').evaluateAll(a => a.map(x => x.value));
  await p.locator('.manga-smart-item textarea').last().fill('谢谢你！');
  await p.locator('#mangaSmartApply').click(); await p.waitForTimeout(2500);
  real.caption = { seconds: Math.round((Date.now() - t0) / 1000), regions: n, ocr, texts: await p.evaluate(() => canvas.getObjects().filter(o => /text/i.test(o.type)).map(o => o.text)) };
  await shot(p, 'real-03-caption-applied', '改字幕向导（本机 OCR）：识别「ありがとう」→ 改成「谢谢你！」并替换在换角色后的页面上');
  const png = await p.evaluate(() => { canvas.discardActiveObject(); canvas.renderAll(); return canvas.toDataURL({ format: 'png' }); });
  fs.writeFileSync(path.join(OUT, 'real-final-page.png'), Buffer.from(png.split(',')[1], 'base64'));
  await s.ctx.close();
}

(async () => {
  const srv = await startServer(); const browser = await chromium.launch();
  try { if (REAL) await realRuns(browser); else await shotsMock(browser); }
  catch (e) { console.error(e); real.fatal = String(e.message).slice(0, 300); }
  finally { await browser.close(); srv.kill(); }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ shots, real }, null, 1));
  console.log(JSON.stringify({ shots: shots.length, real }).slice(0, 1500));
})();
