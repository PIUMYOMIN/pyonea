// src/pages/OrderTracking.jsx
import React, { useState, useEffect, useRef } from "react";
import useSEO from "../hooks/useSEO";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../utils/api";
import { getImageUrl } from "../utils/imageHelpers";
import { useTheme } from '../context/ThemeContext';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

// ─── Status helpers ───────────────────────────────────────────────────────────
const ORDER_STEPS = [
  { key: "pending",    labelKey: "buyer_dashboard.order_status.pending",    icon: "🛍️" },
  { key: "confirmed",  labelKey: "buyer_dashboard.order_status.confirmed",        icon: "✅" },
  { key: "processing", labelKey: "buyer_dashboard.order_status.processing",       icon: "⚙️" },
  { key: "shipped",    labelKey: "buyer_dashboard.order_status.shipped",          icon: "🚚" },
  { key: "delivered",  labelKey: "buyer_dashboard.order_status.delivered",        icon: "📦" },
];

const DELIVERY_STEPS = [
  { key: "pending",          labelKey: "order_tracking.delivery_pending",          icon: "⏳" },
  { key: "awaiting_pickup",  labelKey: "order_tracking.delivery_awaiting_pickup",  icon: "📍" },
  { key: "picked_up",        labelKey: "order_tracking.delivery_picked_up",        icon: "✋" },
  { key: "in_transit",       labelKey: "order_tracking.delivery_in_transit",       icon: "🚛" },
  { key: "out_for_delivery", labelKey: "order_tracking.out_for_delivery",          icon: "🏃" },
  { key: "delivered",        labelKey: "order_tracking.delivery_delivered",        icon: "🎉" },
];

const STATUS_COLORS = {
  pending:          "bg-amber-100 text-amber-700 border-amber-200",
  confirmed:        "bg-blue-100 text-blue-700 border-blue-200",
  processing:       "bg-purple-100 text-purple-700 border-purple-200",
  shipped:          "bg-cyan-100 text-cyan-700 border-cyan-200",
  delivered:        "bg-green-100 text-green-700 border-green-200",
  cancelled:        "bg-red-100 text-red-700 border-red-200",
  refunded:         "bg-gray-100 text-gray-600 border-gray-200",
  awaiting_pickup:  "bg-orange-100 text-orange-700 border-orange-200",
  picked_up:        "bg-indigo-100 text-indigo-700 border-indigo-200",
  in_transit:       "bg-cyan-100 text-cyan-700 border-cyan-200",
  out_for_delivery: "bg-blue-100 text-blue-700 border-blue-200",
  failed:           "bg-red-100 text-red-700 border-red-200",
  paid:             "bg-green-100 text-green-700 border-green-200",
  unpaid:           "bg-red-100 text-red-700 border-red-200",
};

const fmt = (n) =>
  new Intl.NumberFormat("my-MM", {
    style: "currency", currency: "MMK", minimumFractionDigits: 0,
  }).format(n || 0);


const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtDateShort = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const statusLabel = (s) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

// ─── Step Progress Bar (fixed: removed useSEO) ────────────────────────────────
const FALLBACK_STATUS_LABELS = {
  paid: "Paid",
  unpaid: "Unpaid",
  refunded: "Refunded",
  failed: "Failed",
};

const translatedStatusLabel = (t, status, type = "order") => {
  if (!status) return "—";

  const keyMap = {
    order: `buyer_dashboard.order_status.${status}`,
    delivery: `buyer_dashboard.delivery_status.${status}`,
    payment_method: `buyer_dashboard.payment_methods.${status}`,
    payment_status: `order_tracking.payment_status.${status}`,
  };

  const fallback =
    FALLBACK_STATUS_LABELS[status] ||
    statusLabel(status);

  return t(keyMap[type], fallback);
};

const StepBar = ({ steps, current, t }) => {
  const cancelled = current === "cancelled" || current === "refunded" || current === "failed";
  const activeIdx = cancelled ? -1 : steps.findIndex((s) => s.key === current);

  return (
    <div className="w-full">
      {/* Mobile */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
            {activeIdx >= 0 ? t(steps[activeIdx].labelKey, steps[activeIdx].key) : t("order_tracking.status_unavailable", "Status unavailable")}
          </span>
          <span className="text-xs font-bold text-green-700 dark:text-green-400">
            {activeIdx >= 0 ? t("order_tracking.step_count", "Step {{current}} of {{total}}", { current: activeIdx + 1, total: steps.length }) : t("order_tracking.not_active", "Not active")}
          </span>
        </div>
        <div className="flex gap-1.5">
          {steps.map((step, index) => {
            const done = !cancelled && activeIdx >= 0 && index < activeIdx;
            const active = !cancelled && index === activeIdx;

            return (
              <div
                key={step.key}
                className={`flex-1 h-2 rounded-full transition-all ${
                  active ? "bg-green-500" : done ? "bg-green-400" : "bg-gray-200 dark:bg-slate-600"
                }`}
                aria-label={t(step.labelKey, step.key)}
              />
            );
          })}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex items-start">
        {steps.map((step, index) => {
          const done = !cancelled && activeIdx >= 0 && index < activeIdx;
          const active = !cancelled && index === activeIdx;
          const last = index === steps.length - 1;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-all ${
                  active
                    ? "border-green-500 bg-green-500 text-white shadow shadow-green-200 dark:shadow-green-900/30"
                    : done
                      ? "border-green-400 bg-green-400 text-white"
                      : "border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-800"
                }`}>
                  {done ? <CheckCircleIcon className="h-5 w-5" /> : index + 1}
                </div>
                <span className={`mt-1.5 text-[11px] font-medium text-center leading-tight w-20 break-words ${
                  active
                    ? "text-green-700 dark:text-green-400"
                    : done
                      ? "text-gray-600 dark:text-slate-400"
                      : "text-gray-400 dark:text-slate-500"
                }`}>
                  {t(step.labelKey, step.key)}
                </span>
              </div>
              {!last && (
                <div className="flex-1 mt-4 mx-2">
                  <div className={`h-0.5 rounded-full transition-colors ${
                    done ? "bg-green-400" : "bg-gray-200 dark:bg-slate-700"
                  }`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
// ─── Main Component ───────────────────────────────────────────────────────────
const OrderTracking = () => {
  const { t } = useTranslation();
  useTheme(); // Ensure theme context is loaded for dark mode support
  // ✅ Hook moved to top level of component
  const SeoComponent = useSEO({
    title: "Order Tracking | Pyonea",
    description: "Track your order status and delivery updates on Pyonea.",
    url: "/order-tracking",
    noindex: true,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput]     = useState(searchParams.get("order") || "");
  const [email, setEmail]     = useState("");
  const [order, setOrder]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const resultRef = useRef(null);

  // Auto-search if ?order= in URL
  useEffect(() => {
    const num = searchParams.get("order");
    if (num) {
      setInput(num);
      doSearch(num);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (num = input) => {
    const trimmed = (num || "").trim().toUpperCase();
    if (!trimmed) {
      setError(t("order_tracking.enter_required"));
      return;
    }
    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const params = email.trim() ? { email: email.trim() } : {};
      const res = await api.get(`/track/${trimmed}`, { params });
      if (res.data.success) {
        setOrder(res.data.data);
        setSearchParams({ order: trimmed }, { replace: true });
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      } else {
        setError(res.data.message || t("order_tracking.not_found"));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        t("order_tracking.not_found_sub")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch();
  };

  return (
    <>
      {SeoComponent}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">

        {/* ── Hero banner ── */}
        <div className="relative bg-gradient-to-r from-green-700 to-emerald-600 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-white" />
            <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-white" />
          </div>
          <div className="relative max-w-3xl mx-auto px-4 pt-14 pb-20 text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
              <span className="text-white/90 text-xs font-medium tracking-wide uppercase">{t("order_tracking.realtime_label")}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              {t("order_tracking.title")}
            </h1>
            <p className="text-green-100 text-base sm:text-lg max-w-xl mx-auto">
              {t("order_tracking.hero_desc")}
            </p>
          </div>
        </div>

        {/* ── Search card ── */}
        <div className="max-w-2xl mx-auto px-4 -mt-8 relative z-10">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t("order_tracking.order_number_label")} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    placeholder={t("order_tracking.order_number_placeholder")}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:outline-none focus:border-green-500 transition-colors placeholder:font-sans placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-xl text-sm font-semibold
                      hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed
                      transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t("order_tracking.searching")}
                      </>
                    ) : (
                      <>🔍 {t("order_tracking.track")}</>
                    )}
                  </button>
                </div>
              </div>

              {/* Optional email verification */}
              <details className="group">
                <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-green-600 dark:hover:text-green-400 transition-colors list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                  {t("order_tracking.email_verification")}
                </summary>
                <div className="mt-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("order_tracking.email_placeholder")}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:outline-none focus:border-green-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </details>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">⚠️</span>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </form>

            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1.5"><span>📧</span> {t("order_tracking.tip_email")}</span>
              <span className="flex items-center gap-1.5"><span>🔒</span> {t("order_tracking.tip_privacy")}</span>
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        {order && (
          <div ref={resultRef} className="max-w-3xl mx-auto px-4 py-10 space-y-6">

            {/* Order header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">{t("order_tracking.order_number")}</p>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white font-mono">{order.order_number}</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("order_tracking.placed_on")} {fmtDate(order.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {translatedStatusLabel(t, order.status, "order")}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[order.payment_status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {translatedStatusLabel(t, order.payment_status, "payment_status")}
                  </span>
                </div>
              </div>

              {/* Estimated delivery */}
              {order.estimated_delivery && order.status !== "delivered" && order.status !== "cancelled" && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-xl">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">{t("order_tracking.estimated_delivery")}</p>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">{fmtDateShort(order.estimated_delivery)}</p>
                  </div>
                </div>
              )}
              {order.delivered_at && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-xl">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">{t("order_tracking.delivered_on")}</p>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">{fmtDate(order.delivered_at)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Order status stepper */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-green-500 rounded-full block" />
                {t("order_tracking.order_progress")}
              </h3>
              {order.status === "cancelled" || order.status === "refunded" ? (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl">
                  <span className="text-2xl">❌</span>
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-300">{translatedStatusLabel(t, order.status, "order")}</p>
                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{t("order_tracking.order_cancelled_msg", { status: translatedStatusLabel(t, order.status, "order") })}</p>
                  </div>
                </div>
              ) : (
                <StepBar steps={ORDER_STEPS} current={order.status} t={t} />
              )}
            </div>

            {/* Delivery tracking */}
            {order.delivery && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-blue-500 rounded-full block" />
                    {t("order_tracking.delivery_tracking")}
                  </h3>
                  {order.delivery.tracking_number && (
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-600">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{t("order_tracking.tracking_number")}</span>
                      <span className="text-xs font-mono font-bold text-gray-800 dark:text-white">{order.delivery.tracking_number}</span>
                    </div>
                  )}
                </div>

                {/* Delivery stepper */}
                {order.delivery.status !== "cancelled" && order.delivery.status !== "failed" ? (
                  <StepBar steps={DELIVERY_STEPS} current={order.delivery.status} t={t} />
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl">
                    <span className="text-2xl">❌</span>
                    <div>
                      <p className="font-semibold text-red-700 dark:text-red-300">{translatedStatusLabel(t, order.delivery.status, "delivery")}</p>
                      {order.delivery.failure_reason && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{order.delivery.failure_reason}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Delivery meta */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {order.delivery.carrier_name && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">{t("order_tracking.carrier")}</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{order.delivery.carrier_name}</p>
                    </div>
                  )}
                  {order.delivery.method && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">{t("order_tracking.method")}</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white capitalize">{order.delivery.method}</p>
                    </div>
                  )}
                  {order.delivery.estimated_delivery_date && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">{t("order_tracking.est_delivery")}</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{fmtDateShort(order.delivery.estimated_delivery_date)}</p>
                    </div>
                  )}
                </div>

                {/* Update timeline */}
                {order.delivery.updates?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">{t("order_tracking.update_history")}</p>
                    <div className="space-y-0">
                      {[...order.delivery.updates].reverse().map((upd, i) => (
                        <div key={i} className="flex gap-4 relative">
                          {/* vertical line */}
                          {i < order.delivery.updates.length - 1 && (
                            <div className="absolute left-[13px] top-8 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-700" />
                          )}
                          {/* dot */}
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 flex items-center justify-center mt-0.5 z-10">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                          </div>
                          <div className="pb-5">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{translatedStatusLabel(t, upd.status, "delivery")}</p>
                            {upd.location && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">📍 {upd.location}</p>}
                            {upd.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{upd.notes}</p>}
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{fmtDate(upd.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Order items */}
            {order.items?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-purple-500 rounded-full block" />
                  {t("order_tracking.items_ordered", { count: order.items.length })}
                </h3>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                      {/* Image */}
                      <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden border border-gray-200 dark:border-gray-600">
                        {item.image ? (
                          <img loading="lazy" src={getImageUrl(item.image)} alt={item.product_name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-xl">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.product_name}</p>
                        {item.product_sku && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-mono">SKU: {item.product_sku}</p>}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{fmt(item.price)} × {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white flex-shrink-0">{fmt(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary + Seller + Address in 2-col grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Order summary */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full block" />
                  {t("order_tracking.payment_summary")}
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: t("order_tracking.subtotal"),      value: fmt(order.subtotal_amount) },
                    { label: t("order_tracking.shipping_label"), value: fmt(order.shipping_fee) },
                    { label: t("order_tracking.tax_label"),     value: fmt(order.tax_amount) },
                    ...(order.coupon_discount_amount > 0
                      ? [{ label: t("order_tracking.coupon_discount"), value: `− ${fmt(order.coupon_discount_amount)}`, red: true }]
                      : []),
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>{row.label}</span>
                      <span className={row.red ? "text-red-600 dark:text-red-400 font-medium" : ""}>{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-3 border-t border-gray-100 dark:border-gray-700 mt-2">
                    <span>{t("order_tracking.total")}</span>
                    <span className="text-green-700 dark:text-green-400">{fmt(order.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 pt-1">
                    <span>{t("order_tracking.payment_method_label")}</span>
                    <span className="capitalize font-medium text-gray-600 dark:text-gray-400">{translatedStatusLabel(t, order.payment_method, "payment_method")}</span>
                  </div>
                </div>
              </div>

              {/* Seller + Address */}
              <div className="space-y-4">
                {order.seller && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t("order_tracking.sold_by")}</p>
                    <div className="flex items-center gap-3">
                      {order.seller.store_logo ? (
                        <img loading="lazy" src={getImageUrl(order.seller.store_logo)} alt={order.seller.store_name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm">
                          {order.seller.store_name?.[0]?.toUpperCase() || "S"}
                        </div>
                      )}
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{order.seller.store_name}</p>
                    </div>
                  </div>
                )}

                {order.shipping_address && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t("order_tracking.shipping_to")}</p>
                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
                      {order.shipping_address.name && <p className="font-semibold">{order.shipping_address.name}</p>}
                      {order.shipping_address.address && <p>{order.shipping_address.address}</p>}
                      {[order.shipping_address.city, order.shipping_address.state].filter(Boolean).join(", ") && (
                        <p>{[order.shipping_address.city, order.shipping_address.state].filter(Boolean).join(", ")}</p>
                      )}
                      {order.shipping_address.phone && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">📞 {order.shipping_address.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Track another order */}
            <div className="text-center py-4">
              <button
                onClick={() => { setOrder(null); setInput(""); setEmail(""); setSearchParams({}); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium transition-colors underline underline-offset-2"
              >
                {t("order_tracking.track_different")}
              </button>
            </div>
          </div>
        )}

        {/* ── Info section ── */}
        {!order && !loading && (
          <div className="max-w-3xl mx-auto px-4 py-14">
            <h2 className="text-center text-base font-semibold text-gray-500 dark:text-gray-400 mb-8">{t("order_tracking.how_it_works")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { icon: "📋", title: t("order_tracking.how_step_0_title"), desc: t("order_tracking.how_step_0_desc") },
                { icon: "🔍", title: t("order_tracking.how_step_1_title"), desc: t("order_tracking.how_step_1_desc") },
                { icon: "📦", title: t("order_tracking.how_step_2_title"), desc: t("order_tracking.how_step_2_desc") },
              ].map((card) => (
                <div key={card.title} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 text-center">
                  <div className="text-4xl mb-3">{card.icon}</div>
                  <p className="font-semibold text-gray-800 dark:text-white mb-2 text-sm">{card.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-2xl p-6 text-center">
              <p className="text-sm text-green-800 dark:text-green-300 font-medium mb-1">{t("order_tracking.need_help")}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mb-4">{t("order_tracking.need_help_desc")}</p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 dark:bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
              >
                {t("order_tracking.contact_support")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OrderTracking;
