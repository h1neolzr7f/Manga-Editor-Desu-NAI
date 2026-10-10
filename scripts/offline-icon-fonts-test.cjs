// Regression: icon fonts came only from fonts.gstatic.com, so offline (or where Google
// Fonts is blocked) every icon rendered as its ligature name ("visibility", "forum").
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
for (const [css, font] of [['css/icon.css', 'material-icons.woff2'], ['css/css2.css', 'material-symbols-outlined.woff2']]) {
  const text = fs.readFileSync(path.join(root, css), 'utf8');
  const src = text.match(/src:\s*([^;]+);/)[1];
  assert.ok(src.startsWith('url(../assets/fonts/material/' + font + ')'), css + ' uses the bundled font first');
  const file = path.join(root, 'assets/fonts/material', font);
  const head = fs.readFileSync(file).subarray(0, 4).toString('latin1');
  assert.strictEqual(head, 'wOF2', font + ' is a real woff2 file');
}
const share = fs.readFileSync(path.join(root, 'css/ui/share.css'), 'utf8');
assert.ok(!/@import\s+url\(['"]?https?:/.test(share), 'share.css does not fetch web fonts at startup');
const names = JSON.parse('[' + fs.readFileSync(path.join(root, 'js/core/svg/google-icon-names.js'), 'utf8').match(/const initialIcons=\[([\s\S]*?)\];/)[1] + ']');
for (const n of names) {
  const svg = fs.readFileSync(path.join(root, 'assets/icons/material', n + '.svg'), 'utf8');
  assert.ok(/^<svg[\s\S]*<\/svg>\s*$/.test(svg) && !/<script|on\w+=|href=/i.test(svg), n + '.svg is a plain bundled SVG');
}
const helper = fs.readFileSync(path.join(root, 'js/core/svg/google-icon-helper.js'), 'utf8');
assert.ok(/const first=local\?fetchText\(local\)/.test(helper), 'default icons are read from the bundle before the network');
console.log('offline-icon-fonts-test: ' + (6 + names.length) + ' checks PASS');
