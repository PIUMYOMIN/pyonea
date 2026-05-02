import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  BuildingStorefrontIcon,
  PencilIcon,
  MapPinIcon,
  GlobeAltIcon,
  PhoneIcon,
  EnvelopeIcon,
  StarIcon,
  CalendarIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CameraIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

const MyStore = ({ storeData, stats, refreshData }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Upload states
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Refs for hidden file inputs
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  if (!storeData) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Loading store information...</p>
        </div>
      </div>
    );
  }

  const logoUrl = storeData.store_logo;
  const bannerUrl = storeData.store_banner;
  const rating = storeData.reviews_avg_rating || 0;
  const totalReviews = storeData.reviews_count || 0;
  const memberSince = new Date(storeData.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  // ----- Logo handlers -----
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLogoUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      await api.post('/seller/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (refreshData) await refreshData();
    } catch (error) {
      console.error('Logo upload failed', error);
      setUploadError('Failed to update logo. Please try again.');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
  if (!window.confirm('Are you sure you want to remove the store logo?')) return;

  setLogoUploading(true);
  setUploadError(null);

  try {
    await api.delete('/seller/logo');
    if (refreshData) await refreshData();
  } catch (error) {
    console.error('Logo removal failed', error);
    setUploadError('Failed to remove logo. Please try again.');
  } finally {
    setLogoUploading(false);
  }
};

  const handleBannerChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBannerUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('banner', file);

    try {
      await api.post('/seller/banner', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (refreshData) await refreshData();
    } catch (error) {
      console.error('Banner upload failed', error);
      setUploadError('Failed to update banner. Please try again.');
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };


  const handleRemoveBanner = async () => {
  if (!window.confirm('Are you sure you want to remove the store banner?')) return;

  setBannerUploading(true);
  setUploadError(null);

  try {
    await api.delete('/seller/banner');
    if (refreshData) await refreshData();
  } catch (error) {
    console.error('Banner removal failed', error);
    setUploadError('Failed to remove banner. Please try again.');
  } finally {
    setBannerUploading(false);
  }
};

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("seller.my_store")}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t("seller.my_store_summary")}</p>
        </div>
        <button
          onClick={() => navigate("/seller/dashboard?tab=my-store&edit=true")}
          className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-200 font-medium"
        >
          <PencilIcon className="h-4 w-4" />
          <span>Edit Store</span>
        </button>
      </div>

      {/* Store Header with Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Banner section with hover overlay */}
        {bannerUrl && (
          <div className="relative h-48 bg-gradient-to-r from-green-500 to-emerald-600 group">
            <img
              src={bannerUrl}
              alt="Store banner"
              className="w-full h-full object-cover"
              onError={(e) => (e.target.style.display = "none")}
            />
            <div className="absolute inset-0 bg-black bg-opacity-20" />

            {/* Hover overlay for banner */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerUploading}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition disabled:opacity-50"
                  title="Update banner"
                >
                  <CameraIcon className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  onClick={handleRemoveBanner}
                  disabled={bannerUploading}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition disabled:opacity-50"
                  title="Remove banner"
                >
                  <TrashIcon className="h-5 w-5 text-red-500" />
                </button>
              </div>
            </div>
            <input
              type="file"
              ref={bannerInputRef}
              onChange={handleBannerChange}
              accept="image/*"
              className="hidden"
            />
            {bannerUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              </div>
            )}
          </div>
        )}

        {/* Store Info Section */}
        <div className={`p-6 ${!bannerUrl ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" : ""}`}>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Logo with hover overlay */}
            <div className="relative w-20 h-20 group">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={storeData.store_name}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shadow-lg"
                  onError={(e) => {
                    e.target.style.display = "none";
                    const fallback = e.target.parentNode?.querySelector(".logo-fallback");
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg logo-fallback ${logoUrl ? "hidden" : "flex"
                  }`}
                style={{ background: bannerUrl ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)" }}
              >
                <BuildingStorefrontIcon
                  className={`h-10 w-10 ${!bannerUrl ? "text-white" : "text-gray-500"}`}
                />
              </div>

              {/* Hover overlay for logo */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-2xl transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-1">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="p-1 bg-white rounded-full shadow-lg hover:bg-gray-100 transition disabled:opacity-50"
                    title="Update logo"
                  >
                    <CameraIcon className="h-4 w-4 text-gray-700" />
                  </button>
                  {logoUrl && (
                    <button
                      onClick={handleRemoveLogo}
                      disabled={logoUploading}
                      className="p-1 bg-white rounded-full shadow-lg hover:bg-gray-100 transition disabled:opacity-50"
                      title="Remove logo"
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoChange}
                accept="image/*"
                className="hidden"
              />
              {logoUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold">{storeData.store_name}</h1>
              <p className={`mt-1 ${bannerUrl ? "text-gray-600 dark:text-slate-300" : "text-green-100 opacity-90"}`}>
                {storeData.description || storeData.store_description || "No description provided"}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${storeData.status === "approved" || storeData.status === "active"
                    ? "bg-green-400 text-white"
                    : storeData.status === "pending"
                      ? "bg-yellow-400 text-white"
                      : "bg-blue-400 text-white"
                    }`}
                >
                  {storeData.status?.charAt(0).toUpperCase() + storeData.status?.slice(1)}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${storeData.verification_status === "verified"
                    ? "bg-blue-400 text-white"
                    : "bg-gray-400 text-white"
                    }`}
                >
                  {storeData.verification_status?.charAt(0).toUpperCase() +
                    storeData.verification_status?.slice(1)}
                </span>
                <span className={`text-sm ${bannerUrl ? "text-gray-600 dark:text-slate-300" : "text-green-100"}`}>
                  <CalendarIcon className="h-3 w-3 inline mr-1" />
                  Since {memberSince}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Store Statistics */}
        <div className="p-6 border-t border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Store Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalProducts || 0}</div>
              <div className="text-sm text-green-800 dark:text-green-300 flex items-center justify-center">
                <ShoppingBagIcon className="h-4 w-4 mr-1" />
                Total Products
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalOrders || 0}</div>
              <div className="text-sm text-blue-800 dark:text-blue-300 flex items-center justify-center">
                <ShoppingBagIcon className="h-4 w-4 mr-1" />
                Total Orders
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalRevenue ? `${parseInt(stats.totalRevenue).toLocaleString()} MMK` : "0 MMK"}
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-300 flex items-center justify-center">
                <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                Total Revenue
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingOrders || 0}</div>
              <div className="text-sm text-orange-800 dark:text-orange-300 flex items-center justify-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                Pending Orders
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <EnvelopeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{storeData.contact_email || "Not provided"}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <PhoneIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{storeData.contact_phone || "Not provided"}</p>
                </div>
              </div>
              {storeData.website && (
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <GlobeAltIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Website</p>
                    <a
                      href={storeData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-green-600 hover:text-green-700 break-all"
                    >
                      {storeData.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location</h3>
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <MapPinIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {storeData.address
                    ? `${storeData.address}, ${storeData.city}, ${storeData.state}, ${storeData.country}`
                    : "No address provided"}
                </p>
                {storeData.postal_code && (
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Postal Code: {storeData.postal_code}</p>
                )}
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Business Type</p>
                <p className="font-medium text-gray-900 dark:text-slate-100">{storeData.business_type || "Not specified"}</p>
              </div>
              {storeData.business_registration_number && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Registration Number</p>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{storeData.business_registration_number}</p>
                </div>
              )}
              {storeData.tax_id && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Tax ID</p>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{storeData.tax_id}</p>
                </div>
              )}
              {storeData.account_number && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Account Number</p>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{storeData.account_number}</p>
                </div>
              )}

              {/* NRC / National Identity Number */}
              {storeData.nrc_full && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                    National Identity Number (NRC)
                  </p>
                  <div className="inline-flex flex-col gap-0.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2">
                    <span className="font-mono font-semibold text-gray-900 dark:text-slate-100 tracking-wider">
                      {storeData.nrc_full}
                    </span>
                    {storeData.nrc_full_mm && (
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        {storeData.nrc_full_mm}
                      </span>
                    )}
                  </div>
                  {storeData.nrc_verification_status && storeData.nrc_verification_status !== 'unverified' && (
                    <span className={`ml-2 inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                      storeData.nrc_verification_status === 'verified'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : storeData.nrc_verification_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {storeData.nrc_verification_status === 'verified' ? '✓ Verified'
                        : storeData.nrc_verification_status === 'pending' ? '⏳ Pending review'
                        : '⚠ ' + storeData.nrc_verification_status}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Store Rating */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Rating</h3>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="flex mr-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon
                        key={star}
                        className={`h-6 w-6 ${star <= rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300 dark:text-slate-600"
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                </p>
              </div>
            </div>
          </div>

          {/* Social Media Links */}
          {(storeData.social_facebook || storeData.social_instagram || storeData.social_twitter) && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Social Media</h3>
              <div className="space-y-3">
                {storeData.social_facebook && (
                  <a
                    href={storeData.social_facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">f</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-200">Facebook</span>
                  </a>
                )}
                {storeData.social_instagram && (
                  <a
                    href={storeData.social_instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">IG</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-200">Instagram</span>
                  </a>
                )}
                {storeData.social_twitter && (
                  <a
                    href={storeData.social_twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
                  >
                    <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">𝕏</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-200">Twitter</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/seller/dashboard?tab=edit-store")}
                className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-sm font-medium"
              >
                Edit Store Profile
              </button>
              <button
                onClick={() => navigate("/seller/dashboard?tab=settings")}
                className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-sm font-medium"
              >
                Store Settings
              </button>
              <button
                onClick={() => navigate("/seller/dashboard?tab=product")}
                className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-sm font-medium"
              >
                Manage Products
              </button>
              <button
                onClick={() => navigate("/seller/dashboard?tab=order")}
                className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-sm font-medium"
              >
                View Orders
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {uploadError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300 text-sm">
          {uploadError}
        </div>
      )}
    </div>
  );
};

export default MyStore;