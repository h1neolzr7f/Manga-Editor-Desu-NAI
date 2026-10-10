// Beginner-flow screenshots for UX before/after comparison.
// UX_BASE=http://127.0.0.1:8011 UX_OUT=artifacts/ux/after node scripts/ux-screenshots.cjs
// External hosts are blocked to mimic offline use / regions where Google is unreachable.
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.UX_BASE || 'http://127.0.0.1:8000';
const OUT = process.env.UX_OUT || 'artifacts/ux/after';
const POSE = path.join(__dirname, '..', '03_images/imgPromptHelper/novelai/pose-action-pose/回头看.png');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const notes = {};
  for (const [label, vp] of [['desktop', { width: 1600, height: 1000 }], ['laptop', { width: 1280, height: 720 }]]) {
    const page = await (await browser.newContext({ viewport: vp })).newPage();
    const failed = [], errors = [];
    page.on('requestfailed', r => failed.push(r.url().slice(0, 90)));
    page.on('pageerror', e => errors.push(e.message.slice(0, 120)));
    page.on('dialog', d => { notes[label + '-dialog'] = d.message().slice(0, 140); d.accept(); });
    await page.route(new RegExp('https?://(?!' + BASE.replace(/^https?:\/\//, '').replace(/[.:]/g, m => '\\' + m) + ')'), r => r.abort());
    await page.goto(BASE + '/index.html'); await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(OUT, label + '-1-first-run.png') });
    await page.locator('#tutorialSkipBtn').click().catch(() => {}); await page.keyboard.press('Escape');
    await page.locator('#svg-container-template img, #svg-container-template .svg-preview').nth(2).click().catch(() => {});
    await page.waitForTimeout(1500);
    const chooser = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
    await page.locator('#navbarDropdownFile').click();
    await page.locator('a.dropdown-item').filter({ hasText: /导入图片|画像|Import/ }).first().click().catch(() => {});
    const fc = await chooser; if (fc) await fc.setFiles(POSE);
    await page.waitForTimeout(2500);
    await page.evaluate(() => typeof fitCanvasViewToContainer === 'function' && fitCanvasViewToContainer(true));
    await page.waitForTimeout(500);
    notes[label + '-canvas'] = await page.evaluate(() => [canvas.width, canvas.height]);
    await page.screenshot({ path: path.join(OUT, label + '-2-template-plus-import.png') });
    await page.evaluate(() => toggleVisibility('shape-area')); await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, label + '-3-shape-panel-icons.png') });
    notes[label + '-failedRequests'] = failed.length; notes[label + '-pageErrors'] = errors;
    notes[label + '-overflowX'] = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await page.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'notes.json'), JSON.stringify(notes, null, 1));
  console.log(JSON.stringify(notes));
  await browser.close();
})();
