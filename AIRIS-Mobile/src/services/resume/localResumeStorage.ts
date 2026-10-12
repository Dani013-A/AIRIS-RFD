import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  EncodingType,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

export interface LocalResumeMetadata {
  resumeId: string;
  userId: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  localFileUri: string;
  localTextUri: string;
  uploadedAt: string;
  version: number;
  overallScore: number;
  atsScore: number;
  qualityScore: number;
}

const LOCAL_RESUMES_DIR = (documentDirectory || "") + "resumes/";

/**
 * Create a unique code based on the resume text to verify its content remains unchanged.
 */
export function computeChecksum(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Verify if our storage folder exists, and create it if it is missing.
 */
async function ensureDirectoryExists(dir: string): Promise<void> {
  const dirInfo = await getInfoAsync(dir);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * Save a copy of the resume document, its text, and score info onto the student's device for offline access.
 */
export async function saveResumeLocally(
  userId: string,
  version: number,
  fileUri: string,
  fileName: string,
  mimeType: string,
  rawText: string,
  resumeId: string,
  overallScore: number,
  atsScore: number,
  qualityScore: number
): Promise<{ localFileUri: string; localTextUri: string; checksum: string }> {
  try {
    const userVersionDir = `${LOCAL_RESUMES_DIR}${userId}/${version}/`;
    await ensureDirectoryExists(userVersionDir);

    const checksum = computeChecksum(rawText);

    // 1. Copy the original file from the picker temp path to standard directory if provided
    const fileExtension = fileName.split(".").pop() || "";
    const localFileName = `original_resume.${fileExtension}`;
    const localFileUri = `${userVersionDir}${localFileName}`;

    if (fileUri && fileUri.trim() !== "") {
      try {
        const sourceInfo = await getInfoAsync(fileUri);
        if (sourceInfo.exists) {
          await copyAsync({
            from: fileUri,
            to: localFileUri,
          });
        }
      } catch (copyErr) {
        console.log("[Local Resume Storage] Skipped binary copy or file not found:", copyErr);
      }
    }

    // 2. Save the raw extracted text as a text file
    const localTextUri = `${userVersionDir}extracted_text.txt`;
    await writeAsStringAsync(localTextUri, rawText, {
      encoding: EncodingType.UTF8,
    });

    // 3. Save metadata JSON
    const metadata: LocalResumeMetadata = {
      resumeId,
      userId,
      originalFileName: fileName,
      fileSize: 0, // Fill if size is queryable, else 0
      mimeType,
      checksum,
      localFileUri,
      localTextUri,
      uploadedAt: new Date().toISOString(),
      version,
      overallScore,
      atsScore,
      qualityScore,
    };

    // Attempt to query file size info
    try {
      const fileInfo = await getInfoAsync(localFileUri);
      if (fileInfo.exists) {
        metadata.fileSize = fileInfo.size;
      }
    } catch {
      // Ignore
    }

    const metadataUri = `${userVersionDir}metadata.json`;
    await writeAsStringAsync(metadataUri, JSON.stringify(metadata, null, 2), {
      encoding: EncodingType.UTF8,
    });

    console.log(`[Local Resume Storage] Successfully versioned local files under version ${version}.`);

    return { localFileUri, localTextUri, checksum };
  } catch (err) {
    console.error("[Local Resume Storage] Failed to save files locally:", err);
    // Return mock values so it doesn't block Firestore write if local disk is full/fails
    return { localFileUri: fileUri, localTextUri: "", checksum: "error" };
  }
}

/**
 * Clean up locally cached resume files for a specified user upon account deletion.
 */
export async function deleteLocalResumeData(userId: string): Promise<void> {
  try {
    const userDir = `${LOCAL_RESUMES_DIR}${userId}/`;
    const dirInfo = await getInfoAsync(userDir);
    if (dirInfo.exists) {
      await deleteAsync(userDir, { idempotent: true });
      console.log(`[Local Resume Storage] Successfully cleaned up local files for user ${userId}.`);
    }
  } catch (err) {
    console.warn(`[Local Resume Storage] Cleanup warning for ${userId}:`, err);
  }
}
