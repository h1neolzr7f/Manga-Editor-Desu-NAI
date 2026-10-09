/* Private, browser-local character reference cards.
 * IndexedDB persists cross-page on this origin; nothing syncs to a cloud service.
 * Export/import is user-initiated and never includes provider tokens.
 */
(function () {
  'use strict';
  const core=window.MangaCharacterBibleCore;
  if(!core)return;
  const DATABASE='manga-nai-character-bible',STORE='characters';
  const $=id=>document.getElementById(id);
  const elem=(tag,txt)=>{
    const node=document.createElement(tag);
    if(txt!==undefined)node.textContent=txt;
    return node;
  };
  let databasePromise, cards=[];
  function openDatabase(){
    if(!databasePromise)databasePromise=new Promise((resolve,reject)=>{
      if(!window.indexedDB)return reject(new Error('当前浏览器不支持 IndexedDB，无法持久保存角色资料。'));
      const request=indexedDB.open(DATABASE,1);
      request.onupgradeneeded=()=>{
        if(!request.result.objectStoreNames.contains(STORE))
          request.result.createObjectStore(STORE,{keyPath:'id'});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(new Error('无法打开本地角色档案数据库。'));
    }).catch(e=>{databasePromise=null;throw e;});
    return databasePromise;
  }
  async function transact(mode,perform){
    const db=await openDatabase();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,mode);
      const store=tx.objectStore(STORE);
      const task=perform(store);
      let result;
      if(task) {
        task.onsuccess=()=>{result=task.result;};
        task.onerror=()=>reject(new Error('浏览器本地角色档案读写失败。'));
      }
      tx.oncomplete=()=>resolve(result);
      tx.onerror=()=>reject(new Error('角色档案保存失败，可能是浏览器存储空间不足。'));
      tx.onabort=()=>reject(new Error('角色档案保存中断。'));
    });
  }
  const readAll=async()=>await transact('readonly',store=>store.getAll());
  const writeCard=async card=>await transact('readwrite',store=>store.put(card));
  const deleteCard=async id=>await transact('readwrite',store=>store.delete(id));
  function message(str,error){
    const n=$('mangaCharacterStatus');
    if(n){n.textContent=str;n.dataset.error=error?'true':'false';}
  }
  function loadImage(file){
    return new Promise((resolve,reject)=>{
      if(!file || !['image/png','image/jpeg','image/webp'].includes(file.type)||
        file.size>8*1024*1024 || file.size<10)
        return reject(new Error('参考图需要是 8MB 以内的 PNG、JPEG 或 WebP。'));
      const url=URL.createObjectURL(file);
      const image=new Image();
      image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
      image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('参考图无法解码。'));};
      image.src=url;
    });
  }
  async function optimizedReference(file){
    const img=await loadImage(file);
    if(!img.width||!img.height||img.width*img.height>25000000)
      throw Error('参考图像素过大，请换用 2500 万像素以内的图片。');
    const scale=Math.min(1,1024/Math.max(img.width,img.height));
    const cv=document.createElement('canvas');
    cv.width=Math.max(1,Math.round(img.width*scale));
    cv.height=Math.max(1,Math.round(img.height*scale));
    const ctx=cv.getContext('2d');
    // Portable JPEG with a neutral background to keep IndexedDB images compact.
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cv.width,cv.height);
    ctx.drawImage(img,0,0,cv.width,cv.height);
    const data=cv.toDataURL('image/jpeg',.89);
    if(!core.validReference(data))
      throw Error('压缩后的图片仍超过存储上限。请使用更小的图片。');
    return data;
  }
  async function refresh(){
    cards=(await readAll()).map(core.normalize)
      .sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
    const list=$('mangaCharacterCards');
    if(!list)return;
    list.replaceChildren();
    if(!cards.length){
      list.append(elem('p','还没有角色卡。添加姓名与参考图片，即可在不同分镜反复调用。'));
    }
    for(const card of cards){
      const row=elem('article');row.className='manga-character-card';
      const image=elem('img');image.src=card.references[0];image.alt=card.name+' 参考图';image.loading='lazy';
      const info=elem('div');info.className='manga-character-info';
      const name=elem('strong',card.name);
      const traits=elem('small',card.traits||'尚未填写外观锚点');
      const action=elem('div');action.className='manga-character-actions';
      const use=elem('button','用于 GPT 改图');use.type='button';
      use.addEventListener('click',()=>{
        const editor=window.MangaGPTRegionEditor;
        if(!editor || typeof editor.useCharacterCard!=='function'||!editor.useCharacterCard(card))
          return message('GPT 改图模块尚未准备好。',true);
        $('mangaCharacterPanel').hidden=true;
        message('已送入 GPT 改图，参考图与外观锚点已填好；仍需手动选择区域、生成并检查结果。');
      });
      const remove=elem('button','删除');remove.type='button';
      remove.addEventListener('click',async()=>{
        if(!confirm('确定删除角色卡「'+card.name+'」？此操作不会删除原图。'))return;
        try{await deleteCard(card.id);await refresh();message('角色资料已从本机删除。');}
        catch(e){message(e.message,true);}
      });
      action.append(use,remove);
      info.append(name,traits,action);row.append(image,info);list.append(row);
    }
  }
  function identifier(){
    if(typeof crypto!=='undefined'&&crypto.randomUUID)return 'role_'+crypto.randomUUID().replace(/-/g,'');
    return 'role_'+Date.now().toString(36)+Math.random().toString(36).slice(2);
  }
  async function save(){
    const button=$('mangaCharacterSave');
    button.disabled=true;
    try {
      const files=Array.from($('mangaCharacterPhotos').files||[]);
      if(!files.length || files.length>3)throw Error('请选择 1～3 张角色参考图。');
      const name=$('mangaCharacterName').value;
      const refs=await Promise.all(files.map(optimizedReference));
      const card=core.normalize({
        id:identifier(),name,traits:$('mangaCharacterTraits').value,
        notes:$('mangaCharacterNotes').value,references:refs
      });
      const all=await readAll();
      if(all.length>=core.MAX_CARDS)throw Error('角色卡最多 24 个，可以先导出备份再删除旧卡。');
      await writeCard(card);
      $('mangaCharacterName').value='';
      $('mangaCharacterTraits').value='';
      $('mangaCharacterNotes').value='';
      $('mangaCharacterPhotos').value='';
      await refresh();
      message('角色「'+card.name+'」已保存在本机浏览器。可跨分镜复用。');
    }catch(e){message(e.message||String(e),true);}
    finally{button.disabled=false;}
  }
  function exportCards(){
    try{
      const data=JSON.stringify(core.toDocument(cards),null,2);
      const blob=new Blob([data],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=elem('a');a.href=url;a.download='manga-character-bible.json';
      document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      message('已导出角色卡和参考图片，不包含 API Key。此文件含角色图片，请注意保管。');
    }catch(e){message(e.message,true);}
  }
  async function importCards(){
    const file=$('mangaCharacterImport').files[0];
    if(!file)return;
    $('mangaCharacterImport').value='';
    try{
      if(file.size>55*1024*1024)throw Error('角色档案文件超过 55MB 上限。');
      const items=core.fromDocument(JSON.parse(await file.text()));
      const old=await readAll();
      const ids=new Set(old.map(x=>x.id));
      const next=items.filter(x=>!ids.has(x.id));
      if(old.length+next.length>core.MAX_CARDS)throw Error('导入后超过 24 个角色卡上限。');
      const db=await openDatabase();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        const store=tx.objectStore(STORE);
        for(const card of next)store.put(card);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(new Error('导入角色卡失败，存储空间可能不足。'));
        tx.onabort=()=>reject(new Error('导入角色卡失败。'));
      });
      await refresh();
      message('导入 '+next.length+' 个角色卡；已有相同 ID 的角色已跳过。');
    }catch(e){message(e.message||String(e),true);}
  }
  function render(){
    if($('mangaCharacterPanel'))return;
    const header=document.querySelector('#canvas-area .area-header');
    if(!header)return;
    const open=elem('button','角色档案');
    open.id='mangaCharacterOpen';open.type='button';header.append(open);
    const panel=elem('section');panel.className='manga-character-panel';panel.id='mangaCharacterPanel';panel.hidden=true;
    const heading=elem('header');
    const h=elem('strong','角色档案 · Character Bible');
    const close=elem('button','×');close.id='mangaCharacterClose';close.type='button';
    heading.append(h,close);
    const intro=elem('p','本地保存角色参考图和外观描述，跨分镜复用；不会自动识别人物，也不会自动调用 GPT。');
    const name=elem('input');name.id='mangaCharacterName';name.maxLength=80;name.placeholder='角色姓名（必填）';
    const traits=elem('textarea');traits.id='mangaCharacterTraits';traits.maxLength=1200;traits.rows=3;
    traits.placeholder='可辨识特征：发色、眼睛、发饰、服装等';
    const notes=elem('textarea');notes.id='mangaCharacterNotes';notes.maxLength=500;notes.rows=2;
    notes.placeholder='补充参考信息（可选）';
    const photos=elem('input');photos.id='mangaCharacterPhotos';photos.type='file';
    photos.multiple=true;photos.accept='image/png,image/jpeg,image/webp';
    const photosLabel=elem('label','参考图（1～3 张，可本地压缩到最长边 1024px）');
    photosLabel.append(photos);
    const save=elem('button','保存角色档案');save.type='button';save.id='mangaCharacterSave';
    const list=elem('div');list.id='mangaCharacterCards';list.className='manga-character-cards';
    const actions=elem('div');actions.className='manga-character-actions';
    const backup=elem('button','导出 JSON');backup.type='button';backup.id='mangaCharacterExport';
    const upload=elem('input');upload.id='mangaCharacterImport';upload.type='file';upload.accept='application/json,.json';
    actions.append(backup,upload);
    const status=elem('p');status.id='mangaCharacterStatus';status.setAttribute('role','status');
    panel.append(heading,intro,name,traits,notes,photosLabel,save,list,actions,status);
    document.body.append(panel);
    open.addEventListener('click',()=>{
      panel.hidden=!panel.hidden;
      if(!panel.hidden)refresh().catch(e=>message(e.message,true));
    });
    close.addEventListener('click',()=>{panel.hidden=true;});
    save.addEventListener('click',save);
    backup.addEventListener('click',exportCards);
    upload.addEventListener('change',importCards);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);
  else render();
  window.MangaCharacterBibleUI={
    open:()=>{if($('mangaCharacterPanel')){$('mangaCharacterPanel').hidden=false;return refresh();}},
    list:()=>cards.map(c=>({id:c.id,name:c.name,traits:c.traits,referenceCount:c.references.length}))
  };
})();
