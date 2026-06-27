'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { encodeGrid } from '@/lib/location/geohash';
import { type LastLocationFetch, shouldRefreshLocation } from '@/lib/location/useMovingLocationCore';

export type LocationState = {
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';
  lat?: number;
  lng?: number;
  grid?: string;
  message?: string;
};

export function useMovingLocation(onRefresh: (position: { lat: number; lng: number; grid: string }) => void) {
  const [state, setState] = useState<LocationState>({ status: 'idle' });
  const lastFetch = useRef<LastLocationFetch | null>(null);
  const watchId = useRef<number | null>(null);
  const watchEnabled = useRef(false);
  const requestInFlight = useRef(false);

  const stopWatch = useCallback(() => {
    if (watchId.current === null) return;
    navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const acceptPosition = useCallback((position: GeolocationPosition) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const grid = encodeGrid(lat, lng);
    const now = Date.now();
    setState({ status: 'granted', lat, lng, grid });

    if (shouldRefreshLocation(lastFetch.current, { lat, lng, grid, now })) {
      lastFetch.current = { lat, lng, grid, fetchedAt: now };
      onRefresh({ lat, lng, grid });
    }
  }, [onRefresh]);

  const startWatch = useCallback(() => {
    if (!watchEnabled.current) return;
    if (!('geolocation' in navigator)) return;
    if (document.visibilityState !== 'visible' || watchId.current !== null) return;

    watchId.current = navigator.geolocation.watchPosition(
      acceptPosition,
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 10_000 },
    );
  }, [acceptPosition]);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      watchEnabled.current = false;
      stopWatch();
      setState({ status: 'unsupported', message: '이 브라우저에서는 위치 권한을 사용할 수 없어요.' });
      return;
    }
    if (requestInFlight.current) return;

    requestInFlight.current = true;
    setState((current) => ({ ...current, status: 'requesting', message: undefined }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        requestInFlight.current = false;
        watchEnabled.current = true;
        acceptPosition(position);
        startWatch();
      },
      () => {
        requestInFlight.current = false;
        watchEnabled.current = false;
        stopWatch();
        setState({ status: 'denied', message: '위치 권한 없이도 조용히 둘러볼 수 있어요.' });
      },
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 10_000 },
    );
  }, [acceptPosition, startWatch, stopWatch]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return undefined;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') startWatch();
      else stopWatch();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    startWatch();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopWatch();
    };
  }, [startWatch, stopWatch]);

  return { state, requestLocation };
}
