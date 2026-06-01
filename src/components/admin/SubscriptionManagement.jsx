// src/components/admin/SubscriptionManagement.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMMK  = (n) => Number(n) === 0 ? 'Free' : `${Number(n).toLocaleString()} MMK`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const paymentMethodLabel = (method) => ({
  mmqr: 'MMQR',
  kbz_pay: 'KBZ Pay',
  wave_pay: 'Wave Money',
  cb_pay: 'CB Pay',
  aya_pay: 'AYA Pay',
  bank_transfer: 'Bank Transfer',
}[method] || method?.replace(/_/g, ' ') || '—');

const STATUS_BADGE = {
  active:          'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  expired:         'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  cancelled:       'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  pending_payment: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

const PLAN_BADGE = {
  basic:        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  professional: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  enterprise:   'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

// ── Assign Plan Modal ─────────────────────────────────────────────────────────

const AssignModal = ({ seller, plans, onSave, onCancel, loading }) => {
  const [slug,    setSlug]    = useState(seller.plan?.slug ?? 'basic');
  const [endsAt,  setEndsAt]  = useState(seller.ends_at ?? '');
  const [notes,   setNotes]   = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
          Override Plan for {seller.seller?.store ?? seller.seller?.name ?? `Seller #${seller.user_id}`}
        </h3>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Plan</label>
          <select
            value={slug}
            onChange={e => setSlug(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none text-sm"
          >
            {plans.map(p => (
              <option key={p.id} value={p.slug}>{p.name} — {fmtMMK(p.price_mmk)}/mo</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Expires On <span className="text-gray-400 font-normal">(leave blank for indefinite)</span>
          </label>
          <input
            type="date"
            value={endsAt}
            onChange={e => setEndsAt(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Admin Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Complimentary upgrade for 3 months"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none text-sm resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={() => onSave({ plan_slug: slug, ends_at: endsAt || undefined, notes })} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {loading ? 'Saving…' : 'Apply Plan'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Plan Editor Modal ─────────────────────────────────────────────────────────

const PlanEditorModal = ({ plan, onSave, onCancel, saving }) => {
  const [form, setForm] = useState({
    description:          plan.description          ?? '',
    price_mmk:            plan.price_mmk            ?? 0,
    product_limit:        plan.product_limit         ?? 20,
    commission_rate:      (plan.commission_rate * 100).toFixed(0) ?? 5,
    analytics_enabled:    plan.analytics_enabled    ?? false,
    bulk_import_enabled:  plan.bulk_import_enabled  ?? false,
    priority_support:     plan.priority_support     ?? false,
    custom_storefront:    plan.custom_storefront     ?? false,
    is_active:            plan.is_active             ?? true,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggle = (k) => setForm(f => ({ ...f, [k]: !f[k] }));

  const ToggleRow = ({ label, field }) => (
    <label className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 cursor-pointer">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => toggle(field)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form[field] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form[field] ? 'translate-x-4' : 'translate-x-1'}`} />
      </button>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 my-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
          Edit "{plan.name}" Plan
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Price (MMK/mo)</label>
            <input type="number" min="0" value={form.price_mmk} onChange={e => set('price_mmk', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Product Limit (-1 = ∞)</label>
            <input type="number" min="-1" value={form.product_limit} onChange={e => set('product_limit', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Commission Rate (%)</label>
            <input type="number" min="0" max="100" step="0.5" value={form.commission_rate} onChange={e => set('commission_rate', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Description</label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Feature Flags</p>
          <ToggleRow label="Analytics Dashboard"  field="analytics_enabled" />
          <ToggleRow label="Bulk Import / Export"  field="bulk_import_enabled" />
          <ToggleRow label="Priority Support"      field="priority_support" />
          <ToggleRow label="Custom Storefront"     field="custom_storefront" />
          <ToggleRow label="Plan Active"           field="is_active" />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button disabled={saving}
            onClick={() => onSave({
              ...form,
              price_mmk:       Number(form.price_mmk),
              product_limit:   Number(form.product_limit),
              commission_rate: Number(form.commission_rate) / 100,
            })}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RejectRequestModal = ({ subscription, onSave, onCancel, loading }) => {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
          Reject {subscription.plan?.name} Request
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Seller: {subscription.seller?.store ?? subscription.seller?.email ?? `User #${subscription.user_id}`}
        </p>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why the payment/request is rejected..."
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-red-500 outline-none text-sm resize-none"
        />
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={() => onSave(reason)} disabled={loading || !reason.trim()}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {loading ? 'Rejecting...' : 'Reject Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const SubscriptionManagement = () => {
  const [tab, setTab]               = useState('subscriptions');

  // Subscriptions list state
  const [subs,     setSubs]         = useState([]);
  const [meta,     setMeta]         = useState({ current_page:1, last_page:1, total:0 });
  const [loading,  setLoading]      = useState(true);
  const [search,   setSearch]       = useState('');
  const [status,   setStatus]       = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page,     setPage]         = useState(1);
  const [modal,    setModal]        = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [saving,   setSaving]       = useState(false);
  const [toast,    setToast]        = useState('');

  // Plans list state
  const [plans,    setPlans]        = useState([]);
  const [planModal,setPlanModal]    = useState(null);
  const [planSaving, setPlanSaving] = useState(false);

  const searchTimer = useRef(null);

  // ── Data loaders ───────────────────────────────────────────────────────

  const loadSubs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 20 };
      if (search)     params.search    = search;
      if (status)     params.status    = status;
      if (planFilter) params.plan_slug = planFilter;

      const res = await api.get('/admin/subscriptions', { params });
      setSubs(res.data.data ?? []);
      setMeta(res.data.meta ?? { current_page:1, last_page:1, total:0 });
    } catch { /* errors surfaced via toast */ } finally {
      setLoading(false);
    }
  }, [page, search, status, planFilter]);

  const loadPlans = useCallback(async () => {
    const res = await api.get('/admin/subscriptions/plans');
    setPlans(res.data.data ?? []);
  }, []);

  useEffect(() => { loadSubs(); }, [loadSubs]);
  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => { if (tab === 'plans') loadPlans(); }, [tab]);

  const debouncedSearch = (v) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 350);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleAssign = async (payload) => {
    setSaving(true);
    try {
      await api.put(`/admin/subscriptions/${modal.user_id}`, payload);
      setModal(null);
      showToast('Plan updated successfully.');
      loadSubs();
    } catch (e) {
      showToast(e.response?.data?.message ?? 'Failed to update plan.');
    } finally { setSaving(false); }
  };

  const handleApproveRequest = async (subscription) => {
    setSaving(true);
    try {
      await api.post(`/admin/subscriptions/requests/${subscription.id}/approve`, {
        notes: 'Approved from admin subscription dashboard',
      });
      showToast('Subscription request approved.');
      loadSubs();
    } catch (e) {
      showToast(e.response?.data?.message ?? 'Failed to approve subscription request.');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectRequest = async (reason) => {
    if (!rejectModal) return;
    setSaving(true);
    try {
      await api.post(`/admin/subscriptions/requests/${rejectModal.id}/reject`, { reason });
      setRejectModal(null);
      showToast('Subscription request rejected.');
      loadSubs();
    } catch (e) {
      showToast(e.response?.data?.message ?? 'Failed to reject subscription request.');
    } finally {
      setSaving(false);
    }
  };

  const handlePlanSave = async (payload) => {
    setPlanSaving(true);
    try {
      await api.put(`/admin/subscriptions/plans/${planModal.id}`, payload);
      setPlanModal(null);
      showToast('Plan settings saved.');
      loadPlans();
    } catch (e) {
      showToast(e.response?.data?.message ?? 'Failed to save plan.');
    } finally { setPlanSaving(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Subscription Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage seller plans and billing.</p>
        </div>
        <div className="flex gap-2">
          {['subscriptions','plans'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors
                ${tab===t ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {t === 'subscriptions' ? 'All Subscriptions' : 'Plan Settings'}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 flex-shrink-0" /> {toast}
        </div>
      )}

      {/* ── Subscriptions tab ──────────────────────────────────────────── */}
      {tab === 'subscriptions' && (
        <div className="space-y-4">

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search seller name or email…" onChange={e => debouncedSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending_payment">Pending Payment</option>
            </select>
            <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">All Plans</option>
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button onClick={loadSubs}
              className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-gray-400">
            {meta.total} subscription{meta.total !== 1 ? 's' : ''} found
            {subs.some((s) => s.status === 'pending_payment') && (
              <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                Payment approvals waiting
              </span>
            )}
          </p>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    {['Seller', 'Plan', 'Status', 'Started', 'Expires', 'Paid (MMK)', 'Method', 'Payment Ref', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}><td colSpan={9} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                      </td></tr>
                    ))
                  ) : subs.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No subscriptions found.</td></tr>
                  ) : subs.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{s.seller?.store ?? '—'}</div>
                        <div className="text-xs text-gray-400">{s.seller?.email ?? `User #${s.user_id}`}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_BADGE[s.plan?.slug] ?? PLAN_BADGE.basic}`}>
                          {s.plan?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status] ?? ''}`}>
                          {s.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtDate(s.starts_at)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {s.ends_at ? (
                          <span className={s.days_remaining !== null && s.days_remaining <= 7 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                            {fmtDate(s.ends_at)}
                            {s.days_remaining !== null && s.days_remaining <= 7 && ` (${s.days_remaining}d)`}
                          </span>
                        ) : <span className="text-gray-400">No expiry</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200 font-medium">{fmtMMK(s.amount_paid_mmk)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize whitespace-nowrap">
                        {paymentMethodLabel(s.payment_method)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {s.payment_reference ? (
                          <span className="font-mono text-xs">{s.payment_reference}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {s.status === 'pending_payment' && (
                            <>
                              <button onClick={() => handleApproveRequest(s)} disabled={saving}
                                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium transition-colors">
                                <ShieldCheckIcon className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button onClick={() => setRejectModal(s)} disabled={saving}
                                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 font-medium transition-colors">
                                <XCircleIcon className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                          <button onClick={() => setModal(s)}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium transition-colors">
                            <PencilSquareIcon className="w-3.5 h-3.5" /> Override
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1 || loading}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 text-sm text-gray-700 dark:text-gray-300">
                <ChevronLeftIcon className="w-4 h-4" /> Prev
              </button>
              <span className="text-sm text-gray-500">Page {meta.current_page} of {meta.last_page}</span>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p+1))} disabled={page === meta.last_page || loading}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 text-sm text-gray-700 dark:text-gray-300">
                Next <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Plan Settings tab ──────────────────────────────────────────── */}
      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 dark:text-gray-100">{plan.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${plan.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-600'}`}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
              <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex justify-between"><span>Price</span><strong>{fmtMMK(plan.price_mmk)}/mo</strong></div>
                <div className="flex justify-between"><span>Products</span><strong>{plan.product_limit === -1 ? 'Unlimited' : plan.product_limit}</strong></div>
                <div className="flex justify-between"><span>Commission</span><strong>{(plan.commission_rate * 100).toFixed(0)}%</strong></div>
                <div className="flex justify-between"><span>Analytics</span><strong>{plan.analytics_enabled ? '✓' : '✗'}</strong></div>
                <div className="flex justify-between"><span>Bulk Import</span><strong>{plan.bulk_import_enabled ? '✓' : '✗'}</strong></div>
                <div className="flex justify-between"><span>Priority Support</span><strong>{plan.priority_support ? '✓' : '✗'}</strong></div>
                <div className="flex justify-between"><span>Custom Storefront</span><strong>{plan.custom_storefront ? '✓' : '✗'}</strong></div>
              </div>
              <button onClick={() => setPlanModal(plan)}
                className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors">
                <Cog6ToothIcon className="w-4 h-4" /> Edit Plan
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modal     && <AssignModal     seller={modal}    plans={plans.length ? plans : []} onSave={handleAssign}   onCancel={() => setModal(null)}      loading={saving} />}
      {rejectModal && <RejectRequestModal subscription={rejectModal} onSave={handleRejectRequest} onCancel={() => setRejectModal(null)} loading={saving} />}
      {planModal && <PlanEditorModal plan={planModal}                                    onSave={handlePlanSave} onCancel={() => setPlanModal(null)}   saving={planSaving} />}
    </div>
  );
};

export default SubscriptionManagement;
