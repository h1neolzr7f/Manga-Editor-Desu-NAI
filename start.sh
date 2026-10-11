#!/usr/bin/env bash
# Start the editor on Linux / macOS: local server on 127.0.0.1:8000, then open the browser. Ctrl+C stops it.
set -euo pipefail
cd "$(dirname "$0")"
PORT=8000; URL="http://127.0.0.1:$PORT/index.html"
if [ -x .venv/bin/python ]; then PY=.venv/bin/python; else PY="${PYTHON:-python3}"; fi
command -v "$PY" >/dev/null || [ -x "$PY" ] || { echo "需要 Python 3（Need Python 3）: https://www.python.org/downloads/"; exit 1; }
open_url() { if command -v xdg-open >/dev/null; then xdg-open "$1" >/dev/null 2>&1 & elif command -v open >/dev/null; then open "$1"; else echo "请在浏览器打开 $1"; fi; }
if "$PY" -c "import socket,sys; s=socket.socket(); sys.exit(0 if s.connect_ex(('127.0.0.1',$PORT))==0 else 1)"; then
  if curl -fsS -o /dev/null "$URL" 2>/dev/null; then echo "编辑器已经在运行：$URL"; open_url "$URL"; exit 0; fi
  echo "端口 $PORT 被其他程序占用（查看：lsof -i :$PORT）。关掉它后再运行 ./start.sh"; exit 1
fi
mkdir -p user_data
"$PY" 99_server.py > user_data/start.log 2>&1 &
PID=$!; trap 'kill $PID 2>/dev/null' INT TERM EXIT
for _ in $(seq 1 60); do curl -fsS -o /dev/null "$URL" 2>/dev/null && break; kill -0 $PID 2>/dev/null || { echo "启动失败，见 user_data/start.log"; exit 1; }; sleep 0.5; done
echo "已启动：$URL  （按 Ctrl+C 停止）"; open_url "$URL"
wait $PID
