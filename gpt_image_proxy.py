"""Local-only OpenAI-compatible image edit/generation proxy.

Credentials are passed in memory per request; no secrets are written to disk.
This deliberately does not share the AI director's model normalization logic.
"""
import base64
import binascii
import ipaddress
import json
import os
import socket
import urllib.error
import urllib.parse
import urllib.request
import uuid

MAX_REQUEST_BYTES = 36 * 1024 * 1024
MAX_IMAGE_BYTES = 12 * 1024 * 1024
MAX_RESULT_BYTES = 20 * 1024 * 1024


class ImageProxyError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ImageProxyError("上游重定向已被拒绝，请填写最终 HTTPS API 地址。", 502)


def _valid_public_url(value, allow_query=False):
    parsed = urllib.parse.urlsplit(str(value or "").strip())
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
            or (parsed.query and not allow_query) or parsed.fragment or parsed.port not in (None, 443)):
        raise ImageProxyError("API 地址必须是公开 HTTPS URL，不得包含凭据、查询参数或自定义端口。")
    hostname = parsed.hostname.lower().rstrip(".")
    if hostname == "localhost" or hostname.endswith((".localhost", ".local", ".internal")):
        raise ImageProxyError("不允许向内网地址转发图像请求。")
    try:
        addresses = socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
    except OSError as exc:
        raise ImageProxyError("无法解析 API 主机名。", 502) from exc
    if not addresses:
        raise ImageProxyError("无法解析 API 主机名。", 502)
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global:
            raise ImageProxyError("API 主机名解析到非公网 IP，已拒绝访问。")
    return parsed


def _endpoint(base_url, operation):
    parsed = _valid_public_url(base_url)
    path = parsed.path.rstrip("/")
    for ending in ("/images/edits", "/images/generations"):
        if path.endswith(ending):
            path = path[:-len(ending)]
    if not path:
        path = "/v1"
    if ".." in path.split("/"):
        raise ImageProxyError("非法 API 路径。")
    endpoint = "/images/edits" if operation == "edit" else "/images/generations"
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, path + endpoint, "", ""))


def _image_bytes(value):
    if not isinstance(value, str) or "," not in value:
        raise ImageProxyError("请提供 PNG/JPEG/WebP 格式的图片。")
    header, encoded = value.split(",", 1)
    mime = header[5:].split(";", 1)[0].lower() if header.startswith("data:") else ""
    if mime not in ("image/png", "image/jpeg", "image/webp"):
        raise ImageProxyError("仅支持 PNG、JPEG 和 WebP 图片。")
    try:
        data = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ImageProxyError("图片 Base64 无效。") from exc
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise ImageProxyError("单张图片不能为空或超过 12MB。", 413)
    detected = _detect_mime(data)
    if detected != mime:
        raise ImageProxyError("图片格式与文件内容不一致。")
    return mime, data


def _detect_mime(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    return ""


def _multipart(fields, images):
    boundary = "manga-gpt-" + uuid.uuid4().hex
    body = bytearray()
    for name, value in fields.items():
        body.extend(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name +
                     "\"\r\n\r\n" + str(value) + "\r\n").encode("utf-8"))
    for name, mime, payload, i in images:
        extension = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}[mime]
        body.extend(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name +
                     "\"; filename=\"image-" + str(i) + "." + extension + "\"\r\nContent-Type: " + mime +
                     "\r\n\r\n").encode("utf-8"))
        body.extend(payload)
        body.extend(b"\r\n")
    body.extend(("--" + boundary + "--\r\n").encode("utf-8"))
    return bytes(body), "multipart/form-data; boundary=" + boundary


def _opener():
    # No redirects: upstream URLs and returned image links both must pass checks.
    return urllib.request.build_opener(NoRedirect())


def _extract_image(raw, opener):
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ImageProxyError("上游没有返回符合 OpenAI 格式的 JSON。", 502) from exc
    images = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(images, list) or not images or not isinstance(images[0], dict):
        msg = ((payload.get("error") or {}).get("message")
               if isinstance(payload.get("error"), dict) else "上游未返回图片。") if isinstance(payload, dict) else "上游未返回图片。"
        raise ImageProxyError(str(msg)[:250], 502)
    item = images[0]
    b64 = item.get("b64_json")
    if b64:
        try:
            data = base64.b64decode(b64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ImageProxyError("上游返回无效的图片 Base64。", 502) from exc
    elif item.get("url"):
        image_url = str(item["url"])
        _valid_public_url(image_url, allow_query=True)
        with opener.open(urllib.request.Request(image_url, headers={"Accept": "image/*"}), timeout=30) as response:
            data = response.read(MAX_RESULT_BYTES + 1)
    else:
        raise ImageProxyError("上游未返回 b64_json 或 url 图片。", 502)
    if len(data) > MAX_RESULT_BYTES or not data:
        raise ImageProxyError("上游图片为空或超过 20MB。", 502)
    mime = _detect_mime(data)
    if not mime:
        raise ImageProxyError("上游结果不是 PNG/JPEG/WebP 图片。", 502)
    return {"ok": True, "image": "data:" + mime + ";base64," +
            base64.b64encode(data).decode("ascii"), "revisedPrompt": item.get("revised_prompt") or ""}


def request_image_edit(payload, key):
    if not isinstance(payload, dict):
        raise ImageProxyError("请求必须是 JSON 对象。")
    operation = payload.get("operation") or "edit"
    if operation not in ("edit", "generate"):
        raise ImageProxyError("operation 只能是 edit 或 generate。")
    model = str(payload.get("model") or "").strip()
    prompt = str(payload.get("prompt") or "").strip()
    if not key:
        raise ImageProxyError("请填写 GPT 图像接口密钥。", 401)
    if not model or len(model) > 120 or not prompt or len(prompt) > 4000:
        raise ImageProxyError("模型不能为空，提示词长度必须为 1–4000 字。")
    endpoint = _endpoint(payload.get("baseUrl"), operation)
    fields = {"model": model, "prompt": prompt}
    size = payload.get("size") or "auto"
    if size != "auto":
        if size not in ("1024x1024", "1536x1024", "1024x1536"):
            raise ImageProxyError("不支持的图片尺寸。")
        fields["size"] = size
    if operation == "edit":
        mime, image = _image_bytes(payload.get("image"))
        references = payload.get("references") or []
        if not isinstance(references, list) or len(references) > 3:
            raise ImageProxyError("最多支持 3 张参考图。")
        images = [(("image[]" if references else "image"), mime, image, 0)]
        for i, data_url in enumerate(references, 1):
            ref_mime, ref_image = _image_bytes(data_url)
            images.append(("image[]", ref_mime, ref_image, i))
        body, content_type = _multipart(fields, images)
    else:
        body = json.dumps(fields, ensure_ascii=False).encode("utf-8")
        content_type = "application/json"
    if len(body) > MAX_REQUEST_BYTES:
        raise ImageProxyError("请求总大小超过 36MB。", 413)
    headers = {"Authorization": "Bearer " + key, "Accept": "application/json", "Content-Type": content_type}
    opener = _opener()
    request = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
    try:
        with opener.open(request, timeout=120) as response:
            raw = response.read(MAX_RESULT_BYTES + 1)
        if len(raw) > MAX_RESULT_BYTES:
            raise ImageProxyError("上游响应超过 20MB。", 502)
        return _extract_image(raw, opener)
    except urllib.error.HTTPError as exc:
        raw = exc.read(2048).decode("utf-8", "replace")
        try:
            error = json.loads(raw).get("error", {})
            message = error.get("message", raw) if isinstance(error, dict) else str(error)
        except ValueError:
            message = raw
        message = str(message).replace(key, "[redacted]")[:300]
        raise ImageProxyError("上游 HTTP " + str(exc.code) + "：" + message, 502) from exc
    except urllib.error.URLError as exc:
        raise ImageProxyError("无法连接图像接口，请检查地址、网络代理与模型支持情况。", 502) from exc


def handle_gpt_image_post(handler):
    if urllib.parse.urlsplit(handler.path).path != "/gpt-image-proxy":
        return False
    # Local editing API must never become an unauthenticated relay on a LAN bind.
    peer = ipaddress.ip_address(handler.client_address[0])
    if not peer.is_loopback:
        handler._send_json({"ok": False, "error": "只允许本机访问 GPT 图像代理。"}, 403)
        return True
    origin = handler.headers.get("Origin")
    if origin and not handler.headers.get("Host", "").startswith(("localhost:", "127.0.0.1:")):
        handler._send_json({"ok": False, "error": "请从本机编辑器访问 GPT 图像代理。"}, 403)
        return True
    try:
        length = int(handler.headers.get("Content-Length", "0"))
        if length <= 0 or length > MAX_REQUEST_BYTES:
            raise ImageProxyError("请求不能为空或超过 36MB。", 413)
        if not handler.headers.get("Content-Type", "").lower().startswith("application/json"):
            raise ImageProxyError("仅接受 JSON。", 415)
        payload = json.loads(handler.rfile.read(length))
        key = handler.headers.get("Authorization", "").strip()
        if key.lower().startswith("bearer "):
            key = key[7:].strip()
        key = key or os.environ.get("GPT_IMAGE_API_KEY", "").strip()
        result = request_image_edit(payload, key)
        handler._send_json(result)
    except ImageProxyError as exc:
        handler._send_json({"ok": False, "error": str(exc)}, exc.status)
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
        handler._send_json({"ok": False, "error": "无效的 JSON 请求。"}, 400)
    except Exception:
        handler._send_json({"ok": False, "error": "图像代理发生内部错误。"}, 500)
    return True
