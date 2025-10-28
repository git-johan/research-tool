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
- [x] `/api/files/upload` endpoint functionality
- [x] Status field correctly set to "imported" for downloads
- [x] Status field correctly set to "imported" for uploads
- [x] Database records use correct sourceType field

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

### API Response Standardization (Issue #8) - Completed ✅
- ✅ Upload API duplicate handling now returns success:true like download API
- ✅ Upload API now returns fileId instead of documentId for consistency
- ✅ Upload API response includes contentType, fileSizeKB, sourceType, uploadedAt metadata
- ✅ Both APIs now return identical metadata structure for consistency
- ✅ Duplicate file uploads return existing file metadata with positive messaging
- ✅ Database records updated to include sourceType and uploadedAt fields
- ✅ API response types updated to support new metadata structure

### API Refactor (Issue #6) - Completed ✅
- ✅ Download API moved to `/api/files/download` and working
- ✅ Upload API moved to `/api/files/upload` and updated
- ✅ APIs use new folder structure (`files/downloads/`, `files/uploads/`)
- ✅ APIs set correct status ("imported") and sourceType
- ✅ New folder structure created successfully
- ✅ Test download successful with proper file storage
- ✅ Code committed and GitHub issue ready for closure

### Implementation Summary
**API Namespace Separation**: Successfully separated files vs documents APIs
**Status System**: Implemented "imported" status with sourceType tracking
**Folder Structure**: Created organized file storage by acquisition method
**Backwards Compatibility**: Maintained database schema compatibility

## API Cleanup - Archived Endpoints

### Archived Legacy Endpoints
The following endpoints have been moved to `src/app/api/_archived/` for reference:
- ✅ `/api/documents/pdf/` → `_archived/documents-pdf/`
- ✅ `/api/documents/web/` → `_archived/documents-web/`
- ✅ `/api/documents/process/` → `_archived/documents-process/`

### Current API Structure
**Active APIs:**
- `/api/files/download` ✅
- `/api/files/upload` ✅
- `/api/documents/search` ✅ (unchanged)

**Archived for Reference:**
- `_archived/documents-pdf/` - PDF processing implementation
- `_archived/documents-web/` - Web processing implementation
- `_archived/documents-process/` - Document processing implementation

### Manual Testing Required
- [ ] Test `/api/files/download` endpoint in Postman
- [ ] **Test duplicate URL prevention**: Download same URL twice, verify second call returns existing document
- [ ] Test `/api/files/upload` endpoint (if accessible via frontend)
- [ ] **Test upload duplicate prevention**: Upload same file twice, verify second call returns success:true with existing file metadata
- [ ] **Test API response consistency**: Verify upload and download APIs return same metadata structure (contentType, fileSizeKB, sourceType, fileId)
- [ ] Verify archived endpoints return 404: `/api/documents/pdf`, `/api/documents/web`, `/api/documents/process`
- [ ] Verify `/api/documents/search` still works
- [ ] Check file storage in correct directories (`files/downloads/`, `files/uploads/`)
- [ ] Verify database records use correct status ("imported") and sourceType