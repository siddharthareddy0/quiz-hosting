import { Outlet } from 'react-router-dom';

import PublicNavbar from '../nav/PublicNavbar.jsx';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-pastel-radial">
      <PublicNavbar />
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
        <Outlet />
      </div>
    </div>
  );
}
