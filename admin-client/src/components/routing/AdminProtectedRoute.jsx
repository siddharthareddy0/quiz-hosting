import { Navigate } from 'react-router-dom';

import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import FullPageLoader from '../ui/FullPageLoader.jsx';

export default function AdminProtectedRoute({ children }) {
  const { loading, isAuthed } = useAdminAuth();

  if (loading) return <FullPageLoader />;
  if (!isAuthed) return <Navigate to="/admin/login" replace />;

  return children;
}
