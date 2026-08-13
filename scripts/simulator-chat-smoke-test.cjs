const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const context={console,URL,FormData,fetch};
context.globalThis=context;
vm.createContext(context);

function load(relativePath){
const source=fs.readFileSync(path.join(root,relativePath),'utf8');
vm.runInContext(source,context,{filename:relativePath});
}

load('js/simulator/template-registry.js');
load('js/simulator/chat-scene.js');
load('js/local-tools/local-tools-client.js');

const registry=context.NaiComicTemplateRegistry;
const scenes=context.NaiComicChatScene;

assert.equal(registry.get('generic-chat-dark').category,'chat');
assert.equal(registry.list('chat').length,1);

const scene=scenes.createDefaultScene();
assert.equal(scenes.validate(scene).ok,true);
assert.equal(scene.participants.length,2);
assert.equal(scene.messages.length,2);

const roundTrip=scenes.deserialize(scenes.serialize(scene));
assert.deepEqual(roundTrip.messages,scene.messages);
assert.equal(roundTrip.templateId,'generic-chat-dark');

roundTrip.participants=roundTrip.participants.filter((participant)=>participant.id!=='character_b');
const missing=scenes.validate(roundTrip);
assert.equal(missing.ok,false);
assert.match(missing.errors.join(' '),/character_b/);
assert.deepEqual(Array.from(scenes.getMissingSpeakerIds(roundTrip)),['character_b']);

assert.throws(()=>new context.NaiLocalToolsClient('https://example.com'),/只允许连接/);
assert.equal(new context.NaiLocalToolsClient().baseUrl,'http://127.0.0.1:8765');

console.log('simulator chat smoke test passed');
