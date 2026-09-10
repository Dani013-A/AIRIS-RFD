import { getApiBaseUrl } from "../api/apiClient";
import { analyzeResume, parseResumeSections, detectResumeSections, type ResumeAnalysisResult } from "./resumeAnalysisEngine";
import { isResumeValidDocument } from "./resumeNormalizer";
function getAuthInstance() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fb = require("../../config/firebase");
    return fb?.auth || null;
  } catch {
    return null;
  }
}

/**
 * Retrieves cryptographically verified Firebase ID token for backend authentication.
 * Fails closed if no active user session exists.
 */
async function getAuthenticatedIdToken(): Promise<string> {
  const authInstance = getAuthInstance();
  const currentUser = authInstance?.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    if (token) return token;
  }

  // Safe mock in unit test environments where auth session is not initialized
  if (typeof process !== "undefined" && process.env && process.env.JEST_WORKER_ID) {
    return "test-mock-firebase-token";
  }

  const authErr = new Error("Authentication required. Please sign in to upload and analyze your resume.");
  (authErr as any).isHttpError = true;
  (authErr as any).status = 401;
  (authErr as any).code = "AUTHENTICATION_REQUIRED";
  throw authErr;
}

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
  phase: "connecting" | "uploading" | "processing";
}

/**
 * Uploads document file to FastAPI backend with real-time XHR byte progress tracking.
 * Uses 30s request timeout per candidate endpoint to prevent hanging.
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
  const idToken = await getAuthenticatedIdToken();

  for (const baseUrl of baseUrls) {
    try {
      const uploadUrl = `${baseUrl}/upload`;
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log(`Connecting to backend service at ${uploadUrl}...`);
      }

      onProgress?.({
        loaded: 0,
        total: knownSize,
        progress: 0,
        phase: "connecting",
      });

      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.timeout = 60000; // 60s timeout to allow multi-tier OCR and LLM fallback processing

        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.log(`[API Diagnostics] A. URL resolved: ${uploadUrl}`);
          console.log(`[API Diagnostics] B. XHR instance created (timeout: ${xhr.timeout}ms)`);
        }

        xhr.upload.onprogress = (event) => {
          const totalBytes = event.lengthComputable && event.total > 0 ? event.total : knownSize;
          const loadedBytes = event.loaded || 0;
          const percent = totalBytes > 0 ? Math.min(Math.round((loadedBytes / totalBytes) * 100), 99) : 0;

          if (typeof __DEV__ !== "undefined" && __DEV__ && (percent === 0 || percent === 50 || percent === 99)) {
            console.log(`[API Diagnostics] E. Upload progress: ${percent}% (${loadedBytes}/${totalBytes} bytes)`);
          }

          onProgress?.({
            loaded: loadedBytes,
            total: totalBytes,
            progress: percent,
            phase: "uploading",
          });
        };

        xhr.onload = () => {
          if (typeof __DEV__ !== "undefined" && __DEV__) {
            console.log(`[API Diagnostics] F. Server response received: HTTP ${xhr.status}`);
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (err) {
              reject(new Error("Invalid JSON response from server."));
            }
          } else {
            let errorMsg = `Server error HTTP ${xhr.status}`;
            let errorCode = `HTTP_${xhr.status}`;
            try {
              const errJson = JSON.parse(xhr.responseText);
              if (errJson.detail) {
                errorMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
              } else if (errJson.message) {
                errorMsg = typeof errJson.message === "string" ? errJson.message : JSON.stringify(errJson.message);
              }
            } catch {}

            if (errorMsg.includes("exceed 3 pages") || errorMsg.includes("pages long")) {
              errorCode = "EXCEEDED_PAGE_LIMIT";
            } else if (errorMsg.includes("belong to a different individual")) {
              errorCode = "NAME_MISMATCH";
            } else if (errorMsg.includes("doesn't appear to be a resume") || errorMsg.includes("valid resume")) {
              errorCode = "INVALID_RESUME";
            }

            if (typeof __DEV__ !== "undefined" && __DEV__) {
              console.log(`[API Diagnostics] J. HTTP application error: HTTP ${xhr.status} code=${errorCode}`);
            }

            const apiErr = new Error(errorMsg);
            (apiErr as any).isHttpError = true;
            (apiErr as any).status = xhr.status;
            (apiErr as any).code = errorCode;
            reject(apiErr);
          }
        };

        xhr.onerror = () => {
          if (typeof __DEV__ !== "undefined" && __DEV__) {
            console.log(`[API Diagnostics] I. Network connection error on ${uploadUrl}`);
          }
          reject(new Error("Network connection error."));
        };

        xhr.ontimeout = () => {
          if (typeof __DEV__ !== "undefined" && __DEV__) {
            console.log(`[API Diagnostics] G. Request timed out after ${xhr.timeout}ms on ${uploadUrl}`);
          }
          const timeoutErr = new Error("Request timed out. The server took too long to complete the resume analysis.");
          (timeoutErr as any).isHttpError = true;
          (timeoutErr as any).status = 408;
          (timeoutErr as any).code = "TIMEOUT";
          reject(timeoutErr);
        };

        xhr.onabort = () => {
          if (typeof __DEV__ !== "undefined" && __DEV__) {
            console.log(`[API Diagnostics] H. Request aborted on ${uploadUrl}`);
          }
          const abortErr = new Error("Request aborted.");
          (abortErr as any).isHttpError = true;
          (abortErr as any).code = "ABORTED";
          reject(abortErr);
        };

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
        const authInst = getAuthInstance();
        if (authInst?.currentUser?.uid) {
          formData.append("userId", authInst.currentUser.uid);
        }

        xhr.open("POST", uploadUrl);
        if (typeof (xhr as any).setRequestHeader === "function") {
          xhr.setRequestHeader("Authorization", `Bearer ${idToken}`);
        }
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.log(`[API Diagnostics] C. request.open("POST", "${uploadUrl}") succeeded with Authorization header`);
        }

        xhr.send(formData);
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.log(`[API Diagnostics] D. request.send() called`);
        }
      });

      if (result) {
        if (result.valid === false) {
          const rejectMsg = result.message || "This document doesn't appear to be a resume or CV. Please upload a document containing your academic, professional, or career information.";
          const invalidErr = new Error(rejectMsg);
          (invalidErr as any).isHttpError = true;
          (invalidErr as any).status = 400;
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
    } catch (e: any) {
      if (e && (e.isHttpError || e.status || e.code === "TIMEOUT" || e.code === "NETWORK_ERROR" || e.code === "INVALID_RESUME" || e.code === "EXCEEDED_PAGE_LIMIT" || e.code === "NAME_MISMATCH" || String(e?.code).startsWith("HTTP_"))) {
        throw e;
      }
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log(`Connection attempt to ${baseUrl} unfulfilled:`, e?.message || e);
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

  // Validate document structure locally using authoritative validator.
  if (!isResumeValidDocument(rawText, parsedSectionsDict)) {
    const invalidErr = new Error("This document doesn't appear to be a resume or CV. Please upload a document containing your academic, professional, or career information.");
    (invalidErr as any).code = "INVALID_RESUME";
    throw invalidErr;
  }

  const baseUrls = getBackendBaseUrls();

  // Try the SBERT backend endpoints sequentially
  for (const baseUrl of baseUrls) {
    const url = `${baseUrl}/analyze`;
    try {
      const idToken = await getAuthenticatedIdToken();
      console.log(`Attempting SBERT analysis connection at: ${url}...`);
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 60000) : null;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          rawText,
          parsedSections: parsedSectionsDict,
          targetPosition,
          userId: getAuthInstance()?.currentUser?.uid,
        }),
        signal: controller?.signal,
      });
      if (timeoutId) clearTimeout(timeoutId);

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
    if (localResult.atsScore) {
      (localResult.atsScore as any).overallScore = 0; // Fallback score is 0
    }
    return localResult;
  } catch (error) {
    throw new Error(
      `Analysis calculation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
