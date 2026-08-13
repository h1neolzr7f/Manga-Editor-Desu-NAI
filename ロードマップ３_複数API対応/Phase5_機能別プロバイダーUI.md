# Phase5: 機能別プロバイダー割り当てUI

## 概要
Phase1〜4で追加したプロバイダーを、機能（Role）ごとに個別に割り当てられるUIを提供する。

## 現在の動作（Phase1時点）
- 全機能が1つのアクティブプロバイダーを使う
- サイドバーのボタンでComfyUI/WebUIを切り替え

## 目標とする動作
```
T2I      → [Fal.ai (flux-pro)]
I2I      → [RunPod ComfyUI]
Inpaint  → [ローカルComfyUI]
Upscale  → [Fal.ai (creative-upscaler)]
RemoveBG → [ローカルComfyUI]
```
のように、機能ごとに異なるプロバイダーを設定可能にする。

## 実装タスク

### 1. provider-registry.jsの拡張
- `roleToProviderId`マッピングを追加
- `setProviderForRole(role, providerId)` 関数追加
- `getProviderForRole(role)` を拡張:
  - まずroleToProviderIdを確認
  - なければアクティブプロバイダーにフォールバック
- 設定の保存/読込対応

### 2. 設定UI
- 設定ドロップダウンまたは専用パネルに配置
- 各Roleに対してドロップダウンでプロバイダー選択
  - 選択肢: そのRoleをサポートするプロバイダーのみ表示
  - 「デフォルト（アクティブに従う）」オプション
- 変更時に即座にproviderRegistryに反映

### 3. ai-management.jsの更新
- `T2I()`等で`providerRegistry.getProviderForRole(role)`を使う
- アクティブプロバイダーではなくRole別プロバイダーから取得
- 対応プロバイダーが未設定の場合はアクティブにフォールバック

### 4. 設定保存
- SETTINGS_SCHEMAに各Roleのプロバイダー設定を追加
- localStorageに保存/読込

### 5. hasRole()の更新
- ai-roles.jsの`hasRole()`をproviderRegistryベースに変更
- Role別プロバイダーが設定されていればそちらを参照

## UIイメージ
```
┌─ プロバイダー割り当て ─────────────┐
│ T2I:     [ローカルComfyUI    ▼] │
│ I2I:     [デフォルト          ▼] │
│ Inpaint: [ローカルComfyUI    ▼] │
│ Upscale: [Fal.ai            ▼] │
│ RemoveBG:[デフォルト          ▼] │
│ Angle:   [ローカルComfyUI    ▼] │
└──────────────────────────────────┘
```

## 注意点
- 初期状態は全て「デフォルト」（既存動作と同じ）
- プロバイダーが未接続の場合のエラーハンドリング
- プロバイダー切替時にワークフローエディタの表示も連動させる
