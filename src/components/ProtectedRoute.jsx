// src/components/ProtectedRoute.jsx - Enhanced version
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login with return url
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const isBuyer = userRoles.includes('buyer') || user?.role === 'buyer' || user?.type === 'buyer';
  const isSeller = userRoles.includes('seller') || user?.role === 'seller' || user?.type === 'seller';
  const isAdmin = userRoles.includes('admin') || user?.role === 'admin' || user?.type === 'admin';

  // Sellers/admins must verify email before protected areas. Buyers can shop
  // immediately and get a dashboard reminder instead of a hard redirect.
  if (user?.email && !user?.email_verified_at && (isSeller || isAdmin)) {
    return (
      <Navigate
        to="/verify-email"
        replace
        state={{ returnTo: `${location.pathname}${location.search}` }}
      />
    );
  }

  // Check if user has required roles
  if (roles.length > 0) {
    const hasRequiredRole = roles.some(role => 
      user?.roles?.includes(role) || user?.role === role || user?.type === role
    );
    
    if (!hasRequiredRole) {
      // Redirect to appropriate dashboard based on user role
      if (user?.roles?.includes('admin') || user?.role === 'admin') {
        return <Navigate to="/admin" replace />;
      } else if (user?.roles?.includes('seller') || user?.role === 'seller') {
        return <Navigate to="/seller" replace />;
      } else {
        return <Navigate to="/buyer" replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;
