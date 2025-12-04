#!/bin/bash

# Configuration
ASSETS_DIR="src/assets/images"
BACKUP_DIR="src/assets/images_backup_$(date +%Y%m%d_%H%M%S)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Image Optimization...${NC}"

# 1. Create Backup
echo -e "${YELLOW}Creating backup at $BACKUP_DIR...${NC}"
cp -r "$ASSETS_DIR" "$BACKUP_DIR"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Backup created successfully.${NC}"
else
    echo -e "${RED}Failed to create backup. Aborting.${NC}"
    exit 1
fi

# Function to convert and resize
# Usage: optimize_image "filename.png" target_width quality
optimize_image() {
    local file="$1"
    local width="$2"
    local quality="85"
    local filename=$(basename "$file" .png)
    local webp_file="${ASSETS_DIR}/${filename}.webp"
    local original_file="${ASSETS_DIR}/${file}"

    if [ -f "$original_file" ]; then
        echo -e "Processing ${file} -> Resize: ${width}px, Format: WebP..."
        convert "$original_file" -resize "${width}x>" -quality "$quality" -define webp:lossless=false "$webp_file"
        
        # Calculate space savings
        local orig_size=$(du -h "$original_file" | cut -f1)
        local new_size=$(du -h "$webp_file" | cut -f1)
        echo -e "${GREEN}Saved: $orig_size -> $new_size${NC}"
        
        # Update references in code
        echo -e "Updating references to $filename.webp in src/..."
        grep -r "$file" src/app src/theme | cut -d: -f1 | sort | uniq | while read -r src_file; do
            sed -i "s/$file/$filename.webp/g" "$src_file"
        done
        
        # Remove original PNG? (Uncomment to delete)
        # rm "$original_file"
    else
        echo -e "${RED}File $file not found!${NC}"
    fi
}

# 2. Process Large Specific Files
# ------------------------------

# Massive welcome image (3.2MB -> ~150KB)
optimize_image "welcome-kids.png" 1080

# Background Patterns (1.2-1.4MB -> ~50-80KB)
optimize_image "pattern-light.png" 512
optimize_image "pattern-dark.png" 512

# Full screen welcome/hero (1MB+ -> ~100-200KB)
optimize_image "diabetacticwelcomescreen.png" 1080
optimize_image "hero-kids-new.png" 800
optimize_image "hero-aura-ring.png" 600

# Empty States (900KB+ -> ~50-80KB)
optimize_image "empty-appointments.png" 512
optimize_image "empty-readings.png" 512
optimize_image "bolus-calculator-icon.png" 512

# 3. Batch Process Remaining PNGs
# -------------------------------
echo -e "${BLUE}Batch processing remaining PNGs...${NC}"

find "$ASSETS_DIR" -name "*.png" | while read -r img; do
    filename=$(basename "$img")
    
    # Skip if already processed (check if webp exists)
    basename_no_ext=$(basename "$img" .png)
    if [ -f "${ASSETS_DIR}/${basename_no_ext}.webp" ]; then
        continue
    fi
    
    # Generic conversion for others (max width 1024 to be safe, usually they are smaller)
    optimize_image "$filename" 1024
done

echo -e "${GREEN}Optimization Complete!${NC}"
echo -e "${YELLOW}Please verify the app visually. Originals are in $BACKUP_DIR${NC}"
echo -e "${YELLOW}Note: You may need to manually update references in 'assets/...' strings if they are dynamically constructed.${NC}"
