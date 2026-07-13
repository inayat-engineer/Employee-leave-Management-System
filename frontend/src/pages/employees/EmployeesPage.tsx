import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, PencilLine, Search, Trash2, Users, ChevronLeft, ChevronRight, RefreshCcw,UserPlus, X, Briefcase, Mail, Phone, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  fetchEmployees,
  updateEmployee,
  deleteEmployee,
  inviteEmployee,
  fetchLeaveBalance,
  type EmployeeRecord,
  type LeaveBalanceRecord,
} from '@/services/employees';

const rowsPerPage = 8;
const SEARCH_DEBOUNCE_MS = 350;

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
}

function EmployeeStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        isActive
          ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
          : 'border-rose-500/20 bg-rose-500/15 text-rose-300'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [knownDepartments, setKnownDepartments] = useState<string[]>([]);

  const [viewTarget, setViewTarget] = useState<EmployeeRecord | null>(null);
  const [viewBalance, setViewBalance] = useState<LeaveBalanceRecord | null>(null);
  const [editTarget, setEditTarget] = useState<EmployeeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search input before it triggers a network request
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [departmentFilter, statusFilter]);

  const loadEmployees = useCallback(async () => {
    if (!user?.is_superuser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetchEmployees({
        page,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
        department: departmentFilter === 'all' ? undefined : departmentFilter,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
      });
      setEmployees(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages);
      setKnownDepartments((current) => {
        const merged = new Set(current);
        response.items.forEach((employee) => {
          if (employee.department) merged.add(employee.department);
        });
        return Array.from(merged);
      });
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 403) {
        setErrorMessage('Access denied. Employee management is only available to superusers.');
      } else if (status === 404) {
        setErrorMessage('Employee list endpoint not found.');
      } else {
        setErrorMessage('Unable to load employees right now.');
        toast.error('Unable to load employees right now.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, page, debouncedSearch, departmentFilter, statusFilter]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  async function handleRefresh() {
    await loadEmployees();
    toast.success('Employee list refreshed');
  }

  async function handleInvite(formData: FormData) {
    setIsInviting(true);
    try {
      await inviteEmployee({
        full_name: String(formData.get('full_name') ?? ''),
        email: String(formData.get('email') ?? ''),
        department: (formData.get('department') as string) || null,
        designation: (formData.get('designation') as string) || null,
        joining_date: (formData.get('joining_date') as string) || null,
      });
      toast.success('Invite sent — the employee will receive an activation email.');
      setIsInviteOpen(false);
      await handleRefresh();
    } catch (error) {
      toast.error(
        (error as any)?.response?.data?.detail ?? 'Could not send the invite. Please try again.',
      );
    } finally {
      setIsInviting(false);
    }
  }

  async function handleView(employee: EmployeeRecord) {
    setViewTarget(employee);
    setViewBalance(null);
    try {
      const balance = await fetchLeaveBalance(employee.id);
      setViewBalance(balance);
    } catch {
      // Balance fetch failing shouldn't block viewing the profile
    }
  }

  function handleEdit(employee: EmployeeRecord) {
    setEditTarget(employee);
  }

  async function handleSaveEdit(formData: FormData) {
    if (!editTarget) return;
    setIsSavingEdit(true);
    try {
      const isEditingSelf = editTarget.id === user?.id;
      await updateEmployee(editTarget.id, {
        full_name: String(formData.get('full_name') || ''),
        // Self-edits never touch email here — see the disabled input below.
        // The backend requires current_password + email verification for
        // your own email change, which this bulk admin form doesn't collect.
        ...(isEditingSelf ? {} : { email: String(formData.get('email') || '') }),
        department: String(formData.get('department') || '') || null,
        designation: String(formData.get('designation') || '') || null,
        phone_number: String(formData.get('phone_number') || '') || null,
        joining_date: String(formData.get('joining_date') || '') || null,
      });
      toast.success('Employee updated successfully');
      setEditTarget(null);
      await loadEmployees();
    } catch {
      toast.error('Unable to update employee right now');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteEmployee(deleteTarget.id);
      toast.success('Employee removed');
      setDeleteTarget(null);
      await loadEmployees();
    } catch {
      toast.error('Unable to delete this employee right now');
    } finally {
      setIsDeleting(false);
    }
  }

  const showRestrictedState = !user?.is_superuser;
  const safePage = Math.min(page, totalPages);

  return (
    <div className="space-y-6">
      <Card className="bg-radial-grid overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Employee directory</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text">Team members</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">
              Browse employees, filter by department or status, and review the people who power the leave workflow.
            </p>
          </div>

          <div className="flex flex-col gap-3 self-start sm:flex-row lg:self-auto">
            <Button type="button" variant="primary" className="gap-2" onClick={() => setIsInviteOpen(true)}>
              <UserPlus size={16} />
              Invite Employee
            </Button>
            <Button type="button" variant="secondary" className="gap-2" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {showRestrictedState ? (
        <Card className="border-amber-500/30 bg-amber-500/10 text-amber-100">
          <div className="flex items-start gap-3">
            <Users size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Access restricted</p>
              <p className="mt-1 text-sm text-amber-100/90">
                Employee management is visible only to superusers. You can still use the rest of the leave portal.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {errorMessage ? (
        <Card className="border-red-500/30 bg-red-500/10 text-red-100">
          <p className="text-sm">{errorMessage}</p>
        </Card>
      ) : null}

      {!showRestrictedState ? (
        <>
          <Card className="border-border/80 bg-surface/95">
            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by name, email, department, or designation"
                  className="h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>

              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className="h-12 rounded-2xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="all">All departments</option>
                {knownDepartments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-12 rounded-2xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </Card>

          <Card className="overflow-hidden border-border/80 bg-surface/95">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left">
                <thead className="bg-surface-soft/60 text-xs uppercase tracking-[0.22em] text-text-muted">
                  <tr>
                    <th className="px-4 py-4 font-medium">Employee ID</th>
                    <th className="px-4 py-4 font-medium">Name</th>
                    <th className="px-4 py-4 font-medium">Email</th>
                    <th className="px-4 py-4 font-medium">Department</th>
                    <th className="px-4 py-4 font-medium">Designation</th>
                    <th className="px-4 py-4 font-medium">Phone</th>
                    <th className="px-4 py-4 font-medium">Status</th>
                    <th className="px-4 py-4 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-10 text-sm text-text-muted" colSpan={8}>
                        Loading employees...
                      </td>
                    </tr>
                  ) : employees.length > 0 ? (
                    employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-surface-soft/50">
                        <td className="px-4 py-4 text-sm text-text-muted">#{employee.id}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-xs font-semibold text-accent">
                              {employee.full_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-text">{employee.full_name}</p>
                              <p className="text-xs text-text-muted">Joined {formatDate(employee.joining_date)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-text-muted">{employee.email}</td>
                        <td className="px-4 py-4 text-sm text-text-muted">{employee.department ?? '—'}</td>
                        <td className="px-4 py-4 text-sm text-text-muted">{employee.designation ?? '—'}</td>
                        <td className="px-4 py-4 text-sm text-text-muted">{employee.phone_number ?? '—'}</td>
                        <td className="px-4 py-4">
                          <EmployeeStatusBadge isActive={employee.is_active} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-11 w-11 rounded-xl"
                              aria-label={`View ${employee.full_name}`}
                              onClick={() => handleView(employee)}
                            >
                              <Eye size={20} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-11 w-11 rounded-xl"
                              aria-label={`Edit ${employee.full_name}`}
                              onClick={() => handleEdit(employee)}
                            >
                              <PencilLine size={20} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-11 w-11 rounded-xl text-red-300 hover:bg-red-500/10 hover:text-red-200"
                              aria-label={`Delete ${employee.full_name}`}
                              onClick={() => setDeleteTarget(employee)}
                            >
                              <Trash2 size={20} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-text-muted" colSpan={8}>
                        No employees match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-muted">
                Showing {employees.length} of {total} employees
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={safePage === 1 || isLoading}
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>
                <div className="rounded-xl border border-border bg-surface-soft px-4 py-2 text-sm text-text-muted">
                  Page {safePage} of {totalPages}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                  disabled={safePage === totalPages || isLoading}
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-border/80 bg-surface/95">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Server-side search</p>
                <p className="mt-2 text-sm text-text-muted">
                  Search, department/status filters, and pagination are all handled by the backend (SQL-level filtering with
                  debounced requests). This scales cleanly from a handful of employees to tens of thousands without loading
                  more data than the current page needs.
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Available filters</p>
                <p className="mt-2 text-sm text-text-muted">Departments are collected from employees seen so far. Status maps to active and inactive accounts.</p>
              </div>
            </div>
          </Card>
        </>
      ) : null}

      {viewTarget ? (
        <Modal onClose={() => setViewTarget(null)}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-lg font-semibold text-accent">
                {viewTarget.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text">{viewTarget.full_name}</h3>
                <p className="text-sm text-text-muted">{viewTarget.designation ?? 'No designation'}</p>
              </div>
            </div>
            <button type="button" onClick={() => setViewTarget(null)} className="text-text-muted hover:text-text">
              <X size={20} />
            </button>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-text-muted">
              <Mail size={16} /> {viewTarget.email}
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <Phone size={16} /> {viewTarget.phone_number ?? '—'}
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <Briefcase size={16} /> {viewTarget.department ?? '—'}
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <CalendarDays size={16} /> Joined {formatDate(viewTarget.joining_date)}
            </div>
          </div>

          {viewBalance ? (
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-surface-soft/60 p-3 text-center">
                <p className="text-xs text-text-muted">Casual</p>
                <p className="mt-1 text-sm font-semibold text-text">
                  {viewBalance.casual_leave_used}/{viewBalance.casual_leave_total}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-soft/60 p-3 text-center">
                <p className="text-xs text-text-muted">Sick</p>
                <p className="mt-1 text-sm font-semibold text-text">
                  {viewBalance.sick_leave_used}/{viewBalance.sick_leave_total}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-soft/60 p-3 text-center">
                <p className="text-xs text-text-muted">Annual</p>
                <p className="mt-1 text-sm font-semibold text-text">
                  {viewBalance.annual_leave_used}/{viewBalance.annual_leave_total}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setViewTarget(null)}>
              Close
            </Button>
          </div>
        </Modal>
      ) : null}

      {editTarget ? (
        <Modal onClose={() => setEditTarget(null)}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Edit employee</h3>
            <button type="button" onClick={() => setEditTarget(null)} className="text-text-muted hover:text-text">
              <X size={20} />
            </button>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSaveEdit(new FormData(event.currentTarget));
            }}
          >
            <label className="block">
              <span className="text-sm font-medium text-text">Full name</span>
              <input
                name="full_name"
                defaultValue={editTarget.full_name}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-text">Email</span>
              <div className="relative mt-2">
                <input
                  name="email"
                  type="email"
                  defaultValue={editTarget.email}
                  disabled={editTarget.id === user?.id}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              {editTarget.id === user?.id ? (
                <p className="mt-1.5 text-xs text-text-muted">
                  You can't change your own email from here — use Profile → Change email, which requires your
                  password and a confirmation link.
                </p>
              ) : null}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-text">Department</span>
                <input
                  name="department"
                  defaultValue={editTarget.department ?? ''}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-text">Designation</span>
                <input
                  name="designation"
                  defaultValue={editTarget.designation ?? ''}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-text">Phone</span>
                <input
                  name="phone_number"
                  defaultValue={editTarget.phone_number ?? ''}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-text">Joining date</span>
                <input
                  name="joining_date"
                  type="date"
                  defaultValue={editTarget.joining_date ?? ''}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditTarget(null)} disabled={isSavingEdit}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSavingEdit}>
                {isSavingEdit ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal onClose={() => setDeleteTarget(null)}>
          <h3 className="text-lg font-semibold text-text">Remove {deleteTarget.full_name}?</h3>
          <p className="mt-2 text-sm text-text-muted">
            This will permanently delete the employee account and their leave records. This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-red-500 hover:bg-red-500/90"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete employee'}
            </Button>
          </div>
        </Modal>
      ) : null}

      {isInviteOpen ? (
        <Modal onClose={() => setIsInviteOpen(false)}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Invite employee</h3>
            <button type="button" onClick={() => setIsInviteOpen(false)} className="text-text-muted hover:text-text">
              <X size={20} />
            </button>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleInvite(new FormData(event.currentTarget));
            }}
          >
            <label className="block">
              <span className="text-sm font-medium text-text">Full name</span>
              <input
                name="full_name"
                required
                className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-text">Email</span>
              <input
                name="email"
                type="email"
                required
                className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-text">Department</span>
                <input
                  name="department"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-text">Designation</span>
                <input
                  name="designation"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-text">Joining date</span>
              <input
                name="joining_date"
                type="date"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsInviteOpen(false)} disabled={isInviting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isInviting}>
                {isInviting ? 'Sending invite...' : 'Send invite'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}