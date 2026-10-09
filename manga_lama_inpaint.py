"""Opt-in local LaMa inpainting with a user-visible mask and preview.

Upstream: okaris/simple-lama documented SimpleLama(PIL image, PIL L mask).
No external API credentials or editable filesystem path from the HTTP caller.
Heavy optional model only initialized on the first explicit preview request.
"""
import base64
import importlib
import io
import threading

from manga_smart_ocr import read_image, SmartOcrError

MAX_CROP_PIXELS=3_000_000
MAX_MASK_PERCENT=.66
_model=None
_lock=threading.RLock()


def get_model():
    global _model
    with _lock:
        if _model is None:
            try:
                upstream=importlib.import_module("simple_lama")
            except (ImportError,OSError) as exc:
                raise SmartOcrError(
                    "未安装本地 LaMa。请在启动程序的 Python 环境中运行 "
                    "pip install simple-lama；首次使用可能需要下载模型。",503
                ) from exc
            try:
                _model=upstream.SimpleLama()
            except Exception as exc:
                raise SmartOcrError("LaMa 模型初始化失败；请检查依赖、模型缓存和可用内存。",503) from exc
        return _model


def decode_pair(image_bytes, mask_bytes, width, height):
    try:
        im=importlib.import_module("PIL.Image")
    except (ImportError,OSError) as exc:
        raise SmartOcrError("本地 LaMa 需要 Pillow，请先安装 Pillow。",503) from exc
    try:
        source=im.open(io.BytesIO(image_bytes))
        mask=im.open(io.BytesIO(mask_bytes))
        if source.format!="PNG" or mask.format!="PNG" or source.size!=(width,height) or mask.size!=(width,height):
            raise SmartOcrError("LaMa 原图和蒙版必须是相同尺寸的 PNG。")
        source.load()
        mask.load()
        source=source.convert("RGB")
        mask=mask.convert("L")
    except (OSError,ValueError) as exc:
        if isinstance(exc,SmartOcrError):raise
        raise SmartOcrError("LaMa 原图或蒙版无法解码。") from exc
    return source,mask


def compose_masked(source, generated, mask):
    im=importlib.import_module("PIL.Image")
    if generated.size!=source.size:raise SmartOcrError("LaMa 修复图尺寸不一致，已拒绝。",502)
    # Even if the model alters every pixel, restore everything outside mask.
    return im.composite(generated.convert("RGB"),source,mask)


def inpaint(image_url,mask_url):
    raw,w,h=read_image(image_url)
    mask_raw,mw,mh=read_image(mask_url)
    if w!=mw or h!=mh or w*h>MAX_CROP_PIXELS:
        raise SmartOcrError("LaMa 原图和蒙版尺寸必须一致且不超过 300 万像素。",413)
    source,mask=decode_pair(raw,mask_raw,w,h)
    covered=sum(v>=128 for v in mask.getdata())
    if covered<4 or covered/(w*h)>MAX_MASK_PERCENT:
        raise SmartOcrError("去字蒙版为空或超过区域的 66%，请缩小蒙版。")
    model=get_model()
    try:
        with _lock:
            generated=model(source,mask)
        composite=compose_masked(source,generated,mask)
        out=io.BytesIO()
        composite.save(out,format="PNG")
    except SmartOcrError:raise
    except Exception as exc:
        raise SmartOcrError("LaMa 修复失败；请检查模型配置、内存或缩小选区。",502) from exc
    if out.tell()>12*1024*1024:raise SmartOcrError("修复图超过 12MB 限制。",413)
    return {
        "ok":True,"engine":"simple-lama-local",
        "width":w,"height":h,
        "image":"data:image/png;base64,"+base64.b64encode(out.getvalue()).decode("ascii"),
        "applied":False,"verified":False,
        "warning":"本地 LaMa 预览未修改原画。请人工检查是否误删衣服、边线或拟声词，然后决定是否添加图层。"
    }


def _reset_for_tests():
    global _model
    with _lock:_model=None
