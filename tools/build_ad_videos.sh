#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_VIDEO="${1:-/Users/ilyagmirin/Downloads/13067428432590.mp4}"
OUTPUT_DIR="${2:-$ROOT_DIR/video-edits/final/mobile-ads}"
PREVIEW_DIR="${3:-$ROOT_DIR/video-edits/previews}"

mkdir -p "$OUTPUT_DIR" "$PREVIEW_DIR"

CROP_FILTER="crop=592:1052:0:74,fps=30,scale=1080:1920:flags=lanczos,format=yuv420p"
VIDEO_FLAGS=(-c:v libx264 -pix_fmt yuv420p -preset slow -crf 20 -movflags +faststart -r 30)
AUDIO_FLAGS=(-c:a aac -b:a 192k)

TRACK_AMBER="$ROOT_DIR/assets/audio/amber-field-directive.mp3"
TRACK_SAND="$ROOT_DIR/assets/audio/sand-between-signals.mp3"
SFX_MOVE="$ROOT_DIR/assets/audio/sfx/move-select.mp3"
SFX_SKIMMER="$ROOT_DIR/assets/audio/sfx/skimmer-takeoff.mp3"
SFX_STORM="$ROOT_DIR/assets/audio/sfx/storm-enter.mp3"
SFX_SINKJAW_SPAWN="$ROOT_DIR/assets/audio/sfx/sinkjaw-spawn.mp3"
SFX_SINKJAW_ATTACK="$ROOT_DIR/assets/audio/sfx/sinkjaw-attack.mp3"

build_clip() {
  local name="$1"
  local video_start="$2"
  local duration="$3"
  local music_path="$4"
  local music_start="$5"
  local sfx_filter="$6"
  local fade_out_start

  fade_out_start="$(python3 -c "duration = float('$duration'); print(f'{max(duration - 1.8, 0):.3f}')")"

  ffmpeg -y \
    -ss "$video_start" -t "$duration" -i "$SOURCE_VIDEO" \
    -ss "$music_start" -t "$duration" -i "$music_path" \
    -i "$SFX_MOVE" \
    -i "$SFX_SKIMMER" \
    -i "$SFX_STORM" \
    -i "$SFX_SINKJAW_SPAWN" \
    -i "$SFX_SINKJAW_ATTACK" \
    -filter_complex "\
      [0:v]${CROP_FILTER}[v]; \
      [1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.8,afade=t=out:st=${fade_out_start}:d=1.8,volume=0.82[music]; \
      [2:a]volume=0.12[sfx_move]; \
      [3:a]volume=0.14[sfx_skimmer]; \
      [4:a]volume=0.16[sfx_storm]; \
      [5:a]volume=0.15[sfx_spawn]; \
      [6:a]volume=0.17[sfx_attack]; \
      ${sfx_filter}; \
      [music][mix_move][mix_skimmer][mix_storm][mix_spawn][mix_attack]amix=inputs=6:normalize=0:dropout_transition=2,alimiter=limit=0.92,atrim=0:${duration},asetpts=PTS-STARTPTS[a]" \
    -map "[v]" -map "[a]" \
    "${VIDEO_FLAGS[@]}" "${AUDIO_FLAGS[@]}" \
    "$OUTPUT_DIR/${name}.mp4"
}

build_preview() {
  ffmpeg -y \
    -ss 00:00:26 -t 8 -i "$SOURCE_VIDEO" \
    -vf "$CROP_FILTER" \
    -an \
    "${VIDEO_FLAGS[@]}" \
    "$PREVIEW_DIR/mobile-base-crop-preview.mp4"
}

build_clip \
  "ad-01-opening-pressure" \
  "00:00:00.000" \
  "28" \
  "$TRACK_AMBER" \
  "00:00:12.000" \
  "[sfx_move]adelay=6000|6000[mix_move]; \
   [sfx_skimmer]adelay=20500|20500[mix_skimmer]; \
   [sfx_storm]adelay=16500|16500[mix_storm]; \
   [sfx_spawn]adelay=22500|22500[mix_spawn]; \
   [sfx_attack]adelay=26200|26200[mix_attack]"

build_clip \
  "ad-02-storm-chaos" \
  "00:00:23.000" \
  "28" \
  "$TRACK_SAND" \
  "00:01:34.000" \
  "[sfx_move]adelay=5000|5000[mix_move]; \
   [sfx_skimmer]adelay=12500|12500[mix_skimmer]; \
   [sfx_storm]adelay=4000|4000[mix_storm]; \
   [sfx_spawn]adelay=19000|19000[mix_spawn]; \
   [sfx_attack]adelay=26200|26200[mix_attack]"

build_clip \
  "ad-03-sinkjaw-finale" \
  "00:01:12.426" \
  "28" \
  "$TRACK_SAND" \
  "00:02:18.000" \
  "[sfx_move]adelay=4500|4500[mix_move]; \
   [sfx_skimmer]adelay=12500|12500[mix_skimmer]; \
   [sfx_storm]adelay=2000|2000[mix_storm]; \
   [sfx_spawn]adelay=5500|5500[mix_spawn]; \
   [sfx_attack]adelay=26000|26000[mix_attack]"

build_preview
