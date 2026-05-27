import React from 'react';
import { useTranslation } from 'react-i18next';
import useSEO from '../hooks/useSEO';

const ReturnPolicy = () => {
  const { t } = useTranslation();
  const lastUpdated = new Date().toLocaleDateString('en-GB');

  const SeoComponent = useSEO({
    title: t('returnPolicy.title'),
    description: t('returnPolicy.seo.description'),
    url: '/return-policy',
  });

  return (
    <>
      {SeoComponent}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center dark:text-slate-100">{t('returnPolicy.title')}</h1>
      <p className="text-center text-gray-600 dark:text-slate-400 mb-8">{t('returnPolicy.subtitle')}</p>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 dark:text-slate-100">{t('returnPolicy.platformPolicy.title')}</h2>
        <p className="text-gray-700 dark:text-slate-300 mb-6">{t('returnPolicy.platformPolicy.description')}</p>

        {/* Buyer Responsibility */}
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2 dark:text-slate-200">{t('returnPolicy.platformPolicy.buyerResponsibility.title')}</h3>
          <p className="text-gray-700 dark:text-slate-300">{t('returnPolicy.platformPolicy.buyerResponsibility.text')}</p>
        </div>

        {/* Platform’s Role */}
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2 dark:text-slate-200">{t('returnPolicy.platformPolicy.platformRole.title')}</h3>
          <p className="text-gray-700 dark:text-slate-300">{t('returnPolicy.platformPolicy.platformRole.text')}</p>
        </div>

        {/* Minimum Requirements */}
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2 dark:text-slate-200">{t('returnPolicy.platformPolicy.minimumRequirements.title')}</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300">
            {t('returnPolicy.platformPolicy.minimumRequirements.items', { returnObjects: true }).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Consumer Rights */}
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2 dark:text-slate-200">{t('returnPolicy.platformPolicy.consumerRights.title')}</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300">
            {t('returnPolicy.platformPolicy.consumerRights.items', { returnObjects: true }).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Dispute Resolution */}
        <div>
          <h3 className="text-xl font-medium mb-2 dark:text-slate-200">{t('returnPolicy.platformPolicy.disputeResolution.title')}</h3>
          <p className="text-gray-700 dark:text-slate-300">{t('returnPolicy.platformPolicy.disputeResolution.text')}</p>
        </div>
      </div>

      {/* Seller‑specific policies */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 dark:text-slate-100">{t('returnPolicy.sellerPolicy.title')}</h2>
        <p className="text-gray-700 dark:text-slate-300">{t('returnPolicy.sellerPolicy.description')}</p>
      </div>

      {/* Last updated */}
      <div className="text-sm text-gray-500 dark:text-slate-400 text-center border-t dark:border-slate-700 pt-6">
        {t('returnPolicy.lastUpdated', { date: lastUpdated })}
      </div>
    </div>
    </>
  );
};

export default ReturnPolicy;
