// Home.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import AnnouncementModal from "../components/ui/AnnouncementModal";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../utils/api";
import { getImageUrl } from "../utils/imageHelpers";
import { useAuth } from "../context/AuthContext";

import ProductCard from "../components/ui/ProductCard";
import SellerCard from "../components/ui/SellerCard";
import CategoryCard from "../components/ui/CategoryCard";
import useSEO from "../hooks/useSEO";


// Skeleton components for better loading states
const ProductCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full animate-pulse">
    <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700"></div>
    <div className="p-3 flex flex-col flex-grow gap-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      <div className="flex-grow" />
      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
    </div>
  </div>
);

const CategoryCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
    <div className="aspect-square bg-gray-200 dark:bg-gray-700"></div>
    <div className="p-3 sm:p-4 space-y-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  </div>
);

const SellerCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="mt-1 h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="mt-2 flex space-x-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      </div>
    </div>
  </div>
);

const Home = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isSeller, isBuyer, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [transformedSellers, setTransformedSellers] = useState([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [activeBanner, setActiveBanner]           = useState(null);
  const [bannerDismissed, setBannerDismissed]      = useState(false);
  const [bannerImgReady, setBannerImgReady]        = useState(false);
  const announcementFetched = useRef(false);
  const [loading, setLoading] = useState({
    categories: true,
    products: true,
    sellers: true
  });

  const ogImage = typeof window !== 'undefined'
    ? `${window.location.origin}/og-image.png`
    : '/og-image.png';

  const SeoComponent = useSEO({
    title: t("seo.home.title"),
    description: t("seo.home.description"),
    image: ogImage,
    url: "/"
  });

  const fetchCategories = useCallback(async () => {
    try {
      // Keep payload small for faster first paint.
      const res = await api.get(
        "/categories?fields=id,name_en,name_mm,image,products_count,parent_id,children&with_products_only=true"
      );

      let categoriesData = [];
      if (res.data.success && res.data.data) {
        categoriesData = res.data.data;
      } else if (Array.isArray(res.data)) {
        categoriesData = res.data;
      }

      const rootCategories = categoriesData.filter(cat => !cat.parent_id || cat.parent_id === null);
      const processedCategories = rootCategories.map((category) => ({
        ...category,
        productCount: category.products_count || 0,
        childrenCount: category.children ? category.children.length : 0
      }));

      setCategories(processedCategories.slice(0, 6));
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setCategories([]);
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  }, []);

  const fetchTopSellers = useCallback(async () => {
    try {
      const res = await api.get("/sellers?top=true&limit=4&fields=id,store_name,business_name,business_type,category,reviews_avg_rating,reviews_count,products_count,total_products,status,is_verified,logo,profile_image");
      const sellersData = res.data.data || res.data || [];
      setTopSellers(sellersData);

      const transformed = sellersData.map(seller => ({
        id: seller.id,
        name: seller.store_name || seller.business_name || t("home.unnamed_seller"),
        category: seller.business_type || seller.category || t("home.general_merchant"),
        rating: seller.reviews_avg_rating || seller.rating || 0,
        reviewCount: seller.reviews_count || 0,
        products: seller.products_count || seller.total_products || 0,
        verified: seller.status === "approved" || seller.status === "active" || seller.is_verified || false,
        image: seller.logo || seller.profile_image || null,
        originalData: seller
      }));
      setTransformedSellers(transformed);
    } catch (err) {
      console.error("Failed to fetch top sellers:", err);
      setTransformedSellers([]);
    } finally {
      setLoading(prev => ({ ...prev, sellers: false }));
    }
  }, [t]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get("/products?featured=true&per_page=20&fields=id,name_en,name_mm,slug_en,price,images,average_rating,review_count,quantity,is_active,moq,min_order_unit,category_id,seller_id,is_on_sale");
      setProducts(res.data.data || res.data || []);
    } catch (err) {
      console.error("Failed to fetch featured products:", err);
      setProducts([]);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      if (!isMounted) return;
      setLoading({ categories: true, products: true, sellers: true });
      try {
        await Promise.all([fetchCategories(), fetchTopSellers(), fetchProducts()]);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchAllData();
    return () => { isMounted = false; };
  }, [fetchCategories, fetchTopSellers, fetchProducts]);

  const getCTAButtonText = useCallback(() => {
    if (!isAuthenticated) return t("home.become_seller");
    if (isSeller())         return t("home.sell_now");
    if (isBuyer())          return t("home.shop_now");
    if (isAdmin())          return t("home.dashboard");
    return t("home.get_started");
  }, [isAuthenticated, isSeller, isBuyer, isAdmin, t]);

  const getCTAButtonLink = useCallback(() => {
    if (!isAuthenticated) return "/register";
    if (isSeller())        return "/seller/dashboard";
    if (isBuyer())         return "/products";
    if (isAdmin())         return "/admin/dashboard";
    return "/register";
  }, [isAuthenticated, isSeller, isBuyer, isAdmin]);

  const renderHeroSection = useMemo(() => (
    <div className="relative bg-gradient-to-r from-green-600 to-emerald-700">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gray-900 opacity-40" />
      </div>
      <div className="relative max-w-7xl mx-auto py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        {/* CSS animation instead of framer-motion — LCP element visible immediately */}
        <div className="text-center animate-fade-in-up">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
            {t("home.hero_title")}
          </h1>
          <p className="mt-3 sm:mt-6 text-sm sm:text-lg md:text-xl text-green-100 max-w-3xl mx-auto px-4">
            {t("home.hero_subtitle")}
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <div className="rounded-md shadow">
              <Link
                to={getCTAButtonLink()}
                className="w-full flex items-center justify-center px-6 py-3 sm:px-8 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-medium rounded-md text-green-700 bg-white hover:bg-gray-50 transition-colors"
              >
                {getCTAButtonText()}
              </Link>
            </div>
            <div className="rounded-md shadow">
              <Link
                to="/products"
                className="w-full flex items-center justify-center px-6 py-3 sm:px-8 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-medium rounded-md text-white bg-green-900 bg-opacity-60 hover:bg-opacity-70 transition-colors"
              >
                {t("home.browse_products")}
              </Link>
            </div>
          </div>
          {isAuthenticated && isBuyer() && (
            <div className="mt-4">
              <Link
                to="/register-seller"
                className="inline-block text-white hover:text-green-200 font-medium text-sm md:text-base transition-colors"
              >
                {t("home.become_seller_link")} →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  ), [getCTAButtonLink, getCTAButtonText, isAuthenticated, isBuyer, t]);

  // Static — no deps, renders once, h2 is the LCP element, must be immediate
  const renderCategoriesHeading = useMemo(() => (
    <div className="text-center">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
        {t("home.popular_categories")}
      </h2>
      <Link
        to="/categories"
        className="inline-block mt-2 sm:mt-2 text-sm sm:text-base text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium transition-colors"
      >
        {t("home.browse_all_categories")} →
      </Link>
    </div>
  ), [t]);

  // Dynamic — depends on loading state, re-renders when categories arrive
  const renderCategoriesGrid = useMemo(() => (
    loading.categories ? (
      <div className="mt-8 sm:mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => <CategoryCardSkeleton key={i} />)}
      </div>
    ) : categories.length > 0 ? (
      <div className="mt-8 sm:mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {categories.map((category, idx) => (
          <CategoryCard key={category.id} category={category} priority={idx < 2} />
        ))}
      </div>
    ) : (
      <div className="mt-8 sm:mt-10 text-center py-10 sm:py-12">
        <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">{t("home.no_categories_found")}</p>
        <Link
          to="/categories"
          className="inline-block mt-3 sm:mt-4 text-sm sm:text-base text-green-600 dark:text-green-400 hover:text-green-800 font-medium transition-colors"
        >
          {t("home.browse_categories")}
        </Link>
      </div>
    )
  ), [loading.categories, categories, t]);

  const renderCategoriesSection = useMemo(() => (
    <section className="py-10 sm:py-12 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {renderCategoriesHeading}
        {renderCategoriesGrid}
      </div>
    </section>
  ), [renderCategoriesHeading, renderCategoriesGrid]);

  const renderProductsSection = useMemo(() => (
    <section className="py-10 sm:py-12 bg-gray-50 dark:bg-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {t("home.featured_products")}
          </h2>
          <Link
            to="/products"
            className="text-sm sm:text-base text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium transition-colors"
          >
            {t("home.view_all")} →
          </Link>
        </div>

        <div className="mt-8 sm:mt-10 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {loading.products ? (
            [...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)
          ) : products.length > 0 ? (
            products.map((product, idx) => (
              <ProductCard
                key={product.slug_en || product.id}
                product={product}
                imagePriority={idx < 4}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-10 sm:py-12">
              <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">{t("home.no_featured_products")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  ), [loading.products, products, t]);

  const renderSellersSection = useMemo(() => (
    <section className="py-10 sm:py-12 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {t("home.top_sellers")}
          </h2>
          <Link
            to="/sellers"
            className="text-sm sm:text-base text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium transition-colors"
          >
            {t("home.view_all")} →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {loading.sellers ? (
            [...Array(4)].map((_, i) => <SellerCardSkeleton key={i} />)
          ) : transformedSellers.length > 0 ? (
            transformedSellers.map(seller => (
              <SellerCard key={seller.id} seller={seller} />
            ))
          ) : (
            <div className="col-span-full text-center py-10 sm:py-12">
              <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">{t("home.no_top_sellers")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  ), [loading.sellers, transformedSellers, t]);

  useEffect(() => {
    if (announcementFetched.current) return;
    announcementFetched.current = true;

    const fetchAnnouncements = async () => {
      try {
        const res = await api.get('/announcements');
        const list = res.data.data ?? [];

        const isEligible = (a) => {
          if (!a.show_once) return true;
          const key = `ann_seen_${a.id}_${new Date().toDateString()}`;
          return !localStorage.getItem(key);
        };

        const heroBanner = list.find(a => a.display_style === 'page_banner' && isEligible(a));
        if (heroBanner) {
          setBannerImgReady(false);
          setActiveBanner(heroBanner);
        }

        const popupAnn = list.find(a => a.display_style !== 'page_banner' && isEligible(a));
        if (popupAnn) {
          const delay = (popupAnn.delay_seconds ?? 1) * 1000;
          setTimeout(() => setActiveAnnouncement(popupAnn), delay);
        }
      } catch {
        // silently ignore — announcements are non-critical
      }
    };

    fetchAnnouncements();
  }, []);

  return (
    <>
      {activeAnnouncement && (
        <AnnouncementModal
          announcement={activeAnnouncement}
          onClose={() => setActiveAnnouncement(null)}
        />
      )}
      {SeoComponent}
      <div className="bg-gray-50 dark:bg-gray-900">
        {/* Hero area — render immediately without AnimatePresence so LCP
            registers as soon as JS loads, not after framer-motion boots.    */}
        {activeBanner && !bannerDismissed ? (
          <div className="banner-enter relative w-full overflow-hidden bg-black">
            {/* Reserve space until image decodes */}
            <div
              className={`relative w-full ${
                { '16:9': 'aspect-video', '4:3': 'aspect-[4/3]',
                  '3:1': 'aspect-[3/1]', '1:1': 'aspect-square' }[activeBanner.banner_aspect_ratio ?? '16:9']
                ?? 'aspect-[3/1]'
              } ${bannerImgReady ? '' : 'bg-gray-800 animate-pulse'}`}
            />
            {activeBanner.banner_link_url ? (
              activeBanner.banner_link_url.startsWith('http') ? (
                <a href={activeBanner.banner_link_url} target="_blank" rel="noopener noreferrer"
                   className="block w-full cursor-pointer">
                  <img
                    src={getImageUrl(activeBanner.image)}
                    alt={activeBanner.title}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    onLoad={() => setBannerImgReady(true)}
                    className={`w-full object-cover object-center ${
                      { '16:9': 'aspect-video', '4:3': 'aspect-[4/3]',
                        '3:1': 'aspect-[3/1]', '1:1': 'aspect-square' }[activeBanner.banner_aspect_ratio ?? '16:9']
                      ?? 'aspect-[3/1]'
                    } absolute inset-0 transition-opacity duration-300 ${bannerImgReady ? 'opacity-100' : 'opacity-0'}`}
                  />
                </a>
              ) : (
                <Link to={activeBanner.banner_link_url} className="block w-full cursor-pointer">
                  <img
                    src={getImageUrl(activeBanner.image)}
                    alt={activeBanner.title}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    onLoad={() => setBannerImgReady(true)}
                    className={`w-full object-cover object-center ${
                      { '16:9': 'aspect-video', '4:3': 'aspect-[4/3]',
                        '3:1': 'aspect-[3/1]', '1:1': 'aspect-square' }[activeBanner.banner_aspect_ratio ?? '16:9']
                      ?? 'aspect-[3/1]'
                    } absolute inset-0 transition-opacity duration-300 ${bannerImgReady ? 'opacity-100' : 'opacity-0'}`}
                  />
                </Link>
              )
            ) : (
              <img
                src={getImageUrl(activeBanner.image)}
                alt={activeBanner.title}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onLoad={() => setBannerImgReady(true)}
                className={`w-full object-cover object-center ${
                  { '16:9': 'aspect-video', '4:3': 'aspect-[4/3]',
                    '3:1': 'aspect-[3/1]', '1:1': 'aspect-square' }[activeBanner.banner_aspect_ratio ?? '16:9']
                  ?? 'aspect-[3/1]'
                } absolute inset-0 transition-opacity duration-300 ${bannerImgReady ? 'opacity-100' : 'opacity-0'}`}
              />
            )}

            {activeBanner.badge_label && (
              <span className={`absolute top-3 left-4 sm:top-4 sm:left-6 z-10
                                text-xs font-bold px-2.5 py-1 rounded-full shadow
                                ${{ green:'bg-green-500 text-white', red:'bg-red-500 text-white',
                                    blue:'bg-blue-500 text-white', yellow:'bg-yellow-400 text-gray-900',
                                    purple:'bg-purple-500 text-white', orange:'bg-orange-500 text-white',
                                 }[activeBanner.badge_color] ?? 'bg-green-500 text-white'}`}>
                {activeBanner.badge_label}
              </span>
            )}

            <button
              onClick={() => {
                if (activeBanner.show_once) {
                  const key = `ann_seen_${activeBanner.id}_${new Date().toDateString()}`;
                  localStorage.setItem(key, '1');
                }
                setBannerDismissed(true);
              }}
              aria-label="Dismiss banner"
              className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10
                         p-1.5 sm:p-2 bg-black/40 hover:bg-black/60
                         backdrop-blur-sm rounded-full text-white transition-colors"
            >
              <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        ) : (
          // Hero gradient — plain div, renders synchronously, no JS gate
          <div>
            {renderHeroSection}
          </div>
        )}

        {renderCategoriesSection}
        {renderProductsSection}
        {renderSellersSection}

        {/* Value Proposition */}
        <section className="py-12 sm:py-16 bg-gradient-to-r from-green-50 to-emerald-100 dark:from-gray-800 dark:to-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-sm sm:text-base text-green-600 dark:text-green-400 font-semibold tracking-wide uppercase">
                {t("home.why_us")}
              </h2>
              <p className="mt-2 text-xl sm:text-2xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t("home.why_choose_us")}
              </p>
              <p className="mt-3 sm:mt-4 max-w-2xl text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 lg:mx-auto">
                {t("home.why_choose_us_subtitle")}
              </p>
            </div>
            <div className="mt-8 sm:mt-10">
              <div className="space-y-8 sm:space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                {[
                  {
                    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                    title: t("home.secure_payments"),
                    desc:  t("home.secure_payments_desc"),
                  },
                  {
                    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
                    title: t("home.business_specific"),
                    desc:  t("home.business_specific_desc"),
                  },
                  {
                    icon: "M13 10V3L4 14h7v7l9-11h-7z",
                    title: t("home.fast_transactions"),
                    desc:  t("home.fast_transactions_desc"),
                  },
                  {
                    icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
                    title: t("home.support"),
                    desc:  t("home.support_desc"),
                  },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-md bg-green-500 text-white">
                        <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
                      <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-16 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-green-700 rounded-lg shadow-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-10 sm:py-12 md:py-16 md:px-12 lg:flex lg:items-center">
                <div className="lg:w-0 lg:flex-1">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
                    {t("home.cta_title")}
                  </h2>
                  <p className="mt-3 sm:mt-4 max-w-3xl text-base sm:text-lg text-green-100">
                    {t("home.cta_subtitle")}
                  </p>
                </div>
                <div className="mt-6 sm:mt-8 lg:mt-0 lg:ml-8">
                  <div className="inline-flex rounded-md shadow">
                    <Link
                      to={getCTAButtonLink()}
                      className="inline-flex items-center justify-center px-5 py-3 text-sm sm:text-base font-medium rounded-md text-green-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      {getCTAButtonText()}
                    </Link>
                  </div>
                  {isAuthenticated && isBuyer() && (
                    <div className="mt-3 text-center">
                      <Link
                        to="/register-seller"
                        className="inline-block text-green-100 hover:text-white text-xs sm:text-sm font-medium transition-colors"
                      >
                        {t("home.become_seller_link")} →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Home;
