import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Search, MoonStar, Settings, SunMedium, UserCircle2, CheckCheck, Users, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/utils/cn';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRecord,
} from '@/services/notifications';
import { runGlobalSearch, type SearchResults, type EmployeeSearchResult, type LeaveSearchResult } from '@/services/globalSearch';

type AppNavbarProps = {
  onMenuClick: () => void;
};

const POLL_INTERVAL_MS = 20000;

function timeAgo(dateString: string) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AppNavbar({ onMenuClick }: AppNavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({ employees: [], leaves: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch {
      // Silently fail polling — don't spam toasts every 20 seconds on error
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(loadNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) {
      setSearchResults({ employees: [], leaves: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await runGlobalSearch(trimmed, Boolean(user?.is_superuser));
        setSearchResults(results);
      } catch {
        setSearchResults({ employees: [], leaves: [] });
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery, user?.is_superuser]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node;

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setShowNotifications(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }

      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowSearchResults(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  async function handleLogout() {
    setShowUserMenu(false);
    await logout();
    navigate('/login', { replace: true });
  }

  async function handleNotificationClick(notification: NotificationRecord) {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
        );
        setUnreadCount((current) => Math.max(current - 1, 0));
      } catch {
        // ignore
      }
    }
    setShowNotifications(false);
    if (notification.link) {
      navigate(notification.link);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  function goToEmployee(result: EmployeeSearchResult) {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(`/employees?highlight=${result.id}`);
  }

  function goToLeave(result: LeaveSearchResult) {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(user?.is_superuser ? `/leave-requests?highlight=${result.id}` : `/leave-history?highlight=${result.id}`);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return;
    }
    if (searchResults.employees.length > 0) {
      goToEmployee(searchResults.employees[0]);
    } else if (searchResults.leaves.length > 0) {
      goToLeave(searchResults.leaves[0]);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/85 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Button type="button" variant="ghost" className="lg:hidden" onClick={onMenuClick} aria-label="Open navigation menu">
          <Menu size={18} />
        </Button>

        <div className="relative flex-1 max-w-2xl" ref={searchRef}>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder={user?.is_superuser ? 'Search employees, leaves, approvals...' : 'Search your leave requests...'}
            className={cn(
              'h-12 w-full rounded-2xl border border-border bg-surface-soft/80 pl-11 pr-4 text-sm text-text outline-none transition',
              'placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20',
            )}
          />

          {showSearchResults && searchQuery.trim().length > 0 ? (
            <div className="absolute left-0 right-0 mt-3 max-h-96 overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-black/30">
              {isSearching ? (
                <p className="px-3 py-6 text-center text-sm text-text-muted">Searching...</p>
              ) : searchResults.employees.length === 0 && searchResults.leaves.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-text-muted">No results found.</p>
              ) : (
                <>
                  {searchResults.employees.length > 0 ? (
                    <div className="mb-1">
                      <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Employees</p>
                      {searchResults.employees.map((result) => (
                        <button
                          key={`employee-${result.id}`}
                          type="button"
                          onClick={() => goToEmployee(result)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-soft"
                        >
                          <Users size={16} className="shrink-0 text-text-muted" />
                          <div>
                            <p className="text-sm font-medium text-text">{result.title}</p>
                            <p className="text-xs text-text-muted">{result.subtitle}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {searchResults.leaves.length > 0 ? (
                    <div>
                      <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        {user?.is_superuser ? 'Leave requests' : 'My leaves'}
                      </p>
                      {searchResults.leaves.map((result) => (
                        <button
                          key={`leave-${result.id}`}
                          type="button"
                          onClick={() => goToLeave(result)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-soft"
                        >
                          <CalendarClock size={16} className="shrink-0 text-text-muted" />
                          <div>
                            <p className="text-sm font-medium text-text">{result.title}</p>
                            <p className="truncate text-xs text-text-muted">{result.subtitle}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative" ref={notificationRef}>
            <Button
              type="button"
              variant="ghost"
              className="relative h-12 w-12 rounded-2xl"
              aria-label="Notifications"
              onClick={() => setShowNotifications((visible) => !visible)}
            >
              <Bell size={18} />
              {unreadCount > 0 ? (
                <span className="absolute right-2.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white shadow-glow">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Button>

            {showNotifications ? (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-black/30">
                <div className="flex items-center justify-between border-b border-border px-2 pb-3 pt-1">
                  <p className="text-sm font-semibold text-text">Notifications</p>
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      <CheckCheck size={13} />
                      Mark all read
                    </button>
                  ) : null}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-text-muted">No notifications yet.</p>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          'flex w-full flex-col gap-1 rounded-xl px-3 py-3 text-left transition hover:bg-surface-soft',
                          !notification.is_read && 'bg-accent/5',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {!notification.is_read ? (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          ) : (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                          )}
                          <p className={cn('text-sm', notification.is_read ? 'text-text-muted' : 'text-text font-medium')}>
                            {notification.message}
                          </p>
                        </div>
                        <p className="pl-3.5 text-xs text-text-muted">{timeAgo(notification.created_at)}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <Button type="button" variant="secondary" onClick={toggleTheme} className="gap-2">
            {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </Button>

          <div className="relative" ref={userMenuRef}>
            <Button
              type="button"
              variant="secondary"
              className="gap-2 rounded-2xl px-3 sm:px-4"
              onClick={() => setShowUserMenu((visible) => !visible)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                {(user?.full_name ?? '??').slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <div className="text-sm font-medium text-text">{user?.full_name ?? 'Account'}</div>
                <div className="text-xs text-text-muted">{user?.is_superuser ? 'HR Manager' : (user?.designation ?? 'Employee')}</div>
              </div>
              <ChevronDown size={16} className="text-text-muted" />
            </Button>

            {showUserMenu ? (
              <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-black/30">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/profile');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-text-muted transition hover:bg-surface-soft hover:text-text"
                >
                  <UserCircle2 size={18} />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/settings');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-text-muted transition hover:bg-surface-soft hover:text-text"
                >
                  <Settings size={18} />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
