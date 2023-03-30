#!/bin/bash

#
# WARNING: this script seems to make SHORT, QUIET SUONDS VERY LOUD FOR SOME REASON
#

# Target loudness level in LUFS
TARGET_LOUDNESS=-16

# Loudness tolerance in LUFS
TOLERANCE=0.5

# Folder containing the audio files
AUDIO_FOLDER="./public/soundboard"

function process_audio_files() {
  local folder="$1"

  for file in "$folder"/*.{mp3,ogg}; do
    [ -e "$file" ] || continue

    # Get the input file's loudness
    INPUT_LOUDNESS=$(ffmpeg -i "$file" -af "ebur128=framelog=verbose" -f null - 2>&1 | grep -oP 'I:\s*\K[-0-9.]+' )

    echo "input loudness: ${INPUT_LOUDNESS}"

    # Calculate the loudness difference
    LOUDNESS_DIFFERENCE=$(echo "($TARGET_LOUDNESS - $INPUT_LOUDNESS) * ($TARGET_LOUDNESS - $INPUT_LOUDNESS > 0 && 1 || -1)" | bc -l)
    ABS_LOUDNESS_DIFF=$(echo "sqrt(($TARGET_LOUDNESS - $INPUT_LOUDNESS) * ($TARGET_LOUDNESS - $INPUT_LOUDNESS))" | bc -l)

    echo "loudness diff: ${LOUDNESS_DIFFERENCE}"

    # Normalize the audio file if the loudness difference exceeds the tolerance
    if (( $(echo "$ABS_LOUDNESS_DIFF > $TOLERANCE" | bc -l) )); then
      GAIN=$(echo "$TARGET_LOUDNESS - $INPUT_LOUDNESS" | bc)
      ffmpeg -i "$file" -af "volume=${GAIN}dB" -y "${file%.*}_normalized.${file##*.}" > /dev/null
    else
      echo "Skipping ${file##*/} (loudness difference: ${LOUDNESS_DIFFERENCE} LUFS)"
    fi
  done
}

function process_directory() {
  local dir="$1"
  process_audio_files "$dir"

  for subdir in "$dir"/*/; do
    [ -d "$subdir" ] || continue
    process_directory "$subdir"
  done
}

process_directory "$AUDIO_FOLDER"
echo "Audio normalization completed."
