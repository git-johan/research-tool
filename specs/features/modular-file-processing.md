# Modular File Processing

**Status:** In Progress - Stage 2 Complete
**Priority:** High
**Assignee:** @johanjosok
**Epic:** Document Processing Refactor
**GitHub Project:** #1
**Completed:** Stage 1 (Universal Upload) + Stage 2 (Content Extraction) + API Standardization
**Next:** Stage 3 (AI Formatting)

## Progress Summary

### ✅ Completed Work
- **Stage 1: Universal File Upload** - Multi-format upload API with validation
- **Stage 2: Content Extraction** - PDF, HTML, text, markdown extraction pipeline
- **API Structure Refactor** - Clean separation of files vs documents namespaces
- **API Response Standardization** - Unified metadata and duplicate handling
- **Folder Organization** - Structured file storage by acquisition method
- **Database Schema** - Enhanced with status progression and source tracking

### 🚧 Current Focus
- **Stage 3: AI-Powered Content Formatting** - Next major milestone

### 📋 Remaining Work
- Stage 3: AI formatting service for clean markdown output
- Stage 4: Vector indexing integration
- Document CRUD operations (#7)
- Migration and integration testing

## Problem

The current file upload and processing pipeline is tightly coupled and inflexible:

- **Tight Coupling**: PDF extraction → chunking → embedding happens in one API call
- **Limited Formats**: Only supports text files for upload, PDFs only from URLs
- **Poor Error Handling**: If chunking fails, you lose the extracted content
- **No Content Caching**: Can't reprocess same content differently
- **Inflexible**: Hard to add new file types, embedding models, or chunk strategies
- **Unclear Status**: "completed" doesn't tell users the document is searchable

## Solution

Implement a modular 4-stage pipeline that separates concerns:

```
File Upload → Content Extraction → AI Formatting → Vector Indexing
   ↓              ↓                   ↓              ↓
uploaded → extracted → formatted → indexed
```

### Architecture

**Stage 1: Universal File Upload**
- Accept any file type (PDF, DOCX, TXT, HTML, MD, CSV, etc.)
- Store in `/uploads/` with unique names
- Status: `uploaded`

**Stage 2: Content Extraction**
- Route to appropriate extractor based on MIME type
- Store structured JSON in `/extractions/`
- Status: `extracted`

**Stage 3: AI-Powered Formatting**
- Use AI (GPT-4) to create clean markdown from extracted content
- Handle tables, lists, formatting cleanup
- Store `.md` in `/formatted/`
- Status: `formatted`

**Stage 4: Vector Indexing**
- Save metadata to MongoDB
- Chunk the markdown content
- Generate embeddings and store in ChromaDB
- Status: `indexed`

### File Structure

```
src/lib/processing/
├── upload.ts                 # Stage 1: File upload handling
├── extractors/
│   ├── pdf-extractor.ts      # PDF extraction (moved from existing)
│   ├── docx-extractor.ts     # DOCX extraction (new)
│   ├── html-extractor.ts     # HTML extraction (new)
│   ├── csv-extractor.ts      # CSV extraction (new)
│   ├── text-extractor.ts     # TXT/MD extraction (new)
│   └── index.ts              # Extractor routing
├── formatter.ts              # Stage 3: AI markdown formatting
├── indexer.ts                # Stage 4: Chunking + embeddings (renamed from document-processing.ts)
└── pipeline.ts               # Main pipeline coordinator
```

### API Design

```json
{
  "upload": "POST /api/upload",
  "extract": "POST /api/extract/{fileId}",
  "format": "POST /api/format/{fileId}",
  "index": "POST /api/index/{fileId}",
  "status": "GET /api/files/{fileId}/status"
}
```

### Clean Architecture: Single Responsibility APIs

Following principle engineering practices, each API has a single, well-defined responsibility:

#### File Acquisition APIs (Single Responsibility)
- **`POST /api/files/upload`** - File storage only
  - Accepts file uploads and stores in `/files/uploads/`
  - Updates status to "imported"
  - Returns fileId for further processing
  - Does NOT extract content

- **`POST /api/files/download`** - URL download only
  - Downloads files from URLs to `/files/downloads/`
  - Updates status to "imported"
  - Returns fileId for further processing
  - Does NOT extract content

#### Processing APIs (Single Responsibility)
- **`POST /api/extract/{fileId}`** - Content extraction only
  - Extracts content from files with status "imported"
  - Saves structured JSON to `/files/extractions/{fileId}.json`
  - Updates status to "extracted"
  - Works with any file source (upload/download)

- **`POST /api/format/{fileId}`** - AI formatting only
  - Processes files with status "extracted"
  - Creates clean markdown from raw extracted content
  - Saves to `/files/formatted/{fileId}.md`
  - Updates status to "formatted"

- **`POST /api/index/{fileId}`** - Vector indexing only
  - Processes files with status "formatted"
  - Chunks content and creates embeddings
  - Stores in ChromaDB with metadata in MongoDB
  - Updates status to "indexed"

#### Orchestration API
- **`POST /api/process/{fileId}`** - Full pipeline coordination
  - Calls extract → format → index in sequence
  - Handles errors and retries
  - Provides progress tracking
  - Can resume from any stage based on current status

#### Benefits of This Architecture
- ✅ **Testable in isolation** - Each API can be tested independently
- ✅ **Debuggable** - Clear boundaries for where failures occur
- ✅ **Reusable** - Extraction works for any file source
- ✅ **Scalable** - Can scale processing independently from file operations
- ✅ **Maintainable** - Single responsibility per API
- ✅ **Flexible** - Can change pipeline without affecting file acquisition

## Implementation Plan

### Phase 1: Clean Up Existing APIs (Single Responsibility)
- [ ] Remove extraction logic from upload/download APIs
- [ ] Refactor upload API to only handle file storage and return fileId
- [ ] Refactor download API to only handle URL downloading and return fileId
- [ ] Update both APIs to set status as "imported" only

### Phase 2: Build Stage APIs (Extraction)
- [ ] Create extraction JSON storage utilities and `/files/extractions/` directory structure
- [ ] Build standalone extraction API: `POST /api/extract/{fileId}`
- [ ] Add status validation and transition logic (imported → extracted)

### Phase 3: Build Stage APIs (Formatting & Indexing)
- [ ] Build standalone formatting API: `POST /api/format/{fileId}` (extracted → formatted)
- [ ] Build standalone indexing API: `POST /api/index/{fileId}` (formatted → indexed)
- [ ] Test all individual stage APIs in isolation

### Phase 4: Build Orchestration Layer (After All Stage APIs Complete)
- [ ] Create orchestration API: `POST /api/process/{fileId}` for full pipeline coordination
- [ ] Add error handling and retry logic for pipeline failures
- [ ] Implement progress tracking and status reporting

### Code Organization & Structure
- [ ] Create modular processing structure: `src/lib/processing/`
- [ ] Rename `document-processing.ts` → `indexer.ts` (better naming)
- [ ] Move `pdf-extractor.ts` → `extractors/pdf-extractor.ts`
- [ ] Create extractor routing system: `extractors/index.ts`

### Stage 1: Universal File Upload
- [ ] Enable upload of multiple file formats beyond current limitations
- [ ] Expand MIME type support to handle PDF, DOCX, HTML, CSV, markdown, and text files
- [ ] Update upload interface to accept and validate all supported file types

### Stage 2: Content Extraction Service
- [x] Build reliable content extraction for all supported formats using established libraries:
  - [x] PDF files (extend existing extraction capabilities) [#2](https://github.com/git-johan/research-tool/issues/2)
  - [x] Web content from HTML files *(research: cheerio, jsdom, playwright for extraction)*
  - [x] Plain text files with enhanced processing
  - [x] Markdown files with proper formatting preservation *(research: marked, markdown-it, remark)*
- [x] Create URL download API to download web content via URL [#4](https://github.com/git-johan/research-tool/issues/4)
- [x] API structure and naming consistency refactor [#6](https://github.com/git-johan/research-tool/issues/6)
- [x] API response standardization: unified metadata and duplicate handling [#8](https://github.com/git-johan/research-tool/issues/8)
- [x] Cross-source duplicate detection: prevent duplicates between upload and download [#9](https://github.com/git-johan/research-tool/issues/9)
### Stage 2b: Standalone Extraction API

Following single responsibility principle, the extraction API only handles content extraction:

**`POST /api/extract/{fileId}` - Content extraction only**
- Validates input status is "imported"
- Reads files from `/files/uploads/` or `/files/downloads/` based on sourceType
- Routes to appropriate extractor based on MIME type (PDF, HTML, TXT, MD)
- Extracts structured content (text, metadata, tables, lists)
- Saves structured JSON to `/files/extractions/{fileId}.json`
- Updates status to "extracted"
- Returns extraction metadata (word count, processing time, content structure)

**Tasks:**
- [ ] Stage 2b: Standalone Extraction API - Separate content extraction from file acquisition [#10](https://github.com/git-johan/research-tool/issues/10)
  - Fix status type safety (add missing status values to enum)
  - Create `/files/extractions/` directory structure and JSON storage utilities
  - Create shared status utilities (validation, transitions, constants)
  - Build standalone extraction API: `POST /api/extract/{fileId}`
  - Refactor upload API (remove extraction logic for single responsibility)
  - Update download API flow for consistent behavior

### Stage 3: AI-Powered Content Formatting

Following single responsibility principle, the formatting API only handles markdown conversion:

**`POST /api/format/{fileId}` - AI formatting only**
- Validates input status is "extracted"
- Reads structured JSON from `/files/extractions/{fileId}.json`
- Uses AI (GPT-4/Claude) to create clean markdown from extracted content
- Handles complex elements (tables, lists, formatting) accurately
- Saves formatted content to `/files/formatted/{fileId}.md`
- Updates status to "formatted"
- Returns formatting metadata (processing time, word count, AI model used)

**Tasks:**
- [ ] Create formatting utilities and `/files/formatted/` directory structure
- [ ] Build AI formatting service (OpenAI/Claude integration for clean markdown output)
- [ ] Build standalone formatting API: `POST /api/format/{fileId}`
  - Validates input status is "extracted"
  - Reads from `/files/extractions/{fileId}.json`
  - Updates output status to "formatted"
  - Handles complex elements (tables, lists, formatting) accurately
- [ ] Add formatted content validation and quality checks

### Stage 4: Vector Indexing Service

Following single responsibility principle, the indexing API only handles vector processing:

**`POST /api/index/{fileId}` - Vector indexing only**
- Validates input status is "formatted"
- Chunks markdown content using existing strategy
- Generates embeddings and stores in ChromaDB
- Saves metadata to MongoDB
- Updates status to "indexed"
- Returns indexing metadata (chunk count, embedding model, processing time)

**Tasks:**
- [ ] Create indexing utilities and validate formatted content input
- [ ] Build standalone indexing API: `POST /api/index/{fileId}`
  - Validates input status is "formatted"
  - Updates output status to "indexed"
- [ ] Integrate with existing embedding pipeline and ChromaDB infrastructure
- [ ] Maintain current chunking strategy and embedding approach for consistency
- [ ] Add indexing metadata and performance tracking

### Stage 5: Orchestration (After All Individual APIs Complete)

Once all individual stage APIs are complete and tested, build orchestration layer:

**`POST /api/process/{fileId}` - Full pipeline coordination**
- Validates initial status is "imported"
- Calls extract → format → index APIs in sequence
- Handles errors and retries between stages
- Provides progress tracking and status reporting
- Can resume from any stage based on current document status
- Returns comprehensive processing results

**Tasks:**
- [ ] Build orchestration API after all stage APIs are complete
- [ ] Implement error handling and retry logic for pipeline failures
- [ ] Add progress tracking and real-time status updates
- [ ] Enable resume capability based on current document status
- [ ] Add comprehensive error reporting across all stages

### Migration & Integration
- [ ] Implement clear status progression tracking throughout the pipeline *(research: WebSockets, SSE, polling for real-time updates)*
- [ ] Migrate existing documents to work with the new processing system
- [ ] Update search functionality to work seamlessly with new document processing
- [ ] Build comprehensive error handling with retry capabilities for failed stages *(research: exponential backoff, circuit breaker patterns)*
- [ ] Develop thorough testing coverage for each processing stage

### Testing Strategy

Each API component can be tested in complete isolation with clear success criteria:

#### File Acquisition Testing
- **Upload API**: `POST /api/files/upload` + file → Check file exists in `/files/uploads/` + status = "imported"
- **Download API**: `POST /api/files/download` + URL → Check file exists in `/files/downloads/` + status = "imported"

#### Processing Pipeline Testing
- **Extraction API**: `POST /api/extract/{fileId}` → Check JSON exists in `/files/extractions/{fileId}.json` + status = "extracted"
- **Formatting API**: `POST /api/format/{fileId}` → Check markdown exists in `/files/formatted/{fileId}.md` + status = "formatted"
- **Indexing API**: `POST /api/index/{fileId}` → Check ChromaDB entry exists + status = "indexed"

#### Orchestration Testing
- **Process API**: `POST /api/process/{fileId}` → Check full pipeline completion through all status transitions

#### File Format Testing
Test each supported format individually:
- **PDF**: Upload/download PDF → extract → JSON contains title, author, page count, full text
- **HTML**: Upload/download HTML → extract → JSON contains clean text, title, word count
- **TXT**: Upload/download TXT → extract → JSON contains full text, encoding info
- **MD**: Upload/download MD → extract → JSON contains text with structure preserved

### Required for Project Completion
- [ ] Document CRUD Operations and Unified Storage [#7](https://github.com/git-johan/research-tool/issues/7)
  - Complete document management API with cascade delete
  - Unified storage/retrieval for formatted content
  - Required before closing modular file processing project

## Notes

- This refactor enables future extensibility (audio transcription, video processing)
- Intermediate JSON format preserves structure for multiple output formats
- Modular design allows independent testing and debugging
- User-centric status names improve UX clarity
- **Dependencies**: This feature builds on existing PDF extraction and embedding pipeline
- **Assumptions**: Current MongoDB schema can accommodate new status fields
- **Constraints**: Must maintain backward compatibility with existing documents
- **Performance**: New pipeline should be faster than current single-stage approach
- **Testing**: Will require comprehensive testing of file format edge cases
- Removed CSV and Word doc support from requirements

## Out of Scope

### PDF Image Extraction
- **Feature**: Improve PDF extraction to support images for presentation-style PDFs
- **Tasks Considered**:
  - MVP for image extraction *(research: pdf-img-convert, node-pdf-extract-image)*
  - Implementation into PDF extractor (saves images to uploads folder)
  - OCR to extract text from images *(research: Tesseract.js, node-tesseract-ocr)*
- **Status**: Experimental Puppeteer-based solution works for 2/3 test PDFs but 66% success rate insufficient for production
- **Experimental Work**: Available on `feature/pdf-image-extraction-experimental` branch for future reference
- **Reason**: Reliability issues prevent production deployment; current text-based PDF extraction is sufficient for most use cases

# future

- [ ] Warn / prompt user if they want to update existing content if hash comparison reveals updated content
