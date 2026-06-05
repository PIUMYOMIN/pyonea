// SellerDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  ChartBarIcon,
  BellIcon,
  ShoppingBagIcon,
  CubeIcon,
  CurrencyDollarIcon,
  StarIcon,
  UserGroupIcon,
  TruckIcon,
  CogIcon,
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  TicketIcon,
  GiftIcon,
  WalletIcon,
  TagIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/24/outline";
import DashboardSummary from "../../components/seller/DashboardSummary";
import OrderManagement from "../../components/seller/OrderManagement";
import ProductManagement from "../../components/seller/ProductManagement";
import SalesReports from "../../components/seller/SalesReports";
import ProductReviewManagement from "../../components/seller/ProductReviewManagement";
import Customers from "./Customers";
import DeliveryZones from "../../components/seller/DeliveryZones";
import { resolveSellerOnboardingStep } from "../../utils/sellerOnboarding";
import StoreSettings from "../../components/seller/StoreSettings";
import SellerMyStoreSection from "../../components/seller/SellerMyStoreSection";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { useLocation, useNavigate } from "react-router-dom";
import DeliveryManagement from "../../components/seller/DeliveryManagement";
import DiscountManagement from "../../components/seller/DiscountManagement";
import CouponManagement from "../../components/seller/CouponManagement";
import NotificationsPanel from "../../components/Shared/NotificationsPanel";
import { NotificationBell } from "../../components/Shared/NotificationsPanel";
import ReferralPanel from "../../components/Shared/ReferralPanel";
import SellerWallet from "../../components/seller/SellerWallet";
import SellerFinancialReports from "../../components/seller/SellerFinancialReports";
import BulkImportProducts from "../../components/seller/BulkImportProducts";
import DashboardRFQSection, { fetchRfqDashboardTabBadgeForRole } from "../../components/Shared/DashboardRFQSection";
import SellerSubscription from '../../components/seller/SellerSubscription';
import { useSubscription } from "../../context/SubscriptionContext";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const SellerDashboard = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { loading: subscriptionLoading, subscription } = useSubscription();
  const analyticsEnabled = subscription?.plan?.analytics_enabled === true;
  const [selectedTab, setSelectedTab] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0
  });

  const [showSetupNotification, setShowSetupNotification] = useState(false);
  const [rfqBadgeCount, setRfqBadgeCount] = useState(0);
  const [setupNotificationData, setSetupNotificationData] = useState({
    title: "",
    message: "",
    requiredActions: [],
    nextStep: "",
    ctaLabel: "Complete Setup",
    setupProgress: null
  });

  // ---------- Shared data-fetch logic (no loading state) ----------
  const doFetchStoreAndStats = useCallback(async () => {
    if (subscriptionLoading) return;

    const [storeResponse, statsResponse] = await Promise.allSettled([
      api.get("/seller/my-store"),
      analyticsEnabled
        ? api.get("/seller/sales-summary")
        : Promise.resolve({ data: { success: true, data: {} } })
    ]);

    if (storeResponse.status === 'fulfilled' && storeResponse.value.data.success) {
      setStoreData(storeResponse.value.data.data);
    } else if (storeResponse.status === 'rejected') {
      console.error("Failed to fetch store data:", storeResponse.reason);
      if (storeResponse.reason.response?.status === 404) {
        setShowSetupNotification(true);
        setSetupNotificationData({
          title: "Store Profile Required",
          message: "You need to create your store profile to start selling.",
          requiredActions: ["Create store profile"],
          nextStep: "my-store"
        });
      }
    }

    if (statsResponse.status === 'fulfilled' && statsResponse.value.data.success) {
      const salesData = statsResponse.value.data.data.sales || {};
      setStats({
        totalProducts: statsResponse.value.data.data.products?.total || 0,
        totalOrders: salesData.total_orders || 0,
        totalRevenue: salesData.total_revenue || 0,
        pendingOrders: statsResponse.value.data.data.orders_by_status?.pending || 0
      });
    }
  }, [analyticsEnabled, subscriptionLoading]);

  // Initial page load — shows full-screen spinner
  const fetchGlobalData = useCallback(async () => {
    try {
      setLoading(true);
      await doFetchStoreAndStats();
    } catch (error) {
      console.error("Failed to fetch global data:", error);
      if (error.response?.status === 403) {
        // 403 here means a plan feature is blocked — not an auth error.
        // Do nothing; the PlanFeatureGate in child components handles the UI.
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, doFetchStoreAndStats]);

  // Silent background refresh — called by child components after saves/uploads.
  // Does NOT set loading=true so the UI stays stable and the user's current tab
  // is never interrupted by a spinner.
  const refreshGlobalData = useCallback(async () => {
    try {
      await doFetchStoreAndStats();
    } catch (error) {
      console.error("Background refresh failed:", error);
    }
  }, [doFetchStoreAndStats]);

  // Fetch onboarding status silently — called by the polling interval so
  // admin-approved/rejected status changes appear in real time without a
  // full page reload.  Does NOT set loading=true.
  const fetchOnboardingStatus = useCallback(async () => {
    try {
      const response = await api.get('/seller/onboarding/status').catch(error => {
        if (error.response?.status === 404) return null;
        throw error;
      });
      if (response?.data?.success) {
        setOnboardingStatus(response.data.data || response.data);
      }
    } catch (error) {
      console.error('Failed to fetch onboarding status:', error);
    }
  }, []);
  // ---------- Handle setup click (only for navigation) ----------
  const handleSetupClick = useCallback((step) => {
    if (step === 'my-store') {
      // Checklist item buttons → open the store update form directly
      navigate('/seller/dashboard?tab=my-store&view=edit');
    } else if (step === 'delivery_zones') {
      navigate('/seller/dashboard?tab=delivery_zones');
    } else if (step === 'settings') {
      navigate('/seller/dashboard?tab=settings');
    }
  }, [navigate]);

  const fetchRfqBadgeCount = useCallback(async () => {
    const n = await fetchRfqDashboardTabBadgeForRole("seller");
    setRfqBadgeCount(n);
  }, []);

  const navigation = useMemo(() => [
    { name: t("seller.dashboard"), icon: ChartBarIcon, key: "dashboard" },
    { name: t("seller.sidebar.notifications"), icon: BellIcon, key: "notifications" },
    { name: t("seller.my_store"),       icon: BuildingStorefrontIcon, key: "my_store" },
    { name: t("seller.order.title"), icon: ShoppingBagIcon, key: "orders" },
    { name: t("seller.product.title"),  icon: CubeIcon,               key: "products" },
    { name: t("seller.discount.title"), icon: TagIcon,               key: "discounts" },
    { name: t("seller.sidebar.coupons"), icon: TicketIcon, key: "coupons" },
    { name: t("seller.delivery_zones.title"), icon: TruckIcon, key: "delivery_zones" },
    { name: t("seller.sidebar.rfq"), icon: DocumentTextIcon, key: "rfq" },
    { name: t("seller.sales.title"),    icon: CurrencyDollarIcon,     key: "sales" },
    { name: t("seller.reviews.title"),  icon: StarIcon,               key: "reviews" },
    { name: t("seller.customers"),      icon: UserGroupIcon,          key: "customers" },
    { name: t("seller.delivery.title"), icon: TruckIcon, key: "delivery" },
    { name: t("seller.sidebar.subscription"), icon: SparklesIcon, key: "subscription" },
    { name: t("seller.sidebar.bulk_import"), icon: ArrowUpTrayIcon, key: "bulk_import" },
    { name: t("seller.sidebar.financial_reports"), icon: ChartBarIcon, key: "financial_reports" },
    { name: t("seller.sidebar.wallet"), icon: WalletIcon, key: "wallet" },
    { name: t("seller.sidebar.referrals"), icon: GiftIcon, key: "referrals" },
    { name: t("seller.settings"), icon: CogIcon, key: "settings" },
  ], [t]);

  // Render the active tab with current state — separated from the stable nav structure
  const renderActiveTab = () => {
    const key = navigation[selectedTab]?.key;
    switch (key) {
      case "dashboard": return <DashboardSummary storeData={storeData} stats={stats} refreshData={refreshGlobalData} onSetupClick={handleSetupClick} />;
      case "notifications":  return <NotificationsPanel />;
      case "my_store":    return <SellerMyStoreSection storeData={storeData} stats={stats} refreshData={refreshGlobalData} />;
      case "orders":      return <OrderManagement />;
      case "delivery":    return <DeliveryManagement />;
      case "products":    return <ProductManagement />;
      case "discounts":   return <DiscountManagement />;
      case "coupons":     return <CouponManagement />;
      case "sales":       return <SalesReports />;
      case "reviews":     return <ProductReviewManagement />;
      case "customers":   return <Customers />;
      case "delivery_zones":    return <DeliveryZones storeData={storeData} />;
      case "settings": return <StoreSettings storeData={storeData} setStoreData={setStoreData} refreshData={refreshGlobalData} />;
      case "referrals": return <ReferralPanel />;
      case "wallet": return <SellerWallet />;
      case 'subscription': return <SellerSubscription />;
      case "financial_reports": return <SellerFinancialReports storeName={storeData?.store_name} />;
      case "bulk_import":       return <BulkImportProducts />;
      case "rfq": return <DashboardRFQSection role="seller" />;
      default:               return null;
    }
  };

  // ---------- Handle URL parameters (tab selection) ----------
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const initialTab = searchParams.get("tab");
    const editMode = searchParams.get("edit");
    const setupParam = searchParams.get("setup");

    if (editMode === "true" || initialTab === "edit-store") {
      const editStoreIndex = navigation.findIndex((item) => item.key === "edit_store");
      if (editStoreIndex !== -1) setSelectedTab(editStoreIndex);
      return;
    }

    if (setupParam === "true") {
      const myStoreIndex = navigation.findIndex((item) => item.key === "my_store");
      if (myStoreIndex !== -1) setSelectedTab(myStoreIndex);
      return;
    }

    if (initialTab === "store_profile") {
      const myStoreIndex = navigation.findIndex((item) => item.key === "my_store");
      if (myStoreIndex !== -1) setSelectedTab(myStoreIndex);
      navigate("/seller/dashboard?tab=my-store&view=edit", { replace: true });
      return;
    }

    if (initialTab === "profile") {
      const settingsIndex = navigation.findIndex((item) => item.key === "settings");
      if (settingsIndex !== -1) setSelectedTab(settingsIndex);
      navigate("/seller/dashboard?tab=settings&section=personal", { replace: true });
      return;
    }

    if (initialTab) {
      const tabIndex = navigation.findIndex((item) => item.key === initialTab.replaceAll("-", "_"));
      if (tabIndex !== -1) setSelectedTab(tabIndex);
    }
  }, [location.search, navigation, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchRfqBadgeCount();
    const timer = setInterval(fetchRfqBadgeCount, 60000);
    return () => clearInterval(timer);
  }, [user, fetchRfqBadgeCount]);

  // ---------- Check seller access and onboarding ----------
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      if (user.type !== 'seller' && !user.roles?.includes('seller')) {
        navigate('/');
        return;
      }

      try {
        const response = await api.get('/seller/onboarding/status').catch(error => {
          if (error.response?.status === 404) return null;
          throw error;
        });

        if (response?.data?.success) {
          const statusData = response.data.data || response.data;
          setOnboardingStatus(statusData);

          if (statusData.needs_onboarding || !statusData.onboarding_complete) {
            const step = await resolveSellerOnboardingStep(statusData);
            navigate(`/seller/onboarding/${step}`);
            return;
          }
        }

        await fetchGlobalData();

      } catch (error) {
        console.error('Failed to verify seller status:', error);
        try {
          // Silently sync store data — don't trip the full-page loading spinner.
          await refreshGlobalData();
        } catch {
          navigate('/seller/onboarding/store-basic');
        }
      }
    };

    if (user) checkAccess();
  }, [user, navigate, fetchGlobalData, refreshGlobalData]);

  // ---------- Setup notification based on storeData ----------
  useEffect(() => {
    if (!storeData) return;

    const setupProgress = storeData.setup_progress || onboardingStatus?.setup_progress || null;
    const incompleteSetupItems = setupProgress?.items?.filter((item) => !item.complete) || [];
    const requiredActions = incompleteSetupItems.map((item) => item.label);
    const nextStep = setupProgress?.next_action?.action_step || incompleteSetupItems[0]?.action_step || "my-store";

    if (storeData.status === "pending") {
      setSetupNotificationData({
        title: "Store Pending Approval",
        message: setupProgress?.is_complete
          ? "Your store is under review. You can add products while waiting for approval."
          : "Your store is under review. Complete the remaining setup items so you are ready when approved.",
        requiredActions: requiredActions.length ? requiredActions : ["Add products", "Set up delivery zone"],
        nextStep,
        ctaLabel: setupProgress?.is_complete ? "Review Store" : "Continue Setup",
        setupProgress
      });
      setShowSetupNotification(true);
      return;
    }

    if (storeData.status === "setup_pending") {
      setSetupNotificationData({
        title: "Complete Store Setup",
        message: "Your store setup is incomplete. Complete the setup to start selling.",
        requiredActions: requiredActions.length ? requiredActions : ["Complete store profile", "Set up delivery zone", "Upload required documents"],
        nextStep,
        ctaLabel: "Complete Setup",
        setupProgress
      });
      setShowSetupNotification(true);
      return;
    }

    if (storeData.verification_status === "pending" || storeData.verification_status === "under_review") {
      setSetupNotificationData({
        title: "Verification Required",
        message: setupProgress?.is_complete
          ? "Your account is waiting for admin verification to access all seller features."
          : "Your account needs a few more setup items before admin verification can be completed.",
        requiredActions: requiredActions.length ? requiredActions : ["Upload required documents", "Complete identity verification"],
        nextStep,
        ctaLabel: setupProgress?.is_complete ? "Review Store" : "Continue Setup",
        setupProgress
      });
      setShowSetupNotification(true);
      return;
    }

    if (setupProgress && !setupProgress.is_complete) {
      setSetupNotificationData({
        title: "Improve Store Setup",
        message: "Complete these items to improve buyer trust and keep your store ready for approval.",
        requiredActions,
        nextStep,
        ctaLabel: "Update Store",
        setupProgress
      });
      setShowSetupNotification(true);
      return;
    }

    const missingInfo = [];
    if (!storeData.store_logo) missingInfo.push("Store logo");
    if (!storeData.store_banner) missingInfo.push("Store banner");
    if (!storeData.description && !storeData.store_description) missingInfo.push("Store description");
    if (!storeData.business_registration_number && storeData.business_type !== "individual") {
      missingInfo.push("Business registration");
    }

    if (missingInfo.length > 0) {
      setSetupNotificationData({
        title: "Missing Information",
        message: "Your store profile is incomplete. Please complete the items below.",
        requiredActions: missingInfo,
        nextStep: "my-store",
        ctaLabel: "Update Profile",
        setupProgress
      });
      setShowSetupNotification(true);
      return;
    }

    setShowSetupNotification(false);
  }, [storeData, onboardingStatus]);

  // ---------- Start setup ----------
  const handleStartSetup = () => {
    if (setupNotificationData.nextStep === "my-store") {
      // "Review Setup" / "Complete Setup" → open the store update form directly
      const myStoreIndex = navigation.findIndex(item => item.key === "my_store");
      if (myStoreIndex !== -1) setSelectedTab(myStoreIndex);
      navigate('/seller/dashboard?tab=my-store&view=edit', { replace: true });
    } else if (setupNotificationData.nextStep === "delivery_zones") {
      const deliveryIndex = navigation.findIndex(item => item.key === "delivery_zones");
      if (deliveryIndex !== -1) setSelectedTab(deliveryIndex);
      navigate('/seller/dashboard?tab=delivery_zones', { replace: true });
    } else if (setupNotificationData.nextStep === "products") {
      const productsIndex = navigation.findIndex(item => item.key === "products");
      if (productsIndex !== -1) setSelectedTab(productsIndex);
      navigate('/seller/dashboard?tab=products', { replace: true });
    } else if (setupNotificationData.nextStep === "settings") {
      const settingsIndex = navigation.findIndex(item => item.key === "settings");
      if (settingsIndex !== -1) setSelectedTab(settingsIndex);
      navigate('/seller/dashboard?tab=settings', { replace: true });
    } else if (onboardingStatus?.needs_onboarding || !onboardingStatus?.onboarding_complete) {
      navigate(`/seller/onboarding/${setupNotificationData.nextStep || 'store-basic'}`);
    } else if (setupNotificationData.nextStep === "verification") {
      navigate('/seller/onboarding/documents');
    } else {
      navigate('/seller/onboarding/store-basic');
    }
  };

  // ---------- Polling for global data (silent, every 60s) ----------
  useEffect(() => {
    if (!user || !storeData) return;
    const interval = setInterval(() => {
      void refreshGlobalData();
      void fetchOnboardingStatus();
    }, 60000);
    return () => clearInterval(interval);
  }, [user, storeData, refreshGlobalData, fetchOnboardingStatus]);

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Loading your seller dashboard...</p>
        </div>
      </div>
    );
  }

  // Onboarding incomplete screen (unchanged)
  // Guard: only show when onboardingStatus has been resolved AND is incomplete.
  // When onboardingStatus is null (e.g. the status endpoint returned 404 for a
  // fully-onboarded seller), treat the seller as onboarded and skip this screen.
  if (onboardingStatus !== null && (onboardingStatus?.needs_onboarding || !onboardingStatus?.onboarding_complete)) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <BuildingStorefrontIcon className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">Complete Your Store Setup</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            Before you can access your seller dashboard, you need to complete your store setup.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => navigate('/seller/onboarding/store-basic')}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg"
            >
              Start Store Setup
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed top-4 left-4 z-20">
        <button
          type="button"
          className="inline-flex items-center justify-center p-2 rounded-lg bg-white dark:bg-slate-800 shadow-lg text-gray-500 dark:text-slate-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span className="sr-only">{t("seller.open_sidebar")}</span>
          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity" onClick={() => setSidebarOpen(false)}>
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white dark:bg-slate-800 shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="pt-8 pb-4 px-4">
              {navigation.map((item, idx) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setSelectedTab(idx);
                    setSidebarOpen(false);
                  }}
                  className={classNames(
                    "group flex items-center px-4 py-3 text-sm font-medium rounded-2xl w-full text-left transition-all duration-200 mb-1",
                    selectedTab === idx
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200"
                      : "text-gray-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                  {item.key === "rfq" && rfqBadgeCount > 0 && (
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

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-r border-gray-200/60 dark:border-slate-700/60 shadow-xl">
          <div className="flex-1 flex flex-col pt-8 pb-4 overflow-y-auto">
            {/* Store Header */}
            <div className="flex items-center px-6 mb-8">
              <div className="relative">
                {storeData?.store_logo ? (
                  <img src={storeData.store_logo} alt={storeData.store_name} className="w-12 h-12 rounded-2xl object-cover border-2 border-green-200 shadow-lg" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <BuildingStorefrontIcon className="h-6 w-6 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
              <div className="ml-4">
                <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate max-w-[180px]">
                  {storeData?.store_name || t("seller.seller_center")}
                </h1>
                <p className="text-sm text-green-600 font-medium">{t("seller.sidebar.seller_account")}</p>
              </div>
            </div>

            {/* Setup Notification */}
            {showSetupNotification && (
              <div className="mx-4 mb-4">
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">{setupNotificationData.title}</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">{setupNotificationData.message}</p>

                      {setupNotificationData.setupProgress && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[11px] font-medium text-amber-800 dark:text-amber-300 mb-1">
                            <span>{t("seller.sidebar.store_setup")}</span>
                            <span>{Math.round(setupNotificationData.setupProgress.percentage || 0)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-amber-100 dark:bg-amber-950 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, setupNotificationData.setupProgress.percentage || 0))}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                            {t("seller.sidebar.setup_completed", {
                              completed: setupNotificationData.setupProgress.completed_count || 0,
                              total: setupNotificationData.setupProgress.total_count || 0
                            })}
                          </p>
                        </div>
                      )}

                      {setupNotificationData.requiredActions?.length > 0 && (
                        <ul className="mb-3 space-y-1.5">
                          {setupNotificationData.requiredActions.slice(0, 4).map((action) => (
                            <li key={action} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 flex-shrink-0" />
                              <span className="leading-4">{action}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <button onClick={handleStartSetup} className="w-full text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 flex items-center justify-center">
                        {setupNotificationData.ctaLabel || t("seller.sidebar.complete_setup")} <ArrowRightIcon className="h-3 w-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop navigation — plain buttons */}
            <nav className="flex-1 px-4 space-y-1">
              {navigation.map((item, idx) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setSelectedTab(idx);
                  }}
                  className={classNames(
                    "group flex items-center px-4 py-3 text-sm font-medium rounded-2xl w-full text-left transition-all duration-200",
                    selectedTab === idx
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                      : "text-gray-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-white dark:hover:bg-slate-700"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5 transition-all duration-200 group-hover:scale-110" />
                  {item.name}
                  {item.key === "rfq" && rfqBadgeCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                      {rfqBadgeCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* User Profile Footer */}
          <div className="flex-shrink-0 border-t border-gray-200/60 dark:border-slate-700/60 p-6 bg-white/50 dark:bg-slate-800/50">
            <div className="flex items-center">
              <div className="relative">
                {user?.profile_photo ? (
                  <img src={user.profile_photo} alt={user.name} className="w-10 h-10 rounded-xl object-cover border-2 border-green-200" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-medium text-white">{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
                  </div>
                )}
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="font-bold text-green-700 dark:text-green-400">{stats.totalProducts}</div>
                <div className="text-gray-600 dark:text-slate-400">{t("seller.sidebar.products")}</div>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="font-bold text-blue-700 dark:text-blue-400">{stats.totalOrders}</div>
                <div className="text-gray-600 dark:text-slate-400">{t("seller.sidebar.orders")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-gray-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">{t("seller.seller_center")}</h1>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{t("seller.sidebar.header_subtitle")}</p>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell onClick={() => {
                const idx = navigation.findIndex((item) => item.key === "notifications");
                if (idx !== -1) setSelectedTab(idx);
              }} />
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>{t("seller.sidebar.store_active")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            {/* Mobile tab bar — plain buttons, no HeadlessUI */}
            <div className="md:hidden mb-6">
              <div className="flex space-x-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg p-2 overflow-x-auto">
                {navigation.map((item, idx) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      setSelectedTab(idx);
                    }}
                    className={classNames(
                      "flex-shrink-0 min-w-[100px] rounded-xl py-3 px-2 text-sm font-medium leading-5 transition-all duration-200 focus:outline-none",
                      selectedTab === idx
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                        : "text-gray-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <div className="relative">
                        <item.icon className="h-5 w-5" />
                        {item.key === "rfq" && rfqBadgeCount > 0 && (
                          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-bold rounded-full bg-red-500 text-white">
                            {rfqBadgeCount}
                          </span>
                        )}
                      </div>
                      <span className="text-xs">{item.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content — direct render using renderActiveTab() */}
            <div className="mt-2">
              {renderActiveTab()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
