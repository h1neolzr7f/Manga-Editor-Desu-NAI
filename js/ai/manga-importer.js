var MangaImporter=(function(){
var cropCache=new Map();
var lastImportSummary=null;
var nextPanelCursor=0;
var nextPlaceholderCursor=0;

function el(id){
return typeof $==='function'?$(id):document.getElementById(id);
}

function textOf(value){
return (value===undefined||value===null)?'':String(value);
}

function clamp(value,min,max){
value=Number(value);
if(!isFinite(value))value=min;
return Math.max(min,Math.min(max,value));
}

function getNumber(id,fallback,min,max){
var node=el(id);
var value=node?parseFloat(node.value):fallback;
if(!isFinite(value))value=fallback;
if(min!==undefined)value=Math.max(min,value);
if(max!==undefined)value=Math.min(max,value);
return value;
}

function isChecked(id,fallback){
var node=el(id);
return node?!!node.checked:!!fallback;
}

function setStatus(message,isError){
var node=el('mangaImportStatus');
if(node){
node.textContent=message;
node.style.borderColor=isError?'rgba(244,67,54,0.55)':'rgba(255,255,255,0.12)';
}
}

function notify(title,message,isError,time){
if(isError&&typeof createToastError==='function')createToastError(title,message,time||5000);
else if(typeof createToast==='function')createToast(title,message,time||3200);
}

function readFileAsDataUrl(file){
return new Promise(function(resolve,reject){
var reader=new FileReader();
reader.onload=function(event){resolve(event.target.result);};
reader.onerror=function(){reject(new Error('读取图片失败'));};
reader.readAsDataURL(file);
});
}

function loadImageElement(dataUrl){
return new Promise(function(resolve,reject){
var img=new Image();
img.onload=function(){resolve(img);};
img.onerror=function(){reject(new Error('图片解码失败'));};
img.src=dataUrl;
});
}

function getAnalysisCanvas(image,maxSide){
var scale=Math.min(1,(maxSide||1100)/Math.max(image.naturalWidth||image.width,image.naturalHeight||image.height));
var width=Math.max(1,Math.round((image.naturalWidth||image.width)*scale));
var height=Math.max(1,Math.round((image.naturalHeight||image.height)*scale));
var c=document.createElement('canvas');
var ctx=c.getContext('2d',{willReadFrequently:true});
c.width=width;
c.height=height;
ctx.drawImage(image,0,0,width,height);
return {canvas:c,ctx:ctx,width:width,height:height,scale:scale};
}

function buildInkMask(imageData,width,height,threshold){
var data=imageData.data;
var mask=new Uint8Array(width*height);
for(var i=0,p=0;i<data.length;i+=4,p++){
var r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
var luma=0.299*r+0.587*g+0.114*b;
var spread=Math.max(r,g,b)-Math.min(r,g,b);
var isWhite=a<16||(luma>=threshold&&spread<42);
mask[p]=isWhite?0:1;
}
return mask;
}

function buildWhiteMask(imageData,width,height,threshold){
var data=imageData.data;
var mask=new Uint8Array(width*height);
for(var i=0,p=0;i<data.length;i+=4,p++){
var r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
var luma=0.299*r+0.587*g+0.114*b;
var spread=Math.max(r,g,b)-Math.min(r,g,b);
mask[p]=(a<16||(luma>=threshold&&spread<46))?1:0;
}
return mask;
}

function buildFrameLineMask(imageData,width,height){
var data=imageData.data;
var mask=new Uint8Array(width*height);
for(var i=0,p=0;i<data.length;i+=4,p++){
var r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
var luma=0.299*r+0.587*g+0.114*b;
var spread=Math.max(r,g,b)-Math.min(r,g,b);
mask[p]=(a>=16&&luma<118&&spread<95)?1:0;
}
return mask;
}

function dilateMask(mask,width,height,radius){
radius=Math.max(0,Math.round(radius||0));
if(radius<=0)return mask;
var out=new Uint8Array(mask.length);
for(var y=0;y<height;y++){
for(var x=0;x<width;x++){
var found=false;
for(var dy=-radius;dy<=radius&&!found;dy++){
var yy=y+dy;
if(yy<0||yy>=height)continue;
for(var dx=-radius;dx<=radius;dx++){
var xx=x+dx;
if(xx<0||xx>=width)continue;
if(mask[yy*width+xx]){
found=true;
break;
}
}
}
out[y*width+x]=found?1:0;
}
}
return out;
}

function findConnectedBoxes(mask,width,height,minAreaPx){
var visited=new Uint8Array(mask.length);
var boxes=[];
var qx=[];
var qy=[];
var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
for(var y=0;y<height;y++){
for(var x=0;x<width;x++){
var start=y*width+x;
if(!mask[start]||visited[start])continue;
var head=0;
var area=0;
var minX=x,maxX=x,minY=y,maxY=y;
qx.length=0;
qy.length=0;
qx.push(x);
qy.push(y);
visited[start]=1;
while(head<qx.length){
var cx=qx[head];
var cy=qy[head];
head++;
area++;
if(cx<minX)minX=cx;
if(cx>maxX)maxX=cx;
if(cy<minY)minY=cy;
if(cy>maxY)maxY=cy;
for(var d=0;d<dirs.length;d++){
var nx=cx+dirs[d][0];
var ny=cy+dirs[d][1];
if(nx<0||nx>=width||ny<0||ny>=height)continue;
var ni=ny*width+nx;
if(mask[ni]&&!visited[ni]){
visited[ni]=1;
qx.push(nx);
qy.push(ny);
}
}
}
if(area>=minAreaPx){
var bw=maxX-minX+1;
var bh=maxY-minY+1;
if(bw>=width*0.05&&bh>=height*0.05){
boxes.push({x:minX,y:minY,w:bw,h:bh,area:area});
}
}
}
}
return boxes;
}

function inflateBox(box,pad,width,height){
var inflated={
x:clamp(box.x-pad,0,width-1),
y:clamp(box.y-pad,0,height-1),
w:clamp(box.w+pad*2,1,width),
h:clamp(box.h+pad*2,1,height)
};
for(var key in box){
if(Object.prototype.hasOwnProperty.call(box,key)&&inflated[key]===undefined)inflated[key]=box[key];
}
return inflated;
}

function boxRight(box){return box.x+box.w;}
function boxBottom(box){return box.y+box.h;}

function boxArea(box){
return Math.max(0,box.w)*Math.max(0,box.h);
}

function intersectionArea(a,b){
var x1=Math.max(a.x,b.x);
var y1=Math.max(a.y,b.y);
var x2=Math.min(boxRight(a),boxRight(b));
var y2=Math.min(boxBottom(a),boxBottom(b));
return Math.max(0,x2-x1)*Math.max(0,y2-y1);
}

function boxIou(a,b){
var hit=intersectionArea(a,b);
var total=boxArea(a)+boxArea(b)-hit;
return total>0?hit/total:0;
}

function findContentBox(mask,width,height,pad){
var minX=width,minY=height,maxX=-1,maxY=-1;
for(var y=0;y<height;y++){
for(var x=0;x<width;x++){
if(mask[y*width+x]){
if(x<minX)minX=x;
if(x>maxX)maxX=x;
if(y<minY)minY=y;
if(y>maxY)maxY=y;
}
}
}
if(maxX<minX||maxY<minY){
var margin=Math.round(Math.min(width,height)*0.035);
return {x:margin,y:margin,w:width-margin*2,h:height-margin*2,area:(width-margin*2)*(height-margin*2),source:'single-page-fallback'};
}
pad=pad===undefined?Math.max(3,Math.round(Math.min(width,height)*0.01)):pad;
minX=clamp(minX-pad,0,width-1);
minY=clamp(minY-pad,0,height-1);
maxX=clamp(maxX+pad,0,width-1);
maxY=clamp(maxY+pad,0,height-1);
return {x:minX,y:minY,w:Math.max(1,maxX-minX+1),h:Math.max(1,maxY-minY+1),area:Math.max(1,(maxX-minX+1)*(maxY-minY+1)),source:'single-page-content'};
}

function panelSourcePriority(source,box){
if(source==='frame-lines')return 8;
if(source==='frame-separator')return 8;
if(source==='gutter-split')return 7;
if(source==='open-frame-lines')return (box.edgeBonus||0)>=2?5:2;
if(source==='connected-components')return 1;
return 0;
}

function isUsablePanelBox(box,width,height,contentBox){
var pageArea=width*height;
var area=boxArea(box);
var areaRatio=area/pageArea;
if(areaRatio<0.009||areaRatio>0.9)return false;
if(box.w<width*0.055||box.h<height*0.04)return false;
var aspect=box.w/Math.max(1,box.h);
if(aspect<0.10||aspect>11)return false;
var source=box.source||'';
if(source==='open-frame-lines'&&(box.edgeBonus||0)<2&&areaRatio<0.045)return false;
if(source==='connected-components'&&areaRatio<0.03)return false;
if(source==='gutter-split'||source==='frame-separator'){
if(source==='frame-separator'&&box.w<width*0.12)return false;
if(source==='frame-separator'&&box.w<width*0.18&&box.h>height*0.60)return false;
if(box.w<width*0.16&&box.h<height*0.55)return false;
if(box.h<height*0.07&&box.w<width*0.75)return false;
if(areaRatio<0.028&&(box.w<width*0.22||box.h<height*0.10))return false;
}
if(source!=='frame-lines'&&source!=='gutter-split'){
if(box.w<width*0.09&&box.h>height*0.16)return false;
if(box.h<height*0.065&&box.w>width*0.24)return false;
}
if(contentBox&&intersectionArea(box,contentBox)<area*0.55)return false;
return true;
}

function dedupePanelBoxes(boxes,width,height){
var kept=[];
boxes=boxes.slice().sort(function(a,b){
var scoreA=panelSourcePriority(a.source,a)*1000000+boxArea(a)+(a.edgeBonus||0)*10000;
var scoreB=panelSourcePriority(b.source,b)*1000000+boxArea(b)+(b.edgeBonus||0)*10000;
return scoreB-scoreA;
});
for(var i=0;i<boxes.length;i++){
var candidate=boxes[i];
var duplicate=false;
for(var j=0;j<kept.length;j++){
var hit=intersectionArea(candidate,kept[j]);
var smaller=Math.min(boxArea(candidate),boxArea(kept[j]));
if(boxIou(candidate,kept[j])>0.42||hit/Math.max(1,smaller)>0.72){
duplicate=true;
break;
}
}
if(!duplicate)kept.push(candidate);
}
return kept;
}

function refineDetectedPanels(groups,rawMask,width,height,contentBox){
var all=[];
function addList(list,source){
for(var i=0;i<(list||[]).length;i++){
var box=list[i];
var copy={
x:box.x,
y:box.y,
w:box.w,
h:box.h,
area:box.area||boxArea(box),
edgeBonus:box.edgeBonus||0,
source:box.source||source
};
if(isUsablePanelBox(copy,width,height,contentBox))all.push(copy);
}
}
addList(groups.frameBoxes,'frame-lines');
addList(groups.separatorBoxes,'frame-separator');
var gutterList=groups.gutterBoxes||[];
for(var gi=0;gi<gutterList.length;gi++){
var gutterBox=gutterList[gi];
if(groups.frameLineMask&&gutterBox.source==='gutter-split'){
gutterBox=Object.assign({},gutterBox,{edgeScore:edgeInkRatio(groups.frameLineMask,width,height,gutterBox,3)});
if(gutterBox.edgeScore<0.045&&boxArea(gutterBox)<width*height*0.12)continue;
}
addList([gutterBox],'gutter-split');
}
addList(groups.openFrameBoxes,'open-frame-lines');
addList(groups.connectedBoxes,'connected-components');
var structural=all.filter(function(box){
return box.source==='frame-lines'||box.source==='frame-separator';
});
var reliable=(structural.length>=2?structural:all).filter(function(box){
var priority=panelSourcePriority(box.source,box);
return priority>=5;
});
var chosen=dedupePanelBoxes(reliable.length?reliable:all,width,height);
chosen=chosen.filter(function(box,index){
for(var i=0;i<chosen.length;i++){
if(i===index)continue;
var other=chosen[i];
var inside=box.x>=other.x&&box.y>=other.y&&boxRight(box)<=boxRight(other)&&boxBottom(box)<=boxBottom(other);
if(inside&&boxArea(box)<boxArea(other)*0.55)return false;
}
return true;
});
var multiCoverage=chosen.reduce(function(sum,box){return sum+boxArea(box);},0)/Math.max(1,boxArea(contentBox||{x:0,y:0,w:width,h:height}));
var reliableCount=chosen.filter(function(box){return panelSourcePriority(box.source,box)>=5;}).length;
if(chosen.length<2||reliableCount<2||multiCoverage<0.18){
return [contentBox||findContentBox(rawMask,width,height)];
}
return sortBoxesForReading(chosen).slice(0,24);
}

function quantile(values,q){
if(!values.length)return 0;
var copy=values.slice().sort(function(a,b){return a-b;});
var pos=(copy.length-1)*q;
var base=Math.floor(pos);
var rest=pos-base;
if(copy[base+1]!==undefined)return copy[base]+rest*(copy[base+1]-copy[base]);
return copy[base];
}

function overlapsOrNear(a,b,gap){
return !(boxRight(a)<b.x-gap||boxRight(b)<a.x-gap||boxBottom(a)<b.y-gap||boxBottom(b)<a.y-gap);
}

function mergeBoxes(boxes,width,height){
var changed=true;
var gap=Math.max(2,Math.round(Math.min(width,height)*0.008));
boxes=boxes.map(function(box){return inflateBox(box,gap,width,height);});
while(changed){
changed=false;
for(var i=0;i<boxes.length;i++){
for(var j=i+1;j<boxes.length;j++){
if(overlapsOrNear(boxes[i],boxes[j],gap)){
var x=Math.min(boxes[i].x,boxes[j].x);
var y=Math.min(boxes[i].y,boxes[j].y);
var r=Math.max(boxRight(boxes[i]),boxRight(boxes[j]));
var b=Math.max(boxBottom(boxes[i]),boxBottom(boxes[j]));
boxes[i]={x:x,y:y,w:r-x,h:b-y,area:(boxes[i].area||0)+(boxes[j].area||0),source:boxes[i].source===boxes[j].source?boxes[i].source:'merged',edgeBonus:Math.max(boxes[i].edgeBonus||0,boxes[j].edgeBonus||0)};
boxes.splice(j,1);
changed=true;
break;
}
}
if(changed)break;
}
}
return boxes;
}

function removeNestedAndPageBox(boxes,width,height){
var pageArea=width*height;
boxes=boxes.filter(function(box){
var area=box.w*box.h;
if(area>pageArea*0.92)return false;
return box.w>8&&box.h>8;
});
return boxes.filter(function(box,index){
for(var i=0;i<boxes.length;i++){
if(i===index)continue;
var other=boxes[i];
var inside=box.x>=other.x&&box.y>=other.y&&boxRight(box)<=boxRight(other)&&boxBottom(box)<=boxBottom(other);
if(inside&&(box.w*box.h)<(other.w*other.h)*0.72)return false;
}
return true;
});
}

function detectForegroundObstacleBoxes(rawMask,width,height){
var pageArea=width*height;
var denseMask=buildDenseInkMask(rawMask,width,height,4,0.18);
var xBands=findProjectionBands(countProjection(denseMask,width,height,'x'),Math.max(height*0.08,20),Math.max(12,Math.round(width*0.045)));
var yBands=findProjectionBands(countProjection(denseMask,width,height,'y'),Math.max(width*0.055,20),Math.max(20,Math.round(height*0.075)));
var projectionBoxes=[];
var projectionPad=Math.max(3,Math.round(Math.min(width,height)*0.01));
for(var bx=0;bx<xBands.length;bx++){
for(var by=0;by<yBands.length;by++){
var candidate=inflateBox({
x:xBands[bx].start,
y:yBands[by].start,
w:xBands[bx].end-xBands[bx].start+1,
h:yBands[by].end-yBands[by].start+1,
area:0,
source:'foreground-projection'
},projectionPad,width,height);
var candidateArea=boxArea(candidate);
var denseInk=countInkInBox(denseMask,width,candidate);
var rawInk=countInkInBox(rawMask,width,candidate);
if(candidateArea<pageArea*0.025||candidateArea>pageArea*0.62)continue;
if(candidate.h<height*0.24||candidate.h<candidate.w*0.85)continue;
if(denseInk/Math.max(1,candidateArea)<0.06)continue;
if(rawInk/Math.max(1,candidateArea)<0.045)continue;
candidate.area=rawInk;
projectionBoxes.push(candidate);
}
}
var mask=dilateMask(rawMask,width,height,2);
var components=findConnectedBoxes(mask,width,height,Math.max(36,Math.round(pageArea*0.012)));
var pad=Math.max(3,Math.round(Math.min(width,height)*0.008));
var boxes=projectionBoxes;
for(var i=0;i<components.length;i++){
var box=inflateBox(components[i],pad,width,height);
var boundsArea=boxArea(box);
var inkArea=components[i].area||boundsArea;
var density=inkArea/Math.max(1,boundsArea);
if(boundsArea<pageArea*0.025)continue;
if(boundsArea>pageArea*0.62)continue;
if(box.h<height*0.28)continue;
if(box.w>width*0.82&&box.h>height*0.62)continue;
if(density<0.018)continue;
if(box.h>=height*0.38||box.h>=box.w*1.05){
boxes.push({x:box.x,y:box.y,w:box.w,h:box.h,area:inkArea,source:'foreground-obstacle'});
}
}
if(!boxes.length)return [];
boxes=mergeBoxes(boxes,width,height).filter(function(box){
return boxArea(box)>=pageArea*0.025&&boxArea(box)<=pageArea*0.62&&box.h>=height*0.25;
});
boxes.sort(function(a,b){return boxArea(b)-boxArea(a);});
return boxes.slice(0,4);
}

function buildDenseInkMask(mask,width,height,radius,minRatio){
radius=Math.max(1,Math.round(radius||4));
minRatio=Math.max(0.01,Math.min(0.9,minRatio||0.18));
var stride=width+1;
var integral=new Uint32Array((width+1)*(height+1));
for(var y=1;y<=height;y++){
var rowSum=0;
for(var x=1;x<=width;x++){
rowSum+=mask[(y-1)*width+x-1];
integral[y*stride+x]=integral[(y-1)*stride+x]+rowSum;
}
}
var out=new Uint8Array(mask.length);
for(var yy=0;yy<height;yy++){
var y1=Math.max(0,yy-radius);
var y2=Math.min(height-1,yy+radius);
for(var xx=0;xx<width;xx++){
var x1=Math.max(0,xx-radius);
var x2=Math.min(width-1,xx+radius);
var area=(x2-x1+1)*(y2-y1+1);
var sum=integral[(y2+1)*stride+(x2+1)]-integral[y1*stride+(x2+1)]-integral[(y2+1)*stride+x1]+integral[y1*stride+x1];
out[yy*width+xx]=sum>=area*minRatio?1:0;
}
}
return out;
}

function countProjection(mask,width,height,axis){
var counts=[];
if(axis==='x'){
for(var x=0;x<width;x++){
var total=0;
for(var y=0;y<height;y++)total+=mask[y*width+x];
counts.push(total);
}
}else{
for(var yy=0;yy<height;yy++){
var row=yy*width;
var rowTotal=0;
for(var xx=0;xx<width;xx++)rowTotal+=mask[row+xx];
counts.push(rowTotal);
}
}
return counts;
}

function findProjectionBands(counts,threshold,minSize){
var bands=[];
var current=null;
for(var i=0;i<counts.length;i++){
var active=counts[i]>=threshold;
if(active&&!current)current={start:i,end:i,score:counts[i]};
else if(active&&current){
current.end=i;
current.score+=counts[i];
}else if(!active&&current){
if(current.end-current.start+1>=minSize)bands.push(current);
current=null;
}
}
if(current&&current.end-current.start+1>=minSize)bands.push(current);
bands.sort(function(a,b){return b.score-a.score;});
return bands.slice(0,6);
}

function countInkInBox(mask,width,box){
var total=0;
var left=Math.max(0,Math.floor(box.x));
var top=Math.max(0,Math.floor(box.y));
var right=Math.min(width,Math.ceil(box.x+box.w));
var bottom=Math.min(mask.length/width,Math.ceil(box.y+box.h));
for(var y=top;y<bottom;y++){
var row=y*width;
for(var x=left;x<right;x++)total+=mask[row+x];
}
return total;
}

function eraseForegroundObstaclesFromMask(mask,width,height,boxes){
if(!boxes||!boxes.length)return mask;
var dense=dilateMask(buildDenseInkMask(mask,width,height,4,0.16),width,height,5);
var out=new Uint8Array(mask);
for(var i=0;i<boxes.length;i++){
var box=boxes[i];
var left=Math.max(0,Math.floor(box.x));
var top=Math.max(0,Math.floor(box.y));
var right=Math.min(width,Math.ceil(box.x+box.w));
var bottom=Math.min(height,Math.ceil(box.y+box.h));
for(var y=top;y<bottom;y++){
var row=y*width;
for(var x=left;x<right;x++){
if(dense[row+x])out[row+x]=0;
}
}
}
return out;
}

function sortBoxesForReading(boxes){
boxes.sort(function(a,b){
var rowTolerance=Math.max(a.h,b.h)*0.42;
if(Math.abs(a.y-b.y)>rowTolerance)return a.y-b.y;
return a.x-b.x;
});
return boxes;
}

function lineInkCount(mask,width,region,axis,pos){
var count=0;
if(axis==='x'){
for(var y=region.y;y<region.y+region.h;y++){
if(mask[y*width+pos])count++;
}
}else{
var row=pos*width;
for(var x=region.x;x<region.x+region.w;x++){
if(mask[row+x])count++;
}
}
return count;
}

function edgeInkRatio(mask,width,height,box,edge){
edge=Math.max(1,Math.round(edge||3));
var left=clamp(Math.round(box.x),0,width-1);
var right=clamp(Math.round(box.x+box.w-1),0,width-1);
var top=clamp(Math.round(box.y),0,height-1);
var bottom=clamp(Math.round(box.y+box.h-1),0,height-1);
var hits=0;
var total=0;
for(var y=Math.max(0,top-edge);y<=Math.min(height-1,top+edge);y++){
for(var x=left;x<=right;x++){
total++;
hits+=mask[y*width+x];
}
}
for(var yy=Math.max(0,bottom-edge);yy<=Math.min(height-1,bottom+edge);yy++){
for(var xx=left;xx<=right;xx++){
total++;
hits+=mask[yy*width+xx];
}
}
for(var y2=top;y2<=bottom;y2++){
for(var x2=Math.max(0,left-edge);x2<=Math.min(width-1,left+edge);x2++){
total++;
hits+=mask[y2*width+x2];
}
}
for(var y3=top;y3<=bottom;y3++){
for(var x3=Math.max(0,right-edge);x3<=Math.min(width-1,right+edge);x3++){
total++;
hits+=mask[y3*width+x3];
}
}
return total?hits/total:0;
}

function maskInkRatio(mask,width,box){
var area=boxArea(box);
if(!mask||!area)return 0;
return countInkInBox(mask,width,box)/area;
}

function findGutterBand(mask,width,region,axis){
var size=axis==='x'?region.w:region.h;
var cross=axis==='x'?region.h:region.w;
var start=axis==='x'?region.x:region.y;
var edge=Math.max(5,Math.round(size*0.035));
var minThickness=Math.max(4,Math.round(size*0.008));
var lineCounts=[];
for(var scan=start+edge;scan<start+size-edge;scan++){
lineCounts.push(lineInkCount(mask,width,region,axis,scan));
}
var lowInk=quantile(lineCounts,0.22);
var maxInk=Math.max(1,Math.round(Math.max(cross*0.018,Math.min(cross*0.18,lowInk*1.45+2))));
var bands=[];
var current=null;
for(var i=start+edge;i<start+size-edge;i++){
var clear=lineInkCount(mask,width,region,axis,i)<=maxInk;
if(clear&&!current){
current={start:i,end:i};
}else if(clear&&current){
current.end=i;
}else if(!clear&&current){
if(current.end-current.start+1>=minThickness)bands.push(current);
current=null;
}
}
if(current&&current.end-current.start+1>=minThickness)bands.push(current);
if(!bands.length)return null;
bands.sort(function(a,b){
var aw=a.end-a.start+1;
var bw=b.end-b.start+1;
var ac=Math.abs((a.start+a.end)/2-(start+size/2));
var bc=Math.abs((b.start+b.end)/2-(start+size/2));
return (bw*10-bc*0.03)-(aw*10-ac*0.03);
});
return bands[0];
}

function whiteLineRatio(whiteMask,width,region,axis,pos){
var total=0;
var count=0;
if(axis==='x'){
for(var y=region.y;y<region.y+region.h;y++){
count++;
total+=whiteMask[y*width+pos];
}
}else{
var row=pos*width;
for(var x=region.x;x<region.x+region.w;x++){
count++;
total+=whiteMask[row+x];
}
}
return count?total/count:0;
}

function findWhiteGutterBand(whiteMask,width,region,axis){
var size=axis==='x'?region.w:region.h;
var start=axis==='x'?region.x:region.y;
var edge=Math.max(5,Math.round(size*0.035));
var minThickness=Math.max(5,Math.round(size*0.01));
var bands=[];
var current=null;
for(var scan=start+edge;scan<start+size-edge;scan++){
var clear=whiteLineRatio(whiteMask,width,region,axis,scan)>=0.965;
if(clear&&!current)current={start:scan,end:scan};
else if(clear&&current)current.end=scan;
else if(!clear&&current){
if(current.end-current.start+1>=minThickness)bands.push(current);
current=null;
}
}
if(current&&current.end-current.start+1>=minThickness)bands.push(current);
if(!bands.length)return null;
bands.sort(function(a,b){
var aw=a.end-a.start+1;
var bw=b.end-b.start+1;
var ac=Math.abs((a.start+a.end)/2-(start+size/2));
var bc=Math.abs((b.start+b.end)/2-(start+size/2));
return (bw*10-bc*0.02)-(aw*10-ac*0.02);
});
return bands[0];
}

function findLowInkGutterBand(mask,width,region,axis){
var size=axis==='x'?region.w:region.h;
var cross=axis==='x'?region.h:region.w;
var start=axis==='x'?region.x:region.y;
var edge=Math.max(5,Math.round(size*0.035));
var minThickness=Math.max(4,Math.round(size*0.008));
var maxInk=Math.max(2,Math.round(cross*0.018));
var bands=[];
var current=null;
for(var scan=start+edge;scan<start+size-edge;scan++){
var clear=lineInkCount(mask,width,region,axis,scan)<=maxInk;
if(clear&&!current){
current={start:scan,end:scan};
}else if(clear&&current){
current.end=scan;
}else if(!clear&&current){
if(current.end-current.start+1>=minThickness)bands.push(current);
current=null;
}
}
if(current&&current.end-current.start+1>=minThickness)bands.push(current);
if(!bands.length)return null;
bands.sort(function(a,b){
var aw=a.end-a.start+1;
var bw=b.end-b.start+1;
var ac=Math.abs((a.start+a.end)/2-(start+size/2));
var bc=Math.abs((b.start+b.end)/2-(start+size/2));
return (bw*10-bc*0.03)-(aw*10-ac*0.03);
});
return bands[0];
}

function trimRegionToInk(mask,width,height,region,pad){
var minX=region.x+region.w;
var minY=region.y+region.h;
var maxX=region.x;
var maxY=region.y;
var found=false;
for(var y=region.y;y<region.y+region.h;y++){
for(var x=region.x;x<region.x+region.w;x++){
if(mask[y*width+x]){
found=true;
if(x<minX)minX=x;
if(x>maxX)maxX=x;
if(y<minY)minY=y;
if(y>maxY)maxY=y;
}
}
}
if(!found)return region;
pad=pad||3;
minX=clamp(minX-pad,0,width-1);
minY=clamp(minY-pad,0,height-1);
maxX=clamp(maxX+pad,0,width-1);
maxY=clamp(maxY+pad,0,height-1);
return {x:minX,y:minY,w:Math.max(1,maxX-minX+1),h:Math.max(1,maxY-minY+1)};
}

function splitRegionByGutters(mask,width,height,region,boxes,depth){
if(depth>8||boxes.length>=24){
boxes.push(trimRegionToInk(mask,width,height,region,3));
return;
}
if(region.w<width*0.09||region.h<height*0.06){
boxes.push(trimRegionToInk(mask,width,height,region,3));
return;
}
var vertical=findGutterBand(mask,width,region,'x');
var horizontal=findGutterBand(mask,width,region,'y');
var bestAxis=null;
var bestBand=null;
if(vertical&&horizontal){
var vSize=vertical.end-vertical.start+1;
var hSize=horizontal.end-horizontal.start+1;
bestAxis=vSize>=hSize?'x':'y';
bestBand=bestAxis==='x'?vertical:horizontal;
}else if(vertical){
bestAxis='x';
bestBand=vertical;
}else if(horizontal){
bestAxis='y';
bestBand=horizontal;
}
if(!bestBand){
boxes.push(trimRegionToInk(mask,width,height,region,3));
return;
}
var before,after;
if(bestAxis==='x'){
before={x:region.x,y:region.y,w:bestBand.start-region.x,h:region.h};
after={x:bestBand.end+1,y:region.y,w:region.x+region.w-bestBand.end-1,h:region.h};
}else{
before={x:region.x,y:region.y,w:region.w,h:bestBand.start-region.y};
after={x:region.x,y:bestBand.end+1,w:region.w,h:region.y+region.h-bestBand.end-1};
}
var minArea=width*height*0.006;
if(before.w*before.h<minArea||after.w*after.h<minArea){
boxes.push(trimRegionToInk(mask,width,height,region,3));
return;
}
splitRegionByGutters(mask,width,height,before,boxes,depth+1);
splitRegionByGutters(mask,width,height,after,boxes,depth+1);
}

function splitRegionByWhiteGutters(whiteMask,width,height,region,boxes,depth){
if(depth>8||boxes.length>=24){
boxes.push({x:region.x,y:region.y,w:region.w,h:region.h,area:region.w*region.h,source:'gutter-split'});
return;
}
if(region.w<width*0.09||region.h<height*0.06){
boxes.push({x:region.x,y:region.y,w:region.w,h:region.h,area:region.w*region.h,source:'gutter-split'});
return;
}
var vertical=findWhiteGutterBand(whiteMask,width,region,'x');
var horizontal=findWhiteGutterBand(whiteMask,width,region,'y');
var bestAxis=null;
var bestBand=null;
if(vertical&&horizontal){
var vSize=vertical.end-vertical.start+1;
var hSize=horizontal.end-horizontal.start+1;
bestAxis=vSize>=hSize?'x':'y';
bestBand=bestAxis==='x'?vertical:horizontal;
}else if(vertical){
bestAxis='x';
bestBand=vertical;
}else if(horizontal){
bestAxis='y';
bestBand=horizontal;
}
if(!bestBand){
boxes.push({x:region.x,y:region.y,w:region.w,h:region.h,area:region.w*region.h,source:'gutter-split'});
return;
}
var before,after;
if(bestAxis==='x'){
before={x:region.x,y:region.y,w:bestBand.start-region.x,h:region.h};
after={x:bestBand.end+1,y:region.y,w:region.x+region.w-bestBand.end-1,h:region.h};
}else{
before={x:region.x,y:region.y,w:region.w,h:bestBand.start-region.y};
after={x:region.x,y:bestBand.end+1,w:region.w,h:region.y+region.h-bestBand.end-1};
}
var minArea=width*height*0.01;
if(before.w*before.h<minArea||after.w*after.h<minArea){
boxes.push({x:region.x,y:region.y,w:region.w,h:region.h,area:region.w*region.h,source:'gutter-split'});
return;
}
splitRegionByWhiteGutters(whiteMask,width,height,before,boxes,depth+1);
splitRegionByWhiteGutters(whiteMask,width,height,after,boxes,depth+1);
}

function splitRegionByLowInkGutters(mask,width,height,region,boxes,depth){
if(depth>8||boxes.length>=24){
boxes.push({x:region.x,y:region.y,w:region.w,h:region.h,area:region.w*region.h,source:'gutter-split'});
return;
}
if(region.w<width*0.09||region.h<height*0.06){
boxes.push({x:region.x,y:region.y,w:region.w,h:region.h,area:region.w*region.h,source:'gutter-split'});
return;
}
var vertical=findLowInkGutterBand(mask,width,region,'x');
var horizontal=findLowInkGutterBand(mask,width,region,'y');
var bestAxis=null;
var bestBand=null;
if(vertical&&horizontal){
var vSize=vertical.end-vertical.start+1;
var hSize=horizontal.end-horizontal.start+1;
bestAxis=vSize>=hSize?'x':'y';
bestBand=bestAxis==='x'?vertical:horizontal;
}else if(vertical){
bestAxis='x';
bestBand=vertical;
}else if(horizontal){
bestAxis='y';
bestBand=horizontal;
}
if(!bestBand){
boxes.push({x:region.x,y:region.y,w:region.w,h:region.h,area:region.w*region.h,source:'gutter-split'});
return;
}
var before,after;
if(bestAxis==='x'){
before={x:region.x,y:region.y,w:bestBand.start-region.x,h:region.h};
after={x:bestBand.end+1,y:region.y,w:region.x+region.w-bestBand.end-1,h:region.h};
}else{
before={x:region.x,y:region.y,w:region.w,h:bestBand.start-region.y};
after={x:region.x,y:bestBand.end+1,w:region.w,h:region.y+region.h-bestBand.end-1};
}
var minArea=width*height*0.01;
if(before.w*before.h<minArea||after.w*after.h<minArea){
boxes.push({x:region.x,y:region.y,w:region.w,h:region.h,area:region.w*region.h,source:'gutter-split'});
return;
}
splitRegionByLowInkGutters(mask,width,height,before,boxes,depth+1);
splitRegionByLowInkGutters(mask,width,height,after,boxes,depth+1);
}

function detectWhiteGutterBoxes(whiteMask,frameLineMask,contentBox,width,height){
var boxes=[];
var margin=Math.max(2,Math.round(Math.min(width,height)*0.006));
var region={
x:clamp((contentBox?contentBox.x:margin)+margin,0,width-1),
y:clamp((contentBox?contentBox.y:margin)+margin,0,height-1),
w:Math.max(1,(contentBox?contentBox.w:width-margin*2)-margin*2),
h:Math.max(1,(contentBox?contentBox.h:height-margin*2)-margin*2)
};
splitRegionByWhiteGutters(whiteMask,width,height,region,boxes,0);
if(frameLineMask)splitRegionByLowInkGutters(frameLineMask,width,height,region,boxes,0);
var pageArea=width*height;
boxes=boxes.filter(function(box){
var area=boxArea(box);
return area>=pageArea*0.012&&area<=pageArea*0.88&&box.w>=width*0.055&&box.h>=height*0.045;
});
return removeNestedAndPageBox(dedupePanelBoxes(boxes,width,height),width,height);
}

function detectGutterBoxes(mask,width,height){
var boxes=[];
var margin=Math.max(2,Math.round(Math.min(width,height)*0.015));
splitRegionByGutters(mask,width,height,{
x:margin,
y:margin,
w:width-margin*2,
h:height-margin*2
},boxes,0);
var pageArea=width*height;
boxes=boxes.filter(function(box){
var area=box.w*box.h;
return area>=pageArea*0.006&&area<=pageArea*0.88&&box.w>=width*0.06&&box.h>=height*0.045;
});
boxes=removeNestedAndPageBox(mergeBoxes(boxes,width,height),width,height);
boxes.forEach(function(box){if(!box.source)box.source='gutter-split';});
return boxes;
}

function overlapLength(a1,a2,b1,b2){
return Math.max(0,Math.min(a2,b2)-Math.max(a1,b1));
}

function findHorizontalSegments(mask,width,height){
var minRun=Math.max(32,Math.round(width*0.075));
var maxGap=Math.max(3,Math.round(width*0.006));
var maxThickness=Math.max(4,Math.round(Math.min(28,height*0.024)));
var rows=[];
for(var y=0;y<height;y++){
var start=-1;
var lastInk=-1;
var gap=0;
for(var x=0;x<width;x++){
if(mask[y*width+x]){
if(start<0)start=x;
lastInk=x;
gap=0;
}else if(start>=0){
gap++;
if(gap>maxGap){
var end=lastInk;
if(end-start+1>=minRun)rows.push({x1:start,x2:end,y1:y,y2:y});
start=-1;
lastInk=-1;
gap=0;
}
}
}
if(start>=0&&lastInk-start+1>=minRun)rows.push({x1:start,x2:lastInk,y1:y,y2:y});
}
return groupLineSegments(rows,'h',maxThickness,width,height);
}

function findVerticalSegments(mask,width,height){
var minRun=Math.max(32,Math.round(height*0.055));
var maxGap=Math.max(3,Math.round(height*0.006));
var maxThickness=Math.max(4,Math.round(Math.min(28,width*0.024)));
var cols=[];
for(var x=0;x<width;x++){
var start=-1;
var lastInk=-1;
var gap=0;
for(var y=0;y<height;y++){
if(mask[y*width+x]){
if(start<0)start=y;
lastInk=y;
gap=0;
}else if(start>=0){
gap++;
if(gap>maxGap){
var end=lastInk;
if(end-start+1>=minRun)cols.push({x1:x,x2:x,y1:start,y2:end});
start=-1;
lastInk=-1;
gap=0;
}
}
}
if(start>=0&&lastInk-start+1>=minRun)cols.push({x1:x,x2:x,y1:start,y2:lastInk});
}
return groupLineSegments(cols,'v',maxThickness,width,height);
}

function groupLineSegments(segments,axis,maxThickness,width,height){
var groups=[];
var tolerance=Math.max(6,Math.round(Math.min(width,height)*0.012));
segments.forEach(function(segment){
var target=null;
for(var i=0;i<groups.length;i++){
var group=groups[i];
if(axis==='h'){
var near=segment.y1<=group.y2+1;
var edgeClose=Math.abs(segment.x1-group.x1)<=tolerance&&Math.abs(segment.x2-group.x2)<=tolerance;
if(near&&edgeClose){target=group;break;}
}else{
var nearX=segment.x1<=group.x2+1;
var edgeCloseY=Math.abs(segment.y1-group.y1)<=tolerance&&Math.abs(segment.y2-group.y2)<=tolerance;
if(nearX&&edgeCloseY){target=group;break;}
}
}
if(target){
target.x1=Math.min(target.x1,segment.x1);
target.y1=Math.min(target.y1,segment.y1);
target.x2=Math.max(target.x2,segment.x2);
target.y2=Math.max(target.y2,segment.y2);
}else{
groups.push({x1:segment.x1,y1:segment.y1,x2:segment.x2,y2:segment.y2});
}
});
return groups.filter(function(group){
var thickness=axis==='h'?(group.y2-group.y1+1):(group.x2-group.x1+1);
var length=axis==='h'?(group.x2-group.x1+1):(group.y2-group.y1+1);
return thickness<=maxThickness&&length>=Math.max(24,(axis==='h'?width:height)*0.045);
}).map(function(group){
group.cx=(group.x1+group.x2)/2;
group.cy=(group.y1+group.y2)/2;
return group;
});
}

function detectFrameBoxes(mask,width,height){
var horizontals=limitFrameLineSegments(findHorizontalSegments(mask,width,height),'h',64);
var verticals=limitFrameLineSegments(findVerticalSegments(mask,width,height),'v',64);
var tol=Math.max(8,Math.round(Math.min(width,height)*0.02));
var minW=Math.max(36,width*0.055);
var minH=Math.max(36,height*0.045);
var candidates=[];
for(var ti=0;ti<horizontals.length;ti++){
var top=horizontals[ti];
for(var bi=0;bi<horizontals.length;bi++){
var bottom=horizontals[bi];
if(bottom.cy<=top.cy+minH)continue;
var overlap=overlapLength(top.x1,top.x2,bottom.x1,bottom.x2);
if(overlap<minW)continue;
var expectedLeft=Math.max(top.x1,bottom.x1);
var expectedRight=Math.min(top.x2,bottom.x2);
if(expectedRight<=expectedLeft+minW)continue;
var left=null;
var right=null;
var leftDistance=Infinity;
var rightDistance=Infinity;
for(var vi=0;vi<verticals.length;vi++){
var vertical=verticals[vi];
if(vertical.y1>top.cy+tol||vertical.y2<bottom.cy-tol)continue;
var dl=Math.abs(vertical.cx-expectedLeft);
var dr=Math.abs(vertical.cx-expectedRight);
if(dl<=tol*2&&dl<leftDistance){
left=vertical;
leftDistance=dl;
}
if(dr<=tol*2&&dr<rightDistance){
right=vertical;
rightDistance=dr;
}
}
if(!left||!right||right.cx<=left.cx+minW)continue;
var box=inflateBox({
x:Math.round(left.cx),
y:Math.round(top.cy),
w:Math.round(right.cx-left.cx),
h:Math.round(bottom.cy-top.cy),
area:Math.round((right.cx-left.cx)*(bottom.cy-top.cy)),
source:'frame-lines'
},Math.max(2,Math.round(Math.min(width,height)*0.004)),width,height);
if(box.w>=minW&&box.h>=minH)candidates.push(box);
}
}
if(!candidates.length)return [];
candidates.sort(function(a,b){return boxArea(a)-boxArea(b);});
var kept=[];
for(var k=0;k<candidates.length;k++){
var duplicate=false;
for(var m=0;m<kept.length;m++){
if(boxIou(candidates[k],kept[m])>0.82){duplicate=true;break;}
}
if(!duplicate)kept.push(candidates[k]);
}
kept=kept.filter(function(box,index){
var contained=0;
for(var i=0;i<kept.length;i++){
if(i===index)continue;
var other=kept[i];
var inside=other.x>=box.x&&other.y>=box.y&&boxRight(other)<=boxRight(box)&&boxBottom(other)<=boxBottom(box);
if(inside&&boxArea(other)<boxArea(box)*0.72)contained++;
}
return contained<2;
});
return sortBoxesForReading(removeNestedAndPageBox(kept,width,height)).slice(0,24);
}

function separatorBalance(region,axis,pos){
var before=axis==='x'?pos-region.x:pos-region.y;
var after=axis==='x'?region.x+region.w-pos:region.y+region.h-pos;
if(before<=0||after<=0)return 0;
return Math.min(before,after)/Math.max(before,after);
}

function addProjectionSeparatorCandidates(mask,width,height,region,candidates){
if(!mask)return;
['x','y'].forEach(function(axis){
var size=axis==='x'?region.w:region.h;
var cross=axis==='x'?region.h:region.w;
var start=axis==='x'?region.x:region.y;
var edge=Math.max(5,Math.round(size*0.035));
var scans=[];
for(var scan=start+edge;scan<start+size-edge;scan++){
scans.push({pos:scan,count:lineInkCount(mask,width,region,axis,scan)});
}
if(!scans.length)return;
var counts=scans.map(function(item){return item.count;});
var peak=quantile(counts,0.94);
var minHits=Math.max(Math.round(cross*0.18),Math.round(peak*0.70),12);
var maxThickness=Math.max(4,Math.round(size*0.035));
var current=null;
for(var i=0;i<scans.length;i++){
var strong=scans[i].count>=minHits;
if(strong&&!current){
current={start:scans[i].pos,end:scans[i].pos,best:scans[i].count,bestPos:scans[i].pos,gap:0};
}else if(strong&&current){
current.end=scans[i].pos;
current.gap=0;
if(scans[i].count>current.best){
current.best=scans[i].count;
current.bestPos=scans[i].pos;
}
}else if(current){
current.gap++;
if(current.gap>2){
var thickness=current.end-current.start+1;
var balance=separatorBalance(region,axis,current.bestPos);
if(thickness<=maxThickness&&balance>=0.14){
candidates.push({
axis:axis,
pos:current.bestPos,
thickness:thickness,
score:(current.best/Math.max(1,cross))*135+balance*45,
line:null,
projection:true
});
}
current=null;
}
}
}
if(current){
var finalThickness=current.end-current.start+1;
var finalBalance=separatorBalance(region,axis,current.bestPos);
if(finalThickness<=maxThickness&&finalBalance>=0.14){
candidates.push({
axis:axis,
pos:current.bestPos,
thickness:finalThickness,
score:(current.best/Math.max(1,cross))*135+finalBalance*45,
line:null,
projection:true
});
}
}
});
}

function splitRegionByFrameSeparators(mask,horizontals,verticals,width,height,region,boxes,depth,useProjection){
if(depth>8||boxes.length>=24||region.w<width*0.10||region.h<height*0.07){
boxes.push({x:region.x,y:region.y,w:region.w,h:region.h,area:boxArea(region),source:'frame-separator'});
return;
}
var minChildW=Math.max(24,Math.round(width*0.055));
var minChildH=Math.max(24,Math.round(height*0.045));
var edgePad=Math.max(6,Math.round(Math.min(region.w,region.h)*0.035));
var candidates=[];
horizontals.forEach(function(line){
var y=Math.round(line.cy);
if(y<=region.y+Math.max(edgePad,minChildH)||y>=region.y+region.h-Math.max(edgePad,minChildH))return;
var overlap=overlapLength(line.x1,line.x2,region.x,region.x+region.w);
var coverage=overlap/Math.max(1,region.w);
if(coverage<0.50)return;
var balance=separatorBalance(region,'y',y);
if(balance<0.14)return;
candidates.push({
axis:'y',
pos:y,
thickness:Math.max(1,line.y2-line.y1+1),
score:coverage*100+(overlap/Math.max(1,width))*30+balance*35,
line:line
});
});
verticals.forEach(function(line){
var x=Math.round(line.cx);
if(x<=region.x+Math.max(edgePad,minChildW)||x>=region.x+region.w-Math.max(edgePad,minChildW))return;
var overlap=overlapLength(line.y1,line.y2,region.y,region.y+region.h);
var coverage=overlap/Math.max(1,region.h);
if(coverage<0.50)return;
var balance=separatorBalance(region,'x',x);
if(balance<0.14)return;
candidates.push({
axis:'x',
pos:x,
thickness:Math.max(1,line.x2-line.x1+1),
score:coverage*100+(overlap/Math.max(1,height))*30+balance*35,
line:line
});
});
if(useProjection)addProjectionSeparatorCandidates(mask,width,height,region,candidates);
if(!candidates.length){
boxes.push({x:region.x,y:region.y,w:region.w,h:region.h,area:boxArea(region),source:'frame-separator'});
return;
}
candidates.sort(function(a,b){return b.score-a.score;});
var split=candidates[0];
var gap=Math.max(2,Math.round(Math.max(split.thickness,Math.min(width,height)*0.004)));
var before,after;
if(split.axis==='x'){
before={x:region.x,y:region.y,w:split.pos-gap-region.x,h:region.h};
after={x:split.pos+gap,y:region.y,w:region.x+region.w-split.pos-gap,h:region.h};
}else{
before={x:region.x,y:region.y,w:region.w,h:split.pos-gap-region.y};
after={x:region.x,y:split.pos+gap,w:region.w,h:region.y+region.h-split.pos-gap};
}
var minArea=width*height*0.012;
if(before.w*before.h<minArea||after.w*after.h<minArea){
boxes.push({x:region.x,y:region.y,w:region.w,h:region.h,area:boxArea(region),source:'frame-separator'});
return;
}
splitRegionByFrameSeparators(mask,horizontals,verticals,width,height,before,boxes,depth+1,useProjection);
splitRegionByFrameSeparators(mask,horizontals,verticals,width,height,after,boxes,depth+1,useProjection);
}

function detectSeparatorBoxes(mask,contentBox,width,height){
var horizontals=limitFrameLineSegments(findHorizontalSegments(mask,width,height),'h',96);
var verticals=limitFrameLineSegments(findVerticalSegments(mask,width,height),'v',96);
var margin=Math.max(2,Math.round(Math.min(width,height)*0.006));
var base=contentBox||{x:margin,y:margin,w:width-margin*2,h:height-margin*2};
var region={
x:clamp(base.x+margin,0,width-1),
y:clamp(base.y+margin,0,height-1),
w:Math.max(1,base.w-margin*2),
h:Math.max(1,base.h-margin*2)
};
var boxes=[];
splitRegionByFrameSeparators(mask,horizontals,verticals,width,height,region,boxes,0,false);
var structuralBoxes=filterSeparatorBoxes(boxes,mask,width,height,region);
if(structuralBoxes.length>=2)return structuralBoxes;
boxes=[];
splitRegionByFrameSeparators(mask,horizontals,verticals,width,height,region,boxes,0,true);
return filterSeparatorBoxes(boxes,mask,width,height,region);
}

function filterSeparatorBoxes(boxes,mask,width,height,region){
var pageArea=width*height;
boxes=boxes.filter(function(box){
var area=boxArea(box);
return area>=pageArea*0.012&&area<=pageArea*0.88&&box.w>=width*0.12&&box.h>=height*0.045;
});
boxes=dedupePanelBoxes(boxes,width,height);
boxes=removeNestedAndPageBox(boxes,width,height).filter(function(box){
var area=boxArea(box);
if(area<pageArea*0.05&&maskInkRatio(mask,width,box)<0.012)return false;
return edgeInkRatio(mask,width,height,box,3)>=0.028||area>=pageArea*0.10;
});
if(boxes.length<2)return [];
var coverage=boxes.reduce(function(sum,box){return sum+boxArea(box);},0)/Math.max(1,boxArea(region));
if(coverage<0.18)return [];
var largePanels=boxes.filter(function(box){return boxArea(box)>=pageArea*0.08;}).length;
if(largePanels<2)return [];
var smallPanels=boxes.filter(function(box){return boxArea(box)<pageArea*0.04;}).length;
if(boxes.length>6&&smallPanels>1)return [];
return sortBoxesForReading(boxes).slice(0,24);
}

function detectOpenFrameBoxes(mask,width,height){
var horizontals=limitFrameLineSegments(findHorizontalSegments(mask,width,height),'h',64);
var verticals=limitFrameLineSegments(findVerticalSegments(mask,width,height),'v',64);
var obstacleBoxes=detectForegroundObstacleBoxes(mask,width,height);
var tol=Math.max(10,Math.round(Math.min(width,height)*0.025));
var minW=Math.max(48,width*0.06);
var minH=Math.max(48,height*0.05);
var candidates=[];
for(var i=0;i<horizontals.length;i++){
var top=horizontals[i];
for(var j=0;j<horizontals.length;j++){
var bottom=horizontals[j];
var h=bottom.cy-top.cy;
if(h<minH)continue;
var overlap=overlapLength(top.x1,top.x2,bottom.x1,bottom.x2);
var span=Math.min(top.x2-top.x1,bottom.x2-bottom.x1);
if(overlap<Math.max(minW,span*0.55))continue;
var x1=Math.max(top.x1,bottom.x1);
var x2=Math.min(top.x2,bottom.x2);
if(x2-x1<minW)continue;
var leftHits=verticals.filter(function(v){
return Math.abs(v.cx-x1)<=tol&&v.y1<=top.cy+tol&&v.y2>=bottom.cy-tol;
}).length;
var rightHits=verticals.filter(function(v){
return Math.abs(v.cx-x2)<=tol&&v.y1<=top.cy+tol&&v.y2>=bottom.cy-tol;
}).length;
var edgeBonus=leftHits+rightHits;
if(edgeBonus<1)continue;
var box=inflateBox({
x:Math.round(x1),
y:Math.round(top.cy),
w:Math.round(x2-x1),
h:Math.round(h),
area:Math.round((x2-x1)*h),
edgeBonus:edgeBonus,
source:'open-frame-lines'
},Math.max(2,Math.round(Math.min(width,height)*0.004)),width,height);
var aspect=box.w/Math.max(1,box.h);
var insideObstacle=obstacleBoxes.some(function(obstacle){
return intersectionArea(box,obstacle)/Math.max(1,boxArea(box))>0.82;
});
if(!insideObstacle&&box.w>=minW&&box.h>=minH&&box.h<=height*0.55&&box.w<=width*0.58&&aspect>=0.32&&aspect<=4.8)candidates.push(box);
}
}
if(!candidates.length)return [];
candidates.sort(function(a,b){
var scoreA=(a.edgeBonus||0)+(boxArea(a)>width*height*0.035?1:0);
var scoreB=(b.edgeBonus||0)+(boxArea(b)>width*height*0.035?1:0);
if(scoreB!==scoreA)return scoreB-scoreA;
return boxArea(a)-boxArea(b);
});
var kept=[];
for(var k=0;k<candidates.length;k++){
var areaK=boxArea(candidates[k]);
var duplicate=false;
for(var m=0;m<kept.length;m++){
var areaM=boxArea(kept[m]);
var intersection=intersectionArea(candidates[k],kept[m]);
var coversSmaller=intersection/Math.max(1,Math.min(areaK,areaM));
if(boxIou(candidates[k],kept[m])>0.45||coversSmaller>0.82){duplicate=true;break;}
}
if(!duplicate)kept.push(candidates[k]);
}
kept=removeNestedAndPageBox(kept,width,height).filter(function(box){
var area=boxArea(box);
return area>=width*height*0.018&&area<=width*height*0.28;
});
return sortBoxesForReading(kept).slice(0,24);
}

function limitFrameLineSegments(segments,axis,maxCount){
if(segments.length<=maxCount)return segments;
return segments.slice().sort(function(a,b){
var lenA=axis==='h'?a.x2-a.x1:a.y2-a.y1;
var lenB=axis==='h'?b.x2-b.x1:b.y2-b.y1;
return lenB-lenA;
}).slice(0,maxCount);
}

function mapAnalysisBoxToOriginal(box,index,analysisScale,originalW,originalH,source){
var scaleBack=1/analysisScale;
var mapped={
index:index+1,
x:Math.round(box.x*scaleBack),
y:Math.round(box.y*scaleBack),
w:Math.round(box.w*scaleBack),
h:Math.round(box.h*scaleBack),
source:source||box.source||'connected-components'
};
mapped.x=clamp(mapped.x,0,originalW-1);
mapped.y=clamp(mapped.y,0,originalH-1);
mapped.w=clamp(mapped.w,1,originalW-mapped.x);
mapped.h=clamp(mapped.h,1,originalH-mapped.y);
return mapped;
}

function detectCharacterPlaceholders(rawMask,width,height,panelBoxes){
if(!panelBoxes||panelBoxes.length<2)return [];
var pageArea=width*height;
var foreground=dilateMask(rawMask,width,height,3);
var minArea=Math.max(36,Math.round(pageArea*0.01));
var components=findConnectedBoxes(foreground,width,height,minArea);
var pad=Math.max(4,Math.round(Math.min(width,height)*0.012));
var candidates=[];
for(var i=0;i<components.length;i++){
var component=inflateBox(components[i],pad,width,height);
var boundsArea=boxArea(component);
var inkArea=components[i].area||boundsArea;
var density=inkArea/Math.max(1,boundsArea);
if(boundsArea<pageArea*0.025)continue;
if(inkArea<pageArea*0.008)continue;
if(density<0.014)continue;
if(component.w>width*0.9&&component.h>height*0.9)continue;
var panelHits=0;
var bestIou=0;
for(var j=0;j<panelBoxes.length;j++){
var panel=panelBoxes[j];
var hit=intersectionArea(component,panel);
var panelArea=boxArea(panel);
if(hit>Math.min(boundsArea,panelArea)*0.1||hit>boundsArea*0.12)panelHits++;
bestIou=Math.max(bestIou,boxIou(component,panel));
}
var tall=component.h>=height*0.28&&component.h>=component.w*0.95;
var clearForeground=component.h>=height*0.42&&component.w<=width*0.72;
var crossesPanels=panelHits>=2;
if((crossesPanels||clearForeground)&&tall&&bestIou<0.78){
candidates.push({
x:component.x,
y:component.y,
w:component.w,
h:component.h,
area:inkArea,
panelHits:panelHits,
density:density,
source:'character-placeholder'
});
}
}
if(!candidates.length)return [];
candidates=mergeBoxes(candidates,width,height).filter(function(box){
var area=boxArea(box);
if(area<pageArea*0.025||area>pageArea*0.65)return false;
if(box.h<height*0.24)return false;
if(box.w>width*0.85&&box.h>height*0.65)return false;
return true;
});
candidates.sort(function(a,b){return boxArea(b)-boxArea(a);});
return sortBoxesForReading(candidates.slice(0,3));
}

function analyzeMangaTemplate(image){
var threshold=getNumber('mangaImportPanelThreshold',245,210,255);
var minPercent=getNumber('mangaImportMinPanelArea',1.2,0.2,8);
var analysis=getAnalysisCanvas(image,1100);
var imageData=analysis.ctx.getImageData(0,0,analysis.width,analysis.height);
var rawMask=buildInkMask(imageData,analysis.width,analysis.height,threshold);
var whiteMask=buildWhiteMask(imageData,analysis.width,analysis.height,threshold);
var frameLineMask=buildFrameLineMask(imageData,analysis.width,analysis.height);
var contentBox=findContentBox(rawMask,analysis.width,analysis.height);
var foregroundObstacles=detectForegroundObstacleBoxes(rawMask,analysis.width,analysis.height);
var splitMask=eraseForegroundObstaclesFromMask(rawMask,analysis.width,analysis.height,foregroundObstacles);
var frameBoxes=detectFrameBoxes(frameLineMask,analysis.width,analysis.height);
var separatorBoxes=detectSeparatorBoxes(frameLineMask,contentBox,analysis.width,analysis.height);
var openFrameBoxes=detectOpenFrameBoxes(frameLineMask,analysis.width,analysis.height);
var gutterBoxes=detectWhiteGutterBoxes(whiteMask,frameLineMask,contentBox,analysis.width,analysis.height).concat(detectGutterBoxes(splitMask,analysis.width,analysis.height));
var mask=splitMask;
mask=dilateMask(mask,analysis.width,analysis.height,2);
var minArea=Math.max(24,Math.round(analysis.width*analysis.height*(minPercent/100)));
var connectedBoxes=findConnectedBoxes(mask,analysis.width,analysis.height,minArea);
connectedBoxes=mergeBoxes(connectedBoxes,analysis.width,analysis.height);
connectedBoxes=removeNestedAndPageBox(connectedBoxes,analysis.width,analysis.height);
connectedBoxes.forEach(function(box){if(!box.source)box.source='connected-components';});
var boxes=refineDetectedPanels({
frameBoxes:frameBoxes,
separatorBoxes:separatorBoxes,
openFrameBoxes:openFrameBoxes,
gutterBoxes:gutterBoxes,
connectedBoxes:connectedBoxes,
frameLineMask:frameLineMask
},rawMask,analysis.width,analysis.height,contentBox);
boxes=sortBoxesForReading(boxes).slice(0,24);
var placeholderBoxes=detectCharacterPlaceholders(rawMask,analysis.width,analysis.height,boxes);
if(!placeholderBoxes.length)placeholderBoxes=foregroundObstacles.filter(function(box){
var hits=0;
for(var i=0;i<boxes.length;i++){
if(intersectionArea(box,boxes[i])>Math.min(boxArea(box),boxArea(boxes[i]))*0.08)hits++;
}
return hits>=2||box.h>=analysis.height*0.4;
}).slice(0,3);
if(!placeholderBoxes.length&&boxes.length===1){
var single=boxes[0];
var singleArea=boxArea(single);
if(singleArea>=analysis.width*analysis.height*0.55){
var candidate=detectForegroundObstacleBoxes(rawMask,analysis.width,analysis.height).filter(function(box){
return box.h>=analysis.height*0.36&&boxArea(box)>=analysis.width*analysis.height*0.08;
})[0];
if(candidate)placeholderBoxes=[candidate];
}
}
var originalW=image.naturalWidth||image.width;
var originalH=image.naturalHeight||image.height;
return {
panels:boxes.map(function(box,index){
return mapAnalysisBoxToOriginal(box,index,analysis.scale,originalW,originalH,box.source||'connected-components');
}),
placeholders:placeholderBoxes.map(function(box,index){
return mapAnalysisBoxToOriginal(box,index,analysis.scale,originalW,originalH,'character-placeholder');
})
};
}

function analyzePanels(image){
return analyzeMangaTemplate(image).panels;
}

function fitCanvasSize(width,height){
var maxCanvasSide=1600;
var minCanvasSide=320;
var scale=Math.min(1,maxCanvasSide/Math.max(width,height));
if(Math.min(width*scale,height*scale)<minCanvasSide){
scale=Math.min(maxCanvasSide/Math.max(width,height),minCanvasSide/Math.min(width,height));
}
return {
width:Math.max(1,Math.round(width*scale)),
height:Math.max(1,Math.round(height*scale)),
scale:scale
};
}

function safePanelSize(width,height){
if(typeof window!=='undefined'&&window.NovelAICompositionDirector&&typeof window.NovelAICompositionDirector.createPlan==='function'){
var plan=window.NovelAICompositionDirector.createPlan(null,{prompt:'manga panel',negative_prompt:'',width:width,height:height},'T2I');
if(plan&&plan.canvas)return {width:plan.canvas.width,height:plan.canvas.height};
}
var maxPixels=1024*1024;
var maxEdge=1536;
var aspect=(width&&height)?width/height:1;
var targetH=Math.sqrt(maxPixels/aspect);
var targetW=targetH*aspect;
if(targetW>maxEdge){
targetW=maxEdge;
targetH=targetW/aspect;
}
if(targetH>maxEdge){
targetH=maxEdge;
targetW=targetH*aspect;
}
targetW=Math.max(64,Math.min(maxEdge,Math.round(targetW/64)*64));
targetH=Math.max(64,Math.min(maxEdge,Math.round(targetH/64)*64));
while(targetW*targetH>maxPixels){
if(targetW>=targetH&&targetW>64)targetW-=64;
else if(targetH>64)targetH-=64;
else break;
}
return {width:targetW,height:targetH};
}

function getCanvasObjects(){
return (typeof canvas!=='undefined'&&canvas&&typeof canvas.getObjects==='function')?canvas.getObjects():[];
}

function getImportPanelList(){
var panels=(typeof getPanelObjectList==='function'?getPanelObjectList():getCanvasObjects()).filter(function(panel){
return panel&&(panel.mangaImportPanel||panel.isPanel)&&!panel.mangaImportTemplateLayer;
});
panels.sort(function(a,b){
return (parseInt(a.mangaImportPanelIndex,10)||0)-(parseInt(b.mangaImportPanelIndex,10)||0);
});
return panels;
}

function getImportPlaceholderList(){
return getCanvasObjects().filter(function(obj){
return obj&&(obj.mangaImportCharacterPlaceholder||obj.mangaImportCharacterReference);
}).sort(function(a,b){
return (parseInt(a.mangaImportPlaceholderIndex,10)||0)-(parseInt(b.mangaImportPlaceholderIndex,10)||0);
});
}

function getPanelSourceBox(panel){
var bounds=panel&&panel.getBoundingRect?panel.getBoundingRect(true):{width:1024,height:1024,left:0,top:0};
if(bounds&&bounds.width>0&&bounds.height>0){
return {x:bounds.left||0,y:bounds.top||0,w:bounds.width||1024,h:bounds.height||1024,source:'current-canvas-bounds'};
}
if(panel&&panel.mangaImportSourceBox)return panel.mangaImportSourceBox;
return {x:0,y:0,w:1024,h:1024,source:'fallback'};
}

function enforcePanelSafeSize(panel){
var box=getPanelSourceBox(panel);
var safe=safePanelSize(box.w||1024,box.h||1024);
panel.text2img_width=safe.width;
panel.text2img_height=safe.height;
panel.text2img_seed='-1';
if(!parseInt(panel.text2img_samplingSteps,10))panel.text2img_samplingSteps='28';
return safe;
}

function buildNaiPreflight(panels){
var items=[];
var totalPixels=0;
var maxPixels=1024*1024;
var maxEdge=1536;
panels.forEach(function(panel,index){
var safe=enforcePanelSafeSize(panel);
var pixels=safe.width*safe.height;
totalPixels+=pixels;
items.push({
index:index+1,
panelIndex:panel.mangaImportPanelIndex||index+1,
width:safe.width,
height:safe.height,
pixels:pixels,
ok:pixels<=maxPixels&&safe.width<=maxEdge&&safe.height<=maxEdge
});
});
return {
count:items.length,
samples:1,
concurrency:1,
maxPixels:maxPixels,
maxEdge:maxEdge,
items:items,
totalPixels:totalPixels,
ok:items.every(function(item){return item.ok;})
};
}

function formatPixels(value){
return Math.round(value).toLocaleString();
}

function formatNaiPreflight(preflight){
var lines=[
'NovelAI 生成前预检',
'分镜数：'+preflight.count+'，每格 samples=1，并发=1',
'单格限制：总像素 ≤ '+formatPixels(preflight.maxPixels)+'，最长边 ≤ '+preflight.maxEdge,
'尺寸按每个格子比例等比换算，不再用普通方图硬拉伸。'
];
preflight.items.slice(0,12).forEach(function(item){
lines.push('第 '+item.panelIndex+' 格：'+item.width+'×'+item.height+'，'+formatPixels(item.pixels)+' 像素'+(item.ok?'':'（超限）'));
});
if(preflight.items.length>12)lines.push('其余 '+(preflight.items.length-12)+' 格同样已检查。');
lines.push(preflight.ok?'结果：安全，可以继续。':'结果：有分镜超出安全范围，已阻止生成。');
return lines.join('\n');
}

function showNaiPreflightForCurrentPage(){
var panels=getImportPanelList();
if(!panels.length){
notify('NAI 预检','当前页没有可生成的导入分镜。',true,4200);
return null;
}
var preflight=buildNaiPreflight(panels);
var message=formatNaiPreflight(preflight);
setStatus(message,false);
notify('NAI 预检',preflight.ok?'所有分镜都在 samples=1 / ≤1024×1024 总像素线内。':'发现超限分镜，已阻止生成。',!preflight.ok,5200);
return preflight;
}

function hideImportTemplateLayers(){
getCanvasObjects().forEach(function(obj){
if(obj.mangaImportReference||obj.mangaImportTemplateLayer||obj.mangaImportCharacterReference){
obj.visible=false;
}
});
if(typeof canvas!=='undefined'&&canvas)canvas.renderAll();
}

function selectImportObject(list,cursorSetter,cursorValue,label){
if(!list.length){
notify('导入漫画','当前页没有可选的 '+label+'。',true,3600);
return null;
}
var index=cursorValue%list.length;
var obj=list[index];
obj.selectable=true;
obj.evented=true;
if(typeof canvas!=='undefined'&&canvas&&typeof canvas.setActiveObject==='function'){
canvas.setActiveObject(obj);
canvas.requestRenderAll?canvas.requestRenderAll():canvas.renderAll();
}
cursorSetter(index+1);
setStatus('已选中 '+label+' '+(index+1)+'/'+list.length+'。可以直接拖动、缩放或删除，用来修正模板。',false);
return obj;
}

function selectNextImportPanel(){
return selectImportObject(getImportPanelList(),function(value){nextPanelCursor=value;},nextPanelCursor,'分镜框');
}

function selectNextCharacterPlaceholder(){
return selectImportObject(getImportPlaceholderList(),function(value){nextPlaceholderCursor=value;},nextPlaceholderCursor,'角色参考/占位');
}

function clearCurrentPage(){
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
canvas.clear();
var bg=el('bg-color');
if(bg)canvas.backgroundColor=bg.value;
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
}

function addReferenceImage(dataUrl,width,height,keepReference){
return new Promise(function(resolve,reject){
fabric.Image.fromURL(dataUrl,function(img){
if(!img){
reject(new Error('参考图加载失败'));
return;
}
img.set({
left:0,
top:0,
scaleX:width/img.width,
scaleY:height/img.height,
selectable:false,
evented:false,
opacity:keepReference?0.22:0,
mangaImportReference:true,
name:'导入漫画参考底图'
});
setNotSave(img);
canvas.add(img);
img.sendToBack();
resolve(img);
},{crossOrigin:'anonymous'});
});
}

function createPanelFromBox(box,index,canvasScale){
var left=box.x*canvasScale;
var top=box.y*canvasScale;
var width=Math.max(12,box.w*canvasScale);
var height=Math.max(12,box.h*canvasScale);
var safe=safePanelSize(box.w,box.h);
var panel=new fabric.Polygon([
{x:0,y:0},
{x:width,y:0},
{x:width,y:height},
{x:0,y:height}
],{
left:left,
top:top,
scaleX:1,
scaleY:1,
stroke:'rgba(0,0,0,1)',
strokeWidth:Math.max(2,Math.round(Math.min(canvas.width,canvas.height)/420)),
fill:'rgba(255,255,255,0.18)',
selectable:true,
evented:true,
hasControls:true,
lockMovementX:false,
lockMovementY:false,
lockRotation:false,
lockScalingX:false,
lockScalingY:false,
objectCaching:false,
cornerStyle:'rect',
controls:fabric.Object.prototype.controls,
isPanel:true,
mangaImportPanel:true,
mangaImportPanelIndex:index,
mangaImportSourceBox:box,
name:'导入分镜'+index
});
panel.perPixelTargetFind=true;
if(typeof setText2ImageInitPrompt==='function')setText2ImageInitPrompt(panel);
panel.text2img_width=safe.width;
panel.text2img_height=safe.height;
panel.text2img_seed='-1';
panel.text2img_samplingSteps='28';
panel.text2img_prompt=buildFallbackPrompt([],box,index);
panel.text2img_negative=getDefaultNegativePrompt();
canvas.add(panel);
if(typeof getGUID==='function')getGUID(panel);
if(typeof saveInitialState==='function')saveInitialState(panel);
return panel;
}

function createCharacterPlaceholderPath(width,height){
function p(value){return Math.round(value*100)/100;}
var w=Math.max(12,width);
var h=Math.max(24,height);
var cx=w*0.5;
return [
'M',p(cx),p(h*0.035),
'C',p(w*0.34),p(h*0.035),p(w*0.26),p(h*0.125),p(w*0.285),p(h*0.235),
'C',p(w*0.18),p(h*0.275),p(w*0.12),p(h*0.405),p(w*0.175),p(h*0.53),
'C',p(w*0.115),p(h*0.655),p(w*0.105),p(h*0.845),p(w*0.205),p(h*0.965),
'L',p(w*0.795),p(h*0.965),
'C',p(w*0.895),p(h*0.845),p(w*0.885),p(h*0.655),p(w*0.825),p(h*0.53),
'C',p(w*0.88),p(h*0.405),p(w*0.82),p(h*0.275),p(w*0.715),p(h*0.235),
'C',p(w*0.74),p(h*0.125),p(w*0.66),p(h*0.035),p(cx),p(h*0.035),
'Z',
'M',p(w*0.34),p(h*0.255),
'C',p(w*0.41),p(h*0.34),p(w*0.59),p(h*0.34),p(w*0.66),p(h*0.255),
'M',p(w*0.39),p(h*0.48),
'C',p(w*0.44),p(h*0.43),p(w*0.56),p(h*0.43),p(w*0.61),p(h*0.48)
].join(' ');
}

function createCharacterPlaceholder(box,index,canvasScale){
var left=box.x*canvasScale;
var top=box.y*canvasScale;
var width=Math.max(28,box.w*canvasScale);
var height=Math.max(48,box.h*canvasScale);
var strokeWidth=Math.max(2,Math.round(Math.min(width,height)/80));
var placeholder=new fabric.Path(createCharacterPlaceholderPath(width,height),{
left:left,
top:top,
fill:'rgba(90,170,255,0.18)',
stroke:'rgba(78,183,255,0.92)',
strokeWidth:strokeWidth,
strokeDashArray:[Math.max(6,strokeWidth*3),Math.max(4,strokeWidth*2)],
selectable:true,
hasControls:true,
lockMovementX:false,
lockMovementY:false,
lockRotation:false,
lockScalingX:false,
lockScalingY:false,
objectCaching:false,
cornerStyle:'rect',
controls:fabric.Object.prototype.controls,
mangaImportCharacterPlaceholder:true,
mangaImportTemplateLayer:true,
mangaImportPlaceholderBounds:{x:left,y:top,w:width,h:height},
mangaImportSourceBox:box,
name:'通用角色立绘占位'+index
});
placeholder.mangaImportPlaceholderIndex=index;
canvas.add(placeholder);
if(typeof getGUID==='function')getGUID(placeholder);
if(typeof saveInitialState==='function')saveInitialState(placeholder);
return placeholder;
}

function cropBoxDataUrl(image,box,maxSide){
var cropScale=Math.min(1,(maxSide||768)/Math.max(box.w,box.h));
var c=document.createElement('canvas');
var ctx=c.getContext('2d');
c.width=Math.max(1,Math.round(box.w*cropScale));
c.height=Math.max(1,Math.round(box.h*cropScale));
ctx.drawImage(image,box.x,box.y,box.w,box.h,0,0,c.width,c.height);
return c.toDataURL('image/png');
}

function addCharacterReferenceImage(dataUrl,box,index,canvasScale){
return new Promise(function(resolve,reject){
fabric.Image.fromURL(dataUrl,function(img){
if(!img){
reject(new Error('character reference image failed to load'));
return;
}
var left=box.x*canvasScale;
var top=box.y*canvasScale;
var width=Math.max(28,box.w*canvasScale);
var height=Math.max(48,box.h*canvasScale);
img.set({
left:left,
top:top,
scaleX:width/img.width,
scaleY:height/img.height,
opacity:0.34,
selectable:true,
evented:true,
hasControls:true,
lockMovementX:false,
lockMovementY:false,
lockRotation:false,
lockScalingX:false,
lockScalingY:false,
objectCaching:false,
cornerStyle:'rect',
controls:fabric.Object.prototype.controls,
mangaImportCharacterReference:true,
mangaImportTemplateLayer:true,
mangaImportPlaceholderIndex:index,
mangaImportSourceBox:box,
name:'character reference cutout '+index
});
canvas.add(img);
if(typeof getGUID==='function')getGUID(img);
if(typeof saveInitialState==='function')saveInitialState(img);
resolve(img);
},{crossOrigin:'anonymous'});
});
}

function capturePanelDataUrl(panel){
if(!panel||!canvas||typeof canvas.toDataURL!=='function')return '';
var bounds=panel.getBoundingRect?panel.getBoundingRect(true):null;
if(!bounds||bounds.width<=0||bounds.height<=0)return '';
try{
return canvas.toDataURL({
format:'png',
left:Math.max(0,bounds.left),
top:Math.max(0,bounds.top),
width:Math.max(1,bounds.width),
height:Math.max(1,bounds.height),
multiplier:1
});
}catch(error){
return '';
}
}

function extractTagsFromResponse(json){
if(!json)return [];
if(Array.isArray(json.tags))return json.tags.map(textOf);
if(Array.isArray(json.result))return json.result.map(function(item){
return typeof item==='string'?item:(item&&item.tag)||'';
});
if(Array.isArray(json.caption))return json.caption.map(textOf);
if(json.tags&&typeof json.tags==='object'){
return Object.keys(json.tags).filter(function(tag){
var score=parseFloat(json.tags[tag]);
return !isFinite(score)||score>=getNumber('mangaImportTaggerThreshold',0.35,0.05,0.95);
});
}
if(json.caption||json.prompt){
return textOf(json.caption||json.prompt).split(/[,，\n]/);
}
if(json.data)return extractTagsFromResponse(json.data);
return [];
}

function normalizeTags(tags){
var seen={};
var result=[];
tags.forEach(function(tag){
tag=textOf(tag).trim().replace(/^#/, '').replace(/\s+/g,' ');
if(!tag)return;
tag=tag.replace(/_/g,' ');
var key=tag.toLowerCase();
if(seen[key])return;
seen[key]=true;
result.push(tag);
});
return result.slice(0,42);
}

function getTaggerProxyUrl(){
if(window.location&&window.location.protocol==='file:')return 'http://127.0.0.1:8000/tagger-proxy/interrogate';
return window.location.origin+'/tagger-proxy/interrogate';
}

async function callLocalTagger(dataUrl){
var taggerUrl=(el('mangaImportTaggerUrl')&&el('mangaImportTaggerUrl').value||'').trim();
var threshold=getNumber('mangaImportTaggerThreshold',0.35,0.05,0.95);
var body={
image:dataUrl,
threshold:threshold,
format:'danbooru',
tagger_url:taggerUrl
};
var url=isChecked('mangaImportUseTaggerProxy',true)?getTaggerProxyUrl():taggerUrl;
if(!url)throw new Error('未配置本地 Tagger 地址');
var response=await fetch(url,{
method:'POST',
headers:{'Content-Type':'application/json','Accept':'application/json'},
body:JSON.stringify(body)
});
if(!response.ok){
var text=await response.text();
throw new Error('Tagger '+response.status+': '+text.slice(0,180));
}
var json=await response.json();
return normalizeTags(extractTagsFromResponse(json));
}

function getAspectTags(box){
var aspect=box.w/Math.max(1,box.h);
if(aspect>1.55)return ['wide shot','landscape composition','manga panel','clean panel border'];
if(aspect<0.68)return ['vertical composition','portrait composition','manga panel','clean panel border'];
return ['balanced composition','manga panel','clean panel border'];
}

function getDefaultNegativePrompt(){
return 'lowres, bad anatomy, bad hands, bad fingers, extra digits, missing fingers, text, watermark, signature, logo, blurry, jpeg artifacts, cropped face, duplicate';
}

function buildFallbackPrompt(tags,box,index){
var base=[
'masterpiece',
'best quality',
'professional manga art',
'clean lineart',
'anime coloring',
'beautiful detailed eyes',
'sharp focus'
];
var panelTags=getAspectTags(box);
var imported=normalizeTags(tags||[]);
var merged=normalizeTags(base.concat(imported).concat(panelTags));
return merged.join(', ');
}

function splitPromptParts(value){
return textOf(value).split(/[,，、\n]+/).map(function(part){return part.trim();}).filter(Boolean);
}

function normalizePromptParts(parts,options){
var text=normalizeTags(parts||[]).join(', ');
var director=(typeof window!=='undefined')?window.NovelAICompositionDirector:null;
if(director&&typeof director.normalizePromptText==='function'){
return director.normalizePromptText(text,options||{allowCjk:false});
}
return text;
}

function getDirectorUserPrompt(){
var node=el('naiBatchDirectorPrompt');
return node?textOf(node.value).trim():'';
}

function getCharacterCardsForDirector(){
if(typeof window!=='undefined'&&typeof window.getNaiCharacterCardsForDirector==='function'){
return window.getNaiCharacterCardsForDirector()||[];
}
return [];
}

function getCharacterCardPositiveTags(cards){
var tags=[];
(cards||[]).forEach(function(card){
tags=tags.concat(card.positive_tags||[]);
(card.material_anchors||[]).forEach(function(anchor){
if(anchor&&anchor.tag)tags.push(anchor.tag);
});
});
return normalizeTags(tags);
}

function getCharacterCardNegativeTags(cards){
var tags=[];
(cards||[]).forEach(function(card){
tags=tags.concat(card.negative_tags||[]);
});
return normalizeTags(tags);
}

function getMaterialAnchorTags(cards){
var tags=[];
(cards||[]).forEach(function(card){
(card.material_anchors||[]).forEach(function(anchor){
if(anchor&&anchor.tag)tags.push(anchor.tag);
});
});
return normalizeTags(tags);
}

function getImportedPageTagDna(panels){
var cards=getCharacterCardsForDirector();
var tags=[
'masterpiece',
'best quality',
'professional manga art',
'clean lineart',
'consistent character design',
'consistent outfit',
'manga panel',
'clean panel border'
];
tags=tags.concat(getCharacterCardPositiveTags(cards));
tags=tags.concat(getMaterialAnchorTags(cards));
panels.forEach(function(panel){
tags=tags.concat(panel.mangaImportTags||[]);
tags=tags.concat(getAspectTags(getPanelSourceBox(panel)));
});
var director=(typeof window!=='undefined')?window.NovelAICompositionDirector:null;
var userPrompt=getDirectorUserPrompt();
if(director&&typeof director.resolveDanbooruAnchors==='function'&&userPrompt){
var anchors=director.resolveDanbooruAnchors(userPrompt)||{};
tags=tags.concat(anchors.confirmed_tags||[]);
tags=tags.concat(anchors.candidate_tags||[]);
}
return normalizeTags(tags).slice(0,42);
}

function applyImportedPageTagDna(panels){
var dna=getImportedPageTagDna(panels);
panels.forEach(function(panel,index){
var box=getPanelSourceBox(panel);
panel.mangaImportTagDna=dna;
panel.text2img_prompt=buildFallbackPrompt(dna.concat(panel.mangaImportTags||[]),box,panel.mangaImportPanelIndex||index+1);
panel.text2img_negative=normalizePromptParts(splitPromptParts(getDefaultNegativePrompt()).concat(getCharacterCardNegativeTags(getCharacterCardsForDirector())),{allowCjk:false});
});
lastImportSummary=lastImportSummary||{};
lastImportSummary.tagDna=dna;
return dna;
}

function getPanelCameraHint(index,count,box){
var aspect=box.w/Math.max(1,box.h);
if(index===0)return aspect<0.72?'vertical establishing shot, dramatic foreground':'establishing shot, clear setting';
if(index===count-1)return 'emotional close-up, story beat payoff';
if(aspect>1.45)return 'wide cinematic shot, environmental storytelling';
if(aspect<0.72)return 'portrait shot, strong character silhouette';
return index%2?'medium shot, character interaction':'dynamic angle, readable action';
}

function getPanelLightingHint(index,count){
if(index===0)return 'coherent opening atmosphere, soft directional light';
if(index===count-1)return 'dramatic rim light, emotional focus';
return index%2?'contrast lighting, manga screentone depth':'soft ambient light, clean shadows';
}

function buildImportedBatchContext(panels,dna){
var cards=getCharacterCardsForDirector();
return {
source:'manga_import_redraw',
user_prompt:getDirectorUserPrompt(),
imported_page:lastImportSummary||{},
tag_dna:dna,
character_cards:cards,
mandatory_positive_tags:getCharacterCardPositiveTags(cards),
mandatory_negative_tags:getCharacterCardNegativeTags(cards),
material_anchor_tags:getMaterialAnchorTags(cards),
panels:panels.map(function(panel,index){
var box=getPanelSourceBox(panel);
return {
page:1,
panel:index+1,
panel_index:panel.mangaImportPanelIndex||index+1,
aspect:Math.round((box.w/Math.max(1,box.h))*1000)/1000,
source_box:{x:box.x,y:box.y,w:box.w,h:box.h},
safe_size:{width:panel.text2img_width,height:panel.text2img_height,samples:1},
local_tags:panel.mangaImportTags||[],
rough_prompt:[
getDirectorUserPrompt(),
getPanelCameraHint(index,panels.length,box),
getPanelLightingHint(index,panels.length),
getAspectTags(box).join(', ')
].filter(Boolean).join(', ')
};
})
};
}

function findStoryboardPanel(storyboard,index){
if(!storyboard||!Array.isArray(storyboard.panels))return null;
return storyboard.panels.find(function(panel){
return parseInt(panel.page,10)===1&&parseInt(panel.panel,10)===index+1;
})||storyboard.panels[index]||null;
}

function buildFallbackImportedStoryboard(panels,dna){
return {
api_director:false,
series_positive_tags:dna,
series_negative_tags:splitPromptParts(getDefaultNegativePrompt()).concat(getCharacterCardNegativeTags(getCharacterCardsForDirector())),
style_bible:'professional manga art, clean lineart, consistent character design, readable panel composition',
character_bible:getCharacterCardPositiveTags(getCharacterCardsForDirector()).join(', '),
world_bible:'coherent story atmosphere, consistent lighting direction, clean manga panel border',
continuity_notes:'本地兜底：统一角色、画风、素材锚点和反向词，每格只改变镜头与剧情节奏。',
panels:panels.map(function(panel,index){
var box=getPanelSourceBox(panel);
return {
page:1,
panel:index+1,
prompt:[
getPanelCameraHint(index,panels.length,box),
getPanelLightingHint(index,panels.length),
getAspectTags(box).join(', '),
index===panels.length-1?'emotional climax':'story progression'
].join(', '),
negative_prompt:'',
camera:getPanelCameraHint(index,panels.length,box),
composition:getAspectTags(box).join(', '),
lighting:getPanelLightingHint(index,panels.length),
atmosphere:'coherent manga story atmosphere',
border:'manga panel, clean panel border',
story_beat:index===0?'opening beat':(index===panels.length-1?'payoff beat':'middle beat')
};
})
};
}

function applyImportedStoryboard(panels,storyboard,dna){
var cards=getCharacterCardsForDirector();
var positives=getCharacterCardPositiveTags(cards);
var negatives=getCharacterCardNegativeTags(cards);
panels.forEach(function(panel,index){
var box=getPanelSourceBox(panel);
var item=findStoryboardPanel(storyboard,index);
var parts=[];
parts=parts.concat(dna||[]);
parts=parts.concat(positives);
parts=parts.concat(storyboard.series_positive_tags||[]);
parts=parts.concat(splitPromptParts(storyboard.style_bible||''));
parts=parts.concat(splitPromptParts(storyboard.character_bible||''));
parts=parts.concat(splitPromptParts(storyboard.world_bible||''));
parts=parts.concat(panel.mangaImportTags||[]);
parts=parts.concat(getAspectTags(box));
if(item){
parts=parts.concat(splitPromptParts(item.prompt||''));
parts.push(item.camera,item.composition,item.lighting,item.atmosphere,item.border);
}
panel.text2img_prompt=normalizePromptParts(parts,{allowCjk:false});
var negativeParts=splitPromptParts(getDefaultNegativePrompt())
.concat(negatives)
.concat(storyboard.series_negative_tags||[])
.concat(item?splitPromptParts(item.negative_prompt||''):[]);
panel.text2img_negative=normalizePromptParts(negativeParts,{allowCjk:false});
panel.mangaImportTagDna=dna;
panel.naiDirectorPlan={
imported_manga:true,
batch_storyboard:true,
api_director:!!storyboard.api_director,
tag_dna:dna,
character_cards:cards,
series_positive_tags:storyboard.series_positive_tags||[],
series_negative_tags:storyboard.series_negative_tags||[],
camera:item?item.camera:'',
composition:item?item.composition:'',
lighting:item?item.lighting:'',
atmosphere:item?item.atmosphere:'',
border:item?item.border:'',
story_beat:item?item.story_beat:'',
continuity_notes:storyboard.continuity_notes||''
};
if(typeof NovelAICompositionDirector!=='undefined'&&NovelAICompositionDirector.setPanelPipelineStatus){
NovelAICompositionDirector.setPanelPipelineStatus(panel,storyboard.api_director?'PROMPT_OK':'PROMPT_FALLBACK',storyboard.api_director?'import storyboard api':'local import bible');
}
});
lastImportSummary=lastImportSummary||{};
lastImportSummary.storyboard={
api_director:!!storyboard.api_director,
series_positive_tags:storyboard.series_positive_tags||[],
series_negative_tags:storyboard.series_negative_tags||[],
continuity_notes:storyboard.continuity_notes||''
};
}

async function writeDirectorPromptsForCurrentPage(){
var panels=getImportPanelList();
if(!panels.length){
notify('AI 导演','当前页没有导入分镜。',true,4200);
return null;
}
var loading=typeof OP_showLoading==='function'?OP_showLoading({icon:'process',step:'Import Director',substep:'retag',progress:0},true):null;
try{
for(var i=0;i<panels.length;i++){
if(!panels[i].mangaImportTags||!panels[i].mangaImportTags.length){
if(loading&&typeof OP_updateLoadingState==='function')OP_updateLoadingState(loading,{icon:'process',step:'Import Director',substep:'tag '+(i+1)+'/'+panels.length,progress:Math.round((i/panels.length)*24)});
await retagPanel(panels[i]);
}
enforcePanelSafeSize(panels[i]);
}
var dna=applyImportedPageTagDna(panels);
var storyboard=null;
var director=(typeof window!=='undefined')?window.NovelAICompositionDirector:null;
if(loading&&typeof OP_updateLoadingState==='function')OP_updateLoadingState(loading,{icon:'process',step:'Import Director',substep:'story bible',progress:32});
if(director&&typeof director.callBatchStoryboardApi==='function'){
try{
storyboard=await director.callBatchStoryboardApi(buildImportedBatchContext(panels,dna));
}catch(error){
if(typeof uiLogger!=='undefined')uiLogger.error('Imported manga storyboard API failed:',error);
}
}
if(!storyboard)storyboard=buildFallbackImportedStoryboard(panels,dna);
applyImportedStoryboard(panels,storyboard,dna);
if(typeof canvas!=='undefined')canvas.renderAll();
if(typeof saveStateByManual==='function')saveStateByManual();
if(typeof updateLayerPanel==='function')updateLayerPanel();
var msg=(storyboard.api_director?'AI 导演已写入本页统一分镜。':'已用本地 bible 写入本页统一分镜。')+' Tag DNA '+dna.length+' 个，分镜 '+panels.length+' 格。';
setStatus(msg,false);
notify('AI 导演',msg,false,4600);
return storyboard;
}finally{
if(loading&&typeof OP_hideLoading==='function')OP_hideLoading(loading);
}
}

async function retagPanel(panel){
if(!panel)return {ok:false,tags:[],fallback:true};
var guid=typeof getGUID==='function'?getGUID(panel):(panel.guid||panel.name);
var crop=cropCache.get(guid);
var fallbackReason='';
var tags=[];
try{
if(!crop){
crop=capturePanelDataUrl(panel);
if(crop)cropCache.set(guid,crop);
}
if(crop){
tags=await callLocalTagger(crop);
}else{
fallbackReason='没有导入裁剪缓存';
}
}catch(error){
fallbackReason=error.message||String(error);
}
if(!tags.length){
var box=panel.mangaImportSourceBox||panel.getBoundingRect(true);
tags=getAspectTags(box).concat(['manga style','clean composition']);
}
var sourceBox=panel.mangaImportSourceBox||panel.getBoundingRect(true);
panel.mangaImportTags=normalizeTags(tags);
panel.text2img_prompt=buildFallbackPrompt(panel.mangaImportTags,sourceBox,panel.mangaImportPanelIndex||0);
panel.text2img_negative=getDefaultNegativePrompt();
panel.naiDirectorPlan={
imported_manga:true,
tagger_fallback:!!fallbackReason,
tagger_error:fallbackReason,
source_tags:panel.mangaImportTags,
composition:getAspectTags(sourceBox).join(', '),
border:'manga panel, clean panel border'
};
if(typeof NovelAICompositionDirector!=='undefined'&&NovelAICompositionDirector.setPanelPipelineStatus){
NovelAICompositionDirector.setPanelPipelineStatus(panel,fallbackReason?'PROMPT_FALLBACK':'PROMPT_OK',fallbackReason?'本地 Tagger 未响应，使用兜底':'本地 Tagger');
}
return {ok:!fallbackReason,tags:panel.mangaImportTags,fallback:!!fallbackReason,error:fallbackReason};
}

async function retagCurrentPage(){
var panels=getImportPanelList();
if(!panels.length){
notify('导入漫画','当前页没有可反推的分镜。',true);
return;
}
var loading=typeof OP_showLoading==='function'?OP_showLoading({icon:'process',step:'Import Tags',substep:'准备反推',progress:0},true):null;
var fallbackCount=0;
try{
for(var i=0;i<panels.length;i++){
if(typeof OP_isCancelled==='function'&&OP_isCancelled())break;
if(loading&&typeof OP_updateLoadingState==='function'){
OP_updateLoadingState(loading,{icon:'process',step:'Import Tags',substep:'分镜 '+(i+1)+'/'+panels.length,progress:Math.round((i/panels.length)*100)});
}
await new Promise(requestAnimationFrame);
var result=await retagPanel(panels[i]);
if(result.fallback)fallbackCount++;
}
applyImportedPageTagDna(panels);
if(typeof canvas!=='undefined')canvas.renderAll();
if(typeof saveStateByManual==='function')saveStateByManual();
if(typeof updateLayerPanel==='function')updateLayerPanel();
var msg='已为 '+panels.length+' 个分镜写入 tag。';
if(fallbackCount)msg+=' 其中 '+fallbackCount+' 个使用兜底。';
setStatus(msg,false);
notify('导入漫画',msg,fallbackCount>0,4200);
}finally{
if(loading&&typeof OP_hideLoading==='function')OP_hideLoading(loading);
}
}

async function importFile(file){
if(!file)return;
if(canvas.getObjects().length>0){
var ok=window.confirm('导入漫画会清空当前页对象，并根据导入图片重建分镜。是否继续？');
if(!ok)return;
}
setStatus('正在读取 '+file.name+' ...',false);
var dataUrl=await readFileAsDataUrl(file);
var image=await loadImageElement(dataUrl);
var template=analyzeMangaTemplate(image);
var boxes=template.panels;
var placeholderBoxes=template.placeholders||[];
var fit=fitCanvasSize(image.naturalWidth||image.width,image.naturalHeight||image.height);
clearCurrentPage();
resizeCanvasByNum(fit.width,fit.height);
await addReferenceImage(dataUrl,fit.width,fit.height,isChecked('mangaImportKeepReference',true));
cropCache.clear();
var panels=[];
var placeholders=[];
var references=[];
for(var i=0;i<boxes.length;i++){
var panel=createPanelFromBox(boxes[i],i+1,fit.scale);
panels.push(panel);
var guid=typeof getGUID==='function'?getGUID(panel):panel.guid;
cropCache.set(guid,cropBoxDataUrl(image,boxes[i],768));
}
if(isChecked('mangaImportCharacterPlaceholders',true)){
for(var p=0;p<placeholderBoxes.length;p++){
if(isChecked('mangaImportCharacterReferences',true)){
references.push(await addCharacterReferenceImage(cropBoxDataUrl(image,placeholderBoxes[p],1024),placeholderBoxes[p],p+1,fit.scale));
}
placeholders.push(createCharacterPlaceholder(placeholderBoxes[p],p+1,fit.scale));
}
}
canvas.discardActiveObject();
canvas.renderAll();
if(typeof updateLayerPanel==='function')updateLayerPanel();
if(typeof saveStateByManual==='function')saveStateByManual();
lastImportSummary={
file:file.name,
width:image.naturalWidth||image.width,
height:image.naturalHeight||image.height,
panels:panels.length,
characterPlaceholders:placeholders.length,
characterReferences:references.length
};
var placeholderText=placeholders.length?'，生成 '+placeholders.length+' 个通用角色立绘占位':'';
setStatus('已导入 '+file.name+'，识别 '+panels.length+' 个分镜'+placeholderText+'。'+(isChecked('mangaImportAutoTag',true)?' 正在反推 Tag...':''),false);
notify('导入漫画','已切分 '+panels.length+' 个分镜'+placeholderText+'，尺寸按格子比例写入。',false,2600);
if(isChecked('mangaImportAutoTag',true)){
await retagCurrentPage();
}
}

function pickFiles(){
var input=el('mangaImportInput');
if(input)input.click();
}

async function onFileInputChange(event){
var files=Array.from(event.target.files||[]);
event.target.value='';
if(!files.length)return;
if(files.length>1){
notify('导入漫画','当前先导入第一张。多页漫画请逐页导入，避免误清空当前页。',false,4200);
}
try{
await importFile(files[0]);
}catch(error){
setStatus(error.message||String(error),true);
notify('导入漫画',error.message||String(error),true,7000);
}
}

async function generateCurrentPageWithNai(){
var panels=getImportPanelList();
if(!panels.length){
notify('NAI redraw','No imported panels on the current page.',true,4200);
return;
}
if(isChecked('naiBatchDirectorEnabled',true)){
await writeDirectorPromptsForCurrentPage();
panels=getImportPanelList();
}
var preflight=buildNaiPreflight(panels);
setStatus(formatNaiPreflight(preflight),false);
if(!preflight.ok){
notify('NAI redraw','Preflight blocked generation because one or more panels exceed the safe pixel budget.',true,7000);
return;
}
var ok=window.confirm(formatNaiPreflight(preflight)+'\n\nThis will call NovelAI one panel at a time. Continue?');
if(!ok)return;
hideImportTemplateLayers();
if(typeof OP_resetCancel==='function')OP_resetCancel();
var loading=typeof OP_showLoading==='function'?OP_showLoading({icon:'process',step:'NAI Import Redraw',substep:'preflight passed',progress:0},true):null;
try{
for(var i=0;i<panels.length;i++){
if(typeof OP_isCancelled==='function'&&OP_isCancelled())break;
if(loading&&typeof OP_updateLoadingState==='function'){
OP_updateLoadingState(loading,{icon:'process',step:'NAI Import Redraw',substep:'panel '+(i+1)+'/'+panels.length,progress:Math.round((i/panels.length)*100)});
}
await new Promise(requestAnimationFrame);
var panel=panels[i];
if(!panel.text2img_prompt||panel.text2img_prompt.length<12){
await retagPanel(panel);
}
enforcePanelSafeSize(panel);
var spinner=createSpinner(getGUID(panel),'T2I');
await T2I(panel,spinner);
while(typeof existsWaitQueue==='function'&&existsWaitQueue()){
if(typeof OP_isCancelled==='function'&&OP_isCancelled())break;
await new Promise(function(resolve){setTimeout(resolve,500);});
}
}
if(typeof updateLayerPanel==='function')updateLayerPanel();
if(typeof btmSaveProjectFile==='function')await btmSaveProjectFile();
setStatus('NAI redraw finished or stopped. Template/reference layers are hidden; each panel used its own safe aspect-ratio size.',false);
}finally{
if(loading&&typeof OP_hideLoading==='function')OP_hideLoading(loading);
}
}

function bind(){
var input=el('mangaImportInput');
if(input)input.addEventListener('change',onFileInputChange);
var pick=el('mangaImportPickButton');
if(pick)pick.addEventListener('click',pickFiles);
var retag=el('mangaImportRetagButton');
if(retag)retag.addEventListener('click',function(){retagCurrentPage().catch(function(error){notify('导入漫画',error.message||String(error),true,7000);});});
var director=el('mangaImportDirectorButton');
if(director)director.addEventListener('click',function(){writeDirectorPromptsForCurrentPage().catch(function(error){notify('AI Director',error.message||String(error),true,8000);});});
var preflight=el('mangaImportPreflightButton');
if(preflight)preflight.addEventListener('click',showNaiPreflightForCurrentPage);
var nextPanel=el('mangaImportSelectNextPanelButton');
if(nextPanel)nextPanel.addEventListener('click',selectNextImportPanel);
var nextPlaceholder=el('mangaImportSelectPlaceholderButton');
if(nextPlaceholder)nextPlaceholder.addEventListener('click',selectNextCharacterPlaceholder);
var gen=el('mangaImportGenerateButton');
if(gen)gen.addEventListener('click',function(){generateCurrentPageWithNai().catch(function(error){notify('NAI 重绘',error.message||String(error),true,8000);});});
}

if(typeof document!=='undefined'){
document.addEventListener('DOMContentLoaded',bind);
}

return {
__test:{
analyzeMangaTemplate:analyzeMangaTemplate,
refineDetectedPanels:refineDetectedPanels,
findContentBox:findContentBox,
safePanelSize:safePanelSize,
buildNaiPreflight:buildNaiPreflight
},
pickFiles:pickFiles,
importFile:importFile,
analyzePanels:analyzePanels,
analyzeMangaTemplate:analyzeMangaTemplate,
retagCurrentPage:retagCurrentPage,
writeDirectorPromptsForCurrentPage:writeDirectorPromptsForCurrentPage,
showNaiPreflightForCurrentPage:showNaiPreflightForCurrentPage,
selectNextImportPanel:selectNextImportPanel,
selectNextCharacterPlaceholder:selectNextCharacterPlaceholder,
generateCurrentPageWithNai:generateCurrentPageWithNai,
getLastImportSummary:function(){return lastImportSummary;}
};
})();

if(typeof window!=='undefined'){
window.MangaImporter=MangaImporter;
window.mangaImportPickFiles=MangaImporter.pickFiles;
window.mangaImportRetagCurrentPage=MangaImporter.retagCurrentPage;
window.mangaImportDirectorCurrentPage=MangaImporter.writeDirectorPromptsForCurrentPage;
window.mangaImportPreflightCurrentPage=MangaImporter.showNaiPreflightForCurrentPage;
window.mangaImportGenerateWithNai=MangaImporter.generateCurrentPageWithNai;
}
