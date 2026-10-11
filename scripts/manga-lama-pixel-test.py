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

# Real simple-lama-inpainting pads input bottom/right to a multiple of 8 and returns the
# padded image (found with the real model on Linux; a 512x512 test hid it).
odd=Image.new("RGB",(301,183),(25,52,190))
odd_mask=Image.new("L",(301,183),0)
ImageDraw.Draw(odd_mask).rectangle((85,55,170,108),fill=255)
padded=Image.new("RGB",(304,184),(242,33,21))
with mock.patch.object(lama,"get_model",return_value=lambda image,mask:padded):
    result=lama.inpaint(url(odd),url(odd_mask))
out=Image.open(io.BytesIO(base64.b64decode(result["image"].split(",",1)[1]))).convert("RGB")
assert out.size==(301,183) and result["width"]==301 and result["height"]==183, out.size
assert out.getpixel((300,182))==odd.getpixel((300,182))
assert out.getpixel((110,80))==(242,33,21)
print("PASS modulo-8 padded LaMa output is cropped back to the source size")

for bad in ((296,183),(320,200)):
    with mock.patch.object(lama,"get_model",return_value=lambda image,mask,b=bad:Image.new("RGB",b)):
        try:lama.inpaint(url(odd),url(odd_mask))
        except lama.SmartOcrError as exc:assert exc.status==502
        else:raise AssertionError("expected size rejection for %r"%(bad,))
print("PASS LaMa output that is smaller or padded beyond 8px is still rejected")

# Real LaMa returns near-white (253/254) for a pure white bubble: a faint visible box edge.
# The tone drift measured on a ring just OUTSIDE the mask is removed inside the mask.
white=Image.new("RGB",(300,180),(255,255,255))
wmask=Image.new("L",(300,180),0); ImageDraw.Draw(wmask).rectangle((85,55,170,108),fill=255)
drift=Image.new("RGB",(300,180),(253,254,253))
with mock.patch.object(lama,"get_model",return_value=lambda image,mask:drift):
    result=lama.inpaint(url(white),url(wmask))
out=Image.open(io.BytesIO(base64.b64decode(result["image"].split(",",1)[1]))).convert("RGB")
assert out.getpixel((120,80))==(255,255,255),out.getpixel((120,80))
assert out.getpixel((10,10))==(255,255,255)
print("PASS LaMa tone drift on white bubbles corrected (no faint rectangle)")

# Real content is still taken from the model; only the measured offset is removed, clamped.
grey=Image.new("RGB",(300,180),(120,120,120))
gen=Image.new("RGB",(300,180),(118,118,118)); ImageDraw.Draw(gen).rectangle((100,60,150,100),fill=(20,20,20))
with mock.patch.object(lama,"get_model",return_value=lambda image,mask:gen):
    result=lama.inpaint(url(grey),url(wmask))
out=Image.open(io.BytesIO(base64.b64decode(result["image"].split(",",1)[1]))).convert("RGB")
assert out.getpixel((90,58))==(120,120,120) and out.getpixel((120,80))==(22,22,22),(out.getpixel((90,58)),out.getpixel((120,80)))
far=Image.new("RGB",(300,180),(200,40,40))
with mock.patch.object(lama,"get_model",return_value=lambda image,mask:far):
    result=lama.inpaint(url(grey),url(wmask))
out=Image.open(io.BytesIO(base64.b64decode(result["image"].split(",",1)[1]))).convert("RGB")
assert out.getpixel((120,80))==(200,40,40),out.getpixel((120,80))
assert out.getpixel((10,10))==(120,120,120)
print("PASS tone correction keeps model content, ignores large (>24) differences, outside mask exact")

uneven=Image.new("RGB",(300,180),(255,255,255)); d=ImageDraw.Draw(uneven)
d.rectangle((95,60,160,100),fill=(252,253,252)); d.line((100,80,150,80),fill=(30,30,30),width=3)
with mock.patch.object(lama,"get_model",return_value=lambda image,mask:uneven):
    result=lama.inpaint(url(white),url(wmask))
out=Image.open(io.BytesIO(base64.b64decode(result["image"].split(",",1)[1]))).convert("RGB")
assert out.getpixel((100,62))==(255,255,255) and out.getpixel((120,80))==(30,30,30),(out.getpixel((100,62)),out.getpixel((120,80)))
print("PASS uneven near-white drift on flat paper snapped to paper; dark content kept")
