// pages/PaymentSuccess.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon,
  CheckIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ShareIcon,
  HomeIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import GoogleCustomerReviewsOptIn from '../components/GoogleCustomerReviewsOptIn';

const PAYMENT_SLIP_LOGO = '/Logo_on_payslip.png';

const PaymentSuccess = ({ order: orderProp, paymentData: paymentDataProp, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const order = orderProp ?? location.state?.order ?? null;
  const paymentData = paymentDataProp ?? location.state?.paymentData ?? null;
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const emptyValue = t('payment_success.not_available');
  const locale = i18n.language?.startsWith('my') ? 'my-MM' : 'en-MM';

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/orders/${order.id}`);
        if (response.data.success) {
          setOrderDetails(response.data.data);
        } else {
          setError(t('payment_success.load_failed'));
        }
      } catch (err) {
        setError(t('payment_success.load_failed'));
      } finally {
        setLoading(false);
      }
    };

    if (!order) {
      navigate('/buyer', { replace: true });
      return;
    }

    if (order.id) {
      fetchOrderDetails();
    } else {
      setError(t('payment_success.invalid_order'));
      setLoading(false);
    }
  }, [order, navigate, t]);

  const formatMMK = (amount) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'MMK',
      minimumFractionDigits: 0
    }).format(Number(amount) || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return emptyValue;
    try {
      return new Date(dateString).toLocaleString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return t('payment_success.invalid_date');
    }
  };

  const formatPaymentMethod = (method) => {
    if (!method) return emptyValue;
    return String(method).replace(/_/g, ' ').toUpperCase();
  };

  const getOrderItems = () => orderDetails?.items || order?.items || [];

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

  const getOrderNumber = () => orderDetails?.order_number || order?.order_number || emptyValue;

  const getPaymentDate = () => (
    orderDetails?.payment_confirmed_at || paymentData?.paidAt || orderDetails?.updated_at || order?.updated_at
  );

  const getReferenceId = () => (
    paymentData?.transactionId || paymentData?.gateway_ref || orderDetails?.transaction_id || orderDetails?.payment_reference || emptyValue
  );

  const getOrderTotals = () => ({
    subtotal: orderDetails?.subtotal_amount || order?.subtotal_amount || 0,
    shipping: orderDetails?.shipping_fee || order?.shipping_fee || 0,
    tax: orderDetails?.tax_amount || order?.tax_amount || 0,
    total: orderDetails?.total_amount || order?.total_amount || 0,
    taxRate: orderDetails?.tax_rate || order?.tax_rate || 0.05
  });

  const closeSuccessPage = () => {
    if (onClose) {
      onClose();
      return;
    }
    navigate('/buyer');
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-content');
    if (!printContent) {
      alert(t('payment_success.print_missing'));
      return;
    }

    const printWindow = window.open('', '_blank');
    const orderNumber = getOrderNumber();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('payment_success.receipt_title_with_order', { orderNumber })}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { margin: 0; background: #fff; color: #111827; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.45; }
            .receipt-container { max-width: 760px; margin: 0 auto; }
            .print-content { border: 1px solid #d1d5db; border-radius: 12px; overflow: hidden; background: #fff; }
            .receipt-header { display: flex; justify-content: space-between; gap: 24px; padding: 24px 26px; border-bottom: 3px solid #16a34a; }
            .receipt-brand { display: flex; align-items: flex-start; gap: 12px; }
            .brand-logo { width: 44px; height: 44px; border-radius: 999px; object-fit: contain; flex: 0 0 auto; }
            .brand-name { margin: 0; color: #14532d; font-family: Torus, Arial, sans-serif; font-size: 24px; font-weight: 700; line-height: 1.1; }
            .brand-subtitle { margin: 3px 0 0; color: #4b5563; font-size: 12px; font-weight: 700; }
            .brand-address { margin: 4px 0 0; color: #6b7280; font-size: 10px; max-width: 430px; }
            .receipt-title-box { text-align: right; min-width: 190px; }
            .receipt-title { margin: 0; color: #111827; font-size: 18px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
            .paid-badge { display: inline-block; margin-top: 8px; padding: 5px 11px; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 10px; font-weight: 800; text-transform: uppercase; }
            .receipt-body { padding: 24px 26px 22px; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
            .meta-item { border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
            .meta-label { margin: 0 0 3px; color: #6b7280; font-size: 9px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
            .meta-value { margin: 0; color: #111827; font-size: 11px; font-weight: 700; overflow-wrap: anywhere; }
            .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 22px; }
            .section-title { margin: 0 0 8px; color: #111827; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
            .detail-list { display: grid; gap: 4px; color: #374151; font-size: 11px; }
            .detail-list p { margin: 0; }
            .receipt-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
            .receipt-table th { padding: 9px 8px; border-bottom: 1px solid #d1d5db; background: #f3f4f6; color: #374151; font-size: 10px; font-weight: 800; text-transform: uppercase; }
            .receipt-table td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
            .item-name { margin: 0; color: #111827; font-weight: 700; }
            .item-sku { margin: 3px 0 0; color: #6b7280; font-size: 10px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .summary-wrap { display: flex; justify-content: flex-end; margin-top: 18px; }
            .summary-box { width: 270px; border-top: 2px solid #111827; padding-top: 8px; }
            .summary-row { display: flex; justify-content: space-between; gap: 18px; padding: 4px 0; color: #4b5563; }
            .summary-total { margin-top: 6px; padding-top: 9px; border-top: 1px solid #d1d5db; color: #111827; font-size: 15px; font-weight: 800; }
            .summary-total span:last-child { color: #16a34a; }
            .receipt-footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 10px; }
            .receipt-footer p { margin: 3px 0; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="receipt-container">${printContent.innerHTML}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    let pdfMount = null;

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const element = document.getElementById('printable-content');
      if (!element) {
        throw new Error(t('payment_success.print_missing'));
      }

      pdfMount = document.createElement('div');
      pdfMount.style.position = 'fixed';
      pdfMount.style.left = '-10000px';
      pdfMount.style.top = '0';
      pdfMount.style.width = '760px';
      pdfMount.style.background = '#ffffff';
      pdfMount.style.zIndex = '-1';

      const isMyanmarReceipt = i18n.language?.startsWith('my');
      const style = document.createElement('style');
      style.textContent = `
        #printable-content-pdf {
          width: 760px !important;
          max-width: 760px !important;
          border-radius: 12px !important;
          background: #ffffff !important;
          color: #111827 !important;
          font-family: "Myanmar Text", "Noto Sans Myanmar", Arial, sans-serif !important;
          font-size: ${isMyanmarReceipt ? '11px' : '12px'} !important;
          line-height: ${isMyanmarReceipt ? '1.55' : '1.42'} !important;
        }
        #printable-content-pdf .receipt-header {
          display: flex !important;
          flex-direction: row !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 24px !important;
          padding: 22px 26px !important;
        }
        #printable-content-pdf .receipt-brand { display: flex !important; align-items: flex-start !important; gap: 12px !important; }
        #printable-content-pdf .brand-logo { width: 44px !important; height: 44px !important; border-radius: 999px !important; object-fit: contain !important; flex: 0 0 auto !important; }
        #printable-content-pdf .brand-name { color: #14532d !important; font-family: "Torus", Arial, sans-serif !important; font-size: 22px !important; font-weight: 700 !important; line-height: 1.1 !important; }
        #printable-content-pdf .brand-address { font-size: ${isMyanmarReceipt ? '10px' : '11px'} !important; line-height: 1.5 !important; }
        #printable-content-pdf .receipt-title-box { min-width: 190px !important; text-align: right !important; }
        #printable-content-pdf .receipt-title { font-size: ${isMyanmarReceipt ? '14px' : '16px'} !important; line-height: ${isMyanmarReceipt ? '1.45' : '1.25'} !important; }
        #printable-content-pdf .receipt-body { padding: 22px 26px 20px !important; }
        #printable-content-pdf .meta-grid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 12px !important;
          margin-bottom: 20px !important;
        }
        #printable-content-pdf .meta-label { font-size: ${isMyanmarReceipt ? '8px' : '9px'} !important; letter-spacing: 0 !important; line-height: 1.35 !important; }
        #printable-content-pdf .meta-value { font-size: ${isMyanmarReceipt ? '10px' : '11px'} !important; line-height: ${isMyanmarReceipt ? '1.5' : '1.35'} !important; }
        #printable-content-pdf .section-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 22px !important;
          margin-bottom: 20px !important;
        }
        #printable-content-pdf .section-title { font-size: ${isMyanmarReceipt ? '10px' : '11px'} !important; line-height: 1.4 !important; letter-spacing: 0 !important; }
        #printable-content-pdf .detail-list { font-size: ${isMyanmarReceipt ? '11px' : '12px'} !important; line-height: ${isMyanmarReceipt ? '1.58' : '1.45'} !important; }
        #printable-content-pdf .receipt-table {
          width: 100% !important;
          min-width: 0 !important;
          table-layout: fixed !important;
          font-size: ${isMyanmarReceipt ? '10px' : '11px'} !important;
        }
        #printable-content-pdf .receipt-table th,
        #printable-content-pdf .receipt-table td { padding: ${isMyanmarReceipt ? '7px 7px' : '8px 8px'} !important; line-height: ${isMyanmarReceipt ? '1.5' : '1.35'} !important; }
        #printable-content-pdf .receipt-table th:first-child,
        #printable-content-pdf .receipt-table td:first-child { width: 48% !important; }
        #printable-content-pdf .summary-wrap {
          margin-top: 16px !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        #printable-content-pdf .summary-box { max-width: 285px !important; font-size: ${isMyanmarReceipt ? '11px' : '12px'} !important; }
        #printable-content-pdf .summary-total { font-size: ${isMyanmarReceipt ? '15px' : '17px'} !important; line-height: 1.45 !important; }
        #printable-content-pdf .receipt-footer {
          font-size: ${isMyanmarReceipt ? '9px' : '10px'} !important;
          line-height: 1.55 !important;
          margin-top: 18px !important;
          padding-top: 12px !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      `;
      const clone = element.cloneNode(true);
      clone.id = 'printable-content-pdf';

      pdfMount.appendChild(style);
      pdfMount.appendChild(clone);
      document.body.appendChild(pdfMount);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await Promise.all(
        Array.from(clone.querySelectorAll('img')).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 900,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= usableHeight) {
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = margin;

        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= usableHeight;

        while (heightLeft > 0) {
          position = margin - (imgHeight - heightLeft);
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
          heightLeft -= usableHeight;
        }
      }

      pdf.save(`Payment_Slip_${getOrderNumber()}.pdf`);
    } catch (error) {
      alert(t('payment_success.pdf_failed'));
    } finally {
      pdfMount?.remove();
      setDownloading(false);
    }
  };
  const handleShare = async () => {
    const url = window.location.href;
    const orderNumber = getOrderNumber();
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('payment_success.share_title', { orderNumber }),
          text: t('payment_success.share_text', { orderNumber }),
          url,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const pageClass = 'min-h-screen bg-gradient-to-br from-green-50 to-blue-50 px-4 py-8 sm:px-6 lg:px-8 dark:from-slate-950 dark:to-slate-900';

  if (loading) {
    return (
      <div className={pageClass}>
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-green-600 dark:border-green-400" />
            <p className="text-lg text-gray-600 dark:text-slate-300">{t('payment_success.loading_details')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={pageClass}>
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="mx-auto mb-4 w-fit rounded-full bg-red-100 p-3 dark:bg-red-950/50">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-600 dark:text-red-300" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t('payment_success.load_error_title')}</h1>
            <p className="mb-6 text-gray-600 dark:text-slate-300">{error}</p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                {t('payment_success.try_again')}
              </button>
              <button
                onClick={() => navigate('/buyer')}
                className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('payment_success.view_orders')}
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
    <div className={pageClass}>
      <GoogleCustomerReviewsOptIn order={orderDetails || order} />
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-950/50">
              <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-300" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            {t('payment_success.title')}
          </h1>
          <p className="text-base text-gray-600 sm:text-lg dark:text-slate-300">
            {t('payment_success.success_message')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-slate-800 dark:shadow-slate-950/30">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('payment_success.receipt_title')}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handlePrint}
                      className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <PrinterIcon className="mr-2 h-4 w-4" />
                      {t('payment_success.print')}
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      disabled={downloading}
                      className="flex items-center rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
                    >
                      <DocumentArrowDownIcon className="mr-2 h-4 w-4" />
                      {downloading ? t('payment_success.downloading') : t('payment_success.download_pdf')}
                    </button>
                    <button
                      onClick={handleShare}
                      aria-label={copied ? t('payment_success.link_copied') : t('payment_success.share_payment_slip')}
                      className={`flex items-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        copied
                          ? 'border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-950/40 dark:text-green-200'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {copied ? <CheckIcon className="mr-2 h-4 w-4" /> : <ShareIcon className="mr-2 h-4 w-4" />}
                      {copied ? t('payment_success.copied') : t('payment_success.share')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 sm:p-6">
                <div id="printable-content" className="print-content overflow-hidden rounded-xl border border-gray-200 bg-white text-[13px] leading-relaxed text-gray-900 sm:text-sm">
                  <div className="receipt-header flex flex-col gap-5 border-b-[3px] border-green-600 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-6">
                    <div className="receipt-brand flex items-start gap-3">
                      <img src={PAYMENT_SLIP_LOGO} alt="Pyonea" className="brand-logo h-11 w-11 flex-shrink-0 rounded-full object-contain" />
                      <div>
                        <p className="brand-name font-torus text-2xl font-semibold leading-none text-green-800">Pyonea</p>
                        <p className="brand-subtitle mt-1 text-sm font-semibold text-gray-700">{t('payment_success.platform_name')}</p>
                        <p className="brand-address mt-1 max-w-xl text-xs text-gray-500">{t('payment_success.platform_address')}</p>
                      </div>
                    </div>
                    <div className="receipt-title-box text-left sm:min-w-48 sm:text-right">
                      <h1 className="receipt-title text-lg font-extrabold uppercase tracking-wide text-gray-900">
                        {t('payment_success.receipt_heading')}
                      </h1>
                      <span className="paid-badge mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase text-green-700">
                        {t('payment_success.paid')}
                      </span>
                    </div>
                  </div>

                  <div className="receipt-body p-5 sm:p-7">
                    <div className="meta-grid mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <div className="meta-item border-b border-gray-200 pb-2">
                        <p className="meta-label mb-1 text-[10px] font-extrabold uppercase tracking-wide text-gray-500">{t('payment_success.order_number')}</p>
                        <p className="meta-value break-words text-xs font-bold text-gray-900">{orderNumber}</p>
                      </div>
                      <div className="meta-item border-b border-gray-200 pb-2">
                        <p className="meta-label mb-1 text-[10px] font-extrabold uppercase tracking-wide text-gray-500">{t('payment_success.order_date')}</p>
                        <p className="meta-value text-xs font-bold text-gray-900">{formatDate(orderDetails?.created_at || order?.created_at)}</p>
                      </div>
                      <div className="meta-item border-b border-gray-200 pb-2">
                        <p className="meta-label mb-1 text-[10px] font-extrabold uppercase tracking-wide text-gray-500">{t('payment_success.payment_method')}</p>
                        <p className="meta-value text-xs font-bold text-gray-900">{formatPaymentMethod(orderDetails?.payment_method || order?.payment_method)}</p>
                      </div>
                      <div className="meta-item border-b border-gray-200 pb-2">
                        <p className="meta-label mb-1 text-[10px] font-extrabold uppercase tracking-wide text-gray-500">{t('payment_success.reference_id')}</p>
                        <p className="meta-value break-words text-xs font-bold text-gray-900">{getReferenceId()}</p>
                      </div>
                    </div>

                    <div className="section-grid mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <section>
                        <h3 className="section-title mb-2 text-xs font-extrabold uppercase tracking-wide text-gray-900">
                          {t('payment_success.customer_information')}
                        </h3>
                        <div className="detail-list space-y-1 text-sm text-gray-700">
                          <p className="font-semibold text-gray-900">{shippingAddress.full_name || emptyValue}</p>
                          <p>{shippingAddress.phone || emptyValue}</p>
                          <p className="text-xs text-gray-500">{shippingAddress.email || emptyValue}</p>
                        </div>
                      </section>

                      <section>
                        <h3 className="section-title mb-2 text-xs font-extrabold uppercase tracking-wide text-gray-900">
                          {t('payment_success.shipping_address')}
                        </h3>
                        <div className="detail-list space-y-1 text-sm text-gray-700">
                          <p>{shippingAddress.address || emptyValue}</p>
                          <p>{[shippingAddress.township, shippingAddress.city, shippingAddress.state].filter(Boolean).join(', ') || emptyValue}</p>
                          <p>{[shippingAddress.postal_code, shippingAddress.country].filter(Boolean).join(', ') || emptyValue}</p>
                        </div>
                      </section>
                    </div>

                    <section>
                      <h3 className="section-title mb-3 text-xs font-extrabold uppercase tracking-wide text-gray-900">
                        {t('payment_success.order_items')}
                      </h3>
                      {orderItems.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="receipt-table w-full min-w-[560px] border-collapse text-xs sm:min-w-0 sm:text-[13px]">
                            <thead>
                              <tr className="border-b border-gray-300 bg-gray-100">
                                <th className="px-3 py-2 text-left font-bold uppercase text-gray-700">{t('payment_success.item')}</th>
                                <th className="px-3 py-2 text-center font-bold uppercase text-gray-700">{t('payment_success.qty')}</th>
                                <th className="px-3 py-2 text-right font-bold uppercase text-gray-700">{t('payment_success.price')}</th>
                                <th className="px-3 py-2 text-right font-bold uppercase text-gray-700">{t('payment_success.total')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderItems.map((item, index) => (
                                <tr key={index} className="border-b border-gray-100">
                                  <td className="px-3 py-3">
                                    <p className="item-name font-semibold text-gray-900">{item.product_name || t('payment_success.unknown_product')}</p>
                                    <p className="item-sku mt-1 text-[11px] text-gray-500">{t('payment_success.sku')}: {item.product_sku || emptyValue}</p>
                                  </td>
                                  <td className="px-3 py-3 text-center">{item.quantity || 0}</td>
                                  <td className="px-3 py-3 text-right">{formatMMK(item.price || 0)}</td>
                                  <td className="px-3 py-3 text-right font-semibold">{formatMMK(item.subtotal || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="py-4 text-center text-gray-500">{t('payment_success.no_items')}</p>
                      )}
                    </section>

                    <div className="summary-wrap mt-5 flex justify-end">
                      <div className="summary-box w-full border-t-2 border-gray-900 pt-2 sm:max-w-xs">
                        <div className="summary-row flex justify-between gap-4 py-1.5">
                          <span className="text-gray-600">{t('payment_success.subtotal')}:</span>
                          <span className="font-semibold">{formatMMK(totals.subtotal)}</span>
                        </div>
                        <div className="summary-row flex justify-between gap-4 py-1.5">
                          <span className="text-gray-600">{t('payment_success.shipping')}:</span>
                          <span className="font-semibold">{formatMMK(totals.shipping)}</span>
                        </div>
                        <div className="summary-row flex justify-between gap-4 py-1.5">
                          <span className="text-gray-600">{t('payment_success.tax_with_rate', { rate: Number(totals.taxRate) * 100 })}:</span>
                          <span className="font-semibold">{formatMMK(totals.tax)}</span>
                        </div>
                        <div className="summary-row summary-total mt-2 flex justify-between gap-4 border-t border-gray-300 pt-3 text-base font-extrabold sm:text-lg">
                          <span>{t('payment_success.total_paid')}:</span>
                          <span className="text-green-600">{formatMMK(totals.total)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="receipt-footer mt-6 border-t border-gray-200 pt-4 text-center text-[11px] text-gray-500">
                      <p className="mb-1 font-medium">{t('payment_success.footer_thanks')}</p>
                      <p className="text-gray-400">{t('payment_success.generated_receipt')}</p>
                      <p className="mt-1 text-gray-400">{t('payment_success.support_line')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800 dark:shadow-slate-950/30">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t('payment_success.whats_next')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mr-3 mt-1 rounded-full bg-blue-100 p-2 dark:bg-blue-950/60">
                    <ShoppingBagIcon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t('payment_success.order_processing')}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">{t('payment_success.order_processing_desc')}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 mt-1 rounded-full bg-green-100 p-2 dark:bg-green-950/60">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t('payment_success.shipping_updates')}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">{t('payment_success.shipping_updates_desc')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800 dark:shadow-slate-950/30">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t('payment_success.quick_actions')}
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/buyer')}
                  className="flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                >
                  <ShoppingBagIcon className="mr-2 h-5 w-5" />
                  {t('payment_success.view_all_orders')}
                </button>
                <button
                  onClick={() => navigate('/products')}
                  className="flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <HomeIcon className="mr-2 h-5 w-5" />
                  {t('payment_success.continue_shopping')}
                </button>
                <button
                  onClick={closeSuccessPage}
                  className="flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {t('payment_success.close')}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
              <h3 className="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
                {t('payment_success.need_help')}
              </h3>
              <p className="mb-4 text-sm text-blue-800 dark:text-blue-200">
                {t('payment_success.support_help')}
              </p>
              <div className="space-y-1 text-sm text-blue-700 dark:text-blue-200">
                <p>{t('payment_success.support_phone')}</p>
                <p>{t('payment_success.support_email')}</p>
                <p>{t('payment_success.support_hours')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
