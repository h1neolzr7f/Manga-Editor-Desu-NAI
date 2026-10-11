"""Bubble-first 'auto' OCR on real manga-like pages (needs Tesseract jpn + jpn_vert, Pillow).

Regression for the novice E2E finding (2026-10-10): with the old default (jpn+eng, psm 11) the
vertical bubble on scripts/fixtures/novice/page1.png came back as noise ("NN", "の", "ンクグ/").
"""
import base64
import os
import shutil
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import manga_bubble_ocr as bubble  # noqa: E402
import manga_smart_ocr as ocr  # noqa: E402

FIX = os.path.join(ROOT, "scripts", "fixtures", "novice")


def data_url(name):
    with open(os.path.join(FIX, name), "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


class PureHelpers(unittest.TestCase):
    def test_split_glyph_is_deduped(self):
        words = [{"text": "が", "x": 140, "y": 205, "w": 13, "h": 27, "conf": 92},
                 {"text": "が", "x": 112, "y": 208, "w": 28, "h": 32, "conf": 91},
                 {"text": "あり", "x": 114, "y": 100, "w": 37, "h": 91, "conf": 96}]
        kept = bubble._dedupe(words)
        self.assertEqual(bubble._reading_order(kept, True), "ありが")

    def test_vertical_columns_read_right_to_left(self):
        words = [{"text": "い", "x": 10, "y": 0, "w": 30, "h": 30, "conf": 90},
                 {"text": "あ", "x": 60, "y": 0, "w": 30, "h": 30, "conf": 90},
                 {"text": "う", "x": 10, "y": 40, "w": 30, "h": 30, "conf": 90}]
        self.assertEqual(bubble._reading_order(words, True), "あいう")

    def test_score_prefers_japanese(self):
        self.assertGreater(bubble.japanese_score("ありがとう", 90), bubble.japanese_score("NN AWS", 95))


@unittest.skipUnless(shutil.which("tesseract"), "tesseract not installed")
class RealPages(unittest.TestCase):
    def test_auto_reads_vertical_bubbles_on_both_pages(self):
        for name, expected in (("page1.png", "ありがとう"), ("page2.png", "まってよ")):
            result = ocr.ocr_image(data_url(name), "auto")
            texts = [r["text"] for r in result["regions"]]
            self.assertIn(expected, texts, name + " " + repr(texts))
            region = next(r for r in result["regions"] if r["text"] == expected)
            self.assertTrue(region["vertical"], name)
            # tight text box inside the bubble (860..1100 x 90..510 on the fixture)
            self.assertTrue(860 <= region["x"] and region["x"] + region["width"] <= 1100, region)
            self.assertTrue(90 <= region["y"] and region["y"] + region["height"] <= 512, region)
            # no artwork noise from the character's hair / clothes
            self.assertEqual(len(texts), 1, repr(texts))

    def test_auto_is_default(self):
        self.assertIn("auto", ocr.LANGUAGES)
        self.assertEqual(ocr.ocr_image.__defaults__[0], "auto")


if __name__ == "__main__":
    unittest.main(verbosity=2)
