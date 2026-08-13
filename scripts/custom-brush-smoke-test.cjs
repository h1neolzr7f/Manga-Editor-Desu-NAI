const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const storage=new Map();
const context={
console,
document:{createElement(){return{getContext(){return{
createRadialGradient(){return{addColorStop(){}};},
clearRect(){},
fillRect(){},
beginPath(){},
arc(){},
fill(){},
translate(){},
rotate(){}
};}};}},
localStorage:{
getItem(key){return storage.has(key)?storage.get(key):null;},
setItem(key,value){storage.set(key,String(value));}
}
};
context.window=context;
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js/sidebar/pen/brush-presets.js'),'utf8'),context,{filename:'brush-presets.js'});

const presets=context.NaiBrushPresets;
assert.equal(presets.list().length>=6,true);
assert.equal(presets.validate({name:'x',engine:'taper'}).ok,true);
assert.equal(presets.validate({name:'x',tip:'http://evil.example/tip.png'}).ok,false);
const saved=presets.saveUserPreset({name:'我的墨笔',engine:'taper',size:22,opacity:0.8,taperEnd:0.6});
assert.equal(saved.size,22);
assert.equal(presets.get(saved.id).name,'我的墨笔');
assert.ok(presets.importPack(presets.exportPack())>=1);

vm.runInContext(fs.readFileSync(path.join(root,'js/sidebar/pen/custom-brush.js'),'utf8'),context,{filename:'custom-brush.js'});
const tip=context.NaiCustomBrush.makeTipCanvas(saved,'#112233');
assert.equal(tip.width,22);
assert.equal(tip.height,22);

console.log('custom brush smoke test passed');
