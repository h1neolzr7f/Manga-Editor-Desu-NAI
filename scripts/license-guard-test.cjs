// Open-source licence guard: no AGPL bundle, no fonts with unclear redistribution terms, font aliases resolve,
// and the own first-run tour keeps its 4 steps (replaced intro.js, AGPL-3.0).
const fs = require('fs'), path = require('path'), assert = require('assert'), { execSync } = require('child_process');
const root = path.join(__dirname, '..'); const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
for (const f of tracked.filter(f => /^(third|cdn-local|js\/ui\/third)\/.*\.js$/.test(f))) {
  const head = fs.readFileSync(path.join(root, f), 'utf8').slice(0, 2000);
  assert.ok(!/\bAGPL|Affero/i.test(head), f + ' declares AGPL');
}
assert.ok(!tracked.some(f => /^third\/intro\/|^css\/ui\/intro\.css$/.test(f)), 'intro.js (AGPL) is gone');
assert.ok(!tracked.some(f => /OhisamaFont|\/851[^/]*\.ttf$/i.test(f)), 'Ohisama / 851 fonts are not bundled');
const html = read('index.html'); assert.ok(!/intro\.min\.js|introjs/.test(html), 'index.html does not load intro.js');
const css = read('css/common.css');
for (const m of css.matchAll(/url\('\.\.\/(font\/[^']+)'\)/g)) assert.ok(fs.existsSync(path.join(root, m[1])), 'font file exists: ' + m[1]);
for (const fam of ['851_YOWAKU', '851_KAKUKAKU', '851_DZUYOKU', '851_MkPOP', 'Ohisama']) assert.ok(css.includes("font-family: '" + fam + "'"), fam + ' still resolves for old projects');
const fm = read('js/core/font/font-manager-core.js');
assert.ok(!/name: "(851_[A-Za-z]+|Ohisama)"/.test(fm), 'removed fonts are not offered');
const tut = read('js/ui/tutorial.js'); const steps = tut.match(/\{element:'#intro_[^']+'/g) || [];
assert.deepStrictEqual(steps.map(s => s.slice(10, -1)).join(','), '#intro_svg-container-template,#intro_simulator-chat-area,#intro_auto-generate-area,#intro_page-manager-area');
console.log('PASS licence guard: no AGPL bundles, removed fonts gone (aliases resolve), own 4-step tour intact');
