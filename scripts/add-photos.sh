#!/usr/bin/env bash
# Copy photos into public/photos/, shrunk for the web (max 1600px, ~200-400 KB each),
# rotated upright, with GPS/EXIF metadata stripped. Originals are never touched.
#
#   ./scripts/add-photos.sh ~/Pictures/us/*.jpg
#
# Needs ImageMagick (`magick` or `convert`). Filenames are kept, so camera names like
# IMG_20251120_154558.jpg give the polaroid its date label and chronological position.
# Also builds the small wall thumbnails (scripts/make-thumbs.py).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
dest="$root/public/photos"
if command -v magick >/dev/null; then im=(magick); elif command -v convert >/dev/null; then im=(convert); else
  echo "ImageMagick not found — install it (e.g. 'sudo pacman -S imagemagick') or just copy photos into $dest by hand." >&2; exit 1
fi
[ $# -gt 0 ] || { echo "usage: $0 photo1.jpg photo2.jpg ..." >&2; exit 1; }
for f in "$@"; do
  # keep the camera's filename: the date label is parsed from it and the wall sorts by it
  out="$dest/$(basename "${f%.*}").jpg"
  "${im[@]}" "$f" -auto-orient -resize '1600x1600>' -strip -quality 82 "$out"
  echo "✓ $out"
done
python3 "$root/scripts/make-thumbs.py" || echo "⚠ thumbnails not built (needs python3 + Pillow) — the wall will fall back to full-size photos."
echo "Done — restart the dev server (or rebuild) so the photo list picks them up."
