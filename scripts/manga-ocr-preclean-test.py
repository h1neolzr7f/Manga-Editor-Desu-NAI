#!/usr/bin/env python3
"""Bubble-outline pre-clean for Tesseract.

Unit tests always run (need Pillow). The REAL test runs only if a tesseract binary with
the jpn pack is present: it proves raw Tesseract misses text inside a closed bubble and the
pre-cleaned pipeline finds it.
"""
import base64, io, os, shutil, subprocess, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("SKIP manga-ocr-preclean-test: Pillow not installed (pre-clean is skipped at runtime too)")
    sys.exit(0)
import manga_smart_ocr as ocr
from manga_ocr_preclean import strip_frames

FONT = next((p for p in ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                         "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
                         "C:/Windows/Fonts/msgothic.ttc") if os.path.exists(p)), None)


def page(text=True, ellipse=True, tone=True, W=900, H=600):
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    if tone:
        for y in range(0, H, 7):
            for x in range((y // 7 % 2) * 3, W, 7):
                d.rectangle([x, y, x + 1, y + 1], fill=(85, 85, 85))
    d.rectangle([4, 4, W - 5, H - 5], outline="black", width=5)      # panel border
    d.line([0, 520, W, 380], fill="black", width=6)                  # speed line
    if ellipse:
        d.ellipse([160, 190, 680, 410], fill="white", outline="black", width=4)
    else:
        d.rectangle([160, 190, 680, 410], fill="white")
    d.rectangle([720, 60, 860, 160], fill="black")                    # solid fill (hair) must survive
    if text:
        font = ImageFont.truetype(FONT, 56) if FONT else ImageFont.load_default()
        d.text((280, 270), "ありがとう", font=font, fill="black")
    return im


def png(im):
    b = io.BytesIO(); im.save(b, format="PNG"); return b.getvalue()


class PrecleanUnit(unittest.TestCase):
    def test_outlines_lines_and_borders_removed_glyphs_and_fills_kept(self):
        im = page()
        out = Image.open(io.BytesIO(strip_frames(png(im), *im.size))).convert("L")
        px = out.load()
        self.assertEqual(px[420, 192], 255, "bubble outline should be whitened")
        self.assertEqual(px[6, 300], 255, "panel border should be whitened")
        self.assertEqual(px[790, 110], 0, "solid fill must be kept")
        src = im.convert("L").load()
        glyph = [(x, y) for x in range(280, 560) for y in range(270, 340) if src[x, y] < 100]
        self.assertTrue(glyph)
        self.assertTrue(all(px[x, y] < 140 for x, y in glyph), "glyph ink must be untouched")
        self.assertEqual(out.size, im.size)

    def test_big_sfx_glyphs_are_not_whitened(self):
        if not FONT:
            self.skipTest("needs a CJK font")
        for path in [FONT] + [p for p in ("/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",) if os.path.exists(p)]:
            for text in ("ドン", "シーン", "ザワ"):
                im = Image.new("L", (1000, 400), 255)
                ImageDraw.Draw(im).text((20, 40), text, font=ImageFont.truetype(path, 260), fill=0)
                out = strip_frames(png(im), 1000, 400)
                if out is None:
                    continue
                o = Image.open(io.BytesIO(out)).convert("L").tobytes()
                lost = sum(1 for a, c in zip(im.tobytes(), o) if a < 140 and c >= 140)
                self.assertEqual(lost, 0, (path, text))

    def test_speed_lines_removed_even_without_text(self):
        im = Image.new("RGB", (600, 600), "white"); d = ImageDraw.Draw(im)
        d.line([0, 0, 599, 599], fill="black", width=4)        # diagonal speed line
        d.line([10, 300, 590, 310], fill="black", width=3)     # long horizontal line
        out = Image.open(io.BytesIO(strip_frames(png(im), 600, 600))).convert("L")
        self.assertEqual(out.getextrema(), (255, 255))

    def test_nothing_to_remove_returns_none(self):
        im = Image.new("RGB", (300, 200), "white")
        ImageDraw.Draw(im).rectangle([20, 20, 40, 40], fill="black")
        self.assertIsNone(strip_frames(png(im), 300, 200))

    def test_transparent_png_is_composited_on_white(self):
        im = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
        ImageDraw.Draw(im).ellipse([20, 20, 380, 380], outline=(0, 0, 0, 255), width=3)
        out = Image.open(io.BytesIO(strip_frames(png(im), 400, 400))).convert("L")
        self.assertEqual(out.getextrema(), (255, 255))

    def test_merge_keeps_primary_and_adds_non_overlapping(self):
        a = {"text": "A", "x": 10, "y": 10, "width": 50, "height": 20}
        b = {"text": "B", "x": 12, "y": 12, "width": 50, "height": 20}
        c = {"text": "C", "x": 300, "y": 10, "width": 50, "height": 20}
        self.assertEqual([r["text"] for r in ocr.merge_regions([a], [b, c])], ["A", "C"])


@unittest.skipUnless(shutil.which("tesseract") and FONT, "REAL test needs tesseract + a CJK font")
class PrecleanReal(unittest.TestCase):
    def test_real_tesseract_reads_text_inside_closed_bubble(self):
        langs = subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True).stdout
        if "jpn" not in langs.split():
            self.skipTest("jpn traineddata missing")
        im = page()
        raw = subprocess.run(["tesseract", "stdin", "stdout", "-l", "jpn+eng", "--psm", "11"],
                             input=png(im), capture_output=True).stdout.decode("utf-8", "replace")
        self.assertNotIn("ありがとう", raw.replace(" ", ""), "premise: raw Tesseract misses bubble text")
        url = "data:image/png;base64," + base64.b64encode(png(im)).decode()
        result = ocr.ocr_image(url, "jpn+eng")
        texts = [r["text"].replace(" ", "") for r in result["regions"]]
        self.assertTrue(result["preclean"])
        self.assertTrue(any("ありがとう" in t for t in texts), texts)
        hit = next(r for r in result["regions"] if "ありがとう" in r["text"].replace(" ", ""))
        self.assertTrue(270 <= hit["x"] + hit["width"] // 2 <= 580 and 260 <= hit["y"] <= 340, hit)


if __name__ == "__main__":
    unittest.main(verbosity=2)
