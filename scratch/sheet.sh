#!/bin/sh
# sheet.sh <video> <start s> <dur s> <fps> <crop w:h:x:y> <cols>x<rows> <out.png>
ffmpeg -loglevel error -y -ss "$2" -t "$3" -i "$1" -vf "fps=$4,crop=$5,tile=$6:padding=4:color=white" -frames:v 1 "$7"
