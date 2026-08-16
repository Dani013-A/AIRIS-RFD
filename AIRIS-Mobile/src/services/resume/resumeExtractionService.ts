/**
 * Service to handle document text extraction in a React Native/Expo context.
 */
export async function extractTextFromFile(
  fileUri: string,
  fileName: string,
  fileType: string
): Promise<string> {
  const isTxt = fileType === "text/plain" || fileName.toLowerCase().endsWith(".txt");

  if (isTxt) {
    try {
      const response = await fetch(fileUri);
      const rawText = await response.text();
      return rawText;
    } catch {
      throw new Error("Failed to read the plain text file content.");
    }
  }

  // Currently, we only support standard text (.txt) files because formatting other documents requires backend servers.
  throw new Error("Local text extraction is not supported for this file format in the sandboxed environment.");
}
