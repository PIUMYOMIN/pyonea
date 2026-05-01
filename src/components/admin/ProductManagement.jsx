// components/admin/ProductManagement.jsx
import React, { useState, useEffect } from "react";
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
import DataTable from "../ui/DataTable";

const ProductManagement = () => {
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

  // Modal state — replaces alert/confirm/prompt
  const [deleteModal, setDeleteModal]   = useState(null);  // productId | null
  const [approveModal, setApproveModal] = useState(null);  // productId | null — FIX: was window.confirm
  const [rejectModal, setRejectModal]   = useState(null);  // productId | null
  const [rejectReason, setRejectReason] = useState("");
  const [bulkModal, setBulkModal]       = useState(false);

  // Fetch products (admin endpoint)
  const fetchProducts = async () => {
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
      setError(err.response?.data?.message || "Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories for filter
  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories?per_page=50");
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    fetchProducts();
  }, [searchTerm, statusFilter, approvalFilter, categoryFilter]);

  // Handle product status change (active/inactive)
  const handleProductStatus = async (productId, isActive) => {
    try {
      // FIX: was calling PUT /products/{id} which is the seller-scoped update endpoint.
      // Admins always get 404 from that route because it does where('seller_id', Auth::id()).
      // Use the dedicated admin toggle-status route instead.
      await api.patch(`/admin/products/${productId}/toggle-status`);

      // Update local state
      setProducts(prev => prev.map(product =>
        product.id === productId
          ? { ...product, is_active: isActive }
          : product
      ));
    } catch (error) {
      console.error("Failed to update product status:", error);
      setError(error.response?.data?.message || "Failed to update product status");
    }
  };

  // Approve product — FIX: was using window.confirm, now uses approveModal state
  const handleApprove = async () => {
    if (!approveModal) return;
    try {
      await api.post(`/admin/products/${approveModal}/approve`);
      setApproveModal(null);
      await fetchProducts();
    } catch (error) {
      setApproveModal(null);
      setError(error.response?.data?.message || "Failed to approve product");
    }
  };

  // Reject product
  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await api.post(`/admin/products/${rejectModal}/reject`, { reason: rejectReason });
      await fetchProducts();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to reject product");
    } finally {
      setRejectModal(null);
      setRejectReason("");
    }
  };

  // Handle product deletion
  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      // FIX: admin delete can use the same /products/{id} endpoint — the
      // destroy() method now allows admins through after the auth fix
      await api.delete(`/products/${deleteModal}`);
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete product");
    } finally {
      setDeleteModal(null);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (selectedProducts.length === 0) { setError("Please select products first"); return; }
    if (!bulkAction) { setError("Please select an action"); return; }
    setBulkModal(true);
  };

  const executeBulkAction = async () => {
    setBulkModal(false);
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
          if (bulkAction === "delete")     return api.delete(`/products/${productId}`);
          if (bulkAction === "activate")   return api.patch(`/admin/products/${productId}/toggle-status`);
          if (bulkAction === "deactivate") return api.patch(`/admin/products/${productId}/toggle-status`);
          if (bulkAction === "approve")    return api.post(`/admin/products/${productId}/approve`);
          if (bulkAction === "reject")     return api.post(`/admin/products/${productId}/reject`);
          return Promise.resolve();
        }));
      }

      fetchProducts();
      setSelectedProducts([]);
      setBulkAction("");
    } catch (error) {
      setError(error.response?.data?.message || `Failed to perform ${bulkAction} operation`);
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
  const filteredProducts = products
    .filter(product => {
      // Client‑side filtering is minimal; we rely on server‑side filtering.
      return true;
    })
    .sort((a, b) => {
      const aValue = a[sortField] || "";
      const bValue = b[sortField] || "";

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Format price in MMK
  const formatMMK = (amount) => {
    return new Intl.NumberFormat("my-MM", {
      style: "currency",
      currency: "MMK",
      minimumFractionDigits: 0
    }).format(amount || 0);
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
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', icon: CheckCircleIcon, label: 'Approved' };
      case 'pending':
        return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', icon: ClockIcon, label: 'Pending' };
      case 'rejected':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', icon: XCircleIcon, label: 'Rejected' };
      default:
        return { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-800 dark:text-slate-300', icon: null, label: status || 'Unknown' };
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
    return "Sale";
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
      header: "Image",
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
          Name
          {sortField === "name_en" && (
            <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      ),
      accessor: "name"
    },
    { header: "SKU", accessor: "sku" },
    {
      header: (
        <button
          onClick={() => handleSort("category.name_en")}
          className="flex items-center hover:text-gray-900 dark:hover:text-slate-100"
        >
          Category
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
          Price
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
          onClick={() => handleSort("quantity")}
          className="flex items-center hover:text-gray-900 dark:hover:text-slate-100"
        >
          Stock
          {sortField === "quantity" && (
            <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      ),
      accessor: "stock"
    },
    {
      header: "Discount",
      accessor: "discount",
      width: "120px"
    },
    { header: "MOQ", accessor: "min_order" },
    {
      header: (
        <button
          onClick={() => handleSort("status")}
          className="flex items-center hover:text-gray-900 dark:hover:text-slate-100"
        >
          Approval Status
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
          Active/Inactive
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
          Created
          {sortField === "created_at" && (
            <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      ),
      accessor: "created_at"
    },
    { header: "Actions", accessor: "actions", width: "200px" }
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
          <img
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
          {product.sku || "N/A"}
        </span>
      ),
      category: (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
          {product.category?.name_en || "Uncategorized"}
        </span>
      ),
      price: formatMMK(product.price),
      stock: (
        <div className="flex items-center">
          <span className={`font-medium ${product.quantity <= 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-slate-100'}`}>
            {product.quantity || 0}
          </span>
          {product.quantity <= 0 && (
            <span className="ml-2 text-xs text-red-500 dark:text-red-400">Out of stock</span>
          )}
        </div>
      ),
      discount: discountInfo.display,
      min_order: (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300">
          {product.min_order || product.moq || 1}
        </span>
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
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          product.is_active
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
        }`}>
          {product.is_active ? (
            <>
              <CheckCircleIcon className="h-3 w-3 mr-1" />
              Active
            </>
          ) : (
            <>
              <XCircleIcon className="h-3 w-3 mr-1" />
              Inactive
            </>
          )}
        </span>
      ),
      created_at: new Date(product.created_at).toLocaleDateString(),
      actions: (
        <div className="flex space-x-2 items-center">
          <button
            className="inline-flex items-center p-1.5 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700 rounded"
            onClick={() => navigate(`/admin/products/${product.id}`)}
            title="View Product"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            className="inline-flex items-center p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"
            onClick={() => navigate(`/admin/products/${product.id}/edit`)}
            title="Edit Product"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            className="inline-flex items-center p-1.5 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            onClick={() => setDeleteModal(product.id)}
            title="Delete Product"
          >
            <TrashIcon className="h-4 w-4" />
          </button>

          {/* Approval actions — pending products can be approved or rejected */}
          {product.status === 'pending' && (
            <>
              <button
                onClick={() => setApproveModal(product.id)}
                className="inline-flex items-center p-1.5 text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                title="Approve"
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setRejectModal(product.id); setRejectReason(""); }}
                className="inline-flex items-center p-1.5 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                title="Reject"
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </>
          )}

          {/* FIX: rejected products can now be re-approved (backend updated to allow it) */}
          {product.status === 'rejected' && (
            <button
              onClick={() => setApproveModal(product.id)}
              className="inline-flex items-center px-2 py-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded border border-green-200 dark:border-green-800"
              title="Re-approve this rejected product"
            >
              Re-approve
            </button>
          )}

          {/* Active/Inactive toggle only for approved products */}
          {product.status === 'approved' && (
            <select
              value={product.is_active ? "active" : "inactive"}
              onChange={(e) => handleProductStatus(product.id, e.target.value === "active")}
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

  return (
    <div className="space-y-6">

      {/* ── Approve confirmation modal ── */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Approve Product</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              Are you sure you want to approve this product? It will become visible to buyers immediately.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setApproveModal(null)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Delete Product</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete this product? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModal(null)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject reason modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Reject Product</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">Optionally provide a reason for the seller:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:text-slate-100 bg-white dark:bg-slate-700 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-slate-500"
              placeholder="Rejection reason (optional)"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Reject Product</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk action confirmation modal ── */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Confirm Bulk Action</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              Are you sure you want to <strong>{bulkAction}</strong> {selectedProducts.length} product(s)?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBulkModal(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={executeBulkAction} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Product Management</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
            Manage all products in your marketplace
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-green-800 dark:text-green-300 mr-4">
                {selectedProducts.length} product(s) selected
              </span>
              <div className="flex items-center space-x-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="block w-40 rounded-md border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="">Choose action...</option>
                  <option value="activate">Activate Selected</option>
                  <option value="deactivate">Deactivate Selected</option>
                  <option value="approve">Approve Selected</option>
                  <option value="reject">Reject Selected</option>
                  <option value="delete">Delete Selected</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Apply
                </button>
                <button
                  onClick={() => setSelectedProducts([])}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Search Products
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, SKU..."
                className="block w-full rounded-md border border-gray-300 dark:border-slate-600 pl-10 pr-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Approval Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Approval Status
            </label>
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="block w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Active/Inactive Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Active/Inactive
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name_en}
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
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 w-full justify-center"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Reset Filters
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400">
          <span>Total: {products.length}</span>
          <span>•</span>
          <span>Showing: {filteredProducts.length}</span>
          <span>•</span>
          <span>Pending: {products.filter(p => p.status === 'pending').length}</span>
          <span>•</span>
          <span>Approved: {products.filter(p => p.status === 'approved').length}</span>
          <span>•</span>
          <span>Rejected: {products.filter(p => p.status === 'rejected').length}</span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-8 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Loading products...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error loading products</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchProducts}
                  className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                >
                  Try again
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
            <DataTable
              columns={columns}
              data={productData}
              striped={true}
              hoverable={true}
            />
          ) : (
            <div className="p-12 text-center">
              <svg className="h-12 w-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                {searchTerm || statusFilter !== "all" || approvalFilter !== "all" || categoryFilter !== "all"
                  ? "No products found matching your criteria"
                  : "No products yet"
                }
              </h3>
              <p className="text-gray-500 dark:text-slate-400 mb-6">
                {searchTerm || statusFilter !== "all" || approvalFilter !== "all" || categoryFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first product"
                }
              </p>
              {(!searchTerm && statusFilter === "all" && approvalFilter === "all" && categoryFilter === "all") && (
                <button
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  onClick={() => navigate("/admin/products/create")}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Your First Product
                </button>
              )}
            </div>
          )}

          {/* Table Footer */}
          <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-3 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-slate-400">
                Showing <span className="font-medium">{filteredProducts.length}</span> of{" "}
                <span className="font-medium">{products.length}</span> products
              </div>
              <div className="text-sm text-gray-500 dark:text-slate-400">
                {selectedProducts.length > 0 && (
                  <span className="text-green-600 font-medium">
                    {selectedProducts.length} selected
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