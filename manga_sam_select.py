"""SAM 2.1 tiny click-select (Apache-2.0 weights, ~149MB, CPU-only torch).

POST /manga-smart/sam-click {image?, imageId, points: [[x, y, 1|0], ...], box?, allow_download}
-> 3 candidate masks (PNG data URLs, page size) + outer outline polygon of each + scores.

* Never downloads implicitly: same 428 consent flow as LaMa / the text detector (manga_model_guard).
* Download is pinned to a SHA-256; a mismatching file is deleted, never loaded.
* The page embedding (~2–4 s on CPU) is cached per imageId (last 2 pages); clicks after that take
  ~0.2–1 s and send only the points. Unknown imageId -> 409 so the client resends the page once.
* torch / sam2 missing -> 501 with a readable message; the client keeps rectangle/lasso selection.
"""
import base64
import hashlib
import io
import os
import threading
import time
import urllib.request
from collections import OrderedDict

from manga_smart_ocr import SmartOcrError, read_image

MODEL_URL = "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt"
MODEL_SHA256 = "7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69"
MODEL_BYTES = 156008466
CONFIG = "configs/sam2.1/sam2.1_hiera_t.yaml"
_predictor = None
_lock = threading.Lock()
_embeds = OrderedDict()  # imageId -> (features dict, (h, w))
MAX_EMBEDS = 2
MAX_POINTS = 24


def weights_path():
    explicit = (os.environ.get("SAM2_MODEL") or "").strip()
    if explicit:
        return os.path.abspath(os.path.expanduser(explicit))
    cache = os.environ.get("XDG_CACHE_HOME") or os.path.join("~", ".cache")
    return os.path.abspath(os.path.expanduser(os.path.join(cache, "manga-editor", "sam2.1_hiera_tiny.pt")))


def cached():
    p = weights_path()
    return os.path.isfile(p) and os.path.getsize(p) == MODEL_BYTES


def runtime_available():
    import importlib.util
    return all(importlib.util.find_spec(m) is not None for m in ("torch", "sam2", "cv2"))


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
        with opener(url, timeout=180) as r, open(tmp, "wb") as f:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
        if _sha256(tmp) != MODEL_SHA256:
            raise SmartOcrError("智能点选模型下载内容校验失败（SHA-256 不符），已删除，没有使用。", 502)
        os.replace(tmp, target)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    return target


def _get_predictor(allow_download):
    global _predictor
    from manga_model_guard import require_download_consent
    if _predictor is not None:
        return _predictor
    if not runtime_available():
        raise SmartOcrError("本机没有安装 torch（CPU 版）/ sam2，智能点选不可用，请继续用矩形或套索框选。", 501)
    require_download_consent("sam2", False, allow_download)
    with _lock:
        if _predictor is None:
            if not cached():
                download()
            elif _sha256(weights_path()) != MODEL_SHA256:
                raise SmartOcrError("本机的智能点选模型文件校验不通过，请删除后重新下载：" + weights_path(), 500)
            import torch
            from sam2.build_sam import build_sam2
            from sam2.sam2_image_predictor import SAM2ImagePredictor
            torch.set_num_threads(max(1, min(8, os.cpu_count() or 1)))
            _predictor = SAM2ImagePredictor(build_sam2(CONFIG, weights_path(), device="cpu"))
    return _predictor


def outline(mask, max_points=400):
    """Largest outer contour of a 0/1 mask as [[x, y], ...] (page pixels), simplified."""
    import cv2
    import numpy as np
    m = (mask > 0).astype(np.uint8)
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return []
    c = max(contours, key=cv2.contourArea)
    eps = 0.5
    approx = cv2.approxPolyDP(c, eps, True)
    while len(approx) > max_points:
        eps *= 1.6
        approx = cv2.approxPolyDP(c, eps, True)
    return [[int(p[0][0]), int(p[0][1])] for p in approx]


def _png(mask):
    """White where selected, transparent elsewhere (LA PNG): usable directly as a canvas alpha mask."""
    import numpy as np
    from PIL import Image
    a = mask.astype("uint8") * 255
    buf = io.BytesIO()
    Image.fromarray(np.dstack([np.full_like(a, 255), a]), "LA").save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def _clean_points(points, w, h):
    out = []
    for p in (points or [])[:MAX_POINTS]:
        if not isinstance(p, (list, tuple)) or len(p) < 2:
            continue
        x, y = float(p[0]), float(p[1])
        if not (0 <= x < w and 0 <= y < h):
            continue
        out.append((x, y, 1 if (len(p) < 3 or p[2]) else 0))
    if not any(lbl for _x, _y, lbl in out):
        raise SmartOcrError("至少需要在要选的东西上点一下。", 400)
    return out


def select(payload):
    from manga_model_guard import exclusive
    image_id = str(payload.get("imageId") or "")[:80]
    if not image_id:
        raise SmartOcrError("缺少 imageId。", 400)
    with exclusive("sam2", wait=60):
        pred = _get_predictor(payload.get("allow_download") is True)
        import numpy as np  # after the runtime check: no torch/numpy -> readable 501, not an ImportError
        t0 = time.time()
        if image_id in _embeds:
            _embeds.move_to_end(image_id)
        else:
            if not payload.get("image"):
                raise SmartOcrError("这一页还没有发送给智能点选，请重试。", 409)
            from PIL import Image
            raw, _w, _h = read_image(payload["image"])
            rgb = np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
            pred.set_image(rgb)
            _embeds[image_id] = (pred._features, pred._orig_hw)
            while len(_embeds) > MAX_EMBEDS:
                _embeds.popitem(last=False)
        embed_s = time.time() - t0
        feats, orig_hw = _embeds[image_id]
        pred._features, pred._orig_hw, pred._is_image_set = feats, orig_hw, True
        h, w = orig_hw[0]
        pts = _clean_points(payload.get("points"), w, h)
        coords = np.array([[x, y] for x, y, _l in pts], dtype=np.float32)
        labels = np.array([l for _x, _y, l in pts], dtype=np.int32)
        t1 = time.time()
        masks, scores, _ = pred.predict(point_coords=coords, point_labels=labels, multimask_output=True)
        click_s = time.time() - t1
    order = np.argsort(-scores)
    cands = []
    for i in order[:3]:
        m = masks[i] > 0
        area = int(m.sum())
        if not area:
            continue
        ys, xs = np.nonzero(m)
        cands.append({"score": round(float(scores[i]), 3), "area": area,
                      "box": [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1],
                      "polygon": outline(m), "mask": _png(m)})
    # smallest first: a beginner reads 1 → 3 as "just this part" → "the whole thing"
    cands.sort(key=lambda c: c["area"])
    return {"ok": True, "width": int(w), "height": int(h), "candidates": cands,
            "embedSeconds": round(embed_s, 2), "clickSeconds": round(click_s, 3)}


def _reset_for_tests():
    global _predictor
    _predictor = None
    _embeds.clear()
