// components/admin/ProductManagement.jsx
import React, { useCallback, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import api from "../../utils/api";
import { IMAGE_BASE_URL, DEFAULT_PLACEHOLDER } from "../../config";
import { useNavigate } from "react-router-dom";
import ProductManagementTable from "../Shared/ProductManagementTable";

const ProductManagement = () => {
  const { t, i18n } = useTranslation();
  const controlClass = "h-10 w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm text-gray-900 dark:text-slate-100 shadow-sm transition-colors focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";
  const iconButtonClass = "inline-flex h-10 items-center justify-center rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 text-sm font-medium text-gray-700 dark:text-slate-300 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const navigate = useNavigate();
  const bulkActionLabel = bulkAction ? t(`admin.productManagement.bulkActions.${bulkAction}Selected`) : bulkAction;

  // Modal state — replaces alert/confirm/prompt
  const [deleteModal, setDeleteModal] = useState(null);  // { id, name } | null
  const [approveModal, setApproveModal] = useState(null);  // { id, name } | null
  const [rejectModal, setRejectModal] = useState(null);  // { id, name } | null
  const [rejectReason, setRejectReason] = useState("");
  const [bulkModal, setBulkModal] = useState(false);

  // Toast notifications — action-level feedback visible without hiding the table
  const [notifications, setNotifications] = useState([]);

  const addNotification = (type, title, message) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000);
  };

  const dismissNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  // Preview modal state
  const [previewProduct, setPreviewProduct] = useState(null); // product object | null
  const [previewLoading, setPreviewLoading] = useState(false);

  // Open preview modal — fetch full details from admin endpoint so pending/rejected products work
  const handlePreview = async (product) => {
    setPreviewProduct(product); // show immediately with list data
    setPreviewLoading(true);
    try {
      const response = await api.get(`/admin/products/${product.id}`);
      if (response.data.success) {
        setPreviewProduct(response.data.data);
      }
    } catch {
      // keep the list-level data already set above
    } finally {
      setPreviewLoading(false);
    }
  };

  // Fetch products (admin endpoint)
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        per_page: 100,
        include: "category,seller",
        ...(approvalFilter !== "all" && { status: approvalFilter }),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { is_active: statusFilter === "active" }),
        ...(categoryFilter !== "all" && { category_id: categoryFilter }),
      };

      const response = await api.get("/admin/products", { params });

      if (response.data.success) {
        setProducts(response.data.data || []);
      } else {
        setProducts(response.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError(err.response?.data?.message || t("admin.productManagement.errors.failedLoadProducts"));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [approvalFilter, categoryFilter, searchTerm, statusFilter, t]);

  // Fetch categories for filter
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get("/categories?per_page=50");
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Re-fetch when filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle product status change (active/inactive)
  const handleProductStatus = async (productId, isActive, productName) => {
    try {
      await api.patch(`/admin/products/${productId}/toggle-status`, { is_active: isActive });

      // Update local state
      setProducts(prev => prev.map(product =>
        product.id === productId
          ? { ...product, is_active: isActive }
          : product
      ));
      addNotification(
        'success',
        t('admin.productManagement.notifications.statusUpdated'),
        isActive
          ? t('admin.productManagement.notifications.statusActivatedMsg', { name: productName })
          : t('admin.productManagement.notifications.statusDeactivatedMsg', { name: productName })
      );
    } catch (error) {
      console.error("Failed to update product status:", error);
      addNotification(
        'error',
        t('admin.productManagement.notifications.statusUpdateFailed'),
        t('admin.productManagement.notifications.statusFailMsg', {
          name: productName,
          reason: error.response?.data?.message || t('admin.productManagement.errors.unknownError')
        })
      );
    }
  };

  const handleProductFeatured = async (productId, isFeatured, productName) => {
    try {
      await api.patch(`/admin/products/${productId}/toggle-featured`, { is_featured: isFeatured });

      setProducts(prev => prev.map(product =>
        product.id === productId
          ? { ...product, is_featured: isFeatured }
          : product
      ));

      addNotification(
        'success',
        isFeatured ? 'Product featured' : 'Product unfeatured',
        isFeatured
          ? `${productName} is now shown in featured products.`
          : `${productName} was removed from featured products.`
      );
    } catch (error) {
      console.error("Failed to update featured status:", error);
      addNotification(
        'error',
        'Featured update failed',
        `Could not update featured status for ${productName}. ${error.response?.data?.message || t('admin.productManagement.errors.unknownError')}`
      );
    }
  };

  // Approve product — FIX: was using window.confirm, now uses approveModal state
  const handleApprove = async () => {
    if (!approveModal) return;
    try {
      await api.post(`/admin/products/${approveModal.id}/approve`);
      addNotification(
        'success',
        t('admin.productManagement.notifications.approved'),
        t('admin.productManagement.notifications.approveSuccessMsg', { name: approveModal.name })
      );
      setApproveModal(null);
      await fetchProducts();
    } catch (error) {
      addNotification(
        'error',
        t('admin.productManagement.notifications.approveFailed'),
        t('admin.productManagement.notifications.approveFailMsg', {
          name: approveModal.name,
          reason: error.response?.data?.message || t('admin.productManagement.errors.unknownError')
        })
      );
      setApproveModal(null);
    }
  };

  // Reject product
  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await api.post(`/admin/products/${rejectModal.id}/reject`, { reason: rejectReason });
      addNotification(
        'success',
        t('admin.productManagement.notifications.rejected'),
        t('admin.productManagement.notifications.rejectSuccessMsg', { name: rejectModal.name })
      );
      await fetchProducts();
    } catch (error) {
      addNotification(
        'error',
        t('admin.productManagement.notifications.rejectFailed'),
        t('admin.productManagement.notifications.rejectFailMsg', {
          name: rejectModal.name,
          reason: error.response?.data?.message || t('admin.productManagement.errors.unknownError')
        })
      );
    } finally {
      setRejectModal(null);
      setRejectReason("");
    }
  };

  // Handle product deletion
  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await api.delete(`/admin/products/${deleteModal.id}`);
      addNotification(
        'success',
        t('admin.productManagement.notifications.deleted'),
        t('admin.productManagement.notifications.deleteSuccessMsg', { name: deleteModal.name })
      );
      fetchProducts();
    } catch (error) {
      addNotification(
        'error',
        t('admin.productManagement.notifications.deleteFailed'),
        t('admin.productManagement.notifications.deleteFailMsg', {
          name: deleteModal.name,
          reason: error.response?.data?.message || t('admin.productManagement.errors.unknownError')
        })
      );
    } finally {
      setDeleteModal(null);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (selectedProducts.length === 0) {
      addNotification('warning',
        t('admin.productManagement.notifications.noProductsSelected'),
        t('admin.productManagement.notifications.noProductsSelectedMsg')
      );
      return;
    }
    if (!bulkAction) {
      addNotification('warning',
        t('admin.productManagement.notifications.noActionSelected'),
        t('admin.productManagement.notifications.noActionSelectedMsg')
      );
      return;
    }
    setBulkModal(true);
  };

  const executeBulkAction = async () => {
    setBulkModal(false);
    const count = selectedProducts.length;
    try {
      // FIX: activate/deactivate now use the correct admin toggle-status route.
      // FIX: batch requests sequentially in chunks of 5 instead of all at once
      // to avoid overwhelming the server on large selections.
      const chunks = [];
      for (let i = 0; i < selectedProducts.length; i += 5) {
        chunks.push(selectedProducts.slice(i, i + 5));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map(productId => {
          const product = products.find(item => item.id === productId);
          if (bulkAction === "delete") return api.delete(`/admin/products/${productId}`);
          if (bulkAction === "activate") {
            if (product?.is_active === true) return Promise.resolve();
            return api.patch(`/admin/products/${productId}/toggle-status`, { is_active: true });
          }
          if (bulkAction === "deactivate") {
            if (product?.is_active === false) return Promise.resolve();
            return api.patch(`/admin/products/${productId}/toggle-status`, { is_active: false });
          }
          if (bulkAction === "approve") return api.post(`/admin/products/${productId}/approve`);
          if (bulkAction === "reject") return api.post(`/admin/products/${productId}/reject`);
          return Promise.resolve();
        }));
      }

      addNotification(
        'success',
        t('admin.productManagement.notifications.bulkSuccess'),
        t('admin.productManagement.notifications.bulkSuccessMsg', { count, action: bulkActionLabel })
      );
      fetchProducts();
      setSelectedProducts([]);
      setBulkAction("");
    } catch (error) {
      addNotification(
        'error',
        t('admin.productManagement.notifications.bulkFailed'),
        t('admin.productManagement.notifications.bulkFailMsg', {
          action: bulkActionLabel,
          reason: error.response?.data?.message || t('admin.productManagement.errors.unknownError')
        })
      );
    }
  };

  // Toggle product selection
  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Toggle all products selection
  const toggleAllProductsSelection = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Client‑side sorting (could be moved to server)
  const filteredProducts = [...products]
    .sort((a, b) => {
      const aValue = a[sortField] ?? "";
      const bValue = b[sortField] ?? "";

      // Use numeric comparison for date strings so newest-first sorts correctly
      const isDate = sortField === "created_at" || sortField === "updated_at" || sortField === "approved_at";
      let cmp;
      if (isDate) {
        cmp = new Date(aValue).getTime() - new Date(bValue).getTime();
      } else {
        cmp = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }

      return sortDirection === "asc" ? cmp : -cmp;
    });

  // Format price in MMK
  const formatMMK = (amount) => {
    const num = Number(amount) || 0;
    const formattedNumber = new Intl.NumberFormat("en-MM", {
      minimumFractionDigits: 0
    }).format(num);
    return `${formattedNumber} ${t('common.currency.mmk', 'MMK')}`;
  };

  const getLocalizedText = (item, field) => {
    const currentLang = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase();
    const primaryKey = `${field}_${currentLang.startsWith("my") ? "mm" : "en"}`;
    const fallbackKey = `${field}_${currentLang.startsWith("my") ? "en" : "mm"}`;
    return item?.[primaryKey] || item?.[fallbackKey] || "";
  };

  // Get product primary image URL — handles images (array) or image (single object)
  const getProductImage = (product) => {
    // Normalise to an array regardless of API shape
    let imgs = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      imgs = product.images;
    } else if (product.image) {
      imgs = [product.image];
    } else if (typeof product.images === 'string') {
      try { imgs = JSON.parse(product.images); } catch { /* ignore */ }
    }

    if (!imgs.length) return DEFAULT_PLACEHOLDER;

    const primary = imgs.find(i => i?.is_primary) || imgs[0];
    if (!primary) return DEFAULT_PLACEHOLDER;
    if (typeof primary === 'string') {
      return primary.startsWith('http') ? primary : `${IMAGE_BASE_URL}/${primary.replace('public/', '')}`;
    }
    const url = primary.url || primary.path || '';
    if (!url) return DEFAULT_PLACEHOLDER;
    return url.startsWith('http') ? url : `${IMAGE_BASE_URL}/${url.replace('public/', '')}`;
  };

  // Get approval status badge
  const getApprovalBadge = (status) => {
    switch (status) {
      case 'approved':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-800 dark:text-green-300',
          icon: CheckCircleIcon,
          label: t('admin.productManagement.table.approved')
        };
      case 'pending':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-800 dark:text-yellow-300',
          icon: ClockIcon,
          label: t('admin.productManagement.table.pending')
        };
      case 'rejected':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-800 dark:text-red-300',
          icon: XCircleIcon,
          label: t('admin.productManagement.table.rejected')
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-slate-700',
          text: 'text-gray-800 dark:text-slate-300',
          icon: null,
          label: status || t('admin.productManagement.table.unknown', 'Unknown')
        };
    }
  };

  // Helper: check if product is on sale
  const isProductOnSale = (product) => {
    return product.is_on_sale || product.discount_price || product.discount_percentage;
  };

  // Helper: get sale badge text
  const getSaleBadge = (product) => {
    if (product.discount_percentage) return `-${product.discount_percentage}%`;
    if (product.discount_price) {
      const discount = product.price - product.discount_price;
      const percent = Math.round((discount / product.price) * 100);
      return `-${percent}%`;
    }
    return t('admin.productManagement.sale', 'Sale');
  };

  // Helper: get discount details for display
  const getDiscountInfo = (product) => {
    if (!isProductOnSale(product)) {
      return { display: <span className="text-gray-400 text-xs">—</span>, badge: null };
    }
    const badge = getSaleBadge(product);
    let details = "";
    if (product.discount_percentage) {
      details = `${product.discount_percentage}% off`;
    } else if (product.discount_price) {
      details = `${formatMMK(product.discount_price)} (fixed)`;
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

  // DataTable columns
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
          onChange={toggleAllProductsSelection}
          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
        />
      ),
      accessor: "selection",
      width: "50px"
    },
    {
      header: t("admin.productManagement.table.image"),
      accessor: "image",
      isImage: true,
      width: "80px"
    },
    {
      header: (
        <button
          onClick={() => handleSort("name_en")}
          className="flex items-center hover:text-gray-900 dark:hover:text-slate-100"
        >
          {t("admin.productManagement.table.name")}
          {sortField === "name_en" && (
            <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      ),
      accessor: "name"
    },
    { header: t("admin.productManagement.table.sku"), accessor: "sku" },
    {
      header: (
        <button
          onClick={() => handleSort("category.name_en")}
          className="flex items-center hover:text-gray-900 dark:hover:text-slate-100"
        >
          {t("admin.productManagement.table.category")}
          {sortField === "category.name_en" && (
            <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      ),
      accessor: "category"
    },
    {
      header: (
        <button
          onClick={() => handleSort("price")}
          className="flex items-center hover:text-gray-900 dark:hover:text-slate-100"
        >
          {t("admin.productManagement.table.price")}
          {sortField === "price" && (
            <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      ),
      accessor: "price",
      isCurrency: true
    },
    {
      header: (
        <button
          onClick={() => handleSort("total_stock")}
          className="flex items-center hover:text-gray-900 dark:hover:text-slate-100"
        >
          {t("admin.productManagement.table.stock")}
          {sortField === "total_stock" && (
            <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      ),
      accessor: "stock"
    },
    {
      header: t("admin.productManagement.table.discount"),
      accessor: "discount",
      width: "120px"
    },
    { header: t("admin.productManagement.table.moq"), accessor: "min_order" },
    {
      header: (
        <button
          onClick={() => handleSort("is_featured")}
          className="flex items-center hover:text-gray-900 dark:hover:text-slate-100"
        >
          Featured
          {sortField === "is_featured" && (
            <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      ),
      accessor: "featured"
    },
    {
      header: (
        <button
          onClick={() => handleSort("status")}
          className="flex items-center hover:text-gray-900 dark:hover:text-slate-100"
        >
          {t("admin.productManagement.table.approvalStatus")}
          {sortField === "status" && (
            <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      ),
      accessor: "approvalStatus"
    },
    {
      header: (
        <button
          onClick={() => handleSort("is_active")}
          className="flex items-center hover:text-gray-900 dark:hover:text-slate-100"
        >
          {t("admin.productManagement.table.activeInactive")}
          {sortField === "is_active" && (
            <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      ),
      accessor: "status"
    },
    {
      header: (
        <button
          onClick={() => handleSort("created_at")}
          className="flex items-center hover:text-gray-900 dark:hover:text-slate-100"
        >
          {t("admin.productManagement.table.created")}
          {sortField === "created_at" && (
            <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      ),
      accessor: "created_at"
    },
    { header: t("admin.productManagement.table.actions"), accessor: "actions", width: "200px" }
  ];

  // Prepare data for DataTable
  const productData = filteredProducts.map((product) => {
    const approvalBadge = getApprovalBadge(product.status);
    const ApprovalIcon = approvalBadge.icon;
    const discountInfo = getDiscountInfo(product);

    return {
      ...product,
      selection: (
        <input
          type="checkbox"
          checked={selectedProducts.includes(product.id)}
          onChange={() => toggleProductSelection(product.id)}
          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
        />
      ),
      image: (
        <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 flex-shrink-0">
          <img loading="lazy"
            src={getProductImage(product)}
            alt={product.name_en || 'Product'}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_PLACEHOLDER; }}
          />
        </div>
      ),
      name: (
        <div>
          <div className="font-medium text-gray-900 dark:text-slate-100">{product.name_en}</div>
          {product.name_mm && (
            <div className="text-sm text-gray-500 dark:text-slate-400">{product.name_mm}</div>
          )}
        </div>
      ),
      sku: (
        <span className="font-mono text-sm text-gray-600 dark:text-slate-400">
          {product.sku || t("admin.productManagement.table.na")}
        </span>
      ),
      category: (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
          {product.category?.name_en || t("admin.productManagement.table.uncategorized")}
        </span>
      ),
      price: formatMMK(product.price),
      stock: (() => {
        // total_stock is null for digital/service products (no stock tracking)
        if (product.total_stock === null || product.total_stock === undefined) {
          if (product.product_type && product.product_type !== 'physical') {
            return <span className="text-gray-400 dark:text-slate-500 text-xs">—</span>;
          }
        }
        const qty = product.total_stock ?? 0;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium tabular-nums ${qty <= 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-slate-100'}`}>
              {qty.toLocaleString()}
            </span>
            {qty <= 0 && (
              <span className="text-xs text-red-500 dark:text-red-400 whitespace-nowrap">{t("admin.productManagement.table.outOfStock")}</span>
            )}
            {qty > 0 && qty <= 5 && (
              <span className="text-xs text-amber-500 dark:text-amber-400 whitespace-nowrap">{t("admin.productManagement.table.lowStock")}</span>
            )}
          </div>
        );
      })(),
      discount: discountInfo.display,
      min_order: (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300">
          {product.min_order || product.moq || 1}
        </span>
      ),
      featured: (
        <button
          type="button"
          onClick={() => handleProductFeatured(product.id, !product.is_featured, product.name_en)}
          className={`inline-flex min-w-[92px] items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            product.is_featured
              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
          title={product.is_featured ? 'Remove from featured products' : 'Show in featured products'}
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          {product.is_featured ? 'Featured' : 'Feature'}
        </button>
      ),
      approvalStatus: (
        <div className="flex flex-col gap-1">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${approvalBadge.bg} ${approvalBadge.text}`}>
            {ApprovalIcon && <ApprovalIcon className="h-3 w-3 mr-1" />}
            {approvalBadge.label}
            {product.approved_at && (
              <span className="ml-1 text-xs opacity-75">
                ({new Date(product.approved_at).toLocaleDateString()})
              </span>
            )}
          </span>
          {/* FIX: show rejection reason when present so admin can see reason at a glance */}
          {product.rejection_reason && (
            <span className="text-xs text-red-600 dark:text-red-400 max-w-[180px] truncate" title={product.rejection_reason}>
              ↳ {product.rejection_reason}
            </span>
          )}
        </div>
      ),
      status: (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${product.is_active
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
          }`}>
          {product.is_active ? (
            <>
              <CheckCircleIcon className="h-3 w-3 mr-1" />
              {t("admin.productManagement.table.active")}
            </>
          ) : (
            <>
              <XCircleIcon className="h-3 w-3 mr-1" />
              {t("admin.productManagement.table.inactive")}
            </>
          )}
        </span>
      ),
      created_at: new Date(product.created_at).toLocaleDateString(),
      actions: (
        <div className="flex space-x-2 items-center">
          <button
            className="inline-flex items-center p-1.5 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700 rounded"
            onClick={() => handlePreview(product)}
            title={t("admin.productManagement.buttons.preview")}
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            className="inline-flex items-center p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"
            onClick={() => navigate(`/admin/products/${product.id}/edit`)}
            title={t("admin.productManagement.buttons.edit")}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            className="inline-flex items-center p-1.5 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            onClick={() => setDeleteModal({ id: product.id, name: product.name_en })}
            title={t("admin.productManagement.buttons.delete")}
          >
            <TrashIcon className="h-4 w-4" />
          </button>

          {/* Approval actions — pending products can be approved or rejected */}
          {product.status === 'pending' && (
            <>
              <button
                onClick={() => setApproveModal({ id: product.id, name: product.name_en })}
                className="inline-flex items-center p-1.5 text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                title={t("admin.productManagement.buttons.approve")}
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setRejectModal({ id: product.id, name: product.name_en }); setRejectReason(""); }}
                className="inline-flex items-center p-1.5 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                title={t("admin.productManagement.buttons.reject")}
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </>
          )}

          {/* FIX: rejected products can now be re-approved (backend updated to allow it) */}
          {product.status === 'rejected' && (
            <button
              onClick={() => setApproveModal({ id: product.id, name: product.name_en })}
              className="inline-flex items-center px-2 py-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded border border-green-200 dark:border-green-800"
              title={t("admin.productManagement.table.reApprove")}
            >
              {t("admin.productManagement.table.reApprove")}
            </button>
          )}

          {/* Active/Inactive toggle only for approved products */}
          {product.status === 'approved' && (
            <select
              value={product.is_active ? "active" : "inactive"}
              onChange={(e) => handleProductStatus(product.id, e.target.value === "active", product.name_en)}
              className="text-xs border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          )}
        </div>
      )
    };
  });

  const adminTableColumns = columns.map((column) => ({
    key: column.accessor,
    header: column.header,
    align: column.accessor === "actions" ? "right" : undefined,
    render: (row) => row[column.accessor],
  }));

  return (
    <div className="space-y-6">

      {/* ── Toast notifications (action-level feedback) ── */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm ${n.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700'
                : n.type === 'warning'
                  ? 'bg-yellow-50 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-700'
                  : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700'
                }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${n.type === 'success' ? 'text-green-800 dark:text-green-200'
                  : n.type === 'warning' ? 'text-yellow-800 dark:text-yellow-200'
                    : 'text-red-800 dark:text-red-200'
                  }`}>{n.title}</p>
                {n.message && (
                  <p className={`mt-0.5 leading-snug ${n.type === 'success' ? 'text-green-700 dark:text-green-300'
                    : n.type === 'warning' ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-red-700 dark:text-red-300'
                    }`}>{n.message}</p>
                )}
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                className={`flex-shrink-0 mt-0.5 ${n.type === 'success' ? 'text-green-500 hover:text-green-700 dark:text-green-400'
                  : n.type === 'warning' ? 'text-yellow-500 hover:text-yellow-700 dark:text-yellow-400'
                    : 'text-red-500 hover:text-red-700 dark:text-red-400'
                  }`}
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Approve confirmation modal ── */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">{t("admin.productManagement.modals.approveProduct")}</h3>
            <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 truncate">"{approveModal.name}"</p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              {t("admin.productManagement.modals.approveConfirm")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setApproveModal(null)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                {t("admin.productManagement.modals.cancel")}
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                {t("admin.productManagement.modals.approve")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">{t("admin.productManagement.modals.deleteProduct")}</h3>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 truncate">"{deleteModal.name}"</p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              {t("admin.productManagement.modals.deleteConfirm")}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModal(null)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">{t("admin.productManagement.modals.cancel")}</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">{t("admin.productManagement.modals.delete")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject reason modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">{t("admin.productManagement.modals.rejectProduct")}</h3>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 truncate">"{rejectModal.name}"</p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">{t("admin.productManagement.modals.rejectReason")}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:text-slate-100 bg-white dark:bg-slate-700 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-slate-500"
              placeholder={t("admin.productManagement.modals.rejectionReasonPlaceholder")}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">{t("admin.productManagement.modals.cancel")}</button>
              <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">{t("admin.productManagement.modals.reject")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk action confirmation modal ── */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">{t("admin.productManagement.modals.confirmBulkAction")}</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              {t("admin.productManagement.modals.bulkConfirm", { action: bulkActionLabel, count: selectedProducts.length })}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBulkModal(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">{t("admin.productManagement.modals.cancel")}</button>
              <button onClick={executeBulkAction} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">{t("admin.productManagement.modals.confirm")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product preview modal ── */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t("admin.productManagement.modals.productPreview")}</h3>
              <div className="flex items-center gap-2">
                {/* Quick-action buttons from within the preview */}
                {previewProduct.status === 'pending' && (
                  <>
                    <button
                      onClick={() => { setPreviewProduct(null); setApproveModal({ id: previewProduct.id, name: previewProduct.name_en }); }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                    >
                      <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => { setPreviewProduct(null); setRejectModal({ id: previewProduct.id, name: previewProduct.name_en }); setRejectReason(""); }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
                    >
                      <XCircleIcon className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setPreviewProduct(null)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {previewLoading && (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500 mr-2"></div>
                <span className="text-xs text-gray-500 dark:text-slate-400">{t("admin.productManagement.modals.loadingFullDetails")}</span>
              </div>
            )}

            <div className="p-6 space-y-5">
              {/* Images */}
              {(() => {
                const imgs = Array.isArray(previewProduct.images) ? previewProduct.images : [];
                const primary = imgs.find(i => i?.is_primary) || imgs[0];
                if (!primary) return (
                  <div className="h-48 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">{t("admin.productManagement.modals.noImage")}</div>
                );
                return (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {imgs.map((img, idx) => {
                      const imgSrc = img.url || img.path || DEFAULT_PLACEHOLDER;
                      return (
                        <img loading="lazy"
                          key={idx}
                          src={imgSrc}
                          alt={`Product ${idx + 1}`}
                          className={`h-40 w-40 flex-shrink-0 rounded-lg object-cover border-2 ${img.is_primary ? 'border-green-400' : 'border-gray-200 dark:border-slate-600'}`}
                          onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_PLACEHOLDER; }}
                        />
                      );
                    })}
                    {imgs.length === 0 && (
                      <img loading="lazy" src={DEFAULT_PLACEHOLDER} alt="placeholder" className="h-40 w-40 rounded-lg object-cover border border-gray-200 dark:border-slate-600" />
                    )}
                  </div>
                );
              })()}

              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const b = getApprovalBadge(previewProduct.status);
                  const Icon = b.icon;
                  return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${b.bg} ${b.text}`}>
                      {Icon && <Icon className="h-3 w-3 mr-1" />}
                      {b.label}
                    </span>
                  );
                })()}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${previewProduct.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                  {previewProduct.is_active ? t('admin.productManagement.table.active') : t('admin.productManagement.table.inactive')}
                </span>
                {previewProduct.product_type && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    {previewProduct.product_type}
                  </span>
                )}
              </div>

              {/* Name & basic info */}
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-slate-100">{getLocalizedText(previewProduct, "name") || previewProduct.name_en || previewProduct.name_mm || t('admin.productManagement.table.unnamed')}</h4>
              </div>

              {/* Description */}
              {getLocalizedText(previewProduct, "description") && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('admin.productManagement.modals.description')}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {getLocalizedText(previewProduct, "description")}
                  </p>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('admin.productManagement.modals.sku')}</span>
                  <p className="font-mono text-gray-900 dark:text-slate-100 mt-0.5">{previewProduct.sku || "—"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('admin.productManagement.modals.category', 'Category')}</span>
                  <p className="text-gray-900 dark:text-slate-100 mt-0.5">{previewProduct.category?.name_en || t('admin.productManagement.table.uncategorized')}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('admin.productManagement.modals.price', 'Price')}</span>
                  <p className="text-gray-900 dark:text-slate-100 mt-0.5 font-semibold">{formatMMK(previewProduct.price)}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('admin.productManagement.modals.stock')}</span>
                  <p className="text-gray-900 dark:text-slate-100 mt-0.5">
                    {previewProduct.total_stock !== null && previewProduct.total_stock !== undefined
                      ? previewProduct.total_stock.toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('admin.productManagement.modals.moq')}</span>
                  <p className="text-gray-900 dark:text-slate-100 mt-0.5">{previewProduct.moq || previewProduct.min_order || 1}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('admin.productManagement.modals.seller')}</span>
                  <p className="text-gray-900 dark:text-slate-100 mt-0.5">{previewProduct.seller?.name || "—"}</p>
                </div>
                {previewProduct.discount_percentage && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('admin.productManagement.modals.discount')}</span>
                    <p className="text-red-600 dark:text-red-400 mt-0.5 font-medium">{previewProduct.discount_percentage}% {t('admin.productManagement.off')}</p>
                  </div>
                )}
                {previewProduct.discount_price && !previewProduct.discount_percentage && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('admin.productManagement.modals.discountPrice')}</span>
                    <p className="text-red-600 dark:text-red-400 mt-0.5 font-medium">{formatMMK(previewProduct.discount_price)}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('admin.productManagement.modals.submitted')}</span>
                  <p className="text-gray-900 dark:text-slate-100 mt-0.5">
                    {previewProduct.created_at ? new Date(previewProduct.created_at).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>

              {/* Rejection reason */}
              {previewProduct.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">{t('admin.productManagement.modals.rejectionReason')}</p>
                  <p className="text-sm text-red-800 dark:text-red-300">{previewProduct.rejection_reason}</p>
                </div>
              )}

              {/* Variants if present */}
              {Array.isArray(previewProduct.activeVariants) && previewProduct.activeVariants.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t('admin.productManagement.modals.variants')} ({previewProduct.activeVariants.length})</p>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {previewProduct.activeVariants.map(v => (
                      <div key={v.id} className="flex justify-between text-sm px-3 py-1.5 bg-gray-50 dark:bg-slate-700/50 rounded">
                        <span className="text-gray-700 dark:text-slate-300">{v.optionValues?.map(ov => ov.value).join(' / ') || `${t('admin.productManagement.modals.variant')} #${v.id}`}</span>
                        <span className="text-gray-500 dark:text-slate-400">{t('admin.productManagement.modals.qty')}: {v.quantity ?? 0} · {formatMMK(v.price ?? previewProduct.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t("admin.productManagement.title")}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
            {t("admin.productManagement.subtitle")}
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="text-sm font-medium text-green-800 dark:text-green-300 mr-0 sm:mr-4">
                {t("admin.productManagement.messages.productsSelected", { count: selectedProducts.length })}
              </span>
              <div className="flex items-center space-x-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="block w-40 rounded-md border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="">{t("admin.productManagement.bulkActions.chooseAction")}</option>
                  <option value="activate">{t("admin.productManagement.bulkActions.activateSelected")}</option>
                  <option value="deactivate">{t("admin.productManagement.bulkActions.deactivateSelected")}</option>
                  <option value="approve">{t("admin.productManagement.bulkActions.approveSelected")}</option>
                  <option value="reject">{t("admin.productManagement.bulkActions.rejectSelected")}</option>
                  <option value="delete">{t("admin.productManagement.bulkActions.deleteSelected")}</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  {t("admin.productManagement.bulkActions.apply")}
                </button>
                <button
                  onClick={() => setSelectedProducts([])}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  {t("admin.productManagement.bulkActions.clearSelection")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {/* Search */}
          <div className="sm:col-span-2 xl:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {t("admin.productManagement.filters.searchProducts")}
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder={t("admin.productManagement.filters.searchPlaceholder")}
                className={`${controlClass} pl-10 placeholder:text-gray-400 dark:placeholder:text-slate-500`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Approval Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {t("admin.productManagement.filters.approvalStatus")}
            </label>
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className={controlClass}
            >
              <option value="all">{t("admin.productManagement.filters.allStatuses")}</option>
              <option value="pending">{t("admin.productManagement.table.pending")}</option>
              <option value="approved">{t("admin.productManagement.table.approved")}</option>
              <option value="rejected">{t("admin.productManagement.table.rejected")}</option>
            </select>
          </div>

          {/* Active/Inactive Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {t("admin.productManagement.filters.activeInactive")}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={controlClass}
            >
              <option value="all">{t("admin.productManagement.filters.all")}</option>
              <option value="active">{t("admin.productManagement.table.active")}</option>
              <option value="inactive">{t("admin.productManagement.table.inactive")}</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {t("admin.productManagement.filters.category")}
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={controlClass}
            >
              <option value="all">{t("admin.productManagement.filters.allCategories")}</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {i18n.language === "my" ? (category.name_mm || category.name_en) : (category.name_en || category.name_mm)}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setApprovalFilter("all");
                setCategoryFilter("all");
              }}
              className={`${iconButtonClass} w-full`}
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              {t("admin.productManagement.filters.resetFilters")}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
          <span>{t("admin.productManagement.total")}: {products.length}</span>
          <span className="text-gray-400">•</span>
          <span>{t("admin.productManagement.showing")}: {filteredProducts.length}</span>
          <span className="text-gray-400">•</span>
          <span>{t("admin.productManagement.table.pending")} : {products.filter(p => p.status === 'pending').length}</span>
          <span className="text-gray-400">•</span>
          <span>{t("admin.productManagement.table.approved")} : {products.filter(p => p.status === 'approved').length}</span>
          <span className="text-gray-400">•</span>
          <span>{t("admin.productManagement.table.rejected")} : {products.filter(p => p.status === 'rejected').length}</span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-8 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">{t("admin.productManagement.loading")}</p>
        </div>
      )}

      {/* Error State — only shown when the product list itself fails to load */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{t("admin.productManagement.error")}</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                <p>{error}</p>
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{t("admin.productManagement.errors.loadRetryHint")}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchProducts}
                  className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                >
                  {t("admin.productManagement.tryAgain")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      {!loading && !error && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {filteredProducts.length > 0 ? (
            <ProductManagementTable
              products={productData}
              columns={adminTableColumns}
            />
          ) : (
            <div className="p-12 text-center">
              <svg className="h-12 w-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                {searchTerm || statusFilter !== "all" || approvalFilter !== "all" || categoryFilter !== "all"
                  ? t("admin.productManagement.noProductsFound")
                  : t("admin.productManagement.noProducts")
                }
              </h3>
              <p className="text-gray-500 dark:text-slate-400 mb-6">
                {searchTerm || statusFilter !== "all" || approvalFilter !== "all" || categoryFilter !== "all"
                  ? t("admin.productManagement.noProductsFoundDesc")
                  : t("admin.productManagement.noProductsDesc")
                }
              </p>
              {(!searchTerm && statusFilter === "all" && approvalFilter === "all" && categoryFilter === "all") && (
                <button
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  onClick={() => navigate("/admin/products/create")}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {t("admin.productManagement.addFirstProduct")}
                </button>
              )}
            </div>
          )}

          {/* Table Footer */}
          <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-3 border-t border-gray-200 dark:border-slate-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500 dark:text-slate-400">
                {t("admin.productManagement.showing")} <span className="font-medium">{filteredProducts.length}</span> {t("admin.productManagement.of")} <span className="font-medium">{products.length}</span> {t("admin.productManagement.products")}
              </div>
              <div className="text-sm text-gray-500 dark:text-slate-400">
                {selectedProducts.length > 0 && (
                  <span className="text-green-600 font-medium">
                    {selectedProducts.length} {t("admin.productManagement.selected")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
