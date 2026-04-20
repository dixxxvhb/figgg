/**
 * viewTransitions — cross-browser helper around the View Transitions API.
 *
 * Browser support: Chrome 111+, iOS Safari 18.2+. Feature-detect and
 * gracefully fall through to running the callback immediately when
 * unavailable. Also respects prefers-reduced-motion.
 */

type TransitionCallback = () => void | Promise<void>;

interface DocumentWithViewTransitions {
  startViewTransition?: (cb: () => void | Promise<void>) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
  };
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Run the DOM mutation inside a view transition if supported. Otherwise run
 * synchronously. Returns a promise that resolves when the transition finishes
 * (or immediately in the fallback path).
 */
export function withViewTransition(cb: TransitionCallback): Promise<void> {
  const doc = document as DocumentWithViewTransitions;
  if (prefersReducedMotion() || typeof doc.startViewTransition !== 'function') {
    return Promise.resolve().then(cb);
  }
  try {
    const transition = doc.startViewTransition(cb);
    return transition.finished.catch(() => {});
  } catch {
    return Promise.resolve().then(cb);
  }
}
