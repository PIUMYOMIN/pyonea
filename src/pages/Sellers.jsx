import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { StarIcon, ChevronDownIcon, FunnelIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";

import SellerCard from "../components/ui/SellerCard";
import Pagination from "../components/ui/Pagination";
import { SkeletonSellersPage } from "../components/ui/Skeleton";
import api from "../utils/api";
import useSEO from "../hooks/useSEO";

const Sellers = () => {
  const { t } = useTranslation();
  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortOption, setSortOption] = useState("rating");
  const [currentPage, setCurrentPage] = useState(1);
  const [sellersPerPage] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch sellers from API
  useEffect(() => {
    const fetchSellers = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/sellers?per_page=50');

        let sellersData = [];

        if (res.data && res.data.success) {
          sellersData = res.data.data?.data || res.data.data || [];
        } else {
          sellersData = res.data?.data || res.data || [];
        }

        if (sellersData && Array.isArray(sellersData) && sellersData.length > 0) {
          const transformedSellers = sellersData.map(seller => ({
            id: seller.id,
            name: seller.store_name || seller.user?.name || t('sellers.unknown_seller'),
            category: seller.business_type || t('sellers.uncategorized'),
            rating: parseFloat(seller.reviews_avg_rating) || 0,
            reviewCount: seller.reviews_count || 0,
            joined: seller.created_at,
            products: seller.products_count || 0,
            verified: seller.status === 'active' || seller.status === 'approved',
            originalData: seller
          }));

          setSellers(transformedSellers);
          setFilteredSellers(transformedSellers);
        } else {
          setSellers([]);
          setFilteredSellers([]);
        }
      } catch (err) {
        console.error("Failed to fetch sellers:", err);
        setError(t('sellers.fetch_error'));
        setSellers([]);
        setFilteredSellers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, [t]);

  // Categories for filtering
  const buildCategories = useCallback(() => [
    { id: "all", name: t("sellers.all_categories") },
    { id: "individual", name: t("sellers.individual") },
    { id: "company", name: t("sellers.company") },
    { id: "retail", name: t("sellers.retail") },
    { id: "wholesale", name: t("sellers.wholesale") },
    { id: "manufacturer", name: t("sellers.manufacturer") },
    { id: "Uncategorized", name: t("sellers.uncategorized") },
  ], [t]);

  const categories = useMemo(() => buildCategories(), [buildCategories]);

  // Sort options
  const buildSortOptions = useCallback(() => [
    { id: "rating", name: t("sellers.highest_rating") },
    { id: "reviewCount", name: t("sellers.most_reviews") },
    { id: "joined", name: t("sellers.newest") },
    { id: "name", name: t("sellers.alphabetical") },
  ], [t]);

  const sortOptions = useMemo(() => buildSortOptions(), [buildSortOptions]);

  // Filter and sort sellers
  useEffect(() => {
    let result = [...sellers];

    // Apply search filter
    if (searchTerm) {
      result = result.filter(seller =>
        seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (seller.category && seller.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      result = result.filter(seller => seller.category === selectedCategory);
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortOption === "rating") {
        return b.rating - a.rating;
      } else if (sortOption === "reviewCount") {
        return b.reviewCount - a.reviewCount;
      } else if (sortOption === "joined") {
        return new Date(b.joined) - new Date(a.joined);
      } else if (sortOption === "name") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    setFilteredSellers(result);
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, sortOption, sellers]);

  // Get current sellers
  const indexOfLastSeller = currentPage * sellersPerPage;
  const indexOfFirstSeller = indexOfLastSeller - sellersPerPage;
  const currentSellers = filteredSellers.slice(indexOfFirstSeller, indexOfLastSeller);

  // Change page
  const paginate = pageNumber => setCurrentPage(pageNumber);

  const SeoComponent = useSEO({
    title: t("seo.sellers.title"),
    description: t("seo.sellers.description"),
    url: "/sellers"
  });

  if (loading) return <SkeletonSellersPage />;

  if (error) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-slate-100">{t('sellers.error_title')}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                {t('sellers.try_again')}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {SeoComponent}
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-green-600 to-emerald-700">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60" />
          </div>
          <div className="relative max-w-7xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
            <div className="text-center">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                {t("sellers.title")}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mt-6 text-xl text-green-100 max-w-3xl mx-auto"
              >
                {t("sellers.subtitle")}
              </motion.p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-800 placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-slate-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder={t("sellers.search_placeholder")}
                  />
                </div>
              </div>

              {/* Mobile Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                {t("sellers.filters")}
              </button>

              {/* Category Filter - Desktop */}
              <div className="hidden md:block">
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="appearance-none block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-300">
                    <ChevronDownIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Sort Filter - Desktop */}
              <div className="hidden md:block">
                <div className="relative">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="appearance-none block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  >
                    {sortOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-300">
                    <ChevronDownIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Filters */}
            {showFilters && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:hidden">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    {t("sellers.category")}
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    {t("sellers.sort_by")}
                  </label>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  >
                    {sortOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sellers Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              {t("sellers.all_sellers")} <span className="text-green-600 dark:text-green-400">({filteredSellers.length})</span>
            </h2>
            {filteredSellers.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-slate-400 hidden md:block">
                {t('sellers.showing_results', {
                  start: Math.min(indexOfFirstSeller + 1, filteredSellers.length),
                  end: Math.min(indexOfLastSeller, filteredSellers.length),
                  total: filteredSellers.length
                })}
              </p>
            )}
          </div>

          {currentSellers.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 p-12 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-slate-800">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 dark:text-slate-500" />
              </div>
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-slate-100">{t('sellers.no_sellers_found')}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                {sellers.length === 0
                  ? t('sellers.no_sellers_available')
                  : t('sellers.no_matching_sellers')
                }
              </p>
              {sellers.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("all");
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                  >
                    {t('sellers.reset_filters')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentSellers.map(seller => (
                  <SellerCard key={seller.id} seller={seller} />
                ))}
              </div>

              {filteredSellers.length > sellersPerPage && (
                <Pagination
                  itemsPerPage={sellersPerPage}
                  totalItems={filteredSellers.length}
                  currentPage={currentPage}
                  paginate={paginate}
                />
              )}
            </>
          )}
        </div>

        {/* Become a Seller CTA */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
            <div className="lg:flex lg:items-center lg:justify-between">
              <div className="lg:w-0 lg:flex-1">
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {t("sellers.become_seller_title")}
                </h2>
                <p className="mt-3 max-w-3xl text-lg text-green-100">
                  {t("sellers.become_seller_description")}
                </p>
              </div>
              <div className="mt-8 lg:mt-0 lg:ml-8">
                <div className="inline-flex rounded-md shadow">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-green-700 bg-white hover:bg-gray-50"
                  >
                    {t("sellers.join_now")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sellers;
