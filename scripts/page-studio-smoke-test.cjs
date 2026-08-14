const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const storage=new Map();
const context={
console,
Math,
JSON,
Date,
Event:function Event(){},
document:{
documentElement:{getAttribute(){return '';},setAttribute(){}},
createElement(name){
if(name!=='canvas')return {appendChild(){},addEventListener(){}};
const calls=[];
return {
width:0,
height:0,
getContext(){
return {
calls,
fillStyle:'',
strokeStyle:'',
lineWidth:1,
fillRect(){calls.push('fillRect');},
clearRect(){calls.push('clearRect');},
beginPath(){},
arc(){},
ellipse(){},
fill(){calls.push('fill');},
stroke(){calls.push('stroke');},
moveTo(){},
lineTo(){},
save(){},
restore(){},
translate(){},
rotate(){},
createRadialGradient(){return {addColorStop(){}};},
addColorStop(){}
};
},
toDataURL(){return 'data:image/png;base64,AAA';}
};
},
getElementById(){return null;},
querySelectorAll(){return [];},
addEventListener(){}
},
localStorage:{
getItem(key){return storage.has(key)?storage.get(key):null;},
setItem(key,value){storage.set(key,String(value));}
}
};
context.window=context;
context.globalThis=context;
vm.createContext(context);

function load(relativePath){
vm.runInContext(fs.readFileSync(path.join(root,relativePath),'utf8'),context,{filename:relativePath});
}

load('js/sidebar/page/page-studio.js');
load('js/sidebar/text/sfx-palette.js');
load('js/sidebar/pen/brush-presets.js');
load('js/panel/layout-templates.js');

const studio=context.NaiPageStudio;
assert.ok(studio.PAPER_PRESETS.length>=6);
assert.ok(studio.EFFECT_PRESETS.some((item)=>item.id==='rain'));
assert.equal(studio.normalizeEffect({id:'rain',density:10}).id,'rain');
assert.equal(studio.BORDER_PRESETS.filter((item)=>item.id==='dashed')[0].strokeDashArray[0],14);

const paper=context.document.createElement('canvas');
paper.width=64;paper.height=64;
studio.drawPaper(paper.getContext('2d'),64,64,'aged');
assert.ok(paper.getContext('2d').calls.indexOf('fillRect')>=0);

const effect=context.document.createElement('canvas');
effect.width=64;effect.height=64;
studio.drawEffect(effect.getContext('2d'),64,64,{id:'rain',density:12});
assert.ok(effect.getContext('2d').calls.indexOf('stroke')>=0);

const sfx=context.NaiSfxPalette;
assert.ok(sfx.list().length>=40);
const custom=sfx.saveCustom({text:'轰隆隆',style:'wild'});
assert.equal(custom.text,'轰隆隆');
assert.ok(sfx.list().some((item)=>item.text==='轰隆隆'));

assert.equal(context.recommendPanelLayouts(4)[0].id,'grid-2x2');
assert.equal(context.recommendPanelLayouts(1)[0].id,'splash-full');
assert.ok(context.recommendPanelLayouts(1).length>=2);
assert.ok(context.PANEL_LAYOUT_TEMPLATES['nine-grid']);
assert.ok(context.NaiBrushPresets.list().some((item)=>item.id==='rain-streak'));
assert.ok(context.NaiBrushPresets.list().some((item)=>item.id==='watercolor'));
assert.ok(context.NaiBrushPresets.list().length>=20);
assert.ok(studio.PAPER_PRESETS.length>=10);
assert.ok(studio.EFFECT_PRESETS.some((item)=>item.id==='heat'));

assert.ok(studio.hydrateAll);
assert.equal(typeof studio.syncGridOverlay,'function');
assert.ok(studio.PAPER_PRESETS.every((item)=>item.tint));

console.log('page studio smoke test passed');
