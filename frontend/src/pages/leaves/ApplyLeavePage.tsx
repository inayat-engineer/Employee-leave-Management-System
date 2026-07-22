import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarDays, ClipboardList, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { applyLeave, LEAVE_TYPE_LABELS, type LeaveType } from '@/services/leaves';

function todayIsoDate() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString().slice(0, 10);
}

const leaveTypeValues = Object.keys(LEAVE_TYPE_LABELS) as [LeaveType, ...LeaveType[]];

const leaveSchema = z
  .object({
    leave_type: z.enum(leaveTypeValues, {
      errorMap: () => ({ message: 'Select a leave type' }),
    }),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    reason: z
      .string()
      .min(10, 'Reason must be at least 10 characters')
      .max(500, 'Reason must be under 500 characters'),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  })
  .refine((data) => data.start_date >= todayIsoDate(), {
    message: 'Start date cannot be in the past',
    path: ['start_date'],
  });

type LeaveFormValues = z.infer<typeof leaveSchema>;

function calculateDays(start: string, end: string) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  const diffMs = endDate.getTime() - startDate.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? days : 0;
}

// Groups the dropdown into logical sections for a cleaner UX
const leaveTypeGroups: { label: string; types: LeaveType[] }[] = [
  { label: 'Standard leave', types: ['casual', 'sick', 'annual'] },
];

export function ApplyLeavePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [durationDays, setDurationDays] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      leave_type: 'casual',
      start_date: '',
      end_date: '',
      reason: '',
    },
  });

  function recalcDuration() {
    const { start_date, end_date } = getValues();
    setDurationDays(calculateDays(start_date, end_date));
  }

  async function onSubmit(values: LeaveFormValues) {
    setIsSubmitting(true);
    try {
      await applyLeave({
        leave_type: values.leave_type,
        start_date: values.start_date,
        end_date: values.end_date,
        reason: values.reason,
      });
      toast.success('Leave request submitted successfully');
      reset();
      setDurationDays(0);
    } catch (error) {
      const status = (error as { response?: { status?: number; data?: { detail?: string } } }).response;
      if (status?.status === 422) {
        toast.error(status.data?.detail ?? 'Please check the form for errors');
      } else {
        toast.error('Unable to submit leave request right now');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-radial-grid overflow-hidden">
        <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Leave application</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text">Apply for leave</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">
          Fill in the details below. Your request will be sent for approval and you can track its status in Leave History.
        </p>
      </Card>

      <Card className="border-border/80 bg-surface/95">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-text">Leave type</span>
              <select
                {...register('leave_type')}
                className="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {leaveTypeGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.types.map((type) => (
                      <option key={type} value={type}>
                        {LEAVE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.leave_type ? (
                <p className="mt-1.5 text-xs text-red-300">{errors.leave_type.message}</p>
              ) : null}
            </label>

            <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface-soft/50 px-4 py-3">
              <ClipboardList size={18} className="text-accent" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Duration</p>
                <p className="text-lg font-semibold text-text">
                  {durationDays > 0 ? `${durationDays} day${durationDays > 1 ? 's' : ''}` : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-text">Start date</span>
              <div className="relative mt-2">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="date"
                  {...register('start_date', { onChange: recalcDuration })}
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {errors.start_date ? (
                <p className="mt-1.5 text-xs text-red-300">{errors.start_date.message}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-text">End date</span>
              <div className="relative mt-2">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="date"
                  {...register('end_date', { onChange: recalcDuration })}
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {errors.end_date ? (
                <p className="mt-1.5 text-xs text-red-300">{errors.end_date.message}</p>
              ) : null}
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-text">Reason</span>
            <textarea
              {...register('reason')}
              rows={4}
              placeholder="Briefly describe the reason for your leave request..."
              className="mt-2 w-full rounded-2xl border border-border bg-surface-soft/80 px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            {errors.reason ? (
              <p className="mt-1.5 text-xs text-red-300">{errors.reason.message}</p>
            ) : null}
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                reset();
                setDurationDays(0);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="gap-2" disabled={isSubmitting}>
              <Send size={16} />
              {isSubmitting ? 'Submitting...' : 'Submit request'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
