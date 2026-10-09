"""Bounded Images API adapter. No retries, credential persistence, or payload logging.

Custom providers implement the standard Images contract only and remain unverified.
Network connections use validated, pinned DNS addresses; proxies and redirects are
intentionally disabled so endpoint checks cannot be bypassed by either mechanism.
"""
import base64
import binascii
import http.client
import ipaddress
import json
import os
import re
import socket
import ssl
import struct
import time
import urllib.parse
import uuid
import zlib

OFFICIAL_BASE = 'https://api.openai.com/v1'
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_INPUT_BYTES = 24 * 1024 * 1024
MAX_REQUEST_BYTES = 34 * 1024 * 1024
MAX_RESPONSE_BYTES = 48 * 1024 * 1024
MAX_OUTPUT_BYTES = 32 * 1024 * 1024
REQUEST_TIMEOUT = 180
PNG_SIGNATURE = b'\x89PNG\r\n\x1a\n'


class ImagesError(Exception):
    def __init__(self, message, status=400, code='invalid_request'):
        super().__init__(message)
        self.status = status
        self.code = code


def validate_url(url, allow_loopback=False, allow_query=False):
    """Resolve once, reject every unsafe answer, and return a pinned endpoint."""
    if not isinstance(url, str) or len(url) > 4096 or any(ord(ch) < 33 for ch in url) or '\\' in url:
        raise ImagesError('Invalid Images endpoint URL')
    try:
        parsed = urllib.parse.urlsplit(url)
        host, port = parsed.hostname, parsed.port
        if not host or parsed.username is not None or parsed.password is not None or parsed.fragment:
            raise ValueError()
        if parsed.query and not allow_query:
            raise ValueError()
        host = host.encode('idna').decode('ascii')
        # Loopback development must be explicitly enabled and use a literal address.
        try:
            literal = ipaddress.ip_address(host)
        except ValueError:
            literal = None
        development = bool(allow_loopback and literal and literal.is_loopback)
        if parsed.scheme != 'https' and not (parsed.scheme == 'http' and development):
            raise ValueError()
        port = port or (443 if parsed.scheme == 'https' else 80)
        if not 1 <= port <= 65535:
            raise ValueError()
        if '%' in host:
            raise ValueError()
        try:
            answers = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        except socket.gaierror:
            raise ImagesError('Could not resolve Images endpoint; check network access and DNS', 502, 'endpoint_dns') from None
        if not answers:
            raise ValueError()
        addresses = []
        for family, socktype, proto, canonname, address in answers:
            ip = ipaddress.ip_address(address[0])
            mapped = getattr(ip, 'ipv4_mapped', None)
            check = mapped or ip
            if check.is_multicast or check.is_unspecified or check.is_reserved:
                raise ValueError()
            if not check.is_global and not (development and check.is_loopback):
                raise ValueError()
            addresses.append((family, address))
        return parsed, host, port, addresses[0]
    except (ValueError, UnicodeError, OSError):
        raise ImagesError('Images endpoint must use HTTPS and a public address; credentials, fragments and private networks are forbidden') from None


def _transport(url, method, body, headers, allow_loopback=False, allow_query=False,
               limit=MAX_RESPONSE_BYTES, timeout=REQUEST_TIMEOUT):
    parsed, host, port, (family, address) = validate_url(url, allow_loopback, allow_query)
    conn = http.client.HTTPConnection(host, port, timeout=timeout)
    deadline = time.monotonic() + timeout
    try:
        # Do not resolve a second time: this also blocks DNS rebinding between validation/connect.
        sock = socket.socket(family, socket.SOCK_STREAM)
        conn.sock = sock
        sock.settimeout(timeout)
        sock.connect(address)
        if parsed.scheme == 'https':
            sock.settimeout(max(0.001, deadline - time.monotonic()))
            conn.sock = ssl.create_default_context().wrap_socket(sock, server_hostname=host)
        network_sock = conn.sock
        path = parsed.path or '/'
        if parsed.query:
            path += '?' + parsed.query
        conn.request(method, path, body=body, headers=headers)
        response = conn.getresponse()
        if response.status < 200 or response.status >= 300:
            # Never reflect upstream bodies: they may echo credentials or private prompts.
            code = response.status
            if 300 <= code < 400:
                raise ImagesError('Images upstream redirect refused', 502, 'upstream_redirect')
            safe_status = code if code in (400, 401, 403, 404, 413, 422, 429) else 502
            raise ImagesError('Images upstream returned HTTP %d' % code, safe_status, 'upstream_error')
        length = response.getheader('Content-Length')
        if length is not None and (not length.isdecimal() or int(length) > limit):
            raise ImagesError('Images upstream response exceeds the size limit', 502, 'response_limit')
        chunks, total = [], 0
        while not response.isclosed():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError()
            network_sock.settimeout(remaining)
            chunk = response.read1(min(65536, limit - total + 1))
            if not chunk:
                break
            total += len(chunk)
            if total > limit:
                raise ImagesError('Images upstream response exceeds the size limit', 502, 'response_limit')
            chunks.append(chunk)
        if length is not None and total != int(length):
            raise ImagesError('Images upstream response was incomplete', 502, 'invalid_response')
        return b''.join(chunks), response.getheader('Content-Type', '')
    except ImagesError:
        raise
    except (socket.timeout, TimeoutError):
        raise ImagesError('Images request timed out; it was not retried', 504, 'upstream_timeout') from None
    except (OSError, ValueError, http.client.HTTPException):
        raise ImagesError('Images upstream connection failed; it was not retried', 502, 'upstream_connection') from None
    finally:
        conn.close()


def _png_info(raw, mask=False):
    """Validate browser PNGs and alpha masks without adding a Pillow dependency."""
    if not raw.startswith(PNG_SIGNATURE):
        raise ImagesError('Input images and masks must be PNG data URLs')
    offset, header, compressed, ended = 8, None, [], False
    while offset + 12 <= len(raw):
        size = struct.unpack('!I', raw[offset:offset + 4])[0]
        name = raw[offset + 4:offset + 8]
        end = offset + 12 + size
        if end > len(raw):
            raise ImagesError('Invalid PNG data')
        data = raw[offset + 8:offset + 8 + size]
        crc = struct.unpack('!I', raw[offset + 8 + size:end])[0]
        if zlib.crc32(name + data) != crc:
            raise ImagesError('Invalid PNG checksum')
        if header is None and name != b'IHDR':
            raise ImagesError('Invalid PNG header')
        if name == b'IHDR':
            if header is not None or size != 13:
                raise ImagesError('Invalid PNG header')
            header = struct.unpack('!IIBBBBB', data)
        elif name == b'IDAT':
            compressed.append(data)
        elif name == b'IEND':
            if size != 0 or end != len(raw):
                raise ImagesError('Invalid PNG end')
            ended = True
            break
        offset = end
    if not header or not ended or not compressed:
        raise ImagesError('Invalid PNG data')
    width, height, depth, color, compression, filtering, interlace = header
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}.get(color)
    if not width or not height or width * height > 16 * 1024 * 1024 or max(width, height) > 8192:
        raise ImagesError('PNG dimensions exceed the input limit')
    if depth != 8 or channels is None or compression or filtering or interlace:
        raise ImagesError('Use an 8-bit non-interlaced PNG (canvas PNG export is supported)')
    if mask and color not in (4, 6):
        raise ImagesError('Mask must have an alpha channel with transparent edit pixels')
    stride = width * channels
    expected = height * (stride + 1)
    try:
        decoder = zlib.decompressobj()
        decoded = decoder.decompress(b''.join(compressed), expected + 1)
        if len(decoded) != expected or not decoder.eof or decoder.unused_data or decoder.unconsumed_tail:
            raise ValueError()
    except (zlib.error, ValueError):
        raise ImagesError('Invalid PNG pixels') from None
    transparent = False
    previous = bytearray(stride)
    for row_index in range(height):
        start = row_index * (stride + 1)
        filter_type = decoded[start]
        if filter_type > 4:
            raise ImagesError('Invalid PNG row filter')
        if not mask:
            continue
        row = bytearray(decoded[start + 1:start + 1 + stride])
        for x in range(stride):
            left = row[x - channels] if x >= channels else 0
            up = previous[x]
            upper_left = previous[x - channels] if x >= channels else 0
            if filter_type == 1:
                delta = left
            elif filter_type == 2:
                delta = up
            elif filter_type == 3:
                delta = (left + up) // 2
            elif filter_type == 4:
                p = left + up - upper_left
                distances = (abs(p - left), abs(p - up), abs(p - upper_left))
                delta = (left, up, upper_left)[distances.index(min(distances))]
            else:
                delta = 0
            row[x] = (row[x] + delta) & 255
        transparent = transparent or any(alpha == 0 for alpha in row[channels - 1::channels])
        previous = row
    if mask and not transparent:
        raise ImagesError('Mask has no alpha-zero pixels to edit')
    return width, height


def _decode_png(value, mask=False):
    prefix = 'data:image/png;base64,'
    if not isinstance(value, str) or not value.startswith(prefix) or len(value) > MAX_IMAGE_BYTES * 4 // 3 + 64:
        raise ImagesError('Input images must be PNG data URLs smaller than 8 MiB')
    try:
        raw = base64.b64decode(value[len(prefix):], validate=True)
    except (ValueError, binascii.Error):
        raise ImagesError('Invalid image base64') from None
    if not raw or len(raw) > (4 * 1024 * 1024 - 1 if mask else MAX_IMAGE_BYTES):
        raise ImagesError('Image or mask exceeds the input limit')
    return raw, _png_info(raw, mask=mask)


def _multipart(fields, images, mask):
    boundary = 'gpt-images-' + uuid.uuid4().hex
    parts = []
    for name, value in fields.items():
        parts.append(('--%s\r\nContent-Disposition: form-data; name="%s"\r\n\r\n%s\r\n' % (boundary, name, value)).encode('utf-8'))
    files = [('image[]', 'input-%d.png' % i, raw) for i, raw in enumerate(images)]
    if mask is not None:
        files.append(('mask', 'mask.png', mask))
    for name, filename, raw in files:
        parts.append(('--%s\r\nContent-Disposition: form-data; name="%s"; filename="%s"\r\nContent-Type: image/png\r\n\r\n' % (boundary, name, filename)).encode())
        parts.extend([raw, b'\r\n'])
    parts.append(('--%s--\r\n' % boundary).encode())
    return b''.join(parts), 'multipart/form-data; boundary=' + boundary


def _output_data_url(raw):
    if not raw or len(raw) > MAX_OUTPUT_BYTES:
        raise ImagesError('Images output exceeds the size limit', 502, 'invalid_response')
    if raw.startswith(PNG_SIGNATURE):
        try:
            _png_info(raw)
        except ImagesError:
            raise ImagesError('Images upstream returned an invalid PNG', 502, 'invalid_response') from None
        mime = 'image/png'
    elif raw.startswith(b'\xff\xd8\xff') and raw.endswith(b'\xff\xd9'):
        mime = 'image/jpeg'
    elif len(raw) > 12 and raw.startswith(b'RIFF') and raw[8:12] == b'WEBP':
        mime = 'image/webp'
    else:
        raise ImagesError('Images upstream returned unsupported image data', 502, 'invalid_response')
    return 'data:%s;base64,%s' % (mime, base64.b64encode(raw).decode('ascii'))


def perform_request(payload, environ=None):
    env = os.environ if environ is None else environ
    if not isinstance(payload, dict):
        raise ImagesError('Request must be a JSON object')
    base = payload.get('baseUrl') or OFFICIAL_BASE
    if not isinstance(base, str):
        raise ImagesError('Invalid Images base URL')
    base = base.rstrip('/')
    official = base == OFFICIAL_BASE
    key = payload.get('apiKey') or (env.get('OPENAI_API_KEY', '') if official else '')
    if not key:
        raise ImagesError('Configure an Images API key before submitting a request', 401, 'missing_api_key')
    if not isinstance(key, str) or len(key) > 4096 or any(ord(ch) < 33 or ord(ch) > 126 for ch in key):
        raise ImagesError('Invalid Images API key')
    operation = payload.get('operation', 'generate')
    if operation not in ('generate', 'edit'):
        raise ImagesError('Images operation must be generate or edit')
    model = payload.get('model') or 'gpt-image-1.5'
    if not isinstance(model, str) or not re.fullmatch(r'(?:gpt-image-[a-zA-Z0-9.-]+|chatgpt-image-latest)', model):
        raise ImagesError('Use a GPT Image model ID')
    prompt = payload.get('prompt')
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 32000:
        raise ImagesError('Prompt must contain 1 to 32000 characters')
    fields = {'model': model, 'prompt': prompt, 'n': 1, 'output_format': 'png'}
    for name, values in [('quality', ('auto', 'low', 'medium', 'high')), ('background', ('auto', 'opaque', 'transparent'))]:
        value = payload.get(name) or 'auto'
        if value not in values:
            raise ImagesError('Invalid Images %s' % name)
        fields[name] = value
    size = payload.get('size') or '1024x1024'
    if size not in ('auto', '1024x1024', '1536x1024', '1024x1536'):
        raise ImagesError('Images size must be auto, 1024x1024, 1536x1024 or 1024x1536')
    fields['size'] = size
    inputs = payload.get('images') or []
    if not isinstance(inputs, list) or len(inputs) > 16:
        raise ImagesError('Provide no more than 16 reference images')
    mask_value = payload.get('mask')
    if operation == 'generate':
        if inputs or mask_value:
            raise ImagesError('Reference images and masks require the edit operation')
        body, content_type = json.dumps(fields, ensure_ascii=False).encode('utf-8'), 'application/json'
    else:
        if not inputs:
            raise ImagesError('Edit requires a target image first, followed by optional references')
        decoded = [_decode_png(value) for value in inputs]
        mask, dimensions = _decode_png(mask_value, mask=True) if mask_value else (None, None)
        if mask is not None and dimensions != decoded[0][1]:
            raise ImagesError('Mask dimensions must match the first target image')
        images = [raw for raw, dimensions in decoded]
        if sum(map(len, images)) + (len(mask) if mask else 0) > MAX_INPUT_BYTES:
            raise ImagesError('Combined input images exceed 24 MiB')
        body, content_type = _multipart(fields, images, mask)
    endpoint = base + ('/images/generations' if operation == 'generate' else '/images/edits')
    # Validate the base separately so a query cannot hide the appended operation path.
    allow_loopback = env.get('GPT_IMAGES_ALLOW_LOOPBACK') == '1'
    validate_url(base, allow_loopback=allow_loopback)
    raw, _ = _transport(endpoint, 'POST', body, {'Authorization': 'Bearer ' + key,
                                               'Content-Type': content_type, 'Accept': 'application/json'},
                        allow_loopback=allow_loopback)
    try:
        result = json.loads(raw.decode('utf-8'))
    except (ValueError, UnicodeError):
        raise ImagesError('Images upstream returned invalid JSON', 502, 'invalid_response') from None
    entries = result.get('data') if isinstance(result, dict) else None
    if not isinstance(entries, list) or len(entries) != 1 or not isinstance(entries[0], dict):
        raise ImagesError('Images upstream returned no single image', 502, 'invalid_response')
    entry = entries[0]
    if isinstance(entry.get('b64_json'), str) and entry['b64_json']:
        try:
            image = base64.b64decode(entry['b64_json'], validate=True)
        except (ValueError, binascii.Error):
            raise ImagesError('Images upstream returned invalid image base64', 502, 'invalid_response') from None
    elif isinstance(entry.get('url'), str):
        # Signed public result URLs are allowed; credentials are never sent to downloads.
        image, _ = _transport(entry['url'], 'GET', None, {'Accept': 'image/png, image/jpeg, image/webp'},
                              allow_query=True, limit=MAX_OUTPUT_BYTES, timeout=30)
    else:
        raise ImagesError('Images upstream returned no image data', 502, 'invalid_response')
    return {'images': [{'dataUrl': _output_data_url(image)}], 'provider': 'openai' if official else 'custom-unverified',
            'model': model, 'operation': operation}
