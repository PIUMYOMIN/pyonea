// SellerDashboard.jsx (updated)
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
  PencilIcon,
  TicketIcon,
  UserCircleIcon,
  GiftIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import Sidebar from "../../components/layout/Sidebar";
import DashboardSummary from "../../components/seller/DashboardSummary";
import OrderManagement from "../../components/seller/OrderManagement";
import ProductManagement from "../../components/seller/ProductManagement";
import SalesReports from "../../components/seller/SalesReports";
import ProductReviewManagement from "../../components/seller/ProductReviewManagement";
import Customers from "./Customers";
import DeliveryZones from "../../components/seller/DeliveryZones";
import { resolveSellerOnboardingStep } from "../../utils/sellerOnboarding";
import StoreSettings from "../../components/seller/StoreSettings";
import MyStore from "../../components/seller/MyStore";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { useLocation, useNavigate } from "react-router-dom";
import DeliveryManagement from "../../components/seller/DeliveryManagement";
import DiscountManagement from "../../components/seller/DiscountManagement";
import CouponManagement from "../../components/seller/CouponManagement";
import EditStore from "../../components/seller/EditStore";
import StoreProfileEditor from "../../components/seller/StoreProfileEditor";
import NotificationsPanel from "../../components/Shared/NotificationsPanel";
import { NotificationBell } from "../../components/Shared/NotificationsPanel";
import ReferralPanel from "../../components/Shared/ReferralPanel";
import ChangePasswordForm from "../../components/Shared/ChangePasswordForm";
import SellerWallet from "../../components/seller/SellerWallet";
import SellerFinancialReports from "../../components/seller/SellerFinancialReports";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ── Personal profile update tab for sellers ──────────────────────────────────
const SellerProfileTab = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = React.useState({
    name:          user?.name          || "",
    email:         user?.email         || "",
    phone:         user?.phone         || "",
    address:       user?.address       || "",
    city:          user?.city          || "",
    state:         user?.state         || "",
    country:       user?.country       || "",
    postal_code:   user?.postal_code   || "",
    date_of_birth: user?.date_of_birth ? user.date_of_birth.split("T")[0] : "",
  });
  const [loading, setLoading]     = React.useState(false);
  const [profileMsg, setProfileMsg] = React.useState(null);

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setProfileMsg(null);
    try {
      const { default: api } = await import("../../utils/api");
      const res = await api.put("/users/profile", formData);
      if (res.data.success) {
        updateUser(res.data.data);
        setProfileMsg({ type: "success", text: "Profile updated successfully" });
      }
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.message || "Update failed" });
    } finally {
      setLoading(false);
    }
  };

  const msgCls = (m) => m?.type === "success"
    ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
    : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800";

  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm transition-all";

  const field = (label, name, type = "text", placeholder = "") => (
    <div key={name}>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
      <input type={type} name={name} value={formData[name]} onChange={handleChange}
        placeholder={placeholder} className={inputCls} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">Personal Profile</h3>
        {profileMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${msgCls(profileMsg)}`}>{profileMsg.text}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field("Full Name *", "name")}
            {field("Phone *", "phone", "tel")}
            {field("Email", "email", "email")}
            {field("Date of Birth", "date_of_birth", "date")}
          </div>
          {field("Address", "address")}
          <div className="grid grid-cols-2 gap-4">
            {field("City", "city")}
            {field("State", "state")}
            {field("Country", "country", "text", "Myanmar")}
            {field("Postal Code", "postal_code")}
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <ChangePasswordForm />
    </div>
  );
};

const SellerDashboard = () => {
  const location = useLocation();
  const { state } = location;
  const { t } = useTranslation();
  const { user } = useAuth();
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
  const [setupNotificationData, setSetupNotificationData] = useState({
    title: "",
    message: "",
    requiredActions: [],
    nextStep: "",
    ctaLabel: "Complete Setup"
  });

  // ---------- Fetch global store data (store info & summary stats) ----------
  const fetchGlobalData = useCallback(async () => {
    try {
      setLoading(true);
      const [storeResponse, statsResponse] = await Promise.allSettled([
        api.get("/seller/my-store"),
        api.get("/seller/sales-summary")
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
    } catch (error) {
      console.error("Failed to fetch global data:", error);
      if (error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const refreshGlobalData = useCallback(async () => {
    await fetchGlobalData();
  }, [fetchGlobalData]);

  // ---------- Handle setup click (only for navigation) ----------
  const handleSetupClick = useCallback((step) => {
    console.log("Setup click:", step);
    if (step === 'my-store') {
      navigate('/seller/dashboard?tab=my-store&setup=true');
    } else if (step === 'delivery_zones') {
      navigate('/seller/dashboard?tab=delivery_zones');
    } else if (step === 'settings') {
      navigate('/seller/dashboard?tab=settings');
    }
  }, [navigate]);

  const navigation = useMemo(() => [
    { name: t("seller.dashboard"), icon: ChartBarIcon, key: "dashboard" },
    { name: "Notifications",              icon: BellIcon,               key: "notifications" },
    { name: t("seller.my_store"),       icon: BuildingStorefrontIcon, key: "my_store" },
    { name: "Store Profile",            icon: PencilIcon,             key: "store_profile" },
    { name: t("seller.order.title"),    icon: ShoppingBagIcon,        key: "orders" },
    { name: t("seller.delivery_zones.title"), icon: TruckIcon,        key: "delivery_zones" },
    { name: t("seller.product.title"),  icon: CubeIcon,               key: "products" },
    { name: t("seller.discount.title"), icon: CubeIcon,               key: "discounts" },
    { name: "Coupons",                  icon: TicketIcon,             key: "coupons" },
    { name: t("seller.sales.title"),    icon: CurrencyDollarIcon,     key: "sales" },
    { name: t("seller.reviews.title"),  icon: StarIcon,               key: "reviews" },
    { name: t("seller.customers"),      icon: UserGroupIcon,          key: "customers" },
    { name: t("seller.delivery.title"),       icon: TruckIcon,        key: "delivery" },
    { name: t("seller.settings"), icon: CogIcon, key: "settings" },
    { name: "Referrals", icon: GiftIcon, key: "referrals" },
    { name: "My Profile", icon: UserCircleIcon,         key: "profile" },
    { name: "Seller Wallet", icon: WalletIcon,         key: "wallet" },
    { name: "Financial Reports", icon: ChartBarIcon,      key: "financial_reports" },
  ], [t]);

  // Render the active tab with current state — separated from the stable nav structure
  const renderActiveTab = () => {
    const key = navigation[selectedTab]?.key;
    switch (key) {
      case "dashboard": return <DashboardSummary storeData={storeData} stats={stats} onSetupClick={handleSetupClick} />;
      case "notifications":  return <NotificationsPanel />;
      case "my_store":    return <MyStore storeData={storeData} stats={stats} refreshData={refreshGlobalData} />;
      case "edit_store":  return <EditStore storeData={storeData} refreshData={refreshGlobalData} />;
      case "store_profile": return <StoreProfileEditor storeData={storeData} refreshData={refreshGlobalData} />;
      case "orders":      return <OrderManagement />;
      case "delivery":    return <DeliveryManagement />;
      case "products":    return <ProductManagement />;
      case "discounts":   return <DiscountManagement />;
      case "coupons":     return <CouponManagement />;
      case "sales":       return <SalesReports />;
      case "reviews":     return <ProductReviewManagement />;
      case "customers":   return <Customers />;
      case "delivery_zones":    return <DeliveryZones storeData={storeData} />;
      case "settings": return <StoreSettings storeData={storeData} setStoreData={setStoreData} />;
      case "referrals": return <ReferralPanel />;
      case "profile": return <SellerProfileTab />;
      case "wallet": return <SellerWallet />;
      case "financial_reports": return <SellerFinancialReports storeName={storeData?.store_name} />;
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

    if (initialTab) {
      const tabIndex = navigation.findIndex((item) => item.key === initialTab.replaceAll("-", "_"));
      if (tabIndex !== -1) setSelectedTab(tabIndex);
    }
  }, [location.search, navigation]);

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
          await fetchGlobalData();
        } catch (storeError) {
          navigate('/seller/onboarding/store-basic');
        }
      }
    };

    if (user) checkAccess();
  }, [user, navigate, fetchGlobalData]);

  // ---------- Setup notification based on storeData ----------
  useEffect(() => {
    if (!storeData) return;

    if (storeData.status === "pending") {
      setSetupNotificationData({
        title: "Store Pending Approval",
        message: "Your store is under review. You can add products and set up your store while waiting for approval.",
        requiredActions: ["Complete store setup", "Add products", "Set up delivery zone"],
        nextStep: "my-store",
        ctaLabel: "Review Setup"
      });
      setShowSetupNotification(true);
      return;
    }

    if (storeData.status === "setup_pending") {
      setSetupNotificationData({
        title: "Complete Store Setup",
        message: "Your store setup is incomplete. Complete the setup to start selling.",
        requiredActions: ["Add store logo", "Complete business details", "Set up payment methods"],
        nextStep: "my-store",
        ctaLabel: "Complete Setup"
      });
      setShowSetupNotification(true);
      return;
    }

    if (storeData.verification_status === "pending" || storeData.verification_status === "under_review") {
      setSetupNotificationData({
        title: "Verification Required",
        message: "Your account needs verification to access all seller features.",
        requiredActions: ["Upload required documents", "Complete identity verification"],
        nextStep: "my-store",
        ctaLabel: "Continue Verification"
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
        ctaLabel: "Update Profile"
      });
      setShowSetupNotification(true);
      return;
    }

    setShowSetupNotification(false);
  }, [storeData]);

  // ---------- Dismiss notification ----------
  const handleDismissNotification = () => {
    setShowSetupNotification(false);
    localStorage.setItem('seller_setup_notification_dismissed', 'true');
  };

  // ---------- Start setup ----------
  const handleStartSetup = () => {
    if (setupNotificationData.nextStep === "my-store") {
      const myStoreIndex = navigation.findIndex(item => item.name === t("seller.my_store"));
      if (myStoreIndex !== -1) setSelectedTab(myStoreIndex);
      navigate('/seller/dashboard?tab=my-store&setup=true', { replace: true });
    } else if (onboardingStatus?.needs_onboarding || !onboardingStatus?.onboarding_complete) {
      navigate(`/seller/onboarding/${setupNotificationData.nextStep || 'store-basic'}`);
    } else if (setupNotificationData.nextStep === "verification") {
      navigate('/seller/onboarding/documents');
    } else {
      navigate('/seller/onboarding/store-basic');
    }
  };

  // ---------- Polling for global data (optional, 60s) ----------
  useEffect(() => {
    if (!user || !storeData) return;
    const interval = setInterval(fetchGlobalData, 6000000);
    return () => clearInterval(interval);
  }, [user, storeData, fetchGlobalData]);

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
  if (onboardingStatus?.needs_onboarding || !onboardingStatus?.onboarding_complete) {
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
                  onClick={() => { setSelectedTab(idx); setSidebarOpen(false); }}
                  className={classNames(
                    "group flex items-center px-4 py-3 text-sm font-medium rounded-2xl w-full text-left transition-all duration-200 mb-1",
                    selectedTab === idx
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200"
                      : "text-gray-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
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
                <p className="text-sm text-green-600 font-medium">Seller Account</p>
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
                        {setupNotificationData.ctaLabel || "Complete Setup"} <ArrowRightIcon className="h-3 w-3 ml-1" />
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
                  onClick={() => setSelectedTab(idx)}
                  className={classNames(
                    "group flex items-center px-4 py-3 text-sm font-medium rounded-2xl w-full text-left transition-all duration-200",
                    selectedTab === idx
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                      : "text-gray-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-white dark:hover:bg-slate-700"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5 transition-all duration-200 group-hover:scale-110" />
                  {item.name}
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
                <div className="text-gray-600 dark:text-slate-400">Products</div>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="font-bold text-blue-700 dark:text-blue-400">{stats.totalOrders}</div>
                <div className="text-gray-600 dark:text-slate-400">Orders</div>
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Seller Center</h1>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Manage your store and grow your business</p>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell onClick={() => {
                const idx = navigation.findIndex((item) => item.key === "notifications");
                if (idx !== -1) setSelectedTab(idx);
              }} />
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Store Active</span>
              </div>
            </div>
          </div>
        </div>

        {setupNotificationData.progress > 0 && (
          <div className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-slate-400">Setup Progress: {setupNotificationData.progress}%</span>
                <div className="w-64 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${setupNotificationData.progress}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            {/* Mobile tab bar — plain buttons, no HeadlessUI */}
            <div className="md:hidden mb-6">
              <div className="flex space-x-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg p-2 overflow-x-auto">
                {navigation.map((item, idx) => (
                  <button
                    key={item.name}
                    onClick={() => setSelectedTab(idx)}
                    className={classNames(
                      "flex-shrink-0 min-w-[100px] rounded-xl py-3 px-2 text-sm font-medium leading-5 transition-all duration-200 focus:outline-none",
                      selectedTab === idx
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                        : "text-gray-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <item.icon className="h-5 w-5" />
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