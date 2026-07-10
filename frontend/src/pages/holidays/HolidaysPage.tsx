import { useEffect, useState } from 'react';
import { CalendarHeart, Plus, PencilLine, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  fetchHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  type HolidayRecord,
} from '@/services/holidays';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).format(
    new Date(value),
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function HolidaysPage() {
  const { user } = useAuth();
  const isHr = Boolean(user?.is_superuser);

  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<HolidayRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HolidayRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadHolidays() {
    setIsLoading(true);
    try {
      const data = await fetchHolidays();
      setHolidays(data);
    } catch {
      toast.error('Unable to load holidays right now.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadHolidays();
  }, []);

  async function handleCreate(formData: FormData) {
    setIsSaving(true);
    try {
      await createHoliday({
        name: String(formData.get('name') || ''),
        date: String(formData.get('date') || ''),
        description: String(formData.get('description') || '') || null,
      });
      toast.success('Holiday added');
      setShowAddModal(false);
      await loadHolidays();
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(detail ?? 'Unable to add holiday');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(formData: FormData) {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      await updateHoliday(editTarget.id, {
        name: String(formData.get('name') || ''),
        date: String(formData.get('date') || ''),
        description: String(formData.get('description') || '') || null,
      });
      toast.success('Holiday updated');
      setEditTarget(null);
      await loadHolidays();
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(detail ?? 'Unable to update holiday');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteHoliday(deleteTarget.id);
      toast.success('Holiday removed');
      setDeleteTarget(null);
      await loadHolidays();
    } catch {
      toast.error('Unable to delete holiday');
    } finally {
      setIsDeleting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h) => h.date >= today);
  const past = holidays.filter((h) => h.date < today);

  return (
    <div className="space-y-6">
      <Card className="bg-radial-grid overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Company calendar</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text">Holidays</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">
              {isHr
                ? 'Manage the shared holiday calendar for everyone in the company.'
                : 'Upcoming public and company holidays.'}
            </p>
          </div>

          {isHr ? (
            <Button type="button" variant="primary" className="gap-2 self-start lg:self-auto" onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              Add holiday
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="border-border/80 bg-surface/95">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">Upcoming</h3>
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-text-muted">Loading holidays...</p>
          ) : upcoming.length > 0 ? (
            upcoming.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-soft/60 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                    <CalendarHeart size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-text">{holiday.name}</p>
                    <p className="text-xs text-text-muted">
                      {formatDate(holiday.date)}
                      {holiday.description ? ` · ${holiday.description}` : ''}
                    </p>
                  </div>
                </div>

                {isHr ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-11 rounded-xl"
                      aria-label={`Edit ${holiday.name}`}
                      onClick={() => setEditTarget(holiday)}
                    >
                      <PencilLine size={20} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-11 rounded-xl text-red-300 hover:bg-red-500/10 hover:text-red-200"
                      aria-label={`Delete ${holiday.name}`}
                      onClick={() => setDeleteTarget(holiday)}
                    >
                      <Trash2 size={20} />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-text-muted">No upcoming holidays scheduled.</p>
          )}
        </div>
      </Card>

      {past.length > 0 ? (
        <Card className="border-border/80 bg-surface/95">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">Past</h3>
          <div className="mt-4 space-y-3">
            {past.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-soft/40 p-4 opacity-70"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-soft text-text-muted">
                    <CalendarHeart size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-text">{holiday.name}</p>
                    <p className="text-xs text-text-muted">{formatDate(holiday.date)}</p>
                  </div>
                </div>

                {isHr ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-11 rounded-xl"
                      aria-label={`Edit ${holiday.name}`}
                      onClick={() => setEditTarget(holiday)}
                    >
                      <PencilLine size={20} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-11 rounded-xl text-red-300 hover:bg-red-500/10 hover:text-red-200"
                      aria-label={`Delete ${holiday.name}`}
                      onClick={() => setDeleteTarget(holiday)}
                    >
                      <Trash2 size={20} />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {showAddModal ? (
        <Modal onClose={() => setShowAddModal(false)}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Add holiday</h3>
            <button type="button" onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text">
              <X size={20} />
            </button>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreate(new FormData(event.currentTarget));
            }}
          >
            <label className="block">
              <span className="text-sm font-medium text-text">Name</span>
              <input
                name="name"
                required
                placeholder="e.g. Independence Day"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-text">Date</span>
              <input
                name="date"
                type="date"
                required
                className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-text">Description (optional)</span>
              <input
                name="description"
                placeholder="Brief note"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Add holiday'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editTarget ? (
        <Modal onClose={() => setEditTarget(null)}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Edit holiday</h3>
            <button type="button" onClick={() => setEditTarget(null)} className="text-text-muted hover:text-text">
              <X size={20} />
            </button>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleUpdate(new FormData(event.currentTarget));
            }}
          >
            <label className="block">
              <span className="text-sm font-medium text-text">Name</span>
              <input
                name="name"
                defaultValue={editTarget.name}
                required
                className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-text">Date</span>
              <input
                name="date"
                type="date"
                defaultValue={editTarget.date}
                required
                className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-text">Description (optional)</span>
              <input
                name="description"
                defaultValue={editTarget.description ?? ''}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-soft/80 px-4 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditTarget(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal onClose={() => setDeleteTarget(null)}>
          <h3 className="text-lg font-semibold text-text">Remove {deleteTarget.name}?</h3>
          <p className="mt-2 text-sm text-text-muted">This will permanently remove this holiday from the calendar.</p>
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
              {isDeleting ? 'Deleting...' : 'Delete holiday'}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
