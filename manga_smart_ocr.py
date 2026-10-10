"""Offline manga OCR adapter: Tesseract TSV -> editable text region drafts.

Only the editor's same-origin page can use this local service. It never sends
images or credentials to any remote OCR endpoint.
"""
import base64
import binascii
import csv
import io
import json
import os
import re
import shutil
import subprocess
import threading

from gpt_image_proxy import _authorized_local_request

MAX_IMAGE_BYTES = 12 * 1024 * 1024
MAX_HTTP_BYTES = 17 * 1024 * 1024
MAX_PIXELS = 25 * 1024 * 1024
LANGUAGES = frozenset(("auto", "jpn+eng", "jpn_vert+eng", "eng", "chi_sim+eng", "chi_tra+eng", "kor+eng"))
MAX_REGIONS = 120
# At most two Tesseract processes at once (each may use several cores / ~1GB on big pages).
_TESSERACT_SLOTS = threading.BoundedSemaphore(2)


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


CJK_OR_KANA = re.compile(r"[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff66-\uff9f]")


def is_ocr_noise(text, confidence):
    """True for fragments Tesseract reads out of art, screentone or panel lines.

    Anything with kana/CJK/Hangul is kept (the user decides). Dropped: pure symbols
    (except a confident "!?"), single Latin letters/digits, and short Latin bits that
    are mostly symbols or mixed case ("<<NS", "0)", "Wi"). Real words survive.
    """
    compact = re.sub(r"\s+", "", text or "")
    if not compact:
        return True
    if CJK_OR_KANA.search(compact):
        return False
    core = re.sub(r"[^0-9A-Za-z]", "", compact)
    if not core:
        return not (re.fullmatch(r"[!?\uff01\uff1f\u2026.]+", compact) and confidence >= 80)
    if (len(compact) - len(core)) / len(compact) > 0.25:
        return True
    if len(core) == 1:
        return True
    if len(core) == 2:
        return not (core.isalpha() and (core.isupper() or core.islower()) and confidence >= 60)
    return False


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
        confidence = round(sum(w[5] for w in words) / len(words), 1)
        if is_ocr_noise(text, confidence):
            continue
        regions.append({
            "text": text[:500], "x": left, "y": top,
            "width": right - left, "height": bottom - top,
            "confidence": confidence,
            "vertical": language.startswith("jpn_vert"),
        })
    regions.sort(key=lambda r: (r["y"], r["x"]))
    return regions[:MAX_REGIONS]


def find_tesseract():
    """Find system Tesseract, an explicit portable path, or common Windows installs."""
    chosen = (os.environ.get("TESSERACT_PATH") or "").strip()
    if chosen and os.path.isfile(chosen):
        return chosen
    executable = shutil.which("tesseract")
    if executable:
        return executable
    for key in ("ProgramFiles", "ProgramFiles(x86)"):
        root = os.environ.get(key)
        if root:
            path = os.path.join(root, "Tesseract-OCR", "tesseract.exe")
            if os.path.isfile(path):
                return path
    return None


def ocr_image(data_url, language="auto"):
    if language not in LANGUAGES:
        raise SmartOcrError("OCR 语言不受支持。")
    image, width, height = read_image(data_url)
    executable = find_tesseract()
    if not executable:
        raise SmartOcrError(
            "未安装本地 Tesseract OCR。请安装 Tesseract 和日文语言包（jpn、jpn_vert），或使用手动框选字幕。",
            503)
    if not _TESSERACT_SLOTS.acquire(blocking=False):
        raise SmartOcrError("已有 OCR 任务在运行，请等待完成后再试。", 429)
    psm = "5" if language.startswith("jpn_vert") else "11"
    if language == "auto":
        try:
            return _ocr_auto(executable, image, width, height)
        finally:
            _TESSERACT_SLOTS.release()
    try:
        # Tesseract ignores text enclosed by a closed bubble outline; OCR a copy with
        # outlines/borders whitened as well (same coordinates), then the original.
        cleaned = None
        try:
            from manga_ocr_preclean import strip_frames
            cleaned = strip_frames(image, width, height)
        except Exception:
            cleaned = None
        regions = []
        if cleaned:
            regions = parse_tsv(_run_tesseract(executable, cleaned, language, psm), width, height, language)
        original = parse_tsv(_run_tesseract(executable, image, language, psm), width, height, language)
        regions = merge_regions(regions, original)
    finally:
        _TESSERACT_SLOTS.release()
    return {"ok": True, "width": width, "height": height, "regions": regions,
            "engine": "tesseract-local", "preclean": bool(cleaned)}


def _ocr_auto(executable, image, width, height):
    """Default for beginners: bubble-first (vertical+horizontal per bubble), then a vertical
    whole-page pass for text outside bubbles that clearly reads as Japanese."""
    from manga_bubble_ocr import find_bubbles, read_bubble, japanese_score
    run = lambda png, lang, psm: _run_tesseract(executable, png, lang, psm)
    regions = []
    try:
        bubbles = find_bubbles(image)
    except Exception:
        bubbles = []
    for bubble in bubbles:
        region = read_bubble(run, parse_tsv, bubble)
        if region:
            regions.append(region)
    cleaned = None
    try:
        from manga_ocr_preclean import strip_frames
        cleaned = strip_frames(image, width, height)
    except Exception:
        cleaned = None
    loose = parse_tsv(_run_tesseract(executable, cleaned or image, "jpn_vert", "5"), width, height, "jpn_vert")
    loose = [r for r in loose if japanese_score(r["text"], r["confidence"]) >= 2.0]
    regions = merge_regions(regions, loose)
    return {"ok": True, "width": width, "height": height, "regions": regions,
            "engine": "tesseract-local", "mode": "auto", "bubbles": len(bubbles), "preclean": bool(cleaned)}


def _overlap(a, b):
    ix = max(0, min(a["x"] + a["width"], b["x"] + b["width"]) - max(a["x"], b["x"]))
    iy = max(0, min(a["y"] + a["height"], b["y"] + b["height"]) - max(a["y"], b["y"]))
    small = min(a["width"] * a["height"], b["width"] * b["height"]) or 1
    return ix * iy / float(small)


def merge_regions(primary, extra):
    """Keep every primary region; add extra regions that do not overlap one (>30%)."""
    out = list(primary)
    for region in extra:
        if all(_overlap(region, kept) <= 0.3 for kept in out):
            out.append(region)
    out.sort(key=lambda r: (r["y"], r["x"]))
    return out[:MAX_REGIONS]


def _run_tesseract(executable, image, language, psm):
    try:
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
    return stdout


def local_model_status():
    """Cheap readiness check for the settings page: no model is loaded or downloaded."""
    import importlib.util
    executable = find_tesseract()
    langs = []
    if executable:
        try:
            out = subprocess.run([executable, "--list-langs"], capture_output=True, text=True, timeout=10).stdout
            langs = [x.strip() for x in out.splitlines()[1:] if x.strip()]
        except (OSError, subprocess.SubprocessError):
            langs = []
    def has(name):
        try:
            return importlib.util.find_spec(name) is not None
        except (ImportError, ValueError):
            return False
    lama = any(has(m) for m in ("simple_lama_inpainting", "simple_lama")) and has("torch")
    return {"ok": True,
            "ocr": {"ready": bool(executable) and ("jpn" in langs or "jpn_vert" in langs), "tesseract": bool(executable),
                    "languages": [x for x in langs if x in ("jpn", "jpn_vert", "eng", "chi_sim", "chi_tra")]},
            "lama": {"ready": lama},
            "mangaOcr": {"ready": has("manga_ocr")}}


def handle_smart_ocr_post(handler):
    route = handler.path.split("?", 1)[0]
    if route not in ("/manga-smart/ocr", "/manga-smart/manga-ocr", "/manga-smart/lama-inpaint", "/manga-smart/status"):
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
        allow_download = data.get("allow_download") is True
        if route == "/manga-smart/status":
            result = local_model_status()
        elif route == "/manga-smart/lama-inpaint":
            from manga_lama_inpaint import inpaint
            result = inpaint(data.get("image"), data.get("mask"), allow_download)
        elif route == "/manga-smart/manga-ocr":
            # Heavy optional model only imported after same-origin, length and JSON guards.
            from manga_ocr_refiner import refine_region
            result = refine_region(data.get("image"), allow_download)
        else:
            result = ocr_image(data.get("image"), data.get("language") or "jpn+eng")
        handler._send_json(result)
    except SmartOcrError as exc:
        payload = {"ok": False, "error": str(exc)}
        payload.update(getattr(exc, "extra", None) or {})
        handler._send_json(payload, exc.status)
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
        handler._send_json({"ok": False, "error": "OCR 请求 JSON 无效。"}, 400)
    except Exception:
        handler._send_json({"ok": False, "error": "OCR 发生内部错误。"}, 500)
    return True
