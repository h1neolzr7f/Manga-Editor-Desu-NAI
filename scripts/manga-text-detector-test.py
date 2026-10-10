"""comic-text-detector erase-mask tests. Model part skips when weights/onnxruntime are absent (CI)."""
import base64, io, os, sys, tempfile, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.dont_write_bytecode = True
import manga_text_detector as td
from manga_smart_ocr import SmartOcrError, local_model_status

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "ctd", "page-4.png")


def png_url(raw):
    from PIL import Image
    buf = io.BytesIO(); Image.open(io.BytesIO(raw)).convert("RGB").save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


class Offline(unittest.TestCase):
    def setUp(self):
        self.old = os.environ.get("CTD_MODEL"); self.tmp = tempfile.mkdtemp()
        os.environ["CTD_MODEL"] = os.path.join(self.tmp, "ctd.onnx"); td._reset_for_tests()

    def tearDown(self):
        if self.old is None: os.environ.pop("CTD_MODEL", None)
        else: os.environ["CTD_MODEL"] = self.old
        td._reset_for_tests()

    def test_no_silent_download(self):
        if not td.runtime_available(): self.skipTest("onnxruntime missing")
        with self.assertRaises(SmartOcrError) as e: td._get_session(False)
        self.assertEqual(e.exception.status, 428)
        self.assertTrue(e.exception.extra["needs_download"]); self.assertEqual(e.exception.extra["model"], "ctd")
        self.assertFalse(os.path.exists(os.environ["CTD_MODEL"]))

    def test_bad_download_is_deleted(self):
        class Fake(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *a): return False
        with self.assertRaises(SmartOcrError):
            td.download(opener=lambda url, timeout: Fake(b"not the model"))
        self.assertFalse(os.path.exists(os.environ["CTD_MODEL"])); self.assertFalse(os.path.exists(os.environ["CTD_MODEL"] + ".part"))

    def test_busy_detector_queues_instead_of_failing(self):
        import threading, time
        from manga_model_guard import exclusive
        hold = threading.Event(); done = []
        def first():
            with exclusive("ctd", wait=5): hold.wait(1.0)
        t = threading.Thread(target=first); t.start(); time.sleep(0.1)
        t0 = time.time()
        with exclusive("ctd", wait=5): done.append(time.time() - t0)
        t.join()
        self.assertTrue(done and 0.5 < done[0] < 3, done)   # waited for the first job, did not 429
        with exclusive("lama"):
            with self.assertRaises(SmartOcrError) as e:
                with exclusive("lama"): pass
        self.assertEqual(e.exception.status, 429)           # long LaMa jobs still fail fast

    def test_status_shape(self):
        s = local_model_status()["textDetector"]
        self.assertIn("ready", s); self.assertIn("cached", s); self.assertFalse(s["cached"])


@unittest.skipUnless(td.runtime_available() and td.cached(), "comic-text-detector weights not installed")
class Page4(unittest.TestCase):
    """Real page from the dogfood comic: rule detection mistakes the girl's face and the cat for bubbles."""
    @classmethod
    def setUpClass(cls):
        import numpy as np
        from PIL import Image
        import manga_bubble_ocr as mbo
        td._reset_for_tests()
        url = png_url(open(FIX, "rb").read())
        r = td.detect(url, False)
        cls.mask = np.array(Image.open(io.BytesIO(base64.b64decode(r["mask"].split(",")[1])))) > 0
        cls.r = r
        cls.rule = [b[:4] for b in mbo.find_bubbles(base64.b64decode(url.split(",")[1]))]

    def cov(self, x, y, w, h): return float(self.mask[y:y + h, x:x + w].mean())

    def test_face_and_cat_not_erased(self):
        face = [b for b in self.rule if abs(b[0] - 412) < 40 and abs(b[1] - 72) < 40]
        cat = [b for b in self.rule if abs(b[0] - 516) < 40 and abs(b[1] - 1480) < 40]
        self.assertTrue(face and cat, "fixture still triggers the rule false positives: %s" % self.rule)
        for b in face + cat: self.assertLess(self.cov(*b), 0.01, "mask touches a face/cat %s" % (b,))

    def test_real_bubbles_are_masked(self):
        for b in ([1000, 84, 132, 68], [280, 584, 360, 84], [696, 1164, 436, 84]):
            self.assertGreater(self.cov(*b), 0.1, "lettering in bubble %s not in mask" % (b,))

    def test_shape(self):
        self.assertEqual((self.r["width"], self.r["height"]), (1238, 1754))
        self.assertEqual(self.mask.shape, (1754, 1238)); self.assertLess(self.mask.mean(), 0.08)


if __name__ == "__main__":
    unittest.main(verbosity=1)
