"""
Run this once to generate icon files for Electron.
Requires: pip install pillow
Output: icon.ico, icon.png, tray-icon.png
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.dirname(os.path.abspath(__file__))

def make_icon(size, filename, is_tray=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background circle
    margin = size // 10
    draw.ellipse([margin, margin, size - margin, size - margin],
                 fill=(37, 99, 235))  # Blue-600

    # Robot emoji / AI text
    font_size = size // 3
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()

    text = "AI"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) // 2, (size - th) // 2 - size // 20),
              text, fill="white", font=font)

    path = os.path.join(OUT, filename)
    img.save(path)
    print(f"Created: {path}")
    return img

# Generate PNG icons
icon_256 = make_icon(256, "icon.png")
tray_icon = make_icon(16, "tray-icon.png", is_tray=True)

# Generate ICO (multi-resolution for Windows)
icon_16  = make_icon(16,  "_tmp16.png")
icon_32  = make_icon(32,  "_tmp32.png")
icon_48  = make_icon(48,  "_tmp48.png")
icon_64  = make_icon(64,  "_tmp64.png")
icon_128 = make_icon(128, "_tmp128.png")
icon_256_2 = make_icon(256, "_tmp256.png")

ico_path = os.path.join(OUT, "icon.ico")
icon_256_2.save(ico_path, format="ICO", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
print(f"Created: {ico_path}")

# Cleanup temp files
for s in [16, 32, 48, 64, 128, 256]:
    tmp = os.path.join(OUT, f"_tmp{s}.png")
    if os.path.exists(tmp):
        os.remove(tmp)

print("\nAll icons created successfully!")
print("Now run: build_exe.bat")
