"""Remove speech-bubble outlines, panel borders and long lines before Tesseract.

Real Tesseract 5 returns *nothing* for text enclosed by a closed outline (a speech
bubble) - verified on Linux with tesseract 5.5 jpn/jpn_vert. We whiten only large,
thin dark connected components; glyph-sized components and solid fills are kept, and
pixel coordinates do not change, so OCR boxes stay in page space.

Pure Pillow + Python (run-length union-find), because the Windows portable bundle
only ships Pillow. Returns None when Pillow is unavailable or nothing was removed.
"""
import io

DARK = 140          # luminance below this is "ink"
MAX_GLYPH = 0.075   # components larger than this share of the page's short side are not glyphs
MIN_BIG_PX = 150    # ...but never treat anything below 150px as "large"
MAX_FILL = 0.22     # outline / line: ink pixels / bbox area


def _find(parent, i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]
        i = parent[i]
    return i


def strip_frames(png_bytes, width, height):
    try:
        from PIL import Image
    except ImportError:
        return None
    gray = Image.open(io.BytesIO(png_bytes))
    if gray.mode in ("RGBA", "LA") or "transparency" in gray.info:
        base = Image.new("RGBA", gray.size, (255, 255, 255, 255))
        base.alpha_composite(gray.convert("RGBA"))
        gray = base
    gray = gray.convert("L")
    data = gray.tobytes()
    big = max(MIN_BIG_PX, int(min(width, height) * MAX_GLYPH))
    # 1. dark runs per row
    runs = []          # (y, x0, x1)
    row_runs = []
    for y in range(height):
        row = data[y * width:(y + 1) * width]
        start = None
        this = []
        for x, value in enumerate(row):
            if value < DARK:
                if start is None:
                    start = x
            elif start is not None:
                this.append(len(runs)); runs.append((y, start, x - 1)); start = None
        if start is not None:
            this.append(len(runs)); runs.append((y, start, width - 1))
        row_runs.append(this)
    if not runs:
        return None
    parent = list(range(len(runs)))
    # 2. union runs overlapping (8-connected) with the previous row
    for y in range(1, height):
        prev, cur = row_runs[y - 1], row_runs[y]
        i = j = 0
        while i < len(prev) and j < len(cur):
            _, a0, a1 = runs[prev[i]]
            _, b0, b1 = runs[cur[j]]
            if a0 <= b1 + 1 and b0 <= a1 + 1:
                ra, rb = _find(parent, prev[i]), _find(parent, cur[j])
                if ra != rb:
                    parent[rb] = ra
            if a1 < b1:
                i += 1
            else:
                j += 1
    # 3. component stats
    stats = {}
    for idx, (y, x0, x1) in enumerate(runs):
        r = _find(parent, idx)
        s = stats.get(r)
        if s is None:
            stats[r] = [x0, y, x1, y, x1 - x0 + 1]
        else:
            if x0 < s[0]: s[0] = x0
            if x1 > s[2]: s[2] = x1
            if y > s[3]: s[3] = y
            s[4] += x1 - x0 + 1
    remove = set()
    for root, (x0, y0, x1, y1, ink) in stats.items():
        w, h = x1 - x0 + 1, y1 - y0 + 1
        if max(w, h) >= big and ink / float(w * h) <= MAX_FILL:
            remove.add(root)
    if not remove:
        return None
    out = bytearray(data)
    for idx, (y, x0, x1) in enumerate(runs):
        if _find(parent, idx) in remove:
            base = y * width
            out[base + x0:base + x1 + 1] = b"\xff" * (x1 - x0 + 1)
    buf = io.BytesIO()
    Image.frombytes("L", (width, height), bytes(out)).save(buf, format="PNG")
    return buf.getvalue()
