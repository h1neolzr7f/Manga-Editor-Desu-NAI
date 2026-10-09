'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const sandbox = {window:{}};
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname,'../js/ai/manga-text-ink-mask.js'),'utf8'),
  sandbox,{filename:'manga-text-ink-mask.js'}
);
const {propose} = sandbox.window.MangaTextInkMask;

function page(r=255,g=r,b=r){
  const w=128,h=96,data=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<data.length;i+=4){
    data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;
  }
  return {width:w,height:h,data};
}
function rect(image,x,y,width,height,c=0,a=255){
  for(let yy=y;yy<y+height;yy++)
    for(let xx=x;xx<x+width;xx++){
      const i=(yy*image.width+xx)*4;
      image.data[i]=c;image.data[i+1]=c;image.data[i+2]=c;image.data[i+3]=a;
    }
}
const box={x:35,y:29,width:52,height:38};
const img=page();
rect(img,49,37,4,20);
rect(img,61,37,4,20);
rect(img,49,47,16,3);
const original=Buffer.from(img.data);
const result=propose(img,box);
assert.equal(result.ok,true,'clean white bubble should offer a provisional mask');
assert.equal(result.verified,false,'a proposal cannot imply model verification');
assert.equal(result.source,'uniform-light-background-ink');
assert(result.textCoverage>0 && result.textCoverage<.58);
assert.equal(result.mask.length,img.width*img.height);
assert.equal(result.mask[0],0,'outside the text box must not be masked');
assert.equal(result.mask[47*img.width+50],255,'dark text should be included');
assert.deepEqual(Buffer.from(img.data),original,'source must not be mutated');
console.log('PASS conservative white-bubble ink candidate; read-only source');

const unsafe=page(35);
rect(unsafe,49,37,4,20);
assert.equal(propose(unsafe,box).ok,false,'dark background must be declined');
const noisy=page();
for(let x=0;x<128;x++)rect(noisy,x,10,1,3,x%2?0:255);
rect(noisy,35,20,52,4,0);
assert.equal(propose(noisy,box).ok,false,'ink-adjacent artwork in sampling ring must be declined');
const edge=page();
assert.equal(propose(edge,{x:0,y:0,width:30,height:30}).ok,false,
  'a border-touching crop without a full sampling ring must be declined');
const blocked=page();
rect(blocked,35,29,52,38);
assert.equal(propose(blocked,box).ok,false,'a fully dark text box is not safe to erase');
const empty=page();
assert.equal(propose(empty,box).ok,false,'empty bubbles should not produce a mask');
assert.equal(propose(img,{x:NaN,y:20,width:10,height:20}).ok,false);
console.log('PASS rejection of dark/art-heavy/edge/full/empty/invalid candidates');
