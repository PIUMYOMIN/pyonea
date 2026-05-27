import React from 'react';
import { useTranslation } from 'react-i18next';
import useSEO from '../hooks/useSEO';

const PrivacyPolicy = () => {
  const { t } = useTranslation();
  const lastUpdated = new Date().toLocaleDateString('en-GB');

  const SeoComponent = useSEO({
    title: t('privacyPolicy.title'),
    description: t('privacyPolicy.seo.description'),
    url: '/privacy-policy',
  });

  return (
    <>
      {SeoComponent}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center dark:text-slate-100">{t('privacyPolicy.title')}</h1>
        <p className="text-center text-gray-600 dark:text-slate-400 mb-8">{t('privacyPolicy.subtitle')}</p>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-8 space-y-8">
          <p className="text-gray-700 dark:text-slate-300">{t('privacyPolicy.intro')}</p>

          {/* Data Collection */}
          <div>
            <h2 className="text-xl font-semibold mb-3 dark:text-slate-100">{t('privacyPolicy.dataCollection.title')}</h2>
            <p className="text-gray-700 dark:text-slate-300 mb-2">{t('privacyPolicy.dataCollection.text')}</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300">
              {Array.isArray(t('privacyPolicy.dataCollection.items', { returnObjects: true })) && t('privacyPolicy.dataCollection.items', { returnObjects: true }).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Data Usage */}
          <div>
            <h2 className="text-xl font-semibold mb-3 dark:text-slate-100">{t('privacyPolicy.dataUsage.title')}</h2>
            <p className="text-gray-700 dark:text-slate-300 mb-2">{t('privacyPolicy.dataUsage.text')}</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300">
              {Array.isArray(t('privacyPolicy.dataUsage.items', { returnObjects: true })) && t('privacyPolicy.dataUsage.items', { returnObjects: true }).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Data Sharing */}
          <div>
            <h2 className="text-xl font-semibold mb-3 dark:text-slate-100">{t('privacyPolicy.dataSharing.title')}</h2>
            <p className="text-gray-700 dark:text-slate-300 mb-2">{t('privacyPolicy.dataSharing.text')}</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300">
              {Array.isArray(t('privacyPolicy.dataSharing.items', { returnObjects: true })) && t('privacyPolicy.dataSharing.items', { returnObjects: true }).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Data Security */}
          <div>
            <h2 className="text-xl font-semibold mb-3 dark:text-slate-100">{t('privacyPolicy.dataSecurity.title')}</h2>
            <p className="text-gray-700 dark:text-slate-300">{t('privacyPolicy.dataSecurity.text')}</p>
          </div>

          {/* User Rights */}
          <div>
            <h2 className="text-xl font-semibold mb-3 dark:text-slate-100">{t('privacyPolicy.userRights.title')}</h2>
            <p className="text-gray-700 dark:text-slate-300 mb-2">{t('privacyPolicy.userRights.text')}</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300">
              {Array.isArray(t('privacyPolicy.userRights.items', { returnObjects: true })) && t('privacyPolicy.userRights.items', { returnObjects: true }).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Cookies */}
          <div>
            <h2 className="text-xl font-semibold mb-3 dark:text-slate-100">{t('privacyPolicy.cookies.title')}</h2>
            <p className="text-gray-700 dark:text-slate-300">{t('privacyPolicy.cookies.text')}</p>
          </div>

          {/* Changes to Policy */}
          <div>
            <h2 className="text-xl font-semibold mb-3 dark:text-slate-100">{t('privacyPolicy.changes.title')}</h2>
            <p className="text-gray-700 dark:text-slate-300">{t('privacyPolicy.changes.text')}</p>
          </div>

          {/* Contact */}
          <div>
            <h2 className="text-xl font-semibold mb-3 dark:text-slate-100">{t('privacyPolicy.contact.title')}</h2>
            <p className="text-gray-700 dark:text-slate-300 mb-2">{t('privacyPolicy.contact.text')}</p>
            <address className="not-italic text-gray-700 dark:text-slate-300">
              <p>
                <strong>Email:</strong>{' '}
                <a href="mailto:contact@pyonea.com" className="text-blue-600 hover:underline">
                  {t('privacyPolicy.contact.email')}
                </a>
              </p>
              <p>
                <strong>Phone:</strong> {t('privacyPolicy.contact.phone')}
              </p>
              <p>
                <strong>Address:</strong> {t('privacyPolicy.contact.address')}
              </p>
            </address>
          </div>
        </div>

        <div className="text-sm text-gray-500 dark:text-slate-400 text-center border-t dark:border-slate-700 pt-6">
          {t('privacyPolicy.lastUpdated', { date: lastUpdated })}
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
