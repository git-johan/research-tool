import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import fs from "fs/promises";
import path from "path";

interface FileInfo {
  name: string;
  path: string;
  size: number;
  created: Date;
  modified: Date;
  extension: string;
}

interface FilesystemResponse {
  success: boolean;
  uploadDirectory: string;
  totalFiles: number;
  totalSize: number;
  files: FileInfo[];
  error?: string;
}

export async function GET(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "admin-filesystem-api",
    action: "inspect-uploads"
  });

  try {
    logger.info("Starting filesystem inspection");

    const uploadDir = path.join(process.cwd(), "uploads");

    // Check if uploads directory exists
    try {
      await fs.access(uploadDir);
    } catch (error) {
      logger.warn("Uploads directory does not exist");
      return new Response(
        JSON.stringify({
          success: true,
          uploadDirectory: uploadDir,
          totalFiles: 0,
          totalSize: 0,
          files: []
        } as FilesystemResponse),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Read directory contents
    const dirEntries = await fs.readdir(uploadDir, { withFileTypes: true });
    const files: FileInfo[] = [];
    let totalSize = 0;

    for (const entry of dirEntries) {
      if (entry.isFile()) {
        const filePath = path.join(uploadDir, entry.name);
        const stats = await fs.stat(filePath);

        const fileInfo: FileInfo = {
          name: entry.name,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          extension: path.extname(entry.name)
        };

        files.push(fileInfo);
        totalSize += stats.size;
      }
    }

    // Sort files by modification date (newest first), handling null/undefined dates
    files.sort((a, b) => {
      const aTime = a.modified?.getTime() ?? 0; // Fallback to epoch if no date
      const bTime = b.modified?.getTime() ?? 0;
      return bTime - aTime;
    });

    logger.info("Filesystem inspection completed", {
      metadata: { totalFiles: files.length, totalSize }
    });

    const response: FilesystemResponse = {
      success: true,
      uploadDirectory: uploadDir,
      totalFiles: files.length,
      totalSize,
      files
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown filesystem error';
    logger.error("Filesystem inspection failed", {
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      } as FilesystemResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "admin-filesystem-api",
    action: "cleanup-uploads"
  });

  try {
    logger.info("Starting filesystem cleanup");

    const uploadDir = path.join(process.cwd(), "uploads");

    // Check if uploads directory exists
    try {
      await fs.access(uploadDir);
    } catch (error) {
      logger.info("Uploads directory does not exist, nothing to clean");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No uploads directory found - already clean",
          deletedFiles: 0,
          freedSpace: 0
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Read directory contents
    const dirEntries = await fs.readdir(uploadDir, { withFileTypes: true });
    let deletedFiles = 0;
    let freedSpace = 0;

    for (const entry of dirEntries) {
      if (entry.isFile()) {
        const filePath = path.join(uploadDir, entry.name);
        try {
          const stats = await fs.stat(filePath);
          freedSpace += stats.size;
          await fs.unlink(filePath);
          deletedFiles++;
          logger.debug(`Deleted file: ${entry.name}`);
        } catch (error) {
          logger.warn(`Failed to delete file: ${entry.name}`, {
            metadata: { error: error instanceof Error ? error.message : 'Unknown' }
          });
        }
      }
    }

    logger.info("Filesystem cleanup completed", {
      metadata: { deletedFiles, freedSpace }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully deleted ${deletedFiles} files`,
        deletedFiles,
        freedSpace
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown cleanup error';
    logger.error("Filesystem cleanup failed", {
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}