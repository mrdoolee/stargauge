"""Dev-time image normalizer (not part of the game bundle).

  python -I tools/normalize_image.py <in.png> <out.png> --size WxH [--alpha] [--fit contain|cover] [--max-kb 1024]
  python -I tools/normalize_image.py <in.png> <out.jpg> --format jpeg [--quality 85] [--size WxH]   (opaque images only; size defaults to the input's)
  python -I tools/normalize_image.py --check-white-core <star-shape.png>
"""
import argparse
import colorsys
import os
import sys

from PIL import Image


def parse_size(text):
    w, h = text.lower().split("x")
    return int(w), int(h)


def fit_image(img, size, fit, alpha):
    tw, th = size
    sw, sh = img.size
    if fit == "cover":
        scale = max(tw / sw, th / sh)
    else:
        scale = min(tw / sw, th / sh)
    nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
    resized = img.resize((nw, nh), Image.LANCZOS)
    if fit == "cover":
        left, top = (nw - tw) // 2, (nh - th) // 2
        return resized.crop((left, top, left + tw, top + th))
    bg = (0, 0, 0, 0) if alpha else (0, 0, 0, 255)
    canvas = Image.new("RGBA", (tw, th), bg)
    canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2), resized)
    return canvas


def to_jpeg(src, dst, size, quality, fit):
    img = Image.open(src).convert("RGBA")
    out = fit_image(img, size or img.size, fit, False)
    flat = Image.new("RGB", out.size, (0, 0, 0))
    flat.paste(out, mask=out.split()[3])
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    flat.save(dst, "JPEG", quality=quality, optimize=True, progressive=True)
    print(f"wrote {dst} {flat.size[0]}x{flat.size[1]} {os.path.getsize(dst) / 1024:.0f} KB (jpeg q{quality})")
    return 0


def normalize(src, dst, size, alpha, fit, max_kb):
    img = Image.open(src).convert("RGBA")
    out = fit_image(img, size, fit, alpha)
    if not alpha:
        flat = Image.new("RGB", out.size, (0, 0, 0))
        flat.paste(out, mask=out.split()[3])
        out = flat
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    out.save(dst, optimize=True)
    kb = os.path.getsize(dst) / 1024
    if kb > max_kb:
        q = out.quantize(colors=256, method=Image.FASTOCTREE if out.mode == "RGBA" else Image.MEDIANCUT)
        q.save(dst, optimize=True)
        kb = os.path.getsize(dst) / 1024
        print(f"quantized to 256 colors, {kb:.0f} KB")
    print(f"wrote {dst} {out.size[0]}x{out.size[1]} {kb:.0f} KB")
    return 0 if kb <= max_kb else 2


def check_white_core(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    cx, cy, r = w / 2, h / 2, min(w, h) * 0.2
    px = img.load()
    sums = [0, 0, 0]
    n = 0
    for y in range(h):
        for x in range(w):
            if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                p = px[x, y]
                for i in range(3):
                    sums[i] += p[i]
                n += 1
    avg = [s / n for s in sums]
    _, sat, _ = colorsys.rgb_to_hsv(*(c / 255 for c in avg))
    ok = all(c >= 250 for c in avg) and sat <= 0.04
    print(f"core avg RGB = {avg[0]:.1f},{avg[1]:.1f},{avg[2]:.1f} saturation {sat:.3f} -> {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--size")
    ap.add_argument("--alpha", action="store_true")
    ap.add_argument("--fit", choices=["contain", "cover"], default="cover")
    ap.add_argument("--format", choices=["png", "jpeg"], default="png")
    ap.add_argument("--quality", type=int, default=85)
    ap.add_argument("--max-kb", type=int, default=1024)
    ap.add_argument("--check-white-core", metavar="PNG")
    a = ap.parse_args()
    if a.check_white_core:
        return check_white_core(a.check_white_core)
    if a.format == "jpeg":
        if len(a.paths) != 2 or a.alpha:
            ap.error("need <in.png> <out.jpg> (no --alpha) with --format jpeg")
        return to_jpeg(a.paths[0], a.paths[1], parse_size(a.size) if a.size else None, a.quality, a.fit)
    if len(a.paths) != 2 or not a.size:
        ap.error("need <in.png> <out.png> --size WxH")
    return normalize(a.paths[0], a.paths[1], parse_size(a.size), a.alpha, a.fit, a.max_kb)


if __name__ == "__main__":
    sys.exit(main())
