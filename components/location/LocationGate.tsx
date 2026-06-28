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
    <section data-testid="location-gate" className="publit-panel-enter rounded-xl border border-[#e6e5e0] bg-white p-4 text-[#26251e]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#9fbbe0]/35 text-[#26251e]">
          <MapPin size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#26251e]">지금 이 공간을 기준으로 볼게요.</p>
          <p className="mt-1 text-xs leading-5 text-[#807d72]">
            정확한 위치는 저장하지 않고, 서버에서 거친 공간 키로만 바꿉니다.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button onClick={onRequest} disabled={state.status === 'requesting' || state.status === 'unsupported'}>
          <RefreshCw size={16} className={state.status === 'requesting' ? 'publit-spin-soft' : ''} />
          {locationButtonLabels[state.status]}
        </Button>
        <Button variant="secondary" onClick={onQuietBrowse}>조용히 둘러보기</Button>
      </div>
      {state.message ? <p className="mt-3 rounded-lg bg-[#f54e00]/10 px-3 py-2 text-xs leading-5 text-[#8a2d00]">{state.message}</p> : null}
    </section>
  );
}
