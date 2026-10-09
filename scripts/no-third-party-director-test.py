"""Regression: no third-party Director gateway is built in, and the NovelAI token
never leaves for a non-NovelAI host by default.

1. The removed third-party gateway domain must not appear in any tracked file
   (source, docs, env examples, scripts, tests, packaged zip archives).
2. 99_server.py has no default Director URL; without a user-configured URL the
   Director proxy sends nothing.
3. A NovelAI token (``pst-…`` or the configured NOVELAI_API_KEY) is refused for
   any non-NovelAI Director gateway, from the UI header and from .env.
4. Shipped defaults (index.html, settings schema, .env.example, Windows launcher,
   pipeline smoke script) carry no Director URL; the browser-side guard refuses
   NovelAI tokens for non-NovelAI hosts.

Offline: upstream calls are captured in memory. Run: python3 scripts/no-third-party-director-test.py
"""
import http.client
import importlib.util
import io
import os
import re
import subprocess
import sys
import threading
import unittest
import zipfile
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("manga_director_default", ROOT / "99_server.py")
srv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(srv)
srv.QUIET_REQUESTS = True

# Built from parts so this test file does not itself contain the banned word.
BANNED = ("token" + "dance").encode()
NAI_TOKEN = "pst-" + "T" * 60
GATEWAY = "https://director.example.test/v1/chat/completions"
SKIP_DIRS = {".git", "node_modules", "artifacts"}


def tracked_files():
    try:
        out = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, check=True).stdout
        return [ROOT / p for p in out.decode("utf-8", "surrogateescape").split("\0") if p]
    except Exception:
        files = []
        for base, dirs, names in os.walk(ROOT):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            files += [Path(base) / n for n in names]
        return files


class Capture:
    def __init__(self):
        self.requests = []

    def opener(self):
        capture = self

        class Resp:
            status = 200
            headers = {"Content-Type": "application/json"}

            def read(self, *_):
                return b'{"data":[]}'

            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

        class Opener:
            def open(self, request, timeout=None):
                capture.requests.append({"url": request.full_url,
                                         "auth": dict((k.lower(), v) for k, v in request.header_items()).get("authorization", "")})
                return Resp()

        return Opener()


class NoBannedDomainTest(unittest.TestCase):
    def test_banned_domain_absent_from_repo(self):
        hits = []
        for path in tracked_files():
            if not path.is_file():
                continue
            data = path.read_bytes()
            if BANNED in data.lower():
                hits.append(str(path.relative_to(ROOT)))
            if path.suffix.lower() == ".zip":
                try:
                    with zipfile.ZipFile(io.BytesIO(data)) as zf:
                        for name in zf.namelist():
                            if BANNED in name.lower().encode() or BANNED in zf.read(name).lower():
                                hits.append(f"{path.relative_to(ROOT)}!{name}")
                except zipfile.BadZipFile:
                    pass
        self.assertEqual(hits, [], "removed third-party Director domain still referenced")


class ServerDefaultTest(unittest.TestCase):
    def test_no_default_director_url(self):
        self.assertEqual(srv.DEFAULT_DIRECTOR_API_URL, "")
        token, url, err = srv.resolve_director_credentials({}, True, environ={"DIRECTOR_API_KEY": "sk-x"})
        self.assertEqual((token, url, err), ("", "", "no_url"))

    def test_nai_token_refused_for_non_novelai_gateway(self):
        env = {"NOVELAI_API_KEY": "nai-plain-secret"}
        for auth in ("Bearer " + NAI_TOKEN, NAI_TOKEN, "Bearer nai-plain-secret"):
            with self.subTest(auth=auth[:12]):
                token, _, err = srv.resolve_director_credentials(
                    {"Authorization": auth, "X-Director-Api-Url": GATEWAY}, True, environ=env)
                self.assertEqual((token, err), ("", "novelai_token"))
        # .env misconfiguration: the NovelAI token pasted as DIRECTOR_API_KEY.
        token, _, err = srv.resolve_director_credentials(
            {}, True, environ={"DIRECTOR_API_KEY": NAI_TOKEN, "DIRECTOR_API_URL": GATEWAY})
        self.assertEqual((token, err), ("", "novelai_token"))
        # A real gateway key to a user-configured gateway still works.
        token, url, err = srv.resolve_director_credentials(
            {"Authorization": "Bearer sk-gw", "X-Director-Api-Url": GATEWAY}, True, environ=env)
        self.assertEqual((token, url, err), ("Bearer sk-gw", GATEWAY, None))

    def test_novelai_host_helper(self):
        self.assertTrue(srv.is_novelai_official_url("https://image.novelai.net/ai/generate-image"))
        self.assertTrue(srv.is_novelai_official_url("https://api.novelai.net/user/subscription"))
        for bad in ("https://novelai.net.evil.example/x", "https://evilnovelai.net/x", GATEWAY, ""):
            self.assertFalse(srv.is_novelai_official_url(bad), bad)


class ServerHttpTest(unittest.TestCase):
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
        self.capture = Capture()
        clean = {k: v for k, v in os.environ.items() if not k.startswith(("DIRECTOR_", "NOVELAI_", "NAI_API"))}
        clean["NOVELAI_API_KEY"] = NAI_TOKEN
        self.env = mock.patch.dict(os.environ, clean, clear=True)
        self.env.start()
        self.opener = mock.patch.object(srv, "_build_proxy_opener", self.capture.opener)
        self.opener.start()
        host = "127.0.0.1:%d" % self.port
        self.same_origin = {"Host": host, "Origin": "http://" + host, "Sec-Fetch-Site": "same-origin"}

    def tearDown(self):
        for req in self.capture.requests:
            if NAI_TOKEN in req["auth"]:
                self.assertTrue(srv.is_novelai_official_url(req["url"]), req["url"])
        self.opener.stop()
        self.env.stop()

    def call(self, method, path, headers, body=b'{"messages":[]}'):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=8)
        values = dict(headers)
        if method == "POST":
            values.update({"Content-Type": "application/json", "Content-Length": str(len(body))})
        try:
            conn.request(method, path, body=body if method == "POST" else None, headers=values)
            resp = conn.getresponse()
            return resp.status, resp.read()
        finally:
            conn.close()

    def test_default_install_sends_nothing(self):
        status, body = self.call("POST", "/director-proxy/chat-completions", self.same_origin)
        self.assertEqual(status, 400, body)
        status, body = self.call("GET", "/director-proxy/models", self.same_origin)
        self.assertEqual(status, 400, body)
        self.assertEqual(self.capture.requests, [])

    def test_nai_token_never_forwarded_to_gateway(self):
        for path, method in (("/director-proxy/chat-completions", "POST"), ("/director-proxy/models", "GET")):
            status, _ = self.call(method, path, dict(self.same_origin, **{
                "Authorization": "Bearer " + NAI_TOKEN, "X-Director-Api-Url": GATEWAY}))
            self.assertEqual(status, 403)
        self.assertEqual(self.capture.requests, [])

    def test_user_configured_gateway_with_own_key_works(self):
        status, _ = self.call("POST", "/director-proxy/chat-completions", dict(self.same_origin, **{
            "Authorization": "Bearer sk-own", "X-Director-Api-Url": GATEWAY}))
        self.assertEqual(status, 200)
        self.assertEqual(self.capture.requests[-1]["url"], GATEWAY)


class ShippedDefaultsTest(unittest.TestCase):
    def read(self, rel):
        return (ROOT / rel).read_text(encoding="utf-8")

    def test_ui_and_config_defaults_are_empty(self):
        self.assertRegex(self.read("index.html"), r'id="naiDirectorApiUrl" value=""')
        self.assertIn("naiDirectorApiUrl:{id:'naiDirectorApiUrl',default:''}", self.read("js/project-management.js"))
        self.assertRegex(self.read(".env.example"), r"(?m)^DIRECTOR_API_URL=\s*$")
        self.assertRegex(self.read("start_manga_editor_nai.ps1"), r'(?m)^Get-EnvValue "DIRECTOR_API_URL"\s*$')
        self.assertRegex(self.read("scripts/nai-pipeline-smoke-test.mjs"), r'naiDirectorApiUrl\?\.trim\(\) \|\|\s*""')
        self.assertIn("getInputValue('naiDirectorApiUrl','')", self.read("js/ai/prompt/novelai-composition-director.js"))
        self.assertIn("input.value.trim():'';", self.read("js/ai/ai-settings.js"))

    def test_any_hardcoded_director_url_is_absent(self):
        # No http(s) default may be assigned to the Director URL anywhere in the front end.
        for rel in ("index.html", "js/project-management.js", "js/ai/ai-settings.js",
                    "js/ai/prompt/novelai-composition-director.js"):
            text = self.read(rel)
            self.assertNotRegex(text, r"naiDirectorApiUrl['\"]?\s*,\s*['\"]https?://", rel)
            self.assertNotRegex(text, r"naiDirectorApiUrl',default:'https?://", rel)

    def test_browser_guard(self):
        js = r"""
const vm=require('vm'),fs=require('fs');const ctx={URL};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/ai/prompt/director-safety.js','utf8')+';this.S=NaiDirectorSafety;',ctx);const s=ctx.S;
const ok=[s.isNovelAiToken('pst-abc'), s.isNovelAiToken('Bearer pst-abc'), !s.isNovelAiToken('sk-gw'), !s.isNovelAiToken(''),
 s.isNovelAiHost('https://image.novelai.net/x'), !s.isNovelAiHost('https://novelai.net.evil.example/x'),
 !s.isNovelAiHost('https://director.example.test/v1')];
if(ok.some(v=>!v)){console.error(JSON.stringify(ok));process.exit(1);}
"""
        r = subprocess.run(["node", "-e", js], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=1)
