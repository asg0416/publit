type RangeCircleProps = {
  label: string;
};

export function RangeCircle({ label }: RangeCircleProps) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 size-[min(58vw,178px)] max-h-[178px] max-w-[178px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#252520]/35 bg-white/15"
      data-testid="range-circle"
    >
      <span
        className="absolute left-1/2 top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-[1px_1px_0_rgba(35,35,31,0.68)]"
        data-testid="range-center-marker"
      >
        <span className="size-2.5 rounded-full bg-[#0b6975]" />
      </span>
      <span className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-1 text-[9px] font-black text-[#252520] shadow-[1px_1px_0_rgba(35,35,31,0.72)]">
        {label}
      </span>
    </div>
  );
}
