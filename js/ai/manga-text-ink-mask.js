/* Conservative dark-ink proposal for a user-selected TEXT rectangle.
 * No model, remote calls, dependencies or page mutations.
 * Refuse complex/transparent/inhomogeneous backgrounds rather than inventing a mask.
 */
(function(root){
  'use strict';
  function fail(reason){return {ok:false,reason};}
  function propose(image,box){
    if(!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) ||
       image.width<12 || image.height<12 || !image.data ||
       image.data.length < image.width*image.height*4 || !box){
      return fail('无法读取有效图像。');
    }
    const w=image.width,h=image.height, data=image.data;
    const x=Math.max(0,Math.floor(Number(box.x)));
    const y=Math.max(0,Math.floor(Number(box.y)));
    const right=Math.min(w,Math.ceil(Number(box.x)+Number(box.width)));
    const bottom=Math.min(h,Math.ceil(Number(box.y)+Number(box.height)));
    if(![x,y,right,bottom].every(Number.isFinite) || right-x<8 || bottom-y<8)
      return fail('文字区域太小或超出画布。');
    const bw=right-x,bh=bottom-y;
    // Sample a thin ring OUTSIDE OCR letters. Black comic borders, art and
    // gradients make the hypothesis unsafe, so we decline rather than erase.
    const spread=Math.max(5,Math.min(14,Math.floor(Math.min(bw,bh)*.24)));
    const sums=[0,0,0], samples=[];
    const add=(px,py)=>{
      if(px<0||py<0||px>=w||py>=h)return;
      const i=(py*w+px)*4;
      if(data[i+3]<245){samples.push(null);return;}
      const p=[data[i],data[i+1],data[i+2]];
      samples.push(p);
      for(let c=0;c<3;c++)sums[c]+=p[c];
    };
    const stepX=Math.max(1,Math.round(bw/25));
    const stepY=Math.max(1,Math.round(bh/25));
    for(let ix=x;ix<right;ix+=stepX){
      add(ix,y-spread);add(ix,bottom+spread-1);
    }
    for(let iy=y;iy<bottom;iy+=stepY){
      add(x-spread,iy);add(right+spread-1,iy);
    }
    const count=samples.length;
    if(count<18 || samples.some(p=>!p))
      return fail('文字外缘缺少完整不透明背景样本；请手动调整蒙版。');
    const mean=sums.map(n=>n/count);
    const brightness=(mean[0]*.2126+mean[1]*.7152+mean[2]*.0722);
    let variance=0;
    for(const p of samples){
      for(let c=0;c<3;c++)variance+=(p[c]-mean[c])**2;
    }
    const deviation=Math.sqrt(variance/(count*3));
    if(brightness<215 || deviation>16)
      return fail('底色有明显阴影、线条或纹理，自动墨迹提取已拒绝。');
    const values=new Uint8Array(w*h);
    let dark=0;
    const threshold=Math.min(190,brightness-55);
    for(let py=y;py<bottom;py++){
      for(let px=x;px<right;px++){
        const i=(py*w+px)*4,k=py*w+px;
        if(data[i+3]<245)continue;
        const r=data[i],g=data[i+1],b=data[i+2];
        const luminance=.2126*r+.7152*g+.0722*b;
        const diff=Math.sqrt(((r-mean[0])**2+(g-mean[1])**2+(b-mean[2])**2)/3);
        if(luminance<threshold && diff>57){values[k]=1;dark++;}
      }
    }
    const total=bw*bh;
    if(dark<3)return fail('未找到足够可靠的深色文字笔画，请保留手动蒙版。');
    if(dark/total>.43)
      return fail('候选墨迹覆盖范围过大，可能是人物或画面纹理，请手动框选。');
    const mask=new Uint8ClampedArray(w*h);
    let filled=0;
    // 1 pixel ink padding includes antialiasing without engulfing the bubble.
    for(let py=y;py<bottom;py++)for(let px=x;px<right;px++){
      const k=py*w+px;
      if(!values[k])continue;
      for(let yy=Math.max(y,py-1);yy<=Math.min(bottom-1,py+1);yy++)
        for(let xx=Math.max(x,px-1);xx<=Math.min(right-1,px+1);xx++){
          const index=yy*w+xx;
          if(!mask[index]){mask[index]=255;filled++;}
        }
    }
    if(filled/total>.58)
      return fail('扩展后的墨迹范围太大，已保护画面避免误擦。');
    return {ok:true,mask,width:w,height:h,coverage:filled/(w*h),
      textCoverage:filled/total,backgroundDeviation:deviation,source:'uniform-light-background-ink',
      verified:false};
  }
  root.MangaTextInkMask=Object.freeze({propose});
})(typeof window!=='undefined'?window:this);
