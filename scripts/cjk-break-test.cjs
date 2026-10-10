const assert = require('assert');
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/ui/util/cjk-break.js'), 'utf8') + ';this.CjkBreak=CjkBreak;', ctx);
const { breakLines, NO_START, NO_END } = ctx.CjkBreak;
const cases = ['伞忘在家里了……', '这是……小猫？', '今天也要加油！', '要一起走吗？', '你说什么？！真的假的……', '「明天见」她说。', '啊……下雨了。', '我们一起回家吧，好不好？', 'abc'];
for (const t of cases) for (let per = 2; per <= 9; per++) {
  const lines = breakLines(t, per);
  assert.strictEqual(lines.join(''), t, 'no glyph lost: ' + t);
  lines.slice(1).forEach(l => assert.ok(NO_START.indexOf(Array.from(l)[0]) < 0, `line starts with closing punct: ${t} @${per} → ${lines.join('|')}`));
  lines.slice(0, -1).forEach(l => assert.ok(NO_END.indexOf(Array.from(l).pop()) < 0, `line ends with opening bracket: ${t} @${per} → ${lines.join('|')}`));
}
assert.strictEqual(breakLines('这是……小猫？', 5).join('|'), '这是……|小猫？');
assert.strictEqual(breakLines('今天也要加油！', 9).join('|'), '今天也要加油！');
console.log('cjk-break: OK');
