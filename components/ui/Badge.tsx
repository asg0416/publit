import type { PropsWithChildren } from 'react';

export function Badge({ children }: PropsWithChildren) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-full bg-white/10 px-3 text-xs font-semibold text-[#d9e5ef] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
      {children}
    </span>
  );
}
