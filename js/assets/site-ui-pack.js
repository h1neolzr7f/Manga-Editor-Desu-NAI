(function(root){
"use strict";

var BASE='assets/original/site-ui/';
var LICENSE={type:'original',source:'NAI Comic Studio site-ui pack',publicAllowed:true,notes:'project-original generic site chrome; layout only, no third-party marks'};

var CATALOG=[
{id:'asset_site_tube_top_bar',file:'tube-top-bar.svg',name:'影片站顶栏',tags:['site-ui','tube','chrome']},
{id:'asset_site_tube_player',file:'tube-player.svg',name:'深色播放器',tags:['site-ui','tube','player']},
{id:'asset_site_tube_related',file:'tube-related.svg',name:'相关列表',tags:['site-ui','tube']},
{id:'asset_site_tube_comments',file:'tube-comments.svg',name:'播放页评论',tags:['site-ui','tube','comment']},
{id:'asset_site_tube_chips',file:'tube-chips.svg',name:'影片分类圆片',tags:['site-ui','tube']},
{id:'asset_site_tube_stats',file:'tube-stats.svg',name:'播放数据行',tags:['site-ui','tube']},
{id:'asset_site_tube_thumb_card',file:'tube-thumb-card.svg',name:'影片卡片',tags:['site-ui','tube']},
{id:'asset_site_tube_home_grid',file:'tube-home-grid.svg',name:'影片首页宫格',tags:['site-ui','tube']},
{id:'asset_site_tube_hd_badge',file:'tube-hd-badge.svg',name:'清晰度角标',tags:['site-ui','tube','badge']},
{id:'asset_site_tube_controls',file:'tube-controls.svg',name:'播放控件',tags:['site-ui','tube','player']},
{id:'asset_site_danmaku_player',file:'danmaku-player.svg',name:'弹幕播放器',tags:['site-ui','danmaku','player']},
{id:'asset_site_danmaku_input',file:'danmaku-input.svg',name:'弹幕输入条',tags:['site-ui','danmaku']},
{id:'asset_site_danmaku_stats',file:'danmaku-stats.svg',name:'投稿数据行',tags:['site-ui','danmaku']},
{id:'asset_site_danmaku_cards',file:'danmaku-cards.svg',name:'接下来播放',tags:['site-ui','danmaku']},
{id:'asset_site_danmaku_nav',file:'danmaku-nav.svg',name:'分区导航',tags:['site-ui','danmaku']},
{id:'asset_site_danmaku_follow',file:'danmaku-follow.svg',name:'关注按钮',tags:['site-ui','danmaku','badge']},
{id:'asset_site_danmaku_chapters',file:'danmaku-chapters.svg',name:'章节轴',tags:['site-ui','danmaku']},
{id:'asset_site_danmaku_submit_badge',file:'danmaku-submit-badge.svg',name:'投稿角标',tags:['site-ui','danmaku','badge']},
{id:'asset_site_danmaku_cover',file:'danmaku-cover.svg',name:'投稿封面卡',tags:['site-ui','danmaku']},
{id:'asset_site_board_header',file:'board-header.svg',name:'图区顶栏',tags:['site-ui','board','chrome']},
{id:'asset_site_board_grid',file:'board-grid.svg',name:'帖子宫格',tags:['site-ui','board']},
{id:'asset_site_board_card',file:'board-card.svg',name:'图帖卡片',tags:['site-ui','board']},
{id:'asset_site_board_thread',file:'board-thread.svg',name:'帖子楼层',tags:['site-ui','board']},
{id:'asset_site_board_tags',file:'board-tags.svg',name:'板块标签',tags:['site-ui','board']},
{id:'asset_site_board_pager',file:'board-pager.svg',name:'翻页条',tags:['site-ui','board']},
{id:'asset_site_board_filters',file:'board-filters.svg',name:'图区筛选',tags:['site-ui','board']},
{id:'asset_site_board_reply',file:'board-reply.svg',name:'回帖框',tags:['site-ui','board']},
{id:'asset_site_board_banner',file:'board-banner.svg',name:'图区公告条',tags:['site-ui','board']}
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
tags:item.tags.concat(['original']),
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

root.NaiComicSiteUiPack={
BASE:BASE,
CATALOG:CATALOG,
records:records,
seed:seed,
restore:restore
};

var store=root.NaiComicAssetStoreDefault;
if(store)seed(store);
})(typeof window!=='undefined'?window:globalThis);
