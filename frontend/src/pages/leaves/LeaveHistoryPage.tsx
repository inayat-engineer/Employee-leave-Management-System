import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, History, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { fetchEmployees, type EmployeeRecord } from '@/services/employees';
import { fetchAllLeaves, fetchMyLeaves, LEAVE_TYPE_LABELS, type LeaveRecord, type LeaveStatus } from '@/services/leaves';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
}

function calculateDuration(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const styles: Record<LeaveStatus, string> = {
    pending: 'border-amber-500/20 bg-amber-500/15 text-amber-300',
    approved: 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300',
    rejected: 'border-rose-500/20 bg-rose-500/15 text-rose-300',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

export function LeaveHistoryPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [employeesById, setEmployeesById] = useState<Record<number, EmployeeRecord>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('all');
  const [search, setSearch] = useState('');
  const [viewScope, setViewScope] = useState<'mine' | 'all'>('mine');

  const canViewAll = Boolean(user?.is_superuser);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const shouldFetchAll = canViewAll && viewScope === 'all';
        const leavesData = shouldFetchAll ? await fetchAllLeaves() : await fetchMyLeaves();

        let byId: Record<number, EmployeeRecord> = {};
        if (shouldFetchAll) {
          const employeesResponse = await fetchEmployees({ limit: 100 });
          employeesResponse.items.forEach((employee) => {
            byId[employee.id] = employee;
          });
        } else if (user) {
          byId = { [user.id]: user as unknown as EmployeeRecord };
        }

        if (isMounted) {
          setLeaves(leavesData);
          setEmployeesById(byId);
        }
      } catch {
        if (isMounted) toast.error('Unable to load leave history right now.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [canViewAll, viewScope, user]);

  const filteredLeaves = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leaves.filter((leave) => {
      const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
      const employeeName = employeesById[leave.employee_id]?.full_name ?? '';
      const matchesSearch =
        query.length === 0 ||
        leave.reason.toLowerCase().includes(query) ||
        employeeName.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [leaves, statusFilter, search, employeesById]);

  return (
    <div className="space-y-6">
      <Card className="bg-radial-grid overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Records</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text">Leave history</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">
              {viewScope === 'mine'
                ? 'A complete record of your leave requests and their outcomes.'
                : 'A complete record of leave requests across the team.'}
            </p>
          </div>

          {canViewAll ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewScope('mine')}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                  viewScope === 'mine'
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-surface-soft/70 text-text-muted hover:border-accent hover:text-accent'
                }`}
              >
                My history
              </button>
              <button
                type="button"
                onClick={() => setViewScope('all')}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                  viewScope === 'all'
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-surface-soft/70 text-text-muted hover:border-accent hover:text-accent'
                }`}
              >
                Everyone
              </button>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="border-border/80 bg-surface/95">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by reason or employee name"
              className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((filterValue) => (
              <button
                key={filterValue}
                type="button"
                onClick={() => setStatusFilter(filterValue)}
                className={`flex-1 rounded-2xl border px-3 py-2.5 text-xs font-medium capitalize transition ${
                  statusFilter === filterValue
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-surface-soft/70 text-text-muted hover:border-accent hover:text-accent'
                }`}
              >
                {filterValue}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-surface/95">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-surface-soft/60 text-xs uppercase tracking-[0.22em] text-text-muted">
              <tr>
                {viewScope === 'all' ? <th className="px-4 py-4 font-medium">Employee</th> : null}
                <th className="px-4 py-4 font-medium">Dates</th>
                <th className="px-4 py-4 font-medium">Duration</th>
                <th className="px-4 py-4 font-medium">Reason</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium">Approved by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-10 text-sm text-text-muted" colSpan={viewScope === 'all' ? 6 : 5}>
                    Loading leave history...
                  </td>
                </tr>
              ) : filteredLeaves.length > 0 ? (
                filteredLeaves.map((leave) => {
                  const duration = calculateDuration(leave.start_date, leave.end_date);
                  const approver = leave.approver_id ? employeesById[leave.approver_id] : null;
                  return (
                    <tr key={leave.id} className="hover:bg-surface-soft/50">
                      {viewScope === 'all' ? (
                        <td className="px-4 py-4 text-sm text-text">
                          {employeesById[leave.employee_id]?.full_name ?? `Employee #${leave.employee_id}`}
                        </td>
                      ) : null}
                      <td className="px-4 py-4 text-sm text-text-muted">
                        <div className="flex items-center gap-1.5">
                          <CalendarRange size={14} />
                          {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-text-muted">{duration} day{duration > 1 ? 's' : ''}</td>
                      <td className="px-4 py-4 max-w-xs">
                        <span className="mb-1 inline-block rounded-full border border-border bg-surface-soft/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                          {LEAVE_TYPE_LABELS[leave.leave_type]}
                        </span>
                        <p className="truncate text-sm text-text-muted">{leave.reason}</p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={leave.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-text-muted">
                        {approver?.full_name ?? (leave.approver_id ? `#${leave.approver_id}` : '—')}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-text-muted" colSpan={viewScope === 'all' ? 6 : 5}>
                    <div className="flex flex-col items-center gap-2">
                      <History size={24} className="text-text-muted" />
                      No leave records match the current filters.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
