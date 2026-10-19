export function standardInterviewUiState(state: {
  recording: boolean;
  transcribing: boolean;
  evaluating: boolean;
  error: string | null;
  answer: string;
}) {
  const phase = state.recording ? "recording" : state.transcribing || state.evaluating ? "processing" : state.error ? "error" : "idle";
  return {
    phase,
    showPulse: phase === "recording",
    label: state.transcribing ? "Transcribing your answer…" : state.evaluating ? "Evaluating your answer…" : state.recording ? "Recording — tap to stop" : state.error ? "Please try again" : "Tap the microphone to answer",
    canContinue: Boolean(state.answer.trim()) && phase !== "recording" && phase !== "processing",
  };
}

export type SubmissionOutcome =
  | { kind: "complete" }
  | { kind: "advance"; question: string; questionType: string; benchmark?: string }
  | { kind: "retry"; error: string };

/**
 * Decide what a submitted answer means for progression.
 * A non-final response without a next question is a retryable failure,
 * never a silent advance to a placeholder question.
 */
export function resolveSubmissionOutcome(response: {
  isComplete?: boolean;
  isInteractionEvent?: boolean;
  nextQuestion?: { question?: string; questionType?: string; benchmarkAnswer?: string } | null;
}): SubmissionOutcome {
  if (response?.isComplete) return { kind: "complete" };
  const question = response?.nextQuestion?.question?.trim();
  if (question) {
    return {
      kind: "advance",
      question,
      questionType: response.nextQuestion?.questionType || "follow-up",
      benchmark: response.nextQuestion?.benchmarkAnswer,
    };
  }
  return {
    kind: "retry",
    error: "We couldn't load the next question. Your answer is saved here — please try again.",
  };
}
