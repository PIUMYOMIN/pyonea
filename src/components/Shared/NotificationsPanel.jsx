// src/components/Shared/NotificationsPanel.jsx
//
// Rewrite notes vs the old version:
//  - NotificationBell no longer polls independently; it reads unreadCount
//    from NotificationContext (one shared interval for the whole app).
//  - remove() previously always decremented unreadCount, even for already-read
//    notifications. It now only decrements when the removed item was unread.
//  - fetchNotifications used `page` inside a useCallback with a stale-closure
//    risk. Load-more now passes the target page explicitly.
//  - clearAll shows a confirmation before nuking everything.

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BellIcon, CheckCircleIcon, TrashIcon,
  ShoppingBagIcon, StarIcon, BuildingStorefrontIcon,
  InformationCircleIcon, XMarkIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import api from '../../utils/api';
import { useNotifications } from '../../context/NotificationContext';

// ── Notification type → icon ──────────────────────────────────────────────────

const typeIcon = (type) => {
  const cls = 'h-5 w-5 flex-shrink-0';
  switch (type) {
    case 'order_placed':
    case 'order_status_changed':
    case 'new_order':       return <ShoppingBagIcon           className={`${cls} text-blue-500`} />;
    case 'product_review':  return <StarIcon                  className={`${cls} text-yellow-500`} />;
    case 'seller_approved': return <BuildingStorefrontIcon    className={`${cls} text-green-500`} />;
    case 'seller_rejected': return <XMarkIcon                 className={`${cls} text-red-500`} />;
    case 'welcome':         return <BellIcon                  className={`${cls} text-green-400`} />;
    default:                return <InformationCircleIcon     className={`${cls} text-gray-400`} />;
  }
};

// ── Relative timestamp ────────────────────────────────────────────────────────

const relativeTime = (dateStr, t) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)     return t('notifications.just_now');
  if (diff < 3600)   return t('notifications.minutes_ago', { count: Math.floor(diff / 60) });
  if (diff < 86400)  return t('notifications.hours_ago',   { count: Math.floor(diff / 3600) });
  if (diff < 604800) return t('notifications.days_ago',    { count: Math.floor(diff / 86400) });
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

// ── Main panel ────────────────────────────────────────────────────────────────

const PER_PAGE = 20;

const NotificationsPanel = () => {
  const { t } = useTranslation();
  const { unreadCount, decrementUnread, resetUnread } = useNotifications();

  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [filter,       setFilter]       = useState('all');  // 'all' | 'unread'
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchPage = useCallback(async (targetPage, reset) => {
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const res = await api.get('/notifications', {
        params: {
          per_page: PER_PAGE,
          page: targetPage,
          ...(filter === 'unread' ? { unread: true } : {}),
        },
      });
      const { data, meta } = res.data;
      setItems(prev => reset ? data : [...prev, ...data]);
      setPage(targetPage);
      setHasMore(meta.current_page < meta.last_page);
    } catch { /* silent */ }
    finally { reset ? setLoading(false) : setLoadingMore(false); }
  }, [filter]);

  // Re-fetch from page 1 whenever the filter changes
  useEffect(() => { fetchPage(1, true); }, [fetchPage]);

  // ── actions ───────────────────────────────────────────────────────────────

  const markRead = async (id) => {
    const target = items.find(n => n.id === id);
    if (!target || target.read_at) return; // already read — nothing to do
    await api.post(`/notifications/${id}/read`).catch(() => {});
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    decrementUnread(true);
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    resetUnread();
  };

  // BUG FIX: old remove() always called setUnread(u => u - 1), even when the
  // removed notification was already read — causing the badge to go negative.
  // Now we check whether the item was unread before removing it.
  const remove = async (id) => {
    const target = items.find(n => n.id === id);
    await api.delete(`/notifications/${id}`).catch(() => {});
    setItems(prev => prev.filter(n => n.id !== id));
    decrementUnread(!target?.read_at); // only subtract if it was unread
  };

  const clearAll = async () => {
    await api.delete('/notifications').catch(() => {});
    setItems([]);
    resetUnread();
    setConfirmClear(false);
  };

  // ── derived state ─────────────────────────────────────────────────────────

  const visible = filter === 'unread' ? items.filter(n => !n.read_at) : items;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          {unreadCount > 0
            ? <BellAlertIcon className="h-5 w-5 text-green-600" />
            : <BellIcon      className="h-5 w-5 text-gray-500 dark:text-slate-400" />}
          {t('notifications.panel_title')}
          {unreadCount > 0 && (
            <span className="bg-green-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h2>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="text-xs text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300
                         font-medium border border-green-200 dark:border-green-700 hover:border-green-400
                         px-2.5 py-1 rounded-lg transition-colors">
              {t('notifications.mark_all_read')}
            </button>
          )}
          {items.length > 0 && (
            <button onClick={() => setConfirmClear(true)}
              className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300
                         font-medium border border-red-200 dark:border-red-700 hover:border-red-400
                         px-2.5 py-1 rounded-lg transition-colors">
              {t('notifications.clear_all')}
            </button>
          )}
        </div>
      </div>

      {/* Clear-all confirmation */}
      {confirmClear && (
        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200
                        dark:border-red-700 rounded-xl">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {t('notifications.clear_confirm')}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setConfirmClear(false)}
              className="text-xs px-2.5 py-1 border border-gray-300 dark:border-slate-600
                         rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
              {t('notifications.cancel')}
            </button>
            <button onClick={clearAll}
              className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700">
              {t('notifications.clear_confirm_yes')}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-xl w-fit">
        {['all', 'unread'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors
              ${filter === f
                ? 'bg-white dark:bg-slate-600 text-green-700 dark:text-green-400 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
            {f === 'all'
              ? t('notifications.filter_all')
              : `${t('notifications.filter_unread')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          // Skeleton
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 animate-pulse">
                <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <BellIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {filter === 'unread'
                ? t('notifications.no_unread')
                : t('notifications.no_notifications')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {visible.map(n => {
              const data     = typeof n.data === 'string' ? JSON.parse(n.data) : (n.data ?? {});
              const isUnread = !n.read_at;
              return (
                <div key={n.id}
                  className={`flex items-start gap-3 p-4 transition-colors
                    ${isUnread
                      ? 'bg-green-50/60 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>

                  {/* type icon */}
                  <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0
                    ${isUnread ? 'bg-white dark:bg-slate-700 shadow-sm' : 'bg-gray-100 dark:bg-slate-700'}`}>
                    {typeIcon(data.type)}
                  </div>

                  {/* content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug
                      ${isUnread
                        ? 'font-medium text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-slate-400'}`}>
                      {data.message || t('notifications.new_notification')}
                    </p>
                    {data.order_number && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        {t('notifications.order_number', { number: data.order_number })}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      {relativeTime(n.created_at, t)}
                    </p>
                  </div>

                  {/* actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isUnread && (
                      <button onClick={() => markRead(n.id)}
                        title={t('notifications.mark_as_read')}
                        className="p-1.5 text-green-500 hover:text-green-700 dark:hover:text-green-400
                                   hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors">
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => remove(n.id)}
                      title={t('notifications.remove')}
                      className="p-1.5 text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400
                                 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* unread dot */}
                  {isUnread && (
                    <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })}

            {/* load more */}
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={() => fetchPage(page + 1, false)}
                  disabled={loadingMore}
                  className="text-sm text-green-700 dark:text-green-400 font-medium
                             hover:text-green-900 dark:hover:text-green-300 disabled:opacity-50">
                  {loadingMore ? t('notifications.loading') : t('notifications.load_more')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Bell badge ────────────────────────────────────────────────────────────────
// Reads from context — no independent polling, no extra API calls.

export const NotificationBell = ({ onClick }) => {
  const { unreadCount } = useNotifications();

  return (
    <button onClick={onClick}
      className="relative p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200
                 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
      {unreadCount > 0
        ? <BellAlertIcon className="h-5 w-5 text-green-600" />
        : <BellIcon      className="h-5 w-5" />}
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 bg-green-500 text-white
                         text-[10px] font-bold w-4 h-4 flex items-center
                         justify-center rounded-full leading-none">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationsPanel;