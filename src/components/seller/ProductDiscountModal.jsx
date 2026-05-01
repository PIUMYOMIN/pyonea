import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import {
  XMarkIcon,
  CalendarIcon,
  TagIcon,
  CurrencyDollarIcon,
  TicketIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TrashIcon
} from "@heroicons/react/24/outline";

const ProductDiscountModal = ({ product, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = React.useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [discountStats, setDiscountStats] = useState(null);
  
  const [formData, setFormData] = useState({
    is_on_sale: false,
    discount_type: "none",
    discount_value: "",
    discount_start: "",
    discount_end: "",
    compare_at_price: "",
    sale_badge: "Sale",
    sale_quantity: ""
  });

  // Fetch current discount stats (coupons that apply to this product)
  useEffect(() => {
    const fetchDiscountStats = async () => {
      try {
        const response = await api.get(`/seller/products/${product.id}/discounts`);
        if (response.data.success) {
          setDiscountStats(response.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch discount stats:", err);
      }
    };

    // Populate form with existing product discount data
    setFormData({
      is_on_sale: product.is_on_sale || false,
      discount_type: product.discount_price ? "fixed" : 
                   product.discount_percentage ? "percentage" : "none",
      discount_value: product.discount_price || product.discount_percentage || "",
      discount_start: product.discount_start?.split("T")[0] || "",
      discount_end: product.discount_end?.split("T")[0] || "",
      compare_at_price: product.compare_at_price || "",
      sale_badge: product.sale_badge || "Sale",
      sale_quantity: product.sale_quantity || ""
    });

    fetchDiscountStats();
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        ...formData,
        discount_value: formData.discount_type !== "none" ? parseFloat(formData.discount_value) : 0
      };

      const response = await api.post(`/seller/products/${product.id}/apply-discount`, payload);
      
      if (response.data.success) {
        setSuccessMessage("Discount applied successfully!");
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to apply discount");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDiscount = async () => {

    setLoading(true);
    try {
      const response = await api.post(`/seller/products/${product.id}/remove-discount`);
      if (response.data.success) {
        setSuccessMessage("Discount removed successfully!");
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove discount");
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscount = () => {
    if (!formData.discount_value || formData.discount_type === "none") {
      return null;
    }

    const price = parseFloat(product.price);
    const value = parseFloat(formData.discount_value);

    if (formData.discount_type === "percentage") {
      const discountAmount = price * (value / 100);
      return {
        type: "percentage",
        value: value,
        original: price,
        discounted: price - discountAmount,
        saved: discountAmount,
        discountPercent: value
      };
    } else {
      const discountPercent = Math.round((value / price) * 100);
      return {
        type: "fixed",
        value: value,
        original: price,
        discounted: price - value,
        saved: value,
        discountPercent: discountPercent
      };
    }
  };

  const discountInfo = calculateDiscount();

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

{/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <TagIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-slate-100">
                    Product Discount
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {product.name}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Current Discount Info */}
          {(product.is_on_sale || product.discount_price || product.discount_percentage) && (
            <div className="px-6 py-3 bg-yellow-50 border-y border-yellow-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TicketIcon className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Currently on sale
                  </span>
                </div>
                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Remove Discount
                </button>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="px-6 py-3 bg-red-50">
              <div className="flex items-center">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="px-6 py-3 bg-green-50">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-sm text-green-700">{successMessage}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
{/* Toggle Switch */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-base font-medium text-gray-900 dark:text-slate-100">
                  Enable Discount
                </h4>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Turn on to apply discount to this product
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_on_sale"
                  checked={formData.is_on_sale}
                  onChange={handleChange}
                  className="sr-only peer"
                />
<div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-slate-300 after:border-gray-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {formData.is_on_sale && (
              <div className="space-y-6">
{/* Discount Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Discount Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, discount_type: "percentage" }))}
                      className={`p-3 border-2 rounded-lg text-center ${formData.discount_type === "percentage" ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-slate-600'}`}
                    >
                      <div className="text-sm font-medium dark:text-slate-100">Percentage</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">% off</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, discount_type: "fixed" }))}
                      className={`p-3 border-2 rounded-lg text-center ${formData.discount_type === "fixed" ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-slate-600'}`}
                    >
                      <div className="text-sm font-medium dark:text-slate-100">Fixed Amount</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">$ off</div>
                    </button>
                  </div>
                </div>

{/* Discount Value */}
                {formData.discount_type !== "none" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                      {formData.discount_type === "percentage" ? "Discount Percentage" : "Discount Amount"}
                    </label>
                    <div className="relative">
                      {formData.discount_type === "percentage" ? (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-slate-400 sm:text-sm">%</span>
                        </div>
                      ) : (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-slate-400 sm:text-sm">$</span>
                        </div>
                      )}
                      <input
                        type="number"
                        name="discount_value"
                        value={formData.discount_value}
                        onChange={handleChange}
                        min="0"
                        step={formData.discount_type === "percentage" ? "0.1" : "0.01"}
                        className="pl-10 block w-full border border-gray-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent sm:text-sm transition-colors"
                        placeholder={formData.discount_type === "percentage" ? "e.g., 20" : "e.g., 10.00"}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Discount Preview */}
                {discountInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-blue-800">Original Price</div>
<div className="text-lg font-semibold text-gray-900">
                          ${Number(product.price).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-blue-800">Discount</div>
                        <div className="text-lg font-bold text-red-600">
                          -{discountInfo.discountPercent}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-blue-800">Sale Price</div>
                        <div className="text-2xl font-bold text-green-600">
                          ${discountInfo.discounted.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-center text-sm text-blue-800">
                      Customer saves: ${discountInfo.saved.toFixed(2)}
                    </div>
                  </div>
                )}

{/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                      Start Date
                    </label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-500" />
                      <input
                        type="date"
                        name="discount_start"
                        value={formData.discount_start}
                        onChange={handleChange}
                        className="pl-10 block w-full border border-gray-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent sm:text-sm transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                      End Date
                    </label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-500" />
                      <input
                        type="date"
                        name="discount_end"
                        value={formData.discount_end}
                        onChange={handleChange}
                        className="pl-10 block w-full border border-gray-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent sm:text-sm transition-colors"
                      />
                    </div>
                  </div>
                </div>

{/* Sale Badge */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Sale Badge Text
                  </label>
                      <input
                        type="text"
                        name="sale_badge"
                        value={formData.sale_badge}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent sm:text-sm transition-colors"
                        placeholder="e.g., Sale, Limited Offer, Flash Deal"
                      />
                </div>

                {/* Compare At Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Compare At Price (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-slate-400 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="compare_at_price"
                      value={formData.compare_at_price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="pl-7 block w-full border border-gray-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent sm:text-sm transition-colors"
                      placeholder="e.g., Original price to show as strikethrough"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    Shows as strikethrough price on product page
                  </p>
                </div>

                {/* Sale Quantity Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Sale Quantity Limit (Optional)
                  </label>
                  <input
                    type="number"
                    name="sale_quantity"
                    value={formData.sale_quantity}
                    onChange={handleChange}
                    min="1"
                    className="block w-full border border-gray-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent sm:text-sm transition-colors"
                    placeholder="e.g., 100 (leave empty for unlimited)"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    Limit the number of items available at discount price
                  </p>
                </div>
              </div>
            )}

{/* Footer Actions */}
            <div className="mt-6 flex justify-between">
              <div>
                {product.is_on_sale && (
                  <button
                    type="button"
                    onClick={() => setShowRemoveConfirm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-200 dark:bg-red-900/50 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Remove Discount
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Discount"
                  )}
                </button>
              </div>
            </div>
          </form>

{/* Current Discount Stats */}
          {discountStats && discountStats.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
              <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">
                Active Discounts
              </h4>
              <div className="space-y-2">
                {discountStats.map((discount, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <TagIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-700 dark:text-slate-200">{discount.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-slate-100">
                        {discount.type === "percentage" ? `${discount.value}% off` : 
                         discount.type === "fixed" ? `$${discount.value} off` : 
                         discount.type === "free_shipping" ? "Free Shipping" : ""}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        Until {formatDate(discount.expires_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
{showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-2">Remove Discount</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-5">Remove the discount from <strong>{product?.name_en || product?.name}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRemoveConfirm(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-slate-200">Cancel</button>
              <button onClick={() => { setShowRemoveConfirm(false); handleRemoveDiscount(); }} className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl">Remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductDiscountModal;