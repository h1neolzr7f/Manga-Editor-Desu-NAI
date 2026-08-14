"""Manga Editor Desu · nai学长魔改版 local HTTP server v1.0.0."""
from concurrent.futures import ThreadPoolExecutor
from http.server import SimpleHTTPRequestHandler
import socketserver
import os
import mimetypes
import urllib.error
import urllib.parse
import urllib.request
import json
import math
import subprocess
import threading
import time
import uuid
import socket
import base64
try:
    import winreg
except ImportError:
    winreg = None

mimetypes.add_type('application/javascript', '.js')

TOOL_JOBS = {}
DIRECTOR_DEFAULT_MODEL = 'deepseek-v4-flash'
DIRECTOR_DYNAMIC_MODELS = set()
DIRECTOR_FALLBACK_MODEL_ORDER = [
    'deepseek-v4-flash',
    'deepseek-v4-pro',
    'deepseek-v3.2',
    'qwen3.5-flash',
    'qwen3.5-plus',
    'qwen3-max',
    'glm-4.5-air',
    'glm-5',
    'kimi-k2.5',
    'minimax-m2.7',
]
DIRECTOR_KNOWN_MODELS = set(DIRECTOR_FALLBACK_MODEL_ORDER) | {
    'minimax-m2.7',
    'glm-4.7',
    'glm-5',
    'qwen3-max',
    'deepseek-v3.2',
    'minimax-m2.5',
    'kimi-k2.5',
    'glm-4.5-air',
    'deepseek-v4-pro',
    'deepseek-v4-flash',
    'qwen3.5-flash',
    'qwen3.5-plus',
    'qwen3.6-plus',
    'qwen3.6-max-preview',
    'qwen3.7-max',
    'mimo-v2.5',
    'mimo-v2.5-pro',
    'mimo-v2-pro',
    'minimax-m3',
    'step-3.7-flash',
    'seed-2.0-lite',
    'seed-2.0-mini',
    'seed-2.0-pro',
}

def _director_fallback_models(error=None):
    default_model = _director_default_model()
    models = []
    for model_id in DIRECTOR_FALLBACK_MODEL_ORDER:
        models.append({
            'id': model_id,
            'name': model_id,
            'description': '内置兜底模型；上游模型列表不可用时仍可手动选择。',
            'supported_protocols': ['openai:chat-completions']
        })
    return {
        'data': models,
        'default': default_model,
        'fallback': True,
        'error': error or ''
    }

def _director_default_model():
    model = (os.environ.get('DIRECTOR_MODEL') or DIRECTOR_DEFAULT_MODEL).strip().lower()
    if not model or model == 'qwen3.5-flash' or model.startswith('gpt-') or model.startswith('chatgpt-'):
        return DIRECTOR_DEFAULT_MODEL
    return model

def _get_windows_user_proxy():
    if winreg is None:
        return None
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Internet Settings') as key:
            proxy_enable = winreg.QueryValueEx(key, 'ProxyEnable')[0]
            if not proxy_enable:
                return None
            proxy_server = winreg.QueryValueEx(key, 'ProxyServer')[0]
            if not proxy_server:
                return None
            proxy_server = str(proxy_server).strip()
            if '=' in proxy_server:
                parts = {}
                for item in proxy_server.split(';'):
                    if '=' in item:
                        name, value = item.split('=', 1)
                        parts[name.strip().lower()] = value.strip()
                proxy_server = parts.get('https') or parts.get('http') or parts.get('socks')
            if not proxy_server:
                return None
            if '://' not in proxy_server:
                proxy_server = 'http://' + proxy_server
            return proxy_server
    except Exception:
        return None

def _tcp_port_open(host, port, timeout=0.25):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False

def _get_local_proxy_fallback():
    for port in (7897, 7890, 10809, 10808, 1080):
        if _tcp_port_open('127.0.0.1', port):
            return f'http://127.0.0.1:{port}'
    return None

def _get_proxy_url():
    return os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY') or _get_windows_user_proxy() or _get_local_proxy_fallback()

def _build_proxy_opener():
    proxy_url = _get_proxy_url()
    if not proxy_url:
        return urllib.request.build_opener()
    return urllib.request.build_opener(urllib.request.ProxyHandler({
        'http': proxy_url,
        'https': proxy_url
    }))

def _browser_headers(extra=None):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Sec-CH-UA': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
        'Origin': 'https://novelai.net',
        'Referer': 'https://novelai.net/',
    }
    if extra:
        headers.update(extra)
    return headers

def _strip_bearer(token):
    token = (token or '').strip()
    if token.lower().startswith('bearer '):
        return token[7:].strip()
    return token

USER_ASSET_MAX_BYTES = 8 * 1024 * 1024

def safe_imported_asset_name(value):
    name = os.path.basename(str(value or 'asset'))
    cleaned = ''.join(ch if ch.isalnum() or ch in '._-' else '_' for ch in name).strip('._') or 'asset'
    return cleaned[:80]

def imported_asset_relative_path(asset_id, name):
    safe_id = safe_imported_asset_name(asset_id or uuid.uuid4().hex)
    safe_name = safe_imported_asset_name(name)
    return 'user_data/asset_packs/imported/%s_%s' % (safe_id[:32], safe_name)

def save_imported_asset(body):
    ensure_user_data_dirs()
    payload = body if isinstance(body, dict) else {}
    data = str(payload.get('data') or '')
    if data.startswith('data:') and ',' in data:
        data = data.split(',', 1)[1]
    try:
        raw = base64.b64decode(data)
    except Exception:
        return None, 'Invalid base64'
    if not raw:
        return None, 'Empty file'
    if len(raw) > USER_ASSET_MAX_BYTES:
        return None, 'File too large (max 8MB)'
    rel = imported_asset_relative_path(payload.get('id'), payload.get('name'))
    abs_path = os.path.join(os.getcwd(), rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, 'wb') as handle:
        handle.write(raw)
    return rel.replace('\\', '/'), None

def ensure_user_data_dirs():
    root = os.path.join(os.getcwd(), 'user_data')
    for relative in (
        'asset_packs/private',
        'asset_packs/generated',
        'asset_packs/imported',
        'asset_packs/public',
        'projects',
        'cache',
        'exports',
        'models',
    ):
        os.makedirs(os.path.join(root, relative), exist_ok=True)

def is_blocked_static_path(request_path):
    path = urllib.parse.unquote(request_path or '').replace('\\', '/')
    parts = [part for part in path.split('/') if part]
    blocked_names = {
        '.env', '.git', '.gitignore', '.gitattributes',
        'credentials.json', 'secrets.json', 'id_rsa', 'id_dsa'
    }
    blocked_suffixes = ('.pem', '.key', '.p12', '.pfx')
    for part in parts:
        lower = part.lower()
        if lower.startswith('.') and lower not in ('.well-known',):
            return True
        if lower in blocked_names or lower.startswith('.env'):
            return True
        if lower.endswith(blocked_suffixes):
            return True
    return False

def cors_allow_origin(origin):
    origin = (origin or '').strip()
    if not origin:
        return 'http://127.0.0.1:8000'
    if origin == 'null':
        return 'null'
    try:
        parsed = urllib.parse.urlsplit(origin)
        host = (parsed.hostname or '').lower()
        if parsed.scheme in ('http', 'https') and host in ('127.0.0.1', 'localhost', '::1'):
            return origin
    except Exception:
        return ''
    return ''

def resolve_nai_token(authorization_header, environ=None):
    header = (authorization_header or '').strip()
    if header:
        return header
    env = environ if environ is not None else os.environ
    return (env.get('NOVELAI_API_KEY') or '').strip()

def _env_int(name, fallback):
    try:
        return int(os.environ.get(name, fallback))
    except Exception:
        return fallback

def _round64(value):
    return max(64, int(round(float(value) / 64.0)) * 64)

def _safe_nai_size(width, height):
    max_pixels = max(64 * 64, _env_int('NAI_MAX_PIXELS', 1024 * 1024))
    max_edge = max(64, _env_int('NAI_MAX_EDGE', 1536))
    min_edge = max(64, min(_env_int('NAI_MIN_EDGE', 512), max_edge))
    try:
        width = float(width)
        height = float(height)
    except Exception:
        width = 1024.0
        height = 1024.0
    if not math.isfinite(width) or not math.isfinite(height) or width <= 0 or height <= 0:
        width = 1024.0
        height = 1024.0
    aspect = width / height if height else 1.0
    if not math.isfinite(aspect) or aspect <= 0:
        aspect = 1.0
    safe_height = math.sqrt(max_pixels / aspect)
    safe_width = safe_height * aspect
    if safe_width > max_edge:
        safe_width = float(max_edge)
        safe_height = safe_width / aspect
    if safe_height > max_edge:
        safe_height = float(max_edge)
        safe_width = safe_height * aspect
    safe_width = max(64, min(max_edge, _round64(safe_width)))
    safe_height = max(64, min(max_edge, _round64(safe_height)))
    while safe_width * safe_height > max_pixels:
        if safe_width / max(1, safe_height) > aspect and safe_width > 64:
            safe_width -= 64
        elif safe_height > 64:
            safe_height -= 64
        else:
            break
    if safe_width < min_edge and safe_height < max_edge:
        raised_width = min_edge
        raised_height = _round64(raised_width / aspect)
        if raised_width * raised_height <= max_pixels and raised_height <= max_edge:
            safe_width = raised_width
            safe_height = max(64, raised_height)
    if safe_height < min_edge and safe_width < max_edge:
        raised_height = min_edge
        raised_width = _round64(raised_height * aspect)
        if raised_width * raised_height <= max_pixels and raised_width <= max_edge:
            safe_height = raised_height
            safe_width = max(64, raised_width)
    return {'width': int(safe_width), 'height': int(safe_height)}

def _normalize_novelai_body(body):
    if not body:
        return body
    try:
        data = json.loads(body.decode('utf-8-sig') or '{}')
    except Exception:
        return body
    params = data.get('parameters')
    if isinstance(params, dict):
        safe_size = _safe_nai_size(params.get('width'), params.get('height'))
        params['width'] = safe_size['width']
        params['height'] = safe_size['height']
        params['n_samples'] = 1
    return json.dumps(data, ensure_ascii=False).encode('utf-8')

def _start_tool_job(kind, token, args):
    job_id = uuid.uuid4().hex[:12]
    TOOL_JOBS[job_id] = {
        'id': job_id,
        'kind': kind,
        'status': 'running',
        'started_at': time.time(),
        'ended_at': None,
        'exit_code': None,
        'logs': []
    }

    def run_job():
        env = os.environ.copy()
        resolved_token = _strip_bearer(token) or _strip_bearer(os.environ.get('NOVELAI_API_KEY', ''))
        if resolved_token:
            env['NOVELAI_API_KEY'] = _strip_bearer(resolved_token)
        proxy_url = _get_proxy_url()
        if proxy_url:
            env['HTTPS_PROXY'] = proxy_url
            env['HTTP_PROXY'] = proxy_url
        command = ['node', os.path.join('scripts', 'novelai-batch-tools.mjs')] + args
        try:
            process = subprocess.Popen(
                command,
                cwd=os.getcwd(),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            for line in process.stdout:
                logs = TOOL_JOBS[job_id]['logs']
                logs.append(line.rstrip())
                if len(logs) > 300:
                    del logs[:len(logs) - 300]
            process.wait()
            TOOL_JOBS[job_id]['exit_code'] = process.returncode
            TOOL_JOBS[job_id]['status'] = 'completed' if process.returncode == 0 else 'failed'
        except Exception as error:
            TOOL_JOBS[job_id]['logs'].append(str(error))
            TOOL_JOBS[job_id]['status'] = 'failed'
            TOOL_JOBS[job_id]['exit_code'] = -1
        finally:
            TOOL_JOBS[job_id]['ended_at'] = time.time()

    thread = threading.Thread(target=run_job, daemon=True)
    thread.start()
    return TOOL_JOBS[job_id]

def _material_preview_missing_status():
    output = subprocess.check_output(
        ['node', os.path.join('scripts', 'novelai-batch-tools.mjs'), 'missing'],
        cwd=os.getcwd(),
        text=True,
        encoding='utf-8',
        errors='replace'
    )
    return json.loads(output)

def _is_allowed_tagger_url(url):
    parsed = urllib.parse.urlsplit(url or '')
    if parsed.scheme not in ('http', 'https') or not parsed.netloc:
        return False
    if os.environ.get('TAGGER_ALLOW_REMOTE') == '1':
        return True
    host = (parsed.hostname or '').lower()
    return host in ('127.0.0.1', 'localhost', '::1')

class CORSRequestHandler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    
    def end_headers(self):
        origin = cors_allow_origin(self.headers.get('Origin'))
        if origin:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-Director-Api-Url')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Connection', 'keep-alive')
        self.send_header('Service-Worker-Allowed', '/')
        return super(CORSRequestHandler, self).end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def _send_json(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _send_text(self, text, status=200):
        payload = str(text).encode('utf-8', errors='replace')
        self.send_response(status)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _read_json_body(self):
        length = int(self.headers.get('Content-Length', '0') or '0')
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode('utf-8') or '{}')
        except Exception:
            return {}

    def _normalize_director_body(self, body):
        if not body:
            return body
        try:
            data = json.loads(body.decode('utf-8-sig') or '{}')
        except Exception:
            return body
        fallback_model = _director_default_model()
        model = str(data.get('model') or '').strip().lower()
        if not model or model.startswith('gpt-') or model.startswith('chatgpt-'):
            data['model'] = fallback_model
        else:
            data['model'] = model
        return json.dumps(data, ensure_ascii=False).encode('utf-8')

    def _proxy_novelai(self, method, upstream_path, body=None):
        token = resolve_nai_token(self.headers.get('Authorization', ''))
        if token and not token.lower().startswith('bearer '):
            token = 'Bearer ' + token
        if not token:
            self.send_error(401, 'Missing Authorization header')
            return

        url = 'https://image.novelai.net' + upstream_path
        headers = _browser_headers({
            'Authorization': token,
            'Accept': self.headers.get('Accept', 'application/zip, application/json'),
        })
        content_type = self.headers.get('Content-Type')
        if content_type:
            headers['Content-Type'] = content_type

        request = urllib.request.Request(url, data=body, headers=headers, method=method)
        opener = _build_proxy_opener()
        try:
            with opener.open(request, timeout=180) as response:
                data = response.read()
                self.send_response(response.status)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'application/octet-stream'))
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as error:
            data = error.read()
            self.send_response(error.code)
            self.send_header('Content-Type', error.headers.get('Content-Type', 'text/plain; charset=utf-8'))
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as error:
            self._send_text(f'{type(error).__name__}: {error}', 502)

    def _proxy_director(self, body=None):
        token = self.headers.get('Authorization', '') or os.environ.get('TOKENDANCE_API_KEY', '') or os.environ.get('DIRECTOR_API_KEY', '')
        upstream_url = self.headers.get('X-Director-Api-Url', '') or os.environ.get('DIRECTOR_API_URL', 'https://tokendance.space/gateway/v1/chat/completions')
        if token and not token.lower().startswith('bearer '):
            token = 'Bearer ' + token
        if not token:
            self.send_error(401, 'Missing Authorization header')
            return
        if not upstream_url:
            self.send_error(400, 'Missing X-Director-Api-Url header')
            return
        parsed = urllib.parse.urlsplit(upstream_url)
        if parsed.scheme not in ('http', 'https') or not parsed.netloc:
            self.send_error(400, 'Invalid director API URL')
            return

        headers = {
            'Authorization': token,
            'Accept': self.headers.get('Accept', 'application/json'),
            'Content-Type': self.headers.get('Content-Type', 'application/json'),
        }
        body = self._normalize_director_body(body)
        request = urllib.request.Request(upstream_url, data=body, headers=headers, method='POST')
        opener = _build_proxy_opener()
        try:
            with opener.open(request, timeout=180) as response:
                data = response.read()
                self.send_response(response.status)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as error:
            data = error.read()
            self.send_response(error.code)
            self.send_header('Content-Type', error.headers.get('Content-Type', 'text/plain; charset=utf-8'))
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as error:
            data = json.dumps({'error': str(error)}, ensure_ascii=False).encode('utf-8')
            self.send_response(502)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    def _proxy_tagger(self):
        body = self._read_json_body()
        upstream_url = (body.get('tagger_url') or os.environ.get('TAGGER_API_URL') or 'http://127.0.0.1:7860/tag').strip()
        if not _is_allowed_tagger_url(upstream_url):
            self._send_json({'error': 'Invalid or non-local tagger_url. Set TAGGER_ALLOW_REMOTE=1 to allow remote taggers.'}, 400)
            return
        if not body.get('image'):
            self._send_json({'error': 'Missing image data'}, 400)
            return
        payload = dict(body)
        payload.pop('tagger_url', None)
        request_body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        request = urllib.request.Request(upstream_url, data=request_body, headers={
            'Accept': 'application/json, text/plain',
            'Content-Type': 'application/json'
        }, method='POST')
        try:
            with urllib.request.build_opener().open(request, timeout=90) as response:
                data = response.read()
                content_type = response.headers.get('Content-Type', 'application/json')
                if 'application/json' in content_type:
                    self.send_response(response.status)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Content-Length', str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    return
                text = data.decode('utf-8', errors='replace')
                self._send_json({'caption': text, 'raw': text})
        except urllib.error.HTTPError as error:
            data = error.read().decode('utf-8', errors='replace')
            self._send_json({'error': data, 'status': error.code}, error.code)
        except Exception as error:
            self._send_json({'error': f'{type(error).__name__}: {error}'}, 502)

    def _proxy_director_models(self):
        token = self.headers.get('Authorization', '') or os.environ.get('TOKENDANCE_API_KEY', '') or os.environ.get('DIRECTOR_API_KEY', '')
        upstream_url = self.headers.get('X-Director-Api-Url', '') or os.environ.get('DIRECTOR_API_URL', 'https://tokendance.space/gateway/v1/chat/completions')
        if token and not token.lower().startswith('bearer '):
            token = 'Bearer ' + token
        if not token:
            self._send_json({'error': 'Missing director API token'}, 401)
            return
        parsed = urllib.parse.urlsplit(upstream_url)
        if parsed.scheme not in ('http', 'https') or not parsed.netloc:
            self._send_json({'error': 'Invalid director API URL'}, 400)
            return
        base_path = parsed.path
        if base_path.endswith('/chat/completions'):
            base_path = base_path[:-len('/chat/completions')]
        models_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, base_path.rstrip('/') + '/models', '', ''))
        request = urllib.request.Request(models_url, headers={
            'Authorization': token,
            'Accept': 'application/json'
        }, method='GET')
        try:
            with _build_proxy_opener().open(request, timeout=60) as response:
                raw = json.loads(response.read().decode('utf-8-sig') or '{}')
                models = []
                for item in raw.get('data') or []:
                    protocols = item.get('supported_protocols') or []
                    if 'openai:chat-completions' not in protocols:
                        continue
                    model_id = str(item.get('id') or '').strip().lower()
                    if not model_id:
                        continue
                    models.append({
                        'id': model_id,
                        'name': item.get('name') or model_id,
                        'context_length': item.get('context_length'),
                        'description': item.get('description') or '',
                        'supported_protocols': protocols
                    })
                DIRECTOR_DYNAMIC_MODELS.clear()
                DIRECTOR_DYNAMIC_MODELS.update(item['id'] for item in models)
                default_model = _director_default_model()
                self._send_json({'data': models, 'default': default_model})
        except urllib.error.HTTPError as error:
            body = error.read().decode('utf-8', errors='replace')
            self._send_json(_director_fallback_models(f'HTTP {error.code}: {body[:240]}'))
        except Exception as error:
            self._send_json(_director_fallback_models(f'{type(error).__name__}: {error}'))

    def do_POST(self):
        if self.path == '/nai-proxy/generate-image':
            length = int(self.headers.get('Content-Length', '0') or '0')
            body = self.rfile.read(length) if length else b''
            body = _normalize_novelai_body(body)
            self._proxy_novelai('POST', '/ai/generate-image', body)
            return
        if self.path == '/director-proxy/chat-completions':
            length = int(self.headers.get('Content-Length', '0') or '0')
            body = self.rfile.read(length) if length else b''
            self._proxy_director(body)
            return
        if self.path == '/tagger-proxy/interrogate':
            self._proxy_tagger()
            return
        if self.path == '/nai-tools/start-material-previews':
            token = resolve_nai_token(self.headers.get('Authorization', ''))
            if not token:
                self._send_json({'error': 'Missing Authorization header'}, 401)
                return
            body = self._read_json_body()
            try:
                preview_status = _material_preview_missing_status()
                if int(preview_status.get('missing') or 0) <= 0:
                    self._send_json({
                        'job_id': None,
                        'status': 'completed',
                        'message': 'Material previews already complete',
                        'preview_status': preview_status
                    })
                    return
            except Exception:
                pass
            args = ['previews']
            limit = body.get('limit')
            if isinstance(limit, int) and limit > 0:
                args.append(f'--limit={limit}')
            steps = body.get('steps')
            if isinstance(steps, int) and steps > 0:
                args.append(f'--steps={steps}')
            scale = body.get('scale')
            if isinstance(scale, (int, float)) and scale > 0:
                args.append(f'--scale={scale}')
            job = _start_tool_job('material-previews', token, args)
            self._send_json({'job_id': job['id'], 'status': job['status']})
            return
        if self.path == '/nai-tools/start-comic-demo':
            token = resolve_nai_token(self.headers.get('Authorization', ''))
            if not token:
                self._send_json({'error': 'Missing Authorization header'}, 401)
                return
            job = _start_tool_job('comic-demo', token, ['comic'])
            self._send_json({'job_id': job['id'], 'status': job['status']})
            return
        if self.path == '/user-assets':
            length = int(self.headers.get('Content-Length', '0') or '0')
            if length > int(USER_ASSET_MAX_BYTES * 1.4) + 8192:
                self._send_json({'error': 'Payload too large'}, 413)
                return
            body = self._read_json_body()
            path, error = save_imported_asset(body)
            if error:
                self._send_json({'error': error}, 400)
                return
            self._send_json({'ok': True, 'path': path})
            return
        self.send_error(404, 'Not Found')
        
    def do_GET(self):
        if self.path.startswith('/director-proxy/models'):
            self._proxy_director_models()
            return
        if self.path.startswith('/nai-proxy/health'):
            token = resolve_nai_token(self.headers.get('Authorization', ''))
            if token and not token.lower().startswith('bearer '):
                token = 'Bearer ' + token
            if not token:
                self._send_json({'ok': False, 'error': 'Missing NovelAI token'}, 401)
                return
            req = urllib.request.Request(
                'https://api.novelai.net/user/subscription',
                headers=_browser_headers({'Authorization': token, 'Accept': 'application/json'})
            )
            try:
                with _build_proxy_opener().open(req, timeout=30) as response:
                    data = json.loads(response.read().decode('utf-8') or '{}')
                    self._send_json({
                        'ok': True,
                        'active': data.get('active'),
                        'tier': data.get('tier'),
                        'proxy': _get_proxy_url() or '',
                        'imageGeneration': ((data.get('perks') or {}).get('imageGeneration')),
                        'unlimitedImageGeneration': ((data.get('perks') or {}).get('unlimitedImageGeneration'))
                    })
            except urllib.error.HTTPError as error:
                body = error.read().decode('utf-8', errors='replace')
                self._send_json({'ok': False, 'status': error.code, 'error': body}, error.code)
            except Exception as error:
                self._send_json({'ok': False, 'error': f'{type(error).__name__}: {error}'}, 502)
            return
        if self.path.startswith('/nai-proxy/safe-status'):
            token = resolve_nai_token(self.headers.get('Authorization', ''))
            if token and not token.lower().startswith('bearer '):
                token = 'Bearer ' + token
            if not token:
                self._send_json({'ok': False, 'error': 'Missing NovelAI token'}, 401)
                return
            req = urllib.request.Request(
                'https://api.novelai.net/user/subscription',
                headers=_browser_headers({'Authorization': token, 'Accept': 'application/json'})
            )
            try:
                with _build_proxy_opener().open(req, timeout=30) as response:
                    data = json.loads(response.read().decode('utf-8') or '{}')
                    self._send_json({
                        'ok': True,
                        'active': data.get('active'),
                        'tier': data.get('tier'),
                        'unlimitedImageGeneration': ((data.get('perks') or {}).get('unlimitedImageGeneration')),
                        'proxy': _get_proxy_url() or '',
                        'safeRequest': {
                            'n_samples': 1,
                            'max_pixels': _env_int('NAI_MAX_PIXELS', 1024 * 1024),
                            'max_edge': _env_int('NAI_MAX_EDGE', 1536),
                            'queue_concurrency': 1
                        }
                    })
            except urllib.error.HTTPError as error:
                body = error.read().decode('utf-8', errors='replace')
                self._send_json({'ok': False, 'status': error.code, 'error': body}, error.code)
            except Exception as error:
                self._send_json({'ok': False, 'error': f'{type(error).__name__}: {error}'}, 502)
            return
        if self.path.startswith('/nai-proxy/suggest-tags'):
            parsed = urllib.parse.urlsplit(self.path)
            self._proxy_novelai('GET', '/ai/generate-image/suggest-tags' + ('?' + parsed.query if parsed.query else ''))
            return
        if self.path.startswith('/nai-tools/job'):
            parsed = urllib.parse.urlsplit(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            job_id = (params.get('id') or [''])[0]
            job = TOOL_JOBS.get(job_id)
            if not job:
                self._send_json({'error': 'Job not found'}, 404)
                return
            self._send_json(job)
            return
        if self.path.startswith('/nai-tools/missing-material-previews'):
            try:
                self._send_json(_material_preview_missing_status())
            except Exception as error:
                self._send_json({'error': str(error)}, 500)
            return
        parsed = urllib.parse.urlsplit(self.path)
        if is_blocked_static_path(parsed.path):
            self.send_error(403, 'Forbidden')
            return
        self.directory = os.getcwd()
        return SimpleHTTPRequestHandler.do_GET(self)
        
    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 500
    timeout = 60

if __name__ == '__main__':
    ensure_user_data_dirs()
    PORT = 8000
    ADDRESS = (os.environ.get('NAI_BIND') or '127.0.0.1').strip() or '127.0.0.1'
    socketserver.TCPServer.allow_reuse_address = True
    
    with ThreadedTCPServer((ADDRESS, PORT), CORSRequestHandler) as httpd:
        with ThreadPoolExecutor(max_workers=500) as executor:
            print(f"Server running at http://{ADDRESS or '127.0.0.1'}:{PORT}")
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nShutting down server...")
                httpd.shutdown()
