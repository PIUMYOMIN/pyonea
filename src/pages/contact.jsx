import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import useSEO from "../hooks/useSEO";
import { useTheme } from '../context/ThemeContext';

const Contact = () => {
  const { t } = useTranslation();
  useTheme(); // Ensure theme context is loaded for dark mode support
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { executeRecaptcha } = useGoogleReCaptcha();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  const onSubmit = async (data) => {
    if (!executeRecaptcha) {
      setSubmitError('reCAPTCHA not ready');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const token = await executeRecaptcha('contact');
      await api.post('/contact', {
        ...data,
        recaptcha_token: token,
      });
      setSubmitSuccess(true);
      reset();
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      setSubmitError(error.response?.data?.message || t('contact.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const SeoComponent = useSEO({
      title: t("contact.title"),
      description: t("contact.subtitle"),
      url: "/contact",
    });

  return (
    <>
      {SeoComponent}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center text-gray-900 dark:text-white">{t('contact.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8">{t('contact.subtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('contact.info.title')}</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t('contact.info.phone')}</p>
                    <p className="text-gray-600 dark:text-gray-400">+95 9 792 115 547</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t('contact.info.email')}</p>
                    <p className="text-gray-600 dark:text-gray-400">contact@pyonea.com</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t('contact.info.address')}</p>
                    <p className="text-gray-600 dark:text-gray-400">Bet 59-60, 19 Street, Aungmyaetharsan Township, Mandalay, Myanmar</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="font-medium mb-2 text-gray-900 dark:text-white">{t('contact.info.hours')}</h3>
                <p className="text-gray-600 dark:text-gray-400">{t('contact.info.mon_fri')}</p>
                <p className="text-gray-600 dark:text-gray-400">{t('contact.info.sat')}</p>
                <p className="text-gray-600 dark:text-gray-400">{t('contact.info.sun')}</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('contact.form.title')}</h2>

              {submitSuccess && (
                <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-4 mb-4">
                  <p className="text-sm text-green-700 dark:text-green-300">{t('contact.form.success')}</p>
                </div>
              )}

              {submitError && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-4">
                  <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('contact.form.name')} *
                  </label>
                  <input
                    type="text"
                    className={`w-full border rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    {...register('name', { required: t('contact.validation.name_required') })}
                  />
                  {errors.name && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('contact.form.email')} *
                  </label>
                  <input
                    type="email"
                    className={`w-full border rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    {...register('email', {
                      required: t('contact.validation.email_required'),
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: t('contact.validation.email_invalid')
                      }
                    })}
                  />
                  {errors.email && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('contact.form.phone')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">+95</span>
                    <input
                      type="tel"
                      className={`w-full pl-12 border rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      {...register('phone', {
                        pattern: {
                          value: /^[0-9]{7,10}$/,
                          message: t('contact.validation.phone_invalid')
                        }
                      })}
                    />
                  </div>
                  {errors.phone && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('contact.form.subject')} *
                  </label>
                  <input
                    type="text"
                    className={`w-full border rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.subject ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    {...register('subject', { required: t('contact.validation.subject_required') })}
                  />
                  {errors.subject && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.subject.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('contact.form.message')} *
                  </label>
                  <textarea
                    rows="4"
                    className={`w-full border rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.message ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    {...register('message', { required: t('contact.validation.message_required') })}
                  ></textarea>
                  {errors.message && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.message.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-600 dark:bg-green-700 text-white py-2 rounded hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('contact.form.submitting')}
                    </>
                  ) : (
                    t('contact.form.submit')
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Map placeholder */}
          {/* <div className="mt-8 bg-gray-200 h-64 rounded-lg flex items-center justify-center">
            <p className="text-gray-600">{t('contact.map_placeholder')}</p>
          </div> */}
        </div>
      </div>
    </>
  );
};

export default Contact;
