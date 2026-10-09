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
console.log('offline-icon-fonts-test: 5 checks PASS');
