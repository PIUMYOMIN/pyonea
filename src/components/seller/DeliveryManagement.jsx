// src/components/seller/DeliveryManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  MapPinIcon,
  EyeIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  ArrowPathIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import api from "../../utils/api";

// FIX: single shared formatMMK — removed the duplicate defined later in the file
function formatMMK(amount) {
  return new Intl.NumberFormat("en-MM", {
    style: "currency",
    currency: "MMK",
    minimumFractionDigits: 0,
  }).format(amount ?? 0);
}

function getStatusColor(status) {
  switch (status) {
    case "pending":           return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700";
    case "awaiting_pickup":   return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
    case "picked_up":         return "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700";
    case "in_transit":        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700";
    case "out_for_delivery":  return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700";
    case "delivered":         return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
    case "failed":            return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700";
    case "cancelled":         return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
    default:                  return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
  }
}

function getStatusIcon(status) {
  switch (status) {
    case "delivered": return <CheckCircleIcon className="h-4 w-4" />;
    case "failed":    return <XCircleIcon className="h-4 w-4" />;
    case "picked_up":
    case "in_transit":
    case "out_for_delivery": return <TruckIcon className="h-4 w-4" />;
    default:          return <ClockIcon className="h-4 w-4" />;
  }
}

// FIX: replaceAll so multi-underscore statuses like out_for_delivery render correctly
function humanStatus(status) {
  return (status ?? "").replaceAll("_", " ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const DeliveryManagement = ({ refreshData }) => {
  const [deliveries, setDeliveries]               = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [proofModalDelivery, setProofModalDelivery] = useState(null);
  const [isModalOpen, setIsModalOpen]             = useState(false);
  const [showDeliveryMethodModal, setShowDeliveryMethodModal] = useState(false);
  const [selectedOrder, setSelectedOrder]         = useState(null);
  const [actionLoading, setActionLoading]         = useState(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/deliveries");
      const data = response.data.data?.data ?? response.data.data ?? [];
      setDeliveries(data);
    } catch (err) {
      console.error("Failed to fetch deliveries:", err);
      setError("Failed to load deliveries. Please try again.");
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // FIX: pass real package weight so fee isn't always the same fixed amount
  const calculatePlatformFee = (weight = 5, distance = 0) => {
    return 5000 + weight * 100 + distance * 200;
  };

  const handleChooseDeliveryMethod = async (order, method, pickupAddress) => {
    try {
      setActionLoading(order.id);
      const weight = order.delivery?.package_weight ?? 5;
      const platformFee = method === "platform" ? calculatePlatformFee(weight) : 0;

      const response = await api.post(`/seller/delivery/${order.id}/delivery-method`, {
        delivery_method:       method,
        platform_delivery_fee: platformFee,
        // FIX: pickup address comes from the form, not hard-coded
        pickup_address: pickupAddress,
      });

      if (response.data.success) {
        await fetchDeliveries();
        if (refreshData) refreshData();
        setShowDeliveryMethodModal(false);
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error("Failed to set delivery method:", err);
      setError(err.response?.data?.message ?? "Failed to set delivery method");
    } finally {
      setActionLoading(null);
    }
  };

  const updateDeliveryStatus = async (deliveryId, status, notes = "") => {
    try {
      setActionLoading(deliveryId);
      const response = await api.post(`/deliveries/${deliveryId}/status`, { status, notes });
      if (response.data.success) {
        await fetchDeliveries();
        if (refreshData) refreshData();
      }
    } catch (err) {
      console.error("Failed to update delivery status:", err);
      setError(err.response?.data?.message ?? "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const uploadDeliveryProof = async (deliveryId, file, recipientName, recipientPhone) => {
    try {
      setActionLoading(deliveryId);
      const formData = new FormData();
      formData.append("delivery_proof",  file);
      formData.append("recipient_name",  recipientName);
      formData.append("recipient_phone", recipientPhone);

      const response = await api.post(`/deliveries/${deliveryId}/proof`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        await fetchDeliveries();
        if (refreshData) refreshData();
        setIsModalOpen(false);
        setSelectedDelivery(null);
      }
    } catch (err) {
      console.error("Failed to upload delivery proof:", err);
      setError(err.response?.data?.message ?? "Failed to upload proof");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
      </div>
    );
  }

  // Delivery stats from loaded data
  const stats = {
    pending:   deliveries.filter(d => d.status === 'pending').length,
    inTransit: deliveries.filter(d => ['awaiting_pickup','picked_up','in_transit','out_for_delivery'].includes(d.status)).length,
    delivered: deliveries.filter(d => d.status === 'delivered').length,
    failed:    deliveries.filter(d => d.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delivery Management</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Choose delivery methods and track your order deliveries
          </p>
        </div>
        <button onClick={fetchDeliveries}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800">
          <ArrowPathIcon className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending',    value: stats.pending,    color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { label: 'In Transit', value: stats.inTransit,  color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Delivered',  value: stats.delivered,  color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-900/20'   },
          { label: 'Failed',     value: stats.failed,     color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20'       },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* FIX: inline error banner instead of alert() */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex justify-between items-center">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {showDeliveryMethodModal && selectedOrder && (
        <DeliveryMethodModal
          order={selectedOrder}
          loading={actionLoading === selectedOrder.id}
          onClose={() => { setShowDeliveryMethodModal(false); setSelectedOrder(null); }}
          onMethodSelect={handleChooseDeliveryMethod}
          calculatePlatformFee={calculatePlatformFee}
        />
      )}

      <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                {["Order ID", "Customer", "Delivery Method", "Status", "Delivery Fee", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {deliveries.length > 0 ? (
                deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      #{delivery.order?.order_number ?? delivery.order_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-200">
                      {delivery.order?.shipping_address?.full_name ?? "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-200">
                      {delivery.delivery_method === "platform" ? (
                        <span className="flex items-center gap-1">
                          <BuildingStorefrontIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          Platform Logistics
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <TruckIcon className="h-4 w-4 text-gray-600 dark:text-slate-400" />
                          Self Delivery
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                        {getStatusIcon(delivery.status)}
                        <span className="capitalize">{humanStatus(delivery.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-200">
                      {formatMMK(delivery.platform_delivery_fee)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => { setSelectedDelivery(delivery); setIsModalOpen(true); }}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>

                      {/* Choose Method — only when pending (no method chosen yet) */}
                      {delivery.status === "pending" && (
                        <button
                          disabled={actionLoading === delivery.id}
                          onClick={() => { setSelectedOrder(delivery.order); setShowDeliveryMethodModal(true); }}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Choose Method
                        </button>
                      )}

                      {/* Method already chosen — show locked badge instead of button */}
                      {delivery.status !== "pending" && delivery.delivery_method && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded border ${
                          delivery.delivery_method === "platform"
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
                            : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600"
                        } cursor-not-allowed opacity-70`}>
                          🔒 {delivery.delivery_method === "platform" ? "Platform Delivery" : "Self Delivery"}
                        </span>
                      )}

                      {delivery.status === "awaiting_pickup" && delivery.delivery_method === "supplier" && (
                        <button
                          disabled={actionLoading === delivery.id}
                          onClick={() => updateDeliveryStatus(delivery.id, "picked_up", "Items picked up from warehouse")}
                          className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {actionLoading === delivery.id ? "..." : "Mark Picked Up"}
                        </button>
                      )}

                      {delivery.status === "picked_up" && delivery.delivery_method === "supplier" && (
                        <button
                          disabled={actionLoading === delivery.id}
                          onClick={() => updateDeliveryStatus(delivery.id, "in_transit", "On the way to customer")}
                          className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:opacity-50"
                        >
                          {actionLoading === delivery.id ? "..." : "In Transit"}
                        </button>
                      )}

                      {selectedDelivery && (
                      <DeliveryDetailsModal
                      delivery={selectedDelivery}
                      isOpen={isModalOpen}
                      actionLoading={actionLoading}
                      onClose={() => { setIsModalOpen(false); setSelectedDelivery(null); }}
                      onProofUpload={uploadDeliveryProof}
        />
      )}
      {proofModalDelivery && (
        <ProofUploadModal
          delivery={proofModalDelivery}
          actionLoading={actionLoading}
          onClose={() => setProofModalDelivery(null)}
          onUpload={async (id, file, name, phone) => {
            await uploadDeliveryProof(id, file, name, phone);
            setProofModalDelivery(null);
            fetchDeliveries();
          }}
        />
      )}

                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <TruckIcon className="h-16 w-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Deliveries Found</h3>
                    <p className="text-gray-600 dark:text-slate-400">You don't have any deliveries to manage yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDelivery && (
        <DeliveryDetailsModal
          delivery={selectedDelivery}
          isOpen={isModalOpen}
          actionLoading={actionLoading}
          onClose={() => { setIsModalOpen(false); setSelectedDelivery(null); }}
          onProofUpload={uploadDeliveryProof}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Delivery Method Selection Modal
// FIX: added pickupAddress input so it's no longer hard-coded
// ─────────────────────────────────────────────────────────────────────────────
const DeliveryMethodModal = ({ order, loading, onClose, onMethodSelect, calculatePlatformFee }) => {
  const [selectedMethod, setSelectedMethod] = useState("supplier");
  const [pickupAddress, setPickupAddress]   = useState("");
  const [addressError, setAddressError]     = useState("");

  const weight = order?.delivery?.package_weight ?? order?.package_weight ?? 5;

  const handleConfirm = () => {
    if (!pickupAddress.trim()) {
      setAddressError("Pickup address is required");
      return;
    }
    onMethodSelect(order, selectedMethod, pickupAddress.trim());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500/60 dark:bg-black/60" onClick={onClose} />

        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg z-10">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Choose Delivery Method</h3>
            <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-500 dark:hover:text-slate-300">
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Self Delivery */}
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedMethod === "supplier" ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
              }`}
              onClick={() => setSelectedMethod("supplier")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <TruckIcon className="h-5 w-5 text-gray-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Self Delivery</h4>
                    <p className="text-sm text-gray-600 dark:text-slate-400">You arrange and manage delivery</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 dark:text-green-400">Free</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">No platform fee</p>
                </div>
              </div>
            </div>

            {/* Platform Logistics */}
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedMethod === "platform" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
              }`}
              onClick={() => setSelectedMethod("platform")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                    <BuildingStorefrontIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Platform Logistics</h4>
                    <p className="text-sm text-gray-600 dark:text-slate-400">We handle delivery for you</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600 dark:text-blue-400">{formatMMK(calculatePlatformFee(weight))}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Platform service fee</p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">Benefits:</h5>
              <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                {selectedMethod === "supplier" ? (
                  <>
                    <li>• Full control over delivery process</li>
                    <li>• Direct communication with customer</li>
                    <li>• No additional platform fees</li>
                    <li>• Flexible delivery scheduling</li>
                  </>
                ) : (
                  <>
                    <li>• Professional logistics service</li>
                    <li>• Real-time tracking for customers</li>
                    <li>• Delivery confirmation system</li>
                    <li>• Platform manages customer communication</li>
                  </>
                )}
              </ul>
            </div>

            {/* FIX: pickup address input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Pickup Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => { setPickupAddress(e.target.value); setAddressError(""); }}
                placeholder="e.g. No. 12, Merchant St, Yangon"
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 ${
                  addressError ? "border-red-400 dark:border-red-600" : "border-gray-300 dark:border-slate-600"
                } focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400`}
              />
              {addressError && <p className="text-xs text-red-500 mt-1">{addressError}</p>}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-3 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Confirm Delivery Method"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProofUploadModal = ({ delivery, actionLoading, onUpload, onClose }) => {
  const [proofFile, setProofFile]         = useState(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [proofError, setProofError]       = useState("");
 
  if (!delivery) return null;
 
  const handleSubmit = async () => {
    if (!proofFile || !recipientName.trim() || !recipientPhone.trim()) {
      setProofError("Please fill all fields and select a proof photo.");
      return;
    }
    setProofError("");
    await onUpload(delivery.id, proofFile, recipientName.trim(), recipientPhone.trim());
    onClose();
  };
 
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
 
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CameraIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Upload Delivery Proof
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Order #{delivery.order?.order_number ?? delivery.order_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200
                       hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
 
        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Attach a photo of the delivered package and confirm recipient details to
            mark this order as delivered.
          </p>
 
          {proofError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20
                           border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {proofError}
            </p>
          )}
 
          {/* Photo picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
              Proof Photo <span className="text-red-500">*</span>
            </label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors">
              {proofFile ? (
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium truncate max-w-[220px]">{proofFile.name}</span>
                </div>
              ) : (
                <>
                  <CameraIcon className="h-7 w-7 text-gray-400 dark:text-slate-500 mb-1" />
                  <span className="text-xs text-gray-500 dark:text-slate-400">Click to select a photo</span>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">JPG, PNG up to 5 MB</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { setProofFile(e.target.files[0]); setProofError(""); }}
              />
            </label>
          </div>
 
          {/* Recipient details */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
              Recipient Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ko Aung"
              value={recipientName}
              onChange={(e) => { setRecipientName(e.target.value); setProofError(""); }}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl text-sm
                         bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                         focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
              Recipient Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 09 xxx xxx xxx"
              value={recipientPhone}
              onChange={(e) => { setRecipientPhone(e.target.value); setProofError(""); }}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl text-sm
                         bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                         focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
 
        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl text-sm font-medium
                       text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={actionLoading === delivery.id}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800
                       text-white rounded-xl text-sm font-semibold transition-colors
                       disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading === delivery.id ? (
              <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Uploading…</>
            ) : (
              <><CameraIcon className="h-4 w-4" /> Submit Proof</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Delivery Details Modal
// ─────────────────────────────────────────────────────────────────────────────
const DeliveryDetailsModal = ({ delivery, isOpen, actionLoading, onClose, onProofUpload }) => {
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [proofFile, setProofFile]             = useState(null);
  const [recipientName, setRecipientName]     = useState("");
  const [recipientPhone, setRecipientPhone]   = useState("");
  const [proofError, setProofError]           = useState("");

  if (!isOpen) return null;

  const resetProofForm = () => {
    setShowProofUpload(false);
    setProofFile(null);
    setRecipientName("");
    setRecipientPhone("");
    setProofError("");
  };

  const handleProofUpload = async () => {
    if (!proofFile || !recipientName.trim() || !recipientPhone.trim()) {
      setProofError("Please fill all fields and select a proof image");
      return;
    }
    setProofError("");
    await onProofUpload(delivery.id, proofFile, recipientName, recipientPhone);
    resetProofForm();
  };

  // FIX: use deliveryUpdates (camelCase) — the key Laravel Eloquent serialises to
  // Backend may serialize as snake_case or camelCase depending on config
  const updates = delivery.delivery_updates ?? delivery.deliveryUpdates ?? [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500/60 dark:bg-black/60" onClick={onClose} />

        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl z-10">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Delivery Details — Order #{delivery.order?.order_number}
            </h3>
            <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-500 dark:hover:text-slate-300">
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Delivery info */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Delivery Information</h4>
                <div className="space-y-3 text-sm text-gray-900 dark:text-slate-200">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-slate-400">Method: </span>
                    <span className="capitalize">{delivery.delivery_method}</span>
                    {delivery.delivery_method === "platform" && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                        Platform Logistics
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-slate-400">Status: </span>
                    <span className="capitalize">{humanStatus(delivery.status)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-slate-400">Delivery Fee: </span>
                    {formatMMK(delivery.platform_delivery_fee)}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-slate-400">Tracking Number: </span>
                    <span className="font-mono">{delivery.tracking_number ?? "Not assigned"}</span>
                  </div>
                </div>
              </div>

              {/* Address info */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Address Information</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-700 dark:text-slate-400 flex items-center gap-1">
                      <MapPinIcon className="h-4 w-4" /> Pickup Address
                    </p>
                    <p className="text-gray-900 dark:text-slate-200 mt-1">{delivery.pickup_address ?? "Not specified"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 dark:text-slate-400 flex items-center gap-1">
                      <MapPinIcon className="h-4 w-4" /> Delivery Address
                    </p>
                    <p className="text-gray-900 dark:text-slate-200 mt-1">{delivery.delivery_address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tracking timeline */}
            {updates.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Delivery Updates</h4>
                <div className="space-y-3">
                  {updates.map((update, index) => (
                    <div key={update.id ?? index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 dark:text-slate-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {humanStatus(update.status)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {new Date(update.created_at).toLocaleString()}
                          </span>
                        </div>
                        {update.notes && (
                          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{update.notes}</p>
                        )}
                        {update.location && (
                          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Location: {update.location}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proof upload */}
            {delivery.status === "out_for_delivery" && delivery.delivery_method === "supplier" && (
              <div className="mt-6">
                {!showProofUpload ? (
                  <button
                    onClick={() => setShowProofUpload(true)}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
                  >
                    Upload Delivery Proof
                  </button>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <h5 className="font-medium text-yellow-800 dark:text-yellow-300 mb-3">Upload Delivery Proof</h5>
                    <div className="space-y-3">
                      {proofError && (
                        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
                          {proofError}
                        </p>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files[0])}
                        className="w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60"
                      />
                      <input
                        type="text"
                        placeholder="Recipient Name"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      />
                      <input
                        type="text"
                        placeholder="Recipient Phone"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleProofUpload}
                          disabled={actionLoading === delivery.id}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === delivery.id ? "Uploading..." : "Submit Proof"}
                        </button>
                        <button
                          onClick={resetProofForm}
                          className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-medium hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-3 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryManagement;