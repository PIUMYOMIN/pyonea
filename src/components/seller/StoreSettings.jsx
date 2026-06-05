import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import {
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  KeyIcon,
  TrashIcon,
  DocumentTextIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";

const SETTINGS_TABS = [
  { key: "personal", label: "Personal", description: "Login identity and contact profile", icon: UserCircleIcon },
  { key: "general", label: "General", description: "Store display and business hours", icon: CogIcon },
  { key: "payment", label: "Payment", description: "Payout preferences and thresholds", icon: CreditCardIcon },
  { key: "notifications", label: "Notifications", description: "Email and dashboard alerts", icon: BellIcon },
  { key: "security", label: "Security", description: "Password and login protection", icon: KeyIcon },
  { key: "account", label: "Account", description: "Store status and account actions", icon: ShieldCheckIcon },
];

const StoreSettings = ({ storeData, setStoreData, refreshData }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const [activeSettingsTab, setActiveSettingsTab] = useState("personal");
  const [profileData, setProfileData] = useState({
    name: user?.name || '', email: user?.email || '', phone: user?.phone || '',
    address: user?.address || '', city: user?.city || '', state: user?.state || '',
    country: user?.country || 'Myanmar', postal_code: user?.postal_code || '',
    date_of_birth: user?.date_of_birth ? user.date_of_birth.split('T')[0] : '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const handleProfileSave = async (e) => {
    e.preventDefault(); setProfileSaving(true); setProfileMsg(null);
    try {
      const res = await api.put('/users/profile', profileData);
      if (res.data.success) { updateUser(res.data.data); setProfileMsg({ type:'success', text:'Profile updated!' }); }
      if (refreshData) await refreshData();
    } catch (err) { setProfileMsg({ type:'error', text: err.response?.data?.message || 'Update failed.' }); }
    finally { setProfileSaving(false); }
  };

  useEffect(() => {
    if (!user) return;
    setProfileData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      country: user.country || 'Myanmar',
      postal_code: user.postal_code || '',
      date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
    });
  }, [user]);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const section = sp.get('section');
    if (SETTINGS_TABS.some((tab) => tab.key === section)) {
      setActiveSettingsTab(section);
    }
  }, [location.search]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Main settings form
  const [formData, setFormData] = useState({
    
    // Notification Settings
    email_notifications: true,
    order_notifications: true,
    inventory_alerts: true,
    review_notifications: true,
    
    // Payment Settings
    commission_rate: 10,
    auto_withdrawal: false,
    withdrawal_threshold: 100000,
    preferred_payment_method: "bank_transfer",
    
    // Store Status
    is_active: true,
    vacation_mode: false,
    vacation_message: "",
    vacation_start_date: "",
    vacation_end_date: "",
    
    // Security Settings
    two_factor_auth: false,
    login_notifications: true,
    
    // Display Settings
    show_sold_out: true,
    show_reviews: true,
    show_inventory_count: false,
    currency: "MMK",
    
    // Business Hours
    business_hours_enabled: false,
    business_hours: {
      monday: { open: "09:00", close: "18:00", closed: false },
      tuesday: { open: "09:00", close: "18:00", closed: false },
      wednesday: { open: "09:00", close: "18:00", closed: false },
      thursday: { open: "09:00", close: "18:00", closed: false },
      friday: { open: "09:00", close: "18:00", closed: false },
      saturday: { open: "10:00", close: "16:00", closed: false },
      sunday: { open: "", close: "", closed: true }
    }
  });

  // Password change form
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  // Account deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Initialize form data when storeData is available
  useEffect(() => {
    if (storeData) {
      setFormData(prev => ({
        ...prev,
        return_policy: storeData.return_policy || "",
        shipping_policy: storeData.shipping_policy || "",
        warranty_policy: storeData.warranty_policy || "",
        privacy_policy: storeData.privacy_policy || "",
        terms_of_service: storeData.terms_of_service || "",
        email_notifications: storeData.email_notifications !== false,
        order_notifications: storeData.order_notifications !== false,
        inventory_alerts: storeData.inventory_alerts !== false,
        review_notifications: storeData.review_notifications !== false,
        commission_rate: storeData.commission_rate || 10,
        auto_withdrawal: storeData.auto_withdrawal || false,
        withdrawal_threshold: storeData.withdrawal_threshold || 100000,
        preferred_payment_method: storeData.preferred_payment_method || "bank_transfer",
        is_active: storeData.is_active !== false,
        vacation_mode: storeData.vacation_mode || false,
        vacation_message: storeData.vacation_message || "",
        vacation_start_date: storeData.vacation_start_date || "",
        vacation_end_date: storeData.vacation_end_date || "",
        two_factor_auth: storeData.two_factor_auth || false,
        login_notifications: storeData.login_notifications !== false,
        show_sold_out: storeData.show_sold_out !== false,
        show_reviews: storeData.show_reviews !== false,
        show_inventory_count: storeData.show_inventory_count || false,
        currency: storeData.currency || "MMK",
        business_hours_enabled: storeData.business_hours_enabled || false,
        business_hours: storeData.business_hours || prev.business_hours
      }));
      setLoading(false);
    }
  }, [storeData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleBusinessHourChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day],
          [field]: value
        }
      }
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save general settings
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await api.put("/seller/settings", formData);

      if (response.data.success) {
        setMessage({
          type: "success",
          text: "Store settings updated successfully!"
        });
        setStoreData(response.data.data);
        if (refreshData) refreshData();
      }
    } catch (error) {
      console.error("Failed to update store settings:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update store settings"
      });
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: "error", text: "New passwords do not match" });
      setSaving(false);
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      setSaving(false);
      return;
    }

    try {
      // FIX: field names must match UserController::changePassword() validation:
      // 'new_password' and 'new_password_confirmation' (Laravel confirmed rule convention)
      const response = await api.put("/users/profile/password", {
        current_password:      passwordData.current_password,
        new_password:          passwordData.new_password,
        new_password_confirmation: passwordData.confirm_password,
      });

      if (response.data.success) {
        setMessage({
          type: "success",
          text: "Password changed successfully!"
        });
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: ""
        });
      }
    } catch (error) {
      console.error("Failed to change password:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to change password"
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setMessage({ type: "error", text: "Please type DELETE to confirm" });
      return;
    }

    setDeleting(true);
    try {
      const response = await api.delete(`/users/${user.id}`);
      if (response.data.success) {
        // Clear only app-specific keys — don't nuke unrelated storage
        ['token','user','seller_onboarding_data','seller_setup_notification_dismissed',
         'product_draft','image_previews','pyonea-theme']
          .forEach(k => localStorage.removeItem(k));
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to delete account"
      });
      setDeleting(false);
    }
  };

  const activeSettings = SETTINGS_TABS.find((tab) => tab.key === activeSettingsTab) || SETTINGS_TABS[0];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Settings</h1>
            <p className="text-gray-600 dark:text-slate-400 mt-1">
              Manage your store preferences and account settings
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className={`px-3 py-1 rounded-full font-medium ${
              storeData.status === 'active' || storeData.status === 'approved'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : storeData.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300'
            }`}>
              {storeData.status?.charAt(0).toUpperCase() + storeData.status?.slice(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-start space-x-3 ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckBadgeIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
          <button
            onClick={() => setMessage({ type: "", text: "" })}
            className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
          >
            <ExclamationTriangleIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Settings Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex gap-1 overflow-x-auto p-2">
            {SETTINGS_TABS.map(({ key, label, icon: Icon }) => {
              const active = activeSettingsTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSettingsTab(key)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl whitespace-nowrap transition-colors
                    ${active
                      ? "bg-green-600 text-white shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          <div className="mb-6 border-b border-gray-100 dark:border-slate-700 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">{activeSettings.label}</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{activeSettings.label} Settings</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{activeSettings.description}</p>
          </div>

          {/* Personal account (merged from former “My Profile” tab) */}
          <section id="personal" className={`${activeSettingsTab === "personal" ? "block" : "hidden"} scroll-mt-4`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
              <UserCircleIcon className="h-5 w-5 mr-2 text-green-600" />
              Personal account
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Your login identity and contact details for this seller account.
            </p>
            {profileMsg && (
              <div className={`mb-4 p-3 rounded-xl text-sm border ${
                profileMsg.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
              }`}>
                {profileMsg.text}
              </div>
            )}
            <form onSubmit={handleProfileSave} className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Full name *</label>
                  <input name="name" value={profileData.name} onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Phone *</label>
                  <input name="phone" type="tel" value={profileData.phone} onChange={(e) => setProfileData((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                  <input name="email" type="email" value={profileData.email} onChange={(e) => setProfileData((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Date of birth</label>
                  <input name="date_of_birth" type="date" value={profileData.date_of_birth} onChange={(e) => setProfileData((p) => ({ ...p, date_of_birth: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Address</label>
                <input name="address" value={profileData.address} onChange={(e) => setProfileData((p) => ({ ...p, address: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">City</label>
                  <input name="city" value={profileData.city} onChange={(e) => setProfileData((p) => ({ ...p, city: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">State / region</label>
                  <input name="state" value={profileData.state} onChange={(e) => setProfileData((p) => ({ ...p, state: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Country</label>
                  <input name="country" value={profileData.country} onChange={(e) => setProfileData((p) => ({ ...p, country: e.target.value }))}
                    placeholder="Myanmar" className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Postal code</label>
                  <input name="postal_code" value={profileData.postal_code} onChange={(e) => setProfileData((p) => ({ ...p, postal_code: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={profileSaving}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {profileSaving ? t("seller.delivery_zones.saving") : t("buyer_dashboard.save_changes")}
                </button>
              </div>
            </form>
          </section>

          {/* General Settings */}
          <section id="general" className={`${activeSettingsTab === "general" ? "block" : "hidden"}`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <CogIcon className="h-5 w-5 mr-2 text-green-600" />
              General Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Store Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400"
                >
                  <option value="MMK">Myanmar Kyat (MMK)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="THB">Thai Baht (THB)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Display Settings
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="show_sold_out"
                      checked={formData.show_sold_out}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-green-600 rounded focus:ring-green-500 border-gray-300 dark:border-slate-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-slate-300">Show sold out products</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="show_reviews"
                      checked={formData.show_reviews}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-green-600 rounded focus:ring-green-500 border-gray-300 dark:border-slate-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-slate-300">Display product reviews</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="show_inventory_count"
                      checked={formData.show_inventory_count}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-green-600 rounded focus:ring-green-500 border-gray-300 dark:border-slate-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-slate-300">Show inventory count</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Settings */}
          <section id="payment" className={`${activeSettingsTab === "payment" ? "block" : "hidden"}`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <CreditCardIcon className="h-5 w-5 mr-2 text-green-600" />
              Payment Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  name="commission_rate"
                  value={formData.commission_rate}
                  onChange={handleInputChange}
                  min="0"
                  max="30"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                  Platform commission rate on your sales
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Preferred Payment Method
                </label>
                <select
                  name="preferred_payment_method"
                  value={formData.preferred_payment_method}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="wave_money">Wave Money</option>
                  <option value="kbz_pay">KBZ Pay</option>
                  <option value="mpu">MPU</option>
                  <option value="visa_master">Visa/Mastercard</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Enable Auto Withdrawal
                    </label>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Automatically withdraw funds when threshold is reached
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="auto_withdrawal"
                      checked={formData.auto_withdrawal}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                {formData.auto_withdrawal && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Auto Withdrawal Threshold (MMK)
                    </label>
                    <input
                      type="number"
                      name="withdrawal_threshold"
                      value={formData.withdrawal_threshold}
                      onChange={handleInputChange}
                      min="0"
                      step="1000"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Notification Settings */}
          <section id="notifications" className={`${activeSettingsTab === "notifications" ? "block" : "hidden"}`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <BellIcon className="h-5 w-5 mr-2 text-green-600" />
              Notification Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Email Notifications
                  </label>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Receive email alerts for orders and updates
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="email_notifications"
                    checked={formData.email_notifications}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Order Notifications
                  </label>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Get notified when new orders are placed
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="order_notifications"
                    checked={formData.order_notifications}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Inventory Alerts
                  </label>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Receive alerts when products are running low
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="inventory_alerts"
                    checked={formData.inventory_alerts}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Security Settings */}
          <section id="security" className={`${activeSettingsTab === "security" ? "block" : "hidden"}`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <KeyIcon className="h-5 w-5 mr-2 text-green-600" />
              Security Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Two-Factor Authentication
                  </label>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="two_factor_auth"
                    checked={formData.two_factor_auth}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Login Notifications
                  </label>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Get notified when someone logs into your account
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="login_notifications"
                    checked={formData.login_notifications}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            {/* Change Password Form */}
            <div className="mt-8 border-t border-gray-200 dark:border-slate-700 pt-8">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="current_password"
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {saving ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Account Settings */}
          <section id="account" className={`${activeSettingsTab === "account" ? "block" : "hidden"}`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <UserCircleIcon className="h-5 w-5 mr-2 text-green-600" />
              Account Settings
            </h2>

            <div className="space-y-4">
              {/* Store Status */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Store Active
                  </label>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Enable or disable your store temporarily
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {/* Vacation Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Vacation Mode
                  </label>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Pause orders and show vacation message
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="vacation_mode"
                    checked={formData.vacation_mode}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {formData.vacation_mode && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Vacation Message
                    </label>
                    <textarea
                      name="vacation_message"
                      value={formData.vacation_message}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400"
                      placeholder="Let customers know when you'll be back..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        name="vacation_start_date"
                        value={formData.vacation_start_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        name="vacation_end_date"
                        value={formData.vacation_end_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Account */}
              <div className="border-t border-gray-200 dark:border-slate-700 pt-8">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                  <div className="flex items-start">
                    <TrashIcon className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Delete Account</h3>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1 mb-4">
                        This will permanently delete your seller account and all associated data. 
                        This action cannot be undone.
                      </p>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Delete My Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Tab Save Button */}
          {activeSettingsTab !== "personal" && (
            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveSettingsTab("personal")}
                className="px-6 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 font-medium"
              >
                Back to Personal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save " + activeSettings.label + " Settings"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600/60 dark:bg-black/60 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-slate-700 w-full max-w-md shadow-lg rounded-md bg-white dark:bg-slate-800">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/40">
                <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Delete Account
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    This will permanently delete your seller account, store, products, and all associated data.
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-2">
                    This action cannot be undone!
                  </p>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Type <span className="font-bold">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-4 py-3 border border-red-300 dark:border-red-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Type DELETE here"
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText !== "DELETE"}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreSettings;