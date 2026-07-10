import { Card } from '@/components/ui/Card';

type FeaturePlaceholderPageProps = {
  title: string;
  description: string;
};

export function FeaturePlaceholderPage({ title, description }: FeaturePlaceholderPageProps) {
  return (
    <Card>
      <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Coming soon</p>
      <h2 className="mt-3 text-2xl font-semibold text-text">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">{description}</p>
    </Card>
  );
}