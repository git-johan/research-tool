# Modular File Processing

**Status:** Review
**Priority:** High
**Assignee:** @johanjosok
**Epic:** Document Processing Refactor
**GitHub Issue:** #1

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

## Implementation Plan

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
- [ ] Build reliable content extraction for all supported formats using established libraries:
  - [x] PDF files (extend existing extraction capabilities) [#2](https://github.com/git-johan/research-tool/issues/2)
  - [ ] Web content from HTML files *(research: cheerio, jsdom, playwright for extraction)*
  - [ ] Plain text files with enhanced processing
  - [ ] Markdown files with proper formatting preservation *(research: marked, markdown-it, remark)*
- [ ] Implement format detection and routing to appropriate extraction methods

### Stage 3: AI-Powered Content Formatting
- [ ] Develop AI-powered service to create clean, consistent markdown output *(research: current OpenAI models, Claude, local options)*
- [ ] Ensure complex elements (tables, lists, formatting) are handled accurately
- [ ] Establish reliable storage and retrieval of formatted content

### Stage 4: Vector Indexing Service
- [ ] Create efficient vector indexing that integrates with existing embedding pipeline *(research: current embedding models, chunking strategies)*
- [ ] Maintain current chunking strategy and embedding approach for consistency
- [ ] Ensure compatibility with existing MongoDB and ChromaDB infrastructure

### Migration & Integration
- [ ] Implement clear status progression tracking throughout the pipeline *(research: WebSockets, SSE, polling for real-time updates)*
- [ ] Migrate existing documents to work with the new processing system
- [ ] Update search functionality to work seamlessly with new document processing
- [ ] Build comprehensive error handling with retry capabilities for failed stages *(research: exponential backoff, circuit breaker patterns)*
- [ ] Develop thorough testing coverage for each processing stage

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
