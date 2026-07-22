import { useEffect, useMemo, useState } from 'react';
import { Clock3, Info, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { MiniBars } from '@/components/dashboard/MiniBars';
import { MiniDonut } from '@/components/dashboard/MiniDonut';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { SummaryPill } from '@/components/dashboard/SummaryPill';
import {
  fetchDashboardStats,
  fetchEmployee,
  fetchLeaveBalance,
  fetchLeaves,
  type DashboardStats,
  type LeaveBalance,
  type LeaveRecord,
  type LeaveType,
} from '@/services/dashboard';

type RecentLeave = LeaveRecord & {
  employeeName: string;
  employeeAvatar: string;
  leaveTypeLabel: string;
};

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  casual: 'rgb(245 158 11)',
  sick: 'rgb(45 212 191)',
  annual: 'rgb(14 165 233)',
};

function formatLeaveTypeLabel(leaveType: LeaveType): string {
  return leaveType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

type DashboardState = {
  stats: DashboardStats | null;
  leaveBalance: LeaveBalance | null;
  recentLeaves: RecentLeave[];
  monthlyData: Array<{ label: string; value: number }>;
  leaveTypeSegments: Array<{ label: string; value: number; color: string }>;
  note: string | null;
};

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const formatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function buildMonthlyData(leaves: LeaveRecord[]) {
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const counts = Array.from({ length: 12 }, () => 0);

  for (const leave of leaves) {
    const monthIndex = new Date(leave.start_date).getMonth();
    counts[monthIndex] += 1;
  }

  return monthLabels.map((label, index) => ({ label, value: counts[index] }));
}

function buildLeaveTypeSegments(leaves: LeaveRecord[]) {
  const counts: Record<LeaveType, number> = {
    casual: 0,
    sick: 0,
    annual: 0,
  };

  for (const leave of leaves) {
    counts[leave.leave_type] += 1;
  }

  return (Object.keys(counts) as LeaveType[])
    .filter((type) => counts[type] > 0)
    .map((type) => ({
      label: formatLeaveTypeLabel(type),
      value: counts[type],
      color: LEAVE_TYPE_COLORS[type],
    }));
}

export function DashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [state, setState] = useState<DashboardState>({
    stats: null,
    leaveBalance: null,
    recentLeaves: [],
    monthlyData: [],
    leaveTypeSegments: [],
    note: null,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const currentUser = user;

    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const leaves = await fetchLeaves(currentUser.is_superuser);
        const leaveBalance = await fetchLeaveBalance(currentUser.id);
        const recentLeaves = await Promise.all(
          leaves
            .slice(0, 5)
            .map(async (leave) => {
              const employee = currentUser.is_superuser && leave.employee_id !== currentUser.id ? await fetchEmployee(leave.employee_id) : currentUser;
              return {
                ...leave,
                employeeName: employee.full_name,
                employeeAvatar: employee.profile_picture_url ?? employee.full_name.slice(0, 2).toUpperCase(),
                leaveTypeLabel: formatLeaveTypeLabel(leave.leave_type),
              };
            }),
        );

        const monthlyData = buildMonthlyData(leaves);
        const leaveTypeSegments = buildLeaveTypeSegments(leaves);

        const nextState: DashboardState = {
          stats: null,
          leaveBalance,
          recentLeaves,
          monthlyData,
          leaveTypeSegments,
          note: 'Monthly charts are derived from existing leave dates because the backend does not expose a dedicated monthly analytics endpoint yet. Leave type distribution now uses the real leave_type field.',
        };

        if (currentUser.is_superuser) {
          nextState.stats = await fetchDashboardStats();
        }

        if (isMounted) {
          setState(nextState);
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 403) {
          setErrorMessage('Access restricted. This dashboard view is only available to superusers for the official stats endpoint.');
        } else if (status === 404) {
          setErrorMessage('Requested dashboard resource was not found.');
        } else {
          setErrorMessage('Unable to load dashboard data right now.');
          toast.error('Unable to load dashboard data right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, [currentTime]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-radial-grid overflow-hidden">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-text-muted">
              {greeting}, {user?.full_name?.split(' ')[0] ?? 'there'}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              Your leave command center
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">
              Track balances, review leave activity, and stay on top of approvals from one place.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-soft/70 px-4 py-3">
            <Clock3 size={18} className="text-accent" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Current time</p>
              <p className="text-sm font-medium text-text">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {errorMessage ? (
        <Card className="border-red-500/30 bg-red-500/10 text-red-100">
          <div className="flex items-start gap-3">
            <Info size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Dashboard notice</p>
              <p className="mt-1 text-sm text-red-100/90">{errorMessage}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {state.stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Employees" value={state.stats.total_employees} note="Users in the system" />
          <StatCard title="Leaves Pending" value={state.stats.leaves_pending} note="Awaiting action" accent="accent-muted" />
          <StatCard title="Approved" value={state.stats.leaves_approved} note="Successfully approved" accent="emerald" />
          <StatCard title="Rejected" value={state.stats.leaves_rejected} note="Declined requests" accent="rose" />
        </div>
      ) : (
        <Card className="border-border/80 bg-surface/95">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-text-muted">Access mode</p>
              <h3 className="mt-2 text-xl font-semibold text-text">Personal dashboard view</h3>
              <p className="mt-2 text-sm text-text-muted">
                The official system stats endpoint is superuser-only, so regular users see their own leave summary and activity here.
              </p>
            </div>
            <Button type="button" variant="secondary" className="gap-2">
              <ArrowUpRight size={16} />
              Backend note
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryPill label="Casual Leave" value={`${state.leaveBalance?.casual_leave_used ?? 0}/${state.leaveBalance?.casual_leave_total ?? 0}`} />
        <SummaryPill label="Sick Leave" value={`${state.leaveBalance?.sick_leave_used ?? 0}/${state.leaveBalance?.sick_leave_total ?? 0}`} />
        <SummaryPill label="Annual Leave" value={`${state.leaveBalance?.annual_leave_used ?? 0}/${state.leaveBalance?.annual_leave_total ?? 0}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          title="Monthly leave statistics"
          description="Derived from actual leave dates. No dedicated monthly stats endpoint exists yet."
        >
          <MiniBars data={state.monthlyData.length > 0 ? state.monthlyData : Array.from({ length: 12 }, (_, index) => ({ label: new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(2024, index, 1)), value: 0 }))} />
        </SectionCard>

        <SectionCard
          title="Leave type distribution"
          description="Based on the actual leave_type field recorded for each request."
        >
          <MiniDonut
            segments={
              state.leaveTypeSegments.length > 0
                ? state.leaveTypeSegments
                : [
                    { label: 'Casual', value: 0, color: 'rgb(245 158 11)' },
                    { label: 'Sick', value: 0, color: 'rgb(45 212 191)' },
                    { label: 'Annual', value: 0, color: 'rgb(14 165 233)' },
                  ]
            }
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Recent leave requests"
        description="Latest activity from the backend with employee lookups for the requester name."
        action={<Link to="/leave-history" className="text-sm font-medium text-accent transition hover:text-accent/80">View all</Link>}
      >
        <div className="space-y-3">
          {state.recentLeaves.length > 0 ? (
            state.recentLeaves.map((leave) => (
              <div key={leave.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-soft/60 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-sm font-semibold text-accent">
                    {leave.employeeAvatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text">{leave.employeeName}</p>
                      <StatusBadge status={leave.status} />
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {formatDateRange(leave.start_date, leave.end_date)} · {leave.leaveTypeLabel}
                    </p>
                    <p className="mt-1 max-w-2xl text-sm text-text-muted">{leave.reason}</p>
                  </div>
                </div>

                <Button type="button" variant="secondary" className="self-start lg:self-center">
                  View
                </Button>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-text-muted">
              No leave requests yet.
            </div>
          )}
        </div>
      </SectionCard>

      <Card className="border-border/80 bg-surface/95">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-text-muted">Backend gap note</p>
            <h3 className="mt-2 text-lg font-semibold text-text">What is still mocked</h3>
          </div>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-text-muted">
          {state.note ?? 'Monthly breakdowns are derived from existing leave dates because the backend does not expose a dedicated monthly analytics endpoint yet.'}
        </p>
      </Card>
    </div>
  );
}
