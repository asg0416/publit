'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { getZoomForThoughtRange } from '@/lib/map/rangeViewport';
import type { ThoughtRangeValue } from '@/lib/flame/types';

type MapCenter = {
  lat: number;
  lng: number;
};

type MapBackgroundProps = {
  center?: MapCenter | null;
  isTracking?: boolean;
  language?: 'ko' | 'en';
  rangeValue: ThoughtRangeValue;
  onCameraChange?: (camera: MapCameraChange) => void;
};

export type MapCameraChange = {
  center: MapCenter;
  zoom: number;
  source: 'programmatic' | 'user';
  gesture?: 'pan' | 'zoom';
  settled?: boolean;
};

type MapGlotEventName = 'dragstart' | 'moveend' | 'zoom' | 'zoomend' | 'zoomstart';

type MapGlotMap = {
  easeTo?: (options: { center?: [number, number]; zoom?: number; duration?: number; essential?: boolean }) => void;
  getCenter?: () => { lat: number; lng: number };
  getZoom?: () => number;
  off?: (event: MapGlotEventName, handler: () => void) => void;
  on?: (event: MapGlotEventName, handler: () => void) => void;
  remove?: () => void;
  resize?: () => void;
  setLanguage?: (language: string) => void;
  setCenter?: (center: [number, number]) => void;
  setZoom?: (zoom: number) => void;
};

type MapGlotGlobal = {
  map: (container: string | HTMLElement, options: {
    key: string;
    center?: [number, number];
    zoom?: number;
    style?: 'liberty' | 'bright' | 'positron';
    view?: '2d' | '3d' | 'minimal';
    search?: boolean;
    clickToAddress?: boolean;
    routing?: boolean;
    languagePicker?: boolean;
    language?: string;
    imageExport?: boolean;
    zoomControl?: boolean;
    compass?: boolean;
    geolocate?: boolean;
  }) => MapGlotMap;
};

declare global {
  interface Window {
    MapGlot?: MapGlotGlobal;
  }
}

const mapglotKey = process.env.NEXT_PUBLIC_MAPGLOT_KEY;
const mapglotDisabled = process.env.NEXT_PUBLIC_MAPGLOT_DISABLED === '1';
let mapglotAssetsPromise: Promise<void> | null = null;

function loadStylesheet(id: string, href: string) {
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(id: string, src: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === 'true') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.dataset.loaded = script.dataset.loaded ?? 'false';
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

function ensureMapglotAssets() {
  if (!mapglotAssetsPromise) {
    mapglotAssetsPromise = (async () => {
      loadStylesheet('mapglot-maplibre-css', 'https://mapglot.com/vendor/maplibre-gl.css');
      await loadScript('mapglot-maplibre-js', 'https://mapglot.com/vendor/maplibre-gl.js');
      await loadScript('mapglot-sdk-js', 'https://mapglot.com/mapglot.js');
    })();
  }
  return mapglotAssetsPromise;
}

function toMapglotCenter(center?: MapCenter | null): [number, number] {
  if (!center) return [126.978, 37.5665];
  return [center.lng, center.lat];
}

function moveMap(map: MapGlotMap, center: [number, number], zoom: number, animated: boolean) {
  const duration = animated ? 280 : 0;
  if (map.easeTo) {
    map.easeTo({ center, zoom, duration, essential: true });
    return duration;
  }
  map.setCenter?.(center);
  map.setZoom?.(zoom);
  return duration;
}

export function MapBackground({ center, isTracking = false, language = 'ko', rangeValue, onCameraChange }: MapBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapGlotMap | null>(null);
  const programmaticMoveTimerRef = useRef<number | null>(null);
  const programmaticMoveRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const userGestureRef = useRef<MapCameraChange['gesture'] | null>(null);
  const onCameraChangeRef = useRef(onCameraChange);
  const [initialMapOptions] = useState(() => ({
    center: toMapglotCenter(center),
    language,
  }));
  const [state, setState] = useState<'fallback' | 'loading' | 'ready'>(
    mapglotKey && !mapglotDisabled ? 'loading' : 'fallback',
  );
  const mapCenter = useMemo(() => toMapglotCenter(center), [center]);
  const mapZoom = useMemo(() => getZoomForThoughtRange(rangeValue, center?.lat ?? 37.5665), [center?.lat, rangeValue]);
  const latestCameraRef = useRef({ center: mapCenter, zoom: mapZoom });

  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);

  useEffect(() => {
    latestCameraRef.current = { center: mapCenter, zoom: mapZoom };
  }, [mapCenter, mapZoom]);

  const moveCamera = useCallback((map: MapGlotMap, nextCenter: [number, number], nextZoom: number, animated: boolean) => {
    programmaticMoveRef.current = true;
    if (programmaticMoveTimerRef.current !== null) {
      window.clearTimeout(programmaticMoveTimerRef.current);
    }
    const duration = moveMap(map, nextCenter, nextZoom, animated);
    programmaticMoveTimerRef.current = window.setTimeout(() => {
      programmaticMoveRef.current = false;
      programmaticMoveTimerRef.current = null;
    }, duration + 120);
  }, []);

  useEffect(() => {
    if (!mapglotKey || mapglotDisabled || !containerRef.current) {
      setState('fallback');
      return undefined;
    }

    let cancelled = false;
    let resizeTimer: number | null = null;
    let cleanupResize: (() => void) | null = null;
    let cleanupMoveEnd: (() => void) | null = null;
    setState('loading');

    ensureMapglotAssets()
      .then(() => {
        if (cancelled || !containerRef.current || !window.MapGlot) return;
        mapRef.current = window.MapGlot.map(containerRef.current, {
          key: mapglotKey,
          center: initialMapOptions.center,
          zoom: latestCameraRef.current.zoom,
          style: 'liberty',
          view: '2d',
          search: false,
          clickToAddress: false,
          routing: false,
          languagePicker: false,
          language: initialMapOptions.language,
          imageExport: false,
          zoomControl: false,
          compass: false,
          geolocate: false,
        });

        const resizeMap = () => {
          window.requestAnimationFrame(() => mapRef.current?.resize?.());
        };
        const markPanGesture = () => {
          if (!programmaticMoveRef.current) userGestureRef.current = 'pan';
        };
        const markZoomGesture = () => {
          if (!programmaticMoveRef.current) userGestureRef.current = 'zoom';
        };
        const emitUserCameraChange = (gesture: MapCameraChange['gesture'] | null) => {
          const nextCenter = mapRef.current?.getCenter?.();
          if (!nextCenter || !gesture) return;
          const nextZoom = mapRef.current?.getZoom?.() ?? latestCameraRef.current.zoom;
          onCameraChangeRef.current?.({
            center: { lat: nextCenter.lat, lng: nextCenter.lng },
            zoom: nextZoom,
            source: 'user',
            gesture,
            settled: true,
          });
        };
        const handleCameraZooming = () => {
          if (programmaticMoveRef.current) return;
          userGestureRef.current = 'zoom';
        };
        const handleCameraSettled = () => {
          if (programmaticMoveRef.current) {
            userGestureRef.current = null;
            return;
          }
          const gesture = userGestureRef.current;
          userGestureRef.current = null;
          emitUserCameraChange(gesture);
        };

        resizeObserverRef.current?.disconnect();
        if ('ResizeObserver' in window) {
          resizeObserverRef.current = new ResizeObserver(resizeMap);
          resizeObserverRef.current.observe(containerRef.current);
        }
        window.addEventListener('resize', resizeMap);
        cleanupResize = () => window.removeEventListener('resize', resizeMap);
        resizeMap();
        resizeTimer = window.setTimeout(resizeMap, 250);
        mapRef.current.on?.('dragstart', markPanGesture);
        mapRef.current.on?.('zoomstart', markZoomGesture);
        mapRef.current.on?.('zoom', handleCameraZooming);
        mapRef.current.on?.('moveend', handleCameraSettled);
        mapRef.current.on?.('zoomend', handleCameraSettled);
        cleanupMoveEnd = () => {
          mapRef.current?.off?.('dragstart', markPanGesture);
          mapRef.current?.off?.('zoomstart', markZoomGesture);
          mapRef.current?.off?.('zoom', handleCameraZooming);
          mapRef.current?.off?.('moveend', handleCameraSettled);
          mapRef.current?.off?.('zoomend', handleCameraSettled);
        };
        moveCamera(mapRef.current, latestCameraRef.current.center, latestCameraRef.current.zoom, false);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('fallback');
      });

    return () => {
      cancelled = true;
      if (resizeTimer) window.clearTimeout(resizeTimer);
      if (programmaticMoveTimerRef.current !== null) window.clearTimeout(programmaticMoveTimerRef.current);
      cleanupResize?.();
      cleanupMoveEnd?.();
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, [initialMapOptions, moveCamera]);

  useEffect(() => {
    if (!mapRef.current) return;
    moveCamera(mapRef.current, mapCenter, mapZoom, true);
  }, [mapCenter, mapZoom, moveCamera]);

  useEffect(() => {
    mapRef.current?.setLanguage?.(language);
  }, [language]);

  const handleFallbackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (state === 'ready') return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleFallbackPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (state === 'ready') return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) < 12) return;

    const currentCenter = latestCameraRef.current.center;
    const degreeStep = 0.000018 * 2 ** (14 - latestCameraRef.current.zoom);
    onCameraChangeRef.current?.({
      center: {
        lat: currentCenter[1] + dy * degreeStep,
        lng: currentCenter[0] - dx * degreeStep,
      },
      zoom: latestCameraRef.current.zoom,
      source: 'user',
      gesture: 'pan',
    });
  };

  const handleMapWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (state === 'ready') return;
    event.preventDefault();
    const mapCenterValue = mapRef.current?.getCenter?.();
    const currentCamera = latestCameraRef.current;
    const currentZoom = mapRef.current?.getZoom?.() ?? currentCamera.zoom;
    const nextZoom = currentZoom + (event.deltaY < 0 ? 1 : -1);
    onCameraChangeRef.current?.({
      center: mapCenterValue
        ? { lat: mapCenterValue.lat, lng: mapCenterValue.lng }
        : { lat: currentCamera.center[1], lng: currentCamera.center[0] },
      zoom: nextZoom,
      source: 'user',
      gesture: 'zoom',
    });
  };

  return (
    <div
      data-testid="mapglot-background"
      data-map-provider="mapglot"
      data-map-center-lat={(center?.lat ?? 37.5665).toFixed(5)}
      data-map-center-lng={(center?.lng ?? 126.978).toFixed(5)}
      data-map-range={rangeValue}
      data-map-tracking={isTracking ? 'active' : 'manual'}
      data-map-zoom={mapZoom.toFixed(2)}
      data-map-state={state}
      className="absolute inset-0 overflow-hidden bg-white"
      aria-hidden="true"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      onPointerDown={handleFallbackPointerDown}
      onPointerUp={handleFallbackPointerUp}
      onWheel={handleMapWheel}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {state !== 'ready' ? <div className="anigeunde-map-surface absolute inset-0" /> : null}
      <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-[#252520] shadow-[1px_1px_0_rgba(35,35,31,0.68)]">
        MapGlot
      </div>
    </div>
  );
}
