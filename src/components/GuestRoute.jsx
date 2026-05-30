// src/components/GuestRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GuestRoute = ({ children }) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (user) {
    if (hasRole('admin')) return <Navigate to="/admin/dashboard" replace />;
    if (hasRole('seller')) return <Navigate to="/seller/dashboard" replace />;
    if (hasRole('buyer')) return <Navigate to="/buyer/dashboard" replace />;

    return <Navigate to="/" replace />;
  }

  return children;
};

export default GuestRoute;
