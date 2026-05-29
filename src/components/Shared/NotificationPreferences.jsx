// src/components/Shared/NotificationPreferences.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, BellIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import api from '../../utils/api';

const DEFAULT_PREFS = {
  order_updates:        true,
  promotional_emails:   true,
  newsletter:           false,
  security_alerts:      true,  // always true; user cannot disable
  new_orders:           true,
  review_notifications: true,
  seller_updates:       true,
};

// security_alerts is intentionally absent — it's locked and never sent to the
// backend as a user-changeable value.
const EDITABLE_KEYS = [
  'order_updates', 'promotional_emails', 'newsletter',
  'new_orders', 'review_notifications', 'seller_updates',
];

const getBuyerGroups = (t) => [
  {
    title: t('notifications.preferences.groups.order_account'),
    icon: '📦',
    items: [
      { key: 'order_updates', label: t('notifications.preferences.items.order_updates.label'), hint: t('notifications.preferences.items.order_updates.hint') },
    ],
  },
  {
    title: t('notifications.preferences.groups.promotions_news'),
    icon: '🎁',
    items: [
      { key: 'promotional_emails', label: t('notifications.preferences.items.promotional_emails.label'), hint: t('notifications.preferences.items.promotional_emails.hint') },
      { key: 'newsletter', label: t('notifications.preferences.items.newsletter.label'), hint: t('notifications.preferences.items.newsletter.hint') },
    ],
  },
];

const getSellerGroups = (t) => [
  {
    title: t('notifications.preferences.groups.orders_reviews'),
    icon: '🛒',
    items: [
      { key: 'new_orders', label: t('notifications.preferences.items.new_orders.label'), hint: t('notifications.preferences.items.new_orders.hint') },
      { key: 'order_updates', label: t('notifications.preferences.items.order_status_updates.label'), hint: t('notifications.preferences.items.order_status_updates.hint') },
      { key: 'review_notifications', label: t('notifications.preferences.items.review_notifications.label'), hint: t('notifications.preferences.items.review_notifications.hint') },
    ],
  },
  {
    title: t('notifications.preferences.groups.seller_updates'),
    icon: '📋',
    items: [
      { key: 'seller_updates', label: t('notifications.preferences.items.seller_updates.label'), hint: t('notifications.preferences.items.seller_updates.hint') },
      { key: 'promotional_emails', label: t('notifications.preferences.items.promotional_tips.label'), hint: t('notifications.preferences.items.promotional_tips.hint') },
      { key: 'newsletter', label: t('notifications.preferences.items.newsletter.label'), hint: t('notifications.preferences.items.newsletter.hint') },
    ],
  },
];

// ── Toggle ────────────────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, disabled, locked, lockedTitle }) => {
  if (locked) {
    // Locked toggles are always-on and show a lock icon instead of a thumb
    return (
      <div className="flex items-center gap-1.5" title={lockedTitle}>
        <LockClosedIcon className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
        <div className="relative inline-flex h-5 w-9 rounded-full bg-green-500 opacity-60 cursor-not-allowed">
          <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2
                  border-transparent transition-colors duration-200 focus:outline-none
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${checked ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-600'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow
                        transition duration-200 ease-in-out
                        ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const NotificationPreferences = ({ userType = 'buyer', initialPrefs = {}, onSaved }) => {
  const { t } = useTranslation();
  const [prefs,  setPrefs]  = useState({ ...DEFAULT_PREFS, ...initialPrefs });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  // Sync when real data arrives from the parent (e.g. after an async fetch).
  // Using a ref flag avoids the JSON.stringify anti-pattern and prevents
  // unnecessary re-syncs on subsequent parent renders.
  const synced = useRef(false);
  useEffect(() => {
    if (synced.current) return;
    if (!initialPrefs || Object.keys(initialPrefs).length === 0) return;
    setPrefs({ ...DEFAULT_PREFS, ...initialPrefs });
    synced.current = true;
  }, [initialPrefs]);

  const set = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      // Only send editable keys — never send security_alerts as a user preference
      const payload = Object.fromEntries(
        EDITABLE_KEYS.map(k => [k, prefs[k] ?? DEFAULT_PREFS[k] ?? false])
      );
      await api.put('/notification-preferences', payload);
      setSaved(true);
      onSaved?.(payload);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.response?.data?.message || t('notifications.preferences.save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const groups = userType === 'seller' ? getSellerGroups(t) : getBuyerGroups(t);

  return (
    <div className="space-y-6 max-w-lg">

      {/* Heading */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl flex-shrink-0">
          <BellIcon className="h-5 w-5 text-green-700 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            {t('notifications.preferences.title')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {t('notifications.preferences.subtitle')}
          </p>
        </div>
      </div>

      {/* Editable preference groups */}
      {groups.map(group => (
        <div key={group.title}
          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 dark:bg-slate-700/60 border-b border-gray-100 dark:border-slate-700
                          flex items-center gap-2">
            <span>{group.icon}</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{group.title}</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {group.items.map(item => (
              <div key={item.key} className="flex items-center justify-between px-5 py-3.5 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{item.label}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{item.hint}</p>
                </div>
                <Toggle
                  checked={prefs[item.key] ?? DEFAULT_PREFS[item.key] ?? false}
                  onChange={() => set(item.key, !(prefs[item.key] ?? DEFAULT_PREFS[item.key] ?? false))}
                  disabled={saving}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Security alerts — always on, locked */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 dark:bg-slate-700/60 border-b border-gray-100 dark:border-slate-700
                        flex items-center gap-2">
          <span>🔒</span>
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{t('notifications.preferences.groups.account_security')}</span>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('notifications.preferences.items.security_alerts.label')}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {t('notifications.preferences.items.security_alerts.hint')}
            </p>
          </div>
          <Toggle checked={true} locked lockedTitle={t('notifications.preferences.locked_title')} />
        </div>
      </div>

      {/* Footnote */}
      <div className="flex items-start gap-2 px-1">
        <EnvelopeIcon className="h-4 w-4 text-gray-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 dark:text-slate-500">
          {t('notifications.preferences.transactional_note')}
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium
                     rounded-xl disabled:opacity-50 transition-colors">
          {saving ? t('notifications.preferences.saving') : t('notifications.preferences.save')}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
            <CheckCircleIcon className="h-4 w-4" /> {t('notifications.preferences.saved')}
          </span>
        )}
      </div>
    </div>
  );
};

export default NotificationPreferences;
