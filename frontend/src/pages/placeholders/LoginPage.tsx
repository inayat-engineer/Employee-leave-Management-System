import { Card } from '@/components/ui/Card';

export function LoginPage() {
  return (
    <Card className="mx-auto max-w-xl">
      <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Login placeholder</p>
      <h2 className="mt-3 text-2xl font-semibold text-text">Authentication arrives in Chunk 2</h2>
      <p className="mt-3 text-sm leading-6 text-text-muted">
        The real form, validation, and error handling will be added after the auth context is in
        place.
      </p>
    </Card>
  );
}