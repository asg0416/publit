'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { encodeGrid } from '@/lib/location/geohash';
import { type LastLocationFetch, shouldRefreshLocation } from '@/lib/location/useMovingLocationCore';

export type LocationState = {
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported' | 'unavailable';
  lat?: number;
  lng?: number;
  grid?: string;
  message?: string;
};

type RequestLocationOptions = {
  forceRefresh?: boolean;
};

const LOCATION_UNSUPPORTED_MESSAGE = '이 브라우저에서는 위치 권한을 사용할 수 없어요.';
const LOCATION_DENIED_MESSAGE = '브라우저나 OS에서 위치 권한이 막혀 있어요. 주소창 또는 시스템 위치 설정을 확인해주세요.';
const LOCATION_UNAVAILABLE_MESSAGE = '권한은 요청됐지만 현재 위치를 가져오지 못했어요. PC의 위치 서비스나 네트워크 위치를 확인한 뒤 다시 시도해주세요.';
const LOCATION_TIMEOUT_MESSAGE = '위치 확인 시간이 초과됐어요. PC의 위치 서비스나 네트워크 연결을 확인한 뒤 다시 시도해주세요.';
const LOCATION_WATCH_FALLBACK_TIMEOUT_MS = 35_000;
const LOCATION_WATCH_TRANSIENT_ERROR_GRACE_MS = 12_000;

let restoredGrantedPermissionInPage = false;

function getLocationErrorState(error: GeolocationPositionError): Pick<LocationState, 'status' | 'message'> {
  if (error.code === error.PERMISSION_DENIED) {
    return { status: 'denied', message: LOCATION_DENIED_MESSAGE };
  }
  if (error.code === error.TIMEOUT) {
    return { status: 'unavailable', message: LOCATION_TIMEOUT_MESSAGE };
  }
  return { status: 'unavailable', message: LOCATION_UNAVAILABLE_MESSAGE };
}

export function useMovingLocation(onRefresh: (position: { lat: number; lng: number; grid: string }) => void) {
  const [state, setState] = useState<LocationState>({ status: 'idle' });
  const lastFetch = useRef<LastLocationFetch | null>(null);
  const requestInFlight = useRef(false);
  const fallbackWatch = useRef<{ id: number; timeoutId: number; transientErrorTimeoutId?: number | null } | null>(null);

  const clearFallbackWatch = useCallback(() => {
    const current = fallbackWatch.current;
    if (!current) return;
    fallbackWatch.current = null;
    window.clearTimeout(current.timeoutId);
    if (current.transientErrorTimeoutId) window.clearTimeout(current.transientErrorTimeoutId);
    navigator.geolocation.clearWatch(current.id);
  }, []);

  const acceptPosition = useCallback((position: GeolocationPosition, options: RequestLocationOptions = {}) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const grid = encodeGrid(lat, lng);
    const now = Date.now();
    restoredGrantedPermissionInPage = true;
    setState({ status: 'granted', lat, lng, grid });

    if (shouldRefreshLocation(lastFetch.current, { lat, lng, grid, now, force: options.forceRefresh })) {
      lastFetch.current = { lat, lng, grid, fetchedAt: now };
      onRefresh({ lat, lng, grid });
    }
  }, [onRefresh]);

  const rejectPosition = useCallback((error: GeolocationPositionError) => {
    clearFallbackWatch();
    requestInFlight.current = false;
    const next = getLocationErrorState(error);
    setState((current) => ({ ...current, ...next }));
  }, [clearFallbackWatch]);

  const acceptRequestedPosition = useCallback((position: GeolocationPosition, options: RequestLocationOptions = {}) => {
    clearFallbackWatch();
    requestInFlight.current = false;
    acceptPosition(position, options);
  }, [acceptPosition, clearFallbackWatch]);

  const startTimeoutFallbackWatch = useCallback((error: GeolocationPositionError, options: RequestLocationOptions = {}) => {
    if (fallbackWatch.current || !navigator.geolocation.watchPosition) {
      rejectPosition(error);
      return;
    }

    let settled = false;
    let watchId = 0;
    let latestError = error;
    let transientErrorTimeoutId: number | null = null;
    const finishWithError = (nextError: GeolocationPositionError) => {
      if (settled) return;
      settled = true;
      rejectPosition(nextError);
    };
    const timeoutId = window.setTimeout(() => {
      finishWithError(error);
    }, LOCATION_WATCH_FALLBACK_TIMEOUT_MS);
    const holdTransientError = (nextError: GeolocationPositionError) => {
      if (settled) return;
      if (nextError.code === nextError.PERMISSION_DENIED) {
        finishWithError(nextError);
        return;
      }
      latestError = nextError;
      if (transientErrorTimeoutId) window.clearTimeout(transientErrorTimeoutId);
      transientErrorTimeoutId = window.setTimeout(() => {
        finishWithError(latestError);
      }, LOCATION_WATCH_TRANSIENT_ERROR_GRACE_MS);
      if (fallbackWatch.current) fallbackWatch.current.transientErrorTimeoutId = transientErrorTimeoutId;
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (settled) return;
        settled = true;
        acceptRequestedPosition(position, options);
      },
      holdTransientError,
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: LOCATION_WATCH_FALLBACK_TIMEOUT_MS },
    );
    fallbackWatch.current = { id: watchId, timeoutId, transientErrorTimeoutId };
  }, [acceptRequestedPosition, rejectPosition]);

  const requestLocation = useCallback((options: RequestLocationOptions = {}) => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported', message: LOCATION_UNSUPPORTED_MESSAGE });
      return;
    }
    if (requestInFlight.current) return;

    requestInFlight.current = true;
    setState((current) => ({ ...current, status: 'requesting', message: undefined }));
    navigator.geolocation.getCurrentPosition(
      (position) => acceptRequestedPosition(position, options),
      (error) => {
        if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
          startTimeoutFallbackWatch(error, options);
          return;
        }
        rejectPosition(error);
      },
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 10_000 },
    );
  }, [acceptRequestedPosition, rejectPosition, startTimeoutFallbackWatch]);

  useEffect(() => {
    if (restoredGrantedPermissionInPage) return undefined;
    if (!('geolocation' in navigator) || !('permissions' in navigator)) return undefined;

    let cancelled = false;
    navigator.permissions.query({ name: 'geolocation' as PermissionName })
      .then((permission) => {
        if (cancelled || restoredGrantedPermissionInPage) return;
        if (permission.state !== 'granted') return;
        restoredGrantedPermissionInPage = true;
        requestLocation();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [requestLocation]);

  useEffect(() => () => {
    clearFallbackWatch();
  }, [clearFallbackWatch]);

  return { state, requestLocation };
}
