import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

/**
 * Social role completion (buyer/seller)
 * Flow:
 * - Login/Register with Google → backend may return status="needs_role" and temp_token
 * - We store {temp_token, provider, social_user} in sessionStorage and redirect here
 * - User picks buyer/seller → POST /auth/{provider}/complete with Bearer temp_token
 */
const SocialRoleSelect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();

  const [role, setRole] = useState("buyer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  const payload = useMemo(() => {
    try {
      const fromState = location.state?.socialPending;
      if (fromState) return fromState;
      const raw = sessionStorage.getItem("social_pending");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [location.state]);

  const name = payload?.social_user?.name || "New user";
  const email = payload?.social_user?.email || "";
  const provider = payload?.provider || "google";
  const tempToken = payload?.temp_token;
  const missingFields = payload?.missing_fields || [];
  const needsEmail = missingFields.includes("email");

  const normalizeMyanmarPhone = (phone) => {
    const cleanPhone = (phone || "").replace(/[^0-9+]/g, "");

    if (cleanPhone.startsWith("09")) return `+95${cleanPhone.slice(1)}`;
    if (cleanPhone.startsWith("9") && !cleanPhone.startsWith("95")) return `+95${cleanPhone}`;
    if (cleanPhone.startsWith("959")) return `+${cleanPhone}`;
    if (cleanPhone.startsWith("95")) return `+95${cleanPhone.slice(2)}`;
    if (cleanPhone.startsWith("+959")) return cleanPhone;
    if (cleanPhone.startsWith("+95")) return `+95${cleanPhone.slice(3)}`;
    return cleanPhone;
  };

  const isValidMyanmarPhone = (phone) => /^\+959\d{7,9}$/.test(phone);

  const handleComplete = async () => {
    if (!tempToken) {
      navigate("/login", { replace: true });
      return;
    }

    const trimmedEmail = emailInput.trim();
    const normalizedPhone = normalizeMyanmarPhone(phoneInput);

    if (needsEmail && !trimmedEmail) {
      setError("Email is required to continue.");
      return;
    }

    if (!phoneInput.trim()) {
      setError("Phone number is required to continue.");
      return;
    }

    if (!isValidMyanmarPhone(normalizedPhone)) {
      setError("Please enter a valid Myanmar phone number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const r = await api.post(
        `/auth/${provider}/complete`,
        {
          role,
          phone: normalizedPhone,
          ...(needsEmail ? { email: trimmedEmail } : {}),
        },
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );

      const token = r.data?.data?.token;
      const user = r.data?.data?.user;

      setSession({ token, user });
      sessionStorage.removeItem("social_pending");

      if (user?.email && !user?.email_verified_at && role === "seller") {
        navigate("/verify-email", { replace: true });
        return;
      }

      if (role === "seller") navigate("/seller", { replace: true });
      else navigate("/products", { replace: true });
    } catch (e) {
      setError(e.response?.data?.message || "Failed to complete registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Choose account type"
      subtitle="Select how you want to use Pyonea. You can’t change this later without support."
    >
      {!payload ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Your sign-in session expired. Please sign in again.
          </p>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="w-full py-3 px-4 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium"
          >
            Back to login
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30 p-4">
            <p className="text-sm text-gray-700 dark:text-slate-200 font-medium">{name}</p>
            {email && <p className="text-xs text-gray-500 dark:text-slate-400">{email}</p>}
          </div>

          <div className="space-y-3">
            {needsEmail && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Phone number
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="09xxxxxxxxx or +959xxxxxxxxx"
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Account type</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-colors ${
                  role === "buyer"
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200"
                }`}
              >
                Buyer
              </button>
              <button
                type="button"
                onClick={() => setRole("seller")}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-colors ${
                  role === "seller"
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200"
                }`}
              >
                Seller
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {role === "seller"
                ? "Sellers will be guided through onboarding after verification."
                : "Buyers can browse, wishlist, and checkout."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${
              loading ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Finishing…" : "Continue"}
          </button>
        </div>
      )}
    </AuthLayout>
  );
};

export default SocialRoleSelect;

