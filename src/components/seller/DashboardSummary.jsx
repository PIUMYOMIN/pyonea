import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  StarIcon,
  TruckIcon,
  BanknotesIcon,
  LockClosedIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../utils/api";
import i18n from "../../i18n";
import { useSubscription } from "../../context/SubscriptionContext";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtK = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return v.toLocaleString();
};
const fmtMMK = (n) => `${fmtK(n)} ${i18n.t("common.currency.mmk", "MMK")}`;

// ── Tier config ────────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  bronze: { label: "Bronze", rate: "6%", next: "Silver", threshold: 50, color: "from-amber-600 to-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", emoji: "🥉" },
  silver: { label: "Silver", rate: "5%", next: "Gold", threshold: 500, color: "from-slate-400 to-slate-500", bg: "bg-slate-50 dark:bg-slate-700/30", border: "border-slate-200 dark:border-slate-600", text: "text-slate-700 dark:text-slate-300", emoji: "🥈" },
  gold: { label: "Gold", rate: "4%", next: null, threshold: null, color: "from-yellow-500 to-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300", emoji: "🥇" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const TierCard = ({ storeData }) => {
  const tier = storeData?.seller_tier || "bronze";
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
  const completed = Number(storeData?.delivered_orders_count ?? storeData?.completed_orders_count ?? 0);
  const promoted = storeData?.tier_promoted_at
    ? new Date(storeData.tier_promoted_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : null;
  const progress = cfg.threshold ? Math.min(100, Math.round((completed / cfg.threshold) * 100)) : 100;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Your Tier</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl">{cfg.emoji}</span>
            <span className={`text-xl font-bold ${cfg.text}`}>{cfg.label}</span>
          </div>
          {promoted && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Since {promoted}</p>}
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Delivered orders: <span className="font-semibold text-gray-700 dark:text-slate-200">{completed}</span></p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Commission Rate</p>
          <p className={`text-2xl font-bold ${cfg.text} mt-1`}>{cfg.rate}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">per order</p>
        </div>
      </div>
      {cfg.threshold ? (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1.5">
            <span>{completed} delivered orders</span>
            <span>{cfg.threshold} for {cfg.next}</span>
          </div>
          <div className="w-full bg-white dark:bg-slate-700 rounded-full h-2 border border-gray-200 dark:border-slate-600">
            <div className={`h-2 rounded-full bg-gradient-to-r ${cfg.color} transition-all duration-500`}
              style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">
            {cfg.threshold - completed > 0
              ? `${cfg.threshold - completed} more delivered orders to reach ${cfg.next}`
              : `Ready to be promoted to ${cfg.next}!`}
          </p>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-yellow-400" />
          <p className="text-xs text-yellow-700 font-medium">Highest tier — lowest commission rate</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, change, changeType, accent }) => {
  const accents = {
    green: "border-l-4 border-green-400 bg-green-50 dark:bg-green-900/20",
    blue: "border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/20",
    amber: "border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20",
    red: "border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20",
    purple: "border-l-4 border-purple-400 bg-purple-50 dark:bg-purple-900/20",
    teal: "border-l-4 border-teal-400 bg-teal-50 dark:bg-teal-900/20",
    gray: "border-l-4 border-gray-300 bg-gray-50 dark:bg-slate-700/30",
  };
  return (
    <div className={`rounded-xl p-4 shadow-sm ${accents[accent] ?? accents.gray}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1 break-all">{value}</p>
          {sub && <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
          {change !== undefined && (
            <div className={`flex items-center gap-0.5 mt-1.5 text-xs font-semibold ${changeType === "positive" ? "text-green-600" : changeType === "negative" ? "text-red-500" : "text-gray-400 dark:text-slate-500"
              }`}>
              {changeType === "positive"
                ? <ArrowUpIcon className="h-3 w-3" />
                : changeType === "negative"
                  ? <ArrowDownIcon className="h-3 w-3" />
                  : null}
              <span>{change}</span>
            </div>
          )}
        </div>
        <Icon className="h-7 w-7 text-gray-200 dark:text-slate-600 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
};

const SetupChecklist = ({ storeData, onSetupClick }) => {
  const [hasDeliveryZones, setHasDeliveryZones] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadDeliveryZones = async () => {
      try {
        const res = await api.get("/seller/delivery-areas");
        if (!mounted) return;
        const zones = res.data?.data || [];
        setHasDeliveryZones(Array.isArray(zones) && zones.length > 0);
      } catch {
        if (!mounted) return;
        setHasDeliveryZones(false);
      }
    };

    loadDeliveryZones();
    return () => { mounted = false; };
  }, []);

  const items = [
    { id: 1, label: "Store Profile Complete", done: !!(storeData?.store_name && storeData?.contact_email), action: "Complete profile", step: "my-store" },
    { id: 2, label: "Store Logo Uploaded", done: !!storeData?.store_logo, action: "Upload logo", step: "my-store" },
    { id: 3, label: "Business Details", done: !!(storeData?.business_registration_number || storeData?.business_type === "individual"), action: "Add details", step: "my-store" },
    { id: 4, label: "Payment Method Set", done: !!storeData?.account_number, action: "Set up payment", step: "my-store" },
    { id: 5, label: "Delivery Zones Configured", done: hasDeliveryZones, action: "Set up zones", step: "delivery_zones" },
  ];
  const done = items.filter(i => i.done).length;
  const total = items.length;
  if (done === total) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300">Store Setup Checklist</h3>
        <span className="text-sm text-blue-700 dark:text-blue-400">{done}/{total} completed</span>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="flex items-center">
              {item.done
                ? <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                : <div className="w-5 h-5 rounded-full border-2 border-blue-300 mr-2" />}
              <span className={`text-sm ${item.done ? "text-gray-500 dark:text-slate-400" : "text-gray-900 dark:text-slate-100"}`}>{item.label}</span>
            </div>
            {!item.done && (
              <button onClick={() => onSetupClick?.(item.step)}
                className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 px-3 py-1 rounded-lg">
                {item.action}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400 mb-1">
          <span>Setup Progress</span><span>{Math.round((done / total) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
            style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────────────────────
const DashboardSummary = ({ storeData, stats, refreshData, onSetupClick }) => {
  const { t } = useTranslation();
  const { loading: subscriptionLoading, subscription } = useSubscription();
  const analyticsEnabled = subscription?.plan?.analytics_enabled === true;
  const [dash, setDash] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deliveryFees, setDeliveryFees] = useState([]);
  const [commissionData, setCommissionData] = useState(null);
  const fetchCommissionData = async () => {
    try { const res = await api.get('/seller/commission-summary'); if (res.data.success) setCommissionData(res.data.data); } catch { }
  };
const [feeSubmitting, setFeeSubmitting] = useState(null);
  const [feeNotes, setFeeNotes] = useState({});
  const [feeToast, setFeeToast] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const initialFetchDone = useRef(false);

  const flashFee = (msg, type = "success") => {
    setFeeToast({ msg, type });
    setTimeout(() => setFeeToast(null), 3500);
  };

  const fetchDeliveryFees = useCallback(async () => {
    try {
      const res = await api.get("/deliveries", { params: { delivery_method: "platform", per_page: 50 } });
      const items = res.data?.data?.data ?? res.data?.data ?? [];
      setDeliveryFees(Array.isArray(items) ? items : []);
    } catch { }
  }, []);

  const handleSubmitFee = async (deliveryId) => {
    setFeeSubmitting(deliveryId);
    const note = feeNotes[deliveryId] || "Delivery fee paid.";
    try {
      await api.patch(`/deliveries/${deliveryId}/submit-fee`, { note });
      flashFee("Fee submission sent to admin!");
      setFeeNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[deliveryId];
        return newNotes;
      });
      fetchDeliveryFees();
    } catch (err) {
      flashFee(err.response?.data?.message || "Failed to submit fee.", "error");
    } finally { setFeeSubmitting(null); }
  };

  const fetchAll = useCallback(async () => {
    if (subscriptionLoading) return;

    setLoading(true);
    setError(null);
    try {
      const [salesRes, recentRes, delivRes, walletRes] = await Promise.allSettled([
        analyticsEnabled
          ? api.get("/seller/sales-summary")
          : Promise.resolve({ data: { success: true, data: {} } }),
        api.get("/seller/recent-orders?limit=8"),
        api.get("/deliveries?stats=true"),
        api.get("/seller/wallet"),
      ]);

      const salesData = salesRes.status === "fulfilled" && salesRes.value.data?.success
        ? salesRes.value.data.data || {}
        : {};

      const recentOrders = recentRes.status === "fulfilled"
        ? recentRes.value.data?.data || []
        : [];

      const delivStats = delivRes.status === "fulfilled" && delivRes.value.data?.success
        ? delivRes.value.data.data?.delivery_stats || {}
        : {};

      setDash({
        orders: {
          total: salesData.sales?.total_orders || 0,
          byStatus: salesData.orders_by_status || {},
          recent: recentOrders,
        },
        sales: {
          totalRevenue: salesData.sales?.total_revenue || 0,
          monthlyTrend: salesData.recent_trend || [],
          averageOrderValue: salesData.sales?.average_order_value || 0,
        },
        products: {
          total: salesData.products?.total || 0,
          active: salesData.products?.active || 0,
          lowStock: salesData.products?.low_stock || 0,
        },
        deliveries: {
          total: delivStats.total || 0,
          byStatus: delivStats.by_status || {},
        },
      });

      if (walletRes.status === "fulfilled" && walletRes.value.data?.success) {
        setWallet(walletRes.value.data.data?.wallet || null);
      }

      await fetchDeliveryFees();
    } catch (err) {
      setError(!err.response
        ? "Cannot reach the server. Please check your connection."
        : "Failed to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [analyticsEnabled, fetchDeliveryFees, subscriptionLoading]);

  useEffect(() => {
    if (subscriptionLoading) return;
    if (!initialFetchDone.current) { initialFetchDone.current = true; fetchAll(); }
  }, [fetchAll, subscriptionLoading]);

  useEffect(() => { if (!subscriptionLoading && refreshData) fetchAll(); }, [refreshData, fetchAll, subscriptionLoading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchAll(),
        refreshData ? refreshData() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !dash) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
        <button onClick={fetchAll} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Retry</button>
      </div>
    );
  }

  const os = dash?.orders?.byStatus || {};
  const ds = dash?.deliveries?.byStatus || {};

  const metrics = {
    delivered: os.delivered || 0,
    pending: os.pending || 0,
    processing: (os.confirmed || 0) + (os.processing || 0),
    cancelled: os.cancelled || 0,
    shipped: os.shipped || 0,
    totalRevenue: dash?.sales.totalRevenue || 0,
    avgOrderValue: dash?.sales.averageOrderValue || 0,
    activeProducts: dash?.products.active || 0,
    totalProducts: dash?.products.total || 0,
    lowStock: dash?.products.lowStock || 0,
    deliveryTotal: dash?.deliveries.total || 0,
    deliveryDone: ds.delivered || 0,
    deliveryActive: (ds.in_transit || 0) + (ds.out_for_delivery || 0),

    // Wallet
    escrowBalance: wallet?.escrow_balance || 0,
    availableBalance: wallet?.available_balance || 0,
    totalEarned: wallet?.total_earned || 0,
    commissionPaid: wallet?.total_commission_paid || 0,
    codOutstanding: wallet?.cod_commission_outstanding || 0,
    netRevenue: (wallet?.total_earned || 0) - 0, // total_earned is already after commission
  };

  const completionRate = dash?.orders.total > 0
    ? ((metrics.delivered / dash.orders.total) * 100).toFixed(1)
    : "0.0";

  // Chart data
  const orderStatusData = [
    { name: "Delivered", value: metrics.delivered, color: "#22c55e" },
    { name: "Pending", value: metrics.pending, color: "#fbbf24" },
    { name: "Processing", value: metrics.processing, color: "#3b82f6" },
    { name: "Shipped", value: metrics.shipped, color: "#a855f7" },
    { name: "Cancelled", value: metrics.cancelled, color: "#ef4444" },
  ];

  const salesTrendData = (dash?.sales.monthlyTrend || []).map(i => {
      if (!i?.date) return "";
      return {
        date: new Date(i.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: i?.revenue || 0,
        orders: i?.orders_count || 0,
      };
    }).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t("seller.overview")}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t("seller.dashboard_summary")}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing || loading ? "animate-spin" : ""}`} />
          {refreshing || loading ? t("seller.dashboard_refreshing", "Refreshing...") : t("refresh", "Refresh")}
        </button>
      </div>

      {/* Setup checklist */}
      <SetupChecklist storeData={storeData} onSetupClick={onSetupClick} />

      {/* Store status banner */}
      {storeData && (
        <div className={`p-4 rounded-lg ${storeData.status === "approved" ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" :
          storeData.status === "pending" ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800" :
            "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
          }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${storeData.status === "approved" ? "bg-green-500" :
              storeData.status === "pending" ? "bg-yellow-500 animate-pulse" : "bg-blue-500"
              }`} />
            <div>
              <h3 className="font-semibold text-sm text-gray-800 dark:text-slate-100">
                {storeData.status === "approved" ? "Store Active" :
                  storeData.status === "pending" ? "Pending Approval" : "Setup Required"}
              </h3>
              <p className="text-xs opacity-75 text-gray-700 dark:text-slate-200">
                {storeData.status === "approved" ? "Your store is live and accepting orders" :
                  storeData.status === "pending" ? "Your store is under review by our team" :
                    "Please complete your store setup"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tier card */}
      {storeData && <TierCard storeData={storeData} />}

      {/* ── Commission & Delivery Fee Summary ─────────────────────── */}
      {commissionData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Total Commission</p>
            <p className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-1">
              {fmtMMK(commissionData.commission?.total ?? 0)}
            </p>
            <p className="text-[11px] text-amber-500 mt-0.5">{commissionData.commission?.rate_pct ?? 0}% rate</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl p-4">
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Commission Pending</p>
            <p className="text-lg font-bold text-orange-800 dark:text-orange-300 mt-1">
              {fmtMMK(commissionData.commission?.pending ?? 0)}
            </p>
            <p className="text-[11px] text-orange-400 mt-0.5">
              {fmtMMK(commissionData.commission?.paid ?? 0)} collected
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Delivery Fees</p>
            <p className="text-lg font-bold text-blue-800 dark:text-blue-300 mt-1">
              {fmtMMK(commissionData.delivery_fees?.total ?? 0)}
            </p>
            <p className="text-[11px] text-blue-400 mt-0.5">
              {fmtMMK(commissionData.delivery_fees?.confirmed ?? 0)} confirmed
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-2xl p-4">
            <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Fees Pending</p>
            <p className="text-lg font-bold text-yellow-800 dark:text-yellow-300 mt-1">
              {fmtMMK(commissionData.delivery_fees?.pending ?? 0)}
            </p>
            <p className="text-[11px] text-yellow-500 mt-0.5">
              {fmtMMK(commissionData.delivery_fees?.submitted_awaiting ?? 0)} awaiting admin
            </p>
          </div>
        </div>
      )}


      {/* COD outstanding warning */}
      {metrics.codOutstanding > 0 && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">COD Commission Outstanding</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">
              You owe <strong>{fmtMMK(metrics.codOutstanding)}</strong> in commission for COD orders.
              Please settle via the Wallet tab to avoid restrictions.
            </p>
          </div>
        </div>
      )}

      {/* ── WALLET STATS ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Wallet & Earnings</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={LockClosedIcon}
            label="In Escrow"
            value={fmtMMK(metrics.escrowBalance)}
            sub="Held until delivery confirmed"
            accent="blue"
          />
          <StatCard
            icon={BanknotesIcon}
            label="Available Balance"
            value={fmtMMK(metrics.availableBalance)}
            sub="Ready to withdraw"
            accent="green"
          />
          <StatCard
            icon={CurrencyDollarIcon}
            label="Total Earned"
            value={fmtMMK(metrics.totalEarned)}
            sub="Lifetime seller payout"
            accent="teal"
          />
          <StatCard
            icon={DocumentTextIcon}
            label="COD Outstanding"
            value={fmtMMK(metrics.codOutstanding)}
            sub="Commission owed to platform"
            accent={metrics.codOutstanding > 0 ? "red" : "gray"}
          />
        </div>
      </div>

      {/* ── ORDER STATS ───────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Orders</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            icon={CurrencyDollarIcon}
            label="Total Revenue"
            value={fmtMMK(metrics.totalRevenue)}
            sub="Gross order value"
            accent="green"
          />
          <StatCard
            icon={CheckCircleIcon}
            label="Delivered Orders"
            value={metrics.delivered.toLocaleString()}
            sub={`${completionRate}% completion rate`}
            accent="green"
          />
          <StatCard
            icon={ClockIcon}
            label="Pending Orders"
            value={metrics.pending.toLocaleString()}
            sub="Awaiting confirmation"
            accent="amber"
          />
          <StatCard
            icon={ShoppingBagIcon}
            label="Processing"
            value={metrics.processing.toLocaleString()}
            sub="Confirmed + Processing"
            accent="blue"
          />
          <StatCard
            icon={TruckIcon}
            label="Shipped"
            value={metrics.shipped.toLocaleString()}
            sub="Out for delivery"
            accent="purple"
          />
          <StatCard
            icon={XCircleIcon}
            label="Cancelled"
            value={metrics.cancelled.toLocaleString()}
            sub=""
            accent="red"
          />
        </div>
      </div>

      {/* ── PRODUCT & PERFORMANCE STATS ───────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Products & Performance</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={StarIcon}
            label="Active Products"
            value={metrics.activeProducts.toLocaleString()}
            sub={`${metrics.totalProducts} total`}
            accent="green"
          />
          <StatCard
            icon={ExclamationTriangleIcon}
            label="Low Stock"
            value={metrics.lowStock.toLocaleString()}
            sub="Restock soon"
            accent={metrics.lowStock > 0 ? "amber" : "gray"}
          />
          <StatCard
            icon={CurrencyDollarIcon}
            label="Avg. Order Value"
            value={fmtMMK(metrics.avgOrderValue)}
            sub="Per order"
            accent="teal"
          />
          <StatCard
            icon={UserGroupIcon}
            label="Commission Paid"
            value={fmtMMK(metrics.commissionPaid)}
            sub="To platform, all time"
            accent="gray"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <a href="https://t.me/pyonea_community" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 bg-sky-500 hover:bg-sky-600 rounded-2xl shadow-sm dark:shadow-slate-900/50 transition-colors p-3 group">
          <svg className="h-6 w-6 flex-shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          <div className="absolute hidden md:block opacity-0 group-hover:opacity-100 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap -top-10 left-1/2 -translate-x-1/2 transition-opacity pointer-events-none">
            Telegram Community
          </div>
        </a>
        <a href="https://web.facebook.com/groups/1936605890399715/?_rdc=1&_rdr#" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-sm dark:shadow-slate-900/50 transition-colors p-3 group">
          <svg className="h-6 w-6 flex-shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
          </svg>
          <div className="absolute hidden md:block opacity-0 group-hover:opacity-100 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap -top-10 left-1/2 -translate-x-1/2 transition-opacity pointer-events-none">
            Facebook Community
          </div>
        </a>

      </div>



      {/* Delivery fee panel */}
      {deliveryFees.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Platform Delivery Fees</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Submit fee confirmation once you have paid the delivery fee.</p>
            </div>
            {feeToast && (
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${feeToast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
                }`}>{feeToast.msg}</span>
            )}
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {deliveryFees.map(d => {
              const submitted = !!d.fee_submitted_at;
              const confirmed = !!d.fee_confirmed_at;
              return (
                <div key={d.id} className="px-5 py-4 flex flex-col sm:flex-row items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Order #{d.order?.order_number ?? d.order_id}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Fee: <strong className="text-green-700">
                        {fmtMMK(d.platform_delivery_fee ?? 0)}
                      </strong>
                      {" · "}
                      <span className={`font-semibold capitalize ${confirmed ? "text-green-600" : submitted ? "text-blue-600" : "text-gray-500"}`}>
                        {confirmed ? "✓ Confirmed by admin" : submitted ? "⏳ Awaiting admin confirmation" : "Not submitted"}
                      </span>
                    </p>
                  </div>
                  {!submitted && !confirmed && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input type="text" value={feeNotes[d.id] || ''} onChange={e => setFeeNotes(prev => ({ ...prev, [d.id]: e.target.value }))}
                        placeholder="Optional note…"
                        className="text-xs border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-1.5 w-36 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-green-500" />
                      <button onClick={() => handleSubmitFee(d.id)} disabled={feeSubmitting === d.id}
                        className="text-xs font-semibold px-4 py-1.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 whitespace-nowrap">
                        {feeSubmitting === d.id ? "Submitting…" : "Submit Payment"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Charts ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 shadow dark:shadow-slate-900/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Sales Trend (Last 7 Days)</h3>
          {(dash?.sales.monthlyTrend.length ?? 0) > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="revenue" tick={{ fontSize: 12 }} tickFormatter={fmtK} />
                  <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <RechartsTooltip
                    formatter={(value, name) => name === "Revenue (MMK)" ? [fmtMMK(value), name] : [value, name]}
                  />
                  <Legend verticalAlign="top" height={32} />
                  <Bar yAxisId="revenue" dataKey="revenue" name="Revenue (MMK)" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="orders" dataKey="orders" name="Orders" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">No sales data available</div>
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 shadow dark:shadow-slate-900/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Order Status Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            {(dash?.orders.total ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={2}
                  >
                    {orderStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value, name) => [value, name]} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 dark:text-slate-500 text-sm">No orders yet</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent orders + quick stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="bg-white dark:bg-slate-800 shadow dark:shadow-slate-900/50 rounded-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {(dash?.orders.recent.length ?? 0) > 0 ? dash.orders.recent.map(o => (
              <div key={o.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${o.status === "delivered" ? "bg-green-500" :
                    o.status === "pending" ? "bg-yellow-500" :
                      o.status === "cancelled" ? "bg-red-500" : "bg-blue-500"
                    }`} />
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-slate-100">#{o.order_number}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{o.buyer?.name || "Customer"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-gray-900 dark:text-slate-100">{fmtMMK(o.total_amount)}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{o.status}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                <ShoppingBagIcon className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                <p className="text-sm">No recent orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-white dark:bg-slate-800 shadow dark:shadow-slate-900/50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">Quick Stats</h3>
          {[
            { label: "Order Completion Rate", value: `${completionRate}%`, color: "text-green-600" },
            { label: "Avg. Order Value", value: fmtMMK(metrics.avgOrderValue), color: "text-gray-900 dark:text-slate-100" },
            { label: "Low Stock Products", value: metrics.lowStock.toString(), color: metrics.lowStock > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-slate-100" },
            { label: "Delivery Success Rate", value: dash?.deliveries.total > 0 ? Math.round((metrics.deliveryDone / dash.deliveries.total) * 100) + "%" : "—", color: "text-green-600" },
            { label: "Escrow (Locked)", value: fmtMMK(metrics.escrowBalance), color: "text-blue-600" },
            { label: "Available Payout", value: fmtMMK(metrics.availableBalance), color: "text-emerald-600" },
            { label: "Commission Paid (All Time)", value: fmtMMK(metrics.commissionPaid), color: "text-gray-600 dark:text-slate-400" },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-slate-400">{r.label}</span>
              <span className={`font-semibold text-sm ${r.color}`}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSummary;
