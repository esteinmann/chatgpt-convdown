#!/bin/bash

zip_file="chatgpt_convdown$1.zip"

# Move to source directory and zip it. 
cd src && zip -r ../$zip_file * 

# Add the LICENSE file.
cd .. && zip -u $zip_file LICENSE
