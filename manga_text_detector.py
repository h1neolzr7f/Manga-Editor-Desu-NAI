"""comic-text-detector (GPL-3.0, ONNX ~91MB) as the erase-mask source for 改字幕 / 去字.

Rule-based bubble detection (manga_bubble_ocr) still finds bubbles for OCR and placement; this model
only answers "which pixels are lettering" so LaMa does not touch faces, cats or line art the rules
mistook for text (oss-eval: rules 4 false positives on 4 pages, this model 0).

* Never downloads implicitly: same 428 consent flow as LaMa (manga_model_guard).
* Download is pinned to a SHA-256; a mismatching file is deleted, never loaded.
* onnxruntime / the weights missing -> a readable error; the client falls back to the rule mask.
"""
import base64
import hashlib
import io
import os
import threading
import time
import urllib.request

from manga_smart_ocr import SmartOcrError, read_image

MODEL_URL = "https://github.com/zyddnys/manga-image-translator/releases/download/beta-0.3/comictextdetector.pt.onnx"
MODEL_SHA256 = "1a86ace74961413cbd650002e7bb4dcec4980ffa21b2f19b86933372071d718f"
MODEL_BYTES = 94669756
INPUT = 1024
_session = None
_lock = threading.Lock()


def weights_path():
    explicit = (os.environ.get("CTD_MODEL") or "").strip()
    if explicit:
        return os.path.abspath(os.path.expanduser(explicit))
    cache = os.environ.get("XDG_CACHE_HOME") or os.path.join("~", ".cache")
    return os.path.abspath(os.path.expanduser(os.path.join(cache, "manga-editor", "comictextdetector.pt.onnx")))


def cached():
    p = weights_path()
    return os.path.isfile(p) and os.path.getsize(p) == MODEL_BYTES


def runtime_available():
    import importlib.util
    return importlib.util.find_spec("onnxruntime") is not None and importlib.util.find_spec("cv2") is not None


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url=MODEL_URL, opener=urllib.request.urlopen):
    target = weights_path()
    os.makedirs(os.path.dirname(target), exist_ok=True)
    tmp = target + ".part"
    try:
        with opener(url, timeout=120) as r, open(tmp, "wb") as f:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
        if _sha256(tmp) != MODEL_SHA256:
            raise SmartOcrError("文字检测模型下载内容校验失败（SHA-256 不符），已删除，没有使用。", 502)
        os.replace(tmp, target)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    return target


def _get_session(allow_download):
    global _session
    from manga_model_guard import require_download_consent
    if _session is not None:
        return _session
    if not runtime_available():
        raise SmartOcrError("本机没有安装 onnxruntime / opencv，文字检测模型不可用（会自动改用规则蒙版）。", 501)
    require_download_consent("ctd", False, allow_download)
    with _lock:
        if _session is None:
            if not cached():
                download()
            elif _sha256(weights_path()) != MODEL_SHA256:
                raise SmartOcrError("本机的文字检测模型文件校验不通过，请删除后重新下载：" + weights_path(), 500)
            import onnxruntime as ort
            _session = ort.InferenceSession(weights_path(), providers=["CPUExecutionProvider"])
    return _session


def text_mask_array(rgb, session, threshold=0.3, dilate=7):
    """rgb: HxWx3 uint8 -> (HxW uint8 mask 0/255, boxes [[x0,y0,x1,y1],...])."""
    import cv2
    import numpy as np
    h, w = rgb.shape[:2]
    s = INPUT / max(h, w)
    nh, nw = max(1, int(h * s)), max(1, int(w * s))
    pad = np.zeros((INPUT, INPUT, 3), np.uint8)
    pad[:nh, :nw] = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_AREA)
    x = pad.transpose(2, 0, 1)[None].astype(np.float32) / 255
    blks, seg, _lines = session.run(None, {session.get_inputs()[0].name: x})
    seg = cv2.resize(seg[0, 0][:nh, :nw], (w, h), interpolation=cv2.INTER_LINEAR)
    mask = (seg > threshold).astype(np.uint8) * 255
    if dilate:
        mask = cv2.dilate(mask, np.ones((dilate, dilate), np.uint8))
    b = blks[0]
    b = b[b[:, 4] * b[:, 5:].max(1) > 0.4]
    boxes = [[float((cx - bw / 2) / s), float((cy - bh / 2) / s), float((cx + bw / 2) / s), float((cy + bh / 2) / s)]
             for cx, cy, bw, bh, *_ in b]
    return mask, boxes


def detect(image_url, allow_download=False):
    from manga_model_guard import exclusive
    import numpy as np
    from PIL import Image
    raw, _w, _h = read_image(image_url)
    rgb = np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
    with exclusive("ctd", wait=90):  # ~8 s per page: queue a second page instead of failing (a failure would fall back to the rule mask)
        session = _get_session(allow_download)
        t = time.time()
        mask, boxes = text_mask_array(rgb, session)
        dt = time.time() - t
    buf = io.BytesIO()
    Image.fromarray(mask).save(buf, "PNG", optimize=True)
    return {"ok": True, "width": int(rgb.shape[1]), "height": int(rgb.shape[0]), "seconds": round(dt, 2),
            "mask": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii"),
            "boxes": [[round(v, 1) for v in bx] for bx in boxes], "model": "comic-text-detector"}


def _reset_for_tests():
    global _session
    _session = None
