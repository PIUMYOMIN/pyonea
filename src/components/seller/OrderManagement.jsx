// components/seller/OrderManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  XCircleIcon,
  EyeIcon,
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import api from "../../utils/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMMK = (amount) =>
  new Intl.NumberFormat("en-MM", { style: "currency", currency: "MMK", minimumFractionDigits: 0 }).format(amount || 0);

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const STATUS_COLOR = {
  pending:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  shipped:    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  delivered:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const DELIVERY_STATUS_COLOR = {
  pending:          "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
  awaiting_pickup:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  picked_up:        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_transit:       "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  out_for_delivery: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  delivered:        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  failed:           "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  cancelled:        "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
};

const formatStatus = (s) => (s || "").replaceAll("_", " ");

const calculatePlatformFee = (weight = 5) => 5000 + weight * 100;
const parseShippingAddress = (shippingAddress) => {
  if (!shippingAddress) return {};
  if (typeof shippingAddress === "string") {
    try {
      return JSON.parse(shippingAddress);
    } catch {
      return {};
    }
  }
  return shippingAddress;
};

// ─── Delivery Method Modal ─────────────────────────────────────────────────────
const DeliveryMethodModal = ({ order, onConfirm, onClose, loading }) => {
  if (!order) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Set Delivery Method
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Order #{order.order_number || order.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200
                       hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
        {/* Body */}
        <div className="p-5">
          <DeliveryMethodPanel order={order} onConfirm={onConfirm} loading={loading} />
        </div>
      </div>
    </div>
  );
};

// ─── Delivery Method Modal ─────────────────────────────────────────────────────
// Shown inline inside the Order Details modal when the order is confirmed
// and no delivery method has been set yet.
const DeliveryMethodPanel = ({ order, onConfirm, loading }) => {
  const [method, setMethod]             = useState("supplier");
  const [pickupAddress, setPickupAddress] = useState("");
  const [addressError, setAddressError] = useState("");

  const weight    = order.delivery?.package_weight ?? 5;
  const platformFee = calculatePlatformFee(weight);

  const handleConfirm = () => {
    // Pickup address required for platform logistics; optional for self-delivery
    if (method === "platform" && !pickupAddress.trim()) {
      setAddressError("Pickup address is required for platform logistics");
      return;
    }
    onConfirm(method, pickupAddress.trim());
  };

  return (
    <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 space-y-4">
      <div className="flex items-start gap-2">
        <ExclamationCircleIcon className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Choose Delivery Method</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Select how this order will be delivered to the customer before marking it as shipped.
          </p>
        </div>
      </div>

      {/* Method cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Self Delivery */}
        <button
          type="button"
          onClick={() => setMethod("supplier")}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            method === "supplier"
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
              <TruckIcon className="h-5 w-5 text-gray-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Self Delivery</p>
              <p className="text-xs text-green-600 font-medium">Free</p>
            </div>
          </div>
          <ul className="text-xs text-gray-500 dark:text-slate-400 space-y-0.5 pl-1">
            <li>• You arrange and track delivery</li>
            <li>• No platform fee charged</li>
            <li>• Full control over the process</li>
          </ul>
        </button>

        {/* Platform Logistics */}
        <button
          type="button"
          onClick={() => setMethod("platform")}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            method === "platform"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <BuildingStorefrontIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Platform Logistics</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{formatMMK(platformFee)} fee</p>
            </div>
          </div>
          <ul className="text-xs text-gray-500 dark:text-slate-400 space-y-0.5 pl-1">
            <li>• Courier collects from your address</li>
            <li>• Real-time tracking for customer</li>
            <li>• Platform handles communication</li>
          </ul>
        </button>
      </div>

      {/* Pickup address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {method === "platform" ? (
            <>Pickup Address <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 dark:text-slate-400 font-normal ml-1">
                (where the courier collects the package)
              </span>
            </>
          ) : (
            <>Your Warehouse / Store Address
              <span className="text-xs text-gray-500 dark:text-slate-400 font-normal ml-1">(optional)</span>
            </>
          )}
        </label>
        <div className="relative">
          <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={pickupAddress}
            onChange={(e) => { setPickupAddress(e.target.value); setAddressError(""); }}
            placeholder={
              method === "platform"
                ? "e.g. No. 12, Merchant St, Yangon"
                : "e.g. Your store address (optional)"
            }
            className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 ${
              addressError ? "border-red-400 focus:ring-red-400" : "border-gray-300 dark:border-slate-600 focus:ring-green-500"
            } focus:outline-none focus:ring-2`}
          />
        </div>
        {addressError && (
          <p className="text-xs text-red-500 mt-1">{addressError}</p>
        )}
      </div>

      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Saving...</>
        ) : (
          <>Confirm {method === "supplier" ? "Self Delivery" : "Platform Logistics"}</>
        )}
      </button>
    </div>
  );
};

// ─── Platform Tracking Timeline ───────────────────────────────────────────────
const DeliveryTracking = ({ delivery, onRefresh, refreshing }) => {
  if (!delivery || delivery.delivery_method !== "platform") return null;

  const TIMELINE = [
    { status: "awaiting_pickup",  label: "Awaiting Pickup",    icon: "📦" },
    { status: "picked_up",        label: "Picked Up",          icon: "🛵" },
    { status: "in_transit",       label: "In Transit",         icon: "🚛" },
    { status: "out_for_delivery", label: "Out for Delivery",   icon: "📍" },
    { status: "delivered",        label: "Delivered",          icon: "✅" },
  ];

  const currentIdx = TIMELINE.findIndex((t) => t.status === delivery.status);

  return (
    <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
          <TruckIcon className="h-4 w-4" />
          Platform Logistics Tracking
        </p>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs flex items-center gap-1 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Status badge */}
      <div className="mb-3">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          DELIVERY_STATUS_COLOR[delivery.status] ?? "bg-gray-100 text-gray-700"
        }`}>
          {formatStatus(delivery.status)}
        </span>
        {delivery.tracking_number && (
          <span className="ml-2 text-xs text-blue-700 font-mono">#{delivery.tracking_number}</span>
        )}
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TIMELINE.map((step, idx) => {
          const done    = idx <= currentIdx;
          const current = idx === currentIdx;
          return (
            <React.Fragment key={step.status}>
              <div className={`flex flex-col items-center min-w-[60px] ${done ? "opacity-100" : "opacity-40"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base ${
                  current ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-800" : ""
                } ${done ? "bg-blue-500" : "bg-gray-200 dark:bg-slate-600"}`}>
                  {done && !current
                    ? <CheckCircleSolid className="h-5 w-5 text-white" />
                    : <span>{step.icon}</span>
                  }
                </div>
                <span className="text-[10px] text-center mt-1 text-gray-600 dark:text-slate-400 leading-tight max-w-[60px]">
                  {step.label}
                </span>
              </div>
              {idx < TIMELINE.length - 1 && (
                <div className={`flex-1 h-0.5 min-w-[16px] ${idx < currentIdx ? "bg-blue-500" : "bg-gray-200 dark:bg-slate-600"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Courier info */}
      {delivery.platformCourier && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
          <span className="font-medium">Courier:</span> {delivery.platformCourier.name}
          {delivery.assigned_driver_phone && (
            <span className="ml-2">· {delivery.assigned_driver_phone}</span>
          )}
        </div>
      )}

      {delivery.pickup_address && (
        <div className="mt-2 text-xs text-blue-700 dark:text-blue-400">
          <span className="font-medium">Pickup from:</span> {delivery.pickup_address}
        </div>
      )}
    </div>
  );
};

// ─── Order Details Modal ───────────────────────────────────────────────────────
const OrderDetailsModal = ({
  order,
  isOpen,
  onClose,
  onStatusUpdate,
  onDeliveryMethodSet,
  actionLoading,
}) => {
  const [delivery, setDelivery]         = useState(order.delivery || null);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState(null);

  if (!isOpen) return null;

  const shippingAddress = parseShippingAddress(order.shipping_address);

  const needsDeliveryMethod =
    order.status === "confirmed" &&
    (!delivery || !delivery.delivery_method || delivery.delivery_method === "pending");

  const isPlatform = delivery?.delivery_method === "platform";
  const isSelfDelivery = delivery?.delivery_method === "supplier";

  const handleDeliveryMethodConfirm = async (method, pickupAddress) => {
    setError(null);
    const success = await onDeliveryMethodSet(order.id, method, pickupAddress);
    if (success) {
      // Re-fetch delivery info to show tracking
      try {
        const res = await api.get(`/deliveries?order_id=${order.id}`);
        const d = res.data.data?.data?.[0] ?? res.data.data?.[0] ?? null;
        setDelivery(d);
      } catch { /* best-effort */ }
    }
  };

  const refreshDelivery = async () => {
    setRefreshing(true);
    try {
      const res = await api.get(`/deliveries?order_id=${order.id}`);
      const d = res.data.data?.data?.[0] ?? res.data.data?.[0] ?? null;
      setDelivery(d);
    } catch (err) {
      console.error("Failed to refresh delivery:", err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">

          {/* Header */}
          <div className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Order #{order.order_number || order.id}
                </h3>
                <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300"}`}>
                  <span className="capitalize">{order.status}</span>
                </span>
              </div>
              <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-500 dark:hover:text-slate-300">
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 px-6 py-4 max-h-[75vh] overflow-y-auto space-y-6">

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Order Items */}
              <div>
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                  Items ({order.items?.length || 0})
                </h4>
                <div className="space-y-2">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden flex-shrink-0">
                        <img
                          src={item.product_data?.images?.[0]?.url || "/placeholder-product.png"}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = "/placeholder-product.png"; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 line-clamp-2">{item.product_name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Qty: {item.quantity} · {formatMMK(item.price)} each</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex-shrink-0">{formatMMK(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">

                {/* Shipping address */}
                <div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Delivery Address</h4>
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm text-gray-700 dark:text-slate-300 space-y-0.5">
                    <p className="font-medium">{shippingAddress?.full_name}</p>
                    {shippingAddress?.phone && <p>📞 {shippingAddress.phone}</p>}
                    <p className="mt-1">{shippingAddress?.address}</p>
                    {shippingAddress?.city && (
                      <p>{shippingAddress.city}{shippingAddress.state ? `, ${shippingAddress.state}` : ""}</p>
                    )}
                  </div>
                </div>

                {/* Order summary */}
                <div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Order Summary</h4>
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm space-y-1.5">
                    <div className="flex justify-between text-gray-600 dark:text-slate-400">
                      <span>Subtotal</span><span>{formatMMK(order.subtotal_amount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-slate-400">
                      <span>Shipping</span><span>{formatMMK(order.shipping_fee)}</span>
                    </div>
                    {order.tax_amount > 0 && (
                      <div className="flex justify-between text-gray-600 dark:text-slate-400">
                        <span>Tax</span><span>{formatMMK(order.tax_amount)}</span>
                      </div>
                    )}
                    {order.coupon_discount_amount > 0 && (
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>Coupon</span><span>-{formatMMK(order.coupon_discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-1.5 border-t border-gray-200 dark:border-slate-600 dark:text-white">
                      <span>Total</span>
                      <span className="text-green-600 dark:text-green-400">{formatMMK(order.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* ── DELIVERY SECTION ── */}

                {/* Step 1: Choose method (only when confirmed, no method set yet) */}
                {needsDeliveryMethod && (
                  <DeliveryMethodPanel
                    order={order}
                    onConfirm={handleDeliveryMethodConfirm}
                    loading={actionLoading === `delivery-${order.id}`}
                  />
                )}

                {/* Step 2a: Self delivery — show current status, seller can mark steps */}
                {isSelfDelivery && delivery && (
                  <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <p className="text-sm font-semibold text-green-900 dark:text-green-300 flex items-center gap-2 mb-2">
                      <TruckIcon className="h-4 w-4" />
                      Self Delivery
                    </p>
                    <div className="space-y-1 text-xs text-green-800 dark:text-green-300">
                      <p>
                        <span className="font-medium">Status:</span>{" "}
                        <span className={`inline-flex px-2 py-0.5 rounded-full ${DELIVERY_STATUS_COLOR[delivery.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {formatStatus(delivery.status)}
                        </span>
                      </p>
                      {delivery.pickup_address && (
                        <p><span className="font-medium">Pickup:</span> {delivery.pickup_address}</p>
                      )}
                      {delivery.tracking_number && (
                        <p><span className="font-medium">Tracking:</span> {delivery.tracking_number}</p>
                      )}
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                      You manage this delivery. Use the "Mark as Shipped" button below when dispatched.
                    </p>
                  </div>
                )}

                {/* Step 2b: Platform logistics — full tracking */}
                {isPlatform && delivery && (
                  <DeliveryTracking
                    delivery={delivery}
                    onRefresh={refreshDelivery}
                    refreshing={refreshing}
                  />
                )}

              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-3 flex justify-end gap-3 border-t border-gray-200 dark:border-slate-700">
            {/* Confirm order */}
            {order.status === "pending" && (
              <button
                onClick={() => { onStatusUpdate(order.id, "confirmed"); onClose(); }}
                disabled={actionLoading === order.id}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Confirm Order
              </button>
            )}

            {/* Mark as shipped — only for self delivery after method is chosen */}
            {order.status === "confirmed" && isSelfDelivery && (
              <button
                onClick={() => { onStatusUpdate(order.id, "shipped"); onClose(); }}
                disabled={actionLoading === order.id}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Mark as Shipped
              </button>
            )}

            {/* Platform: no ship button — courier handles it */}
            {order.status === "confirmed" && isPlatform && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs">
                Waiting for platform courier to collect
              </div>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const OrderManagement = () => {
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [orders, setOrders]                 = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedOrder, setSelectedOrder]   = useState(null);
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [error, setError]                   = useState(null);
  const [actionLoading, setActionLoading]   = useState(null);
  const [downloadingSlip, setDownloadingSlip] = useState(null);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null);

  const statuses = [
    { id: "all",        name: t("seller.order.all_orders", "All Orders")  },
    { id: "pending",    name: t("seller.order.pending",    "Pending")     },
    { id: "confirmed",  name: t("seller.order.confirmed",  "Confirmed")   },
    { id: "processing", name: t("seller.order.processing", "Processing")  },
    { id: "shipped",    name: t("seller.order.shipped",    "Shipped")     },
    { id: "delivered",  name: t("seller.order.delivered",  "Delivered")   },
    { id: "cancelled",  name: t("seller.order.cancelled",  "Cancelled")   },
  ];

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/orders");
      setOrders(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      setActionLoading(orderId);
      setError(null);
      const endpoints = { confirmed: "confirm", processing: "process", shipped: "ship" };
      const endpoint  = endpoints[status];
      if (!endpoint) return;

      const data = status === "shipped"
        ? { tracking_number: `TRK-${Date.now()}`, shipping_carrier: "Self Delivery" }
        : {};

      const res = await api.post(`/orders/${orderId}/${endpoint}`, data);
      if (res.data.success) {
        await fetchOrders();
      } else {
        setError(res.data.message || "Failed to update order");
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to update order status`);
    } finally {
      setActionLoading(null);
    }
  };

  // Returns true on success so the modal can refresh its delivery state
  const handleDeliveryMethodSet = async (orderId, method, pickupAddress) => {
    try {
      setActionLoading(`delivery-${orderId}`);
      setError(null);

      const weight      = orders.find((o) => o.id === orderId)?.delivery?.package_weight ?? 5;
      const platformFee = method === "platform" ? calculatePlatformFee(weight) : 0;

      const res = await api.post(`/seller/delivery/${orderId}/delivery-method`, {
        delivery_method:       method,
        platform_delivery_fee: platformFee,
        pickup_address:        pickupAddress || undefined,
      });

      if (res.data.success) {
        await fetchOrders();
        // Also refresh the selectedOrder so the modal shows the updated delivery
        const updated = (await api.get("/orders")).data.data?.find((o) => o.id === orderId);
        if (updated) setSelectedOrder(updated);
        return true;
      } else {
        setError(res.data.message || "Failed to set delivery method");
        return false;
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to set delivery method");
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = selectedStatus === "all"
    ? orders
    : orders.filter((o) => o.status === selectedStatus);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
      </div>
    );
  }

  // ── Order Slip Download ────────────────────────────────────────────────────
  const downloadOrderSlip = async (order) => {
    setDownloadingSlip(order.id);
    try {
      // Build the slip HTML as a string so it renders independently
      // without needing a visible DOM element — same approach as PaymentSuccess
      const address = typeof order.shipping_address === 'string'
        ? JSON.parse(order.shipping_address)
        : (order.shipping_address ?? {});

      const items = (order.items ?? []).map(item => `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 8px;">
            <div style="font-weight:500;">${item.product_name ?? 'Product'}</div>
            <div style="font-size:11px;color:#6b7280;">SKU: ${item.product_sku ?? item.sku ?? 'N/A'}</div>
          </td>
          <td style="padding:10px 8px;text-align:center;">${item.quantity ?? 0}</td>
          <td style="padding:10px 8px;text-align:right;">${formatMMK(item.unit_price ?? item.price ?? 0)}</td>
          <td style="padding:10px 8px;text-align:right;font-weight:500;">${formatMMK(item.subtotal ?? ((item.unit_price ?? item.price ?? 0) * (item.quantity ?? 1)))}</td>
        </tr>
      `).join('');

      const subtotal = order.subtotal_amount ?? 0;
      const shipping = order.shipping_fee ?? 0;
      const tax      = order.tax_amount ?? 0;
      const discount = order.coupon_discount_amount ?? 0;
      const total    = order.total_amount ?? 0;

      const statusColor = {
        delivered: '#16a34a', confirmed: '#2563eb', processing: '#7c3aed',
        shipped: '#0891b2', pending: '#d97706', cancelled: '#dc2626',
      }[order.status] ?? '#374151';

      const html = `
        <div id="order-slip-content" style="
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          font-size:13px; color:#1f2937; background:#fff;
          width:700px; padding:40px; box-sizing:border-box;
        ">
          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #16a34a;padding-bottom:20px;margin-bottom:24px;">
            <div>
              <div style="font-size:26px;font-weight:700;color:#16a34a;letter-spacing:-0.5px;font-family:'Torus',sans-serif;">Pyonea</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;">Myanmar B2B Marketplace</div>
              <div style="font-size:11px;color:#6b7280;">support@pyonea.com · +95 9 792 115 547</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:16px;font-weight:700;color:#111827;">ORDER SLIP</div>
              <div style="font-size:20px;font-weight:800;font-family:monospace;color:#16a34a;margin-top:4px;">${order.order_number}</div>
              <div style="margin-top:6px;display:inline-block;background:${statusColor}20;color:${statusColor};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;">
                ${order.status}
              </div>
            </div>
          </div>

          <!-- Meta row -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
            <div>
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;margin-bottom:8px;">Customer</div>
              <div style="font-weight:600;">${address.full_name ?? 'N/A'}</div>
              <div style="color:#6b7280;">${address.phone ?? ''}</div>
              <div style="color:#6b7280;font-size:12px;">${address.email ?? ''}</div>
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;margin-bottom:8px;">Shipping Address</div>
              <div>${address.address ?? 'N/A'}</div>
              <div style="color:#6b7280;">${[address.city, address.state].filter(Boolean).join(', ')}</div>
              <div style="color:#6b7280;">${address.country ?? 'Myanmar'}</div>
            </div>
          </div>

          <!-- Order dates -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;background:#f9fafb;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:12px;">
            <div><span style="color:#9ca3af;">Order Date</span><br/><strong>${new Date(order.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</strong></div>
            <div><span style="color:#9ca3af;">Payment</span><br/><strong>${(order.payment_method ?? '').replace(/_/g,' ').toUpperCase() || 'N/A'}</strong></div>
            <div><span style="color:#9ca3af;">Payment Status</span><br/><strong style="color:${order.payment_status==='paid'?'#16a34a':'#d97706'}">${(order.payment_status ?? 'pending').toUpperCase()}</strong></div>
          </div>

          <!-- Items table -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <thead>
              <tr style="border-bottom:2px solid #e5e7eb;">
                <th style="text-align:left;padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Item</th>
                <th style="text-align:center;padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Qty</th>
                <th style="text-align:right;padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Unit Price</th>
                <th style="text-align:right;padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${items}</tbody>
          </table>

          <!-- Totals -->
          <div style="margin-left:auto;max-width:260px;font-size:13px;">
            <div style="display:flex;justify-content:space-between;padding:6px 0;color:#6b7280;">
              <span>Subtotal</span><span>${formatMMK(subtotal)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;color:#6b7280;">
              <span>Shipping</span><span>${formatMMK(shipping)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;color:#6b7280;">
              <span>Tax</span><span>${formatMMK(tax)}</span>
            </div>
            ${discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;color:#16a34a;">
              <span>Discount</span><span>-${formatMMK(discount)}</span>
            </div>` : ''}
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid #e5e7eb;font-weight:700;font-size:15px;">
              <span>Total</span><span style="color:#16a34a;">${formatMMK(total)}</span>
            </div>
          </div>

          <!-- Footer -->
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;">
            <div>Generated by Pyonea Marketplace · ${new Date().toLocaleString('en-GB')}</div>
            <div style="margin-top:4px;">This is a computer-generated document. No signature required.</div>
          </div>
        </div>
      `;

      // Render off-screen
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;background:#fff;';
      container.innerHTML = html;
      document.body.appendChild(container);

      const el = container.querySelector('#order-slip-content');

      // Ensure Torus font is loaded before rendering (it's declared in index.css)
      await document.fonts.load('700 1em Torus');
      await document.fonts.ready;

      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
        width: el.scrollWidth, height: el.scrollHeight,
      });
      document.body.removeChild(container);

      const imgData  = canvas.toDataURL('image/png');
      const pdf      = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const pageH    = 277;
      const imgH     = (canvas.height * imgWidth) / canvas.width;
      let left       = imgH;
      let pos        = 10;

      pdf.addImage(imgData, 'PNG', 10, pos, imgWidth, imgH);
      left -= pageH;
      while (left >= 0) {
        pos = left - imgH + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, pos, imgWidth, imgH);
        left -= pageH;
      }
      pdf.save(`Order_Slip_${order.order_number}.pdf`);

    } catch (err) {
      console.error('Slip download failed:', err);
    } finally {
      setDownloadingSlip(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("seller.order.order_management", "Order Management")}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Confirm orders and choose how each order will be delivered
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <XCircleIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStatus(s.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedStatus === s.id
                ? "bg-green-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            {s.name}
            {s.id !== "all" && (
              <span className="ml-1.5 text-xs opacity-75">
                ({orders.filter((o) => o.status === s.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 shadow rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                {["Order ID", "Date", "Customer", "Items", "Amount", "Status", "Delivery", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredOrders.map((order) => {
                const shippingAddress = parseShippingAddress(order.shipping_address);

                const deliveryMethod = order.delivery?.delivery_method;
                const deliveryStatus = order.delivery?.status;
                const needsMethod = order.status === "confirmed" && (!deliveryMethod || deliveryMethod === "pending");

                return (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                      #{order.order_number || order.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {shippingAddress?.full_name || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                      {order.items?.length || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                      {formatMMK(order.total_amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                        <span className="capitalize">{order.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {needsMethod ? (
                        <button
                          onClick={() => setDeliveryModalOrder(order)}
                          className="inline-flex items-center px-2 py-0.5 rounded-full
                                     bg-amber-100 hover:bg-amber-200
                                     dark:bg-amber-900/30 dark:hover:bg-amber-800/50
                                     text-amber-800 dark:text-amber-300 gap-1
                                     transition-colors cursor-pointer"
                          title="Click to set delivery method"
                        >
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          Set delivery
                        </button>
                      ) : deliveryMethod ? (
                        <div className="space-y-0.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                            deliveryMethod === "platform" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          }`}>
                            {deliveryMethod === "platform" ? "Platform" : "Self"}
                          </span>
                          {deliveryStatus && (
                            <div>
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] ${DELIVERY_STATUS_COLOR[deliveryStatus] ?? "bg-gray-100 text-gray-700"}`}>
                                {formatStatus(deliveryStatus)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 space-x-2">
                      <button
                        onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }}
                        className="text-green-600 hover:text-green-900 dark:hover:text-green-400"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => downloadOrderSlip(order)}
                        disabled={downloadingSlip === order.id}
                        className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-wait"
                        title="Download order slip"
                      >
                        {downloadingSlip === order.id
                          ? <ArrowPathIcon className="h-5 w-5 animate-spin" />
                          : <ArrowDownTrayIcon className="h-5 w-5" />}
                      </button>
                      {order.status === "pending" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "confirmed")}
                          disabled={actionLoading === order.id}
                          className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 text-xs font-medium disabled:opacity-50"
                        >
                          {actionLoading === order.id ? "..." : "Confirm"}
                        </button>
                      )}
                      {needsMethod && (
                        <button
                          onClick={() => setDeliveryModalOrder(order)}
                          disabled={actionLoading === `delivery-${order.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg
                                     bg-amber-500 hover:bg-amber-600 active:bg-amber-700
                                     text-white text-xs font-semibold
                                     shadow-sm transition-colors disabled:opacity-50"
                          title="Set delivery method"
                        >
                          <TruckIcon className="h-3.5 w-3.5" />
                          Set Delivery
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBagIcon className="h-14 w-14 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">No orders found</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">No orders match the selected status filter.</p>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-3 text-sm text-gray-500 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {deliveryModalOrder && (
        <DeliveryMethodModal
          order={deliveryModalOrder}
          loading={actionLoading === `delivery-${deliveryModalOrder.id}`}
          onClose={() => setDeliveryModalOrder(null)}
          onConfirm={async (method, pickupAddress) => {
            const ok = await handleDeliveryMethodSet(
              deliveryModalOrder.id,
              method,
              pickupAddress
            );
            if (ok) setDeliveryModalOrder(null);
          }}
        />
      )}
      
      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedOrder(null); }}
          onStatusUpdate={updateOrderStatus}
          onDeliveryMethodSet={handleDeliveryMethodSet}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
};

export default OrderManagement;