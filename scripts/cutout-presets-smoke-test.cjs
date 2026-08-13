const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const storage=new Map();
const context={
console,
URL,
localStorage:{
getItem(key){return storage.has(key)?storage.get(key):null;},
setItem(key,value){storage.set(key,String(value));}
}
};
context.window=context;
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js/local-tools/cutout-presets.js'),'utf8'),context,{filename:'cutout-presets.js'});
vm.runInContext(fs.readFileSync(path.join(root,'js/local-tools/local-tools-client.js'),'utf8'),context,{filename:'local-tools-client.js'});

const presets=context.NaiCutoutPresets;
assert.equal(presets.validate({name:'x',options:{engine:'rembg'}}).ok,true);
assert.equal(presets.validate({name:'x',options:{engine:'nope'}}).ok,false);
const saved=presets.saveUserPreset({name:'白底加强',options:{engine:'color-key',key_color:'#ffffff',action:'replace'}});
assert.equal(saved.builtin,false);
assert.equal(presets.list().filter((item)=>item.id===saved.id).length,1);
const imported=presets.importPack(presets.exportPack());
assert.ok(imported>=1);

assert.throws(()=>new context.NaiLocalToolsClient('https://example.com'),/只允许连接/);
assert.equal(new context.NaiLocalToolsClient().baseUrl,'http://127.0.0.1:8765');

console.log('cutout presets smoke test passed');
