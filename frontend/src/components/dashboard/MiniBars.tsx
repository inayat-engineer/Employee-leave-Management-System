type MiniBarsProps = {
  data: Array<{ label: string; value: number }>;
};

export function MiniBars({ data }: MiniBarsProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="grid grid-cols-12 gap-3 items-end h-56">
      {data.map((item) => {
        const height = Math.max((item.value / maxValue) * 100, 6);

        return (
          <div key={item.label} className="col-span-1 flex h-full flex-col items-center justify-end gap-2">
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-accent via-accent/70 to-accent-muted transition-all"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-[11px] text-text-muted">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
