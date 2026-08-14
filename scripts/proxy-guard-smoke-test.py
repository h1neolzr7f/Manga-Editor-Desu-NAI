import importlib.util
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('nai_local_proxy', root / '99_server.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

assert mod.is_blocked_static_path('/.env')
assert mod.is_blocked_static_path('/foo/.git/config')
assert mod.is_blocked_static_path('/secrets.pem')
assert not mod.is_blocked_static_path('/index.html')
assert not mod.is_blocked_static_path('/assets/original/starter/speed-lines.svg')
assert callable(mod.ensure_user_data_dirs)
assert callable(mod.save_imported_asset)
assert callable(mod.safe_imported_asset_name)
assert 'user_data/asset_packs/imported/' in mod.imported_asset_relative_path('abc', 'demo.png')
assert mod.safe_imported_asset_name('../evil.png') == 'evil.png'
ok, err = mod.save_imported_asset({'id': 'smoke', 'name': 'tiny.png', 'data': 'aGVsbG8='})
assert err is None and ok.endswith('tiny.png')
assert Path(ok).as_posix().startswith('user_data/asset_packs/imported/')
written = root / ok
assert written.is_file()
written.unlink()

assert mod.resolve_nai_token('Bearer abc', {'NOVELAI_API_KEY': 'env'}) == 'Bearer abc'
assert mod.resolve_nai_token('', {'NOVELAI_API_KEY': 'env'}) == 'env'
assert mod.cors_allow_origin('http://127.0.0.1:8000') == 'http://127.0.0.1:8000'
assert mod.cors_allow_origin('https://evil.example') == ''
assert mod.cors_allow_origin('null') == 'null'
print('proxy guard smoke test passed')
