import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";
import { analyzeResume, parseResumeSections, type ResumeAnalysisResult } from "./resumeAnalysisEngine";

/**
 * Returns prioritized backend candidate URLs supporting dynamic host IP extraction
 * from Metro scriptURL, Expo manifest, Android emulator, iOS simulator, and production endpoints.
 */
export function getBackendBaseUrls(): string[] {
  const urls: string[] = [];
  if (process.env.EXPO_PUBLIC_API_URL) {
    urls.push(process.env.EXPO_PUBLIC_API_URL);
  }
  
  // Expo LAN IP (Useful for physical devices on same WiFi)
  const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.hostUri;
  if (hostUri) {
    const lanIp = hostUri.split(':')[0];
    urls.push(`http://${lanIp}:8000`);
  }

  // Fallbacks
  if (Platform.OS === 'android') {
    urls.push("http://10.0.2.2:8000"); // Emulator
  } else {
    urls.push("http://localhost:8000"); // iOS Simulator / Web
  }
  
  return [...new Set(urls)];
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
  onProgress?: (event: UploadProgressEvent) => void
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
      console.log(`Attempting real-time upload connection to: ${uploadUrl}...`);

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
            reject(new Error(`Server error HTTP ${xhr.status}`));
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

        xhr.open("POST", uploadUrl);
        xhr.send(formData);
      });

      if (result && result.valid !== false) {
        onProgress?.({
          loaded: knownSize,
          total: knownSize,
          progress: 100,
          phase: "processing",
        });

        const sections = result.parsedSections || {};
        const rawText = result.rawText || Object.values(sections).join("\n\n");
        return {
          rawText,
          parsedSections: sections,
          analysisResult: result.atsScore ? (result as ResumeAnalysisResult) : undefined,
        };
      }
    } catch (e) {
      console.log(`Backend upload attempt failed at ${baseUrl}:`, e);
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

  // Pre-parse the sections locally so we can send them to the SBERT backend
  const parsedSectionsList = parseResumeSections(rawText);
  const parsedSectionsDict: Record<string, string> = {};
  for (const sec of parsedSectionsList) {
    parsedSectionsDict[sec.name] = sec.content;
  }

  // Local validation to ensure the document resembles a resume before proceeding
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
  
  // Pre-calculate accurate deterministic frontend scores so the backend doesn't have to guess or hallucinate
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
          throw new Error(result.message || 'Invalid resume according to backend validation.');
        }
        
        // Ensure array properties exist to prevent frontend `.some()` crashes
        result.detectedSections = result.detectedSections || [];
        result.missingSections = result.missingSections || [];
        result.parsedSections = result.parsedSections || {};

        console.log("SBERT Analysis completed successfully from backend!");
        return result as ResumeAnalysisResult;
      }
    } catch (e) {
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

