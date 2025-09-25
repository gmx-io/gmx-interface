#!/bin/bash

set -e

echo "🔍 Checking for merge conflict artifacts..."

# Colors

CONFLICTS_FOUND=0

# Check for conflict markers in source files only
for file in $(find src landing -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.po" \) 2>/dev/null); do
    if grep -q "^<<<<<<<\|^=======\|^>>>>>>>\|<<<<<<<.*=======" "$file" 2>/dev/null; then
        echo -e "❌ Found conflict markers in: $file}"
        grep -n "^<<<<<<<\|^=======\|^>>>>>>>\|<<<<<<<.*=======" "$file" | head -3
        echo ""
        CONFLICTS_FOUND=1
    fi
done


# Summary
if [ $CONFLICTS_FOUND -eq 0 ]; then
    echo -e "✅ No merge conflict artifacts found!$"
    exit 0
else
    echo -e "❌ Found merge conflict artifacts. Please resolve them."
    exit 1
fi