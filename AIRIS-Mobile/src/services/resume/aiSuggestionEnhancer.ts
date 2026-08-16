import type { ResumeSuggestion } from "./resumeAnalysisEngine";

/**
 * Safe-guard system for resume improvements:
 * Local rules suggest basic formatting improvements. Optional AI can enhance these suggestions later.
 * To keep scoring accurate, the AI is never allowed to modify scores, weights, or route completion rules.
 */
export async function enhanceSuggestions(
  suggestions: ResumeSuggestion[],
  targetPosition: string
): Promise<ResumeSuggestion[]> {
  // Note: We do not call AI services directly from the mobile app because it could leak API secrets.
  // Instead, this will fetch from a secure server backend in the future.

  try {
    const isAiEnhancementEnabled = false; // Toggle this once the server endpoint is ready.

    if (!isAiEnhancementEnabled) {
      // Default to local recommendations if server-side AI is turned off.
      return suggestions;
    }

    // Template for sending suggestions to the backend in the future.
    /*
    const response = await fetch("https://api.airis.edu/v1/resume/enhance-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestions, targetPosition })
    });
    if (response.ok) {
      const data = await response.json();
      return data.enhancedSuggestions;
    }
    */

    return suggestions;
  } catch (err) {
    // If the server fails, fall back to our local recommendations so the app keeps working.
    console.warn("AI enhancement suggestion failed, falling back to deterministic suggestions:", err);
    return suggestions;
  }
}
