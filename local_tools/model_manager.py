"""Lazy rembg model loading for the optional local Sidecar.

No model weights are stored in this repository. The first request for a model
creates one rembg session and keeps it in memory for later requests.
"""

from __future__ import annotations

import importlib.util
from threading import Lock
from typing import Any

from cutout import color_key_remove, image_to_png_bytes, normalize_options, postprocess_rgba, rembg_kwargs


MODEL_SPECS = {
    "isnet-anime": {
        "id": "isnet-anime",
        "label": "动漫角色 (ISNet Anime)",
        "kind": "anime",
        "engine": "rembg",
        "source": "rembg model registry",
        "license": "model-specific; verify before redistribution",
    },
    "isnet-general-use": {
        "id": "isnet-general-use",
        "label": "通用主体 (ISNet)",
        "kind": "general",
        "engine": "rembg",
        "source": "rembg model registry",
        "license": "model-specific; verify before redistribution",
    },
    "u2net": {
        "id": "u2net",
        "label": "通用 (U2Net)",
        "kind": "general",
        "engine": "rembg",
        "source": "rembg model registry",
        "license": "model-specific; verify before redistribution",
    },
    "u2netp": {
        "id": "u2netp",
        "label": "轻量通用 (U2NetP)",
        "kind": "general",
        "engine": "rembg",
        "source": "rembg model registry",
        "license": "model-specific; verify before redistribution",
    },
    "u2net_human_seg": {
        "id": "u2net_human_seg",
        "label": "人物分割 (U2Net Human)",
        "kind": "portrait",
        "engine": "rembg",
        "source": "rembg model registry",
        "license": "model-specific; verify before redistribution",
    },
    "silueta": {
        "id": "silueta",
        "label": "剪影 (Silueta)",
        "kind": "general",
        "engine": "rembg",
        "source": "rembg model registry",
        "license": "model-specific; verify before redistribution",
    },
    "birefnet-general": {
        "id": "birefnet-general",
        "label": "高精度通用 (BiRefNet)",
        "kind": "general",
        "engine": "rembg",
        "source": "rembg model registry",
        "license": "model-specific; verify before redistribution",
    },
    "birefnet-general-lite": {
        "id": "birefnet-general-lite",
        "label": "轻量高精度 (BiRefNet Lite)",
        "kind": "general",
        "engine": "rembg",
        "source": "rembg model registry",
        "license": "model-specific; verify before redistribution",
    },
    "birefnet-portrait": {
        "id": "birefnet-portrait",
        "label": "人像 (BiRefNet Portrait)",
        "kind": "portrait",
        "engine": "rembg",
        "source": "rembg model registry",
        "license": "model-specific; verify before redistribution",
    },
    "color-key": {
        "id": "color-key",
        "label": "颜色抠图（无需模型）",
        "kind": "chroma",
        "engine": "color-key",
        "source": "Pillow color-key",
        "license": "project-original",
    },
}


class ModelManager:
    """Load rembg sessions only when a request actually needs one."""

    def __init__(self) -> None:
        self._sessions: dict[str, Any] = {}
        self._lock = Lock()

    @staticmethod
    def processor_installed() -> bool:
        return importlib.util.find_spec("rembg") is not None

    def list_models(self) -> list[dict[str, Any]]:
        installed = self.processor_installed()
        models = []
        for model_id, spec in MODEL_SPECS.items():
            ready = spec["engine"] == "color-key" or installed
            models.append(
                {
                    **spec,
                    "processorInstalled": ready,
                    "loaded": model_id in self._sessions,
                }
            )
        return models

    def list_engines(self) -> dict[str, Any]:
        return {
            "engines": [
                {
                    "id": "rembg",
                    "label": "rembg 神经网络抠图",
                    "available": self.processor_installed(),
                },
                {
                    "id": "color-key",
                    "label": "颜色抠图",
                    "available": True,
                },
            ],
            "defaults": {
                "engine": "rembg" if self.processor_installed() else "color-key",
                "model": "isnet-anime" if self.processor_installed() else "color-key",
            },
        }

    def resolve(self, requested: str | None) -> str:
        value = (requested or "isnet-anime").strip().lower()
        aliases = {
            "anime": "isnet-anime",
            "isnet": "isnet-anime",
            "general": "birefnet-general",
            "birefnet": "birefnet-general",
            "human": "u2net_human_seg",
            "portrait": "birefnet-portrait",
            "chroma": "color-key",
            "colorkey": "color-key",
            "color_key": "color-key",
        }
        value = aliases.get(value, value)
        if value not in MODEL_SPECS:
            raise ValueError(f"Unsupported model: {value}")
        return value

    def get_session(self, requested: str | None) -> tuple[str, Any]:
        model_id = self.resolve(requested)
        spec = MODEL_SPECS[model_id]
        if spec["engine"] != "rembg":
            return model_id, None
        if not self.processor_installed():
            raise RuntimeError(
                "rembg is not installed. Install local_tools/requirements.txt "
                "in the optional Sidecar environment, or switch to color-key."
            )
        with self._lock:
            if model_id not in self._sessions:
                from rembg import new_session

                self._sessions[model_id] = new_session(model_name=model_id)
            return model_id, self._sessions[model_id]

    def remove_background(self, data: bytes, requested: str | None, options: dict[str, Any] | None = None) -> tuple[str, bytes]:
        normalized = normalize_options(options)
        requested_model = requested or normalized.get("model")
        if normalized["engine"] == "color-key" or self.resolve(requested_model) == "color-key":
            return "color-key", color_key_remove(data, normalized)

        model_id, session = self.get_session(requested_model)
        from rembg import remove
        from PIL import Image

        from cutout import bytes_to_image

        kwargs = rembg_kwargs(normalized)
        try:
            result = remove(data, session=session, force_return_bytes=True, **kwargs)
        except TypeError:
            result = remove(data, session=session, **kwargs)
        if isinstance(result, Image.Image):
            image = result.convert("RGBA")
        elif isinstance(result, (bytes, bytearray)):
            image = bytes_to_image(bytes(result))
        else:
            raise RuntimeError("rembg returned an unsupported result type")
        image = postprocess_rgba(image, normalized)
        png = image_to_png_bytes(image)
        if png == data:
            raise RuntimeError("rembg returned an unchanged image")
        return model_id, png
