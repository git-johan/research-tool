# Feature Specifications

This directory contains feature specifications for the research tool project with **automated GitHub Actions integration**.

## Structure

- `templates/` - Templates for creating new specs
- `features/` - Individual feature specifications

## 🤖 Automated Workflow (Recommended)

### Quick Start
1. **Create new spec**: `./scripts/new-spec.sh "feature-name"`
2. **Edit and commit**: GitHub Actions handles the rest automatically!

### What Happens Automatically
- ✅ **Auto-creates GitHub issues** when you add new spec files
- ✅ **Syncs changes** from spec files to GitHub issues
- ✅ **Updates status** bidirectionally (spec ↔ issue)
- ✅ **Validates format** and ensures quality
- ✅ **Manages project board** with automatic labeling
- ✅ **Tracks PRs** and updates specs when features are completed

## 📋 Manual Workflow (Fallback)

If you prefer manual control or GitHub Actions aren't working:

1. **Create new spec**: `./scripts/new-spec.sh "feature-name"`
2. **Edit spec**: Use your preferred editor to fill in requirements
3. **Create GitHub issue**: `./scripts/spec-to-issue.sh specs/features/feature-name.md`
4. **Implement feature**: Reference the spec and issue number during development

## Status Definitions

- **Draft**: Initial spec created, needs refinement
- **In Progress**: Actively being implemented
- **Review**: Implementation complete, under review
- **Complete**: Feature delivered and tested

## 🔄 Status Sync Behavior

| Spec Status Change | GitHub Action |
|-------------------|---------------|
| Draft → In Progress | Adds `in-progress` label |
| In Progress → Review | Adds `review` label, removes `in-progress` |
| Review → Complete | Adds `completed` label, closes issue |
| Issue closed | Updates spec to Complete |
| PR merged | Updates spec to Complete |

## 📝 Quality Validation

All specs are automatically validated for:
- ✅ Required sections (Problem, Solution, Implementation Plan, Acceptance Criteria)
- ✅ Proper frontmatter (Status, Priority, Assignee)
- ✅ Valid status and priority values
- ✅ Checkbox format in Implementation Plan and Acceptance Criteria
- ✅ GitHub issue links exist
- ✅ Kebab-case file naming
- ✅ Auto-formatting (line spacing, checkboxes, headings)

## Guidelines

- Use descriptive names for spec files (kebab-case)
- Follow the Problem → Solution → Implementation Plan structure
- All changes automatically sync to GitHub issues
- Status updates happen bidirectionally
- PRs automatically update linked specs when merged

## 🚀 Advanced Features

- **Auto-formatting**: Specs are automatically formatted for consistency
- **Link validation**: GitHub issue references are verified
- **Project board integration**: Issues move through columns automatically
- **PR tracking**: Pull requests automatically update linked specs
- **Quality gates**: Invalid specs block PRs until fixed