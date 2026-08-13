// Translation key validation script - compares keys across all languages in i18next resources
const fs=require('fs');
const path=require('path');

var i18nextPath=path.resolve(__dirname,'..','js','ui','third','i18next.js');
var baseTranslationDir=path.resolve(__dirname,'..','js','ui','third','base-translation');
var expectedLangs=['ja','en','ko','fr','zh','ru','es','de'];

function extractResources(filePath) {
var content=fs.readFileSync(filePath,'utf-8');
var startMatch=content.match(/^const resources\s*=\s*\{/m);
if(!startMatch) {
throw new Error('Could not find "const resources = {" in '+filePath);
}
var startIdx=startMatch.index+startMatch[0].length-1;
var depth=1;
var i=startIdx+1;
while(i<content.length&&depth>0) {
var ch=content[i];
if(ch==='"'||ch==="'") {
var quote=ch;
i++;
while(i<content.length&&content[i]!==quote) {
if(content[i]==='\\') i++;
i++;
}
} else if(ch==='{') {
depth++;
} else if(ch==='}') {
depth--;
}
i++;
}
var resourcesStr=content.substring(startIdx,i);
resourcesStr=resourcesStr.replace(/\bbase_ja\b/g,'{}');
resourcesStr=resourcesStr.replace(/\bbase_en\b/g,'{}');
resourcesStr=resourcesStr.replace(/\bbase_ko\b/g,'{}');
resourcesStr=resourcesStr.replace(/\bbase_fr\b/g,'{}');
resourcesStr=resourcesStr.replace(/\bbase_zh\b/g,'{}');
resourcesStr=resourcesStr.replace(/\bbase_ru\b/g,'{}');
resourcesStr=resourcesStr.replace(/\bbase_es\b/g,'{}');
resourcesStr=resourcesStr.replace(/\bbase_de\b/g,'{}');
var fn=new Function('return ('+resourcesStr+');');
return fn();
}

function extractBaseTranslation(filePath) {
var content=fs.readFileSync(filePath,'utf-8');
var match=content.match(/^const\s+base_\w+\s*=\s*\{/m);
if(!match) return {};
var startIdx=match.index+match[0].length-1;
var depth=1;
var i=startIdx+1;
while(i<content.length&&depth>0) {
var ch=content[i];
if(ch==='"'||ch==="'") {
var quote=ch;
i++;
while(i<content.length&&content[i]!==quote) {
if(content[i]==='\\') i++;
i++;
}
} else if(ch==='{') {
depth++;
} else if(ch==='}') {
depth--;
}
i++;
}
var objStr=content.substring(startIdx,i);
var fn=new Function('return ('+objStr+');');
return fn();
}

function collectAllKeys(resources,baseTranslations) {
var langKeys={};
expectedLangs.forEach(function(lang) {
langKeys[lang]=new Set();
});
Object.keys(resources).forEach(function(dateKey) {
if(dateKey==='base') return;
var group=resources[dateKey];
Object.keys(group).forEach(function(lang) {
if(!langKeys[lang]) return;
Object.keys(group[lang]).forEach(function(key) {
langKeys[lang].add(key);
});
});
});
Object.keys(baseTranslations).forEach(function(lang) {
if(!langKeys[lang]) return;
Object.keys(baseTranslations[lang]).forEach(function(key) {
langKeys[lang].add(key);
});
});
return langKeys;
}

function run() {
console.log('=== Translation Key Validation ===\n');
var resources;
try {
resources=extractResources(i18nextPath);
} catch(e) {
console.error('ERROR: '+e.message);
process.exit(1);
}
var baseTranslations={};
expectedLangs.forEach(function(lang) {
var filePath=path.join(baseTranslationDir,'base-'+lang+'.js');
if(fs.existsSync(filePath)) {
baseTranslations[lang]=extractBaseTranslation(filePath);
} else {
baseTranslations[lang]={};
}
});
var langKeys=collectAllKeys(resources,baseTranslations);
var allKeys=new Set();
expectedLangs.forEach(function(lang) {
langKeys[lang].forEach(function(key) {
allKeys.add(key);
});
});
var sortedAllKeys=Array.from(allKeys).sort();
var totalKeys=sortedAllKeys.length;
console.log('Total unique keys: '+totalKeys);
console.log('Languages: '+expectedLangs.join(', ')+'\n');
expectedLangs.forEach(function(lang) {
console.log('  '+lang+': '+langKeys[lang].size+' keys');
});
console.log('');
var missingByLang={};
var hasMissing=false;
expectedLangs.forEach(function(lang) {
var missing=[];
sortedAllKeys.forEach(function(key) {
if(!langKeys[lang].has(key)) {
missing.push(key);
}
});
if(missing.length>0) {
missingByLang[lang]=missing;
hasMissing=true;
}
});
if(!hasMissing) {
console.log('OK: All keys are present in all languages.\n');
process.exit(0);
}
console.log('--- Missing Keys ---\n');
expectedLangs.forEach(function(lang) {
if(!missingByLang[lang]) return;
var missing=missingByLang[lang];
console.log('['+lang+'] missing '+missing.length+' key(s):');
missing.forEach(function(key) {
var presentIn=[];
expectedLangs.forEach(function(otherLang) {
if(langKeys[otherLang].has(key)) {
presentIn.push(otherLang);
}
});
console.log('  - '+key+'  (present in: '+presentIn.join(', ')+')');
});
console.log('');
});
var dateKeyIssues=[];
Object.keys(resources).forEach(function(dateKey) {
if(dateKey==='base') return;
var group=resources[dateKey];
var groupLangs=Object.keys(group);
var missingLangs=[];
expectedLangs.forEach(function(lang) {
if(groupLangs.indexOf(lang)===-1) {
missingLangs.push(lang);
}
});
if(missingLangs.length>0) {
dateKeyIssues.push({dateKey:dateKey,missingLangs:missingLangs});
}
var groupKeys={};
groupLangs.forEach(function(lang) {
if(expectedLangs.indexOf(lang)===-1) return;
groupKeys[lang]=Object.keys(group[lang]).sort();
});
var presentLangs=Object.keys(groupKeys);
if(presentLangs.length<2) return;
var referenceKeys=groupKeys[presentLangs[0]];
for(var idx=1;idx<presentLangs.length;idx++) {
var lang=presentLangs[idx];
var keys=groupKeys[lang];
if(JSON.stringify(referenceKeys)!==JSON.stringify(keys)) {
var refSet=new Set(referenceKeys);
var langSet=new Set(keys);
var missingInLang=referenceKeys.filter(function(k) {return!langSet.has(k);});
var extraInLang=keys.filter(function(k) {return!refSet.has(k);});
if(missingInLang.length>0||extraInLang.length>0) {
dateKeyIssues.push({
dateKey:dateKey,
lang:lang,
refLang:presentLangs[0],
missingInLang:missingInLang,
extraInLang:extraInLang
});
}
}
}
});
if(dateKeyIssues.length>0) {
console.log('--- Issues by Date Group ---\n');
dateKeyIssues.forEach(function(issue) {
if(issue.missingLangs) {
console.log('['+issue.dateKey+'] missing language(s): '+issue.missingLangs.join(', '));
}
if(issue.missingInLang&&issue.missingInLang.length>0) {
console.log('['+issue.dateKey+'] '+issue.lang+' missing vs '+issue.refLang+': '+issue.missingInLang.join(', '));
}
if(issue.extraInLang&&issue.extraInLang.length>0) {
console.log('['+issue.dateKey+'] '+issue.lang+' has extra vs '+issue.refLang+': '+issue.extraInLang.join(', '));
}
});
console.log('');
}
console.log('FAIL: Found missing translations.\n');
process.exit(1);
}

run();
