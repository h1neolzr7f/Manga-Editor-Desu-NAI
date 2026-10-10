// Classic <script> files share one global scope: a top-level function declared in two files is
// silently replaced by the one loaded later (tone.js used to replace tone-manager.js's
// addToneEventListener, so manga tone settings were never saved). Fail on any such collision.
'use strict';
const fs = require('fs'), path = require('path'), acorn = require('acorn');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script[^>]*\ssrc="([^"?]+\.js)(?:\?[^"]*)?"/g)].map(m => m[1])
  .filter(f => f.startsWith('js/') && !f.startsWith('js/libs/') && !f.includes('/third/'));
const seen = new Map(); const dup = [];
for (const f of scripts) {
  const file = path.join(root, f);
  if (!fs.existsSync(file)) continue;
  const ast = acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'script' });
  const names = new Set();
  for (const n of ast.body) {
    if (n.type !== 'FunctionDeclaration') continue;
    if (names.has(n.id.name)) dup.push(n.id.name + ' twice in ' + f);
    names.add(n.id.name);
    if (seen.has(n.id.name) && seen.get(n.id.name) !== f) dup.push(n.id.name + ': ' + seen.get(n.id.name) + ' and ' + f);
    seen.set(n.id.name, f);
  }
}
if (scripts.length < 100) throw new Error('only ' + scripts.length + ' scripts found in index.html');
if (dup.length) { console.error('Duplicate global functions:\n  ' + dup.join('\n  ')); process.exit(1); }
console.log('no-duplicate-globals-test: ' + seen.size + ' functions in ' + scripts.length + ' scripts, no collisions PASS');
