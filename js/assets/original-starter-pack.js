(function(root){
"use strict";

var BASE='assets/original/starter/';
var LICENSE={type:'original',source:'NAI Comic Studio starter pack',publicAllowed:true,notes:'project-original geometric SVG'};

var CATALOG=[
{id:'asset_original_speed_lines',file:'speed-lines.svg',name:'集中线',tags:['effect','speed','manga']},
{id:'asset_original_focus_lines',file:'focus-lines.svg',name:'放射集中线',tags:['effect','focus','manga']},
{id:'asset_original_motion_whoosh',file:'motion-whoosh.svg',name:'速度残影',tags:['effect','motion']},
{id:'asset_original_sparkle',file:'sparkle.svg',name:'闪光星',tags:['effect','sparkle']},
{id:'asset_original_sparkle_burst',file:'sparkle-burst.svg',name:'散落闪光',tags:['effect','sparkle']},
{id:'asset_original_rain_streaks',file:'rain-streaks.svg',name:'雨丝',tags:['effect','weather']},
{id:'asset_original_snow_dots',file:'snow-dots.svg',name:'雪点',tags:['effect','weather']},
{id:'asset_original_shock_burst',file:'shock-burst.svg',name:'冲击爆裂',tags:['effect','shock']},
{id:'asset_original_sun_rays',file:'sun-rays.svg',name:'日光放射',tags:['effect','light']},
{id:'asset_original_vignette_frame',file:'vignette-frame.svg',name:'粗框页边',tags:['frame']},
{id:'asset_original_sweat_drop',file:'sweat-drop.svg',name:'冷汗',tags:['emotion']},
{id:'asset_original_anger_vein',file:'anger-vein.svg',name:'青筋',tags:['emotion']},
{id:'asset_original_heart',file:'heart.svg',name:'心形',tags:['emotion']},
{id:'asset_original_flower',file:'flower.svg',name:'小花',tags:['emotion']},
{id:'asset_original_music_note',file:'music-note.svg',name:'音符',tags:['emotion']},
{id:'asset_original_question_mark',file:'question-mark.svg',name:'问号',tags:['emotion']},
{id:'asset_original_exclamation',file:'exclamation.svg',name:'感叹号',tags:['emotion']},
{id:'asset_original_spiral_dizzy',file:'spiral-dizzy.svg',name:'晕眩螺旋',tags:['emotion']},
{id:'asset_original_tear',file:'tear.svg',name:'泪滴',tags:['emotion']},
{id:'asset_original_blush_lines',file:'blush-lines.svg',name:'腮红线',tags:['emotion']},
{id:'asset_original_nameplate_dark',file:'nameplate-dark.svg',name:'深色名牌',tags:['ui','nameplate']},
{id:'asset_original_nameplate_gold',file:'nameplate-gold.svg',name:'金边名牌',tags:['ui','nameplate']},
{id:'asset_original_speech_tail',file:'speech-tail-left.svg',name:'气泡尾巴',tags:['bubble']},
{id:'asset_original_thought_cloud',file:'thought-cloud.svg',name:'思考云',tags:['bubble']},
{id:'asset_original_frame_corner',file:'frame-corner.svg',name:'四角装饰框',tags:['frame']},
{id:'asset_original_frame_double',file:'frame-double.svg',name:'双线画框',tags:['frame']},
{id:'asset_original_panel_jagged',file:'panel-jagged.svg',name:'锯齿分镜框',tags:['frame','panel']},
{id:'asset_original_caption_bar',file:'caption-bar.svg',name:'旁白条',tags:['ui','caption']},
{id:'asset_original_person_bust',file:'person-bust.svg',name:'半身剪影',tags:['silhouette']},
{id:'asset_original_person_full',file:'person-full.svg',name:'全身剪影',tags:['silhouette']},
{id:'asset_original_person_side',file:'person-side.svg',name:'侧面剪影',tags:['silhouette']},
{id:'asset_original_two_people',file:'two-people.svg',name:'双人剪影',tags:['silhouette']},
{id:'asset_original_person_chibi',file:'person-chibi.svg',name:'Q版剪影',tags:['silhouette']},
{id:'asset_original_cat_sit',file:'cat-sit.svg',name:'坐猫剪影',tags:['silhouette','animal']},
{id:'asset_original_bird',file:'bird.svg',name:'小鸟剪影',tags:['silhouette','animal']},
{id:'asset_original_city_skyline',file:'city-skyline.svg',name:'城市天际线',tags:['bg']},
{id:'asset_original_window_rect',file:'window-rect.svg',name:'窗框',tags:['bg']},
{id:'asset_original_door',file:'door.svg',name:'门',tags:['bg']},
{id:'asset_original_moon',file:'moon.svg',name:'月亮',tags:['bg']},
{id:'asset_original_leaf',file:'leaf.svg',name:'叶子',tags:['bg']},
{id:'asset_original_tree_simple',file:'tree-simple.svg',name:'树',tags:['bg']},
{id:'asset_original_stamp_circle',file:'stamp-circle.svg',name:'圆形印章框',tags:['ui']},
{id:'asset_original_arrow_impact',file:'arrow-impact.svg',name:'冲击箭头',tags:['effect']},
{id:'asset_original_cross_hatch',file:'cross-hatch.svg',name:'交叉排线',tags:['tone']},
{id:'asset_original_screen_dots',file:'screen-dots.svg',name:'网点',tags:['tone']},
{id:'asset_original_wind_lines',file:'wind-lines.svg',name:'风线',tags:['effect']},
{id:'asset_original_ink_splash',file:'ink-splash.svg',name:'墨点飞溅',tags:['effect']},
{id:'asset_original_star_burst',file:'star-burst.svg',name:'爆炸星',tags:['effect']},
{id:'asset_original_crescent',file:'crescent.svg',name:'新月',tags:['bg']}
];

function toRecord(item){
var path=BASE+item.file;
return {
id:item.id,
name:item.name,
type:'image',
path:path,
relativePath:path,
mime:'image/svg+xml',
hash:'original:'+item.id,
tags:item.tags.concat(['starter','original']),
sourceType:'original',
creator:'NAI Comic Studio',
license:LICENSE,
thumbnail:path,
private:false,
missing:false
};
}

function records(){
return CATALOG.map(toRecord);
}

function seed(store,options){
if(!store||typeof store.registerMany!=='function')return {added:0,skipped:0,total:CATALOG.length};
var opts=options||{};
return store.registerMany(records(),{updateExisting:opts.force!==false});
}

function restore(store){
if(!store)return {added:0,skipped:0,total:CATALOG.length};
CATALOG.forEach(function(item){
if(store.get(item.id))store.remove(item.id);
});
return seed(store,{force:true});
}

root.NaiComicOriginalStarterPack={
BASE:BASE,
CATALOG:CATALOG,
records:records,
seed:seed,
restore:restore
};

var store=root.NaiComicAssetStoreDefault;
if(store)seed(store);
})(typeof window!=='undefined'?window:globalThis);
