import { Navigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import FullPageLoader from '../ui/FullPageLoader.jsx';

export default function ProtectedRoute({ children }) {
  const { loading, isAuthed } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!isAuthed) return <Navigate to="/auth" replace />;

  return children;
}
