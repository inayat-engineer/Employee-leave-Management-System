import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarRange, Check, ClipboardList, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fetchEmployees, type EmployeeRecord } from '@/services/employees';
import {
  approveLeave,
  fetchAllLeaves,
  rejectLeave,
  LEAVE_TYPE_LABELS,
  type LeaveRecord,
  type LeaveStatus,
} from '@/services/leaves';

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

export function LeaveRequestsPage() {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [employeesById, setEmployeesById] = useState<Record<number, EmployeeRecord>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const isValidStatus = (value: string | null): value is 'all' | LeaveStatus =>
    value === 'all' || value === 'pending' || value === 'approved' || value === 'rejected';
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>(
    isValidStatus(initialStatus) ? initialStatus : 'pending',
  );
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [leavesData, employeesResponse] = await Promise.all([fetchAllLeaves(), fetchEmployees({ limit: 100 })]);
        if (!isMounted) return;

        setLeaves(leavesData);
        const byId: Record<number, EmployeeRecord> = {};
        employeesResponse.items.forEach((employee) => {
          byId[employee.id] = employee;
        });
        setEmployeesById(byId);
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load leave requests right now.');
          toast.error('Unable to load leave requests right now.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (!highlightId || leaves.length === 0) {
      return;
    }
    const match = leaves.find((leave) => leave.id === Number(highlightId));
    if (match) {
      setSelectedLeave(match);
      setStatusFilter(match.status);
    }
  }, [leaves, searchParams]);

  const filteredLeaves = useMemo(() => {
    if (statusFilter === 'all') return leaves;
    return leaves.filter((leave) => leave.status === statusFilter);
  }, [leaves, statusFilter]);

  async function handleApprove(leaveId: number) {
    setProcessingId(leaveId);
    try {
      const updated = await approveLeave(leaveId);
      setLeaves((current) => current.map((leave) => (leave.id === leaveId ? updated : leave)));
      toast.success('Leave approved');
    } catch {
      toast.error('Unable to approve this leave request');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(leaveId: number) {
    setProcessingId(leaveId);
    try {
      const updated = await rejectLeave(leaveId);
      setLeaves((current) => current.map((leave) => (leave.id === leaveId ? updated : leave)));
      toast.success('Leave rejected');
    } catch {
      toast.error('Unable to reject this leave request');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-radial-grid overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Approvals</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text">Leave requests</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">
              Review pending requests, approve or reject them, and keep track of team leave activity.
            </p>
          </div>

          <div className="flex gap-2">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((filterValue) => (
              <button
                key={filterValue}
                type="button"
                onClick={() => {
                  setStatusFilter(filterValue);
                  setSearchParams(filterValue === 'pending' ? {} : { status: filterValue });
                }}
                className={`rounded-full border px-4 py-2 text-xs font-medium capitalize transition ${
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

      {errorMessage ? (
        <Card className="border-red-500/30 bg-red-500/10 text-red-100">
          <p className="text-sm">{errorMessage}</p>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-border/80 bg-surface/95">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-surface-soft/60 text-xs uppercase tracking-[0.22em] text-text-muted">
              <tr>
                <th className="px-4 py-4 font-medium">Employee</th>
                <th className="px-4 py-4 font-medium">Dates</th>
                <th className="px-4 py-4 font-medium">Duration</th>
                <th className="px-4 py-4 font-medium">Reason</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-10 text-sm text-text-muted" colSpan={6}>
                    Loading leave requests...
                  </td>
                </tr>
              ) : filteredLeaves.length > 0 ? (
                filteredLeaves.map((leave) => {
                  const employee = employeesById[leave.employee_id];
                  const duration = calculateDuration(leave.start_date, leave.end_date);
                  return (
                    <tr key={leave.id} className="hover:bg-surface-soft/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-xs font-semibold text-accent">
                            {(employee?.full_name ?? 'NA').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-text">{employee?.full_name ?? `Employee #${leave.employee_id}`}</p>
                            <p className="text-xs text-text-muted">{employee?.email ?? '—'}</p>
                          </div>
                        </div>
                      </td>
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
                        <button
                          type="button"
                          onClick={() => setSelectedLeave(leave)}
                          className="block truncate text-left text-sm text-text-muted underline decoration-dotted hover:text-accent"
                        >
                          {leave.reason}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={leave.status} />
                      </td>
                      <td className="px-4 py-4">
                        {leave.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              className="h-9 gap-1.5 px-3 text-xs"
                              disabled={processingId === leave.id}
                              onClick={() => handleApprove(leave.id)}
                            >
                              <Check size={14} />
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 gap-1.5 px-3 text-xs text-red-300 hover:border-red-400/40"
                              disabled={processingId === leave.id}
                              onClick={() => handleReject(leave.id)}
                            >
                              <X size={14} />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-text-muted" colSpan={6}>
                    No leave requests match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedLeave ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setSelectedLeave(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-accent">
              <ClipboardList size={18} />
              <p className="text-sm font-medium uppercase tracking-[0.2em]">Leave details</p>
            </div>
            <h3 className="mt-3 text-xl font-semibold text-text">
              {employeesById[selectedLeave.employee_id]?.full_name ?? `Employee #${selectedLeave.employee_id}`}
            </h3>
            <p className="mt-1 text-sm text-accent">{LEAVE_TYPE_LABELS[selectedLeave.leave_type]}</p>
            <p className="mt-1 text-sm text-text-muted">
              {formatDate(selectedLeave.start_date)} → {formatDate(selectedLeave.end_date)} (
              {calculateDuration(selectedLeave.start_date, selectedLeave.end_date)} days)
            </p>
            <div className="mt-4 rounded-xl border border-border bg-surface-soft/60 p-4 text-sm text-text">
              {selectedLeave.reason}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <StatusBadge status={selectedLeave.status} />
              <Button type="button" variant="secondary" onClick={() => setSelectedLeave(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
