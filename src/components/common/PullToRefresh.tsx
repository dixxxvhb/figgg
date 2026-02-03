import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useSyncStatus } from '../../contexts/SyncContext';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
}

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const { triggerSync, status } = useSyncStatus();
  const [displayDistance, setDisplayDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const THRESHOLD = 80;
  const MAX_PULL = 120;
  const MIN_PULL_START = 10; // Minimum px before starting pull

  // Keep ref in sync with state for use in native event handler
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
      pullDistanceRef.current = 0;
    }
  }, []);

  // Use native event listener for touchmove
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      // Only activate pull-to-refresh when at top AND pulling down
      if (diff > MIN_PULL_START && el.scrollTop <= 0) {
        // Only prevent default when we're actually pulling to refresh
        e.preventDefault();

        const resistance = Math.min((diff - MIN_PULL_START) * 0.4, MAX_PULL);
        pullDistanceRef.current = resistance;

        // Update indicator directly via DOM for smooth animation (no React re-render)
        if (indicatorRef.current) {
          indicatorRef.current.style.height = `${resistance}px`;
          indicatorRef.current.style.opacity = '1';
        }
      } else if (diff < 0) {
        // User is scrolling down, not pulling - disable pull mode
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

    if (distance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setDisplayDistance(THRESHOLD * 0.5);

      try {
        await triggerSync();
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
  }, [isRefreshing, triggerSync, onRefresh]);

  const progress = Math.min(displayDistance / THRESHOLD, 1);
  const shouldTrigger = displayDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overscroll-none"
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
