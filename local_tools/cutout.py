"""Cutout processors for the local Sidecar.

Inspired by:
- rembg (MIT): neural background removal sessions and alpha-matting flags
- GIMP Color to Alpha / ImageMagick: color-key fallback without models

The original image is never returned as a fake success result.
"""

from __future__ import annotations

import io
from typing import Any

from PIL import Image, ImageChops, ImageFilter, ImageOps


DEFAULT_OPTIONS = {
    "engine": "rembg",
    "model": "isnet-anime",
    "alpha_matting": False,
    "fg_threshold": 240,
    "bg_threshold": 10,
    "erode_size": 10,
    "post_process_mask": False,
    "only_mask": False,
    "crop": False,
    "feather": 0,
    "key_color": "#ffffff",
    "key_tolerance": 28,
    "invert": False,
}


def _clamp_int(value: Any, minimum: int, maximum: int, fallback: int) -> int:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(maximum, number))


def _as_bool(value: Any, fallback: bool = False) -> bool:
    if value is None:
        return fallback
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "on"}:
        return True
    if text in {"0", "false", "no", "off", ""}:
        return False
    return fallback


def _parse_hex_color(value: Any) -> tuple[int, int, int]:
    text = str(value or "#ffffff").strip().lstrip("#")
    if len(text) == 3:
        text = "".join(ch * 2 for ch in text)
    if len(text) != 6:
        return (255, 255, 255)
    try:
        return (int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16))
    except ValueError:
        return (255, 255, 255)


def normalize_options(raw: dict[str, Any] | None) -> dict[str, Any]:
    source = dict(DEFAULT_OPTIONS)
    if raw:
        source.update(raw)
    engine = str(source.get("engine") or "rembg").strip().lower()
    if engine in {"color", "chroma", "colorkey", "color_key"}:
        engine = "color-key"
    if engine not in {"rembg", "color-key"}:
        engine = "rembg"
    model = str(source.get("model") or source.get("mode") or "isnet-anime").strip().lower()
    return {
        "engine": engine,
        "model": model,
        "alpha_matting": _as_bool(source.get("alpha_matting"), False),
        "fg_threshold": _clamp_int(source.get("fg_threshold"), 0, 255, 240),
        "bg_threshold": _clamp_int(source.get("bg_threshold"), 0, 255, 10),
        "erode_size": _clamp_int(source.get("erode_size"), 0, 40, 10),
        "post_process_mask": _as_bool(source.get("post_process_mask"), False),
        "only_mask": _as_bool(source.get("only_mask"), False),
        "crop": _as_bool(source.get("crop"), False),
        "feather": _clamp_int(source.get("feather"), 0, 32, 0),
        "key_color": "#%02x%02x%02x" % _parse_hex_color(source.get("key_color")),
        "key_tolerance": _clamp_int(source.get("key_tolerance"), 0, 255, 28),
        "invert": _as_bool(source.get("invert"), False),
    }


def image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def bytes_to_image(data: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(data))
    image.load()
    return image.convert("RGBA")


def apply_alpha_feather(image: Image.Image, radius: int) -> Image.Image:
    if radius <= 0:
        return image
    alpha = image.getchannel("A").filter(ImageFilter.GaussianBlur(radius=radius))
    out = image.copy()
    out.putalpha(alpha)
    return out


def crop_to_content(image: Image.Image, pad: int = 2) -> Image.Image:
    bbox = image.getbbox()
    if not bbox:
        raise RuntimeError("Cutout result is fully transparent")
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(image.width, right + pad)
    bottom = min(image.height, bottom + pad)
    return image.crop((left, top, right, bottom))


def postprocess_rgba(image: Image.Image, options: dict[str, Any]) -> Image.Image:
    result = image.convert("RGBA")
    if options.get("feather"):
        result = apply_alpha_feather(result, int(options["feather"]))
    if options.get("crop"):
        result = crop_to_content(result)
    return result


def color_key_remove(data: bytes, options: dict[str, Any]) -> bytes:
    image = bytes_to_image(data)
    rgb = image.convert("RGB")
    key = _parse_hex_color(options.get("key_color"))
    background = Image.new("RGB", rgb.size, key)
    difference = ImageChops.difference(rgb, background)
    red, green, blue = difference.split()
    max_diff = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    tolerance = int(options.get("key_tolerance") or 0)
    alpha = max_diff.point(lambda pixel: 0 if pixel <= tolerance else 255)
    if options.get("invert"):
        alpha = ImageOps.invert(alpha)
    image.putalpha(alpha)
    result = postprocess_rgba(image, options)
    if options.get("only_mask"):
        result = result.getchannel("A").convert("RGBA")
    png = image_to_png_bytes(result)
    if png == data:
        raise RuntimeError("Color-key cutout produced an unchanged image")
    return png


def rembg_kwargs(options: dict[str, Any]) -> dict[str, Any]:
    return {
        "alpha_matting": bool(options.get("alpha_matting")),
        "alpha_matting_foreground_threshold": int(options.get("fg_threshold") or 240),
        "alpha_matting_background_threshold": int(options.get("bg_threshold") or 10),
        "alpha_matting_erode_size": int(options.get("erode_size") or 10),
        "post_process_mask": bool(options.get("post_process_mask")),
        "only_mask": bool(options.get("only_mask")),
    }
