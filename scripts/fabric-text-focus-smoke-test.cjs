// fabric の編集用 textarea がスクロールを起こさないことを検証する。
// 画布の右/下に置いたテキストを編集すると、fabric は 1px の textarea を
// document 座標で body 直下に置き、focus() で document ごとスクロールして編集画面がずれた。
// 対策後は preventScroll 付き focus に差し替わり、スクロール位置は変わらない。
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js/core/util/fabric-text-focus.js'),'utf8');

const scrollRoot={scrollLeft:0,scrollTop:0};

// fabric 同様、initHiddenTextarea で作った textarea を
// enterEditing が focus() する。preventScroll 無しなら document がスクロールする。
function makePrototype(){
  return {
    initHiddenTextarea:function(){
      this.hiddenTextarea={
        tagName:'TEXTAREA',
        focusCalls:[],
        focus:function(options){
          this.focusCalls.push(options===undefined?null:options);
          if(!(options&&options.preventScroll))scrollRoot.scrollTop+=200;
        }
      };
    },
    // fabric の enterEditing 相当。textarea を focus する。
    enterEditing:function(){
      if(!this.hiddenTextarea)this.initHiddenTextarea();
      this.hiddenTextarea.focus();
    }
  };
}

const context={
  console,
  document:{scrollingElement:scrollRoot,documentElement:scrollRoot,body:scrollRoot}
};
context.window=context;
context.globalThis=context;
// 実際の fabric と同じ継承関係にする。
// initHiddenTextarea / enterEditing を持つのは IText だけで、
// Textbox は IText を、VerticalTextbox も IText を継承する。
const itextProto=makePrototype();
const textboxProto=Object.create(itextProto);
const textProto={};
textboxProto.initHiddenTextarea=undefined;
delete textboxProto.initHiddenTextarea;
context.fabric={
  Text:{prototype:textProto},
  IText:{prototype:itextProto},
  Textbox:{prototype:textboxProto}
};
// 実行ファイルと同じに IText を継承するクラスを作る。
context.fabric.VerticalTextbox={prototype:Object.create(context.fabric.IText.prototype)};
vm.createContext(context);
vm.runInContext(source,context,{filename:'fabric-text-focus.js'});

// --- パッチは入力を持つ IText に入り、Textbox はそれを継承する ---
assert.equal(context.fabric.IText.prototype.__naiFocusNoScrollPatched,true,'IText にパッチが入っていない');
assert.ok(context.fabric.Textbox.prototype.__naiFocusNoScrollPatched,
  'Textbox がパッチされた initHiddenTextarea を継承していない');
assert.ok(context.fabric.VerticalTextbox&&context.fabric.VerticalTextbox.prototype.__naiFocusNoScrollPatched,
  'VerticalTextbox が IText のパッチを継承していない');

// --- 編集開始で document がスクロールしない ---
['IText','Textbox','VerticalTextbox'].forEach(function(name){
  scrollRoot.scrollTop=0;
  scrollRoot.scrollLeft=0;
  var instance=Object.create(context.fabric[name].prototype);
  instance.enterEditing();
  assert.equal(scrollRoot.scrollTop,0,name+' で編集開始時にスクロールしている');
  var calls=instance.hiddenTextarea.focusCalls;
  assert.equal(calls.length,1,name+' で focus が呼ばれていない');
  assert.equal(calls[0]&&calls[0].preventScroll,true,name+' で preventScroll が付いていない');
});

// --- どのスクロール位置からでも動かない ---
[0,100,2000,5000].forEach(function(depth){
  scrollRoot.scrollTop=depth;
  var instance=Object.create(context.fabric.IText.prototype);
  instance.enterEditing();
  assert.equal(scrollRoot.scrollTop,depth,'scroll 位置 '+depth+' から動いた');
});

// --- 対策無しなら再現すること（テスト自体の妥当性） ---
(function(){
  var bare=makePrototype();
  var instance=Object.create(bare);
  scrollRoot.scrollTop=0;
  instance.enterEditing();
  assert.equal(scrollRoot.scrollTop,200,'パッチ無しで再現しないとテストが意味をなさない');
})();

// --- preventScroll を黙って無視する実装でもスクロールしない ---
(function(){
  // focus({preventScroll:true}) を投げずに、無視してスクロールする実装。
  var rude={};
  rude.initHiddenTextarea=function(){
    this.hiddenTextarea={
      tagName:'TEXTAREA',
      focus:function(options){
        // preventScroll を渡されても無視する（例外は投げない）。
        scrollRoot.scrollTop+=200;
        scrollRoot.scrollLeft+=37;
      }
    };
  };
  // initHiddenTextarea を持つプロトタイプには enterEditing も自前で要る。
  rude.enterEditing=function(){
    if(!this.hiddenTextarea)this.initHiddenTextarea();
    this.hiddenTextarea.focus();
  };
  var api={IText:{prototype:rude},Text:{prototype:{}}};
  context.NaiFabricTextFocus.install(api);
  scrollRoot.scrollTop=500;
  scrollRoot.scrollLeft=80;
  var instance=Object.create(rude);
  instance.enterEditing();
  assert.equal(scrollRoot.scrollTop,500,'preventScroll 無視実装で縦スクロールが戻っていない');
  assert.equal(scrollRoot.scrollLeft,80,'preventScroll 無視実装で横スクロールが戻っていない');
})();

// --- 二重パッチしない ---
scrollRoot.scrollTop=0;
var proto=context.fabric.IText.prototype;
var beforeFn=proto.initHiddenTextarea;
context.NaiFabricTextFocus.install(context.fabric);
assert.equal(proto.initHiddenTextarea,beforeFn,'再実行で initHiddenTextarea が二重ラップされた');
var once=Object.create(proto);
once.enterEditing();
assert.equal(scrollRoot.scrollTop,0,'再実行後にスクロールした');

// --- index.html から fabric 直後・defer 無しで読まれる ---
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(html.includes('js/core/util/fabric-text-focus.js'),'index.html から読まれていない');
const fabricIdx=html.indexOf('third/Fabric.js/fabric.min_PlusEraser.js');
const patchIdx=html.indexOf('js/core/util/fabric-text-focus.js');
assert.ok(fabricIdx>=0&&patchIdx>fabricIdx,'fabric より後に読まないとパッチできない');
const tagStart=html.lastIndexOf('<script',patchIdx);
const tagEnd=html.indexOf('>',tagStart);
assert.ok(!html.slice(tagStart,tagEnd).includes('defer'),'defer 付きだと順序がずれる');
console.log('fabric text focus smoke test passed');
