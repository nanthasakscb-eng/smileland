import sys, os, glob, random
from PIL import Image, ImageFilter, ImageEnhance, ImageChops
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
W, H = 1600, 1200
# vignette mask
vig = Image.radial_gradient('L').resize((W, H)); vig = vig.point(lambda v: 255 - int(max(0, v - 120) * 0.45))
for f in sorted(glob.glob(os.path.join(src, '*.png'))):
    name = os.path.basename(f)[:-4]
    out = os.path.join(dst, f'{name}-1600.webp')
    if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(f): continue
    im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)
    # โทนภาพถ่าย: contrast/saturation เล็กน้อย, vignette, grain, sharpen
    im = ImageEnhance.Contrast(im).enhance(1.06); im = ImageEnhance.Color(im).enhance(1.08)
    im = Image.composite(im, Image.new('RGB', im.size, (0, 0, 0)), vig)
    random.seed(name)
    noise = Image.effect_noise(im.size, 9).convert('RGB'); im = ImageChops.blend(im, ImageChops.overlay(im, noise), 0.10)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    for s, q in ((1600, 80), (800, 78), (400, 74)):
        im.resize((s, s * 3 // 4), Image.LANCZOS).save(os.path.join(dst, f'{name}-{s}.webp'), 'WEBP', quality=q, method=6)
    print('ok', name, flush=True)
