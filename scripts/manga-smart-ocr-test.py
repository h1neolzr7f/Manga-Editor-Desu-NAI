"""No network or OCR binary needed. Test TSV parsing and a mocked Tesseract process."""
import base64
import io
import pathlib
import sys
import unittest
from types import SimpleNamespace
from unittest import mock
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import manga_smart_ocr as ocr

TSV = """level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext
5\t1\t1\t1\t1\t1\t10\t12\t30\t19\t91.3\tHello
5\t1\t1\t1\t1\t2\t43\t12\t25\t19\t90.0\tworld
5\t1\t1\t1\t2\t1\t15\t55\t19\t23\t88.0\t猫
5\t1\t1\t1\t2\t2\t35\t55\t15\t23\t95.0\t！
5\t1\t1\t1\t3\t1\t20\t90\t10\t10\t-1\t(noise)
"""
# Minimal PNG with a valid IHDR enough for input validation (native Tesseract is mocked).
PNG = (b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\x0dIHDR" +
       (256).to_bytes(4, "big") + (256).to_bytes(4, "big") + b"\x08\x06\x00\x00\x00")
URL = "data:image/png;base64," + base64.b64encode(PNG).decode("ascii")

class SmartOcrTests(unittest.TestCase):
    def test_lines_are_grouped_without_overwriting_separate_bubbles(self):
        items = ocr.parse_tsv(TSV, 256, 256, "jpn+eng")
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["text"], "Hello world")
        self.assertEqual(items[0]["x"], 10)
        self.assertEqual(items[0]["width"], 58)
        self.assertEqual(items[1]["text"], "猫！")
        self.assertEqual(items[1]["y"], 55)

    def test_rejects_invalid_png_oversize_and_language_injection(self):
        with self.assertRaises(ocr.SmartOcrError):
            ocr.read_image("data:text/plain;base64,AAAA")
        with self.assertRaises(ocr.SmartOcrError):
            ocr.read_image("data:image/png;base64,%%%")
        with self.assertRaises(ocr.SmartOcrError):
            ocr.ocr_image(URL, "--psm 1; rm -rf /")

    @mock.patch.object(ocr.shutil, "which", return_value="/usr/bin/tesseract")
    @mock.patch.object(ocr.subprocess, "run")
    def test_ocr_runs_local_tesseract_with_fixed_command(self, run, which):
        run.return_value = SimpleNamespace(returncode=0, stdout=TSV, stderr="")
        value = ocr.ocr_image(URL, "jpn+eng")
        self.assertEqual(value["width"], 256)
        self.assertEqual(len(value["regions"]), 2)
        command = run.call_args.args[0]
        self.assertEqual(command[:3], ["/usr/bin/tesseract", "stdin", "stdout"])
        self.assertIn("jpn+eng", command)
        self.assertLessEqual(run.call_args.kwargs["timeout"], 90)
        self.assertEqual(run.call_args.kwargs["input"], PNG)

    @mock.patch.object(ocr.shutil, "which", return_value=None)
    def test_missing_engine_has_actionable_error(self, _):
        with self.assertRaises(ocr.SmartOcrError) as ctx:
            ocr.ocr_image(URL, "jpn+eng")
        self.assertEqual(ctx.exception.status, 503)
        self.assertIn("Tesseract", str(ctx.exception))

    def test_cross_site_requests_never_run_ocr(self):
        handler = SimpleNamespace(
            path="/manga-smart/ocr",
            client_address=("127.0.0.1", 32321),
            headers={"Host":"127.0.0.1:8000","Origin":"null",
                     "Content-Length":"9999", "Content-Type":"application/json"},
            close_connection=False,
            _send_json=lambda result, status=200: results.append((result, status)))
        results=[]
        with mock.patch.object(ocr, "ocr_image", side_effect=AssertionError("OCR must not run")):
            self.assertTrue(ocr.handle_smart_ocr_post(handler))
        self.assertEqual(results[0][1], 403)
        self.assertTrue(handler.close_connection)

if __name__ == "__main__":
    unittest.main(verbosity=2)
