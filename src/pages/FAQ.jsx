import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import useSEO from "../hooks/useSEO";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  CreditCardIcon,
  TruckIcon,
  UserCircleIcon,
  QuestionMarkCircleIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

// ─── Sub-components ───────────────────────────────────────────────────────────

const AccordionItem = ({ question, answer, isOpen, onToggle }) => (
  <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 text-left bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <span className="font-medium text-gray-800 dark:text-slate-100 pr-4 text-sm sm:text-base">
        {question}
      </span>
      <ChevronDownIcon
        className={`flex-shrink-0 w-5 h-5 text-gray-400 dark:text-slate-500 transition-transform duration-200 ${
          isOpen ? "rotate-180" : ""
        }`}
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

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  general:  QuestionMarkCircleIcon,
  buying:   ShoppingBagIcon,
  selling:  BuildingStorefrontIcon,
  payments: CreditCardIcon,
  shipping: TruckIcon,
  account:  UserCircleIcon,
};

const CATEGORY_IDS = ["general", "buying", "selling", "payments", "shipping", "account"];

const CATEGORY_FAQ_COUNTS = {
  general:  5,
  buying:   6,
  selling:  6,
  payments: 5,
  shipping: 5,
  account:  5,
};

// ─── Main component ───────────────────────────────────────────────────────────

const FAQ = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState("general");
  const [openItem, setOpenItem]             = useState(null);
  const [search, setSearch]                 = useState("");

  const SeoComponent = useSEO({
    title: t("faq_page.seo.title"),
    description: t("faq_page.seo.description"),
    url: "/faq",
  });

  const CATEGORIES = CATEGORY_IDS.map((id) => ({
    id,
    label: t(`faq_page.categories.${id}`),
    icon:  CATEGORY_ICONS[id],
    count: CATEGORY_FAQ_COUNTS[id],
  }));

  const ALL_FAQS = useMemo(() =>
    CATEGORY_IDS.flatMap((cat) =>
      Array.from({ length: CATEGORY_FAQ_COUNTS[cat] }, (_, i) => ({
        category: cat,
        q: t(`faq_page.${cat}.q_${i}`),
        a: t(`faq_page.${cat}.a_${i}`),
      }))
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [t]);

  const filteredFaqs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return ALL_FAQS.filter(
        (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
      );
    }
    return ALL_FAQS.filter((f) => f.category === activeCategory);
  }, [search, activeCategory, ALL_FAQS]);

  const handleSearch = (val) => { setSearch(val); setOpenItem(null); };
  const handleCategory = (id) => { setActiveCategory(id); setSearch(""); setOpenItem(null); };

  const isSearching = search.trim().length > 0;

  const questionCountLabel = (n) =>
    `${n} ${n === 1 ? t("faq_page.list.question") : t("faq_page.list.questions")}`;

  const resultsLabel = (n, term) =>
    `${n} ${n === 1 ? t("faq_page.list.results_for") : t("faq_page.list.results_for_pl")} "${term}"`;

  const RELATED_LINKS = [
    { label: t("faq_page.links.seller_guidelines_label"), to: "/seller-guidelines", desc: t("faq_page.links.seller_guidelines_desc") },
    { label: t("faq_page.links.return_policy_label"),     to: "/return-policy",     desc: t("faq_page.links.return_policy_desc")     },
    { label: t("faq_page.links.pricing_label"),           to: "/pricing",           desc: t("faq_page.links.pricing_desc")           },
  ];

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
            className="max-w-2xl"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-green-200 mb-3">
              {t("faq_page.hero.label")}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              {t("faq_page.hero.title")}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-green-100 max-w-xl leading-relaxed">
              {t("faq_page.hero.desc")}
            </p>

            {/* Search */}
            <div className="mt-8 relative max-w-lg">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-300 pointer-events-none" />
              <input
                type="text"
                placeholder={t("faq_page.hero.search_placeholder")}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/15 backdrop-blur border border-white/30 text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3 px-2">
                {t("faq_page.sidebar.categories_label")}
              </p>
              <nav className="space-y-0.5">
                {CATEGORIES.map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id}
                    onClick={() => handleCategory(id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      !isSearching && activeCategory === id
                        ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{count}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">
                  {t("faq_page.sidebar.need_help_title")}
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mb-3">
                  {t("faq_page.sidebar.need_help_desc")}
                </p>
                <Link
                  to="/contact"
                  className="text-xs font-medium text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 underline underline-offset-2"
                >
                  {t("faq_page.sidebar.contact_support")}
                </Link>
              </div>
            </div>
          </aside>

          {/* ── Mobile category tabs ── */}
          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleCategory(id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    !isSearching && activeCategory === id
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-green-400 dark:hover:border-green-600"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── FAQ list ── */}
          <main className="flex-1 min-w-0">
            {/* Section heading */}
            {!isSearching && (
              <div className="mb-6">
                {CATEGORIES.filter((c) => c.id === activeCategory).map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-green-700 dark:text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {label}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {questionCountLabel(filteredFaqs.length)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search results header */}
            {isSearching && (
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {filteredFaqs.length === 0
                    ? t("faq_page.list.no_results")
                    : resultsLabel(filteredFaqs.length, search)}
                </p>
                <button
                  onClick={() => handleSearch("")}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline"
                >
                  {t("faq_page.list.clear_search")}
                </button>
              </div>
            )}

            {/* Items */}
            {filteredFaqs.length > 0 ? (
              <div className="space-y-2">
                {filteredFaqs.map((faq, i) => (
                  <AccordionItem
                    key={`${faq.category}-${i}`}
                    question={faq.q}
                    answer={faq.a}
                    isOpen={openItem === i}
                    onToggle={() => setOpenItem(openItem === i ? null : i)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <QuestionMarkCircleIcon className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-slate-400 font-medium">
                  {t("faq_page.list.no_questions")}
                </p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                  {t("faq_page.list.no_questions_sub")}
                </p>
              </div>
            )}

            {/* ── CTA ── */}
            <div className="mt-12 rounded-xl bg-gradient-to-r from-green-600 to-emerald-700 p-8 text-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <ChatBubbleLeftRightIcon className="w-10 h-10 flex-shrink-0 text-green-200" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">{t("faq_page.cta.title")}</h3>
                  <p className="text-green-100 text-sm">{t("faq_page.cta.desc")}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 bg-white text-green-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-green-50 transition-colors text-sm"
                  >
                    {t("faq_page.cta.contact_us")}
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/help"
                    className="inline-flex items-center gap-2 border border-green-300 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    {t("faq_page.cta.help_center")}
                  </Link>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {RELATED_LINKS.map(({ label, to, desc }) => (
                <Link
                  key={to}
                  to={to}
                  className="group p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-green-400 dark:hover:border-green-600 transition-colors"
                >
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{desc}</p>
                </Link>
              ))}
            </div>

            <p className="text-xs text-gray-400 dark:text-slate-500 text-center mt-10 pb-2">
              {t("faq_page.footer")}
              <Link to="/contact" className="text-green-600 dark:text-green-400 hover:underline">
                {t("faq_page.footer_suggest")}
              </Link>
            </p>
          </main>
        </div>
      </div>
    </>
  );
};

export default FAQ;
