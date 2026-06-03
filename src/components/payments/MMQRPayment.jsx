import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const MMQR_LOGO_SRC = "/MMQR_Logo.png";

const MMQRPayment = () => {
  const { t } = useTranslation();
  const [qrCode, setQrCode] = useState(null);
  const [countdown, setCountdown] = useState(900); // 15 minutes in seconds

  useEffect(() => {
    // In a real app, this would fetch from your backend
    setTimeout(() => {
      setQrCode(
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MMQR-PAYMENT-123456"
      );
    }, 1000);

    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
        {t("payment.mmqr_instructions")}
      </h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
        {t("payment.mmqr_instructions_desc")}
      </p>

      <div className="mt-6 flex flex-col items-center">
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2">
          <img
            src={MMQR_LOGO_SRC}
            alt="MMQR"
            className="h-8 w-auto object-contain"
            loading="eager"
            decoding="async"
          />
          <span className="text-xs font-semibold tracking-wide text-gray-600 dark:text-slate-300">
            Official MMQR payment
          </span>
        </div>

        {qrCode
          ? <div className="animate-fadeIn rounded-xl border-4 border-green-500 bg-white p-2 shadow-lg">
              <img
                src={qrCode}
                alt="MMQR Payment Code"
                className="w-48 h-48 object-contain"
              />
            </div>
          : <div className="bg-gray-200 dark:bg-slate-700 border-2 border-dashed rounded-xl w-48 h-48 animate-pulse" />}

        <p className="mt-3 text-center text-[11px] font-extrabold tracking-[0.16em] text-gray-700 dark:text-slate-200">
          PAYMENT POWERED BY MYANMYANPAY
        </p>

        <div className="mt-4 flex items-center">
          <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <svg
              className="h-4 w-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
          </div>
          <span className="ml-2 text-sm text-gray-500 dark:text-slate-400">
            {t("payment.expires_in")}
          </span>
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {t("payment.mmqr_note")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MMQRPayment;
