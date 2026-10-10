/* exported currentKnifeLine, currentKnifeObject, knifeAssistAngle, knifeLineAnimationId, knifeLineDashOffset, startKnifeX, startKnifeY */
/**
 * knife-state.js
 * ナイフツールの状態管理
 */


// 後方互換性のためのグローバル変数（getter/setter経由）
var knifeAssistAngle=KNIFE_CONSTANTS.KNIFE_ASSIST_ANGLE;
var currentKnifeObject=null;
var currentKnifeLine=null;
var startKnifeX=0;
var startKnifeY=0;
var knifeLineAnimationId=null;
var knifeLineDashOffset=0;

