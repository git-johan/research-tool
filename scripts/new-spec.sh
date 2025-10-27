#!/bin/bash

# Create new feature spec from template with GitHub Actions integration
# Usage: ./scripts/new-spec.sh "feature-name"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <feature-name>"
    echo "Example: $0 \"user-authentication\""
    echo ""
    echo "🤖 With GitHub Actions enabled:"
    echo "   - Issues will be created automatically when you commit"
    echo "   - Specs will sync automatically with GitHub issues"
    echo "   - Format validation happens on every push"
    exit 1
fi

SPEC_NAME=$1
SPEC_FILE="specs/features/${SPEC_NAME}.md"

# Validate spec name format (kebab-case)
if ! echo "$SPEC_NAME" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$'; then
    echo "❌ Error: Spec name should be in kebab-case (lowercase, hyphens only)"
    echo "   Good: user-authentication, pdf-upload, api-integration"
    echo "   Bad: UserAuth, user_auth, User-Authentication"
    exit 1
fi

# Check if file already exists
if [ -f "$SPEC_FILE" ]; then
    echo "❌ Error: Spec file already exists: $SPEC_FILE"
    exit 1
fi

# Copy template
cp specs/templates/feature-spec.md "$SPEC_FILE"

# Replace placeholder with actual feature name
FEATURE_TITLE=$(echo "$SPEC_NAME" | sed 's/-/ /g' | sed 's/\b\w/\U&/g')
sed -i '' "s/\[Feature Name\]/$FEATURE_TITLE/g" "$SPEC_FILE"

echo "✅ Created spec: $SPEC_FILE"
echo ""
echo "📝 Next steps:"
echo "   1. Edit the spec: \$EDITOR $SPEC_FILE"
echo "   2. Fill in Problem, Solution, Implementation Plan, and Acceptance Criteria"
echo "   3. Commit the file: git add $SPEC_FILE && git commit -m 'feat: add $FEATURE_TITLE spec'"
echo ""
echo "🤖 GitHub Actions will automatically:"
echo "   - Create a GitHub issue when you push"
echo "   - Validate the spec format"
echo "   - Sync changes to the issue"
echo ""
echo "📋 Manual alternative (if needed):"
echo "   ./scripts/spec-to-issue.sh $SPEC_FILE"