/** A saved recording is consumed once, including delayed duplicate bridge events. */
export class AudioHandoffGuard {
  private consumedFiles = new Set<string>();
  private generation = 0;
  private accepting = false;
  private captureId: number | null = null;
  private latestCaptureId = 0;

  start(): void {
    this.generation += 1;
    this.accepting = false;
    this.captureId = null;
  }

  confirmStarted(captureId: unknown): boolean {
    if (!Number.isSafeInteger(captureId) || (captureId as number) <= this.latestCaptureId) return false;
    this.captureId = captureId as number;
    this.latestCaptureId = this.captureId;
    this.accepting = true;
    return true;
  }

  matches(captureId: unknown): boolean {
    return this.captureId !== null && captureId === this.captureId;
  }

  accept(recording: string, captureId: unknown): number | null {
    if (!this.accepting || !this.matches(captureId) || !recording.trim()) return null;
    const isFile = /^(file:\/\/|\/)/.test(recording) || /\.(wav|m4a)$/i.test(recording);
    if (isFile && this.consumedFiles.has(recording.replace(/^file:\/\//, ''))) return null;
    if (isFile) this.consumedFiles.add(recording.replace(/^file:\/\//, ''));
    this.accepting = false;
    return this.generation;
  }

  isCurrent(generation: number): boolean {
    return generation === this.generation;
  }

  cancel(): void {
    this.generation += 1;
    this.accepting = false;
  }
}
