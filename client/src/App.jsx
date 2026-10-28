import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import Leaves from './pages/Leaves.jsx';
import Reports from './pages/Reports.jsx';
import HoursLeave from './pages/HoursLeave.jsx';
import Roster from './pages/Roster.jsx';
import LeaveCalendar from './pages/LeaveCalendar.jsx';
import TeamOverview from './pages/TeamOverview.jsx';
import Login from './pages/Login.jsx';
import { AuthContext } from './context/auth.js';
import { setToken } from './api/client.js';

// ── Inline SVG nav icons ───────────────────────────────────────────
function IconGrid() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1"/>
      <rect x="8.5" y="1.5" width="5" height="5" rx="1"/>
      <rect x="1.5" y="8.5" width="5" height="5" rx="1"/>
      <rect x="8.5" y="8.5" width="5" height="5" rx="1"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2.5" width="12" height="11" rx="1.5"/>
      <path d="M5 1.5v2M10 1.5v2M1.5 6.5h12"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="4.5" r="2.5"/>
      <path d="M1 13c0-2.49 2.01-4.5 4.5-4.5S10 10.51 10 13"/>
      <path d="M11.5 9.5c1.38.5 2.5 1.8 2.5 3.5"/>
      <circle cx="11.5" cy="4" r="2"/>
    </svg>
  );
}
function IconLeafCal() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2.5" width="12" height="11" rx="1.5"/>
      <path d="M5 1.5v2M10 1.5v2M1.5 6.5h12"/>
      <path d="M5 10l2 2 3-3"/>
    </svg>
  );
}
function IconBarChart() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 13V9M5.5 13V6M9 13V8M12.5 13V3"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="6"/>
      <path d="M7.5 4v3.5l2.5 1.5"/>
    </svg>
  );
}

const PAGE_NAMES = {
  '/':          'Dashboard',
  '/roster':    'Roster',
  '/employees': 'Employees',
  '/leaves':    'Leaves',
  '/reports':   'NSA Report',
  '/hours-leave': 'Hours & leave',
  '/leave-calendar': 'Leave calendar',
  '/team':           'Team overview',
};

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/',       end: true, isNavLink: true, Icon: IconGrid,     label: 'Dashboard' },
      { to: '/roster',           isNavLink: true, Icon: IconCalendar, label: 'Roster'    },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/employees', isNavLink: true, Icon: IconUsers,   label: 'Employees' },
      { to: '/leaves',    isNavLink: true, Icon: IconLeafCal, label: 'Leaves'    },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/leave-calendar', isNavLink: true, Icon: IconLeafCal,  label: 'Leave calendar' },
      { to: '/team',           isNavLink: true, Icon: IconUsers,    label: 'Team overview'  },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/reports', isNavLink: true, Icon: IconBarChart, label: 'NSA Report' },
      { to: '/hours-leave', isNavLink: true, Icon: IconClock, label: 'Hours & leave' },
    ],
  },
];

function userInitials(username) {
  const words = username.trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : username.slice(0, 2)).toUpperCase();
}

function Shell({ user, onLogout }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const pageLabel = PAGE_NAMES[location.pathname] ?? 'Dashboard';

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F4FA' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0"
        style={{ width: 240, background: 'linear-gradient(180deg, #14141F 0%, #1D1D2C 100%)' }}
      >
        {/* Logo block */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 flex items-center justify-center font-grotesk font-bold text-white text-xs"
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #6C4CF1 0%, #9B7CFB 100%)',
                letterSpacing: '0.04em',
              }}
            >
              IR
            </div>
            <div className="min-w-0">
              <div className="font-grotesk text-white font-semibold text-sm leading-tight">
                IAM Ops
              </div>
              <div className="text-xs leading-tight" style={{ color: '#5B5B7A' }}>
                Roster &amp; Allowances
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-2 flex flex-col gap-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p
                className="font-grotesk text-xs font-semibold uppercase px-3 mb-1.5"
                style={{ color: '#3D3D58', letterSpacing: '0.09em' }}
              >
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ to, end, isNavLink, Icon, label }) =>
                  isNavLink ? (
                    <NavLink
                      key={label}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        [
                          'nav-link flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium',
                          isActive
                            ? 'nav-link-active text-white'
                            : 'text-gray-400 hover:bg-white/10 hover:text-white',
                        ].join(' ')
                      }
                    >
                      <Icon />
                      {label}
                    </NavLink>
                  ) : (
                    <button
                      key={label}
                      onClick={() => {
                        navigate(to);
                        requestAnimationFrame(() => {
                          document.getElementById('roster-section')?.scrollIntoView({ behavior: 'smooth' });
                        });
                      }}
                      className="nav-link flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white text-left w-full"
                    >
                      <Icon />
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div
          className="px-5 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span style={{ position: 'relative', width: 8, height: 8, display: 'inline-block', flexShrink: 0 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#1C9A6C' }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#1C9A6C', animation: 'pulse-ring 1.8s ease-out infinite' }} />
            </span>
            <span className="text-xs" style={{ color: '#5B5B7A' }}>Synced 2 min ago</span>
          </div>
          <div className="text-xs" style={{ color: '#3D3D58' }}>Pod: IAM · 4 members</div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header
          className="h-14 bg-white flex items-center px-6 gap-4 shrink-0"
          style={{ borderBottom: '1px solid #E6E4EF', boxShadow: '0 1px 4px rgba(108,76,241,0.06)' }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm shrink-0">
            <span style={{ color: '#9ca3af' }}>IAM Ops</span>
            <span style={{ color: '#D1D5DB', margin: '0 2px' }}>/</span>
            <span className="font-grotesk font-semibold" style={{ color: '#1a1a2e' }}>
              {pageLabel}
            </span>
          </div>

          {/* Search */}
          <div
            className="flex items-center gap-2 flex-1 max-w-xs rounded-xl px-3 py-1.5"
            style={{ background: '#F5F4FA', border: '1px solid #E6E4EF' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="6" cy="6" r="4"/>
              <path d="M9.5 9.5l2.5 2.5"/>
            </svg>
            <input
              type="search"
              placeholder="Search people, dates…"
              style={{
                border: 'none', background: 'transparent', outline: 'none',
                fontSize: 13, color: '#374151', width: '100%', padding: 0,
                fontFamily: 'IBM Plex Sans, sans-serif',
              }}
            />
          </div>

          {/* User avatar + sign out — right-aligned */}
          <button
            onClick={onLogout}
            className="ml-auto shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
          <div
            className="shrink-0 flex items-center justify-center font-grotesk font-bold text-white"
            style={{
              width: 34, height: 34, borderRadius: "50%", fontSize: 12,
              background: 'linear-gradient(135deg, #6C4CF1 0%, #9B7CFB 100%)',
              cursor: 'default', letterSpacing: '0.04em',
            }}
            title={user.username}
          >
            {userInitials(user.username)}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div key={location.pathname} className="page-enter">
            <Routes>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/roster"    element={<Roster />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/leaves"    element={<Leaves />} />
              <Route path="/reports"   element={<Reports />} />
              <Route path="/hours-leave" element={<HoursLeave />} />
              <Route path="/leave-calendar" element={<LeaveCalendar />} />
              <Route path="/team"           element={<TeamOverview />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  // Drop back to the login page whenever the API says the session expired.
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener('auth-expired', expired);
    return () => window.removeEventListener('auth-expired', expired);
  }, []);

  function logout() {
    setToken(null);
    setUser(null);
  }

  if (!user) return <Login onLoggedIn={setUser} />;
  return (
    <AuthContext.Provider value={user}>
      <Shell user={user} onLogout={logout} />
    </AuthContext.Provider>
  );
}
