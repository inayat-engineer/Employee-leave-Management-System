type MiniDonutProps = {
  segments: Array<{ label: string; value: number; color: string }>;
};

export function MiniDonut({ segments }: MiniDonutProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  let accumulated = 0;

  const stops = segments
    .map((segment) => {
      const start = (accumulated / total) * 100;
      accumulated += segment.value;
      const end = (accumulated / total) * 100;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-52 w-52 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="absolute inset-6 rounded-full border border-border bg-surface shadow-inner shadow-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-semibold text-text">{total}</div>
            <div className="text-xs uppercase tracking-[0.28em] text-text-muted">Leaves</div>
          </div>
        </div>
      </div>

      <div className="grid w-full gap-2 sm:grid-cols-3">
        {segments.map((segment) => (
          <div key={segment.label} className="rounded-2xl border border-border bg-surface-soft/70 px-3 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              <span className="text-text">{segment.label}</span>
            </div>
            <div className="mt-1 text-xs text-text-muted">{segment.value} requests</div>
          </div>
        ))}
      </div>
    </div>
  );
}
