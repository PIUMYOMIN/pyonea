// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function to normalize user roles with deep extraction
  const normalizeUserRoles = (userData) => {
    if (!userData) return userData;

    let roles = [];

    // Case 1: roles is an array of role objects
    if (userData.roles && Array.isArray(userData.roles)) {
      roles = userData.roles.map(role => {
        if (typeof role === 'object' && role !== null) {
          // Try different possible property names
          return role.name || role.role || role.title || JSON.stringify(role);
        }
        return role; // Already a string
      });
    }
    // Case 2: roles is a single object
    else if (userData.roles && typeof userData.roles === 'object') {
      roles = [userData.roles.name || userData.roles.role || JSON.stringify(userData.roles)];
    }
    // Case 3: roles is a single string
    else if (typeof userData.roles === 'string') {
      roles = [userData.roles];
    }
    // Case 4: use type field as fallback
    else if (userData.type) {
      roles = [userData.type];
    }
    // Case 5: check for role field (singular)
    else if (userData.role) {
      roles = [userData.role];
    }

    // Filter out any null/undefined and ensure strings
    roles = roles.filter(role => role).map(role => role.toString());

    return {
      ...userData,
      roles: roles,
      // For backward compatibility
      role: roles[0] || userData.type || userData.role || 'buyer'
    };
  };

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/me', { signal: controller.signal });
          const normalizedUser = normalizeUserRoles(response.data.data);
          setUser(normalizedUser);
          localStorage.setItem('user', JSON.stringify(normalizedUser));
        } catch (err) {
          if (err.name === 'CanceledError' || err.name === 'AbortError') return;
          console.error('Failed to load user from API', err);
          clearSession();
          return;
        }
      } else {
        clearSession();
        return;
      }
      setLoading(false);
    };

    loadUser();
    window.addEventListener('auth:session-expired', clearSession);

    return () => {
      controller.abort();
      window.removeEventListener('auth:session-expired', clearSession);
    };
  }, [clearSession]);

  const login = async (credentials) => {
    try {
      const response = await api.post('/login', credentials);
      localStorage.setItem('token', response.data.data.token);
      const normalizedUser = normalizeUserRoles(response.data.data.user);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      return { success: true, user: normalizedUser };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/register', userData);
      localStorage.setItem('token', response.data.data.token);
      const normalizedUser = normalizeUserRoles(response.data.data.user);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      return { success: true, user: normalizedUser };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed'
      };
    }
  };

  /**
   * setSession — low-level helper for any auth entrypoint (email/pass, social, etc.)
   * Accepts the same shape returned by the API: { token, user }.
   */
  const setSession = ({ token, user: userData }) => {
    if (token) localStorage.setItem('token', token);
    if (userData) {
      const normalizedUser = normalizeUserRoles(userData);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      return normalizedUser;
    }
    return null;
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const normalizedUser = normalizeUserRoles(response.data.data);
      setUser(normalizedUser);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      return normalizedUser;
    } catch (err) {
      console.error('Failed to refresh user', err);
      throw err;
    }
  };

  /**
   * updateUser — call this after a successful profile save so the header,
   * sidebar, and every other consumer of AuthContext reflects the new data
   * immediately without a page refresh.
   */
  const updateUser = (updatedData) => {
    const merged = normalizeUserRoles({ ...user, ...updatedData });
    setUser(merged);
    localStorage.setItem('user', JSON.stringify(merged));
    return merged;
  };

  const isEmailVerified = () => {
    return !!user?.email_verified_at;
  };

  const logout = () => {
    // Immediate client-side cleanup
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setLoading(false);

    // Fire-and-forget server logout - ignore any errors
    api.post('/auth/logout').catch(() => {
      // This is expected to sometimes fail with 401 - that's OK!
    });
  };

  // Helper methods for role checks
  const hasRole = useCallback((role) => {
    if (!user) return false;

    // Check roles array
    if (user.roles && Array.isArray(user.roles)) {
      const hasRoleInArray = user.roles.some(r => {
        if (typeof r === 'string') return r === role;
        if (typeof r === 'object') return (r.name || r.role || r.title) === role;
        return false;
      });
      if (hasRoleInArray) return true;
    }

    // Check single role fields
    return user.role === role || user.type === role;
  }, [user]);

  // Add method to get user's primary role
  const getPrimaryRole = useCallback(() => {
    if (!user) return null;

    if (hasRole('admin')) return 'admin';
    if (hasRole('seller')) return 'seller';
    if (hasRole('buyer')) return 'buyer';

    return user.role || user.type || 'buyer';
  }, [user, hasRole]);

  const isBuyer = useCallback(() => hasRole('buyer'), [hasRole]);
  const isSeller = useCallback(() => hasRole('seller'), [hasRole]);
  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);

  const value = {
    user,
    loading,
    login,
    register,
    setSession,
    logout,
    refreshUser,
    updateUser,
    canAddToCart: () => !!user,
    canAddToWishlist: () => !!user,
    isAuthenticated: !!user,
    isBuyer,
    isSeller,
    isAdmin,
    hasRole,
    isEmailVerified,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
