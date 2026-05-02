// src/context/NotificationContext.jsx

import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const POLL_INTERVAL_MS = 60_000; // 60 s

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  // ── fetch unread count only ───────────────────────────────────────────────
  const refreshCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications', { params: { per_page: 1 } });
      setUnreadCount(res.data.unread_count ?? 0);
    } catch { /* silent — network hiccups shouldn't disrupt the UI */ }
  }, [user]);

  // Start / stop polling based on auth state
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      clearInterval(intervalRef.current);
      return;
    }

    refreshCount();
    intervalRef.current = setInterval(refreshCount, POLL_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [user, refreshCount]);

  // ── optimistic action helpers ─────────────────────────────────────────────
  //
  // These are called by NotificationsPanel after it performs the API call so
  // it can keep its own item list in sync without re-fetching everything.

  const decrementUnread = useCallback((wasUnread) => {
    if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  const resetUnread = useCallback(() => setUnreadCount(0), []);

  const value = {
    unreadCount,
    refreshCount,
    decrementUnread,
    resetUnread,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
};