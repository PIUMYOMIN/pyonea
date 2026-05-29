// src/pages/Admin/categories/CategoryManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { IMAGE_BASE_URL, DEFAULT_PLACEHOLDER } from "../../config";

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const flash = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/admin/categories");
      if (response.data.success) {
        setCategories(response.data.data);
      } else {
        setCategories(response.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError(err.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const expandAll = () => {
    const allIds = {};
    const collectIds = (cats) => {
      cats.forEach((cat) => {
        if (cat.children && cat.children.length > 0) {
          allIds[cat.id] = true;
          collectIds(cat.children);
        }
      });
    };
    collectIds(categories);
    setExpandedCategories(allIds);
  };

  const collapseAll = () => setExpandedCategories({});

  const handleDelete = (categoryId) => setDeleteTarget(categoryId);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/categories/${deleteTarget}`);
      flash("Category deleted successfully.");
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      flash(err.response?.data?.message || "Failed to delete category.", "error");
      setDeleteTarget(null);
    }
  };

  const handleStatusToggle = async (categoryId, currentStatus) => {
    const newStatus = !currentStatus;
    setCategories((prev) =>
      updateCategoryRecursively(prev, categoryId, { is_active: newStatus })
    );
    try {
      await api.put(`/admin/categories/${categoryId}`, { is_active: newStatus });
      flash(`Category ${newStatus ? "activated" : "deactivated"} successfully.`);
    } catch (err) {
      setCategories((prev) =>
        updateCategoryRecursively(prev, categoryId, { is_active: currentStatus })
      );
      flash(err.response?.data?.message || "Failed to update status.", "error");
    }
  };

  const updateCategoryRecursively = (cats, targetId, updates) => {
    return cats.map((cat) => {
      if (cat.id === targetId) return { ...cat, ...updates };
      if (cat.children) {
        return { ...cat, children: updateCategoryRecursively(cat.children, targetId, updates) };
      }
      return cat;
    });
  };

  // Filter categories and keep only matching subtrees (children filtered too)
  const filterCategories = (cats, term) => {
    if (!term) return cats;
    return cats.reduce((acc, category) => {
      const selfMatches =
        (category.name_en && category.name_en.toLowerCase().includes(term.toLowerCase())) ||
        (category.name_mm && category.name_mm.toLowerCase().includes(term.toLowerCase())) ||
        (category.description_en && category.description_en.toLowerCase().includes(term.toLowerCase()));

      const filteredChildren =
        category.children && category.children.length > 0
          ? filterCategories(category.children, term)
          : [];

      if (selfMatches) {
        // Include this category with all its children
        acc.push(category);
      } else if (filteredChildren.length > 0) {
        // Include this category only with matching children
        acc.push({ ...category, children: filteredChildren });
      }
      return acc;
    }, []);
  };

  // Collect IDs of all parents that have matching children so we can auto-expand them
  const collectParentIds = (cats) => {
    const ids = {};
    cats.forEach((cat) => {
      if (cat.children && cat.children.length > 0) {
        ids[cat.id] = true;
        Object.assign(ids, collectParentIds(cat.children));
      }
    });
    return ids;
  };

  // Auto-expand parent categories when searching
  useEffect(() => {
    if (searchTerm) {
      const filtered = filterCategories(categories, searchTerm);
      const parentIds = collectParentIds(filtered);
      setExpandedCategories(parentIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, categories]);

  const flattenCategories = (cats, level = 0) => {
    let result = [];
    cats.forEach((category) => {
      result.push({
        ...category,
        level,
        hasChildren: (category.children && category.children.length > 0) || false,
        isExpanded: expandedCategories[category.id] || false,
      });
      if (expandedCategories[category.id] && category.children) {
        result = result.concat(flattenCategories(category.children, level + 1));
      }
    });
    return result;
  };

  const countAll = (cats) =>
    cats.reduce((acc, c) => acc + 1 + (c.children ? countAll(c.children) : 0), 0);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return DEFAULT_PLACEHOLDER;
    if (imagePath.startsWith("http")) return imagePath;
    const cleanPath = imagePath.replace(/^public\//, "");
    return `${IMAGE_BASE_URL}/${cleanPath}`;
  };

  const formatCommissionRate = (rate) => {
    if (rate === null || rate === undefined) return "0.00";
    const value = parseFloat(rate);
    if (isNaN(value)) return "0.00";
    return value <= 1 ? (value * 100).toFixed(2) : value.toFixed(2);
  };

  const filteredCategories = filterCategories(categories, searchTerm);
  const flattenedCategories = flattenCategories(filteredCategories);
  const totalCount = countAll(categories);
  const filteredCount = countAll(filteredCategories);
  const anyExpanded = Object.values(expandedCategories).some((v) => v);
  const anyExpandable = categories.some((c) => c.children && c.children.length > 0);

  const columns = [
    { header: "Category Name", accessor: "name" },
    { header: "Myanmar Name", accessor: "name_mm" },
    { header: "Slug", accessor: "slug_en" },
    { header: "Commission Rate", accessor: "commission_rate" },
    { header: "Status", accessor: "status" },
    { header: "Actions", accessor: "actions" },
  ];

  const categoryData = flattenedCategories.map((category) => ({
    ...category,
    name: (
      <div
        className="flex items-center min-w-[300px]"
        style={{ paddingLeft: `${category.level * 24}px` }}
      >
        {category.hasChildren ? (
          <button
            onClick={() => toggleCategory(category.id)}
            className="mr-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            {category.isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="ml-6" />
        )}
        <div className="flex items-center">
          {category.image && (
            <img
              src={getImageUrl(category.image)}
              alt={category.name_en}
              className="w-8 h-8 rounded-full object-cover mr-3"
              onError={(e) => { e.target.src = DEFAULT_PLACEHOLDER; }}
            />
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-slate-100">
              {category.name_en}
            </div>
            {category.description_en && (
              <div className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-xs">
                {category.description_en}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    name_mm: (
      <span className="text-gray-600 dark:text-slate-300">
        {category.name_mm || "—"}
      </span>
    ),
    slug_en: (
      <span className="font-mono text-sm text-gray-500 dark:text-slate-400">
        /{category.slug_en}
      </span>
    ),
    commission_rate: (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
        {formatCommissionRate(category.commission_rate)}%
      </span>
    ),
    status: (
      <button
        onClick={() => handleStatusToggle(category.id, category.is_active)}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
          category.is_active
            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
            : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
        }`}
      >
        {category.is_active ? "Active" : "Inactive"}
      </button>
    ),
    actions: (
      <div className="flex space-x-1">
        <button
          className="inline-flex items-center p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
          onClick={() => navigate(`/admin/categories/${category.id}/edit`)}
          title="Edit Category"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          className="inline-flex items-center p-1.5 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
          onClick={() => handleDelete(category.id)}
          title="Delete Category"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
        <button
          className="inline-flex items-center p-1.5 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded"
          onClick={() => navigate(`/admin/categories/create?parent=${category.id}`)}
          title="Add Subcategory"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    ),
  }));

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-2">Delete Category</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-5">
              This action cannot be undone. Any subcategories and associated products may be affected.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Category Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
            Manage product categories and their hierarchy
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchCategories}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            title="Refresh"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            onClick={() => navigate("/admin/categories/create")}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Category
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search categories by name or description..."
              className="block w-full rounded-md border-0 py-2 pl-10 pr-10 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 ring-1 ring-inset ring-gray-300 dark:ring-slate-600 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                aria-label="Clear category search"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-slate-400 lg:justify-end">
            <span>Total: {totalCount}</span>
            {searchTerm && (
              <>
                <span>•</span>
                <span>Matches: {filteredCount}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-8 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Loading categories...</p>
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
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Error loading categories
              </h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={fetchCategories}
                className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Table */}
      {!loading && !error && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.accessor}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider"
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {categoryData.length > 0 ? (
                  categoryData.map((category, index) => (
                    <tr
                      key={`${category.id}-${index}`}
                      className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                        category.level > 0 ? "bg-gray-50/50 dark:bg-slate-700/20" : ""
                      }`}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.accessor}
                          className="px-6 py-4 whitespace-nowrap text-sm"
                        >
                          {category[column.accessor]}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg
                          className="h-12 w-12 text-gray-400 dark:text-slate-600 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-1">
                          {searchTerm ? "No categories found" : "No categories yet"}
                        </h3>
                        <p className="text-gray-500 dark:text-slate-400 mb-4">
                          {searchTerm
                            ? "Try adjusting your search term"
                            : "Get started by creating your first category"}
                        </p>
                        {!searchTerm && (
                          <button
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            onClick={() => navigate("/admin/categories/create")}
                          >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Create Category
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-3 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Showing{" "}
                <span className="font-medium text-gray-700 dark:text-slate-300">
                  {flattenedCategories.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-700 dark:text-slate-300">
                  {totalCount}
                </span>{" "}
                {totalCount === 1 ? "category" : "categories"}
              </p>
              {anyExpandable && (
                <div className="flex items-center gap-3 text-sm">
                  {!anyExpanded ? (
                    <button
                      onClick={expandAll}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                    >
                      Expand All
                    </button>
                  ) : (
                    <button
                      onClick={collapseAll}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                    >
                      Collapse All
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
