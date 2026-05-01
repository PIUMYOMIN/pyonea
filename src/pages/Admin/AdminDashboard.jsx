// pages/AdminDashboard.js (excerpt – only relevant changes shown)
import React, { useState, useEffect } from "react";

import {
  ChartBarIcon,
  MegaphoneIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  CubeIcon,
  CurrencyDollarIcon,
  CogIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  StarIcon,
  TruckIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  BellIcon,
  EnvelopeIcon,
  TicketIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import Sidebar from "../../components/layout/Sidebar";
import PlatformLogistics from "../../components/admin/PlatformLogistics";
import BusinessTypeManagement from "../../components/admin/BusinessTypeManagement";
import UserManagement from "../../components/admin/UserManagement";
import SellersManagement from "../../components/admin/SellersManagement";
import DashboardOverview from "../../components/admin/DashboardOverview";
import ProductManagement from "../../components/admin/ProductManagement";          // self‑contained
import ReviewManagement from "../../components/admin/ReviewManagement";
import OrderManagement from "../../components/admin/OrderManagement";
import AnalyticsManagement from "../../components/admin/AnalyticsManagement";
import CommissionRulesManagement from "../../components/admin/CommissionRulesManagement";
import EmailCampaigns from "../../components/admin/EmailCampaigns";
import ReportManagement from "../../components/admin/ReportManagement";
import CategoryManagement from "../../components/admin/CategoryManagement";        // self‑contained
import SellerVerificationManagement from "../../components/admin/SellerVerificationManagement";
import NotificationsPanel from "../../components/Shared/NotificationsPanel";
import { NotificationBell } from "../../components/Shared/NotificationsPanel";
import AnnouncementManagement from "../../components/admin/AnnouncementManagement";
import Settings from "../../components/admin/Settings";
import ChangePasswordForm from "../../components/Shared/ChangePasswordForm";
import ContactMessagesManagement from '../../components/admin/ContactMessagesManagement';
import DeliveryFeeManagement from "../../components/admin/DeliveryFeeManagement";
import CodInvoiceManagement from "../../components/admin/CodInvoiceManagement";
import FinancialReports from "../../components/admin/FinancialReports";
import SEO from "../../components/SEO/SEO";

// ── Admin personal profile tab ────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg " +
  "focus:ring-2 focus:ring-green-500 focus:outline-none text-sm " +
  "bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100";

const AdminProfileTab = () => {
  const { user, updateUser } = useAuth();

  const [profileData, setProfileData] = React.useState({
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

  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileMsg,     setProfileMsg]     = React.useState(null);

  const msgClass = (msg) => msg?.type === "success"
    ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
    : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800";

  const handleProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const res = await api.put("/users/profile", profileData);
      if (res.data.success) {
        updateUser(res.data.data);
        setProfileMsg({ type: "success", text: "Profile updated successfully" });
      }
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.message || "Update failed" });
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">Personal Information</h3>
        {profileMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${msgClass(profileMsg)}`}>{profileMsg.text}</div>
        )}
        <form onSubmit={handleProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ["Full Name *",    "name",          "text"],
              ["Phone *",        "phone",         "tel"],
              ["Email",          "email",         "email"],
              ["Date of Birth",  "date_of_birth", "date"],
            ].map(([label, name, type]) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
                <input type={type} name={name} value={profileData[name]}
                  onChange={(e) => setProfileData(p => ({ ...p, [e.target.name]: e.target.value }))}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Address</label>
            <input type="text" name="address" value={profileData.address}
              onChange={(e) => setProfileData(p => ({ ...p, address: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[["City","city"],["State","state"],["Country","country"],["Postal Code","postal_code"]].map(([label, name]) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
                <input type="text" name={name} value={profileData[name]}
                  onChange={(e) => setProfileData(p => ({ ...p, [e.target.name]: e.target.value }))}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={profileLoading}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              {profileLoading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Shared change-password card */}
      <ChangePasswordForm />
    </div>
  );
};


// ── Admin: confirm seller delivery fee payments ───────────────────────────────
const DeliveryFeeReview = () => {
  const [fees, setFees]         = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [toast, setToast]       = React.useState(null);
  const [confirming, setConfirming] = React.useState(null);
  const [note, setNote]         = React.useState('');

  const flash = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };
  const fmtMMK = (n) => new Intl.NumberFormat('my-MM', { style:'currency', currency:'MMK', minimumFractionDigits:0 }).format(n||0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const api = (await import('../../utils/api')).default;
      const res = await api.get('/admin/delivery-fees/pending');
      setFees(res.data?.data ?? []);
    } catch { setFees([]); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const confirmFee = async (id) => {
    setConfirming(id);
    try {
      const api = (await import('../../utils/api')).default;
      await api.patch(`/admin/deliveries/${id}/confirm-fee`, { note: note || 'Confirmed by admin.' });
      flash('Fee confirmed!');
      setNote('');
      load();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to confirm.', 'error');
    } finally { setConfirming(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Delivery Fee Confirmations</h2>
          <p className="text-sm text-gray-500 dark:text-slate-500 mt-0.5">Sellers have submitted delivery fee payment — confirm receipt below.</p>
        </div>
        <button onClick={load} className="p-2 text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:bg-slate-800 rounded-lg">↻</button>
      </div>
      {toast && (
        <div className={`p-3 rounded-xl text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {toast.msg}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" /></div>
      ) : fees.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-10 text-center text-gray-400 dark:text-slate-600 text-sm">No pending delivery fee confirmations.</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  {['Order #','Seller','Fee','Submitted At','Seller Note','Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {fees.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">#{d.order?.order_number ?? d.order_id}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{d.supplier?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-green-700 whitespace-nowrap">{fmtMMK(d.platform_delivery_fee)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-500 text-xs whitespace-nowrap">
                      {d.fee_submitted_at ? new Date(d.fee_submitted_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-500 text-xs max-w-[140px] truncate">{d.fee_submission_note ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input type="text" value={confirming === d.id ? note : ''} onChange={e => setNote(e.target.value)}
                          onClick={() => setConfirming(d.id)} placeholder="Note (optional)"
                          className="text-xs border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-1.5 w-28 focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500" />
                        <button onClick={() => confirmFee(d.id)} disabled={confirming === d.id}
                          className="text-xs font-semibold px-3 py-1.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 whitespace-nowrap">
                          {confirming === d.id ? 'Confirming…' : '✓ Confirm'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // State for components that still need props (only DashboardOverview and OrderManagement)
  const [dashboardData, setDashboardData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [mainSearchTerm, setMainSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Loading states
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);

  // Error states
  const [dashboardError, setDashboardError] = useState(null);
  const [ordersError, setOrdersError] = useState(null);

  // Check authentication + admin role
  const { user } = useAuth();
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    if (user && user.type !== "admin") { navigate("/"); }
  }, [navigate, user]);

  // Dashboard data fetch (silent = background refresh, no loading spinner)
  const fetchDashboardData = React.useCallback(async (silent = false) => {
    if (!silent) setIsDashboardLoading(true);
    setDashboardError(null);
    try {
      const response = await api.get("/admin/stats");
      setDashboardData(response.data.data || response.data);
      setLastUpdated(new Date());
    } catch (error) {
      const isNetworkError = !error.response;
      const friendlyError = isNetworkError
        ? new Error("Cannot reach the server. Check your internet connection and that VITE_API_URL points to the live API, not localhost.")
        : error;
      setDashboardError(friendlyError);
      console.error("Error fetching dashboard data:", error);
    } finally {
      if (!silent) setIsDashboardLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // Background polling — every 30 s, only while dashboard tab is visible
  useEffect(() => {
    if (activeTab !== 0) return;
    const id = setInterval(() => fetchDashboardData(true), 30_000);
    return () => clearInterval(id);
  }, [activeTab, fetchDashboardData]);

  // Refresh handler (only for components that still need it)
  const handleRefresh = async () => {
    switch (activeTab) {
      case 0:
        fetchDashboardData();
        break;
      case 6:
        setIsOrdersLoading(true);
        try {
          const response = await api.get("/orders");
          const ordersData = response.data.data || response.data;
          setOrders(Array.isArray(ordersData) ? ordersData : []);
        } catch (error) {
          setOrdersError(error);
        } finally {
          setIsOrdersLoading(false);
        }
        break;
      default:
        break;
    }
  };



  const navigation = [
    {
      name: t("dashboard"),
      icon: ChartBarIcon,
      component: <DashboardOverview data={dashboardData} loading={isDashboardLoading} error={dashboardError} />
    },
    {
      name: "Notifications",
      icon: BellIcon,
      component: <NotificationsPanel />
    },
    {
      name: "Financial Reports",
      icon: ChartBarIcon,
      component: <FinancialReports />
    },
    {
      name: "Contact Messages",
      icon: EnvelopeIcon,
      component: <ContactMessagesManagement />
    },
    {
      name: t("users"),
      icon: UserGroupIcon,
      component: <UserManagement />
    },
    {
      name: "Sellers",
      icon: UserGroupIcon,
      component: <SellersManagement />
    },
    {
      name: "Seller Verification",
      icon: ShieldCheckIcon,
      component: <SellerVerificationManagement />
    },
    {
      name: t("seller.product.title"),
      icon: CubeIcon,
      component: <ProductManagement />
    },
    {
      name: t("Seller Reviews"),
      icon: StarIcon,
      component: <ReviewManagement />
    },
    {
      name: t("orders"),
      icon: ShoppingBagIcon,
      component: (
        <OrderManagement />
      )
    },
    {
      name: "Platform Logistics",
      icon: TruckIcon,
      component: <PlatformLogistics />
    },

    {
      name: "Delivery Fee Management",
      icon: TruckIcon,
      component: <DeliveryFeeManagement />
    },
    {
      name: "COD Invoice Management",
      icon: CurrencyDollarIcon,
      component: <CodInvoiceManagement />
    },
    {
      name: "Delivery Fee Review",
      icon: CurrencyDollarIcon,
      component: <DeliveryFeeReview />
    },
    {
      name: "Categories",
      icon: CubeIcon,
      component: <CategoryManagement />
    },
    {
      name: "Business Types",
      icon: BriefcaseIcon,
      component: <BusinessTypeManagement />
    },
    {
      name: "Email Campaigns",
      icon: EnvelopeIcon,
      component: <EmailCampaigns />,
    },
    {
      name: "Announcements",
      icon: MegaphoneIcon,
      component: <AnnouncementManagement />,
    },
    {
      name: "Commission Rules",
      icon: CurrencyDollarIcon,
      component: <CommissionRulesManagement />,
    },
    {
      name: t("analytics"),
      icon: CurrencyDollarIcon,
      component: <AnalyticsManagement products={[]} />
    },
    {
      name: t("settings"),
      icon: CogIcon,
      component: <Settings />
    },
    {
      name: "Reports",
      icon: TicketIcon,
      component: <ReportManagement />,
    },
    {
      name: "My Profile",
      icon: UserCircleIcon,
      component: <AdminProfileTab />,
    }
  ];
  const notificationsTabIndex = React.useMemo(
    () => navigation.findIndex((item) => item.name === "Notifications"),
    [navigation]
  );

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab");
    if (tab?.toLowerCase() === "notifications" && notificationsTabIndex !== -1) {
      setActiveTab(notificationsTabIndex);
    }
  }, [location.search, notificationsTabIndex]);

  return (
    <>
      <SEO
        title="Admin Dashboard"
        description="Manage users, products, orders, and more in the admin dashboard."
        url="/admin/dashboard"
        noindex={true}
      />
      <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
        {/* Mobile sidebar toggle */}
        <div className="md:hidden fixed top-4 left-4 z-10">
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="sr-only">{t("sidebar.open")}</span>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-20 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}>
            <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white dark:bg-slate-800 shadow-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="pt-5 pb-4 px-2">
                {navigation.map((item, idx) => (
                  <button
                    key={item.name}
                    onClick={() => { setActiveTab(idx); setSidebarOpen(false); }}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left mb-1 ${
                      activeTab === idx
                        ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "text-gray-600 dark:text-slate-400 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                    }`}
                  >
                    <item.icon className="mr-3 h-6 w-6" aria-hidden="true" />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="h-0 flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                <span className="ml-2 text-lg font-bold text-green-600">{t("app_name")}</span>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item, idx) => (
                  <button
                    key={item.name}
                    onClick={() => setActiveTab(idx)}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left ${
                      activeTab === idx
                        ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "text-gray-600 dark:text-slate-400 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                    }`}
                  >
                    <item.icon className="mr-3 h-6 w-6" aria-hidden="true" />
                    {item.name}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center">
                <div className="bg-gray-200 border-2 border-dashed rounded-full w-9 h-9" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{t("admin.user")}</p>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-500">{t("admin.role")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-900/50">
            <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
              <div className="relative w-full max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-slate-600" />
                </div>
                <input
                  type="text"
                  placeholder={t("search.placeholder")}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  value={mainSearchTerm}
                  onChange={(e) => setMainSearchTerm(e.target.value)}
                />
              </div>
              <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                <NotificationBell onClick={() => {
                  if (notificationsTabIndex !== -1) setActiveTab(notificationsTabIndex);
                }} />
                {activeTab === 0 && lastUpdated && (
                  <span className="hidden sm:block text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                <button
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm dark:shadow-slate-900/50 text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  onClick={handleRefresh}
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  {t("refresh")}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              {/* Mobile tab bar — plain buttons, no HeadlessUI Tab */}
              <div className="md:hidden mb-6">
                <div className="flex space-x-1 rounded-xl bg-green-100 dark:bg-slate-700 p-1 overflow-x-auto">
                  {navigation.map((item, idx) => (
                    <button
                      key={item.name}
                      onClick={() => setActiveTab(idx)}
                      className={`flex-shrink-0 rounded-lg py-2.5 px-3 text-sm font-medium leading-5 focus:outline-none transition-all ${
                        activeTab === idx
                          ? "bg-white dark:bg-slate-800 shadow text-green-700 dark:text-green-400"
                          : "text-gray-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-600 hover:text-green-700 dark:hover:text-green-400"
                      }`}
                    >
                      <div className="flex items-center justify-center whitespace-nowrap">
                        <item.icon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        <span>{item.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content — direct render, no Tab.Panels */}
              <div className="mt-4">
                {navigation[activeTab]?.component}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;