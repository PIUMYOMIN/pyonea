// pages/Seller/products/ProductForm.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../../utils/api";
import { useAuth } from "../../../context/AuthContext";
import ProductOptionsEditor from "../../../components/seller/ProductOptionsEditor";
import VariantTable from "../../../components/seller/VariantTable";
import {
  XMarkIcon, PhotoIcon, TrashIcon, PlusIcon,
  ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon,
  ExclamationCircleIcon, CloudArrowUpIcon, ArrowsUpDownIcon,
  EyeIcon, StarIcon, PencilIcon,
} from "@heroicons/react/24/outline";

// ── constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  PRODUCT_DRAFT:   "product_draft",
  IMAGE_PREVIEWS:  "product_image_previews",
};

const IMAGE_ANGLES = [
  { value: "front",   label: "Front View",  icon: "👁️" },
  { value: "back",    label: "Back View",   icon: "↩️" },
  { value: "side",    label: "Side View",   icon: "↔️" },
  { value: "top",     label: "Top View",    icon: "⬆️" },
  { value: "default", label: "Other View",  icon: "📷" },
];

const PRODUCT_TYPES = [
  { value: "physical", label: "Physical",        hint: "Has stock, requires shipping." },
  { value: "digital",  label: "Digital",         hint: "Download/link delivered. No shipping." },
  { value: "service",  label: "Service",         hint: "No stock, no shipping (e.g. consulting)." },
];

const QUANTITY_UNITS = [
  { value: "piece",   label: "Piece" },
  { value: "kg",      label: "Kilogram" },
  { value: "gram",    label: "Gram" },
  { value: "meter",   label: "Meter" },
  { value: "liter",   label: "Liter" },
  { value: "set",     label: "Set" },
  { value: "pack",    label: "Pack" },
  { value: "box",     label: "Box" },
  { value: "pallet",  label: "Pallet" },
  { value: "roll",    label: "Roll" },
];

const WARRANTY_TYPES = [
  { value: "manufacturer",  label: "Manufacturer Warranty" },
  { value: "seller",        label: "Seller Warranty" },
  { value: "international", label: "International Warranty" },
  { value: "no_warranty",   label: "No Warranty" },
];

const PRODUCT_CONDITIONS = [
  { value: "new",           label: "New",               description: "Brand new, never used" },
  { value: "used_like_new", label: "Used – Like New",   description: "Used but looks and functions like new" },
  { value: "used_good",     label: "Used – Good",       description: "Used with minor signs of wear" },
  { value: "used_fair",     label: "Used – Fair",       description: "Used with visible signs of wear" },
];

// ── helpers ───────────────────────────────────────────────────────────────────

const validateImageFile = (file) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"];
  if (!allowed.includes(file.type)) return { valid: false, message: "Invalid format. Use JPEG, PNG, GIF, or WebP." };
  if (file.size > 5 * 1024 * 1024)  return { valid: false, message: "Image must be under 5 MB." };
  return { valid: true, message: "" };
};

const getImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;
  if (imageBaseUrl) return `${imageBaseUrl}/${url.startsWith("/") ? url.slice(1) : url}`;
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) return `${apiUrl}/storage/${url.startsWith("/") ? url.slice(1) : url}`;
  return url;
};

const sanitizeProductData = (data) => {
  const sanitized = { ...data };
  const stringFields = [
    "name_en", "name_mm", "description_en", "description_mm", "brand", "model",
    "material", "origin", "warranty", "warranty_type", "warranty_period",
    "return_policy", "shipping_time", "packaging_details", "additional_info", "lead_time",
  ];
  stringFields.forEach((f) => { if (sanitized[f] == null) sanitized[f] = ""; });
  return sanitized;
};

// ── default form data ─────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  name_en:           "",
  name_mm:           "",
  description_en:    "",
  description_mm:    "",
  product_type:      "physical",
  price:             "",
  category_id:       "",
  quantity_unit:     "piece",
  moq:               1,
  min_order_unit:    "piece",
  lead_time:         "",
  condition:         "new",
  is_active:         true,
  brand:             "",
  model:             "",
  material:          "",
  origin:            "",
  weight_kg:         "",
  warranty:          "",
  warranty_type:     "",
  warranty_period:   "",
  return_policy:     "",
  shipping_cost:     "",
  shipping_time:     "",
  packaging_details: "",
  additional_info:   "",
  is_featured:       false,
  is_new:            true,
  discount_price:    "",
  discount_start:    "",
  discount_end:      "",
  specifications:    {},
  // digital fields
  file_url:          "",
  file_type:         "",
};

// ── steps ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Basic Info",     description: "Product details" },
  { id: 2, title: "Pricing",        description: "Price & B2B" },
  { id: 3, title: "Media",          description: "Images & specs" },
  { id: 4, title: "Shipping",       description: "Delivery & more" },
  { id: 5, title: "Variants",       description: "Options & stock" },
];

// ── component ─────────────────────────────────────────────────────────────────

const ProductForm = ({ product = null, onSuccess, onCancel }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate  = useNavigate();
  const fileInputRef = useRef(null);
  const isMounted    = useRef(true);
  const catName = (c) => i18n.language === "my" ? (c.name_mm || c.name_en) : c.name_en;

  // ── form state ───────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState(() => {
    if (product) {
      const { images, ...rest } = product;
      return { ...DEFAULT_FORM, ...rest };
    }
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCT_DRAFT);
    if (saved) {
      try { return { ...DEFAULT_FORM, ...JSON.parse(saved) }; } catch {}
    }
    return DEFAULT_FORM;
  });

  // createdProductId tracks the ID returned after step 1–4 submit,
  // so step 5 can load options/variants for the right product.
  const [createdProductId, setCreatedProductId] = useState(product?.id ?? null);

  const [categories,         setCategories]         = useState([]);
  const [loadingCategories,  setLoadingCategories]  = useState(false);
  const [catError,           setCatError]           = useState(false);
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState("");
  const [specInput,          setSpecInput]          = useState({ key: "", value: "" });
  const [imagePreviews,      setImagePreviews]      = useState([]);
  const [currentStep,        setCurrentStep]        = useState(1);
  const [completedSteps,     setCompletedSteps]     = useState(new Set());
  const [showSuccessPopup,   setShowSuccessPopup]   = useState(false);
  const [successMessage,     setSuccessMessage]     = useState("");
  const [uploadProgress,     setUploadProgress]     = useState(0);
  const [isUploadingImages,  setIsUploadingImages]  = useState(false);
  const [draggedImage,       setDraggedImage]       = useState(null);
  const [previewImage,       setPreviewImage]       = useState(null);
  const [imagesModified,     setImagesModified]     = useState(false);
  const [urlInput,           setUrlInput]           = useState("");
  const [cancelModal,        setCancelModal]        = useState(false);

  // ── image helpers ────────────────────────────────────────────────────────────

  const setPrimaryImage = (index) => {
    setImagesModified(true);
    setImagePreviews((prev) => prev.map((img, i) => ({ ...img, is_primary: i === index })));
  };

  const removeImage = (index) => {
    setImagesModified(true);
    setImagePreviews((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (prev[index].is_primary && next.length > 0) next[0].is_primary = true;
      return next;
    });
  };

  const handleDragStart = (index) => setDraggedImage(index);
  const handleDragOver  = (e) => e.preventDefault();
  const handleDrop      = (index) => {
    if (draggedImage === null || draggedImage === index) return;
    setImagesModified(true);
    const next = [...imagePreviews];
    const [moved] = next.splice(draggedImage, 1);
    next.splice(index, 0, moved);
    setImagePreviews(next);
    setDraggedImage(null);
  };

  const updateImageAngle = (index, angle) => {
    setImagesModified(true);
    setImagePreviews((prev) => prev.map((img, i) => (i === index ? { ...img, angle } : img)));
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const validFiles = [];
    const errors     = [];
    files.forEach((file) => {
      const v = validateImageFile(file);
      v.valid ? validFiles.push(file) : errors.push(`${file.name}: ${v.message}`);
    });

    if (errors.length) setError(`Some images were rejected:\n${errors.join("\n")}`);
    if (!validFiles.length) return;

    setIsUploadingImages(true);
    setUploadProgress(0);
    const totalBytes   = validFiles.reduce((s, f) => s + f.size, 0);
    const uploadedBytes = new Array(validFiles.length).fill(0);

    const uploadOne = async (file, index) => {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("angle", "default");
      try {
        const res = await api.post("/seller/products/upload-image", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (pe) => {
            uploadedBytes[index] = pe.loaded;
            setUploadProgress(Math.round((uploadedBytes.reduce((a, b) => a + b, 0) / totalBytes) * 100));
          },
        });
        if (res.data.success) {
          const d = res.data.data;
          return { url: d.url, path: d.url, file: null, is_primary: imagePreviews.length === 0 && index === 0,
                   angle: d.angle, isExisting: false, name: file.name, size: (file.size / (1024 * 1024)).toFixed(2) + " MB" };
        }
        return null;
      } catch (err) {
        setError(`Failed to upload ${file.name}: ${err.message}`);
        return null;
      }
    };

    const results = await Promise.all(validFiles.map((f, i) => uploadOne(f, i)));
    setImagesModified(true);
    setImagePreviews((prev) => [...prev, ...results.filter(Boolean)]);
    setIsUploadingImages(false);
    e.target.value = "";
  };

  const addImageFromUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    setImagesModified(true);
    setImagePreviews((prev) => [
      ...prev,
      { url, path: url, is_primary: prev.length === 0, angle: "default", isExisting: false, name: "External Image", size: "External" },
    ]);
    setUrlInput("");
  };

  // ── form change ───────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const addSpecification = () => {
    if (specInput.key && specInput.value) {
      setFormData((prev) => ({ ...prev, specifications: { ...prev.specifications, [specInput.key]: specInput.value } }));
      setSpecInput({ key: "", value: "" });
    }
  };

  const removeSpecification = (key) => {
    setFormData((prev) => {
      const next = { ...prev.specifications };
      delete next[key];
      return { ...prev, specifications: next };
    });
  };

  // ── step validation ────────────────────────────────────────────────────────────

  const validateStep = (step) => {
    switch (step) {
      case 1: return formData.name_en && formData.description_en && formData.category_id && formData.product_type;
      case 2: return formData.price && formData.moq && formData.condition;
      case 3: return imagePreviews.length > 0;
      case 4: return true;
      case 5: return true; // Variants step is always completable (optional)
      default: return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps((prev) => new Set(prev).add(currentStep));
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const goToStep = (step) => {
    if (createdProductId || completedSteps.has(step - 1) || step === 1) {
      setCurrentStep(step);
    }
  };

  // ── submit steps 1-4 (core product) ──────────────────────────────────────────

  const handleCoreSubmit = async () => {
    if (loading || isUploadingImages) return;
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        price:         parseFloat(formData.price),
        moq:           parseInt(formData.moq, 10),
        category_id:   parseInt(formData.category_id, 10),
        discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
        weight_kg:     formData.weight_kg     ? parseFloat(formData.weight_kg)     : null,
        shipping_cost: formData.shipping_cost ? parseFloat(formData.shipping_cost) : null,
        is_featured:   formData.is_featured  || false,
        is_new:        formData.is_new !== undefined ? formData.is_new : true,
        // Digital fields - only send if product_type is digital
        file_url:  formData.product_type === "digital" ? formData.file_url  || null : null,
        file_type: formData.product_type === "digital" ? formData.file_type || null : null,
      };

      // Remove quantity from payload — stock is per-variant now
      delete payload.quantity;
      delete payload.color;

      if (!product || imagesModified) {
        payload.images = imagePreviews.map((p) => ({
          url:        p.path || p.url,
          angle:      p.angle,
          is_primary: p.is_primary,
        }));
      }

      let response;
      if (product) {
        response = await api.put(`/seller/products/${product.id}`, payload);
        setSuccessMessage("Product updated! Now set up your variants in Step 5.");
        setCreatedProductId(product.id);
      } else {
        response = await api.post("/seller/products", payload);
        setSuccessMessage("Product created! Now define your options and variants in Step 5.");
        setCreatedProductId(response.data.data?.id);
      }

      localStorage.removeItem(STORAGE_KEYS.PRODUCT_DRAFT);
      localStorage.removeItem(STORAGE_KEYS.IMAGE_PREVIEWS);

      // Mark steps 1-4 complete and advance to step 5
      setCompletedSteps(new Set([1, 2, 3, 4]));
      setCurrentStep(5);
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).flat().join(", "));
      } else {
        setError(err.response?.data?.message || err.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── finish (called from step 5) ────────────────────────────────────────────

  const handleFinish = () => {
    setShowSuccessPopup(true);
  };

  // ── effects ────────────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    setCatError(false);
    try {
      const res = await api.get("/categories/all");
      if (res.data.success && Array.isArray(res.data.data)) setCategories(res.data.data);
    } catch { setCatError(true); } finally { setLoadingCategories(false); }
  }, []);

  useEffect(() => {
    const loadProduct = async () => {
      if (!product?.id) return;
      try {
        const res = await api.get(`/seller/products/${product.id}/edit`);
        const data = sanitizeProductData(res.data.data);
        const images = (res.data.data.images || []).map((img, idx) => {
          // `img.url` is the absolute display URL built by the backend.
          // `img.path` is the relative storage path to round-trip on save.
          // Use getImageUrl() as a safety net in case the backend ever sends
          // a bare relative path (e.g. from an older record) so the <img>
          // src always resolves correctly even for offline/local-disk images.
          const displayUrl = img.url ? getImageUrl(img.url) : getImageUrl(img.path || "");
          return {
            url:        displayUrl,
            path:       img.path || img.url,   // relative path sent back on update
            is_primary: img.is_primary || idx === 0,
            angle:      img.angle || "default",
            isExisting: true,
            name:       (img.path || img.url || "").split("/").pop(),
            size:       "Existing",
          };
        });
        setImagePreviews(images);
        const { images: _, ...rest } = data;
        setFormData((prev) => ({ ...prev, ...rest }));
        setCreatedProductId(product.id);
      } catch { setError("Failed to load product details."); }
    };

    if (product?.id) {
      loadProduct();
    } else {
      const saved = localStorage.getItem(STORAGE_KEYS.IMAGE_PREVIEWS);
      if (saved) { try { setImagePreviews(JSON.parse(saved)); } catch {} }
    }
    fetchCategories();
  }, [product, fetchCategories]);

  // Auto-save draft
  useEffect(() => {
    if (product) return;
    try {
      const draft = { ...formData };
      delete draft.seller_id;
      localStorage.setItem(STORAGE_KEYS.PRODUCT_DRAFT, JSON.stringify(draft));
    } catch {}
  }, [formData, product]);

  useEffect(() => {
    if (product) return;
    try {
      const toSave = imagePreviews.map((p) => ({ url: p.url, is_primary: p.is_primary, angle: p.angle, isExisting: p.isExisting }));
      localStorage.setItem(STORAGE_KEYS.IMAGE_PREVIEWS, JSON.stringify(toSave));
    } catch {}
  }, [imagePreviews, product]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (showSuccessPopup) {
      const timer = setTimeout(() => {
        if (!isMounted.current) return;
        setShowSuccessPopup(false);
        if (onSuccess) onSuccess();
        else navigate("/seller/dashboard");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessPopup, onSuccess, navigate]);

  const handleCancel = () => {
    if (!product) { setCancelModal("leave"); return; }
    if (onCancel) onCancel(); else navigate("/seller/dashboard");
  };

  const confirmCancel = () => {
    setCancelModal(false);
    if (onCancel) onCancel(); else navigate("/seller/dashboard");
  };

  // ── step content ──────────────────────────────────────────────────────────

  const renderStepContent = () => {
    switch (currentStep) {

      // ── STEP 1: Basic Info ─────────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Basic Information</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">English fields are required</p>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Product Type *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PRODUCT_TYPES.map((pt) => (
                  <button key={pt.value} type="button"
                    onClick={() => setFormData((p) => ({ ...p, product_type: pt.value }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      formData.product_type === pt.value
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-slate-600 hover:border-gray-300"
                    }`}>
                    <p className="font-medium text-sm text-gray-900 dark:text-slate-100">{pt.label}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{pt.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Product Name (English) *</label>
                <input type="text" name="name_en" value={formData.name_en} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Enter product name in English" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Product Name (Myanmar) <span className="text-xs text-gray-400">(Optional)</span></label>
                <input type="text" name="name_mm" value={formData.name_mm} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Enter product name in Myanmar" />
              </div>
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Description (English) *</label>
                <textarea name="description_en" rows="4" value={formData.description_en} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Describe your product in detail..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Description (Myanmar) <span className="text-xs text-gray-400">(Optional)</span></label>
                <textarea name="description_mm" rows="4" value={formData.description_mm} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Describe in Myanmar..." />
              </div>
            </div>

            {/* Category + Condition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Category *</label>
                {loadingCategories ? (
                  <div className="flex items-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600" />
                    <span className="ml-2 text-gray-600 dark:text-slate-400">Loading categories...</span>
                  </div>
                ) : categories.length > 0 ? (
                  <select name="category_id" value={formData.category_id} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                    <option value="">Select a category</option>
                    {categories.map((parent) => (
                      <optgroup key={parent.id} label={catName(parent)}>
                        {parent.children?.length > 0
                          ? parent.children.map((c) => <option key={c.id} value={c.id}>{catName(c)}</option>)
                          : <option disabled>No sub-categories</option>}
                      </optgroup>
                    ))}
                  </select>
                ) : (
                  <div className="text-center py-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-600">
                    <p className="text-gray-500 dark:text-slate-400 text-sm mb-2">
                      {catError ? "Failed to load categories." : "No categories available."}
                    </p>
                    <button type="button" onClick={fetchCategories}
                      className="text-xs text-green-700 dark:text-green-400 underline">Try again</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Condition *</label>
                <select name="condition" value={formData.condition} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                  {PRODUCT_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                  {PRODUCT_CONDITIONS.find((c) => c.value === formData.condition)?.description}
                </p>
              </div>
            </div>

            {/* Brand / Model / Material / Origin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[["brand","Brand"],["model","Model"],["material","Material"],["origin","Country of Origin"]].map(([name, label]) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {label} <span className="text-xs text-gray-400">(Optional)</span>
                  </label>
                  <input type="text" name={name} value={formData[name]} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder={label} />
                </div>
              ))}
            </div>

            {/* Digital file fields */}
            {formData.product_type === "digital" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">File URL *</label>
                  <input type="url" name="file_url" value={formData.file_url} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder="https://your-cdn.com/file.pdf" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">File Type</label>
                  <input type="text" name="file_type" value={formData.file_type} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder="e.g. PDF, ZIP, MP4" />
                </div>
              </div>
            )}
          </div>
        );

      // ── STEP 2: Pricing & B2B ──────────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Pricing & B2B</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Set the base price and B2B rules. Per-variant pricing is configured in Step 5.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Base Price (MMK) *</label>
                <input type="number" name="price" step="0.01" min="0" value={formData.price} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="0.00" />
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Displayed on listing cards. Variants override per-combination.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Discount Price (MMK) <span className="text-xs text-gray-400">(Optional)</span></label>
                <input type="number" name="discount_price" step="0.01" min="0" value={formData.discount_price} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  MOQ (Minimum Order Qty) *
                </label>
                <input type="number" name="moq" min="1" value={formData.moq} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="1" />
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Product-level fallback. Variants can override.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Quantity Unit *</label>
                <select name="quantity_unit" value={formData.quantity_unit} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                  {QUANTITY_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Unit for stock and ordering (e.g. kg, meter, piece).</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Lead Time <span className="text-xs text-gray-400">(Optional)</span></label>
                <input type="text" name="lead_time" value={formData.lead_time} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="e.g. 3–5 days" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Weight (kg) <span className="text-xs text-gray-400">(Optional)</span></label>
                <input type="number" step="0.01" min="0" name="weight_kg" value={formData.weight_kg} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Product weight" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Packaging Details <span className="text-xs text-gray-400">(Optional)</span></label>
                <input type="text" name="packaging_details" value={formData.packaging_details} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="e.g. Carton box, 12 pcs per carton" />
              </div>
            </div>
          </div>
        );

      // ── STEP 3: Media & Specs (unchanged from original) ────────────────────
      case 3:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Media & Specifications</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Add images and product specifications</p>
            </div>

            {/* Image upload */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Product Images * <span className="text-xs font-normal text-gray-500">({imagePreviews.length} image(s))</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex gap-1">
                    <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageFromUrl(); } }}
                      placeholder="https://…/image.jpg"
                      className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1.5 w-48 focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" />
                    <button type="button" onClick={addImageFromUrl} disabled={!urlInput.trim()}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 text-gray-700 dark:text-slate-300">
                      Add URL
                    </button>
                  </div>
                  {imagePreviews.length > 0 && (
                    <button type="button" onClick={() => setCancelModal("clear-images")}
                      className="px-3 py-1.5 text-sm border border-red-300 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {isUploadingImages && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Uploading images...</span>
                    <span className="text-sm text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900/30 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <label className="block w-full h-40 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl hover:border-green-500 transition-all cursor-pointer bg-gray-50 dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-green-900/20 group">
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <CloudArrowUpIcon className="h-10 w-10 text-gray-400 dark:text-slate-500 mb-2 group-hover:text-green-500" />
                  <span className="text-base font-medium text-gray-600 dark:text-slate-400 group-hover:text-green-600">
                    {imagePreviews.length > 0 ? "Add more images" : "Click to upload images"}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-slate-500 mt-1 text-center">
                    PNG, JPG, WebP up to 5 MB each
                  </span>
                </div>
                <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageSelect} className="hidden" />
              </label>

              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {imagePreviews.map((image, index) => (
                    <div key={index} draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-move
                        ${image.is_primary ? "border-green-500 ring-2 ring-green-200 dark:ring-green-800" : "border-gray-200 dark:border-slate-600 hover:border-green-300"}
                        ${draggedImage === index ? "opacity-50" : ""}`}>
                      <div className="aspect-square bg-gray-100 dark:bg-slate-800 relative">
                        <img src={getImageUrl(image.url)} alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewImage(image.url)} />
                        {image.is_primary && (
                          <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center">
                            <CheckCircleIcon className="h-3 w-3 mr-1" /> Primary
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <select value={image.angle} onChange={(e) => updateImageAngle(index, e.target.value)}
                            className="text-xs bg-black/60 text-white border-none rounded px-1.5 py-0.5 focus:ring-0">
                            {IMAGE_ANGLES.map((a) => <option key={a.value} value={a.value}>{a.icon} {a.label}</option>)}
                          </select>
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <div className="flex flex-col space-y-1">
                            <button type="button" onClick={() => setPrimaryImage(index)}
                              className={`px-2 py-1 rounded text-xs flex items-center ${image.is_primary ? "bg-green-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}>
                              <StarIcon className="h-3 w-3 mr-1" />{image.is_primary ? "Primary" : "Set Primary"}
                            </button>
                            <button type="button" onClick={() => removeImage(index)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs flex items-center hover:bg-red-700">
                              <TrashIcon className="h-3 w-3 mr-1" /> Remove
                            </button>
                            <button type="button" onClick={() => setPreviewImage(image.url)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center hover:bg-blue-700">
                              <EyeIcon className="h-3 w-3 mr-1" /> Preview
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Specifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-4">
                Product Specifications <span className="text-xs text-gray-400">(Optional)</span>
              </label>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <input type="text" name="key" placeholder="Spec name (e.g. Material)"
                      value={specInput.key} onChange={(e) => setSpecInput((p) => ({ ...p, key: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" />
                  </div>
                  <div className="md:col-span-2">
                    <input type="text" name="value" placeholder="Spec value (e.g. Cotton)"
                      value={specInput.value} onChange={(e) => setSpecInput((p) => ({ ...p, value: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <button type="button" onClick={addSpecification} disabled={!specInput.key || !specInput.value}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center">
                      <PlusIcon className="h-4 w-4 mr-1" /> Add
                    </button>
                  </div>
                </div>
              </div>
              {Object.entries(formData.specifications ?? {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-3 mb-2 group">
                  <span className="font-medium text-gray-900 dark:text-slate-100 min-w-[120px]">{key}:</span>
                  <span className="text-gray-600 dark:text-slate-400 flex-1 ml-2">{value}</span>
                  <button type="button" onClick={() => removeSpecification(key)}
                    className="text-red-600 hover:text-red-800 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      // ── STEP 4: Shipping & More ───────────────────────────────────────────
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Shipping & More</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Delivery, warranty, and flags</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                ["shipping_cost", "Shipping Cost (MMK)", "number", "0.00"],
                ["shipping_time", "Shipping Time", "text", "e.g. 3–5 business days"],
                ["warranty_period", "Warranty Period", "text", "e.g. 12 months"],
                ["return_policy", "Return Policy", "text", "e.g. 30 days return"],
              ].map(([name, label, type, placeholder]) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {label} <span className="text-xs text-gray-400">(Optional)</span>
                  </label>
                  <input type={type} name={name} value={formData[name]} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder={placeholder} />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Warranty Type <span className="text-xs text-gray-400">(Optional)</span>
              </label>
              <select name="warranty_type" value={formData.warranty_type} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                <option value="">Select warranty type</option>
                {WARRANTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Additional Information <span className="text-xs text-gray-400">(Optional)</span>
              </label>
              <textarea name="additional_info" rows="3" value={formData.additional_info} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                placeholder="Any additional notes..." />
            </div>
            <div className="space-y-3">
              {[
                ["is_featured", "is_featured", "Feature this product on homepage", "blue"],
                ["is_active",   "is_active",   "Make this product active and visible", "green"],
                ["is_new",      "is_new",       "Mark as new product", "yellow"],
              ].map(([id, name, label, color]) => (
                <div key={id} className={`flex items-center space-x-3 p-4 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg border border-${color}-200 dark:border-${color}-800`}>
                  <input id={id} name={name} type="checkbox" checked={formData[name]} onChange={handleChange}
                    className={`h-5 w-5 text-${color}-600 focus:ring-${color}-500 border-gray-300 rounded`} />
                  <label htmlFor={id} className="text-sm font-medium text-gray-900 dark:text-slate-100">{label}</label>
                </div>
              ))}
            </div>
          </div>
        );

      // ── STEP 5: Options & Variants ─────────────────────────────────────────
      case 5:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Options & Variants</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Define the choices buyers can select (Color, Size, etc.), then generate and price your variants.
              </p>
              {!createdProductId && (
                <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                  <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
                  Complete Steps 1–4 first to save the product, then configure variants here.
                </div>
              )}
            </div>

            {createdProductId ? (
              <>
                {/* Step A: Define options */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Step A — Define Options</p>
                  <ProductOptionsEditor
                    productId={createdProductId}
                    onSaved={() => {}}
                  />
                </div>

                {/* Step B: Generate & price variants */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Step B — Generate & Price Variants</p>
                  <VariantTable
                    productId={createdProductId}
                    onUpdated={() => {}}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button type="button" onClick={handleFinish}
                    className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-sm transition-colors">
                    <CheckCircleIcon className="h-5 w-5" />
                    Done — Finish Listing
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 dark:text-slate-500">
                <p className="text-sm">Save the product in Steps 1–4 first.</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ── image preview modal ────────────────────────────────────────────────────

  const ImagePreviewModal = () => {
    if (!previewImage) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="relative max-w-4xl max-h-[90vh] mx-4">
          <button onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/75">
            <XMarkIcon className="h-6 w-6" />
          </button>
          <img src={getImageUrl(previewImage)} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      </div>
    );
  };

  // ── whether the current nav button is "Submit" or "Next" ──────────────────

  const isLastInfoStep = currentStep === 4;
  const isVariantsStep = currentStep === 5;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <ImagePreviewModal />

      {/* Leave modal */}
      {cancelModal === "leave" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Leave without saving?</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">Your draft has been auto-saved.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelModal(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300">Keep Editing</button>
              <button onClick={confirmCancel} className="px-4 py-2 bg-gray-800 dark:bg-slate-700 text-white rounded-lg text-sm font-medium">Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* Clear images modal */}
      {cancelModal === "clear-images" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Remove all images?</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelModal(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300">Cancel</button>
              <button onClick={() => { setImagePreviews([]); setImagesModified(true); setCancelModal(false); }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Remove All</button>
            </div>
          </div>
        </div>
      )}

      {/* Success popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md mx-4 shadow-xl text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">All Done!</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">{successMessage}</p>
            <p className="text-sm text-gray-500 dark:text-slate-500">Redirecting...</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header + step indicators */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 mb-8">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {product ? "Edit Product" : "New Listing"}
              </h1>
              <p className="text-gray-500 dark:text-slate-400 mt-0.5 text-sm">
                {product ? "Update your product details" : "Create a new product listing"}
                {!product && <span className="text-blue-600 dark:text-blue-400 ml-2">• Draft auto-saved</span>}
              </p>
            </div>
            <button onClick={handleCancel} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Step bar */}
          <div className="px-6 py-5">
            {/* Mobile */}
            <div className="sm:hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">{STEPS[currentStep - 1]?.title}</span>
                <span className="text-xs font-bold text-green-700 dark:text-green-400">Step {currentStep} of {STEPS.length}</span>
              </div>
              <div className="flex gap-1.5">
                {STEPS.map((step) => (
                  <button key={step.id} onClick={() => goToStep(step.id)}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      currentStep === step.id ? "bg-green-500" : completedSteps.has(step.id) ? "bg-green-400" : "bg-gray-200 dark:bg-slate-600"
                    }`} aria-label={step.title} />
                ))}
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden sm:flex items-start">
              {STEPS.map((step, index) => {
                const done    = completedSteps.has(step.id);
                const current = currentStep === step.id;
                const last    = index === STEPS.length - 1;
                return (
                  <React.Fragment key={step.id}>
                    <button onClick={() => goToStep(step.id)} className="flex flex-col items-center flex-shrink-0 group">
                      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-all
                        ${current ? "border-green-500 bg-green-500 text-white shadow shadow-green-200"
                                  : done ? "border-green-400 bg-green-400 text-white"
                                         : "border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500"}`}>
                        {done ? <CheckCircleIcon className="h-5 w-5" /> : step.id}
                      </div>
                      <span className={`mt-1.5 text-[11px] font-medium text-center leading-tight w-16 break-words
                        ${current ? "text-green-700 dark:text-green-400" : done ? "text-gray-600 dark:text-slate-400" : "text-gray-400 dark:text-slate-500"}`}>
                        {step.title}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 text-center w-16 leading-tight">{step.description}</span>
                    </button>
                    {!last && (
                      <div className="flex-1 mt-4 mx-2">
                        <div className={`h-0.5 rounded-full transition-colors ${done ? "bg-green-400" : "bg-gray-200 dark:bg-slate-700"}`} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form body */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-start">
              <ExclamationCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && currentStep === 5 && (
            <div className="mx-6 mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 flex items-start">
              <CheckCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="p-6 sm:p-8">{renderStepContent()}</div>

          {/* Navigation buttons (hidden on step 5 which has its own CTA) */}
          {!isVariantsStep && (
            <div className="flex justify-between items-center px-6 sm:px-8 py-5 border-t border-gray-200 dark:border-slate-700">
              <div>
                {currentStep > 1 && (
                  <button type="button" onClick={prevStep}
                    className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium">
                    <ChevronLeftIcon className="h-4 w-4" /> Previous
                  </button>
                )}
              </div>
              <div>
                {isLastInfoStep ? (
                  /* Step 4 → Submit core product then advance to Step 5 */
                  <button type="button" onClick={handleCoreSubmit} disabled={loading || isUploadingImages}
                    className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-sm disabled:opacity-50 transition-colors">
                    {loading ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />{product ? "Updating…" : "Creating…"}</>
                    ) : (
                      <><CheckCircleIcon className="h-4 w-4" />{product ? "Update & Continue" : "Save & Continue"}</>
                    )}
                  </button>
                ) : (
                  <button type="button" onClick={nextStep} disabled={!validateStep(currentStep)}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                    Next <ChevronRightIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductForm;