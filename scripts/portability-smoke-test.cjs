// Portability regressions: npm scripts must not depend on a bare `python` alias (absent on
// Debian/Ubuntu), batch files must stay ASCII (cmd.exe codepage) and be CRLF on checkout.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const [name, cmd] of Object.entries(pkg.scripts)) {
  assert(!/(^|&&\s*|;\s*)python3?\s/.test(cmd), `npm script ${name} must use scripts/run-python.cjs, not a bare python alias`);
}
const { resolvePython } = require('./run-python.cjs');
assert(resolvePython(), 'run-python.cjs must find a Python 3 interpreter on this machine');

const attrs = fs.readFileSync(path.join(root, '.gitattributes'), 'utf8');
for (const ext of ['bat', 'cmd', 'ps1']) assert.match(attrs, new RegExp(`^\\*\\.${ext} text eol=crlf$`, 'm'));
for (const file of fs.readdirSync(root).filter(f => f.toLowerCase().endsWith('.bat'))) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  assert(/^[\x00-\x7f]*$/.test(text), `${file} must be ASCII-only (Chinese text belongs in .ps1)`);
}
assert.match(fs.readFileSync(path.join(root, '99_server.bat'), 'utf8'), /cd \/d "%~dp0"/, '99_server.bat must cd to its folder');
console.log('PASS portability: python launcher, ASCII batch files, CRLF attributes');
