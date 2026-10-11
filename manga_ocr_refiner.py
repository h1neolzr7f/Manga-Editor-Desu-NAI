"""Optional Japanese manga OCR *recognition*, on a human-selected local crop.

Upstream engine: kha-white/manga-ocr. We call its documented MangaOcr(PIL.Image)
interface without copying model source/weights. No full-page bbox detection here.
Model (~400 MB) may be downloaded by manga-ocr on the first EXPLICIT user click;
ordinary Tesseract OCR does not import or initialize this package.
"""
import importlib
import io
import threading

from manga_smart_ocr import read_image, SmartOcrError
from manga_model_guard import exclusive, require_download_consent

_model = None
_model_lock = threading.RLock()


def get_model(allow_download=False):
    global _model
    with _model_lock:
        if _model is None:
            try:
                engine = importlib.import_module("manga_ocr")
            except (ImportError, OSError) as exc:
                raise SmartOcrError(
                    "未安装 Manga OCR。请在本地 Python 环境执行 pip install manga-ocr；"
                    "首次使用还需下载约 400MB 的模型。", 503
                ) from exc
            # Installed but weights not cached: ask the user before MangaOcr() downloads.
            require_download_consent("manga-ocr", False, allow_download)
            try:
                # Do not let web input supply a model or arbitrary download URL.
                _model = engine.MangaOcr()
            except Exception as exc:
                raise SmartOcrError(
                    "Manga OCR 模型初始化失败，请检查本机模型缓存、网络与依赖版本。"
                    "首用下载约 400MB，之后可从缓存离线运行。", 503
                ) from exc
        return _model


def decode_image(raw, width, height):
    if width * height > 4_000_000:
        raise SmartOcrError("Manga OCR 选区不得超过 400 万像素，请缩小框选区域。", 413)
    try:
        image_module = importlib.import_module("PIL.Image")
    except (ImportError, OSError) as exc:
        raise SmartOcrError("未安装 Pillow，请在本机运行 pip install Pillow。", 503) from exc
    try:
        image = image_module.open(io.BytesIO(raw))
        if image.format != "PNG" or image.size != (width, height):
            raise SmartOcrError("图片格式或尺寸校验失败。")
        image.load()
        return image.convert("RGB")
    except (OSError, ValueError) as exc:
        if isinstance(exc, SmartOcrError):
            raise
        raise SmartOcrError("选区图片无法解码。") from exc


def refine_region(image_url, allow_download=False):
    data, width, height = read_image(image_url)
    if width * height > 4_000_000 or width < 2 or height < 2:
        raise SmartOcrError("Manga OCR 选区无效或超过 400 万像素上限。", 413)
    image = decode_image(data, width, height)
    with exclusive("manga-ocr"):
        model = get_model(allow_download)
        try:
            # The model's underlying transformer is not guaranteed thread-safe.
            with _model_lock:
                text = model(image)
        except Exception as exc:
            raise SmartOcrError("Manga OCR 推理失败；请检查本机可用内存与模型安装。", 502) from exc
    if not isinstance(text, str) or not text.strip() or len(text) > 500:
        raise SmartOcrError("Manga OCR 未返回有效短文本，请重新框选或手动修改。", 422)
    return {
        "ok": True, "engine": "manga-ocr-local",
        "width": width, "height": height,
        "text": text.strip(), "verified": False,
        "warning": "Manga OCR 只识别用户给定选区，不检测气泡边界；可能产生幻觉，请人工校对。"
    }


def _reset_for_tests():
    global _model
    with _model_lock:
        _model = None
