# バックエンドとオフライン動作

「本機サービスを止めたのにページが普通に開く」という疑問の答え。
**残留プロセスではなく、Service Worker のキャッシュ（設計どおり）**。

## まず結論

- バックエンドを止めてもページが開くのは、`service-worker.js` が `index.html` と js/css を
  キャッシュしているから。オフライン/PWA 用の意図した動作であって、プロセスの取りこぼしではない。
- 本機サービスが無いことの確認方法:
  - `Get-NetTCPConnection -LocalPort 8000 -State Listen` → 何も出なければリスナー無し
  - `Get-CimInstance Win32_Process -Filter "Name like '%python%'"` → 本プロジェクトの python が居ないこと
    （ComfyUI 本体の `python_embeded\python.exe` は別物）
  - `Invoke-WebRequest http://127.0.0.1:8000/index.html` → 「无法连接到远程服务器」で正常

## バックエンド構成

フレームワーク無し。**Python 標準ライブラリだけ**の HTTP サーバーが 2 つ。

| プロセス | 待ち受け | 役割 | 必須か |
|---------|---------|------|-------|
| `99_server.py` | `127.0.0.1:8000`（`NAI_BIND` で変更可、799-800行） | 静的配信 + AI プロキシ | 起動時に必須 |
| `local_tools/server.py` | `127.0.0.1:8765`（`LOCAL_TOOLS_PORT` で変更可） | 背景除去 sidecar | 任意。無くても本体は動く |

### `99_server.py`

- `CORSRequestHandler`（393行、`SimpleHTTPRequestHandler` 派生）を `ThreadedTCPServer`（791行、
  `daemon_threads` / `allow_reuse_address` / `request_queue_size=500`）で回す。
- `self.directory = os.getcwd()`。つまり**リポジトリのルートがそのまま web root**。
  ランチャーが `Set-Location $Root` してから起動するので、カレントを変えて起動してはいけない。
- 静的配信の拒否リストは `is_blocked_static_path`（211行）。`.env` / `.git` / `credentials.json` /
  `*.pem` / `*.key` / ドット始まりのパスを弾く。
- `end_headers`（401行）が全応答に `Cache-Control: no-store, no-cache, must-revalidate` と
  `Service-Worker-Allowed: /` を付ける。
- JSON 応答は `_send_json`（418行）。CORS は `cors_allow_origin`（229行）が
  `127.0.0.1` / `localhost` / `::1` の Origin だけ許可する。
- `NAI_QUIET=1` のときだけアクセスログを黙る（27行 `QUIET_REQUESTS`）。ランチャーが付ける。

#### ルート一覧

GET:

| パス | 実装 | 用途 |
|------|------|------|
| `/nai-proxy/health` | `do_GET`（693行） | トークン検証と課金状態 |
| `/nai-proxy/safe-status` | `do_GET` | 同上（UI 表示用） |
| `/nai-proxy/suggest-tags` | `do_GET` | タグ提案 |
| `/director-proxy/models` | `_proxy_director_models`（577行） | 导演モデル一覧（失敗時は内蔵フォールバック一覧） |
| `/nai-tools/job` | `do_GET` | `TOOL_JOBS` の進捗取得 |
| `/nai-tools/missing-material-previews` | `do_GET` | 素材プレビューの欠落確認 |

POST:

| パス | 実装 | 用途 |
|------|------|------|
| `/nai-proxy/generate-image` | `_proxy_novelai`（458行） | 出図 |
| `/director-proxy/chat-completions` | `_proxy_director`（495行） | 导演（tokendance ゲートウェイ） |
| `/tagger-proxy/interrogate` | `_proxy_tagger`（542行） | タガー |
| `/nai-tools/start-material-previews` | `_start_tool_job`（322行）→ `run_job`（334行） | 素材プレビュー生成ジョブ |
| `/nai-tools/start-comic-demo` | 同上 | 5ページ漫画サンプル生成ジョブ |
| `/user-assets` | `save_imported_asset`（176行） | 取り込んだ素材の保存（上限 8MB） |

上記以外は静的ファイルとして処理され、`do_GET` の末尾で
`SimpleHTTPRequestHandler.do_GET` に委譲される。

#### プロキシの性格

- NovelAI へは `_browser_headers` でブラウザ偽装ヘッダ（`User-Agent` / `Origin: https://novelai.net` /
  `Referer`）を付けて転送する。素の `urllib` では弾かれるため。
- プロキシ解決順は `_get_proxy_url`: `HTTPS_PROXY` / `HTTP_PROXY` → Windows の
  「インターネットオプション」(`winreg`) → ローカルの定番ポート（7897, 7890, 10809, 10808, 1080）。
- ランチャーは `NO_PROXY=127.0.0.1,localhost,::1` を設定して、自分自身への通信が
  プロキシに吸われないようにする。

## フロントエンドがバックエンドを必要とする箇所

**画布・レイヤー・テキスト・分割・書き出し・プロジェクト保存はすべてブラウザ内で完結する。**
`js/project-management.js` は `fetch` を一切使わない（保存は IndexedDB / localforage）。

バックエンドが要るのは AI 系だけ:

| 参照元 | 内容 |
|-------|------|
| `js/ai/ai-settings.js:22` `getDirectorProxyBaseUrl()` / `:263` `getToolBaseUrl()` | 既定は `window.location.origin`。`file://` のときだけ `http://127.0.0.1:8000` |
| `js/ai/provider/novelai-provider.js:19` `_proxyBaseUrl()` | 同上 |
| `js/ai/prompt/novelai-composition-director.js:683` | `file://` 以外は `origin` 基準 |
| `js/local-tools/local-tools-client.js:4` `DEFAULT_BASE_URL` | `http://127.0.0.1:8765` |

`novelaiUseLocalProxy` は**既定で ON**（`index.html:2362` で `checked`、
`js/project-management.js:205` で `default:true`）。したがって出図は既定で本機プロキシ経由になる。
バックエンドを止めると AI 系だけが落ちる（fetch がネットワークエラー）、という挙動はここから来ている。

AI 以外でネットワークに触るのは以下だけ。いずれも本機サービスを必要としない:

| 箇所 | 内容 | 停止時の挙動 |
|------|------|-------------|
| `js/assets/asset-store.js:148` | 取り込んだ素材を `/user-assets` へ保存 | `catch` で握って空文字を返す。IndexedDB（`asset-blob-store`）側は成功するので取り込み自体は継続 |
| `js/assets/github-free-pack.js:4` `MANIFEST_PATH` | 同梱パックの manifest は `assets/public/...` の**相対パス** | サーバー停止時は取得不可 |
| `js/core/svg/google-icon-helper.js:32` | Google Fonts からアイコン SVG を取得 | 失敗時は `data-fallback-icon` 付きのインライン SVG を返す |

`js/core/util/load-util.js:53` などの `fetch` は `blob:` / 同一生成元の読み込み用で、外部依存は無い。

## オフラインで開ける理由（Service Worker）

- 登録は `js/core/service/worker-register.js:36`。`isPWAEligible()` は
  `127.0.0.1` / `localhost` の `http:` を secure context 扱いで許可する。
- `service-worker.js:2` の `CACHE_VERSION='manga-editor-v8-17-custom-page-panel'`。
  html/js/css/画像/フォント（`STATIC_EXTENSIONS`）は **network-first** で、
  **取得に失敗したときだけ `caches.match` でキャッシュにフォールバック**する。
  キャッシュ名を変えると `activate` で古いキャッシュが消える。
- つまりサービスを止めても、URL が同じなら `index.html` と js/css がキャッシュから返り、
  ページは完全に開く。PWA インストールボタン（`pwa-install-button`）のための**意図した動作**。

### 注意点

- サーバーを止めた状態で `index.html` を編集すると、**古いキャッシュが開く**ことがある。
  サーバーが動いていれば静的配信は network-first なので影響しない。
  JS/CSS を編集したら `?v=` を上げる運用（`llm_doc/index/load-order.md`）はこのキャッシュ対策でもある。
- キャッシュの消し方: DevTools → Application → Storage → Clear site data、
  または Application → Service Workers → Unregister。
  `clearCache()`（`js/core/service/worker-register.js:61`）は定義されているが UI からは呼ばれていない。

## 既知の問題: 背景除去 sidecar が起動しない

- `local_tools/server.py:11` が `import cgi` している。**`cgi` は Python 3.13 で削除済み**。
  手元の Python 3.14.7 では `ModuleNotFoundError: No module named 'cgi'` になる。
- ランチャーは失敗を握りつぶさず「抠图服务：没能启动，抠图/去背景不可用（其余功能正常）」と出し、
  詳細を `user_data/local_tools.err.log` に落とす。**本体機能には影響しない。**
- 直すなら `cgi.FieldStorage` を `email.parser` などに置き換える。
  対象は `_read_form`（108行）/ `_file_field`（121行）/ `_options_from_form`（136行）。

## 停止方法

- 正常系: 「一键启动.bat」のウィンドウを閉じる。子 python は Windows Job Object
  （`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`）で一緒に落ち、ポート 8000 も解放される。
- 残留した場合: `user_data/start.log` の PID、または
  `Get-NetTCPConnection -LocalPort 8000 -State Listen` の `OwningProcess` を見て
  `taskkill /PID <pid> /T /F`。
- 8000 が既に本機サービスなら、ランチャーはブラウザだけ開いて他人のプロセスは殺さない。
