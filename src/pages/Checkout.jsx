import React, { useState, useEffect, useCallback } from "react";
import useSEO from "../hooks/useSEO";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CubeIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  XCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
  QrCodeIcon,
  TicketIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import PaymentProcessor from "../components/payments/PaymentProcessor";
import PaymentSuccess from "./PaymentSuccess";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatMMK(amount) {
  return new Intl.NumberFormat("en-MM", {
    style: "currency",
    currency: "MMK",
    minimumFractionDigits: 0,
  }).format(amount ?? 0);
}

const PAYMENT_METHODS = [
  { id: "mmqr", name: "MMQR Payment", description: "Scan QR code with any mobile banking app", icon: QrCodeIcon, color: "bg-blue-500" },
  { id: "kbz_pay", name: "KBZ Pay", description: "Pay with KBZ Pay mobile wallet", icon: CreditCardIcon, color: "bg-purple-500" },
  { id: "wave_pay", name: "Wave Pay", description: "Pay with Wave Pay mobile wallet", icon: CreditCardIcon, color: "bg-green-500" },
  { id: "cb_pay", name: "CB Pay", description: "Pay with CB Pay mobile wallet", icon: CreditCardIcon, color: "bg-red-500" },
  { id: "aya_pay", name: "AYA Pay", description: "Pay with AYA Pay mobile wallet", icon: CreditCardIcon, color: "bg-orange-500" },
  { id: "cash_on_delivery", name: "Cash on Delivery", description: "Pay when you receive your order", icon: CurrencyDollarIcon, color: "bg-yellow-500" },
];

export default function Checkout() {
  const { t } = useTranslation();
  const { cartItems, subtotal, totalItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const SeoComponent = useSEO({
    title: "Checkout | Pyonea",
    description: "Complete your purchase securely on Pyonea.",
    url: "/checkout",
    noindex: true,
  });

  // ── Order flow ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [successPaymentData, setSuccessPaymentData] = useState(null);

  // ── OTP ─────────────────────────────────────────────────────────────────────
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpEmailHint, setOtpEmailHint] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpVerified, setOtpVerified] = useState(false);
  const otpCountdownRef = React.useRef(null);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);

  // ── Seller policy agreement ──────────────────────────────────────────────────
  const [sellerPolicies, setSellerPolicies] = useState([]);
  const [agreedSellers, setAgreedSellers] = useState({});
  const [policyError, setPolicyError] = useState('');

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Shipping / payment ───────────────────────────────────────────────────────
  const [shippingAddress, setShippingAddress] = useState({
    full_name: "", phone: "", address: "",
    city: "", state: "", postal_code: "", country: "Myanmar",
  });
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [orderNotes, setOrderNotes] = useState("");

  // ── Enabled payment methods from admin settings ─────────────────────────────
  const [enabledMethods, setEnabledMethods] = useState([]);
  const [methodsLoading, setMethodsLoading] = useState(true);

  // ── Coupon ───────────────────────────────────────────────────────────────────
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // ── Fees — fetched live from /orders/checkout-fees ───────────────────────────
  // Replaces the previous hardcoded `SHIPPING_FEE = 5000` and `TAX_RATE = 0.05`.
  // The platform fee rate comes from the commission_rules table via
  // CommissionRateResolver (tier → business_type → category → default).
  // Tax (5%) shown to buyer. Commission is collected from the seller separately — not visible here.
  const [feesLoading, setFeesLoading] = useState(true);
  const [idempotencyKey] = useState(() => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
  const [shippingFee, setShippingFee] = useState(5000);
  const [sellerShipping, setSellerShipping] = useState([]);
  const [taxRate, setTaxRate] = useState(0.05);
  const [taxPct, setTaxPct] = useState(5.0);

// ── Location data — loaded from server (aggregated from seller delivery zones) ─
  const [locationStates, setLocationStates] = useState([]);
  const [locationLoading, setLocationLoading] = useState(true);

  // Load Myanmar locations with i18n support
  const { i18n } = useTranslation();
  useEffect(() => {
    // Try API first (seller zones)
    api.get('/checkout-locations')
      .then(res => {
        const states = res.data?.data?.states || [];
        if (res.data?.success && Array.isArray(states) && states.length > 0) {
          setLocationStates(states);
        } else {
          // Fallback to local DB
          const db = i18n.language.startsWith('my') 
            ? require('../data/myanmar-locations-mm.json')
            : require('../data/myanmar-locations-eng.json');
          const stateMap = {};
          db.flats.regions_states.forEach(region => {
            const loc = db.locations.find(l => l.region_state === region);
            if (loc) {
              stateMap[loc.region_state] = loc.cities.map(c => c.city);
            }
          });
          setLocationStates(Object.entries(stateMap).map(([state, cities]) => ({ state, cities })));
        }
      })
      .catch(() => {
        // Network error - direct DB fallback
        const db = i18n.language.startsWith('my') 
          ? require('../data/myanmar-locations-mm.json')
          : require('../data/myanmar-locations-eng.json');
        const stateMap = {};
        db.flats.regions_states.forEach(region => {
          const loc = db.locations.find(l => l.region_state === region);
          if (loc) {
            stateMap[loc.region_state] = loc.cities.map(c => c.city);
          }
        });
        setLocationStates(Object.entries(stateMap).map(([state, cities]) => ({ state, cities })));
      })
      .finally(() => setLocationLoading(false));
  }, [i18n.language]);

  // Fetch fees with location params — re-runs when address city/state changes
  // Debounced 700ms so fast typing doesn't hammer the API
  useEffect(() => {
    if (!user) return;
    setFeesLoading(true);
    const timer = setTimeout(() => {
      api.get('/orders/checkout-fees', {
        params: {
          country: shippingAddress.country || 'Myanmar',
          state:   shippingAddress.state   || undefined,
          city:    shippingAddress.city    || undefined,
        }
      })
        .then(res => {
          if (res.data.success) {
            const d = res.data.data;
            setShippingFee(d.shipping_fee ?? 5000);
            setSellerShipping(d.sellers ?? []);
            // Backend returns tax_rate / tax_pct (they represent platform commission)
            setTaxRate(d.tax_rate ?? 0.05);
            setTaxPct(d.tax_pct ?? 5.0);
          }
        })
        .catch(() => {
          // Network error — safe defaults remain
        })
        .finally(() => setFeesLoading(false));
    }, 700);
    return () => clearTimeout(timer);
  }, [user, shippingAddress.country, shippingAddress.state, shippingAddress.city]);

  // Derived totals — recalculate whenever fees or cart change
  const taxFee = subtotal * taxRate;
  const total = Math.max(0, subtotal + shippingFee + taxFee - couponDiscount);

  // ── Fetch seller policies ────────────────────────────────────────────────────
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) return;
    const slugs = [...new Set(cartItems.map(i => i.seller_slug).filter(Boolean))];
    if (slugs.length === 0) return;

    Promise.allSettled(
      slugs.map(slug =>
        api.get(`/sellers/${slug}`).then(r => {
          const s = r.data?.data?.seller;
          if (!s) return null;
          return {
            seller_id: s.id,
            seller_name: s.store_name,
            slug: s.store_slug,
            return_policy: s.return_policy,
            shipping_policy: s.shipping_policy,
          };
        })
      )
    ).then(results => {
      const policies = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)
        .filter(p => p.return_policy || p.shipping_policy);
      setSellerPolicies(policies);
    });
  }, [cartItems]);

  // ── Fetch enabled payment methods from admin settings ─────────────────────────
  useEffect(() => {
    api.get('/payment-methods')
      .then(res => {
        if (res.data.success && Array.isArray(res.data.data)) {
          setEnabledMethods(res.data.data);
        } else {
          // Fallback: show all methods if endpoint unavailable
          setEnabledMethods(['cash_on_delivery', 'mmqr', 'kbz_pay', 'wave_pay', 'cb_pay', 'aya_pay']);
        }
      })
      .catch(() => {
        // Network error — show all methods so checkout is never broken
        setEnabledMethods(['cash_on_delivery', 'mmqr', 'kbz_pay', 'wave_pay', 'cb_pay', 'aya_pay']);
      })
      .finally(() => setMethodsLoading(false));
  }, []);

  // ── Pre-fill shipping from user profile ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    api.get("/auth/me").then(res => {
      const u = res.data.data ?? res.data;
      setShippingAddress(prev => ({
        ...prev,
        full_name: u.name ?? "",
        phone: u.phone ?? "",
        address: u.address ?? "",
        city: u.city ?? "",
        state: u.state ?? "",
        postal_code: u.postal_code ?? "",
      }));
    }).catch(() => { });
  }, [user]);

  // ── Coupon ───────────────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCouponError("Please enter a coupon code"); return; }
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await api.post("/buyer/coupons/validate", {
        code,
        items: cartItems.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        subtotal,
      });
      const data = res.data.data;
      setAppliedCoupon(data);
      setCouponDiscount(data.discount_amount);
      setCouponInput("");
    } catch (err) {
      setCouponError(err.response?.data?.message ?? "Invalid or inapplicable coupon code");
      setAppliedCoupon(null);
      setCouponDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError("");
    setCouponInput("");
  };

  // ── Order payload builder ────────────────────────────────────────────────────
  const buildOrderPayload = (paymentStatus, paymentData = null) => ({
    items: cartItems.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: (item.is_currently_on_sale && item.selling_price && item.selling_price < item.price)
        ? item.selling_price
        : item.price,
    })),
    shipping_address: shippingAddress,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    payment_data: paymentData,
    notes: orderNotes,
    total_amount: total,
    subtotal_amount: subtotal,
    shipping_fee: shippingFee,
    tax_amount: taxFee,
    coupon_id: appliedCoupon?.coupon?.id ?? null,
    coupon_code: appliedCoupon?.coupon?.code ?? null,
    coupon_discount_amount: appliedCoupon?.discount_amount ?? 0,
  });

  // ── Create order ─────────────────────────────────────────────────────────────
  const createOrder = async ({ pendingPayment = false, paymentData = null } = {}) => {
    setLoading(true);
    try {
      const payload = buildOrderPayload(paymentData ? "paid" : "pending", paymentData);
      const response = await api.post("/orders", payload, { headers: { 'X-Idempotency-Key': idempotencyKey } });
      if (!response.data.success) throw new Error("Order creation failed");
      const order = response.data.data.orders?.[0] ?? response.data.data.order;
      if (pendingPayment) {
        setCurrentOrder(order);
        setShowPaymentModal(true);
        setPaymentAttempts(n => n + 1);
        return order;
      }
      showToast("success", `Order #${order?.order_number ?? ""} placed successfully!`);
      clearCart();
      setTimeout(() => navigate("/buyer"), 2000);
      return order;
    } catch (err) {
      showToast("error", err.response?.data?.message ?? "Failed to create order. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ── OTP countdown ────────────────────────────────────────────────────────────
  const startOtpCountdown = (seconds = 600) => {
    setOtpCountdown(seconds);
    clearInterval(otpCountdownRef.current);
    otpCountdownRef.current = setInterval(() => {
      setOtpCountdown(prev => {
        if (prev <= 1) { clearInterval(otpCountdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── OTP: request ─────────────────────────────────────────────────────────────
  const handleRequestOtp = async () => {
    if (!shippingAddress.full_name || !shippingAddress.phone || !shippingAddress.address) {
      showToast('error', 'Please fill in all required shipping fields');
      return;
    }
    const unagreed = sellerPolicies.filter(p => !agreedSellers[p.seller_id]);
    if (unagreed.length > 0) {
      setPolicyError(`Please agree to the policies of: ${unagreed.map(p => p.seller_name).join(', ')}`);
      document.getElementById('seller-policies')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setPolicyError('');
    setLoading(true);
    setOtpError('');
    try {
      const res = await api.post('/orders/request-otp', {
        items: cartItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
      });
      setOtpEmailHint(res.data.email_hint || '');
      setOtpValue('');
      setOtpVerified(false);
      setShowOtpModal(true);
      startOtpCountdown(res.data.expires_in || 600);
    } catch (err) {
      showToast('error', err.response?.data?.message ?? 'Failed to send confirmation code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP: verify ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) { setOtpError('Please enter the 6-digit code.'); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      await api.post('/orders/verify-otp', { otp: otpValue });
      setOtpVerified(true);
      clearInterval(otpCountdownRef.current);
      setTimeout(() => {
        setShowOtpModal(false);
        placeOrder();
      }, 800);
    } catch (err) {
      setOtpError(err.response?.data?.message ?? 'Incorrect code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!user) { navigate('/login'); return; }
    await handleRequestOtp();
  };

  const placeOrder = async () => {
    if (paymentMethod === 'cash_on_delivery') {
      await createOrder({ pendingPayment: false });
    } else {
      await createOrder({ pendingPayment: true });
    }
  };

  // ── MMQR ─────────────────────────────────────────────────────────────────────
  const handleMMQRSuccess = async (paymentData) => {
    try {
      await api.patch(`/orders/${currentOrder.id}/payment`, {
        payment_status: "paid",
        payment_data: paymentData,
      });
      setShowPaymentModal(false);
      const orderRes = await api.get(`/orders/${currentOrder.id}`);
      if (orderRes.data.success) {
        setSuccessOrder(orderRes.data.data);
        setSuccessPaymentData(paymentData);
        setPaymentSuccess(true);
        clearCart();
        setPaymentAttempts(0);
      }
    } catch {
      showToast("error", "Payment recorded but failed to load order details. Check your orders page.");
    }
  };

  const handleMMQRFailed = async (error) => {
    try {
      if (currentOrder?.id) {
        await api.patch(`/orders/${currentOrder.id}/payment`, {
          payment_status: "failed",
          payment_data: { error },
        });
      }
    } catch { /* best effort */ }
    setShowPaymentModal(false);
    showToast("error", `Payment failed: ${error}. Please try again.`);
  };

  // ── Early returns ─────────────────────────────────────────────────────────────
  if (paymentSuccess && successOrder) {
    return (
      <>
        {SeoComponent}
        <PaymentSuccess
          order={successOrder}
          paymentData={successPaymentData}
          onClose={() => { setPaymentSuccess(false); navigate("/buyer"); }}
        />
      </>
    );
  }

  if (cartItems.length === 0 && !showPaymentModal && !loading) {
    return (
      <div className="min-h-screen theme-transition bg-gray-50 dark:bg-slate-900 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-8">
            <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <CubeIcon className="h-12 w-12 text-gray-400 dark:text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-8">Add some products before checking out</p>
            <button
              onClick={() => navigate("/products")}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {SeoComponent}
      <div className="min-h-screen theme-transition bg-gray-50 dark:bg-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── OTP Modal ──────────────────────────────────────────────────── */}
          {showOtpModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full shadow-2xl">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Confirm Your Order</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">Enter the code sent to your email</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setShowOtpModal(false); setOtpValue(''); setOtpError(''); clearInterval(otpCountdownRef.current); }}
                      className="text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:text-slate-400 p-1"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {otpVerified ? (
                    <div className="text-center py-4">
                      <div className="h-14 w-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircleIcon className="h-8 w-8 text-green-600" />
                      </div>
                      <p className="text-base font-semibold text-green-700">Verified! Placing your order…</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 dark:text-slate-400 text-center">
                        We sent a <strong>6-digit code</strong> to{' '}
                        <span className="font-medium text-gray-900 dark:text-slate-100">{otpEmailHint}</span>
                      </p>

                      <div className="flex justify-center gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <input
                            key={i}
                            id={`otp-input-${i}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otpValue[i] || ''}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/, '');
                              const arr = otpValue.split('');
                              arr[i] = val;
                              const next = arr.join('').slice(0, 6);
                              setOtpValue(next);
                              setOtpError('');
                              if (val && i < 5) document.getElementById(`otp-input-${i + 1}`)?.focus();
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Backspace' && !otpValue[i] && i > 0) {
                                document.getElementById(`otp-input-${i - 1}`)?.focus();
                              }
                              if (e.key === 'Enter' && otpValue.length === 6) handleVerifyOtp();
                            }}
                            onPaste={e => {
                              e.preventDefault();
                              const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                              setOtpValue(pasted);
                              setOtpError('');
                              document.getElementById(`otp-input-${Math.min(pasted.length, 5)}`)?.focus();
                            }}
                            className={classNames(
                              'w-11 h-12 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100',
                              otpError ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/30' : 'border-gray-200 dark:border-slate-600 focus:border-green-500'
                            )}
                          />
                        ))}
                      </div>

                      {otpError && (
                        <p className="text-sm text-red-600 text-center flex items-center justify-center gap-1.5">
                          <XCircleIcon className="h-4 w-4 flex-shrink-0" />
                          {otpError}
                        </p>
                      )}

                      <p className="text-xs text-gray-400 dark:text-slate-600 text-center">
                        {otpCountdown > 0 ? (
                          <>Code expires in <span className="font-semibold text-gray-600 dark:text-slate-400">{Math.floor(otpCountdown / 60)}:{String(otpCountdown % 60).padStart(2, '0')}</span></>
                        ) : (
                          <span className="text-red-500 font-medium">Code expired.</span>
                        )}
                      </p>

                      <button
                        onClick={handleVerifyOtp}
                        disabled={otpLoading || otpValue.length !== 6 || otpCountdown === 0}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {otpLoading ? (
                          <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Verifying…</>
                        ) : 'Confirm Order'}
                      </button>

                      <div className="text-center">
                        <button
                          onClick={async () => {
                            // Reset OTP state
                            setOtpValue('');
                            setOtpError('');
                            setOtpVerified(false);
                            setLoading(true);
                            try {
                              const res = await api.post('/orders/request-otp', {
                                items: cartItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
                                shipping_address: shippingAddress,
                                payment_method: paymentMethod,
                              });
                              startOtpCountdown(res.data.expires_in || 600);
                              showToast('success', 'A new code has been sent to your email.');
                            } catch {
                              showToast('error', 'Failed to resend code. Please try again.');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={otpCountdown > 0}  // <-- Fixed
                          className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Didn't receive it? Resend code
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── MMQR Payment Modal ─────────────────────────────────────────── */}
          {showPaymentModal && currentOrder && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Complete Your Payment</h3>
                  <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:text-slate-400">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <PaymentProcessor
                  order={currentOrder}
                  onSuccess={async (confirmedOrder) => {
                    // Payment confirmed by gateway — fetch full order and show receipt
                    try {
                      const orderRes = await api.get(`/orders/${currentOrder.id}`);
                      if (orderRes.data.success) {
                        setSuccessOrder(orderRes.data.data);
                        setSuccessPaymentData(confirmedOrder);
                        setPaymentSuccess(true);
                        setShowPaymentModal(false);
                        clearCart();
                      }
                    } catch {
                      showToast("error", "Payment confirmed but failed to load receipt. Check your orders page.");
                      navigate("/buyer");
                    }
                  }}
                  onCancel={() => {
                    setShowPaymentModal(false);
                    setCurrentOrder(null);
                    showToast("error", "Payment cancelled. Your order has been saved — you can retry from your orders page.");
                  }}
                />
                <div className="p-4 border-t bg-gray-50 dark:bg-slate-900 text-center">
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Having issues?{" "}
                    <button
                      onClick={() => { setShowPaymentModal(false); setCurrentOrder(null); }}
                      className="text-green-600 hover:text-green-700 font-medium"
                    >
                      Try a different payment method
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Toast ──────────────────────────────────────────────────────── */}
          {toast && (
            <div className="fixed top-4 right-4 z-50 max-w-sm">
              <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 ${toast.type === "success"
                  ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700"
                  : "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700"
                }`}>
                {toast.type === "success"
                  ? <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                  : <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                }
                <p className={`text-sm font-medium flex-1 ${toast.type === "success" ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"
                  }`}>
                  {toast.message}
                </p>
                <button onClick={() => setToast(null)}>
                  <XMarkIcon className="h-4 w-4 text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:text-slate-400" />
                </button>
              </div>
            </div>
          )}

          {/* ── Page header ────────────────────────────────────────────────── */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">Checkout</h1>
            <p className="text-gray-600 dark:text-slate-400 mt-2">Complete your purchase</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* ── Left column ──────────────────────────────────────────────── */}
            <div className="space-y-6">

              {/* Shipping information */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6">
                <div className="flex items-center mb-6">
                  <MapPinIcon className="h-6 w-6 text-green-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Shipping Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Full Name *</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-600" />
                      <input
                        type="text" required
                        value={shippingAddress.full_name}
                        onChange={e => setShippingAddress(p => ({ ...p, full_name: e.target.value }))}
                        className="pl-10 w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Phone Number *</label>
                    <div className="relative">
                      <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-600" />
                      <input
                        type="tel" required
                        value={shippingAddress.phone}
                        onChange={e => setShippingAddress(p => ({ ...p, phone: e.target.value }))}
                        className="pl-10 w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                        placeholder="09XXXXXXXXX"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Address *</label>
                    <textarea
                      required
                      value={shippingAddress.address}
                      onChange={e => setShippingAddress(p => ({ ...p, address: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                      placeholder="Enter your complete address including township and city"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">State / Region *</label>
                    <select
                      value={shippingAddress.state}
                      onChange={e => setShippingAddress(p => ({ ...p, state: e.target.value, city: "" }))}
                      disabled={locationLoading}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 disabled:opacity-60">
                      <option value="">{locationLoading ? "Loading areas…" : "Select State / Region"}</option>
                      {locationStates.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">City *</label>
                    <select
                      value={shippingAddress.city}
                      disabled={!shippingAddress.state}
                      onChange={e => setShippingAddress(p => ({ ...p, city: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 disabled:bg-gray-50 dark:disabled:bg-slate-700 disabled:opacity-60">
                      <option value="">{shippingAddress.state ? "Select City" : "Select a state first"}</option>
                      {(locationStates.find(s => s.state === shippingAddress.state)?.cities ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Postal Code</label>
                    <input type="text" value={shippingAddress.postal_code} onChange={e => setShippingAddress(p => ({ ...p, postal_code: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Country</label>
                    <input
                      type="text" value={shippingAddress.country} disabled
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6">
                <div className="flex items-center mb-6">
                  <CreditCardIcon className="h-6 w-6 text-green-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Payment Method</h2>
                </div>

                <div className="space-y-4">
                  {methodsLoading ? (
                    <div className="space-y-3">
                      {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-slate-700 animate-pulse" />)}
                    </div>
                  ) : null}
                  {!methodsLoading && PAYMENT_METHODS.filter(m => enabledMethods.includes(m.id)).map(method => (
                    <div
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={classNames(
                        "border-2 rounded-lg p-4 cursor-pointer transition-all",
                        paymentMethod === method.id
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                      )}
                    >
                      <div className="flex items-center">
                        <div className={classNames("w-10 h-10 rounded-full flex items-center justify-center mr-4", method.color)}>
                          <method.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-slate-100">{method.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{method.description}</p>
                        </div>
                        <div className={classNames(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          paymentMethod === method.id ? "border-green-500 bg-green-500" : "border-gray-300 dark:border-slate-500"
                        )}>
                          {paymentMethod === method.id && <div className="w-2 h-2 rounded-full bg-white dark:bg-slate-800" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {paymentMethod === "mmqr" && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>How MMQR works:</strong> After confirming your order, you'll see a QR code to scan with any mobile banking app.
                    </p>
                  </div>
                )}
                {paymentMethod === "cash_on_delivery" && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      <strong>Cash on Delivery:</strong> Pay the delivery person when you receive your order.
                    </p>
                  </div>
                )}
              </div>

              {/* Order notes */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Order Notes (Optional)</h3>
                <textarea
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  placeholder="Any special instructions for your order…"
                />
              </div>
            </div>

            {/* ── Right column — Order summary ──────────────────────────────── */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6 sticky top-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Order Summary</h2>

                {/* Cart items */}
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded"
                            onError={e => { e.target.src = "/placeholder-product.jpg"; }}
                          />
                        </div>
                        <div className="max-w-[180px]">
                          <h4 className="font-medium text-gray-900 dark:text-slate-100 text-sm line-clamp-2">{item.name}</h4>
                          <p className="text-gray-500 dark:text-slate-500 text-sm">Qty: {item.quantity}</p>
                          {item.seller_name && (
                            <p className="text-gray-400 dark:text-slate-600 text-xs">Sold by: {item.seller_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {item.is_currently_on_sale && item.selling_price && item.selling_price < item.price ? (
                          <>
                            <p className="font-medium text-red-600 dark:text-red-400">{formatMMK(item.selling_price * item.quantity)}</p>
                            <p className="text-gray-400 dark:text-slate-600 line-through text-sm">{formatMMK(item.price)} each</p>
                            <p className="text-gray-500 dark:text-slate-500 text-xs">{formatMMK(item.selling_price)} each</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-900 dark:text-slate-100">{formatMMK(item.price * item.quantity)}</p>
                            <p className="text-gray-500 dark:text-slate-500 text-sm">{formatMMK(item.price)} each</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon */}
                <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <TicketIcon className="h-4 w-4 text-green-600" />
                    Coupon Code
                  </h3>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TagIcon className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-semibold text-green-800 dark:text-green-300 font-mono tracking-wide">
                            {appliedCoupon.coupon.code}
                          </span>
                          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                            {appliedCoupon.coupon.type === "percentage"
                              ? `${appliedCoupon.coupon.value}% off`
                              : `${formatMMK(appliedCoupon.coupon.value)} off`
                            }
                            {" · "}Saves {formatMMK(appliedCoupon.discount_amount)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-green-600 hover:text-red-600 transition-colors"
                        title="Remove coupon"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={e => { setCouponInput(e.target.value.toUpperCase()); if (couponError) setCouponError(""); }}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                          className={classNames(
                            "flex-1 px-4 py-2.5 border rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500",
                            couponError ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20" : "border-gray-300 dark:border-slate-600"
                          )}
                          placeholder="Enter coupon code"
                          maxLength={50}
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {couponLoading
                            ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            : "Apply"
                          }
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <XCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                          {couponError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Price breakdown */}
                <div className="space-y-3 border-t border-gray-200 dark:border-slate-700 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-400">Subtotal ({totalItems} items)</span>
                    <span className="text-gray-900 dark:text-slate-100">{formatMMK(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-slate-400">Shipping</span>
                      {(shippingAddress.city || shippingAddress.state) && (
                        <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-0.5">
                          To {[shippingAddress.city, shippingAddress.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    {feesLoading
                      ? <span className="text-gray-400 dark:text-slate-600 animate-pulse text-xs">Updating…</span>
                      : <span className="text-gray-900 dark:text-slate-100">{formatMMK(shippingFee)}</span>
                    }
                  </div>

                  {/* Tax (5%) — part of buyer total; seller commission is separate and not shown to buyer */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-400">
                      Tax ({feesLoading ? '…' : `${taxPct}%`})
                    </span>
                    {feesLoading
                      ? <span className="text-gray-400 dark:text-slate-600 animate-pulse">Calculating…</span>
                      : <span className="text-gray-900 dark:text-slate-100">{formatMMK(taxFee)}</span>
                    }
                  </div>

                  {appliedCoupon && couponDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700 flex items-center gap-1">
                        <TagIcon className="h-3.5 w-3.5" />
                        Coupon ({appliedCoupon.coupon.code})
                      </span>
                      <span className="text-green-700 font-medium">− {formatMMK(couponDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-slate-700 pt-3">
                    <span className="text-gray-900 dark:text-slate-100">Total</span>
                    {feesLoading
                      ? <span className="text-gray-400 dark:text-slate-600 animate-pulse">Calculating…</span>
                      : <span className="text-green-600">{formatMMK(total)}</span>
                    }
                  </div>
                </div>

                {/* Security badge */}
                <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-slate-500">
                  <ShieldCheckIcon className="h-4 w-4" />
                  <span>Secure checkout · SSL encrypted</span>
                </div>

                {/* Seller Policy Agreement */}
                {sellerPolicies.length > 0 && (
                  <div id="seller-policies" className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 space-y-3 mt-4">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Seller Policies — Please Review &amp; Agree
                    </p>
                    {sellerPolicies.map(p => (
                      <div key={p.seller_id} className="bg-white dark:bg-slate-800 rounded-lg border border-amber-100 p-3 space-y-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{p.seller_name}</p>
                        {p.return_policy && (
                          <details className="group">
                            <summary className="text-xs font-medium text-green-700 cursor-pointer list-none flex items-center gap-1 hover:text-green-800">
                              <svg className="h-3.5 w-3.5 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              Return &amp; Refund Policy
                            </summary>
                            <p className="mt-1.5 text-xs text-gray-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap pl-4">{p.return_policy}</p>
                          </details>
                        )}
                        {p.shipping_policy && (
                          <details className="group">
                            <summary className="text-xs font-medium text-green-700 cursor-pointer list-none flex items-center gap-1 hover:text-green-800">
                              <svg className="h-3.5 w-3.5 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              Shipping Policy
                            </summary>
                            <p className="mt-1.5 text-xs text-gray-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap pl-4">{p.shipping_policy}</p>
                          </details>
                        )}
                        <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                          <div className="relative flex-shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              checked={!!agreedSellers[p.seller_id]}
                              onChange={e => {
                                setAgreedSellers(prev => ({ ...prev, [p.seller_id]: e.target.checked }));
                                setPolicyError('');
                              }}
                              className="sr-only"
                            />
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${agreedSellers[p.seller_id]
                                ? 'bg-green-600 border-green-600'
                                : 'border-gray-300 dark:border-slate-500 hover:border-green-400'
                              }`}>
                              {agreedSellers[p.seller_id] && (
                                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-700 dark:text-slate-300 leading-snug">
                            I have read and agree to {p.seller_name}'s return and shipping policies
                          </span>
                        </label>
                      </div>
                    ))}
                    {policyError && (
                      <p className="text-sm text-red-600 flex items-center gap-1.5">
                        <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {policyError}
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleConfirmOrder}
                  disabled={loading || feesLoading}
                  className={classNames(
                    "w-full mt-6 py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold text-white transition-all",
                    loading || feesLoading
                      ? "bg-gray-400 dark:bg-slate-600 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl"
                  )}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Processing Order…
                    </div>
                  ) : paymentMethod === "cash_on_delivery"
                    ? `Confirm Cash Order · ${formatMMK(total)}`
                    : `Proceed to Payment · ${formatMMK(total)}`
                  }
                </button>

                <button
                  onClick={() => navigate("/products")}
                  className="w-full mt-3 py-3 px-6 border border-gray-300 dark:border-slate-600 rounded-lg font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>

              {/* Trust indicators */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <TruckIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Fast Delivery</p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">2–5 business days</p>
                  </div>
                  <div>
                    <ShieldCheckIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Secure Payment</p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">SSL Protected</p>
                  </div>
                </div>
              </div>

              {/* Delivery information */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Delivery Information</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                  <p>• Orders are processed within 24 hours</p>
                  <p>• Suppliers may contact you for delivery details</p>
                  <p>• Tracking information will be provided after shipment</p>
                  <p>• Free returns within 7 days for eligible items</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}