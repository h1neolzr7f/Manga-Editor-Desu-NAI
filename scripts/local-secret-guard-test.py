"""Regression: cross-site pages must not borrow .env secrets through the local proxies.

Covers NovelAI, AI-director and local tool endpoints of 99_server.py on a real
localhost HTTP server. Upstream calls are captured in memory (no network, no credits).
Run from the repository root: python3 scripts/local-secret-guard-test.py
"""
import http.client
import importlib.util
import json
import os
from pathlib import Path
import sys
import threading
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("manga_secret_guard", ROOT / "99_server.py")
srv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(srv)
srv.QUIET_REQUESTS = True

NAI_SECRET = "env-nai-secret-DO-NOT-LEAK"
DIRECTOR_SECRET = "env-director-secret-DO-NOT-LEAK"
DEFAULT_DIRECTOR = "https://director.example.com/v1/chat/completions"
ATTACKER = "https://attacker.example.net/v1/chat/completions"


class FakeResponse:
    status = 200
    headers = {"Content-Type": "application/json"}

    def __init__(self, body=b'{"data":[]}'):
        self.body = body

    def read(self, *_):
        return self.body

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


class Capture:
    def __init__(self):
        self.requests = []

    def opener(self):
        capture = self

        class Opener:
            def open(self, request, timeout=None):
                capture.requests.append({"url": request.full_url,
                                         "headers": {k.lower(): v for k, v in request.header_items()}})
                return FakeResponse()
        return Opener()


class SecretGuardTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = srv.ThreadedTCPServer(("127.0.0.1", 0), srv.CORSRequestHandler)
        cls.port = cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def setUp(self):
        self.capture = Capture()
        self.env = mock.patch.dict(os.environ, {
            "NOVELAI_API_KEY": NAI_SECRET, "DIRECTOR_API_KEY": DIRECTOR_SECRET,
            "DIRECTOR_API_URL": DEFAULT_DIRECTOR, "GPT_IMAGE_API_KEY": "env-gpt-secret"})
        self.env.start()
        self.opener = mock.patch.object(srv, "_build_proxy_opener", self.capture.opener)
        self.opener.start()
        self.jobs = mock.patch.object(srv, "_start_tool_job", side_effect=AssertionError("job must not start"))
        self.jobs_mock = self.jobs.start()
        self.host = "127.0.0.1:%d" % self.port
        self.same_origin = {"Host": self.host, "Origin": "http://" + self.host, "Sec-Fetch-Site": "same-origin"}

    def tearDown(self):
        self.assert_no_secret_sent()
        self.jobs.stop()
        self.opener.stop()
        self.env.stop()

    def call(self, method, path, headers, body=b"{}"):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=8)
        values = dict(headers)
        values.setdefault("Host", self.host)
        if method == "POST":
            values.setdefault("Content-Type", "application/json")
            values["Content-Length"] = str(len(body))
        try:
            conn.request(method, path, body=body if method == "POST" else None, headers=values)
            response = conn.getresponse()
            return response.status, response.read()
        finally:
            conn.close()

    def assert_no_secret_sent(self):
        """Env secrets may only ever reach their own configured upstream."""
        for request in self.capture.requests:
            auth = request["headers"].get("authorization", "")
            if NAI_SECRET in auth:
                self.assertTrue(request["url"].startswith("https://image.novelai.net/"), request["url"])
            if DIRECTOR_SECRET in auth:
                self.assertTrue(request["url"].startswith("https://director.example.com/v1/"), request["url"])

    hostile_variants = (
        ("null origin (sandboxed iframe / file://)", {"Origin": "null"}),
        ("foreign origin", {"Origin": "https://evil.example"}),
        ("localhost-looking foreign origin", {"Origin": "http://127.0.0.1.evil.example"}),
        ("cross-site fetch metadata without Origin", {"Sec-Fetch-Site": "cross-site"}),
        ("same-site but different port", {"Origin": "http://127.0.0.1:9999", "Sec-Fetch-Site": "same-site"}),
        ("DNS rebinding Host", {"Host": "rebind.evil.example:8000"}),
    )

    def test_novelai_env_token_only_for_same_origin(self):
        for label, headers in self.hostile_variants:
            with self.subTest(label):
                status, _ = self.call("POST", "/nai-proxy/generate-image", headers, b'{"input":"x"}')
                self.assertEqual(status, 403)
        self.assertEqual(self.capture.requests, [])
        status, _ = self.call("POST", "/nai-proxy/generate-image", self.same_origin, b'{"input":"x"}')
        self.assertEqual(status, 200)
        self.assertEqual(self.capture.requests[-1]["headers"]["authorization"], "Bearer " + NAI_SECRET)

    def test_novelai_cross_site_text_plain_csrf_cannot_spend_credits(self):
        status, _ = self.call("POST", "/nai-proxy/generate-image",
                              {"Origin": "https://evil.example", "Content-Type": "text/plain"}, b'{"input":"x"}')
        self.assertEqual(status, 403)
        self.assertEqual(self.capture.requests, [])

    def test_explicit_user_token_rejected_from_null_origin(self):
        # PR #6 review P0: 'null' is also every sandboxed iframe on the web, so even an
        # explicit token may not turn the proxy into a relay. file:// users are redirected
        # to http://127.0.0.1:8000 by js/assets/boot-guard.js instead.
        status, _ = self.call("POST", "/nai-proxy/generate-image",
                              {"Origin": "null", "Authorization": "Bearer user-typed"}, b'{"input":"x"}')
        self.assertEqual(status, 403)
        self.assertEqual(self.capture.requests, [])
        status, _ = self.call("POST", "/nai-proxy/generate-image",
                              dict(self.same_origin, Authorization="Bearer user-typed"), b'{"input":"x"}')
        self.assertEqual(status, 200)
        self.assertEqual(self.capture.requests[-1]["headers"]["authorization"], "Bearer user-typed")

    def test_director_env_key_cannot_be_redirected(self):
        for label, headers in self.hostile_variants:
            with self.subTest(label):
                status, _ = self.call("POST", "/director-proxy/chat-completions",
                                      dict(headers, **{"X-Director-Api-Url": ATTACKER}), b'{"messages":[]}')
                self.assertIn(status, (401, 403))
        # Even the real editor page may not send the env key to a different gateway.
        status, _ = self.call("POST", "/director-proxy/chat-completions",
                              dict(self.same_origin, **{"X-Director-Api-Url": ATTACKER}), b'{"messages":[]}')
        self.assertEqual(status, 403)
        self.assertEqual(self.capture.requests, [])
        status, _ = self.call("POST", "/director-proxy/chat-completions", self.same_origin, b'{"messages":[]}')
        self.assertEqual(status, 200)
        self.assertEqual(self.capture.requests[-1]["url"], DEFAULT_DIRECTOR)
        self.assertEqual(self.capture.requests[-1]["headers"]["authorization"], "Bearer " + DIRECTOR_SECRET)

    def test_director_models_env_key_not_for_hostile_callers(self):
        status, body = self.call("GET", "/director-proxy/models", {"Origin": "null", "X-Director-Api-Url": ATTACKER})
        self.assertEqual(status, 403)
        status, body = self.call("GET", "/director-proxy/models", {"Sec-Fetch-Site": "cross-site"})
        self.assertEqual(status, 403)
        self.assertEqual(self.capture.requests, [])
        self.call("GET", "/director-proxy/models", self.same_origin)
        self.assertTrue(self.capture.requests[-1]["url"].startswith("https://director.example.com/"))

    def test_director_user_key_may_use_custom_gateway(self):
        status, _ = self.call("POST", "/director-proxy/chat-completions",
                              dict(self.same_origin, **{"X-Director-Api-Url": ATTACKER, "Authorization": "Bearer mine"}),
                              b'{"messages":[]}')
        self.assertEqual(status, 200)
        self.assertEqual(self.capture.requests[-1]["headers"]["authorization"], "Bearer mine")

    def test_state_changing_tools_reject_cross_site(self):
        for path in ("/nai-tools/start-comic-demo", "/nai-tools/start-material-previews", "/user-assets"):
            for label, headers in self.hostile_variants:
                with self.subTest(path=path, variant=label):
                    status, _ = self.call("POST", path, dict(headers, **{"Content-Type": "text/plain"}),
                                          b'{"id":"x","name":"x.png","data":"aGVsbG8="}')
                    self.assertEqual(status, 403)
        self.jobs_mock.assert_not_called()

    def test_gpt_proxy_rejects_null_origin(self):
        status, _ = self.call("POST", "/gpt-image-proxy", {"Origin": "null"}, b'{"prompt":"x"}')
        self.assertEqual(status, 403)

    def test_null_origin_cannot_read_static_or_private_files(self):
        for path in ("/index.html", "/user_data/", "/99_server.py", "/user_data/projects/"):
            conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=8)
            try:
                conn.request("GET", path, headers={"Host": self.host, "Origin": "null"})
                response = conn.getresponse()
                response.read()
                with self.subTest(path):
                    self.assertIsNone(response.getheader("Access-Control-Allow-Origin"))
            finally:
                conn.close()
        # API routes are no longer readable by 'null' origins either (PR #6 review P0).
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=8)
        try:
            conn.request("GET", "/nai-proxy/health", headers={"Host": self.host, "Origin": "null",
                                                              "Authorization": "Bearer user-typed"})
            response = conn.getresponse()
            response.read()
            self.assertEqual(response.status, 403)
            self.assertIsNone(response.getheader("Access-Control-Allow-Origin"))
        finally:
            conn.close()

    def test_trust_helper_matrix(self):
        ok = srv.is_trusted_local_request
        self.assertTrue(ok(("127.0.0.1", 1), {"Host": "127.0.0.1:8000"}))
        self.assertTrue(ok(("127.0.0.1", 1), {"Host": "localhost:8000", "Origin": "http://localhost:8000"}))
        self.assertTrue(ok(("::1", 1, 0, 0), {"Host": "[::1]:8000", "Origin": "http://[::1]:8000"}))
        self.assertFalse(ok(("192.168.1.9", 1), {"Host": "127.0.0.1:8000"}))
        self.assertFalse(ok(("127.0.0.1", 1), {"Host": "127.0.0.1:8000", "Origin": "null"}))
        self.assertFalse(ok(("127.0.0.1", 1), {"Host": "127.0.0.1:8000", "Origin": "http://localhost:8000"}))
        self.assertFalse(ok(("127.0.0.1", 1), {"Host": ""}))


if __name__ == "__main__":
    unittest.main(verbosity=2)
