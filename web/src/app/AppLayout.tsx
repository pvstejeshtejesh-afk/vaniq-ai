import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/app', label: 'Overview', icon: '▤', end: true },
  { to: '/app/employees', label: 'AI Employees', icon: '◉' },
  { to: '/app/leads', label: 'Leads', icon: '◈' },
  { to: '/app/calls', label: 'Calls', icon: '☎' },
  { to: '/app/appointments', label: 'Appointments', icon: '▦' },
  { to: '/app/analytics', label: 'Analytics', icon: '▲' },
  { to: '/app/wallet', label: 'Wallet & Billing', icon: '₹' },
  { to: '/app/integrations', label: 'Integrations', icon: '⇄' },
  { to: '/app/settings', label: 'Business Settings', icon: '⚙' },
  { to: '/app/profile', label: 'Profile & Security', icon: '👤' },
];

export function AppLayout() {
  const { user, business, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const nav = (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-brand-600 text-white shadow-soft'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`
          }
        >
          <span className="w-4 text-center">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            className="rounded-lg border border-slate-200 px-2 py-1.5"
          >
            ☰
          </button>
          <span className="text-lg font-extrabold">
            Vaniq<span className="text-brand-600">.Ai</span>
          </span>
        </div>
        <span className="truncate text-sm font-medium text-slate-600">{business?.name}</span>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition lg:static lg:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-100 px-5 py-5">
              <span className="text-xl font-extrabold">
                Vaniq<span className="text-brand-600">.Ai</span>
              </span>
              <p className="mt-1 truncate text-xs text-slate-500">{business?.name}</p>
            </div>
            {nav}
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="truncate text-sm font-medium text-slate-700">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
              <button
                onClick={handleLogout}
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {open && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Main */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
