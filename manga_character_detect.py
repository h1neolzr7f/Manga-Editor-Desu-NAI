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


def seg_path():
    explicit = (os.environ.get("ANIME_SEG_MODEL") or "").strip()
    if explicit:
        return os.path.abspath(os.path.expanduser(explicit))
    cache = os.environ.get("XDG_CACHE_HOME") or os.path.join("~", ".cache")
    return os.path.abspath(os.path.expanduser(os.path.join(cache, "manga-editor", "isnet-anime.onnx")))


def cached():
    p = seg_path()
    return os.path.isfile(p) and os.path.getsize(p) == SEG_BYTES


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
    target = seg_path()
    os.makedirs(os.path.dirname(target), exist_ok=True)
    tmp = target + ".part"
    try:
        with opener(url, timeout=180) as r, open(tmp, "wb") as f:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
        if _sha256(tmp) != SEG_SHA256:
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


def find_characters(rgb, seg, predictor=None, min_frac=0.03):
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
        n, lab, stats, _ = cv2.connectedComponentsWithStats(fg.astype(np.uint8), 8)
        parea = (x1 - x0) * (y1 - y0)
        for k in range(1, n):
            cx, cy, cw, ch, area = stats[k]
            if area < parea * min_frac:
                continue
            comp = lab == k
            full = np.zeros((H, W), bool)
            full[y0:y1, x0:x1] = comp
            pm = np.zeros((H, W), bool)
            pm[y0:y1, x0:x1] = True
            for m in _split(rgb, full, (x0 + cx, y0 + cy, cw, ch), predictor, parea * min_frac, pm, parea):
                m = _largest(m & ~bubbles)
                if m.sum() < parea * min_frac or rgb[m].mean() > 212:   # bubble / leftover speck
                    continue
                ys, xs = np.nonzero(m)
                bx = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
                sub = m[bx[1]:bx[3], bx[0]:bx[2]]
                chars.append({"panel": pi, "box": bx, "area": int(m.sum()),
                              "polygon": outline(m.astype(np.uint8)), "mask": _png_box(sub),
                              "descriptor": descriptor(rgb, m)})
    chars.sort(key=lambda c: (c["panel"], -c["area"]))
    for i, c in enumerate(chars):
        c["id"] = "c%d" % (i + 1)
    return pans, chars


def detect(payload):
    from manga_model_guard import exclusive
    allow = payload.get("allow_download") is True
    seg = _get_seg(allow)
    import numpy as np
    from PIL import Image
    raw, _w, _h = read_image(payload.get("image"))
    rgb = np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
    predictor = None
    refine = payload.get("refine", True) is not False
    with exclusive("sam2", wait=90):
        if refine:
            try:
                from manga_sam_select import _get_predictor, _embeds
                predictor = _get_predictor(allow)
                _embeds.clear()   # set_image below replaces the predictor's page
            except SmartOcrError as exc:
                if exc.status == 428:
                    raise
                predictor = None  # no torch: isnet masks only
        pans, chars = find_characters(rgb, seg, predictor)
    return {"ok": True, "width": int(rgb.shape[1]), "height": int(rgb.shape[0]), "panels": pans,
            "characters": chars, "refined": predictor is not None}


def _reset_for_tests():
    global _seg
    _seg = None


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
    m = cutout_array(rgb, seg)
    if not m.any():
        raise SmartOcrError("生成结果里没有找到人物，请重试。", 422)
    ys, xs = np.nonzero(m)
    return {"ok": True, "width": int(rgb.shape[1]), "height": int(rgb.shape[0]), "mask": _png_box(m),
            "box": [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], "model": seg is not None}
