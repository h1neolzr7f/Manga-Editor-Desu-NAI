// Usage: node scripts/remove-dead-functions.cjs list.tsv  (file<TAB>line<TAB>name per row).
// Each name must have been proven unreferenced first: ESLint no-unused-vars AND
// `git grep -w name` finds only its own declaration (HTML onclick/strings included).
// Remove top-level function declarations listed in dead.tsv (file, line, name).
// Only top-level FunctionDeclaration nodes (Program body) whose name matches are removed.
const fs = require('fs');
const acorn = require(process.cwd() + '/node_modules/acorn');
const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(l => l.split('\t'));
const byFile = {};
for (const [f, , n] of rows) (byFile[f] = byFile[f] || new Set()).add(n);
const report = [];
for (const [file, names] of Object.entries(byFile)) {
  let src = fs.readFileSync(file, 'utf8');
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true }); }
  catch (e) { report.push('SKIP-PARSE ' + file + ' ' + e.message); continue; }
  const cuts = ast.body.filter(n => n.type === 'FunctionDeclaration' && n.id && names.has(n.id.name))
    .map(n => {
      let start = n.start, end = n.end;
      // swallow a directly preceding // or /* */ comment block that belongs to this function
      const before = src.slice(0, start);
      const m = before.match(/(?:\n(?:[ \t]*\/\/[^\n]*|[ \t]*\/\*[\s\S]*?\*\/[ \t]*))+\n?$/);
      if (m) start -= m[0].length - (m[0].startsWith('\n') ? 1 : 0);
      while (src[end] === '\n' && src[end + 1] === '\n') end++;
      if (src[end] === '\n') end++;
      return { name: n.id.name, start, end };
    }).sort((a, b) => b.start - a.start);
  const found = new Set(cuts.map(c => c.name));
  for (const n of names) if (!found.has(n)) report.push('NOT-TOP-LEVEL ' + file + ' ' + n);
  for (const c of cuts) src = src.slice(0, c.start) + src.slice(c.end);
  try { acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true }); }
  catch (e) { report.push('BROKE ' + file + ' ' + e.message); continue; }
  fs.writeFileSync(file, src);
  report.push('OK ' + file + ' removed ' + cuts.length + ': ' + cuts.map(c => c.name).join(','));
}
console.log(report.join('\n'));
