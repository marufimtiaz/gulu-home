#!/usr/bin/env python3
"""Create small wall thumbnails for every photo in public/photos/ → public/photos/thumbs/.

The photo wall shows these (fast to scroll); the full photo only loads when tapped.
Run it again whenever you add photos — existing up-to-date thumbnails are skipped:

    python3 scripts/make-thumbs.py          (needs Pillow: pip install pillow)
"""
import os, sys
from PIL import Image, ImageOps

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "photos")
out = os.path.join(root, "thumbs")
os.makedirs(out, exist_ok=True)
EXT = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")
made = 0
names = [f for f in sorted(os.listdir(root)) if f.lower().endswith(EXT)]
for f in names:
    src, dst = os.path.join(root, f), os.path.join(out, f)
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        continue
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im.thumbnail((520, 900), Image.LANCZOS)  # ~2x the width of a wall polaroid
    im.save(dst, "JPEG", quality=74, optimize=True, progressive=True)
    made += 1
    print(f"✓ thumbs/{f}  {im.size[0]}x{im.size[1]}  {os.path.getsize(dst)//1024} KB")
# photo shapes, so the wall can reserve the exact space before an image has loaded
import json
sizes = {}
for f in names:
    with Image.open(os.path.join(out, f)) as t:
        sizes[f] = list(t.size)
with open(os.path.join(out, "sizes.json"), "w") as fh:
    json.dump(sizes, fh, indent=0)

# drop thumbnails whose photo was deleted
for f in os.listdir(out):
    if f not in names and f != "sizes.json":
        os.remove(os.path.join(out, f)); print(f"✗ removed stale thumbs/{f}")
print(f"{made} new thumbnail(s), {len(names)} photo(s) total.")
