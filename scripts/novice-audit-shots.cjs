// Self-review walkthrough: a fresh novice opens the app at 1440x900 and 1280x800, screenshots every state
// (first open, home, page loaded, each wizard + its advanced view + its error state without keys, menu,
// settings, pro mode) and logs console errors / timings. Output: AUDIT_OUT (default artifacts/audit).
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs'); const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const OUT = process.env.AUDIT_OUT || path.join(ROOT, 'artifacts', 'audit');
const PORT = 8000, SERVER = 'http://127.0.0.1:' + PORT;
fs.mkdirSync(OUT, { recursive: true });
const TASKS = ['swap', 'caption', 'fix', 'layer', 'custom', 'page', 'nai'];
(async () => {
  const server = spawn(process.env.PYTHON || 'python3', ['99_server.py'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), GPT_IMAGE_API_KEY: '' }, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 2500));
  const browser = await chromium.launch();
  const log = { started: new Date().toISOString(), views: {} };
  for (const [W, H] of [[1440, 900], [1280, 800]]) {
    const tag = W + 'x' + H, v = { shots: [], errors: [], timings: {}, notes: [] }; log.views[tag] = v;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: 'zh-CN' });
    const p = await ctx.newPage(); p.on('dialog', d => d.dismiss());
    p.on('pageerror', e => v.errors.push('pageerror: ' + e.message.slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error') v.errors.push('console: ' + m.text().slice(0, 200)); });
    const shot = async name => { const f = path.join(OUT, tag + '-' + name + '.png'); const t = Date.now();
      const blocked = await p.evaluate(() => 1, null).then(() => false);
      await p.screenshot({ path: f, timeout: 90000 }).then(() => v.shots.push(path.basename(f)), e => v.notes.push('screenshot timeout ' + name + ' after ' + (Date.now() - t) + 'ms'));
      if (Date.now() - t > 5000) v.notes.push('slow screenshot ' + name + ' ' + (Date.now() - t) + 'ms' + (blocked ? ' blocked' : '')); };
    const t0 = Date.now();
    await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0 && !!document.getElementById('taskBar'), null, { timeout: 60000 });
    v.timings.readyMs = Date.now() - t0;
    await p.waitForTimeout(800); await shot('01-first-open');
    await p.locator('#tutorialSkipBtn').click({ timeout: 4000 }).catch(() => {}); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await shot('02-home');
    const t1 = Date.now();
    await p.locator('#imageInput').setInputFiles(path.join(ROOT, 'scripts', 'fixtures', 'ctd', 'page-4.png'));
    await p.waitForFunction(() => canvas.getObjects().some(o => o.type === 'image'), null, { timeout: 30000 });
    v.timings.importMs = Date.now() - t1; await p.waitForTimeout(800);
    await shot('03-page-loaded');
    for (const t of TASKS) {
      const btn = p.locator('#taskBtn-' + t);
      if (!(await btn.isVisible().catch(() => false))) { v.notes.push('task button hidden: ' + t); continue; }
      await btn.click(); await p.waitForTimeout(t === 'swap' ? 4000 : 1200);
      await shot('10-task-' + t);
      const adv = p.locator('#taskAdvanced');
      if (await adv.isVisible().catch(() => false)) { await adv.click(); await p.waitForTimeout(600); await shot('11-task-' + t + '-advanced'); await adv.click().catch(() => {}); }
      // error state: try the main action without any key / input
      for (const sel of ['#taskPageGo', '#autoSwapGo', '#mangaGptGenerate', '#taskNaiGo']) {
        const b = p.locator(sel);
        if (await b.isVisible().catch(() => false) && await b.isEnabled().catch(() => false)) { await b.click().catch(() => {}); await p.waitForTimeout(2500); await shot('12-task-' + t + '-try'); break; }
      }
      await p.locator('#taskWizardClose').click({ timeout: 3000 }).catch(async () => { await p.keyboard.press('Escape'); });
      await p.waitForTimeout(400);
    }
    await p.locator('#taskMore').click().catch(() => {}); await p.waitForTimeout(400); await shot('20-more-menu');
    await p.locator('#taskMoreMenu').getByText('服务设置').first().click({ timeout: 3000 }).catch(e => v.notes.push('settings: ' + e.message.slice(0, 80)));
    await p.waitForTimeout(1000); await shot('21-settings'); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    await p.keyboard.press('F1'); await p.waitForTimeout(700); await shot('22-help-f1'); await p.keyboard.press('Escape');
    await p.locator('#taskMore').click().catch(() => {}); await p.locator('#uiModeToggle').click().catch(() => {}); await p.waitForTimeout(900); await shot('30-pro-mode');
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'audit-log.json'), JSON.stringify(log, null, 1));
  console.log(JSON.stringify(Object.fromEntries(Object.entries(log.views).map(([k, x]) => [k, { shots: x.shots.length, errors: x.errors.length, timings: x.timings, notes: x.notes }]))));
  await browser.close(); server.kill();
})().catch(e => { console.error(e); process.exit(1); });
