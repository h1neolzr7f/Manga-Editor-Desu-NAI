"""Regression: GPT image relay network guards (no real network, no credits).

- DNS rebinding between validation and connect is blocked (connect-time pinning)
- raw IP literals are refused; Clash fake-IP (198.18.0.0/15) domains are allowed
- with an HTTPS proxy configured, poisoned/failed local DNS no longer blocks
- upstream error bodies that are JSON lists/strings no longer become HTTP 500
Run: python3 scripts/gpt-proxy-network-guard-test.py
"""
import io
import os
from pathlib import Path
import socket
import sys
import unittest
import urllib.error
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import gpt_image_proxy as relay


def addrinfo(*ips):
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443)) for ip in ips]


class FakeSocket:
    connected = []

    def __init__(self, *args):
        pass

    def settimeout(self, value):
        pass

    def connect(self, sockaddr):
        FakeSocket.connected.append(sockaddr[0])

    def close(self):
        pass


class FakeContext:
    def __init__(self):
        self.server_hostname = None

    def wrap_socket(self, sock, server_hostname=None):
        self.server_hostname = server_hostname
        return sock


NO_PROXY_ENV = {k: "" for k in ("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy")}


class NetworkGuardTest(unittest.TestCase):
    def setUp(self):
        FakeSocket.connected = []
        patcher = mock.patch.dict(os.environ, NO_PROXY_ENV)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(mock.patch.stopall)
        mock.patch.object(relay.urllib.request, "getproxies", lambda: {}).start()

    def test_dns_rebinding_after_validation_is_blocked_at_connect(self):
        answers = [addrinfo("104.16.0.1"), addrinfo("127.0.0.1")]
        mock.patch.object(relay.socket, "getaddrinfo", lambda *a, **k: answers.pop(0)).start()
        mock.patch.object(relay.socket, "socket", FakeSocket).start()
        relay._valid_public_url("https://rebind.example.com/v1")  # first answer is public
        conn = relay._PinnedHTTPSConnection("rebind.example.com", 443, context=FakeContext())
        with self.assertRaises(relay.ImageProxyError):
            conn.connect()  # second answer is loopback
        self.assertEqual(FakeSocket.connected, [])

    def test_connects_to_validated_ip_with_original_sni(self):
        mock.patch.object(relay.socket, "getaddrinfo", lambda *a, **k: addrinfo("104.16.0.1")).start()
        mock.patch.object(relay.socket, "socket", FakeSocket).start()
        context = FakeContext()
        conn = relay._PinnedHTTPSConnection("api.example.com", 443, context=context)
        conn.connect()
        self.assertEqual(FakeSocket.connected, ["104.16.0.1"])
        self.assertEqual(context.server_hostname, "api.example.com")

    def test_opener_uses_pinned_https_handler(self):
        opener = relay._opener()
        self.assertTrue(any(isinstance(h, relay._PinnedHTTPSHandler) for h in opener.handlers))

    def test_ip_literals_refused(self):
        mock.patch.object(relay.socket, "getaddrinfo", side_effect=AssertionError("no DNS for literals")).start()
        for url in ("https://127.0.0.1/v1", "https://104.16.0.1/v1", "https://[::1]/v1",
                    "https://198.18.0.5/v1", "https://[2606:4700::1]/v1"):
            with self.subTest(url):
                with self.assertRaises(relay.ImageProxyError):
                    relay._valid_public_url(url)

    def test_clash_fake_ip_domain_allowed_but_private_dns_rejected(self):
        mock.patch.object(relay.socket, "getaddrinfo", lambda *a, **k: addrinfo("198.18.0.7")).start()
        relay._valid_public_url("https://api.openai.com/v1")
        for private in ("10.0.0.2", "192.168.1.3", "127.0.0.1", "169.254.169.254", "100.64.0.1"):
            mock.patch.object(relay.socket, "getaddrinfo", lambda *a, _p=private, **k: addrinfo(_p)).start()
            with self.subTest(private):
                with self.assertRaises(relay.ImageProxyError):
                    relay._valid_public_url("https://evil.example.com/v1")

    def test_https_proxy_skips_local_dns(self):
        mock.patch.object(relay.socket, "getaddrinfo", side_effect=OSError("poisoned")).start()
        with self.assertRaises(relay.ImageProxyError):
            relay._valid_public_url("https://api.openai.com/v1")
        mock.patch.object(relay.urllib.request, "getproxies", lambda: {"https": "http://127.0.0.1:7890"}).start()
        mock.patch.object(relay.urllib.request, "proxy_bypass", lambda host: False).start()
        relay._valid_public_url("https://api.openai.com/v1")
        # Literal and local names stay blocked even through a proxy.
        for url in ("https://127.0.0.1/v1", "https://router.local/v1", "https://localhost/v1"):
            with self.assertRaises(relay.ImageProxyError):
                relay._valid_public_url(url)

    def test_upstream_error_body_shapes(self):
        mock.patch.object(relay, "_valid_public_url", lambda v, allow_query=False: relay.urllib.parse.urlsplit(v)).start()
        for body, expected in ((b'[{"error":"bad"}]', "HTTP 400"), (b'{"error":"quota"}', "quota"),
                               (b'{"error":{"message":"bad model"}}', "bad model"), (b"<html>gateway</html>", "gateway"),
                               (b'"plain"', "plain")):
            class Opener:
                def open(self, request, timeout=None, _b=body):
                    raise urllib.error.HTTPError(request.full_url, 400, "bad", {}, io.BytesIO(_b))
            mock.patch.object(relay, "_opener", lambda o=Opener: o()).start()
            with self.subTest(body):
                with self.assertRaises(relay.ImageProxyError) as ctx:
                    relay.request_image_edit({"baseUrl": "https://relay.example.com/v1", "model": "m",
                                              "prompt": "p", "operation": "generate"}, "sk-secret-value")
                self.assertEqual(ctx.exception.status, 502)
                self.assertIn(expected, str(ctx.exception))
                self.assertNotIn("sk-secret-value", str(ctx.exception))


if __name__ == "__main__":
    unittest.main(verbosity=2)
