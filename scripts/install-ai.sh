#!/usr/bin/env bash
# One-click install of the optional local AI features (Linux / macOS), CPU only, into ./.venv
# Usage: bash scripts/install-ai.sh        (re-running is safe)
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-python3}"
command -v "$PY" >/dev/null || { echo "需要 Python 3.10+（Need Python 3.10+）: https://www.python.org/downloads/"; exit 1; }
"$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' || { echo "Python 版本太旧，需要 3.10 以上"; exit 1; }
[ -x .venv/bin/python ] || "$PY" -m venv .venv
VPY=.venv/bin/python
"$VPY" -m pip install -U pip wheel
echo "== 1/3 PyTorch (CPU)"
if [ "$(uname -s)" = "Darwin" ]; then "$VPY" -m pip install torch torchvision
else "$VPY" -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu; fi
echo "== 2/3 AI 依赖"
"$VPY" -m pip install -r requirements-ai.txt
echo "== 3/3 LaMa + SAM 2"
SAM2_BUILD_CUDA=0 "$VPY" -m pip install --no-deps simple-lama-inpainting "sam2>=1.0"
if ! command -v tesseract >/dev/null; then
  echo
  echo "还差 Tesseract（文字识别）："
  if [ "$(uname -s)" = "Darwin" ]; then echo "  brew install tesseract tesseract-lang"
  else echo "  sudo apt install tesseract-ocr tesseract-ocr-jpn tesseract-ocr-jpn-vert tesseract-ocr-chi-sim   （Debian/Ubuntu）"; fi
fi
echo
echo "完成。用 ./start.sh 启动；模型在第一次用到时确认后才下载。"
