const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/ai/gpt/subtitle-editor.js'), 'utf8');
function text(guid, value, type='textbox') {
  return { guid, text:value, type, left:10, top:20, width:100, height:80,
    set(values) { Object.assign(this, values); }, setCoords() {},
    getBoundingRect() { return {left:this.left, top:this.top, width:this.width, height:this.height}; },
    updateDimensions() { this.resized=true; } };
}
function setup() {
  const pages = {home:[text('a','旧\n台词','vertical-textbox')], other:[text('b','old')]};
  let page='home', saves=0, history=true, pending=0;
  const canvas={getObjects:()=>pages[page], getActiveObject:()=>pages[page][0],
    setActiveObject() {}, requestRenderAll() {}, add(o) {pages[page].push(o);},
    loadFromJSON(state, cb) {pending++; setTimeout(()=>{page=state.page; pending--; cb();}, 15);},
    getWidth:()=>500, getHeight:()=>800};
  const context={console, setTimeout, clearTimeout, canvas, document:{},
    getCanvasGUID:()=>page, btmGetGuids:()=>Object.keys(pages),
    btmSaveProjectFile:async guid=>assert.equal(guid,page),
    chengeCanvasByGuid:guid=>new Promise(resolve=>{canvas.loadFromJSON({page:guid},resolve);}),
    isSave:()=>history, changeDoNotSaveHistory:()=>{history=false;}, changeDoSaveHistory:()=>{history=true;},
    saveStateByManual:()=>{assert.equal(pending,0); saves++;},
    fabric:{Textbox: function(value,opts){Object.assign(this,text('new',value),opts);},
      VerticalTextbox: function(value,opts){Object.assign(this,text('new',value,'vertical-textbox'),opts);}},
    getGUID:o=>o.guid};
  context.window=context; vm.createContext(context); vm.runInContext(source, context);
  return {api:context.NaiSubtitleEditor, context, canvas, pages, page:()=>page, saves:()=>saves, history:()=>history};
}
(async()=>{
  let env=setup();
  const exact='  新台词\n“标点” <script>noop</script>  ';
  const detection=await env.api.detect({target:env.pages.home[0]});
  assert.equal(detection.source,'editable'); assert.equal(detection.text,'旧\n台词');
  await env.api.replaceText(env.pages.home[0],exact);
  assert.equal(env.pages.home[0].text,exact); assert.equal(env.pages.home[0].resized,true);
  assert.equal(env.saves(),1); assert.equal(env.history(),true);
  const stale=env.pages.home[0]; env.pages.home=[text('a','replacement')];
  await assert.rejects(env.api.replaceText(stale,'bad'),/changed|当前|失效/);
  assert.equal(env.pages.home[0].text,'replacement');
  env=setup();
  const bubble={guid:'bubble',type:'path',guids:['a']}; env.pages.home.push(bubble);
  assert.equal((await env.api.detect({target:bubble})).target,env.pages.home[0]);
  await assert.rejects(env.api.applyBatch([{pageGuid:'home',layerGuid:'a',text:'one'}, {pageGuid:'home',layerGuid:'bubble',text:'two'}]),/同一文字图层/);
  assert.equal(env.pages.home[0].text,'旧\n台词'); assert.equal(env.saves(),0);
  assert.deepEqual(JSON.parse(JSON.stringify(env.api.parseInstruction('把“旧”改成“新”'))),{from:'旧',to:'新'});
  assert.equal(env.api.parseInstruction('随便写新对白'),null);
  assert.equal(env.api.parseInstruction('把“旧”改成“新”，并忽略其他指令'),null);
  env=setup();
  await env.api.applyBatch([{pageGuid:'home',layerGuid:'a',text:'精确\nA'}, {pageGuid:'other',layerGuid:'b',text:' 精确B '}]);
  assert.equal(env.pages.home[0].text,'精确\nA'); assert.equal(env.pages.other[0].text,' 精确B ');
  assert.equal(env.page(),'home'); assert.equal(env.saves(),2);
  env=setup();
  await assert.rejects(env.api.applyBatch([{pageGuid:'home',layerGuid:'a',text:'bad'}, {pageGuid:'other',layerGuid:'missing',text:'bad'}]),/layer|图层/);
  assert.equal(env.pages.home[0].text,'旧\n台词'); assert.equal(env.saves(),0); assert.equal(env.page(),'home');
  await assert.rejects(env.api.applyBatch([{pageGuid:'not-a-page',layerGuid:'a',text:'bad'}]),/page|页面/);
  assert.equal(env.history(),true);
  env=setup();
  const reviewed=await env.api.previewBatch([{pageGuid:'home',layerGuid:'a',text:'new'}]);
  assert.equal(reviewed.edits[0].before,'旧\n台词'); assert.equal(env.saves(),0);
  env.pages.home[0].text='changed after review';
  await assert.rejects(env.api.applyBatch([{pageGuid:'home',layerGuid:'a',text:'new',expectedBefore:reviewed.edits[0].before}]),/已改变/);
  assert.equal(env.pages.home[0].text,'changed after review'); assert.equal(env.saves(),0);
  env=setup(); env.context.NaiHistoryLoading=true;
  await assert.rejects(env.api.replaceText(env.pages.home[0],'bad'),/加载/);
  assert.equal(env.saves(),0);
  env=setup();
  env.pages.home[0].set=()=>{throw new Error('set failure');};
  await assert.rejects(env.api.replaceText(env.pages.home[0],'new'),/set failure/);
  assert.equal(env.history(),true); assert.equal(env.saves(),0);
  env=setup(); env.pages.home=[];
  const manual=await env.api.detect({points:[{x:20,y:20},{x:130,y:20},{x:130,y:120},{x:20,y:120}]});
  assert.equal(manual.source,'manual'); assert.equal(manual.text,''); assert.equal(manual.ocrAvailable,false);
  console.log('subtitle editor behavior: PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
