'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LocateFixed, Plus, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { LocationGate } from '@/components/location/LocationGate';
import { useMovingLocation } from '@/components/location/useMovingLocation';
import { MapBackground } from '@/components/map/MapBackground';
import { RANGE_OPTIONS, RangeControl } from '@/components/map/RangeControl';
import { ThoughtOverlay } from '@/components/map/ThoughtOverlay';
import { CreateFlameSheet } from '@/components/flame/CreateFlameSheet';
import { FlameDetailSheet } from '@/components/flame/FlameDetailSheet';
import { HotTagTicker } from '@/components/flame/HotTagTicker';
import { getDeviceHash } from '@/lib/device';
import { publitApi } from '@/lib/supabaseClient';
import { encodeGrid } from '@/lib/location/geohash';
import { distanceMeters } from '@/lib/location/useMovingLocationCore';
import type { CharacterKey, Flame as FlameType, HotTopic, ReactionType, ReportReason, TagSuggestion, ThoughtRangeValue } from '@/lib/flame/types';

const NEARBY_REFRESH_INTERVAL_MS = 12_000;
type PositionState = { lat: number; lng: number; grid: string };

const fallbackTopics: HotTopic[] = [
  { displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily', scope: 'global', heatLabel: '근처에서 자주 보여요' },
  { displayLabel: '#지역교통', normalizedKey: '지역교통', category: 'local', scope: 'global', heatLabel: '요즘 이 태그가 모여요' },
  { displayLabel: '#나만그런가', normalizedKey: '나만그런가', category: 'daily', scope: 'global', heatLabel: '같은 태그가 모이고 있어요' },
];

export function PublitApp() {
  const [deviceHash, setDeviceHash] = useState('');
  const [flames, setFlames] = useState<FlameType[]>([]);
  const [topics, setTopics] = useState<HotTopic[]>(fallbackTopics);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [slots, setSlots] = useState<{ used: number; limit: number; activeFlames: Array<{ id: string; tagLabel: string; status: string; createdAt: string }> } | null>(null);
  const [selected, setSelected] = useState<FlameType | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewPosition, setViewPosition] = useState<PositionState | null>(null);
  const [devicePosition, setDevicePosition] = useState<PositionState | null>(null);
  const [, setStatus] = useState('지금 이곳에 떠도는 생각을 확인해보세요.');
  const [createFeedback, setCreateFeedback] = useState('');
  const [rangeValue, setRangeValue] = useState<ThoughtRangeValue>('500m');
  const [rangeOpen, setRangeOpen] = useState(false);

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

  const refreshNearby = useCallback(async (position: PositionState, options: { silent?: boolean } = {}) => {
    setViewPosition(position);
    if (!options.silent) setStatus('근처 생각을 새로 살피는 중이에요.');
    try {
      const next = await publitApi.nearbyFlames({ lat: position.lat, lng: position.lng });
      setFlames(next);
      if (!options.silent) {
        setStatus(next.length ? '근처 생각이 지도 위에 떠 있어요.' : '아직 이 공간에 떠 있는 생각이 없어요.');
        setCreateFeedback('');
      }
      void refreshTopics(position);
      void refreshSlots();
    } catch {
      if (!options.silent) setStatus('근처 생각을 불러오지 못했어요. 잠시 후 다시 시도해보세요.');
    }
  }, [refreshSlots, refreshTopics]);

  const handleLocationResolved = useCallback((position: PositionState) => {
    setDevicePosition(position);
    void refreshNearby(position);
  }, [refreshNearby]);

  const { state: locationState, requestLocation } = useMovingLocation(handleLocationResolved);

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

  const selectedRange = useMemo(() => RANGE_OPTIONS.find((option) => option.value === rangeValue) ?? RANGE_OPTIONS[3], [rangeValue]);
  const shouldShowLocationGate = locationState.status !== 'granted';

  const handleMapCenterChange = useCallback((position: { lat: number; lng: number }) => {
    if (locationState.status !== 'granted') return;

    const next = {
      lat: position.lat,
      lng: position.lng,
      grid: encodeGrid(position.lat, position.lng),
    };
    if (viewPosition && distanceMeters(viewPosition, next) < 25) return;

    void refreshNearby(next, { silent: true });
  }, [viewPosition, locationState.status, refreshNearby]);

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

  const handleCreate = useCallback(async (input: { text: string; tagLabel: string; category: string; mood: string; selfStrength: number; characterKey: CharacterKey }) => {
    if (!deviceHash) {
      const message = '기기 확인이 아직 끝나지 않았어요. 잠시 후 다시 눌러주세요.';
      setCreateFeedback(message);
      setStatus(message);
      return;
    }
    if (!devicePosition) {
      const message = '위치 권한을 먼저 허용하면 생각을 띄울 수 있어요.';
      setCreateFeedback(message);
      setStatus(message);
      requestLocation();
      return;
    }
    setCreateFeedback('');
    try {
      const result = await publitApi.createFlame({
        ...input,
        ...devicePosition,
        deviceHash,
        displayScope: selectedRange.displayScope,
        regionCode: selectedRange.value,
      });
      if (result.flame) {
        const createdFlame: FlameType = {
          ...result.flame,
          characterKey: result.flame.characterKey ?? input.characterKey,
          selfStrength: result.flame.selfStrength ?? (input.selfStrength as 1 | 2 | 3),
        };
        setViewPosition(devicePosition);
        setFlames((current) => [createdFlame, ...current.filter((flame) => flame.id !== createdFlame.id)]);
        setCreateOpen(false);
        setCreateFeedback('');
        setStatus('내 생각이 지도 위에 떠올랐어요.');
      }
      if (result.activeFlames) {
        setSlots({ used: result.activeFlames.length, limit: 3, activeFlames: result.activeFlames });
      } else {
        void refreshSlots();
      }
    } catch (error) {
      const message = error instanceof Error && error.message === 'FLAME_SLOT_FULL' ? '내 생각 슬롯이 모두 차 있어요.' : '생각을 띄우지 못했어요. 잠시 후 다시 시도해보세요.';
      setCreateFeedback(message);
      setStatus(message);
    }
  }, [deviceHash, devicePosition, refreshSlots, requestLocation, selectedRange.displayScope, selectedRange.value]);

  const handleExtinguish = useCallback(async (flameId: string) => {
    if (!deviceHash) return;
    try {
      await publitApi.extinguishFlame({ flameId, deviceHash });
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
      setFlames((current) => current.map((flame) => flame.id === flameId ? { ...flame, heatLabel: result.heatLabel } : flame));
      setSelected((current) => current?.id === flameId ? { ...current, heatLabel: result.heatLabel } : current);
    } catch {
      setStatus('반응을 남기지 못했어요.');
    }
  }, [deviceHash]);

  const handleReport = useCallback(async (flameId: string, reason: ReportReason) => {
    if (!deviceHash) return;
    try {
      const result = await publitApi.reportFlame({ flameId, reason, deviceHash });
      if (result.status === 'hidden' || result.status === 'reported') {
        setFlames((current) => current.filter((flame) => flame.id !== flameId));
        setSelected(null);
      }
      setStatus('신고를 접수했어요.');
    } catch {
      setStatus('신고를 접수하지 못했어요.');
    }
  }, [deviceHash]);

  const displayedFlames = flames.length ? flames : [];

  return (
    <main data-testid="publit-shell" className="relative min-h-[100svh] overflow-hidden bg-[#e9ece6] text-[#252520]">
      <MapBackground center={viewPosition} rangeValue={rangeValue} onCenterChange={handleMapCenterChange} />
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-50 sm:left-4 sm:right-4">
        <div data-testid="brand-logo" className="inline-flex items-center gap-2 rounded-[18px] bg-white/92 px-3 py-2 shadow-[1px_1px_0_rgba(35,35,31,0.68)] backdrop-blur-sm">
          <span className="text-xl leading-none" aria-hidden="true">🤔</span>
          <div className="min-w-0">
            <h1 className="text-[1.28rem] font-black leading-none tracking-normal text-[#252520]">아니근데</h1>
            <p className="mt-0.5 text-[10px] font-black leading-tight text-[#6f6b61]">지금 나만 이 생각해?</p>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto absolute left-3 right-3 top-[4.6rem] z-[90] sm:left-4 sm:right-4">
        <HotTagTicker topics={topics} />
      </div>

      {shouldShowLocationGate ? (
        <div className="absolute left-3 right-3 top-[8.75rem] z-40 mx-auto max-w-md sm:left-4 sm:right-4">
          <LocationGate state={locationState} onRequest={requestLocation} onQuietBrowse={() => setStatus('조용히 둘러보는 중이에요.')} />
        </div>
      ) : null}

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

      <div className="absolute right-3 top-[8.75rem] z-[60] grid gap-2 sm:right-4">
        <button
          type="button"
          onClick={() => setRangeOpen((current) => !current)}
          className={`grid size-9 place-items-center rounded-[10px] bg-white text-[#252520] shadow-[2px_2px_0_rgba(35,35,31,0.72)] transition-[transform,background-color] active:scale-[0.96] ${
            rangeOpen ? 'bg-[#ffda68]' : ''
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
          onClick={() => requestLocation({ forceRefresh: true })}
          className="grid size-9 place-items-center rounded-[10px] bg-white text-[#252520] shadow-[2px_2px_0_rgba(35,35,31,0.72)] transition-transform active:scale-[0.96]"
          aria-label="현재 위치로 이동"
        >
          <LocateFixed size={16} />
        </button>
      </div>

      {rangeOpen ? (
        <div className="absolute right-[3.6rem] top-[8.75rem] z-[70] sm:right-[4.1rem]">
          <RangeControl
            value={rangeValue}
            onChange={(next) => {
              setRangeValue(next);
              setRangeOpen(false);
            }}
          />
        </div>
      ) : null}

      <button
        type="button"
        aria-label="생각 띄우기 열기"
        data-testid="thought-compose-toolbar"
        onClick={() => { setCreateFeedback(''); setRangeOpen(false); setCreateOpen(true); }}
        className="absolute bottom-4 right-4 z-40 flex min-h-11 items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-left shadow-[2px_2px_0_rgba(35,35,31,0.82)] transition-transform active:scale-[0.96] sm:right-5"
      >
        <span className="block text-sm font-black leading-tight text-[#252520]">생각 띄우기</span>
        <span className="grid size-9 place-items-center rounded-full bg-[#a8ddc1] text-[#153424] shadow-[1px_1px_0_rgba(35,35,31,0.68)]">
          <Plus size={19} />
        </span>
      </button>

      {displayedFlames.length === 0 && !shouldShowLocationGate ? (
        <div className="pointer-events-none absolute left-5 right-5 top-1/2 z-20 mx-auto max-w-xs -translate-y-1/2 rounded-[14px] bg-white/92 px-4 py-3 text-center shadow-[2px_2px_0_rgba(35,35,31,0.72)]">
          <p className="text-sm font-black text-[#252520]">아직 이 공간에 떠 있는 생각이 없어요.</p>
          <p className="mt-1 text-xs font-bold text-[#6f6b61]">첫 생각을 띄워볼까요?</p>
        </div>
      ) : null}

      <CreateFlameSheet
        key={createOpen ? 'create-open' : 'create-closed'}
        open={createOpen}
        topics={topics}
        remoteSuggestions={suggestions}
        slots={slots}
        onClose={() => setCreateOpen(false)}
        onSuggest={handleSuggest}
        onSubmit={handleCreate}
        onExtinguish={handleExtinguish}
        submitMessage={createFeedback}
      />
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
      />
    </main>
  );
}
