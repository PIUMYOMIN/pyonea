import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from "react-i18next";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import AuthLayout from './AuthLayout';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import useSEO from '../../hooks/useSEO';
import { useGoogleLogin } from "@react-oauth/google";

const Register = () => {
  const { t } = useTranslation();
  const { register: registerUser, setSession } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const refCode = searchParams.get('ref') || '';
  const [referrerName, setReferrerName] = React.useState('');
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState(() => (
    location.pathname === '/register-seller' || searchParams.get('type') === 'seller'
      ? 'seller'
      : 'buyer'
  ));
  const [agreed, setAgreed] = useState(false);
  const [agreedError, setAgreedError] = useState('');
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [socialError, setSocialError] = useState("");

  React.useEffect(() => {
    if (location.pathname === '/register-seller' || searchParams.get('type') === 'seller') {
      setUserType('seller');
    }
  }, [location.pathname, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  const normalizeMyanmarPhone = (phone) => {
    let cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.startsWith('09')) {
      return '+95' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('9') && !cleanPhone.startsWith('95')) {
      return '+95' + cleanPhone;
    } else if (cleanPhone.startsWith('959')) {
      return '+' + cleanPhone;
    } else if (cleanPhone.startsWith('95') && !cleanPhone.startsWith('959')) {
      return '+9' + cleanPhone;
    } else if (phone.startsWith('+959')) {
      return phone;
    } else if (phone.startsWith('+95')) {
      return '+9' + phone.substring(1);
    } else {
      return phone.startsWith('+') ? phone : '+' + phone;
    }
  };

  const validateMyanmarPhone = (phone) => {
    if (!phone) return t('validation.required');

    const cleanPhone = phone.replace(/\D/g, '');

    // Check length: 7-9 digits after prefix
    const digitsOnly = cleanPhone.replace(/^(\+?959|09|9)/, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 9) {
      return t('validation.invalidPhone');
    }

    const validPrefixes = ['09', '9', '959', '+959', '+95'];
    const hasValidPrefix = validPrefixes.some(prefix =>
      phone.startsWith(prefix)
    );

    if (!hasValidPrefix) {
      return t('validation.invalidPhone');
    }

    return true;
  };

  // Validate ref code from URL on mount
  React.useEffect(() => {
    if (!refCode) return;
    api.post('/referral/validate', { ref_code: refCode })
      .then(r => { if (r.data.success) setReferrerName(r.data.data.referrer_name); })
      .catch(() => {});
  }, [refCode]);

  const handleGoogleAccessToken = async (accessToken) => {
    if (!accessToken) {
      setSocialError(t('login.googleFailedTryAgain'));
      return;
    }

    setIsLoading(true);
    setSocialError("");

    try {
      const r = await api.post("/auth/google", {
        credential: accessToken,
        token_type: "access_token",
      });

      if (r.data?.status === "needs_role") {
        const pending = { ...r.data.data, provider: "google" };
        sessionStorage.setItem("social_pending", JSON.stringify(pending));
        navigate("/social/role", { replace: true, state: { socialPending: pending } });
        return;
      }

      const token = r.data?.data?.token;
      const user = r.data?.data?.user;
      setSession({ token, user });

      const roles = Array.isArray(user?.roles) ? user.roles : [];
      const isSellerOrAdmin =
        roles.includes("seller") ||
        roles.includes("admin") ||
        user?.type === "seller" ||
        user?.role === "seller" ||
        user?.type === "admin" ||
        user?.role === "admin";

      if (user?.email && !user?.email_verified_at && isSellerOrAdmin) {
        navigate("/verify-email", { replace: true });
        return;
      }

      if (user?.roles?.includes("seller") || user?.type === "seller") navigate("/seller", { replace: true });
      else navigate("/", { replace: true });
    } catch (err) {
      setSocialError(err.response?.data?.message || t('login.googleFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    scope: "email profile",
    onSuccess: (tokenResponse) => handleGoogleAccessToken(tokenResponse?.access_token),
    onError: () => setSocialError(t('login.googleFailedTryAgain')),
  });

    const onSubmit = async (data) => {
    if (!agreed) {
      setAgreedError(t('register.terms_required'));
      return;
    }
    setAgreedError('');
    if (!executeRecaptcha) {
      setError(t('auth.recaptcha_not_ready'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = await executeRecaptcha('register');
      const normalizedPhone = normalizeMyanmarPhone(data.phone);

      const result = await registerUser({
        name: data.name,
        phone: normalizedPhone,
        email: data.email,
        password: data.password,
        password_confirmation: data.confirmPassword,
        type: userType,
        address: data.address,
        city: data.city,
        state: data.state,
        recaptcha_token: token,
        ...(refCode && { ref_code: refCode }),
      });

      if (result.success) {
        // Buyers can shop immediately. Sellers still verify before onboarding.
        if (result.user?.email && result.user?.type === 'seller') {
          navigate('/verify-email');
        } else if (result.user?.type === 'seller') {
          navigate('/seller');
        } else {
          navigate('/products');
        }
      } else {
        setError(result.message || t('register.error'));
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(t('register.error'));
    } finally {
      setIsLoading(false);
    }
  };


  const SeoComponent = useSEO({
    title:
      refCode && referrerName
        ? t('register.referral_og_title', { name: referrerName })
        : refCode
          ? t('register.referral_og_title_generic')
          : t('register.title'),
    description:
      refCode && referrerName
        ? t('register.referral_og_description')
        : refCode
          ? t('register.referral_og_description_generic')
          : t('register.subtitle'),
    noindex: true,
    url: `/register${refCode ? `?ref=${encodeURIComponent(refCode)}` : ''}`,
    type: 'website',
  });

  return (
    <>
      {SeoComponent}
              <AuthLayout
          title={t('register.title')}
          subtitle={t('register.subtitle')}
        >
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Referral banner */}
          {referrerName && (
            <div className="mt-4 flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3 text-sm">
              <span className="text-green-600">🎁</span>
              <span className="text-green-800 dark:text-green-200">
                {t('register.referred_by_prefix')} <strong>{referrerName}</strong>. {t('register.referred_by_suffix')}
              </span>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t('register.name.label')}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className={`appearance-none block w-full px-3 py-3 border ${errors.name ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-md shadow-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                  placeholder={t('register.name.placeholder')}
                  {...register('name', {
                    required: t('validation.required'),
                    minLength: {
                      value: 2,
                      message: t('validation.minLength', { count: 2 })
                    }
                  })}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t('register.phone.label')}
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <div className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 text-sm">
                    <span className="mr-2 text-base">🇲🇲</span>
                    +95
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className={`flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md border ${errors.phone ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'} shadow-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                    placeholder="912345678"
                    {...register('phone', {
                      required: t('validation.required'),
                      validate: validateMyanmarPhone
                    })}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                  {t('register.phone.examples') || 'Examples: 912345678, 0912345678, +95912345678'}
                </p>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t('register.email.label')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`appearance-none block w-full px-3 py-3 border ${errors.email ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-md shadow-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                  placeholder={t('register.email.placeholder')}
                  {...register('email', {
                    required: t('validation.required'),
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: t('validation.invalidEmail')
                    }
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('register.accountType.label')}
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setUserType('buyer')}
                    className={`flex-1 py-3 px-4 border rounded-md text-sm font-medium transition-colors ${userType === 'buyer'
                        ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                        : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-gray-400 dark:hover:border-slate-400'
                      }`}
                  >
                    {t('register.accountType.buyer')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('seller')}
                    className={`flex-1 py-3 px-4 border rounded-md text-sm font-medium transition-colors ${userType === 'seller'
                        ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                        : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-gray-400 dark:hover:border-slate-400'
                      }`}
                  >
                    {t('register.accountType.seller')}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                  {userType === 'buyer'
                    ? t('register.accountType.buyerDescription')
                    : t('register.accountType.sellerDescription')
                  }
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t('register.password.label')}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className={`appearance-none block w-full px-3 py-3 pr-10 border ${errors.password ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-md shadow-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                    placeholder={t('register.password.placeholder')}
                    {...register('password', {
                      required: t('validation.required'),
                      minLength: {
                        value: 6,
                        message: t('validation.minLength', { count: 6 })
                      }
                    })}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <EyeIcon className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t('register.confirmPassword.label')}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className={`appearance-none block w-full px-3 py-3 border ${errors.confirmPassword ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-md shadow-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                  placeholder={t('register.confirmPassword.placeholder')}
                  {...register('confirmPassword', {
                    required: t('validation.required'),
                    validate: value =>
                      value === watch('password') || t('validation.passwordMismatch')
                  })}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* ── Terms & Conditions ── */}
            <div className="space-y-1.5">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => { setAgreed(e.target.checked); if (e.target.checked) setAgreedError(''); }}
                    className="sr-only"
                  />
                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                    agreed ? 'bg-green-600 border-green-600' : agreedError ? 'border-red-400' : 'border-gray-300 group-hover:border-green-400'
                  }`}>
                    {agreed && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-600 dark:text-slate-400 leading-snug">
                  {t('register.terms_agree_prefix')}{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="font-medium text-green-600 hover:underline">{t('register.terms')}</a>
                  {' '}{t('register.and')}{' '}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="font-medium text-green-600 hover:underline">{t('register.privacy_policy')}</a>
                  {userType === 'seller' && (<>{' '}{t('register.and_the')}{' '}
                    <a href="/seller-guidelines" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="font-medium text-green-600 hover:underline">{t('register.seller_guidelines')}</a>
                  </>)}
                </span>
              </label>
              {agreedError && <p className="text-sm text-red-600 pl-8">{agreedError}</p>}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${isLoading
                    ? 'bg-green-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                  }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('register.creatingAccount')}
                  </>
                ) : (
                  t('register.createAccount')
                )}
              </button>
            </div>

            <div className="mt-4 text-center text-sm">
              <span className="text-gray-600 dark:text-slate-400">{t('register.hasAccount')} </span>
              <Link to="/login" className="font-medium text-green-600 hover:text-green-500 transition-colors">
                {t('register.signIn')}
              </Link>
            </div>
          </form>

          {/* Social signup (moved under the form) */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                  {t("login.orContinue")}
                </span>
              </div>
            </div>

            {socialError && (
              <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3">
                <p className="text-sm text-red-700 dark:text-red-300">{socialError}</p>
              </div>
            )}

            <div className="flex justify-center">
              <div className="w-full max-w-sm space-y-3">
              {/* <FacebookLogin
                  appId={import.meta.env.VITE_FACEBOOK_APP_ID || ""}
                  onSuccess={handleFacebookSuccess}
                  onFail={() => setSocialError("Facebook sign-in failed. Please try again.")}
                  scope="public_profile,email"
                  style={{
                    backgroundColor: "#1877F2",
                    color: "#fff",
                    fontSize: "14px",
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "6px",
                    width: "100%",
                    cursor: "pointer",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="currentColor">
                    <path d="M22 12.06C22 6.504 17.523 2 12 2S2 6.504 2 12.06C2 17.083 5.657 21.245 10.438 22v-7.03H7.898v-2.91h2.54V9.845c0-2.522 1.492-3.915 3.777-3.915 1.094 0 2.238.197 2.238.197v2.476h-1.26c-1.243 0-1.63.777-1.63 1.574v1.889h2.773l-.443 2.91h-2.33V22C18.343 21.245 22 17.083 22 12.06Z" />
                  </svg>
                  <span>Facebook</span>
                </FacebookLogin> */}

                <button
                  type="button"
                  onClick={() => googleLogin()}
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-60"
                >
                  <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.606 32.656 29.303 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.962 3.038l5.657-5.657C34.252 6.053 29.401 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.962 3.038l5.657-5.657C34.252 6.053 29.401 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                    <path fill="#4CAF50" d="M24 44c5.297 0 10.044-2.01 13.649-5.277l-6.3-5.333C29.31 34.862 26.747 36 24 36c-5.281 0-9.577-3.319-11.293-7.946l-6.522 5.025C9.504 39.556 16.227 44 24 44z"/>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.824 2.31-2.405 4.258-4.554 5.39l.003-.002 6.3 5.333C36.604 39.131 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"/>
                  </svg>
                  <span>Google</span>
                </button>
              </div>
            </div>
          </div>
        </AuthLayout>
    </>
  );
};

export default Register;
