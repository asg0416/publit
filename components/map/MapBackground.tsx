'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type MapCenter = {
  lat: number;
  lng: number;
};

type MapBackgroundProps = {
  center?: MapCenter | null;
};

type MapGlotMap = {
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

export function MapBackground({ center }: MapBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapGlotMap | null>(null);
  const [initialMapOptions] = useState(() => ({
    center: toMapglotCenter(center),
    hasLocation: Boolean(center),
  }));
  const [state, setState] = useState<'fallback' | 'loading' | 'ready'>(
    mapglotKey && !mapglotDisabled ? 'loading' : 'fallback',
  );
  const mapCenter = useMemo(() => toMapglotCenter(center), [center]);

  useEffect(() => {
    if (!mapglotKey || mapglotDisabled || !containerRef.current) {
      setState('fallback');
      return undefined;
    }

    let cancelled = false;
    setState('loading');

    ensureMapglotAssets()
      .then(() => {
        if (cancelled || !containerRef.current || !window.MapGlot) return;
        mapRef.current = window.MapGlot.map(containerRef.current, {
          key: mapglotKey,
          center: initialMapOptions.center,
          zoom: initialMapOptions.hasLocation ? 14 : 11,
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
        mapRef.current.resize?.();
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('fallback');
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, [initialMapOptions]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setCenter?.(mapCenter);
    mapRef.current.setZoom?.(center ? 14 : 11);
  }, [center, mapCenter]);

  return (
    <div
      data-testid="mapglot-background"
      data-map-provider="mapglot"
      data-map-state={state}
      className="absolute inset-0 overflow-hidden bg-[#e9ece6]"
      aria-hidden="true"
    >
      <div ref={containerRef} className="absolute inset-0" />
      {state !== 'ready' ? <div className="anigeunde-map-surface absolute inset-0" /> : null}
      <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-[#252520] shadow-[1px_1px_0_rgba(35,35,31,0.68)]">
        MapGlot
      </div>
    </div>
  );
}
