#!/bin/bash

# Test Extraction CLI - Testing the modular file processing system via API
# Usage: ./test-extraction.sh [file_path]

set -e

# Configuration
API_URL="http://localhost:8080/api/documents/upload"
CLIENT_ID="test-cli"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Helper function to check if file exists
check_file() {
    if [ ! -f "$1" ]; then
        print_error "File not found: $1"
        exit 1
    fi
}

# Helper function to check if jq is available
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        print_warning "jq not found. Installing via homebrew..."
        if command -v brew &> /dev/null; then
            brew install jq
        else
            print_error "Please install jq to format JSON output: brew install jq"
            exit 1
        fi
    fi

    if ! command -v curl &> /dev/null; then
        print_error "curl not found. Please install curl."
        exit 1
    fi
}

# Function to extract and display content
extract_file() {
    local file_path="$1"
    local filename=$(basename "$file_path")

    check_file "$file_path"

    print_status "Extracting content from: $filename"

    # Determine MIME type based on extension
    local mime_type=""
    case "${filename##*.}" in
        pdf) mime_type="application/pdf" ;;
        html|htm) mime_type="text/html" ;;
        txt) mime_type="text/plain" ;;
        md|markdown) mime_type="text/markdown" ;;
        *)
            print_error "Unsupported file extension: ${filename##*.}"
            print_status "Supported extensions: .pdf, .html, .htm, .txt, .md, .markdown"
            exit 1
            ;;
    esac

    # Make API request
    local response=$(curl -s -X POST "$API_URL" \
        -F "file=@$file_path" \
        -F "clientId=$CLIENT_ID" \
        -H "Content-Type: multipart/form-data")

    # Check if request was successful
    if [ $? -ne 0 ]; then
        print_error "Failed to make API request"
        exit 1
    fi

    # Parse and display results
    echo "$response" | jq '.'

    # Extract success status
    local success=$(echo "$response" | jq -r '.success // false')

    if [ "$success" = "true" ]; then
        print_success "Extraction completed successfully!"

        # Display key metrics
        local word_count=$(echo "$response" | jq -r '.extraction.metadata.wordCount // "N/A"')
        local title=$(echo "$response" | jq -r '.extraction.metadata.title // "N/A"')
        local extraction_time=$(echo "$response" | jq -r '.extraction.metadata.extractionTime // "N/A"')

        echo
        print_status "Extraction Summary:"
        echo "  Title: $title"
        echo "  Word Count: $word_count"
        echo "  Extraction Time: ${extraction_time}ms"

        # Show preview
        local preview=$(echo "$response" | jq -r '.extraction.preview // ""')
        if [ -n "$preview" ]; then
            echo
            print_status "Content Preview (200 chars):"
            echo "$preview"
        fi
    else
        local error=$(echo "$response" | jq -r '.message // "Unknown error"')
        print_error "Extraction failed: $error"
        exit 1
    fi
}

# Function to test all example files
test_all_examples() {
    print_status "Testing all available example files..."

    # Test PDF files from docs/presentations
    if [ -d "docs/presentations" ]; then
        for pdf_file in docs/presentations/*.pdf; do
            if [ -f "$pdf_file" ]; then
                echo
                print_status "Testing PDF: $(basename "$pdf_file")"
                extract_file "$pdf_file"
            fi
        done
    fi

    # Create test files if they don't exist
    echo
    print_status "Creating test files for text and markdown..."

    # Create test markdown file
    cat > test-sample.md << 'EOF'
# Test Markdown Document

This is a sample markdown document for testing the extraction system.

## Features

- **Bold text** processing
- *Italic text* handling
- Code blocks and `inline code`
- Lists and structures

## Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

### Subsection

More content here with various formatting elements to test the markdown extraction capabilities.
EOF

    # Create test text file
    cat > test-sample.txt << 'EOF'
Sample Text Document for Testing

This is a plain text file used to test the text extraction capabilities of the modular file processing system.

The file contains multiple paragraphs to verify that text processing works correctly and maintains proper structure.

Key features being tested:
- Plain text extraction
- Line break preservation
- Word count accuracy
- Title detection from first line
EOF

    # Test the created files
    echo
    print_status "Testing Markdown extraction:"
    extract_file "test-sample.md"

    echo
    print_status "Testing Text extraction:"
    extract_file "test-sample.txt"

    # Clean up test files
    rm -f test-sample.md test-sample.txt
    print_status "Cleaned up test files"
}

# Function to display usage
show_usage() {
    echo "Test Extraction CLI - Testing modular file processing system"
    echo
    echo "Usage:"
    echo "  $0 [file_path]          Extract content from specific file"
    echo "  $0 --test-all           Test all example files"
    echo "  $0 --help               Show this help message"
    echo
    echo "Supported file types:"
    echo "  .pdf        - PDF documents"
    echo "  .html, .htm - HTML files"
    echo "  .txt        - Plain text files"
    echo "  .md         - Markdown files"
    echo
    echo "Examples:"
    echo "  $0 docs/presentations/example.pdf"
    echo "  $0 README.md"
    echo "  $0 --test-all"
    echo
    echo "Requirements:"
    echo "  - Server running on http://localhost:8080"
    echo "  - jq installed for JSON formatting"
    echo "  - curl for API requests"
}

# Main script logic
main() {
    check_dependencies

    if [ $# -eq 0 ]; then
        show_usage
        exit 0
    fi

    case "$1" in
        --help|-h)
            show_usage
            ;;
        --test-all)
            test_all_examples
            ;;
        *)
            extract_file "$1"
            ;;
    esac
}

# Run main function with all arguments
main "$@"