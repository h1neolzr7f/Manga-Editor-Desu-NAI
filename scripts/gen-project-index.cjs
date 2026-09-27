// プロジェクト索引の自動生成。
// 生成物: llm_doc/project-index.md と llm_doc/index/{symbols,dom-ids,files,load-order,tests}.md
// --check を付けると生成結果と既存ファイルを比較し、差分があれば非ゼロ終了する。
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const indexDir=path.join(root,'llm_doc','index');

// 索引対象外。先頭セグメントだけで判定する（js/assets などは除外しない）。
const EXCLUDED_TOP={
'node_modules':1,'.git':1,'user_data':1,'__pycache__':1,'.claude':1,'.github':1,
'test':1,'third':1,'json_js':1,'01_build':1,'02_images_svg':1,'03_images':1,'99_doc':1,
'font':1,'roadmap':1,'docs':1,'installer':1,'assets':1,'cdn-local':1,
'\u30ed\u30fc\u30c9\u30de\u30c3\u30d7\uff12':1,'\u30ed\u30fc\u30c9\u30de\u30c3\u30d7\uff13_\u8907\u6570API\u5bfe\u5fdc':1
};

const SOURCE_EXT={'.js':1,'.cjs':1,'.mjs':1,'.css':1,'.html':1,'.py':1,'.ps1':1,'.bat':1};
const SCRIPT_EXT={'.js':1,'.cjs':1,'.mjs':1};
const SCAN_DIRS=['js','css','html','scripts','local_tools'];
const ROOT_EXT={'.py':1,'.js':1,'.ps1':1,'.bat':1,'.html':1,'.cjs':1,'.mjs':1};

function relOf(target){
return path.relative(root,target).split(path.sep).join('/');
}

function compareText(a,b){
return a<b?-1:(a>b?1:0);
}

function walkDir(dir,out){
let entries;
try{
entries=fs.readdirSync(dir,{withFileTypes:true});
}catch(error){
return out;
}
entries.sort(function(a,b){return compareText(a.name,b.name);});
for(const entry of entries){
const full=path.join(dir,entry.name);
if(entry.isDirectory()){
if(EXCLUDED_TOP[relOf(full).split('/')[0]])continue;
walkDir(full,out);
continue;
}
if(!entry.isFile())continue;
if(!SOURCE_EXT[path.extname(entry.name).toLowerCase()])continue;
out.push(full);
}
return out;
}

function collectTargets(){
const out=[];
for(const dir of SCAN_DIRS){
const full=path.join(root,dir);
if(fs.existsSync(full))walkDir(full,out);
}
const rootEntries=fs.readdirSync(root,{withFileTypes:true});
for(const entry of rootEntries){
if(!entry.isFile())continue;
if(!ROOT_EXT[path.extname(entry.name).toLowerCase()])continue;
out.push(path.join(root,entry.name));
}
out.sort(function(a,b){return compareText(relOf(a),relOf(b));});
return out;
}

function splitLines(text){
return text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
}

function countLines(lines){
if(lines.length&&lines[lines.length-1]==='')return lines.length-1;
return lines.length;
}

// html のインライン script 以外を空行に置き換え、行番号を保ったまま解析対象にする。
function blankOutsideInlineScript(lines){
const out=[];
let inside=false;
for(let i=0;i<lines.length;i++){
const line=lines[i];
if(!inside){
const open=line.match(/<script\b[^>]*>/i);
if(!open){
out.push('');
continue;
}
if(/\bsrc\s*=/i.test(open[0])){
out.push('');
continue;
}
inside=true;
const rest=line.slice(line.indexOf(open[0])+open[0].length);
if(/<\/script>/i.test(rest)){
inside=false;
out.push(rest.slice(0,rest.search(/<\/script>/i)));
continue;
}
out.push(rest);
continue;
}
const end=line.search(/<\/script>/i);
if(end>=0){
inside=false;
out.push(line.slice(0,end));
continue;
}
out.push(line);
}
return out;
}

function collectEntries(){
const targets=collectTargets();
const entries=[];
for(const file of targets){
const text=fs.readFileSync(file,'utf8');
const rawLines=splitLines(text);
const ext=path.extname(file).toLowerCase();
const rel=relOf(file);
let scriptLines=[];
if(SCRIPT_EXT[ext])scriptLines=rawLines;
else if(ext==='.html')scriptLines=blankOutsideInlineScript(rawLines);
entries.push({file:file,rel:rel,ext:ext,rawLines:rawLines,scriptLines:scriptLines,lineCount:countLines(rawLines)});
}
return entries;
}

const SYMBOL_PATTERNS=[
function(line){const m=line.match(/^function\s+([A-Za-z_$][\w$]*)\s*\(/);return m?{name:m[1],kind:'function'}:null;},
function(line){const m=line.match(/^(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=/);return m?{name:m[1],kind:'var'}:null;},
function(line){const m=line.match(/^\s*(?:root|window|globalThis)\.([A-Za-z_$][\w$]*)\s*=/);return m?{name:m[1],kind:'global'}:null;}
];

function collectSymbols(entries){
const symbols=[];
for(const entry of entries){
if(!entry.scriptLines.length)continue;
entry.scriptLines.forEach(function(line,index){
for(const pattern of SYMBOL_PATTERNS){
const hit=pattern(line);
if(hit){symbols.push({name:hit.name,kind:hit.kind,file:entry.rel,line:index+1});return;}
}
});
}
symbols.sort(function(a,b){
return compareText(a.name,b.name)||compareText(a.file,b.file)||(a.line-b.line);
});
return symbols;
}

function extractDefinedIds(entry){
const found=[];
entry.rawLines.forEach(function(line,index){
const re=/(?:^|\s)id\s*=\s*"([^"]+)"|(?:^|\s)id\s*=\s*'([^']+)'/g;
let m;
while((m=re.exec(line))){
const value=(m[1]!==undefined?m[1]:m[2]).trim();
if(value)found.push({id:value,line:index+1});
}
});
return found;
}

function extractIdRefs(line){
const names=[];
let m;
const reDollar=/\$\(\s*'([^']+)'\s*\)|\$\(\s*"([^"]+)"\s*\)/g;
while((m=reDollar.exec(line))){
const value=(m[1]!==undefined?m[1]:m[2]).trim();
if(value)names.push(value);
}
const reById=/getElementById\(\s*'([^']+)'\s*\)|getElementById\(\s*"([^"]+)"\s*\)/g;
while((m=reById.exec(line))){
const value=(m[1]!==undefined?m[1]:m[2]).trim();
if(value)names.push(value);
}
const reQuery=/querySelector(?:All)?\(\s*'#([^']+)'\s*\)|querySelector(?:All)?\(\s*"#([^"]+)"\s*\)/g;
while((m=reQuery.exec(line))){
const value=(m[1]!==undefined?m[1]:m[2]).trim();
if(value)names.push(value);
}
return names;
}

// id を配列リテラルや変数経由で参照するコードは $('id') の形にならない。
// html で定義済みの id と完全一致する文字列リテラルも参照として拾い、動的参照を取りこぼさない。
function extractLiteralIdRefs(line,definedIds){
const names=[];
const re=/'([^'\\\n]+)'|"([^"\\\n]+)"/g;
let m;
while((m=re.exec(line))){
const value=(m[1]!==undefined?m[1]:m[2]).trim();
if(value&&definedIds.has(value))names.push(value);
}
return names;
}

function collectDomIds(entries){
const defined=new Map();
const referenced=new Map();
for(const entry of entries){
if(entry.ext==='.html'){
for(const hit of extractDefinedIds(entry)){
if(!defined.has(hit.id))defined.set(hit.id,[]);
defined.get(hit.id).push({file:entry.rel,line:hit.line});
}
}
}
const definedIds=new Set(defined.keys());
for(const entry of entries){
if(!entry.scriptLines.length)continue;
entry.scriptLines.forEach(function(line,index){
const names=extractIdRefs(line).concat(extractLiteralIdRefs(line,definedIds));
for(const id of names){
if(!referenced.has(id))referenced.set(id,[]);
const list=referenced.get(id);
if(!list.some(function(item){return item.file===entry.rel;})){
list.push({file:entry.rel,line:index+1});
}
}
});
}
for(const list of referenced.values())list.sort(function(a,b){return compareText(a.file,b.file)||(a.line-b.line);});
for(const list of defined.values())list.sort(function(a,b){return compareText(a.file,b.file)||(a.line-b.line);});
return {defined:defined,referenced:referenced};
}

// ファイル先頭のコメントから一行要約を取る。取れなければ空欄（推測で埋めない）。
function leadingComment(lines){
let index=0;
while(index<lines.length&&index<3&&lines[index].trim()==='')index++;
if(index>=lines.length)return '';
const line=lines[index].trim();
let m;
if((m=line.match(/^\/\/\s*(.+)$/)))return m[1].trim();
if((m=line.match(/^#\s*(.+)$/)))return m[1].trim();
if((m=line.match(/^<!--\s*(.+?)\s*-->$/)))return m[1].trim();
if((m=line.match(/^@?rem\s+(.+)$/i)))return m[1].trim();
// /** ... */ や /* ... */ のブロックはブロック内の最初の本文行を要約にする。
if(/^\/\*/.test(line)){
for(let i=index;i<lines.length;i++){
let body=i===index?line.replace(/^\/\*+/,''):lines[i].trim().replace(/^\*+\s?/,'');
body=body.replace(/\s*\*\/\s*$/,'').trim();
if(body==='')continue;
return body;
}
return '';
}
return '';
}

function escapeCell(text){
return String(text||'').replace(/\|/g,'\\|').replace(/\n/g,' ');
}

function splitUrl(url){
const q=url.indexOf('?');
if(q<0)return {path:url,query:''};
return {path:url.slice(0,q),query:url.slice(q+1)};
}

function extractLoadOrder(htmlText){
const lines=splitLines(htmlText);
const out=[];
lines.forEach(function(line,index){
const re=/<(script|link)\b([^>]*)>/gi;
let m;
while((m=re.exec(line))){
const tag=m[1].toLowerCase();
const attrs=m[2];
const srcMatch=attrs.match(/\bsrc\s*=\s*"([^"]+)"/i)||attrs.match(/\bsrc\s*=\s*'([^']+)'/i);
const hrefMatch=attrs.match(/\bhref\s*=\s*"([^"]+)"/i)||attrs.match(/\bhref\s*=\s*'([^']+)'/i);
const url=srcMatch?srcMatch[1]:(hrefMatch?hrefMatch[1]:null);
if(!url)continue;
if(tag==='link'&&!/stylesheet/i.test(attrs))continue;
out.push({
tag:tag,
url:url,
line:index+1,
defer:/\bdefer\b/i.test(attrs),
isModule:/\btype\s*=\s*"module"/i.test(attrs)||/\btype\s*=\s*'module'/i.test(attrs)
});
}
});
return out;
}

function renderSymbols(symbols){
const byName=new Map();
for(const symbol of symbols){
if(!byName.has(symbol.name))byName.set(symbol.name,[]);
byName.get(symbol.name).push(symbol);
}
const names=Array.from(byName.keys()).sort(compareText);
const out=[];
out.push('# シンボル索引（逆引き）');
out.push('');
out.push('`scripts/gen-project-index.cjs` の自動生成。手で編集しない。');
out.push('');
out.push('- 抽出対象: `root.X=` / `window.X=` / `globalThis.X=`、行頭の `function X` / `var X` / `let X` / `const X`');
out.push('- 抽出範囲: js / cjs / mjs と、html のインライン `<script>`（行番号は元ファイル基準）');
out.push('- 合計 '+symbols.length+' 件 / ユニーク名 '+names.length+' 件');
out.push('');
out.push('## シンボル → 定義');
out.push('');
out.push('| シンボル | 種別 | 定義 |');
out.push('|---------|------|------|');
for(const name of names){
const list=byName.get(name);
for(const item of list){
out.push('| `'+name+'` | '+item.kind+' | '+item.file+':'+item.line+' |');
}
}
return out.join('\n');

}

function renderDomIds(dom){
const definedIds=Array.from(dom.defined.keys()).sort(compareText);
const referencedIds=Array.from(dom.referenced.keys()).sort(compareText);
const out=[];
out.push('# DOM id 索引（逆引き）');
out.push('');
out.push('`scripts/gen-project-index.cjs` の自動生成。手で編集しない。');
out.push('');
out.push('- 定義: index.html / html 配下の `id="..."`');
out.push('- 参照: `$(\'id\')` / `getElementById(\'id\')` / `querySelector(\'#id\')` と、定義済み id と一致する文字列リトラル');
out.push('  （`[\'a\',\'b\'].forEach(function(id){$(id);})` のような動的参照を抽うため。js と html インライン script が対象）');
out.push('- 定義 '+definedIds.length+' 件 / 参照 '+referencedIds.length+' 件');
out.push('');
out.push('## id → 定義と参照');
out.push('');
out.push('| id | 定義 | 参照しているファイル |');
out.push('|----|------|--------------------|');
for(const id of definedIds){
const defs=dom.defined.get(id).map(function(item){return item.file+':'+item.line;}).join(', ');
const refs=dom.referenced.get(id);
const refText=refs&&refs.length?refs.map(function(item){return item.file+':'+item.line;}).join(', '):'';
out.push('| `'+id+'` | '+defs+' | '+escapeCell(refText)+' |');
}
out.push('');
const orphanRefs=referencedIds.filter(function(id){return !dom.defined.has(id);});
out.push('## 定義が見つからない参照（要確認）');
out.push('');
if(!orphanRefs.length){
out.push('なし。');
}else{
out.push('| id | 参照しているファイル |');
out.push('|----|--------------------|');
for(const id of orphanRefs){
out.push('| `'+id+'` | '+dom.referenced.get(id).map(function(item){return item.file+':'+item.line;}).join(', ')+' |');
}
}
out.push('');
out.push('## 参照しているファイル → id');
out.push('');
const byFile=new Map();
for(const id of referencedIds){
for(const item of dom.referenced.get(id)){
if(!byFile.has(item.file))byFile.set(item.file,new Set());
byFile.get(item.file).add(id);
}
}
const files=Array.from(byFile.keys()).sort(compareText);
for(const file of files){
const ids=Array.from(byFile.get(file)).sort(compareText);
out.push('- '+file+' : '+ids.map(function(id){return '`'+id+'`';}).join(', '));
}
if(!files.length)out.push('なし。');
out.push('');
return out.join('\n');
}

function renderFiles(entries){
const out=[];
out.push('# ファイル索引');
out.push('');
out.push('`scripts/gen-project-index.cjs` の自動生成。手で編集しない。');
out.push('');
out.push('- 用途はファイル先頭のコメントからのみ抽出する。取れない場合は空欄（推測で埋めない）');
out.push('- 除外: '+Object.keys(EXCLUDED_TOP).join(', '));
out.push('');
out.push('| ファイル | 行数 | 用途 |');
out.push('|---------|------|------|');
for(const entry of entries){
out.push('| '+entry.rel+' | '+entry.lineCount+' | '+escapeCell(leadingComment(entry.rawLines))+' |');
}
out.push('');
return out.join('\n');
}

function renderLoadOrder(loadOrder){
const scripts=loadOrder.filter(function(item){return item.tag==='script';});
const styles=loadOrder.filter(function(item){return item.tag==='link';});
const out=[];
out.push('# 読み込み順（index.html）');
out.push('');
out.push('`scripts/gen-project-index.cjs` の自動生成。手で編集しない。');
out.push('');
out.push('JS/CSS を編集したら `?v=` を上げてキャッシュを更新する。現在値の一覧はここを見る。');
out.push('');
out.push('## script（'+scripts.length+' 件）');
out.push('');
out.push('| # | src | v | 属性 | 行 |');
out.push('|---|-----|---|------|----|');
scripts.forEach(function(item,index){
const parts=splitUrl(item.url);
const attrs=[];
if(item.defer)attrs.push('defer');
if(item.isModule)attrs.push('module');
out.push('| '+(index+1)+' | '+parts.path+' | '+(parts.query||'')+' | '+attrs.join(' ')+' | '+item.line+' |');
});
out.push('');
out.push('## stylesheet（'+styles.length+' 件）');
out.push('');
out.push('| # | href | v | 行 |');
out.push('|---|------|---|----|');
styles.forEach(function(item,index){
const parts=splitUrl(item.url);
out.push('| '+(index+1)+' | '+parts.path+' | '+(parts.query||'')+' | '+item.line+' |');
});
out.push('');
return out.join('\n');
}

// テストではなく開発補助の script。テスト表からは外して別枠に出す。
const NON_TEST_SCRIPTS={
lint:1,
'lint:fix':1,
format:1,
index:1,
'check:index':1,
'generate:site-ui':1,
'vendor:free-assets':1
};

// リポジトリ直下として扱うディレクトリ。テストのパスは root 基準かスクリプト相対かが混在する。
const ROOT_DIRS={js:1,css:1,html:1,scripts:1,local_tools:1};

// テストが読んでいるプロジェクト内ファイル。検証対象の当たりを付けるために出す。
// 実在しないパスは落とす（?v= 付きやテスト用の一時名を混ぜないため）。
function extractTestTargets(text,testRel){
const dir=path.posix.dirname(testRel);
const out=new Set();
function add(raw){
const value=String(raw||'').split('?')[0].trim();
if(!value)return;
if(/^(node:|fs$|path$|https?:)/.test(value))return;
const head=value.split('/')[0];
if(EXCLUDED_TOP[head])return;
const candidates=ROOT_DIRS[head]
?[value]
:[path.posix.normalize(path.posix.join(dir,value))];
for(const target of candidates){
if(target.indexOf('..')===0)continue;
if(!fs.existsSync(path.join(root,target)))continue;
out.add(target);
}
}
const re=/readFileSync\(\s*(?:path\.join\(\s*root\s*,\s*)?['"`]([^'"`]+)['"`]/g;
let m;
while((m=re.exec(text)))add(m[1]);
const reJoin=/path\.join\(\s*root\s*,\s*['"`]([^'"`]+)['"`]/g;
while((m=reJoin.exec(text)))add(m[1]);
// python 側は Path(__file__).parents[1] / "js/..." 形式があるので、リテラルの js/ css/ も拾う。
const rePy=/['"`]((?:js|css|html|scripts|local_tools)\/[^'"`]+)['"`]/g;
while((m=rePy.exec(text)))add(m[1]);
return Array.from(out).sort(compareText);
}

// テスト内のアサーションメッセージ（リテラルのみ）。テストが何を見ているかの手掛かり。
function extractAssertionHints(text){
const out=[];
const res=[
/assert\.(?:ok|equal|strictEqual|deepEqual)\([^;\n]*?,\s*(['"])((?:(?!\1)[^\\\n]|\\.){4,80})\1/g,
/must\([^;\n]*?,\s*(['"])((?:(?!\1)[^\\\n]|\\.){4,80})\1/g,
/\bassert\([^;\n]*?,\s*(['"])((?:(?!\1)[^\\\n]|\\.){4,80})\1/g];
for(const re of res){
let m;
while((m=re.exec(text))){
const value=m[2].replace(/\\n/g,' ').trim();
if(value)out.push(value);
}
}
return Array.from(new Set(out));
}

function renderTests(pkg,entries){
const byRel=new Map();
for(const entry of entries)byRel.set(entry.rel,entry);
const scripts=pkg.scripts||{};
const rows=[];
const others=[];
Object.keys(scripts).forEach(function(name){
const command=String(scripts[name]||'');
if(NON_TEST_SCRIPTS[name]){
others.push({name:name,command:command});
return;
}
const m=command.match(/(?:node|python)\s+([^\s]+\.(?:cjs|mjs|js|py))/);
if(!m)return;
const file=m[1].split('\\').join('/');
rows.push({name:name,file:file,command:command});
});
rows.sort(function(a,b){return compareText(a.name,b.name);});
others.sort(function(a,b){return compareText(a.name,b.name);});
const out=[];
out.push('# テスト索引');
out.push('');
out.push('`scripts/gen-project-index.cjs` の自動生成。手で編集しない。');
out.push('');
out.push('- 検証内容はテストファイル先頭のコメントからのみ抽出する（推測で埋めない）');
out.push('');
out.push('| npm script | テストファイル | 検証内容（先頭コメント） |');
out.push('|-----------|---------------|--------------------|');
for(const row of rows){
const entry=byRel.get(row.file);
const purpose=entry?leadingComment(entry.rawLines):'';
out.push('| `npm run '+row.name+'` | '+row.file+' | '+escapeCell(purpose)+' |');
}
out.push('');
out.push('## テストが読む対象ファイル');
out.push('');
out.push('テスト内の `readFileSync` / リテラルパスから抽出。どの実装を守っているかの目安。');
out.push('');
out.push('| テスト | 対象ファイル |');
out.push('|--------|-----------|');
for(const row of rows){
const entry=byRel.get(row.file);
if(!entry)continue;
const targets=extractTestTargets(entry.rawLines.join('\n'),row.file);
if(!targets.length)continue;
out.push('| `npm run '+row.name+'` | '+targets.map(function(t){return '`'+t+'`';}).join(', ')+' |');
}
out.push('');
out.push('## テストが見ている条件（アサーションメッセージ）');
out.push('');
out.push('テスト内のリテラルなアサーションメッセージの抜粋。上限 8 件。');
out.push('');
for(const row of rows){
const entry=byRel.get(row.file);
if(!entry)continue;
const hints=extractAssertionHints(entry.rawLines.join('\n'));
if(!hints.length)continue;
out.push('### `npm run '+row.name+'`');
out.push('');
for(const hint of hints.slice(0,8))out.push('- '+hint);
out.push('');
}

out.push('## テスト以外の script');
out.push('');
for(const row of others)out.push('- `npm run '+row.name+'` → `'+row.command+'`');
if(!others.length)out.push('なし。');
out.push('');
return out.join('\n');
}

function renderProjectIndex(data){
const out=[];
out.push('# プロジェクト索引');
out.push('');
out.push('`scripts/gen-project-index.cjs` の自動生成。手で編集しない。');
out.push('');
out.push('まず `llm_doc/feature-map.md`（機能から探す）→ このファイル（横断索引）の順に読む。');
out.push('');
out.push('## どこを見ればいいか');
out.push('');
out.push('| 知りたいこと | 見るファイル |');
out.push('|-------------|-------------|');
out.push('| 機能から入口ファイルを探す | `llm_doc/feature-map.md` |');
out.push('| この関数はどこで定義されているか | `llm_doc/index/symbols.md` |');
out.push('| この id を触っているのはどのファイルか | `llm_doc/index/dom-ids.md` |');
out.push('| ファイルの場所と用途 | `llm_doc/index/files.md` |');
out.push('| script/CSS の読み込み順と `?v=` | `llm_doc/index/load-order.md` |');
out.push('| テストが何を検証しているか | `llm_doc/index/tests.md` |');
out.push('| 設計意図・規約 | `llm_doc/*.md`（project-structure, ui-patterns など） |');
out.push('');
out.push('## 規模');
out.push('');
out.push('| 種別 | 件数 |');
out.push('|------|------|');
const extCount=new Map();
for(const entry of data.entries){
const ext=entry.ext;
extCount.set(ext,(extCount.get(ext)||0)+1);
}
const exts=Array.from(extCount.keys()).sort(compareText);
for(const ext of exts)out.push('| '+ext+' | '+extCount.get(ext)+' |');
out.push('| シンボル | '+data.symbols.length+' |');
out.push('| DOM id 定義 | '+data.dom.defined.size+' |');
out.push('| script 読み込み | '+data.scriptCount+' |');
out.push('| stylesheet 読み込み | '+data.styleCount+' |');
out.push('');
out.push('## 除外ディレクトリ');
out.push('');
out.push(Object.keys(EXCLUDED_TOP).sort(compareText).join(', '));
out.push('');
out.push('## 公開グローバル（root.X= / window.X=）');
out.push('');
const globals=data.symbols.filter(function(symbol){return symbol.kind==='global';});
const globalNames=Array.from(new Set(globals.map(function(symbol){return symbol.name;}))).sort(compareText);
if(!globalNames.length){
out.push('なし。');
}else{
out.push('| グローバル | 定義 |');
out.push('|-----------|------|');
for(const name of globalNames){
const list=globals.filter(function(symbol){return symbol.name===name;});
out.push('| `'+name+'` | '+list.map(function(item){return item.file+':'+item.line;}).join(', ')+' |');
}
}
out.push('');
out.push('## 行数の多いファイル（上位25）');
out.push('');
out.push('| ファイル | 行数 | 用途 |');
out.push('|---------|------|------|');
const biggest=data.entries.slice().sort(function(a,b){
return (b.lineCount-a.lineCount)||compareText(a.rel,b.rel);
}).slice(0,25);
for(const entry of biggest){
out.push('| '+entry.rel+' | '+entry.lineCount+' | '+escapeCell(leadingComment(entry.rawLines))+' |');
}
out.push('');
out.push('## 再生成');
out.push('');
out.push('```');
out.push('npm run index');
out.push('npm run check:index');
out.push('```');
out.push('');
out.push('`check:index` は生成結果と既存ファイルの差分を検知する。索引が古いと非ゼロ終了する。');
out.push('');
out.push('## メンテナンス手順');
out.push('');
out.push('1. 機能を追加・移動したら `npm run index` を実行する。');
out.push('2. `npants` ではなく `npm run check:index` で差分ゼロを確認する。');
out.push('3. 機能の入口が変わった場合は `llm_doc/feature-map.md` を手で直す（自動生成対象外）。');
out.push('');
return out.join('\n');
}

function buildOutputs(){
const entries=collectEntries();
const symbols=collectSymbols(entries);
const dom=collectDomIds(entries);
const htmlPath=path.join(root,'index.html');
const htmlText=fs.existsSync(htmlPath)?fs.readFileSync(htmlPath,'utf8'):'';
const loadOrder=extractLoadOrder(htmlText);
let pkg={scripts:{}};
try{
pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
}catch(error){
pkg={scripts:{}};
}
const data={
entries:entries,
symbols:symbols,
dom:dom,
scriptCount:loadOrder.filter(function(item){return item.tag==='script';}).length,
styleCount:loadOrder.filter(function(item){return item.tag==='link';}).length
};
const outputs=new Map();
outputs.set('llm_doc/project-index.md',renderProjectIndex(data));
outputs.set('llm_doc/index/symbols.md',renderSymbols(symbols));
outputs.set('llm_doc/index/dom-ids.md',renderDomIds(dom));
outputs.set('llm_doc/index/files.md',renderFiles(entries));
outputs.set('llm_doc/index/load-order.md',renderLoadOrder(loadOrder));
outputs.set('llm_doc/index/tests.md',renderTests(pkg,entries));
return outputs;
}

function normalize(text){
return text.replace(/\r\n/g,'\n');
}

function main(){
const check=process.argv.indexOf('--check')>=0;
const outputs=buildOutputs();
const indexPath='llm_doc/project-index.md';
const indexText=outputs.get(indexPath);
const indexLines=normalize(indexText).split('\n').length;
if(indexLines>400){
console.error('project-index.md is too long: '+indexLines+' lines (limit 400)');
process.exit(1);
}
if(!check){
fs.mkdirSync(indexDir,{recursive:true});
}
let stale=0;
for(const rel of outputs.keys()){
const full=path.join(root,rel);
const next=normalize(outputs.get(rel));
if(check){
const current=fs.existsSync(full)?normalize(fs.readFileSync(full,'utf8')):null;
if(current===null){
console.error('missing: '+rel);
stale++;
}else if(current!==next){
console.error('stale: '+rel);
stale++;
}
continue;
}
fs.mkdirSync(path.dirname(full),{recursive:true});
fs.writeFileSync(full,next,{encoding:'utf8'});
}
if(check){
if(stale){
console.error(stale+' file(s) need regeneration. Run: npm run index');
process.exit(1);
}
console.log('project index is up to date');
return;
}
console.log('generated project index ('+indexLines+' lines in '+indexPath+')');
}

main();