#!/bin/bash

# Create releases dir when it does not exist.
mkdir -p releases

# Validate $1.
version_number_pattern="^[0-9]+\.[0-9]+$"
if [[ ! $1 =~ $version_number_pattern ]]; then
    echo "Value for first argument $1 is not a valid version number. Needs to match regex pattern $version_number_pattern"
    exit 1;
fi

# Construct a file name with the given version number.
zip_file="chatgpt_convdown$1.zip"

# Move to source directory and zip it. 
cd src && zip -r ../releases/$zip_file *

# Add the LICENSE file.
cd .. && zip -u releases/$zip_file LICENSE
