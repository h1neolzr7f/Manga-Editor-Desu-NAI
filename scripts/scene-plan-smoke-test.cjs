const fs = require('fs');
const vm = require('vm');
function load(file, context) { vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file }); }
const context = { console, Date, Math, JSON, Object, Array, Promise, Set, Map }; context.globalThis = context;
load('js/ai/director/scene-plan-schema.js', context);
const plan = context.NaiScenePlanSchema.parse({ title: 'smoke', pages: [{ page: 1, panels: [{ panel: 1, mode: 'simulator', template: 'generic-chat-dark', description: 'chat' }] }] });
const validation = context.NaiScenePlanSchema.validate(plan);
if (!validation.ok || validation.plan.pages[0].panels[0].template !== 'generic-chat-dark') throw new Error('ScenePlan validation failed');
console.log('scene plan smoke test passed');
