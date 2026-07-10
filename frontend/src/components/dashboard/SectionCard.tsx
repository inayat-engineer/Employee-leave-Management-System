import { Card } from '@/components/ui/Card';
import { type ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({ title, description, action, children }: SectionCardProps) {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}
