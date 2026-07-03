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

type DebugPermissionState = PermissionState | 'unsupported' | 'unknown' | 'query-error';
type LocationSource = 'getCurrentPosition' | 'watchPosition';

export type LocationDebugInfo = {
  supported: boolean;
  secureContext: boolean;
  protocol: string;
  host: string;
  permissionState: DebugPermissionState;
  permissionStateBefore?: DebugPermissionState;
  permissionStateAfter?: DebugPermissionState;
  requestCount: number;
  inFlight: boolean;
  watchInFlight?: boolean;
  watchStartedAt?: string;
  watchFinishedAt?: string;
  watchElapsedMs?: number;
  watchLastOutcome?: 'started' | 'success' | 'error';
  watchLastErrorCode?: number;
  watchLastErrorName?: string;
  watchLastErrorMessage?: string;
  lastStartedAt?: string;
  lastFinishedAt?: string;
  lastElapsedMs?: number;
  lastOutcome?: 'started' | 'success' | 'error' | 'unsupported';
  lastSource?: LocationSource;
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
const WATCH_LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 };

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

async function queryGeolocationPermissionState(): Promise<DebugPermissionState> {
  if (!('permissions' in navigator)) return 'unsupported';

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return permission.state;
  } catch {
    return 'query-error';
  }
}

function getLocationErrorName(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return 'PERMISSION_DENIED';
  if (error.code === error.POSITION_UNAVAILABLE) return 'POSITION_UNAVAILABLE';
  if (error.code === error.TIMEOUT) return 'TIMEOUT';
  return `UNKNOWN_${error.code}`;
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

function getElapsedMs(startedAt: number | null, finishedAt: number) {
  return startedAt ? finishedAt - startedAt : undefined;
}

export function useMovingLocation(onRefresh: (position: { lat: number; lng: number; grid: string }) => void) {
  const [state, setState] = useState<LocationState>({ status: 'idle' });
  const [debugInfo, setDebugInfo] = useState<LocationDebugInfo>(() => createInitialDebugInfo());
  const lastFetch = useRef<LastLocationFetch | null>(null);
  const requestInFlight = useRef(false);
  const watchInFlight = useRef(false);
  const requestStartedAt = useRef<number | null>(null);
  const watchStartedAt = useRef<number | null>(null);
  const watchId = useRef<number | null>(null);
  const activeAttemptId = useRef(0);
  const attemptSettled = useRef(false);

  const clearActiveWatch = useCallback(() => {
    if (watchId.current === null || !('geolocation' in navigator)) return;
    if (typeof navigator.geolocation.clearWatch !== 'function') {
      watchId.current = null;
      return;
    }
    navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const updatePermissionDebug = useCallback((key: 'permissionStateBefore' | 'permissionStateAfter') => {
    if (!('permissions' in navigator)) {
      setDebugInfo((current) => ({ ...current, permissionState: 'unsupported', [key]: 'unsupported' }));
      return;
    }

    void queryGeolocationPermissionState().then((permissionState) => {
      setDebugInfo((current) => ({ ...current, permissionState, [key]: permissionState }));
    });
  }, []);

  const acceptPosition = useCallback((
    position: GeolocationPosition,
    options: RequestLocationOptions = {},
    source: LocationSource,
    attemptId: number,
  ) => {
    if (attemptId !== activeAttemptId.current || attemptSettled.current) return;

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const grid = encodeGrid(lat, lng);
    const now = Date.now();
    const sourceStartedAt = source === 'watchPosition' ? watchStartedAt.current : requestStartedAt.current;
    restoredGrantedPermissionInPage = true;
    attemptSettled.current = true;
    requestInFlight.current = false;
    watchInFlight.current = false;
    clearActiveWatch();
    setState({ status: 'granted', lat, lng, grid });
    setDebugInfo((current) => ({
      ...current,
      inFlight: false,
      watchInFlight: false,
      watchFinishedAt: source === 'watchPosition' ? new Date(now).toISOString() : current.watchFinishedAt,
      watchElapsedMs: source === 'watchPosition' ? getElapsedMs(watchStartedAt.current, now) : current.watchElapsedMs,
      watchLastOutcome: source === 'watchPosition' ? 'success' : current.watchLastOutcome,
      watchLastErrorCode: source === 'watchPosition' ? undefined : current.watchLastErrorCode,
      watchLastErrorName: source === 'watchPosition' ? undefined : current.watchLastErrorName,
      watchLastErrorMessage: source === 'watchPosition' ? undefined : current.watchLastErrorMessage,
      lastFinishedAt: new Date(now).toISOString(),
      lastElapsedMs: getElapsedMs(sourceStartedAt, now),
      lastOutcome: 'success',
      lastSource: source,
      lastErrorCode: undefined,
      lastErrorName: undefined,
      lastErrorMessage: undefined,
      lastAccuracyMeters: position.coords.accuracy,
    }));
    updatePermissionDebug('permissionStateAfter');

    if (shouldRefreshLocation(lastFetch.current, { lat, lng, grid, now, force: options.forceRefresh })) {
      lastFetch.current = { lat, lng, grid, fetchedAt: now };
      onRefresh({ lat, lng, grid });
    }
  }, [clearActiveWatch, onRefresh, updatePermissionDebug]);

  const rejectPosition = useCallback((error: GeolocationPositionError, source: LocationSource, attemptId: number) => {
    if (attemptId !== activeAttemptId.current || attemptSettled.current) return;

    const now = Date.now();
    const sourceStartedAt = source === 'watchPosition' ? watchStartedAt.current : requestStartedAt.current;
    if (source === 'watchPosition') {
      watchInFlight.current = false;
      clearActiveWatch();
    } else {
      requestInFlight.current = false;
    }
    setState((current) => current.status === 'granted' ? current : ({ ...current, ...getLocationErrorState(error) }));
    setDebugInfo((current) => ({
      ...current,
      inFlight: requestInFlight.current,
      watchInFlight: watchInFlight.current,
      watchFinishedAt: source === 'watchPosition' ? new Date(now).toISOString() : current.watchFinishedAt,
      watchElapsedMs: source === 'watchPosition' ? getElapsedMs(watchStartedAt.current, now) : current.watchElapsedMs,
      watchLastOutcome: source === 'watchPosition' ? 'error' : current.watchLastOutcome,
      watchLastErrorCode: source === 'watchPosition' ? error.code : current.watchLastErrorCode,
      watchLastErrorName: source === 'watchPosition' ? getLocationErrorName(error) : current.watchLastErrorName,
      watchLastErrorMessage: source === 'watchPosition' ? error.message || '(empty message)' : current.watchLastErrorMessage,
      lastFinishedAt: new Date(now).toISOString(),
      lastElapsedMs: getElapsedMs(sourceStartedAt, now),
      lastOutcome: 'error',
      lastSource: source,
      lastErrorCode: error.code,
      lastErrorName: getLocationErrorName(error),
      lastErrorMessage: error.message || '(empty message)',
      lastAccuracyMeters: undefined,
    }));
    updatePermissionDebug('permissionStateAfter');

    if (!requestInFlight.current && !watchInFlight.current) {
      attemptSettled.current = true;
    }
  }, [clearActiveWatch, updatePermissionDebug]);

  const requestLocation = useCallback((options: RequestLocationOptions = {}) => {
    if (!('geolocation' in navigator) || typeof navigator.geolocation.getCurrentPosition !== 'function') {
      setState({ status: 'unsupported', message: LOCATION_UNSUPPORTED_MESSAGE });
      setDebugInfo((current) => ({
        ...current,
        supported: false,
        inFlight: false,
        watchInFlight: false,
        lastFinishedAt: new Date().toISOString(),
        lastOutcome: 'unsupported',
      }));
      return;
    }
    const canWatchPosition = typeof navigator.geolocation.watchPosition === 'function';
    if ((requestInFlight.current || watchInFlight.current) && !options.forceRefresh) return;
    if (requestInFlight.current || watchInFlight.current) {
      attemptSettled.current = true;
      clearActiveWatch();
    }

    const startedAt = Date.now();
    const attemptId = activeAttemptId.current + 1;
    activeAttemptId.current = attemptId;
    attemptSettled.current = false;
    requestStartedAt.current = startedAt;
    watchStartedAt.current = startedAt;
    requestInFlight.current = true;
    watchInFlight.current = canWatchPosition;
    setState((current) => ({ ...current, status: 'requesting', message: undefined }));
    setDebugInfo((current) => ({
      ...current,
      supported: true,
      secureContext: window.isSecureContext,
      protocol: window.location.protocol,
      host: window.location.host,
      requestCount: current.requestCount + 1,
      inFlight: true,
      watchInFlight: canWatchPosition,
      watchStartedAt: canWatchPosition ? new Date(startedAt).toISOString() : undefined,
      watchFinishedAt: undefined,
      watchElapsedMs: undefined,
      watchLastOutcome: canWatchPosition ? 'started' : undefined,
      watchLastErrorCode: undefined,
      watchLastErrorName: undefined,
      watchLastErrorMessage: undefined,
      lastStartedAt: new Date(startedAt).toISOString(),
      lastFinishedAt: undefined,
      lastElapsedMs: undefined,
      lastOutcome: 'started',
      lastSource: undefined,
      lastErrorCode: undefined,
      lastErrorName: undefined,
      lastErrorMessage: undefined,
      lastAccuracyMeters: undefined,
    }));
    updatePermissionDebug('permissionStateBefore');

    navigator.geolocation.getCurrentPosition(
      (position) => acceptPosition(position, options, 'getCurrentPosition', attemptId),
      (error) => rejectPosition(error, 'getCurrentPosition', attemptId),
      QUICK_LOCATION_OPTIONS,
    );
    if (canWatchPosition) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => acceptPosition(position, options, 'watchPosition', attemptId),
        (error) => rejectPosition(error, 'watchPosition', attemptId),
        WATCH_LOCATION_OPTIONS,
      );
    }
  }, [acceptPosition, clearActiveWatch, rejectPosition, updatePermissionDebug]);

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

  useEffect(() => () => {
    attemptSettled.current = true;
    requestInFlight.current = false;
    watchInFlight.current = false;
    clearActiveWatch();
  }, [clearActiveWatch]);

  return { state, requestLocation, debugInfo };
}
