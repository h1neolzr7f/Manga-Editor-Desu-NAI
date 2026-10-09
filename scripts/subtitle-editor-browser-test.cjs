/* Real Fabric + VerticalTextbox UI regression. Run with node scripts/subtitle-editor-browser-test.cjs. */
const assert = require('node:assert/strict');
const path = require('node:path');
const {createRequire} = require('node:module');
const requireRuntime = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'runtime.js')) : require;
const {chromium} = requireRuntime('playwright');
const root = path.resolve(__dirname,'..');
(async()=>{
  const browser = await chromium.launch({headless:true,executablePath:process.env.GPT_TEST_CHROMIUM||undefined,args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1000,height:900}});
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.setContent('<html><body><canvas id="c" width="600" height="800"></canvas></body></html>');
    await page.addScriptTag({path:path.join(root,'third/Fabric.js/fabric.min_PlusEraser.js')});
    await page.addScriptTag({path:path.join(root,'js/sidebar/text/vertical-textbox.js')});
    await page.evaluate(()=>{
      window.TextDetector=undefined;
      window.canvas=new fabric.Canvas('c');
      window.currentPage='home'; window.historySaving=true; window.historyCount=0;
      window.getCanvasGUID=()=>currentPage;
      window.btmGetGuids=()=>['home'];
      window.getGUID=o=>o.guid||(o.guid='guid-'+Math.random());
      window.isSave=()=>historySaving;
      window.changeDoNotSaveHistory=()=>{historySaving=false;};
      window.changeDoSaveHistory=()=>{historySaving=true;};
      window.saveStateByManual=()=>{historyCount++;};
      window.commonProperties=['guid','guids'];
      window.bubble=new fabric.Rect({left:20,top:20,width:240,height:180,fill:'#fff',guid:'bubble',guids:['dialogue']});
      window.original=new fabric.VerticalTextbox('旧台词\n第二行',{left:60,top:50,width:100,height:140,fontSize:24,guid:'dialogue',targetObject:bubble});
      canvas.add(bubble,original); canvas.setActiveObject(original);
    });
    await page.addScriptTag({path:path.join(root,'js/ai/gpt/subtitle-editor.js')});
    await page.evaluate(()=>NaiSubtitleEditor.open({target:bubble}));
    assert.equal(await page.locator('#nai-subtitle-text').inputValue(),'旧台词\n第二行');
    const exact='  准确的“台词”\n<script>window.injected=true</script>  ';
    await page.locator('#nai-subtitle-text').fill(exact);
    await page.locator('#nai-subtitle-apply').click();
    await page.waitForFunction(()=>document.querySelector('#nai-subtitle-dialog [role=status]').textContent.includes('已应用'));
    assert.deepEqual(await page.evaluate(()=>({text:original.text,guid:original.guid,binding:original.targetObject===bubble,history:historyCount,injected:!!window.injected})),
      {text:exact,guid:'dialogue',binding:true,history:1,injected:false});
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    const points=[{x:300,y:80},{x:530,y:80},{x:530,y:240},{x:300,y:240}];
    await page.evaluate(points=>NaiSubtitleEditor.open({points}),points);
    assert.match(await page.locator('#nai-subtitle-dialog [role=status]').textContent(),/OCR 不可用/);
    await page.locator('#nai-subtitle-text').fill('Exact horizontal\n第二行');
    await page.locator('#nai-subtitle-apply').click();
    await page.waitForFunction(()=>window.historyCount===2);
    assert.deepEqual(await page.evaluate(()=>canvas.getObjects().map(o=>({type:o.type,text:o.text})).slice(2)),[{type:'textbox',text:'Exact horizontal\n第二行'}]);
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    const verticalPoints=points.map(p=>({x:p.x,y:p.y+250}));
    await page.evaluate(points=>NaiSubtitleEditor.open({points}),verticalPoints);
    await page.getByLabel('新增文字方向').selectOption('vertical');
    await page.getByLabel('添加纯白覆盖层',{exact:false}).check();
    await page.locator('#nai-subtitle-text').fill('竖排\n准确字句');
    await page.locator('#nai-subtitle-apply').click();
    await page.waitForFunction(()=>window.historyCount===3);
    assert.deepEqual(await page.evaluate(()=>canvas.getObjects().slice(-2).map(o=>({type:o.type,text:o.text||null}))),
      [{type:'polygon',text:null},{type:'vertical-textbox',text:'竖排\n准确字句'}]);
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    await page.evaluate(()=>NaiSubtitleEditor.open({target:original}));
    await page.locator('#nai-subtitle-text').fill('stale change');
    await page.evaluate(()=>{original.set('left',original.left+20);});
    await page.locator('#nai-subtitle-apply').click();
    await page.waitForFunction(()=>document.querySelector('#nai-subtitle-dialog [role=status]').textContent.includes('画布已改变'));
    assert.equal(await page.evaluate(()=>original.text),exact);
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    await page.evaluate(()=>{window.NaiGptEditor={openSelection:(points,options)=>{window.delegated={points,options};}};});
    const removePoints=points.map(p=>({x:p.x-280,y:p.y+490}));
    await page.evaluate(points=>NaiSubtitleEditor.open({points}),removePoints);
    await page.getByRole('button',{name:'用 GPT 清除图片中原台词…'}).click();
    await page.waitForFunction(()=>!!window.delegated);
    assert.equal(await page.evaluate(()=>delegated.options.operation),'remove');
    assert.deepEqual(await page.evaluate(()=>delegated.points),removePoints);
    assert.deepEqual(errors,[]);
    console.log('subtitle editor real Fabric browser: PASS');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
