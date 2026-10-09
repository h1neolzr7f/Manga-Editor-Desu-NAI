#!/usr/bin/env node
// Cross-platform Python launcher for npm scripts: Linux/macOS usually have only `python3`,
// Windows usually `python` or the `py -3` launcher. Honors $PYTHON when set.
const { spawnSync } = require('node:child_process');

const candidates = process.env.PYTHON ? [[process.env.PYTHON]] :
  (process.platform === 'win32' ? [['python'], ['py', '-3'], ['python3']] : [['python3'], ['python']]);

function resolvePython() {
  for (const [cmd, ...pre] of candidates) {
    const probe = spawnSync(cmd, [...pre, '-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)'],
      { stdio: 'ignore' });
    if (probe.status === 0) return [cmd, pre];
  }
  return null;
}

module.exports = { resolvePython };

if (require.main === module) {
  const found = resolvePython();
  if (!found) {
    console.error('Python 3.8+ not found (tried: ' + candidates.map(c => c.join(' ')).join(', ') + '). Set PYTHON=/path/to/python.');
    process.exit(127);
  }
  const [cmd, pre] = found;
  const result = spawnSync(cmd, [...pre, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(result.status === null ? 1 : result.status);
}
