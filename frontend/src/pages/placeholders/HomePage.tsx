import { Card } from '@/components/ui/Card';

export function HomePage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card className="bg-radial-grid">
        <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Chunk 1 scaffold</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text">
          Employee Leave Management System
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-text-muted">
          This shell is wired for routing, theme persistence, and API access. The app starts in a
          dark SaaS-style layout and is ready for auth and dashboard work in the next chunk.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-text">Ready for expansion</h3>
        <ul className="mt-4 space-y-3 text-sm text-text-muted">
          <li>React Router v6 route structure</li>
          <li>Theme context with localStorage persistence</li>
          <li>Axios client with token-aware interceptor</li>
          <li>Reusable Button and Card primitives</li>
        </ul>
      </Card>
    </div>
  );
}