# Test Plan: Modular File Processing

## Automated Tests
- [ ] Unit tests for file upload validation and storage
- [ ] Unit tests for each file format extractor (PDF, DOCX, HTML, CSV, MD, TXT)
- [ ] Unit tests for AI formatting service
- [ ] Unit tests for vector indexing pipeline
- [ ] Integration tests for complete file processing workflow
- [ ] Error handling tests for unsupported file types
- [ ] Error handling tests for malformed files
- [ ] Error handling tests for network failures during processing
- [ ] Performance tests for large file processing
- [ ] Memory usage tests for concurrent file processing

## Manual Tests (Request User)
- [ ] UI testing for file upload interface with all supported formats
- [ ] End-to-end workflow testing: upload → extract → format → index → search
- [ ] Status progression visibility testing (uploaded → extracted → formatted → indexed)
- [ ] Error recovery testing: retry failed stages without re-uploading
- [ ] Migration testing: verify existing documents still work
- [ ] Cross-browser testing for file upload functionality
- [ ] Accessibility testing for upload interface

## Performance Tests
- [ ] Load testing with multiple simultaneous file uploads
- [ ] Processing time comparison: new pipeline vs current system
- [ ] Memory usage monitoring during large file processing
- [ ] Search performance validation after indexing through new pipeline
- [ ] Database performance impact of new status tracking

## API Structure Refactor Tests (Issue #6)

### Automated Tests
- [x] `/api/files/download` endpoint functionality
- [ ] `/api/files/upload` endpoint functionality
- [ ] Status field correctly set to "imported" for downloads
- [ ] Status field correctly set to "imported" for uploads
- [ ] Database records use correct sourceType field

### Folder Structure Tests
- [x] `files/downloads/` directory created and functional
- [x] `files/uploads/` directory created
- [x] `files/raw-content/` directory created
- [x] `documents/` directory created
- [ ] Files correctly stored in appropriate directories

### Manual Tests Required
- [ ] Test download endpoint in Postman: `/api/files/download`
- [ ] Test upload endpoint if accessible: `/api/files/upload`
- [ ] Verify old endpoints `/api/documents/download` and `/api/documents/upload` no longer exist
- [ ] Check database records have correct status ("imported") and sourceType
- [ ] Verify existing search functionality still works with new status system

## Test Results Summary

### API Refactor (Issue #6) - Completed Tests
- ✅ Download API moved to `/api/files/download` and working
- ✅ Download API uses new folder structure (`files/downloads/`)
- ✅ Download API sets correct status and sourceType
- ✅ New folder structure created successfully
- ✅ Test download successful with proper file storage

### Issues Found
- None so far for download functionality

### Remaining Work
- Need user testing of upload API functionality
- Need verification of database schema compatibility
- Need integration testing with existing processing pipeline