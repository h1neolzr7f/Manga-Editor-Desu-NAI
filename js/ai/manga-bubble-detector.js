/* Conservative local bubble-candidate detector.
 * Original implementation: connected enclosed near-white regions + OCR association.
 * Inspired by modular OCR/detection pipelines (see UPSTREAM_BORROWING_LEDGER.md).
 * A detected light component is NOT a verified speech bubble.
 */
(function (root) {
  'use strict';
  function valid(image) {
    return image && Number.isInteger(image.width) && Number.isInteger(image.height) &&
      image.width > 0 && image.height > 0 &&
      image.width * image.height <= 1200000 && image.data &&
      image.data.length >= image.width * image.height * 4;
  }
  function light(image,index) {
    const i = index * 4, d=image.data;
    return d[i+3] >= 245 && d[i] >= 240 && d[i+1] >= 240 && d[i+2] >= 240;
  }
  function intersection(a,b) {
    const x0=Math.max(a.x,b.x),y0=Math.max(a.y,b.y);
    const x1=Math.min(a.x+a.width,b.x+b.width),y1=Math.min(a.y+a.height,b.y+b.height);
    return Math.max(0,x1-x0)*Math.max(0,y1-y0);
  }
  function findCandidates(image,panels,texts,dimensions) {
    if(!valid(image)||!Array.isArray(panels)||!Array.isArray(texts)||!dimensions||
      !(Number(dimensions.width)>0 && Number(dimensions.height)>0))return [];
    const w=image.width,h=image.height,size=w*h;
    const seen=new Uint8Array(size);
    const queue=new Int32Array(size);
    const scaleX=dimensions.width/w,scaleY=dimensions.height/h;
    const results=[];
    const minArea=Math.max(60,Math.round(size*.0015));
    for(let start=0;start<size;start++){
      if(seen[start])continue;
      seen[start]=1;
      if(!light(image,start))continue;
      let head=0,tail=1;
      queue[0]=start;
      let minX=w,maxX=0,minY=h,maxY=0,touch=false;
      while(head<tail){
        const pos=queue[head++],x=pos%w,y=(pos/w)|0;
        if(x<minX)minX=x;
        if(x>maxX)maxX=x;
        if(y<minY)minY=y;
        if(y>maxY)maxY=y;
        if(x===0||y===0||x===w-1||y===h-1)touch=true;
        // Four-neighbour connectivity; scanning starts at a valid white pixel.
        if(x>0){const next=pos-1;if(!seen[next]){
          seen[next]=1;if(light(image,next))queue[tail++]=next;}}
        if(x<w-1){const next=pos+1;if(!seen[next]){
          seen[next]=1;if(light(image,next))queue[tail++]=next;}}
        if(y>0){const next=pos-w;if(!seen[next]){
          seen[next]=1;if(light(image,next))queue[tail++]=next;}}
        if(y<h-1){const next=pos+w;if(!seen[next]){
          seen[next]=1;if(light(image,next))queue[tail++]=next;}}
      }
      const bw=maxX-minX+1,bh=maxY-minY+1,area=bw*bh;
      if(touch||tail<minArea||bw<10||bh<10||area>size*.50||
         tail/area<.35||Math.max(bw/bh,bh/bw)>5)continue;
      const candidate={
        x:Math.round(minX*scaleX),y:Math.round(minY*scaleY),
        width:Math.max(2,Math.round(bw*scaleX)),
        height:Math.max(2,Math.round(bh*scaleY))
      };
      const panel=panels.map(p=>({
        data:p,share:intersection(candidate,p)/(candidate.width*candidate.height)
      })).sort((a,b)=>b.share-a.share)[0];
      if(!panel||panel.share<.88)continue;
      const matches=texts.filter(t=>t.panelId===panel.data.id &&
        t.width>0 && t.height>0 &&
        intersection(candidate,t)/(t.width*t.height)>=.83);
      if(!matches.length)continue;
      // Candidate metadata stays separately reviewable and never erases pixels.
      results.push({...candidate,id:'bubble-region-'+(results.length+1),
        panelId:panel.data.id,textId:matches[0].id,
        textIds:matches.map(t=>t.id),
        source:'enclosed-light-region',verified:false});
    }
    return results.sort((a,b)=>a.y-b.y||a.x-b.x);
  }
  root.MangaBubbleDetector=Object.freeze({findCandidates});
})(typeof window!=='undefined'?window:this);
