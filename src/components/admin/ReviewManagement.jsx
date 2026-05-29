import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckIcon, XMarkIcon, MagnifyingGlassIcon, ArrowPathIcon,
  StarIcon as StarSolid, CheckCircleIcon, XCircleIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import api from "../../utils/api";

const Stars = ({ rating }) => (
  <div className="flex">
    {[1,2,3,4,5].map(i => (
      <StarIcon key={i} className={`h-3.5 w-3.5 ${i <= rating ? "text-amber-400" : "text-gray-200 dark:text-slate-600"}`} />
    ))}
  </div>
);

const StatusBadge = ({ status, t }) => {
  const map = {
    pending:  "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    approved: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize
                      ${map[status] || "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"}`}>
      {t(`admin.reviewManagement.status.${status || "pending"}`)}
    </span>
  );
};

const ReviewTable = ({ reviews, onAction, actionLoading, t }) => {
  if (reviews.length === 0)
    return (
      <div className="py-14 text-center text-gray-400 dark:text-slate-500 text-sm">
        {t("admin.reviewManagement.noReviews")}
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm divide-y divide-gray-100 dark:divide-slate-700">
        <thead className="bg-gray-50 dark:bg-slate-900/50">
          <tr>
            {[
              t("admin.reviewManagement.table.reviewer"),
              t("admin.reviewManagement.table.target"),
              t("admin.reviewManagement.table.rating"),
              t("admin.reviewManagement.table.comment"),
              t("admin.reviewManagement.table.status"),
              t("admin.reviewManagement.table.date"),
              t("admin.reviewManagement.table.actions"),
            ].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
          {reviews.map(r => (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{r.user?.name || r.reviewer_name || "—"}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                {r.seller?.store_name || r.product?.name_en || r.product?.name || "—"}
              </td>
              <td className="px-4 py-3"><Stars rating={r.rating} /></td>
              <td className="px-4 py-3 text-gray-600 dark:text-slate-400 max-w-[200px]">
                <p className="truncate">{r.comment || "—"}</p>
              </td>
              <td className="px-4 py-3"><StatusBadge status={r.status} t={t} /></td>
              <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                {new Date(r.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {r.status !== "approved" && (
                    <button
                      onClick={() => onAction(r.id, "approved")}
                      disabled={actionLoading === r.id}
                      className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300
                                 font-medium disabled:opacity-50"
                    >
                      <CheckIcon className="h-3.5 w-3.5" /> {t("admin.reviewManagement.actions.approve")}
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button
                      onClick={() => onAction(r.id, "rejected")}
                      disabled={actionLoading === r.id}
                      className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300
                                 font-medium disabled:opacity-50"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" /> {t("admin.reviewManagement.actions.reject")}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ReviewManagement = () => {
  const { t } = useTranslation();
  const [tab, setTab]               = useState("seller"); // "seller" | "product"
  const [sellerReviews, setSellerR] = useState([]);
  const [productReviews, setProductR] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [actionLoading, setActionL] = useState(null);
  const [toast, setToast]           = useState(null);

  const flash = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sr, pr] = await Promise.allSettled([
        api.get("/admin/seller-reviews"),
        api.get("/admin/reviews"),
      ]);
      if (sr.status === "fulfilled") {
        const d = sr.value.data.data?.data || sr.value.data.data || [];
        setSellerR(Array.isArray(d) ? d : []);
      }
      if (pr.status === "fulfilled") {
        const d = pr.value.data.data?.data || pr.value.data.data || [];
        setProductR(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      setError(t("admin.reviewManagement.errors.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async (reviewId, status) => {
    setActionL(reviewId);
    try {
      const isSeller = tab === "seller";
      const base     = isSeller ? "/admin/seller-reviews" : "/admin/reviews";
      const action   = status === "approved" ? "approve" : "reject";
      await api.post(`${base}/${reviewId}/${action}`);
      const update = (prev) =>
        prev.map(r => r.id === reviewId ? { ...r, status } : r);
      if (isSeller) setSellerR(update);
      else           setProductR(update);
      flash(t(`admin.reviewManagement.messages.${status}`));
    } catch (err) {
      flash(err.response?.data?.message || t("admin.reviewManagement.errors.update"), "error");
    } finally {
      setActionL(null);
    }
  };

  const reviews = tab === "seller" ? sellerReviews : productReviews;
  const filtered = reviews.filter(r => {
    const q = search.toLowerCase();
    return !q ||
      (r.user?.name || r.reviewer_name || "").toLowerCase().includes(q) ||
      (r.seller?.store_name || r.product?.name_en || "").toLowerCase().includes(q) ||
      (r.comment || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium
          ${toast.type === "success"
            ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"}`}>
          {toast.type === "success"
            ? <CheckCircleIcon className="h-4 w-4" />
            : <XCircleIcon className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t("admin.reviewManagement.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t("admin.reviewManagement.count", { count: filtered.length })}</p>
        </div>
        <button onClick={fetchAll}
          className="p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowPathIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl w-fit">
        {[["seller", t("admin.reviewManagement.tabs.seller")], ["product", t("admin.reviewManagement.tabs.product")]].map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setSearch(""); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === key
                ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t("admin.reviewManagement.searchPlaceholder")}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-xl
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500
                     focus:ring-2 focus:ring-green-500 focus:border-transparent" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 dark:text-red-400 text-sm">
            {error} <button onClick={fetchAll} className="underline ml-1">{t("admin.reviewManagement.retry")}</button>
          </div>
        ) : (
          <ReviewTable reviews={filtered} onAction={handleAction} actionLoading={actionLoading} t={t} />
        )}
      </div>
    </div>
  );
};

export default ReviewManagement;
