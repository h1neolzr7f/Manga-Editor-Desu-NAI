"""P0 regression (PR #6 security review): sandboxed/cross-site pages must not use the
local proxies of 99_server.py as a relay into other loopback services or the internet.

Real HTTP on loopback: a fake "receiver" service counts every request it gets. Hostile
callers (Origin: null, foreign Origin, Sec-Fetch-Site cross-site/same-site, DNS-rebinding
Host) must get 403 for preflight AND for the real request, the receiver must see zero
requests, and no local nai-tools job may start (directly or through a proxy chain).
Run: python3 scripts/proxy-chain-negative-test.py
"""
import http.client
import importlib.util
import json
import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("manga_proxy_chain", ROOT / "99_server.py")
srv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(srv)
srv.QUIET_REQUESTS = True


class Receiver:
    """A fake local service (tagger / internal admin endpoint / director)."""

    def __init__(self, redirect_to=None):
        self.hits = []
        receiver = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def _record(self):
                length = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(length) if length else b""
                receiver.hits.append({"method": self.command, "path": self.path,
                                      "headers": {k.lower(): v for k, v in self.headers.items()},
                                      "body": body})
                if redirect_to:
                    self.send_response(307)
                    self.send_header("Location", redirect_to)
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return
                payload = b'{"caption":"ok","data":[]}'
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            do_GET = do_POST = _record

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def url(self, path="/tag"):
        return "http://127.0.0.1:%d%s" % (self.port, path)

    def close(self):
        self.httpd.shutdown()
        self.httpd.server_close()


class ProxyChainTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = srv.ThreadedTCPServer(("127.0.0.1", 0), srv.CORSRequestHandler)
        cls.port = cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def setUp(self):
        self.receiver = Receiver()
        self.second = Receiver()
        self.jobs = []
        self.env = mock.patch.dict(os.environ, {"NOVELAI_API_KEY": "env-nai-DO-NOT-LEAK",
                                                "DIRECTOR_API_KEY": "", "DIRECTOR_API_URL": "",
                                                "TAGGER_API_URL": "", "TAGGER_ALLOW_REMOTE": "",
                                                "HTTP_PROXY": "", "HTTPS_PROXY": ""})
        self.env.start()
        # No system proxy: requests must hit the loopback receiver directly.
        self.proxy = mock.patch.object(srv, "_get_proxy_url", return_value=None)
        self.proxy.start()
        self.job_patch = mock.patch.object(srv, "_start_tool_job",
                                           side_effect=lambda *a: self.jobs.append(a) or {"id": "x", "status": "running"})
        self.job_patch.start()
        self.host = "127.0.0.1:%d" % self.port
        self.same_origin = {"Host": self.host, "Origin": "http://" + self.host, "Sec-Fetch-Site": "same-origin"}

    def tearDown(self):
        self.job_patch.stop()
        self.proxy.stop()
        self.env.stop()
        self.receiver.close()
        self.second.close()

    hostile = (
        ("sandboxed iframe Origin: null", {"Origin": "null"}),
        ("foreign origin", {"Origin": "https://evil.example"}),
        ("other localhost port (same-site)", {"Origin": "http://127.0.0.1:5999", "Sec-Fetch-Site": "same-site"}),
        ("cross-site fetch metadata only", {"Sec-Fetch-Site": "cross-site"}),
        ("DNS rebinding Host", {"Host": "rebind.evil.example:%PORT%"}),
    )

    def headers_for(self, extra):
        values = {"Host": self.host}
        for key, value in extra.items():
            values[key] = value.replace("%PORT%", str(self.port))
        return values

    def call(self, method, path, headers, body=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        values = dict(headers)
        data = None
        if body is not None:
            data = json.dumps(body).encode() if not isinstance(body, bytes) else body
            values.setdefault("Content-Type", "application/json")
            values["Content-Length"] = str(len(data))
        try:
            conn.request(method, path, body=data, headers=values)
            resp = conn.getresponse()
            return resp.status, {k.lower(): v for k, v in resp.getheaders()}, resp.read()
        finally:
            conn.close()

    def tagger_body(self, url):
        return {"image": "data:image/png;base64,iVBORw0KGgo=", "tagger_url": url}

    # ---- tagger -------------------------------------------------------------
    def test_tagger_preflight_rejected_for_hostile_callers(self):
        for label, extra in self.hostile:
            with self.subTest(label):
                status, headers, _ = self.call("OPTIONS", "/tagger-proxy/interrogate", self.headers_for(dict(
                    extra, **{"Access-Control-Request-Method": "POST",
                              "Access-Control-Request-Headers": "content-type"})))
                self.assertEqual(status, 403)
                self.assertNotIn("access-control-allow-origin", headers)

    def test_tagger_post_from_hostile_callers_never_reaches_receiver(self):
        for label, extra in self.hostile:
            with self.subTest(label):
                status, headers, _ = self.call("POST", "/tagger-proxy/interrogate", self.headers_for(extra),
                                               self.tagger_body(self.receiver.url("/nai-tools/start-comic-demo")))
                self.assertEqual(status, 403)
                self.assertNotIn("access-control-allow-origin", headers)
        self.assertEqual(self.receiver.hits, [])

    def test_tagger_cannot_chain_into_this_server(self):
        # Even the trusted editor page cannot point the tagger at 99_server itself.
        own = "http://127.0.0.1:%d/nai-tools/start-comic-demo" % self.port
        for headers in (self.headers_for({"Origin": "null"}), self.same_origin):
            status, _, _ = self.call("POST", "/tagger-proxy/interrogate", headers, self.tagger_body(own))
            self.assertIn(status, (400, 403))
        self.assertEqual(self.jobs, [])

    def test_tagger_same_origin_still_works_without_credentials(self):
        status, _, body = self.call("POST", "/tagger-proxy/interrogate", self.same_origin,
                                    self.tagger_body(self.receiver.url("/tag")))
        self.assertEqual(status, 200, body)
        self.assertEqual(len(self.receiver.hits), 1)
        self.assertNotIn("authorization", self.receiver.hits[0]["headers"])
        self.assertNotIn(b"tagger_url", self.receiver.hits[0]["body"])

    def test_tagger_redirect_not_followed(self):
        hop = Receiver(redirect_to=self.second.url("/nai-tools/start-comic-demo"))
        try:
            self.call("POST", "/tagger-proxy/interrogate", self.same_origin, self.tagger_body(hop.url("/tag")))
            self.assertEqual(len(hop.hits), 1)
            self.assertEqual(self.second.hits, [])
        finally:
            hop.close()

    # ---- director -----------------------------------------------------------
    def test_director_hostile_callers_cannot_use_it_as_ssrf_relay(self):
        for label, extra in self.hostile:
            with self.subTest(label):
                h = self.headers_for(dict(extra, **{"Authorization": "Bearer attacker-own-key",
                                                    "X-Director-Api-Url": self.receiver.url("/v1/chat/completions")}))
                status, headers, _ = self.call("POST", "/director-proxy/chat-completions", h, {"messages": []})
                self.assertEqual(status, 403)
                self.assertNotIn("access-control-allow-origin", headers)
                status, _, _ = self.call("GET", "/director-proxy/models", h)
                self.assertEqual(status, 403)
                status, headers, _ = self.call("OPTIONS", "/director-proxy/chat-completions", self.headers_for(dict(
                    extra, **{"Access-Control-Request-Method": "POST",
                              "Access-Control-Request-Headers": "authorization,x-director-api-url"})))
                self.assertEqual(status, 403)
                self.assertNotIn("access-control-allow-origin", headers)
        self.assertEqual(self.receiver.hits, [])

    def test_director_cannot_target_this_server_or_link_local(self):
        for url in ("http://127.0.0.1:%d/nai-tools/start-comic-demo" % self.port,
                    "http://localhost:%d/v1/chat/completions" % self.port,
                    "http://169.254.169.254/latest/meta-data/",
                    "file:///etc/passwd"):
            with self.subTest(url):
                h = dict(self.same_origin, **{"Authorization": "Bearer mine", "X-Director-Api-Url": url})
                status, _, _ = self.call("POST", "/director-proxy/chat-completions", h, {"messages": []})
                self.assertEqual(status, 400)
        self.assertEqual(self.jobs, [])

    def test_director_redirect_does_not_forward_authorization(self):
        hop = Receiver(redirect_to=self.second.url("/steal"))
        try:
            h = dict(self.same_origin, **{"Authorization": "Bearer mine",
                                          "X-Director-Api-Url": hop.url("/v1/chat/completions")})
            self.call("POST", "/director-proxy/chat-completions", h, {"messages": []})
            self.call("GET", "/director-proxy/models", h)
            self.assertEqual(len(hop.hits), 2)
            self.assertEqual(self.second.hits, [])
        finally:
            hop.close()

    def test_director_same_origin_user_gateway_works(self):
        h = dict(self.same_origin, **{"Authorization": "Bearer mine",
                                      "X-Director-Api-Url": self.receiver.url("/v1/chat/completions")})
        status, _, _ = self.call("POST", "/director-proxy/chat-completions", h, {"messages": []})
        self.assertEqual(status, 200)
        self.assertEqual(self.receiver.hits[-1]["headers"].get("authorization"), "Bearer mine")

    # ---- every other API route ---------------------------------------------
    def test_all_api_routes_reject_null_origin(self):
        routes = (("POST", "/nai-proxy/generate-image"), ("GET", "/nai-proxy/health"),
                  ("GET", "/nai-proxy/safe-status"), ("GET", "/nai-proxy/suggest-tags?prompt=a"),
                  ("POST", "/nai-tools/start-comic-demo"), ("POST", "/nai-tools/start-material-previews"),
                  ("GET", "/nai-tools/job?id=x"), ("GET", "/nai-tools/missing-material-previews"),
                  ("POST", "/user-assets"), ("POST", "/gpt-image-proxy"), ("POST", "/manga-smart/ocr"),
                  ("POST", "/manga-smart/manga-ocr"), ("POST", "/manga-smart/lama-inpaint"))
        opener = mock.patch.object(srv, "_build_proxy_opener", side_effect=AssertionError("no upstream call"))
        with opener:
            for method, path in routes:
                for label, extra in self.hostile:
                    with self.subTest(path=path, caller=label):
                        h = self.headers_for(dict(extra, Authorization="Bearer user-typed"))
                        status, headers, _ = self.call(method, path, h, {"x": 1} if method == "POST" else None)
                        self.assertEqual(status, 403)
                        self.assertNotIn("access-control-allow-origin", headers)
                        status, headers, _ = self.call("OPTIONS", path, self.headers_for(extra))
                        self.assertEqual(status, 403)
        self.assertEqual(self.jobs, [])

    def test_same_origin_preflight_and_static_still_work(self):
        status, _, _ = self.call("OPTIONS", "/tagger-proxy/interrogate", self.same_origin)
        self.assertEqual(status, 204)
        status, _, _ = self.call("GET", "/index.html", {"Host": self.host})
        self.assertEqual(status, 200)

    def test_cors_never_echoes_null_or_foreign_origins(self):
        self.assertEqual(srv.cors_allow_origin("null"), "")
        self.assertEqual(srv.cors_allow_origin("https://evil.example"), "")
        self.assertEqual(srv.cors_allow_origin("http://127.0.0.1:5999", host="127.0.0.1:8000"), "")
        self.assertEqual(srv.cors_allow_origin("http://127.0.0.1:8000", host="127.0.0.1:8000"), "http://127.0.0.1:8000")


if __name__ == "__main__":
    unittest.main(verbosity=1)
