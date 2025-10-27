# Test Plan: Modular File Processing

## Automated Tests

### ✅ Completed
- [x] **File extractor routing system** - Created modular extractor architecture with MIME type routing
- [x] **HTML content extraction** - Implemented using Cheerio for clean text extraction with title detection
- [x] **Text file extraction** - Basic text processing with title detection from first line
- [x] **Markdown extraction** - Preserves formatting while making content searchable, extracts metadata
- [x] **PDF extraction integration** - Moved existing PDF extractor into modular system
- [x] **MIME type validation** - Support for PDF, HTML, TXT, MD file types
- [x] **Error handling for unsupported file types** - Clear error messages for unsupported formats

#### 🧪 **PDF Extraction Testing - THOROUGHLY TESTED**
- [x] **Real document extraction** - Successfully processed 1MB+ academic PDF in 568ms
- [x] **Content quality validation** - Clean text extraction (13,490 words, 83K chars)
- [x] **Metadata extraction** - Creator info, page count, word count all correct
- [x] **Performance testing** - Fast extraction from complex research documents
- [x] **Error handling validation** - Proper failures for invalid URLs, non-PDF content
- [x] **MIME type recognition** - Case-insensitive, handles content-type headers
- [x] **Integration testing** - Works perfectly through modular extractor routing
- [x] **Local documents testing** - 100% success on real business PDFs (5/5 presentations)

#### 🧪 **HTML Extraction Testing - THOROUGHLY TESTED**
- [x] **Real website extraction** - Successfully processed Wikipedia, BBC News, MDN docs
- [x] **Content quality validation** - Clean text with 32K+ words from Wikipedia article
- [x] **Title detection** - Perfect title extraction from various HTML sources
- [x] **Performance testing** - Fast processing (13-104ms) for pages up to 1.3MB
- [x] **Content filtering** - Removes navigation/ads while preserving main content
- [x] **Structure preservation** - Maintains paragraphs, lists, and text structure
- [x] **Error handling validation** - Graceful handling of 403 errors and bot protection
- [x] **Extraction efficiency** - Appropriate text ratios (3-24%) for different content types

#### 🔥 **NEW: Upload API Integration - READY FOR TESTING**
- [x] **Updated upload API** - Now supports all file types through modular extractors
- [x] **Immediate extraction results** - Returns full extracted content in upload response
- [x] **CLI testing script** - Created `./test-extraction.sh` for terminal testing

### 🧪 **API Testing - READY TO TEST**

#### **Upload API - `/api/documents/upload`** (POST)
**Test with Postman/curl:**
- Method: `POST http://localhost:8080/api/documents/upload`
- Body: form-data with `file` (any supported type) + `clientId=test`
- Returns: Immediate JSON with extracted content + metadata

**What to test:**
- [ ] **PDF files** - Upload `docs/presentations/*.pdf` files
- [ ] **Markdown files** - Upload `.md` files (create test samples)
- [ ] **Text files** - Upload `.txt` files (create test samples)
- [ ] **HTML files** - Upload `.html` files (save web pages locally)
- [ ] **Error handling** - Try unsupported file types (.docx, .csv, .jpg)
- [ ] **Large files** - Test with files approaching 10MB limit
- [ ] **Malformed files** - Test with corrupted or empty files

#### **Processing API - `/api/documents/process`** (POST)
**Test pipeline completion:**
- Method: `POST http://localhost:8080/api/documents/process`
- Body: empty (processes all uploaded documents)
- Returns: Processing results for vector indexing

#### **Search API - `/api/documents/search`** (POST)
**Test end-to-end workflow:**
- Upload files → Process → Search
- Method: `POST http://localhost:8080/api/documents/search`
- Body: `{"query": "search terms", "clientId": "test"}`

### 🔄 In Progress
- [ ] Text and markdown extraction validation via API testing
- [ ] Complete end-to-end workflow testing: upload → extract → process → search
- [ ] Error handling tests for malformed files via API
- [ ] Performance tests for large file processing via API

## Manual Tests (User Testing via API)
- [ ] **Postman testing** - Test all file types via upload API
- [ ] **CLI testing** - Use `./test-extraction.sh` for local file testing
- [ ] **End-to-end workflow** - Upload → Process → Search via API calls
- [ ] **Error boundary testing** - Test with invalid files and edge cases
- [ ] **Performance validation** - Test extraction speed on large documents

## Performance Tests
- [ ] Load testing with multiple simultaneous file uploads
- [ ] Processing time comparison: new pipeline vs current system
- [ ] Memory usage monitoring during large file processing
- [ ] Search performance validation after indexing through new pipeline
- [ ] Database performance impact of new status tracking

## Test Results Summary
[Document results, issues found, and resolutions]