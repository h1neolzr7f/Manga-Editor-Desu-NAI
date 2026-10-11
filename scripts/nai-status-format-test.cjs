// Regression: "检查 NAI" must not show the misleading "无限生图：否" for Opus users.
const assert = require('node:assert/strict');
const fs = require('node:fs'); const vm = require('node:vm'); const path = require('node:path');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/ai/nai-status-format.js'), 'utf8'), sandbox);
const f = sandbox.window.NaiStatusFormat;
const opus = f.statusLines({ active: true, tier: 3, anlas: 8005, unlimitedImageGeneration: false });
assert(!opus.join('\n').includes('无限生图'), 'raw unlimitedImageGeneration flag no longer shown');
assert(/免费生图：可用/.test(opus[2]) && /≤28 步/.test(opus[2]), opus[2]);
assert.equal(opus[3], 'Anlas 余额：8005');
assert(/不可用（当前套餐/.test(f.freeQuotaLine({ active: true, tier: 1 })));
assert(/订阅未激活/.test(f.freeQuotaLine({ active: false, tier: 3 })));
assert.equal(f.statusLines({}).length, 6);
const settings = fs.readFileSync(path.join(__dirname, '../js/ai/ai-settings.js'), 'utf8');
assert(settings.includes('NaiStatusFormat.statusLines(json)') && !settings.includes('无限生图'));
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert(html.indexOf('nai-status-format.js') > 0 && html.indexOf('nai-status-format.js') < html.indexOf('ai-settings.js'));
console.log('PASS NovelAI status shows free-quota availability instead of the misleading unlimited flag');
