# Modular File Processing

**Status:** In Progress
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
- Accept any file type (PDF, DOCX, TXT, HTML, etc.)
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

### File Structure Refactor
- [ ] Create modular processing structure: `src/lib/processing/`
- [ ] Rename `document-processing.ts` → `indexer.ts` (better naming)
- [ ] Move `pdf-extractor.ts` → `extractors/pdf-extractor.ts`
- [ ] Create extractor routing system: `extractors/index.ts`

### Stage 1: Universal File Upload
- [ ] Create universal file upload endpoint (`POST /api/upload`)
- [ ] Extend MIME type support beyond current text/PDF limitation
- [ ] Update FileUploader component to support all file types

### Stage 2: Content Extraction Service
- [ ] Build content extraction service with format routing
  - [ ] PDF files (extend existing `pdf-extractor.ts`)
  - [ ] DOCX files (add mammoth library)
  - [ ] HTML files (add cheerio extraction)
  - [ ] CSV files (add table formatting)
  - [ ] TXT/MD files (extend existing text processing)
- [ ] Create extractor factory pattern for MIME type routing

### Stage 3: AI-Powered Formatting
- [ ] Implement AI-powered markdown formatting service
- [ ] Handle tables, lists, and complex formatting cleanup
- [ ] Store formatted content as clean markdown

### Stage 4: Vector Indexing Service
- [ ] Create vector indexing service (extend existing `document-processing.ts` logic)
- [ ] Reuse existing chunking (500 words, 50 overlap) and embedding pipeline
- [ ] Maintain compatibility with current MongoDB schema and ChromaDB setup

### Migration & Integration
- [ ] Add status tracking with new progression: `uploaded → extracted → formatted → indexed`
- [ ] Migrate existing documents to new pipeline structure
- [ ] Update search interface to work with new system
- [ ] Add comprehensive error handling and retry logic
- [ ] Write tests for each pipeline stage

## Acceptance Criteria

- [ ] Users can upload PDF files directly (not just URLs)
- [ ] Users can upload DOCX, HTML, and other common formats
- [ ] Each pipeline stage can be run independently
- [ ] Failed stages don't lose previous work
- [ ] Clear status progression: `uploaded` → `extracted` → `formatted` → `indexed`
- [ ] Extracted content is cached and reusable
- [ ] AI formatting produces clean, readable markdown
- [ ] All existing functionality continues to work
- [ ] New pipeline is faster and more reliable than current system

## Notes

- This refactor enables future extensibility (audio transcription, video processing)
- Intermediate JSON format preserves structure for multiple output formats
- Modular design allows independent testing and debugging
- User-centric status names improve UX clarity