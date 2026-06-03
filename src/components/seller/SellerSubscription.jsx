// src/components/seller/SellerSubscription.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpCircleIcon,
  SparklesIcon,
  CubeIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BoltIcon,
  StarIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  QrCodeIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../utils/api';
import { useSubscription } from '../../context/SubscriptionContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMMK = (n, t, language = 'en') =>
  Number(n) === 0
    ? t('subscription.free')
    : `${Number(n).toLocaleString(language === 'my' ? 'my-MM' : 'en-MM')} ${t('common.currency.mmk', 'MMK')}`;

const PLAN_COLORS = {
  basic: { ring: 'ring-gray-300 dark:ring-gray-600', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', btn: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100', accent: 'text-gray-600 dark:text-gray-400' },
  professional: { ring: 'ring-green-500', badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', btn: 'bg-green-600 hover:bg-green-700 text-white', accent: 'text-green-600 dark:text-green-400' },
  enterprise: { ring: 'ring-purple-500', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', btn: 'bg-purple-600 hover:bg-purple-700 text-white', accent: 'text-purple-600 dark:text-purple-400' },
};

const PLAN_ICONS = { basic: '🏪', professional: '🚀', enterprise: '🏢' };

const DEFAULT_SUBSCRIPTION_PAYMENT_METHODS = [];
const ONLINE_SUBSCRIPTION_PAYMENT_METHODS = ['mmqr', 'kbz_pay', 'wave_pay'];

const paymentMethodLabel = (method, t) => {
  const fallback = {
    mmqr: 'MMQR',
    kbz_pay: 'KBZ Pay',
    wave_pay: 'Wave Money',
    cb_pay: 'CB Pay',
    aya_pay: 'AYA Pay',
    bank_transfer: 'Bank Transfer',
  };

  return t(`subscription.payment_methods.${method}`, fallback[method] || method?.replace(/_/g, ' ') || '');
};

const featureRow = (label, value, ok = true) => (
  <div className="flex items-center gap-2 text-sm">
    {ok
      ? <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
      : <XCircleIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />}
    <span className={ok ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}>{label}</span>
    {value && <span className="ml-auto font-semibold text-gray-900 dark:text-gray-100">{value}</span>}
  </div>
);

// ── Sub-components ────────────────────────────────────────────────────────────

const UsageBar = ({ used, limit, label, t }) => {
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const danger = pct >= 90;
  const warn = pct >= 70 && !danger;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
        <span>{label}</span>
        <span className={danger ? 'text-red-500' : warn ? 'text-yellow-500' : ''}>
          {limit === -1 ? t('subscription.usage_unlimited', { used }) : `${used} / ${limit}`}
        </span>
      </div>
      {limit !== -1 && (
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${danger ? 'bg-red-500' : warn ? 'bg-yellow-400' : 'bg-green-500'
              }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {danger && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <ExclamationTriangleIcon className="w-3 h-3" />
          {t('subscription.usage_warning')}
        </p>
      )}
    </div>
  );
};

// Payment reference modal for paid plan upgrades
const UpgradeModal = ({ plan, paymentMethods, onConfirm, onCancel, loading }) => {
  const [method, setMethod] = useState(paymentMethods[0] || '');
  const [session, setSession] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [paymentDetected, setPaymentDetected] = useState(false);
  const autoSubmittedRef = useRef(false);
  const { t, i18n } = useTranslation();

  const generatePayment = async () => {
    setGenerating(true);
    setSessionError('');
    setSession(null);
    try {
      const res = await api.post('/seller/subscription/payment-session', {
        plan_slug: plan.slug,
        payment_method: method,
      });

      if (res.data?.success) {
        setSession(res.data);
      } else {
        setSessionError(res.data?.message || t('subscription.payment_session_failed', 'Could not generate payment. Please try again.'));
      }
    } catch (e) {
      setSessionError(e.response?.data?.message || t('subscription.payment_session_failed', 'Could not generate payment. Please try again.'));
    } finally {
      setGenerating(false);
    }
  };

  const resetPayment = (nextMethod) => {
    setMethod(nextMethod);
    setSession(null);
    setSessionError('');
    setPaymentDetected(false);
    autoSubmittedRef.current = false;
  };

  useEffect(() => {
    if (!session?.reference || !method || autoSubmittedRef.current) return undefined;

    let cancelled = false;
    const pollPayment = async () => {
      try {
        const res = await api.post('/seller/subscription/payment-session/verify', {
          payment_method: method,
          payment_reference: session.reference,
        });

        if (!cancelled && res.data?.paid) {
          autoSubmittedRef.current = true;
          setPaymentDetected(true);
          await onConfirm(session.reference, method);
        }
      } catch {
        // Keep the modal quiet while waiting; the seller can still submit manually.
      }
    };

    const timer = setInterval(pollPayment, 5000);
    pollPayment();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [method, onConfirm, session?.reference]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{PLAN_ICONS[plan.slug] ?? '⭐'}</span>
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{t('subscription.upgrade_to', { name: plan.name })}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{fmtMMK(plan.price_mmk, t, i18n.language)} {t('subscription.per_month')}</p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-300 flex gap-2">
          <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span><strong>{fmtMMK(plan.price_mmk, t, i18n.language)}</strong> {t('subscription.payment_instruction')}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('subscription.payment_method_label')}<span className="text-red-500"> *</span>
          </label>
          <select
            value={method}
            onChange={e => resetPayment(e.target.value)}
            disabled={paymentMethods.length === 0 || generating || loading}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
          >
            {paymentMethods.length === 0 ? (
              <option value="">{t('subscription.no_payment_methods')}</option>
            ) : (
              paymentMethods.map(item => (
                <option key={item} value={item}>{paymentMethodLabel(item, t)}</option>
              ))
            )}
          </select>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('subscription.payment_method_hint')}</p>
        </div>

        {sessionError && (
          <div className="rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
            {sessionError}
          </div>
        )}

        {session && (
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase font-semibold tracking-wide text-green-700 dark:text-green-300">
                  {t('subscription.amount_to_pay', 'Amount to pay')}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {fmtMMK(session.amount ?? plan.price_mmk, t, i18n.language)}
                </p>
              </div>
              <span className="rounded-full bg-white dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-300">
                {paymentMethodLabel(method, t)}
              </span>
            </div>

            {(session.qr_image_url || session.qr_string) && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-48 h-48 rounded-2xl border-4 border-white dark:border-gray-700 shadow-sm bg-white p-2 flex items-center justify-center">
                  {session.qr_image_url ? (
                    <img
                      src={session.qr_image_url}
                      alt={t('subscription.payment_qr_alt', 'Subscription payment QR code')}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <QRCodeSVG
                      value={session.qr_string}
                      size={176}
                      level="M"
                      includeMargin={false}
                    />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {t('subscription.scan_qr_instruction', 'Scan this QR code with your payment app, enter your PIN there, then return here.')}
                </p>
              </div>
            )}

            {session.deep_link && (
              <a
                href={session.deep_link}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
              >
                <DevicePhoneMobileIcon className="w-5 h-5" />
                {t('subscription.open_payment_app', 'Open Payment App')}
              </a>
            )}

            {session.qr_string && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('subscription.qr_data_label', 'QR data')}</p>
                <div className="flex gap-2">
                  <code className="flex-1 truncate rounded-lg border border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                    {session.qr_string}
                  </code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(session.qr_string)}
                    className="rounded-lg border border-green-200 dark:border-green-800 px-3 py-2 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
                  >
                    {t('subscription.copy', 'Copy')}
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-white/80 dark:bg-gray-800/80 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-800 dark:text-gray-200">{t('subscription.reference_label')}:</span>{' '}
              <span className="font-mono">{session.reference}</span>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-green-700 dark:text-green-300">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              {paymentDetected
                ? t('subscription.payment_detected', 'Payment detected. Submitting request...')
                : t('subscription.waiting_payment_confirmation', 'Waiting for payment confirmation...')}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading || generating}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            {t('subscription.cancel')}
          </button>
          {session ? (
            <button
              onClick={() => onConfirm(session.reference, method)}
              disabled={loading || paymentDetected || !session.reference || !method}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {loading || paymentDetected ? t('subscription.alerts.processing') : t('subscription.submit_after_payment', 'I have paid')}
            </button>
          ) : (
            <button
              onClick={generatePayment}
              disabled={generating || loading || !method}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2"
            >
              {method === 'mmqr' ? <QrCodeIcon className="w-4 h-4" /> : <DevicePhoneMobileIcon className="w-4 h-4" />}
              {generating ? t('subscription.generating_payment', 'Generating...') : t('subscription.pay_now', 'Pay Now')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const SellerSubscription = () => {
  const { t, i18n } = useTranslation();
  const [current, setCurrent] = useState(null);   // current subscription object
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState(null);   // plan object being confirmed
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_SUBSCRIPTION_PAYMENT_METHODS);

  // ── Data fetch ────────────────────────────────────────────────────────
  const { refetch: refetchSubscription } = useSubscription();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [subRes, plansRes] = await Promise.all([
        api.get('/seller/subscription'),
        api.get('/seller/subscription/plans'),
      ]);
      setCurrent(subRes.data.data);
      setPlans(plansRes.data.data ?? []);
      api.get('/payment-methods')
        .then(res => {
          setPaymentMethods((res.data.data ?? []).filter(method => ONLINE_SUBSCRIPTION_PAYMENT_METHODS.includes(method)));
        })
        .catch(() => setPaymentMethods([]));
    } catch (e) {
      setError(e.response?.data?.message ?? t('subscription.load_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  // ── Upgrade handler ───────────────────────────────────────────────────

  const handleUpgrade = async (plan, paymentRef = '', paymentMethod = '') => {
    setUpgrading(true);
    setError('');
    setSuccess('');
    try {
      const payload = { plan_slug: plan.slug };
      if (plan.price_mmk > 0) {
        payload.payment_reference = paymentRef;
        payload.payment_method = paymentMethod;
      }

      const res = await api.post('/seller/subscription/upgrade', payload);
      if (res.data.success) {
        setSuccess(
          plan.price_mmk === 0
            ? t('subscription.downgrade_success', { name: plan.name })
            : (res.data.message || t('subscription.request_submitted', { name: plan.name }))
        );
        setModal(null);
        await load();
        await refetchSubscription();
      } else {
        setError(res.data.message ?? t('subscription.upgrade_failed'));
      }
    } catch (e) {
      setError(e.response?.data?.message ?? t('subscription.upgrade_failed_retry'));
    } finally {
      setUpgrading(false);
    }
  };

  const openUpgrade = (plan) => {
    if (plan.price_mmk === 0) {
      // Free downgrade — no modal needed
      handleUpgrade(plan);
    } else {
      setModal(plan);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const currentPlanSlug = current?.plan?.slug ?? 'basic';
  const pendingRequest = current?.pending_request || null;
  const colors = PLAN_COLORS[currentPlanSlug] ?? PLAN_COLORS.basic;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 text-sm">
          <CheckBadgeIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {success}
        </div>
      )}
      {pendingRequest && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-sm">
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{t('subscription.pending_title')}</p>
            <p className="mt-0.5">
              {t('subscription.pending_body', { name: pendingRequest.plan?.name })}
              {pendingRequest.payment_method ? ` ${t('subscription.payment_method_label')}: ${paymentMethodLabel(pendingRequest.payment_method, t)}.` : ''}
              {pendingRequest.payment_reference ? ` ${t('subscription.reference_label')}: ${pendingRequest.payment_reference}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* ── Current plan card ───────────────────────────────────────────── */}
      <div className={`bg-white dark:bg-gray-800 rounded-2xl border-2 shadow-sm ${colors.ring} p-6 space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{PLAN_ICONS[currentPlanSlug] ?? '🏪'}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {t('subscription.plan_heading', { name: current?.plan?.name ?? t('subscription.plan_names.basic') })}
                </h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                  {current?.status_label ?? t('subscription.status.active', 'Active')}
                </span>
              </div>
              <p className={`text-sm font-medium ${colors.accent}`}>
                {fmtMMK(current?.plan?.price_mmk ?? 0, t, i18n.language)}
                {current?.plan?.price_mmk > 0 ? ` ${t('subscription.per_month')}` : ` ${t('subscription.no_charge')}`}
              </p>
            </div>
          </div>

          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Billing dates */}
        {current?.ends_at && (
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <CalendarDaysIcon className="w-4 h-4" />
              {t('subscription.renews')} <span className="font-medium text-gray-700 dark:text-gray-200">{current.next_billing_at ?? current.ends_at}</span>
            </div>
            {current.days_remaining !== null && (
              <div className={`flex items-center gap-1.5 ${current.days_remaining <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                <BoltIcon className="w-4 h-4" />
                {t('subscription.days_remaining', { count: current.days_remaining })}
              </div>
            )}
          </div>
        )}
        {!current?.ends_at && (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('subscription.free_plan_no_expiry')}</p>
        )}

        {/* Product usage */}
        {current && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <UsageBar
              used={current.products_used ?? 0}
              limit={current.plan?.product_limit ?? 20}
              label={t('subscription.products_used', 'Products used')}
              t={t}
            />
          </div>
        )}

        {/* Current plan features summary */}
        {current?.plan && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            {featureRow(t('subscription.commission_rate', 'Commission rate'), current.plan.commission_percent)}
            {featureRow(t('subscription.product_limit', 'Product limit'), current.plan.product_limit_label)}
            {featureRow(t('subscription.analytics', 'Analytics'), null, current.plan.analytics_enabled)}
            {featureRow(t('subscription.bulk_import', 'Bulk import'), null, current.plan.bulk_import_enabled)}
            {featureRow(t('subscription.priority_support', 'Priority support'), null, current.plan.priority_support)}
            {featureRow(t('subscription.custom_storefront', 'Custom storefront'), null, current.plan.custom_storefront)}
          </div>
        )}
      </div>

      {/* ── Plan comparison grid ────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-green-500" />
          {t('subscription.available_plans', 'Available Plans')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.is_current;
            const isPending = plan.is_pending || pendingRequest?.plan?.slug === plan.slug;
            const c = PLAN_COLORS[plan.slug] ?? PLAN_COLORS.basic;
            const isPaid = plan.price_mmk > 0;
            const showPopular = plan.slug === 'professional' && !isCurrent;

            return (
              <div
                key={plan.id}
                className={`relative z-0 overflow-visible bg-white dark:bg-gray-800 rounded-2xl border-2 shadow-sm
                  ${isCurrent ? c.ring : 'border-gray-200 dark:border-gray-700'}
                  flex flex-col p-5 space-y-4 transition-all duration-200 ${!isCurrent ? 'hover:z-10 hover:shadow-md hover:-translate-y-0.5' : ''}`}
              >
                {(isCurrent || (isPending && !isCurrent) || showPopular) && (
                  <div className="absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-1.5 whitespace-nowrap">
                    {isCurrent && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm ${c.badge}`}>
                        {t('subscription.current_plan', 'Current Plan')}
                      </span>
                    )}
                    {isPending && !isCurrent && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full shadow-sm bg-amber-500 text-white">
                        {t('subscription.pending_badge')}
                      </span>
                    )}
                    {showPopular && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full shadow-sm bg-green-500 text-white">
                        {t('subscription.most_popular', 'Most Popular')}
                      </span>
                    )}
                  </div>
                )}

                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{PLAN_ICONS[plan.slug] ?? '⭐'}</span>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.name}</h4>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>
                  <p className={`text-2xl font-extrabold mt-2 ${c.accent}`}>
                    {fmtMMK(plan.price_mmk, t, i18n.language)}
                    {isPaid && <span className="text-sm font-normal text-gray-400"> {t('subscription.per_month_short')}</span>}
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-2.5 flex-1">
                  {featureRow(`${plan.product_limit_label} ${t('subscription.plan_names.products', 'products')}`, null, true)}
                  {featureRow(`${plan.commission_percent} ${t('subscription.plan_names.commission', 'commission')}`, null, true)}
                  {featureRow(t('subscription.analytics', 'Analytics'), null, plan.analytics_enabled)}
                  {featureRow(t('subscription.bulk_import', 'Bulk import'), null, plan.bulk_import_enabled)}
                  {featureRow(t('subscription.priority_support', 'Priority support'), null, plan.priority_support)}
                  {featureRow(t('subscription.custom_storefront', 'Custom storefront'), null, plan.custom_storefront)}
                </div>

                {/* CTA */}
                <button
                  onClick={() => !isCurrent && openUpgrade(plan)}
                  disabled={isCurrent || isPending || upgrading}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${isCurrent
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
                      : `${c.btn} flex items-center justify-center gap-1.5 cursor-pointer`
                    }`}
                >
                  {isCurrent ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4" /> {t('subscription.your_current_plan', 'Your Current Plan')}
                    </>
                  ) : isPending ? (
                    t('subscription.waiting_approval')
                  ) : plan.price_mmk < (current?.plan?.price_mmk ?? 0) ? (
                      t('subscription.downgrade', 'Downgrade')
                  ) : (
                    <>
                      <ArrowUpCircleIcon className="w-4 h-4" />
                          {upgrading ? t('subscription.alerts.processing', 'Processing...') : t('subscription.upgrade_label', { name: plan.name })}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FAQ / notes ─────────────────────────────────────────────────── */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 space-y-3 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <InformationCircleIcon className="w-4 h-4 text-blue-500" />
          {t('subscription.how_billing_works', 'How billing works')}
        </h4>
        <ul className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
          <li>• {t('subscription.faq_billed_monthly')}</li>
          <li>• {t('subscription.faq_upgrades_immediate')}</li>
          <li>• {t('subscription.faq_downgrades_immediate')}</li>
          <li>• {t('subscription.faq_accepted_payment')}</li>
          <li>• {t('subscription.faq_contact_support_text', 'Contact support at')} <a href="mailto:billing@pyonea.com" className="underline text-green-600 dark:text-green-400">{t('subscription.billing_email', 'billing@pyonea.com')}</a> {t('subscription.for_invoice_receipt', 'for invoice or receipt.')}</li>
        </ul>
      </div>

      {/* Upgrade modal */}
      {modal && (
        <UpgradeModal
          plan={modal}
          paymentMethods={paymentMethods}
          onConfirm={(ref, method) => handleUpgrade(modal, ref, method)}
          onCancel={() => setModal(null)}
          loading={upgrading}
        />
      )}
    </div>
  );
};

export default SellerSubscription;
