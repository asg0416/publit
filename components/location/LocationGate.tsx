'use client';

import { MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { LocationState } from './useMovingLocation';

type LocationGateProps = {
  state: LocationState;
  onRequest: () => void;
  onQuietBrowse: () => void;
};

const locationButtonLabels: Record<LocationState['status'], string> = {
  idle: '위치 허용',
  requesting: '확인 중',
  granted: '위치 새로고침',
  denied: '권한 다시 확인',
  unsupported: '지원 안됨',
  unavailable: '다시 시도',
};

export function LocationGate({ state, onRequest, onQuietBrowse }: LocationGateProps) {
  return (
    <section className="rounded-xl bg-white/[0.06] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#4cc9f0]/16 text-[#8ee7ff]">
          <MapPin size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#f7efe3]">지금 이 공간을 기준으로 볼게요.</p>
          <p className="mt-1 text-xs leading-5 text-[#99a7b7]">
            정확한 위치는 저장하지 않고, 서버에서 거친 공간 키로만 바꿉니다.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={onRequest} disabled={state.status === 'requesting' || state.status === 'unsupported'}>
          <RefreshCw size={16} />
          {locationButtonLabels[state.status]}
        </Button>
        <Button variant="secondary" onClick={onQuietBrowse}>조용히 둘러보기</Button>
      </div>
      {state.message ? <p className="mt-3 text-xs text-[#ffca8a]">{state.message}</p> : null}
    </section>
  );
}
