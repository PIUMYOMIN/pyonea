// src/components/payments/PaymentProcessor.jsx
// Unified payment UI for all Myanmar payment methods.
//
// Supported methods:
//   mmqr          — Myanmar Mobile QR (scan with any banking app)
//   kbz_pay       — KBZ Pay deep link
//   wave_pay      — Wave Money deep link
//   cash_on_delivery — COD (no gateway)
//
// Usage:
//   <PaymentProcessor
//     order={order}                  // { id, order_number, total_amount, payment_method }
//     onSuccess={(order) => ...}     // called when payment confirmed
//     onCancel={() => ...}           // called when user cancels
//   />

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCodeIcon,
  DevicePhoneMobileIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../utils/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 3000;   // poll every 3s
const QR_EXPIRY_S      = 900;    // 15 minutes
const MAX_POLLS        = 300;    // 15min / 3s
const MMQR_LOGO_SRC    = '/MMQR_Logo.png';

const METHOD_META = {
  mmqr: {
    label: 'MMQR Payment',
    labelMM: 'MMQR ငွေပေးချေမှု',
    Icon: QrCodeIcon,
    color: 'green',
    desc: 'Scan with KBZPay, WavePay, AYA Pay, CB Pay or any Myanmar banking app',
  },
  kbz_pay: {
    label: 'KBZ Pay',
    labelMM: 'KBZ Pay',
    Icon: DevicePhoneMobileIcon,
    color: 'purple',
    desc: 'Pay using your KBZ Pay mobile wallet',
  },
  wave_pay: {
    label: 'Wave Pay',
    labelMM: 'Wave Pay',
    Icon: DevicePhoneMobileIcon,
    color: 'blue',
    desc: 'Pay using your Wave Money wallet',
  },
  cash_on_delivery: {
    label: 'Cash on Delivery',
    labelMM: 'ပစ္စည်းရောက်မှ ငွေပေးချေ',
    Icon: TruckIcon,
    color: 'orange',
    desc: 'Pay cash when your order arrives',
  },
};

const fmtMMK = (n) => {
  const v = Number(n) || 0;
  return v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M MMK`
    : `${v.toLocaleString()} MMK`;
};

const pad2 = (n) => String(n).padStart(2, '0');

// ── Sub-components ────────────────────────────────────────────────────────────

function Countdown({ expiresAt, onExpired }) {
  const [secs, setSecs] = useState(() => {
    const diff = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
    return diff;
  });

  useEffect(() => {
    if (secs <= 0) { onExpired?.(); return; }
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, onExpired]);

  const min = Math.floor(secs / 60);
  const sec = secs % 60;
  const urgent = secs < 60;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-bold ${
      urgent ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
             : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
    }`}>
      <ClockIcon className="h-4 w-4" />
      {pad2(min)}:{pad2(sec)}
    </div>
  );
}

function QRPanel({ session, onExpired }) {
  const [enlarged, setEnlarged] = useState(false);
  const qrSizeClass = enlarged ? 'w-72 h-72' : 'w-52 h-52';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full">
        <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
          Scan the QR code with your banking app
        </p>
        {session.expires_at && (
          <Countdown expiresAt={session.expires_at} onExpired={onExpired} />
        )}
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2">
        <img
          src={MMQR_LOGO_SRC}
          alt="MMQR"
          className="h-8 w-auto object-contain"
          loading="eager"
          decoding="async"
        />
        <span className="text-xs font-semibold tracking-wide text-gray-600 dark:text-slate-300">
          Official MMQR payment
        </span>
      </div>

      {/* QR image */}
      <button
        onClick={() => setEnlarged(e => !e)}
        className="rounded-2xl border-4 border-green-500 bg-white p-2 shadow-lg transition-all duration-200"
        title="Click to enlarge"
      >
        {session.qr_image_url ? (
          <img
            src={session.qr_image_url}
            alt="Payment QR Code"
            className={`${qrSizeClass} object-contain transition-all duration-200`}
          />
        ) : session.qr_string ? (
          <div className={`${qrSizeClass} flex items-center justify-center transition-all duration-200`}>
            <QRCodeSVG
              value={session.qr_string}
              size={enlarged ? 288 : 208}
              level="M"
              includeMargin={false}
            />
          </div>
        ) : (
          <div className={`${qrSizeClass} bg-gray-100 dark:bg-slate-700 rounded-2xl animate-pulse flex items-center justify-center transition-all duration-200`}>
            <QrCodeIcon className="h-12 w-12 text-gray-300 dark:text-slate-500" />
          </div>
        )}
      </button>

      <p className="text-center text-[11px] font-extrabold tracking-[0.16em] text-gray-700 dark:text-slate-200">
        PAYMENT POWERED BY MYANMYANPAY
      </p>
      {session.sandbox && (
        <div className="w-full text-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg py-2 px-3">
          ⚠ Sandbox / Development mode — no real payment will be processed
        </div>
      )}
    </div>
  );
}

function DeepLinkPanel({ session, method }) {
  const meta = METHOD_META[method] || {};

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
        <DevicePhoneMobileIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
      </div>

      <div className="text-center">
        <p className="font-semibold text-gray-900 dark:text-slate-100">{meta.label} Payment</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Tap the button below to open {meta.label} on your phone
        </p>
      </div>

      {session.deep_link && (
        <a
          href={session.deep_link}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
        >
          <DevicePhoneMobileIcon className="h-5 w-5" />
          Open {meta.label} App
        </a>
      )}

      <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
        After completing payment in the app, return here. The status will update automatically.
      </p>

      {session.sandbox && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg py-2 px-3 w-full text-center">
          ⚠ Sandbox mode — deep link will not open a real wallet
        </div>
      )}
    </div>
  );
}

function CODPanel({ order }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
        <TruckIcon className="h-10 w-10 text-orange-500 shrink-0" />
        <div>
          <p className="font-semibold text-gray-900 dark:text-slate-100">Cash on Delivery</p>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            You will pay <strong>{fmtMMK(order.total_amount)}</strong> when your order arrives
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {[
          'Order is confirmed immediately — no advance payment needed',
          'Have the exact amount ready when the delivery arrives',
          'You can inspect items before paying',
        ].map((text, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 dark:text-slate-300">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PaymentProcessor({ order, onSuccess, onCancel }) {
  const method = order?.payment_method || 'cash_on_delivery';
  const meta   = METHOD_META[method] || METHOD_META.cash_on_delivery;

  const [stage,   setStage]   = useState('init');    // init | pending | polling | success | failed | expired
  const [session, setSession] = useState(null);      // gateway initiate response
  const [error,   setError]   = useState('');
  const [polls,   setPolls]   = useState(0);

  const pollRef = useRef(null);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Initiate ───────────────────────────────────────────────────────────────
  const initiatePayment = useCallback(async () => {
    setStage('pending');
    setError('');
    try {
      const res = await api.post('/payments/initiate', { order_id: order.id });
      if (!res.data.success) {
        setError(res.data.message || 'Failed to initiate payment.');
        setStage('init');
        return;
      }
      setSession(res.data);
      setStage('polling');
      startPolling();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not reach payment gateway.');
      setStage('init');
    }
  }, [order]);

  // ── COD — confirm immediately ──────────────────────────────────────────────
  const confirmCOD = useCallback(async () => {
    setStage('pending');
    try {
      await api.post('/payments/initiate', { order_id: order.id });
      setStage('success');
      onSuccess?.(order);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to place order.');
      setStage('init');
    }
  }, [order, onSuccess]);

  // ── Polling ────────────────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    stopPolling();
    let count = 0;
    let consecutiveFails = 0;
    pollRef.current = setInterval(async () => {
      count++;
      setPolls(count);
      if (count > MAX_POLLS) {
        stopPolling();
        setStage('expired');
        return;
      }
      try {
        const res = await api.post('/payments/verify', { order_id: order.id });
        consecutiveFails = 0;  // reset on success
        if (res.data.paid) {
          stopPolling();
          setStage('success');
          onSuccess?.({ ...order, ...res.data });
        }
      } catch (pollErr) {
        consecutiveFails++;
        // Stop after 5 consecutive failures — likely CORS, auth, or server down
        if (consecutiveFails >= 5) {
          stopPolling();
          const isCors = pollErr?.message?.includes('Network Error');
          setError(isCors
            ? 'Cannot reach the payment server. Check your internet connection and try again.'
            : 'Payment verification failed. Please check your orders page.'
          );
          setStage('failed');
        }
        // 1-4 failures: keep trying (transient network hiccup)
      }
    }, POLL_INTERVAL_MS);
  }, [order, onSuccess, stopPolling]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleExpired = useCallback(() => {
    stopPolling();
    setStage('expired');
  }, [stopPolling]);

  const handleRetry = () => {
    setSession(null);
    setPolls(0);
    setError('');
    setStage('init');
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const colorMap = { green: 'text-green-600', purple: 'text-purple-600', blue: 'text-blue-600', orange: 'text-orange-500' };
  const iconColor = colorMap[meta.color] || 'text-gray-600';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden max-w-md w-full mx-auto">

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <meta.Icon className={`h-6 w-6 ${iconColor}`} />
          <div>
            <h2 className="font-bold text-gray-900 dark:text-slate-100">{meta.label}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">{meta.desc}</p>
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-slate-400">Amount to pay</span>
        <span className="text-lg font-bold text-gray-900 dark:text-slate-100">
          {fmtMMK(order.total_amount)}
        </span>
      </div>

      {/* Body */}
      <div className="px-6 py-5">

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* ── Stage: init ── */}
        {stage === 'init' && method === 'cash_on_delivery' && (
          <CODPanel order={order} />
        )}

        {stage === 'init' && method !== 'cash_on_delivery' && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
              Order <strong className="font-mono">#{order.order_number}</strong>
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Click below to generate your {meta.label} payment
            </p>
          </div>
        )}

        {/* ── Stage: pending (loading) ── */}
        {stage === 'pending' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <ArrowPathIcon className="h-8 w-8 text-gray-400 dark:text-slate-500 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-slate-400">Connecting to payment gateway…</p>
          </div>
        )}

        {/* ── Stage: polling ── */}
        {stage === 'polling' && session && (
          <>
            {/* MMQR shows QR */}
            {method === 'mmqr' && (
              <QRPanel session={session} onExpired={handleExpired} />
            )}
            {/* KBZPay / WavePay show deep link */}
            {(method === 'kbz_pay' || method === 'wave_pay') && (
              <DeepLinkPanel session={session} method={method} />
            )}
            {/* Polling indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Waiting for payment confirmation…
            </div>
          </>
        )}

        {/* ── Stage: success ── */}
        {stage === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-slate-100">Payment Confirmed!</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Order <strong className="font-mono">#{order.order_number}</strong> is being processed
              </p>
            </div>
          </div>
        )}

        {/* ── Stage: failed ── */}
        {stage === 'failed' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircleIcon className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-slate-100">Payment Failed</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{error || 'The payment could not be completed.'}</p>
            </div>
          </div>
        )}

        {/* ── Stage: expired ── */}
        {stage === 'expired' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ClockIcon className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-slate-100">QR Code Expired</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">The payment session timed out. Generate a new QR to try again.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="px-6 pb-6 space-y-2">
        {/* Primary action */}
        {stage === 'init' && method === 'cash_on_delivery' && (
          <button
            onClick={confirmCOD}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
          >
            Confirm Order (Pay on Delivery)
          </button>
        )}
        {stage === 'init' && method !== 'cash_on_delivery' && (
          <button
            onClick={initiatePayment}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
          >
            Generate {meta.label} Payment
          </button>
        )}
        {(stage === 'failed' || stage === 'expired') && (
          <button
            onClick={handleRetry}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Try Again
          </button>
        )}
        {stage === 'success' && (
          <button
            onClick={() => onSuccess?.(order)}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
          >
            View Order
          </button>
        )}

        {/* Cancel — not shown on success */}
        {stage !== 'success' && (
          <button
            onClick={() => { stopPolling(); onCancel?.(); }}
            className="w-full py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm"
          >
            {stage === 'polling' ? 'Cancel Payment' : 'Go Back'}
          </button>
        )}
      </div>
    </div>
  );
}
