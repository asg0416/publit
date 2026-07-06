'use client';

import { useMemo, useState } from 'react';
import { Check, EyeOff, RefreshCw, Trash2 } from 'lucide-react';
import { publitApi } from '@/lib/supabaseClient';
import type { ReportReason } from '@/lib/flame/types';

type AdminReport = {
  id: string;
  flameId: string;
  reason: ReportReason;
  detail?: string | null;
  createdAt: string;
  thought: {
    id: string;
    text: string;
    tagLabel: string;
    tagNormalized: string;
    status: string;
    heatScore: number;
    createdAt: string;
  };
};

const reasonLabels: Record<ReportReason, string> = {
  misinformation: '오정보',
  doxxing: '신상공개',
  violence: '폭력 유도',
  illegal: '불법',
  hate: '혐오',
  spam: '스팸',
  privacy: '사생활',
  other: '기타',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AdminReportsClient() {
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.sessionStorage.getItem('anigeunde_admin_token') ?? '';
    } catch {
      return '';
    }
  });
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [status, setStatus] = useState('운영 토큰을 입력하면 신고 큐를 볼 수 있어요.');
  const [loading, setLoading] = useState(false);
  const canLoad = token.trim().length > 0;

  const groupedReports = useMemo(() => {
    const map = new Map<string, AdminReport[]>();
    for (const report of reports) {
      const list = map.get(report.flameId) ?? [];
      list.push(report);
      map.set(report.flameId, list);
    }
    return Array.from(map.values());
  }, [reports]);

  const loadReports = async () => {
    if (!canLoad) return;
    setLoading(true);
    setStatus('신고 큐를 불러오는 중이에요.');
    try {
      const next = await publitApi.adminReports({}, token.trim());
      setReports(next);
      window.sessionStorage.setItem('anigeunde_admin_token', token.trim());
      setStatus(next.length ? `${next.length}개 신고를 확인했어요.` : '처리할 신고가 없어요.');
    } catch {
      setStatus('관리자 토큰을 확인하지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const resolveReport = async (reportId: string, action: 'keep' | 'hide' | 'delete') => {
    if (!canLoad) return;
    setStatus('처리 중이에요.');
    try {
      await publitApi.adminResolveReport({ reportId, action }, token.trim());
      setReports((current) => current.filter((report) => report.id !== reportId));
      setStatus(action === 'keep' ? '생각을 유지했어요.' : action === 'hide' ? '생각을 숨겼어요.' : '생각을 삭제했어요.');
    } catch {
      setStatus('신고를 처리하지 못했어요.');
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-5 text-[#252520]">
      <section className="mx-auto grid max-w-5xl gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3 rounded-[18px] bg-white p-4 shadow-[3px_3px_0_rgba(35,35,31,0.82),0_0_0_1px_rgba(35,35,31,0.08)]">
          <div>
            <p className="-skew-x-6 text-2xl font-black italic leading-none">ANGD</p>
            <h1 className="mt-2 text-xl font-black">신고 관리</h1>
            <p className="mt-1 text-sm font-bold text-[#6f6b61]">신고된 생각을 확인하고 유지, 숨김, 삭제 처리해요.</p>
          </div>
          <form
            className="grid w-full gap-2 sm:w-auto sm:min-w-[22rem] sm:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void loadReports();
            }}
          >
            <label className="sr-only" htmlFor="admin-token">관리자 토큰</label>
            <input
              id="admin-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              type="password"
              autoComplete="current-password"
              className="min-h-11 rounded-[13px] border border-[#d5d2c8] bg-white px-3 text-sm font-bold outline-none focus:border-[#ef3b32] focus:shadow-[0_0_0_3px_rgba(239,59,50,0.14)]"
              placeholder="ADMIN_TOKEN"
            />
            <button
              type="submit"
              disabled={!canLoad || loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[13px] bg-[#ef3b32] px-4 text-sm font-black text-white shadow-[2px_2px_0_rgba(35,35,31,0.72)] transition-[transform,opacity] active:scale-[0.96] disabled:opacity-45"
            >
              <RefreshCw size={16} />
              새로고침
            </button>
          </form>
        </header>

        <p className="rounded-[14px] bg-[#f5f5f5] px-4 py-3 text-sm font-black text-[#5a5852] shadow-[1px_1px_0_rgba(35,35,31,0.32)]">{status}</p>

        <div className="grid gap-3">
          {groupedReports.map((group) => {
            const first = group[0];
            return (
              <article key={first.flameId} className="grid gap-3 rounded-[18px] bg-white p-4 shadow-[3px_3px_0_rgba(35,35,31,0.78),0_0_0_1px_rgba(35,35,31,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="inline-flex rounded-full bg-[#ef3b32] px-3 py-1 text-xs font-black text-white">{first.thought.tagLabel}</p>
                    <p className="mt-3 text-pretty text-lg font-black leading-7">{first.thought.text}</p>
                    <p className="mt-2 text-xs font-bold text-[#6f6b61]">
                      상태 {first.thought.status} · 반응열 {first.thought.heatScore} · {formatDate(first.thought.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#ffda68] px-3 py-1 text-xs font-black text-[#252520] shadow-[1px_1px_0_rgba(35,35,31,0.42)]">
                    신고 {group.length}
                  </span>
                </div>
                <div className="grid gap-2">
                  {group.map((report) => (
                    <div key={report.id} className="grid gap-2 rounded-[12px] bg-[#f5f5f5] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div>
                        <p className="text-sm font-black">{reasonLabels[report.reason]}</p>
                        {report.detail ? <p className="mt-1 text-xs font-bold text-[#6f6b61]">{report.detail}</p> : null}
                        <p className="mt-1 text-[10px] font-bold text-[#9a968c]">{formatDate(report.createdAt)}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => void resolveReport(report.id, 'keep')}
                          className="grid min-h-10 place-items-center rounded-[11px] bg-white text-[#252520] shadow-[1px_1px_0_rgba(35,35,31,0.42)] transition-transform active:scale-[0.96]"
                          aria-label="유지"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void resolveReport(report.id, 'hide')}
                          className="grid min-h-10 place-items-center rounded-[11px] bg-[#252520] text-white shadow-[1px_1px_0_rgba(239,59,50,0.75)] transition-transform active:scale-[0.96]"
                          aria-label="숨김"
                        >
                          <EyeOff size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void resolveReport(report.id, 'delete')}
                          className="grid min-h-10 place-items-center rounded-[11px] bg-[#ef3b32] text-white shadow-[1px_1px_0_rgba(35,35,31,0.72)] transition-transform active:scale-[0.96]"
                          aria-label="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
