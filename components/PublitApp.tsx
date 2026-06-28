'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flame, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LocationGate } from '@/components/location/LocationGate';
import { useMovingLocation } from '@/components/location/useMovingLocation';
import { FlameRadar } from '@/components/radar/FlameRadar';
import { CreateFlameSheet } from '@/components/flame/CreateFlameSheet';
import { FlameDetailSheet } from '@/components/flame/FlameDetailSheet';
import { getDeviceHash } from '@/lib/device';
import { publitApi } from '@/lib/supabaseClient';
import type { Flame as FlameType, HotTopic, ReactionType, ReportReason, TagSuggestion } from '@/lib/flame/types';

const NEARBY_REFRESH_INTERVAL_MS = 12_000;

const fallbackTopics: HotTopic[] = [
  { displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily', scope: 'global', heatLabel: '오늘 많이 켜진 불꽃' },
  { displayLabel: '#지역교통', normalizedKey: '지역교통', category: 'local', scope: 'global', heatLabel: '근처에서 켜지고 있어요' },
  { displayLabel: '#안전', normalizedKey: '안전', category: 'safety', scope: 'global', heatLabel: '이 공간에서 번지고 있어요' },
];

export function PublitApp() {
  const [deviceHash, setDeviceHash] = useState('');
  const [flames, setFlames] = useState<FlameType[]>([]);
  const [topics, setTopics] = useState<HotTopic[]>(fallbackTopics);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [slots, setSlots] = useState<{ used: number; limit: number; activeFlames: Array<{ id: string; tagLabel: string; status: string; createdAt: string }> } | null>(null);
  const [selected, setSelected] = useState<FlameType | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number; grid: string } | null>(null);
  const [status, setStatus] = useState('같은 공간에 떠 있는 순간의 생각을 불꽃으로 확인해보세요.');
  const [createFeedback, setCreateFeedback] = useState('');

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

  const refreshNearby = useCallback(async (position: { lat: number; lng: number; grid: string }, options: { silent?: boolean } = {}) => {
    setLastPosition(position);
    if (!options.silent) setStatus('근처 불꽃을 새로 살피는 중이에요.');
    try {
      const next = await publitApi.nearbyFlames({ lat: position.lat, lng: position.lng });
      setFlames(next);
      if (!options.silent) {
        setStatus(next.length ? '근처 불꽃이 레이더에 떠 있어요.' : '아직 이 공간에 떠 있는 불꽃이 없어요.');
        setCreateFeedback('');
      }
      void refreshTopics(position);
      void refreshSlots();
    } catch {
      if (!options.silent) setStatus('근처 불꽃을 불러오지 못했어요. 잠시 후 다시 시도해보세요.');
    }
  }, [refreshSlots, refreshTopics]);

  const { state: locationState, requestLocation } = useMovingLocation(refreshNearby);

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
    if (!lastPosition) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refreshNearby(lastPosition, { silent: true });
    }, NEARBY_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [lastPosition, refreshNearby]);

  const hotSummary = useMemo(() => topics.slice(0, 3), [topics]);

  const handleSuggest = useCallback(async (text: string) => {
    try {
      const next = await publitApi.suggestTags({
        text,
        lat: lastPosition?.lat,
        lng: lastPosition?.lng,
      });
      setSuggestions(next);
    } catch {
      setSuggestions([]);
    }
  }, [lastPosition]);

  const handleCreate = useCallback(async (input: { text: string; tagLabel: string; category: string; mood: string; selfStrength: number }) => {
    if (!deviceHash) {
      const message = '기기 확인이 아직 끝나지 않았어요. 잠시 후 다시 눌러주세요.';
      setCreateFeedback(message);
      setStatus(message);
      return;
    }
    if (!lastPosition) {
      const message = '위치 권한을 먼저 허용하면 불꽃을 띄울 수 있어요.';
      setCreateFeedback(message);
      setStatus(message);
      requestLocation();
      return;
    }
    setCreateFeedback('');
    try {
      const result = await publitApi.createFlame({ ...input, ...lastPosition, deviceHash });
      if (result.flame) {
        setFlames((current) => [result.flame!, ...current.filter((flame) => flame.id !== result.flame!.id)]);
        setCreateOpen(false);
        setCreateFeedback('');
        setStatus('내 불꽃이 레이더에 켜졌어요.');
      }
      if (result.activeFlames) {
        setSlots({ used: result.activeFlames.length, limit: 3, activeFlames: result.activeFlames });
      } else {
        void refreshSlots();
      }
    } catch (error) {
      const message = error instanceof Error && error.message === 'FLAME_SLOT_FULL' ? '내 불꽃이 모두 켜져 있어요.' : '불꽃을 띄우지 못했어요. 잠시 후 다시 시도해보세요.';
      setCreateFeedback(message);
      setStatus(message);
    }
  }, [deviceHash, lastPosition, refreshSlots, requestLocation]);

  const handleExtinguish = useCallback(async (flameId: string) => {
    if (!deviceHash) return;
    try {
      await publitApi.extinguishFlame({ flameId, deviceHash });
      setFlames((current) => current.filter((flame) => flame.id !== flameId));
      void refreshSlots();
      setStatus('내 불꽃을 껐어요.');
    } catch {
      setStatus('불꽃을 끄지 못했어요.');
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
    <main className="min-h-screen w-full px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
      <div data-testid="publit-shell" className="mx-auto grid w-full max-w-6xl gap-5 lg:gap-6">
      <header className="flex items-start justify-between gap-4 lg:items-end">
        <div>
          <p className="text-sm font-black tracking-[0.22em] text-[#ffca8a]">Publit</p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-[#f7efe3] [text-wrap:balance] sm:text-3xl lg:text-4xl">지금 이 공간의 불꽃</h1>
          <p className="mt-1 text-sm text-[#99a7b7] lg:text-base">반경 500m · 정확한 좌표 없음</p>
        </div>
        <button
          type="button"
          onClick={requestLocation}
          className="grid size-10 place-items-center rounded-lg bg-white/10 text-[#d9e5ef] transition-[transform,opacity] active:scale-[0.96]"
          aria-label="새로고침"
        >
          <RefreshCw size={18} />
        </button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start lg:gap-6">
      <section data-testid="radar-panel" className="grid gap-4 lg:min-w-0">
        <LocationGate state={locationState} onRequest={requestLocation} onQuietBrowse={() => setStatus('조용히 둘러보는 중이에요.')} />
        <div className="rounded-2xl bg-[#101821]/82 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] lg:p-6">
          <FlameRadar flames={displayedFlames} onSelect={setSelected} />
          {displayedFlames.length === 0 ? (
            <div className="mt-5 rounded-xl bg-black/16 p-4 text-center">
              <p className="text-base font-bold text-[#f7efe3]">아직 이 공간에 떠 있는 불꽃이 없어요.</p>
              <p className="mt-1 text-sm text-[#99a7b7]">첫 불꽃을 띄워볼까요?</p>
            </div>
          ) : null}
        </div>
      </section>

      <section data-testid="summary-panel" className="grid gap-3 rounded-2xl bg-[#101821]/78 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.24)] lg:sticky lg:top-8 lg:p-5">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-[#ff9a3d]" />
          <h2 className="text-base font-bold text-[#f7efe3]">현재 공간 요약</h2>
        </div>
        <p className="text-sm leading-6 text-[#d9e5ef]">{status}</p>
        <div className="flex flex-wrap gap-2">
          {hotSummary.map((topic) => <Badge key={`${topic.scope}-${topic.normalizedKey}`}>{topic.displayLabel}</Badge>)}
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:grid-cols-2">
          <Button onClick={() => { setCreateFeedback(''); setCreateOpen(true); }}>내 불꽃 띄우기</Button>
          <Button variant="secondary" onClick={requestLocation}>새로고침</Button>
        </div>
      </section>

      </div>
      </div>
      <CreateFlameSheet
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
        onClose={() => setSelected(null)}
        onReact={handleReact}
        onReport={handleReport}
      />
    </main>
  );
}
