import { Bell, Moon, Palette, Sun } from 'lucide-react';
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

        <div className="mt-6 space-y-4">
          {[
            { label: 'Leave request updates', description: 'Get notified when your leave requests are approved or rejected.' },
            { label: 'Team leave alerts', description: 'Get notified when a teammate applies for leave.' },
            { label: 'Weekly summary', description: 'Receive a weekly digest of leave activity.' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border bg-surface-soft/60 p-4">
              <div>
                <p className="text-sm font-medium text-text">{item.label}</p>
                <p className="text-xs text-text-muted">{item.description}</p>
              </div>
              <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs text-text-muted">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
