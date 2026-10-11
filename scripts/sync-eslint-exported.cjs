#!/usr/bin/env node
// Classic <script> files share ONE global scope, so a top-level function/variable declared in
// a.js and used only in b.js (or in index.html / html/*.html handlers) looks "unused" to
// ESLint's per-file no-unused-vars. Mark exactly those names in a generated
//   /* exported name1, name2 */
// header (ESLint's standard directive for script globals). Names used nowhere else stay
// flagged, so real dead code is still reported.
//   node scripts/sync-eslint-exported.cjs          rewrite headers
//   node scripts/sync-eslint-exported.cjs --check  exit 1 if headers are stale
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');
const MARK = '/* exported';
const check = process.argv.includes('--check');

function stripHeader(src) {
  return src.startsWith(MARK) ? src.slice(src.indexOf('*/') + 2).replace(/^\r?\n/, '') : src;
}
// Lint with headers removed (stdin) so the result does not depend on the current headers.
const files = cp.execSync('git ls-files "js/*.js" "js/**/*.js"', { cwd: root }).toString().trim().split('\n')
  .filter(f => !f.startsWith('js/libs/'));
const corpus = cp.execSync('git ls-files "*.js" "*.html" "*.cjs" "*.mjs"', { cwd: root }).toString().trim().split('\n')
  .filter(f => !f.startsWith('llm_doc/') && !f.startsWith('docs/') && !f.startsWith('js/libs/'));
const text = new Map(corpus.map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')]));
const wordIn = (name, src) => new RegExp('(^|[^\\w$])' + name.replace(/\$/g, '\\$') + '($|[^\\w$])').test(src);

const eslintBin = path.join(root, 'node_modules', '.bin', 'eslint');
let stale = 0, total = 0;
for (const f of files) {
  const original = fs.readFileSync(path.join(root, f), 'utf8');
  const body = stripHeader(original);
  const res = cp.spawnSync(eslintBin, ['--stdin', '--stdin-filename', f, '-f', 'json', '--rule', '{"no-unused-vars":["warn",{"vars":"all","args":"none","ignoreRestSiblings":true}]}'],
    { cwd: root, input: body, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = JSON.parse(res.stdout || '[]')[0] || { messages: [] };
  const names = [];
  for (const m of out.messages) {
    if (m.ruleId !== 'no-unused-vars' || !/is defined but never used|is assigned a value but never used/.test(m.message)) continue;
    const name = (m.message.match(/'([^']+)'/) || [])[1];
    if (!name || names.includes(name)) continue;
    // only top-level (global) declarations: the declaration line starts at column 1
    const line = body.split('\n')[m.line - 1] || '';
    if (!/^(async\s+)?(function\*?|class|var|let|const)\s/.test(line)) continue;
    let usedElsewhere = false;
    for (const [g, src] of text) { if (g !== f && wordIn(name, src)) { usedElsewhere = true; break; } }
    if (usedElsewhere) names.push(name);
  }
  names.sort();
  total += names.length;
  const next = names.length ? MARK + ' ' + names.join(', ') + ' */\n' + body : body;
  if (next !== original) {
    stale++;
    if (!check) fs.writeFileSync(path.join(root, f), next);
  }
}
console.log((check ? 'check' : 'sync') + ': ' + total + ' cross-file globals in ' + files.length + ' files; ' +
  (check ? stale + ' stale' : stale + ' updated'));
if (check && stale) process.exit(1);
