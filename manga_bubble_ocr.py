"""Bubble-first OCR for manga pages (pure Pillow, no numpy).

Whole-page Tesseract on artwork is unreliable: hair/cloth strokes become "NN"/"AWS" noise and
vertical bubbles are read as garbage in horizontal mode (measured on scripts/fixtures/novice).
Here we find white, enclosed speech bubbles, OCR each bubble crop in BOTH vertical (jpn_vert,
psm 5) and horizontal (jpn, psm 6) mode and keep the reading with more confident Japanese text.
Coordinates are returned in page space.
"""
import io
from collections import deque

SCALE = 4           # analyse the white mask at 1/4 size
WHITE = 225         # luminance at or above this = bubble paper
MIN_AREA = 0.0015   # bubble area share of the page (at analysis scale)
MAX_AREA = 0.12
MIN_SIDE = 40       # px at full size
MIN_FILL = 0.45     # component pixels / bbox area (ellipse ~0.78, rectangle 1.0)
MAX_BUBBLES = 40


def _is_japanese(ch):
    o = ord(ch)
    return 0x3040 <= o <= 0x30FF or 0x4E00 <= o <= 0x9FFF or 0xFF66 <= o <= 0xFF9F or ch in "ー！？…、。"


def japanese_score(text, confidence):
    jp = sum(1 for c in text if _is_japanese(c))
    other = sum(1 for c in text if not c.isspace() and not _is_japanese(c))
    return jp * confidence / 100.0 - other * 0.8


def _filled_mask(members, w, x0, y0, bw, bh):
    """Component pixels plus every hole they enclose (glyphs inside the bubble)."""
    from PIL import Image
    inside = bytearray(bw * bh)
    for i in members:
        inside[(i // w - y0) * bw + (i % w - x0)] = 1
    outside = bytearray(bw * bh)
    q = deque()
    for x in range(bw):
        for y in (0, bh - 1):
            k = y * bw + x
            if not inside[k] and not outside[k]:
                outside[k] = 1; q.append(k)
    for y in range(bh):
        for x in (0, bw - 1):
            k = y * bw + x
            if not inside[k] and not outside[k]:
                outside[k] = 1; q.append(k)
    while q:
        k = q.popleft(); x, y = k % bw, k // bw
        for j in (k - 1 if x else -1, k + 1 if x < bw - 1 else -1, k - bw if y else -1, k + bw if y < bh - 1 else -1):
            if j >= 0 and not inside[j] and not outside[j]:
                outside[j] = 1; q.append(j)
    return Image.frombytes("L", (bw, bh), bytes(0 if o else 255 for o in outside))


def find_bubbles(png_bytes):
    """Return [(x, y, w, h, crop_png_bytes)] for white enclosed regions that contain ink."""
    from PIL import Image
    img = Image.open(io.BytesIO(png_bytes))
    if img.mode in ("RGBA", "LA") or "transparency" in img.info:
        base = Image.new("RGBA", img.size, (255, 255, 255, 255))
        base.alpha_composite(img.convert("RGBA"))
        img = base
    gray = img.convert("L")
    W, H = gray.size
    small = gray.resize((max(1, W // SCALE), max(1, H // SCALE)), Image.BILINEAR)
    # No max-filter here: it would erase thin bubble outlines and merge the bubble with white
    # background around it. Glyphs are holes inside the component and get filled by _filled_mask.
    from PIL import ImageFilter
    paper = small
    w, h = paper.size
    data = paper.tobytes()
    seen = bytearray(w * h)
    total = w * h
    out = []
    for start in range(total):
        if seen[start] or data[start] < WHITE:
            continue
        q = deque([start]); seen[start] = 1; members = []
        x0 = x1 = start % w; y0 = y1 = start // w; n = 0; touches = False
        while q:
            i = q.popleft(); n += 1; members.append(i)
            x, y = i % w, i // w
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                touches = True
            x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y)
            for j in (i - 1 if x else -1, i + 1 if x < w - 1 else -1, i - w if y else -1, i + w if y < h - 1 else -1):
                if j >= 0 and not seen[j] and data[j] >= WHITE:
                    seen[j] = 1; q.append(j)
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if touches or not (MIN_AREA * total <= n <= MAX_AREA * total):
            continue
        if bw * SCALE < MIN_SIDE or bh * SCALE < MIN_SIDE or n / float(bw * bh) < MIN_FILL:
            continue
        box = (x0 * SCALE, y0 * SCALE, min(W, (x1 + 1) * SCALE), min(H, (y1 + 1) * SCALE))
        crop = gray.crop(box)
        # Keep only the bubble interior: the closed outline makes Tesseract return nothing.
        small_mask = _filled_mask(members, w, x0, y0, bw, bh)
        padded = Image.new("L", (bw + 2, bh + 2), 0)  # black border so the erosion also eats the bbox extremes
        padded.paste(small_mask, (1, 1))
        full = padded.resize(((bw + 2) * SCALE, (bh + 2) * SCALE), Image.BILINEAR).filter(ImageFilter.MinFilter(4 * SCALE + 1))
        mask = full.crop((SCALE, SCALE, SCALE + crop.size[0], SCALE + crop.size[1])).point(lambda v: 255 if v >= 250 else 0)
        crop = Image.composite(crop, Image.new("L", crop.size, 255), mask)
        hist = crop.histogram()
        ink = sum(hist[:110]) / float(max(1, crop.size[0] * crop.size[1]))
        if not 0.005 <= ink <= 0.35:
            continue
        # pad with white so glyphs at the edge are not cut by Tesseract
        pad = Image.new("L", (crop.size[0] + 40, crop.size[1] + 40), 255)
        pad.paste(crop, (20, 20))
        buf = io.BytesIO(); pad.save(buf, "PNG")
        out.append((box[0], box[1], box[2] - box[0], box[3] - box[1], buf.getvalue()))
        if len(out) >= MAX_BUBBLES:
            break
    return out


def _words(tsv):
    import csv
    out = []
    for item in csv.DictReader(io.StringIO(tsv.decode("utf-8", "replace") if isinstance(tsv, bytes) else (tsv or "")), delimiter="\t"):
        try:
            if int(item.get("level") or -1) != 5:
                continue
            conf = float(item.get("conf") or -1)
            text = (item.get("text") or "").strip()
            if conf < 30 or not text:
                continue
            out.append({"x": int(item["left"]), "y": int(item["top"]), "w": int(item["width"]), "h": int(item["height"]),
                        "text": text, "conf": conf})
        except (ValueError, TypeError, KeyError):
            continue
    return out


def _same_glyph(a, b):
    area = min(max(1, a["w"] * a["h"]), max(1, b["w"] * b["h"]))
    ix = max(0, min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"]))
    iy = max(0, min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"]))
    if ix * iy >= 0.5 * area:
        return True
    # a glyph split in two (e.g. the dakuten of が read as a second が right next to it)
    near = abs((a["x"] + a["w"] / 2) - (b["x"] + b["w"] / 2)) <= max(a["w"], b["w"]) * 1.2
    return a["text"] == b["text"] and near and iy >= 0.5 * min(a["h"], b["h"])


def _dedupe(words):
    """Tesseract sometimes reads one glyph twice (overlapping lines, split glyphs); keep the surer one."""
    kept = []
    for word in sorted(words, key=lambda w: -w["conf"]):
        if not any(_same_glyph(word, k) for k in kept):
            kept.append(word)
    return kept


def _reading_order(words, vertical):
    if not words:
        return ""
    if not vertical:
        return "".join(w["text"] for w in sorted(words, key=lambda w: (w["y"] + w["h"] // 2, w["x"])))
    # columns right -> left (cluster by x centre), each column top -> bottom
    size = max(8, sorted(w["w"] for w in words)[len(words) // 2])
    columns = []
    for word in sorted(words, key=lambda w: -(w["x"] + w["w"] / 2)):
        cx = word["x"] + word["w"] / 2
        for col in columns:
            if abs(col["cx"] - cx) <= size * 0.6:
                col["words"].append(word); break
        else:
            columns.append({"cx": cx, "words": [word]})
    return "".join("".join(w["text"] for w in sorted(c["words"], key=lambda w: w["y"])) for c in columns)


def read_bubble(run_tesseract, parse_tsv, bubble):
    """OCR one bubble in vertical and horizontal mode; return the better region or None."""
    x, y, w, h, crop = bubble
    best = None
    for language, psm, vertical in (("jpn_vert", "5", True), ("jpn", "6", False)):
        words = _dedupe(_words(run_tesseract(crop, language, psm)))
        if not words:
            continue
        text = _reading_order(words, vertical).replace(" ", "")
        conf = sum(w["conf"] for w in words) / len(words)
        score = japanese_score(text, conf)
        if best is None or score > best[0]:
            best = (score, text, conf, words)
    if not best or best[0] < 1.0:
        return None
    words = best[3]
    # page-space text box (the crop was padded by 20px); orientation from the block's shape,
    # not from which Tesseract mode won (a single column reads fine in both).
    tx0 = min(w_["x"] for w_ in words) - 20; ty0 = min(w_["y"] for w_ in words) - 20
    tx1 = max(w_["x"] + w_["w"] for w_ in words) - 20; ty1 = max(w_["y"] + w_["h"] for w_ in words) - 20
    tx0 = max(0, tx0); ty0 = max(0, ty0); tx1 = min(w, tx1); ty1 = min(h, ty1)
    vertical = (ty1 - ty0) > (tx1 - tx0) * 1.3
    return {"text": best[1][:500], "x": x + tx0, "y": y + ty0, "width": max(1, tx1 - tx0), "height": max(1, ty1 - ty0),
            "confidence": round(best[2], 1), "vertical": vertical,
            "bubble": {"x": x, "y": y, "width": w, "height": h}}
