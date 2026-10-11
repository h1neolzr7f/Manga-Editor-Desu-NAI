/* exported unifiedSettingsWindow */
var unifiedSettingsWindow=(function(){
var overlayEl=null;
// Esc closes the window (it covers the whole editor; before this a beginner who pressed Esc stayed stuck)
function onKey(e){
if(e.key!=='Escape'||!overlayEl||!overlayEl.classList.contains('active'))return;
e.preventDefault();
close();
}
function open(){
if(!overlayEl)overlayEl=$('unifiedSettingsOverlay');
overlayEl.classList.add('active');
overlayEl.setAttribute('role','dialog');
overlayEl.setAttribute('aria-modal','true');
document.addEventListener('keydown',onKey);
if(typeof enforceNovelAIOnlyMode==='function'){
enforceNovelAIOnlyMode();
}
roleAssignmentUI.buildMatrix();
var novelaiProvider=providerRegistry.get('novelai');
if(novelaiProvider&&novelaiProvider.getApiKey()){
apiHeartbeat();
}
}
function close(){
if(!overlayEl)return;
overlayEl.classList.remove('active');
document.removeEventListener('keydown',onKey);
}
function apply(){
close();
}
function switchTab(idx){
var tabs=overlayEl.querySelectorAll('.us-tab');
var contents=overlayEl.querySelectorAll('.us-tab-content');
tabs.forEach(function(t,i){
t.classList.toggle('active',i===idx);
});
contents.forEach(function(c,i){
c.classList.toggle('active',i===idx);
});
}
return{
open:open,
close:close,
apply:apply,
switchTab:switchTab
};
})();
