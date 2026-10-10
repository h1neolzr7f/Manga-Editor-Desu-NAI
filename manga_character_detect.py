"""Automatic character finding for 换角色 v2: panels -> characters (mask, box, outline, descriptor).

Pipeline (all local, CPU):
  1. panels: recursive XY-cut on white gutters (bordered manga pages).
  2. per panel: isnet-anime (anime-seg, Apache-2.0, ~168MB ONNX) foreground -> connected components;
     mostly-white components (speech bubbles) are dropped.
  3. each component is refined with SAM 2.1 tiny (box prompt) and clipped to the dilated component,
     so touching characters / props do not leak into each other.
  4. descriptor: tone histogram + saturation-weighted hue histogram, used to find the same character
     in other panels (histogram intersection).

Weights download only after consent (428), pinned to SHA-256 like the other local models.
"""
import base64
import hashlib
import io
import os
import threading
import urllib.request

from manga_smart_ocr import SmartOcrError, read_image

SEG_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx"
SEG_SHA256 = "f15622d853e8260172812b657053460e20806f04b9e05147d49af7bed31a6e99"
SEG_BYTES = 176069933
_seg = None
_lock = threading.Lock()

# anime face detector (deepghs/anime_face_detection v1.4_s, MIT) and CCIP character identity
# embedding (deepghs/ccip_onnx caformer-24-randaug-pruned, OpenRAIL): same consent/SHA rules.
EXTRA = {
    "face": {"url": "https://huggingface.co/deepghs/anime_face_detection/resolve/main/face_detect_v1.4_s/model.onnx",
             "sha": "403b5bc93b6ff789b7d183418df4a1364049bac00c24acd927604a7ff6891483", "bytes": 44583229,
             "file": "anime-face-v1.4s.onnx"},
    "ccip": {"url": "https://huggingface.co/deepghs/ccip_onnx/resolve/main/ccip-caformer-24-randaug-pruned/model_feat.onnx",
             "sha": "4ea118d16496274f4f6e08d3afc768cc592389e8f7f32f8732ce2215c228ac5f", "bytes": 150248245,
             "file": "ccip-feat.onnx"},
    "ccipm": {"url": "https://huggingface.co/deepghs/ccip_onnx/resolve/main/ccip-caformer-24-randaug-pruned/model_metrics.onnx",
              "sha": "7e4646fdfbe369ad485b227ec47ac4092c98b8deef3af44e19fdbd8ba7bc25c1", "bytes": 1649,
              "file": "ccip-metrics.onnx"},
}
FACE_THRESHOLD = 0.307      # model's own F1-optimal threshold
CCIP_SAME = 0.178           # model's own F1-optimal difference threshold
_extra = {}
_cache = {}                 # sha1(image) -> result (last 6 pages)


def seg_path():
    explicit = (os.environ.get("ANIME_SEG_MODEL") or "").strip()
    if explicit:
        return os.path.abspath(os.path.expanduser(explicit))
    cache = os.environ.get("XDG_CACHE_HOME") or os.path.join("~", ".cache")
    return os.path.abspath(os.path.expanduser(os.path.join(cache, "manga-editor", "isnet-anime.onnx")))


def extra_path(key):
    return os.path.join(os.path.dirname(seg_path()), EXTRA[key]["file"])


def cached():
    p = seg_path()
    return os.path.isfile(p) and os.path.getsize(p) == SEG_BYTES


def extra_cached():
    return all(os.path.isfile(extra_path(k)) and os.path.getsize(extra_path(k)) == v["bytes"] for k, v in EXTRA.items())


def _get_extra(allow_download):
    """face detector + CCIP sessions, or None when the user has not downloaded them (optional upgrade)."""
    from manga_model_guard import require_download_consent
    if "face" in _extra:
        return _extra
    if not extra_cached():
        require_download_consent("charid", False, allow_download)
    with _lock:
        if "face" not in _extra:
            import onnxruntime as ort
            for k, v in EXTRA.items():
                path = extra_path(k)
                if not (os.path.isfile(path) and os.path.getsize(path) == v["bytes"]):
                    _download_to(v["url"], path, v["sha"])
                elif _sha256(path) != v["sha"]:
                    raise SmartOcrError("本机的人物识别模型文件校验不通过，请删除后重新下载：" + path, 500)
                _extra[k] = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
    return _extra


def runtime_available():
    import importlib.util
    return all(importlib.util.find_spec(m) is not None for m in ("onnxruntime", "cv2", "numpy"))


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url=SEG_URL, opener=urllib.request.urlopen):
    return _download_to(url, seg_path(), SEG_SHA256, opener)


def _download_to(url, target, sha, opener=urllib.request.urlopen):
    os.makedirs(os.path.dirname(target), exist_ok=True)
    tmp = target + ".part"
    try:
        with opener(url, timeout=180) as r, open(tmp, "wb") as f:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
        if _sha256(tmp) != sha:
            raise SmartOcrError("人物分割模型下载内容校验失败（SHA-256 不符），已删除，没有使用。", 502)
        os.replace(tmp, target)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    return target


def _get_seg(allow_download):
    global _seg
    from manga_model_guard import require_download_consent
    if _seg is not None:
        return _seg
    if not runtime_available():
        raise SmartOcrError("本机没有安装 onnxruntime / opencv，自动找人物不可用，请用「智能点选」或框选。", 501)
    require_download_consent("animeseg", False, allow_download)
    with _lock:
        if _seg is None:
            if not cached():
                download()
            elif _sha256(seg_path()) != SEG_SHA256:
                raise SmartOcrError("本机的人物分割模型文件校验不通过，请删除后重新下载：" + seg_path(), 500)
            import onnxruntime as ort
            _seg = ort.InferenceSession(seg_path(), providers=["CPUExecutionProvider"])
    return _seg


# ---------- panels ----------
def panels(rgb, white=235, min_gutter=5, min_frac=0.08):
    """XY-cut on white gutters. Returns [[x0, y0, x1, y1], ...] in reading order (top->bottom, right->left)."""
    import numpy as np
    g = rgb.mean(2)
    H, W = g.shape
    out = []

    def trim(x0, y0, x1, y1):
        sub = g[y0:y1, x0:x1] < white
        rows, cols = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
        if not len(rows) or not len(cols):
            return None
        return x0 + cols[0], y0 + rows[0], x0 + cols[-1] + 1, y0 + rows[-1] + 1

    def cut(x0, y0, x1, y1, depth):
        t = trim(x0, y0, x1, y1)
        if t is None:
            return
        x0, y0, x1, y1 = t
        if depth < 8:
            for axis in (0, 1):  # 0: horizontal gutters (split rows) first
                sub = g[y0:y1, x0:x1] >= white
                prof = sub.mean(1 - axis) if axis == 0 else sub.mean(0)
                full = prof >= 0.985
                n = len(full)
                best = None
                i = 0
                while i < n:
                    if full[i]:
                        j = i
                        while j < n and full[j]:
                            j += 1
                        if j - i >= min_gutter and i > n * min_frac and j < n * (1 - min_frac):
                            if best is None or (j - i) > (best[1] - best[0]):
                                best = (i, j)
                        i = j
                    else:
                        i += 1
                if best:
                    m = (best[0] + best[1]) // 2
                    if axis == 0:
                        cut(x0, y0, x1, y0 + m, depth + 1)
                        cut(x0, y0 + m, x1, y1, depth + 1)
                    else:
                        cut(x0, y0, x0 + m, y1, depth + 1)
                        cut(x0 + m, y0, x1, y1, depth + 1)
                    return
        if (x1 - x0) * (y1 - y0) >= 0.01 * W * H:
            out.append([int(x0), int(y0), int(x1), int(y1)])

    cut(0, 0, W, H, 0)
    # manga order: rows top->bottom, right->left within a row
    out.sort(key=lambda b: (round(b[1] / (H * 0.05)), -b[0]))
    return out


# ---------- speech bubbles (subtracted from characters) ----------
def bubble_mask(rgb, pans, text=None):
    """Enclosed white regions inside a panel (not touching its border), holes (lettering) filled,
    grown a little to include the outline."""
    import cv2
    import numpy as np
    H, W = rgb.shape[:2]
    white = (rgb.min(2) >= 232).astype(np.uint8)
    out = np.zeros((H, W), np.uint8)
    for x0, y0, x1, y1 in pans:
        sub = white[y0:y1, x0:x1]
        n, lab, st, _ = cv2.connectedComponentsWithStats(sub, 4)
        pa = (x1 - x0) * (y1 - y0)
        for k in range(1, n):
            bx, by, bw, bh, a = st[k]
            if bx <= 1 or by <= 1 or bx + bw >= (x1 - x0) - 1 or by + bh >= (y1 - y0) - 1:
                continue
            if not (0.004 * pa <= a <= 0.35 * pa) or a < 0.45 * bw * bh:
                continue
            comp = (lab[by:by + bh, bx:bx + bw] == k).astype(np.uint8)
            cs, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            filled = np.zeros_like(comp)
            cv2.drawContours(filled, cs, -1, 1, -1)
            if comp.sum() < 0.7 * filled.sum():      # mostly ink inside: not a bubble
                continue
            # a face is also an enclosed white region: only regions with detected lettering are bubbles
            if text is None or text[y0 + by:y0 + by + bh, x0 + bx:x0 + bx + bw][filled > 0].mean() < 0.02:
                continue
            out[y0 + by:y0 + by + bh, x0 + bx:x0 + bx + bw] |= filled
    return cv2.dilate(out, np.ones((9, 9), np.uint8)) > 0


def _text_mask(rgb):
    """comic-text-detector lettering mask when that model is installed (no download here), else None."""
    try:
        import manga_text_detector as T
        if not (T.runtime_available() and T.cached()):
            return None
        mask, _boxes = T.text_mask_array(rgb, T._get_session(False))
        return mask > 0
    except Exception:
        return None


def _largest(m):
    import cv2
    import numpy as np
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    if n <= 2:
        return m
    k = 1 + int(np.argmax(st[1:, 4]))
    return lab == k


# ---------- faces + identity ----------
def faces(rgb, session, size=640):
    """YOLOv8 anime faces -> [[x0, y0, x1, y1, score]] (letterboxed inference, NMS)."""
    import cv2
    import numpy as np
    H, W = rgb.shape[:2]
    k = size / max(H, W)
    nh, nw = int(round(H * k)), int(round(W * k))
    canvas = np.full((size, size, 3), 114, np.uint8)
    canvas[:nh, :nw] = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_AREA)
    x = canvas.astype(np.float32).transpose(2, 0, 1)[None] / 255.0
    out = session.run(None, {session.get_inputs()[0].name: x})[0][0]   # (5, anchors)
    out = out.T
    keep = out[:, 4] >= FACE_THRESHOLD
    out = out[keep]
    if not len(out):
        return []
    boxes = np.stack([out[:, 0] - out[:, 2] / 2, out[:, 1] - out[:, 3] / 2, out[:, 0] + out[:, 2] / 2, out[:, 1] + out[:, 3] / 2], 1) / k
    idx = cv2.dnn.NMSBoxes([[float(b[0]), float(b[1]), float(b[2] - b[0]), float(b[3] - b[1])] for b in boxes],
                           [float(v) for v in out[:, 4]], FACE_THRESHOLD, 0.5) if hasattr(cv2, "dnn") else range(len(boxes))
    idx = np.array(idx).reshape(-1)
    res = []
    for i in idx:
        b = boxes[i]
        res.append([int(max(0, b[0])), int(max(0, b[1])), int(min(W, b[2])), int(min(H, b[3])), round(float(out[i, 4]), 3)])
    return res


def ccip_embed(rgb, mask, box, session):
    """CCIP feature of one character: its box crop with everything outside the mask painted white."""
    import cv2
    import numpy as np
    x0, y0, x1, y1 = box
    crop = rgb[y0:y1, x0:x1].copy()
    crop[~mask[y0:y1, x0:x1]] = 255
    x = cv2.resize(crop, (384, 384), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    x = ((x - 0.5) / 0.5).transpose(2, 0, 1)[None]
    return session.run(None, {"input": x})[0][0]


def ccip_difference(feats, metrics):
    import numpy as np
    if not len(feats):
        return []
    return metrics.run(None, {"input": np.stack(feats).astype(np.float32)})[0].tolist()


def cluster_identities(ids, panels_of, diff, thr=CCIP_SAME):
    """Average-linkage clustering of CCIP differences with a cannot-link rule: two characters drawn in the
    same panel are different people. Returns a cluster index per id (singletons get their own)."""
    groups = [[i] for i in range(len(ids))]

    def link(a, b):
        if any(panels_of[i] == panels_of[j] for i in a for j in b):
            return None
        return sum(diff[i][j] for i in a for j in b) / (len(a) * len(b))
    while True:
        best = None
        for x in range(len(groups)):
            for y in range(x + 1, len(groups)):
                d = link(groups[x], groups[y])
                if d is not None and d <= thr and (best is None or d < best[0]):
                    best = (d, x, y)
        if best is None:
            break
        _, x, y = best
        groups[x] = groups[x] + groups[y]
        del groups[y]
    out = {}
    for k, g in enumerate(groups):
        for i in g:
            out[ids[i]] = k
    return out


# ---------- foreground ----------
def foreground(rgb, session):
    import cv2
    import numpy as np
    h, w = rgb.shape[:2]
    x = cv2.resize(rgb, (1024, 1024), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    x = (x - np.array([0.485, 0.456, 0.406], np.float32))
    x = x.transpose(2, 0, 1)[None]
    pred = session.run(None, {session.get_inputs()[0].name: x})[0][0, 0]
    mi, ma = float(pred.min()), float(pred.max())
    pred = (pred - mi) / max(1e-6, ma - mi)
    return cv2.resize(pred, (w, h), interpolation=cv2.INTER_LINEAR)


def descriptor(rgb, mask):
    """24-d: 12 tone bins + 12 hue bins weighted by saturation; L1-normalised halves."""
    import cv2
    import numpy as np
    px = rgb[mask > 0]
    if not len(px):
        return [0.0] * 24
    hsv = cv2.cvtColor(px.reshape(-1, 1, 3), cv2.COLOR_RGB2HSV).reshape(-1, 3).astype(np.float32)
    tone = np.histogram(px.mean(1), bins=12, range=(0, 256))[0].astype(np.float32)
    hue = np.histogram(hsv[:, 0], bins=12, range=(0, 180), weights=hsv[:, 1] / 255.0)[0].astype(np.float32)
    tone /= max(1e-6, tone.sum())
    sat = float(hsv[:, 1].mean() / 255.0)
    hue = hue / max(1e-6, hue.sum()) * min(1.0, sat * 4)   # grey art: hue barely counts
    return [round(float(v), 4) for v in np.concatenate([tone, hue])]


def similarity(a, b):
    import numpy as np
    a, b = np.array(a, np.float32), np.array(b, np.float32)
    tone = float(np.minimum(a[:12], b[:12]).sum())
    wa, wb = float(a[12:].sum()), float(b[12:].sum())
    if min(wa, wb) < 0.2:
        return round(tone, 3)
    hue = float(np.minimum(a[12:] / wa, b[12:] / wb).sum())
    return round(0.5 * tone + 0.5 * hue, 3)


def _png_box(mask):
    import numpy as np
    from PIL import Image
    a = (mask > 0).astype("uint8") * 255
    buf = io.BytesIO()
    Image.fromarray(np.dstack([np.full_like(a, 255), a]), "LA").save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def _split(rgb, full, box, predictor, min_area, panel_mask=None, panel_area=1):
    """One foreground component may hold several touching characters (and bubbles): prompt SAM with a
    grid of points inside it, keep for each point the largest candidate that stays inside the component,
    then drop masks mostly contained in a bigger kept one. Without SAM the component is returned whole."""
    import cv2
    import numpy as np
    if predictor is None:
        return [full]
    bx, by, bw, bh = box
    if panel_mask is None:
        panel_mask = np.ones_like(full)
    grow = cv2.dilate(full.astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
    pts = []
    for gy in range(4):
        for gx in range(4):
            x, y = int(bx + bw * (gx + 0.5) / 4), int(by + bh * (gy + 0.5) / 4)
            if full[y, x]:
                pts.append((x, y))
    comp_area = int(full.sum())
    # a tall, panel-sized-but-not-dominant blob is one person; split only groups (huge or side by side)
    big = comp_area > 0.45 * panel_area or (bw > 1.3 * bh and comp_area > 0.2 * panel_area)
    if not big:
        return [full]
    found = []
    for x, y in pts:
        ms, sc, _ = predictor.predict(point_coords=np.array([[x, y]], np.float32), point_labels=np.array([1]),
                                      multimask_output=True)
        best = None
        for m, s_ in zip(ms > 0, sc):
            m = m & grow & panel_mask                     # never leak into other panels
            a = int(m.sum())
            if s_ < 0.55 or a < max(min_area, 0.08 * comp_area):
                continue
            if big and a > 0.85 * comp_area:              # the whole group: look for one person
                continue
            if best is None or a > best.sum():
                best = m
        if best is not None:
            found.append(best)
    found.sort(key=lambda m: -int(m.sum()))
    kept = []
    for m in found:
        a = m.sum()
        if any((m & k).sum() > 0.5 * a for k in kept):
            continue
        kept.append(m)
    covered = np.zeros_like(full)
    for k in kept:
        covered |= k
    if not kept or covered.sum() < 0.5 * comp_area:   # SAM could not split it sensibly: one character
        return [full]
    return kept


def _char(rgb, m, pi, outline, face):
    import numpy as np
    ys, xs = np.nonzero(m)
    bx = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    return {"panel": pi, "box": bx, "area": int(m.sum()), "polygon": outline(m.astype(np.uint8)),
            "mask": _png_box(m[bx[1]:bx[3], bx[0]:bx[2]]), "descriptor": descriptor(rgb, m), "face": face, "_m": m}


def _by_faces(fg, pf, predictor, panel_mask, min_area):
    """One SAM prompt per face: its centre and a body point below it (+), the other faces (−).
    Keep the largest candidate that holds this face, no other face, and stays mostly in the foreground."""
    import cv2
    import numpy as np
    grow = cv2.dilate(fg.astype(np.uint8), np.ones((21, 21), np.uint8)) > 0
    out = []
    # smallest face first (a pet or a child held in someone's arms): a later, bigger person may contain an
    # already-claimed face — the caller subtracts what was claimed — but never one that is still pending.
    pf = sorted(pf, key=lambda f: (f[2] - f[0]) * (f[3] - f[1]))
    for i, f in enumerate(pf):
        cx, cy = (f[0] + f[2]) / 2, (f[1] + f[3]) / 2
        fh = f[3] - f[1]
        pts, lab = [[cx, cy]], [1]
        by = min(fg.shape[0] - 1, cy + 1.6 * fh)
        if fg[int(by), int(cx)]:
            pts.append([cx, by]); lab.append(1)
        for j, g in enumerate(pf):
            if j > i:
                pts.append([(g[0] + g[2]) / 2, (g[1] + g[3]) / 2]); lab.append(0)
        ms, sc, _ = predictor.predict(point_coords=np.array(pts, np.float32), point_labels=np.array(lab), multimask_output=True)
        best = None
        for m in ms > 0:
            m = m & panel_mask
            a = int(m.sum())
            if a < min_area or not m[int(cy), int(cx)] or (m & grow).sum() < 0.85 * a:
                continue
            if any(m[int((g[1] + g[3]) / 2), int((g[0] + g[2]) / 2)] for j, g in enumerate(pf) if j > i):
                continue
            if best is None or a > best.sum():
                best = m
        if best is not None:
            out.append((best, f))
    return out


def find_characters(rgb, seg, predictor=None, min_frac=0.03, face_boxes=None):
    import cv2
    import numpy as np
    from manga_sam_select import outline
    H, W = rgb.shape[:2]
    pans = panels(rgb) or [[0, 0, W, H]]
    chars = []
    if predictor is not None:
        predictor.set_image(rgb)
    bubbles = bubble_mask(rgb, pans, _text_mask(rgb))
    for pi, (x0, y0, x1, y1) in enumerate(pans):
        crop = rgb[y0:y1, x0:x1]
        fg = foreground(crop, seg) > 0.5
        pm = np.zeros((H, W), bool)
        pm[y0:y1, x0:x1] = True
        parea = (x1 - x0) * (y1 - y0)
        pf = [f for f in (face_boxes or []) if x0 <= (f[0] + f[2]) / 2 < x1 and y0 <= (f[1] + f[3]) / 2 < y1]
        claimed = np.zeros((H, W), bool)
        if pf and predictor is not None:
            fgfull = np.zeros((H, W), bool)
            fgfull[y0:y1, x0:x1] = fg
            for m, f in _by_faces(fgfull, pf, predictor, pm, parea * min_frac):
                m = _largest(m & ~bubbles & ~claimed)
                if m.sum() < parea * min_frac * 0.5:
                    continue
                claimed |= m
                chars.append(_char(rgb, m, pi, outline, f))
            fg = fg & ~claimed[y0:y1, x0:x1]
        n, lab, stats, _ = cv2.connectedComponentsWithStats(fg.astype(np.uint8), 8)
        for k in range(1, n):
            cx, cy, cw, ch, area = stats[k]
            if area < parea * min_frac:
                continue
            comp = lab == k
            full = np.zeros((H, W), bool)
            full[y0:y1, x0:x1] = comp
            for m in _split(rgb, full, (x0 + cx, y0 + cy, cw, ch), predictor, parea * min_frac, pm, parea):
                m = _largest(m & ~bubbles)
                if m.sum() < parea * min_frac or rgb[m].mean() > 212:   # bubble / leftover speck
                    continue
                # a faceless part touching a face-owner of this panel is part of that person (hair, skirt…)
                grown = cv2.dilate(m.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
                owner = next((c for c in chars if c["panel"] == pi and c.get("face") and (grown & c["_m"]).any()), None)
                if owner is not None and m.sum() < owner["area"]:
                    merged = owner["_m"] | m
                    chars[chars.index(owner)] = _char(rgb, merged, pi, outline, owner["face"])
                    continue
                chars.append(_char(rgb, m, pi, outline, None))
    for c in chars:
        c.pop("_m", None)
    chars.sort(key=lambda c: (c["panel"], -c["area"]))
    for i, c in enumerate(chars):
        c["id"] = "c%d" % (i + 1)
    return pans, chars


def detect(payload):
    from manga_model_guard import exclusive
    allow = payload.get("allow_download") is True
    seg = _get_seg(allow)
    extra = None
    if payload.get("identity", True) is not False:
        extra = _get_extra(allow)          # 428 once for the face/identity models, then cached
    import numpy as np
    from PIL import Image
    raw, _w, _h = read_image(payload.get("image"))
    key = hashlib.sha1(raw).hexdigest() + ("+id" if extra else "")
    if key in _cache:
        hit = dict(_cache[key]); hit["cached"] = True
        return hit
    rgb = np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
    predictor = None
    face_boxes = faces(rgb, extra["face"]) if extra else []
    with exclusive("sam2", wait=90):
        if payload.get("refine", True) is not False:
            try:
                from manga_sam_select import _get_predictor, _embeds
                predictor = _get_predictor(allow)
                _embeds.clear()   # set_image below replaces the predictor's page
            except SmartOcrError as exc:
                if exc.status == 428:
                    raise
                predictor = None  # no torch: isnet masks only
        pans, chars = find_characters(rgb, seg, predictor, face_boxes=face_boxes)
    identity = None
    if extra:
        idx = [i for i, c in enumerate(chars) if c.get("face")]
        feats = []
        for i in idx:
            c = chars[i]
            m = np.zeros(rgb.shape[:2], bool)
            mi = np.array(Image.open(io.BytesIO(base64.b64decode(c["mask"].split(",", 1)[1]))))[..., 1] > 0
            x0, y0, x1, y1 = c["box"]
            m[y0:y1, x0:x1] = mi
            feats.append(ccip_embed(rgb, m, c["box"], extra["ccip"]))
        diff = ccip_difference(feats, extra["ccipm"])
        ids = [chars[i]["id"] for i in idx]
        identity = {"ids": ids, "diff": [[round(v, 4) for v in row] for row in diff], "same": CCIP_SAME,
                    "cluster": cluster_identities(ids, [chars[i]["panel"] for i in idx], diff)}
    res = {"ok": True, "width": int(rgb.shape[1]), "height": int(rgb.shape[0]), "panels": pans, "faces": face_boxes,
           "characters": chars, "refined": predictor is not None, "identity": identity}
    _cache[key] = res
    while len(_cache) > 6:
        _cache.pop(next(iter(_cache)))
    return res


def _reset_for_tests():
    global _seg
    _seg = None
    _extra.clear()
    _cache.clear()


def cutout_array(rgb, seg=None):
    """Main subject of a generated 'character on flat white background' image -> bool mask.
    isnet-anime when available; flat-background threshold as a fallback (and when isnet finds nothing)."""
    import cv2
    import numpy as np
    H, W = rgb.shape[:2]
    m = None
    if seg is not None:
        fg = foreground(rgb, seg) > 0.5
        m = _largest(fg) if fg.any() else None
    if m is None or m.sum() < 0.02 * H * W:
        # background colour = median of the border; subject = clearly different pixels, holes filled
        border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]).astype(np.int16)
        bg = np.median(border, 0)
        diff = np.abs(rgb.astype(np.int16) - bg).max(2) > 24
        diff = cv2.morphologyEx(diff.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
        m = _largest(diff > 0)
        cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        filled = np.zeros((H, W), np.uint8)
        cv2.drawContours(filled, cs, -1, 1, -1)
        m = filled > 0
    return m


def cutout(payload):
    import numpy as np
    from PIL import Image
    allow = payload.get("allow_download") is True
    seg = None
    try:
        seg = _get_seg(allow)
    except SmartOcrError as exc:
        if exc.status == 428:
            raise
    raw, _w, _h = read_image(payload.get("image"))
    rgb = np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
    if payload.get("modelOnly") is True:
        # residue check: only the segmentation model's opinion (no flat-background fallback)
        if seg is None:
            return {"ok": True, "model": False}
        fg = foreground(rgb, seg) > 0.5
        if fg.sum() < 0.01 * fg.size:
            return {"ok": True, "model": True, "empty": True, "width": int(rgb.shape[1]), "height": int(rgb.shape[0]),
                    "mask": _png_box(np.zeros((1, 1), bool)), "box": [0, 0, 1, 1]}
        ys, xs = np.nonzero(fg)
        bx = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
        return {"ok": True, "model": True, "width": int(rgb.shape[1]), "height": int(rgb.shape[0]),
                "mask": _png_box(fg[bx[1]:bx[3], bx[0]:bx[2]]), "box": bx}
    m = cutout_array(rgb, seg)
    if not m.any():
        raise SmartOcrError("生成结果里没有找到人物，请重试。", 422)
    ys, xs = np.nonzero(m)
    return {"ok": True, "width": int(rgb.shape[1]), "height": int(rgb.shape[0]), "mask": _png_box(m),
            "box": [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], "model": seg is not None}
