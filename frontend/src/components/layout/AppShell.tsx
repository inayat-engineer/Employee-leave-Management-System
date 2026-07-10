import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[rgb(var(--color-page-bg))] text-text">
      <div className="hidden min-h-screen lg:grid lg:grid-cols-[18rem_1fr]">
        <AppSidebar />
        <div className="flex min-h-screen flex-col">
          <AppNavbar onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      <div className="flex min-h-screen flex-col lg:hidden">
        <AppNavbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            aria-label="Close navigation menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[85vw] max-w-sm shadow-2xl shadow-black/50">
            <AppSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}