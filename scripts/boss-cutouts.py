#!/usr/bin/env python3
"""Cut the boss renders in site/bossart.js out of their flat grey backdrop.

Blizzard's render CDN serves each creature as a 600x600 JPEG on a flat rgb(24,24,24)
ground. Laid over the page that ground shows as a grey box, so this script keys it to
alpha and writes site/img/boss/creature-display-<id>.png next to the page. Run it again
after copying a new bossart.js from the overlay (needs Pillow: uv run --with pillow).
"""
import io, json, pathlib, re, urllib.request
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'site' / 'bossart.js'
OUT = ROOT / 'site' / 'img' / 'boss'
GROUND = (24, 24, 24)
LO, HI = 10, 34  # colour distance from the ground: <= LO transparent, >= HI opaque


def cutout(data: bytes) -> Image.Image:
    im = Image.open(io.BytesIO(data)).convert('RGB')
    px = im.load()
    alpha = Image.new('L', im.size)
    a = alpha.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b = px[x, y]
            d = max(abs(r - GROUND[0]), abs(g - GROUND[1]), abs(b - GROUND[2]))
            a[x, y] = 0 if d <= LO else 255 if d >= HI else int((d - LO) * 255 / (HI - LO))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out


def main():
    urls = sorted(set(re.findall(r'https://render\.worldofwarcraft\.com/[\w/.-]+\.jpg', SRC.read_text())))
    OUT.mkdir(parents=True, exist_ok=True)
    for url in urls:
        name = url.rsplit('/', 1)[1].replace('.jpg', '.png')
        req = urllib.request.Request(url, headers={'User-Agent': 'racetodutchfirst boss-cutouts'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            cutout(resp.read()).save(OUT / name, optimize=True)
        print(name)


if __name__ == '__main__':
    main()
