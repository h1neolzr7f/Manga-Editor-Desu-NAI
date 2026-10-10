// Dogfood: make a short 4-page manga only through the editor UI (mouse/keyboard, like a beginner),
// count every operation and log friction. BEFORE = one panel the old way (专业模式, mock GPT, free);
// AFTER = the 画一页漫画 wizard + 自定义修改 wizard with real gpt-image-2.5 via the relay
// (DOGFOOD_MOCK=1 runs everything on a mock). Output: /workspace/shots-20261010/comic/
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.DOGFOOD_OUT || '/workspace/shots-20261010/comic';
const MOCK = process.env.DOGFOOD_MOCK === '1';
const RELAY = process.env.GPT_REAL_BASE_URL || '';
const SERVER = 'http://127.0.0.1:8000';
fs.mkdirSync(OUT, { recursive: true });
const log = { when: new Date().toISOString(), gpt: MOCK ? 'MOCK' : 'REAL gpt-image-2.5 via relay', before: {}, after: { pages: [] }, friction: [], calls: 0 };
let ops = [];
const op = (label) => ops.push(label);

const STYLE = '黑白日式少女漫画，清晰线稿，网点阴影，安全健康内容。角色：小雪（黑色短发、红色发卡、白色水手服）；阿明（棕色短发、圆眼镜、黑色立领校服）';
const PAGES = [
  [['放学后突然下大雨，小雪站在学校门口望着雨', '啊……下雨了。'], ['小雪翻书包，发现没带伞，表情苦恼', '伞忘在家里了……'], ['戴眼镜的阿明拿着一把雨伞走过来，微笑', '要一起走吗？']],
  [['两人共撑一把伞走在雨中的街道', '谢谢你，阿明。'], ['特写：阿明的肩膀被雨淋湿，小雪注意到了', '你的肩膀湿了！'], ['阿明不好意思地挠头笑', '没关系啦。'], ['路边屋檐下，一只淋湿的小猫缩成一团', '喵……']],
  [['小雪蹲下来温柔地看着小猫', '好可怜……'], ['两人把雨伞斜放在屋檐下，替小猫挡雨', '这把伞给你吧。'], ['两人在雨中笑着跑回家', '跑回家吧！']],
  [['第二天放晴，学校门口，小雪拿着一把新雨伞挥手', '阿明！'], ['小雪把雨伞递给阿明', '这是还你的伞。'], ['特写：伞柄上挂着一个可爱的小猫挂件', '这是……小猫？'], ['阳光下，两人和被收养的小猫一起微笑', '以后一起回家吧。']]
];

async function startServer() {
  const env = { ...process.env };
  if (!MOCK) {
    const line = fs.readFileSync(process.env.GPT_TEST_ENV_FILE, 'utf8').split(/\r?\n/).find(l => l.startsWith('GPT_IMAGE_API_KEY='));
    env.GPT_IMAGE_API_KEY = line.slice('GPT_IMAGE_API_KEY='.length).trim();
    env.GPT_IMAGE_TRUSTED_BASE_URL = RELAY;
  }
  const srv = spawn(process.env.PYTHON || 'python3', ['99_server.py'], { cwd: ROOT, env, stdio: 'ignore' });
  for (let i = 0; i < 150; i++) { try { if ((await fetch(SERVER + '/index.html')).ok) return srv; } catch (e) { /* not yet */ } await new Promise(r => setTimeout(r, 200)); }
  throw new Error('server not ready');
}
async function mockGpt(p) {
  await p.route('**/gpt-image-proxy', async route => {
    const b = route.request().postDataJSON(); log.calls++;
    if (process.env.DOGFOOD_MOCK_FAIL === '1' && b.operation === 'generate') return route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: '上游 HTTP 401: invalid key' }) });
    const image = await p.evaluate(async ({ size, prompt, src }) => {
      const [w, h] = (size && size !== 'auto' ? size : '1024x1024').split('x').map(Number); const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.fillStyle = '#eee'; g.fillRect(0, 0, w, h);
      if (src) { const i = new Image(); i.src = src; await i.decode(); g.drawImage(i, 0, 0, w, h); }
      g.fillStyle = '#333'; g.font = '40px sans-serif'; g.fillText(prompt.slice(-14), 40, h / 2); return c.toDataURL('image/png');
    }, { size: b.size, prompt: b.prompt || '', src: b.image || '' });
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, image }) });
  });
}
async function editor(browser, mode, mock) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', acceptDownloads: true });
  if (mode === 'pro') await ctx.addInitScript(() => localStorage.setItem('mnai.uiMode', 'pro'));
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  const errors = []; p.on('pageerror', e => errors.push(e.message.slice(0, 160)));
  await p.route(/https?:\/\/(?!127\.0\.0\.1:8000)/, r => r.abort());
  if (mock) await mockGpt(p);
  else p.on('request', r => { if (r.url().endsWith('/gpt-image-proxy')) log.calls++; });
  await p.goto(SERVER + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof canvas !== 'undefined' && canvas.getWidth() > 0 && !!document.getElementById('taskBar'), null, { timeout: 60000 });
  if (await p.locator('#tutorialSkipBtn').waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false)) { await p.keyboard.press('Escape'); op('Esc 关欢迎'); }
  return { ctx, p, errors };
}
const click = async (p, sel, label) => { await p.locator(sel).first().click({ timeout: 15000 }); op(label); };
const type = async (p, sel, text, label) => { await p.locator(sel).first().fill(text); op(label); };

async function before(browser) {
  // the old way, one panel: template → GPT 文字生图 → put the result into the panel → bubble → text
  ops = []; const notes = [];
  const { ctx, p } = await editor(browser, 'pro', true);
  try {
    await click(p, '[data-target="panel-template-area"], [data-target="template-area"], #intro_template', '打开分镜模板').catch(() => notes.push('找不到分镜模板入口'));
    const tpl = p.locator('.left_area:visible .template-item, .left_area:visible [class*=template] img, .left_area:visible [class*=card]').first();
    await tpl.click({ timeout: 8000 }).then(() => op('点一个 3 格模板'), () => notes.push('模板卡片不明显，要找'));
    await p.waitForTimeout(1200);
    await click(p, '#mangaGptOpen', 'GPT 改图');
    await p.keyboard.press('Escape'); op('Esc 取消自动框选（要的是文字生图）'); notes.push('打开 GPT 面板会直接进入框选，画新格子还得先取消');
    await p.locator('#mangaGptMode').selectOption('generate'); op('操作改成「文字生图」');
    if (process.env.DOGFOOD_DEBUG) console.log('gptpanel', JSON.stringify(await p.evaluate(() => { const g = document.getElementById('mangaGptPanel'), t = document.getElementById('mangaGptPrompt'); return { hidden: g.hidden, cls: g.className, task: g.dataset.task, promptCls: t.className, parentHidden: t.parentElement.className, rect: t.getBoundingClientRect().height, card: !!document.getElementById('taskWizardCard') }; })));
        await type(p, '#mangaGptPrompt', PAGES[0][0][0], '写画面');
    await click(p, '#mangaGptGenerate', '生成');
    await p.waitForFunction(() => !document.getElementById('mangaGptApply').disabled, null, { timeout: 60000 });
    await click(p, '#mangaGptApply', '应用');
    await p.waitForTimeout(800);
    const placed = await p.evaluate(() => { const img = canvas.getObjects().filter(o => o.type === 'image').pop(); return img ? { clip: !!img.clipPath, w: Math.round(img.getScaledWidth()), name: img.name } : null; });
    notes.push('生成结果是一张独立图片，不会自动放进格子：' + JSON.stringify(placed) + '；要手动拖动、缩放并裁进格子（至少 2–3 次拖拽）');
    op('拖动结果到格子'); op('缩放到格子大小'); op('裁掉出格部分');
    await click(p, '[data-target="speech-bubble-area"]', '打开气泡').catch(() => notes.push('气泡入口没找到'));
    await p.locator('#speech-bubble-area:visible .visual-preset-card, #speech-bubble-area:visible [class*=bubble] img').first().click({ timeout: 8000 }).then(() => op('选气泡样式'), () => notes.push('气泡样式卡片没找到'));
    op('拖气泡到格子右上角');
    await click(p, '[data-target="text-area"]', '打开文字');
    await p.locator('#text-area .visual-preset-card').first().click({ timeout: 8000 }).then(() => op('选文字样式'), () => notes.push('文字样式卡片没找到'));
    op('双击文字输入对白'); op('拖文字进气泡');
    await p.screenshot({ path: path.join(OUT, 'before-one-panel.png') });
  } catch (e) { notes.push('中断：' + String(e.message).split('\n')[0].slice(0, 160)); }
  await ctx.close();
  log.before = { panelOps: ops.length, ops: [...ops], notes, perPageEstimate3: ops.length * 3 - 2, perPageEstimate4: ops.length * 4 - 3 };
  log.friction.push(...notes.map(n => 'BEFORE: ' + n));
}

async function after(browser) {
  const { ctx, p, errors } = await editor(browser, 'beginner', MOCK);
  try {
    if (!MOCK) {
      ops = [];
      await click(p, '#taskMore', '更多'); await click(p, '#taskServiceSettings', '服务设置');
      await type(p, '#mangaGptUrl', RELAY, '填中转地址');
      await click(p, '#svcGptTest', '测试连接');
      await p.waitForFunction(() => !/正在|未测试/.test(document.getElementById('svcGptStatus').textContent), null, { timeout: 40000 });
      log.after.serviceTest = await p.locator('#svcGptStatus').innerText();
      await click(p, '#svcDone', '完成');
      log.after.setupOps = [...ops];
    }
    for (let i = 0; i < PAGES.length; i++) {
      ops = []; const t0 = Date.now(); const page = PAGES[i];
      if (!(await p.locator('#taskWizardCard').isVisible().catch(() => false))) await click(p, '#taskBtn-page', '画一页漫画');
      await click(p, page.length === 3 ? '#taskPage3' : '#taskPage4', page.length + ' 格');
      for (let k = 0; k < page.length; k++) {
        await type(p, `[data-scene="${k}"]`, page[k][0], '画面' + (k + 1));
        await type(p, `[data-line="${k}"]`, page[k][1], '对白' + (k + 1));
      }
      if (i === 0) await type(p, '#taskPageStyle', STYLE, '画风/角色');
      await click(p, '#taskPageGo', '生成整页');
      await p.waitForFunction(() => { const s = document.getElementById('taskPageStatus'); return s && /整页完成|没成功|没画成|已停止/.test(s.textContent) && !document.getElementById('taskPageGo').disabled; }, null, { timeout: 1800000 });
      const status = await p.locator('#taskPageStatus').innerText();
      const rec = { page: i + 1, panels: page.length, ops: ops.length, opList: [...ops], seconds: Math.round((Date.now() - t0) / 1000), status };
      if (i === 3) { // a 自定义修改 touch-up on the last panel
        ops = [];
        await click(p, '#taskBtn-custom', '自定义修改');
        const r = await p.evaluate(() => { const ps = canvas.getObjects().filter(o => o.isPanel); const b = ps[ps.length - 1].getBoundingRect(); const u = canvas.upperCanvasEl.getBoundingClientRect(); const sx = u.width / canvas.getWidth(), sy = u.height / canvas.getHeight(); return { x: u.left + b.left * sx, y: u.top + b.top * sy, w: b.width * sx, h: b.height * sy }; });
        await p.mouse.move(r.x + r.w * 0.05, r.y + r.h * 0.05); await p.mouse.down(); await p.mouse.move(r.x + r.w * 0.6, r.y + r.h * 0.45, { steps: 10 }); await p.mouse.up(); op('框选天空');
        await type(p, '#mangaGptPrompt', '在天空加一道淡淡的彩虹，其余保持不变', '写修改');
        await click(p, '#mangaGptGenerate', '生成预览');
        await p.waitForFunction(() => !document.getElementById('mangaGptApply').disabled || document.getElementById('mangaGptStatus').dataset.error === 'true', null, { timeout: 600000 });
        const err = await p.locator('#mangaGptStatus').getAttribute('data-error');
        if (err !== 'true') await click(p, '#mangaGptApply', '应用');
        rec.customEdit = { ops: ops.length, opList: [...ops], status: (await p.locator('#mangaGptStatus').innerText()).slice(0, 120) };
        await click(p, '#taskBack', '换个任务');
      }
      log.after.pages.push(rec);
      await p.screenshot({ path: path.join(OUT, `editor-page${i + 1}.png`) });
      console.log('page', i + 1, JSON.stringify(rec).slice(0, 300));
    }
    // export every page through 文件 › 下载图片, then save the project
    ops = [];
    const thumbs = p.locator('#btm-image-container .btm-image');
    const n = await thumbs.count();
    for (let i = 0; i < n; i++) {
      const closed = await p.evaluate(() => { const d = document.getElementById('btm-drawer'); return !d || d.classList.contains('btm-closed'); });
      if (closed) await click(p, '#btm-drawer-handle', '展开页面');
      const g0 = await p.evaluate(() => getCanvasGUID());
      await thumbs.nth(i).click(); op('选第 ' + (i + 1) + ' 页');
      await p.waitForFunction(g => getCanvasGUID() !== g, g0, { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(1500);
      await click(p, '#navbarDropdownFile', '文件');
      const dl = p.waitForEvent('download', { timeout: 60000 });
      await click(p, '#imageDownload', '下载图片');
      await (await dl).saveAs(path.join(OUT, `page-${i + 1}.png`));
    }
    await click(p, '#navbarDropdownFile', '文件');
    const dl = p.waitForEvent('download', { timeout: 60000 });
    await click(p, '#projectSave', '保存项目');
    const d = await dl; await d.saveAs(path.join(OUT, 'comic-project' + path.extname(d.suggestedFilename() || '.zip')));
    log.after.exportOps = ops.length; log.after.exportOpList = [...ops]; log.after.exportedPages = n;
    if (n < PAGES.length) log.friction.push('AFTER: 底部页面栏只有 ' + n + ' 页缩略图（期望 ' + PAGES.length + '）');
    log.after.errors = errors;
  } finally { await ctx.close(); }
}

(async () => {
  const srv = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    if (process.env.DOGFOOD_SKIP_BEFORE !== '1') await before(browser);
    await after(browser);
  } catch (e) { log.fatal = String(e.stack || e).slice(0, 600); console.error(e); }
  finally { await browser.close(); srv.kill(); }
  fs.writeFileSync(path.join(OUT, 'dogfood-log.json'), JSON.stringify(log, null, 1));
  console.log(JSON.stringify({ before: log.before.panelOps, after: log.after.pages.map(x => x.ops), calls: log.calls, fatal: log.fatal }));
})();
