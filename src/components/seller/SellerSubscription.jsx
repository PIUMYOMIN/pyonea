// src/components/seller/SellerSubscription.jsx
import React, { useState, useEffect, useCallback } from 'react';
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
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { useSubscription } from '../../context/SubscriptionContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMMK = (n) =>
  Number(n) === 0 ? 'Free' : `${Number(n).toLocaleString()} MMK`;

const PLAN_COLORS = {
  basic: { ring: 'ring-gray-300 dark:ring-gray-600', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', btn: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100', accent: 'text-gray-600 dark:text-gray-400' },
  professional: { ring: 'ring-green-500', badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', btn: 'bg-green-600 hover:bg-green-700 text-white', accent: 'text-green-600 dark:text-green-400' },
  enterprise: { ring: 'ring-purple-500', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', btn: 'bg-purple-600 hover:bg-purple-700 text-white', accent: 'text-purple-600 dark:text-purple-400' },
};

const PLAN_ICONS = { basic: '🏪', professional: '🚀', enterprise: '🏢' };

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
          {limit === -1 ? `${used} / Unlimited` : `${used} / ${limit}`}
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
const UpgradeModal = ({ plan, onConfirm, onCancel, loading }) => {
  const [ref, setRef] = useState('');
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{PLAN_ICONS[plan.slug] ?? '⭐'}</span>
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{t('subscription.upgrade_to', { name: plan.name })}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{fmtMMK(plan.price_mmk)} {t('subscription.per_month')}</p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-300 flex gap-2">
          <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span><strong>{fmtMMK(plan.price_mmk)}</strong> {t('subscription.payment_instruction')}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('subscription.payment_ref_label')}<span className="text-red-500"> *</span>
          </label>
          <input
            type="text"
            value={ref}
            onChange={e => setRef(e.target.value)}
            placeholder={t('subscription.ref_placeholder', 'e.g. TXN-20260517-001234')}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('subscription.ref_hint')}</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            {t('subscription.cancel')}
          </button>
          <button
            onClick={() => onConfirm(ref)}
            disabled={loading || !ref.trim()}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {loading ? t('subscription.alerts.processing') : t('subscription.confirm_upgrade')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const SellerSubscription = () => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(null);   // current subscription object
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState(null);   // plan object being confirmed

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
    } catch (e) {
      setError(e.response?.data?.message ?? t('subscription.load_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  // ── Upgrade handler ───────────────────────────────────────────────────

  const handleUpgrade = async (plan, paymentRef = '') => {
    setUpgrading(true);
    setError('');
    setSuccess('');
    try {
      const payload = { plan_slug: plan.slug };
      if (plan.price_mmk > 0) payload.payment_reference = paymentRef;

      const res = await api.post('/seller/subscription/upgrade', payload);
      if (res.data.success) {
        setSuccess(
          plan.price_mmk === 0
            ? t('subscription.upgrade_msg', { action: 'downgraded', name: plan.name })
            : (res.data.message || t('subscription.request_submitted', { name: plan.name, defaultValue: `${plan.name} request submitted for admin approval.` }))
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
            <p className="font-semibold">Upgrade pending admin approval</p>
            <p className="mt-0.5">
              {pendingRequest.plan?.name} is waiting for payment confirmation.
              {pendingRequest.payment_reference ? ` Reference: ${pendingRequest.payment_reference}` : ''}
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
                  {current?.plan?.name ?? t('subscription.plan_names.basic')} Plan
                </h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                  {current?.status_label ?? t('subscription.status.active', 'Active')}
                </span>
              </div>
              <p className={`text-sm font-medium ${colors.accent}`}>
                {fmtMMK(current?.plan?.price_mmk ?? 0)}{current?.plan?.price_mmk > 0 ? '/month' : ' — no charge'}
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
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('subscription.free_plan_no_expiry', 'Free plan — no expiry date.')}</p>
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

            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl border-2 shadow-sm
                  ${isCurrent ? c.ring : 'border-gray-200 dark:border-gray-700'}
                  flex flex-col p-5 space-y-4 transition-all duration-200 ${!isCurrent ? 'hover:shadow-md hover:-translate-y-0.5' : ''}`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm ${c.badge}`}>
                      {t('subscription.current_plan', 'Current Plan')}
                    </span>
                  </div>
                )}
                {isPending && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full shadow-sm bg-amber-500 text-white">
                      Pending Approval
                    </span>
                  </div>
                )}

                {plan.slug === 'professional' && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full shadow-sm bg-green-500 text-white">
                      {t('subscription.most_popular', 'Most Popular')}
                    </span>
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
                    {fmtMMK(plan.price_mmk)}
                    {isPaid && <span className="text-sm font-normal text-gray-400">/mo</span>}
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
                    'Waiting for Approval'
                  ) : plan.price_mmk < (current?.plan?.price_mmk ?? 0) ? (
                      t('subscription.downgrade', 'Downgrade')
                  ) : (
                    <>
                      <ArrowUpCircleIcon className="w-4 h-4" />
                          {upgrading ? t('subscription.alerts.processing', 'Processing…') : t('subscription.upgrade_label', `Upgrade to ${plan.name}`)}
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
          onConfirm={(ref) => handleUpgrade(modal, ref)}
          onCancel={() => setModal(null)}
          loading={upgrading}
        />
      )}
    </div>
  );
};

export default SellerSubscription;
