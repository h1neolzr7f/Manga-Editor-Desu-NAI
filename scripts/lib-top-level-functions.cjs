// Dependency-free: names of top-level `function name(` declarations in a classic script.
// Tracks brace depth while skipping comments, strings, template literals (with ${} nesting)
// and regex literals. Verified equal to an acorn parse on every script in index.html.
'use strict';
const KW_BEFORE_REGEX = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
function topLevelFunctions(src) {
  const out = []; let depth = 0; let i = 0; const n = src.length;
  const tpl = []; // brace depth at which each open template's ${ started
  let last = ''; // last significant token: '' / 'id:<word>' / 'num' / punctuation char
  const isId = c => /[A-Za-z0-9_$\u00c0-\uffff]/.test(c);
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") { i++; while (i < n && src[i] !== c) { if (src[i] === '\\') i++; i++; } i++; last = 'str'; continue; }
    if (c === '`' || (c === '}' && tpl.length && tpl[tpl.length - 1] === depth)) {
      if (c === '}') tpl.pop();
      i++;
      while (i < n && src[i] !== '`') {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '$' && src[i + 1] === '{') { tpl.push(depth); i += 2; break; }
        i++;
      }
      if (src[i] === '`') { i++; last = 'str'; } else last = '(';
      continue;
    }
    if (c === '/') {
      const regexOk = last === '' || (last.length === 1 && '(,=:[!&|?{};+-*%<>~^'.includes(last)) ||
        (last.startsWith('id:') && KW_BEFORE_REGEX.has(last.slice(3)));
      if (regexOk) {
        i++; let cls = false;
        while (i < n) { const d = src[i]; if (d === '\\') { i += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; else if (d === '\n') break; i++; }
        i++; while (i < n && /[a-z]/i.test(src[i])) i++; last = 'str'; continue;
      }
      i++; last = '/'; continue;
    }
    if (isId(c)) {
      let j = i; while (j < n && isId(src[j])) j++;
      const word = src.slice(i, j);
      if (word === 'function' && depth === 0 && last !== '.') {
        const m = /^\s*(\*\s*)?([A-Za-z_$][\w$]*)\s*\(/.exec(src.slice(j, j + 200));
        // A declaration starts a statement; after '=', '(', ',' etc. it is a function expression.
        const statementStart = last === '' || last === ';' || last === '}' || last === ')' ||
          last === 'str' || last === 'num' || last.startsWith('id:');
        if (m && statementStart) out.push(m[2]);
      }
      last = /^[0-9]/.test(word) ? 'num' : 'id:' + word; i = j; continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    last = c; i++;
  }
  return out;
}
module.exports = { topLevelFunctions };
