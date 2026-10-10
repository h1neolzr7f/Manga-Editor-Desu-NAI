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
    "ctd": {"label": "漫画文字检测（comic-text-detector）", "size": "约 91MB", "cached": lambda: __import__("manga_text_detector").cached()},
    "sam2": {"label": "智能点选（SAM 2.1 tiny）", "size": "约 149MB", "cached": lambda: __import__("manga_sam_select").cached()},
    "charid": {"label": "人物脸部识别 + 角色比对（anime face + CCIP）", "size": "约 186MB", "cached": lambda: __import__("manga_character_detect").extra_cached()},
    "animeseg": {"label": "人物分割（isnet-anime）", "size": "约 168MB", "cached": lambda: __import__("manga_character_detect").cached()},
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
def exclusive(kind, wait=0):
    """wait > 0: queue up to that many seconds (short jobs such as text detection) instead of 429 at once."""
    sem = _busy[kind]
    if not (sem.acquire(timeout=wait) if wait else sem.acquire(blocking=False)):
        raise SmartOcrError("%s 正在处理上一个请求，请等待完成或取消后再试。" % MODELS[kind]["label"], 429)
    try:
        yield
    finally:
        sem.release()


# ---- idle release: big local models are dropped after MANGA_MODEL_IDLE_SEC without use (default 10 min) ----
# A beginner's laptop should not keep ~3 GB of segmentation/SAM/CCIP/LaMa weights after one 换角色; they reload
# on the next use (from disk, a few seconds). Only released while the model's lock is free (never mid-request).
import gc as _gc
import time as _time

_IDLE_GROUPS = {
    # lock -> [(module, attributes set to None / cleared)]
    "sam2": [("manga_sam_select", ("_predictor", "_embeds")), ("manga_character_detect", ("_seg", "_extra"))],
    "ctd": [("manga_text_detector", ("_session",))],
    "lama": [("manga_lama_inpaint", ("_model",))],
    "manga-ocr": [("manga_ocr_refiner", ("_model",))],
}
_last_use = {}
_idle_thread = None


def idle_seconds(environ=None):
    raw = (environ if environ is not None else os.environ).get("MANGA_MODEL_IDLE_SEC", "")
    try:
        return max(30, int(float(raw))) if str(raw).strip() else 600
    except ValueError:
        return 600


def touch(kind):
    """Mark a model group as used now and make sure the idle watcher runs."""
    global _idle_thread
    _last_use[kind] = _time.time()
    if _idle_thread is None:
        _idle_thread = threading.Thread(target=_idle_loop, name="model-idle-release", daemon=True)
        _idle_thread.start()


def _loaded(kind):
    import sys
    for mod, attrs in _IDLE_GROUPS.get(kind, ()):
        m = sys.modules.get(mod)
        if m is None:
            continue
        for a in attrs:
            v = getattr(m, a, None)
            if v is not None and v != {} and v != []:
                return True
    return False


def release_idle(now=None, limit=None):
    """Drop every group idle longer than `limit` seconds whose lock is free. Returns the released kinds."""
    import sys
    now = _time.time() if now is None else now
    limit = idle_seconds() if limit is None else limit
    released = []
    for kind, last in list(_last_use.items()):
        if now - last < limit or not _loaded(kind):
            continue
        sem = _busy.get(kind)
        if sem is not None and not sem.acquire(blocking=False):
            continue
        try:
            for mod, attrs in _IDLE_GROUPS.get(kind, ()):
                m = sys.modules.get(mod)
                if m is None:
                    continue
                for a in attrs:
                    v = getattr(m, a, None)
                    if isinstance(v, dict):
                        v.clear()
                    elif v is not None:
                        setattr(m, a, None)
            released.append(kind)
        finally:
            if sem is not None:
                sem.release()
    if released:
        _gc.collect()
        try:  # hand freed heap back to the OS (glibc); harmless elsewhere
            import ctypes
            ctypes.CDLL("libc.so.6").malloc_trim(0)
        except Exception:
            pass
    return released


def _idle_loop():
    while True:
        _time.sleep(30)
        try:
            release_idle()
        except Exception:
            pass
