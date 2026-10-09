/* Editable plan, not an AI semantic parser.
 * Rules never claim to detect characters; every action is user-confirmed.
 * No model or network calls live here.
 */
(function(root){
  'use strict';
  const HAN={'零':0,'〇':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,
    '七':7,'八':8,'九':9};
  function toOrdinal(token) {
    if (/^\d{1,3}$/.test(token)) return Number(token);
    if (token==='十') return 10;
    if (token.includes('十')) {
      const parts=token.split('十');
      if(parts.length!==2 || (parts[0] && !(parts[0] in HAN)) ||
          (parts[1] && !(parts[1] in HAN))) return 0;
      return (parts[0] ? HAN[parts[0]]:1)*10 + (parts[1]?HAN[parts[1]]:0);
    }
    return token in HAN?HAN[token]:0;
  }
  function fail(code,message) {
    return {ok:false,code,message};
  }
  function plan(raw,graph) {
    if(typeof raw!=='string' || !raw.trim()) return fail('empty','请输入需要修改的漫画内容。');
    const text=raw.trim();
    if(text.length>1800) return fail('too-long','请将一次编辑描述限制在 1800 字以内。');
    if(!graph || !Array.isArray(graph.panels)||!graph.panels.length) {
      return fail('no-structure','请先完成本页分镜分析。');
    }
    if(/第(?:\d{1,3}|[一二两三四五六七八九十零〇]{1,5})页/.test(text)) {
      return fail('unsupported-page','当前只分析本页，不能自动跨页定位。');
    }
    const matches=[...text.matchAll(/第(\d{1,3}|[一二两三四五六七八九十零〇]{1,5})格/g)];
    if(!matches.length)return fail('missing-panel','请明确指出第几格，例如「第二格」。');
    if(matches.length!==1)return fail('multi-panel','一次只修改一格，避免错误地同时编辑多个区域。');
    const order=toOrdinal(matches[0][1]);
    if(!Number.isInteger(order) || order<=0)return fail('invalid-panel','分镜编号必须是正整数。');
    const panel=graph.panels.find(p=>p.order===order);
    if(!panel)return fail('panel-not-found','本页没有第 '+order+' 格，请先调整分镜识别结果。');
    if(!/(改|换|替|修|删|擦|调整|添加|加上|变成|做成|重画|重绘|去除|清除|绘制|remove|replace|change|edit|draw)/i.test(text)) {
      return fail('no-edit-action','没有识别到明确的编辑动作；请描述需要修改的内容。');
    }
    // A preserved entity is context, not the requested edit target.
    // Examples: "change the sky, keep the characters" and "rewrite text,
    // keep the character unchanged" must not route to character inpainting.
    // The object following "preserve / keep" is NOT a change target.
    // Prioritize the first explicit edit clause, not the context to protect.
    const clauses=text.split(/[，,；;。]/);
    const edits=clauses.filter(part=>
      !/(?:保留|保持|不变|不修改|不要改|不要动|不动|维持|原样|unchanged|keep|preserve)/i.test(part));
    const actionable=(edits.join('，') || text)
      .split(/\s*(?:保留|保持|不要|不改变|不修改|不动|维持|不碰)/)[0] || text;
    const textTask=/(对白|台词|文字|字幕|气泡|台本|dialogue|lettering|caption|subtitle)/i.test(actionable);
    const character=/(人物|角色|少女|女孩|男孩|男人|女人|身体|头发|表情|衣服|发型|服装|主角|人像|脸|参考图|character|face|person)/i.test(actionable);
    const background=/(背景|场景|天气|城市|建筑|天空|雨|雪|background|scene|sky|city)/i.test(actionable);
    // Text edits route into OCR/Fabric, not a paid redraw; avoid destroying lettering.
    let route,scope,requiresManualRegion,warning;
    if(textTask && !character && !background) {
      route='smart-subtitle';scope='text';requiresManualRegion=false;
      warning='请在智能字幕面板选择该格的具体气泡和文字；不会直接重绘原图。';
    }else if(character) {
      route='gpt-manual-region';scope='character';requiresManualRegion=true;
      warning='无法自动确认人物轮廓和身份，必须在 GPT 面板手动框选目标角色；不能直接重画整格。';
    }else {
      route='gpt-panel-review';scope='panel';requiresManualRegion=false;
      warning='仅预设整格编辑区域，可能影响人物或文字。请在生成前缩小选区并确认费用。';
    }
    if(!panel.verified) warning='该分镜尚未人工确认。'+warning;
    return {
      ok:true,status:'review_required',userConfirmed:false,
      source:'local-rules',panelId:panel.id,panelOrder:order,
      scope,route,requiresManualRegion,warning,
      prompt:text,
      panel:{x:panel.x,y:panel.y,width:panel.width,height:panel.height,order},
      costsCredits:false
    };
  }
  root.MangaEditPlanner=Object.freeze({plan,toOrdinal});
})(typeof window!=='undefined'?window:this);
