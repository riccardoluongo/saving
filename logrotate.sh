#!/bin/bash

FILE_PATH="log/access/access.log"
MAX_SIZE=1000000
FILE_SIZE=$(stat -c %s "$FILE_PATH")

if [ ! -f "$FILE_PATH" ]; then
    touch "$FILE_PATH"
fi
if [ "$FILE_SIZE" -gt "$MAX_SIZE" ]; then
    mv "$FILE_PATH" "$FILE_PATH.$FILE_COUNT"
    touch "$FILE_PATH"
fi
#By Riccardo Luongo, 02/12/2024