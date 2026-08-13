# Local background-removal Sidecar API

Default address: `http://127.0.0.1:8765`. The editor can still run without
this optional process, including its non-AI editing features and `file://`
workflow. `一键启动.bat` now also starts this Sidecar.

The Sidecar does not ship model weights. Install the optional dependencies from
`local_tools/requirements.txt` in a separate Python environment for rembg.
Color-key cutout works with Pillow only. Models are loaded lazily on first use
and stay outside Git.

## Common rules

- Bind to `127.0.0.1` by default.
- Accept only PNG, JPEG, WebP, and GIF uploads up to 20 MiB.
- Validate MIME type, size, and non-empty content on every request.
- Use random temporary file names and delete them after processing.
- Return transparent PNG data URLs only for successful processing.
- Never return the original image as a fake success result.
- Return explicit JSON errors with `code`; the frontend must show them.

## Engines

- `rembg`: neural cutout inspired by [rembg](https://github.com/danielgatis/rembg)
  (`isnet-anime`, `u2net`, `birefnet-*`, etc.)
- `color-key`: Pillow color-to-alpha fallback for white/green backgrounds

## Customizable options

`POST /remove-background` accepts multipart fields or an `options` JSON object:

- `engine`: `rembg` or `color-key`
- `model` / `mode`: rembg model id
- `alpha_matting`, `fg_threshold`, `bg_threshold`, `erode_size`
- `post_process_mask`, `only_mask`, `crop`, `feather`
- `key_color`, `key_tolerance`, `invert`

## Endpoints

### `GET /health`

Returns the service state and whether rembg is installed. Color-key remains
available when rembg is missing.

### `GET /models`

Returns rembg models plus the `color-key` engine.

### `GET /engines`

Returns engine availability and default options.

### `POST /remove-background`

`multipart/form-data` fields:

- `file`: image to process
- `mode` / `model` / `engine` / option fields above

Successful response:

```json
{
  "ok": true,
  "model": "isnet-anime",
  "engine": "rembg",
  "mime": "image/png",
  "image": "data:image/png;base64,..."
}
```

If rembg is not installed and the engine is `rembg`, the service returns HTTP
`503` with `PROCESSOR_NOT_INSTALLED`. Switch to `color-key` instead of silently
returning the input.

### `POST /batch-remove-background`

Accepts multiple `files` fields and returns one independent result per file.

### `POST /segment` and `POST /refine-mask`

Reserved for a later SAM/mask-refinement extension. Until those processors are
installed, they return explicit HTTP `501 PROCESSOR_NOT_IMPLEMENTED`.
