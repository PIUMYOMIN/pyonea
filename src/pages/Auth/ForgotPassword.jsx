import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import useSEO from '../../hooks/useSEO';

const MotionDiv = motion.div;

const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { executeRecaptcha } = useGoogleReCaptcha();

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    if (!executeRecaptcha) {
      setError(t('auth.recaptcha_not_ready'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = await executeRecaptcha('forgot_password');
      await api.post('/forgot-password', {
        email: data.email,
        recaptcha_token: token,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || t('forgot_password.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const SeoComponent = useSEO({
    title: t('forgot_password.title'),
    description: t('forgot_password.subtitle'),
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-slate-100">
              {t('forgot_password.title')}
            </h3>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-slate-400">
              {t('forgot_password.subtitle')}
            </p>
          </div>
          
          {success ? (
            <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {t('forgot_password.success_message')}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  {t('forgot_password.back_to_login')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
              <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    {t('forgot_password.email_or_phone_label')}
                  </label>
                  <input
                    id="email"
                    type="text"
                    className={`appearance-none block w-full px-3 py-3 border ${errors.email ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-md shadow-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                    placeholder={t('forgot_password.email_or_phone_placeholder')}
                    {...register('email', { 
                      required: t('forgot_password.required_field')
                    })}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? t('forgot_password.sending') : t('forgot_password.send_reset')}
                  </button>
                </div>
                
                <div className="text-center">
                  <Link to="/login" className="text-sm font-medium text-green-600 hover:text-green-500">
                    {t('forgot_password.back_to_login')}
                  </Link>
                </div>
              </form>
            </>
          )}
        </MotionDiv>
      </div>
    </>
  );
};

export default ForgotPassword;
