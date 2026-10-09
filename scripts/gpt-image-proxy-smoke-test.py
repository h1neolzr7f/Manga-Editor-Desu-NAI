"""Offline contract tests for the Manga-NAI-GPT relay (no API credits)."""
import base64
import json
import os
import sys
import unittest
from unittest import mock
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import gpt_image_proxy as proxy


PNG = b"\x89PNG\r\n\x1a\n" + b"test-png-payload"
IMAGE = "data:image/png;base64," + base64.b64encode(PNG).decode("ascii")


def public_dns(*_args, **_kwargs):
    return [(2, 1, 6, "", ("1.1.1.1", 443))]


class FakeResponse:
    def __init__(self, data):
        self.data = data

    def read(self, maximum=None):
        return self.data if maximum is None else self.data[:maximum]

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class FakeOpener:
    def __init__(self, data):
        self.data = data
        self.request = None

    def open(self, request, timeout=None):
        self.request = request
        return FakeResponse(self.data)


class ImageRelayTest(unittest.TestCase):
    def test_private_hosts_and_plain_http_blocked(self):
        for url in ("http://api.openai.com/v1", "https://localhost/v1",
                    "https://127.0.0.1/v1", "https://api.test.local/v1",
                    "https://user:pass@example.com/v1", "https://api.example.com:8443/v1"):
            with self.subTest(url=url), self.assertRaises(proxy.ImageProxyError):
                proxy._endpoint(url, "edit")

    @mock.patch.object(proxy.socket, "getaddrinfo", side_effect=public_dns)
    def test_endpoint_normalization(self, _dns):
        self.assertEqual(proxy._endpoint("https://api.example.com/v1/", "edit"),
                         "https://api.example.com/v1/images/edits")
        self.assertEqual(proxy._endpoint("https://api.example.com/v1/images/edits", "generate"),
                         "https://api.example.com/v1/images/generations")
        self.assertEqual(proxy._endpoint("https://relay.example.com", "edit"),
                         "https://relay.example.com/v1/images/edits")

    def test_image_validation_and_multipart_headers(self):
        mime, raw = proxy._image_bytes(IMAGE)
        self.assertEqual(mime, "image/png")
        self.assertEqual(raw, PNG)
        with self.assertRaises(proxy.ImageProxyError):
            proxy._image_bytes("data:image/png;base64,AA==")
        body, content_type = proxy._multipart({"model": "gpt-image-1", "prompt": "test"},
                                               [("image", mime, raw, 0)])
        self.assertIn(b'Content-Disposition: form-data; name="image"; filename="image-0.png"', body)
        self.assertIn(b"\r\n\r\n" + PNG + b"\r\n", body)
        self.assertTrue(content_type.startswith("multipart/form-data; boundary="))

    @mock.patch.object(proxy.socket, "getaddrinfo", side_effect=public_dns)
    def test_mock_edit_request_returns_png_without_spending_credits(self, _dns):
        upstream = json.dumps({"data": [{"b64_json": base64.b64encode(PNG).decode("ascii")}]}).encode()
        opener = FakeOpener(upstream)
        with mock.patch.object(proxy, "_opener", return_value=opener):
            result = proxy.request_image_edit({
                "baseUrl": "https://relay.example.com/v1", "operation": "edit",
                "model": "gpt-image-1", "prompt": "replace a character",
                "image": IMAGE, "references": [IMAGE]
            }, "fake-key-never-persisted")
        self.assertTrue(result["ok"])
        self.assertEqual(result["image"], IMAGE)
        self.assertEqual(opener.request.full_url, "https://relay.example.com/v1/images/edits")
        self.assertIn(b'name="image[]"', opener.request.data)
        self.assertEqual(opener.request.get_header("Authorization"), "Bearer fake-key-never-persisted")
        self.assertIn("Mozilla/5.0", opener.request.get_header("User-agent"))

    @mock.patch.object(proxy.socket, "getaddrinfo", side_effect=public_dns)
    def test_generate_uses_json_without_image(self, _dns):
        upstream = json.dumps({"data": [{"b64_json": base64.b64encode(PNG).decode("ascii")}]}).encode()
        opener = FakeOpener(upstream)
        with mock.patch.object(proxy, "_opener", return_value=opener):
            result = proxy.request_image_edit({
                "baseUrl": "https://api.example.com/v1", "operation": "generate",
                "model": "gpt-image-1", "prompt": "manga panel"
            }, "example-key")
        self.assertTrue(result["ok"])
        self.assertEqual(opener.request.get_header("Content-type"), "application/json")
        self.assertEqual(json.loads(opener.request.data)["prompt"], "manga panel")


    def test_env_key_is_pinned_to_trusted_url(self):
        env = {"GPT_IMAGE_API_KEY": "only-for-trusted-endpoint",
               "GPT_IMAGE_TRUSTED_BASE_URL": "https://relay.example.com/v1"}
        self.assertEqual(proxy._env_key_for_destination({"baseUrl": "https://relay.example.com/v1"}, env),
                         "only-for-trusted-endpoint")
        with self.assertRaises(proxy.ImageProxyError):
            proxy._env_key_for_destination({"baseUrl": "https://attacker.example/v1"}, env)

    def test_local_post_rejects_cross_origin_null_origin_and_dns_rebinding(self):
        def allowed(headers, address="127.0.0.1"):
            return proxy._authorized_local_request(SimpleNamespace(
                client_address=(address, 43315), headers=headers))
        original = {"Host": "127.0.0.1:8000", "Origin": "http://127.0.0.1:8000",
                    "Sec-Fetch-Site": "same-origin"}
        self.assertTrue(allowed(original))
        self.assertFalse(allowed({**original, "Origin": "https://attacker.example"}))
        self.assertFalse(allowed({**original, "Origin": "null"}))
        self.assertFalse(allowed({**original, "Origin": ""}))
        self.assertFalse(allowed({**original, "Host": "evil.example:8000"}))
        self.assertFalse(allowed({**original, "Sec-Fetch-Site": "cross-site"}))
        self.assertFalse(allowed(original, "192.168.1.1"))
        self.assertTrue(allowed({**original, "Host": "localhost:8000",
                                 "Origin": "http://localhost:8000"}))

    @mock.patch.object(proxy.socket, "getaddrinfo",
                       return_value=[(2, 1, 6, "", ("198.18.0.22", 443))])
    def test_clash_tun_fake_ip_allowed_for_dns_names_but_not_ip_literals(self, _dns):
        self.assertEqual(proxy._endpoint("https://api.openai.com/v1", "edit"),
                         "https://api.openai.com/v1/images/edits")
        with self.assertRaises(proxy.ImageProxyError):
            proxy._endpoint("https://198.18.0.22/v1", "edit")

    @mock.patch.object(proxy.socket, "getaddrinfo",
                       return_value=[(2, 1, 6, "", ("10.0.0.10", 443))])
    def test_dns_to_private_ip_remains_blocked(self, _dns):
        with self.assertRaises(proxy.ImageProxyError):
            proxy._endpoint("https://attacker.example/v1", "edit")

    def test_empty_prompt_or_key_fails_before_network(self):
        with self.assertRaises(proxy.ImageProxyError):
            proxy.request_image_edit({"model": "gpt-image-1", "prompt": "hello"}, "")
        with self.assertRaises(proxy.ImageProxyError):
            proxy.request_image_edit({"model": "gpt-image-1", "prompt": ""}, "key")


if __name__ == "__main__":
    unittest.main(verbosity=2)
