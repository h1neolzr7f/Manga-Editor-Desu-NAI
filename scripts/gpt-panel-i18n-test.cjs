// Regression: every mgpt_* key used by the GPT region editor exists in all 8 i18next
// languages, the zh text equals the in-code fallback (the runtime is Chinese-only, so the
// UI must not change), and {placeholders} are identical across languages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const editor = fs.readFileSync(path.join(root, 'js/ai/gpt-region-editor.js'), 'utf8');
const i18n = fs.readFileSync(path.join(root, 'js/ui/third/i18next.js'), 'utf8');

function resourcesObject(content) {
  const start = content.match(/^const resources\s*=\s*\{/m);
  assert(start, 'resources block');
  let i = start.index + start[0].length;
  let depth = 1;
  while (i < content.length && depth > 0) {
    const ch = content[i];
    if (ch === '"' || ch === "'") {
      const q = ch; i++;
      while (i < content.length && content[i] !== q) { if (content[i] === '\\') i++; i++; }
    } else if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  const text = content.substring(start.index + start[0].length - 1, i).replace(/\bbase_(ja|en|ko|fr|zh|ru|es|de)\b/g, '{}');
  return new Function('return (' + text + ');')();
}

const resources = resourcesObject(i18n);
const merged = {};
for (const group of Object.keys(resources).filter(k => k !== 'base').sort()) {
  for (const [lang, entries] of Object.entries(resources[group])) Object.assign(merged[lang] = merged[lang] || {}, entries);
}
const used = {};
const re = /'(mgpt_\w+)',\s*'([^']*)'/g;
let m;
while ((m = re.exec(editor))) used[m[1]] = m[2];
const keys = Object.keys(used);
assert(keys.length >= 60, 'editor UI goes through tr(): ' + keys.length + ' keys');
const ph = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(x => x[1]).sort().join(',');
for (const lang of ['ja', 'en', 'ko', 'fr', 'zh', 'ru', 'es', 'de']) {
  for (const key of keys) {
    assert(typeof merged[lang][key] === 'string' && merged[lang][key].length, `${lang}.${key} missing`);
    assert.equal(ph(merged[lang][key]), ph(used[key]), `${lang}.${key} placeholders`);
  }
}
for (const key of keys) assert.equal(merged.zh[key], used[key], `zh.${key} must equal the in-code fallback`);
// No hard-coded Chinese UI text left outside tr() except layer names saved in projects.
const stray = editor.split('\n').filter(line => /[\u4e00-\u9fff]/.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line) &&
  !/tr\('mgpt_|t\('mgpt_|hint\('mangaGpt|opt\('mangaGpt|group\('mgpt_|^\s*'[^']*[\u4e00-\u9fff]/.test(line) && !/GPT 局部改图|GPT 生图/.test(line));
assert.deepEqual(stray, [], 'untranslated UI strings');
console.log('PASS GPT panel i18n: ' + keys.length + ' keys x 8 languages, zh identical, placeholders consistent');
