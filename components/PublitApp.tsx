'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { LocationGate } from '@/components/location/LocationGate';
import { useMovingLocation, type LocationDebugInfo } from '@/components/location/useMovingLocation';
import { MapBackground, type MapCameraChange } from '@/components/map/MapBackground';
import { RANGE_OPTIONS, RangeControl } from '@/components/map/RangeControl';
import { ThoughtOverlay } from '@/components/map/ThoughtOverlay';
import { FlameDetailSheet } from '@/components/flame/FlameDetailSheet';
import { HotTagTicker } from '@/components/flame/HotTagTicker';
import { InlineThoughtComposer } from '@/components/flame/InlineThoughtComposer';
import { getDeviceHash } from '@/lib/device';
import { publitApi } from '@/lib/supabaseClient';
import { encodeGrid } from '@/lib/location/geohash';
import { distanceMeters } from '@/lib/location/useMovingLocationCore';
import { getThoughtRangeForZoom } from '@/lib/map/rangeViewport';
import type { CharacterKey, Flame as FlameType, FlameCategory, FlameComment, FlameMood, HotTopic, ReactionType, ReportReason, TagSuggestion, ThoughtRangeValue } from '@/lib/flame/types';

const NEARBY_REFRESH_INTERVAL_MS = 12_000;
type PositionState = { lat: number; lng: number; grid: string };
const DEFAULT_MAP_POSITION: PositionState = {
  lat: 37.5665,
  lng: 126.978,
  grid: encodeGrid(37.5665, 126.978),
};

const fallbackTopics: HotTopic[] = [
  { displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily', scope: 'global', heatLabel: '근처에서 자주 보여요' },
  { displayLabel: '#지역교통', normalizedKey: '지역교통', category: 'local', scope: 'global', heatLabel: '요즘 이 태그가 모여요' },
  { displayLabel: '#나만그런가', normalizedKey: '나만그런가', category: 'daily', scope: 'global', heatLabel: '같은 태그가 모이고 있어요' },
];

function LocationDebugPanel({ debugInfo, locationStatus }: { debugInfo: LocationDebugInfo; locationStatus: string }) {
  const debugText = JSON.stringify({ locationStatus, ...debugInfo }, null, 2);

  return (
    <section
      data-testid="location-debug-panel"
      className="absolute left-3 right-3 top-[15rem] z-[190] mx-auto max-w-2xl rounded-[14px] bg-white p-3 text-[#252520] shadow-[3px_3px_0_rgba(35,35,31,0.82),0_0_0_1px_rgba(35,35,31,0.08)] sm:left-4 sm:right-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-[#ef3b32]">PC 위치 진단</p>
        <button
          type="button"
          className="rounded-full bg-[#252520] px-3 py-1 text-[10px] font-black text-white shadow-[1px_1px_0_rgba(239,59,50,0.75)]"
          onClick={() => void navigator.clipboard?.writeText(debugText)}
        >
          복사
        </button>
      </div>
      <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded-[10px] bg-[#f5f5f5] p-2 font-mono text-[10px] leading-4 text-[#252520]">
        {debugText}
      </pre>
    </section>
  );
}

export function PublitApp() {
  const [deviceHash, setDeviceHash] = useState('');
  const [flames, setFlames] = useState<FlameType[]>([]);
  const [topics, setTopics] = useState<HotTopic[]>(fallbackTopics);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [slots, setSlots] = useState<{ used: number; limit: number; activeFlames: Array<{ id: string; tagLabel: string; status: string; createdAt: string }> } | null>(null);
  const [selected, setSelected] = useState<FlameType | null>(null);
  const [viewPosition, setViewPosition] = useState<PositionState | null>(null);
  const [mapCenterPosition, setMapCenterPosition] = useState<PositionState>(DEFAULT_MAP_POSITION);
  const [devicePosition, setDevicePosition] = useState<PositionState | null>(null);
  const [manualPositionActive, setManualPositionActive] = useState(false);
  const [manualPositionReason, setManualPositionReason] = useState<'fallback' | 'user' | null>(null);
  const manualPositionActiveRef = useRef(false);
  const manualPositionReasonRef = useRef<'fallback' | 'user' | null>(null);
  const [geoDebugOpen, setGeoDebugOpen] = useState(false);
  const [, setStatus] = useState('지금 이곳에 떠도는 생각을 확인해보세요.');
  const [createFeedback, setCreateFeedback] = useState('');
  const [rangeValue, setRangeValue] = useState<ThoughtRangeValue>('500m');
  const [rangeOpen, setRangeOpen] = useState(false);
  const optimisticFlamesRef = useRef<FlameType[]>([]);
  const pendingRangeRefreshRef = useRef<PositionState | null>(null);

  useEffect(() => {
    getDeviceHash().then(setDeviceHash).catch(() => setStatus('device hash를 만들 수 없어요.'));
  }, []);

  const refreshSlots = useCallback(async (hash = deviceHash) => {
    if (!hash) return;
    try {
      setSlots(await publitApi.myFlames({ deviceHash: hash }));
    } catch {
      setSlots({ used: 0, limit: 3, activeFlames: [] });
    }
  }, [deviceHash]);

  const refreshTopics = useCallback(async (position?: { lat: number; lng: number }) => {
    try {
      const next = await publitApi.getHotTopics(position ? { ...position, scope: 'local' } : { scope: 'global' });
      setTopics(next.length ? next : fallbackTopics);
    } catch {
      setTopics(fallbackTopics);
    }
  }, []);

  const mergeWithOptimisticFlames = useCallback((remoteFlames: FlameType[]) => {
    const remoteIds = new Set(remoteFlames.map((flame) => flame.id));
    optimisticFlamesRef.current = optimisticFlamesRef.current.filter((flame) => !remoteIds.has(flame.id));
    return [...optimisticFlamesRef.current, ...remoteFlames];
  }, []);

  const refreshNearby = useCallback(async (position: PositionState, options: { silent?: boolean } = {}) => {
    setViewPosition(position);
    if (!options.silent) setStatus('근처 생각을 새로 살피는 중이에요.');
    try {
      const next = await publitApi.nearbyFlames({
        lat: position.lat,
        lng: position.lng,
        rangeValue,
        ...(deviceHash ? { deviceHash } : {}),
      });
      setFlames(mergeWithOptimisticFlames(next));
      if (!options.silent) {
        setStatus(next.length ? '근처 생각이 지도 위에 떠 있어요.' : '아직 이 공간에 떠 있는 생각이 없어요.');
        setCreateFeedback('');
      }
      void refreshTopics(position);
      void refreshSlots();
    } catch {
      if (!options.silent) setStatus('근처 생각을 불러오지 못했어요. 잠시 후 다시 시도해보세요.');
    }
  }, [deviceHash, mergeWithOptimisticFlames, rangeValue, refreshSlots, refreshTopics]);

  const handleLocationResolved = useCallback((position: PositionState) => {
    setDevicePosition(position);
    if (manualPositionActiveRef.current && manualPositionReasonRef.current === 'user') return;
    manualPositionReasonRef.current = null;
    setManualPositionReason(null);
    setManualPositionActive(false);
    void refreshNearby(position);
  }, [refreshNearby]);

  const { state: locationState, requestLocation, debugInfo } = useMovingLocation(handleLocationResolved);

  useEffect(() => {
    manualPositionActiveRef.current = manualPositionActive;
  }, [manualPositionActive]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      let storedDebug = false;
      try {
        storedDebug = window.localStorage.getItem('anigeunde_geo_debug') === '1';
      } catch {
        storedDebug = false;
      }
      setGeoDebugOpen(params.get('geoDebug') === '1' || storedDebug);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshTopics();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshTopics]);

  useEffect(() => {
    if (!deviceHash) return undefined;
    const timeout = window.setTimeout(() => {
      void refreshSlots(deviceHash);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [deviceHash, refreshSlots]);

  useEffect(() => {
    if (!viewPosition) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refreshNearby(viewPosition, { silent: true });
    }, NEARBY_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [viewPosition, refreshNearby]);

  useEffect(() => {
    if (!deviceHash || !viewPosition) return undefined;
    if (pendingRangeRefreshRef.current) return undefined;
    const timeout = window.setTimeout(() => {
      void refreshNearby(viewPosition, { silent: true });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [deviceHash, refreshNearby, viewPosition]);

  useEffect(() => {
    const pendingPosition = pendingRangeRefreshRef.current;
    if (!pendingPosition) return;

    pendingRangeRefreshRef.current = null;
    void refreshNearby(pendingPosition, { silent: true });
  }, [rangeValue, refreshNearby]);

  const liveDevicePosition = useMemo<PositionState | null>(() => {
    if (locationState.status !== 'granted') return devicePosition;
    if (!Number.isFinite(locationState.lat) || !Number.isFinite(locationState.lng)) return devicePosition;
    return {
      lat: locationState.lat!,
      lng: locationState.lng!,
      grid: locationState.grid ?? encodeGrid(locationState.lat!, locationState.lng!),
    };
  }, [devicePosition, locationState.grid, locationState.lat, locationState.lng, locationState.status]);
  const selectedRange = useMemo(() => RANGE_OPTIONS.find((option) => option.value === rangeValue) ?? RANGE_OPTIONS[3], [rangeValue]);
  const isUserManualPosition = manualPositionActive && manualPositionReason === 'user';
  const isTrackingPosition = !isUserManualPosition && locationState.status === 'granted';
  const activeMapCenter = isUserManualPosition ? (viewPosition ?? mapCenterPosition) : (liveDevicePosition ?? viewPosition ?? mapCenterPosition);
  const createPosition = isUserManualPosition ? viewPosition : (liveDevicePosition ?? viewPosition);
  const shouldShowLocationGate = locationState.status !== 'granted' && !manualPositionActive;

  useEffect(() => {
    if (devicePosition || manualPositionActive) return;
    if (!['denied', 'unsupported', 'unavailable'].includes(locationState.status)) return;

    const fallbackPosition = viewPosition ?? mapCenterPosition;
    const timeout = window.setTimeout(() => {
      manualPositionReasonRef.current = 'fallback';
      setManualPositionReason('fallback');
      setManualPositionActive(true);
      setCreateFeedback('브라우저 위치가 안 잡혀서 지도 중심을 기준으로 볼게요.');
      void refreshNearby(fallbackPosition, { silent: true });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [devicePosition, locationState.status, manualPositionActive, mapCenterPosition, refreshNearby, viewPosition]);

  const handleMapCameraChange = useCallback((camera: MapCameraChange) => {
    const position = camera.center;
    const next = {
      lat: position.lat,
      lng: position.lng,
      grid: encodeGrid(position.lat, position.lng),
    };
    const isManualBrowse = manualPositionActive && manualPositionReason === 'user';
    const refreshPosition = camera.gesture === 'zoom' && !isManualBrowse
      ? (liveDevicePosition ?? viewPosition ?? next)
      : next;
    let pendingRangeRefresh = false;

    setMapCenterPosition(next);

    if (camera.source === 'user') {
      const nextRange = getThoughtRangeForZoom(camera.zoom, next.lat);
      if (nextRange !== rangeValue) {
        pendingRangeRefreshRef.current = refreshPosition;
        pendingRangeRefresh = true;
        setRangeValue(nextRange);
      }

      if (camera.gesture === 'pan') {
        manualPositionReasonRef.current = 'user';
        setManualPositionReason('user');
        setManualPositionActive(true);
      }
    }

    const canBrowseManualCenter = camera.gesture === 'pan' || manualPositionActive || locationState.status === 'granted';
    if (!canBrowseManualCenter) return;
    if (pendingRangeRefresh) return;
    if (camera.gesture !== 'zoom' && viewPosition && distanceMeters(viewPosition, refreshPosition) < 25) return;

    void refreshNearby(refreshPosition, { silent: true });
  }, [liveDevicePosition, locationState.status, manualPositionActive, manualPositionReason, rangeValue, refreshNearby, viewPosition]);

  const handleSuggest = useCallback(async (text: string) => {
    try {
      const next = await publitApi.suggestTags({
        text,
        lat: viewPosition?.lat,
        lng: viewPosition?.lng,
      });
      setSuggestions(next);
    } catch {
      setSuggestions([]);
    }
  }, [viewPosition]);

  const handleCreate = useCallback(async (input: { text: string; tagLabel: string; category: FlameCategory; mood: FlameMood; selfStrength: 1 | 2 | 3; characterKey: CharacterKey; characterEmoji?: string }) => {
    if (!deviceHash) {
      const message = '기기 확인이 아직 끝나지 않았어요. 잠시 후 다시 눌러주세요.';
      setCreateFeedback(message);
      setStatus(message);
      return false;
    }
    if (!createPosition) {
      const message = '위치 권한을 먼저 허용하거나 지도를 기준으로 위치를 정해주세요.';
      setCreateFeedback(message);
      setStatus(message);
      requestLocation();
      return false;
    }
    setCreateFeedback('');
    try {
      const result = await publitApi.createFlame({
        ...input,
        ...createPosition,
        deviceHash,
        displayScope: selectedRange.displayScope,
        regionCode: selectedRange.value,
      });
      if (result.flame) {
        const createdFlame: FlameType = {
          ...result.flame,
          characterKey: result.flame.characterKey ?? input.characterKey,
          characterEmoji: result.flame.characterEmoji ?? input.characterEmoji,
          selfStrength: result.flame.selfStrength ?? (input.selfStrength as 1 | 2 | 3),
          ownedByDevice: true,
        };
        optimisticFlamesRef.current = [
          createdFlame,
          ...optimisticFlamesRef.current.filter((flame) => flame.id !== createdFlame.id),
        ];
        setViewPosition(createPosition);
        setFlames((current) => [createdFlame, ...current.filter((flame) => flame.id !== createdFlame.id)]);
        setCreateFeedback('');
        setStatus('내 생각이 지도 위에 떠올랐어요.');
      }
      if (result.activeFlames) {
        setSlots({ used: result.activeFlames.length, limit: 3, activeFlames: result.activeFlames });
      } else {
        void refreshSlots();
      }
      return Boolean(result.flame);
    } catch (error) {
      const message = error instanceof Error && error.message === 'FLAME_SLOT_FULL' ? '내 생각 슬롯이 모두 차 있어요.' : '생각을 띄우지 못했어요. 잠시 후 다시 시도해보세요.';
      setCreateFeedback(message);
      setStatus(message);
    }
    return false;
  }, [createPosition, deviceHash, refreshSlots, requestLocation, selectedRange.displayScope, selectedRange.value]);

  const handleExtinguish = useCallback(async (flameId: string) => {
    if (!deviceHash) return;
    try {
      await publitApi.extinguishFlame({ flameId, deviceHash });
      optimisticFlamesRef.current = optimisticFlamesRef.current.filter((flame) => flame.id !== flameId);
      setFlames((current) => current.filter((flame) => flame.id !== flameId));
      void refreshSlots();
      setStatus('내 생각을 내렸어요.');
    } catch {
      setStatus('생각을 내리지 못했어요.');
    }
  }, [deviceHash, refreshSlots]);

  const handleReact = useCallback(async (flameId: string, reactionType: ReactionType) => {
    if (!deviceHash) return;
    try {
      const result = await publitApi.reactFlame({ flameId, reactionType, deviceHash });
      setFlames((current) => current.map((flame) => flame.id === flameId ? {
        ...flame,
        heatLabel: result.heatLabel,
        reactions: result.reactions ?? flame.reactions,
      } : flame));
      setSelected((current) => current?.id === flameId ? {
        ...current,
        heatLabel: result.heatLabel,
        reactions: result.reactions ?? current.reactions,
      } : current);
    } catch {
      setStatus('반응을 남기지 못했어요.');
    }
  }, [deviceHash]);

  const handleReport = useCallback(async (flameId: string, reason: ReportReason) => {
    if (!deviceHash) return;
    try {
      const result = await publitApi.reportFlame({ flameId, reason, deviceHash });
      if (result.status === 'hidden' || result.status === 'reported') {
        optimisticFlamesRef.current = optimisticFlamesRef.current.filter((flame) => flame.id !== flameId);
        setFlames((current) => current.filter((flame) => flame.id !== flameId));
        setSelected(null);
      }
      setStatus('신고를 접수했어요.');
    } catch {
      setStatus('신고를 접수하지 못했어요.');
    }
  }, [deviceHash]);

  const handleLoadComments = useCallback(async (flameId: string): Promise<FlameComment[]> => {
    try {
      return await publitApi.getComments({ flameId });
    } catch {
      setStatus('댓글을 불러오지 못했어요.');
      return [];
    }
  }, []);

  const handleCreateComment = useCallback(async (flameId: string, body: string): Promise<FlameComment | null> => {
    if (!deviceHash) return null;
    try {
      const result = await publitApi.createComment({ flameId, body, deviceHash });
      return result.comment;
    } catch {
      setStatus('댓글을 남기지 못했어요.');
      return null;
    }
  }, [deviceHash]);

  const handleExtend = useCallback(async (flameId: string) => {
    if (!deviceHash) return;
    try {
      const result = await publitApi.extendFlame({ flameId, deviceHash });
      setFlames((current) => current.map((flame) => flame.id === flameId ? {
        ...flame,
        ...result.flame,
        ownedByDevice: true,
      } : flame));
      setSelected((current) => current?.id === flameId ? {
        ...current,
        ...result.flame,
        ownedByDevice: true,
      } : current);
      setStatus('생각을 하루 더 유지했어요.');
    } catch {
      setStatus('생각을 연장하지 못했어요.');
    }
  }, [deviceHash]);

  const displayedFlames = flames.length ? flames : [];

  return (
    <main data-testid="publit-shell" className="relative min-h-[100svh] overflow-hidden bg-white text-[#252520]">
      <MapBackground
        center={activeMapCenter}
        isTracking={isTrackingPosition}
        rangeValue={rangeValue}
        onCameraChange={handleMapCameraChange}
      />
      <div data-testid="top-brand-bar" className="pointer-events-auto absolute left-3 right-3 top-3 z-[120] mx-auto max-w-2xl sm:left-4 sm:right-4">
        <div className="grid h-12 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 rounded-[16px] bg-white p-1.5 shadow-[3px_3px_0_rgba(35,35,31,0.82),0_0_0_1px_rgba(35,35,31,0.08)]">
          <div data-testid="brand-logo" className="grid h-full w-[78px] shrink-0 place-items-center rounded-[12px] bg-white px-1.5">
            <div className="grid justify-items-center">
              <h1 className="-skew-x-6 text-[1.22rem] font-black italic leading-[0.9] tracking-normal text-[#252520]">ANGD</h1>
              <p data-testid="brand-subtitle" className="mt-0.5 whitespace-nowrap text-[9px] font-black leading-none text-[#ef3b32]">아니근데 나만?</p>
            </div>
          </div>
          <HotTagTicker topics={topics} compact />
        </div>
      </div>

      {shouldShowLocationGate ? (
        <div className="absolute left-3 right-3 top-[5.6rem] z-40 mx-auto max-w-md sm:left-4 sm:right-4">
          <LocationGate state={locationState} onRequest={requestLocation} />
        </div>
      ) : null}

      {geoDebugOpen ? <LocationDebugPanel debugInfo={debugInfo} locationStatus={locationState.status} /> : null}

      <div data-testid="thought-panel" className="pointer-events-none absolute inset-0">
        <ThoughtOverlay
          thoughts={displayedFlames}
          rangeLabel={selectedRange.label}
          onSelect={(flame) => {
            setRangeOpen(false);
            setSelected(flame);
          }}
        />
      </div>

      <div className="absolute right-3 top-[5.6rem] z-[60] grid gap-2 sm:right-4">
        <button
          type="button"
          onClick={() => setRangeOpen((current) => !current)}
          className={`grid size-9 place-items-center rounded-[10px] bg-white text-[#252520] shadow-[2px_2px_0_rgba(35,35,31,0.78)] transition-[transform,background-color,color] active:scale-[0.96] ${
            rangeOpen ? 'bg-[#ef3b32] text-white' : ''
          }`}
          aria-label="반경 설정"
          aria-expanded={rangeOpen}
        >
          <SlidersHorizontal size={16} />
        </button>
        <button
          type="button"
          onClick={() => viewPosition ? void refreshNearby({ ...viewPosition }) : requestLocation({ forceRefresh: true })}
          className="grid size-9 place-items-center rounded-[10px] bg-white text-[#252520] shadow-[2px_2px_0_rgba(35,35,31,0.72)] transition-transform active:scale-[0.96]"
          aria-label="새로고침"
        >
          <RefreshCw size={16} />
        </button>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-[10px] bg-white text-[#252520] shadow-[2px_2px_0_rgba(35,35,31,0.72)] transition-transform active:scale-[0.96]"
          aria-label="현재 위치로 이동"
          aria-pressed={isTrackingPosition}
          onClick={() => {
            manualPositionReasonRef.current = null;
            setManualPositionReason(null);
            setManualPositionActive(false);
            const currentPosition = liveDevicePosition ?? (
              locationState.status === 'granted' && Number.isFinite(locationState.lat) && Number.isFinite(locationState.lng)
                ? {
                    lat: locationState.lat!,
                    lng: locationState.lng!,
                    grid: locationState.grid ?? encodeGrid(locationState.lat!, locationState.lng!),
                  }
                : null
            );
            if (currentPosition) {
              setDevicePosition(currentPosition);
              void refreshNearby(currentPosition, { silent: true });
            }
            requestLocation({ forceRefresh: !currentPosition });
          }}
        >
          <LocateFixed size={16} />
        </button>
      </div>

      {rangeOpen ? (
        <div className="absolute right-[3.6rem] top-[5.6rem] z-[70] sm:right-[4.1rem]">
          <RangeControl
            value={rangeValue}
            onChange={(next) => {
              pendingRangeRefreshRef.current = activeMapCenter;
              setRangeValue(next);
              setRangeOpen(false);
            }}
          />
        </div>
      ) : null}

      <InlineThoughtComposer
        topics={topics}
        remoteSuggestions={suggestions}
        slots={slots}
        onFocus={() => setRangeOpen(false)}
        onSuggest={handleSuggest}
        onSubmit={handleCreate}
        onExtinguish={handleExtinguish}
        submitMessage={createFeedback}
      />

      {displayedFlames.length === 0 && !shouldShowLocationGate ? (
        <div className="pointer-events-none absolute left-5 right-5 top-1/2 z-20 mx-auto max-w-xs -translate-y-1/2 rounded-[14px] bg-white/92 px-4 py-3 text-center shadow-[2px_2px_0_rgba(35,35,31,0.72)]">
          <p className="text-sm font-black text-[#252520]">아직 이 공간에 떠 있는 생각이 없어요.</p>
          <p className="mt-1 text-xs font-bold text-[#6f6b61]">첫 생각을 띄워볼까요?</p>
        </div>
      ) : null}

      <FlameDetailSheet
        flame={selected}
        flames={displayedFlames}
        onClose={() => setSelected(null)}
        onSelect={(flame) => {
          setRangeOpen(false);
          setSelected(flame);
        }}
        onReact={handleReact}
        onReport={handleReport}
        onLoadComments={handleLoadComments}
        onCreateComment={handleCreateComment}
        onExtend={handleExtend}
      />
    </main>
  );
}
