"""Regression: the optional local_tools sidecar (port 8765) must not be
drivable by foreign web pages.

* ``Origin: null`` is no longer echoed in CORS and cannot POST.
* A non-loopback ``Host`` (DNS rebinding) is rejected with 403.
* Cross-site browser requests and foreign origins cannot POST.
* Loopback origins (the editor on :8000) still work, and the server imports
  on Python 3.13+ (the removed ``cgi`` module is no longer used).

The processor is stubbed, so no rembg / model download is needed.
"""
from __future__ import annotations

import http.client
import json
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "local_tools"))

try:  # Pillow is an optional local_tools dependency; CI runners may lack it.
    import PIL  # noqa: F401
except ImportError:
    import types

    _cutout = types.ModuleType("cutout")
    _cutout.DEFAULT_OPTIONS = {}
    _mm = types.ModuleType("model_manager")

    class _NoModelManager:  # replaced by StubManager in every test
        pass

    _mm.ModelManager = _NoModelManager
    sys.modules.setdefault("cutout", _cutout)
    sys.modules.setdefault("model_manager", _mm)

import server as lt  # noqa: E402

PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c6360000002000005000127fe0b9e0000000049454e44ae426082"
)


class StubManager:
    def __init__(self) -> None:
        self.calls = 0

    def processor_installed(self) -> bool:
        return False

    def list_models(self):
        return []

    def list_engines(self):
        return {"engines": []}

    def remove_background(self, content, model, options):
        self.calls += 1
        return "color-key", content


def multipart(fields):
    boundary = "----mnaiTestBoundary"
    chunks = []
    for name, value in fields:
        if isinstance(value, tuple):
            filename, mime, payload = value
            chunks.append(
                f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
                f"Content-Type: {mime}\r\n\r\n".encode() + payload + b"\r\n"
            )
        else:
            chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    chunks.append(f"--{boundary}--\r\n".encode())
    return f"multipart/form-data; boundary={boundary}", b"".join(chunks)


class LocalToolsOriginTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), lt.Handler)
        cls.httpd.model_manager = StubManager()
        cls.port = cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def request(self, method, path, headers=None, body=None, host=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        conn.putrequest(method, path, skip_host=True)
        conn.putheader("Host", host or f"127.0.0.1:{self.port}")
        for key, value in (headers or {}).items():
            conn.putheader(key, value)
        if body is not None:
            conn.putheader("Content-Length", str(len(body)))
        conn.endheaders(body)
        resp = conn.getresponse()
        data = resp.read()
        conn.close()
        return resp.status, dict(resp.getheaders()), data

    def post_png(self, headers=None, host=None):
        ctype, body = multipart([("file", ("a.png", "image/png", PNG)), ("options", '{"engine":"color-key"}')])
        h = {"Content-Type": ctype}
        h.update(headers or {})
        return self.request("POST", "/remove-background", h, body, host)

    def test_helpers(self):
        self.assertEqual(lt.cors_allow_origin("null"), "")
        self.assertEqual(lt.cors_allow_origin("http://localhost:8000"), "http://localhost:8000")
        self.assertEqual(lt.cors_allow_origin("https://evil.example"), "")
        self.assertTrue(lt.host_is_local("127.0.0.1:8765"))
        self.assertTrue(lt.host_is_local("localhost"))
        self.assertTrue(lt.host_is_local("[::1]:8765"))
        self.assertFalse(lt.host_is_local("evil.example:8765"))
        self.assertFalse(lt.host_is_local("127.0.0.1.evil.example"))
        self.assertFalse(lt.host_is_local(""))
        self.assertFalse(lt.origin_is_trusted("null"))
        self.assertFalse(lt.origin_is_trusted("http://127.0.0.1:8000", "cross-site"))
        self.assertTrue(lt.origin_is_trusted(None))
        self.assertTrue(lt.origin_is_trusted("http://127.0.0.1:8000", "same-site"))

    def test_loopback_origin_still_works(self):
        before = self.httpd.model_manager.calls
        status, headers, data = self.post_png({"Origin": "http://127.0.0.1:8000"})
        self.assertEqual(status, 200, data)
        payload = json.loads(data)
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["image"].startswith("data:image/png;base64,"))
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:8000")
        self.assertEqual(self.httpd.model_manager.calls, before + 1)

    def test_batch_multipart_parses(self):
        ctype, body = multipart([("files", ("a.png", "image/png", PNG)), ("files", ("b.png", "image/png", PNG))])
        status, _h, data = self.request("POST", "/batch-remove-background", {"Content-Type": ctype}, body)
        self.assertEqual(status, 200, data)
        self.assertEqual(len(json.loads(data)["results"]), 2)

    def test_null_origin_rejected(self):
        before = self.httpd.model_manager.calls
        status, headers, _ = self.post_png({"Origin": "null"})
        self.assertEqual(status, 403)
        self.assertNotIn("Access-Control-Allow-Origin", headers)
        status, headers, _ = self.request("OPTIONS", "/remove-background", {"Origin": "null"})
        self.assertEqual(status, 403)
        self.assertNotEqual(headers.get("Access-Control-Allow-Origin"), "null")
        self.assertEqual(self.httpd.model_manager.calls, before)

    def test_foreign_origin_and_cross_site_rejected(self):
        before = self.httpd.model_manager.calls
        self.assertEqual(self.post_png({"Origin": "https://evil.example"})[0], 403)
        self.assertEqual(self.post_png({"Sec-Fetch-Site": "cross-site"})[0], 403)
        self.assertEqual(self.httpd.model_manager.calls, before)

    def test_rebinding_host_rejected(self):
        before = self.httpd.model_manager.calls
        status, _h, data = self.post_png(host=f"evil.example:{self.port}")
        self.assertEqual(status, 403)
        self.assertEqual(json.loads(data)["code"], "UNTRUSTED_HOST")
        status, _h, _ = self.request("GET", "/health", host="evil.example")
        self.assertEqual(status, 403)
        self.assertEqual(self.httpd.model_manager.calls, before)

    def test_health_from_loopback(self):
        status, _h, data = self.request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)["status"], "ok")


if __name__ == "__main__":
    unittest.main(verbosity=1)
