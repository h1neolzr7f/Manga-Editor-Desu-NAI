/* Manga page structure v1: deterministic, low-cost XY-cut candidates.
 * Own implementation; conceptual inspiration listed in docs/UPSTREAM_BORROWING_LEDGER.md.
 * This is NOT semantic panel/bubble detection; every result is user-reviewable.
 */
(function (root) {
  'use strict';
  const pageSchemaVersion = 1;

  function validImage(image) {
    return image && Number.isInteger(image.width) && Number.isInteger(image.height) &&
      image.width > 0 && image.height > 0 && image.data &&
      image.data.length >= image.width * image.height * 4;
  }
  function lightPixel(image, x, y) {
    const i = (y * image.width + x) * 4;
    const alpha = image.data[i + 3];
    if (alpha < 230) return false;
    return image.data[i] >= 238 && image.data[i + 1] >= 238 && image.data[i + 2] >= 238;
  }
  function inkRatio(image, rect) {
    let seen = 0, ink = 0;
    const stepX = Math.max(1, Math.floor(rect.width / 90));
    const stepY = Math.max(1, Math.floor(rect.height / 90));
    for (let y = rect.y; y < rect.y + rect.height; y += stepY) {
      for (let x = rect.x; x < rect.x + rect.width; x += stepX) {
        seen++;
        if (!lightPixel(image, x, y)) ink++;
      }
    }
    return ink / Math.max(1, seen);
  }
  function projection(image, rect, axis) {
    const vertical = axis === 'x';
    const along = vertical ? rect.width : rect.height;
    const across = vertical ? rect.height : rect.width;
    const values = new Float32Array(along);
    const step = Math.max(1, Math.floor(across / 260));
    for (let i = 0; i < along; i++) {
      let white = 0, tested = 0;
      for (let j = 0; j < across; j += step) {
        const x = vertical ? rect.x + i : rect.x + j;
        const y = vertical ? rect.y + j : rect.y + i;
        if (lightPixel(image, x, y)) white++;
        tested++;
      }
      values[i] = white / tested;
    }
    return values;
  }
  function bestSplit(image, rect) {
    let winner = null;
    for (const axis of ['x', 'y']) {
      const values = projection(image, rect, axis);
      const total = values.length;
      const minBand = Math.max(3, Math.round(total * 0.018));
      const minChild = Math.max(10, Math.round(total * 0.17));
      let start = -1;
      const check = (end) => {
        if (start < 0 || end - start < minBand) return;
        const at = Math.round((start + end) / 2);
        if (at < minChild || total - at < minChild) return;
        const before = axis === 'x' ?
          {x: rect.x, y: rect.y, width: at, height: rect.height} :
          {x: rect.x, y: rect.y, width: rect.width, height: at};
        const after = axis === 'x' ?
          {x: rect.x + at, y: rect.y, width: rect.width - at, height: rect.height} :
          {x: rect.x, y: rect.y + at, width: rect.width, height: rect.height - at};
        // Do not split an empty margin or a blank page. Both halves must contain art.
        if (inkRatio(image, before) < .045 || inkRatio(image, after) < .045) return;
        // Favor wide, balanced gutters, but not over a genuinely smaller panel.
        const balance = Math.min(at, total - at) / (total / 2);
        const score = (end - start) / total + .10 * balance;
        if (!winner || score > winner.score) winner = {before, after, score};
      };
      for (let i = 0; i <= total; i++) {
        if (i < total && values[i] >= .985) {
          if (start < 0) start = i;
        } else if (start >= 0) {
          check(i);
          start = -1;
        }
      }
    }
    return winner;
  }
  function sortedPanels(panels, direction) {
    return panels.slice().sort((a,b) => {
      const sameRow = Math.abs(a.y - b.y) <= Math.min(a.height,b.height) * .16;
      if (sameRow) return direction === 'ltr' ? a.x - b.x : b.x - a.x;
      return a.y - b.y || (direction === 'ltr' ? a.x - b.x : b.x - a.x);
    });
  }
  function analyze(image, options) {
    options = options || {};
    const width = Number(options.pageWidth) || (image && image.width) || 1;
    const height = Number(options.pageHeight) || (image && image.height) || 1;
    const direction = options.direction === 'ltr' ? 'ltr' : 'rtl';
    if (!validImage(image)) return {schemaVersion:pageSchemaVersion, direction,
      width, height, panels:[{id:'panel-1',order:1,x:0,y:0,width,height,
        source:'whole-page-fallback',verified:false}]};
    const found = [];
    const maxPanels = Math.min(16, Math.max(1,Number(options.maxPanels) || 12));
    function recurse(rect, depth) {
      if (depth >= 5 || found.length >= maxPanels - 1 ||
          rect.width < 32 || rect.height < 32) {
        found.push(rect); return;
      }
      const split = bestSplit(image,rect);
      if (!split) {found.push(rect);return;}
      recurse(split.before,depth+1);
      recurse(split.after,depth+1);
    }
    recurse({x:0,y:0,width:image.width,height:image.height},0);
    // Return original-canvas coordinates; pixel scanning uses a reduced preview.
    const xScale = width / image.width, yScale = height / image.height;
    const panels = sortedPanels(found,direction).map((r,i)=>({
      id:'panel-'+(i+1), order:i+1,
      x:Math.round(r.x*xScale), y:Math.round(r.y*yScale),
      width:Math.round(r.width*xScale), height:Math.round(r.height*yScale),
      source:found.length===1?'whole-page-fallback':'white-gutter-heuristic',
      verified:false
    }));
    return {schemaVersion:pageSchemaVersion,direction,width,height,panels};
  }
  function intersection(a,b) {
    const x1=Math.max(a.x,b.x),y1=Math.max(a.y,b.y);
    const x2=Math.min(a.x+a.width,b.x+b.width),y2=Math.min(a.y+a.height,b.y+b.height);
    return Math.max(0,x2-x1)*Math.max(0,y2-y1);
  }
  function attachText(panels, input, dimensions) {
    const result = {texts:[],bubbleCandidates:[]};
    if (!Array.isArray(panels)||!Array.isArray(input)||!dimensions) return result;
    const maxW=Number(dimensions.width),maxH=Number(dimensions.height);
    if (!(maxW>0 && maxH>0)) return result;
    for(const [sourceIndex,item] of input.slice(0,120).entries()){
      if (!item || typeof item.text!=='string' || !item.text.trim()) continue;
      const rect={x:Number(item.x),y:Number(item.y),width:Number(item.width),height:Number(item.height)};
      if (![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite) ||
          rect.width<2 || rect.height<2 || rect.x<0 || rect.y<0 ||
          rect.x+rect.width>maxW+1 || rect.y+rect.height>maxH+1) continue;
      const scores=panels.map(p=>({panel:p,share:intersection(rect,p)/(rect.width*rect.height)}))
        .sort((a,b)=>b.share-a.share);
      const best=scores[0];
      const unambiguous=best && best.share>=.82 && (!scores[1] || scores[1].share<.15);
      const panelId=unambiguous?best.panel.id:null;
      const record={...rect,text:item.text,confidence:Number(item.confidence)||0,
        panelId,id:'text-'+(result.texts.length+1),sourceIndex};
      result.texts.push(record);
      if(panelId){
        const marginX=Math.max(4,Math.round(rect.width*.17));
        const marginY=Math.max(4,Math.round(rect.height*.40));
        const p=best.panel;
        const left=Math.max(p.x,rect.x-marginX),top=Math.max(p.y,rect.y-marginY);
        const right=Math.min(p.x+p.width,rect.x+rect.width+marginX);
        const bottom=Math.min(p.y+p.height,rect.y+rect.height+marginY);
        result.bubbleCandidates.push({id:'bubble-candidate-'+result.bubbleCandidates.length,
          panelId,textId:record.id,x:left,y:top,width:right-left,height:bottom-top,
          source:'ocr-text-expansion',verified:false});
      }
    }
    return result;
  }
  root.MangaPageStructure = Object.freeze({
    pageSchemaVersion, analyze, attachText
  });
})(typeof window !== 'undefined' ? window : this);
