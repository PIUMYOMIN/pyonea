import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

/**
 * Format price in MMK with translated currency symbol
 * @param {number} amount - The amount to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.useTranslation - Whether to use translation for currency symbol (default: true)
 * @param {string} options.locale - Locale for number formatting (default: 'en-MM')
 * @param {number} options.minimumFractionDigits - Minimum fraction digits (default: 0)
 * @param {number} options.maximumFractionDigits - Maximum fraction digits (default: 0)
 * @returns {string} Formatted price string
 */
export const formatPrice = (amount, options = {}) => {
  const {
    useTranslation: useTrans = true,
    locale = 'en-MM',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0
  } = options;

  if (amount == null || isNaN(amount)) return '0';

  const num = Number(amount);
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(num);

  if (useTrans) {
    return `${formattedNumber} ${i18n.t('common.currency.mmk', 'MMK')}`;
  }

  return `${formattedNumber} MMK`;
};

/**
 * React hook version that uses translation
 */
export const useFormatPrice = () => {
  const { t } = useTranslation();

  return (amount, options = {}) => {
    const {
      locale = 'en-MM',
      minimumFractionDigits = 0,
      maximumFractionDigits = 0
    } = options;

    if (amount == null || isNaN(amount)) return '0';

    const num = Number(amount);
    const formattedNumber = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(num);

    const currencySymbol = t('common.currency.mmk', 'MMK');
    return `${formattedNumber} ${currencySymbol}`;
  };
};

/**
 * Legacy formatMMK function for backward compatibility
 * @param {number} amount - The amount to format
 * @returns {string} Formatted price string
 */
export const formatMMK = (amount) => {
  return formatPrice(amount);
};
