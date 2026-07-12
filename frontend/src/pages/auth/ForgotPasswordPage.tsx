import { useState } from 'react';
import { KeyRound, ArrowLeft, MailCheck } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await forgotPassword(values.email);
    } catch {
      // Intentionally ignored: the backend always returns a generic success
      // response regardless of whether the email exists, to avoid leaking
      // which addresses are registered. Any unexpected network error still
      // shows the same confirmation screen — there's nothing more specific
      // and safe to tell the user here.
    } finally {
      setIsSubmitted(true);
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-border/80 bg-surface/95 text-center shadow-glow backdrop-blur-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <MailCheck size={22} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-text">Check your email</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            If that email is registered with LeaveOps, we've sent a link to reset your password.
            It expires in 1 hour.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-border/80 bg-surface/95 shadow-glow backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <KeyRound size={22} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-text-muted">LeaveOps</p>
            <h1 className="text-xl font-semibold text-text">Reset your password</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-text-muted">
          Enter your company email and we'll send you a link to reset your password.
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

          <Button type="submit" className="w-full gap-2 py-3.5" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm font-medium text-text-muted hover:text-text"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>
        </form>
      </Card>
    </div>
  );
}
