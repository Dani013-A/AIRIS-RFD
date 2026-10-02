/**
 * Pure voice command intent parser for AIRIS Immersive VR / Hands-free interview sessions.
 */
export function parseVRVoiceCommand(
  transcript: string
): "STOP" | "NEXT_QUESTION" | "REPEAT_QUESTION" | null {
  const clean = transcript
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return null;

  const words = clean.split(" ");

  // 1. Explicit termination / exit commands (PRESERVE EXACT WORKING BEHAVIOR)
  const explicitStopPhrases = [
    "stop",
    "stop interview",
    "stop the interview",
    "end interview",
    "end the interview",
    "quit",
    "quit interview",
    "exit",
    "exit interview",
    "cancel interview",
    "terminate interview",
    "stop please",
    "please stop",
  ];

  for (const phrase of explicitStopPhrases) {
    if (clean === phrase) {
      return "STOP";
    }
  }

  if (words.length <= 6) {
    if (/^(please\s+)?(can we|i want to|let'?s)?\s*(stop|end|quit|exit|cancel)\s*(the\s+)?interview(\s+please)?$/.test(clean)) {
      return "STOP";
    }
    if (words.length <= 2 && (words.includes("stop") || words.includes("exit") || words.includes("quit"))) {
      return "STOP";
    }
  }

  // 2. REPEAT intent
  // Guard: must NOT contain advance keywords like "next", "skip", "move on"
  if (!/\b(next|skip|move on|advance)\b/.test(clean)) {
    const explicitRepeatPhrases = [
      "repeat",
      "repeat question",
      "repeat the question",
      "say that again",
      "say again",
      "ask that again",
      "ask again",
      "what was the question",
      "what is the question",
      "pardon",
      "come again",
      "replay the question",
      "replay question",
      "can you repeat",
      "can you repeat that",
      "could you repeat that",
      "can you repeat the question",
      "could you repeat the question",
      "can you say that again",
      "could you say that again",
      "sorry what was the question",
      "what was the question again",
    ];

    for (const phrase of explicitRepeatPhrases) {
      if (clean === phrase) {
        return "REPEAT_QUESTION";
      }
    }

    if (words.length <= 10) {
      if (/\b(repeat|say\s+(that\s+)?again|ask\s+(that\s+)?again|did\s+not\s+hear|didn'?t\s+hear|what\s+was\s+the\s+question|what\s+is\s+the\s+question|didn'?t\s+catch\s+that)\b/.test(clean)) {
        return "REPEAT_QUESTION";
      }
    }
  }

  // 3. NEXT / SKIP intent
  const explicitNextPhrases = [
    "next",
    "next question",
    "next one",
    "next please",
    "please next",
    "skip",
    "skip this",
    "skip this question",
    "skip question",
    "skip this one",
    "skip one",
    "move on",
    "lets move on",
    "let's move on",
    "continue",
    "lets continue",
    "let's continue",
    "proceed",
    "lets proceed",
    "let's proceed",
    "pass",
    "i pass",
    "pass question",
    "pass this question",
    "go to next",
    "go to next question",
    "go to the next question",
    "go to the next one",
  ];

  for (const phrase of explicitNextPhrases) {
    if (clean === phrase) {
      return "NEXT_QUESTION";
    }
  }

  if (words.length <= 10) {
    const pattern = /^(please\s+)?(can we|can you|could you|can i|let'?s|i want to|i would like to|i'd like to)?\s*(move on|skip|continue|proceed|go to|ask|advance|jump to)?\s*(to\s+)?(the\s+)?(next|next question|next one|skip this|skip this question|skip this one|move on)(\s+please)?$/;
    if (pattern.test(clean)) {
      return "NEXT_QUESTION";
    }

    if (/^(can we|can you|could you|let'?s|i want to|i would like to|i'd like to)\s+(move to the next( one| question)?|move on|ask the next question|go to the next question|skip this( question| one)?|continue)\b/.test(clean)) {
      return "NEXT_QUESTION";
    }

    // 1-2 words fallback
    if (words.length <= 2) {
      if (words.includes("next") || words.includes("skip") || words.includes("pass") || words.includes("continue") || words.includes("proceed")) {
        return "NEXT_QUESTION";
      }
    }
  }

  return null;
}
