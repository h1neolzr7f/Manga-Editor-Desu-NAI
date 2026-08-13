// グローバルエラーハンドラ（未キャッチのエラーとPromise rejectionを検知）

window.onerror=function(message,source,lineno,colno,error){
errorHandlerLogger.error('Uncaught error:',message,'at',source+':'+lineno+':'+colno);
if(typeof createToastError==='function'){
createToastError('Error',String(message));
}
};

window.addEventListener('unhandledrejection',function(event){
var reason=event.reason;
var msg=(reason instanceof Error)?reason.message:String(reason);
errorHandlerLogger.error('Unhandled promise rejection:',msg);
if(typeof createToastError==='function'){
createToastError('Promise Error',msg);
}
});
