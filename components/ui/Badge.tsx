import type { PropsWithChildren } from 'react';

export function Badge({ children }: PropsWithChildren) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-full border border-[#e6e5e0] bg-[#fafaf7] px-3 text-xs font-semibold text-[#5a5852]">
      {children}
    </span>
  );
}
