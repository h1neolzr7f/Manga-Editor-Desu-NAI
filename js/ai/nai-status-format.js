/* Human-readable NovelAI subscription status for the "检查 NAI" toast.
 * NovelAI's perks.unlimitedImageGeneration is false even for Opus, whose small
 * generations (<=1024x1024 px, <=28 steps, 1 image) are nevertheless free; showing
 * "无限生图：否" made users think every generation costs Anlas. */
(function(root){
  'use strict';
  function freeQuotaLine(json){
    json=json||{};
    if(!json.active)return '免费生图：不可用（订阅未激活，生图会消耗 Anlas 或失败）';
    if(Number(json.tier)>=3)return '免费生图：可用（Opus：≤1024×1024 像素、≤28 步、单张时不扣 Anlas；本程序默认按此限制发送）';
    return '免费生图：不可用（当前套餐生图会消耗 Anlas）';
  }
  function statusLines(json){
    json=json||{};
    return [
      '订阅：'+(json.active?'已激活':'未激活'),
      '会员层级：'+(json.tier===undefined||json.tier===null?'未知':json.tier),
      freeQuotaLine(json),
      'Anlas 余额：'+(json.anlas===undefined||json.anlas===null?'未知':json.anlas),
      '代理：'+(json.proxy||'未使用'),
      '安全请求：samples=1，总像素≤1024×1024，步数≤28，队列并发=1'
    ];
  }
  root.NaiStatusFormat={freeQuotaLine,statusLines};
})(typeof window!=='undefined'?window:globalThis);
