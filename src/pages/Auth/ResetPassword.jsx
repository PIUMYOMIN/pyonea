import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import useSEO from '../../hooks/useSEO';

const MotionDiv = motion.div;

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password', '');

  // Get token and email from URL query params
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');
  const email = queryParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setError(t('reset_password.invalid_link_title'));
    }
  }, [token, email, t]);

  const onSubmit = async (data) => {
    if (!executeRecaptcha) {
      setError(t('auth.recaptcha_not_ready'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const recaptchaToken = await executeRecaptcha('reset_password');
      await api.post('/reset-password', {
        token,
        email,
        password: data.password,
        password_confirmation: data.password_confirmation,
        recaptcha_token: recaptchaToken,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('reset_password.error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Determine title based on link validity
  const pageTitle = (!token || !email) ? t('reset_password.invalid_link_title') : t('reset_password.title');

  const SeoComponent = useSEO({
    title: pageTitle,
    description: t('reset_password.seo_description'),
    noindex: true,
  });

  return (
    <>
      {SeoComponent}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8 theme-transition">
        <MotionDiv
          className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-xl dark:shadow-slate-900/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-slate-100">
              {pageTitle}
            </h2>
            {(!token || !email) ? (
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-slate-400">
                {t('reset_password.invalid_link_message')}
              </p>
            ) : (
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-slate-400">
                {t('reset_password.subtitle')}
              </p>
            )}
          </div>

          {(!token || !email) && (
            <div className="text-center">
              <Link to="/forgot-password" className="text-green-600 hover:text-green-700 font-medium">
                {t('reset_password.request_new_link')}
              </Link>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {t('reset_password.success_message')}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {t('reset_password.redirecting')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {!success && token && email && (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    {t('reset_password.new_password_label')}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className={`appearance-none block w-full px-3 py-3 pr-10 border ${errors.password ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-md shadow-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                      placeholder={t('reset_password.new_password_placeholder')}
                      {...register('password', {
                        required: t('validation.required'),
                        minLength: { value: 6, message: t('validation.minLength', { count: 6 }) }
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                </div>

                <div>
                  <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    {t('reset_password.confirm_password_label')}
                  </label>
                  <div className="relative">
                    <input
                      id="password_confirmation"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`appearance-none block w-full px-3 py-3 pr-10 border ${errors.password_confirmation ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-md shadow-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                      placeholder={t('reset_password.confirm_password_placeholder')}
                      {...register('password_confirmation', {
                        required: t('validation.required'),
                        validate: value => value === password || t('validation.passwordMismatch')
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password_confirmation && (
                    <p className="mt-1 text-sm text-red-600">{errors.password_confirmation.message}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? t('reset_password.resetting') : t('reset_password.reset_button')}
                </button>
              </div>
            </form>
          )}
        </MotionDiv>
      </div>
    </>
  );
};

export default ResetPassword;
