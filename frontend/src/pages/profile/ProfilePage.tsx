import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase, CalendarDays, Lock, Mail, Phone, ShieldCheck, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { updateEmployee } from '@/services/employees';

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

// Deliberately does NOT include `email` — email changes go through their own
// card below, with re-authentication and email verification, instead of
// being bundled silently into a routine "update my phone number" save.
const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  department: z.string().optional(),
  designation: z.string().optional(),
  phone_number: z.string().optional(),
  joining_date: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const emailSchema = z.object({
  new_email: z.string().email('Enter a valid email address'),
  current_password: z.string().min(1, 'Enter your current password to confirm this change'),
});

type EmailFormValues = z.infer<typeof emailSchema>;

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(8, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [pendingEmailNotice, setPendingEmailNotice] = useState<string | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name ?? '',
      department: user?.department ?? '',
      designation: user?.designation ?? '',
      phone_number: user?.phone_number ?? '',
      joining_date: user?.joining_date ?? '',
    },
  });

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    reset: resetEmailForm,
    formState: { errors: emailErrors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { new_email: '', current_password: '' },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });

  async function onProfileSubmit(values: ProfileFormValues) {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateEmployee(user.id, {
        full_name: values.full_name,
        department: values.department || null,
        designation: values.designation || null,
        phone_number: values.phone_number || null,
        joining_date: values.joining_date || null,
      });
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update profile right now'));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function onEmailSubmit(values: EmailFormValues) {
    if (!user) return;
    setIsSavingEmail(true);
    try {
      await updateEmployee(user.id, {
        email: values.new_email,
        current_password: values.current_password,
      });
      setPendingEmailNotice(values.new_email);
      toast.success(`Confirmation link sent to ${values.new_email}`);
      resetEmailForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to change email right now'));
    } finally {
      setIsSavingEmail(false);
    }
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    if (!user) return;
    setIsSavingPassword(true);
    try {
      await updateEmployee(user.id, {
        password: values.new_password,
        current_password: values.current_password,
      });
      toast.success('Password changed successfully');
      resetPasswordForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to change password right now'));
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card className="bg-radial-grid overflow-hidden">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-accent/15 text-2xl font-semibold text-accent">
            {user.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Your profile</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text">{user.full_name}</h2>
            <p className="mt-2 text-sm text-text-muted">
              {user.designation ?? 'No designation set'} {user.department ? `· ${user.department}` : ''}
            </p>
          </div>
        </div>
      </Card>

      <Card className="border-border/80 bg-surface/95">
        <h3 className="text-lg font-semibold text-text">Personal information</h3>
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-text">Full name</span>
              <div className="relative mt-2">
                <UserIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  {...registerProfile('full_name')}
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {profileErrors.full_name ? <p className="mt-1.5 text-xs text-red-300">{profileErrors.full_name.message}</p> : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-text">Department</span>
              <div className="relative mt-2">
                <Briefcase className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  {...registerProfile('department')}
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-text">Designation</span>
              <div className="relative mt-2">
                <Briefcase className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  {...registerProfile('designation')}
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-text">Phone number</span>
              <div className="relative mt-2">
                <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  {...registerProfile('phone_number')}
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-text">Joining date</span>
              <div className="relative mt-2">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="date"
                  {...registerProfile('joining_date')}
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={isSavingProfile}>
              {isSavingProfile ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-border/80 bg-surface/95">
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-text-muted" />
          <h3 className="text-lg font-semibold text-text">Change email</h3>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Current: <span className="text-text">{user.email}</span>. Changing your email requires your current
          password, and the new address must be confirmed via a link we send to it before it takes effect.
        </p>

        {pendingEmailNotice ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" />
            <p>
              We sent a confirmation link to <span className="font-medium">{pendingEmailNotice}</span>. Your login
              email stays <span className="font-medium">{user.email}</span> until you click that link.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-text">New email</span>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="email"
                  {...registerEmail('new_email')}
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {emailErrors.new_email ? <p className="mt-1.5 text-xs text-red-300">{emailErrors.new_email.message}</p> : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-text">Current password</span>
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="password"
                  autoComplete="current-password"
                  {...registerEmail('current_password')}
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {emailErrors.current_password ? (
                <p className="mt-1.5 text-xs text-red-300">{emailErrors.current_password.message}</p>
              ) : null}
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="secondary" disabled={isSavingEmail}>
              {isSavingEmail ? 'Sending confirmation...' : 'Change email'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-border/80 bg-surface/95">
        <h3 className="text-lg font-semibold text-text">Change password</h3>
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-text">Current password</span>
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input
                type="password"
                autoComplete="current-password"
                {...registerPassword('current_password')}
                className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            {passwordErrors.current_password ? (
              <p className="mt-1.5 text-xs text-red-300">{passwordErrors.current_password.message}</p>
            ) : null}
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-text">New password</span>
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="password"
                  autoComplete="new-password"
                  {...registerPassword('new_password')}
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {passwordErrors.new_password ? (
                <p className="mt-1.5 text-xs text-red-300">{passwordErrors.new_password.message}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-text">Confirm new password</span>
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="password"
                  autoComplete="new-password"
                  {...registerPassword('confirm_password')}
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {passwordErrors.confirm_password ? (
                <p className="mt-1.5 text-xs text-red-300">{passwordErrors.confirm_password.message}</p>
              ) : null}
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="secondary" disabled={isSavingPassword}>
              {isSavingPassword ? 'Updating...' : 'Update password'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}