/**
 * Shared helpers for Anthropic API calls across Cloud Functions.
 *
 * - withRetryOn429: bounded retry with exponential backoff + jitter, gated on 429 / rate_limit_error only.
 * - withTimeout: races a promise against a setTimeout reject so a single slow API call can't starve a batch.
 */

interface MaybeAnthropicError {
  status?: unknown;
  type?: unknown;
}

function isRateLimitError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const e = err as MaybeAnthropicError;
  if (typeof e.status === "number" && e.status === 429) return true;
  if (typeof e.type === "string" && e.type === "rate_limit_error") return true;
  return false;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

/**
 * Wraps an Anthropic call with bounded retry on 429 / rate_limit_error.
 *
 * - Up to 3 attempts.
 * - Exponential backoff with jitter: ~500ms, ~1000ms (plus 0–250ms jitter each).
 * - Any non-429 error propagates immediately (caller handles).
 * - On final failed attempt, the underlying error is re-thrown unchanged.
 */
export async function withRetryOn429<T>(
  fn: () => Promise<T>,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err) || attempt === maxAttempts) {
        throw err;
      }
      const backoff = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, backoff + jitter));
    }
  }
  // Unreachable — the loop either returns or throws — but TS needs it.
  throw lastErr;
}

/**
 * Races a promise against a timeout. If `ms` elapses before `promise` settles,
 * rejects with `new Error(label ?? 'timeout')`. The original promise keeps
 * running in the background (unavoidable without AbortController plumbing) but
 * its result is ignored.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(label ?? "timeout"));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
