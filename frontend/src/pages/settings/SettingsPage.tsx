import { Bell, CheckCircle2, Clock, Moon, Palette, Sun } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <Card className="bg-radial-grid overflow-hidden">
        <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Preferences</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text">Settings</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">
          Manage how LeaveOps looks and behaves for your account.
        </p>
      </Card>

      <Card className="border-border/80 bg-surface/95">
        <div className="flex items-center gap-3">
          <Palette size={18} className="text-accent" />
          <h3 className="text-lg font-semibold text-text">Appearance</h3>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-surface-soft/60 p-4">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon size={20} className="text-accent" /> : <Sun size={20} className="text-accent" />}
            <div>
              <p className="text-sm font-medium text-text">Theme</p>
              <p className="text-xs text-text-muted">
                Currently using {theme === 'dark' ? 'dark' : 'light'} mode
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className={`relative h-8 w-14 shrink-0 rounded-full border border-border transition-colors ${
              theme === 'dark' ? 'bg-accent/30' : 'bg-surface-soft'
            }`}
            aria-label="Toggle theme"
          >
            <span
              className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-accent shadow-glow transition-transform duration-200 ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Card>

      <Card className="border-border/80 bg-surface/95">
        <div className="flex items-center gap-3">
          <Bell size={18} className="text-accent" />
          <h3 className="text-lg font-semibold text-text">Notifications</h3>
        </div>

        <p className="mt-2 text-xs text-text-muted">
          These reflect what LeaveOps actually does today. Per-user notification preferences (muting
          specific alerts, email digests) aren't built yet — everyone currently receives the same
          in-app notifications shown below.
        </p>

        <div className="mt-6 space-y-4">
          {[
            {
              label: 'Leave request updates',
              description: 'You get an in-app notification when your leave request is approved or rejected.',
              active: true,
            },
            {
              label: 'Team leave alerts',
              description: 'HR gets an in-app notification whenever an employee applies for leave.',
              active: true,
            },
            {
              label: 'Weekly summary',
              description: 'A weekly digest of leave activity, delivered by email.',
              active: false,
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border bg-surface-soft/60 p-4">
              <div>
                <p className="text-sm font-medium text-text">{item.label}</p>
                <p className="text-xs text-text-muted">{item.description}</p>
              </div>
              {item.active ? (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                  <CheckCircle2 size={13} />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-soft px-3 py-1 text-xs text-text-muted">
                  <Clock size={13} />
                  Not yet built
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
