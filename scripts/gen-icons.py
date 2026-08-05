# 產生 PWA 圖示（icon-192 / icon-512 / apple-touch-icon）
# 設計：indigo 圓角方塊 + 白色「解」字（對齊 manifest theme-color #6366f1）
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = "C:/Windows/Fonts/msjhbd.ttc"  # 微軟正黑體 Bold
BG = (99, 102, 241)       # #6366f1
TEXT = (255, 255, 255)

def rounded_rect(size: int, radius: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)
    return img

def add_char(img: Image.Image, size: int, font_size: int) -> Image.Image:
    font = ImageFont.truetype(FONT_PATH, font_size)
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), "解", font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - w) / 2 - bbox[0]
    # 視覺置中：往上一點點（中文字重心）
    y = (size - h) / 2 - bbox[1] - size * 0.02
    d.text((x, y), "解", font=font, fill=TEXT)
    return img

# 192（maskable：字放小、留安全區）
img192 = rounded_rect(192, 40)
img192 = add_char(img192, 192, 118)
img192.save("public/icon-192.png")

# 512（maskable：字放中間 60% 安全區內 → 字較小）
img512 = rounded_rect(512, 106)
img512 = add_char(img512, 512, 300)
img512.save("public/icon-512.png")

# apple-touch-icon（180，iOS 會自己裁圓角 → 不用畫圓角，整面填色）
apple = Image.new("RGBA", (180, 180), BG)
apple = add_char(apple, 180, 115)
apple.save("public/apple-touch-icon.png")

print("icons generated:")
for f in ["icon-192.png", "icon-512.png", "apple-touch-icon.png"]:
    im = Image.open(f"public/{f}")
    print(f"  {f}: {im.size[0]}x{im.size[1]} ({im.mode})")
