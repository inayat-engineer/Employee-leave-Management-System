import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MailCheck, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { verifyEmailChange } from '@/services/employees';

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown } } }).response;
    const detail = response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
  }
  return fallback;
}

type VerifyState = 'checking' | 'success' | 'error';

export function VerifyEmailChangePage() {
  const { token } = useParams<{ token: string }>();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<VerifyState>('checking');
  const [message, setMessage] = useState<string | null>(null);
  // Effects can run twice in dev (React StrictMode) — the verification
  // token is single-use server-side, so guard against firing it twice.
  const hasRun = useRef(false);

  useEffect(() => {
    if (!token || hasRun.current) return;
    hasRun.current = true;

    async function run() {
      try {
        const result = await verifyEmailChange(token as string);
        setMessage(result.detail);
        setState('success');
        // The backend already invalidated the session that requested this
        // change (identity changed, so every existing token is revoked).
        // Clear local auth state too so the app doesn't think it's still
        // signed in as the old identity.
        await logout();
      } catch (error) {
        setMessage(
          getApiErrorMessage(
            error,
            'This verification link is invalid or has expired. Request the email change again from your profile.',
          ),
        );
        setState('error');
      }
    }

    void run();
  }, [token, logout]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-border/80 bg-surface/95 shadow-glow backdrop-blur-xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <MailCheck size={22} />
        </div>

        {state === 'checking' ? (
          <>
            <h1 className="mt-4 text-xl font-semibold text-text">Confirming your new email…</h1>
            <div className="mt-6 flex justify-center">
              <Loader2 className="animate-spin text-text-muted" size={28} />
            </div>
          </>
        ) : null}

        {state === 'success' ? (
          <>
            <CheckCircle2 className="mx-auto mt-2 text-emerald-400" size={28} />
            <h1 className="mt-4 text-xl font-semibold text-text">Email updated</h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">{message}</p>
            <Button className="mt-6 w-full py-3.5" onClick={() => navigate('/login', { replace: true })}>
              Go to sign in
            </Button>
          </>
        ) : null}

        {state === 'error' ? (
          <>
            <AlertTriangle className="mx-auto mt-2 text-red-300" size={28} />
            <h1 className="mt-4 text-xl font-semibold text-text">Verification failed</h1>
            <p className="mt-2 text-sm leading-6 text-red-100/90">{message}</p>
            <Button
              variant="secondary"
              className="mt-6 w-full py-3.5"
              onClick={() => navigate('/login', { replace: true })}
            >
              Back to sign in
            </Button>
          </>
        ) : null}
      </Card>
    </div>
  );
}