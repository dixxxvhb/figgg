import React, { useState, useRef, useCallback } from 'react';
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

  const THRESHOLD = 80; // Pull distance to trigger refresh
  const MAX_PULL = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start pull if at top of scroll
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      // Apply resistance as you pull further
      const resistance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(resistance);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    isPullingRef.current = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD * 0.5); // Keep a small indicator

      try {
        // Trigger cloud sync
        await triggerSync();
        // Also call custom onRefresh if provided
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
      onTouchMove={handleTouchMove}
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
