// src/pages/Client/BuyerDashboard.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  ShoppingBagIcon, ShoppingCartIcon, UserIcon, EnvelopeIcon, PhoneIcon,
  CreditCardIcon, MapPinIcon, EyeIcon, TruckIcon, CheckCircleIcon,
  ClockIcon, XCircleIcon, HeartIcon, CogIcon, ChartBarIcon, HomeIcon,
  DocumentTextIcon, BuildingStorefrontIcon, PencilSquareIcon,
  ArrowPathIcon, ExclamationTriangleIcon, TrashIcon, DocumentArrowDownIcon,
  ReceiptRefundIcon, PrinterIcon, Bars3Icon, XMarkIcon, BellIcon, GiftIcon,
  SunIcon, MoonIcon
} from "@heroicons/react/24/outline";
import api from "../../utils/api";
import { getImageUrl } from "../../utils/imageHelpers";
import NotificationPreferences from "../../components/Shared/NotificationPreferences";
import NotificationsPanel from "../../components/Shared/NotificationsPanel";
import { NotificationBell } from "../../components/Shared/NotificationsPanel";
import ReferralPanel from "../../components/Shared/ReferralPanel";
import { useTheme } from "../../context/ThemeContext";

// ─── Utilities ────────────────────────────────────────────────────────────────
const formatMMK = (n) =>
  new Intl.NumberFormat("en-MM", { style: "currency", currency: "MMK", minimumFractionDigits: 0 }).format(n || 0);

const formatDate = (d, opts) =>
  new Date(d).toLocaleDateString("en-US", opts || { year: "numeric", month: "short", day: "numeric" });

const formatDateTime = (d) =>
  new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function classNames(...cls) { return cls.filter(Boolean).join(" "); }

// ─── Status Badges ────────────────────────────────────────────────────────────
const ORDER_STATUS = {
  pending:    { color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700", Icon: ClockIcon,        key: "pending"     },
  confirmed:  { color: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700",             Icon: CheckCircleIcon,  key: "confirmed"   },
  processing: { color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700", Icon: ClockIcon,        key: "processing"  },
  shipped:    { color: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700", Icon: TruckIcon,        key: "shipped"     },
  delivered:  { color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700",       Icon: CheckCircleIcon,  key: "delivered"   },
  cancelled:  { color: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700",                  Icon: XCircleIcon,      key: "cancelled"   },
};
const DELIVERY_STATUS = {
  pending:          { color: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300",             key: "pending"          },
  awaiting_pickup:  { color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",   key: "awaiting_pickup"  },
  picked_up:        { color: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",           key: "picked_up"        },
  in_transit:       { color: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",   key: "in_transit"       },
  out_for_delivery: { color: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",   key: "out_for_delivery" },
  delivered:        { color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",       key: "delivered"        },
  failed:           { color: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",               key: "failed"           },
  cancelled:        { color: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300",             key: "cancelled"        },
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const cfg = ORDER_STATUS[status] || ORDER_STATUS.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      <cfg.Icon className="h-3 w-3" />{t(`buyer_dashboard.order_status.${cfg.key}`, cfg.key)}
    </span>
  );
};

// ─── Pay Slip Generator ───────────────────────────────────────────────────────
// Opens a new browser window with a fully formatted receipt and triggers print.
// The browser print dialog allows "Save as PDF" on all platforms — no external
// library required.
const generatePaySlipHTML = (order, delivery = null) => {
  const addr = typeof order.shipping_address === "string"
    ? JSON.parse(order.shipping_address) : (order.shipping_address || {});

  const payMethodLabel = {
    kbz_pay: "KBZ Pay", wave_pay: "Wave Money", cb_pay: "CB Pay",
    aya_pay: "AYA Pay", mmqr: "MMQR", cash_on_delivery: "Cash on Delivery",
  };

  // ── Payment status logic ──────────────────────────────────────────────────
  // COD orders are "paid" when delivered — show green "Confirmed on Delivery"
  const isCOD      = order.payment_method === "cash_on_delivery";
  const isDelivered = order.status === "delivered";
  const isPaid      = order.payment_status === "paid";
  const codConfirmed = isCOD && isDelivered;

  const payStatusLabel = codConfirmed
    ? "Confirmed on Delivery"
    : isPaid
      ? "Paid"
      : isCOD
        ? "Payable on Delivery"
        : (order.payment_status || "Pending");

  const payStatusColor = (codConfirmed || isPaid)
    ? { bg: "#dcfce7", text: "#15803d" }
    : isCOD
      ? { bg: "#dbeafe", text: "#1d4ed8" }
      : { bg: "#fef3c7", text: "#92400e" };

  // ── Delivery status section ──────────────────────────────────────────────
  const deliveryStatusLabel = {
    pending:          "Pending",
    awaiting_pickup:  "Awaiting Pickup",
    picked_up:        "Picked Up",
    in_transit:       "In Transit",
    out_for_delivery: "Out for Delivery",
    delivered:        "Delivered",
    failed:           "Failed",
    cancelled:        "Cancelled",
  };

  const deliverySection = delivery ? `
  <div class="section">
    <h4>Delivery Information</h4>
    <table class="data-table">
      <tr>
        <td class="label">Delivery Status</td>
        <td><span class="status-badge" style="background:${
          delivery.status === "delivered" ? "#dcfce7" : "#dbeafe"
        };color:${
          delivery.status === "delivered" ? "#15803d" : "#1d4ed8"
        }">${deliveryStatusLabel[delivery.status] || delivery.status}</span></td>
      </tr>
      <tr>
        <td class="label">Method</td>
        <td>${delivery.delivery_method === "platform" ? "Platform Logistics" : "Seller Self-Delivery"}</td>
      </tr>
      ${delivery.tracking_number ? `<tr><td class="label">Tracking #</td><td class="mono">${delivery.tracking_number}</td></tr>` : ""}
      ${delivery.assigned_driver_name ? `<tr><td class="label">Driver</td><td>${delivery.assigned_driver_name}${delivery.assigned_driver_phone ? ` · ${delivery.assigned_driver_phone}` : ""}</td></tr>` : ""}
      ${delivery.delivered_at ? `<tr><td class="label">Delivered At</td><td>${formatDateTime(delivery.delivered_at)}</td></tr>` : ""}
    </table>
  </div>` : (isDelivered ? `
  <div class="section">
    <h4>Delivery Information</h4>
    <p style="color:#15803d;font-weight:600">✓ Delivered on ${order.delivered_at ? formatDateTime(order.delivered_at) : formatDate(order.updated_at)}</p>
  </div>` : "");

  const itemRows = (order.items || []).map((item) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">
        <div style="font-weight:500">${item.product_name || "Product"}</div>
        ${item.product_sku ? `<div style="color:#888;font-size:11px">SKU: ${item.product_sku}</div>` : ""}
      </td>
      <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f0f0f0">${item.quantity}</td>
      <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #f0f0f0">${formatMMK(item.price)}</td>
      <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #f0f0f0;font-weight:500">${formatMMK(item.subtotal)}</td>
    </tr>`).join("");

  // Store name — now comes from order.store_name (mapped by backend) or order.seller?.store_name
  const storeName = order.store_name || order.seller?.store_name || order.seller?.sellerProfile?.store_name || null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Pay Slip – Order #${order.order_number || order.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 13px; line-height: 1.6; }
  .page { max-width: 680px; margin: 0 auto; padding: 32px 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #16a34a; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 700; color: #16a34a; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .slip-title { text-align: right; }
  .slip-title h2 { font-size: 18px; font-weight: 600; color: #111; }
  .slip-title .order-num { font-size: 13px; color: #6b7280; margin-top: 2px; }
  .slip-title .date { font-size: 12px; color: #6b7280; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
  .info-box h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; font-weight: 600; margin-bottom: 8px; }
  .info-box p { font-size: 13px; color: #111; margin-bottom: 2px; }
  .info-box .label { font-size: 11px; color: #6b7280; margin-top: 6px; }
  .section { margin-bottom: 20px; }
  .section h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 4px 0; }
  .data-table td { padding: 5px 0; vertical-align: top; }
  .data-table .label { color: #6b7280; width: 40%; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.items thead th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 600; }
  table.items thead th:not(:first-child) { text-align: right; }
  table.items thead th:nth-child(2) { text-align: center; }
  .totals { margin-left: auto; width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #374151; }
  .totals-row.total { border-top: 2px solid #16a34a; margin-top: 6px; padding-top: 10px; font-size: 15px; font-weight: 700; color: #16a34a; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .mono { font-family: 'Courier New', monospace; font-size: 12px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">🛒 Pyonea</div>
      <div class="brand-sub">B2B Marketplace · Myanmar</div>
    </div>
    <div class="slip-title">
      <h2>Payment Receipt</h2>
      <div class="order-num">Order #${order.order_number || order.id}</div>
      <div class="date">Issued: ${formatDateTime(order.created_at)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h4>Billed To</h4>
      <p style="font-weight:600">${addr.full_name || "—"}</p>
      ${addr.phone ? `<p>${addr.phone}</p>` : ""}
      ${addr.email ? `<p>${addr.email}</p>` : ""}
      ${addr.address ? `<p style="margin-top:4px">${addr.address}</p>` : ""}
      ${addr.city ? `<p>${addr.city}${addr.state ? `, ${addr.state}` : ""}</p>` : ""}
    </div>
    <div class="info-box">
      <h4>Order Details</h4>
      <div class="label">Order Status</div>
      <p style="font-weight:600;text-transform:capitalize">${(order.status || "").replace(/_/g, " ")}</p>
      <div class="label">Payment Method</div>
      <p>${payMethodLabel[order.payment_method] || order.payment_method || "—"}</p>
      <div class="label">Payment Status</div>
      <p><span class="status-badge" style="background:${payStatusColor.bg};color:${payStatusColor.text}">${payStatusLabel}</span></p>
      ${storeName ? `<div class="label">Sold By</div><p style="font-weight:500">${storeName}</p>` : ""}
    </div>
  </div>

  ${deliverySection}

  <table class="items">
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Subtotal</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${formatMMK(order.subtotal_amount)}</span></div>
    <div class="totals-row"><span>Shipping Fee</span><span>${formatMMK(order.shipping_fee)}</span></div>
    ${(order.tax_amount > 0) ? `<div class="totals-row"><span>Tax</span><span>${formatMMK(order.tax_amount)}</span></div>` : ""}
    ${(order.coupon_discount_amount > 0) ? `<div class="totals-row" style="color:#dc2626"><span>Coupon Discount</span><span>-${formatMMK(order.coupon_discount_amount)}</span></div>` : ""}
    ${(order.discount_amount > 0) ? `<div class="totals-row" style="color:#dc2626"><span>Discount</span><span>-${formatMMK(order.discount_amount)}</span></div>` : ""}
    <div class="totals-row total"><span>Total</span><span>${formatMMK(order.total_amount)}</span></div>
  </div>

  <div class="footer">
    Thank you for shopping with Pyonea · This is a computer-generated receipt and does not require a signature.
  </div>
</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
};

const downloadPaySlip = (order, delivery = null) => {
  const win = window.open("", "_blank", "width=720,height=900");
  if (!win) return; // popup blocked
  win.document.write(generatePaySlipHTML(order, delivery));
  win.document.close();
};

// ─── Order Card ───────────────────────────────────────────────────────────────
const OrderCard = ({ order, onViewDetails, onCancel, onPaySlip }) => {
  const firstItem  = order.items?.[0] || {};
  const images     = firstItem.product_data?.images || [];
  const thumb      = getImageUrl(images.find((i) => i.is_primary) || images[0]);
  const canCancel  = ["pending", "confirmed"].includes(order.status);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:shadow-md transition p-4">
      <div className="flex items-start gap-3">
        <img src={thumb} alt={firstItem.product_name || "Product"}
          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
          onError={(e) => { e.target.src = "/placeholder-product.jpg"; }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-slate-100 text-sm">Order #{order.order_number}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{order.items?.length} item(s) · {formatDate(order.created_at)}</p>
              {(order.store_name || order.seller?.store_name) && (
                <p className="text-xs text-gray-500 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                  <BuildingStorefrontIcon className="h-3 w-3" />
                  {order.store_name || order.seller?.store_name}
                </p>
              )}
            </div>
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-green-600">{formatMMK(order.total_amount)}</span>
        <div className="flex flex-wrap gap-1.5">
          {onPaySlip && (
            <button onClick={() => onPaySlip(order)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50">
              <PrinterIcon className="h-3.5 w-3.5" />Pay Slip
            </button>
          )}
          {canCancel && (
            <button onClick={() => onCancel(order)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50">
              <XCircleIcon className="h-3.5 w-3.5" />Cancel
            </button>
          )}
          <button onClick={() => onViewDetails(order)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50">
            <EyeIcon className="h-3.5 w-3.5" />Details
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Order Details Modal ──────────────────────────────────────────────────────
const OrderDetailsModal = ({ order, isOpen, onClose }) => {
  const [delivery, setDelivery]     = useState(null);
  const [dlLoading, setDlLoading]   = useState(false);
  const intervalRef                 = useRef(null);

  const fetchDelivery = useCallback(async () => {
    if (!order) return;
    setDlLoading(true);
    try {
      const res = await api.get(`/deliveries?order_id=${order.id}`);
      setDelivery(res.data.data?.data?.[0] || null);
    } catch { /* best-effort */ }
    finally { setDlLoading(false); }
  }, [order?.id]);

  useEffect(() => {
    if (!isOpen || !order) return;
    fetchDelivery();
    intervalRef.current = setInterval(fetchDelivery, 10_000);
    return () => clearInterval(intervalRef.current);
  }, [isOpen, order?.id]);

  if (!isOpen || !order) return null;

  const addr  = typeof order.shipping_address === "string"
    ? JSON.parse(order.shipping_address) : (order.shipping_address || {});

  const STEPS = [
    { key: "awaiting_pickup",  labelKey: "buyer_dashboard.delivery_status.awaiting_pickup", Icon: ClockIcon },
    { key: "picked_up",        labelKey: "buyer_dashboard.delivery_status.picked_up", Icon: TruckIcon },
    { key: "in_transit",       labelKey: "buyer_dashboard.delivery_status.in_transit", Icon: ArrowPathIcon },
    { key: "out_for_delivery", labelKey: "buyer_dashboard.delivery_status.out_for_delivery", Icon: MapPinIcon },
    { key: "delivered",        labelKey: "buyer_dashboard.delivery_status.delivered", Icon: CheckCircleIcon },
  ];
  const stepMap  = { awaiting_pickup:0, picked_up:1, in_transit:2, out_for_delivery:3, delivered:4 };
  const curStep  = stepMap[delivery?.status] ?? -1;
  const tsMap    = {};
  (delivery?.delivery_updates || []).sort((a,b) => new Date(a.created_at)-new Date(b.created_at))
    .forEach((u) => { if (!tsMap[u.status]) tsMap[u.status] = u.created_at; });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b flex justify-between items-center z-10">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Order #{order.order_number}</h3>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => downloadPaySlip(order, delivery)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50">
                <PrinterIcon className="h-3.5 w-3.5" />Pay Slip
              </button>
              <button onClick={onClose} className="text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:text-slate-400">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">

            {/* Delivery tracking */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-blue-600" />Delivery Tracking
                </h4>
                {dlLoading && <ArrowPathIcon className="h-4 w-4 text-gray-400 dark:text-slate-600 animate-spin" />}
              </div>

              {delivery ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-center bg-blue-50 dark:bg-slate-900/50 p-3 rounded-lg text-sm">
                    <span className="font-medium">{delivery.delivery_method === "platform" ? "Platform Logistics" : "Self Delivery"}</span>
                    {delivery.tracking_number && (
                      <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border text-xs">{delivery.tracking_number}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${DELIVERY_STATUS[delivery.status]?.color || "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300"}`}>
                      {DELIVERY_STATUS[delivery.status]?.label || delivery.status}
                    </span>
                  </div>

                  {/* Stepper */}
                  <div className="relative pt-2">
                    <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 dark:bg-slate-700 rounded-full" />
                    <div className="absolute top-6 left-0 h-1 bg-green-500 rounded-full transition-all"
                      style={{ width: `${curStep >= 0 ? (curStep / (STEPS.length-1)) * 100 : 0}%` }} />
                    <div className="relative flex justify-between">
                      {STEPS.map((s, i) => {
                        const done = curStep >= i, cur = curStep === i;
                        return (
                          <div key={s.key} className="flex flex-col items-center w-1/5">
                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all
                              ${done ? "bg-green-500 border-green-500 text-white" : cur ? "bg-blue-500 border-blue-500 text-white" : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500"}`}>
                              <s.Icon className="h-4 w-4" />
                            </div>
                            <span className={`text-[10px] mt-1.5 text-center leading-tight hidden sm:block
                              ${done ? "text-gray-700 dark:text-slate-300" : cur ? "text-blue-600" : "text-gray-400 dark:text-slate-600"}`}>{s.label}</span>
                            {tsMap[s.key] && (
                              <span className="text-[9px] text-gray-400 dark:text-slate-600 mt-0.5 text-center hidden sm:block">
                                {formatDate(tsMap[s.key], { month:"short", day:"numeric" })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {delivery.status === "delivered" && delivery.delivered_at && (
                    <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">Delivered</p>
                        <p className="text-xs text-green-600 dark:text-green-400">{formatDateTime(delivery.delivered_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 dark:text-slate-600">
                  <TruckIcon className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-sm">No delivery info yet. Check back later.</p>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Items ({order.items?.length})</h4>
              <div className="space-y-2">
                {order.items?.map((item, i) => {
                  const imgs = item.product_data?.images || [];
                  const img  = getImageUrl(imgs.find((x) => x.is_primary) || imgs[0]);
                  return (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900 p-3 rounded-lg">
                      <img src={img} alt={item.product_name} className="w-12 h-12 object-cover rounded flex-shrink-0"
                        onError={(e) => { e.target.src = "/placeholder-product.jpg"; }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product_name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-500">Qty: {item.quantity} · {formatMMK(item.price)} each</p>
                      </div>
                      <p className="font-semibold text-sm flex-shrink-0">{formatMMK(item.subtotal)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shipping + Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-2 text-sm">Shipping Address</h4>
                <p className="font-medium text-sm">{addr.full_name}</p>
                {addr.phone && <p className="text-sm text-gray-600 dark:text-slate-400">{addr.phone}</p>}
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{addr.address}</p>
                {addr.city && <p className="text-sm text-gray-600 dark:text-slate-400">{addr.city}{addr.state ? `, ${addr.state}` : ""}</p>}
              </div>
              <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-2 text-sm">Payment</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600 dark:text-slate-400">Method</span><span className="font-medium capitalize">{(order.payment_method || "").replaceAll("_"," ")}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600 dark:text-slate-400">Status</span>
                    <span className={`font-medium ${
                      order.payment_status === "paid" || (order.payment_method === "cash_on_delivery" && order.status === "delivered")
                        ? "text-green-600"
                        : order.payment_method === "cash_on_delivery"
                          ? "text-blue-600"
                          : "text-yellow-600"
                    }`}>
                      {order.payment_method === "cash_on_delivery" && order.status === "delivered"
                        ? "Confirmed on Delivery"
                        : order.payment_method === "cash_on_delivery" && order.payment_status !== "paid"
                          ? "Payable on Delivery"
                          : order.payment_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl">
              <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3 text-sm">Order Summary</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-slate-400"><span>Subtotal</span><span>{formatMMK(order.subtotal_amount)}</span></div>
                <div className="flex justify-between text-gray-600 dark:text-slate-400"><span>Shipping</span><span>{formatMMK(order.shipping_fee)}</span></div>
                {order.tax_amount > 0 && <div className="flex justify-between text-gray-600 dark:text-slate-400"><span>Tax</span><span>{formatMMK(order.tax_amount)}</span></div>}
                {order.coupon_discount_amount > 0 && <div className="flex justify-between text-red-600"><span>Coupon</span><span>-{formatMMK(order.coupon_discount_amount)}</span></div>}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200 dark:border-slate-700"><span>Total</span><span className="text-green-600">{formatMMK(order.total_amount)}</span></div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 flex justify-end gap-2 border-t">
            <button onClick={() => downloadPaySlip(order, delivery)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
              <DocumentArrowDownIcon className="h-4 w-4" />Download Pay Slip
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-900">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
const DashboardTab = ({ user, orders, onViewDetails, onCancel, navigate }) => {
  const totalSpent  = useMemo(() => orders.reduce((s, o) => s + (o.total_amount || 0), 0), [orders]);
  const recentOrders = orders.slice(0, 4);

  const stats = [
    { label: "Total Orders",  value: orders.length,                                                    color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/30",   Icon: ShoppingBagIcon  },
    { label: "Delivered",     value: orders.filter((o) => o.status === "delivered").length,             color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-900/30",  Icon: CheckCircleIcon  },
    { label: "In Progress",   value: orders.filter((o) => ["pending","confirmed","processing"].includes(o.status)).length, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/30", Icon: ClockIcon },
    { label: "Total Spent",   value: formatMMK(totalSpent),                                             color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30", Icon: CreditCardIcon   },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Welcome back, {user?.name?.split(" ")[0]}!</h1>
        <p className="text-green-100 text-sm">Here's your buying activity overview.</p>
      </div>



      <div className="flex gap-2">
        <a href="https://t.me/pyonea_community" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 bg-sky-500 hover:bg-sky-600 rounded-2xl shadow-sm dark:shadow-slate-900/50 transition-colors p-3 group">
          <svg className="h-6 w-6 flex-shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          <div className="absolute hidden md:block opacity-0 group-hover:opacity-100 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap -top-10 left-1/2 -translate-x-1/2 transition-opacity pointer-events-none">
            Telegram Community
          </div>
        </a>
<a href="https://facebook.com/share/p/18GDuKtPjw" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-sm dark:shadow-slate-900/50 transition-colors p-3 group">
          <svg className="h-6 w-6 flex-shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
          </svg>
          <div className="absolute hidden md:block opacity-0 group-hover:opacity-100 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap -top-10 left-1/2 -translate-x-1/2 transition-opacity pointer-events-none">
            Facebook Community
          </div>
        </a>

      </div>


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-slate-900/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-500 mb-1">{s.label}</p>
                <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
              <div className={`${s.bg} rounded-lg p-2 flex-shrink-0`}>
                <s.Icon className={`h-5 w-5 ${s.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 rounded-full p-2"><ChartBarIcon className="h-5 w-5 text-orange-600" /></div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">Recent Orders</h2>
              <p className="text-xs text-gray-500 dark:text-slate-500">Your latest purchasing activity</p>
            </div>
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingBagIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400">No orders yet</p>
            <button onClick={() => navigate("/products")}
              className="mt-3 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentOrders.map((o) => (
              <OrderCard key={o.id} order={o} onViewDetails={onViewDetails} onCancel={onCancel} onPaySlip={downloadPaySlip} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Orders Tab ───────────────────────────────────────────────────────────────
const OrdersTab = ({ orders, onViewDetails, onCancel }) => {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">My Orders</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500">
          <option value="all">All Orders</option>
          {["pending","confirmed","processing","shipped","delivered","cancelled"].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBagIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-slate-500">No orders match this filter.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} onViewDetails={onViewDetails} onCancel={onCancel} onPaySlip={downloadPaySlip} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Purchase History Tab ─────────────────────────────────────────────────────
const PurchaseHistoryTab = ({ orders }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const history = useMemo(() =>
    orders.filter((o) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (o.order_number || "").toLowerCase().includes(q) ||
        (o.seller?.store_name || "").toLowerCase().includes(q) ||
        (o.items || []).some((i) => (i.product_name || "").toLowerCase().includes(q))
      );
    }),
    [orders, search]);

  const totalSpent = useMemo(() =>
    history.reduce((s, o) => s + (o.total_amount || 0), 0), [history]);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-5">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Purchase History</h2>
            <p className="text-sm text-gray-500 dark:text-slate-500 mt-0.5">All your orders with downloadable pay slips</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-slate-500">Total Records</p>
              <p className="text-xl font-bold text-blue-600">{history.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-slate-500">Total Spent</p>
              <p className="text-xl font-bold text-green-600">{formatMMK(totalSpent)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 relative">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number, store or product…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
          <DocumentTextIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-10 text-center">
          <ReceiptRefundIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-slate-500">No purchase records found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  {[t("buyer_dashboard.order_number"), t("buyer_dashboard.date"), t("buyer_dashboard.store"), t("buyer_dashboard.items"), t("buyer_dashboard.amount"), t("buyer_dashboard.payment"), t("buyer_dashboard.status"), t("buyer_dashboard.pay_slip")].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {history.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100 whitespace-nowrap">#{o.order_number || o.id}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400 whitespace-nowrap max-w-[120px] truncate">
                      {o.store_name || o.seller?.store_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{o.items?.length || 0}</td>
                    <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">{formatMMK(o.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.payment_status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>
                        {o.payment_status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => downloadPaySlip(o)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 whitespace-nowrap">
                        <PrinterIcon className="h-3.5 w-3.5" />Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
            {history.map((o) => (
              <div key={o.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">#{o.order_number || o.id}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-500">{formatDate(o.created_at)}</p>
                    {o.seller?.store_name && <p className="text-xs text-gray-500 dark:text-slate-500">{o.seller.store_name}</p>}
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-green-600 text-sm">{formatMMK(o.total_amount)}</span>
                  <button onClick={() => downloadPaySlip(o)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg">
                    <PrinterIcon className="h-3.5 w-3.5" />Pay Slip
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 text-xs text-gray-500 dark:text-slate-500">
            {history.length} record{history.length !== 1 ? "s" : ""} · Total: {formatMMK(totalSpent)}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Wishlist Tab ──────────────────────────────────────────────────────────────
const WishlistTab = ({ navigate }) => {
  const [wishlist, setWishlist]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [removeModal, setRemoveModal]   = useState(null);
  const [removing, setRemoving]         = useState(false);

  const fetchWishlist = async () => {
    setLoading(true);
    try { setWishlist((await api.get("/wishlist")).data.data || []); }
    catch { setError(t("buyer_dashboard.failed_load_wishlist")); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWishlist(); }, []);

  const confirmRemove = async () => {
    if (!removeModal) return;
    setRemoving(true);
    try {
      await api.delete(`/wishlist/${removeModal}`);
      setWishlist((p) => p.filter((i) => i.id !== removeModal));
      setRemoveModal(null);
    } catch { setError(t("buyer_dashboard.failed_remove_item")); }
    finally { setRemoving(false); }
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 rounded-full border-t-2 border-green-500" /></div>;
  if (error)   return <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">{error}</div>;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-5 sm:p-6">
      {removeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-xs w-full mx-4">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-4">Remove this item from your wishlist?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRemoveModal(null)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm">Cancel</button>
              <button onClick={confirmRemove} disabled={removing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">
                {removing ? t("buyer_dashboard.removing") : t("buyer_dashboard.remove")}
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-5">My Wishlist</h2>

      {wishlist.length === 0 ? (
        <div className="text-center py-12">
          <HeartIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-slate-500 mb-3">Your wishlist is empty</p>
          <button onClick={() => navigate("/products")} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            Browse Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wishlist.map((item) => (
            <div key={item.id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 hover:shadow-md transition flex gap-3">
              <img src={getImageUrl(item.images?.[0])} alt={item.name}
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                onError={(e) => { e.target.src = "/placeholder-product.jpg"; }} />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-slate-100 text-sm line-clamp-2">{item.name}</h3>
                <p className="text-sm text-green-600 font-bold mt-0.5">{formatMMK(item.price)}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => navigate(`/products/${item.slug || item.id}`)}
                    className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-2.5 py-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700">View</button>
                  <button onClick={() => setRemoveModal(item.id)}
                    className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded hover:bg-red-100">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Cart Tab ─────────────────────────────────────────────────────────────────
const CartTab = ({ navigate }) => {
  const { cartItems, cartSummary, subtotal, totalItems, loading, removeFromCart, updateQuantity, clearCart } = useCart();
  const [updatingId, setUpdatingId]     = useState(null);
  const [removingId, setRemovingId]     = useState(null);
  const [clearing, setClearing]         = useState(false);
  const [cartError, setCartError]       = useState(null);
  const [removeModal, setRemoveModal]   = useState(null);
  const [clearModal, setClearModal]     = useState(false);

  const hasUnavailable = cartItems.some((i) => !i.is_available);
  const hasQtyIssues   = cartItems.some((i) => !i.is_quantity_valid);
  const canCheckout    = cartItems.length > 0 && !hasUnavailable && !hasQtyIssues;

  const handleQty = async (id, qty) => {
    if (qty < 1 || updatingId === id) return;
    setUpdatingId(id); setCartError(null);
    try { await updateQuantity(id, qty); }
    catch (e) { setCartError(e.message); }
    finally { setUpdatingId(null); }
  };

  const confirmRemove = async () => {
    if (!removeModal) return;
    setRemovingId(removeModal);
    try { await removeFromCart(removeModal); setRemoveModal(null); }
    catch (e) { setCartError(e.message); }
    finally { setRemovingId(null); }
  };

  const confirmClear = async () => {
    setClearing(true);
    try { await clearCart(); setClearModal(false); }
    catch (e) { setCartError(e.message); }
    finally { setClearing(false); }
  };

  if (loading && cartItems.length === 0)
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" /></div>;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-5 sm:p-6">
      {/* Remove confirm */}
      {removeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-xs w-full mx-4">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-4">Remove this item from your cart?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRemoveModal(null)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm">Cancel</button>
              <button onClick={confirmRemove} disabled={!!removingId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">
                {removingId ? t("buyer_dashboard.removing") : t("buyer_dashboard.remove")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirm */}
      {clearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-xs w-full mx-4">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">Clear your entire cart?</p>
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-4">This will remove all items.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setClearModal(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm">Cancel</button>
              <button onClick={confirmClear} disabled={clearing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">
                {clearing ? "Clearing…" : "Clear Cart"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
          My Cart {totalItems > 0 && <span className="text-gray-400 dark:text-slate-600 font-normal text-sm">({totalItems})</span>}
        </h2>
        {cartItems.length > 0 && (
          <button onClick={() => setClearModal(true)} disabled={clearing}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-500 disabled:opacity-50">
            <TrashIcon className="h-4 w-4" />Clear
          </button>
        )}
      </div>

      {cartError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{cartError}</div>
      )}

      {cartItems.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCartIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-slate-500 mb-3">Your cart is empty</p>
          <button onClick={() => navigate("/products")} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            Browse Products
          </button>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-7">
            {(hasUnavailable || hasQtyIssues) && (
              <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-sm text-yellow-700">
                {hasUnavailable && "Some items are no longer available. "}
                {hasQtyIssues  && "Some items exceed available stock. "}
                Please review before checkout.
              </div>
            )}
            <ul className="divide-y divide-gray-100 dark:divide-slate-700">
              {cartItems.map((item) => (
                <li key={item.id} className={`py-4 flex gap-3 ${removingId === item.id ? "opacity-40" : ""}`}>
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex-shrink-0">
                    <img src={getImageUrl(item.image)} alt={item.name}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.src = "/placeholder-product.jpg"; }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-slate-100 text-sm truncate cursor-pointer hover:text-green-700"
                          onClick={() => navigate(`/products/${item.product_id}`)}>
                          {item.name}
                        </h4>
                        {!item.is_available && <p className="text-xs text-red-500 mt-0.5">⚠ No longer available</p>}
                        {item.is_available && !item.is_quantity_valid && <p className="text-xs text-red-500 mt-0.5">⚠ Only {item.stock} in stock</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-green-700 text-sm">{formatMMK(item.price)}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-600">{formatMMK(item.subtotal)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded overflow-hidden">
                        <button onClick={() => handleQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1 || updatingId === item.id || !item.is_available}
                          className="px-2.5 py-1 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 text-sm">−</button>
                        <div className="relative w-8 text-center text-sm">
                          {item.quantity}
                          {updatingId === item.id && <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-800/80"><div className="animate-spin h-3 w-3 rounded-full border-b-2 border-green-500" /></div>}
                        </div>
                        <button onClick={() => handleQty(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock || updatingId === item.id || !item.is_available}
                          className="px-2.5 py-1 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 text-sm">+</button>
                      </div>
                      <button onClick={() => setRemoveModal(item.id)} disabled={removingId === item.id}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-40">
                        <TrashIcon className="h-3.5 w-3.5" />Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 lg:mt-0 lg:col-span-5">
            <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3 text-sm">Order Summary</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-slate-500"><dt>Subtotal ({totalItems})</dt><dd className="font-medium text-gray-900 dark:text-slate-100">{formatMMK(subtotal)}</dd></div>
                <div className="flex justify-between text-gray-500 dark:text-slate-500"><dt>Shipping</dt><dd className="font-medium text-gray-900 dark:text-slate-100">{formatMMK(cartSummary?.shipping_fee || 0)}</dd></div>
                <div className="flex justify-between text-gray-500 dark:text-slate-500"><dt>Tax (5%)</dt><dd className="font-medium text-gray-900 dark:text-slate-100">{formatMMK(cartSummary?.tax || 0)}</dd></div>
                <div className="flex justify-between border-t pt-2 font-bold text-gray-900 dark:text-slate-100"><dt>Total</dt><dd>{formatMMK(cartSummary?.total || 0)}</dd></div>
              </dl>
              <button onClick={() => navigate("/checkout")} disabled={!canCheckout}
                className={`mt-4 w-full py-2.5 rounded-lg font-medium text-white text-sm transition ${canCheckout ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 dark:bg-slate-600 cursor-not-allowed"}`}>
                Proceed to Checkout
              </button>
              <button onClick={() => navigate("/products")}
                className="mt-2 w-full py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-900">
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Profile Tab ──────────────────────────────────────────────────────────────
const ProfileTab = ({ user, onUpdate }) => {
  const { t } = useTranslation();
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "", address: user?.address || "", city: user?.city || "", state: user?.state || "" });
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setMsg(null);
    try {
      const res = await api.put("/users/profile", form);
      if (res.data.success) { setMsg({ type:"success", text:t("buyer_dashboard.profile_updated") }); onUpdate(res.data.data); setEditing(false); }
    } catch (err) { setMsg({ type:"error", text: err.response?.data?.message || t("buyer_dashboard.update_failed") }); }
    finally { setLoading(false); }
  };

  const field = (label, name, type = "text") => (
    <div key={name}>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
      <input type={type} name={name} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500 text-sm" />
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-5 sm:p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Personal Information</h2>
        {!editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm">
            <PencilSquareIcon className="h-4 w-4" />Edit
          </button>
        )}
      </div>

      {msg && <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Full Name *", "name")} {field("Phone *", "phone", "tel")}
            {field("Email", "email", "email")}
          </div>
          {field("Address", "address")}
          <div className="grid grid-cols-2 gap-4">{field("City", "city")} {field("State", "state")}</div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">
              {loading ? t("buyer_dashboard.saving") : t("buyer_dashboard.save_changes")}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {[
            [UserIcon,    t("buyer_dashboard.full_name"), user?.name],
            [EnvelopeIcon, t("buyer_dashboard.email"), user?.email],
            [PhoneIcon,   t("buyer_dashboard.phone"), user?.phone],
            [MapPinIcon,  t("buyer_dashboard.address"), [user?.address, user?.city, user?.state].filter(Boolean).join(", ") || "—"],
          ].map(([Icon, label, value]) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="h-5 w-5 text-gray-400 dark:text-slate-600 mt-0.5 flex-shrink-0" />
              <div><p className="text-xs text-gray-500 dark:text-slate-500">{label}</p><p className="font-medium text-sm">{value || "—"}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Settings Tab ─────────────────────────────────────────────────────────────
const SettingsTab = ({ user }) => {
  const { t } = useTranslation();
  const { theme, isDark, setLight, setDark } = useTheme();
  const [pwd, setPwd]     = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [loading, setL]   = useState(false);
  const [msg, setMsg]     = useState(null);
  const [section, setSection] = useState("notifications");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pwd.new_password !== pwd.confirm_password) { setMsg({ type:"error", text:t("buyer_dashboard.passwords_no_match") }); return; }
    setL(true); setMsg(null);
    try {
      await api.put("/users/profile/password", { current_password: pwd.current_password, new_password: pwd.new_password, new_password_confirmation: pwd.confirm_password });
      setMsg({ type:"success", text:t("buyer_dashboard.password_changed") });
      setPwd({ current_password:"", new_password:"", confirm_password:"" });
    } catch (err) { setMsg({ type:"error", text: err.response?.data?.message || t("buyer_dashboard.failed_change_password") }); }
    finally { setL(false); }
  };

  const subTabs = [
    { id:"notifications", label:t("buyer_dashboard.notifications") },
    { id:"appearance",    label:"Appearance" },
    { id:"password",      label:t("buyer_dashboard.password") },
    { id:"account",       label:t("buyer_dashboard.account") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-100 dark:border-slate-800">
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors
              ${section === t.id 
                ? "bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-green-700 dark:text-green-400" 
                : "text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {section === "notifications" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-5 sm:p-6">
          <NotificationPreferences
            userType="buyer"
            initialPrefs={user?.notification_preferences || {}}
          />
        </div>
      )}

      {section === "appearance" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Appearance</h2>
            <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">
              Choose how Pyonea looks on this device.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <button
              type="button"
              onClick={setLight}
              aria-pressed={!isDark}
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors
                ${!isDark
                  ? "border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                  : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
            >
              <span className="flex items-center gap-3">
                <SunIcon className="h-5 w-5" />
                <span>
                  <span className="block text-sm font-semibold">Light mode</span>
                  <span className="block text-xs text-gray-500 dark:text-slate-500">Bright interface</span>
                </span>
              </span>
              {!isDark && <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />}
            </button>

            <button
              type="button"
              onClick={setDark}
              aria-pressed={isDark}
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors
                ${isDark
                  ? "border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                  : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
            >
              <span className="flex items-center gap-3">
                <MoonIcon className="h-5 w-5" />
                <span>
                  <span className="block text-sm font-semibold">Dark mode</span>
                  <span className="block text-xs text-gray-500 dark:text-slate-500">Low-light interface</span>
                </span>
              </span>
              {isDark && <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />}
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-500 dark:text-slate-500">
            Current theme: <span className="font-medium capitalize text-gray-700 dark:text-slate-300">{theme}</span>
          </p>
        </div>
      )}

      {section === "password" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4">Change Password</h2>
          {msg && <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"}`}>{msg.text}</div>}
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            {[[t("buyer_dashboard.current_password"),"current_password"],[t("buyer_dashboard.new_password"),"new_password"],[t("buyer_dashboard.confirm_new_password"),"confirm_password"]].map(([label,name]) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
                <input type="password" name={name} value={pwd[name]} required minLength={name!=="current_password"?8:undefined}
                  onChange={(e) => setPwd({...pwd,[name]:e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 text-sm" />
              </div>
            ))}
            <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-green-700 dark:hover:bg-green-800">
              {loading ? t("buyer_dashboard.updating") : t("buyer_dashboard.update_password")}
            </button>
          </form>
        </div>
      )}

      {section === "account" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-3">Account</h2>
          <p className="text-sm text-gray-500 dark:text-slate-500 mb-4">Deactivating your account will remove your access. Your order history will be preserved.</p>
          <button className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <ExclamationTriangleIcon className="h-4 w-4" />Request Account Deactivation
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main BuyerDashboard ──────────────────────────────────────────────────────
const BuyerDashboard = () => {
  const { t } = useTranslation();
  const [user, setUser]                 = useState(null);
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [activeTab, setActiveTab]       = useState(0);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [cancelModal, setCancelModal]   = useState(null);
  const [cancelling, setCancelling]     = useState(false);
  const [cancelError, setCancelError]   = useState(null);
  const [rfqBadgeCount, setRfqBadgeCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { isEmailVerified, updateUser } = useAuth();

  const TABS = useMemo(() => [
    { id: "dashboard",  label: t("sidebar.dashboard"),             Icon: HomeIcon          },
    { id: "orders",     label: t("buyer_dashboard.my_orders"),     Icon: ShoppingBagIcon   },
    { id: "history",    label: t("buyer_dashboard.purchase_history"), Icon: ReceiptRefundIcon },
    { id: "cart",       label: t("buyer_dashboard.my_cart"),       Icon: ShoppingCartIcon  },
    { id: "wishlist",   label: t("buyer_dashboard.wishlist"),      Icon: HeartIcon         },
    { id: "rfq",        label: "RFQ",                               Icon: DocumentTextIcon  },
    { id: "profile",    label: t("buyer_dashboard.profile"),       Icon: UserIcon          },
    { id: "settings",   label: t("buyer_dashboard.settings"),      Icon: CogIcon           },
    { id: "notifications", label: "Notifications",                     Icon: BellIcon          },
    { id: "referrals",     label: "Referrals",                         Icon: GiftIcon          },
  ], [t]);

  const fetchOrders = useCallback(async () => {
    try { setOrders((await api.get("/orders")).data.data || []); }
    catch (e) { console.error("Failed to fetch orders:", e); }
  }, []);

  const fetchRfqBadgeCount = useCallback(async () => {
    try {
      const res = await api.get("/rfq/sent");
      const list = res.data?.data?.data ?? res.data?.data ?? [];
      const pending = list.filter((rfq) => rfq.status === "quoted").length;
      setRfqBadgeCount(pending);
    } catch {
      setRfqBadgeCount(0);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes] = await Promise.allSettled([api.get("/auth/me")]);
      if (userRes.status === "fulfilled") setUser(userRes.value.data.data || userRes.value.data);
      await fetchOrders();
    } finally { setLoading(false); }
  }, [fetchOrders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetchRfqBadgeCount();
    const timer = setInterval(fetchRfqBadgeCount, 60000);
    return () => clearInterval(timer);
  }, [fetchRfqBadgeCount]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab");
    if (!tab) return;
    const idx = TABS.findIndex((item) => item.id === tab);
    if (idx !== -1) setActiveTab(idx);
  }, [location.search, TABS]);

  // Refresh orders every 30s when on dashboard or orders tab
  useEffect(() => {
    const key = TABS[activeTab]?.id;
    if (!["dashboard","orders","history"].includes(key)) return;
    const t = setInterval(fetchOrders, 30_000);
    return () => clearInterval(t);
  }, [activeTab, fetchOrders, TABS]);

  const handleCancelOrder = async () => {
    if (!cancelModal) return;
    setCancelling(true); setCancelError(null);
    try {
      await api.post(`/orders/${cancelModal.id}/cancel`);
      setCancelModal(null);
      await fetchOrders();
    } catch (e) { setCancelError(e.response?.data?.message || t("buyer_dashboard.cancel_order")); }
    finally { setCancelling(false); }
  };

  const handleViewDetails = (order) => { setSelectedOrder(order); setIsModalOpen(true); };
  const handleCancel      = (order) => { setCancelModal(order); setCancelError(null); };

  const renderTab = () => {
    const key = TABS[activeTab]?.id;
    switch (key) {
      case "dashboard": return <DashboardTab user={user} orders={orders} onViewDetails={handleViewDetails} onCancel={handleCancel} navigate={navigate} />;
      case "orders":    return <OrdersTab orders={orders} onViewDetails={handleViewDetails} onCancel={handleCancel} />;
      case "history":   return <PurchaseHistoryTab orders={orders} />;
      case "cart":      return <CartTab navigate={navigate} />;
      case "wishlist":  return <WishlistTab navigate={navigate} />;
      case "profile":   return <ProfileTab user={user} onUpdate={(u) => { setUser(u); updateUser(u); }} />;
      case "settings":      return <SettingsTab user={user} />;
      case "notifications": return <NotificationsPanel />;
      case "referrals":     return <ReferralPanel />;
      default:              return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-green-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400 text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-900">

      {/* ── Cancel Confirm Modal ── */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">Cancel Order</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Cancel <strong>Order #{cancelModal.order_number}</strong>?</p>
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-4">Stock will be restored. This cannot be undone.</p>
            {cancelError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{cancelError}</div>}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setCancelModal(null); setCancelError(null); }} disabled={cancelling}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 disabled:opacity-50">Keep Order</button>
              <button onClick={handleCancelOrder} disabled={cancelling}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {cancelling ? t("buyer_dashboard.cancelling") : t("buyer_dashboard.cancel_order")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-800 shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="pt-6 pb-4 px-4">
              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{user?.name?.charAt(0)?.toUpperCase() || "B"}</span>
                  </div>
                  <div><p className="font-medium text-sm text-gray-900 dark:text-slate-100 truncate max-w-[140px]">{user?.name}</p><p className="text-xs text-gray-500 dark:text-slate-500">Buyer</p></div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:text-slate-400"><XMarkIcon className="h-5 w-5" /></button>
              </div>
              {TABS.map((tab, idx) => (
                <button key={tab.id} onClick={() => {
                    if (tab.id === "rfq") {
                      navigate("/rfq");
                      setSidebarOpen(false);
                      return;
                    }
                    setActiveTab(idx);
                    setSidebarOpen(false);
                  }}
                  className={classNames("flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left text-sm font-medium mb-1 transition-all",
                    activeTab === idx ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700")}>
                  <tab.Icon className="h-5 w-5 flex-shrink-0" />
                  {tab.label}
                  {tab.id === "rfq" && rfqBadgeCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                      {rfqBadgeCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-4 left-4 z-20">
        <button onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-lg text-gray-500 dark:text-slate-500 hover:text-green-600 hover:bg-green-50 transition-all">
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-72 bg-white/80 dark:bg-slate-900/90 backdrop-blur-lg border-r border-gray-200/60 dark:border-slate-700/60 shadow-xl">
          <div className="flex-1 flex flex-col pt-8 pb-4 overflow-y-auto">

            {/* Profile header */}
            <div className="flex items-center px-6 mb-8 gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-white font-bold text-base">{user?.name?.charAt(0)?.toUpperCase() || "B"}</span>
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-900 dark:text-slate-100 truncate theme-transition">{user?.name || "Buyer"}</p>
                <p className="text-sm text-green-600 font-medium">Buyer Account</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 space-y-1">
              {TABS.map((tab, idx) => (
                <button key={tab.id} onClick={() => {
                    if (tab.id === "rfq") {
                      navigate("/rfq");
                      return;
                    }
                    setActiveTab(idx);
                  }}
                  className={classNames("group flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left text-sm font-medium transition-all",
                    activeTab === idx
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                      : "text-gray-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md")}>
                  <tab.Icon className="h-5 w-5 group-hover:scale-110 transition-transform flex-shrink-0" />
                  {tab.label}
                  {tab.id === "rfq" && rfqBadgeCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                      {rfqBadgeCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Footer stats */}
          <div className="border-t border-gray-200/60 dark:border-slate-700/60 p-5 bg-white/50 dark:bg-slate-900/50">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/30 rounded-xl">
                <div className="font-bold text-green-700 dark:text-green-400 text-lg">{orders.length}</div>
                <div className="text-gray-500 dark:text-slate-500">Orders</div>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <div className="font-bold text-blue-700 dark:text-blue-400 text-lg">{orders.filter((o) => o.status === "delivered").length}</div>
                <div className="text-gray-500 dark:text-slate-500">Delivered</div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs text-gray-500 dark:text-slate-500">
              Member since {user?.created_at ? new Date(user.created_at).getFullYear() : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200/60 dark:border-slate-700/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Buyer Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-500 mt-0.5">Manage your orders and account</p>
            </div>
            <NotificationBell onClick={() => {
              const idx = TABS.findIndex((item) => item.id === "notifications");
              if (idx !== -1) setActiveTab(idx);
            }} />
          </div>
        </div>

        {/* Email verification banner */}
        {!isEmailVerified?.() && (
          <div className="flex-shrink-0 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 sm:px-6 py-3">
            <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
              <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
              Your email is not verified. Check your inbox for the verification link.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">

            {/* Mobile scrollable tab bar */}
            <div className="md:hidden mb-5">
              <div className="flex gap-1.5 rounded-2xl bg-white/80 dark:bg-slate-800/90 backdrop-blur-lg p-1.5 shadow-lg overflow-x-auto no-scrollbar">
                {TABS.map((tab, idx) => (
                  <button key={tab.id} onClick={() => {
                      if (tab.id === "rfq") {
                        navigate("/rfq");
                        return;
                      }
                      setActiveTab(idx);
                    }}
                    className={classNames("flex-shrink-0 rounded-xl py-2.5 px-3 text-xs font-medium transition-all focus:outline-none",
                      activeTab === idx
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md"
                        : "text-gray-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow")}>
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative">
                        <tab.Icon className="h-4 w-4" />
                        {tab.id === "rfq" && rfqBadgeCount > 0 && (
                          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-bold rounded-full bg-red-500 text-white">
                            {rfqBadgeCount}
                          </span>
                        )}
                      </div>
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {renderTab()}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal order={selectedOrder} isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); fetchOrders(); }} />
    </div>
  );
};

export default BuyerDashboard;
