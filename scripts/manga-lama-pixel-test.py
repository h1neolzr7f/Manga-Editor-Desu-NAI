"""Native Pillow pixels test for LaMa mask isolation; simulated inpainted image, no ML weights."""
import base64
import io
import pathlib
import sys
from unittest import mock
from PIL import Image, ImageDraw
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
import manga_lama_inpaint as lama

def url(image):
    s=io.BytesIO();image.save(s,format="PNG")
    return "data:image/png;base64,"+base64.b64encode(s.getvalue()).decode("ascii")

before=Image.new("RGB",(300,180),(25,52,190))
mask=Image.new("L",(300,180),0)
ImageDraw.Draw(mask).rectangle((85,55,170,108),fill=255)
fake=Image.new("RGB",(300,180),(242,33,21))
with mock.patch.object(lama,"get_model",return_value=lambda image,mask:fake) as model:
    result=lama.inpaint(url(before),url(mask))
    assert model.call_count==1
out=Image.open(io.BytesIO(base64.b64decode(result["image"].split(",",1)[1]))).convert("RGB")
assert out.size==(300,180)
assert out.getpixel((10,10))==before.getpixel((10,10))
assert out.getpixel((250,90))==before.getpixel((250,90))
assert out.getpixel((110,80))==(242,33,21)
assert not result["applied"] and not result["verified"]
print("PASS native Pillow LaMa compositor preserves outside-mask RGB exactly")

full=Image.new("L",(300,180),255)
with mock.patch.object(lama,"get_model",side_effect=AssertionError("should never initialize")):
    try:lama.inpaint(url(before),url(full))
    except lama.SmartOcrError as exc:
        assert exc.status==400
    else:raise AssertionError("expected excessive-mask rejection")
print("PASS full-frame mask rejected before model initialization")
