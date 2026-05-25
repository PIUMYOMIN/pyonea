// src/components/ui/NewsletterWidget.jsx
// Embeddable newsletter signup — use in Footer, Home, etc.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';

const NewsletterWidget = ({ variant = 'default', source = 'website' }) => {
  const { t } = useTranslation();
  const [email,     setEmail]     = useState('');
  const [name,      setName]      = useState('');
  const [status,    setStatus]    = useState('idle'); // idle|loading|success|error
  const [message,   setMessage]   = useState('');
  const [showName,  setShowName]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await api.post('/newsletter/subscribe', { email, name: name || undefined, source });
      setStatus('success');
      setMessage(res.data.message || t('footer.newsletter_confirm_message'));
      setEmail(''); setName('');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || t('footer.newsletter_error_message'));
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  if (status === 'success') return (
    <div className={`flex items-center gap-3 ${variant === 'footer' ? 'text-white' : 'text-green-700 bg-green-50 border border-green-200 rounded-xl p-4'}`}>
      <span className="text-2xl">✉️</span>
      <div>
        <p className="text-sm font-semibold">{t('footer.newsletter_success_title')}</p>
        <p className={`text-xs mt-0.5 ${variant === 'footer' ? 'text-green-200' : 'text-green-600'}`}>{message}</p>
      </div>
    </div>
  );

  // Compact footer variant
  if (variant === 'footer') return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-sm font-semibold text-white">{t('footer.newsletter_title')}</p>
      <p className="text-xs text-green-200">{t('footer.newsletter_subtitle')}</p>
      <div className="flex gap-2 mt-3">
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder={t('footer.newsletter_email_placeholder')}
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-white/40"/>
        <button type="submit" disabled={status === 'loading'}
          className="px-4 py-2 bg-white text-green-700 text-sm font-semibold rounded-lg hover:bg-green-50 disabled:opacity-60 transition-colors whitespace-nowrap">
          {status === 'loading' ? '…' : t('footer.newsletter_subscribe')}
        </button>
      </div>
      {status === 'error' && <p className="text-xs text-red-300">{message}</p>}
    </form>
  );

  // Default card variant
  return (
    <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-6 sm:p-8 text-white">
      <h3 className="text-xl font-bold">{t('footer.newsletter_card_title')}</h3>
      <p className="text-green-100 text-sm mt-1 mb-5">{t('footer.newsletter_card_subtitle')}</p>
      <form onSubmit={submit} className="space-y-3">
        {showName && (
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder={t('footer.newsletter_name_placeholder')}
            className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/10 border border-white/20 text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-white/30"/>
        )}
        <div className="flex gap-2">
          <input type="email" required value={email} onChange={e => { setEmail(e.target.value); if (!showName && e.target.value.includes('@')) setShowName(true); }}
            placeholder={t('footer.newsletter_email_input')}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-white/10 border border-white/20 text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-white/30"/>
          <button type="submit" disabled={status === 'loading'}
            className="px-5 py-2.5 bg-white text-green-700 font-semibold text-sm rounded-xl hover:bg-green-50 disabled:opacity-60 transition-colors whitespace-nowrap">
            {status === 'loading' ? t('footer.newsletter_subscribing') : t('footer.newsletter_subscribe')}
          </button>
        </div>
        {status === 'error' && <p className="text-xs text-red-300">{message}</p>}
        <p className="text-xs text-green-200">{t('footer.newsletter_privacy_note')}</p>
      </form>
    </div>
  );
};

export default NewsletterWidget;
