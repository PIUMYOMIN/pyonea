// src/components/layout/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NewsletterWidget from "../ui/NewsletterWidget";
import { useCookies } from "../../context/CookieContext";
import Logo from "../../assets/images/logo.png";

const Footer = () => {
  const { t } = useTranslation();
  const { openBanner } = useCookies();

  const linkClass =
    "text-sm text-gray-400 hover:text-green-400 dark:hover:text-green-400 transition-colors inline-block py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60 focus-visible:rounded";

  const headingClass =
    "text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-3";

  return (
    <footer className="bg-gray-900 dark:bg-slate-950 text-white theme-transition border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* Brand strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-10 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2.5 w-fit group">
            <img
              src={Logo}
              alt={t("header.logo_text")}
              className="h-9 w-9 rounded-lg object-contain opacity-90 group-hover:opacity-100 transition-opacity"
              width={36}
              height={36}
            />
            <div>
              <span className="font-torus font-semibold text-lg text-white group-hover:text-green-400 transition-colors">
                {t("header.logo_text")}
              </span>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 max-w-md">
                {t("footer.tagline")}
              </p>
            </div>
          </Link>
        </div>

        {/* Primary link grid — balanced columns */}
        <nav
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-8 gap-y-10 pt-10"
          aria-label={t("footer.nav_label")}
        >
          <div>
            <h3 className={headingClass}>{t("footer.section_discover")}</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/local-deals" className={linkClass}>
                  {t("footer.local_deals")}
                </Link>
              </li>
              <li>
                <Link to="/compare" className={linkClass}>
                  {t("footer.compare_product")}
                </Link>
              </li>
              <li>
                <Link to="/bulk-order-tool" className={linkClass}>
                  {t("footer.bulk_order_tool")}
                </Link>
              </li>
              <li>
                <Link to="/blog" className={linkClass}>
                  {t("footer.blog")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={headingClass}>{t("footer.section_help")}</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/help" className={linkClass}>
                  {t("footer.help_center")}
                </Link>
              </li>
              <li>
                <Link to="/faq" className={linkClass}>
                  {t("footer.faq")}
                </Link>
              </li>
              <li>
                <Link to="/shipping" className={linkClass}>
                  {t("footer.shipping")}
                </Link>
              </li>
              <li>
                <Link to="/track-order" className={linkClass}>
                  {t("footer.track_order")}
                </Link>
              </li>
              <li>
                <Link to="/return-policy" className={linkClass}>
                  {t("footer.returns")}
                </Link>
              </li>
              <li>
                <Link to="/report" className={linkClass}>
                  {t("footer.report_issue")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={headingClass}>{t("footer.section_sell")}</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/seller-guidelines" className={linkClass}>
                  {t("footer.seller_guidelines")}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className={linkClass}>
                  {t("footer.pricing")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={headingClass}>{t("footer.section_company")}</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/about-us" className={linkClass}>
                  {t("footer.about")}
                </Link>
              </li>
              <li>
                <Link to="/contact" className={linkClass}>
                  {t("footer.contact")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={headingClass}>{t("footer.section_legal")}</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/terms" className={linkClass}>
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className={linkClass}>
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link to="/legal" className={linkClass}>
                  {t("footer.legal")}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openBanner}
                  className={`${linkClass} text-left w-full bg-transparent border-0 cursor-pointer p-0`}
                >
                  {t("footer.cookie_settings")}
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Newsletter + contact */}
        <div className="mt-12 pt-10 border-t border-white/10 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div className="space-y-8 order-2 lg:order-1">
            <div>
              <h3 className={headingClass}>{t("footer.contact_info")}</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="tel:+959792115547" className={linkClass}>
                    {t("footer.phone")}
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@pyonea.com" className={linkClass}>
                    {t("footer.email")}
                  </a>
                </li>
                <li className="text-gray-500 dark:text-slate-500 leading-relaxed max-w-sm pt-1">
                  {t("footer.address")}
                </li>
              </ul>
            </div>
            <div>
              <h3 className={headingClass}>{t("footer.follow_us")}</h3>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {[
                  ["https://facebook.com/PyoneaOfficial", t("footer.facebook")],
                  ["https://twitter.com/PyoneaOfficial", t("footer.twitter")],
                  ["https://linkedin.com/company/pyoneaofficial", t("footer.linkedin")],
                  ["https://instagram.com/PyoneaOfficial", t("footer.instagram")],
                  ["https://www.threads.com/@PyoneaOfficial", t("footer.threads")],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="order-1 lg:order-2 w-full max-w-lg lg:justify-self-end">
            <NewsletterWidget variant="footer" source="footer" />
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500 dark:text-slate-500">
          <p>
            &copy; {new Date().getFullYear()}{" "}
            <span className="text-gray-400 dark:text-slate-400">{t("header.logo_text")}</span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline mt-1 sm:mt-0">{t("footer.rights_reserved")}</span>
          </p>
          <p className="text-gray-500 dark:text-slate-500 sm:text-right max-w-md">
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
