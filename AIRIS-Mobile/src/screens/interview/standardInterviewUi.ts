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
