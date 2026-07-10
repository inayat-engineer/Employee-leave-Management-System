import { useEffect, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';

const activateSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ActivateFormValues = z.infer<typeof activateSchema>;

type InviteDetails = {
  full_name: string;
  email: string;
};

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

export function ActivatePage() {
  const { token } = useParams<{ token: string }>();
  const { acceptInvite } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingInvite, setIsCheckingInvite] = useState(true);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ActivateFormValues>({
    resolver: zodResolver(activateSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    let isMounted = true;

    async function loadInvite() {
      if (!token) {
        setInviteError('This invite link is missing a token.');
        setIsCheckingInvite(false);
        return;
      }

      try {
        const response = await api.get<InviteDetails>(`/auth/invite/${token}`);
        if (isMounted) {
          setInvite(response.data);
        }
      } catch (error) {
        if (isMounted) {
          setInviteError(getApiErrorMessage(error, 'This invite link is invalid or has expired.'));
        }
      } finally {
        if (isMounted) {
          setIsCheckingInvite(false);
        }
      }
    }

    void loadInvite();
    return () => {
      isMounted = false;
    };
  }, [token]);

  async function onSubmit(values: ActivateFormValues) {
    if (!token) return;

    setSubmitError(null);
    try {
      await acceptInvite({ token, password: values.password });
      toast.success('Account activated — welcome to LeaveOps!');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to activate your account right now.');
      setSubmitError(message);
      toast.error(message);
    }
  }

  if (isCheckingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-border/80 bg-surface/95 text-center">
          <Loader2 className="mx-auto animate-spin text-accent" size={28} />
          <p className="mt-4 text-sm text-text-muted">Checking your invite link...</p>
        </Card>
      </div>
    );
  }

  if (inviteError || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-red-500/30 bg-red-500/10 text-center">
          <AlertTriangle className="mx-auto text-red-300" size={28} />
          <h1 className="mt-4 text-lg font-semibold text-text">Invite link unavailable</h1>
          <p className="mt-2 text-sm text-red-100/90">{inviteError}</p>
          <p className="mt-4 text-sm text-text-muted">
            Ask HR to send you a new invite, or head back to the sign-in page.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-border/80 bg-surface/95 shadow-glow backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-text-muted">LeaveOps</p>
            <h1 className="text-xl font-semibold text-text">Welcome, {invite.full_name.split(' ')[0]}</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-text-muted">
          Set a password for <span className="text-text">{invite.email}</span> to activate your account.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label className="mb-2 block text-sm font-medium text-text" htmlFor="password">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 pr-12 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                placeholder="••••••••"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-4 text-text-muted transition hover:text-text"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password ? <p className="mt-2 text-sm text-red-400">{errors.password.message}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="••••••••"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className="mt-2 text-sm text-red-400">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          {submitError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {submitError}
            </div>
          ) : null}

          <Button type="submit" className="w-full gap-2 py-3.5" disabled={isSubmitting}>
            {isSubmitting ? 'Activating...' : 'Activate account'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
