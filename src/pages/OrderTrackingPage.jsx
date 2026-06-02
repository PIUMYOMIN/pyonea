// src/pages/OrderTrackingPage.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import OrderTracking from './OrderTracking';
import api from '../utils/api';

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [order, setOrder] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const formattedOrderDate = order?.created_at
    ? new Date(order.created_at).toLocaleDateString()
    : "";

  React.useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data.data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">{t("order_tracking.not_found_page")}</h2>
          <button
            onClick={() => navigate('/buyer')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700"
          >
            {t("order_tracking.back_to_dashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/buyer')}
            className="inline-flex items-center text-green-600 hover:text-green-700 mb-4"
          >
            &lt;- {t("order_tracking.back_to_dashboard")}
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">{t("order_tracking.title")}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">
            {t("order_tracking.order_header_meta", {
              number: order.order_number,
              date: formattedOrderDate,
            })}
          </p>
        </div>

        {/* Tracking Component */}
        <OrderTracking order={order} />
      </div>
    </div>
  );
};

export default OrderTrackingPage;
