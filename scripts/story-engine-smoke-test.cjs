const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = { console, Date, Math, JSON, Object, Array, Set, Map, Promise };
context.globalThis = context;
vm.createContext(context);

function load(relativePath) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

load('js/simulator/template-registry.js');
load('js/simulator/scene-serializer.js');
load('js/simulator/extra-renderer-factory.js');
load('js/simulator/renderers/visual-novel-renderer.js');
load('js/simulator/renderers/social-feed-renderer.js');
load('js/simulator/renderers/phone-renderer.js');
load('js/simulator/renderers/forum-renderer.js');
load('js/simulator/renderers/livestream-renderer.js');
load('js/simulator/renderers/video-tube-renderer.js');
load('js/simulator/renderers/danmaku-player-renderer.js');
load('js/simulator/renderers/image-board-renderer.js');
load('js/simulator/story-engine.js');
load('js/simulator/story-adapters.js');
load('js/simulator/timeline.js');
load('js/simulator/story-to-manga.js');
load('js/ai/director/scene-plan-schema.js');
load('js/ai/director/scene-plan-controller.js');

const engine = context.NaiComicStoryEngine;
const adapters = context.NaiComicStoryAdapters;

const story = engine.parseScript(
  '标题：雨夜\n角色A：你终于来了。\n独白：心跳有点快。\n角色B：我就在楼下。\n选项：跟着下去|先发消息',
  { title: '雨夜对白' }
);
assert.equal(story.title, '雨夜对白');
assert.equal(story.characters.length, 2);
assert.equal(story.nodes[0].type, 'title');
assert.equal(story.nodes[1].type, 'speech');
assert.equal(story.nodes[2].type, 'aside');
assert.equal(story.nodes[4].type, 'choice');
assert.equal(story.nodes[4].choices.length, 2);
assert.equal(engine.validate(story).ok, true);

const repeated = engine.repeatLast(story);
assert.equal(repeated.nodes.length, story.nodes.length + 1);
assert.notEqual(repeated.nodes[repeated.nodes.length - 1].id, story.nodes[story.nodes.length - 1].id);

const chat = adapters.toChat(story, 'story-log-dark');
assert.equal(chat.templateId, 'story-log-dark');
assert.equal(chat.participants.length, 2);
assert.ok(chat.messages.some((message) => message.type === 'choice'));
assert.deepEqual(adapters.fromChat(chat).characters.map((item) => item.name), story.characters.map((item) => item.name));

const vn = adapters.toVisualNovel(story);
assert.equal(vn.sceneType, 'visual-novel');
assert.ok(vn.dialogue.length >= 4);
assert.equal(vn.templateId, 'visual-novel-generic');
const extra = context.NaiComicExtraRendererRegistry.get('visual-novel-generic');
assert.equal(extra.validate(vn).ok, true);

assert.equal(adapters.pickTemplate('用视觉小说做一段对白'), 'visual-novel-generic');
assert.equal(adapters.pickTemplate('导出到微信聊天界面'), 'instant-chat-light');
assert.equal(adapters.pickTemplate('discord 频道'), 'discord-chat-dark');
assert.equal(adapters.pickTemplate('手机短信'), 'sms-chat-light');
assert.equal(adapters.pickTemplate('论坛帖子'), 'forum-generic');
assert.equal(adapters.pickTemplate('剪报栏头条'), 'newspaper-clip');
assert.equal(adapters.pickTemplate('夜间电台'), 'night-radio-dark');
assert.equal(adapters.pickTemplate('做成影片站播放页'), 'video-tube-generic');
assert.equal(adapters.pickTemplate('弹幕视频投稿页'), 'danmaku-player-generic');
assert.equal(adapters.pickTemplate('图区板块缩略图墙'), 'image-board-generic');
assert.equal(adapters.pickTemplate('直播间'), 'livestream-generic');

const tube = adapters.toVideoTube(story);
assert.equal(tube.templateId, 'video-tube-generic');
assert.equal(context.NaiComicExtraRendererRegistry.get('video-tube-generic').validate(tube).ok, true);
const danmaku = adapters.toDanmakuPlayer(story);
assert.equal(danmaku.sceneType, 'danmaku-player');
assert.equal(context.NaiComicExtraRendererRegistry.get('danmaku-player-generic').validate(danmaku).ok, true);
const board = adapters.toImageBoard(story);
assert.equal(board.templateId, 'image-board-generic');
assert.ok(board.posts.length);
assert.equal(context.NaiComicExtraRendererRegistry.get('image-board-generic').validate(board).ok, true);

const social = adapters.toSocialFeed(story);
assert.equal(social.sceneType, 'social-feed');
assert.ok(social.body);

const phone = adapters.toPhone(story);
assert.equal(phone.templateId, 'phone-generic');
assert.ok(phone.messages.length);

const timeline = context.NaiComicTimeline.fromScene(story);
assert.equal(timeline.events.length, story.nodes.length);

const plan = context.NaiScenePlanController.heuristic('用视觉小说做雨夜对白。角色A：你终于来了。');
assert.equal(plan.pages[0].panels[0].mode, 'simulator');
assert.equal(plan.pages[0].panels[0].template, 'visual-novel-generic');
assert.ok(plan.pages[0].panels[0].story);

const roundTrip = engine.deserialize(engine.serialize(story));
assert.equal(roundTrip.nodes.length, story.nodes.length);

const manga = context.NaiComicStoryToManga;
const beats = manga.beatsFromStory(story);
assert.ok(beats.length >= 3);
const layout = manga.layoutCells(1000, 1400, 5);
assert.equal(layout.cols, 3);
assert.equal(layout.cells.length, 5);
assert.ok(layout.cells[4].x > 0);
const mangaPlan = manga.storyToPlan(story);
assert.equal(mangaPlan.pages[0].panels[0].mode, 'normal');
assert.ok(manga.fillDirectorPrompt(story).indexOf('分镜') >= 0);

const kept = context.NaiScenePlanSchema.parse({
  title: 'kept',
  pages: [{ page: 1, panels: [{ panel: 1, mode: 'normal', description: '雨夜', prompt: 'rain, night', negative_prompt: 'blurry', directorSource: 'local' }] }]
});
assert.equal(kept.pages[0].panels[0].prompt, 'rain, night');
assert.equal(kept.pages[0].panels[0].directorSource, 'local');

console.log('story engine smoke test passed');
