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

  // Explicit human correction for slanted / borderless panels missed by the heuristic.
  function renumber(panels,direction) {
    return sortedPanels(panels,direction).map((p,i) => ({
      ...p,id:'panel-'+(i+1),order:i+1
    }));
  }
  function splitPanel(panels,id,axis,direction) {
    if(!Array.isArray(panels)||!['x','y'].includes(axis))return null;
    const index=panels.findIndex(p=>p.id===id);
    if(index<0||panels.length>=16)return null;
    const source=panels[index];
    const extent=axis==='x'?source.width:source.height;
    if(!Number.isFinite(extent)||extent<24)return null;
    const half=Math.floor(extent/2);
    const first={...source,verified:true,source:'manual-split'};
    const second={...source,verified:true,source:'manual-split'};
    if(axis==='x') {
      first.width=half;
      second.x+=half;
      second.width=extent-half;
    }else{
      first.height=half;
      second.y+=half;
      second.height=extent-half;
    }
    return renumber([...panels.slice(0,index),first,second,...panels.slice(index+1)],
      direction==='ltr'?'ltr':'rtl');
  }
  function removePanel(panels,id,direction) {
    if(!Array.isArray(panels)||panels.length<=1||
      !panels.some(p=>p.id===id))return null;
    return renumber(panels.filter(p=>p.id!==id),direction==='ltr'?'ltr':'rtl');
  }

  function chineseNumber(text) {
    if(/^\d+$/.test(text))return Number(text);
    const digits={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
    if(text==='十')return 10;
    if(text.includes('十')){
      const parts=text.split('十');
      if(parts.length!==2)return null;
      const ten=parts[0]?digits[parts[0]]:1;
      const one=parts[1]?digits[parts[1]]:0;
      if(!ten||one===undefined)return null;
      return 10*ten+one;
    }
    return digits[text]||null;
  }
  // V1 only resolves an EXPLICIT panel number; it cannot infer a character,
  // speaker, mask, or scene. Never silently start model generation here.
  function planPanelEdit(instruction,panels) {
    if(typeof instruction!=='string'||!Array.isArray(panels))return {
      ok:false,reason:'请填写包含明确分镜编号的修改指令。'
    };
    const prompt=instruction.trim().slice(0,3000);
    const matches=[];
    const pattern=/第([一二三四五六七八九十\d]{1,5})\s*(?:格|个?分镜|幅)|\bpanel\s*#?\s*(\d{1,2})\b/gi;
    for(const hit of prompt.matchAll(pattern)) {
      const value=hit[2]?Number(hit[2]):chineseNumber(hit[1]);
      if(!Number.isInteger(value)||value<1)return {
        ok:false,reason:'分镜编号无效，请检查数字。'
      };
      matches.push({value,text:hit[0]});
    }
    if(matches.length!==1)return {
      ok:false,reason:matches.length?'一次只能指定一个分镜，请分开执行。':'请明确指定第几格，例如“把第二格改成夜景”。'
    };
    const content=prompt.replace(matches[0].text,'')
      .replace(/^[\s，。、,.:：!！?？]+|[\s，。、,.:：!！?？]+$/g,'').trim();
    if(content.length<3)return {ok:false,reason:'请补充要修改的具体内容。'};
    const panel=panels.find(p=>p.order===matches[0].value);
    if(!panel)return {
      ok:false,reason:'没有第 '+matches[0].value+' 格，请先检查分镜检测结果。'
    };
    return {ok:true,panel,prompt,mode:'region-edit',stageOnly:true,
      capabilities:['explicit-panel-index','manual-confirmation']};
  }

  root.MangaPageStructure = Object.freeze({
    pageSchemaVersion, analyze, attachText, splitPanel, removePanel, planPanelEdit
  });
})(typeof window !== 'undefined' ? window : this);
