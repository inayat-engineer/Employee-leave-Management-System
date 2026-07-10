import { Card } from '@/components/ui/Card';

type StatCardProps = {
  title: string;
  value: string | number;
  note: string;
  accent?: 'accent' | 'accent-muted' | 'emerald' | 'rose';
};

const accentClasses: Record<NonNullable<StatCardProps['accent']>, string> = {
  accent: 'bg-accent',
  'accent-muted': 'bg-accent-muted',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
};

export function StatCard({ title, value, note, accent = 'accent' }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClasses[accent]}`} />
      <p className="text-sm text-text-muted">{title}</p>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-text">{value}</div>
      <p className="mt-2 text-sm text-text-muted">{note}</p>
    </Card>
  );
}
