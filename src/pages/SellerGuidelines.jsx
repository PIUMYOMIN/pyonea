import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import useSEO from "../hooks/useSEO";
import {
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  CubeIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionAnchor = ({ id }) => <div id={id} className="scroll-mt-24" />;

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-4 mb-6">
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
      <Icon className="w-5 h-5 text-green-700 dark:text-green-400" />
    </div>
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  </div>
);

const AccordionItem = ({ question, answer, isOpen, onToggle }) => (
  <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 text-left bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <span className="font-medium text-gray-800 dark:text-slate-100 pr-4">{question}</span>
      <ChevronDownIcon
        className={`flex-shrink-0 w-5 h-5 text-gray-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 leading-relaxed">
            {answer}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const SellerGuidelines = () => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const SeoComponent = useSEO({
    title: t("seller_guidelines.seo.title"),
    description: t("seller_guidelines.seo.description"),
    url: "/seller-guidelines",
  });

  // ─── Data (inside component so t() is available) ──────────────────────────

  const SECTIONS = [
    { id: "eligibility",   label: t("seller_guidelines.sections.eligibility"),   icon: ShieldCheckIcon },
    { id: "products",      label: t("seller_guidelines.sections.products"),       icon: CubeIcon },
    { id: "pricing",       label: t("seller_guidelines.sections.pricing"),        icon: CurrencyDollarIcon },
    { id: "shipping",      label: t("seller_guidelines.sections.shipping"),       icon: TruckIcon },
    { id: "communication", label: t("seller_guidelines.sections.communication"),  icon: ChatBubbleLeftRightIcon },
    { id: "documents",     label: t("seller_guidelines.sections.documents"),      icon: DocumentTextIcon },
    { id: "prohibited",    label: t("seller_guidelines.sections.prohibited"),     icon: ExclamationTriangleIcon },
    { id: "performance",   label: t("seller_guidelines.sections.performance"),    icon: StarIcon },
  ];

  const ELIGIBILITY_REQUIREMENTS = [
    t("seller_guidelines.eligibility.req_0"),
    t("seller_guidelines.eligibility.req_1"),
    t("seller_guidelines.eligibility.req_2"),
    t("seller_guidelines.eligibility.req_3"),
    t("seller_guidelines.eligibility.req_4"),
  ];

  const PRODUCT_DOS = [
    t("seller_guidelines.products.do_0"),
    t("seller_guidelines.products.do_1"),
    t("seller_guidelines.products.do_2"),
    t("seller_guidelines.products.do_3"),
    t("seller_guidelines.products.do_4"),
    t("seller_guidelines.products.do_5"),
  ];

  const PRODUCT_DONTS = [
    t("seller_guidelines.products.dont_0"),
    t("seller_guidelines.products.dont_1"),
    t("seller_guidelines.products.dont_2"),
    t("seller_guidelines.products.dont_3"),
    t("seller_guidelines.products.dont_4"),
    t("seller_guidelines.products.dont_5"),
  ];

  const PROHIBITED_CATEGORIES = [
    { name: t("seller_guidelines.prohibited.item_0_name"), detail: t("seller_guidelines.prohibited.item_0_detail") },
    { name: t("seller_guidelines.prohibited.item_1_name"), detail: t("seller_guidelines.prohibited.item_1_detail") },
    { name: t("seller_guidelines.prohibited.item_2_name"), detail: t("seller_guidelines.prohibited.item_2_detail") },
    { name: t("seller_guidelines.prohibited.item_3_name"), detail: t("seller_guidelines.prohibited.item_3_detail") },
    { name: t("seller_guidelines.prohibited.item_4_name"), detail: t("seller_guidelines.prohibited.item_4_detail") },
    { name: t("seller_guidelines.prohibited.item_5_name"), detail: t("seller_guidelines.prohibited.item_5_detail") },
    { name: t("seller_guidelines.prohibited.item_6_name"), detail: t("seller_guidelines.prohibited.item_6_detail") },
    { name: t("seller_guidelines.prohibited.item_7_name"), detail: t("seller_guidelines.prohibited.item_7_detail") },
  ];

  const PERFORMANCE_METRICS = [
    { label: t("seller_guidelines.performance.metric_0_label"), target: t("seller_guidelines.performance.metric_0_target"), description: t("seller_guidelines.performance.metric_0_description") },
    { label: t("seller_guidelines.performance.metric_1_label"), target: t("seller_guidelines.performance.metric_1_target"), description: t("seller_guidelines.performance.metric_1_description") },
    { label: t("seller_guidelines.performance.metric_2_label"), target: t("seller_guidelines.performance.metric_2_target"), description: t("seller_guidelines.performance.metric_2_description") },
    { label: t("seller_guidelines.performance.metric_3_label"), target: t("seller_guidelines.performance.metric_3_target"), description: t("seller_guidelines.performance.metric_3_description") },
    { label: t("seller_guidelines.performance.metric_4_label"), target: t("seller_guidelines.performance.metric_4_target"), description: t("seller_guidelines.performance.metric_4_description") },
  ];

  const SHIPPING_RULES = [
    t("seller_guidelines.shipping.rule_0"),
    t("seller_guidelines.shipping.rule_1"),
    t("seller_guidelines.shipping.rule_2"),
    t("seller_guidelines.shipping.rule_3"),
    t("seller_guidelines.shipping.rule_4"),
    t("seller_guidelines.shipping.rule_5"),
  ];

  const FEES = [
    { plan: t("seller_guidelines.pricing.plan_basic"),        listing: t("seller_guidelines.pricing.listings_basic"),        commission: t("seller_guidelines.pricing.commission_basic"),        monthly: t("seller_guidelines.pricing.monthly_basic"),        badge: null },
    { plan: t("seller_guidelines.pricing.plan_professional"), listing: t("seller_guidelines.pricing.listings_professional"), commission: t("seller_guidelines.pricing.commission_professional"), monthly: t("seller_guidelines.pricing.monthly_professional"), badge: t("seller_guidelines.pricing.badge_popular") },
    { plan: t("seller_guidelines.pricing.plan_enterprise"),   listing: t("seller_guidelines.pricing.listings_enterprise"),   commission: t("seller_guidelines.pricing.commission_enterprise"),   monthly: t("seller_guidelines.pricing.monthly_enterprise"),   badge: null },
  ];

  const COMM_CARDS = [
    {
      label: t("seller_guidelines.communication.card_first_response_label"),
      value: t("seller_guidelines.communication.card_first_response_value"),
      bg:   "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800",
      text: "text-green-700 dark:text-green-300",
      bold: "text-green-800 dark:text-green-200",
    },
    {
      label: t("seller_guidelines.communication.card_order_updates_label"),
      value: t("seller_guidelines.communication.card_order_updates_value"),
      bg:   "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      bold: "text-blue-800 dark:text-blue-200",
    },
    {
      label: t("seller_guidelines.communication.card_dispute_reply_label"),
      value: t("seller_guidelines.communication.card_dispute_reply_value"),
      bg:   "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
      bold: "text-amber-800 dark:text-amber-200",
    },
  ];

  const DOCUMENTS = [
    { title: t("seller_guidelines.documents.doc_0_title"), detail: t("seller_guidelines.documents.doc_0_detail"), required: true },
    { title: t("seller_guidelines.documents.doc_1_title"), detail: t("seller_guidelines.documents.doc_1_detail"), required: true },
    { title: t("seller_guidelines.documents.doc_2_title"), detail: t("seller_guidelines.documents.doc_2_detail"), required: true },
    { title: t("seller_guidelines.documents.doc_3_title"), detail: t("seller_guidelines.documents.doc_3_detail"), required: true },
    { title: t("seller_guidelines.documents.doc_4_title"), detail: t("seller_guidelines.documents.doc_4_detail"), required: false },
    { title: t("seller_guidelines.documents.doc_5_title"), detail: t("seller_guidelines.documents.doc_5_detail"), required: false },
  ];

  const faqs = [
    { q: t("seller_guidelines.faqs.q_0"), a: t("seller_guidelines.faqs.a_0") },
    { q: t("seller_guidelines.faqs.q_1"), a: t("seller_guidelines.faqs.a_1") },
    { q: t("seller_guidelines.faqs.q_2"), a: t("seller_guidelines.faqs.a_2") },
    { q: t("seller_guidelines.faqs.q_3"), a: t("seller_guidelines.faqs.a_3") },
    { q: t("seller_guidelines.faqs.q_4"), a: t("seller_guidelines.faqs.a_4") },
    { q: t("seller_guidelines.faqs.q_5"), a: t("seller_guidelines.faqs.a_5") },
  ];

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  return (
    <>
      {SeoComponent}

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-green-700 to-emerald-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-3xl"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-green-200 mb-3">
              {t("seller_guidelines.hero.for_sellers")}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              {t("seller_guidelines.hero.title")}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-green-100 max-w-2xl leading-relaxed">
              {t("seller_guidelines.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white text-green-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-green-50 transition-colors text-sm"
              >
                {t("seller_guidelines.hero.become_seller")}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <a
                href="#eligibility"
                onClick={(e) => { e.preventDefault(); scrollTo("eligibility"); }}
                className="inline-flex items-center gap-2 border border-green-400 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                {t("seller_guidelines.hero.read_guidelines")}
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* ── Sticky sidebar nav ── */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3 px-2">
                {t("seller_guidelines.sidebar.contents")}
              </p>
              <nav className="space-y-0.5">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      activeSection === id
                        ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </nav>

              <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">
                  {t("seller_guidelines.sidebar.need_help")}
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mb-3">
                  {t("seller_guidelines.sidebar.support_hours")}
                </p>
                <Link
                  to="/contact"
                  className="text-xs font-medium text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 underline underline-offset-2"
                >
                  {t("seller_guidelines.sidebar.contact_support")}
                </Link>
              </div>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0 space-y-12">

            {/* ── 1. Eligibility ── */}
            <section>
              <SectionAnchor id="eligibility" />
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                <SectionHeader
                  icon={ShieldCheckIcon}
                  title={t("seller_guidelines.eligibility.title")}
                  subtitle={t("seller_guidelines.eligibility.subtitle")}
                />
                <ul className="space-y-3">
                  {ELIGIBILITY_REQUIREMENTS.map((req, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircleSolid className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-slate-300">{req}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                  <strong className="font-semibold">{t("seller_guidelines.eligibility.note_label")}</strong>{" "}
                  {t("seller_guidelines.eligibility.note_text")}
                </div>
              </div>
            </section>

            {/* ── 2. Product Standards ── */}
            <section>
              <SectionAnchor id="products" />
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                <SectionHeader
                  icon={CubeIcon}
                  title={t("seller_guidelines.products.title")}
                  subtitle={t("seller_guidelines.products.subtitle")}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <CheckCircleIcon className="w-4 h-4" /> {t("seller_guidelines.products.required_heading")}
                    </h3>
                    <ul className="space-y-2.5">
                      {PRODUCT_DOS.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-slate-300">
                          <CheckCircleSolid className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <XCircleIcon className="w-4 h-4" /> {t("seller_guidelines.products.not_allowed_heading")}
                    </h3>
                    <ul className="space-y-2.5">
                      {PRODUCT_DONTS.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-slate-300">
                          <XCircleIcon className="w-4 h-4 text-red-400 dark:text-red-500 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 3. Pricing & Fees ── */}
            <section>
              <SectionAnchor id="pricing" />
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                <SectionHeader
                  icon={CurrencyDollarIcon}
                  title={t("seller_guidelines.pricing.title")}
                  subtitle={t("seller_guidelines.pricing.subtitle")}
                />
                <div className="overflow-x-auto -mx-2 px-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-600">
                        <th className="text-left py-3 pr-4 font-semibold text-gray-700 dark:text-slate-300">{t("seller_guidelines.pricing.col_plan")}</th>
                        <th className="text-left py-3 pr-4 font-semibold text-gray-700 dark:text-slate-300">{t("seller_guidelines.pricing.col_monthly")}</th>
                        <th className="text-left py-3 pr-4 font-semibold text-gray-700 dark:text-slate-300">{t("seller_guidelines.pricing.col_commission")}</th>
                        <th className="text-left py-3 font-semibold text-gray-700 dark:text-slate-300">{t("seller_guidelines.pricing.col_listings")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {FEES.map(({ plan, listing, commission, monthly, badge }) => (
                        <tr key={plan} className={badge ? "bg-green-50 dark:bg-green-900/20" : ""}>
                          <td className="py-3 pr-4 font-medium text-gray-900 dark:text-slate-100">
                            {plan}
                            {badge && (
                              <span className="ml-2 inline-block text-[10px] font-bold uppercase tracking-wide bg-green-600 text-white px-1.5 py-0.5 rounded">
                                {badge}
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-gray-700 dark:text-slate-300">{monthly}</td>
                          <td className="py-3 pr-4 text-gray-700 dark:text-slate-300">{commission}</td>
                          <td className="py-3 text-gray-700 dark:text-slate-300">{listing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-gray-500 dark:text-slate-500">
                  {t("seller_guidelines.pricing.footnote")}{" "}
                  <Link to="/pricing" className="text-green-600 dark:text-green-400 underline underline-offset-2 hover:text-green-800 dark:hover:text-green-300">
                    {t("seller_guidelines.pricing.view_full_pricing")}
                  </Link>
                </p>
                <div className="mt-5 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
                  <strong className="font-semibold">{t("seller_guidelines.pricing.payment_policy_label")}</strong>{" "}
                  {t("seller_guidelines.pricing.payment_policy_text")}
                </div>
              </div>
            </section>

            {/* ── 4. Shipping ── */}
            <section>
              <SectionAnchor id="shipping" />
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                <SectionHeader
                  icon={TruckIcon}
                  title={t("seller_guidelines.shipping.title")}
                  subtitle={t("seller_guidelines.shipping.subtitle")}
                />
                <ul className="space-y-3">
                  {SHIPPING_RULES.map((rule, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-slate-300">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* ── 5. Communication ── */}
            <section>
              <SectionAnchor id="communication" />
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                <SectionHeader
                  icon={ChatBubbleLeftRightIcon}
                  title={t("seller_guidelines.communication.title")}
                  subtitle={t("seller_guidelines.communication.subtitle")}
                />
                <div className="space-y-4 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                  <p>{t("seller_guidelines.communication.para1")}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    {COMM_CARDS.map(({ label, value, bg, text, bold }) => (
                      <div key={label} className={`rounded-lg p-4 border ${bg}`}>
                        <p className={`text-xs font-semibold uppercase tracking-wide ${text} mb-1`}>
                          {label}
                        </p>
                        <p className={`text-lg font-bold ${bold}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2">{t("seller_guidelines.communication.para2")}</p>
                </div>
              </div>
            </section>

            {/* ── 6. Required Documents ── */}
            <section>
              <SectionAnchor id="documents" />
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                <SectionHeader
                  icon={DocumentTextIcon}
                  title={t("seller_guidelines.documents.title")}
                  subtitle={t("seller_guidelines.documents.subtitle")}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {DOCUMENTS.map(({ title, detail, required }) => (
                    <div
                      key={title}
                      className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50"
                    >
                      <DocumentTextIcon className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
                          {title}
                          {required ? (
                            <span className="ml-2 text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">
                              {t("seller_guidelines.documents.required_label")}
                            </span>
                          ) : (
                            <span className="ml-2 text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase">
                              {t("seller_guidelines.documents.optional_label")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── 7. Prohibited Items ── */}
            <section>
              <SectionAnchor id="prohibited" />
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm p-6 sm:p-8">
                <SectionHeader
                  icon={ExclamationTriangleIcon}
                  title={t("seller_guidelines.prohibited.title")}
                  subtitle={t("seller_guidelines.prohibited.subtitle")}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROHIBITED_CATEGORIES.map(({ name, detail }) => (
                    <div
                      key={name}
                      className="flex items-start gap-3 p-3.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800"
                    >
                      <XCircleIcon className="w-5 h-5 text-red-400 dark:text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">{name}</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs text-gray-500 dark:text-slate-500">
                  {t("seller_guidelines.prohibited.footnote")}{" "}
                  <Link to="/contact" className="text-green-600 dark:text-green-400 underline underline-offset-2 hover:text-green-800 dark:hover:text-green-300">
                    {t("seller_guidelines.prohibited.contact_unsure")}
                  </Link>
                </p>
              </div>
            </section>

            {/* ── 8. Performance Standards ── */}
            <section>
              <SectionAnchor id="performance" />
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                <SectionHeader
                  icon={StarIcon}
                  title={t("seller_guidelines.performance.title")}
                  subtitle={t("seller_guidelines.performance.subtitle")}
                />
                <div className="space-y-3">
                  {PERFORMANCE_METRICS.map(({ label, target, description }) => (
                    <div
                      key={label}
                      className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{label}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{description}</p>
                      </div>
                      <span className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        {target}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300">
                  <p className="font-semibold text-gray-800 dark:text-slate-100 mb-1">
                    {t("seller_guidelines.performance.consequence_title")}
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 dark:text-slate-400">
                    <li>{t("seller_guidelines.performance.consequence_0")}</li>
                    <li>{t("seller_guidelines.performance.consequence_1")}</li>
                    <li>{t("seller_guidelines.performance.consequence_2")}</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* ── FAQs ── */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-5">
                {t("seller_guidelines.faqs.title")}
              </h2>
              <div className="space-y-2">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    question={faq.q}
                    answer={faq.a}
                    isOpen={openFaq === i}
                    onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                  />
                ))}
              </div>
            </section>

            {/* ── CTA ── */}
            <section>
              <div className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-700 p-8 text-white text-center">
                <h2 className="text-2xl font-bold mb-2">{t("seller_guidelines.cta.title")}</h2>
                <p className="text-green-100 text-sm mb-6 max-w-xl mx-auto">
                  {t("seller_guidelines.cta.subtitle")}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 bg-white text-green-700 font-semibold px-6 py-3 rounded-lg hover:bg-green-50 transition-colors text-sm"
                  >
                    {t("seller_guidelines.cta.create_account")}
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 border border-green-300 text-white font-medium px-6 py-3 rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    {t("seller_guidelines.cta.talk_support")}
                  </Link>
                </div>
              </div>
            </section>

            {/* ── Last updated ── */}
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center pb-4">
              {t("seller_guidelines.footer.last_updated")}{" "}
              <Link to="/contact" className="text-green-600 dark:text-green-400 hover:underline">
                {t("seller_guidelines.footer.contact_us")}
              </Link>
            </p>

          </main>
        </div>
      </div>
    </>
  );
};

export default SellerGuidelines;
