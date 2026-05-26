// src/context/NotificationContext.jsx
/* eslint-disable react-refresh/only-export-components */

import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const POLL_INTERVAL_MS = 10_000; // near-real-time shared polling

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [version, setVersion] = useState(0);
  const intervalRef = useRef(null);
  const lastCountRef = useRef(0);

  // ── fetch unread count only ───────────────────────────────────────────────
  const refreshCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications', { params: { per_page: 1 } });
      const nextCount = res.data.unread_count ?? 0;
      setUnreadCount(nextCount);
      if (nextCount !== lastCountRef.current) {
        lastCountRef.current = nextCount;
        setVersion(v => v + 1);
      }
    } catch { /* silent — network hiccups shouldn't disrupt the UI */ }
  }, [user]);

  // Start / stop polling based on auth state
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      lastCountRef.current = 0;
      clearInterval(intervalRef.current);
      return;
    }

    refreshCount();
    intervalRef.current = setInterval(refreshCount, POLL_INTERVAL_MS);

    const onFocus = () => refreshCount();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshCount();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, refreshCount]);

  // ── optimistic action helpers ─────────────────────────────────────────────
  //
  // These are called by NotificationsPanel after it performs the API call so
  // it can keep its own item list in sync without re-fetching everything.

  const decrementUnread = useCallback((wasUnread) => {
    if (wasUnread) {
      setUnreadCount(c => {
        const next = Math.max(0, c - 1);
        lastCountRef.current = next;
        return next;
      });
    }
  }, []);

  const resetUnread = useCallback(() => {
    lastCountRef.current = 0;
    setUnreadCount(0);
  }, []);

  const value = {
    unreadCount,
    version,
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
