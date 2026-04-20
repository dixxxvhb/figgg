import { useEffect, useRef, type ReactNode } from 'react';

/**
 * StaggerReveal — wraps direct children in the `stagger` class so each
 * child fades + rises on mount with an editorial 60ms cascade. CSS handles
 * the animation; this component re-triggers it when `resetKey` changes
 * (e.g. when navigating between screens) by briefly removing + reapplying
 * the class in a layout effect.
 *
 * Pair with a route-change key upstream (e.g. the location pathname) so
 * each new page gets its own reveal.
 */
export function StaggerReveal({
  children,
  resetKey,
  className = '',
}: {
  children: ReactNode;
  resetKey?: string | number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('stagger');
    // Force reflow so re-adding the class restarts the animation
    void el.offsetWidth;
    el.classList.add('stagger');
  }, [resetKey]);

  return (
    <div ref={ref} className={`stagger ${className}`.trim()}>
      {children}
    </div>
  );
}
