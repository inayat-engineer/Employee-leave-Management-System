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

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

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

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!token) {
      setTokenMissing(true);
    }
  }, [token]);

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) return;

    setSubmitError(null);
    try {
      await resetPassword({ token, password: values.password });
      toast.success('Password reset — you are now signed in.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'This reset link is invalid or has expired. Please request a new one.',
      );
      setSubmitError(message);
      toast.error(message);
    }
  }

  if (tokenMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-red-500/30 bg-red-500/10 text-center">
          <AlertTriangle className="mx-auto text-red-300" size={28} />
          <h1 className="mt-4 text-lg font-semibold text-text">Reset link unavailable</h1>
          <p className="mt-2 text-sm text-red-100/90">This reset link is missing a token.</p>
          <p className="mt-4 text-sm text-text-muted">
            Head back to the sign-in page and request a new reset link.
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
            <h1 className="text-xl font-semibold text-text">Set a new password</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-text-muted">
          Choose a new password for your account.
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
            {isSubmitting ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
