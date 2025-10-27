# Claude Code Project Instructions

This is a **research tool** built with Next.js, featuring document processing, vector search, and AI-powered chat functionality. The project enforces **spec-first development** with a supportive, non-blocking approach.

## 🎯 Core Development Philosophy

**Always think through problems with specs before coding.** Use specs as thinking tools that help break down complex features and ensure we build the right thing.

## 🤖 Your Role in the Workflow

### When User Brings New Ideas
When the user discusses new features or improvements:

1. **Recognize spec opportunities** - If it's more than a trivial change, suggest creating a spec
2. **Include spec todos** - Always add spec-related items to todo lists
3. **Reference existing specs** - Check if there are related specs before starting new work
4. **Maintain focus** - Keep discussions aligned with approved specs during implementation

### Required Todo Structure for New Features
When planning new development work, always include these todos:

```
- [ ] Create/update feature specification
- [ ] Get user approval for spec approach
- [ ] Commit spec to git and trigger GitHub issue creation
- [ ] Start implementation following the spec
- [ ] Test against spec acceptance criteria
- [ ] Mark spec as complete
```

### Spec Recognition Triggers
Suggest creating specs when user mentions:
- New features or major functionality
- Significant refactoring or architectural changes
- Complex bug fixes that affect multiple components
- Performance improvements requiring research
- Integration with new services or APIs

### Don't Suggest Specs For:
- Simple bug fixes (1-2 line changes)
- Trivial UI adjustments
- Documentation updates
- Configuration changes
- Dependency updates

## 📋 Project Context

### Current Architecture
- **Frontend**: Next.js with React components
- **Backend**: API routes with file processing pipeline
- **Database**: MongoDB for metadata, ChromaDB for vector storage
- **Processing**: PDF extraction, text chunking, AI embeddings
- **Search**: Semantic search with OpenAI embeddings

### Existing Specs Workflow
- **Location**: `specs/features/` directory
- **Template**: `specs/templates/feature-spec.md`
- **Scripts**: `./scripts/new-spec.sh` and `./scripts/spec-to-issue.sh`
- **Automation**: GitHub Actions sync specs to issues automatically
- **Status Flow**: Draft → In Progress → Review → Complete

### Key File Locations
- **Specs**: `specs/features/*.md`
- **Processing Logic**: `src/lib/` directory
- **API Endpoints**: `src/app/api/` directory
- **Components**: `src/components/` directory
- **GitHub Workflows**: `.github/workflows/`

## 🔄 Plan Mode Best Practices

### Starting Discussions
- **Ask clarifying questions** about the problem first
- **Explore alternatives** and trade-offs before settling on solutions
- **Break down complex features** into manageable implementation phases
- **Consider edge cases** and error handling upfront

### Managing Todos
- **Prioritize spec approval** before any coding begins
- **Include GitHub issue creation** in the workflow
- **Reference existing specs** when building related features
- **Update specs** when requirements change during development

### Implementation Guidance
- **Reference specs** during development to stay on track
- **Check off implementation plan items** as you complete them
- **Test against acceptance criteria** before marking work complete
- **Update spec status** to reflect current progress

## 🛠️ Technical Guidelines

### Commit Messages
Include spec/issue references in commits:
```
feat: implement PDF extraction pipeline

Addresses implementation plan from #123
- Add pdfjs-dist integration
- Create extraction routing logic
- Add error handling for malformed PDFs
```

### Branch Naming
Use descriptive names that reference issues:
```
feature/issue-123-pdf-extraction
fix/issue-456-search-performance
refactor/issue-789-modular-processing
```

### Code Organization
- **Keep existing patterns** - follow established file structure
- **Modular design** - separate concerns clearly
- **Error handling** - comprehensive error management
- **Testing** - verify against spec acceptance criteria

## 💡 Helpful Reminders

### For Planning Discussions
- "Should we create a spec for this feature to think through the approach?"
- "Let me add 'create spec' and 'get approval' to our todo list"
- "I see we have an existing spec for [related feature] - should we reference that?"

### During Implementation
- "Let's check our spec to make sure we're following the implementation plan"
- "This seems like a deviation from the spec - should we update it first?"
- "Have we met all the acceptance criteria from the spec?"

### For Completion
- "Let's verify we've completed all items in the implementation plan"
- "Should we update the spec status to Complete now?"
- "This work addresses issue #X from our spec"

---

**Remember**: Be helpful and proactive about specs without being blocking. Guide the user toward good practices while staying flexible and supportive of their development process.