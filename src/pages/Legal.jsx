import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import useSEO from "../hooks/useSEO";

const Legal = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const SeoComponent = useSEO({
    title: t("legal.title"),
    description: t("legal.seo.description"),
    url: location.pathname === "/terms" ? "/terms" : "/legal",
  });

  const legalSections = [
    {
      title: t("legal.terms.title"),
      content: t("legal.terms.content")
    },
    {
      title: t("legal.privacy.title"),
      content: t("legal.privacy.content")
    },
    {
      title: t("legal.refund.title"),
      content: t("legal.refund.content")
    },
    {
      title: t("legal.seller.title"),
      content: t("legal.seller.content")
    },
    {
      title: t("legal.dispute.title"),
      content: t("legal.dispute.content")
    }
  ];



  return (
    <>
      {SeoComponent}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-2xl sm:text-4xl font-bold mb-8 text-center dark:text-slate-100">
          {t("legal.title")}
        </h1>
        <p className="text-center text-gray-600 dark:text-slate-400 mb-8">{t("legal.subtitle")}</p>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8">
          {legalSections.map((section, index) => (
            <div key={index} className="mb-8 last:mb-0">
              <h2 className="text-2xl font-bold mb-4 dark:text-slate-100">
                {section.title}
              </h2>
              <p className="text-gray-700 dark:text-slate-300 mb-6">
                {section.content}
              </p>
              {index < legalSections.length - 1 && (
                <hr className="my-6 dark:border-slate-700" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 dark:text-slate-100">
            {t("legal.contact.title")}
          </h2>
          <p className="text-gray-700 dark:text-slate-300 mb-4">
            {t("legal.contact.description")}
          </p>
          <p className="text-gray-700 dark:text-slate-300">
            <strong>{t("legal.contact.emailLabel")}</strong> <a href="mailto:contact@pyonea.com" className="text-blue-600 dark:text-blue-400 hover:underline">contact@pyonea.com</a>
            <br />
            <strong>{t("legal.contact.addressLabel")}</strong>{" "}
            {t("legal.contact.address")}
          </p>
        </div>
      </div>
    </>
  );
};

export default Legal;
