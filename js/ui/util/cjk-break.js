/* exported CjkBreak */
// Kinsoku line breaking for short CJK dialogue: closing punctuation (。，！？…」 etc.) never starts a line
// and opening brackets never end one. Lines are balanced to about perLine glyphs.
var CjkBreak=(function(){
var NO_START='，。、．,.！？!?…‥：；:;」』）)】〉》〕］]}〟’”ー～〜ゝゞ々ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ';
var NO_END='「『（(【〈《〔［[{〝‘“';
function glyphs(s){return Array.from(String(s||''));}
function breakLines(text,perLine){
var g=glyphs(text).filter(function(c){return c!=='\n';});
var n=Math.max(1,Math.floor(perLine)||1);
if(g.length<=n)return [g.join('')];
var lines=Math.ceil(g.length/n),target=Math.ceil(g.length/lines),out=[],cur=[];
for(var i=0;i<g.length;i++){
cur.push(g[i]);
var left=g.length-i-1;
if(cur.length>=target&&left>0){
// pull following no-start glyphs onto this line (handles "……", "！？")
while(i+1<g.length&&NO_START.indexOf(g[i+1])>=0){cur.push(g[++i]);}
// never end a line with an opening bracket
while(cur.length>1&&NO_END.indexOf(cur[cur.length-1])>=0){cur.pop();i--;}
if(i<g.length-1){out.push(cur.join(''));cur=[];}
}
}
if(cur.length)out.push(cur.join(''));
return out;
}
return {breakLines:breakLines,NO_START:NO_START,NO_END:NO_END};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CjkBreak;
if(typeof window!=='undefined')window.CjkBreak=CjkBreak;
