import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  MapPinIcon,
  GlobeAltIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  LinkIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import api from "../../utils/api";
import { IMAGE_BASE_URL, DEFAULT_PLACEHOLDER } from "../../config";

const EditStore = ({ storeData, refreshData }) => {
  const { t, i18n } = useTranslation();
  const loc = (en, mm) => i18n.language === 'my' ? (mm || en) : (en || mm);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [businessTypes, setBusinessTypes] = useState([]);
  const [loadingBusinessTypes, setLoadingBusinessTypes] = useState(true);
  const [businessTypesError, setBusinessTypesError] = useState("");

  const getImageUrl = (imagePath) => {
    if (!imagePath) return DEFAULT_PLACEHOLDER;
    if (imagePath.startsWith("http")) return imagePath;
    const cleanPath = imagePath.replace("public/", "");
    if (cleanPath.startsWith("storage/")) {
      return `${IMAGE_BASE_URL}/${cleanPath.replace("storage/", "")}`;
    }
    return `${IMAGE_BASE_URL}/${cleanPath}`;
  };

  const [formData, setFormData] = useState({
    store_name: "",
    store_description: "",
    business_type: "",
    business_registration_number: "",
    tax_id: "",
    contact_email: "",
    contact_phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "Myanmar",
    postal_code: "",
    social_facebook: "",
    social_instagram: "",
    social_twitter: "",
    social_linkedin: "",
    account_number: "",
  });

  // Fetch business types
  useEffect(() => {
    const fetchBusinessTypes = async () => {
      try {
        setLoadingBusinessTypes(true);
        setBusinessTypesError("");
        const response = await api.get("/business-types");
        if (response.data.success) {
          setBusinessTypes(response.data.data);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (error) {
        console.error("Failed to fetch business types:", error);
        setBusinessTypesError("Could not load business types. Please refresh the page.");
      } finally {
        setLoadingBusinessTypes(false);
      }
    };
    fetchBusinessTypes();
  }, []);

  // Initialize form when storeData changes
  useEffect(() => {
    if (storeData) {
      setFormData({
        store_name: storeData.store_name || "",
        store_description: storeData.store_description || storeData.description || "",
        business_type: storeData.business_type_slug || storeData.business_type || "",
        business_registration_number: storeData.business_registration_number || "",
        tax_id: storeData.tax_id || "",
        contact_email: storeData.contact_email || "",
        contact_phone: storeData.contact_phone || "",
        website: storeData.website || "",
        address: storeData.address || "",
        city: storeData.city || "",
        state: storeData.state || "",
        country: storeData.country || "Myanmar",
        postal_code: storeData.postal_code || "",
        social_facebook: storeData.social_facebook || "",
        social_instagram: storeData.social_instagram || "",
        social_twitter: storeData.social_twitter || "",
        social_linkedin: storeData.social_linkedin || "",
        account_number: storeData.account_number || "",
      });
    }
  }, [storeData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    if (!formData.business_type) {
      setMessage({ type: "error", text: "Please select a business type." });
      setSaving(false);
      return;
    }

    try {
      // Send as JSON — PHP/Laravel does not parse multipart/form-data on PUT
      // requests, so FormData would produce an empty $request->all() on the
      // backend. Since EditStore has no file uploads, plain JSON is correct.
      const payload = {};
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined) {
          payload[key] = formData[key];
        }
      });

      const response = await api.put("/seller/my-store/update", payload);

      if (response.data.success) {
        setMessage({ type: "success", text: "Store profile updated successfully!" });
        if (refreshData) await refreshData();
        setTimeout(() => navigate("/seller/dashboard?tab=my-store"), 1500);
      }
    } catch (error) {
      console.error("Update failed:", error.response?.data || error.message);
      let errorMessage = "Failed to update store profile";
      if (error.response?.data?.errors) {
        errorMessage = Object.values(error.response.data.errors).flat().join(", ");
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    navigate("/seller/dashboard?tab=my-store");
  };

  if (!storeData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading store information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Store Profile</h2>
          <p className="mt-1 text-sm text-gray-500">Update your store information and media</p>
        </div>
        <button
          onClick={cancelEdit}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
        >
          <XMarkIcon className="h-4 w-4" />
          <span>Cancel</span>
        </button>
      </div>

      {/* Status Message */}
      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 ${message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
            }`}
        >
          {message.type === "success" ? (
            <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : (
            <XMarkIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage({ type: "", text: "" })} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Business Types Error */}
      {businessTypesError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{businessTypesError}</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Basic Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BuildingStorefrontIcon className="h-5 w-5 mr-2 text-green-600" />
            Store Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Store Name *</label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name}
                onChange={handleInputChange}
                required
                disabled={loadingBusinessTypes}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your store name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Store Description</label>
              <textarea
                name="store_description"
                value={formData.store_description}
                onChange={handleInputChange}
                rows={3}
                disabled={loadingBusinessTypes}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Describe your store and what you offer..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
              {loadingBusinessTypes ? (
                <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500">
                  Loading business types...
                </div>
              ) : businessTypesError ? (
                <div className="w-full px-4 py-3 border border-red-300 rounded-xl bg-red-50 text-red-700">
                  Unable to load business types
                </div>
              ) : (
                <select
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                >
                  <option value="">Select business type</option>
                  {businessTypes.map((type) => (
                    <option key={type.slug_en} value={type.slug_en}>
                      {loc(type.name_en, type.name_mm)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email *</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleInputChange}
                  required
                  disabled={loadingBusinessTypes}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="store@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone *</label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleInputChange}
                  required
                  disabled={loadingBusinessTypes}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="09xxxxxxxxx"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
              <div className="relative">
                <GlobeAltIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  disabled={loadingBusinessTypes}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-green-600" />
            Business Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Registration Number
              </label>
              <input
                type="text"
                name="business_registration_number"
                value={formData.business_registration_number}
                onChange={handleInputChange}
                disabled={loadingBusinessTypes}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter registration number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID</label>
              <input
                type="text"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleInputChange}
                disabled={loadingBusinessTypes}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter tax identification number"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account Number</label>
              <input
                type="text"
                name="account_number"
                value={formData.account_number}
                onChange={handleInputChange}
                disabled={loadingBusinessTypes}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your bank account number"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPinIcon className="h-5 w-5 mr-2 text-green-600" />
            Address Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                disabled={loadingBusinessTypes}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Street address, building, floor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                disabled={loadingBusinessTypes}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State/Region *</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
                disabled={loadingBusinessTypes}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter state or region"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                required
                disabled={loadingBusinessTypes}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Country</option>
                <option value="Myanmar">Myanmar</option>
                <option value="Thailand">Thailand</option>
                <option value="China">China</option>
                <option value="India">India</option>
                <option value="Bangladesh">Bangladesh</option>
                <option value="Laos">Laos</option>
                <option value="Cambodia">Cambodia</option>
                <option value="Vietnam">Vietnam</option>
                <option value="Singapore">Singapore</option>
                <option value="Malaysia">Malaysia</option>
                <option value="Indonesia">Indonesia</option>
                <option value="Philippines">Philippines</option>
                <option value="Japan">Japan</option>
                <option value="South Korea">South Korea</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleInputChange}
                disabled={loadingBusinessTypes}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter postal code"
              />
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <LinkIcon className="h-5 w-5 mr-2 text-green-600" />
            Social Media Links
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">fb.com/</span>
                </div>
                <input
                  type="text"
                  name="social_facebook"
                  value={formData.social_facebook}
                  onChange={handleInputChange}
                  disabled={loadingBusinessTypes}
                  className="w-full pl-20 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="username"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">instagram.com/</span>
                </div>
                <input
                  type="text"
                  name="social_instagram"
                  value={formData.social_instagram}
                  onChange={handleInputChange}
                  disabled={loadingBusinessTypes}
                  className="w-full pl-28 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="username"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Twitter (X)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">twitter.com/</span>
                </div>
                <input
                  type="text"
                  name="social_twitter"
                  value={formData.social_twitter}
                  onChange={handleInputChange}
                  disabled={loadingBusinessTypes}
                  className="w-full pl-24 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="username"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">linkedin.com/</span>
                </div>
                <input
                  type="text"
                  name="social_linkedin"
                  value={formData.social_linkedin}
                  onChange={handleInputChange}
                  disabled={loadingBusinessTypes}
                  className="w-full pl-26 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="username"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving || loadingBusinessTypes}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || loadingBusinessTypes || !!businessTypesError}
            className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditStore;