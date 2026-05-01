import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  ShieldCheckIcon,
  CreditCardIcon,
  QrCodeIcon,
  TruckIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import ChangePasswordForm from "../Shared/ChangePasswordForm";
import api from "../../utils/api";

// ── Static metadata for each payment method ────────────────────────────────
const METHOD_META = {
  cash_on_delivery: {
    label: "Cash on Delivery",
    desc: "Pay when the order arrives — always available as platform default.",
    Icon: TruckIcon,
    color: "text-orange-500",
    alwaysOn: true,
  },
  mmqr: {
    label: "MMQR Payment",
    desc: "Scan QR code with any Myanmar mobile banking app (KBZPay, WavePay, AYA Pay, CB Pay).",
    Icon: QrCodeIcon,
    color: "text-blue-500",
  },
  kbz_pay: {
    label: "KBZ Pay",
    desc: "Deep-link payment via the KBZ Pay mobile wallet.",
    Icon: DevicePhoneMobileIcon,
    color: "text-purple-500",
  },
  wave_pay: {
    label: "Wave Pay",
    desc: "Deep-link payment via the Wave Money mobile wallet.",
    Icon: DevicePhoneMobileIcon,
    color: "text-teal-500",
  },
  cb_pay: {
    label: "CB Pay",
    desc: "Payment via the CB Bank mobile wallet.",
    Icon: DevicePhoneMobileIcon,
    color: "text-red-500",
  },
  aya_pay: {
    label: "AYA Pay",
    desc: "Payment via the AYA Bank mobile wallet.",
    Icon: DevicePhoneMobileIcon,
    color: "text-green-600",
  },
};

// ── Toggle switch ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent",
        "transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        checked ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0",
          "transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

// ── Payment Settings Panel ─────────────────────────────────────────────────
function PaymentMethodsPanel() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/payment-settings");
      if (res.data.success) {
        setMethods(res.data.data);
      }
    } catch {
      showToast("error", "Failed to load payment settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggle = async (method, newValue) => {
    setMethods((prev) =>
      prev.map((m) => (m.method === method ? { ...m, enabled: newValue } : m))
    );
    setSaving(method);
    try {
      const res = await api.patch(`/admin/payment-settings/${method}`, {
        enabled: newValue,
      });
      if (!res.data.success) {
        setMethods((prev) =>
          prev.map((m) =>
            m.method === method ? { ...m, enabled: !newValue } : m
          )
        );
        showToast("error", res.data.message || "Failed to update.");
      } else {
        showToast(
          "success",
          `${res.data.data.label} has been ${newValue ? "enabled" : "disabled"}.`
        );
      }
    } catch (err) {
      setMethods((prev) =>
        prev.map((m) =>
          m.method === method ? { ...m, enabled: !newValue } : m
        )
      );
      showToast("error", err.response?.data?.message || "Failed to update.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-1">
        <CreditCardIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          Payment Methods
        </h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
        Enable or disable which payment options buyers see at checkout. Cash on
        Delivery is always available as the platform default and cannot be turned off.
      </p>

      {toast && (
        <div
          className={[
            "mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm",
            toast.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700"
              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700",
          ].join(" ")}
        >
          {toast.type === "success" ? (
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
          ) : (
            <XCircleIcon className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-gray-100 dark:bg-slate-700 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {methods.map((m) => {
            const meta = METHOD_META[m.method] || {
              label: m.label,
              desc: "",
              Icon: CreditCardIcon,
              color: "text-gray-500",
            };
            const isAlwaysOn = !!meta.alwaysOn;
            const isSaving = saving === m.method;

            return (
              <div
                key={m.method}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-700">
                  <meta.Icon className={`h-5 w-5 ${meta.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {meta.label}
                    </p>
                    {isAlwaysOn && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                        Default
                      </span>
                    )}
                    {isSaving && (
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {meta.desc}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <Toggle
                    checked={m.enabled}
                    onChange={(val) => handleToggle(m.method, val)}
                    disabled={isAlwaysOn || isSaving}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Settings component ────────────────────────────────────────────────
const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Account info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Account</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
          <div className="flex justify-between">
            <span className="font-medium text-gray-700 dark:text-slate-300">Name</span>
            <span className="text-gray-900 dark:text-slate-100">{user?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-700 dark:text-slate-300">Email</span>
            <span className="text-gray-900 dark:text-slate-100">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-700 dark:text-slate-300">Role</span>
            <span className="capitalize text-gray-900 dark:text-slate-100">{user?.type}</span>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <PaymentMethodsPanel />

      {/* Change Password */}
      <ChangePasswordForm />

    </div>
  );
};

export default Settings;