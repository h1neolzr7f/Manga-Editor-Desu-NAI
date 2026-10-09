"""Opt-in local real Images API smoke check; one paid request, never retried.

Keep credentials in environment variables or an ignored file outside the repo.
Protocol tests do not execute this script with --allow-paid-api.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import gpt_images


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow-paid-api', action='store_true', help='explicitly authorize one paid image request')
    parser.add_argument('--credentials-file', type=Path, help='external JSON with apiKey and baseUrl')
    parser.add_argument('--base-url', default=gpt_images.OFFICIAL_BASE)
    parser.add_argument('--model', default='gpt-image-1.5')
    parser.add_argument('--prompt', required=True)
    parser.add_argument('--image', type=Path, action='append', default=[], help='PNG target first, then PNG references; enables edit')
    parser.add_argument('--mask', type=Path, help='PNG alpha-zero edit mask matching first target')
    parser.add_argument('--background', default='transparent', choices=['auto', 'opaque', 'transparent'])
    parser.add_argument('--quality', default='low', choices=['auto', 'low', 'medium', 'high'])
    parser.add_argument('--size', default='1024x1024', choices=['auto', '1024x1024', '1536x1024', '1024x1536'])
    parser.add_argument('--output', type=Path, required=True, help='new output image path; existing files are never overwritten')
    args = parser.parse_args()
    if not args.allow_paid_api:
        parser.error('Real requests require --allow-paid-api')
    if args.output.exists() or not args.output.parent.is_dir():
        parser.error('Output must be a new file in an existing directory')
    credentials = {}
    if args.credentials_file:
        try:
            credentials = json.loads(args.credentials_file.read_text('utf-8'))
            if not isinstance(credentials, dict):
                raise ValueError()
        except (OSError, ValueError):
            parser.error('Could not read the external credentials JSON file')
    base_url = credentials.get('baseUrl') or args.base_url
    if not isinstance(base_url, str):
        parser.error('Invalid credentials baseUrl')
    base_url = base_url.rstrip('/')
    if base_url == gpt_images.OFFICIAL_BASE.rsplit('/v1', 1)[0] or not base_url.endswith('/v1'):
        base_url += '/v1'
    key = credentials.get('apiKey') or os.environ.get('GPT_IMAGES_API_KEY', '')
    def image_url(path):
        try:
            if path.stat().st_size > gpt_images.MAX_IMAGE_BYTES:
                parser.error('Input image exceeds the 8 MiB limit')
            return 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode()
        except OSError:
            parser.error('Could not read an input image')
    payload = dict(apiKey=key, baseUrl=base_url, model=args.model, operation='edit' if args.image else 'generate',
                   prompt=args.prompt, size=args.size, quality=args.quality, background=args.background,
                   images=[image_url(path) for path in args.image])
    if args.mask:
        payload['mask'] = image_url(args.mask)
    print('Submitting one real Images API request; automatic retries are disabled.', flush=True)
    try:
        result = gpt_images.perform_request(payload)
        value = result['images'][0]['dataUrl']
        raw = base64.b64decode(value.split(',', 1)[1], validate=True)
        # Exclusive creation avoids replacing an unrelated file created during the request.
        with args.output.open('xb') as handle:
            handle.write(raw)
        dimensions = list(gpt_images._png_info(raw)) if raw.startswith(gpt_images.PNG_SIGNATURE) else None
        print(json.dumps({'status': 'real-api-success', 'provider': result['provider'], 'model': result['model'],
                          'operation': result['operation'], 'dimensions': dimensions, 'bytes': len(raw),
                          'output': str(args.output.resolve())}))
        return 0
    except gpt_images.ImagesError as error:
        print(json.dumps({'status': 'real-api-failed', 'httpStatus': error.status, 'code': error.code, 'error': str(error)}), file=sys.stderr)
        return 1
    except OSError:
        print('Real request finished, but output could not be saved.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
