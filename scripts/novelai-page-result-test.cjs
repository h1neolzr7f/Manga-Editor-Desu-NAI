const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={AIProvider:class{},document:{},isPageChanged:()=>true,applyGeneratedImageToOriginalPage:async()=>false,removeGenerationTask(){},console};
vm.createContext(context);vm.runInContext(fs.readFileSync('js/ai/provider/novelai-provider.js','utf8')+'\n globalThis.Provider=NovelAIProvider;',context);
(async()=>{
 const provider=new context.Provider();let placements=0;provider._placeOnCanvas=()=>placements++;
 let rejected=false;try{await provider._placeResult({}, {},'old-page','T2I');}catch(e){rejected=true;}
 assert.equal(placements,0,'off-page failure must never fall back to active page');assert.equal(rejected,true,'failed routing must surface failure');
 console.log('NovelAI wrong-page result regression passed');
})().catch(e=>{console.error(e);process.exitCode=1});
