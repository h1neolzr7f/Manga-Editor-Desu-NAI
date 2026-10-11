"""prompt_helper_images: on-demand example images with SHA-256 checks (no network: fake opener)."""
import hashlib
import io
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import prompt_helper_images as phi  # noqa: E402

A, B, C = b"alpha-image", b"beta-image", b"fork-image"
h = lambda b: hashlib.sha256(b).hexdigest()


class Resp(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class PromptHelperImages(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = self.tmp.name
        os.makedirs(os.path.join(root, "json_js"))
        self.man = {"version": 1, "root": "03_images/imgPromptHelper/", "packs": {
            "upstream": {"label": "上游示例图", "source": "https://example.test/u/", "files": {"hair/a.webp": [h(A), len(A)], "颜色/b.webp": [h(B), len(B)]}},
            "novelai": {"label": "NovelAI 素材示例图", "source": None, "files": {"novelai/c.png": [h(C), len(C)]}}}}
        with open(os.path.join(root, "json_js", "prompt-helper-images.json"), "w", encoding="utf-8") as f:
            json.dump(self.man, f, ensure_ascii=False)
        self._old = (phi.ROOT, phi.MANIFEST)
        phi.ROOT, phi.MANIFEST = root, os.path.join(root, "json_js", "prompt-helper-images.json")
        self.urls = []

    def tearDown(self):
        phi.ROOT, phi.MANIFEST = self._old
        self.tmp.cleanup()

    def opener(self, files):
        def op(url, timeout=0):
            self.urls.append(url)
            for name, data in files.items():
                if url.endswith(name):
                    if data is None:
                        raise OSError("network down")
                    return Resp(data)
            raise OSError("404")
        return op

    def test_status_then_download_verifies_and_serves_from_store(self):
        st = {p["id"]: p for p in phi.status()["packs"]}
        self.assertEqual((st["upstream"]["have"], st["upstream"]["files"], st["upstream"]["downloadable"]), (0, 2, True))
        self.assertFalse(st["novelai"]["downloadable"])
        res = phi.download("upstream", opener=self.opener({"a.webp": A, "%E9%A2%9C%E8%89%B2/b.webp": B}))
        self.assertEqual(res["failed"], 0)
        self.assertTrue(all(u.startswith("https://example.test/u/03_images/imgPromptHelper/") for u in self.urls))
        p = phi.local_path("颜色/b.webp")
        self.assertTrue(p.startswith(phi.store_dir()))
        with open(p, "rb") as f:
            self.assertEqual(f.read(), B)
        self.assertEqual({x["id"]: x["have"] for x in phi.status()["packs"]}["upstream"], 2)

    def test_tampered_file_is_rejected(self):
        res = phi.download("upstream", opener=self.opener({"a.webp": b"evil-image!", "%E9%A2%9C%E8%89%B2/b.webp": B}))
        self.assertEqual(res["failed"], 1)
        self.assertIsNone(phi.local_path("hair/a.webp"))
        self.assertIn("校验", res["warning"])

    def test_offline_gives_friendly_error_and_keeps_nothing(self):
        with self.assertRaises(phi.PromptHelperError) as cm:
            phi.download("upstream", opener=self.opener({"a.webp": None}))
        self.assertIn("联网", str(cm.exception))
        self.assertEqual(cm.exception.status, 502)

    def test_pack_without_source_is_not_downloadable(self):
        with self.assertRaises(phi.PromptHelperError) as cm:
            phi.download("novelai", opener=self.opener({}))
        self.assertEqual(cm.exception.status, 409)
        self.assertEqual(self.urls, [])

    def _zip_pack(self, member_bytes):
        import zipfile as zf
        b = io.BytesIO()
        with zf.ZipFile(b, "w") as z:
            z.writestr("novelai/c.png", member_bytes)
        data = b.getvalue()
        self.man["packs"]["novelai"]["archive"] = {"url": "https://example.test/r/pack.zip", "sha256": h(data), "size": len(data)}
        with open(phi.MANIFEST, "w", encoding="utf-8") as f:
            json.dump(self.man, f, ensure_ascii=False)
        return data

    def test_archive_pack_verified_zip_and_members(self):
        data = self._zip_pack(C)
        self.assertTrue({p["id"]: p for p in phi.status()["packs"]}["novelai"]["downloadable"])
        res = phi.download("novelai", opener=self.opener({"pack.zip": data}))
        self.assertEqual(res["failed"], 0)
        self.assertTrue(phi.local_path("novelai/c.png"))

    def test_archive_with_wrong_hash_rejected(self):
        data = self._zip_pack(C)
        with self.assertRaises(phi.PromptHelperError):
            phi.download("novelai", opener=self.opener({"pack.zip": data + b"x"}))
        self.assertIsNone(phi.local_path("novelai/c.png"))

    def test_archive_member_tampered_skipped(self):
        data = self._zip_pack(b"evil")
        res = phi.download("novelai", opener=self.opener({"pack.zip": data}))
        self.assertEqual(res["failed"], 1)
        self.assertIsNone(phi.local_path("novelai/c.png"))

    def test_unsafe_paths_rejected(self):
        for bad in ("../x.png", "a/../../x", "/etc/passwd", ""):
            with self.assertRaises(phi.PromptHelperError):
                phi.local_path(bad)


class RealManifest(unittest.TestCase):
    def test_manifest_covers_every_file_once_with_pinned_upstream_source(self):
        m = phi.manifest()
        up = m["packs"]["upstream"]
        self.assertRegex(up["source"], r"^https://raw\.githubusercontent\.com/new-sankaku/manga-editor-desu/[0-9a-f]{40}/$")
        names = [rel for p in m["packs"].values() for rel in p["files"]]
        self.assertEqual(len(names), len(set(names)))
        self.assertGreater(len(names), 800)


if __name__ == "__main__":
    unittest.main(verbosity=1)
