class TaskQueue {
constructor(concurrency) {
this.concurrency=concurrency;
this.queue=[];
this.activeCount=0;
this._nextItemId=0;
}

add(task) {
var itemId=++this._nextItemId;
var p=new Promise((resolve,reject)=>{
this.queue.push({
id:itemId,
execute:()=>task().then(resolve).catch(reject),
reject:reject
});
this.processQueue();
});
p._queueItemId=itemId;
return p;
}

removeItem(itemId) {
var idx=this.queue.findIndex(function(item){return item.id===itemId;});
if(idx===-1) return false;
var item=this.queue.splice(idx,1)[0];
try{
item.reject(new Error('Task cancelled'));
}catch(e){}
logger.debug("Queue item removed: "+itemId);
return true;
}

async processQueue() {
if (this.activeCount>=this.concurrency||this.queue.length===0) {
return;
}

const taskItem=this.queue.shift();
this.activeCount++;

try {
logger.debug("task is run.");
await taskItem.execute();
} catch (error) {
logger.error("Task error:",error);
} finally {
this.activeCount--;
this.processQueue();
}
}

getActiveCount() {
return this.activeCount;
}

getWaitingCount() {
return this.queue.length;
}

getTotalCount() {
return this.activeCount+this.queue.length;
}

getStatus() {
return {
active: this.getActiveCount(),
waiting: this.getWaitingCount(),
total: this.getTotalCount()
};
}

setConcurrency(n) {
this.concurrency=n;
this.processQueue();
}

clearQueue() {
const clearedCount=this.queue.length;
this.queue.forEach(taskItem=>{
try{
taskItem.reject(new Error('Queue cancelled'));
}catch(e){}
});
this.queue=[];
logger.debug(`Queue cleared: ${clearedCount} tasks removed`);
return clearedCount;
}
}
