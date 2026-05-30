// src/components/ProtectedRoute.jsx - Enhanced version
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, isAuthenticated, loading, hasRole } = useAuth();
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
    return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}` }} replace />;
  }

  const isBuyer = hasRole('buyer');
  const isSeller = hasRole('seller');
  const isAdmin = hasRole('admin');

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
    const hasRequiredRole = roles.some(role => hasRole(role));
    
    if (!hasRequiredRole) {
      // Redirect to appropriate dashboard based on user role
      if (isAdmin) {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (isSeller) {
        return <Navigate to="/seller/dashboard" replace />;
      } else {
        return <Navigate to="/buyer/dashboard" replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;
