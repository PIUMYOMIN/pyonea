import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  CubeIcon,
  TagIcon,
  XMarkIcon,
  PhotoIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon // added for discount column
} from "@heroicons/react/24/solid";
import {
  ChevronUpDownIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import api from "../../utils/api";
import ProductDiscountModal from "./ProductDiscountModal";

const ProductManagement = () => {
  const { t, i18n } = useTranslation();
  const loc = (en, mm) => i18n.language === 'my' ? (mm || en) : (en || mm);
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState([]);

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  // FIX: replaces window.confirm for image deletion
  const [deleteImageTarget, setDeleteImageTarget] = useState(null); // { product, imageIndex }

  // --------------------- Data fetching (initial & refresh) --------------------
  const fetchProducts = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const response = await api.get("/seller/products");
      if (response.data.success) {
        setProducts(response.data.data || []);
      } else {
        setError(response.data.message || "Failed to fetch products");
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch products");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get("/categories/all");
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, []);

  useEffect(() => {
    fetchProducts(true);
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // --------------------- Optimistic updates helpers ---------------------------
  const updateProductInState = (updatedProduct) => {
    setProducts(prev =>
      prev.map(p => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };

  const removeProductFromState = (productId) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  // --------------------- Delete (optimistic) ----------------------------------
  const confirmDelete = (product) => {
    setSelectedProduct(product);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    const productId = selectedProduct.id;
    // Optimistic remove
    removeProductFromState(productId);
    setDeleteModalOpen(false);
    setSelectedProduct(null);

    try {
      await api.delete(`/products/${productId}`);
      fetchProducts(false);
    } catch (error) {
      console.error("Delete error:", error);
      fetchProducts(true);
      setError(error.response?.data?.message || "Failed to delete product");
    }
  };

  // --------------------- Status toggle (optimistic) ---------------------------
  const confirmStatusToggle = (product) => {
    setSelectedProduct(product);
    setStatusTarget(!product.is_active);
    setStatusModalOpen(true);
  };

  const handleProductStatus = async () => {
    if (!selectedProduct) return;
    const originalProduct = { ...selectedProduct };
    const newStatus = statusTarget;

    // Optimistic update
    updateProductInState({ ...selectedProduct, is_active: newStatus });
    setStatusModalOpen(false);
    setSelectedProduct(null);
    setStatusTarget(null);

    try {
      // FIX: was calling PUT /products/{id} which doesn't exist for sellers.
      // The correct seller endpoint is PUT /seller/products/{id}.
      await api.put(`/seller/products/${selectedProduct.id}`, { is_active: newStatus });
      // Optionally refetch in background
      fetchProducts(false);
    } catch (error) {
      console.error("Status update error:", error);
      // Revert
      updateProductInState(originalProduct);
      setError(error.response?.data?.message || "Failed to update product status");
    }
  };

  // --------------------- Discount (update after modal) ------------------------
  const handleOpenDiscountModal = (product) => {
    setSelectedProduct(product);
    setDiscountModalOpen(true);
  };

  const handleDiscountSuccess = (updatedProduct) => {
    // If the modal returns the updated product, use it; otherwise refetch
    if (updatedProduct) {
      updateProductInState(updatedProduct);
    } else {
      fetchProducts(false);
    }
    setDiscountModalOpen(false);
    setSelectedProduct(null);
  };

  // --------------------- Image operations (optimistic) ------------------------
  const openImageGallery = (product) => {
    setSelectedProduct(product);
    setSelectedImages(getAllImages(product));
    setImageModalOpen(true);
  };

  const setPrimaryImage = async (product, imageIndex) => {
    const originalImages = [...product.images];
    // Optimistically update the product's images in state
    const updatedImages = product.images.map((img, idx) => ({
      ...img,
      is_primary: idx === imageIndex
    }));
    updateProductInState({ ...product, images: updatedImages });

    try {
      // FIX: was /products/{id}/... — correct seller route is /seller/products/{id}/...
      await api.post(`/seller/products/${product.id}/set-primary-image/${imageIndex}`);
      // Background sync
      fetchProducts(false);
    } catch (err) {
      console.error("Error setting primary image:", err);
      // Revert
      updateProductInState({ ...product, images: originalImages });
      setError(err.response?.data?.message || "Failed to set primary image");
    }
  };

  const deleteImage = async (product, imageIndex) => {
    // FIX: replaced window.confirm with inline modal state
    setDeleteImageTarget({ product, imageIndex });
  };

  const confirmDeleteImage = async () => {
    if (!deleteImageTarget) return;
    const { product, imageIndex } = deleteImageTarget;
    setDeleteImageTarget(null);

    const originalImages = [...product.images];
    const updatedImages = product.images.filter((_, idx) => idx !== imageIndex);
    updateProductInState({ ...product, images: updatedImages });

    try {
      await api.delete(`/seller/products/${product.id}/images/${imageIndex}`);
      fetchProducts(false);
    } catch (err) {
      console.error("Error deleting image:", err);
      updateProductInState({ ...product, images: originalImages });
      setError(err.response?.data?.message || "Failed to delete image");
    }
  };

  const handleImageUpload = async (product, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append("images[]", file));

    try {
      // FIX: was /products/{id}/upload-image — correct seller route is /seller/products/{id}/upload-image
      const response = await api.post(`/seller/products/${product.id}/upload-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (response.data.success) {
        // Refetch silently to get the new images list
        fetchProducts(false);
      }
    } catch (err) {
      console.error("Error uploading images:", err);
      setError(err.response?.data?.message || "Failed to upload images");
    }
  };

  // --------------------- Helper functions -------------------------
  // Normalise: API may return `images` (array) or `image` (single object)
  const resolveImages = (product) => {
    if (Array.isArray(product.images) && product.images.length > 0) return product.images;
    if (product.image) return [product.image];
    return [];
  };

  const resolveUrl = (img) => {
    if (!img) return "/placeholder-product.jpg";
    if (typeof img === "string") return img;
    return img.url || img.full_url || img.path || "/placeholder-product.jpg";
  };

  const getProductImage = (product) => {
    const imgs = resolveImages(product);
    return resolveUrl(imgs[0]);
  };

  const getPrimaryImage = (product) => {
    const imgs = resolveImages(product);
    const primary = imgs.find(img => img.is_primary);
    return resolveUrl(primary || imgs[0]);
  };

  const getAllImages = (product) => {
    return resolveImages(product).map(img => {
      if (typeof img === "string") return { url: img, is_primary: false, angle: "default" };
      return {
        url: img.url || img.full_url || img.path || "",
        is_primary: img.is_primary || false,
        angle: img.angle || "default",
      };
    }).filter(img => img.url);
  };

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getFilteredProducts = () => {
    let filtered = [...products];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.brand?.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(product =>
        statusFilter === "active" ? product.is_active : !product.is_active
      );
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(product => product.category_id == categoryFilter);
    }
    return filtered;
  };

  const getSortedProducts = () => {
    if (!sortConfig.key) return filteredProducts;
    return [...filteredProducts].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      if (sortConfig.key === "category" && a.category && b.category) {
        aValue = loc(a.category?.name_en, a.category?.name_mm) || "";
        bValue = loc(b.category?.name_en, b.category?.name_mm) || "";
      }
      if (sortConfig.key === "name") {
        aValue = aValue?.toLowerCase() || "";
        bValue = bValue?.toLowerCase() || "";
      }
      if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  };

  const filteredProducts = getFilteredProducts();
  const sortedProducts = getSortedProducts();

  const getStatusColor = (status) => (status ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" : "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300");
  const getStatusText = (isActive) => (isActive ? "active" : "inactive");

  const formatPrice = (price) => {
    if (!price) return "$0.00";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
  };

  const isProductOnSale = (product) => {
    return product.is_on_sale || product.discount_price || product.discount_percentage;
  };

  const getSaleBadge = (product) => {
    if (product.discount_percentage) return `-${product.discount_percentage}%`;
    if (product.discount_price) {
      const discount = product.price - product.discount_price;
      const percent = Math.round((discount / product.price) * 100);
      return `-${percent}%`;
    }
    return "Sale";
  };

  const getCurrentPrice = (product) => {
    if (isProductOnSale(product)) {
      if (product.discount_price) return product.discount_price;
      if (product.discount_percentage) {
        const discount = product.price * (product.discount_percentage / 100);
        return product.price - discount;
      }
    }
    return product.price;
  };

  // Stock status is now determined by the API-provided `in_stock` boolean
  // (from ProductListResource → Model::isInStock()), because stock is tracked
  // per-variant rather than at the product level. `total_stock` is the sum
  // across all active variants and is only non-null for physical products.
  const getStockStatus = (product) => {
    if (!product.in_stock) return { text: "Out of Stock", color: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300" };
    const total = product.total_stock;
    if (total != null && total <= 10) return { text: "Low Stock", color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300" };
    return { text: "In Stock", color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" };
  };

  // NEW: Helper to get discount info for display
  const getDiscountInfo = (product) => {
    if (!isProductOnSale(product)) {
      return { display: <span className="text-gray-400 text-xs">No discount</span>, badge: null };
    }
    const badge = getSaleBadge(product);
    let details = "";
    if (product.discount_percentage) {
      details = `${product.discount_percentage}% off`;
    } else if (product.discount_price) {
      details = `${formatPrice(product.discount_price)} (fixed)`;
    }
    return {
      display: (
        <div className="flex flex-col">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 w-fit">
            <SparklesIcon className="h-3 w-3 mr-1" />
            {badge}
          </span>
          {details && <span className="text-xs text-gray-600 dark:text-slate-400 mt-1">{details}</span>}
        </div>
      ),
      badge
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{error}</h3>
            <div className="mt-2">
              <button onClick={() => fetchProducts(true)} className="text-sm text-red-700 dark:text-red-400 underline hover:text-red-600 dark:hover:text-red-300">
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Delete image confirmation modal ── */}
      {deleteImageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Delete Image</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete this image? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteImageTarget(null)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteImage}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t("seller.product_management")}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t("seller.manage_your_products")}</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button
            onClick={() => fetchProducts(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5" />
            {t("seller.product.refresh")}
          </button>
          <button
            onClick={() => navigate("/seller/products/create")}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            {t("seller.product.add_product")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Search Products</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, SKU, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 dark:border-slate-600 rounded-md py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-md py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-md py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{loc(category.name_en, category.name_mm)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setCategoryFilter("all"); }}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <XMarkIcon className="mr-2 h-4 w-4" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mr-4"><CubeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mr-4"><CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Active Products</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{products.filter(p => p.is_active).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg mr-4"><TagIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">On Sale</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{products.filter(p => isProductOnSale(p)).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg mr-4"><CubeIcon className="h-6 w-6 text-red-600 dark:text-red-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{products.filter(p => !p.in_stock).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer" onClick={() => requestSort("category")}>
                  <div className="flex items-center">Category <ChevronUpDownIcon className="ml-1 h-4 w-4" /></div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer" onClick={() => requestSort("price")}>
                  <div className="flex items-center">Price <ChevronUpDownIcon className="ml-1 h-4 w-4" /></div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer" onClick={() => requestSort("total_stock")}>
                  <div className="flex items-center">Stock <ChevronUpDownIcon className="ml-1 h-4 w-4" /></div>
                </th>
                {/* NEW Discount Column */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-slate-400">
                    <div className="flex flex-col items-center">
                      <CubeIcon className="h-16 w-16 text-gray-400 dark:text-slate-600 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No products found</h3>
                      <p className="text-gray-600 dark:text-slate-400 mb-4 max-w-md mx-auto">
                        {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                          ? "No products match your filters. Try adjusting your search criteria."
                          : "You haven't added any products yet. Start by creating your first product listing."}
                      </p>
                      {!searchTerm && statusFilter === "all" && categoryFilter === "all" && (
                        <button onClick={() => navigate("/products/create")} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700">
                          Add Your First Product
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  const discountInfo = getDiscountInfo(product);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0 relative group">
                            <img
                              className="h-12 w-12 rounded-lg object-cover cursor-pointer"
                              src={getPrimaryImage(product)}
                              alt={product.name}
                              onClick={() => openImageGallery(product)}
                              onError={(e) => { e.target.src = "/placeholder-product.jpg"; }}
                            />
                            {isProductOnSale(product) && (
                              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                {getSaleBadge(product)}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                              <PhotoIcon className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{loc(product.name_en, product.name_mm) || "Unnamed Product"}</div>
                            <div className="flex items-center space-x-2">
                              {isProductOnSale(product) ? (
                                <>
                                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatPrice(getCurrentPrice(product))}</span>
                                  <span className="text-sm text-gray-400 dark:text-slate-500 line-through">{formatPrice(product.price)}</span>
                                </>
                              ) : (
                                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{formatPrice(product.price)}</span>
                              )}
                            </div>
                            {product.sku && <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">SKU: {product.sku}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{loc(product.category?.name_en, product.category?.name_mm) || "Uncategorized"}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-slate-100">
                        {isProductOnSale(product) ? (
                          <div className="space-y-1">
                            <div className="text-red-600 dark:text-red-400 font-bold">{formatPrice(getCurrentPrice(product))}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 line-through">{formatPrice(product.price)}</div>
                          </div>
                        ) : (
                          formatPrice(product.price)
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.text}{product.total_stock != null ? ` (${product.total_stock})` : ""}
                        </span>
                      </td>
                      {/* NEW Discount Column Data */}
                      <td className="px-6 py-4">
                        {discountInfo.display}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => confirmStatusToggle(product)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.is_active)}`}
                        >
                          {getStatusText(product.is_active)}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/products/${product.id}`)}
                            className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            title="View Product"
                          >
                            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleOpenDiscountModal(product)}
                            className={`p-1 rounded ${isProductOnSale(product) ? 'text-yellow-600 hover:text-yellow-900 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
                            title={isProductOnSale(product) ? "Edit Discount" : "Add Discount"}
                          >
                            <TagIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => navigate(`/seller/products/${product.id}/edit`)}
                            className="text-green-600 hover:text-green-900 dark:hover:text-green-400 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30"
                            title="Edit Product"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => confirmDelete(product)}
                            className="text-red-600 hover:text-red-900 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                            title="Delete Product"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals (unchanged) */}
      {deleteModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-md border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Confirm Delete</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">Are you sure you want to delete "{selectedProduct.name}"? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {statusModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-md border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Confirm Status Change</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              {statusTarget
                ? `Are you sure you want to activate "${selectedProduct.name}"? The product will be visible to customers.`
                : `Are you sure you want to deactivate "${selectedProduct.name}"? The product will be hidden from customers.`}
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setStatusModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600">Cancel</button>
              <button onClick={handleProductStatus} className={`px-4 py-2 text-sm font-medium text-white rounded-md ${statusTarget ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
                {statusTarget ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {discountModalOpen && selectedProduct && (
        <ProductDiscountModal
          product={selectedProduct}
          onClose={() => setDiscountModalOpen(false)}
          onSuccess={handleDiscountSuccess}
        />
      )}

      {imageModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{selectedProduct.name} - Images</h3>
              <button onClick={() => setImageModalOpen(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              {selectedImages.length === 0 ? (
                <div className="text-center py-8"><PhotoIcon className="h-12 w-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-slate-400">No images available for this product.</p></div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img src={image.url} alt={`Product image ${index + 1}`} className="w-full h-48 object-cover rounded-lg" onError={(e) => { e.target.src = "/placeholder-product.jpg"; }} />
                      {image.is_primary && <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">Primary</div>}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <div className="flex space-x-2">
                          {!image.is_primary && (
                            <button onClick={() => setPrimaryImage(selectedProduct, index)} className="bg-white text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-100">Set Primary</button>
                          )}
                          <button onClick={() => deleteImage(selectedProduct, index)} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-slate-400">{selectedImages.length} image(s)</p>
                <div className="flex space-x-2">
                  <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700">
                    Add Images
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(selectedProduct, Array.from(e.target.files))} />
                  </label>
                  <button onClick={() => setImageModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700">Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;