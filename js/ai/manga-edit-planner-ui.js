/* Natural-language *plan* preview. Deterministic parser, no cloud calls.
 * Actions only open existing Fabric/OCR/GPT editors; users approve every edit.
 */
(function(){
  'use strict';
  const parser=window.MangaEditPlanner;
  if(!parser)return;
  const $=id=>document.getElementById(id);
  let pending=null;
  function status(message,bad){
    const n=$('mangaPlannerStatus');
    if(n){n.textContent=message;n.dataset.error=bad?'true':'false';}
  }
  function readGraph(){
    const ui=window.MangaPageStructureUI;
    if(!ui||typeof ui.getAnalysis!=='function')return null;
    if(!ui.isCurrent || !ui.isCurrent())return null;
    return ui.getAnalysis();
  }
  function clearPreview(){
    pending=null;
    const detail=$('mangaPlannerPreview');
    if(detail)detail.replaceChildren();
    if($('mangaPlannerConfirm'))$('mangaPlannerConfirm').disabled=true;
  }
  function preview(){
    clearPreview();
    const graph=readGraph();
    if(!graph)return status('请先点击「分析本页」，并确保识别后画布没有改动。',true);
    const instruction=$('mangaPlannerInput').value;
    const result=parser.plan(instruction,graph);
    if(!result.ok)return status(result.message,true);
    const detail=$('mangaPlannerPreview');
    const title=document.createElement('strong');
    const summary={
      'gpt-panel-review':'整格 GPT 编辑预览',
      'gpt-manual-region':'人物修改：必须手动框选',
      'smart-subtitle':'对白修改：进入原生智能字幕'
    };
    title.textContent='第 '+result.panelOrder+' 格 · '+summary[result.route];
    const warning=document.createElement('p');
    warning.textContent=result.warning;
    const note=document.createElement('p');
    note.textContent='编辑指令：'+result.prompt;
    detail.replaceChildren(title,warning,note);
    pending={result,source:JSON.stringify(graph.panels)};
    $('mangaPlannerConfirm').disabled=false;
    status('已生成待确认计划。这里没有调用 AI，也没有消耗额度。');
  }
  function apply(){
    if(!pending)return status('请先生成编辑计划。',true);
    const graph=readGraph();
    if(!graph || JSON.stringify(graph.panels)!==pending.source) {
      clearPreview();
      return status('画布或分镜位置已改变，请重新生成编辑计划。',true);
    }
    // Keep the location and semantic route tied to the exact previewed plan.
    const plan=pending.result;
    const current=parser.plan($('mangaPlannerInput').value,graph);
    if(!current.ok || current.panelId!==plan.panelId ||
        current.route!==plan.route || current.prompt!==plan.prompt){
      clearPreview();
      return status('编辑指令已改变，请重新预览后确认。',true);
    }
    if(plan.route==='smart-subtitle'){
      const panel=$('mangaSmartTextPanel');
      if(!panel)return status('智能字幕工具尚未准备好。',true);
      panel.hidden=false;
      $('mangaPagePanel').hidden=true;
      status('已打开智能字幕。选择第 '+plan.panelOrder+' 格的具体文字，编辑后手动应用。');
      clearPreview();
      return;
    }
    const gpt=window.MangaGPTRegionEditor;
    if(!gpt)return status('GPT 改图模块尚未准备好。',true);
    const staged=plan.route==='gpt-manual-region'
      ? typeof gpt.prepareManualEdit==='function' && gpt.prepareManualEdit(plan.prompt)
      : typeof gpt.selectRegionForPanel==='function' &&
          gpt.selectRegionForPanel(plan.panel,plan.prompt);
    if(!staged)return status('无法预设编辑任务。检查画布和 GPT 面板。',true);
    $('mangaPagePanel').hidden=true;
    clearPreview();
    status(plan.route==='gpt-manual-region'
      ? '已打开人物框选工具。请手动框住目标人物，确认参考图和费用后再生图。'
      : '已将整格和指令送到 GPT 预览。确认选区、参考图和费用后再生图。');
  }
  function render(){
    const panel=$('mangaPagePanel');
    if(!panel||$('mangaPlannerBox'))return;
    const box=document.createElement('section');
    box.id='mangaPlannerBox';
    box.className='manga-planner-box';
    const title=document.createElement('strong');
    title.textContent='自然语言编辑计划';
    const help=document.createElement('p');
    help.textContent='例如：第二格把背景改成雨夜城市、保留对白。人物替换需要再手动框选。';
    const input=document.createElement('textarea');
    input.id='mangaPlannerInput';
    input.rows=3;
    input.maxLength=1800;
    input.placeholder='第二格把背景改成雨夜城市，保留人物和对白';
    const controls=document.createElement('div');
    controls.className='manga-page-actions';
    const create=document.createElement('button');
    create.type='button';create.id='mangaPlannerPreviewBtn';
    create.textContent='预览编辑计划';
    const confirm=document.createElement('button');
    confirm.type='button';confirm.id='mangaPlannerConfirm';
    confirm.textContent='确认并打开编辑工具';confirm.disabled=true;
    const details=document.createElement('div');
    details.id='mangaPlannerPreview';
    const msg=document.createElement('div');
    msg.id='mangaPlannerStatus';msg.setAttribute('role','status');
    controls.append(create,confirm);
    box.append(title,help,input,controls,details,msg);
    const list=$('mangaPageList');
    panel.insertBefore(box,list||null);
    create.addEventListener('click',preview);
    confirm.addEventListener('click',apply);
    input.addEventListener('input',clearPreview);
    status('只生成本地编辑计划；进入 GPT 编辑器之后仍须手动确认生图。');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);
  else render();
  window.MangaEditPlannerUI={preview,apply};
})();
