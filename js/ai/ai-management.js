// AI機能の中央ルーター: プロバイダーレジストリ経由でディスパッチ
const novelaiQueue=new TaskQueue(1);

document.addEventListener('DOMContentLoaded',function(){
var naiConc=$('novelaiConcurrency');
if(naiConc){
naiConc.value=1;
novelaiQueue.setConcurrency(1);
}
});

if($('novelaiConcurrency'))$('novelaiConcurrency').addEventListener('change',function(){
this.value=1;
novelaiQueue.setConcurrency(1);
});

function existsWaitQueue() {
const novelaiQueueStatus=novelaiQueue.getStatus();
if(novelaiQueueStatus.total>0){
return true;
}
return false;
}

function clearAllQueues() {
const naiCleared=novelaiQueue.clearQueue();
logger.info(`All queues cleared: NovelAI=${naiCleared}`);
return naiCleared;
}


async function T2I(layer,spinner){
var provider=providerRegistry.getProviderForRole(AI_ROLES.Text2Image);
if(provider){
return provider.executeT2I(layer,spinner.id);
}
}
function I2I(layer,spinner){
var provider=providerRegistry.getProviderForRole(AI_ROLES.Image2Image);
if(provider){
return provider.executeI2I(layer,spinner.id);
}
}




function getInUseProviders(){
var assignments=providerRegistry.getAllRoleAssignments();
var ids={};
Object.keys(assignments).forEach(function(role){
var pid=assignments[role];
if(pid&&pid!=='default')ids[pid]=true;
});
var activeId=providerRegistry.getActiveId();
if(activeId)ids[activeId]=true;
return Object.keys(ids).map(function(id){
return providerRegistry.get(id);
}).filter(Boolean);
}

function renderProviderStatusChips(results){
var container=$('ExternalService_Heartbeat_Container');
if(!container)return;
container.innerHTML='';
results.forEach(function(r){
var chip=document.createElement('span');
chip.className='provider-status-chip';
var dot=document.createElement('span');
dot.className='provider-status-dot '+(r.online?'on':'off');
var text=document.createTextNode(r.name);
chip.appendChild(dot);
chip.appendChild(text);
container.appendChild(chip);
});
}

async function apiHeartbeat(){

logger.trace("apiHeartbeat");

const pingCheck=$('apiHeartbeatCheckbox');
if (pingCheck&&pingCheck.checked) {
} else {
return;
}

var providers=getInUseProviders();
var results=[];
for(var i=0;i<providers.length;i++){
var p=providers[i];
var online=false;
try{
online=await p.heartbeat();
}catch(e){
online=false;
}
results.push({id:p.id,name:p.name,online:!!online});
}
renderProviderStatusChips(results);

var announce=$('checSD_WebUI_Announce');
var anyOnline=results.some(function(r){return r.online;});
if(anyOnline&&announce){
announce.style.display='none';
}
}







