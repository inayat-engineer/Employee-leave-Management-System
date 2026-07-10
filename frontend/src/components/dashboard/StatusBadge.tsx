import { cn } from '@/utils/cn';

type StatusBadgeProps = {
  status: 'pending' | 'approved' | 'rejected';
};

const statusClasses = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/20',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize', statusClasses[status])}>
      {status}
    </span>
  );
}
