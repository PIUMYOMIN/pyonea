// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import my from './locales/my.json';

const resources = {
  en: { translation: en },
  my: { translation: my },
};

const normalizeLanguage = (lng) => {
  const code = String(lng || '').toLowerCase().replace('_', '-');

  if (code.startsWith('my') || code.startsWith('mm')) return 'my';
  if (code.startsWith('en')) return 'en';

  return 'en';
};

const syncDocumentLanguage = (lng) => {
  if (typeof document === 'undefined') return;

  const language = normalizeLanguage(lng);
  document.documentElement.lang = language;
  document.documentElement.dir = 'ltr';
};

if (typeof window !== 'undefined') {
  const savedLanguage = window.localStorage.getItem('pyonea_language')
    || window.localStorage.getItem('i18nextLng');

  if (savedLanguage) {
    window.localStorage.setItem('pyonea_language', normalizeLanguage(savedLanguage));
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['en', 'my'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    cleanCode: true,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // 1. ?lang= query param  — Google Search crawl and hreflang links
      // 2. localStorage        — user's previously chosen language
      // 3. navigator           — browser's preferred language
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'pyonea_language',
      caches: ['localStorage'],
      convertDetectedLanguage: normalizeLanguage,
    },
  })
  .then(() => {
    syncDocumentLanguage(i18n.resolvedLanguage || i18n.language);
  });

i18n.on('languageChanged', (lng) => {
  const language = normalizeLanguage(lng);

  syncDocumentLanguage(language);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('pyonea_language', language);
    window.localStorage.setItem('i18nextLng', language);
  }
});

export default i18n;
