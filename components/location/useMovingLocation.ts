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

export type LocationDebugInfo = {
  supported: boolean;
  secureContext: boolean;
  protocol: string;
  host: string;
  permissionState: PermissionState | 'unsupported' | 'unknown' | 'query-error';
  requestCount: number;
  inFlight: boolean;
  backgroundInFlight?: boolean;
  backgroundStartedAt?: string;
  lastStartedAt?: string;
  lastFinishedAt?: string;
  lastElapsedMs?: number;
  lastOutcome?: 'started' | 'success' | 'error' | 'unsupported';
  lastErrorCode?: number;
  lastErrorName?: string;
  lastErrorMessage?: string;
  lastAccuracyMeters?: number;
  userAgent: string;
  platform: string;
};

type RequestLocationOptions = {
  forceRefresh?: boolean;
};

const LOCATION_UNSUPPORTED_MESSAGE = '이 브라우저에서는 위치 권한을 사용할 수 없어요.';
const LOCATION_DENIED_MESSAGE = '브라우저나 OS에서 위치 권한이 막혀 있어요. 주소창 또는 시스템 위치 설정을 확인해주세요.';
const LOCATION_UNAVAILABLE_MESSAGE = '권한은 요청됐지만 현재 위치를 가져오지 못했어요. PC의 위치 서비스나 네트워크 위치를 확인한 뒤 다시 시도해주세요.';
const LOCATION_TIMEOUT_MESSAGE = '위치 확인 시간이 초과됐어요. PC의 위치 서비스나 네트워크 연결을 확인한 뒤 다시 시도해주세요.';
const QUICK_LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: false, maximumAge: 30_000, timeout: 10_000 };
const BACKGROUND_LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 60_000 };

let restoredGrantedPermissionInPage = false;

function getNavigatorPlatform() {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return nav.userAgentData?.platform ?? navigator.platform ?? 'unknown';
}

function createInitialDebugInfo(): LocationDebugInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supported: false,
      secureContext: false,
      protocol: '',
      host: '',
      permissionState: 'unknown',
      requestCount: 0,
      inFlight: false,
      userAgent: '',
      platform: '',
    };
  }

  return {
    supported: 'geolocation' in navigator,
    secureContext: window.isSecureContext,
    protocol: window.location.protocol,
    host: window.location.host,
    permissionState: 'permissions' in navigator ? 'unknown' : 'unsupported',
    requestCount: 0,
    inFlight: false,
    userAgent: navigator.userAgent,
    platform: getNavigatorPlatform(),
  };
}

function getLocationErrorName(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return 'PERMISSION_DENIED';
  if (error.code === error.POSITION_UNAVAILABLE) return 'POSITION_UNAVAILABLE';
  if (error.code === error.TIMEOUT) return 'TIMEOUT';
  return `UNKNOWN_${error.code}`;
}

function shouldContinueResolvingLocation(error: GeolocationPositionError) {
  return error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE;
}

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
  const [debugInfo, setDebugInfo] = useState<LocationDebugInfo>(() => createInitialDebugInfo());
  const lastFetch = useRef<LastLocationFetch | null>(null);
  const requestInFlight = useRef(false);
  const backgroundRequestInFlight = useRef(false);
  const requestStartedAt = useRef<number | null>(null);
  const backgroundStartedAt = useRef<number | null>(null);

  const acceptPosition = useCallback((position: GeolocationPosition, options: RequestLocationOptions = {}) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const grid = encodeGrid(lat, lng);
    const now = Date.now();
    restoredGrantedPermissionInPage = true;
    requestInFlight.current = false;
    backgroundRequestInFlight.current = false;
    setState({ status: 'granted', lat, lng, grid });
    setDebugInfo((current) => ({
      ...current,
      inFlight: false,
      backgroundInFlight: false,
      lastFinishedAt: new Date(now).toISOString(),
      lastElapsedMs: requestStartedAt.current ? now - requestStartedAt.current : backgroundStartedAt.current ? now - backgroundStartedAt.current : undefined,
      lastOutcome: 'success',
      lastErrorCode: undefined,
      lastErrorName: undefined,
      lastErrorMessage: undefined,
      lastAccuracyMeters: position.coords.accuracy,
    }));

    if (shouldRefreshLocation(lastFetch.current, { lat, lng, grid, now, force: options.forceRefresh })) {
      lastFetch.current = { lat, lng, grid, fetchedAt: now };
      onRefresh({ lat, lng, grid });
    }
  }, [onRefresh]);

  const continueResolvingPositionInBackground = useCallback((options: RequestLocationOptions = {}) => {
    if (backgroundRequestInFlight.current || !('geolocation' in navigator)) return;

    const startedAt = Date.now();
    backgroundStartedAt.current = startedAt;
    backgroundRequestInFlight.current = true;
    setDebugInfo((current) => ({
      ...current,
      requestCount: current.requestCount + 1,
      backgroundInFlight: true,
      backgroundStartedAt: new Date(startedAt).toISOString(),
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        backgroundRequestInFlight.current = false;
        acceptPosition(position, options);
      },
      (error) => {
        const now = Date.now();
        backgroundRequestInFlight.current = false;
        setDebugInfo((current) => ({
          ...current,
          backgroundInFlight: false,
          lastFinishedAt: new Date(now).toISOString(),
          lastElapsedMs: now - startedAt,
          lastOutcome: 'error',
          lastErrorCode: error.code,
          lastErrorName: getLocationErrorName(error),
          lastErrorMessage: error.message || '(empty message)',
          lastAccuracyMeters: undefined,
        }));
      },
      BACKGROUND_LOCATION_OPTIONS,
    );
  }, [acceptPosition]);

  const rejectPosition = useCallback((error: GeolocationPositionError) => {
    const now = Date.now();
    requestInFlight.current = false;
    const next = getLocationErrorState(error);
    setState((current) => ({ ...current, ...next }));
    setDebugInfo((current) => ({
      ...current,
      inFlight: false,
      lastFinishedAt: new Date(now).toISOString(),
      lastElapsedMs: requestStartedAt.current ? now - requestStartedAt.current : undefined,
      lastOutcome: 'error',
      lastErrorCode: error.code,
      lastErrorName: getLocationErrorName(error),
      lastErrorMessage: error.message || '(empty message)',
      lastAccuracyMeters: undefined,
    }));
    if (shouldContinueResolvingLocation(error)) {
      continueResolvingPositionInBackground();
    }
  }, [continueResolvingPositionInBackground]);

  const acceptRequestedPosition = useCallback((position: GeolocationPosition, options: RequestLocationOptions = {}) => {
    requestInFlight.current = false;
    acceptPosition(position, options);
  }, [acceptPosition]);

  const requestLocation = useCallback((options: RequestLocationOptions = {}) => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported', message: LOCATION_UNSUPPORTED_MESSAGE });
      setDebugInfo((current) => ({
        ...current,
        supported: false,
        inFlight: false,
        lastFinishedAt: new Date().toISOString(),
        lastOutcome: 'unsupported',
      }));
      return;
    }
    if (requestInFlight.current) return;

    const startedAt = Date.now();
    requestStartedAt.current = startedAt;
    requestInFlight.current = true;
    setState((current) => ({ ...current, status: 'requesting', message: undefined }));
    setDebugInfo((current) => ({
      ...current,
      supported: true,
      secureContext: window.isSecureContext,
      protocol: window.location.protocol,
      host: window.location.host,
      requestCount: current.requestCount + 1,
      inFlight: true,
      lastStartedAt: new Date(startedAt).toISOString(),
      lastFinishedAt: undefined,
      lastElapsedMs: undefined,
      lastOutcome: 'started',
      lastErrorCode: undefined,
      lastErrorName: undefined,
      lastErrorMessage: undefined,
    }));
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((permission) => {
          setDebugInfo((current) => ({ ...current, permissionState: permission.state }));
        })
        .catch(() => {
          setDebugInfo((current) => ({ ...current, permissionState: 'query-error' }));
        });
    }
    navigator.geolocation.getCurrentPosition(
      (position) => acceptRequestedPosition(position, options),
      rejectPosition,
      QUICK_LOCATION_OPTIONS,
    );
  }, [acceptRequestedPosition, rejectPosition]);

  useEffect(() => {
    if (restoredGrantedPermissionInPage) return undefined;
    if (!('geolocation' in navigator) || !('permissions' in navigator)) return undefined;

    let cancelled = false;
    navigator.permissions.query({ name: 'geolocation' as PermissionName })
      .then((permission) => {
        setDebugInfo((current) => ({ ...current, permissionState: permission.state }));
        if (cancelled || restoredGrantedPermissionInPage) return;
        if (permission.state !== 'granted') return;
        requestLocation();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [requestLocation]);

  return { state, requestLocation, debugInfo };
}
