"""Real localhost HTTP integration checks, no upstream networking or API credits.

Run from repository root: python scripts/gpt-http-integration-test.py
"""
import http.client
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import gpt_image_proxy as relay

spec = importlib.util.spec_from_file_location("manga_http", ROOT / "99_server.py")
server_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server_mod)

PORT = 8000
PNG = "data:image/png;base64,iVBORw0KGgo="


def request(method, path, body=None, headers=None):
    conn = http.client.HTTPConnection("127.0.0.1", PORT, timeout=8)
    values = dict(headers or {})
    if body is not None:
        body = json.dumps(body).encode("utf-8")
        values.setdefault("Content-Type", "application/json")
        values.setdefault("Content-Length", str(len(body)))
    try:
        conn.request(method, path, body=body, headers=values)
        response = conn.getresponse()
        data = response.read()
        return response.status, dict(response.getheaders()), data
    finally:
        conn.close()


class LiveHTTPTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = server_mod.ThreadedTCPServer(("127.0.0.1", PORT), server_mod.CORSRequestHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join(timeout=4)

    def setUp(self):
        self.origin = {"Host": "127.0.0.1:8000",
                       "Origin": "http://127.0.0.1:8000",
                       "Sec-Fetch-Site": "same-origin"}
        self.body = {"baseUrl": "https://api.openai.com/v1",
                     "model": "gpt-image-1", "operation": "generate",
                     "prompt": "test image"}

    def test_editor_and_assets_are_served(self):
        status, headers, body = request("GET", "/index.html")
        self.assertEqual(status, 200)
        self.assertIn(b"Manga Editor Desu", body)
        status, _, body = request("GET", "/js/ai/gpt-region-editor.js")
        self.assertEqual(status, 200)
        self.assertIn(b"MangaGPTRegionEditor", body)

    def test_sensitive_static_paths_are_forbidden(self):
        for path in ("/.env", "/%2eenv", "/.git/config", "/secrets.pem"):
            with self.subTest(path=path):
                status, _, _ = request("GET", path)
                self.assertEqual(status, 403)

    def test_cross_origin_requests_never_reach_model_or_secret(self):
        cases = [
            {**self.origin, "Origin": "https://evil.example", "Sec-Fetch-Site": "cross-site"},
            {**self.origin, "Origin": "null"},
            {**self.origin, "Origin": ""},
            {**self.origin, "Host": "evil.example:8000"},
            {**self.origin, "Sec-Fetch-Site": "cross-site"},
        ]
        with mock.patch.dict(os.environ, {"GPT_IMAGE_API_KEY": "private-sentinel"}, clear=False):
            with mock.patch.object(relay, "request_image_edit", side_effect=AssertionError("upstream was called")) as upstream:
                for headers in cases:
                    with self.subTest(headers=headers):
                        status, _, body = request("POST", "/gpt-image-proxy", self.body, headers)
                        self.assertEqual(status, 403)
                        self.assertNotIn(b"private-sentinel", body)
                upstream.assert_not_called()

    def test_untrusted_destination_cannot_use_env_key(self):
        forged = {**self.body, "baseUrl": "https://evil.example/v1"}
        with mock.patch.dict(os.environ, {"GPT_IMAGE_API_KEY": "private-sentinel",
                                          "GPT_IMAGE_TRUSTED_BASE_URL": "https://api.openai.com/v1"}):
            with mock.patch.object(relay, "request_image_edit", side_effect=AssertionError("upstream was called")) as upstream:
                status, _, payload = request("POST", "/gpt-image-proxy", forged, self.origin)
                self.assertEqual(status, 403)
                self.assertNotIn(b"private-sentinel", payload)
                upstream.assert_not_called()

    def test_authorized_env_key_stays_on_pinned_upstream(self):
        seen = []
        def upstream(body, key):
            seen.append((body, key))
            return {"ok": True, "image": PNG}
        with mock.patch.dict(os.environ, {"GPT_IMAGE_API_KEY": "private-sentinel",
                                          "GPT_IMAGE_TRUSTED_BASE_URL": "https://api.openai.com/v1"}):
            with mock.patch.object(relay, "request_image_edit", side_effect=upstream):
                status, _, payload = request("POST", "/gpt-image-proxy", self.body, self.origin)
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(payload)["ok"])
        self.assertEqual(len(seen), 1)
        self.assertEqual(seen[0][1], "private-sentinel")

    def test_explicit_bearer_works_independent_of_env(self):
        seen = []
        with mock.patch.object(relay, "request_image_edit",
                               side_effect=lambda body, key: (seen.append(key) or {"ok": True, "image": PNG})):
            headers = {**self.origin, "Authorization": "Bearer per-session-token"}
            status, _, _ = request("POST", "/gpt-image-proxy",
                                    {**self.body, "baseUrl": "https://relay.example.com/v1"}, headers)
        self.assertEqual(status, 200)
        self.assertEqual(seen, ["per-session-token"])

    def test_preflight_rejects_external_origin_for_gpt_route(self):
        headers = {**self.origin, "Origin": "https://evil.example",
                   "Access-Control-Request-Method": "POST"}
        status, response_headers, _ = request("OPTIONS", "/gpt-image-proxy", headers=headers)
        self.assertNotIn("Access-Control-Allow-Origin", response_headers)


if __name__ == "__main__":
    unittest.main(verbosity=2)
