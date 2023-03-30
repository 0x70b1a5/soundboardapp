#!/bin/bash

function normalize_audio_file() {
  TARGET_LOUDNESS=-16
  TOLERANCE=0.5

  file="$1"
  [ -e "$file" ] || { echo "File not found: $file"; return 1; }

  INPUT_LOUDNESS=$(ffmpeg -i "$file" -af "ebur128=framelog=verbose" -f null - 2>&1 | grep -oP 'I:\s*\K[-0-9.]+' )

  if [[ "$INPUT_LOUDNESS" == "inf" ]] || [[ "$INPUT_LOUDNESS" == "-inf" ]]; then
    echo "Skipping ${file##*/} (invalid loudness value: ${INPUT_LOUDNESS})"
    return 1
  fi

  LOUDNESS_DIFFERENCE=$(echo "sqrt(($TARGET_LOUDNESS - $INPUT_LOUDNESS) * ($TARGET_LOUDNESS - $INPUT_LOUDNESS))" | bc -l)

  if (( $(echo "$LOUDNESS_DIFFERENCE > $TOLERANCE" | bc -l) )); then
    GAIN=$(echo "$TARGET_LOUDNESS - $INPUT_LOUDNESS" | bc -l)
    ffmpeg -i "$file" -af "volume=${GAIN}dB" -y "${file%.*}_normalized.${file##*.}" > /dev/null 2>&1
    echo "Normalized ${file##*/}"
  else
    echo "Skipping ${file##*/} (loudness difference within tolerance)"
  fi
}

if [ $# -eq 0 ]; then
  echo "Usage: $0 path/to/audio-file"
  exit 1
fi

normalize_audio_file "$1"
