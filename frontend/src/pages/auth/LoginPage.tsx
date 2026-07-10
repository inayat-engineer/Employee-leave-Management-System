import { useState } from 'react';
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function getApiErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { detail?: unknown } } })
      .response;
    const detail = response?.data?.detail;

    if (Array.isArray(detail)) {
      return 'Please fix the highlighted fields.';
    }

    if (typeof detail === 'string') {
      return detail;
    }
  }

  return 'Unable to sign in right now. Please try again.';
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);

    try {
      await login({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      });
      toast.success('Signed in successfully');
      navigate(fromPath, { replace: true });
    } catch (error) {
      const apiError = error as {
        response?: { status?: number; data?: { detail?: unknown } };
      };

      if (apiError.response?.status === 422 && Array.isArray(apiError.response.data?.detail)) {
        for (const issue of apiError.response.data.detail as Array<{ loc?: unknown[]; msg?: string }>) {
          const fieldName = issue.loc?.[issue.loc.length - 1];
          if (fieldName === 'username') {
            setError('email', { type: 'server', message: issue.msg ?? 'Invalid email' });
          }
          if (fieldName === 'password') {
            setError('password', { type: 'server', message: issue.msg ?? 'Invalid password' });
          }
        }
        setSubmitError('Please correct the highlighted fields.');
        return;
      }

      const message = getApiErrorMessage(error);
      setSubmitError(message);
      toast.error(message);
    }
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
            <h1 className="text-xl font-semibold text-text">Sign in to continue</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-text-muted">
          Use your company email and password to access the employee portal.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label className="mb-2 block text-sm font-medium text-text" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="you@company.com"
              {...register('email')}
            />
            {errors.email ? <p className="mt-2 text-sm text-red-400">{errors.email.message}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border bg-surface-soft text-accent focus:ring-accent/20"
                {...register('rememberMe')}
              />
              Remember me
            </label>
            <span className="text-sm text-text-muted">Contact HR for account access</span>
          </div>

          {submitError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {submitError}
            </div>
          ) : null}

          <Button type="submit" className="w-full gap-2 py-3.5" disabled={isSubmitting}>
            <LogIn size={18} />
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}