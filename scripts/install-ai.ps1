<#
  安装本机 AI 功能（Windows，仅 CPU）到项目目录下的 .venv。可重复运行。
  不需要本机 AI 时不用装：编辑器、GPT 改图、NovelAI 都能直接用。
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Root

function Find-Python {
    foreach ($c in @((Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"),
                     (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"),
                     (Join-Path $env:LOCALAPPDATA "Programs\Python\Python311\python.exe"))) {
        if (Test-Path -LiteralPath $c) { return $c }
    }
    try { $p = & py -3 -c "import sys; print(sys.executable)" 2>$null; if ($p) { return $p.Trim() } } catch {}
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source -notmatch 'WindowsApps') { return $cmd.Source }
    return $null
}

$Py = Find-Python
if (-not $Py) {
    Write-Host "没有找到 Python 3.10+。请从 https://www.python.org/downloads/windows/ 安装（勾选 Add python.exe to PATH），再双击本文件。" -ForegroundColor Red
    exit 1
}
& $Py -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if ($LASTEXITCODE -ne 0) { Write-Host "Python 版本太旧，需要 3.10 以上。" -ForegroundColor Red; exit 1 }

$VenvPy = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $VenvPy)) { & $Py -m venv (Join-Path $Root ".venv") }
# 不 activate：直接用 .venv 里的 python.exe，避开 PowerShell 执行策略问题
& $VenvPy -m pip install -U pip wheel
Write-Host "== 1/3 PyTorch（CPU 版，约 200MB；不下载几 GB 的 CUDA 版）" -ForegroundColor Cyan
& $VenvPy -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "== 2/3 AI 依赖" -ForegroundColor Cyan
& $VenvPy -m pip install -r (Join-Path $Root "requirements-ai.txt")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "== 3/3 LaMa + SAM 2" -ForegroundColor Cyan
$env:SAM2_BUILD_CUDA = "0"
& $VenvPy -m pip install --no-deps simple-lama-inpainting "sam2>=1.0"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Get-Command tesseract -ErrorAction SilentlyContinue) -and -not (Test-Path "C:\Program Files\Tesseract-OCR\tesseract.exe")) {
    Write-Host ""
    Write-Host "还差 Tesseract（文字识别）：在 PowerShell 运行" -ForegroundColor Yellow
    Write-Host "  winget install UB-Mannheim.TesseractOCR" -ForegroundColor Yellow
    Write-Host "安装时在 Additional language data 里勾选 Japanese、Japanese (vertical)、Chinese (Simplified)。"
}
Write-Host ""
Write-Host "完成。双击「一键启动.bat」即可；各模型第一次用到时确认后才下载。" -ForegroundColor Green
