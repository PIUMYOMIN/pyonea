import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import api from "../../utils/api";

// ── Status presentation ───────────────────────────────────────────────────────

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  processing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const PAYMENT_STATUS_COLORS = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  refunded: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const ESCROW_STATUS_COLORS = {
  held: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  released: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  not_applicable: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_RANK = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
};

const ORDER_STATUS_OPTIONS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const parseShippingAddress = (raw) => {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
};

const deliveryMethodLabel = (m) =>
  m === "platform" ? "Platform logistics" : m === "supplier" ? "Self delivery" : m === "pending" ? "Pending" : m || "—";

const formatDeliveryStatus = (s) => (s || "").replaceAll("_", " ") || "—";

/** Row cell: method + delivery pipeline status (list payload includes `delivery` from API). */
const AdminDeliveryCell = ({ order }) => {
  const delivery = order.delivery;
  if (!delivery) {
    return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>;
  }
  const method = delivery.delivery_method;
  const dStatus = delivery.status;
  const needsMethod =
    order.status === "confirmed" && (!method || method === "pending");

  return (
    <div className="space-y-1 text-xs max-w-[168px]">
      {needsMethod ? (
        <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 font-medium">
          Awaiting seller method
        </span>
      ) : method ? (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full font-medium ${
            method === "platform"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
          }`}
        >
          {method === "platform" ? "Platform" : "Self"}
        </span>
      ) : (
        <span className="text-gray-400 dark:text-gray-500">—</span>
      )}
      {dStatus && (
        <div>
          <span
            className="inline-flex px-1.5 py-0.5 rounded text-[10px] capitalize bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            title={deliveryMethodLabel(method) + (dStatus ? ` · ${dStatus}` : "")}
          >
            {formatDeliveryStatus(dStatus)}
          </span>
        </div>
      )}
      {delivery.tracking_number && (
        <p className="font-mono text-[10px] text-gray-500 dark:text-gray-400 truncate" title={delivery.tracking_number}>
          #{delivery.tracking_number}
        </p>
      )}
    </div>
  );
};

const assertOrderResponseOk = (res, fallbackMessage) => {
  if (res.data && res.data.success === false) {
    throw new Error(res.data.message || fallbackMessage);
  }
};

/** Ship payload — backend allows nullable; admin uses a neutral carrier label. */
const adminShipPayload = () => ({
  tracking_number: `ADM-${Date.now()}`,
  shipping_carrier: "Admin",
});

/**
 * Move an order toward `toStatus` using the same POST routes as sellers/buyers.
 * Does not support moving “backward” in the pipeline (except cancel).
 */
const advanceOrderToTargetStatus = async (orderId, fromStatus, toStatus) => {
  if (fromStatus === toStatus) return;

  if (toStatus === "cancelled") {
    const res = await api.post(`/orders/${orderId}/cancel`);
    assertOrderResponseOk(res, "Cancel failed");
    return;
  }

  if (fromStatus === "cancelled") {
    throw new Error("Cannot change a cancelled order.");
  }

  const fromR = STATUS_RANK[fromStatus];
  const toR = STATUS_RANK[toStatus];
  if (toR < fromR) {
    throw new Error(
      "Moving to an earlier stage is not supported here. Refresh the list or adjust the order through the normal seller/buyer flow."
    );
  }

  let cur = fromStatus;
  let guard = 0;

  while (cur !== toStatus && guard++ < 10) {
    if (cur === "pending") {
      const res = await api.post(`/orders/${orderId}/confirm`);
      assertOrderResponseOk(res, "Confirm failed");
      cur = "confirmed";
      continue;
    }

    if (cur === "confirmed") {
      if (toStatus === "processing") {
        const res = await api.post(`/orders/${orderId}/process`);
        assertOrderResponseOk(res, "Mark processing failed");
        cur = "processing";
        continue;
      }
      if (toStatus === "shipped" || toStatus === "delivered") {
        const res = await api.post(`/orders/${orderId}/ship`, adminShipPayload());
        assertOrderResponseOk(res, "Mark shipped failed");
        cur = "shipped";
        continue;
      }
    }

    if (cur === "processing" && (toStatus === "shipped" || toStatus === "delivered")) {
      const res = await api.post(`/orders/${orderId}/ship`, adminShipPayload());
      assertOrderResponseOk(res, "Mark shipped failed");
      cur = "shipped";
      continue;
    }

    if (cur === "shipped" && toStatus === "delivered") {
      const res = await api.post(`/orders/${orderId}/confirm-delivery`);
      assertOrderResponseOk(res, "Confirm delivery failed");
      cur = "delivered";
      continue;
    }

    throw new Error(`Cannot advance order from “${cur}” to “${toStatus}”.`);
  }
};

// ── UI bits ───────────────────────────────────────────────────────────────────

const Badge = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
    ${STATUS_COLORS[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}`}
  >
    {status || "pending"}
  </span>
);
const formatMmk = (n, currency = "MMK") => {
  const num = Number(n) || 0;
  const formattedNumber = new Intl.NumberFormat("en-MM", { minimumFractionDigits: 0 }).format(num);
  return formattedNumber + " " + currency;
};

const sellerPayoutAmount = (order) => {
  const subtotal = Number(order?.subtotal_amount) || 0;
  const commission = Number(order?.commission_amount) || 0;
  return Math.max(0, subtotal - commission);
};

const PaymentBadge = ({ status }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize
    ${PAYMENT_STATUS_COLORS[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}
  >
    {status || "pending"}
  </span>
);

const EscrowBadge = ({ status }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize
    ${ESCROW_STATUS_COLORS[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}
  >
    {(status || "not_applicable").replaceAll("_", " ")}
  </span>
);

const AdminPaymentCell = ({ order }) => (
  <div className="space-y-1.5 min-w-[128px]">
    <PaymentBadge status={order.payment_status} />
    <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase">
      {order.payment_method || "-"}
    </div>
    {(order.transaction_id || order.payment_reference) && (
      <div
        className="max-w-[132px] truncate font-mono text-[10px] text-gray-400 dark:text-gray-500"
        title={order.transaction_id || order.payment_reference}
      >
        {order.transaction_id || order.payment_reference}
      </div>
    )}
  </div>
);

const AdminFundCell = ({ order }) => (
  <div className="space-y-1 min-w-[148px] text-xs">
    <div className="font-semibold text-gray-900 dark:text-white">{formatMmk(order.total_amount)}</div>
    <div className="text-gray-500 dark:text-gray-400">Seller: {formatMmk(sellerPayoutAmount(order))}</div>
    <div className="text-gray-500 dark:text-gray-400">Commission: {formatMmk(order.commission_amount)}</div>
    <EscrowBadge status={order.escrow_status} />
  </div>
);

const OrderDetailModal = ({ order, onClose }) => {
  const [displayOrder, setDisplayOrder] = useState(order);

  useEffect(() => {
    setDisplayOrder(order);
  }, [order]);

  if (!displayOrder) return null;

  const shipAddr = parseShippingAddress(displayOrder.shipping_address);
  const name = shipAddr?.full_name || shipAddr?.name || "—";
  const phone = shipAddr?.phone;
  const addrLine = [shipAddr?.address, shipAddr?.city, shipAddr?.state].filter(Boolean).join(", ");
  const delivery = displayOrder.delivery;
  const fmt = (n) => formatMmk(n);
  const sellerPayout = sellerPayoutAmount(displayOrder);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="font-bold text-gray-900 dark:text-white">Order #{displayOrder.order_number || displayOrder.id}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 dark:text-gray-500 text-xs">Status</p>
              <Badge status={displayOrder.status} />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-500 text-xs">Date</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {displayOrder.created_at ? new Date(displayOrder.created_at).toLocaleString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-500 text-xs">Buyer</p>
              <p className="font-medium text-gray-900 dark:text-white">{displayOrder.buyer?.name || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-500 text-xs">Payment</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <PaymentBadge status={displayOrder.payment_status} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  {displayOrder.payment_method || "-"}
                </span>
              </div>
              {(displayOrder.transaction_id || displayOrder.payment_reference) && (
                <p className="mt-1 font-mono text-[11px] text-gray-500 dark:text-gray-400 break-all">
                  {displayOrder.transaction_id || displayOrder.payment_reference}
                </p>
              )}
            </div>
          </div>

          {displayOrder.items?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Items</p>
              <div className="divide-y divide-gray-50 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                {displayOrder.items.map((item, i) => (
                  <div key={item.id ?? i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{fmt(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white">{fmt(displayOrder.subtotal_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Shipping</span>
              <span className="text-gray-900 dark:text-white">{fmt(displayOrder.shipping_fee)}</span>
            </div>
            {(displayOrder.coupon_discount_amount ?? 0) > 0 && (
              <div className="flex justify-between text-green-700 dark:text-green-400">
                <span>Coupon</span>
                <span>− {fmt(displayOrder.coupon_discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-gray-200 dark:border-gray-600 pt-2">
              <span className="text-gray-900 dark:text-white">Collected by admin</span>
              <span className="text-green-700 dark:text-green-400">{fmt(displayOrder.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Seller payout</span>
              <span className="text-gray-900 dark:text-white">{fmt(sellerPayout)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Commission</span>
              <span className="text-gray-900 dark:text-white">{fmt(displayOrder.commission_amount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
              <span className="text-gray-500 dark:text-gray-400">Escrow</span>
              <EscrowBadge status={displayOrder.escrow_status} />
            </div>
          </div>

          {shipAddr && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Ship to</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{name}</span>
                {phone && (
                  <>
                    <br />
                    {phone}
                  </>
                )}
                {addrLine && (
                  <>
                    <br />
                    {addrLine}
                  </>
                )}
              </p>
            </div>
          )}

          {delivery && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 bg-gray-50/80 dark:bg-gray-900/40">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                <TruckIcon className="h-4 w-4" />
                Delivery
              </p>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p>
                  <span className="text-gray-500 dark:text-gray-400">Method:</span>{" "}
                  {deliveryMethodLabel(delivery.delivery_method)}
                </p>
                {delivery.status && (
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>{" "}
                    <span className="capitalize">{formatDeliveryStatus(delivery.status)}</span>
                  </p>
                )}
                {delivery.tracking_number && (
                  <p className="font-mono text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Tracking:</span> {delivery.tracking_number}
                  </p>
                )}
                {delivery.pickup_address && (
                  <p className="text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Pickup:</span> {delivery.pickup_address}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

const OrderManagement = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);

  const fmt = (n) => formatMmk(n, t('common.currency.mmk', 'MMK'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelected] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const PER_PAGE = 15;

  const flash = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/orders");
      const data = res.data.data || res.data;
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const refreshOrderById = async (orderId) => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      const fresh = res.data?.data;
      if (!fresh) return null;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...fresh, status: fresh.status } : o)));
      setSelected((prev) => (prev && prev.id === orderId ? fresh : prev));
      return fresh;
    } catch {
      return null;
    }
  };

  const openOrderDetail = async (row) => {
    setSelected(row);
    try {
      const res = await api.get(`/orders/${row.id}`);
      const full = res.data?.data;
      if (full) setSelected(full);
    } catch {
      flash("Could not load full order details; showing list row only.", "error");
    }
  };

  /**
   * @returns {Promise<boolean>}
   */
  const updateStatus = async (orderId, newStatus) => {
    const row = orders.find((o) => o.id === orderId);
    const fromStatus = row?.status || "pending";
    if (fromStatus === newStatus) return true;

    setStatusUpdatingId(orderId);
    try {
      await advanceOrderToTargetStatus(orderId, fromStatus, newStatus);
      await fetchOrders();
      await refreshOrderById(orderId);
      flash("Order status updated.");
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update status.";
      flash(msg, "error");
      await fetchOrders();
      await refreshOrderById(orderId);
      return false;
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      (o.order_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.buyer?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium
          ${
            toast.type === "success"
              ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
          ) : (
            <XCircleIcon className="h-4 w-4 flex-shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchOrders}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search order # or buyer…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500"
        >
          {["all", ...ORDER_STATUS_OPTIONS].map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All status" : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 dark:text-red-400 text-sm">
            {error}
            <button type="button" onClick={fetchOrders} className="ml-2 underline">
              Retry
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-14 text-center text-gray-400 dark:text-gray-500 text-sm">
            {search || statusFilter !== "all" ? "No orders match your filters." : "No orders yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Order #", "Date", "Buyer", "Fund", "Payment", "Status", "Delivery", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {paginated.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      #{order.order_number || order.id}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{order.buyer?.name || "—"}</td>
                    <td className="px-4 py-3 align-top">
                      <AdminFundCell order={order} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <AdminPaymentCell order={order} />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status || "pending"}
                        disabled={statusUpdatingId === order.id}
                        onChange={(e) => {
                          const next = e.target.value;
                          updateStatus(order.id, next);
                        }}
                        className="text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 py-1 focus:ring-1 focus:ring-green-400 disabled:opacity-50 disabled:cursor-wait"
                      >
                        {ORDER_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <AdminDeliveryCell order={order} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openOrderDetail(order)}
                        className="flex items-center gap-1 text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 text-xs font-medium"
                      >
                        <EyeIcon className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-sm">
            <span className="text-gray-400 dark:text-gray-500">
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default OrderManagement;
