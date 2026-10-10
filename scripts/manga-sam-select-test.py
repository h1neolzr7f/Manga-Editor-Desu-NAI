"""SAM 2.1 tiny click-select: consent, integrity, input guards (offline, CI) + real page-4 clicks (local, model cached)."""
import base64
import importlib.util
import io
import os
import sys
import tempfile
import time
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import manga_sam_select as S  # noqa: E402
from manga_smart_ocr import SmartOcrError  # noqa: E402

FIXTURE = os.path.join(ROOT, "scripts", "fixtures", "ctd", "page-4.png")
HAS_RUNTIME = S.runtime_available()
HAS_CV2 = importlib.util.find_spec("cv2") is not None


def page4():
    with open(FIXTURE, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


class Offline(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.old = os.environ.get("SAM2_MODEL")
        os.environ["SAM2_MODEL"] = os.path.join(self.tmp.name, "sam.pt")
        S._reset_for_tests()

    def tearDown(self):
        if self.old is None:
            os.environ.pop("SAM2_MODEL", None)
        else:
            os.environ["SAM2_MODEL"] = self.old
        S._reset_for_tests()
        self.tmp.cleanup()

    def test_no_silent_download(self):
        if not HAS_RUNTIME:
            with self.assertRaises(SmartOcrError) as e:
                S.select({"imageId": "x", "image": page4(), "points": [[10, 10, 1]]})
            self.assertEqual(e.exception.status, 501)          # no torch: readable, client keeps box select
            self.assertIn("矩形或套索", str(e.exception))
            return
        with self.assertRaises(SmartOcrError) as e:
            S.select({"imageId": "x", "image": page4(), "points": [[10, 10, 1]]})
        self.assertEqual(e.exception.status, 428)
        self.assertTrue(e.exception.extra["needs_download"])
        self.assertEqual(e.exception.extra["model"], "sam2")
        self.assertFalse(os.path.exists(os.environ["SAM2_MODEL"]))

    def test_bad_download_is_deleted(self):
        class R(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *a): return False
        with self.assertRaises(SmartOcrError) as e:
            S.download(opener=lambda url, timeout: R(b"not the weights"))
        self.assertEqual(e.exception.status, 502)
        self.assertFalse(os.path.exists(S.weights_path()))
        self.assertFalse(os.path.exists(S.weights_path() + ".part"))

    def test_points_validation(self):
        pts = S._clean_points([[5, 5, 1], [500, 5, 1], ["a"], [3, 3, 0]] + [[1, 1, 1]] * 40, 100, 100)
        self.assertEqual(pts[0], (5.0, 5.0, 1))
        self.assertTrue(all(0 <= x < 100 for x, _y, _l in pts))   # out-of-page point dropped
        self.assertLessEqual(len(pts), S.MAX_POINTS)
        with self.assertRaises(SmartOcrError) as e:
            S._clean_points([[3, 3, 0]], 100, 100)               # only "remove" clicks: nothing to select
        self.assertEqual(e.exception.status, 400)
        with self.assertRaises(SmartOcrError):
            S.select({"points": [[1, 1, 1]]})                     # imageId required

    def test_status_reports_sam(self):
        from manga_smart_ocr import local_model_status
        s = local_model_status()["samSelect"]
        self.assertEqual(set(s), {"ready", "cached"})
        self.assertFalse(s["cached"])

    @unittest.skipUnless(HAS_CV2, "opencv not installed")
    def test_outline_is_simplified_polygon(self):
        import numpy as np
        m = np.zeros((200, 300), np.uint8)
        m[50:150, 60:240] = 1
        m[10:14, 10:14] = 1                                      # small speck: largest contour wins
        poly = S.outline(m)
        xs, ys = [p[0] for p in poly], [p[1] for p in poly]
        self.assertEqual((min(xs), min(ys), max(xs), max(ys)), (60, 50, 239, 149))
        self.assertLessEqual(len(poly), 8)


@unittest.skipUnless(HAS_RUNTIME and S.cached(), "SAM 2.1 tiny weights / torch not installed")
class Page4(unittest.TestCase):
    """page-4 fixture (1238x1754): the cat in the bottom panel sits around (600, 1510)."""

    @classmethod
    def setUpClass(cls):
        S._reset_for_tests()
        t = time.time()
        cls.first = S.select({"imageId": "p4", "image": page4(), "points": [[600, 1500, 1]]})
        cls.first_s = time.time() - t

    def test_three_candidates_small_to_large(self):
        c = self.first["candidates"]
        self.assertEqual(len(c), 3)
        self.assertEqual([x["area"] for x in c], sorted(x["area"] for x in c))
        for x in c:
            self.assertTrue(x["mask"].startswith("data:image/png;base64,"))
            from PIL import Image
            m = Image.open(io.BytesIO(base64.b64decode(x["mask"].split(",", 1)[1])))
            self.assertEqual(m.mode, "LA")                                    # transparent outside: tint only the shape
            self.assertEqual(int((__import__("numpy").array(m)[..., 1] > 0).sum()), x["area"])
            self.assertGreaterEqual(len(x["polygon"]), 3)
            x0, y0, x1, y1 = x["box"]
            self.assertTrue(x0 <= 600 <= x1 and y0 <= 1500 <= y1, x["box"])   # contains the click

    def test_cat_candidate_stays_in_the_cat_panel(self):
        # one candidate is the cat alone: well inside the bottom panel, not the girl/page
        cat = [x for x in self.first["candidates"] if 10000 < x["area"] < 80000]
        self.assertTrue(cat, [(x["area"], x["box"]) for x in self.first["candidates"]])
        x0, y0, x1, y1 = cat[0]["box"]
        self.assertGreater(y0, 1300)
        self.assertLess(x1 - x0, 400)

    def test_followup_clicks_reuse_the_embedding_and_negative_click_shrinks(self):
        t = time.time()
        r = S.select({"imageId": "p4", "points": [[600, 1500, 1]]})                 # no image: cached
        self.assertLess(time.time() - t, 5)
        largest = max(x["area"] for x in r["candidates"])
        neg = S.select({"imageId": "p4", "points": [[600, 1500, 1], [200, 1600, 0]]})
        self.assertLessEqual(max(x["area"] for x in neg["candidates"]), largest)

    def test_unknown_page_asks_for_the_image(self):
        with self.assertRaises(SmartOcrError) as e:
            S.select({"imageId": "never-sent", "points": [[5, 5, 1]]})
        self.assertEqual(e.exception.status, 409)


if __name__ == "__main__":
    unittest.main(verbosity=1)
