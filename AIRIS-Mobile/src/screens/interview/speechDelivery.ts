let sequence = Date.now() * 1000;

export class SpeechDelivery {
  private delivered = new Set<string>();
  private active: { utteranceId: string; utteranceSequence: number; completed: boolean } | null = null;

  claim(key: string) {
    if (this.delivered.has(key)) return null;
    this.delivered.add(key);
    const utteranceSequence = ++sequence;
    this.active = { utteranceId: `speech-${utteranceSequence}`, utteranceSequence, completed: false };
    return { utteranceId: this.active.utteranceId, utteranceSequence };
  }

  complete(utteranceId: unknown) {
    if (!this.active || this.active.completed || this.active.utteranceId !== utteranceId) return false;
    this.active.completed = true;
    return true;
  }

  cancel() { this.active = null; }
}
