#!/usr/bin/env bash
#
# Optimize images and video in this folder for publishing on the web.
#
#   for-web.sh                    everything here
#   for-web.sh photo.jpg clip.mov just these
#
# Images become <name>-web.jpg and <name>-web.webp (1600px max).
# Video becomes <name>-web.mp4 (1080 tall max, streams while downloading).
#
# Originals are never touched - they keep full resolution and their EXIF.
# Re-running skips anything already named -web, so extensions never stack.

set -euo pipefail

MAX_IMAGE=1600
IMAGE_QUALITY=82
MAX_HEIGHT=1080
CRF=28

human() {
  if [ "$1" -ge 1048576 ]; then
    printf '%sM' $(($1 / 1048576))
  else
    printf '%sK' $(($1 / 1024))
  fi
}

need() {
  command -v "$1" >/dev/null || {
    echo "needs $1: brew install $2" >&2
    exit 1
  }
}

# auto-orient bakes in the EXIF rotation and sRGB bakes in the color, both
# before strip drops the metadata. Order matters: strip first and portrait
# photos come out sideways and wide-gamut ones shift color. Stripping also
# drops GPS, which has no business on a published file.
do_image() {
  local f=$1 base=${1%.*} before
  before=$(stat -f%z "$f")

  magick "$f" \
    -auto-orient \
    -colorspace sRGB \
    -resize "${MAX_IMAGE}x${MAX_IMAGE}>" \
    -strip \
    -interlace JPEG \
    -sampling-factor 4:2:0 \
    -quality $IMAGE_QUALITY \
    "${base}-web.jpg"

  magick "${base}-web.jpg" -quality $IMAGE_QUALITY "${base}-web.webp"

  printf '%s  %s -> jpg %s, webp %s\n' "$f" "$(human "$before")" \
    "$(human "$(stat -f%z "${base}-web.jpg")")" \
    "$(human "$(stat -f%z "${base}-web.webp")")"
}

# scale caps height without upscaling and keeps dimensions even, which h264
# requires. faststart moves the index to the front so playback can begin before
# the whole file arrives.
do_video() {
  local f=$1 out=${1%.*}-web.mp4 before
  before=$(stat -f%z "$f")

  ffmpeg -nostdin -loglevel error -y -i "$f" \
    -vf "scale=-2:'min($MAX_HEIGHT,ih)'" \
    -c:v libx264 -crf $CRF -preset slow -pix_fmt yuv420p \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    "$out"

  printf '%s  %s -> %s\n' "$f" "$(human "$before")" "$(human "$(stat -f%z "$out")")"
}

if [ $# -gt 0 ]; then
  files=("$@")
else
  shopt -s nullglob nocaseglob
  files=(*.jpg *.jpeg *.png *.tif *.tiff *.heic *.mov *.mp4 *.m4v *.avi *.mkv)
  shopt -u nullglob nocaseglob
fi

images=()
videos=()

shopt -s nocasematch

# bash 3.2 (what macOS ships) treats an empty array as unset under set -u, so
# every expansion below needs the :- guard.
for f in ${files[@]+"${files[@]}"}; do
  case "$f" in *-web.jpg | *-web.webp | *-web.mp4) continue ;; esac
  case "$f" in
    *.jpg | *.jpeg | *.png | *.tif | *.tiff | *.heic) images+=("$f") ;;
    *.mov | *.mp4 | *.m4v | *.avi | *.mkv) videos+=("$f") ;;
    *) echo "skipping $f (not an image or video)" >&2 ;;
  esac
done

if [ ${#images[@]} -eq 0 ] && [ ${#videos[@]} -eq 0 ]; then
  echo "nothing to optimize here"
  exit 0
fi

# Only demand the tool a run actually uses.
[ ${#images[@]} -gt 0 ] && need magick imagemagick
[ ${#videos[@]} -gt 0 ] && need ffmpeg ffmpeg

for f in ${images[@]+"${images[@]}"}; do do_image "$f"; done
for f in ${videos[@]+"${videos[@]}"}; do do_video "$f"; done
