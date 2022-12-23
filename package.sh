#!/bin/bash

# Create releases dir when it does not exist.
mkdir -p releases

# Extract version from manifest.
version=$(grep -oP '"version": "\K[0-9]+\.[0-9]' src/manifest.json)

if [[ ! $version ]]; then
    echo "Failed to extract version from src/manifest.json"
    exit 1
fi

# Construct a file name with the given version number.
zip_file="chatgpt_convdown$version.zip"

# Move to source directory and zip it. 
cd src && zip -r ../releases/$zip_file *

# Add the LICENSE file.
cd .. && zip -u releases/$zip_file LICENSE

# Report result.
echo "Created package: $zip_file"
