#!/usr/bin/env python3
"""REAL (not mocked) acceptance for the local OCR / manga-ocr / LaMa routes.

Requires a running 99_server.py on 127.0.0.1:8000 started with a Python that has
Tesseract (jpn, jpn_vert), manga-ocr and simple-lama-inpainting installed.
Downloads model weights only after the explicit 428 consent round-trip.
Usage: python scripts/manga-real-model-acceptance.py [outdir]
"""
import base64, io, json, os, sys, time, urllib.request, urllib.error
from PIL import Image, ImageDraw, ImageFont

BASE = "http://127.0.0.1:8000"
OUT = sys.argv[1] if len(sys.argv) > 1 else "artifacts/real-models"
os.makedirs(OUT, exist_ok=True)
FONT = next((p for p in ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                         "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
                         "C:/Windows/Fonts/msgothic.ttc") if os.path.exists(p)), None)
results = []

def record(name, ok, detail):
    results.append({"name": name, "pass": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name, json.dumps(detail, ensure_ascii=False))

def data_url(im):
    b = io.BytesIO(); im.save(b, format="PNG")
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()

def from_data_url(u):
    return Image.open(io.BytesIO(base64.b64decode(u.split(",", 1)[1])))

def post(route, body, timeout=900):
    req = urllib.request.Request(BASE + route, json.dumps(body).encode(), method="POST", headers={
        "Content-Type": "application/json", "Origin": BASE, "Sec-Fetch-Site": "same-origin"})
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read()), time.time() - t
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}"), time.time() - t

def font(size):
    return ImageFont.truetype(FONT, size) if FONT else ImageFont.load_default()

def vertical_page(text, size=40):
    im = Image.new("RGB", (220, 80 + size * len(text) + 40), "white"); d = ImageDraw.Draw(im)
    d.ellipse([10, 10, 210, im.height - 10], fill="white", outline="black", width=3)
    for i, ch in enumerate(text):
        d.text((90, 60 + i * (size + 4)), ch, font=font(size), fill="black")
    return im

def toned_page():
    W, H = 517, 389  # deliberately not a multiple of 8 (simple-lama pads)
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    for y in range(0, H, 6):
        for x in range(0, W, 6):
            d.ellipse([x, y, x + 2, y + 2], fill=(80, 80, 80))
    d.line([0, 400, W, 340], fill="black", width=4)          # a line that crosses near the mask
    d.rectangle([140, 150, 370, 300], fill="white", outline="black", width=3)
    d.text((165, 195), "こんにちは", font=font(38), fill="black")
    m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).rectangle([158, 188, 356, 248], fill=255)
    return im, m

# 1. Tesseract real OCR, vertical Japanese
text = "今日は晴れです"
vp = vertical_page(text); vp.save(f"{OUT}/ocr-vertical.png")
s, j, dt = post("/manga-smart/ocr", {"image": data_url(vp), "language": "jpn_vert+eng"}, 120)
got = "".join(b.get("text", "") for b in j.get("regions", []) if isinstance(b, dict)) or json.dumps(j, ensure_ascii=False)[:200]
hit = sum(c in got for c in text)
record("REAL Tesseract jpn_vert OCR reads vertical Japanese", s == 200 and hit >= len(text) - 2,
       {"status": s, "secs": round(dt, 2), "expected": text, "got": got[:80], "chars_matched": hit})

hp = Image.new("RGB", (520, 120), "white"); ImageDraw.Draw(hp).text((20, 30), "おはようございます", font=font(44), fill="black")
hp.save(f"{OUT}/ocr-horizontal.png")
s, j, dt = post("/manga-smart/ocr", {"image": data_url(hp), "language": "jpn+eng"}, 120)
got = "".join(b.get("text", "") for b in j.get("regions", []) if isinstance(b, dict)).replace(" ", "")
record("REAL Tesseract jpn OCR reads horizontal Japanese", s == 200 and sum(c in got for c in "おはようございます") >= 7,
       {"status": s, "secs": round(dt, 2), "got": got[:80]})

# 2. manga-ocr consent then real inference
crop = vertical_page("やめろ", 48); crop.save(f"{OUT}/manga-ocr-crop.png")
s, j, dt = post("/manga-smart/manga-ocr", {"image": data_url(crop)})
cached = s == 200
record("manga-ocr without consent returns 428 (or 200 if weights already cached)", s in (428, 200),
       {"status": s, "needs_download": j.get("needs_download"), "model": j.get("model")})
s, j, dt = post("/manga-smart/manga-ocr", {"image": data_url(crop), "allow_download": True})
txt = j.get("text", "")
record("REAL manga-ocr download+inference", s == 200 and sum(c in txt for c in "やめろ") >= 2,
       {"status": s, "secs_incl_download": round(dt, 1), "text": txt, "was_cached": cached})
s, j, dt = post("/manga-smart/manga-ocr", {"image": data_url(crop)})
record("REAL manga-ocr warm inference (no re-download, no consent needed)", s == 200,
       {"status": s, "secs": round(dt, 2), "text": j.get("text", "")})

# 3. LaMa consent, real inference, out-of-mask invariance
src, mask = toned_page(); src.save(f"{OUT}/lama-src.png"); mask.save(f"{OUT}/lama-mask.png")
s, j, dt = post("/manga-smart/lama-inpaint", {"image": data_url(src), "mask": data_url(mask)})
record("LaMa without consent returns 428 (or 200 if weights already cached)", s in (428, 200),
       {"status": s, "needs_download": j.get("needs_download"), "model": j.get("model")})
s, j, dt = post("/manga-smart/lama-inpaint", {"image": data_url(src), "mask": data_url(mask), "allow_download": True})
ok = s == 200 and j.get("ok")
detail = {"status": s, "secs_incl_download": round(dt, 1), "engine": j.get("engine"), "error": j.get("error")}
if ok:
    out = from_data_url(j["image"]).convert("RGB"); out.save(f"{OUT}/lama-out.png")
    sp, op, mp = src.load(), out.load(), mask.load()
    outside_diff = inside_changed = inside_total = 0
    for y in range(src.height):
        for x in range(src.width):
            if mp[x, y] >= 128:
                inside_total += 1
                inside_changed += sp[x, y] != op[x, y]
            else:
                outside_diff += sp[x, y] != op[x, y]
    # residual dark text pixels inside the mask
    dark = sum(1 for y in range(188, 249) for x in range(158, 357) if sum(op[x, y]) < 150)
    detail.update(size=out.size, outside_mask_changed_pixels=outside_diff,
                  inside_changed_ratio=round(inside_changed / inside_total, 3), dark_pixels_left_in_mask=dark)
    record("REAL LaMa download+inference", True, detail)
    record("REAL LaMa pixels outside the mask are bit-identical", outside_diff == 0 and out.size == src.size,
           {"outside_mask_changed_pixels": outside_diff})
    record("REAL LaMa removed the text inside the mask", dark < 200, {"dark_pixels_left_in_mask": dark})
    s, j2, dt = post("/manga-smart/lama-inpaint", {"image": data_url(src), "mask": data_url(mask)})
    record("REAL LaMa warm inference", s == 200, {"status": s, "secs": round(dt, 2)})
else:
    record("REAL LaMa download+inference", False, detail)

json.dump(results, open(f"{OUT}/results.json", "w"), ensure_ascii=False, indent=1)
fails = [r for r in results if not r["pass"]]
print(f"{len(results) - len(fails)} PASS, {len(fails)} FAIL")
sys.exit(1 if fails else 0)
