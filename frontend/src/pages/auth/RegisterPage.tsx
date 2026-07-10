import { useState } from 'react';
import { Eye, EyeOff, UserPlus, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm your password'),
  department: z.string().optional(),
  designation: z.string().optional(),
  phoneNumber: z.string().optional(),
  profilePictureUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  joiningDate: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      department: '',
      designation: '',
      phoneNumber: '',
      profilePictureUrl: '',
      joiningDate: '',
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setSubmitError(null);

    try {
      await registerUser({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        department: values.department || undefined,
        designation: values.designation || undefined,
        phoneNumber: values.phoneNumber || undefined,
        profilePictureUrl: values.profilePictureUrl || undefined,
        joiningDate: values.joiningDate || undefined,
      });

      toast.success('Account created successfully');
      navigate('/login', { replace: true });
    } catch (error) {
      const apiError = error as {
        response?: { status?: number; data?: { detail?: unknown } };
      };

      if (apiError.response?.status === 400) {
        setError('email', { type: 'server', message: 'Email already registered' });
        setSubmitError('Email already registered');
        toast.error('Email already registered');
        return;
      }

      if (apiError.response?.status === 422 && Array.isArray(apiError.response.data?.detail)) {
        for (const issue of apiError.response.data.detail as Array<{ loc?: unknown[]; msg?: string }>) {
          const fieldName = issue.loc?.[issue.loc.length - 1];
          if (typeof fieldName === 'string' && fieldName in errors) {
            setError(fieldName as keyof RegisterFormValues, {
              type: 'server',
              message: issue.msg ?? 'Invalid value',
            });
          }
        }
        setSubmitError('Please fix the highlighted fields.');
        return;
      }

      const message = 'Unable to create your account right now. Please try again.';
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl border-border/80 bg-surface/95 shadow-glow backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-text-muted">LeaveOps</p>
            <h1 className="text-xl font-semibold text-text">Create your account</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-text-muted">
          Register your employee profile and choose a strong password to get started.
        </p>

        <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label className="mb-2 block text-sm font-medium text-text" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="Jane Doe"
              {...register('fullName')}
            />
            {errors.fullName ? <p className="mt-2 text-sm text-red-400">{errors.fullName.message}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="jane@company.com"
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
                autoComplete="new-password"
                className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 pr-12 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                placeholder="Minimum 8 characters"
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
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 pr-12 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                placeholder="Repeat your password"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-4 text-text-muted transition hover:text-text"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword ? (
              <p className="mt-2 text-sm text-red-400">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text" htmlFor="department">
              Department
            </label>
            <input
              id="department"
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="Human Resources"
              {...register('department')}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text" htmlFor="designation">
              Designation
            </label>
            <input
              id="designation"
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="HR Associate"
              {...register('designation')}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text" htmlFor="phoneNumber">
              Phone number
            </label>
            <input
              id="phoneNumber"
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="+1 555 123 4567"
              {...register('phoneNumber')}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text" htmlFor="joiningDate">
              Joining date
            </label>
            <input
              id="joiningDate"
              type="date"
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              {...register('joiningDate')}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-text" htmlFor="profilePictureUrl">
              Profile picture URL
            </label>
            <input
              id="profilePictureUrl"
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="https://..."
              {...register('profilePictureUrl')}
            />
            {errors.profilePictureUrl ? (
              <p className="mt-2 text-sm text-red-400">{errors.profilePictureUrl.message}</p>
            ) : (
              <p className="mt-2 text-xs text-text-muted">
                File upload is not available in the backend yet, so this uses a URL field for now.
              </p>
            )}
          </div>

          {submitError ? (
            <div className="md:col-span-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {submitError}
            </div>
          ) : null}

          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate('/login')}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2" disabled={isSubmitting}>
              <UserPlus size={18} />
              {isSubmitting ? 'Creating...' : 'Create account'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}