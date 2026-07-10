import { Card } from '@/components/ui/Card';

type SummaryPillProps = {
  label: string;
  value: string;
};

export function SummaryPill({ label, value }: SummaryPillProps) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
    </Card>
  );
}
