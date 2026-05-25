// src/pages/Pricing.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  ArrowUpCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import useSEO from '../hooks/useSEO';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const PLAN_STYLES = {
  basic: {
    icon: '🏪',
    ring: 'border-gray-200 dark:border-gray-700',
    accent: 'text-gray-700 dark:text-gray-200',
    btn: 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:hover:bg-white dark:text-gray-900 text-white',
    popular: false,
  },
  professional: {
    icon: '🚀',
    ring: 'border-green-500 shadow-green-100 dark:shadow-green-900/20',
    accent: 'text-green-600 dark:text-green-400',
    btn: 'bg-green-600 hover:bg-green-700 text-white',
    popular: true,
  },
  enterprise: {
    icon: '🏢',
    ring: 'border-purple-500 shadow-purple-100 dark:shadow-purple-900/20',
    accent: 'text-purple-600 dark:text-purple-400',
    btn: 'bg-purple-600 hover:bg-purple-700 text-white',
    popular: false,
  },
};

const FAQS = [
  { q: 'q_setup', a: 'a_setup' },
  { q: 'q_change_plans', a: 'a_change_plans' },
  { q: 'q_payment', a: 'a_payment' },
  { q: 'q_contract', a: 'a_contract' },
  { q: 'q_limit', a: 'a_limit' },
  { q: 'q_commission', a: 'a_commission' },
];

const STATIC_PLANS = [
  { id: 1, slug: 'basic', name: 'Basic', description: 'For small businesses getting started', price_mmk: 0, billing_cycle: 'monthly', product_limit: 20, product_limit_label: '20', commission_rate: 0.05, commission_percent: '5%', analytics_enabled: false, bulk_import_enabled: false, priority_support: false, custom_storefront: false },
  { id: 2, slug: 'professional', name: 'Professional', description: 'For growing businesses', price_mmk: 50000, billing_cycle: 'monthly', product_limit: 100, product_limit_label: '100', commission_rate: 0.03, commission_percent: '3%', analytics_enabled: true, bulk_import_enabled: false, priority_support: true, custom_storefront: false },
  { id: 3, slug: 'enterprise', name: 'Enterprise', description: 'For large businesses and wholesalers', price_mmk: 150000, billing_cycle: 'monthly', product_limit: -1, product_limit_label: 'Unlimited', commission_rate: 0.01, commission_percent: '1%', analytics_enabled: true, bulk_import_enabled: true, priority_support: true, custom_storefront: true },
];

const Pricing = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  const isSeller = user?.role === 'seller' || user?.type === 'seller';

  const tp = (key, defaultValue) =>
    t(`pricing_page.${key}`, { defaultValue: defaultValue ?? key });

  const SeoComponent = useSEO({
    title: tp('seo.title', 'Pricing & Plans | Pyonea Myanmar B2B Marketplace'),
    description: tp(
      'seo.description',
      "Choose the right plan for your business. Free and premium tiers for sellers on Myanmar's leading B2B marketplace."
    ),
    url: '/pricing',
  });

  const planName = (plan) => tp(`plans.${plan.slug}.name`, plan.name);
  const planDescription = (plan) => tp(`plans.${plan.slug}.description`, plan.description);
  const isFreePlan = (plan) => Number(plan.price_mmk) === 0;
  const formatPrice = (price) => {
    const amount = Number(price);
    if (amount === 0) return tp('format.free', 'Free');
    return t('pricing_page.format.price_mmk', {
      amount: amount.toLocaleString(i18n.language),
      defaultValue: `${amount.toLocaleString(i18n.language)} MMK`,
    });
  };

  const featureRows = (plan) => [
    {
      key: 'products',
      label: t('pricing_page.feature.products_with_count', {
        count: plan.product_limit_label ?? plan.product_limit,
        defaultValue: `${plan.product_limit_label ?? plan.product_limit} ${tp('feature.products', 'Products')}`,
      }),
      ok: true,
    },
    {
      key: 'commission',
      label: t('pricing_page.feature.commission_with_rate', {
        rate: plan.commission_percent ?? `${(Number(plan.commission_rate) * 100).toFixed(0)}%`,
        defaultValue: `${plan.commission_percent ?? `${(Number(plan.commission_rate) * 100).toFixed(0)}%`} ${tp('feature.commission', 'Commission')}`,
      }),
      ok: true,
    },
    { key: 'analytics', label: tp('feature.analytics_dashboard', 'Analytics Dashboard'), ok: plan.analytics_enabled },
    { key: 'bulk_import', label: tp('feature.bulk_import_export', 'Bulk Import / Export'), ok: plan.bulk_import_enabled },
    { key: 'priority_support', label: tp('feature.priority_support', 'Priority Support'), ok: plan.priority_support },
    { key: 'custom_storefront', label: tp('feature.custom_storefront', 'Custom Storefront'), ok: plan.custom_storefront },
  ];

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      try {
        if (isSeller) {
          const [plansRes, subRes] = await Promise.all([
            api.get('/seller/subscription/plans'),
            api.get('/seller/subscription'),
          ]);
          setPlans(plansRes.data.data ?? []);
          setCurrentSub(subRes.data.data ?? null);
        } else {
          try {
            const res = await api.get('/subscription-plans');
            setPlans(res.data.data ?? []);
          } catch {
            setPlans(STATIC_PLANS);
          }
        }
      } catch {
        setPlans(STATIC_PLANS);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [isSeller]);

  const handleCTA = () => {
    if (!isAuthenticated) {
      navigate('/register?role=seller');
      return;
    }
    if (isSeller) {
      navigate('/seller/dashboard?tab=subscription');
      return;
    }
    navigate('/register?role=seller');
  };

  const ctaLabel = (plan) => {
    if (!isAuthenticated) return tp('cta.get_started_free', 'Get Started');
    if (isSeller && plan.is_current) return tp('cta.current_plan', 'Current Plan');
    if (isSeller) {
      return isFreePlan(plan)
        ? tp('cta.switch_to_basic', 'Switch to Basic')
        : t('pricing_page.cta.upgrade_to_plan', {
            plan: planName(plan),
            defaultValue: `${tp('cta.upgrade_to', 'Upgrade to')} ${planName(plan)}`,
          });
    }
    return tp('cta.register_as_seller', 'Register as Seller');
  };

  if (loading) {
    return (
      <>
        {SeoComponent}
        <div className="container mx-auto px-4 py-12">
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-xl mx-auto mb-4 animate-pulse" />
          <div className="h-4 w-80 bg-gray-100 dark:bg-gray-800 rounded mx-auto mb-12 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {SeoComponent}
      <div className="container mx-auto px-4 py-12 space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-semibold px-4 py-1.5 rounded-full">
            <SparklesIcon className="w-4 h-4" />
            {tp('hero.badge_label', 'Seller Plans')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100">
            {tp('hero.title', 'Choose the right plan for your business')}
          </h1>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400">
            {tp('hero.subtitle', 'Start free and scale as you grow. Upgrade any time - cancel any time.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const styles = PLAN_STYLES[plan.slug] ?? PLAN_STYLES.basic;
            const isCurrent = plan.is_current;

            return (
              <div
                key={plan.id ?? plan.slug}
                className={`relative flex flex-col rounded-2xl border-2 shadow-lg bg-white dark:bg-gray-800 ${styles.ring} ${styles.popular ? 'md:-translate-y-2' : ''} transition-transform duration-200`}
              >
                {styles.popular && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                      {tp('badge.most_popular', 'Most Popular')}
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs font-bold px-4 py-1 rounded-full shadow">
                      {tp('badge.current_plan', 'Your Current Plan')}
                    </span>
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1 space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-3xl">{styles.icon}</span>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{planName(plan)}</h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{planDescription(plan)}</p>
                    <p className={`text-3xl font-extrabold ${styles.accent}`}>
                      {formatPrice(plan.price_mmk)}
                      {Number(plan.price_mmk) > 0 && (
                        <span className="text-base font-normal text-gray-400">
                          {tp('format.per_month', '/mo')}
                        </span>
                      )}
                    </p>
                  </div>

                  <ul className="space-y-2.5 flex-1">
                    {featureRows(plan).map(({ key, label, ok }) => (
                      <li key={key} className="flex items-center gap-2 text-sm">
                        {ok ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircleIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        )}
                        <span className={ok ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}>
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent && currentSub?.products_used !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{tp('feature.products_used', 'Products Used')}</span>
                        <span>
                          {currentSub.products_used} / {plan.product_limit === -1 ? tp('format.unlimited_symbol', '∞') : plan.product_limit}
                        </span>
                      </div>
                      {plan.product_limit !== -1 && (
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min(100, (currentSub.products_used / plan.product_limit) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => !isCurrent && handleCTA(plan)}
                    disabled={isCurrent}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
                        : styles.btn
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4" /> {tp('cta.current_plan', 'Current Plan')}
                      </>
                    ) : !isAuthenticated ? (
                      tp('cta.get_started_free', 'Get Started')
                    ) : isSeller ? (
                      <>
                        <ArrowUpCircleIcon className="w-4 h-4" /> {ctaLabel(plan)}
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className="w-4 h-4" /> {tp('cta.register_as_seller', 'Register as Seller')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
            {tp('faq.title', 'Frequently Asked Questions')}
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={faq.q} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {tp(`faq.${faq.q}`, faq.q)}
                  <span className="text-gray-400 ml-3 flex-shrink-0">
                    {openFaq === i ? tp('faq.close_symbol', '-') : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                    {tp(`faq.${faq.a}`, faq.a)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {!isSeller && (
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-8 text-center text-white space-y-4 shadow-xl">
            <h3 className="text-2xl font-bold">{tp('cta_banner.ready', 'Ready to start selling?')}</h3>
            <p className="text-green-100">
              {tp('cta_banner.description', 'Join thousands of Myanmar businesses on Pyonea. Start free, no credit card required.')}
            </p>
            <button
              onClick={() => navigate('/register?role=seller')}
              className="bg-white text-green-700 font-bold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors"
            >
              {tp('cta_banner.cta', 'Create Seller Account')}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Pricing;
