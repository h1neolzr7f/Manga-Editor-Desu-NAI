"""P0 regression: optional heavy models (LaMa, Manga OCR) never download implicitly,
never run two inferences at once, and the HTTP route reports both as actionable codes.

Offline: upstream packages are faked; a temporary cache directory decides "cached".
Run: python3 scripts/manga-model-guard-test.py
"""
import base64
import http.client
import importlib.util
import io
import json
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import manga_model_guard as guard  # noqa: E402
import manga_lama_inpaint as lama  # noqa: E402
import manga_ocr_refiner as refiner  # noqa: E402
from manga_smart_ocr import SmartOcrError  # noqa: E402

spec = importlib.util.spec_from_file_location("manga_guard_srv", ROOT / "99_server.py")
srv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(srv)
srv.QUIET_REQUESTS = True


class Constructed:
    count = 0

    def __init__(self, *a, **k):
        Constructed.count += 1

    def __call__(self, *a):
        return "テスト"


class GuardTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = mock.patch.dict(os.environ, {"TORCH_HOME": self.tmp.name, "HF_HOME": self.tmp.name,
                                                "LAMA_MODEL": "", "HF_HUB_CACHE": "", "HUGGINGFACE_HUB_CACHE": ""})
        self.env.start()
        Constructed.count = 0
        lama._reset_for_tests()
        refiner._reset_for_tests()

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()
        lama._reset_for_tests()
        refiner._reset_for_tests()

    def fake_imports(self):
        return mock.patch("importlib.import_module", side_effect=lambda name: SimpleNamespace(
            SimpleLama=Constructed, MangaOcr=Constructed))

    def test_uncached_models_require_consent_before_construction(self):
        with self.fake_imports():
            for loader, kind in ((lama.get_model, "lama"), (refiner.get_model, "manga-ocr")):
                with self.subTest(kind), self.assertRaises(SmartOcrError) as caught:
                    loader()
                self.assertEqual(caught.exception.status, 428)
                self.assertEqual(caught.exception.extra["model"], kind)
        self.assertEqual(Constructed.count, 0, "model constructor (which downloads) must not run")

    def test_consent_or_cache_allows_loading(self):
        with self.fake_imports():
            refiner.get_model(allow_download=True)
            self.assertEqual(Constructed.count, 1)
            weights = Path(self.tmp.name) / "hub" / "checkpoints" / "big-lama.pt"
            weights.parent.mkdir(parents=True)
            weights.write_bytes(b"0" * (2 * 1024 * 1024))
            self.assertTrue(guard.lama_cached())
            lama.get_model()  # cached: no consent needed
            self.assertEqual(Constructed.count, 2)

    def test_manga_ocr_cache_detection(self):
        self.assertFalse(guard.manga_ocr_cached())
        snap = Path(guard.manga_ocr_cache_dir()) / "snapshots" / "abc"
        snap.mkdir(parents=True)
        (snap / "pytorch_model.bin").write_bytes(b"x")
        self.assertTrue(guard.manga_ocr_cached())

    def test_second_concurrent_inference_gets_429(self):
        with guard.exclusive("lama"):
            with self.assertRaises(SmartOcrError) as caught:
                with guard.exclusive("lama"):
                    pass
            self.assertEqual(caught.exception.status, 429)
            with guard.exclusive("manga-ocr"):  # different model is independent
                pass
        with guard.exclusive("lama"):  # released again
            pass


def png(w, h, color=(255, 255, 255)):
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (w, h), color).save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


class HttpTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = srv.ThreadedTCPServer(("127.0.0.1", 0), srv.CORSRequestHandler)
        cls.port = cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def post(self, path, body):
        # gpt_image_proxy._authorized_local_request pins the editor to port 8000 Host/Origin.
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=20)
        data = json.dumps(body).encode()
        try:
            conn.request("POST", path, body=data, headers={
                "Host": "127.0.0.1:8000", "Origin": "http://127.0.0.1:8000", "Sec-Fetch-Site": "same-origin",
                "Content-Type": "application/json", "Content-Length": str(len(data))})
            resp = conn.getresponse()
            return resp.status, json.loads(resp.read() or b"{}")
        finally:
            conn.close()

    def test_route_reports_download_consent_and_never_constructs(self):
        try:
            import PIL  # noqa: F401
        except ImportError:
            self.skipTest("Pillow not installed")
        tmp = tempfile.TemporaryDirectory()
        from PIL import Image, ImageDraw
        m = Image.new("L", (32, 32), 0)
        ImageDraw.Draw(m).rectangle((8, 8, 20, 20), fill=255)
        buf = io.BytesIO()
        m.save(buf, format="PNG")
        mask_img = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
        Constructed.count = 0
        lama._reset_for_tests()
        with mock.patch.dict(os.environ, {"TORCH_HOME": tmp.name, "LAMA_MODEL": ""}), \
                mock.patch.object(lama, "_import_upstream", return_value=SimpleNamespace(SimpleLama=Constructed)):
            status, body = self.post("/manga-smart/lama-inpaint", {"image": png(32, 32), "mask": mask_img})
        tmp.cleanup()
        lama._reset_for_tests()
        self.assertEqual(status, 428, body)
        self.assertTrue(body.get("needs_download"))
        self.assertEqual(body.get("model"), "lama")
        self.assertEqual(Constructed.count, 0)


if __name__ == "__main__":
    unittest.main(verbosity=1)
