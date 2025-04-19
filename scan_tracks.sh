#!/bin/bash

SRC_DIR="/home/sharvinzlife/Documents/JDownloader/"

if [ ! -d "$SRC_DIR" ]; then
    echo "❌ Error: Directory does not exist: $SRC_DIR"
    exit 1
fi

shopt -s nullglob
mkv_files=("$SRC_DIR"/*.mkv)
shopt -u nullglob

if [ ${#mkv_files[@]} -eq 0 ]; then
    echo "❌ Error: No .mkv files found in $SRC_DIR"
    exit 1
fi

for sample_file in "${mkv_files[@]}"; do
    echo "🎬 Examining tracks in: $(basename "$sample_file")"
    echo "🎧 Basic track info:"
    mkvmerge -i "$sample_file"
    echo -e "\n------------"
    echo "📝 Detailed track info with mediainfo:"
    mediainfo "$sample_file" | grep -E "ID|Language|Title" | grep -v "Language_More"
    echo -e "\n==============================\n"
done
