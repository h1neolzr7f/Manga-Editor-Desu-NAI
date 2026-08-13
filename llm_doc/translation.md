# 翻訳の追加方法

## 基本
- `js/ui/third/i18next.js`の`const resources`に追加
- キー形式: `yyyyMMddHHmmss_SSS`
- 全8言語対応（ja, en, ko, fr, zh, ru, es, de）
- 新エントリは既存の上に配置
- 表示領域を考慮し短文推奨

## 書式
1行1エントリで記述する。

```javascript
// 良い例
"ja":{
"key1":"値1",
"key2":"値2"
}

// 悪い例
"ja":{"key1":"値1","key2":"値2"}
```
