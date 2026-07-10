import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FilePlus2, ClipboardList, History, UserCircle2, Settings, LogOut, CalendarHeart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

type NavItem = {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles: Array<'hr' | 'employee'>;
};

const navigationItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['hr', 'employee'] },
  { label: 'Employees', path: '/employees', icon: Users, roles: ['hr'] },
  { label: 'Apply Leave', path: '/apply-leave', icon: FilePlus2, roles: ['hr', 'employee'] },
  { label: 'Leave Requests', path: '/leave-requests', icon: ClipboardList, roles: ['hr'] },
  { label: 'Leave History', path: '/leave-history', icon: History, roles: ['hr', 'employee'] },
  { label: 'Holidays', path: '/holidays', icon: CalendarHeart, roles: ['hr', 'employee'] },
  { label: 'Profile', path: '/profile', icon: UserCircle2, roles: ['hr', 'employee'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['hr', 'employee'] },
];

type AppSidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const role = user?.is_superuser ? 'hr' : 'employee';
  const visibleItems = navigationItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-border bg-surface/95 backdrop-blur-xl',
        mobile ? 'w-full border-r-0 px-5 py-6' : 'border-r px-5 py-6',
      )}
    >
      <div className="flex items-center gap-3 px-1 pb-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-glow">
          <LayoutDashboard size={22} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-text-muted">LeaveOps</p>
          <p className="text-base font-semibold text-text">
            {role === 'hr' ? 'HR Command Center' : 'My Leave Portal'}
          </p>
        </div>
      </div>

      <nav className="space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-accent/15 text-accent shadow-[0_0_0_1px_rgb(var(--color-accent)/0.16)]'
                  : 'text-text-muted hover:bg-surface-soft hover:text-text',
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 pt-6">
        <div className="rounded-2xl border border-border bg-surface-soft/70 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Signed in as</p>
          <p className="mt-2 text-sm font-medium text-text">{user?.full_name ?? 'Employee'}</p>
          <p className="text-xs text-text-muted">{user?.email ?? 'user@company.com'}</p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full justify-start gap-3"
          onClick={async () => {
            await logout();
          }}
        >
          <LogOut size={18} />
          Logout
        </Button>
      </div>
    </aside>
  );
}
