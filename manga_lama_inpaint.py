"""Opt-in local LaMa inpainting with a user-visible mask and preview.

Upstream: enesmsahin/simple-lama-inpainting (PyPI ``simple-lama-inpainting``, module
``simple_lama_inpainting``), documented SimpleLama()(PIL image, PIL L mask). The weights
(big-lama.pt, ~200MB) are only downloaded after explicit user consent (HTTP 428 otherwise).
No external API credentials or editable filesystem path from the HTTP caller.
Heavy optional model only initialized on the first explicit preview request.
"""
import base64
import importlib
import io
import threading

from manga_smart_ocr import read_image, SmartOcrError
from manga_model_guard import exclusive, require_download_consent

# The PyPI package is simple-lama-inpainting; "simple_lama" kept for older local installs.
LAMA_MODULES=("simple_lama_inpainting","simple_lama")

MAX_CROP_PIXELS=3_000_000
MAX_MASK_PERCENT=.66
_model=None
_lock=threading.RLock()


def _import_upstream():
    last=None
    for name in LAMA_MODULES:
        try:
            return importlib.import_module(name)
        except (ImportError,OSError) as exc:
            last=exc
    raise SmartOcrError(
        "未安装本地 LaMa。请在启动程序的 Python 环境中运行 "
        "pip install simple-lama-inpainting；首次使用需确认后下载约 200MB 模型。",503
    ) from last


def get_model(allow_download=False):
    global _model
    with _lock:
        if _model is None:
            upstream=_import_upstream()
            # Installed but weights not cached: ask the user before SimpleLama() downloads.
            require_download_consent("lama",False,allow_download)
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
    gw,gh=generated.size
    sw,sh=source.size
    # simple-lama-inpainting pads bottom/right to a multiple of 8 and returns the padded
    # result; crop that padding back off. Any other size mismatch is still rejected.
    if (gw,gh)!=(sw,sh) and sw<=gw<sw+8 and sh<=gh<sh+8:
        generated=generated.crop((0,0,sw,sh))
    if generated.size!=source.size:raise SmartOcrError("LaMa 修复图尺寸不一致，已拒绝。",502)
    generated=match_tone(source,generated.convert("RGB"),mask)
    # Even if the model alters every pixel, restore everything outside mask.
    return im.composite(generated,source,mask)


MAX_TONE_SHIFT=24
SNAP_TOLERANCE=6


def match_tone(source,generated,mask):
    """Remove the model's global tone drift (real LaMa: 253/254 on pure white bubbles,
    a faint visible box). Measured on a ring just OUTSIDE the mask, where the model
    should reproduce the source; ignored when the shift exceeds MAX_TONE_SHIFT."""
    filt=importlib.import_module("PIL.ImageFilter")
    chops=importlib.import_module("PIL.ImageChops")
    stat=importlib.import_module("PIL.ImageStat")
    hard=mask.point(lambda v:255 if v>=128 else 0)
    ring=chops.subtract(hard.filter(filt.MaxFilter(9)),hard)
    if not ring.getbbox():return generated
    ring_stat=stat.Stat(source,ring)
    src=ring_stat.mean
    gen=stat.Stat(generated,ring).mean
    shift=[round(a-b) for a,b in zip(src,gen)]
    if max(abs(v) for v in shift)>MAX_TONE_SHIFT:return generated
    # Flat paper (uniform ring, e.g. a white bubble): snap near-paper pixels to the exact
    # paper colour so no faint box remains; lines/content further away are untouched.
    flat=max(ring_stat.stddev)<=1.5
    paper=[round(v) for v in src]
    def lut(d,c):
        table=[]
        for v in range(256):
            v=max(0,min(255,v+d))
            table.append(c if flat and abs(v-c)<=SNAP_TOLERANCE else v)
        return table
    if not any(shift) and not flat:return generated
    bands=[band.point(lut(d,c)) for band,d,c in zip(generated.split(),shift,paper)]
    return importlib.import_module("PIL.Image").merge("RGB",bands)


def inpaint(image_url,mask_url,allow_download=False):
    raw,w,h=read_image(image_url)
    mask_raw,mw,mh=read_image(mask_url)
    if w!=mw or h!=mh or w*h>MAX_CROP_PIXELS:
        raise SmartOcrError("LaMa 原图和蒙版尺寸必须一致且不超过 300 万像素。",413)
    source,mask=decode_pair(raw,mask_raw,w,h)
    covered=sum(v>=128 for v in mask.getdata())
    if covered<4 or covered/(w*h)>MAX_MASK_PERCENT:
        raise SmartOcrError("去字蒙版为空或超过区域的 66%，请缩小蒙版。")
    with exclusive("lama"):
        model=get_model(allow_download)
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
