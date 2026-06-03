import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { getImageUrl } from "../utils/imageHelpers";
import PaymentProcessor from "../components/payments/PaymentProcessor";
import PaymentSuccess from "./PaymentSuccess";
import getMyanmarStates from "../data/myanmar-locations";
import {
  toLocationTree,
  myanmarLocationsEng,
  buildCheckoutLocationRows,
  resolveCanonicalLocation,
} from "../utils/myanmarLocationTree";

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
  const { t, i18n } = useTranslation();
  const { cartItems, subtotal, totalItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const SeoComponent = useSEO({
    title: t("checkout.seo_title"),
    description: t("checkout.seo_description"),
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
    city: "", state: "", township: "", postal_code: "", country: "Myanmar",
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
  // Shipping is zone-based; `taxRate` / `taxFee` are buyer-side surcharges resolved
  // server-side (not labeled as commission to the buyer). Checkout shows one combined
  // "Shipping & handling" line; order payload still sends `shipping_fee` + `tax_amount`.
  const [feesLoading, setFeesLoading] = useState(true);
  const [idempotencyKey] = useState(() => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
  const [shippingFee, setShippingFee] = useState(5000);
  const [sellerShipping, setSellerShipping] = useState([]);
  const [taxRate, setTaxRate] = useState(0.05);

  const displayTree = useMemo(
    () => toLocationTree(getMyanmarStates(i18n.language), myanmarLocationsEng),
    [i18n.language],
  );

  const [locationRows, setLocationRows] = useState([]);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLocationLoading(true);
    api
      .get("/checkout-locations")
      .then((res) => {
        const apiStates = res.data?.success ? res.data?.data?.states : null;
        const rows = buildCheckoutLocationRows(
          Array.isArray(apiStates) && apiStates.length ? apiStates : null,
          displayTree,
        );
        if (!cancelled) setLocationRows(rows);
      })
      .catch(() => {
        if (!cancelled) setLocationRows(buildCheckoutLocationRows(null, displayTree));
      })
      .finally(() => {
        if (!cancelled) setLocationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [i18n.language, displayTree]);

  const selectedTreeNode = useMemo(
    () => displayTree.find((n) => n.engState === shippingAddress.state),
    [displayTree, shippingAddress.state],
  );
  const selectedCityNode = useMemo(
    () => selectedTreeNode?.cities.find((c) => c.engCity === shippingAddress.city),
    [selectedTreeNode, shippingAddress.city],
  );

  const shippingLocationSummary = useMemo(() => {
    const row = locationRows.find((r) => r.engState === shippingAddress.state);
    const cityRow = row?.cities?.find((c) => c.engCity === shippingAddress.city);
    const twIdx = selectedCityNode?.engTownships?.indexOf(shippingAddress.township) ?? -1;
    const twLabel =
      twIdx >= 0 && selectedCityNode?.townships?.[twIdx]
        ? selectedCityNode.townships[twIdx]
        : shippingAddress.township || "";
    return [cityRow?.label, twLabel, row?.label].filter(Boolean).join(", ");
  }, [
    locationRows,
    shippingAddress.state,
    shippingAddress.city,
    shippingAddress.township,
    selectedCityNode,
  ]);

  // Fetch fees with location params — re-runs when address city/state changes
  // Debounced 700ms so fast typing doesn't hammer the API
  useEffect(() => {
    if (!user) return;
    setFeesLoading(true);
    const timer = setTimeout(() => {
      api.get('/orders/checkout-fees', {
        params: {
          country: shippingAddress.country || 'Myanmar',
          state: shippingAddress.state || undefined,
          city: shippingAddress.city || undefined,
          township: shippingAddress.township || undefined,
        },
      })
        .then(res => {
          if (res.data.success) {
            const d = res.data.data;
            setShippingFee(d.shipping_fee ?? 5000);
            setSellerShipping(d.sellers ?? []);
            setTaxRate(d.tax_rate ?? 0.05);
          }
        })
        .catch(() => {
          // Network error — safe defaults remain
        })
        .finally(() => setFeesLoading(false));
    }, 700);
    return () => clearTimeout(timer);
  }, [user, shippingAddress.country, shippingAddress.state, shippingAddress.city, shippingAddress.township]);

  // Derived totals — recalculate whenever fees or cart change
  const taxFee = subtotal * taxRate;
  const shippingAndHandlingDisplay = shippingFee + taxFee;
  const total = Math.max(0, subtotal + shippingFee + taxFee - couponDiscount);
  const hasCartIssues = cartItems.some((item) => !item.is_available || !item.is_quantity_valid);
  const cartItemPayload = useMemo(
    () => cartItems.map(item => ({
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      quantity: item.quantity,
    })),
    [cartItems],
  );

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

  // ── Pre-fill shipping from user profile (canonical English state/city/township) ─
  useEffect(() => {
    if (!user) return;
    api
      .get("/auth/me")
      .then((res) => {
        const u = res.data.data ?? res.data;
        const { engState, engCity, engTownship } = resolveCanonicalLocation(
          displayTree,
          u.state,
          u.city,
          u.township,
        );
        setShippingAddress((prev) => ({
          ...prev,
          full_name: u.name ?? "",
          phone: u.phone ?? "",
          address: u.address ?? "",
          city: engCity,
          state: engState,
          township: engTownship,
          postal_code: u.postal_code ?? "",
        }));
      })
      .catch(() => {});
  }, [user, displayTree]);

  // ── Coupon ───────────────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCouponError(t("checkout.coupon_enter_code")); return; }
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await api.post("/buyer/coupons/validate", {
        code,
        items: cartItemPayload,
        subtotal,
      });
      const data = res.data.data;
      setAppliedCoupon(data);
      setCouponDiscount(data.discount_amount);
      setCouponInput("");
    } catch (err) {
      setCouponError(err.response?.data?.message ?? t("checkout.coupon_invalid"));
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
      // Use selling_price whenever it's below the base price — this covers both
      // active sale discounts and wholesale tier pricing. The CartController
      // already resolves the correct selling_price server-side; we mirror that here
      // so the order record always reflects what the buyer actually paid.
      price: item.selling_price != null && item.selling_price < item.price
        ? item.selling_price
        : item.price,
      variant_id: item.variant_id ?? null,
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
      if (!response.data.success) throw new Error(t("checkout.order_creation_failed"));
      const order = response.data.data.orders?.[0] ?? response.data.data.order;
      if (pendingPayment) {
        setCurrentOrder(order);
        setShowPaymentModal(true);
        setPaymentAttempts(n => n + 1);
        return order;
      }
      showToast("success", t("checkout.order_success_toast", { number: order?.order_number ?? "" }));
      clearCart();
      setTimeout(() => navigate("/buyer"), 2000);
      return order;
    } catch (err) {
      showToast("error", err.response?.data?.message ?? t("checkout.order_create_failed"));
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
    if (hasCartIssues) {
      showToast('error', t("checkout.cart_quantity_issue", "Please return to your cart and update unavailable items or MOQ quantities."));
      return;
    }
    if (!shippingAddress.full_name || !shippingAddress.phone || !shippingAddress.address) {
      showToast('error', t("checkout.fill_required_shipping"));
      return;
    }
    if (!shippingAddress.state || !shippingAddress.city) {
      showToast('error', t("checkout.fill_state_city"));
      return;
    }
    const needsTownship = (selectedCityNode?.engTownships?.length ?? 0) > 0;
    if (needsTownship && !shippingAddress.township) {
      showToast('error', t("checkout.fill_township"));
      return;
    }
    const unagreed = sellerPolicies.filter(p => !agreedSellers[p.seller_id]);
    if (unagreed.length > 0) {
      setPolicyError(t("checkout.policy_agree_error", { sellers: unagreed.map(p => p.seller_name).join(', ') }));
      document.getElementById('seller-policies')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setPolicyError('');
    setLoading(true);
    setOtpError('');
    try {
      const res = await api.post('/orders/request-otp', {
        items: cartItemPayload,
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
      });
      setOtpEmailHint(res.data.email_hint || '');
      setOtpValue('');
      setOtpVerified(false);
      setShowOtpModal(true);
      startOtpCountdown(res.data.expires_in || 600);
    } catch (err) {
      showToast('error', err.response?.data?.message ?? t("checkout.otp_send_failed"));
    } finally {
      setLoading(false);
    }
  };

  // ── OTP: verify ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) { setOtpError(t("checkout.otp_enter_code")); return; }
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
      setOtpError(err.response?.data?.message ?? t("checkout.otp_incorrect"));
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
      showToast("error", t("checkout.payment_recorded_load_failed"));
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
    showToast("error", t("checkout.payment_failed", { error }));
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">{t("checkout.empty_cart_title")}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-8">{t("checkout.empty_cart_message")}</p>
            <button
              onClick={() => navigate("/products")}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700"
            >
              {t("checkout.continue_shopping")}
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
                        <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">{t("checkout.otp_title")}</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{t("checkout.otp_subtitle")}</p>
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
                      <p className="text-base font-semibold text-green-700">{t("checkout.otp_verified")}</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 dark:text-slate-400 text-center">
                        {t("checkout.otp_sent_prefix")} <strong>{t("checkout.otp_6_digit_code")}</strong> {t("checkout.otp_sent_to")}{' '}
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
                          <>{t("checkout.otp_expires_in")} <span className="font-semibold text-gray-600 dark:text-slate-400">{Math.floor(otpCountdown / 60)}:{String(otpCountdown % 60).padStart(2, '0')}</span></>
                        ) : (
                          <span className="text-red-500 font-medium">{t("checkout.otp_expired")}</span>
                        )}
                      </p>

                      <button
                        onClick={handleVerifyOtp}
                        disabled={otpLoading || otpValue.length !== 6 || otpCountdown === 0}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {otpLoading ? (
                          <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> {t("checkout.verifying")}</>
                        ) : t("checkout.confirm_order")}
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
                                items: cartItemPayload,
                                shipping_address: shippingAddress,
                                payment_method: paymentMethod,
                              });
                              startOtpCountdown(res.data.expires_in || 600);
                              showToast('success', t("checkout.otp_resend_success"));
                            } catch {
                              showToast('error', t("checkout.otp_resend_failed"));
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={otpCountdown > 0}  // <-- Fixed
                          className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {t("checkout.otp_resend")}
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
                  <h3 className="text-lg font-semibold">{t("checkout.complete_payment")}</h3>
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
                      showToast("error", t("checkout.payment_confirmed_load_failed"));
                      navigate("/buyer");
                    }
                  }}
                  onCancel={() => {
                    setShowPaymentModal(false);
                    setCurrentOrder(null);
                    showToast("error", t("checkout.payment_cancelled_saved"));
                  }}
                />
                <div className="p-4 border-t bg-gray-50 dark:bg-slate-900 text-center">
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {t("checkout.payment_issues")}{" "}
                    <button
                      onClick={() => { setShowPaymentModal(false); setCurrentOrder(null); }}
                      className="text-green-600 hover:text-green-700 font-medium"
                    >
                      {t("checkout.try_different_payment")}
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">{t("checkout.title")}</h1>
            <p className="text-gray-600 dark:text-slate-400 mt-2">{t("checkout.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* ── Left column ──────────────────────────────────────────────── */}
            <div className="space-y-6">

              {/* Shipping information */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6">
                <div className="flex items-center mb-6">
                  <MapPinIcon className="h-6 w-6 text-green-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{t("checkout.shipping_info")}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{t("checkout.full_name")} *</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-600" />
                      <input
                        type="text" required
                        value={shippingAddress.full_name}
                        onChange={e => setShippingAddress(p => ({ ...p, full_name: e.target.value }))}
                        className="pl-10 w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                        placeholder={t("checkout.full_name_placeholder")}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{t("checkout.phone_number")} *</label>
                    <div className="relative">
                      <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-600" />
                      <input
                        type="tel" required
                        value={shippingAddress.phone}
                        onChange={e => setShippingAddress(p => ({ ...p, phone: e.target.value }))}
                        className="pl-10 w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                        placeholder={t("checkout.phone_placeholder")}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{t("checkout.address")} *</label>
                    <textarea
                      required
                      value={shippingAddress.address}
                      onChange={e => setShippingAddress(p => ({ ...p, address: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                      placeholder={t("checkout.address_placeholder")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{t("checkout.state_region")} *</label>
                    <select
                      value={shippingAddress.state}
                      onChange={(e) =>
                        setShippingAddress((p) => ({ ...p, state: e.target.value, city: "", township: "" }))
                      }
                      disabled={locationLoading}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 disabled:opacity-60">
                      <option value="">{locationLoading ? t("checkout.loading_areas") : t("checkout.select_state_region")}</option>
                      {locationRows.map((row) => (
                        <option key={row.engState} value={row.engState}>
                          {row.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      {t("checkout.city")} *
                    </label>
                    <select
                      value={shippingAddress.city}
                      disabled={!shippingAddress.state}
                      onChange={(e) =>
                        setShippingAddress((p) => ({ ...p, city: e.target.value, township: "" }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 disabled:bg-gray-50 dark:disabled:bg-slate-700 disabled:opacity-60">
                      <option value="">
                        {shippingAddress.state ? t("checkout.select_city") : t("checkout.select_state_first")}
                      </option>
                      {(locationRows.find((r) => r.engState === shippingAddress.state)?.cities ?? []).map((c) => (
                        <option key={c.engCity} value={c.engCity}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(selectedCityNode?.engTownships?.length ?? 0) > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        {t("checkout.township")} *
                      </label>
                      <select
                        value={shippingAddress.township}
                        disabled={!shippingAddress.city}
                        onChange={(e) =>
                          setShippingAddress((p) => ({ ...p, township: e.target.value }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 disabled:bg-gray-50 dark:disabled:bg-slate-700 disabled:opacity-60">
                        <option value="">{t("checkout.select_township")}</option>
                        {(selectedCityNode?.engTownships ?? []).map((engT, idx) => (
                          <option key={engT} value={engT}>
                            {selectedCityNode.townships[idx] || engT}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{t("checkout.postal_code")}</label>
                    <input type="text" value={shippingAddress.postal_code} onChange={e => setShippingAddress(p => ({ ...p, postal_code: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{t("checkout.country")}</label>
                    <input
                      type="text" value={t("checkout.country_myanmar")} disabled
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6">
                <div className="flex items-center mb-6">
                  <CreditCardIcon className="h-6 w-6 text-green-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{t("checkout.payment_method")}</h2>
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
                          <h3 className="font-medium text-gray-900 dark:text-slate-100">{t(`checkout.payment_methods.${method.id}.name`)}</h3>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{t(`checkout.payment_methods.${method.id}.description`)}</p>
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
                      <strong>{t("checkout.mmqr_how_title")}</strong> {t("checkout.mmqr_how_text")}
                    </p>
                  </div>
                )}
                {paymentMethod === "cash_on_delivery" && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      <strong>{t("checkout.cod_title")}</strong> {t("checkout.cod_text")}
                    </p>
                  </div>
                )}
              </div>

              {/* Order notes */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">{t("checkout.order_notes_optional")}</h3>
                <textarea
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  placeholder={t("checkout.order_notes_placeholder")}
                />
              </div>
            </div>

            {/* ── Right column — Order summary ──────────────────────────────── */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6 sticky top-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">{t("checkout.order_summary")}</h2>

                {/* Cart items */}
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded"
                            onError={e => { e.target.src = "/placeholder-product.jpg"; }}
                          />
                        </div>
                        <div className="max-w-[180px]">
                          <h4 className="font-medium text-gray-900 dark:text-slate-100 text-sm line-clamp-2">{item.name}</h4>
                          <p className="text-gray-500 dark:text-slate-500 text-sm">{t("checkout.qty")}: {item.quantity}</p>
                          {item.seller_name && (
                            <p className="text-gray-400 dark:text-slate-600 text-xs">{t("checkout.sold_by")}: {item.seller_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {item.selling_price != null && item.selling_price < item.price ? (
                          <>
                            <p className="font-medium text-red-600 dark:text-red-400">
                              {formatMMK(item.selling_price * item.quantity)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-slate-600 line-through">
                              {formatMMK(item.price * item.quantity)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-500">
                              {formatMMK(item.selling_price)} {t("checkout.each")}
                              {item.applied_tier && (
                                <span className="ml-1 text-green-600 dark:text-green-400 font-semibold">
                                  · {item.applied_tier.discount_pct > 0 ? `-${item.applied_tier.discount_pct}%` : t("checkout.tier_price", "Tier")}
                                </span>
                              )}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-900 dark:text-slate-100">
                              {formatMMK(item.price * item.quantity)}
                            </p>
                            <p className="text-gray-500 dark:text-slate-500 text-sm">
                              {formatMMK(item.price)} {t("checkout.each")}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {hasCartIssues && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200">
                    {t("checkout.cart_quantity_issue", "Please return to your cart and update unavailable items or MOQ quantities.")}
                  </div>
                )}

                {/* Coupon */}
                <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <TicketIcon className="h-4 w-4 text-green-600" />
                    {t("checkout.coupon_code")}
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
                              ? t("checkout.percent_off", { value: appliedCoupon.coupon.value })
                              : t("checkout.amount_off", { amount: formatMMK(appliedCoupon.coupon.value) })
                            }
                            {" - "}{t("checkout.saves", { amount: formatMMK(appliedCoupon.discount_amount) })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-green-600 hover:text-red-600 transition-colors"
                        title={t("checkout.remove_coupon")}
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
                          placeholder={t("checkout.enter_coupon_code")}
                          maxLength={50}
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {couponLoading
                            ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            : t("checkout.apply")
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
                    <span className="text-gray-600 dark:text-slate-400">{t("checkout.subtotal_items", { count: totalItems })}</span>
                    <span className="text-gray-900 dark:text-slate-100">{formatMMK(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-slate-400">{t("checkout.shipping_handling")}</span>
                      {(shippingAddress.city || shippingAddress.state) && (
                        <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-0.5">
                          {t("checkout.to_location", {
                            location:
                              shippingLocationSummary ||
                              [shippingAddress.city, shippingAddress.state].filter(Boolean).join(", "),
                          })}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-0.5 max-w-[220px]">
                        {t("checkout.shipping_handling_note")}
                      </p>
                    </div>
                    {feesLoading
                      ? <span className="text-gray-400 dark:text-slate-600 animate-pulse text-xs">{t("checkout.updating")}</span>
                      : <span className="text-gray-900 dark:text-slate-100">{formatMMK(shippingAndHandlingDisplay)}</span>
                    }
                  </div>

                  {appliedCoupon && couponDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700 flex items-center gap-1">
                        <TagIcon className="h-3.5 w-3.5" />
                        {t("checkout.coupon_with_code", { code: appliedCoupon.coupon.code })}
                      </span>
                      <span className="text-green-700 font-medium">− {formatMMK(couponDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-slate-700 pt-3">
                    <span className="text-gray-900 dark:text-slate-100">{t("checkout.total")}</span>
                    {feesLoading
                      ? <span className="text-gray-400 dark:text-slate-600 animate-pulse">{t("checkout.calculating")}</span>
                      : <span className="text-green-600">{formatMMK(total)}</span>
                    }
                  </div>
                </div>

                {/* Security badge */}
                <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-slate-500">
                  <ShieldCheckIcon className="h-4 w-4" />
                  <span>{t("checkout.secure_checkout")}</span>
                </div>

                {/* Seller Policy Agreement */}
                {sellerPolicies.length > 0 && (
                  <div id="seller-policies" className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 space-y-3 mt-4">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t("checkout.seller_policies_title")}
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
                              {t("checkout.return_refund_policy")}
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
                              {t("checkout.shipping_policy")}
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
                            {t("checkout.agree_seller_policies", { seller: p.seller_name })}
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
                  disabled={loading || feesLoading || hasCartIssues}
                  className={classNames(
                    "w-full mt-6 py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold text-white transition-all",
                    loading || feesLoading || hasCartIssues
                      ? "bg-gray-400 dark:bg-slate-600 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl"
                  )}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      {t("checkout.processing_order")}
                    </div>
                  ) : paymentMethod === "cash_on_delivery"
                    ? t("checkout.confirm_cash_order_amount", { amount: formatMMK(total) })
                    : t("checkout.proceed_payment_amount", { amount: formatMMK(total) })
                  }
                </button>

                <button
                  onClick={() => navigate("/products")}
                  className="w-full mt-3 py-3 px-6 border border-gray-300 dark:border-slate-600 rounded-lg font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t("checkout.continue_shopping")}
                </button>
              </div>

              {/* Trust indicators */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <TruckIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t("checkout.fast_delivery")}</p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">{t("checkout.delivery_days")}</p>
                  </div>
                  <div>
                    <ShieldCheckIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t("checkout.secure_payment")}</p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">{t("checkout.ssl_protected")}</p>
                  </div>
                </div>
              </div>

              {/* Delivery information */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">{t("checkout.delivery_information")}</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                  <p>{t("checkout.delivery_info_1")}</p>
                  <p>{t("checkout.delivery_info_2")}</p>
                  <p>{t("checkout.delivery_info_3")}</p>
                  <p>{t("checkout.delivery_info_4")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
