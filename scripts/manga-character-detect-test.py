"""换角色 v2 local detection: panels, characters, bubbles removed, cutout. Model tests skip when weights absent."""
import base64
import io
import os
import sys
import tempfile
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

import manga_character_detect as D  # noqa: E402
from manga_smart_ocr import SmartOcrError  # noqa: E402

try:
    import numpy as np
    import cv2  # noqa: F401
    HAVE_NP = True
except Exception:
    HAVE_NP = False

FIX = os.path.join(ROOT, "scripts", "fixtures", "ctd", "page-4.png")


def data_url(path):
    return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()


class Offline(unittest.TestCase):
    def test_consent_required_before_download(self):
        if not D.runtime_available():
            self.skipTest("onnxruntime/cv2 not installed")
        old = os.environ.get("ANIME_SEG_MODEL")
        os.environ["ANIME_SEG_MODEL"] = os.path.join(tempfile.mkdtemp(), "none.onnx")
        D._reset_for_tests()
        try:
            with self.assertRaises(SmartOcrError) as ctx:
                D._get_seg(False)
            self.assertEqual(ctx.exception.status, 428)
        finally:
            if old is None:
                os.environ.pop("ANIME_SEG_MODEL")
            else:
                os.environ["ANIME_SEG_MODEL"] = old
            D._reset_for_tests()

    def test_bad_download_is_rejected(self):
        old = os.environ.get("ANIME_SEG_MODEL")
        os.environ["ANIME_SEG_MODEL"] = os.path.join(tempfile.mkdtemp(), "x.onnx")
        try:
            class R(io.BytesIO):
                def __enter__(self):
                    return self

                def __exit__(self, *a):
                    return False
            with self.assertRaises(SmartOcrError) as ctx:
                D.download(opener=lambda url, timeout: R(b"not a model"))
            self.assertEqual(ctx.exception.status, 502)
            self.assertFalse(os.path.exists(D.seg_path()))
        finally:
            if old is None:
                os.environ.pop("ANIME_SEG_MODEL")
            else:
                os.environ["ANIME_SEG_MODEL"] = old

    @unittest.skipUnless(HAVE_NP, "numpy/cv2 missing")
    def test_panels_xy_cut_reading_order(self):
        page = np.full((400, 300, 3), 255, np.uint8)
        for x0, y0, x1, y1 in [(10, 10, 290, 150), (160, 170, 290, 390), (10, 170, 145, 390)]:
            page[y0:y1, x0:x1] = 90
        p = D.panels(page)
        self.assertEqual(len(p), 3)
        self.assertEqual(p[0][:2], [10, 10])
        self.assertGreater(p[1][0], p[2][0], "right panel before left (manga order)")

    @unittest.skipUnless(HAVE_NP, "numpy/cv2 missing")
    def test_no_bubble_subtraction_without_text_model(self):
        img = np.full((300, 300, 3), 80, np.uint8)
        cv2.ellipse(img, (150, 150), (60, 40), 0, 0, 360, (255, 255, 255), -1)
        self.assertFalse(D.bubble_mask(img, [[0, 0, 300, 300]], None).any(), "a white face is not a bubble")
        text = np.zeros((300, 300), bool)
        text[140:160, 120:180] = True
        self.assertTrue(D.bubble_mask(img, [[0, 0, 300, 300]], text)[150, 150])

    def test_identity_clusters_respect_same_panel_rule(self):
        ids = ["g1", "g2", "b1", "x"]
        panels = [0, 1, 0, 1]
        diff = [[0, .08, .3, .16], [.08, 0, .33, .2], [.3, .33, 0, .1], [.16, .2, .1, 0]]
        c = D.cluster_identities(ids, panels, diff)
        self.assertEqual(c["g1"], c["g2"])
        self.assertNotEqual(c["g1"], c["b1"])
        self.assertEqual(c["b1"], c["x"])             # 0.10 and in different panels
        # x is close to b1 but drawn next to g2? same panel as g2 → can never join the girls' cluster
        self.assertNotEqual(c["x"], c["g2"])

    def test_status_reports_characters(self):
        from manga_smart_ocr import local_model_status
        st = local_model_status()
        self.assertIn("characters", st)
        self.assertIn("cached", st["characters"])


def _models():
    try:
        import manga_sam_select as S
        return D.runtime_available() and D.cached() and S.runtime_available() and S.cached()
    except Exception:
        return False


@unittest.skipUnless(_models() and D.extra_cached(), "isnet-anime / SAM / face+CCIP weights not cached")
class Page4(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.r = D.detect({"image": data_url(FIX)})

    def test_four_panels(self):
        self.assertEqual(len(self.r["panels"]), 4)

    def test_people_found_whole_and_not_bubbles(self):
        chars = self.r["characters"]
        self.assertGreaterEqual(len(chars), 6)
        # the girl in panel 2 (point 150,660) is one whole figure, not her hair
        hits = [c for c in chars if c["box"][0] <= 150 <= c["box"][2] and c["box"][1] <= 660 <= c["box"][3]]
        self.assertTrue(hits)
        self.assertGreater(max(c["box"][3] - c["box"][1] for c in hits), 400)
        # no character is centred on the 「这是还你的伞。」 bubble
        for c in chars:
            cx, cy = (c["box"][0] + c["box"][2]) / 2, (c["box"][1] + c["box"][3]) / 2
            self.assertFalse(260 <= cx <= 600 and 570 <= cy <= 640, c["box"])

    def test_same_girl_across_panels_never_the_boy(self):
        idt = self.r["identity"]
        chars = {c["id"]: c for c in self.r["characters"]}
        at = lambda x, y: next(c["id"] for c in self.r["characters"] if c.get("face") and c["box"][0] <= x <= c["box"][2] and c["box"][1] <= y <= c["box"][3])
        g1, g2, boy1 = at(500, 150), at(200, 700), at(1000, 200)
        self.assertEqual(idt["cluster"][g1], idt["cluster"][g2], "the girl in panels 1 and 2")
        self.assertNotEqual(idt["cluster"][g1], idt["cluster"][boy1])
        p4 = [i for i, c in chars.items() if c["panel"] == 3 and i in idt["cluster"]]
        self.assertEqual(len({idt["cluster"][i] for i in p4}), len(p4), "people in one panel are different")

    def test_cat_is_separate_from_the_girl_in_panel_4(self):
        cats = [c for c in self.r["characters"] if c["panel"] == 3 and c["box"][0] >= 480 and c["box"][2] <= 740 and c["box"][1] >= 1420]
        self.assertTrue(cats, "the cat is its own character")

    def test_masks_stay_in_their_panel(self):
        for c in self.r["characters"]:
            p = self.r["panels"][c["panel"]]
            b = c["box"]
            self.assertTrue(b[0] >= p[0] - 2 and b[1] >= p[1] - 2 and b[2] <= p[2] + 2 and b[3] <= p[3] + 2, (b, p))


if __name__ == "__main__":
    unittest.main(verbosity=2)
