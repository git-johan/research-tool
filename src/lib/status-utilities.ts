import { getDb } from "@/lib/db";
import type { DocumentDoc } from "@/lib/db";

// Status constants for better maintainability
export const DOCUMENT_STATUS = {
  UPLOADING: "uploading",
  IMPORTED: "imported",
  EXTRACTED: "extracted",
  FORMATTED: "formatted",
  INDEXED: "indexed",
  READY_FOR_PROCESSING: "ready_for_processing",
  PROCESSING_EMBEDDINGS: "processing_embeddings",
  COMPLETED: "completed",
  FAILED: "failed"
} as const;

export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];

// Valid status transitions for the modular pipeline
export const STATUS_TRANSITIONS = {
  [DOCUMENT_STATUS.UPLOADING]: [DOCUMENT_STATUS.IMPORTED, DOCUMENT_STATUS.FAILED],
  [DOCUMENT_STATUS.IMPORTED]: [DOCUMENT_STATUS.EXTRACTED, DOCUMENT_STATUS.FAILED],
  [DOCUMENT_STATUS.EXTRACTED]: [DOCUMENT_STATUS.FORMATTED, DOCUMENT_STATUS.FAILED],
  [DOCUMENT_STATUS.FORMATTED]: [DOCUMENT_STATUS.INDEXED, DOCUMENT_STATUS.FAILED],
  [DOCUMENT_STATUS.INDEXED]: [DOCUMENT_STATUS.COMPLETED, DOCUMENT_STATUS.FAILED],
  [DOCUMENT_STATUS.READY_FOR_PROCESSING]: [DOCUMENT_STATUS.PROCESSING_EMBEDDINGS, DOCUMENT_STATUS.FAILED], // Legacy
  [DOCUMENT_STATUS.PROCESSING_EMBEDDINGS]: [DOCUMENT_STATUS.COMPLETED, DOCUMENT_STATUS.FAILED], // Legacy
  [DOCUMENT_STATUS.COMPLETED]: [], // Terminal state
  [DOCUMENT_STATUS.FAILED]: [DOCUMENT_STATUS.IMPORTED] // Can retry from imported
} as const;

// Status descriptions for better UX
export const STATUS_DESCRIPTIONS = {
  [DOCUMENT_STATUS.UPLOADING]: "File is being uploaded",
  [DOCUMENT_STATUS.IMPORTED]: "File has been imported and is ready for extraction",
  [DOCUMENT_STATUS.EXTRACTED]: "Content has been extracted and is ready for formatting",
  [DOCUMENT_STATUS.FORMATTED]: "Content has been formatted and is ready for indexing",
  [DOCUMENT_STATUS.INDEXED]: "Content has been indexed and is searchable",
  [DOCUMENT_STATUS.READY_FOR_PROCESSING]: "Ready for legacy processing pipeline",
  [DOCUMENT_STATUS.PROCESSING_EMBEDDINGS]: "Creating embeddings (legacy)",
  [DOCUMENT_STATUS.COMPLETED]: "Processing completed successfully",
  [DOCUMENT_STATUS.FAILED]: "Processing failed"
} as const;

/**
 * Validate if a status transition is allowed
 */
export function isValidStatusTransition(
  currentStatus: DocumentStatus,
  newStatus: DocumentStatus
): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus as any);
}

/**
 * Get the next expected status in the modular pipeline
 */
export function getNextStatus(currentStatus: DocumentStatus): DocumentStatus | null {
  switch (currentStatus) {
    case DOCUMENT_STATUS.UPLOADING:
      return DOCUMENT_STATUS.IMPORTED;
    case DOCUMENT_STATUS.IMPORTED:
      return DOCUMENT_STATUS.EXTRACTED;
    case DOCUMENT_STATUS.EXTRACTED:
      return DOCUMENT_STATUS.FORMATTED;
    case DOCUMENT_STATUS.FORMATTED:
      return DOCUMENT_STATUS.INDEXED;
    case DOCUMENT_STATUS.INDEXED:
      return DOCUMENT_STATUS.COMPLETED;
    default:
      return null; // Terminal or invalid state
  }
}

/**
 * Check if a document exists and has the expected status
 */
export async function validateDocumentStatus(
  fileId: string,
  expectedStatus: DocumentStatus | DocumentStatus[]
): Promise<{ valid: boolean; document?: any; error?: string }> {
  try {
    const db = await getDb();
    const collection = db.collection("documents");

    const document = await collection.findOne({ _id: fileId });

    if (!document) {
      return {
        valid: false,
        error: `Document with ID ${fileId} not found`
      };
    }

    const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

    if (!expectedStatuses.includes(document.status)) {
      return {
        valid: false,
        document,
        error: `Document status is '${document.status}', expected one of: ${expectedStatuses.join(', ')}`
      };
    }

    return {
      valid: true,
      document
    };

  } catch (error) {
    return {
      valid: false,
      error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Update document status with validation
 */
export async function updateDocumentStatusSafely(
  fileId: string,
  newStatus: DocumentStatus,
  additionalFields?: {
    chunkCount?: number;
    error?: string;
    processedAt?: Date;
    [key: string]: any;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // First validate the document exists and get current status
    const validation = await validateDocumentStatus(fileId, Object.values(DOCUMENT_STATUS));

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const currentStatus = validation.document!.status;

    // Validate the status transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      return {
        success: false,
        error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`
      };
    }

    // Update the document
    const db = await getDb();
    const collection = db.collection("documents");

    const updateFields = {
      status: newStatus,
      ...(additionalFields || {}),
      updatedAt: new Date()
    };

    const result = await collection.updateOne(
      { _id: fileId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return {
        success: false,
        error: `Document with ID ${fileId} not found during update`
      };
    }

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: `Failed to update document status: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get documents by status (useful for processing queues)
 */
export async function getDocumentsByStatus(
  status: DocumentStatus,
  limit: number = 50
): Promise<any[]> {
  try {
    const db = await getDb();
    const collection = db.collection("documents");

    return await collection
      .find({ status })
      .limit(limit)
      .sort({ createdAt: 1 }) // Oldest first
      .toArray();

  } catch (error) {
    throw new Error(`Failed to get documents by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get status progression summary for a document
 */
export async function getDocumentStatusHistory(
  fileId: string
): Promise<{ status: DocumentStatus; description: string; canProgress: boolean; nextStatus?: DocumentStatus }> {
  const validation = await validateDocumentStatus(fileId, Object.values(DOCUMENT_STATUS));

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const currentStatus = validation.document!.status as DocumentStatus;
  const nextStatus = getNextStatus(currentStatus);

  return {
    status: currentStatus,
    description: STATUS_DESCRIPTIONS[currentStatus],
    canProgress: nextStatus !== null,
    nextStatus: nextStatus || undefined
  };
}