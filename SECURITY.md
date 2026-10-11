# 安全策略 / Security Policy

## 报告漏洞 / Reporting a vulnerability

请**不要**在公开 Issue 里贴漏洞细节、API Key 或 Token。请使用 GitHub 的 **Security → Report a vulnerability**（私密报告）。
Please do **not** post vulnerability details, API keys or tokens in public issues. Use GitHub **Security → Report a vulnerability** (private advisory).

我们会在 7 天内回复。/ We aim to respond within 7 days.

## 设计上的安全约定 / Security model

- 默认只监听 `127.0.0.1`（环境变量 `NAI_BIND` 可改，不建议），并拒绝非本机来源的连接；所有本机接口（OCR、LaMa、模型下载、GPT 代理）都做同源（Origin）检查，其他网页无法调用。
  Binds to `127.0.0.1` by default (`NAI_BIND` overrides; not recommended) and rejects non-loopback peers; every local endpoint checks the request Origin, so other websites cannot call it.
- API Key / Token 只保存在本机浏览器存储或本机 `.env`，不写进项目文件、日志或导出文件；GPT 代理只把 Key 转发给你设置的地址（服务器端 Key 只发往 `GPT_IMAGE_TRUSTED_BASE_URL`）。
  Keys stay in local browser storage or a local `.env`; they never go into project files, logs or exports. The proxy only forwards a server-side key to `GPT_IMAGE_TRUSTED_BASE_URL`.
- 模型只在你确认后下载，并校验 SHA-256。 / Models download only after you confirm, with SHA-256 verification.
- 静态文件服务拒绝 `.env`、`.git`、`*.key`、`*.pem` 等路径。 / The static server refuses `.env`, `.git`, `*.key`, `*.pem`, etc.

## 支持的版本 / Supported versions

只维护默认分支的最新版本。 / Only the latest default branch is supported.
