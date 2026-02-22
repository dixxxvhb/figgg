import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useSyncStatus } from '../../contexts/SyncContext';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
}

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const { triggerSync, syncCalendars, status } = useSyncStatus();
  const [displayDistance, setDisplayDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const directionLockedRef = useRef<'vertical' | 'horizontal' | null>(null);

  const THRESHOLD = 80;
  const MAX_PULL = 120;
  const DIRECTION_LOCK_PX = 15; // Lock direction after this many px of movement

  // Keep ref in sync with state for use in native event handler
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      // Check if touch started inside a nested scrollable element
      let target = e.target as HTMLElement | null;
      while (target && target !== containerRef.current) {
        const isTextarea = target.tagName === 'TEXTAREA';
        if (isTextarea) {
          isPullingRef.current = false;
          return;
        }
        const style = window.getComputedStyle(target);
        const isScrollable = (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          target.scrollHeight > target.clientHeight
        );
        if (isScrollable) {
          isPullingRef.current = false;
          return;
        }
        target = target.parentElement;
      }

      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isPullingRef.current = true;
      pullDistanceRef.current = 0;
      directionLockedRef.current = null;
    }
  }, []);

  // Use native event listener for touchmove
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startYRef.current;
      const diffX = currentX - startXRef.current;

      // Determine direction lock
      if (!directionLockedRef.current) {
        const totalMove = Math.abs(diffX) + Math.abs(diffY);
        if (totalMove > DIRECTION_LOCK_PX) {
          if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal scroll - bail out
            directionLockedRef.current = 'horizontal';
            isPullingRef.current = false;
            return;
          }
          directionLockedRef.current = 'vertical';
        } else {
          return; // Not enough movement to decide yet
        }
      }

      if (directionLockedRef.current !== 'vertical') return;

      // Only activate pull-to-refresh when at top AND pulling down significantly
      if (diffY > DIRECTION_LOCK_PX && el.scrollTop <= 0) {
        e.preventDefault();

        const activePull = diffY - DIRECTION_LOCK_PX;
        const resistance = Math.min(activePull * 0.4, MAX_PULL);
        pullDistanceRef.current = resistance;

        // Update indicator directly via DOM for smooth animation (no React re-render)
        if (indicatorRef.current) {
          indicatorRef.current.style.height = `${resistance}px`;
          indicatorRef.current.style.opacity = '1';
        }
      } else if (diffY < 0) {
        // User is scrolling up, not pulling - disable pull mode
        isPullingRef.current = false;
        pullDistanceRef.current = 0;
      }
    };

    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    const distance = pullDistanceRef.current;
    isPullingRef.current = false;
    pullDistanceRef.current = 0;
    directionLockedRef.current = null;

    if (distance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setDisplayDistance(THRESHOLD * 0.5);

      try {
        // Sync both cloud data AND calendars
        await Promise.all([
          triggerSync(),
          syncCalendars(),
        ]);
        if (onRefresh) {
          await onRefresh();
        }
      } finally {
        setIsRefreshing(false);
        setDisplayDistance(0);
        if (indicatorRef.current) {
          indicatorRef.current.style.height = '0px';
          indicatorRef.current.style.opacity = '0';
        }
      }
    } else {
      // Animate back to 0
      if (indicatorRef.current) {
        indicatorRef.current.style.height = '0px';
        indicatorRef.current.style.opacity = '0';
      }
    }
  }, [isRefreshing, triggerSync, syncCalendars, onRefresh]);

  const progress = Math.min(displayDistance / THRESHOLD, 1);
  const shouldTrigger = displayDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overscroll-y-none"
      style={{ WebkitOverflowScrolling: 'touch' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        ref={indicatorRef}
        className="flex items-center justify-center overflow-hidden transition-[height,opacity] duration-200 ease-out"
        style={{
          height: isRefreshing ? 50 : 0,
          opacity: isRefreshing ? 1 : 0,
        }}
      >
        <div className="flex flex-col items-center gap-1 py-2">
          <RefreshCw
            size={24}
            className={`text-forest-500 transition-transform ${
              isRefreshing || status === 'syncing' ? 'animate-spin' : ''
            }`}
            style={{
              transform: `rotate(${progress * 180}deg)`,
            }}
          />
          <span className="text-xs text-forest-500">
            {isRefreshing || status === 'syncing'
              ? 'Syncing...'
              : shouldTrigger
              ? 'Release to sync'
              : 'Pull to sync'}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
