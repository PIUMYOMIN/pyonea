import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from "react-i18next";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import useSEO from '../../hooks/useSEO';
import { useGoogleLogin } from "@react-oauth/google";
import api from "../../utils/api";

const Login = () => {
  const { t } = useTranslation();
  const { login, setSession } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { executeRecaptcha } = useGoogleReCaptcha();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const from = location.state?.from || '';
  const notice = location.state?.notice || null;
  const productId = location.state?.productId;
  const returnTo = location.state?.returnTo || '/products';

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

  const handleLoginSuccess = async (user) => {
    try {
      const from = location.state?.from;

      if (from === 'cart-add' && productId) {
        try {
          await addToCart({ id: productId, quantity: 1 });
          navigate(returnTo, {
            state: { message: t('login.cartAddSuccess'), messageType: 'success' },
            replace: true
          });
        } catch {
          navigate(returnTo, {
            state: { message: t('login.cartAddFailed'), messageType: 'error' },
            replace: true
          });
        }
        return;
      }

      if (from && from !== '/login') {
        navigate(from, { replace: true });
        return;
      }

      const userRoles = user.roles || [];
      const userRole = user.role || user.type;

      if (userRoles.includes('admin') || userRole === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (userRoles.includes('seller') || userRole === 'seller') {
        navigate('/seller/dashboard', { replace: true });
      } else if (userRoles.includes('buyer') || userRole === 'buyer') {
        navigate('/buyer/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch {
      navigate('/', { replace: true });
    }
  };

  const onSubmit = async (data) => {
    if (!executeRecaptcha) {
      setError(t('auth.recaptcha_not_ready'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = await executeRecaptcha('login');
      const normalizedPhone = normalizeMyanmarPhone(data.phone);

      const result = await login({
        phone: normalizedPhone,
        password: data.password,
        remember: data.remember,
        recaptcha_token: token,
      });

      if (result.success) {
        await handleLoginSuccess(result.user);
      } else {
        setError(result.message || t('login.invalidCredentials'));
      }
    } catch {
      setError(t('login.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAccessToken = async (accessToken) => {
    if (!accessToken) {
      setError(t('login.googleFailedTryAgain'));
      return;
    }

    setIsLoading(true);
    setError("");

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
        navigate("/verify-email", {
          replace: true,
          state: { returnTo: location.state?.from || "/" },
        });
        return;
      }

      await handleLoginSuccess(user);
    } catch (err) {
      setError(err.response?.data?.message || t('login.googleFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    scope: "email profile",
    onSuccess: (tokenResponse) => handleGoogleAccessToken(tokenResponse?.access_token),
    onError: () => setError(t('login.googleFailedTryAgain')),
  });

  const showRedirectMessage = from === 'cart-add' && productId;

  const SeoComponent = useSEO({
    title: t('login.title'),
    description: t('login.subtitle'),
    noindex: true,
  });

  return (
    <>
      {SeoComponent}
      {showRedirectMessage && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('login.redirectMessage')}
              </p>
            </div>
          </div>
        </div>
      )}
      <AuthLayout title={t('login.title')} subtitle={t('login.subtitle')}>
      {notice && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">{notice}</p>
            </div>
          </div>
        </div>
      )}
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

      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t('login.phone.label')}
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <div className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 text-sm">
                <span className="mr-2 text-base">🇲🇲</span>
                +95
              </div>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                className={`flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md border ${errors.phone ? 'border-red-300' : 'border-gray-300'} shadow-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                placeholder="912345678"
                {...register('phone', { required: t('validation.required'), validate: validateMyanmarPhone })}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
              {t('register.phone.examples') || 'Examples: 912345678, 0912345678, +95912345678'}
            </p>
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t('login.password.label')}
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className={`appearance-none block w-full px-3 py-3 pr-10 border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                placeholder={t('login.password.placeholder')}
                {...register('password', {
                  required: t('validation.required'),
                  minLength: { value: 6, message: t('validation.minLength', { count: 6 }) }
                })}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              {...register('remember')}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-slate-300">
              {t('login.remember')}
            </label>
          </div>
          <div className="text-sm">
            <Link to="/forgot-password" className="font-medium text-green-600 hover:text-green-500">
              {t('login.forgotPassword')}
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${
              isLoading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {showRedirectMessage ? t('login.signingInAndAdding') : t('login.signingIn')}
              </>
            ) : (
              showRedirectMessage ? t('login.signInAndAdd') : t('login.signIn')
            )}
          </button>
        </div>

        <div className="mt-4 text-center text-sm">
          <span className="text-gray-600 dark:text-slate-400">{t('login.noAccount')} </span>
          <Link to="/register" state={location.state} className="font-medium text-green-600 hover:text-green-500">
            {t('login.register')}
          </Link>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-slate-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400">{t('login.orContinue')}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="w-full inline-flex justify-center">
              {/* <FacebookLogin
              appId={import.meta.env.VITE_FACEBOOK_APP_ID || ""}
              onSuccess={handleFacebookSuccess}
              onFail={() => setError("Facebook sign-in failed. Please try again.")}
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
          </div>
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
    </AuthLayout>
    </>
  );
};

export default Login;
