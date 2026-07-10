import { Card } from '@/components/ui/Card';

export function DashboardPage() {
  return (
    <Card>
      <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Dashboard placeholder</p>
      <h2 className="mt-3 text-2xl font-semibold text-text">Dashboard data lands in Chunk 4</h2>
      <p className="mt-3 text-sm leading-6 text-text-muted">
        This route exists now so the authenticated shell can be layered in without changing the
        router shape later.
      </p>
    </Card>
  );
}