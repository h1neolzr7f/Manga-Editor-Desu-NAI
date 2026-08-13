# 履歴管理と画像データ保存

## 履歴管理（Undo/Redo）
- 削除+追加を連続する場合、中間状態を履歴に残さない
- `changeDoNotSaveHistory()` / `changeDoSaveHistory()`で一時無効化
- 最終結果のみ`saveStateByManual()`で保存
### オブジェクト単位の履歴除外
`saveHistory`プロパティで個別オブジェクトを履歴保存から除外できる。

```javascript
setNotSave(obj)  // obj.saveHistory=false を設定
isSaveObject(event)  // saveHistory==falseなら保存スキップ
```

**除外されるオブジェクトの例:**
- 一時的なUI要素（初期メッセージテキスト）
- 吹き出しフリーハンド描画中の一時シェイプ・制御点
- コマ割り背景・プレースホルダー
- ナイフツールのアニメーション線
- AI処理中の一時クローンオブジェクト（c2c, inpaint等）

**関連プロパティ:**
| プロパティ | 用途 |
|-----------|------|
| `saveHistory=false` | 履歴保存から除外 |
| `excludeFromLayerPanel=true` | レイヤーパネルに非表示 |

**履歴を記録せずにadd/removeするヘルパー:**
```javascript
addByNotSave(obj)    // changeDoNotSave→add→changeDoSave
removeByNotSave(obj) // changeDoNotSave→remove→changeDoSave
```

### 例: オブジェクト置き換え
```javascript
changeDoNotSaveHistory();
canvas.remove(oldObject);
canvas.add(newObject);
changeDoSaveHistory();
saveStateByManual();
```

## 画像データ保存
- `imageMap`には`data:` URLまたはJSON文字列のみ保存
- `blob:` URLはセッション限りのため保存禁止
- 保存時`convertImageMapBlobUrls()`で`blob:`→`data:`に変換済み
- オブジェクト（2D配列等）は`JSON.stringify()`で文字列化して保存

## パラメータ保存

### ストレージ使い分け
| バックエンド | 用途 |
|-------------|------|
| `localStorage` | アプリ設定、basePrompt、サイドバーツール値（軽量・同期アクセス） |
| `localforage`(IndexedDB) | auto-save、フォント、ワークフロー、統計（大容量・非同期） |

### アプリ設定（project-management.js）
`localStorage`キー`localSettingsData`に全設定を一括JSON保存。

- `SETTINGS_SCHEMA` … UI要素IDとデフォルト値の定義（API URL、キャンバス、パネル色、吹き出し、テキスト等）
- `BASEPROMPT_SCHEMA` … AI生成パラメータ（prompt, negative, seed, cfg, width, height, sampler, steps, model, hr_*）
- `roleAssignments` … プロバイダのロール割り当て

```javascript
saveSettingsLocalStrage(silent)  // 全UIから値を収集→localStorage保存
loadSettingsLocalStrage()        // localStorage→UI要素に復元
```

### 設定の自動保存
`initSettingsAutoSave()`でUI要素のinput/changeイベントを監視。500msデバウンスで自動保存（`settingsAutoSaveCheckbox`がON時のみ）。

### サイドバーツール値（sidebar-ui.js）
localStorageキー別にMap保存。500msデバウンス。
- `sidebarValues` … 汎用ツール設定
- `penValues` … ブラシ設定
- `effectValues` … エフェクト設定

### AI生成パラメータの階層
1. **basePrompt**（グローバル）… `core/settings.js`にデフォルト定義。UI変更で即時反映（`base-event-listener.js`）
2. **per-layer**（オブジェクト属性）… `t2iInit`/`i2iInit`のデフォルト。`-2`=base使用、`-1`=base使用
3. **保存時** … `canvas.toJSON(commonProperties)`でオブジェクト属性としてシリアライズ

### commonProperties（settings.js）
`canvas.toJSON()`で保存されるカスタムプロパティ一覧:
- レイヤー制御: `excludeFromLayerPanel`, `isPanel`, `isIcon`, `customType`, `selectable`
- AI生成: `text2img_prompt`, `text2img_negative`, `text2img_seed`, `text2img_width`, `text2img_height`, `text2img_samplingMethod`, `text2img_samplingSteps`
- GUID連携: `guids`, `guid`, `canvasGuid`
- 吹き出し: `isSpeechBubble`, `speechBubbleGrid`, `speechBubbleScale`等
- 位置復元: `initial`, `clipPath.initial`, `baseScaleX`, `baseScaleY`, `lastLeft`, `lastTop`

### プロジェクトファイル（project-compression.js）
LZ4圧縮で以下を保存:
- `text2img_basePrompt.json` … basePromptのスナップショット
- `state_XXXXXX.json` … キャンバス状態（`customToJSON()`出力）
- `canvas_info.json` … キャンバスサイズ
- `HASH.img` … 画像データ（ハッシュで重複排除）
- `preview-image.jpeg` … プレビュー

### Simulator objects

- simulatorChat is a Fabric Group, not a flattened image.
- The parent stores simulatorScene as a JSON string plus simulatorTemplateId and schema version.
- The parent GUID and child simulatorParentGuid values use the existing GUID property mechanism.
- Insert, update and remove operations temporarily use changeDoNotSaveHistory() and register one final state with saveStateByManual().
- Image messages and avatars must be data URLs when persisted; blob URLs remain session-only.

### auto-save（auto-save.js）
`AutoSaveManager`がlocalforage(`autoSaveStorage`)に定期保存。
- デフォルト60秒間隔（10-600秒で設定可能）
- ページごとに圧縮blobとメタデータを保存
- 起動時に`checkRecovery()`で復旧ダイアログ表示

### その他のlocalforageストア
| インスタンス名 | 用途 |
|---------------|------|
| `fm-fontStorage` | ユーザーフォント（buffer, URL） |
| `workflowStorage` | ComfyUIカスタムワークフロー |
| `objectInfoStorage` | ComfyUIノード定義キャッシュ |
| `MangaEditor_Performance` | 生成時間統計 |
| `MangaEditor_PromptFrequency` | タグ頻度分析 |
