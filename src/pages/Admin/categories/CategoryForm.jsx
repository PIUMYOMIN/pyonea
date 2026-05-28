// src/pages/Admin/categories/CategoryForm.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeftIcon, PhotoIcon } from "@heroicons/react/24/outline";
import api from "../../../utils/api";
import { IMAGE_BASE_URL, DEFAULT_PLACEHOLDER } from "../../../config";

const CATEGORY_DASHBOARD_PATH = "/admin/dashboard?tab=categories";

const CategoryForm = ({ mode = "create", category: initialCategory = null, onSuccess }) => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [categoriesFetched, setCategoriesFetched] = useState(false);

  const defaultParent = searchParams.get("parent") || "";

  const [formData, setFormData] = useState({
    name_en: "",
    name_mm: "",
    description_en: "",
    description_mm: "",
    commission_rate: 0,
    parent_id: defaultParent,
    is_active: true,
    image: null,
  });

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    const cleanPath = imagePath.replace(/^public\//, "");
    return `${IMAGE_BASE_URL}/${cleanPath}`;
  };

  const fetchCategories = useCallback(async () => {
    if (categoriesFetched) return;
    try {
      setLoading(true);
      const response = await api.get("/admin/categories");
      if (response.data.success) {
        setCategories(response.data.data);
        setCategoriesFetched(true);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  }, [categoriesFetched]);

  const initializeForm = useCallback(() => {
    if (mode === "edit" && initialCategory) {
      setFormData({
        name_en: initialCategory.name_en || "",
        name_mm: initialCategory.name_mm || "",
        description_en: initialCategory.description_en || "",
        description_mm: initialCategory.description_mm || "",
        commission_rate: initialCategory.commission_rate
          ? parseFloat(initialCategory.commission_rate)
          : 0,
        parent_id: initialCategory.parent_id || "",
        is_active: initialCategory.is_active !== false,
        image: initialCategory.image || null,
      });

      if (initialCategory.image) {
        setImagePreview(getImageUrl(initialCategory.image));
      }
    }
  }, [mode, initialCategory]);

  useEffect(() => {
    fetchCategories();
    initializeForm();
  }, [fetchCategories, initializeForm]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: "Please upload a valid image file (JPEG, PNG, GIF, WebP)",
      }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: "Image size should be less than 2MB" }));
      return;
    }

    setFormData((prev) => ({ ...prev, image: file }));
    setImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, image: null }));
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name_en.trim()) {
      newErrors.name_en = "English name is required";
    }
    const commissionRate = parseFloat(formData.commission_rate);
    if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      newErrors.commission_rate = "Commission rate must be between 0 and 100";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setSaving(true);
    try {
      const submitData = new FormData();
      submitData.append("name_en", formData.name_en);
      submitData.append("name_mm", formData.name_mm || "");
      submitData.append("description_en", formData.description_en || "");
      submitData.append("description_mm", formData.description_mm || "");
      submitData.append("commission_rate", parseFloat(formData.commission_rate));
      submitData.append("parent_id", formData.parent_id || "");
      submitData.append("is_active", formData.is_active ? 1 : 0);

      if (formData.image && typeof formData.image === "object") {
        submitData.append("image", formData.image);
      } else if (mode === "edit" && formData.image === null && initialCategory?.image) {
        submitData.append("image", "");
      }

      if (mode === "edit") {
        submitData.append("_method", "PUT");
        await api.post(`/admin/categories/${id}`, submitData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/admin/categories", submitData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(CATEGORY_DASHBOARD_PATH);
      }
    } catch (error) {
      console.error("Failed to save category:", error);
      if (error.response?.data?.errors) {
        const validationErrors = {};
        Object.keys(error.response.data.errors).forEach((key) => {
          validationErrors[key] = error.response.data.errors[key][0];
        });
        setErrors(validationErrors);
      } else {
        setErrors({ submit: error.response?.data?.message || "Failed to save category." });
      }
    } finally {
      setSaving(false);
    }
  };

  // Flatten nested categories for the parent select (with indentation)
  const flattenForSelect = (cats, depth = 0) => {
    return cats.reduce((acc, cat) => {
      // Skip self when editing
      if (mode === "edit" && cat.id === parseInt(id)) return acc;
      acc.push({ id: cat.id, name: `${"  ".repeat(depth)}${cat.name_en}`, depth });
      if (cat.children && cat.children.length > 0) {
        acc.push(...flattenForSelect(cat.children, depth + 1));
      }
      return acc;
    }, []);
  };

  const parentOptions = flattenForSelect(categories);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(CATEGORY_DASHBOARD_PATH)}
          className="inline-flex items-center text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Categories
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          {mode === "edit" ? "Edit Category" : "Create New Category"}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          {mode === "edit"
            ? "Update category details and settings"
            : "Add a new product category to your store"}
        </p>
      </div>

      {errors.submit && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{errors.submit}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="space-y-6">

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name_en" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Category Name (English) *
                </label>
                <input
                  type="text"
                  id="name_en"
                  name="name_en"
                  value={formData.name_en}
                  onChange={handleChange}
                  className={`block w-full rounded-md border px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm ${
                    errors.name_en
                      ? "border-red-300 dark:border-red-700 focus:border-red-500"
                      : "border-gray-300 dark:border-slate-600 focus:border-green-500"
                  }`}
                  placeholder="e.g., Electronics"
                />
                {errors.name_en && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name_en}</p>
                )}
              </div>

              <div>
                <label htmlFor="name_mm" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Category Name (Myanmar)
                </label>
                <input
                  type="text"
                  id="name_mm"
                  name="name_mm"
                  value={formData.name_mm}
                  onChange={handleChange}
                  className="block w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                  placeholder="e.g., လျှပ်စစ်ပစ္စည်းများ"
                />
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="description_en" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Description (English)
                </label>
                <textarea
                  id="description_en"
                  name="description_en"
                  value={formData.description_en}
                  onChange={handleChange}
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                  placeholder="Brief description of the category"
                />
              </div>

              <div>
                <label htmlFor="description_mm" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Description (Myanmar)
                </label>
                <textarea
                  id="description_mm"
                  name="description_mm"
                  value={formData.description_mm}
                  onChange={handleChange}
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                  placeholder="အမျိုးအစားအကြောင်း အတိုချုပ်"
                />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
              Category Image
            </h3>
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Category preview"
                      className="h-32 w-32 rounded-lg object-cover"
                      onError={(e) => { e.target.src = DEFAULT_PLACEHOLDER; }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      title="Remove image"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="h-32 w-32 rounded-lg bg-gray-100 dark:bg-slate-700 border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center">
                    <PhotoIcon className="h-12 w-12 text-gray-400 dark:text-slate-500" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {imagePreview ? "Replace Image" : "Upload Image"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 dark:file:bg-green-900/30 file:text-green-700 dark:file:text-green-300 hover:file:bg-green-100 dark:hover:file:bg-green-900/50"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                  PNG, JPG, GIF, WebP up to 2MB
                </p>
                {errors.image && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.image}</p>
                )}
                {mode === "edit" && formData.image && typeof formData.image === "string" && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                    Current: {formData.image.split("/").pop()}
                    <br />
                    <span className="text-xs">Leave unchanged to keep the current image</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
              Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="parent_id" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Parent Category
                </label>
                <select
                  id="parent_id"
                  name="parent_id"
                  value={formData.parent_id}
                  onChange={handleChange}
                  disabled={loading}
                  className="block w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm disabled:opacity-50"
                >
                  <option value="">None (Root Category)</option>
                  {parentOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                  Select a parent to create a subcategory
                </p>
              </div>

              <div>
                <label htmlFor="commission_rate" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Commission Rate (%) *
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="number"
                    id="commission_rate"
                    name="commission_rate"
                    value={formData.commission_rate}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className={`block w-full rounded-md border px-3 py-2 pr-10 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm ${
                      errors.commission_rate
                        ? "border-red-300 dark:border-red-700"
                        : "border-gray-300 dark:border-slate-600 focus:border-green-500"
                    }`}
                    placeholder="e.g., 10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500 dark:text-slate-400 sm:text-sm">%</span>
                  </div>
                </div>
                {errors.commission_rate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.commission_rate}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                  Platform commission percentage (0–100%)
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-slate-600 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-slate-300">
                  Category is active
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                Inactive categories won't be visible to users
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate(CATEGORY_DASHBOARD_PATH)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {mode === "edit" ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  mode === "edit" ? "Update Category" : "Create Category"
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CategoryForm;
