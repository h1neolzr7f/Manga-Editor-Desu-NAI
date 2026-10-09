// Red/green contract: inspect page pixels, split only credible gutters and
// associate OCR drafts without hallucinating speech-bubble ownership.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/ai/manga-page-structure.js'), 'utf8');
const ctx = { window: {}, console };
vm.runInNewContext(source, ctx, { filename:'manga-page-structure.js' });
const page = ctx.window.MangaPageStructure;
assert(page && typeof page.analyze === 'function');

function drawPage(w, h, rectangles) {
  const data = new Uint8ClampedArray(w * h * 4);
  for(let i=0;i<data.length;i+=4) data.set([255,255,255,255],i);
  for(const [x0,y0,x1,y1] of rectangles) {
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) {
      const i=(y*w+x)*4; data.set([28,32,35,255],i);
    }
  }
  return {width:w,height:h,data};
}
const leftRight=drawPage(300,220,[[16,16,132,204],[165,16,284,204]]);
const found=page.analyze(leftRight,{direction:'rtl'});
assert.equal(found.panels.length,2,'white vertical gutter separates exactly 2 panels');
assert(found.panels[0].x>found.panels[1].x,'RTL numbers the right panel first');
assert(found.panels.every(p=>p.width>75 && p.height>150));
const ltr=page.analyze(leftRight,{direction:'ltr'});
assert.equal(ltr.panels.length,2);
assert(ltr.panels[0].x<ltr.panels[1].x,'English comic reading order is LTR');

const four=page.analyze(drawPage(360,300,[
  [15,15,165,133],[195,15,345,133],[15,166,165,285],[195,166,345,285]
]),{direction:'rtl'});
assert.equal(four.panels.length,4,'nested XY-cut detects 2x2 panels');
assert(four.panels[0].y<four.panels[2].y,'reading order top before bottom');
assert(four.panels[0].x>four.panels[1].x,'right first within each row');
const one=page.analyze(drawPage(300,220,[[16,16,284,204]]),{direction:'rtl'});
assert.equal(one.panels.length,1,'do not invent gutters on single-panel art');
const blank=page.analyze(drawPage(300,220,[]),{direction:'rtl'});
assert.equal(blank.panels.length,1,'blank page falls back to one whole-page panel');
const min=page.analyze(drawPage(1,1,[]),{direction:'rtl'});
assert.equal(min.panels.length,1,'tiny page must not divide by zero');

const joined=page.attachText(found.panels,[
 {x:180,y:70,width:42,height:24,text:'first',confidence:92},
 {x:32,y:70,width:42,height:24,text:'second',confidence:87},
 {x:131,y:74,width:35,height:24,text:'gutter',confidence:80}
],{width:300,height:220});
assert.equal(joined.texts.length,3);
assert.equal(joined.texts[0].panelId,found.panels[0].id);
assert.equal(joined.texts[1].panelId,found.panels[1].id);
assert.equal(joined.texts[2].panelId,null,'text straddling panels is unassigned for human review');
assert.equal(joined.bubbleCandidates.length,2,'only situated OCR suggests provisional bubble regions');
assert(joined.bubbleCandidates.every(x=>x.source==='ocr-text-expansion' && x.verified===false));
assert.equal(page.pageSchemaVersion,1);
const malformed=page.attachText(found.panels,[{x:0,y:0,width:-1,height:12,text:'bad'}],{width:300,height:220});
assert.equal(malformed.texts.length,0,'malformed external model boxes ignored');

const repaired=page.splitPanel([{
  id:'panel-1',order:1,x:0,y:0,width:300,height:220,source:'whole-page-fallback',verified:false
}], 'panel-1','x','rtl');
assert.equal(repaired.length,2,'manual split turns fallback into two frames');
assert.equal(repaired[0].order,1);
assert(repaired[0].x > repaired[1].x,'RTL manual split keeps reading order');
assert(repaired.every(p=>p.verified===true && p.source==='manual-split'));
assert.equal(repaired[0].width+repaired[1].width,300);
assert.equal(page.splitPanel(repaired,'does-not-exist','y','rtl'),null);
assert.equal(page.splitPanel(repaired,'panel-1','diagonal','rtl'),null);
assert.equal(page.splitPanel([{
  id:'panel-1',order:1,x:0,y:0,width:7,height:10
}], 'panel-1','x','ltr'),null,'very narrow panels cannot be split');

const deleted=page.removePanel(repaired,repaired[1].id,'rtl');
assert.equal(deleted.length,1);
assert.equal(deleted[0].id,'panel-1');
assert.equal(page.removePanel(deleted,'panel-1','rtl'),null,'must keep at least one panel');

console.log('PASS manga page structure: gutters, reading order, 4-panel recursion, uncertain OCR links');
