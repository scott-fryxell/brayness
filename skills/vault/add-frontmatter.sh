#!/bin/bash
# Fix frontmatter for files with wrong [[self]] author but external cardlink content

cd /Users/scott/Desktop/brayness/work/Anotht

scratch=/Users/scott/Desktop/brayness/artifacts/vault
mkdir -p "$scratch"

count=0

# Find files with [[self]] author and cardlink
find . -name "*.md" -type f | while read -r file; do
  # Skip if no [[self]]
  if ! grep -q '\[\[self\]\]' "$file" 2>/dev/null; then
    continue
  fi
  
  # Skip if no cardlink or URL
  if ! grep -q "cardlink\|Source URL::" "$file" 2>/dev/null; then
    continue
  fi
  
  # Extract first URL from cardlink block
  url=$(grep -A1 "^\`\`\`cardlink" "$file" 2>/dev/null | grep "^url:" | head -1 | sed 's/url: //' | tr -d ' ')
  
  # Or extract from Source URL:: pattern
  if [ -z "$url" ]; then
    url=$(grep "Source URL::" "$file" 2>/dev/null | head -1 | sed 's/Source URL:: //' | tr -d ' ')
  fi
  
  if [ -n "$url" ] && [ "$url" != "" ]; then
    # Extract host for author
    host=$(echo "$url" | sed -E 's|https?://||' | sed -E 's|/.*||' | sed 's/www\.//')
    
    # Extract domain name (before first dot)
    domain=$(echo "$host" | cut -d'.' -f1)
    
    # Capitalize domain for author
    author=$(echo "$domain" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')
    
    # Create new frontmatter
    cat > "$scratch/new_frontmatter.txt" << EOF
---
title: "$(basename "$file" .md)"
source: "${url}"
author:
  - "[[${author}]]"
published:
created: $(grep "created:" "$file" | head -1 | sed 's/created: //')
description: ""
tags:
  - "reference"
---

EOF
    
    # Replace existing frontmatter with new one
    # First, remove old frontmatter (lines between --- and ---)
    tail -n +$(grep -n "^---$" "$file" | tail -1 | cut -d: -f1) "$file" | tail -n +2 > "$scratch/body.txt" 2>/dev/null
    
    # Combine new frontmatter + body
    cat "$scratch/new_frontmatter.txt" "$scratch/body.txt" > "$scratch/fixed_file.md"
    mv "$scratch/fixed_file.md" "$file"
    
    count=$((count + 1))
    if [ $((count % 50)) -eq 0 ]; then
      echo "Fixed $count files..."
    fi
  fi
done

echo "✓ Fixed $count files total"
