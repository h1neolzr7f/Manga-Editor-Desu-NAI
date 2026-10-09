"""Offline manga OCR adapter: Tesseract TSV -> editable text region drafts.

Only the editor's same-origin page can use this local service. It never sends
images or credentials to any remote OCR endpoint.
"""
import base64
import binascii
import csv
import io
import json
import re
import shutil
import subprocess

from gpt_image_proxy import _authorized_local_request

MAX_IMAGE_BYTES = 12 * 1024 * 1024
MAX_HTTP_BYTES = 17 * 1024 * 1024
MAX_PIXELS = 25 * 1024 * 1024
LANGUAGES = frozenset(("jpn+eng", "jpn_vert+eng", "eng", "chi_sim+eng", "chi_tra+eng", "kor+eng"))
MAX_REGIONS = 120


class SmartOcrError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def read_image(data_url):
    if not isinstance(data_url, str) or not data_url.startswith("data:image/png;base64,"):
        raise SmartOcrError("当前只支持 PNG 画布截图。")
    try:
        raw = base64.b64decode(data_url.split(",", 1)[1], validate=True)
    except (binascii.Error, ValueError) as exc:
        raise SmartOcrError("图片的 Base64 数据无效。") from exc
    if not raw.startswith(b"\x89PNG\r\n\x1a\n") or len(raw) < 29 or raw[12:16] != b"IHDR":
        raise SmartOcrError("不是有效的 PNG 图像。")
    width = int.from_bytes(raw[16:20], "big")
    height = int.from_bytes(raw[20:24], "big")
    if not width or not height or width * height > MAX_PIXELS or len(raw) > MAX_IMAGE_BYTES:
        raise SmartOcrError("图片过大，请缩小到 2500 万像素以内且不超过 12MB。", 413)
    return raw, width, height


def _joined_words(words):
    """CJK text has no inter-character space; retain whitespace between Latin words."""
    out = ""
    for part in words:
        token = part.strip()
        if not token:
            continue
        if out and not (re.search(r"[\u3000-\u9fff\uff00-\uffef]$", out) or
                        re.match(r"^[\u3000-\u9fff\uff00-\uffef、。！，！？）】]", token) or
                        out.endswith(("(", "（", "「", "『"))):
            out += " "
        out += token
    return out


def parse_tsv(tsv, width, height, language):
    """Read word-level OCR lines from TSV; discard low confidence and empty OCR noise."""
    groups = {}
    stream = io.StringIO(tsv or "")
    for item in csv.DictReader(stream, delimiter="\t"):
        try:
            if int(item.get("level") or -1) != 5 or float(item.get("conf") or -1) < 20:
                continue
            x, y = int(item["left"]), int(item["top"])
            w, h = int(item["width"]), int(item["height"])
            if w < 2 or h < 2:
                continue
            text = (item.get("text") or "").strip()
            if not text:
                continue
            key = tuple(item[k] for k in ("page_num", "block_num", "par_num", "line_num"))
            groups.setdefault(key, []).append((x, y, w, h, text, float(item["conf"])))
        except (ValueError, TypeError, KeyError):
            continue
    regions = []
    for words in groups.values():
        left = max(0, min(x for x, *_ in words))
        top = max(0, min(y for _, y, *_ in words))
        right = min(width, max(x + w for x, y, w, h, txt, conf in words))
        bottom = min(height, max(y + h for x, y, w, h, txt, conf in words))
        text = _joined_words([word[4] for word in words])
        if not text or right <= left or bottom <= top:
            continue
        regions.append({
            "text": text[:500], "x": left, "y": top,
            "width": right - left, "height": bottom - top,
            "confidence": round(sum(w[5] for w in words) / len(words), 1),
            "vertical": language.startswith("jpn_vert"),
        })
    regions.sort(key=lambda r: (r["y"], r["x"]))
    return regions[:MAX_REGIONS]


def ocr_image(data_url, language="jpn+eng"):
    if language not in LANGUAGES:
        raise SmartOcrError("OCR 语言不受支持。")
    image, width, height = read_image(data_url)
    executable = shutil.which("tesseract")
    if not executable:
        raise SmartOcrError(
            "未安装本地 Tesseract OCR。请安装 Tesseract 和日文语言包（jpn、jpn_vert），或使用手动框选字幕。",
            503)
    try:
        psm = "5" if language.startswith("jpn_vert") else "11"
        process = subprocess.run(
            [executable, "stdin", "stdout", "-l", language, "--psm", psm, "tsv"],
            input=image, capture_output=True, text=False, timeout=75, check=False)
    except subprocess.TimeoutExpired as exc:
        raise SmartOcrError("OCR 超过 75 秒，已停止，请缩小画布后重试。", 504) from exc
    except OSError as exc:
        raise SmartOcrError("无法启动 Tesseract OCR，请检查安装路径。", 503) from exc
    stdout = process.stdout.decode("utf-8", "replace") if isinstance(process.stdout, bytes) else process.stdout
    stderr = process.stderr.decode("utf-8", "replace") if isinstance(process.stderr, bytes) else process.stderr
    if process.returncode:
        # A missing language pack should not surface arbitrary process output to users.
        missing = "traineddata" in stderr.lower() or "failed loading language" in stderr.lower()
        raise SmartOcrError(
            "未找到 OCR 语言包。请安装所选语言的 Tesseract traineddata。"
            if missing else "Tesseract 识别失败，请确认输入图片可正常打开。",
            503 if missing else 502)
    return {"ok": True, "width": width, "height": height,
            "regions": parse_tsv(stdout, width, height, language), "engine": "tesseract-local"}


def handle_smart_ocr_post(handler):
    if handler.path.split("?", 1)[0] != "/manga-smart/ocr":
        return False
    if not _authorized_local_request(handler):
        handler.close_connection = True
        handler._send_json({"ok": False, "error": "只允许本机编辑器页面调用 OCR。"}, 403)
        return True
    try:
        length = int(handler.headers.get("Content-Length", "0"))
        if length < 1 or length > MAX_HTTP_BYTES:
            raise SmartOcrError("OCR 请求大小不合法或超过上限。", 413)
        if not handler.headers.get("Content-Type", "").lower().startswith("application/json"):
            raise SmartOcrError("OCR 只支持 JSON 请求。", 415)
        data = json.loads(handler.rfile.read(length))
        if not isinstance(data, dict):
            raise SmartOcrError("OCR 请求必须是对象。")
        result = ocr_image(data.get("image"), data.get("language") or "jpn+eng")
        handler._send_json(result)
    except SmartOcrError as exc:
        handler._send_json({"ok": False, "error": str(exc)}, exc.status)
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
        handler._send_json({"ok": False, "error": "OCR 请求 JSON 无效。"}, 400)
    except Exception:
        handler._send_json({"ok": False, "error": "OCR 发生内部错误。"}, 500)
    return True
