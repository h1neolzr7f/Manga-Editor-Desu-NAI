"""Optional local background-removal Sidecar.

The editor can run without this process. When rembg is installed in the
Sidecar environment, models are loaded lazily and the original image is never
returned as a fake success result. Color-key cutout works without rembg.
"""

from __future__ import annotations

import base64
import cgi
import json
import mimetypes
import os
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from cutout import DEFAULT_OPTIONS
from model_manager import ModelManager


HOST = "127.0.0.1"
PORT = 8765
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}


def data_url(payload: bytes) -> str:
    encoded = base64.b64encode(payload).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def safe_filename(filename: str | None) -> str:
    value = os.path.basename(filename or "input.png")
    return value if value and value != "." else "input.png"


class Handler(BaseHTTPRequestHandler):
    server_version = "MangaEditorLocalTools/0.3"

    @property
    def manager(self) -> ModelManager:
        return self.server.model_manager  # type: ignore[attr-defined]

    def _send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _error(self, message: str, code: str, status: int) -> None:
        self._send_json({"ok": False, "error": message, "code": code}, status)

    def do_OPTIONS(self) -> None:
        self._send_json({"ok": True})

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            installed = self.manager.processor_installed()
            self._send_json(
                {
                    "status": "ok",
                    "service": "manga-editor-local-tools",
                    "stub": False,
                    "processor": "rembg" if installed else "color-key",
                    "rembg": installed,
                    "colorKey": True,
                }
            )
            return
        if parsed.path == "/models":
            self._send_json({"models": self.manager.list_models()})
            return
        if parsed.path == "/engines":
            payload = self.manager.list_engines()
            payload["options"] = DEFAULT_OPTIONS
            self._send_json(payload)
            return
        self._error("Not found", "NOT_FOUND", 404)

    def _read_form(self) -> cgi.FieldStorage:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            raise ValueError("Request body is empty")
        if length > MAX_UPLOAD_BYTES:
            raise OverflowError(f"Upload exceeds {MAX_UPLOAD_BYTES} bytes")
        return cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": self.headers.get("Content-Type", "")},
        )

    @staticmethod
    def _file_field(form: cgi.FieldStorage, key: str) -> tuple[bytes, str, str]:
        field = form[key] if key in form else None
        if field is None or isinstance(field, list) or not getattr(field, "file", None):
            raise ValueError(f"Missing multipart file field: {key}")
        mime = (field.type or mimetypes.guess_type(safe_filename(field.filename))[0] or "").lower()
        if mime not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Unsupported image MIME type: {mime or 'unknown'}")
        content = field.file.read(MAX_UPLOAD_BYTES + 1)
        if len(content) > MAX_UPLOAD_BYTES:
            raise OverflowError(f"Upload exceeds {MAX_UPLOAD_BYTES} bytes")
        if not content:
            raise ValueError("Uploaded image is empty")
        return content, safe_filename(field.filename), mime

    @staticmethod
    def _options_from_form(form: cgi.FieldStorage) -> dict[str, Any]:
        keys = (
            "engine",
            "mode",
            "model",
            "alpha_matting",
            "fg_threshold",
            "bg_threshold",
            "erode_size",
            "post_process_mask",
            "only_mask",
            "crop",
            "feather",
            "key_color",
            "key_tolerance",
            "invert",
        )
        options: dict[str, Any] = {}
        raw = form.getfirst("options")
        if raw:
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    options.update(parsed)
            except json.JSONDecodeError as error:
                raise ValueError("options JSON is invalid") from error
        for key in keys:
            value = form.getfirst(key)
            if value is not None:
                options[key] = value
        if "model" not in options and "mode" in options:
            options["model"] = options["mode"]
        return options

    def _process_one(self, content: bytes, filename: str, options: dict[str, Any]) -> dict[str, Any]:
        with tempfile.NamedTemporaryFile(prefix="manga_editor_", suffix="_" + filename, delete=True) as temp:
            temp.write(content)
            temp.flush()
            model_id, result = self.manager.remove_background(content, options.get("model") or options.get("mode"), options)
        return {
            "ok": True,
            "model": model_id,
            "engine": options.get("engine") or ("color-key" if model_id == "color-key" else "rembg"),
            "filename": filename,
            "mime": "image/png",
            "image": data_url(result),
        }

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path not in {"/remove-background", "/batch-remove-background", "/segment", "/refine-mask"}:
            self._error("Not found", "NOT_FOUND", 404)
            return
        if parsed.path in {"/segment", "/refine-mask"}:
            self._error("This processor is scheduled for a later stage", "PROCESSOR_NOT_IMPLEMENTED", 501)
            return
        try:
            form = self._read_form()
            options = self._options_from_form(form)
            if parsed.path == "/remove-background":
                content, filename, _mime = self._file_field(form, "file")
                self._send_json(self._process_one(content, filename, options))
                return
            fields = form["files"] if "files" in form else []
            if not isinstance(fields, list):
                fields = [fields]
            if not fields:
                raise ValueError("Missing multipart file field: files")
            results = []
            for field in fields:
                if not getattr(field, "file", None):
                    raise ValueError("Invalid multipart file field")
                filename = safe_filename(field.filename)
                mime = (field.type or mimetypes.guess_type(filename)[0] or "").lower()
                if mime not in ALLOWED_MIME_TYPES:
                    raise ValueError(f"Unsupported image MIME type: {mime or 'unknown'}")
                content = field.file.read(MAX_UPLOAD_BYTES + 1)
                if len(content) > MAX_UPLOAD_BYTES:
                    raise OverflowError(f"Upload exceeds {MAX_UPLOAD_BYTES} bytes")
                results.append(self._process_one(content, filename, options))
            self._send_json({"ok": True, "results": results, "model": results[0]["model"]})
        except OverflowError as error:
            self._error(str(error), "UPLOAD_TOO_LARGE", 413)
        except ValueError as error:
            self._error(str(error), "INVALID_REQUEST", 400)
        except RuntimeError as error:
            code = "PROCESSOR_NOT_INSTALLED" if "not installed" in str(error).lower() else "PROCESSOR_FAILED"
            self._error(str(error), code, 503 if code == "PROCESSOR_NOT_INSTALLED" else 500)
        except Exception as error:  # pragma: no cover - defensive boundary for local service
            self._error(f"Processor failed: {error}", "PROCESSOR_FAILED", 500)

    def log_message(self, _format: str, *_args: Any) -> None:
        return


def main() -> None:
    port = int(os.environ.get("LOCAL_TOOLS_PORT") or PORT)
    server = ThreadingHTTPServer((HOST, port), Handler)
    server.model_manager = ModelManager()  # type: ignore[attr-defined]
    print(f"Manga Editor local-tools listening on http://{HOST}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
