const fs = require('fs');
const vm = require('vm');
function load(file, context) { vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file }); }
const context = { console, Date, Math, JSON, Array, Object, Promise, Math }; context.globalThis = context;
load('js/simulator/timeline.js', context);
load('js/simulator/longshot-exporter.js', context);
const timeline = new context.NaiComicTimeline({ messages: [{ content: 'a' }, { content: 'b' }, { content: 'c' }] });
if (timeline.events.length !== 3 || timeline.next().index !== 0 || timeline.next().index !== 1 || timeline.previous().index !== 0) throw new Error('timeline navigation failed');
const pages = context.NaiComicLongShot.paginateGroup({ height: 4200, getObjects() { return [{ top: 0, height: 1200 }, { top: 1200, height: 1800 }, { top: 3000, height: 1200 }]; } }, 1800);
if (pages.length < 3 || pages.some((page) => page.height <= 0)) throw new Error('longshot pagination failed');
console.log('simulator timeline smoke test passed');
