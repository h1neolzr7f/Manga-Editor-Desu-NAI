"""Shared guards for the optional heavy local models (LaMa, Manga OCR).

* Download consent: weights are never fetched implicitly. If the model is not loaded
  and its weights are not in the local cache, the request must carry
  ``allow_download: true`` (the UI asks the user first); otherwise HTTP 428.
* One inference per model at a time: a second request gets HTTP 429 immediately
  instead of piling up threads and memory behind a lock.

Cache detection only looks at well-known cache paths; it never imports torch.
"""
import os
import threading
from contextlib import contextmanager

from manga_smart_ocr import SmartOcrError


def _expand(path):
    return os.path.abspath(os.path.expanduser(path))


def _xdg_cache():
    return os.environ.get("XDG_CACHE_HOME") or os.path.join("~", ".cache")


def lama_weights_path():
    explicit = (os.environ.get("LAMA_MODEL") or "").strip()
    if explicit:
        return _expand(explicit)
    torch_home = os.environ.get("TORCH_HOME") or os.path.join(_xdg_cache(), "torch")
    return _expand(os.path.join(torch_home, "hub", "checkpoints", "big-lama.pt"))


def manga_ocr_cache_dir():
    hub = (os.environ.get("HF_HUB_CACHE") or os.environ.get("HUGGINGFACE_HUB_CACHE") or
           os.path.join(os.environ.get("HF_HOME") or os.path.join(_xdg_cache(), "huggingface"), "hub"))
    return _expand(os.path.join(hub, "models--kha-white--manga-ocr-base"))


def lama_cached():
    path = lama_weights_path()
    return os.path.isfile(path) and os.path.getsize(path) > 1024 * 1024


def manga_ocr_cached():
    snapshots = os.path.join(manga_ocr_cache_dir(), "snapshots")
    if not os.path.isdir(snapshots):
        return False
    for root, _dirs, files in os.walk(snapshots):
        if any(name.endswith((".bin", ".safetensors")) for name in files):
            return True
    return False


MODELS = {
    "lama": {"label": "LaMa", "size": "约 200MB", "cached": lama_cached},
    "manga-ocr": {"label": "Manga OCR", "size": "约 450–900MB", "cached": manga_ocr_cached},
}
_busy = {name: threading.Semaphore(1) for name in MODELS}


class DownloadConsentRequired(SmartOcrError):
    def __init__(self, kind):
        spec = MODELS[kind]
        super().__init__(
            "%s 模型尚未下载（%s）。首次使用需要联网下载，请确认后再继续。" % (spec["label"], spec["size"]), 428)
        self.extra = {"needs_download": True, "model": kind, "size": spec["size"]}


def require_download_consent(kind, loaded, allow_download):
    """Raise 428 unless the model is loaded, cached, or the user agreed to download."""
    if loaded or allow_download is True:
        return
    if not MODELS[kind]["cached"]():
        raise DownloadConsentRequired(kind)


@contextmanager
def exclusive(kind):
    sem = _busy[kind]
    if not sem.acquire(blocking=False):
        raise SmartOcrError("%s 正在处理上一个请求，请等待完成或取消后再试。" % MODELS[kind]["label"], 429)
    try:
        yield
    finally:
        sem.release()
