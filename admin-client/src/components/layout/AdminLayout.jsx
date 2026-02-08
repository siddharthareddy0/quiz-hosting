import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  NotebookPen,
  ScrollText,
  ShieldAlert,
  Users,
  Wrench,
} from 'lucide-react';

import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import Button from '../ui/Button.jsx';

function Item({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          isActive
            ? 'bg-ink-900 text-white shadow-soft'
            : 'text-ink-700 hover:bg-white/70 hover:text-ink-900'
        }`
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-admin-radial">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl2 border border-white/70 bg-white/70 p-4 shadow-soft backdrop-blur-xl">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-soft" />
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-ink-900">Admin Panel</div>
              <div className="text-xs text-ink-500">{admin?.email}</div>
            </div>
          </div>

          <div className="mt-2 space-y-2">
            <Item to="/admin" icon={LayoutDashboard} label="Dashboard" />
            <Item to="/admin/exams" icon={NotebookPen} label="Exams" />
            <Item to="/admin/questions" icon={Wrench} label="Questions" />
            <Item to="/admin/users" icon={Users} label="Users / Assignments" />
            <Item to="/admin/live" icon={Activity} label="Live Monitoring" />
            <Item to="/admin/malpractice" icon={ShieldAlert} label="Malpractice" />
            <Item to="/admin/attendance" icon={ClipboardCheck} label="Attendance" />
            <Item to="/admin/results" icon={ScrollText} label="Results" />
            <Item to="/admin/reports" icon={ScrollText} label="Reports" />
          </div>

          <div className="mt-6 border-t border-white/60 pt-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                logout();
                navigate('/admin/login', { replace: true });
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
