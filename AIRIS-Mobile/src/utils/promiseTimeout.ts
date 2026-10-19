export class TimeoutError extends Error {
  constructor(message = "The request took too long. Please try again.") {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Race a promise against a timeout. On expiry the caller should abandon
 * the late result (e.g. via a request-id guard); the underlying work
 * cannot always be cancelled, but the UI must never stay stuck.
 */
export function withTimeout<T>(work: Promise<T>, ms: number, message?: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message)), ms);
  });
  return Promise.race([work, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
