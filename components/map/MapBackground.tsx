'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getZoomForThoughtRange } from '@/lib/map/rangeViewport';
import type { ThoughtRangeValue } from '@/lib/flame/types';

type MapCenter = {
  lat: number;
  lng: number;
};

type MapBackgroundProps = {
  center?: MapCenter | null;
  rangeValue: ThoughtRangeValue;
  onCenterChange?: (center: MapCenter) => void;
};

type MapGlotMap = {
  easeTo?: (options: { center?: [number, number]; zoom?: number; duration?: number; essential?: boolean }) => void;
  getCenter?: () => { lat: number; lng: number };
  off?: (event: 'moveend', handler: () => void) => void;
  on?: (event: 'moveend', handler: () => void) => void;
  remove?: () => void;
  resize?: () => void;
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
  if (map.easeTo) {
    map.easeTo({ center, zoom, duration: animated ? 280 : 0, essential: true });
    return;
  }
  map.setCenter?.(center);
  map.setZoom?.(zoom);
}

export function MapBackground({ center, rangeValue, onCenterChange }: MapBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapGlotMap | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const onCenterChangeRef = useRef(onCenterChange);
  const [initialMapOptions] = useState(() => ({
    center: toMapglotCenter(center),
  }));
  const [state, setState] = useState<'fallback' | 'loading' | 'ready'>(
    mapglotKey && !mapglotDisabled ? 'loading' : 'fallback',
  );
  const mapCenter = useMemo(() => toMapglotCenter(center), [center]);
  const mapZoom = useMemo(() => getZoomForThoughtRange(rangeValue, center?.lat ?? 37.5665), [center?.lat, rangeValue]);
  const latestCameraRef = useRef({ center: mapCenter, zoom: mapZoom });

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  useEffect(() => {
    latestCameraRef.current = { center: mapCenter, zoom: mapZoom };
  }, [mapCenter, mapZoom]);

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
          style: 'positron',
          view: 'minimal',
          search: false,
          clickToAddress: false,
          routing: false,
          languagePicker: false,
          language: 'ko',
          imageExport: false,
          zoomControl: false,
          compass: false,
          geolocate: false,
        });

        const resizeMap = () => {
          window.requestAnimationFrame(() => mapRef.current?.resize?.());
        };
        const handleMoveEnd = () => {
          const nextCenter = mapRef.current?.getCenter?.();
          if (!nextCenter) return;
          onCenterChangeRef.current?.({ lat: nextCenter.lat, lng: nextCenter.lng });
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
        mapRef.current.on?.('moveend', handleMoveEnd);
        cleanupMoveEnd = () => mapRef.current?.off?.('moveend', handleMoveEnd);
        moveMap(mapRef.current, latestCameraRef.current.center, latestCameraRef.current.zoom, false);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('fallback');
      });

    return () => {
      cancelled = true;
      if (resizeTimer) window.clearTimeout(resizeTimer);
      cleanupResize?.();
      cleanupMoveEnd?.();
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, [initialMapOptions]);

  useEffect(() => {
    if (!mapRef.current) return;
    moveMap(mapRef.current, mapCenter, mapZoom, true);
  }, [mapCenter, mapZoom]);

  return (
    <div
      data-testid="mapglot-background"
      data-map-provider="mapglot"
      data-map-range={rangeValue}
      data-map-zoom={mapZoom.toFixed(2)}
      data-map-state={state}
      className="absolute inset-0 overflow-hidden bg-[#e9ece6]"
      aria-hidden="true"
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
