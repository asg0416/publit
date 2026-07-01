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
    <section data-testid="location-gate" className="publit-panel-enter rounded-[16px] bg-white p-4 text-[#252520] shadow-[3px_3px_0_rgba(35,35,31,0.82),0_0_0_1px_rgba(35,35,31,0.08)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#ef3b32] text-white shadow-[1px_1px_0_rgba(35,35,31,0.58)]">
          <MapPin size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#252520]">지금 이 공간을 기준으로 볼게요.</p>
          <p className="mt-1 text-xs leading-5 text-[#6f6b61]">
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
      {state.message ? <p className="mt-3 rounded-lg bg-[#ef3b32]/10 px-3 py-2 text-xs font-bold leading-5 text-[#b52620]">{state.message}</p> : null}
    </section>
  );
}
