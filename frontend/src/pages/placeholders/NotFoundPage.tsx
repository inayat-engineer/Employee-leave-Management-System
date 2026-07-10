import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';

export function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <p className="text-sm uppercase tracking-[0.28em] text-text-muted">404</p>
      <h2 className="mt-3 text-2xl font-semibold text-text">Page not found</h2>
      <p className="mt-3 text-sm leading-6 text-text-muted">
        The route you requested does not exist yet.
      </p>
      <Link className="mt-6 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white" to="/">
        Return home
      </Link>
    </Card>
  );
}