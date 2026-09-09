import { getApiBaseUrl } from "../api/apiClient";
import { analyzeResume, parseResumeSections, detectResumeSections, type ResumeAnalysisResult } from "./resumeAnalysisEngine";

/**
 * Returns the authoritative backend base URL using the centralized resolver.
 */
export function getBackendBaseUrls(): string[] {
  return [getApiBaseUrl()];
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  progress: number;
  phase: "uploading" | "processing";
}

/**
 * Uploads document file to FastAPI backend with real-time XHR byte progress tracking.
 * Uses 5s request timeout per candidate endpoint to prevent hanging.
 */
export async function uploadResumeFileWithProgress(
  file: { uri: string; name: string; mimeType: string; size?: number },
  targetPosition: string,
  onProgress?: (event: UploadProgressEvent) => void,
  accountName?: string
): Promise<{
  rawText: string;
  parsedSections: Record<string, string>;
  analysisResult?: ResumeAnalysisResult;
}> {
  const baseUrls = getBackendBaseUrls();
  const knownSize = file.size && file.size > 0 ? file.size : 10240;

  for (const baseUrl of baseUrls) {
    try {
      const uploadUrl = `${baseUrl}/upload`;
      if (__DEV__) {
        console.log(`Connecting to backend service at ${uploadUrl}...`);
      }

      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.timeout = 30000; // 30 second timeout to allow Groq/AI to finish processing

        xhr.upload.onprogress = (event) => {
          const totalBytes = event.lengthComputable && event.total > 0 ? event.total : knownSize;
          const loadedBytes = event.loaded || 0;
          const percent = totalBytes > 0 ? Math.min(Math.round((loadedBytes / totalBytes) * 100), 99) : 0;

          onProgress?.({
            loaded: loadedBytes,
            total: totalBytes,
            progress: percent,
            phase: "uploading",
          });
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (err) {
              reject(new Error("Invalid JSON response from server."));
            }
          } else {
            let errorMsg = `Server error HTTP ${xhr.status}`;
            let errorCode = "SERVER_ERROR";
            try {
              const errJson = JSON.parse(xhr.responseText);
              if (errJson.detail) {
                errorMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
                if (errorMsg.includes("exceed 3 pages") || errorMsg.includes("pages long")) {
                  errorCode = "EXCEEDED_PAGE_LIMIT";
                } else if (errorMsg.includes("belong to a different individual")) {
                  errorCode = "NAME_MISMATCH";
                } else if (errorMsg.includes("doesn't appear to be a resume") || errorMsg.includes("valid resume")) {
                  errorCode = "INVALID_RESUME";
                }
              }
            } catch {}
            const apiErr = new Error(errorMsg);
            (apiErr as any).code = errorCode;
            reject(apiErr);
          }
        };

        xhr.onerror = () => reject(new Error("Network connection error."));
        xhr.ontimeout = () => reject(new Error("Request timed out."));

        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
        } as any);
        if (targetPosition) {
          formData.append("targetPosition", targetPosition);
        }
        if (accountName) {
          formData.append("accountName", accountName);
          formData.append("account_name", accountName);
        }

        xhr.open("POST", uploadUrl);
        xhr.send(formData);
      });

      if (result) {
        if (result.valid === false) {
          const rejectMsg = result.message || "This document doesn't appear to be a resume or CV. Please upload a document containing your academic, professional, or career information.";
          const invalidErr = new Error(rejectMsg);
          (invalidErr as any).code = "INVALID_RESUME";
          throw invalidErr;
        }

        onProgress?.({
          loaded: knownSize,
          total: knownSize,
          progress: 100,
          phase: "processing",
        });

        const sections = result.parsedSections || {};
        const rawText = result.rawText || Object.values(sections).join("\n\n");

        if (result.atsScore) {
          result.parsedSections = sections;
          if (!result.detectedSections || result.detectedSections.length === 0) {
            const parsed = parseResumeSections(rawText);
            result.detectedSections = detectResumeSections(parsed);
          }
        }

        return {
          rawText,
          parsedSections: sections,
          analysisResult: result.atsScore ? (result as ResumeAnalysisResult) : undefined,
        };
      }
    } catch (e) {
      if (e instanceof Error && ((e as any).code === "INVALID_RESUME" || (e as any).code === "EXCEEDED_PAGE_LIMIT" || e.message.includes("resume") || e.message.includes("page limit"))) {
        throw e;
      }
      if (__DEV__) {
        console.log(`Connection attempt to ${baseUrl} unfulfilled, trying fallback...`);
      }
    }
  }

  throw new Error("Unable to connect to backend server for file processing.");
}

/**
 * Service to execute ATS analysis calculations.
 * Attempts to use the high-fidelity SBERT + Gemini FastAPI backend,
 * falling back to local deterministic calculations when offline.
 */
export async function calculateAtsCompatibility(
  rawText: string,
  targetPosition: string
): Promise<ResumeAnalysisResult> {
  if (!rawText.trim()) {
    throw new Error("Resume content is empty. Cannot perform analysis.");
  }
  if (!targetPosition.trim()) {
    throw new Error("Target position is not selected. Cannot perform analysis.");
  }

  // Pre-parse sections for SBERT.
  const parsedSectionsList = parseResumeSections(rawText);
  const parsedSectionsDict: Record<string, string> = {};
  for (const sec of parsedSectionsList) {
    parsedSectionsDict[sec.name] = sec.content;
  }

  // Validate document structure locally.
  function isResumeValidLocal(text: string, sections: Record<string, string>): boolean {
    if (!text.trim() || text.split(/\s+/).filter(Boolean).length < 20) {
      return false;
    }
    return true;
  }

  if (!isResumeValidLocal(rawText, parsedSectionsDict)) {
    throw new Error('The provided document does not appear to be a valid resume.');
  }

  const baseUrls = getBackendBaseUrls();

  // Pre-calculate deterministic scores.
  let localAnalysis: any = null;
  try {
    localAnalysis = analyzeResume(rawText, targetPosition);
  } catch (err) {
    console.log("Local analysis pre-calculation failed, continuing without it.", err);
  }

  // Try the SBERT backend endpoints sequentially
  for (const baseUrl of baseUrls) {
    const url = `${baseUrl}/analyze`;
    try {
      console.log(`Attempting SBERT analysis connection at: ${url}...`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText,
          parsedSections: parsedSectionsDict,
          targetPosition
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Handle backend validation response
        if (result && result.valid === false) {
          const rejectMsg = result.message || "This document doesn't appear to be a resume or CV. Please upload a document containing your academic, professional, or career information.";
          const invalidErr = new Error(rejectMsg);
          (invalidErr as any).code = "INVALID_RESUME";
          throw invalidErr;
        }

        // Ensure array properties exist and derive detectedSections if empty
        result.parsedSections = result.parsedSections || {};
        if (!result.detectedSections || result.detectedSections.length === 0) {
          const parsed = parseResumeSections(rawText);
          result.detectedSections = detectResumeSections(parsed);
        }
        result.missingSections = result.missingSections || [];

        console.log("SBERT Analysis completed successfully from backend!");
        return result as ResumeAnalysisResult;
      }
    } catch (e) {
      if (e instanceof Error && ((e as any).code === "INVALID_RESUME" || (e as any).code === "EXCEEDED_PAGE_LIMIT" || e.message.includes("resume") || e.message.includes("page limit"))) {
        throw e;
      }
      console.log(`Backend endpoint connection failed at ${url}:`, e);
    }
  }

  // Fallback to local deterministic parser if backend is offline/unreachable
  console.log("BACKEND UNREACHABLE! Falling back to local deterministic on-device parser. YOU ARE TESTING THE LOCAL FALLBACK, NOT THE BACKEND.");
  try {
    const localResult = analyzeResume(rawText, targetPosition);
    (localResult as any).isLocalFallback = true;
    return localResult;
  } catch (error) {
    throw new Error(
      `Analysis calculation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
