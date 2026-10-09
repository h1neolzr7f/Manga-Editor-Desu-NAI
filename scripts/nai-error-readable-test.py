"""Regression: NovelAI proxy errors reach the browser as readable JSON (not HTML / raw bodies).

Live localhost server, upstream replaced in memory (no network, no Anlas).
Run: python3 scripts/nai-error-readable-test.py
"""
import http.client
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import threading
import unittest
import urllib.error
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("manga_nai_errors", ROOT / "99_server.py")
srv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(srv)
srv.QUIET_REQUESTS = True

CLOUDFLARE_401 = (b"<!DOCTYPE html><html><head><title>401 Unauthorized</title><style>body{}</style></head>"
                  b"<body><h1>Unauthorized</h1><p>Invalid accessToken</p></body></html>")


def raising_opener(code, body, content_type):
    class Opener:
        def open(self, request, timeout=None):
            raise urllib.error.HTTPError(request.full_url, code, "err", {"Content-Type": content_type}, io.BytesIO(body))
    return lambda: Opener()


class NaiErrorTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = srv.ThreadedTCPServer(("127.0.0.1", 0), srv.CORSRequestHandler)
        cls.port = cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def request(self, method, path, headers=None, body=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        host = "127.0.0.1:%d" % self.port
        base = {"Host": host, "Origin": "http://" + host, "Sec-Fetch-Site": "same-origin"}
        base.update(headers or {})
        conn.request(method, path, body=body, headers=base)
        response = conn.getresponse()
        data = response.read()
        conn.close()
        return response.status, response.getheader("Content-Type", ""), data

    def test_payload_shapes(self):
        p = srv.nai_error_payload(401, CLOUDFLARE_401, "text/html")
        self.assertIn("Token", p["error"])
        self.assertNotIn("<", p["detail"])
        self.assertIn("Invalid accessToken", p["detail"])
        self.assertNotIn("body{}", p["detail"])
        self.assertIn("Anlas", srv.nai_error_payload(402, b'{"statusCode":402,"message":"Not enough Anlas"}', "application/json")["error"])
        self.assertEqual(srv.nai_error_payload(402, b'{"message":"Not enough Anlas"}', "application/json")["detail"], "Not enough Anlas")
        self.assertIn("503", srv.nai_error_payload(503, b"down", "text/plain")["error"])
        self.assertEqual(len(srv.nai_error_payload(500, b"x" * 5000)["detail"]), 300)

    def test_generate_upstream_401_html_becomes_json(self):
        with mock.patch.object(srv, "_build_proxy_opener", raising_opener(401, CLOUDFLARE_401, "text/html")):
            status, ctype, data = self.request("POST", "/nai-proxy/generate-image",
                                               {"Authorization": "Bearer user-token", "Content-Type": "application/json"}, b"{}")
        self.assertEqual(status, 401)
        self.assertIn("application/json", ctype)
        payload = json.loads(data)
        self.assertFalse(payload["ok"])
        self.assertIn("Token", payload["error"])
        self.assertNotIn("<html", data.decode("utf-8").lower())

    def test_missing_token_is_json(self):
        with mock.patch.dict(os.environ, {"NOVELAI_API_KEY": "", "NAI_API_KEY": "", "NOVELAI_TOKEN": ""}):
            for method, path in (("POST", "/nai-proxy/generate-image"), ("GET", "/nai-proxy/health"),
                                 ("GET", "/nai-proxy/safe-status")):
                with self.subTest(path):
                    status, ctype, data = self.request(method, path, {"Content-Type": "application/json"},
                                                       b"{}" if method == "POST" else None)
                    self.assertEqual(status, 401)
                    self.assertIn("application/json", ctype)
                    self.assertIn("Token", json.loads(data)["error"])

    def test_health_upstream_error_is_readable(self):
        with mock.patch.object(srv, "_build_proxy_opener", raising_opener(429, b"Too Many Requests", "text/plain")):
            status, _, data = self.request("GET", "/nai-proxy/health", {"Authorization": "Bearer user-token"})
        self.assertEqual(status, 429)
        self.assertIn("429", json.loads(data)["error"])


class NaiSubscriptionHostTest(unittest.TestCase):
    """api.novelai.net/user/subscription now answers 400 "update to the image URL";
    the balance/health check must use image.novelai.net and only fall back on that answer."""

    def opener(self, answers):
        calls = []

        class Resp(io.BytesIO):
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        class Opener:
            def open(self, request, timeout=None):
                calls.append(request.full_url)
                code, body = answers[len(calls) - 1]
                if code != 200:
                    raise urllib.error.HTTPError(request.full_url, code, "err", {"Content-Type": "application/json"}, io.BytesIO(body))
                return Resp(body)
        return Opener(), calls

    def test_image_host_first(self):
        body = json.dumps({"tier": 3, "trainingStepsLeft": {"fixedTrainingStepsLeft": 10, "purchasedTrainingSteps": 5}}).encode()
        opener, calls = self.opener([(200, body)])
        data = srv.fetch_nai_subscription("Bearer t", opener)
        self.assertEqual(calls, ["https://image.novelai.net/user/subscription"])
        self.assertEqual(srv.nai_anlas(data), 15)

    def test_fallback_only_on_migration_answer(self):
        moved = b'{"statusCode":400,"message":"Please refresh NovelAI.net. If using a third-party tool, update to the image URL."}'
        opener, calls = self.opener([(404, b"{}"), (200, b'{"tier":1}')])
        self.assertEqual(srv.fetch_nai_subscription("Bearer t", opener)["tier"], 1)
        self.assertEqual(len(calls), 2)
        opener, calls = self.opener([(401, b'{"message":"bad token"}')])
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            srv.fetch_nai_subscription("Bearer t", opener)
        self.assertEqual(ctx.exception.code, 401)
        self.assertEqual(len(calls), 1, "a bad token must not be retried on another host")
        opener, calls = self.opener([(400, moved), (400, moved)])
        with self.assertRaises(urllib.error.HTTPError):
            srv.fetch_nai_subscription("Bearer t", opener)
        self.assertEqual(len(calls), 2)

    def test_no_old_host_as_primary(self):
        self.assertTrue(srv.NAI_SUBSCRIPTION_URLS[0].startswith("https://image.novelai.net/"))


class NaiFreeQuotaTest(unittest.TestCase):
    """The proxy keeps every request inside Opus free generation: <=1024x1024 px, <=28 steps, 1 image."""

    def normalize(self, params):
        return json.loads(srv._normalize_novelai_body(json.dumps({"input": "x", "parameters": params}).encode()))["parameters"]

    def test_steps_clamped_to_28(self):
        p = self.normalize({"width": 1536, "height": 1536, "steps": 50, "n_samples": 4})
        self.assertEqual(p["steps"], 28)
        self.assertEqual(p["n_samples"], 1)
        self.assertLessEqual(p["width"] * p["height"], 1024 * 1024)
        self.assertEqual(self.normalize({"width": 832, "height": 1216, "steps": 23})["steps"], 23)
        self.assertEqual(self.normalize({"width": 832, "height": 1216, "steps": "bad"})["steps"], 28)


if __name__ == "__main__":
    unittest.main(verbosity=2)
