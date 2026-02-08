import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../ui/Button.jsx';

function Item({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `rounded-xl px-4 py-2 text-sm font-semibold transition ${
          isActive
            ? 'bg-ink-900 text-white shadow-soft'
            : 'text-ink-700 hover:bg-white/70 hover:text-ink-900'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isInExam = /^\/app\/tests\/[^/]+\/exam$/.test(location.pathname);

  return (
    <div className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500/90 to-fuchsia-500/80 shadow-soft"
          />
          <div className="leading-tight">
            <div
              className={
                'text-sm font-semibold text-ink-900' +
                (isInExam ? '' : ' cursor-pointer')
              }
              onClick={() => {
                if (isInExam) return;
                navigate('/');
              }}
            >
              Quiz Hosting
            </div>
            {isInExam ? null : (
              <div className="text-xs text-ink-500">Welcome, {user?.name || user?.email}</div>
            )}
          </div>
        </div>

        {isInExam ? null : (
          <div className="flex items-center gap-2">
            <Item to="/app">Tests</Item>
            <Item to="/app/analysis">Analysis</Item>
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                navigate('/', { replace: true });
              }}
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
