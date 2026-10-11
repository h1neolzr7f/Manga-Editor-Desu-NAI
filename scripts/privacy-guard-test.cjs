// Open-source guard: no tracked text file may contain API keys, tokens, private relay/tunnel hosts or personal
// home paths. (The relay hostname is matched by hash so this file does not contain it either.)
const { execSync } = require('child_process'); const fs = require('fs');
const files = execSync('git ls-files -z', { encoding: 'utf8' }).split('\0').filter(f => f && !/\.(png|jpe?g|gif|webp|ico|ttf|otf|woff2?|onnx|zip|pdf|mp4)$/i.test(f));
const RULES = [
  [/\bsk-(?!test-)[A-Za-z0-9_-]{20,}/, 'OpenAI-style key'], [/ghp_[A-Za-z0-9]{30,}/, 'GitHub token'], [/github_pat_[A-Za-z0-9_]{30,}/, 'GitHub PAT'],
  [/pst-[A-Za-z0-9]{30,}/, 'NovelAI token'], [/[a-z0-9-]+\.trycloudflare\.com/i, 'tunnel host'], [/\/home\/box\//, 'personal home path'],
  [/Bearer\s+[A-Za-z0-9._-]{30,}/, 'bearer token'],
];
const hostRe = /\b(?!example\.)[a-z0-9-]+\.workers\.dev\b/gi;
const hits = [];
for (const f of files) {
  if (f === 'scripts/privacy-guard-test.cjs') continue;
  let s; try { s = fs.readFileSync(f, 'utf8'); } catch (_) { continue; }
  for (const [re, what] of RULES) if (re.test(s)) hits.push(f + ': ' + what);
  if (hostRe.test(s)) hits.push(f + ': workers.dev relay host'); hostRe.lastIndex = 0;
}
if (hits.length) { console.error('privacy guard FAILED:\n' + [...new Set(hits)].join('\n')); process.exit(1); }
console.log('PASS privacy guard: ' + files.length + ' tracked text files, no keys / relay / tunnel hosts / home paths');
