// components/admin/SellersManagement.jsx
import React, { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import api from "../../utils/api";
import DataTable from "../ui/DataTable";

// ── Status badge helper ───────────────────────────────────────────────────────
const getStatusBadge = (status) => {
  switch (status) {
    case "approved":
    case "active":
      return {
        cls: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
        icon: CheckCircleIcon,
        label: "Approved",
      };
    case "pending":
      return {
        cls: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400",
        icon: ClockIcon,
        label: "Pending",
      };
    case "setup_pending":
      return {
        cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
        icon: ClockIcon,
        label: "Setup Pending",
      };
    case "rejected":
    case "suspended":
      return {
        cls: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
        icon: XCircleIcon,
        label: status === "suspended" ? "Suspended" : "Rejected",
      };
    case "closed":
      return {
        cls: "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300",
        icon: null,
        label: "Closed",
      };
    default:
      return {
        cls: "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300",
        icon: null,
        label: status || "Unknown",
      };
  }
};

// ── Status Update Modal ───────────────────────────────────────────────────────
const StatusUpdateModal = ({ modal, reason, setReason, onConfirm, onClose, submitting }) => {
  if (!modal) return null;

  const { seller, newStatus } = modal;
  const badge = getStatusBadge(newStatus);

  const requiresReason = ["rejected", "suspended", "closed"].includes(newStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-slate-100 text-base">Update Seller Status</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {seller?.store_name || "Unknown Store"}
            </p>
          </div>
        </div>

        {/* Status change preview */}
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 mb-4">
          <span className="text-sm text-gray-500 dark:text-slate-400">Current:</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(seller?.status).cls}`}>
            {getStatusBadge(seller?.status).label}
          </span>
          <span className="text-gray-400 dark:text-slate-500 text-xs">→</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        {/* Reason field */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
            Reason
            {requiresReason && <span className="text-red-500 ml-1">*</span>}
            {!requiresReason && <span className="text-gray-400 dark:text-slate-500 font-normal ml-1">(optional)</span>}
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={
              requiresReason
                ? `Please provide a reason for ${newStatus === "suspended" ? "suspending" : newStatus === "rejected" ? "rejecting" : "closing"} this seller…`
                : `Optionally describe why you're changing the status to ${newStatus}…`
            }
            disabled={submitting}
            className="w-full rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none disabled:opacity-60 transition-colors"
          />
          {requiresReason && !reason.trim() && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 flex items-center gap-1">
              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
              A reason is required for this status change.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting || (requiresReason && !reason.trim())}
            className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Updating…
              </>
            ) : (
              "Confirm Update"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const SellersManagement = () => {
  const [_toast, _setToast] = useState(null);
  const flash = (msg, type = "success") => {
    _setToast({ msg, type });
    setTimeout(() => _setToast(null), 3000);
  };

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedSellers, setSelectedSellers] = useState([]);

  // ── Status modal state ────────────────────────────────────────────────────
  const [statusModal, setStatusModal] = useState(null); // { seller, newStatus }
  const [statusReason, setStatusReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bulkAction, setBulkAction] = useState("");

  const openStatusModal = (seller, newStatus) => {
    setStatusReason("");
    setStatusModal({ seller, newStatus });
  };

  const closeStatusModal = () => {
    if (submitting) return; // prevent close while saving
    setStatusModal(null);
    setStatusReason("");
  };

  const fetchSellers = async (page = currentPage, search = searchTerm, status = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page, per_page: 15,
        search: search || undefined,
        ...(status !== "all" && { status }),
      };
      const response = await api.get("/admin/sellers", { params });
      if (response.data.success) {
        const data = response.data.data;
        setSellers(data.data || []);
        setPagination({
          current_page: data.current_page,
          per_page: data.per_page,
          total: data.total,
          last_page: data.last_page,
          from: data.from,
          to: data.to,
        });
      } else {
        setSellers(response.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch sellers:", err);
      setError(err.response?.data?.message || "Failed to load sellers");
      setSellers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSellers(1, searchTerm, statusFilter); }, []);
  useEffect(() => { fetchSellers(currentPage, searchTerm, statusFilter); }, [searchTerm, statusFilter, currentPage]);

  const handleStatusUpdate = async () => {
    if (!statusModal) return;
    const { seller, newStatus } = statusModal;
    const requiresReason = ["rejected", "suspended", "closed"].includes(newStatus);
    if (requiresReason && !statusReason.trim()) return;

    setSubmitting(true);
    try {
      const payload = {};
      if (statusReason.trim()) {
        payload.reason = statusReason.trim();
        payload.notes = statusReason.trim();
      }

      let response;
      if (newStatus === "approved") {
        response = await api.put(`/admin/seller/${seller.id}/approve`, payload);
      } else if (newStatus === "suspended") {
        response = await api.post(`/admin/seller/${seller.id}/suspend`, payload);
      } else if (newStatus === "active") {
        response = await api.post(`/admin/seller/${seller.id}/reactivate`, payload);
      } else {
        response = await api.put(`/admin/seller/${seller.id}/status`, { ...payload, status: newStatus });
      }
      if (response.data.success) {
        flash(`Seller status updated to ${newStatus} successfully.`);
        setSellers(prev =>
          prev.map(s => s.id === seller.id ? { ...s, ...(response.data.data || {}), status: newStatus } : s)
        );
        setStatusModal(null);
        setStatusReason("");
      }
    } catch (error) {
      flash(error.response?.data?.message || error.message || "Failed to update seller status", "error");
      // Keep modal open so admin can retry or cancel
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedSellers.length === 0 || submitting) return;

    const actionLabel = bulkAction.replace("_", " ");
    const ok = window.confirm(`Apply "${actionLabel}" to ${selectedSellers.length} selected seller(s)?`);
    if (!ok) return;

    setSubmitting(true);
    try {
      const selected = sellers.filter((seller) => selectedSellers.includes(seller.id));
      const results = await Promise.allSettled(selected.map((seller) => {
        if (bulkAction === "approved") return api.put(`/admin/seller/${seller.id}/approve`);
        if (bulkAction === "suspended") return api.post(`/admin/seller/${seller.id}/suspend`, { reason: "Bulk suspended by admin" });
        if (bulkAction === "active") return api.post(`/admin/seller/${seller.id}/reactivate`, { notes: "Bulk reactivated by admin" });
        return api.put(`/admin/seller/${seller.id}/status`, { status: bulkAction });
      }));

      const successCount = results.filter((result) => result.status === "fulfilled" && result.value.data?.success).length;
      const failureCount = selected.length - successCount;
      if (successCount > 0) {
        flash(`${successCount} seller(s) updated${failureCount ? `, ${failureCount} failed` : ""}.`, failureCount ? "error" : "success");
      } else {
        flash("No sellers were updated. Some sellers may be missing required approval information.", "error");
      }
      setSelectedSellers([]);
      setBulkAction("");
      await fetchSellers(currentPage, searchTerm, statusFilter);
    } catch (error) {
      flash(error.response?.data?.message || error.message || "Bulk action failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelection = (id) => setSelectedSellers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAllSelection = () => setSelectedSellers(prev => prev.length === sellers.length ? [] : sellers.map(s => s.id));

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("asc"); }
  };

  const sortedSellers = [...sellers].sort((a, b) => {
    let av = a[sortField] || "";
    let bv = b[sortField] || "";
    if (sortField === "rating") { av = parseFloat(a.reviews_avg_rating) || 0; bv = parseFloat(b.reviews_avg_rating) || 0; }
    if (sortField === "products_count") { av = a.products_count || 0; bv = b.products_count || 0; }
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    return sortDirection === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "N/A";

  const SortBtn = ({ field, label }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 whitespace-nowrap">
      {label}
      {sortField === field && <ArrowsUpDownIcon className="h-4 w-4" />}
    </button>
  );

  const columns = [
    {
      header: (
        <input type="checkbox"
          checked={selectedSellers.length === sellers.length && sellers.length > 0}
          onChange={toggleAllSelection}
          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-slate-600 rounded" />
      ),
      accessor: "selection", width: "50px",
    },
    { header: "Store ID", accessor: "store_id" },
    { header: "Store Name", accessor: "store_name" },
    { header: "Email", accessor: "contact_email" },
    { header: "Phone", accessor: "contact_phone" },
    { header: "Business Type", accessor: "business_type" },
    { header: <SortBtn field="status" label="Status" />, accessor: "status" },
    { header: <SortBtn field="rating" label="Rating" />, accessor: "rating" },
    { header: <SortBtn field="products_count" label="Products" />, accessor: "products_count" },
    { header: <SortBtn field="created_at" label="Created" />, accessor: "created_at" },
    { header: "Actions", accessor: "actions", width: "200px" },
  ];

  const sellerData = sortedSellers.map(seller => {
    const badge = getStatusBadge(seller.status);
    const StatusIcon = badge.icon;
    return {
      ...seller,
      selection: (
        <input type="checkbox"
          checked={selectedSellers.includes(seller.id)}
          onChange={() => toggleSelection(seller.id)}
          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-slate-600 rounded" />
      ),
      store_id: seller.store_id || "N/A",
      store_name: seller.store_name || "N/A",
      contact_email: seller.contact_email || "N/A",
      contact_phone: seller.contact_phone || "N/A",
      business_type: seller.business_type || "N/A",
      status: (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
          {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
          {badge.label}
        </span>
      ),
      rating: seller.reviews_avg_rating ? parseFloat(seller.reviews_avg_rating).toFixed(1) : "0.0",
      products_count: (
        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold
          ${(seller.products_count || 0) > 0
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
            : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"}`}>
          {seller.products_count || 0}
        </span>
      ),
      created_at: formatDate(seller.created_at),
      actions: (
        <div className="flex items-center space-x-2">
          <button
            className="p-1 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors"
            title="View Store"
            onClick={() => window.open(`/sellers/${seller.store_slug || seller.id}`, "_blank")}
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <select
            value={seller.status}
            onChange={e => openStatusModal(seller, e.target.value)}
            className="text-xs border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
          >
            <option value="setup_pending">Setup Pending</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      ),
    };
  });

  const inputCls = "block w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm";

  return (
    <div className="space-y-6">
      {/* Status Update Modal */}
      <StatusUpdateModal
        modal={statusModal}
        reason={statusReason}
        setReason={setStatusReason}
        onConfirm={handleStatusUpdate}
        onClose={closeStatusModal}
        submitting={submitting}
      />

      {/* Toast */}
      {_toast && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
          ${_toast.type === "success"
            ? "bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300"
            : "bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"}`}>
          {_toast.type === "success"
            ? <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
            : <XCircleIcon className="h-4 w-4 flex-shrink-0" />}
          {_toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Seller directory</h2>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-slate-400">Manage all sellers in your marketplace</p>
        </div>
        <button
          type="button"
          onClick={() => fetchSellers(currentPage, searchTerm, statusFilter)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-60"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Search Sellers</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Store name, email..."
                className={`${inputCls} pl-10`}
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className={inputCls}
            >
              <option value="all">All Statuses</option>
              <option value="setup_pending">Setup Pending</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Reset */}
          <div className="flex items-end">
            <button
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setCurrentPage(1); }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Reset Filters
            </button>
          </div>
        </div>

        {pagination && (
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400">
              <span>Total: {pagination.total}</span>
              <span>•</span>
              <span>Showing {pagination.from}–{pagination.to}</span>
              {selectedSellers.length > 0 && (
                <>
                  <span>•</span>
                  <span className="font-medium text-green-700 dark:text-green-400">{selectedSellers.length} selected</span>
                </>
              )}
            </div>

            {selectedSellers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100"
                >
                  <option value="">Bulk action</option>
                  <option value="approved">Approve selected</option>
                  <option value="active">Reactivate selected</option>
                  <option value="suspended">Suspend selected</option>
                  <option value="pending">Move to pending</option>
                  <option value="setup_pending">Move to setup pending</option>
                  <option value="closed">Close selected</option>
                </select>
                <button
                  type="button"
                  onClick={handleBulkAction}
                  disabled={!bulkAction || submitting}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Applying..." : "Apply"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 p-8 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Loading sellers...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Error loading sellers</h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={() => fetchSellers(currentPage, searchTerm, statusFilter)}
                className="mt-4 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 overflow-hidden">
          {sortedSellers.length > 0 ? (
            <DataTable columns={columns} data={sellerData} striped hoverable />
          ) : (
            <div className="p-12 text-center">
              <svg className="h-12 w-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                {searchTerm || statusFilter !== "all"
                  ? "No sellers found matching your criteria"
                  : "No sellers yet"}
              </h3>
              <p className="text-gray-500 dark:text-slate-400">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Sellers will appear here once they register."}
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.last_page > 1 && (
            <div className="bg-gray-50 dark:bg-slate-900 px-6 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Page {pagination.current_page} of {pagination.last_page}
              </p>
              <div className="flex space-x-2">
                <button
                  disabled={pagination.current_page === 1}
                  onClick={() => setCurrentPage(pagination.current_page - 1)}
                  className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() => setCurrentPage(pagination.current_page + 1)}
                  className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SellersManagement;
