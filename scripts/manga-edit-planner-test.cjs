const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sandbox={window:{},console};vm.runInNewContext(
  fs.readFileSync(path.join(__dirname,'../js/ai/manga-edit-planner.js'),'utf8'),
  sandbox,{filename:'manga-edit-planner.js'}
);
const planner=sandbox.window.MangaEditPlanner;
assert(planner);
const graph={schemaVersion:1,width:1800,height:2400,panels:[
  {id:'panel-1',order:1,x:920,y:20,width:850,height:1100,verified:true},
  {id:'panel-2',order:2,x:30,y:20,width:850,height:1100,verified:true},
  {id:'panel-3',order:3,x:30,y:1250,width:1740,height:1100,verified:false}
]};
const rain=planner.plan('把第二格的背景改成下雨的城市，人物和对白保持不变',graph);
assert.equal(rain.ok,true);
assert.equal(rain.panelId,'panel-2');
assert.equal(rain.scope,'panel');
assert.equal(rain.route,'gpt-panel-review');
assert.equal(rain.requiresManualRegion,false);
assert(rain.prompt.includes('下雨的城市'));
assert.equal(rain.userConfirmed,false);

const woman=planner.plan('第二格把蓝发少女换成参考图人物，保留动作和对白',graph);
assert.equal(woman.ok,true);
assert.equal(woman.panelId,'panel-2');
assert.equal(woman.route,'gpt-manual-region');
assert.equal(woman.requiresManualRegion,true);
assert(woman.warning.includes('无法自动'));
assert.equal(woman.userConfirmed,false);

const subtitle=planner.plan('第三格的对白改成“现在出发吧”',graph);
assert.equal(subtitle.ok,true);
assert.equal(subtitle.route,'smart-subtitle');
assert.equal(subtitle.panelId,'panel-3');
assert.equal(subtitle.requiresManualRegion,false);

const han=planner.plan('第十二格修改背景',{...graph,panels:Array.from({length:12},(_,i)=>({
  id:'panel-'+(i+1),order:i+1,x:0,y:i,width:100,height:100
}))});
assert.equal(han.ok,true);
assert.equal(han.panelId,'panel-12');
assert.equal(planner.plan('第99格修改背景',graph).code,'panel-not-found');
assert.equal(planner.plan('第二格是什么内容？',graph).code,'no-edit-action');
assert.equal(planner.plan('改成下雪的街道',graph).code,'missing-panel');
assert.equal(planner.plan('第一格和第二格互换背景',graph).code,'multi-panel');
assert.equal(planner.plan('把第零格改成黑白',graph).ok,false);
assert.equal(planner.plan('',graph).ok,false);
assert.equal(planner.plan('第1格改成下雪',[{}]).ok,false);
assert.equal(planner.plan('第一页第二格替换角色',graph).code,'unsupported-page');
assert.equal(planner.plan('第二格替换人物',{...graph,panels:[{...graph.panels[0],verified:false}]}).code,'panel-not-found');
console.log('PASS deterministic manga edit planner: panel intent, character manual selection, text routing and invalid input guards');
