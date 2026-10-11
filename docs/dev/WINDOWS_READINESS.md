# Windows 就绪情况（静态审查，**尚未在真实 Windows 上验证**）

2026-10-11，没有可用的 Windows 机器；以下结论来自代码审查 + GitHub Actions `windows-latest` 的离线检查（`.github/workflows/windows-checks.yml`）。

| 项目 | 结论 | 处理 |
|---|---|---|
| 启动器 `一键启动.bat` → `scripts/windows/start_manga_editor_nai.bat` → `scripts/windows/start_manga_editor_nai.ps1` | bat 只含 ASCII（避免 chcp 后 cmd 按错位字节读中文）；ps1 带 UTF-8 BOM（Windows PowerShell 5.1 必须）；`-ExecutionPolicy Bypass`；8000 端口被占用时给出占用进程且不误杀；Job Object 保证关窗口即停服务 | 已有，审查通过 |
| 行尾 | `.gitattributes` 规定 bat/cmd/ps1/iss 为 CRLF；`git archive`（GitHub ZIP 下载）也遵循 | CI 解压 ZIP 逐个检查：不得有裸 LF |
| **两个 ps1 缺 BOM** | `scripts/prepare-installer.ps1`（含日文目录名字符串，PS 5.1 会读成乱码导致排除规则失效）、`scripts/make-one-click-zip.ps1` | **已补 BOM**；CI 检查所有 ps1 必须有 BOM |
| Python 定位 | 依次找 `.venv\Scripts\python.exe`（新增）→ 内置 runtime → `%LOCALAPPDATA%\Programs\Python\Python31x` → `py -3` → PATH（排除 WindowsApps 商店占位程序） | `.venv` 优先，便于本机 AI |
| venv 激活 | 不调用 `Activate.ps1`（会被执行策略拦），直接运行 `.venv\Scripts\python.exe` | `scripts/install-ai.ps1` |
| PyTorch | 从 CPU 源安装（约 200 MB，不下载数 GB 的 CUDA 版）；SAM 2 设 `SAM2_BUILD_CUDA=0` 不编译扩展 | `安装AI功能.bat` |
| Tesseract | 依次找 `TESSERACT_PATH`、PATH、`%ProgramFiles%\Tesseract-OCR\tesseract.exe`、`(x86)`；安装提示 `winget install UB-Mannheim.TesseractOCR` | 已有 + 安装脚本提示 |
| 路径分隔符 | 服务端全部用 `os.path.join`；静态文件过滤先把 `\` 转成 `/` 再判断 | 审查通过 |
| 文本编码 | 所有文本 `open()` 都显式 `encoding=`；子进程输出显式 UTF-8 | 补了 `tesseract --list-langs` 一处；CI 用 Windows 默认代码页（`PYTHONUTF8=0`）跑单测 |
| 只在 Linux 有的调用 | `malloc_trim`（glibc）包在 try 里，Windows 上安全跳过；没有 fcntl / fork / SIGKILL | 审查通过 |
| 长路径 | 模型缓存在 `user_data\models\<名字>`，最长约 90 字符；项目放在很深的目录（>150 字符）时 pip 可能失败 | 文档提示放在短路径（如 `D:\MangaEditor`） |
| 端口冲突 | 见上（启动器识别「本应用已在运行」与「其他程序占用」两种情况） | 已有 |

## CI 覆盖（windows-latest）

- `npm test`（全部 Node 单测与守卫，含隐私守卫）
- Python 编译 + 11 个服务端单测（无 Tesseract / 无模型时自动跳过相关用例）
- 所有 `.ps1` 用 PowerShell 解析器检查语法；ZIP 下载中的 bat/ps1 行尾与 BOM

## 未覆盖（需要真机）

真实双击启动、浏览器自动打开、窗口关闭停服务、本机 AI 模型下载与推理速度、杀毒软件拦截、中文用户名目录、Windows 7/8（不支持）。
