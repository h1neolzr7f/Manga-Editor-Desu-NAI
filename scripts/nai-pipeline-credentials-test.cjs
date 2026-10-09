// Regression: the NAI pipeline smoke test must never reuse the NovelAI token as the
// third-party Director API key (it used to fall back to it and sent it to the Director).
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const script = path.join(__dirname, 'nai-pipeline-smoke-test.mjs');
function resolve(extra) {
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot || '', NAI_PIPELINE_RESOLVE_ONLY: '1',
    NAI_TEST_BASE_URL: 'http://127.0.0.1:9', LOCALAPPDATA: path.join(__dirname, '__no_profile__'), ...extra };
  const r = spawnSync(process.execPath, [script], { env, encoding: 'utf8', cwd: require('node:os').tmpdir() });
  const line = (r.stdout || '').trim().split(/\r?\n/).pop();
  assert.equal(r.status, 0, r.stderr);
  assert(!(r.stdout + r.stderr).includes(extra.NOVELAI_API_KEY || '\u0000'), 'token must not be printed');
  return JSON.parse(line);
}
const fake = 'pst-' + 'x'.repeat(60);
assert.deepEqual(resolve({ NOVELAI_API_KEY: fake }), { nai: true, director: false });
assert.deepEqual(resolve({ NOVELAI_API_KEY: fake, DIRECTOR_API_KEY: fake }), { nai: true, director: false });
assert.deepEqual(resolve({ NOVELAI_API_KEY: fake, DIRECTOR_API_KEY: 'sk-director-test-key' }), { nai: true, director: true });
console.log('PASS NAI pipeline never sends the NovelAI token to the Director');
