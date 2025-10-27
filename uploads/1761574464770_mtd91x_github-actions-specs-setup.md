# GitHub Actions Specs Automation Setup

This guide explains how to set up and use the automated GitHub Actions workflow for feature specifications.

## 🚀 Quick Start

1. **Create a spec**: `./scripts/new-spec.sh "your-feature-name"`
2. **Edit the spec** to add Problem, Solution, Implementation Plan, and Acceptance Criteria
3. **Commit and push**: GitHub Actions handles everything else automatically!

## 🤖 What's Automated

### Auto-Issue Creation
- New spec files automatically create GitHub issues
- Issue number is added back to the spec file
- Issues are labeled with `enhancement`, `spec`, and `auto-created`

### Bidirectional Sync
- **Spec changes** → GitHub issue body updates
- **Issue state changes** → Spec status updates
- **PR merges** → Spec marked as Complete

### Quality Validation
- Required sections validation
- Frontmatter format checking
- GitHub issue link validation
- Auto-formatting (spacing, checkboxes, headings)
- Kebab-case filename validation

### Project Management
- Automatic labeling based on spec status
- Project board integration
- PR tracking and status updates

## 📋 GitHub Actions Workflows

### 1. Sync Specs (`sync-specs.yml`)
**Triggers**: Push/PR to specs files
**Actions**:
- Updates GitHub issue bodies when specs change
- Validates spec format and structure
- Adds sync comments to issues

### 2. Create Issues (`create-issues.yml`)
**Triggers**: New spec files added
**Actions**:
- Creates GitHub issues for new specs
- Updates spec files with issue numbers
- Adds introductory comments

### 3. Status Sync (`status-sync.yml`)
**Triggers**: Issue state changes, PR merges
**Actions**:
- Updates spec status when issues are closed/reopened
- Marks specs as Complete when PRs are merged
- Maintains bidirectional sync

### 4. Validate Specs (`validate-specs.yml`)
**Triggers**: PRs and feature branch pushes
**Actions**:
- Validates spec format and required sections
- Checks GitHub issue links
- Auto-formats specs for consistency
- Blocks PRs with invalid specs

### 5. Project Automation (`project-automation.yml`)
**Triggers**: Issue/PR events
**Actions**:
- Creates and manages status labels
- Links PRs to issues
- Updates issue states based on PR activity

## 🔧 Setup Requirements

### Repository Setup
1. Ensure GitHub Actions are enabled
2. Create labels (done automatically):
   - `draft`, `in-progress`, `review`, `completed`
   - `spec`, `feature-spec`, `auto-created`

### Permissions
GitHub Actions need these permissions (usually default):
- ✅ `issues: write` - Create and update issues
- ✅ `contents: write` - Update spec files
- ✅ `pull-requests: write` - Comment on PRs

## 📚 Usage Examples

### Creating a New Feature Spec
```bash
# Create the spec
./scripts/new-spec.sh "user-authentication"

# Edit the spec file
vim specs/features/user-authentication.md

# Commit and push - GitHub Actions handles the rest!
git add specs/features/user-authentication.md
git commit -m "feat: add user authentication spec"
git push
```

### Manual Operations (if needed)
```bash
# Manually create issue from spec
./scripts/spec-to-issue.sh specs/features/feature-name.md

# Manually sync spec to existing issue
./scripts/sync-spec.sh specs/features/feature-name.md
```

## 🔄 Status Flow

```
Draft → In Progress → Review → Complete
  ↓         ↓          ↓        ↓
draft   in-progress   review  completed
label     label       label    label
```

### Automatic Status Updates
- **Issue closed as completed** → Spec status becomes "Complete"
- **PR merged** → Spec status becomes "Complete"
- **Issue reopened** → Spec status becomes "In Progress"
- **Spec status changed** → Issue labels updated

## 🛠️ Troubleshooting

### GitHub Actions Not Running
1. Check that workflows are in `.github/workflows/`
2. Verify repository has Actions enabled
3. Check workflow syntax with `gh workflow list`

### Issues Not Creating
1. Verify `GH_TOKEN` permissions
2. Check that spec has required sections
3. Ensure filename is kebab-case

### Sync Not Working
1. Check that spec has `**GitHub Issue:** #123` format
2. Verify issue number exists
3. Check workflow logs for errors

### Validation Failures
1. Ensure all required sections exist:
   - Problem, Solution, Implementation Plan, Acceptance Criteria
2. Check frontmatter format
3. Use checkboxes in Implementation Plan and Acceptance Criteria

## 📊 Workflow Status

Check workflow status:
```bash
# List all workflows
gh workflow list

# View specific workflow runs
gh run list --workflow="sync-specs.yml"

# View workflow logs
gh run view [run-id]
```

## 🎯 Best Practices

1. **Always use kebab-case** for spec filenames
2. **Fill all required sections** before committing
3. **Use meaningful commit messages** that reference issues
4. **Keep specs updated** as implementation progresses
5. **Link PRs to issues** using "fixes #123" in PR description

## 🚫 Manual Workflow Fallback

If GitHub Actions are unavailable, use manual scripts:

```bash
# Create spec
./scripts/new-spec.sh "feature-name"

# Create issue
./scripts/spec-to-issue.sh specs/features/feature-name.md

# Sync changes
./scripts/sync-spec.sh specs/features/feature-name.md
```

## 🔮 Future Enhancements

Planned automation improvements:
- Slack/Discord notifications
- Automatic changelog generation
- Analytics and velocity tracking
- Integration with project management tools
- AI-powered spec suggestions