"""Regression: a busy port 8000 gives a clear error instead of a traceback, and Windows uses
exclusive binding (no silent double-bind via SO_REUSEADDR). Never touches a foreign process:
skipped when port 8000 is already in use by something else.
Run: python3 scripts/server-port-conflict-test.py
"""
import importlib.util
import os
from pathlib import Path
import socket
import subprocess
import sys
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]


class PortConflictTest(unittest.TestCase):
    def test_busy_port_message(self):
        blocker = socket.socket()
        try:
            blocker.bind(("127.0.0.1", 8000))
        except OSError:
            blocker.close()
            self.skipTest("port 8000 already used by another process; not touching it")
        blocker.listen(1)
        try:
            result = subprocess.run([sys.executable, "99_server.py"], cwd=str(ROOT), capture_output=True,
                                    text=True, encoding="utf-8", errors="replace", timeout=20, env=dict(os.environ, PYTHONIOENCODING="cp1252"))
        finally:
            blocker.close()
        self.assertEqual(result.returncode, 98, result.stdout + result.stderr)
        self.assertIn("8000", result.stdout)
        self.assertNotIn("Traceback", result.stderr)

    def test_windows_exclusive_bind_policy(self):
        source = (ROOT / "99_server.py").read_text(encoding="utf-8")
        self.assertIn("allow_reuse_address = os.name != 'nt'", source)
        self.assertIn("SO_EXCLUSIVEADDRUSE", source)
        self.assertNotIn("socketserver.TCPServer.allow_reuse_address = True", source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
