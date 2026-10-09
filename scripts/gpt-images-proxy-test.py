"""Offline protocol/security tests. Fixtures are not evidence of real provider success."""
import base64
import importlib.util
import json
from pathlib import Path
import socket
import struct
import sys
import subprocess
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch
import zlib

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
try:
    import gpt_images as gpt
except ImportError:
    gpt = None


def png(width=1, height=1, alpha=255):
    def chunk(name, data):
        return struct.pack('!I', len(data)) + name + data + struct.pack('!I', zlib.crc32(name + data))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB', width, height, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress((b'\x00' + bytes([0, 0, 0, alpha]) * width) * height)) + chunk(b'IEND', b''))


def data_url(raw):
    return 'data:image/png;base64,' + base64.b64encode(raw).decode()


class Fixture(BaseHTTPRequestHandler):
    records = []
    reply = {'data': [{'b64_json': base64.b64encode(png()).decode()}]}
    status = 200
    declared_length = None

    def log_message(self, *args):
        pass

    def do_POST(self):
        raw = self.rfile.read(int(self.headers['Content-Length']))
        type(self).records.append((self.path, dict(self.headers), raw))
        body = json.dumps(type(self).reply).encode()
        self.send_response(type(self).status)
        self.send_header('Content-Length', str(type(self).declared_length if type(self).declared_length is not None else len(body)))
        if type(self).status == 302:
            self.send_header('Location', '/redirected')
        self.end_headers()
        self.wfile.write(body)


class ImagesProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = ThreadingHTTPServer(('127.0.0.1', 0), Fixture)
        cls.thread = threading.Thread(target=cls.fixture.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.fixture.shutdown()
        cls.fixture.server_close()
        cls.thread.join()

    def setUp(self):
        self.assertIsNotNone(gpt, 'GPT Images backend module must exist')
        Fixture.records = []
        Fixture.status = 200
        Fixture.declared_length = None
        Fixture.reply = {'data': [{'b64_json': base64.b64encode(png()).decode()}]}
        self.env = {'GPT_IMAGES_ALLOW_LOOPBACK': '1'}
        self.payload = dict(apiKey='fixture-secret', baseUrl=f'http://127.0.0.1:{self.fixture.server_port}/v1',
                            model='gpt-image-1.5', operation='generate', prompt='protocol fixture prompt',
                            size='1024x1024', quality='low', background='opaque')

    def run_request(self, **changes):
        return gpt.perform_request(dict(self.payload, **changes), environ=self.env)

    def test_generation_uses_images_json_contract_and_normalizes_png(self):
        result = self.run_request()
        path, headers, raw = Fixture.records[0]
        self.assertEqual(path, '/v1/images/generations')
        self.assertEqual(headers['Authorization'], 'Bearer fixture-secret')
        body = json.loads(raw)
        self.assertEqual(body, dict(model='gpt-image-1.5', prompt='protocol fixture prompt', n=1,
                                   size='1024x1024', quality='low', background='opaque', output_format='png'))
        self.assertEqual(result['images'], [{'dataUrl': data_url(png())}])
        self.assertEqual(result['provider'], 'custom-unverified')

    def test_edit_preserves_target_first_and_mask_alpha_in_multipart(self):
        target, reference, mask = png(alpha=200), png(alpha=123), png(alpha=0)
        self.run_request(operation='edit', images=[data_url(target), data_url(reference)], mask=data_url(mask))
        path, headers, raw = Fixture.records[0]
        self.assertEqual(path, '/v1/images/edits')
        self.assertTrue(headers['Content-Type'].startswith('multipart/form-data; boundary='))
        self.assertEqual(raw.count(b'name="image[]"'), 2)
        self.assertLess(raw.index(target), raw.index(reference))
        self.assertIn(b'name="mask"', raw)
        self.assertIn(mask, raw)
        self.assertNotIn(b'fixture-secret', raw)

    def test_invalid_payloads_are_rejected_before_any_upstream_request(self):
        invalid = [dict(operation='chat'), dict(prompt=''), dict(model='gpt-4o'),
                   dict(size='bad'), dict(quality='hd'), dict(background='invalid'),
                   dict(operation='edit', images=[]), dict(images=[data_url(png())]),
                   dict(operation='edit', images=['https://example.com/image.png']),
                   dict(operation='edit', images=[data_url(png())], mask=data_url(png(alpha=255))),
                   dict(operation='edit', images=[data_url(png())], mask=data_url(png(width=2, alpha=0))),
                   dict(operation='edit', images=[data_url(b'not png')]), dict(apiKey='bad\r\nkey')]
        for changes in invalid:
            with self.subTest(changes=list(changes)):
                with self.assertRaises(gpt.ImagesError):
                    self.run_request(**changes)
        self.assertEqual(Fixture.records, [])

    def test_loopback_requires_explicit_development_environment(self):
        with self.assertRaises(gpt.ImagesError):
            gpt.perform_request(self.payload, environ={})
        self.assertEqual(Fixture.records, [])

    def test_endpoint_rejects_http_credentials_query_fragments_and_private_ips(self):
        for url in ['http://api.openai.com/v1', 'https://secret:password@api.openai.com/v1',
                    'https://api.openai.com/v1?key=secret', 'https://api.openai.com/v1#secret',
                    'https://10.0.0.1/v1', 'https://169.254.169.254/v1', 'https://[::1]/v1',
                    'https://127.0.0.1/v1', 'https://[::ffff:127.0.0.1]/v1']:
            with self.subTest(url=url), self.assertRaises(gpt.ImagesError):
                gpt.validate_url(url)

    def test_dns_failure_is_a_network_error(self):
        with patch('gpt_images.socket.getaddrinfo', side_effect=socket.gaierror()), self.assertRaises(gpt.ImagesError) as caught:
            gpt.validate_url('https://fixture.example/v1')
        self.assertEqual(caught.exception.status, 502)
        self.assertEqual(caught.exception.code, 'endpoint_dns')

    def test_multicast_dns_address_is_rejected(self):
        records = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('224.0.0.1', 443))]
        with patch('gpt_images.socket.getaddrinfo', return_value=records), self.assertRaises(gpt.ImagesError):
            gpt.validate_url('https://fixture.example/v1')

    def test_dns_mixed_public_private_answers_rejected(self):
        records = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('8.8.8.8', 443)),
                   (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', 443))]
        with patch('gpt_images.socket.getaddrinfo', return_value=records), self.assertRaises(gpt.ImagesError):
            gpt.validate_url('https://fixture.example/v1')

    def test_url_results_never_forward_authorization(self):
        Fixture.reply = {'data': [{'url': 'https://public-result.example/image.png'}]}
        seen = []
        original = gpt._transport
        def transport(url, method, body, headers, **kwargs):
            if method == 'GET':
                seen.append(headers)
                return png(), 'image/png'
            return original(url, method, body, headers, **kwargs)
        with patch('gpt_images._transport', side_effect=transport):
            result = self.run_request()
        self.assertEqual(result['images'][0]['dataUrl'], data_url(png()))
        self.assertEqual(seen, [{'Accept': 'image/png, image/jpeg, image/webp'}])

    def test_private_result_url_rejected_even_in_loopback_development(self):
        Fixture.reply = {'data': [{'url': f'http://127.0.0.1:{self.fixture.server_port}/image.png'}]}
        with self.assertRaises(gpt.ImagesError):
            self.run_request()
        self.assertEqual(len(Fixture.records), 1)

    def test_upstream_failures_are_sanitized_and_never_retried(self):
        for status in [302, 401, 429, 500]:
            Fixture.records = []
            Fixture.status = status
            Fixture.reply = {'error': {'message': 'fixture-secret protocol fixture prompt'}}
            with self.subTest(status=status), self.assertRaises(gpt.ImagesError) as caught:
                self.run_request()
            self.assertNotIn('fixture-secret', str(caught.exception))
            self.assertNotIn('protocol fixture prompt', str(caught.exception))
            self.assertEqual(len(Fixture.records), 1)

    def test_malformed_response_never_becomes_success(self):
        for reply in [{}, {'data': []}, {'data': [{'b64_json': 'bad!'}]}, {'data': [{'b64_json': 'aGVsbG8='}]}]:
            Fixture.reply = reply
            with self.subTest(reply=reply), self.assertRaises(gpt.ImagesError):
                self.run_request()

    def test_truncated_declared_response_is_not_success(self):
        Fixture.declared_length = 10000
        with self.assertRaises(gpt.ImagesError):
            self.run_request()

    def test_response_bound_is_enforced_before_download(self):
        with self.assertRaises(gpt.ImagesError) as caught:
            gpt._transport(self.payload['baseUrl'] + '/images/generations', 'POST', b'{}',
                           {'Content-Type': 'application/json'}, allow_loopback=True, limit=16)
        self.assertEqual(caught.exception.code, 'response_limit')

    def test_connection_uses_one_pinned_dns_lookup(self):
        records = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', self.fixture.server_port))]
        with patch('gpt_images.socket.getaddrinfo', return_value=records) as resolver:
            raw, _ = gpt._transport(self.payload['baseUrl'] + '/images/generations', 'POST', b'{}',
                                    {'Content-Type': 'application/json'}, allow_loopback=True)
        self.assertEqual(resolver.call_count, 1)
        self.assertEqual(len(json.loads(raw)['data']), 1)

    def test_custom_endpoint_cannot_inherit_official_environment_key(self):
        self.env['OPENAI_API_KEY'] = 'do-not-forward'
        with self.assertRaises(gpt.ImagesError):
            self.run_request(apiKey='')
        self.assertEqual(Fixture.records, [])

    def test_real_cli_requires_explicit_paid_flag(self):
        cli = ROOT / 'scripts/gpt-images-real-test.py'
        self.assertTrue(cli.is_file(), 'Local real-API opt-in CLI must exist')
        result = subprocess.run([sys.executable, str(cli), '--prompt', 'fixture', '--output', 'unused.png'],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('--allow-paid-api', result.stderr)

    def test_server_route_returns_json_and_keeps_nai_route(self):
        spec = importlib.util.spec_from_file_location('local_server', ROOT / '99_server.py')
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.assertTrue(hasattr(mod.CORSRequestHandler, '_proxy_gpt_images'))
        server = mod.ThreadedTCPServer(('127.0.0.1', 0), mod.CORSRequestHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        import http.client
        try:
            conn = http.client.HTTPConnection('127.0.0.1', server.server_address[1], timeout=5)
            conn.request('POST', '/api/gpt-images', json.dumps(dict(self.payload, apiKey='')), {'Content-Type': 'application/json'})
            response = conn.getresponse()
            self.assertEqual(response.status, 401)
            self.assertIn('error', json.loads(response.read()))
            with patch.object(mod, 'resolve_nai_token', return_value=''):
                conn.request('POST', '/nai-proxy/generate-image', '{}', {'Content-Type': 'application/json'})
                response = conn.getresponse()
            self.assertEqual(response.status, 401)
            response.read()
            conn.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == '__main__':
    unittest.main(verbosity=2)
