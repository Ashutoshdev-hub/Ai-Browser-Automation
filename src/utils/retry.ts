export async function withRetries<T>(
  label: string,
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 400
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  lastErr.message = `[${label}] failed after ${retries + 1} attempts: ${lastErr.message ?? lastErr}`;
  throw lastErr;
}
