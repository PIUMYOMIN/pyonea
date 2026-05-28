// src/components/buyer/RFQPanel.jsx
//
// Self-contained RFQ panel designed to live inside the BuyerDashboard.
// All state, data-fetching and sub-components are local — no props required.
// The standalone RFQManager page (src/pages/RFQManager.jsx) is the source of
// truth for sub-components; keep them in sync if the API layer changes.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  PlusIcon,
  PaperAirplaneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  InboxIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import api from "../../utils/api";

// ── API layer ─────────────────────────────────────────────────────────────────
const rfqApi = {
  listSent:      ()               => api.get("/rfq/sent"),
  listReceived:  ()               => api.get("/rfq/received"),
  create:        (payload)        => api.post("/rfq", payload),
  getOne:        (id)             => api.get(`/rfq/${id}`),
  close:         (id)             => api.patch(`/rfq/${id}/close`),
  cancel:        (id)             => api.patch(`/rfq/${id}/cancel`),
  submitQuote:   (rfqId, payload) => api.post(`/rfq/${rfqId}/quotes`, payload),
  acceptQuote:   (rfqId, quoteId) => api.patch(`/rfq/${rfqId}/quotes/${quoteId}/accept`),
  rejectQuote:   (rfqId, quoteId) => api.patch(`/rfq/${rfqId}/quotes/${quoteId}/reject`),
  searchSellers: (q)              => api.get("/sellers", { params: { search: q, per_page: 10 } }),
};

// ── Small shared UI pieces ────────────────────────────────────────────────────
const getStatusConfig = (t, status, type = "rfq") => {
  const base = `rfq.status.${type}.${status}`;
  return {
    label: t(`${base}.label`, status),
    cls:   t(`${base}.cls`,   ""),
    dot:   t(`${base}.dot`,   ""),
  };
};

const StatusBadge = ({ status, type = "rfq" }) => {
  const { t } = useTranslation();
  const cfg = getStatusConfig(t, status, type);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.dot && <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
};

const EmptyState = ({ icon: Icon, title, sub, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-slate-700/60 flex items-center justify-center mb-4">
      <Icon className="h-8 w-8 text-gray-300 dark:text-slate-500" />
    </div>
    <h3 className="text-base font-semibold text-gray-600 dark:text-slate-400">{title}</h3>
    {sub    && <p className="text-sm text-gray-400 dark:text-slate-500 mt-1 max-w-xs">{sub}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const Spinner = () => (
  <div className="flex justify-center py-10">
    <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent" />
  </div>
);

const AlertBanner = ({ type = "error", children, onClose }) => (
  <div className={`flex items-start gap-3 p-4 rounded-xl text-sm border ${
    type === "error"
      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
      : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
  }`}>
    {type === "error"
      ? <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      : <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />}
    <span className="flex-1">{children}</span>
    {onClose && (
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <XMarkIcon className="h-4 w-4" />
      </button>
    )}
  </div>
);

// ── CreateRFQForm ─────────────────────────────────────────────────────────────
const CreateRFQForm = ({ onSuccess, onCancel }) => {
  const { t, i18n } = useTranslation();
  const currencyLabel = t("common.currency.mmk", "MMK");
  const [form, setForm] = useState({
    product_name: "", category_id: "", category: "", quantity: "", unit: "pcs",
    specifications: "", budget_min: "", budget_max: "",
    currency: "MMK", deadline: "", notes: "",
    broadcast: true, seller_ids: [],
  });
  const [categories,        setCategories]        = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [sellerSearch,      setSellerSearch]      = useState("");
  const [sellerResults,     setSellerResults]     = useState([]);
  const [searchLoading,     setSearchLoading]     = useState(false);
  const [submitting,        setSubmitting]        = useState(false);
  const [error,             setError]             = useState(null);
  const [success,           setSuccess]           = useState(null);
  const searchTimeout = useRef(null);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  useEffect(() => {
    let mounted = true;
    setLoadingCategories(true);
    api.get("/categories/all")
      .then((res) => { if (mounted) setCategories(res.data?.data ?? []); })
      .catch(() => { if (mounted) setCategories([]); })
      .finally(() => { if (mounted) setLoadingCategories(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!sellerSearch.trim() || form.broadcast) { setSellerResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await rfqApi.searchSellers(sellerSearch);
        setSellerResults(res.data.data?.data ?? res.data.data ?? []);
      } catch { setSellerResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [sellerSearch, form.broadcast]);

  const toggleSeller = (seller) =>
    setForm((p) => ({
      ...p,
      seller_ids: p.seller_ids.includes(seller.id)
        ? p.seller_ids.filter((id) => id !== seller.id)
        : [...p.seller_ids, seller.id],
    }));

  const handleSubmit = async () => {
    const required = ["product_name", "category_id", "quantity", "unit", "deadline"];
    const missing  = required.filter((f) => !form[f]);
    if (missing.length) {
      setError(t("rfq.errors.required", { fields: missing.map((f) => t(`rfq.fields.${f}`, f)).join(", ") }));
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const selectedCategory = categories
        .flatMap((p) => (p.children?.length ? p.children : [p]))
        .find((c) => String(c.id) === String(form.category_id));
      await rfqApi.create({
        ...form,
        category: (i18n.language === "my"
          ? (selectedCategory?.name_mm || selectedCategory?.name_en)
          : (selectedCategory?.name_en || selectedCategory?.name_mm)
        ) ?? form.category ?? "",
      });
      setSuccess(t("rfq.messages.rfq_submitted"));
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || t("rfq.errors.create_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls     = "w-full h-11 border border-gray-300 dark:border-slate-600 rounded-xl px-3 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none";
  const textareaCls  = "w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none";
  const labelCls     = "block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1 uppercase tracking-wide";
  const tomorrow     = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate      = tomorrow.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {error   && <AlertBanner type="error"   onClose={() => setError(null)}>{error}</AlertBanner>}
      {success && <AlertBanner type="success">{success}</AlertBanner>}

      {/* Product Details */}
      <section>
        <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <DocumentTextIcon className="h-4 w-4 text-indigo-500" /> {t("rfq.form.product_details")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>{t("rfq.form.product_name")} <span className="text-red-500">*</span></label>
            <input className={inputCls} placeholder={t("rfq.form.product_name_placeholder")} value={form.product_name} onChange={set("product_name")} />
          </div>
          <div>
            <label className={labelCls}>{t("rfq.form.category")} <span className="text-red-500">*</span></label>
            <select className={inputCls} value={form.category_id} onChange={set("category_id")} disabled={loadingCategories}>
              <option value="">{loadingCategories ? t("rfq.form.category_loading") : t("rfq.form.category_select_placeholder")}</option>
              {categories.map((parent) => (
                <optgroup key={parent.id} label={i18n.language === "my" ? (parent.name_mm || parent.name_en) : (parent.name_en || parent.name_mm)}>
                  {parent.children?.length > 0
                    ? parent.children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {i18n.language === "my" ? (child.name_mm || child.name_en) : (child.name_en || child.name_mm)}
                        </option>
                      ))
                    : <option disabled>{t("rfq.form.no_sub_categories")}</option>}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className={labelCls}>{t("rfq.form.quantity")} <span className="text-red-500">*</span></label>
              <input type="number" min="1" className={inputCls} placeholder="500" value={form.quantity} onChange={set("quantity")} />
            </div>
            <div>
              <label className={labelCls}>{t("rfq.form.unit")} <span className="text-red-500">*</span></label>
              <select className={inputCls} value={form.unit} onChange={set("unit")}>
                {["pcs","kg","ton","g","L","ml","bags","boxes","sets","m","m²","m³","rolls"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>{t("rfq.form.specifications")}</label>
            <textarea className={textareaCls + " resize-none"} rows={3} placeholder={t("rfq.form.specifications_placeholder")} value={form.specifications} onChange={set("specifications")} />
          </div>
        </div>
      </section>

      {/* Budget & Timeline */}
      <section>
        <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <CurrencyDollarIcon className="h-4 w-4 text-green-500" /> {t("rfq.form.budget_timeline")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t("rfq.form.budget_min")}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{currencyLabel}</span>
              <input type="number" className={inputCls + " pl-12"} placeholder="0" value={form.budget_min} onChange={set("budget_min")} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("rfq.form.budget_max")}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{currencyLabel}</span>
              <input type="number" className={inputCls + " pl-12"} placeholder="0" value={form.budget_max} onChange={set("budget_max")} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("rfq.form.deadline")} <span className="text-red-500">*</span></label>
            <input type="date" min={minDate} className={inputCls} value={form.deadline} onChange={set("deadline")} />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelCls}>{t("rfq.form.notes")}</label>
          <textarea className={textareaCls + " resize-none"} rows={2} placeholder={t("rfq.form.notes_placeholder")} value={form.notes} onChange={set("notes")} />
        </div>
      </section>

      {/* Seller Targeting */}
      <section>
        <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <UserGroupIcon className="h-4 w-4 text-purple-500" /> {t("rfq.form.send_to")}
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 cursor-pointer">
            <input
              type="checkbox"
              checked={form.broadcast}
              onChange={(e) => setForm((p) => ({ ...p, broadcast: e.target.checked, seller_ids: [] }))}
              className="h-4 w-4 rounded text-indigo-600"
            />
            <div>
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">{t("rfq.form.broadcast_title")}</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">{t("rfq.form.broadcast_desc")}</p>
            </div>
          </label>
          {!form.broadcast && (
            <div className="space-y-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input className={inputCls + " pl-9"} placeholder={t("rfq.form.seller_search_placeholder")} value={sellerSearch} onChange={(e) => setSellerSearch(e.target.value)} />
              </div>
              {searchLoading && <p className="text-xs text-gray-400 pl-2">{t("rfq.form.searching")}</p>}
              {sellerResults.length > 0 && (
                <div className="border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-700">
                  {sellerResults.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <input type="checkbox" checked={form.seller_ids.includes(s.id)} onChange={() => toggleSeller(s)} className="h-4 w-4 rounded text-indigo-600" />
                      <BuildingStorefrontIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{s.store_name}</span>
                      {s.store_rating && (
                        <span className="ml-auto flex items-center gap-1 text-xs text-amber-500">
                          <StarIcon className="h-3 w-3" /> {s.store_rating}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {form.seller_ids.length > 0 && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  ✓ {t("rfq.form.sellers_selected", { count: form.seller_ids.length })}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        {onCancel && (
          <button onClick={onCancel} className="px-5 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
            {t("rfq.actions.cancel")}
          </button>
        )}
        <button onClick={handleSubmit} disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {submitting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PaperAirplaneIcon className="h-4 w-4" />}
          {submitting ? t("rfq.actions.submitting") : t("rfq.actions.submit_rfq")}
        </button>
      </div>
    </div>
  );
};

// ── QuoteCard ─────────────────────────────────────────────────────────────────
const QuoteCard = ({ quote, rfqId, onAccepted, onRejected, canRespond = true }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const act = async (action) => {
    setLoading(true); setError(null);
    try {
      action === "accept"
        ? await rfqApi.acceptQuote(rfqId, quote.id)
        : await rfqApi.rejectQuote(rfqId, quote.id);
      action === "accept" ? onAccepted?.() : onRejected?.();
    } catch (e) {
      setError(e.response?.data?.message || t("rfq.errors.submit_failed"));
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => Number(n).toLocaleString();

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all ${
      quote.status === "accepted"
        ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20"
        : quote.status === "rejected"
        ? "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 opacity-60"
        : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600"
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <BuildingStorefrontIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900 dark:text-slate-100">
              {quote.seller?.seller_profile?.store_name || quote.seller?.sellerProfile?.store_name || quote.seller?.name || "Unknown Seller"}
            </p>
            {(quote.seller?.seller_profile?.average_rating || quote.seller?.rating) && (
              <div className="flex items-center gap-1 text-xs text-amber-500">
                <StarIcon className="h-3 w-3" />
                {(quote.seller?.seller_profile?.average_rating ?? quote.seller?.rating)?.toFixed(1)}
              </div>
            )}
          </div>
        </div>
        <StatusBadge status={quote.status} type="quote" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3 bg-gray-50 dark:bg-slate-900/40 rounded-xl p-3">
        {[
          { label: t("rfq.quote.unit_price"), value: `${fmt(quote.unit_price)} ${quote.currency}` },
          { label: t("rfq.quote.total"),      value: <span className="text-indigo-700 dark:text-indigo-300">{fmt(quote.total_price)} {quote.currency}</span> },
          { label: t("rfq.quote.delivery"),   value: `${quote.delivery_days} ${t("rfq.quote.days")}` },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-slate-100 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {quote.notes && (
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 bg-gray-50 dark:bg-slate-900/40 rounded-lg px-3 py-2">
          💬 {quote.notes}
        </p>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}

      {quote.status === "pending" && canRespond && (
        <div className="flex gap-2">
          <button onClick={() => act("reject")} disabled={loading}
            className="flex-1 py-2 text-xs font-bold border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">
            <XCircleIcon className="h-4 w-4 inline mr-1" /> {t("rfq.actions.decline")}
          </button>
          <button onClick={() => act("accept")} disabled={loading}
            className="flex-1 py-2 text-xs font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
            {loading ? <ArrowPathIcon className="h-4 w-4 inline animate-spin" /> : <CheckCircleIcon className="h-4 w-4 inline mr-1" />}
            {t("rfq.actions.accept_quote")}
          </button>
        </div>
      )}
      {quote.status === "accepted" && (
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-xs font-bold">
          <CheckCircleIcon className="h-4 w-4" /> Quote accepted — order will be created
        </div>
      )}
    </div>
  );
};

// ── RFQDetailModal ────────────────────────────────────────────────────────────
const RFQDetailModal = ({ rfq, onClose, onRefresh }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data,    setData]    = useState(rfq);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [closing, setClosing] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await rfqApi.getOne(rfq.id);
      setData(res.data.data ?? res.data);
    } catch { /* use cached */ } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [rfq.id]);

  const handleCancel = async () => {
    setClosing(true);
    try { await rfqApi.cancel(rfq.id); onRefresh?.(); onClose(); }
    catch (e) { setError(e.response?.data?.message || t("rfq.errors.cancel_failed")); }
    finally { setClosing(false); }
  };

  const handleClose = async () => {
    setClosing(true);
    try { await rfqApi.close(rfq.id); onRefresh?.(); onClose(); }
    catch (e) { setError(e.response?.data?.message || t("rfq.errors.close_failed")); }
    finally { setClosing(false); }
  };

  const fmt = (n) => Number(n).toLocaleString();

  return (
    <div className="fixed inset-0 bg-black/60 overflow-y-auto z-50 p-4">
      <div className="relative mx-auto w-full max-w-3xl my-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div>
              <p className="text-xs font-semibold text-indigo-200">{data.rfq_number}</p>
              <h2 className="text-lg font-bold">{data.product_name}</h2>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={data.status} />
              <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {error && <AlertBanner type="error" onClose={() => setError(null)}>{error}</AlertBanner>}

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: t("rfq.card.qty"),      value: `${data.quantity} ${data.unit}` },
                { label: t("rfq.card.deadline"), value: new Date(data.deadline).toLocaleDateString() },
                { label: t("rfq.card.quotes"),   value: data.quotes_count ?? data.quotes?.length ?? 0 },
                { label: t("rfq.card.created"),  value: new Date(data.created_at).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 dark:bg-slate-900/40 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {data.specifications && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
                <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide mb-1">{t("rfq.form.specifications")}</p>
                <p className="text-sm text-indigo-900 dark:text-indigo-200">{data.specifications}</p>
              </div>
            )}

            {/* Accepted quote summary */}
            {data.accepted_quote && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl border-2 border-green-400 dark:border-green-600 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <h3 className="font-bold text-green-800 dark:text-green-300">{t("rfq.messages.accepted_quotation")}</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t("rfq.quote.seller"),      value: data.accepted_quote.seller?.seller_profile?.store_name || data.accepted_quote.seller?.sellerProfile?.store_name || data.accepted_quote.seller?.name || "—" },
                    { label: t("rfq.quote.unit_price"),  value: `${fmt(data.accepted_quote.unit_price)} ${data.accepted_quote.currency}` },
                    { label: t("rfq.quote.total_value"), value: `${fmt(data.accepted_quote.total_price)} ${data.accepted_quote.currency}` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-green-600 dark:text-green-400 font-semibold">{label}</p>
                      <p className="text-sm font-bold text-green-900 dark:text-green-200">{value}</p>
                    </div>
                  ))}
                </div>
                {data.order && (
                  <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide">Order Created</p>
                      <p className="text-sm font-bold text-green-900 dark:text-green-200 font-mono tracking-wide">{data.order.order_number}</p>
                      <p className="text-xs text-green-600 dark:text-green-400 capitalize mt-0.5">
                        Status: <span className="font-semibold">{data.order.status}</span>
                      </p>
                    </div>
                    <button onClick={() => navigate(`/order-tracking?order=${data.order.order_number}`)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow-sm transition-colors flex-shrink-0">
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Track Order
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quotes list */}
            {loading && <Spinner />}
            {!loading && data.quotes?.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <DocumentDuplicateIcon className="h-5 w-5 text-indigo-500" />
                  {t("rfq.messages.received_quotations", { count: data.quotes.length })}
                </h3>
                <div className="space-y-3">
                  {data.quotes.map((q) => (
                    <QuoteCard
                      key={q.id} quote={q} rfqId={data.id}
                      canRespond={data.status !== "cancelled" && data.status !== "closed"}
                      onAccepted={() => { refresh(); onRefresh?.(); }}
                      onRejected={refresh}
                    />
                  ))}
                </div>
              </div>
            )}
            {!loading && (!data.quotes || data.quotes.length === 0) && data.status === "open" && (
              <div className="text-center py-8 bg-gray-50 dark:bg-slate-900/40 rounded-2xl">
                <ClockIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">{t("rfq.empty.waiting.title")}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t("rfq.empty.waiting.sub")}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-700">
            <div className="flex gap-2">
              {["open", "draft"].includes(data.status) && (
                <button onClick={handleCancel} disabled={closing}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50">
                  <XCircleIcon className="h-4 w-4" /> {t("rfq.actions.cancel_rfq")}
                </button>
              )}
              {data.status === "quoted" && (
                <button onClick={handleClose} disabled={closing}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50">
                  {t("rfq.actions.close_bidding")}
                </button>
              )}
            </div>
            <button onClick={refresh} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100">
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {t("rfq.toolbar.refresh")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── RFQCard ───────────────────────────────────────────────────────────────────
const RFQCard = ({ rfq, onClick }) => {
  const { t } = useTranslation();
  const hasNewQuotes = rfq.quotes_count > 0 && rfq.status === "quoted";
  return (
    <div onClick={onClick}
      className={`group relative bg-white dark:bg-slate-800 rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${
        hasNewQuotes
          ? "border-indigo-300 dark:border-indigo-700"
          : "border-gray-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800"
      }`}>
      {hasNewQuotes && (
        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
          {rfq.quotes_count}
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{rfq.rfq_number}</p>
          <h3 className="font-bold text-gray-900 dark:text-slate-100 truncate mt-0.5">{rfq.product_name}</h3>
          {rfq.category && <p className="text-xs text-gray-400 dark:text-slate-500">{rfq.category}</p>}
        </div>
        <StatusBadge status={rfq.status} />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: t("rfq.card.qty"),      value: `${rfq.quantity} ${rfq.unit}` },
          { label: t("rfq.card.deadline"), value: new Date(rfq.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) },
          { label: t("rfq.card.quotes"),   value: rfq.quotes_count ?? rfq.quotes?.length ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 dark:bg-slate-900/40 rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">{label}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-400 dark:text-slate-500">
        <span>{t("rfq.card.created")} {new Date(rfq.created_at).toLocaleDateString()}</span>
        <ChevronRightIcon className="h-4 w-4 group-hover:text-indigo-500 transition-colors" />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// RFQPanel — dashboard-embedded entry point
// ══════════════════════════════════════════════════════════════════════════════
const RFQPanel = () => {
  const { t, i18n }  = useTranslation();
  const { isSeller } = useAuth();

  // Buyers only see "sent" and "create"; sellers also see "received".
  // In the buyer dashboard we only ever render the buyer view.
  const userRole   = isSeller() ? "seller" : "buyer";
  const defaultTab = "sent";

  const [activeTab,    setActiveTab]    = useState(defaultTab);
  const [sentRFQs,     setSentRFQs]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [success,      setSuccess]      = useState(null);
  const [selectedRFQ,  setSelectedRFQ]  = useState(null);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryMap,  setCategoryMap]  = useState({});

  // Load category names for display
  useEffect(() => {
    let mounted = true;
    api.get("/categories/all")
      .then((res) => {
        const map = {};
        (res.data?.data ?? []).forEach((parent) => {
          if (parent?.id) map[parent.id] = { en: parent.name_en, my: parent.name_mm };
          (parent.children || []).forEach((child) => {
            if (child?.id) map[child.id] = { en: child.name_en, my: child.name_mm };
          });
        });
        if (mounted) setCategoryMap(map);
      })
      .catch(() => { if (mounted) setCategoryMap({}); });
    return () => { mounted = false; };
  }, []);

  const getLocalizedCategory = (rfq) => {
    const ref = rfq?.category_id ? categoryMap[rfq.category_id] : null;
    if (ref) return i18n.language === "my" ? (ref.my || ref.en) : (ref.en || ref.my);
    return rfq?.category || "";
  };

  const fetchSent = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await rfqApi.listSent();
      setSentRFQs(res.data.data?.data ?? res.data.data ?? []);
    } catch (e) {
      if (e.response?.status === 404 || e.code === "ERR_NETWORK") setSentRFQs([]);
      else setError(e.response?.data?.message || t("rfq.errors.load_failed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeTab === "sent") fetchSent();
  }, [activeTab, fetchSent]);

  // Filter helpers
  const displaySent = sentRFQs.filter((r) => {
    const matchSearch = !searchTerm ||
      r.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.rfq_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const stats = {
    total:    sentRFQs.length,
    open:     sentRFQs.filter((r) => r.status === "open").length,
    quoted:   sentRFQs.filter((r) => r.status === "quoted").length,
    accepted: sentRFQs.filter((r) => r.status === "accepted").length,
  };

  const TABS = [
    { id: "sent",   label: t("rfq.tabs.sent"),   icon: DocumentTextIcon, badge: stats.quoted > 0 ? stats.quoted : null },
    { id: "create", label: t("rfq.tabs.create"),  icon: PlusIcon,         badge: null },
  ];

  return (
    <div className="space-y-6">

      {/* Section heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t("rfq.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{t("rfq.description")}</p>
        </div>
      </div>

      {/* Alerts */}
      {error   && <AlertBanner type="error"   onClose={() => setError(null)}>{error}</AlertBanner>}
      {success && <AlertBanner type="success" onClose={() => setSuccess(null)}>{success}</AlertBanner>}

      {/* Stats row — only on list tabs */}
      {activeTab !== "create" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t("rfq.stats.total_rfqs"), value: stats.total,    color: "text-gray-700 dark:text-slate-300"    },
            { label: t("rfq.stats.open"),        value: stats.open,     color: "text-blue-600 dark:text-blue-400"     },
            { label: t("rfq.stats.quotes_in"),   value: stats.quoted,   color: "text-purple-600 dark:text-purple-400" },
            { label: t("rfq.stats.accepted"),    value: stats.accepted, color: "text-green-600 dark:text-green-400"   },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-700">
              <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
              <div className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 font-medium">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab panel */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">

        {/* Tab nav */}
        <div className="flex border-b border-gray-100 dark:border-slate-700">
          {TABS.map(({ id, label, icon: Icon, badge }) => (
            <button key={id}
              onClick={() => { setActiveTab(id); setSearchTerm(""); setStatusFilter("all"); }}
              className={`relative flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === id
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              }`}>
              <Icon className="h-4 w-4" />
              {label}
              {badge != null && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-indigo-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Create tab */}
        {activeTab === "create" && (
          <div className="p-6">
            <CreateRFQForm
              onCancel={() => setActiveTab("sent")}
              onSuccess={() => {
                setSuccess(t("rfq.messages.rfq_submitted"));
                setActiveTab("sent");
                fetchSent();
              }}
            />
          </div>
        )}

        {/* Sent tab */}
        {activeTab === "sent" && (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <div className="relative flex-1 min-w-[180px]">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder={t("rfq.toolbar.search")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">{t("rfq.toolbar.all_statuses")}</option>
                {Object.entries(t("rfq.status.rfq", { returnObjects: true }) || {}).map(([v, cfg]) => (
                  <option key={v} value={v}>{cfg?.label || v}</option>
                ))}
              </select>
              <button onClick={fetchSent}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700">
                <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {t("rfq.toolbar.refresh")}
              </button>
              <button onClick={() => setActiveTab("create")}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 ml-auto">
                <PlusIcon className="h-4 w-4" /> {t("rfq.toolbar.new_rfq")}
              </button>
            </div>

            {/* List */}
            <div className="p-6">
              {loading && <Spinner />}
              {!loading && displaySent.length === 0 && (
                <EmptyState
                  icon={DocumentTextIcon}
                  title={t("rfq.empty.sent.title") || "No RFQs found"}
                  sub={t("rfq.empty.sent.sub") || "Create your first RFQ to start collecting quotes from sellers"}
                  action={
                    <button onClick={() => setActiveTab("create")}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
                      <PlusIcon className="h-4 w-4" /> {t("rfq.tabs.create") || "Create RFQ"}
                    </button>
                  }
                />
              )}
              {!loading && displaySent.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {displaySent.map((rfq) => (
                    <RFQCard
                      key={rfq.id}
                      rfq={{ ...rfq, category: getLocalizedCategory(rfq) }}
                      onClick={() => setSelectedRFQ(rfq)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detail modal */}
      {selectedRFQ && (
        <RFQDetailModal
          rfq={selectedRFQ}
          onClose={() => setSelectedRFQ(null)}
          onRefresh={fetchSent}
        />
      )}
    </div>
  );
};

export default RFQPanel;
