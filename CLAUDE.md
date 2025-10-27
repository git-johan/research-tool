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

### Complete Development Workflow

**The Master Spec Process:**
1. **Spec Creation** - Define problem, solution, outcome-driven todos
2. **Spec Approval** - Get user sign-off, commit spec + blank test plan
3. **Ready for Implementation** - Spec serves as master plan

**The Micro-Iteration Process (per todo):**
1. **Issue Creation** - Create GitHub issue just-in-time when starting work
2. **Plan** - Discuss implementation approach for this specific task
3. **Build** - Implement this one component only
4. **Test** - Create and run tests for this component, fix issues
5. **Approve** - Get user approval for this specific piece
6. **Commit & Close** - Clean commit referencing issue and spec, close issue

### Required Todo Structure for New Features
When planning new development work, always include these todos:

```
- [ ] Create feature specification with outcome-driven tasks
- [ ] Create blank test plan file alongside spec
- [ ] Get user approval for spec approach
- [ ] Commit spec + blank test plan to git (no GitHub issues yet)
- [ ] Ready to start implementation (spec planning complete)
```

### Individual Task Implementation
For each todo item in the spec, follow this micro-iteration cycle:

```
- [ ] Create GitHub issue for specific task (just-in-time)
- [ ] Update spec file with link to new issue
- [ ] Plan implementation approach for this task only
- [ ] Build the specific feature/component
- [ ] Update test plan with tests for this component
- [ ] Test thoroughly (automated + manual)
- [ ] Fix any issues found
- [ ] Test again to verify fixes
- [ ] Get user approval for this specific task
- [ ] Clean up temporary files for this task
- [ ] Commit with reference to both issue and spec
- [ ] Close GitHub issue
- [ ] Update master spec if needed
```

### Spec-to-Task Linkage System

**GitHub Issue Creation:**
- **Title Format**: "Task description (from spec-filename.md)"
- **Example**: "PDF extraction stage (from modular-file-processing.md)"
- **Issue Body**: Include link to spec file and specific todo being implemented

**Spec File Updates:**
When creating GitHub issue, update the spec's Implementation Plan:
```markdown
## Implementation Plan
- [ ] PDF extraction stage [#5](https://github.com/user/repo/issues/5)
- [ ] HTML extraction stage
```

**Claude Code Context:**
Always reference the spec when working on tasks:
- "Working on PDF extraction from specs/features/modular-file-processing.md"
- "Implementing todo #2 from the modular file processing spec"

**Commit Message Format:**
```
feat: implement PDF extraction (#5)

From modular-file-processing.md implementation plan item 1
- Add pdfjs-dist integration
- Create extraction routing logic
```

This creates bidirectional traceability between planning (specs) and execution (issues/commits).

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

## 📝 Spec Writing Guidelines

### Focus on Outcomes with Technical Suggestions
When writing specs, emphasize **what** the system should achieve first, but feel free to suggest technical approaches as **options to research**:

**✅ Good - Outcome Focused with Suggestions:**
- "Support uploading Microsoft Word documents *(research: mammoth, docx libraries)*"
- "Extract structured content from web pages *(research: cheerio, jsdom, playwright)*"
- "Enable users to search across all document types *(research: current embedding models)*"
- "Provide real-time processing status updates *(research: WebSockets, SSE, polling)*"

**❌ Bad - Technically Prescriptive:**
- "Use mammoth library for DOCX processing"
- "Implement cheerio for HTML extraction"
- "Add OpenAI embeddings with text-embedding-3-large"
- "Create WebSocket connections for status updates"

**Key Principle:** Lead with the outcome, then suggest 2-3 libraries or approaches to research during implementation. This guides the developer while keeping options open.

### Template Section Guidance

**Problem Section:**
- Focus on user problems and business needs
- Describe current limitations from user perspective
- Avoid mentioning specific technical constraints
- Example: "Users can't upload Word documents" vs. "API doesn't support DOCX MIME types"

**Solution Section:**
- Describe desired capabilities and user experiences
- Focus on what the system should be able to do
- Include technical suggestions as research options in parentheses
- Example: "Users can upload and search any document type *(research: file type routing with mammoth, cheerio, etc.)*"

**Implementation Plan:**
- Break down into logical phases or stages focused on **outcomes**
- Include suggested technical approaches to research
- Tasks should describe what gets built, not which library to use
- Example: "Add document format support *(research DOCX libraries like mammoth)*" vs. "Integrate mammoth library for DOCX parsing"

**Notes Section:**
- Capture any additional context, constraints, or decisions made during planning
- Include links to related features or dependencies
- Document any assumptions or open questions

### When to Make Technical Decisions

**During Spec Creation:**
- ❌ Don't mandate specific libraries or frameworks
- ❌ Don't design detailed technical architectures
- ❌ Don't lock in implementation patterns
- ✅ Do focus on user capabilities and system behaviors
- ✅ Do suggest 2-3 technical options to research *(in parentheses)*
- ✅ Do provide guidance on architectural approaches to consider

**During Implementation:**
- ✅ Research suggested libraries and alternatives
- ✅ Choose appropriate tools based on current requirements and constraints
- ✅ Design technical architecture based on spec outcomes
- ✅ Make implementation decisions based on real-world testing
- ✅ Update specs if implementation reveals new requirements or constraints

**Key Principle:** Specs should provide helpful technical direction while remaining flexible enough to allow different approaches based on implementation discoveries.

## ⚡ Principal Engineer Mindset

### Code Quality Principles
Write code as a **principal engineer** would - prioritizing maintainability, reusability, and efficiency:

**✅ Modular Design:**
- Break functionality into small, focused modules with single responsibilities
- Create reusable components that can be composed together
- Separate concerns cleanly (data access, business logic, presentation)
- Design for extensibility - make it easy to add new features without changing existing code

**✅ Minimal Code:**
- Achieve desired outcomes with as few lines as possible
- Eliminate duplication through abstraction and reuse
- Use established patterns and libraries instead of reinventing solutions
- Prefer composition over inheritance, functions over classes when appropriate

**✅ Reusability:**
- Write functions and components that can be used in multiple contexts
- Create utility modules for common operations
- Design APIs that are flexible and don't make assumptions about usage
- Use generic types and interfaces to support different data shapes

**✅ Performance Conscious:**
- Consider performance implications of design decisions
- Optimize for the common case, handle edge cases gracefully
- Use lazy loading, memoization, and caching where appropriate
- Measure before optimizing - profile actual bottlenecks

### Architecture Patterns

**Favor these approaches:**
- **Factory patterns** for creating objects based on runtime conditions
- **Strategy patterns** for swappable algorithms (different file extractors, embedding models)
- **Pipeline patterns** for data transformation workflows
- **Dependency injection** for testable, modular code
- **Pure functions** where possible - predictable inputs and outputs

**Examples of Principal-Level Thinking:**

**✅ Modular File Processing:**
```typescript
// Good: Modular, extensible design
const extractors = {
  'application/pdf': pdfExtractor,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': docxExtractor,
  'text/html': htmlExtractor
};

const processFile = (file: File, mimeType: string) => {
  const extractor = extractors[mimeType];
  if (!extractor) throw new UnsupportedFileTypeError(mimeType);
  return extractor.extract(file);
};
```

**❌ Monolithic Approach:**
```typescript
// Bad: Hard to extend, tightly coupled
const processFile = (file: File, mimeType: string) => {
  if (mimeType === 'application/pdf') {
    // 50 lines of PDF processing...
  } else if (mimeType === 'application/vnd.openxml...') {
    // 40 lines of DOCX processing...
  } else if (mimeType === 'text/html') {
    // 30 lines of HTML processing...
  }
  // Becomes unmaintainable quickly
};
```

**✅ Composable Utilities:**
```typescript
// Good: Small, reusable functions
const validateFileSize = (file: File, maxSizeMB: number) => { /* */ };
const generateUniqueFilename = (originalName: string) => { /* */ };
const saveToStorage = (file: File, path: string) => { /* */ };

// Compose them as needed
const uploadFile = pipe(
  validateFileSize,
  generateUniqueFilename,
  saveToStorage
);
```

### Technical Debt Prevention

**Avoid these anti-patterns:**
- Massive functions that do multiple things
- Copy-paste code instead of abstraction
- Hard-coded values scattered throughout the codebase
- Tight coupling between unrelated modules
- Complex inheritance hierarchies

**Instead, prioritize:**
- Single Responsibility Principle - each module does one thing well
- DRY (Don't Repeat Yourself) through smart abstraction
- SOLID principles for object-oriented design
- Functional programming principles for data transformation

## 🧪 Testing Workflow

### Test Plan File Structure
For every feature spec, create a corresponding test plan file:

```
specs/features/
├── modular-file-processing.md          # Feature spec
└── modular-file-processing-tests.md    # Test plan (starts blank)
```

### Test Plan Lifecycle

**1. Spec Creation:**
- Create feature spec as usual
- Create empty `[feature-name]-tests.md` alongside it
- Commit both files together (test plan starts blank)

**2. During Implementation:**
- **Continuously update** the test plan as you build features
- Add test cases for each component, function, or API endpoint created
- Include both automated and manual test scenarios
- Update whenever you add error handling or integrate libraries

**3. Pre-Commit Testing:**
- Complete all tests documented in the test plan
- Check off all test items with results
- Document any user testing that needs to be done
- Clean up temporary test files
- Commit code + completed test plan together

### Test Plan Structure Template

```markdown
# Test Plan: [Feature Name]

## Automated Tests
- [ ] Unit tests for [specific components]
- [ ] Integration tests for [workflows]
- [ ] Error handling tests for [edge cases]

## Manual Tests (Request User)
- [ ] UI testing for [specific interactions]
- [ ] End-to-end workflows
- [ ] Cross-browser/device testing if applicable

## Performance Tests
- [ ] Load testing scenarios
- [ ] Memory usage validation

## Test Results Summary
[Document results, issues found, and resolutions]
```

### When to Update Test Plans

**Always add test cases when:**
- Creating new functions or components
- Adding new API endpoints
- Modifying existing functionality
- Adding error handling logic
- Integrating external libraries
- Discovering edge cases during development

### Pre-Commit Testing Checklist
- [ ] All automated tests written and passing
- [ ] Manual test scenarios documented for user
- [ ] Performance considerations tested
- [ ] Error handling scenarios verified
- [ ] All test plan items checked off with results
- [ ] User testing requests clearly specified
- [ ] Temporary test files cleaned up

## 🔍 Research and Implementation Best Practices

### Always Research First
When starting implementation work:

**✅ Search for existing solutions:**
- Use WebSearch to find current best practices and libraries
- Look for updated documentation (libraries change frequently)
- Check for newer alternatives to established libraries
- Research known issues or limitations before choosing tools

**✅ Prefer established libraries over custom code:**
- "Don't reinvent the wheel" - use proven, maintained libraries
- Custom code should be the last resort, not the first choice
- Well-maintained libraries have better testing, documentation, and community support
- Focus development time on business logic, not infrastructure
- **Prefer open source** solutions when available - they offer transparency, community support, and avoid vendor lock-in

### Research Workflow
**Before implementing any feature:**
1. **Web research**: Search for current best practices and recommended libraries
2. **Documentation review**: Check official docs for latest versions and patterns
3. **Community feedback**: Look for Stack Overflow discussions, GitHub issues, and community recommendations
4. **Library comparison**: Compare 2-3 options before choosing one
5. **Implementation**: Use the researched approach rather than building from scratch

### Examples of Research-First Approach

**✅ Good Research Pattern:**
- Need to parse Excel files → Research "Node.js Excel parsing 2025" → Find SheetJS, ExcelJS, xlsx libraries → Compare features → Choose best fit
- Need to process images → Research "Node.js image processing libraries" → Find sharp, jimp, canvas → Choose based on needs

**❌ Bad Custom-First Pattern:**
- Need to parse Excel files → Start writing custom parsing logic → Encounter edge cases → Realize need for library anyway
- Need to process images → Write custom image manipulation → Poor performance and limited format support

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

### For Task Completion
- "Let's test this component thoroughly before moving to the next todo"
- "Should we create the GitHub issue for the next task now?"
- "This completes todo #X from the modular-file-processing.md spec"

### For Master Spec Updates
**When to update the master spec:**
- Task scope changes during implementation (update the todo description)
- New dependencies or constraints discovered (add to Notes section)
- Architecture decisions that affect other tasks (update Solution section)
- Performance or technical insights that change the approach

**How to update:**
- Keep the core Problem and Solution sections stable
- Update specific Implementation Plan todos as needed
- Add new Notes for important discoveries
- Update status when all todos are complete

### Spec Status Management
- **Draft**: Initial planning and discussion
- **In Progress**: At least one todo has an active GitHub issue
- **Review**: All todos complete, final testing and integration
- **Complete**: All work done, all issues closed, feature fully implemented

---

**Remember**: Be helpful and proactive about specs without being blocking. Guide the user toward good practices while staying flexible and supportive of their development process.
- When starting a new task from a spec file, always start the individual task implementation micry iteration cycle