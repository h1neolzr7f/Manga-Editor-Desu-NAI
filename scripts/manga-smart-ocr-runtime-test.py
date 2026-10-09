"""Native OCR acceptance test. Requires Tesseract English traineddata and Pillow only to draw fixture."""
import base64
from io import BytesIO
import pathlib
import sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from manga_smart_ocr import ocr_image

canvas = Image.new("RGB", (1500, 420), "white")
draw = ImageDraw.Draw(canvas)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 130)
draw.text((80, 120), "HELLO WORLD", fill="black", font=font)
stream = BytesIO()
canvas.save(stream, format="PNG")
src = "data:image/png;base64," + base64.b64encode(stream.getvalue()).decode("ascii")
response = ocr_image(src, "eng")
text = " ".join(item["text"] for item in response["regions"]).upper()
assert response["ok"] and "HELLO" in text and "WORLD" in text, response
print("PASS native Tesseract recognizes HELLO WORLD from an actual PNG", response["regions"])
