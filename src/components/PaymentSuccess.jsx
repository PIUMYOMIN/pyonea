// components/PaymentSuccess.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  DocumentArrowDownIcon,
  PrinterIcon,
  ShareIcon,
  HomeIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import GoogleCustomerReviewsOptIn from './GoogleCustomerReviewsOptIn';

const PaymentSuccess = ({ order, paymentData, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch complete order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/orders/${order.id}`);
        if (response.data.success) {
          setOrderDetails(response.data.data);
        } else {
          setError('Failed to load order details');
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (order && order.id) {
      fetchOrderDetails();
    } else {
      setError('Invalid order data');
      setLoading(false);
    }
  }, [order]);

  const formatMMK = (amount) => {
    const num = Number(amount) || 0;
    const formattedNumber = new Intl.NumberFormat('en-MM', {
      minimumFractionDigits: 0
    }).format(num);
    return `${formattedNumber} ${t('common.currency.mmk', 'MMK')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-MM', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Safe access to order data
  const getOrderItems = () => {
    return orderDetails?.items || order?.items || [];
  };

  const getShippingAddress = () => {
    if (typeof orderDetails?.shipping_address === 'string') {
      try {
        return JSON.parse(orderDetails.shipping_address);
      } catch {
        return {};
      }
    }
    return orderDetails?.shipping_address || order?.shipping_address || {};
  };

  const getOrderNumber = () => {
    return orderDetails?.order_number || order?.order_number || 'N/A';
  };

  const getOrderTotals = () => {
    return {
      subtotal: orderDetails?.subtotal_amount || order?.subtotal_amount || 0,
      shipping: orderDetails?.shipping_fee || order?.shipping_fee || 0,
      tax: orderDetails?.tax_amount || order?.tax_amount || 0,
      total: orderDetails?.total_amount || order?.total_amount || 0,
      taxRate: orderDetails?.tax_rate || order?.tax_rate || 0.05
    };
  };

  // FIXED: Simple print function without react-to-print
  const handlePrint = () => {
    const printContent = document.getElementById('printable-content');
    if (!printContent) {
      alert('Print content not found. Please try downloading as PDF.');
      return;
    }

    const printWindow = window.open('', '_blank');
    const orderNumber = getOrderNumber();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${orderNumber}</title>
          <style>
            @page { 
              size: A4; 
              margin: 20mm; 
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              color: #000;
              background: white;
            }
            .receipt-container {
              max-width: 100%;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              font-weight: bold;
              margin: 0 0 10px 0;
              color: #000;
            }
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .section h3 {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 10px;
              color: #333;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px 12px;
              text-align: left;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .total-section {
              margin-top: 20px;
              border-top: 2px solid #333;
              padding-top: 15px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .final-total {
              font-weight: bold;
              font-size: 18px;
              border-top: 1px solid #333;
              padding-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  // Download as PDF
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      
      const element = document.getElementById('printable-content');
      if (!element) {
        throw new Error('Print content not found');
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190; // Slightly smaller to fit margins
      const pageHeight = 277; // A4 height minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // Start 10mm from top

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Payment_Slip_${getOrderNumber()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Share function
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Payment Slip - ${getOrderNumber()}`,
          text: `Payment confirmation for order ${getOrderNumber()}`,
          url: window.location.href,
        });
      } catch {
        /* user dismissed share sheet or share failed — ignore */
      }
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-3 mx-auto mb-4 w-fit">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Receipt</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/buyer')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                View Orders
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const orderItems = getOrderItems();
  const shippingAddress = getShippingAddress();
  const orderNumber = getOrderNumber();
  const totals = getOrderTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <GoogleCustomerReviewsOptIn order={orderDetails || order} />
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircleIcon className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Your order has been confirmed and payment has been processed
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Slip */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Action Bar */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Payment Receipt
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePrint}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <PrinterIcon className="h-4 w-4 mr-2" />
                      Print
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      disabled={downloading}
                      className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                      {downloading ? t('payment_success.downloading') : t('payment_success.download_pdf')}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ShareIcon className="h-4 w-4 mr-2" />
                      Share
                    </button>
                  </div>
                </div>
              </div>

              {/* Printable Content - FIXED: Using ID instead of ref */}
              <div className="p-8 bg-white">
                <div id="printable-content" className="print-content">
                  {/* Header */}
                  <div className="text-center mb-8 border-b border-gray-200 pb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      PAYMENT RECEIPT
                    </h1>
                    <p className="text-gray-600">Your B2B Marketplace Platform</p>
                    <p className="text-sm text-gray-500 mt-1">
                      123 Business Street, Yangon, Myanmar | +95 9 123 456 789
                    </p>
                  </div>

                  {/* Order & Payment Info */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                        Order Information
                      </h3>
                      <div className="space-y-1">
                        <p><span className="font-medium">Order Number:</span> {orderNumber}</p>
                        <p><span className="font-medium">Order Date:</span> {formatDate(orderDetails?.created_at)}</p>
                        <p><span className="font-medium">Status:</span> <span className="text-green-600 font-medium">Confirmed</span></p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                        Payment Information
                      </h3>
                      <div className="space-y-1">
                        <p><span className="font-medium">Payment Method:</span> {orderDetails?.payment_method?.toUpperCase() || 'N/A'}</p>
                        <p><span className="font-medium">Payment Date:</span> {formatDate(paymentData?.paidAt)}</p>
                        <p><span className="font-medium">Reference ID:</span> {paymentData?.transactionId || 'N/A'}</p>
                        <p><span className="font-medium">Status:</span> <span className="text-green-600 font-medium">Paid</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Shipping Info */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                        Customer Information
                      </h3>
                      <div className="space-y-1">
                        <p className="font-medium">{shippingAddress.full_name || 'N/A'}</p>
                        <p>{shippingAddress.phone || 'N/A'}</p>
                        <p className="text-sm text-gray-600">{shippingAddress.email || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                        Shipping Address
                      </h3>
                      <div className="space-y-1">
                        <p>{shippingAddress.address || 'N/A'}</p>
                        <p>{shippingAddress.city || ''}, {shippingAddress.state || ''}</p>
                        <p>{shippingAddress.postal_code || ''}, {shippingAddress.country || ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">
                      Order Items
                    </h3>
                    {orderItems.length > 0 ? (
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-2 font-semibold text-gray-700">Item</th>
                            <th className="text-center py-2 font-semibold text-gray-700">Qty</th>
                            <th className="text-right py-2 font-semibold text-gray-700">Price</th>
                            <th className="text-right py-2 font-semibold text-gray-700">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderItems.map((item, index) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-3">
                                <div>
                                  <p className="font-medium">{item.product_name || 'Unknown Product'}</p>
                                  <p className="text-sm text-gray-500">SKU: {item.product_sku || 'N/A'}</p>
                                </div>
                              </td>
                              <td className="text-center py-3">{item.quantity || 0}</td>
                              <td className="text-right py-3">{formatMMK(item.price || 0)}</td>
                              <td className="text-right py-3 font-medium">{formatMMK(item.subtotal || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No items found in this order</p>
                    )}
                  </div>

                  {/* Payment Summary */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="max-w-xs ml-auto">
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatMMK(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="font-medium">{formatMMK(totals.shipping)}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Tax ({totals.taxRate * 100}%):</span>
                        <span className="font-medium">{formatMMK(totals.tax)}</span>
                      </div>
                      <div className="flex justify-between py-3 border-t border-gray-200 font-bold text-lg">
                        <span>{t('payment_success.total_paid')}:</span>
                        <span className="text-green-600">{formatMMK(totals.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-500 mb-2">
                      Thank you for your business!
                    </p>
                    <p className="text-xs text-gray-400">
                      This is an computer-generated receipt. No signature required.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      For any inquiries, contact: support@yourb2b.com | +95 9 123 456 789
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            {/* Next Steps */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                What's Next?
              </h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-full p-2 mt-1 mr-3">
                    <ShoppingBagIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Order Processing</p>
                    <p className="text-sm text-gray-600">Seller will prepare your items within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-green-100 rounded-full p-2 mt-1 mr-3">
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Shipping Updates</p>
                    <p className="text-sm text-gray-600">Track your order in the orders section</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/buyer')}
                  className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <ShoppingBagIcon className="h-5 w-5 mr-2" />
                  View All Orders
                </button>
                <button
                  onClick={() => navigate('/products')}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  <HomeIcon className="h-5 w-5 mr-2" />
                  Continue Shopping
                </button>
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Support Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Need Help?
              </h3>
              <p className="text-blue-800 text-sm mb-4">
                Our support team is here to help with your order.
              </p>
              <div className="text-sm text-blue-700 space-y-1">
                <p>📞 +95 9 123 456 789</p>
                <p>✉️ support@yourb2b.com</p>
                <p>🕒 Mon-Sun: 8:00 AM - 8:00 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
