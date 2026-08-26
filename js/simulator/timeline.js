(function(root){
"use strict";

function clone(value){return JSON.parse(JSON.stringify(value));}
function eventsFromScene(scene){
var value=scene&&typeof scene==='object'?scene:{};
if(Array.isArray(value.events)&&value.events.length)return value.events.map(function(event,index){return Object.assign({id:'event_'+(index+1),index:index},clone(event));});
if(Array.isArray(value.nodes)&&value.nodes.length)return value.nodes.map(function(node,index){return {id:node.id||'node_'+(index+1),index:index,type:node.type||'node',payload:clone(node)};});
if(Array.isArray(value.messages)&&value.messages.length)return value.messages.map(function(message,index){return {id:message.id||'message_'+(index+1),index:index,type:'message',payload:clone(message)};});
if(Array.isArray(value.dialogue)&&value.dialogue.length)return value.dialogue.map(function(dialogue,index){return {id:dialogue.id||'dialogue_'+(index+1),index:index,type:'dialogue',payload:clone(dialogue)};});
if(Array.isArray(value.comments)&&value.comments.length)return value.comments.map(function(item,index){return {id:'comment_'+(index+1),index:index,type:'comment',payload:clone(item)};});
if(Array.isArray(value.danmaku)&&value.danmaku.length)return value.danmaku.map(function(item,index){return {id:'danmaku_'+(index+1),index:index,type:'danmaku',payload:clone(item)};});
if(Array.isArray(value.replies)&&value.replies.length)return value.replies.map(function(item,index){return {id:'reply_'+(index+1),index:index,type:'reply',payload:clone(item)};});
if(Array.isArray(value.posts)&&value.posts.length)return value.posts.map(function(item,index){return {id:'post_'+(index+1),index:index,type:'post',payload:clone(item)};});
return [];
}

function Timeline(scene){
this.scene=clone(scene||{});
this.events=eventsFromScene(this.scene);
this.index=-1;
this.listeners=[];
}
Timeline.prototype.on=function(listener){if(typeof listener==='function')this.listeners.push(listener);return this;};
Timeline.prototype.emit=function(){var self=this;this.listeners.forEach(function(listener){listener(self.snapshot());});};
Timeline.prototype.snapshot=function(){return {index:this.index,total:this.events.length,current:this.current(),progress:this.progress()};};
Timeline.prototype.current=function(){return this.index>=0?clone(this.events[this.index]):null;};
Timeline.prototype.progress=function(){return this.events.length?((this.index+1)/this.events.length):0;};
Timeline.prototype.seek=function(index){this.index=Math.max(-1,Math.min(this.events.length-1,Number(index)||0));this.emit();return this.snapshot();};
Timeline.prototype.next=function(){return this.seek(this.index+1);};
Timeline.prototype.previous=function(){return this.seek(this.index-1);};
Timeline.prototype.reset=function(){return this.seek(-1);};
Timeline.prototype.hasNext=function(){return this.index<this.events.length-1;};
Timeline.fromScene=function(scene){return new Timeline(scene);};
root.NaiComicTimeline=Timeline;
root.NaiComicTimeline.eventsFromScene=eventsFromScene;
})(typeof window!=='undefined'?window:globalThis);
