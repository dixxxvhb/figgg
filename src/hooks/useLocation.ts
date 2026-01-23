import { useState, useEffect, useCallback } from 'react';
import { UserLocation, Studio } from '../types';
import { getCurrentLocation, findNearestStudio, isNearStudio } from '../services/location';

interface LocationState {
  location: UserLocation | null;
  nearestStudio: { studio: Studio; distance: number } | null;
  isNearCurrentStudio: boolean;
  error: string | null;
  loading: boolean;
}

export function useLocation(studios: Studio[], currentStudioId?: string) {
  const [state, setState] = useState<LocationState>({
    location: null,
    nearestStudio: null,
    isNearCurrentStudio: false,
    error: null,
    loading: false,
  });

  const updateLocation = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const location = await getCurrentLocation();
      const nearest = findNearestStudio(location, studios);

      let isNearCurrent = false;
      if (currentStudioId) {
        const currentStudio = studios.find(s => s.id === currentStudioId);
        if (currentStudio) {
          isNearCurrent = isNearStudio(location, currentStudio);
        }
      }

      setState({
        location,
        nearestStudio: nearest,
        isNearCurrentStudio: isNearCurrent,
        error: null,
        loading: false,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get location',
        loading: false,
      }));
    }
  }, [studios, currentStudioId]);

  useEffect(() => {
    updateLocation();

    // Update location every 5 minutes
    const interval = setInterval(updateLocation, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [updateLocation]);

  return { ...state, refresh: updateLocation };
}
