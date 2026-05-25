import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import useSEO from "../hooks/useSEO";
import {
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

// ─── Color map ────────────────────────────────────────────────────────────────
const colorMap = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-900/20",    border: "border-blue-100 dark:border-blue-800",    icon: "text-blue-600 dark:text-blue-400",    title: "text-blue-800 dark:text-blue-200"   },
  green:  { bg: "bg-green-50 dark:bg-green-900/20",   border: "border-green-100 dark:border-green-800",   icon: "text-green-600 dark:text-green-400",   title: "text-green-800 dark:text-green-200"  },
  purple: { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-100 dark:border-purple-800", icon: "text-purple-600 dark:text-purple-400", title: "text-purple-800 dark:text-purple-200" },
  amber:  { bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-100 dark:border-amber-800",   icon: "text-amber-600 dark:text-amber-400",   title: "text-amber-800 dark:text-amber-200"  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionCard = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 sm:p-8 ${className}`}>
    {children}
  </div>
);

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
      <span className="font-medium text-gray-800 dark:text-slate-100 pr-4 text-sm sm:text-base">{question}</span>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
const ShippingInfo = () => {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(null);

  const SeoComponent = useSEO({
    title: t("shipping_page.seo.title"),
    description: t("shipping_page.seo.description"),
    url: "/shipping",
  });

  const SHIPPING_METHODS = [
    {
      icon: TruckIcon,
      name: t("shipping_page.methods.standard_name"),
      desc: t("shipping_page.methods.standard_desc"),
      details: [
        t("shipping_page.methods.standard_d0"),
        t("shipping_page.methods.standard_d1"),
        t("shipping_page.methods.standard_d2"),
      ],
      color: "blue",
    },
    {
      icon: ClockIcon,
      name: t("shipping_page.methods.express_name"),
      desc: t("shipping_page.methods.express_desc"),
      details: [
        t("shipping_page.methods.express_d0"),
        t("shipping_page.methods.express_d1"),
        t("shipping_page.methods.express_d2"),
      ],
      color: "green",
    },
    {
      icon: CubeIcon,
      name: t("shipping_page.methods.freight_name"),
      desc: t("shipping_page.methods.freight_desc"),
      details: [
        t("shipping_page.methods.freight_d0"),
        t("shipping_page.methods.freight_d1"),
        t("shipping_page.methods.freight_d2"),
      ],
      color: "purple",
    },
    {
      icon: GlobeAltIcon,
      name: t("shipping_page.methods.intl_name"),
      desc: t("shipping_page.methods.intl_desc"),
      details: [
        t("shipping_page.methods.intl_d0"),
        t("shipping_page.methods.intl_d1"),
        t("shipping_page.methods.intl_d2"),
      ],
      color: "amber",
    },
  ];

  const DOMESTIC_ZONES = [0, 1, 2, 3, 4].map((i) => ({
    zone:     t(`shipping_page.zones.zone_${i}_zone`),
    areas:    t(`shipping_page.zones.zone_${i}_areas`),
    standard: t(`shipping_page.zones.zone_${i}_standard`),
    express:  t(`shipping_page.zones.zone_${i}_express`),
    freight:  t(`shipping_page.zones.zone_${i}_freight`),
  }));

  const PACKAGING_RULES = [0, 1, 2, 3, 4, 5].map((i) =>
    t(`shipping_page.packaging.rule_${i}`)
  );

  const LOST_STEPS = [0, 1, 2, 3].map((i) => ({
    step: t(`shipping_page.lost.step_${i}_step`),
    desc: t(`shipping_page.lost.step_${i}_desc`),
  }));

  const SELLER_ITEMS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
    t(`shipping_page.seller_resp.item_${i}`)
  );

  const FAQS = [0, 1, 2, 3, 4, 5].map((i) => ({
    q: t(`shipping_page.faq.q_${i}`),
    a: t(`shipping_page.faq.a_${i}`),
  }));

  const STATS = [
    { label: t("shipping_page.stats.handling_label"), value: t("shipping_page.stats.handling_value"), sub: t("shipping_page.stats.handling_sub"), color: "text-green-600 dark:text-green-400" },
    { label: t("shipping_page.stats.tracking_label"), value: t("shipping_page.stats.tracking_value"), sub: t("shipping_page.stats.tracking_sub"), color: "text-blue-600 dark:text-blue-400" },
    { label: t("shipping_page.stats.coverage_label"), value: t("shipping_page.stats.coverage_value"), sub: t("shipping_page.stats.coverage_sub"), color: "text-purple-600 dark:text-purple-400" },
    { label: t("shipping_page.stats.dispute_label"),  value: t("shipping_page.stats.dispute_value"),  sub: t("shipping_page.stats.dispute_sub"),  color: "text-amber-600 dark:text-amber-400" },
  ];

  const HANDLING_CARDS = [
    { label: t("shipping_page.handling.standard_label"), value: t("shipping_page.handling.standard_value"), desc: t("shipping_page.handling.standard_desc"), bg: "bg-green-50 dark:bg-green-900/20",   border: "border-green-100 dark:border-green-800",   val: "text-green-800 dark:text-green-200"  },
    { label: t("shipping_page.handling.express_label"),  value: t("shipping_page.handling.express_value"),  desc: t("shipping_page.handling.express_desc"),  bg: "bg-blue-50 dark:bg-blue-900/20",     border: "border-blue-100 dark:border-blue-800",     val: "text-blue-800 dark:text-blue-200"    },
    { label: t("shipping_page.handling.bulk_label"),     value: t("shipping_page.handling.bulk_value"),     desc: t("shipping_page.handling.bulk_desc"),     bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-100 dark:border-purple-800", val: "text-purple-800 dark:text-purple-200" },
  ];

  const RELATED_LINKS = [
    { label: t("shipping_page.links.return_policy_label"),      to: "/return-policy",     desc: t("shipping_page.links.return_policy_desc")      },
    { label: t("shipping_page.links.seller_guidelines_label"),  to: "/seller-guidelines", desc: t("shipping_page.links.seller_guidelines_desc")   },
    { label: t("shipping_page.links.faq_label"),                to: "/faq",               desc: t("shipping_page.links.faq_desc")                 },
  ];

  const notAvailable = t("shipping_page.zones.not_available");

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
              {t("shipping_page.hero.label")}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              {t("shipping_page.hero.title")}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-green-100 max-w-2xl leading-relaxed">
              {t("shipping_page.hero.desc")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/track-order"
                className="inline-flex items-center gap-2 bg-white text-green-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-green-50 transition-colors text-sm"
              >
                {t("shipping_page.hero.track_order")}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 border border-green-400 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                {t("shipping_page.hero.contact_support")}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">

        {/* ── Quick stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(({ label, value, sub, color }) => (
            <div
              key={label}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 text-center"
            >
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-sm font-medium text-gray-800 dark:text-slate-100 mt-1">{label}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Shipping methods ── */}
        <section>
          <SectionCard>
            <SectionHeader
              icon={TruckIcon}
              title={t("shipping_page.methods.title")}
              subtitle={t("shipping_page.methods.subtitle")}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {SHIPPING_METHODS.map(({ icon: Icon, name, desc, details, color }) => {
                const c = colorMap[color];
                return (
                  <div key={name} className={`rounded-xl border p-5 ${c.bg} ${c.border}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className={`w-6 h-6 flex-shrink-0 ${c.icon}`} />
                      <h3 className={`font-semibold text-sm ${c.title}`}>{name}</h3>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-slate-300 mb-3 leading-relaxed">{desc}</p>
                    <ul className="space-y-1.5">
                      {details.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-400">
                          <CheckCircleSolid className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </section>

        {/* ── Delivery zones & times ── */}
        <section>
          <SectionCard>
            <SectionHeader
              icon={MapPinIcon}
              title={t("shipping_page.zones.title")}
              subtitle={t("shipping_page.zones.subtitle")}
            />
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-600">
                    <th className="text-left py-3 pr-4 font-semibold text-gray-700 dark:text-slate-300 min-w-[140px]">{t("shipping_page.zones.col_zone")}</th>
                    <th className="text-left py-3 pr-4 font-semibold text-gray-700 dark:text-slate-300 min-w-[180px]">{t("shipping_page.zones.col_areas")}</th>
                    <th className="text-left py-3 pr-4 font-semibold text-gray-700 dark:text-slate-300">{t("shipping_page.zones.col_standard")}</th>
                    <th className="text-left py-3 pr-4 font-semibold text-gray-700 dark:text-slate-300">{t("shipping_page.zones.col_express")}</th>
                    <th className="text-left py-3 font-semibold text-gray-700 dark:text-slate-300">{t("shipping_page.zones.col_freight")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {DOMESTIC_ZONES.map(({ zone, areas, standard, express, freight }) => (
                    <tr key={zone} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-slate-100">{zone}</td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-slate-400 text-xs">{areas}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 text-xs font-medium">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          {standard}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {express === notAvailable ? (
                          <span className="inline-flex items-center gap-1 text-gray-400 dark:text-slate-500 text-xs">
                            <XCircleIcon className="w-3.5 h-3.5" />
                            {notAvailable}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 text-xs font-medium">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            {express}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-gray-500 dark:text-slate-400 text-xs">{freight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-gray-500 dark:text-slate-500">
              {t("shipping_page.zones.footnote")}
            </p>
          </SectionCard>
        </section>

        {/* ── Handling time ── */}
        <section>
          <SectionCard>
            <SectionHeader
              icon={ClockIcon}
              title={t("shipping_page.handling.title")}
              subtitle={t("shipping_page.handling.subtitle")}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {HANDLING_CARDS.map(({ label, value, desc, bg, border, val }) => (
                <div key={label} className={`rounded-xl border p-4 ${bg} ${border}`}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className={`text-base font-bold ${val}`}>{value}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              <strong className="font-semibold">{t("shipping_page.handling.obligation_label", "Seller obligation:")} </strong>
              {t("shipping_page.handling.obligation")}
            </div>
          </SectionCard>
        </section>

        {/* ── Packaging standards ── */}
        <section>
          <SectionCard>
            <SectionHeader
              icon={CubeIcon}
              title={t("shipping_page.packaging.title")}
              subtitle={t("shipping_page.packaging.subtitle")}
            />
            <ul className="space-y-3">
              {PACKAGING_RULES.map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-slate-300">{rule}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
              <strong className="font-semibold">{t("shipping_page.packaging.buyer_note_label", "Note for buyers:")} </strong>
              {t("shipping_page.packaging.buyer_note")}
            </div>
          </SectionCard>
        </section>

        {/* ── Lost / damaged ── */}
        <section>
          <SectionCard>
            <SectionHeader
              icon={ExclamationTriangleIcon}
              title={t("shipping_page.lost.title")}
              subtitle={t("shipping_page.lost.subtitle")}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {LOST_STEPS.map(({ step, desc }, i) => (
                <div key={i} className="flex flex-col items-center text-center p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600 h-full">
                  <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-bold flex items-center justify-center mb-3 flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-1">{step}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircleSolid className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">{t("shipping_page.lost.eligible_title")}</p>
                </div>
                <ul className="space-y-1 text-xs text-green-700 dark:text-green-300">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i}>{t(`shipping_page.lost.eligible_${i}`)}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <XCircleIcon className="w-4 h-4 text-red-500 dark:text-red-400" />
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">{t("shipping_page.lost.not_eligible_title")}</p>
                </div>
                <ul className="space-y-1 text-xs text-red-700 dark:text-red-300">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i}>{t(`shipping_page.lost.not_eligible_${i}`)}</li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionCard>
        </section>

        {/* ── Seller responsibilities ── */}
        <section>
          <SectionCard>
            <SectionHeader
              icon={ShieldCheckIcon}
              title={t("shipping_page.seller_resp.title")}
              subtitle={t("shipping_page.seller_resp.subtitle")}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SELLER_ITEMS.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600">
                  <CheckCircleSolid className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        {/* ── FAQs ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-5">
            {t("shipping_page.faq.title")}
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
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
          <div className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-700 p-8 text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <TruckIcon className="w-10 h-10 flex-shrink-0 text-green-200" />
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">{t("shipping_page.cta.title")}</h3>
                <p className="text-green-100 text-sm">{t("shipping_page.cta.desc")}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 bg-white text-green-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-green-50 transition-colors text-sm"
                >
                  {t("shipping_page.cta.contact_support")}
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <Link
                  to="/track-order"
                  className="inline-flex items-center gap-2 border border-green-300 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  {t("shipping_page.cta.track_order")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        <p className="text-xs text-gray-400 dark:text-slate-500 text-center pb-2">
          {t("shipping_page.footer")}
          <Link to="/contact" className="text-green-600 dark:text-green-400 hover:underline">
            {t("shipping_page.footer_contact")}
          </Link>
        </p>

      </div>
    </>
  );
};

export default ShippingInfo;
