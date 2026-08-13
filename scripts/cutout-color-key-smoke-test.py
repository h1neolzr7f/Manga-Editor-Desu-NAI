"""Smoke test color-key cutout without rembg."""
from __future__ import annotations

import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "local_tools"))

from PIL import Image  # noqa: E402

from cutout import color_key_remove, normalize_options  # noqa: E402


def png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def main() -> None:
    image = Image.new("RGBA", (32, 32), (255, 255, 255, 255))
    for x in range(8, 24):
        for y in range(8, 24):
            image.putpixel((x, y), (20, 40, 200, 255))
    options = normalize_options({"engine": "color-key", "key_color": "#ffffff", "key_tolerance": 8, "crop": True})
    result = color_key_remove(png_bytes(image), options)
    out = Image.open(io.BytesIO(result)).convert("RGBA")
    assert out.getbbox() is not None
    assert out.getpixel((0, 0))[3] == 0 or out.size < (32, 32)
    print("cutout color-key smoke test passed")


if __name__ == "__main__":
    main()
