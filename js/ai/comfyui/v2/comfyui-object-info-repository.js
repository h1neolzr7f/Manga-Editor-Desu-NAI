var comfyObjectInfoRepoProto={
async saveObjectInfo(objectInfo) {
if (!objectInfo||Object.keys(objectInfo).length===0) {
comfyuiLogger.error("有効なObjectInfoが指定されていません");
return false;
}

try {
await this.store.setItem("latestObjectInfo",{
data: objectInfo,
updatedAt: new Date().toISOString(),
});
return true;
} catch (error) {
comfyuiLogger.error("ObjectInfoの保存に失敗しました:",error);
return false;
}
},

async getObjectInfo() {
try {
const result=await this.store.getItem("latestObjectInfo");
return result ? result.data : null;
} catch (error) {
comfyuiLogger.error("ObjectInfoの取得に失敗しました:",error);
return null;
}
},

async getNodeNames() {
var data=await this.getObjectInfo();
return data ? Object.keys(data) : [];
},

async getLastUpdated() {
try {
const result=await this.store.getItem("latestObjectInfo");
return result ? result.updatedAt : null;
} catch (error) {
comfyuiLogger.error("最終更新日時の取得に失敗しました:",error);
return null;
}
},
};

function createComfyObjectInfoRepo(providerKey) {
var repo=Object.create(comfyObjectInfoRepoProto);
repo.store=localforage.createInstance({
name: "objectInfoStorage_"+providerKey,
storeName: "comfyObjectInfo",
});
return repo;
}

var comfyObjectInfoRepo_local=createComfyObjectInfoRepo('local');
var comfyObjectInfoRepo_runpod=createComfyObjectInfoRepo('runpod');
var comfyObjectInfoRepo=comfyObjectInfoRepo_local;
