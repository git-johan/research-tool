# Feature Specifications

This directory contains feature specifications for the research tool project.

## Structure

- `templates/` - Templates for creating new specs
- `features/` - Individual feature specifications

## Workflow

1. **Create new spec**: `./scripts/new-spec.sh "feature-name"`
2. **Edit spec**: Use your preferred editor to fill in requirements
3. **Create GitHub issue**: `./scripts/spec-to-issue.sh specs/features/feature-name.md`
4. **Implement feature**: Reference the spec and issue number during development

## Status Definitions

- **Draft**: Initial spec created, needs refinement
- **In Progress**: Actively being implemented
- **Review**: Implementation complete, under review
- **Complete**: Feature delivered and tested

## Guidelines

- Use descriptive names for spec files (kebab-case)
- Link specs to GitHub issues for tracking
- Update spec status as work progresses
- Include acceptance criteria for testing