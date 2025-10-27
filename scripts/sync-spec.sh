#!/bin/bash

# Manually sync spec file with GitHub issue
# Usage: ./scripts/sync-spec.sh specs/features/feature-name.md

if [ $# -eq 0 ]; then
    echo "Usage: $0 <spec-file-path>"
    echo "Example: $0 specs/features/user-authentication.md"
    echo ""
    echo "This script manually syncs a spec file with its linked GitHub issue."
    echo "Normally this happens automatically via GitHub Actions."
    exit 1
fi

SPEC_FILE=$1

# Check if file exists
if [ ! -f "$SPEC_FILE" ]; then
    echo "❌ Error: Spec file not found: $SPEC_FILE"
    exit 1
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed"
    echo "Install with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub"
    echo "Run: gh auth login"
    exit 1
fi

# Extract issue number from spec frontmatter
issue_number=$(grep -E '^\*\*GitHub Issue:\*\*' "$SPEC_FILE" | sed -E 's/.*#([0-9]+).*/\1/' || echo "")

if [ -z "$issue_number" ] || [ "$issue_number" = "0" ]; then
    echo "❌ Error: No GitHub issue number found in $SPEC_FILE"
    echo "Expected format: **GitHub Issue:** #123"
    echo ""
    echo "To create a new issue for this spec:"
    echo "./scripts/spec-to-issue.sh $SPEC_FILE"
    exit 1
fi

echo "🔄 Syncing spec to GitHub issue #$issue_number"

# Check if issue exists
if ! gh issue view "$issue_number" >/dev/null 2>&1; then
    echo "❌ Error: GitHub issue #$issue_number does not exist"
    exit 1
fi

# Extract title from spec
title=$(grep "^# " "$SPEC_FILE" | head -1 | sed 's/^# //')

if [ -z "$title" ]; then
    echo "❌ Error: Could not extract title from spec file"
    exit 1
fi

echo "📝 Updating issue #$issue_number with current spec content"

# Update issue with current spec content
gh issue edit "$issue_number" \
    --title "Feature: $title" \
    --body-file "$SPEC_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Successfully synced $SPEC_FILE to issue #$issue_number"

    # Add comment about manual sync
    gh issue comment "$issue_number" \
        --body "🔄 Spec manually synced from \`$SPEC_FILE\`" || echo "Could not add comment"

    # Show issue URL
    issue_url="https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/issues/$issue_number"
    echo "🔗 View issue: $issue_url"
else
    echo "❌ Failed to sync spec to issue"
    exit 1
fi