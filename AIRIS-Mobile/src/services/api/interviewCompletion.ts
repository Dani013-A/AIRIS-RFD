export function assertCompletedInterviewReport(report: any, sessionId: string): void {
  if (!/^[a-f0-9]{32}$/.test(sessionId) || report?.sessionId !== sessionId
    || report.reportId !== sessionId || report.status !== 'completed' || report.persisted !== true
    || !Number.isSafeInteger(report.completedAt) || report.completedAt <= 0
    || !Number.isFinite(report.overallPerformance) || report.overallPerformance < 0 || report.overallPerformance > 100) {
    throw new Error("We couldn't confirm that your interview results were saved. Please check the status or retry.");
  }
}

export class InterviewCompletionError extends Error {
  constructor(public readonly status: number) {
    const messages: Record<number, string> = {
      400: 'This interview does not yet have the server evidence required for completion.',
      401: 'Please sign in again with the account that owns this interview.',
      403: 'This account is not authorized to complete the interview.',
      404: 'This interview is unavailable for the signed-in account or service version.',
      409: 'This interview was cancelled or changed and cannot be finalized in its current state.',
      410: 'This interview session has expired. Please start a new interview.',
      422: 'The interview service needs a compatible update before this session can be completed.',
    };
    super(messages[status] ?? 'Interview saving could not be confirmed. Please retry.');
    this.name = 'InterviewCompletionError';
  }
  get retryable(): boolean { return this.status >= 500 || this.status === 429; }
}
