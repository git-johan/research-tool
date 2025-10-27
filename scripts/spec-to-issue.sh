#!/bin/bash

# Create GitHub issue from feature spec
# Usage: ./scripts/spec-to-issue.sh specs/features/feature-name.md

if [ $# -eq 0 ]; then
    echo "Usage: $0 <spec-file-path>"
    echo "Example: $0 specs/features/user-authentication.md"
    exit 1
fi

SPEC_FILE=$1

# Check if file exists
if [ ! -f "$SPEC_FILE" ]; then
    echo "Error: Spec file not found: $SPEC_FILE"
    exit 1
fi

# Extract title from first heading
TITLE=$(grep "^# " "$SPEC_FILE" | head -1 | sed 's/^# //')

if [ -z "$TITLE" ]; then
    echo "Error: Could not extract title from spec file"
    exit 1
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed"
    echo "Install with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub"
    echo "Run: gh auth login"
    exit 1
fi

echo "Creating GitHub issue..."
echo "Title: Feature: $TITLE"
echo "Spec file: $SPEC_FILE"

# Create the issue
ISSUE_URL=$(gh issue create \
    --title "Feature: $TITLE" \
    --body-file "$SPEC_FILE" \
    --label "enhancement,spec" \
    2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ Issue created: $ISSUE_URL"

    # Extract issue number from URL
    ISSUE_NUMBER=$(echo "$ISSUE_URL" | grep -o '[0-9]*$')

    echo "📝 Add to spec: **GitHub Issue:** #$ISSUE_NUMBER"
else
    echo "❌ Failed to create issue. Check your GitHub CLI setup."
fi