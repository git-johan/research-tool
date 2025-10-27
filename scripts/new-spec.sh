#!/bin/bash

# Create new feature spec from template
# Usage: ./scripts/new-spec.sh "feature-name"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <feature-name>"
    echo "Example: $0 \"user-authentication\""
    exit 1
fi

SPEC_NAME=$1
SPEC_FILE="specs/features/${SPEC_NAME}.md"

# Check if file already exists
if [ -f "$SPEC_FILE" ]; then
    echo "Error: Spec file already exists: $SPEC_FILE"
    exit 1
fi

# Copy template
cp specs/templates/feature-spec.md "$SPEC_FILE"

# Replace placeholder with actual feature name
FEATURE_TITLE=$(echo "$SPEC_NAME" | sed 's/-/ /g' | sed 's/\b\w/\U&/g')
sed -i '' "s/\[Feature Name\]/$FEATURE_TITLE/g" "$SPEC_FILE"

echo "✅ Created spec: $SPEC_FILE"
echo "📝 Edit with: \$EDITOR $SPEC_FILE"
echo "🔗 Create issue with: ./scripts/spec-to-issue.sh $SPEC_FILE"