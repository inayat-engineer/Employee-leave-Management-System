import { Card } from '@/components/ui/Card';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="animate-pulse space-y-4">
        <div className="h-4 w-40 rounded-full bg-surface-soft" />
        <div className="h-8 w-2/3 rounded-2xl bg-surface-soft" />
        <div className="h-4 w-1/2 rounded-full bg-surface-soft" />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse space-y-3">
            <div className="h-4 w-24 rounded-full bg-surface-soft" />
            <div className="h-8 w-20 rounded-2xl bg-surface-soft" />
            <div className="h-3 w-3/4 rounded-full bg-surface-soft" />
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="h-[22rem] animate-pulse bg-surface-soft/30" />
        <Card className="h-[22rem] animate-pulse bg-surface-soft/30" />
      </div>

      <Card className="h-[22rem] animate-pulse bg-surface-soft/30" />
    </div>
  );
}
