import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useSyncStatus } from '../../contexts/SyncContext';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
}

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const { triggerSync, status } = useSyncStatus();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const THRESHOLD = 80;
  const MAX_PULL = 120;
  const MIN_PULL_START = 5; // Minimum px before starting pull (avoids false triggers from iOS momentum)

  // Keep ref in sync with state for use in native event handler
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, []);

  // Use native event listener for touchmove with { passive: false }
  // so we can call preventDefault() to stop Safari bounce-scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      if (diff > MIN_PULL_START && el.scrollTop === 0) {
        e.preventDefault(); // Prevent Safari bounce scroll
        const resistance = Math.min((diff - MIN_PULL_START) * 0.5, MAX_PULL);
        setPullDistance(resistance);
      }
    };

    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    isPullingRef.current = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD * 0.5);

      try {
        await triggerSync();
        if (onRefresh) {
          await onRefresh();
        }
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, triggerSync, onRefresh]);

  const isActive = pullDistance > 0 || isRefreshing;
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const shouldTrigger = pullDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{
          height: isActive ? Math.max(pullDistance, isRefreshing ? 50 : 0) : 0,
          opacity: isActive ? 1 : 0,
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
