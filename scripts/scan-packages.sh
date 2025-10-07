#!/bin/sh

# Usage: ./scan-packages.sh [folder1] [folder2] ...
# Example: ./scan-packages.sh . sdk
# If no arguments provided, scans current directory

# Default to current directory if no arguments provided
if [ $# -eq 0 ]; then
    folders="."
else
    folders="$@"
fi

echo "Checking for potentially vulnerable packages..."
echo "Folders to scan: $folders"
echo "================================================"

# Track vulnerable packages found
vulnerable_packages=""
error_count=0

# Function to compare version numbers
version_compare() {
    if [ "$1" = "$2" ]; then
        return 0  # Equal
    fi
    
    # Use sort -V for version comparison
    if [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$1" ]; then
        return 1  # First version is less than second
    else
        return 2  # First version is greater than second
    fi
}

check_package() {
    package=$1
    vulnerable_version=$2
    folder=$3
    
    echo "Package: $package"
    echo "Vulnerable version: $vulnerable_version"
    echo "Folder: $folder"
    
    # Check if package.json exists in the folder
    if [ ! -f "$folder/package.json" ]; then
        echo "Installed version: Not found (no package.json in $folder)"
        echo "Status: ✓ Package not installed"
        echo "------------------------------------------------"
        return
    fi
    
    # Use npm ls to find installed versions in the specific folder
    installed_versions=$(cd "$folder" && yarn dlx npm ls $package --all --depth=Infinity 2>/dev/null | grep -E "($package@[^ ]+)" | sed -E "s/^.*($package@[^ ]+).*$/\1/" | cut -d "@" -f2 | sort -u)
    
    if [ -z "$installed_versions" ]; then
        echo "Installed version: Not found"
        echo "Status: ✓ Package not installed"
    else
        echo "Installed version(s):"
        echo "$installed_versions" | sed 's/^/  - /'
        
        # Check if any installed version is vulnerable
        is_vulnerable=false
        for version in $installed_versions; do
            # Remove any non-numeric suffixes for comparison
            clean_version=$(echo "$version" | sed 's/[^0-9.]*$//')
            version_compare "$clean_version" "$vulnerable_version"
            case $? in
                0)  # Equal to vulnerable version
                    is_vulnerable=true
                    break
                    ;;
            esac
        done
        
        if [ "$is_vulnerable" = true ]; then
            echo "Status: ✗ VULNERABLE - Found vulnerable version(s)"
            vulnerable_packages="$vulnerable_packages\n  - $package (vulnerable: $vulnerable_version) in $folder"
            error_count=$((error_count + 1))
        else
            echo "Status: ✓ Safe - All versions are newer than vulnerable version"
        fi
    fi
    
    echo "------------------------------------------------"
}

# Define vulnerable packages and their versions
vulnerable_packages_list="
backslash:0.2.1
chalk:5.6.1
chalk-template:1.1.1
color-convert:3.1.1
color-name:2.0.1
color-string:2.1.1
wrap-ansi:9.0.1
supports-hyperlinks:4.1.1
strip-ansi:7.1.1
slice-ansi:7.1.1
simple-swizzle:0.2.3
is-arrayish:0.3.3
error-ex:1.3.3
ansi-regex:6.2.1
ansi-styles:6.2.2
supports-color:10.2.1
debug:4.4.2
color:5.0.1
has-ansi:6.0.1
"

# Check each folder
for folder in $folders; do
    echo "Scanning folder: $folder"
    echo "================================================"
    
    # Check each vulnerable package in this folder
    for package_info in $vulnerable_packages_list; do
        if [ -n "$package_info" ]; then
            package=$(echo "$package_info" | cut -d':' -f1)
            vulnerable_version=$(echo "$package_info" | cut -d':' -f2)
            check_package "$package" "$vulnerable_version" "$folder"
        fi
    done
    
    echo ""
done

# Summary
echo ""
echo "================================================"
echo "SCAN SUMMARY"
echo "================================================"

if [ $error_count -eq 0 ]; then
    echo "✓ All packages are safe - no vulnerable versions found"
    echo "Total vulnerable packages: 0"
    exit 0
else
    echo "✗ VULNERABLE PACKAGES DETECTED!"
    echo "Total vulnerable packages: $error_count"
    echo ""
    echo "Vulnerable packages found:"
    printf "$vulnerable_packages\n"
    echo ""
    echo "Please update these packages to secure versions."
    exit 1
fi