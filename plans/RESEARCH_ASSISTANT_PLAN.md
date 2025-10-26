# Research Assistant Implementation Plan
**Quality-First, Incremental Development Approach**

## Project Overview

Transform the existing persona-based chat tool into a dual-purpose system:
1. **Existing**: AI persona chat (keep as-is)
2. **New**: General research assistant with document upload, RAG, and web search

## Architecture Decisions

- **Separate Interface**: New `/research` route alongside existing persona chat
- **Vector Storage**: Chroma DB (local, file-based) for simplicity
- **Metadata Storage**: Existing MongoDB for sessions, documents, user data
- **AI Stack**: OpenAI embeddings + GPT-5 chat, Cohere reranking (Phase 1.7)
- **File Support**: Start with `.txt` files only for simplicity
- **Quality Focus**: Comprehensive error handling and logging from day one

## Phase 1: Core Document RAG (.txt files only)

### Step 1.1: Basic Infrastructure Setup (Day 1)
**Goal**: Get .txt file upload working with robust error handling

**Tasks**:
- [x] Create feature branch (`feature/research-assistant`)
- [x] Create this implementation plan document
- [ ] Install Chroma DB (`npm install chromadb`)
- [ ] Create `/api/upload` endpoint with comprehensive error handling
- [ ] Set up document storage with proper file validation (.txt only)
- [ ] Add structured logging system with request IDs and timing

**Success Criteria**: Upload various .txt files, handle edge cases (empty files, large files, invalid formats), clear error messages

**Error Handling Requirements**:
- File type validation with clear error messages
- File size limits with user-friendly feedback
- Encoding detection and fallback handling
- Network timeout and retry logic
- Structured error logging with context

---

### Step 1.2: Document Processing Pipeline (Day 2-3)
**Goal**: Convert .txt documents to searchable chunks with bulletproof error handling

**Tasks**:
- [ ] Simple text file reading with encoding detection and fallbacks
- [ ] Document chunking function (500-word chunks with overlap)
- [ ] OpenAI embedding generation with retry logic and rate limiting
- [ ] Store chunks + embeddings in Chroma with transaction-like safety
- [ ] Comprehensive logging at each step (file size, chunk count, embedding success/failure)

**Success Criteria**: Upload various .txt files (small, large, different encodings), monitor logs for processing success

**Quality Requirements**:
- Graceful handling of encoding issues
- Progress tracking for large file processing
- Retry logic for OpenAI API failures
- Detailed processing metrics logging
- Rollback capability if processing fails

---

### Step 1.3: Basic Research Page (Day 4)
**Goal**: Create research interface with excellent UX and error feedback

**Tasks**:
- [ ] Create `/research` route with user-friendly error boundaries
- [ ] File upload component with drag-drop, progress indicators, clear error states
- [ ] Basic chat functionality adapted from existing components
- [ ] Error boundaries and graceful fallbacks throughout UI
- [ ] Optional debug panel to show processing status

**Success Criteria**: Upload files with clear feedback on success/failure, test error scenarios

**UX Requirements**:
- Loading spinners and progress bars
- Toast notifications for success/error states
- Drag-and-drop file upload interface
- Clear file validation feedback
- Mobile-responsive design

---

### Step 1.4: Simple Vector Retrieval (Day 5-6)
**Goal**: Make documents searchable with robust search handling

**Tasks**:
- [ ] Vector similarity search in Chroma with error handling
- [ ] Query processing with fallbacks for edge cases
- [ ] Retrieve top 5 chunks with relevance scoring
- [ ] Context formation with proper truncation if too long
- [ ] Detailed logging of search performance and results

**Success Criteria**: Ask various question types, monitor search quality and performance logs

**Performance Requirements**:
- Sub-second search response times
- Relevance scoring and ranking
- Fallback for no results found
- Query preprocessing and optimization
- Search result caching considerations

---

### Step 1.5: Citation System (Day 7)
**Goal**: Add source attribution with precise tracking

**Tasks**:
- [ ] Source tracking per chunk (filename, character positions)
- [ ] OpenAI prompt engineering for consistent citation format
- [ ] Citation parsing and display in UI
- [ ] Error handling for malformed citations

**Success Criteria**: Verify all answers have proper citations, test citation accuracy

**Citation Requirements**:
- Format: "According to [filename.txt, lines 25-40]..."
- Clickable citations that highlight source text
- Fallback for missing or malformed citations
- Multiple source attribution in single response

---

### Step 1.6: Polish & Comprehensive Testing (Day 8-9)
**Goal**: Production-ready with excellent observability

**Tasks**:
- [ ] Comprehensive error handling across all components
- [ ] Performance monitoring and optimization
- [ ] Multiple document support with proper management
- [ ] Admin/debug interface to inspect stored documents and chunks
- [ ] Load testing with larger files

**Success Criteria**: Stress test entire system, document all edge cases

**Quality Assurance**:
- End-to-end testing workflow
- Performance benchmarking
- Error recovery testing
- User acceptance testing
- Documentation of known limitations

---

### Step 1.7: Add Cohere Reranking (Day 10)
**Goal**: Measure quality improvement with A/B testing

**Tasks**:
- [ ] Integrate Cohere rerank API with proper error handling
- [ ] Side-by-side comparison mode to see before/after
- [ ] Performance impact measurement
- [ ] Document quality improvements

**Success Criteria**: Compare answer quality and document measurable improvement

**Evaluation Metrics**:
- Answer relevance scoring
- Citation accuracy improvement
- Response time impact
- User satisfaction comparison

---

## Technical Specifications

### File Processing
- **Supported**: `.txt` files only (Phase 1)
- **Encoding**: UTF-8 with fallback detection
- **Size Limits**: 10MB per file (configurable)
- **Chunking**: 500 words with 50-word overlap
- **Validation**: MIME type and extension checking

### Vector Storage (Chroma DB)
- **Embeddings**: OpenAI `text-embedding-3-large`
- **Dimensions**: 3072
- **Storage**: Local file-based
- **Backup**: Simple file copy operations
- **Indexing**: Automatic similarity indexing

### API Integration
- **OpenAI**: Embeddings + GPT-5 chat completion
- **Cohere**: Reranking (Step 1.7)
- **Rate Limiting**: Respect API limits with exponential backoff
- **Error Handling**: Retry logic with circuit breaker pattern

### Logging Standards
- **Format**: Structured JSON logs
- **Fields**: timestamp, requestId, component, action, duration, status, metadata
- **Levels**: ERROR, WARN, INFO, DEBUG
- **Storage**: Console output (can be piped to files)

### Database Schema Extensions

#### MongoDB Collections (new)
```javascript
// research_sessions
{
  _id: ObjectId,
  clientId: String,
  sessionType: "research",
  documents: [ObjectId], // references to documents
  messages: [Message],
  createdAt: Date,
  lastActive: Date
}

// documents
{
  _id: ObjectId,
  filename: String,
  originalPath: String,
  processedAt: Date,
  chunkCount: Number,
  fileSize: Number,
  encoding: String,
  status: "processing" | "ready" | "failed",
  error: String?, // if processing failed
  metadata: Object
}
```

#### Chroma Collections
```python
# document_chunks
{
  "id": "doc_id:chunk_index",
  "embedding": [3072 floats],
  "metadata": {
    "document_id": "mongo_document_id",
    "filename": "paper.txt",
    "start_pos": 1250,
    "end_pos": 1750,
    "chunk_index": 3,
    "text_preview": "first 100 chars..."
  },
  "document": "full chunk text content"
}
```

## Future Phases (Reference)

### Phase 2: Web Search Integration
- Real-time web search API integration
- Combine document + web results
- Source conflict resolution

### Phase 3: Advanced Features
- PDF and DOCX support
- Image processing capabilities
- Conversation memory and preferences
- Advanced citation and report generation

## Development Guidelines

### Code Quality
- TypeScript strict mode
- Comprehensive error boundaries
- Unit tests for core utilities
- Integration tests for API endpoints
- ESLint and Prettier configuration

### Git Workflow
- Feature branch: `feature/research-assistant`
- Commit per completed step
- PR when Phase 1 complete
- Merge only after thorough testing

### Testing Strategy
- **Unit Tests**: Chunking, embedding, retrieval functions
- **Integration Tests**: API endpoints, database operations
- **E2E Tests**: Full upload-to-answer workflow
- **Performance Tests**: Large file processing, concurrent users
- **Error Tests**: Network failures, invalid inputs, edge cases

---

## Success Metrics

**Phase 1 Complete When**:
1. Upload a research paper (.txt file)
2. Ask: "What are the main findings and methodology?"
3. Get accurate answer with proper citations
4. System handles errors gracefully
5. Performance is acceptable (<2s for queries)

**Quality Gates**:
- Zero unhandled errors in normal operation
- Clear user feedback for all error states
- Sub-second search performance
- Accurate citations in 95%+ of responses
- Comprehensive logging for debugging

This plan prioritizes quality, observability, and incremental progress to ensure each component is solid before building the next layer.