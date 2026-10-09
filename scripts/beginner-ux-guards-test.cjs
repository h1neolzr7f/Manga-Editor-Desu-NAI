// Beginner UX guards: destructive "clear canvas" asks first, zh menu labels match the
// HTML (no 打开项目/加载项目 flip after i18n), first-run steps cover the core workflow.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
assert.ok(/onclick="confirmAllRemove\(\)"/.test(html) && !/onclick="allRemove\(\)"/.test(html), 'menu clears through confirmAllRemove');

const ih = read('js/layer/image-history-management.js');
const fn = ih.slice(ih.indexOf('function confirmAllRemove()'), ih.indexOf('function initImageHistory()'));
function run(hasContent, answer) {
  const calls = { removed: 0, asked: 0 };
  const ctx = { pageHasUserContent: () => hasContent, allRemove: () => { calls.removed++; },
    window: { confirm: () => { calls.asked++; return answer; } }, getText: k => k };
  vm.createContext(ctx); vm.runInContext(fn, ctx);
  return [ctx.confirmAllRemove(), calls.asked, calls.removed];
}
assert.deepStrictEqual(run(true, false), [false, 1, 0], 'cancel keeps the page');
assert.deepStrictEqual(run(true, true), [true, 1, 1], 'confirm clears');
assert.deepStrictEqual(run(false, false), [true, 0, 1], 'empty page clears without a question');

// zh translation must equal the Chinese text written in the HTML for these menu items
const zhSrc = read('js/ui/third/base-translation/base-zh.js');
const zh = key => (zhSrc.match(new RegExp('"' + key + '":"([^"]*)"')) || [])[1];
let checked = 0;
for (const m of html.matchAll(/data-i18n="([A-Za-z_]+)">([^<]*[\u4e00-\u9fff][^<]*)</g)) {
  const [, key, text] = m;
  if (zh(key) !== undefined && ['projectSave', 'projectLoad', 'imageImport', 'imageDownload', 'allRemove', 'settingsSave', 'settingsReset'].includes(key)) {
    assert.strictEqual(zh(key), text.trim(), key + ': zh "' + zh(key) + '" differs from HTML "' + text.trim() + '"');
    checked++;
  }
}
assert.ok(checked >= 5, 'file-menu labels checked: ' + checked);
assert.ok(zh('allRemoveConfirm') && /无法撤销/.test(zh('allRemoveConfirm')), 'zh confirm text');

const tut = read('js/ui/tutorial.js');
for (const word of ['模板', '导入图片', '保存项目', 'GPT 改图', '免费额度']) assert.ok(tut.includes(word), 'tutorial mentions ' + word);
assert.ok(/\.tutorial-beginner-steps\{[^}]*text-align:left/.test(read('css/ui/tutorial.css')), 'steps are left-aligned');
console.log('beginner-ux-guards-test: ' + (8 + checked) + ' checks PASS');
