import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon, XMarkIcon, AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import api from "../utils/api";
import ProductCard from "../components/ui/ProductCard";
import SearchFilters from "../components/marketplace/SearchFilters";
import CategorySelector from "../components/marketplace/CategorySelector";
import useSEO from "../hooks/useSEO";
import { useCart } from "../context/CartContext";
import { SITE_PUBLIC_URL } from "../config";
import { getImageUrl } from "../utils/imageHelpers";

const ProductCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700
                  shadow-sm overflow-hidden flex flex-col h-full animate-pulse">
    <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700" />
    <div className="p-3 flex flex-col flex-grow gap-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="flex-grow" />
      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  </div>
);

const ProductList = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [cartMessage, setCartMessage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const searchQuery   = queryParams.get("search")    || "";
  const categoryQuery = queryParams.get("category")  || "";
  const activeLang    = i18n.language?.startsWith("my") ? "my" : "en";
  const minPrice      = queryParams.get("min_price") || "";
  const maxPrice      = queryParams.get("max_price") || "";
  const sortBy        = queryParams.get("sort_by")   || "created_at";
  const sortOrder     = queryParams.get("sort_order")|| "desc";

  const [searchInput, setSearchInput]   = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState(categoryQuery || null);
  const [filters, setFilters] = useState({ minPrice, maxPrice, sortBy, sortOrder });
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const currencyLabel = t("common.currency.mmk", "MMK");
  const [error, setError]         = useState(null);
  const [categories, setCategories] = useState([]);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);

  const isFetching = useRef(false);
  const searchDebounceRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories?fields=id,name_en,name_mm,parent_id,children,products_count");
        const data = res.data.data || res.data || [];
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    setSearchInput(searchQuery);
    setSelectedCategory(categoryQuery || null);
    setFilters({ minPrice, maxPrice, sortBy, sortOrder });
    setPage(1);
    setHasMore(true);
  }, [location.search, searchQuery, categoryQuery, minPrice, maxPrice, sortBy, sortOrder]);

  useEffect(() => {
    return () => clearTimeout(searchDebounceRef.current);
  }, []);

  const fetchProducts = useCallback(async (reset = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("per_page", "24");
      params.append("page", reset ? "1" : page.toString());
      if (searchQuery)      params.append("search",     searchQuery);
      if (selectedCategory) params.append("category",   selectedCategory);
      if (filters.minPrice) params.append("min_price",  filters.minPrice);
      if (filters.maxPrice) params.append("max_price",  filters.maxPrice);
      params.append("sort_by",    filters.sortBy);
      params.append("sort_order", filters.sortOrder);
      params.append("fields", "id,name_en,name_mm,slug_en,price,selling_price,images,average_rating,review_count,quantity,total_stock,in_stock,is_active,moq,min_order_unit,quantity_unit,category_id,seller_id,is_on_sale,is_currently_on_sale,effective_discount_pct,discount_percentage,has_variants,category,seller");

      const response = await api.get("/products", { params });
      const data = response.data.data || response.data || [];

      if (reset) {
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...(Array.isArray(data) ? data : []).filter((p) => !ids.has(p.id))];
        });
      }

      if (data.length < 24) setHasMore(false);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError(t("products.fetch_error"));
      if (reset) setProducts([]);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [searchQuery, selectedCategory, filters, page, t]);

  useEffect(() => {
    fetchProducts(true);
  }, [searchQuery, selectedCategory, filters.minPrice, filters.maxPrice, filters.sortBy, filters.sortOrder]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching.current) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "300px" } // start loading 300px before sentinel is visible
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  useEffect(() => {
    if (page > 1) fetchProducts(false);
  }, [page, fetchProducts]);

  const handleAddToCart = async (productId, quantity) => {
    setCartMessage(null);
    try {
      const result = await addToCart(productId, quantity);
      setCartMessage({ type: "success", message: result.message || t("products.added_to_cart") });
      setTimeout(() => setCartMessage(null), 3000);
      return result;
    } catch (err) {
      setCartMessage({ type: "error", message: err.message || t("products.add_to_cart_failed") });
      setTimeout(() => setCartMessage(null), 3000);
      throw err;
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(location.search);
    if (searchInput.trim()) params.set("search", searchInput.trim());
    else params.delete("search");
    navigate(`/products?${params.toString()}`);
  };

  const debouncedSearch = useCallback((value) => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      if (value.trim()) params.set("search", value.trim());
      else params.delete("search");
      navigate(`/products?${params.toString()}`, { replace: true });
    }, 500);
  }, [location.search, navigate]);

  const handleFilterChange = useCallback((newFilters) => {
    const params = new URLSearchParams(location.search);
    if (newFilters.minPrice !== undefined) {
      if (newFilters.minPrice) params.set("min_price", newFilters.minPrice);
      else params.delete("min_price");
    }
    if (newFilters.maxPrice !== undefined) {
      if (newFilters.maxPrice) params.set("max_price", newFilters.maxPrice);
      else params.delete("max_price");
    }
    if (newFilters.sortBy)    params.set("sort_by",    newFilters.sortBy);
    if (newFilters.sortOrder) params.set("sort_order", newFilters.sortOrder);
    navigate(`/products?${params.toString()}`);
  }, [location.search, navigate]);

  const handleCategoryChange = useCallback((categoryId) => {
    const params = new URLSearchParams(location.search);
    if (categoryId) params.set("category", categoryId);
    else params.delete("category");
    navigate(`/products?${params.toString()}`);
  }, [location.search, navigate]);

  const clearFilters = useCallback(() => navigate("/products"), [navigate]);

  const getCategoryName = useCallback((categoryId) => {
    const find = (cats, id) => {
      for (const cat of cats) {
        if (cat.id == id) {
          return i18n.language === "my"
            ? (cat.name_mm || cat.name_en || cat.name)
            : (cat.name_en || cat.name_mm || cat.name);
        }
        if (cat.children) {
          const found = find(cat.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    return find(categories, categoryId) || t("products.category_id", { id: categoryId });
  }, [categories, i18n.language, t]);

  const getPageTitle = useMemo(() => {
    if (searchQuery && selectedCategory)
      return `${t("products.search_results_category", { query: searchQuery, category: getCategoryName(selectedCategory) })} | Wholesale Myanmar`;
    if (searchQuery)
      return `${t("products.search_results", { query: searchQuery })} | Wholesale Myanmar`;
    if (selectedCategory)
      return `${t("products.category_products", { category: getCategoryName(selectedCategory) })} | Myanmar Suppliers`;
    return t("seo.products.title");
  }, [searchQuery, selectedCategory, getCategoryName, t]);

  const metaDescription = useMemo(() => {
    if (searchQuery && selectedCategory)
      return t("products.seo_search_category", {
        query: searchQuery,
        category: getCategoryName(selectedCategory),
        count: products.length,
      });
    if (searchQuery)
      return t("products.seo_search", { query: searchQuery, count: products.length });
    if (selectedCategory)
      return t("products.seo_category", { category: getCategoryName(selectedCategory) });
    return t("products.seo_default");
  }, [searchQuery, selectedCategory, products.length, getCategoryName, t]);

  const productListingSchema = useMemo(() => {
    const seoParams = new URLSearchParams(location.search);
    seoParams.set("lang", activeLang);
    const seoSearch = seoParams.toString();
    const pageUrl = `${SITE_PUBLIC_URL}${location.pathname}${seoSearch ? `?${seoSearch}` : ""}`;
    const itemListElement = products.slice(0, 24).map((p, i) => {
      const path = p.slug_en || p.slug || p.id;
      const name = p.name_en || p.name_mm || "Product";
      let img;
      const primaryImage = p.images?.[0] || p.image;
      if (primaryImage) {
        const raw =
          typeof primaryImage === "string" ? primaryImage : primaryImage.url || primaryImage;
        const resolved = getImageUrl(raw);
        if (resolved && !resolved.includes("placeholder")) {
          img = resolved;
        }
      }
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Thing",
          name: name || t("productDetail.product"),
          url: `${SITE_PUBLIC_URL}/products/${path}?lang=${activeLang}`,
          ...(img ? { image: img } : {}),
        },
      };
    });
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: getPageTitle,
      description: metaDescription,
      url: pageUrl,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement,
      },
    };
  }, [products, location.pathname, location.search, getPageTitle, metaDescription, t, activeLang]);

  const seoParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.set("lang", activeLang);
    return params.toString();
  }, [location.search, activeLang]);
  const seoUrl = `${location.pathname}${seoParams ? `?${seoParams}` : ""}`;

  const SeoComponent = useSEO({
    title: getPageTitle,
    description: metaDescription,
    url: seoUrl,
    type: "website",
    schema: productListingSchema,
  });

  const hasActiveFilters = searchQuery || selectedCategory || filters.minPrice || filters.maxPrice;

  // ── Sidebar panel (shared between desktop sticky + mobile drawer) ──────────
  const SidebarContent = () => (
    <div className="space-y-6">
      {/* Filters card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("products.filters")}
          </h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
            >
              {t("products.clear_all")}
            </button>
          )}
        </div>
        <SearchFilters filters={filters} onFilterChange={handleFilterChange} />
      </div>

      {/* Categories card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t("products.categories") || "Categories"}
        </h2>
        <CategorySelector
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={(id) => {
            handleCategoryChange(id);
            setSidebarOpen(false);
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      {SeoComponent}

      {/* Cart toast */}
      {cartMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className={`relative px-6 py-4 rounded-xl shadow-xl max-w-sm text-center pointer-events-auto
                          ${cartMessage.type === "error"
                            ? "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"
                            : "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"
                          }`}>
            <p className="text-sm font-medium">{cartMessage.message}</p>
            <button
              onClick={() => setCartMessage(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-gray-50 dark:bg-gray-900
                          overflow-y-auto p-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{t("products.filters")}</span>
              <button onClick={() => setSidebarOpen(false)}>
                <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Search box */}
        <div className="mb-6">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative max-w-2xl mx-auto flex rounded-xl overflow-hidden
                            border border-gray-200 dark:border-gray-600
                            shadow-sm focus-within:ring-2 focus-within:ring-green-500
                            focus-within:border-green-500 transition-shadow">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  debouncedSearch(e.target.value);
                }}
                placeholder={t("products.search_placeholder")}
                className="flex-1 pl-10 pr-3 py-3 text-sm
                           bg-white dark:bg-gray-800
                           text-gray-900 dark:text-gray-100
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:outline-none"
              />
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white
                           px-5 py-3 text-sm font-medium transition-colors flex-shrink-0"
              >
                {t("products.search")}
              </button>
            </div>
          </form>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("products.active_filters")}:
            </span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                               bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                {t("products.search_filter", { query: searchQuery })}
                <button
                  onClick={() => {
                    const p = new URLSearchParams(location.search);
                    p.delete("search");
                    navigate(`/products?${p.toString()}`);
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-200 ml-0.5"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                               bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                {t("products.category_filter", { category: getCategoryName(selectedCategory) })}
                <button
                  onClick={() => {
                    const p = new URLSearchParams(location.search);
                    p.delete("category");
                    navigate(`/products?${p.toString()}`);
                  }}
                  className="hover:text-green-600 dark:hover:text-green-200 ml-0.5"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                               bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                {filters.minPrice && filters.maxPrice
                  ? `${filters.minPrice} – ${filters.maxPrice} ${currencyLabel}`
                  : filters.minPrice
                  ? `≥ ${filters.minPrice} ${currencyLabel}`
                  : `≤ ${filters.maxPrice} ${currencyLabel}`}
                <button
                  onClick={() => {
                    const p = new URLSearchParams(location.search);
                    p.delete("min_price");
                    p.delete("max_price");
                    navigate(`/products?${p.toString()}`);
                  }}
                  className="hover:text-purple-600 dark:hover:text-purple-200 ml-0.5"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 dark:text-gray-400
                         hover:text-gray-700 dark:hover:text-gray-200 ml-auto underline"
            >
              {t("products.clear_all")}
            </button>
          </div>
        )}

        {/* Layout */}
        <div className="flex gap-6 lg:gap-8">

          {/* Desktop sidebar */}
          <aside className="hidden md:block w-56 lg:w-64 flex-shrink-0">
            <div className="sticky top-20">
              <SidebarContent />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">

            {/* Title row + mobile filter toggle */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                All Products
              </h1>
              <div className="flex items-center gap-2 flex-shrink-0">
                {products.length > 0 && (
                  <span className="hidden sm:block text-xs text-gray-500 dark:text-gray-400">
                    {t("products.showing_count", { count: products.length })}
                    {hasMore && "+"}
                  </span>
                )}
                {/* Mobile filter button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                             border border-gray-200 dark:border-gray-600
                             bg-white dark:bg-gray-800
                             text-gray-700 dark:text-gray-300"
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4" />
                  {t("products.filters")}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-3 p-4 rounded-xl
                              bg-yellow-50 dark:bg-yellow-900/20
                              border border-yellow-200 dark:border-yellow-800">
                <svg className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">{error}</p>
              </div>
            )}

            {/* Product grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {loading && products.length === 0
                ? [...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)
                : products.length > 0
                ? products.map((product, idx) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      className="w-full"
                      onAddToCart={handleAddToCart}
                      imagePriority={idx < 6 && page === 1}
                    />
                  ))
                : !loading && (
                    <div className="col-span-full text-center py-16">
                      <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t("products.no_products_found")}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t("products.try_adjusting_search")}
                      </p>
                      <button
                        onClick={clearFilters}
                        className="mt-4 bg-green-600 hover:bg-green-700 text-white
                                   px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        {t("products.clear_filters")}
                      </button>
                    </div>
                  )}

              {/* Infinite scroll skeletons */}
              {loading && page > 1 &&
                [...Array(4)].map((_, i) => <ProductCardSkeleton key={`more-${i}`} />)
              }
            </div>

            {/* Sentinel — IntersectionObserver watches this to trigger next page */}
            <div ref={sentinelRef} className="h-1" />

            {/* Loading spinner */}
            {loading && products.length > 0 && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-gray-700 border-t-green-500" />
              </div>
            )}

            {/* End of results */}
            {!hasMore && products.length > 0 && (
              <p className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
                {t("products.no_more_products")}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductList;
