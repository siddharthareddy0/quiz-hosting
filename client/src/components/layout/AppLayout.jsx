import { Outlet } from 'react-router-dom';

import AppNavbar from '../nav/AppNavbar.jsx';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-pastel-radial">
      <AppNavbar />
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
        <Outlet />
      </div>
    </div>
  );
}
