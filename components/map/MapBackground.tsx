export function MapBackground() {
  return (
    <div
      data-testid="mapglot-background"
      data-map-provider="mapglot"
      className="absolute inset-0 overflow-hidden bg-[#e9ece6]"
      aria-hidden="true"
    >
      <div className="anigeunde-map-surface absolute inset-0" />
      <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-[#252520] shadow-[1px_1px_0_rgba(35,35,31,0.68)]">
        MapGlot
      </div>
    </div>
  );
}
