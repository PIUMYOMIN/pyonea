import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import api from "../utils/api";
import CategoryCard from "../components/ui/CategoryCard";
import useSEO from "../hooks/useSEO";
import { SITE_PUBLIC_URL } from "../config";
import { getImageUrl } from "../utils/imageHelpers";

// Skeleton loader matching the CategoryCard shape
const CategoryCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/50 border border-gray-200 dark:border-slate-700 overflow-hidden animate-pulse">
    <div className="aspect-square bg-gray-300"></div>
    <div className="p-3 sm:p-4 space-y-2">
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-6 bg-gray-300 rounded w-1/3"></div>
      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
    </div>
  </div>
);

const CategoryBrowser = () => {
  const { t, i18n } = useTranslation();
  const activeLang = i18n.language?.startsWith("my") ? "my" : "en";
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        setLoading(true);
        // Fetch categories with necessary fields
        const response = await api.get("/categories?fields=id,name_en,name_mm,image,products_count,parent_id,children&with_products_only=true");

        if (!isMounted) return;

        let categoriesData = response.data.data || [];

        // Process each category to ensure consistent structure
        const normalizeCategory = (cat) => {
          const children = Array.isArray(cat.children)
            ? cat.children.map(normalizeCategory)
            : [];

          return {
            ...cat,
            name_en: cat.name_en || cat.name,
            name_mm: cat.name_mm || null,
            products_count: Number(cat.products_count) || 0,
            children,
            children_count: children.length,
            image: cat.image || null,
          };
        };

        const processed = categoriesData.map(normalizeCategory);

        setCategories(processed);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        setError(t("categories.fetch_error"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCategories();

    return () => { isMounted = false; };
  }, [t]);

  const localizeCategoryName = React.useCallback(
    (cat) =>
      i18n.language === "my"
        ? (cat.name_mm || cat.name_en || cat.name || "Category")
        : (cat.name_en || cat.name_mm || cat.name || "Category"),
    [i18n.language]
  );

  const localizedCategories = useMemo(
    () =>
      categories.map((cat) => ({
        ...cat,
        display_name: localizeCategoryName(cat),
      })),
    [categories, localizeCategoryName]
  );

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return localizedCategories;
    const query = searchQuery.toLowerCase();
    return localizedCategories.filter((cat) => {
      const nameEn = (cat.name_en || "").toLowerCase();
      const nameMm = (cat.name_mm || "").toLowerCase();
      return (
        nameEn.includes(query) ||
        nameMm.includes(query) ||
        (cat.display_name || "").toLowerCase().includes(query)
      );
    });
  }, [localizedCategories, searchQuery]);

  const categoryListingSchema = useMemo(() => {
    const pageUrl = `${SITE_PUBLIC_URL}/categories?lang=${activeLang}`;
    const itemListElement = filteredCategories.slice(0, 48).map((cat, i) => {
      const name = cat.display_name || "Category";
      let img;
      if (cat.image) {
        const resolved = getImageUrl(cat.image);
        if (resolved && !resolved.includes("placeholder")) {
          img = resolved;
        }
      }
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Thing",
          name,
          url: `${SITE_PUBLIC_URL}/products?category=${cat.id}&lang=${activeLang}`,
          ...(img ? { image: img } : {}),
        },
      };
    });
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: t("categories.browse_categories"),
      description: t("categories.discover_products"),
      url: pageUrl,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: filteredCategories.length,
        itemListElement,
      },
    };
  }, [filteredCategories, t, activeLang]);

  const SeoComponent = useSEO({
    title: t("seo.categories.title"),
    description: t("seo.categories.description"),
    url: `/categories?lang=${activeLang}`,
    type: "website",
    schema: categoryListingSchema,
  });

  if (error) {
    return (
      <div className="min-h-screen theme-transition bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            {t("categories.try_again") || "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {SeoComponent}

      <div className="min-h-screen theme-transition bg-gray-50 dark:bg-slate-900">
        {/* Header with i18n */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-2xl sm:text-4xl font-bold text-white mb-4">
                {t("categories.browse_categories")}
              </h1>
              <p className="text-lg text-green-100 max-w-2xl mx-auto mb-8">
                {t("categories.discover_products")}
              </p>

              {/* Search Bar */}
              <div className="max-w-md mx-auto">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-white/60" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("categories.search_placeholder")}
                    className="w-full pl-12 pr-10 py-3 rounded-lg border-0 focus:ring-2 focus:ring-white bg-white/10 backdrop-blur-sm text-white placeholder-white/70"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            // Skeleton grid
            <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-6">
              {[...Array(12)].map((_, i) => (
                <CategoryCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredCategories.length > 0 ? (
            <>
              {/* Result count */}
              <p className="text-sm text-gray-500 dark:text-slate-500 mb-4">
                {t("categories.showing_categories", { count: filteredCategories.length })}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-6">
                {filteredCategories.map((category, index) => (
                  <CategoryCard key={category.id} category={category} priority={index < 6} />
                ))}
              </div>
            </>
          ) : (
            // Empty state
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 dark:text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
                {t("categories.no_categories_found")}
              </h3>
              <p className="text-gray-600 dark:text-slate-400 max-w-md mx-auto mb-6">
                {searchQuery
                  ? t("categories.no_matching_categories", { query: searchQuery })
                  : t("categories.no_categories_available")}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                      {t("categories.clear_search")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CategoryBrowser;
