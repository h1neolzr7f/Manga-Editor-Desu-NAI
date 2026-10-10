/* exported loadImage, loadJS */
// ユーティリティ関数：エラーハンドリングとログ出力を行う

// JavaScript ファイルを読み込む関数
async function loadJS(filePath,appendTo='body') {
const script=document.createElement('script');
script.src=filePath;
script.type='text/javascript';
const target=appendTo==='head' ? document.head : document.body;
return new Promise((resolve,reject)=>{
script.onload=resolve;
script.onerror=reject;
target.appendChild(script);
});
}

// CSS ファイルを読み込む関数

// 画像を読み込む関数
async function loadImage(filePath,appendTo,altText='') {
const img=document.createElement('img');
img.src=filePath;
img.alt=altText;
return new Promise((resolve,reject)=>{
img.onload=()=>{
document.querySelector(appendTo).appendChild(img);
resolve();
};
img.onerror=reject;
});
}

// HTMLを読み込む関数

// 音声ファイルを読み込む関数

// 動画ファイルを読み込む関数
