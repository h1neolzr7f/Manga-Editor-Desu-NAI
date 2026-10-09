const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const box={window:{},console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/ai/manga-bubble-detector.js'),'utf8'),box);
const detector=box.window.MangaBubbleDetector;
assert(detector && typeof detector.findCandidates==='function');
function frame(w,h,bubbles,gapped=false){
  const data=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<data.length;i+=4)data.set([255,255,255,255],i);
  for (let [x0,y0,x1,y1] of bubbles){
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      if(y>=y0+3&&y<y1-3&&x>=x0+3&&x<x1-3)continue;
      if(gapped&&x===x0&&y>=y0+5&&y<y1-5)continue;
      const i=4*(y*w+x);
      data[i]=data[i+1]=data[i+2]=20;
    }
  }
  return {width:w,height:h,data};
}
const rect=frame(240,160,[[60,35,180,127]]);
const panels=[{id:'panel-1',order:1,x:0,y:0,width:240,height:160}];
const txt=[{id:'text-1',panelId:'panel-1',text:'Hello',
  x:99,y:76,width:39,height:18}];
const good=detector.findCandidates(rect,panels,txt,{width:240,height:160});
assert.equal(good.length,1,'sealed bright region associated with OCR line');
assert.equal(good[0].source,'enclosed-light-region');
assert.equal(good[0].panelId,'panel-1');
assert.equal(good[0].textId,'text-1');
assert.equal(good[0].verified,false,'candidate is never confirmed without user review');
assert(good[0].width>=105&&good[0].height>=80,'candidate bounds cover bubble interior');
assert.equal(detector.findCandidates(rect,panels,[],{width:240,height:160}).length,0,
  'bright empty regions are not automatically classified as speech bubbles');
const noBorder=detector.findCandidates(frame(240,160,[[60,35,180,127]],true),
  panels,txt,{width:240,height:160});
assert.equal(noBorder.length,0,'open border merges with outside white and must not hallucinate bubble');
const noInk=detector.findCandidates(frame(240,160,[]),panels,txt,{width:240,height:160});
assert.equal(noInk.length,0,'plain white page is not a bubble');
const malformed=detector.findCandidates({width:240,height:160,data:[]},panels,txt,{width:240,height:160});
assert.equal(malformed.length,0,'invalid image input fails closed');
const two=detector.findCandidates(frame(260,190,[[15,25,100,110],[141,55,235,155]]),
  [{id:'panel-1',order:1,x:0,y:0,width:260,height:190}],
  [{...txt,x:40,y:55,width:30,height:18,id:'a'},
   {...txt,x:175,y:88,width:30,height:18,id:'b'}],
  {width:260,height:190});
assert.equal(two.length,2,'separate text lines associate with separate enclosed regions');
console.log('PASS enclosed-light region candidate detection with OCR and safe fallback');
