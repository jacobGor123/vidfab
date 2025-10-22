#!/bin/bash

# Media Compression and Rename Script
# This script compresses videos to under 1MB and images to under 130KB
# and renames them with directory prefix + index pattern

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ffmpeg and cwebp are installed
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}Error: ffmpeg is not installed. Please install it first:${NC}"
    echo "  brew install ffmpeg"
    exit 1
fi

if ! command -v cwebp &> /dev/null; then
    echo -e "${RED}Error: cwebp is not installed. Please install it first:${NC}"
    echo "  brew install webp"
    exit 1
fi

# Source directory
SOURCE_DIR="$1"
if [ -z "$SOURCE_DIR" ]; then
    echo -e "${RED}Error: Please provide source directory${NC}"
    echo "Usage: $0 <source_directory> [output_directory]"
    exit 1
fi

if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}Error: Source directory does not exist: $SOURCE_DIR${NC}"
    exit 1
fi

# Output directory (default to source directory + "_compressed")
OUTPUT_DIR="$2"
if [ -z "$OUTPUT_DIR" ]; then
    OUTPUT_DIR="${SOURCE_DIR}_compressed"
fi

echo -e "${GREEN}=== Media Compression and Rename Script ===${NC}"
echo -e "Source: ${YELLOW}$SOURCE_DIR${NC}"
echo -e "Output: ${YELLOW}$OUTPUT_DIR${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to get file size in KB
get_file_size_kb() {
    local file="$1"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        stat -f%z "$file" | awk '{print int($1/1024)}'
    else
        stat -c%s "$file" | awk '{print int($1/1024)}'
    fi
}

# Function to compress video to under 1MB
compress_video() {
    local input="$1"
    local output="$2"
    local target_size_kb=1000  # 1MB

    echo -e "${YELLOW}Compressing video: $(basename "$input")${NC}"

    # Get video duration in seconds
    duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$input")

    # Calculate target bitrate (80% of target size to leave room for audio)
    target_bitrate=$(echo "scale=0; ($target_size_kb * 8 * 0.8) / $duration" | bc)

    # Minimum bitrate to maintain some quality
    min_bitrate=100
    if [ "$target_bitrate" -lt "$min_bitrate" ]; then
        target_bitrate=$min_bitrate
    fi

    # Compress video with two-pass encoding
    ffmpeg -y -i "$input" \
        -c:v libx264 -preset medium \
        -b:v ${target_bitrate}k -maxrate ${target_bitrate}k -bufsize $((target_bitrate*2))k \
        -vf "scale='min(1280,iw)':'-2'" \
        -c:a aac -b:a 64k -ac 1 \
        -movflags +faststart \
        "$output" 2>&1 | grep -v "frame=" || true

    # Check if output file exists and has reasonable size
    if [ -f "$output" ]; then
        output_size=$(get_file_size_kb "$output")
        if [ "$output_size" -gt $((target_size_kb + 200)) ]; then
            # If still too large, try again with lower bitrate
            echo -e "${YELLOW}File still too large (${output_size}KB), trying lower bitrate...${NC}"
            target_bitrate=$((target_bitrate * 70 / 100))
            ffmpeg -y -i "$input" \
                -c:v libx264 -preset medium \
                -b:v ${target_bitrate}k -maxrate ${target_bitrate}k -bufsize $((target_bitrate*2))k \
                -vf "scale='min(960,iw)':'-2'" \
                -c:a aac -b:a 48k -ac 1 \
                -movflags +faststart \
                "$output" 2>&1 | grep -v "frame=" || true
        fi
        output_size=$(get_file_size_kb "$output")
        echo -e "${GREEN}✓ Video compressed: ${output_size}KB${NC}"
    else
        echo -e "${RED}✗ Failed to compress video${NC}"
        return 1
    fi
}

# Function to compress image to webp under 130KB
compress_image() {
    local input="$1"
    local output="$2"
    local target_size_kb=130

    echo -e "${YELLOW}Converting image: $(basename "$input")${NC}"

    # Start with quality 80
    quality=80

    # Convert to webp
    cwebp -q $quality "$input" -o "$output" 2>&1 | grep -v "Saving file" || true

    # Check size and adjust quality if needed
    while [ -f "$output" ] && [ $(get_file_size_kb "$output") -gt $target_size_kb ] && [ $quality -gt 20 ]; do
        quality=$((quality - 10))
        echo -e "${YELLOW}File too large, reducing quality to $quality...${NC}"
        cwebp -q $quality "$input" -o "$output" 2>&1 | grep -v "Saving file" || true
    done

    if [ -f "$output" ]; then
        output_size=$(get_file_size_kb "$output")
        echo -e "${GREEN}✓ Image converted: ${output_size}KB (quality: $quality)${NC}"
    else
        echo -e "${RED}✗ Failed to convert image${NC}"
        return 1
    fi
}

# Process each subdirectory
for dir in "$SOURCE_DIR"/*/; do
    if [ ! -d "$dir" ]; then
        continue
    fi

    dir_name=$(basename "$dir")

    # Skip hidden directories
    if [[ "$dir_name" == .* ]]; then
        continue
    fi

    echo -e "\n${GREEN}=== Processing directory: $dir_name ===${NC}"

    # Create output subdirectory
    output_subdir="$OUTPUT_DIR/$dir_name"
    mkdir -p "$output_subdir"

    # Initialize counters
    video_index=1
    image_index=1

    # Process videos
    echo -e "\n${YELLOW}Processing videos...${NC}"
    find "$dir" -maxdepth 1 -type f \( -iname "*.mp4" -o -iname "*.mov" -o -iname "*.avi" \) | sort | while read -r file; do
        output_file="$output_subdir/${dir_name}-${video_index}.mp4"
        compress_video "$file" "$output_file"
        video_index=$((video_index + 1))
    done

    # Process images
    echo -e "\n${YELLOW}Processing images...${NC}"
    find "$dir" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" \) | sort | while read -r file; do
        output_file="$output_subdir/${dir_name}-${image_index}.webp"
        compress_image "$file" "$output_file"
        image_index=$((image_index + 1))
    done

    echo -e "${GREEN}✓ Processed $(($video_index - 1)) videos and $(($image_index - 1)) images from $dir_name${NC}"
done

echo -e "\n${GREEN}=== Compression Complete ===${NC}"
echo -e "Output directory: ${YELLOW}$OUTPUT_DIR${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
du -sh "$OUTPUT_DIR"
echo ""
