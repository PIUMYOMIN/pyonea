// pages/Seller/products/ProductForm.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../../utils/api";
import ProductOptionsEditor from "../../../components/seller/ProductOptionsEditor";
import VariantTable from "../../../components/seller/VariantTable";
import WholesaleTiersEditor from "../../../components/seller/WholesaleTiersEditor";
import {
  XMarkIcon, PhotoIcon, TrashIcon, PlusIcon,
  ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon,
  ExclamationCircleIcon, CloudArrowUpIcon, ArrowsUpDownIcon,
  EyeIcon, StarIcon, PencilIcon,
} from "@heroicons/react/24/outline";

// ?? constants ?????????????????????????????????????????????????????????????????

const STORAGE_KEYS = {
  PRODUCT_DRAFT:   "product_draft",
  IMAGE_PREVIEWS:  "product_image_previews",
};

const IMAGE_ANGLES = [
  { value: "front", label: "Front View", icon: "???" },
  { value: "back", label: "Back View", icon: "??" },
  { value: "side", label: "Side View", icon: "??" },
  { value: "top", label: "Top View", icon: "??" },
  { value: "default", label: "Other View", icon: "??" },
];

const PRODUCT_TYPES = [
  { value: "physical", labelKey: "physical", hintKey: "physical_hint", label: "Physical", hint: "Has stock, requires shipping." },
  { value: "digital",  labelKey: "digital",  hintKey: "digital_hint",  label: "Digital",  hint: "Download/link delivered. No shipping." },
  { value: "service",  labelKey: "service",  hintKey: "service_hint",  label: "Service",  hint: "No stock, no shipping (e.g. consulting)." },
];

const QUANTITY_UNITS = [
  { value: "piece",   labelKey: "piece",  label: "Piece" },
  { value: "kg",      labelKey: "kg",     label: "Kilogram" },
  { value: "gram",    labelKey: "gram",   label: "Gram" },
  { value: "meter",   labelKey: "meter",  label: "Meter" },
  { value: "liter",   labelKey: "liter",  label: "Liter" },
  { value: "set",     labelKey: "set",    label: "Set" },
  { value: "pack",    labelKey: "pack",   label: "Pack" },
  { value: "box",     labelKey: "box",    label: "Box" },
  { value: "pallet",  labelKey: "pallet", label: "Pallet" },
  { value: "roll",    labelKey: "roll",   label: "Roll" },
];

const WARRANTY_TYPES = [
  { value: "manufacturer",  labelKey: "manufacturer",  label: "Manufacturer Warranty" },
  { value: "seller",        labelKey: "seller",        label: "Seller Warranty" },
  { value: "international", labelKey: "international", label: "International Warranty" },
  { value: "no_warranty",   labelKey: "no_warranty",   label: "No Warranty" },
];

const PRODUCT_CONDITIONS = [
  { value: "new",           label: "New",               description: "Brand new, never used" },
  { value: "used_like_new", label: "Used ? Like New", description: "Used but looks and functions like new" },
  { value: "used_good", label: "Used ? Good", description: "Used with minor signs of wear" },
  { value: "used_fair", label: "Used ? Fair", description: "Used with visible signs of wear" },
];

// ?? helpers ???????????????????????????????????????????????????????????????????

const validateImageFile = (file, tf) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (!allowed.includes(file.type)) return { valid: false, message: tf("images.invalid_format", "Invalid format. Use JPEG, PNG, or WebP.") };
  if (file.size > 5 * 1024 * 1024)  return { valid: false, message: tf("images.too_large", "Image must be under 5 MB.") };
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

// ?? default form data ?????????????????????????????????????????????????????????

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

// ?? steps ?????????????????????????????????????????????????????????????????????

const STEPS = [
  { id: 1, titleKey: "basic_info", title: "Basic Info", description: "Product details" },
  { id: 2, titleKey: "pricing",    title: "Pricing",    description: "Price & B2B" },
  { id: 3, titleKey: "media",      title: "Media",      description: "Images & specs" },
  { id: 4, titleKey: "shipping",   title: "Shipping",   description: "Delivery & more" },
  { id: 5, titleKey: "variants",   title: "Variants",   description: "Options & stock" },
];

//Product Form

const ProductForm = ({ product = null, mode = "seller", onSuccess, onCancel }) => {
  const { t, i18n } = useTranslation();
  const navigate  = useNavigate();
  const fileInputRef = useRef(null);
  const isMounted    = useRef(true);
  const catName = (c) => i18n.language === "my" ? (c.name_mm || c.name_en) : c.name_en;
  const tf = (key, defaultValue, options = {}) => t(`product_form.${key}`, { defaultValue, ...options });
  const optionalLabel = tf("labels.optional", "Optional");
  const stepTitle = (step) => tf(`steps.${step.titleKey}.title`, step.title);
  const stepDescription = (step) => tf(`steps.${step.titleKey}.description`, step.description);
  const productTypeLabel = (pt) => tf(`product_types.${pt.labelKey}`, pt.label);
  const productTypeHint = (pt) => tf(`product_types.${pt.hintKey}`, pt.hint);
  const quantityUnitLabel = (u) => tf(`quantity_units.${u.labelKey}`, u.label);
  const warrantyTypeLabel = (w) => tf(`warranty_types.${w.labelKey}`, w.label);
  const conditionLabel = (c) => tf(`conditions.${c.value}.label`, c.label);
  const conditionDescription = (c) => tf(`conditions.${c.value}.description`, c.description);
  const imageAngleLabel = (a) => tf(`image_angles.${a.value}`, a.label);
  const isAdminMode = mode === "admin";
  const productApiBase = isAdminMode ? "/admin/products" : "/seller/products";
  const steps = useMemo(() => (isAdminMode ? STEPS.slice(0, 4) : STEPS), [isAdminMode]);

  // formData holds all the core product fields (except images) that are submitted in steps 1-4. It initializes from:
  const [formData, setFormData] = useState(() => {
    if (product) {
      const rest = { ...product };
      delete rest.images;
      return { ...DEFAULT_FORM, ...rest };
    }
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCT_DRAFT);
    if (saved) {
      try { return { ...DEFAULT_FORM, ...JSON.parse(saved) }; } catch {
        // Ignore malformed local drafts and fall back to defaults.
      }
    }
    return DEFAULT_FORM;
  });

  // createdProductId tracks the ID returned after step 1?4 submit,
  // so step 5 can load options/variants for the right product.
  const [createdProductId, setCreatedProductId] = useState(product?.id ?? null);

  const [categories,         setCategories]         = useState([]);
  const [loadingCategories,  setLoadingCategories]  = useState(false);
  const [catError,           setCatError]           = useState(false);
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState("");
  const [limitErrorData,     setLimitErrorData]     = useState(null);
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

  // ?? image helpers ????????????????????????????????????????????????????????????

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
      const v = validateImageFile(file, tf);
      v.valid ? validFiles.push(file) : errors.push(`${file.name}: ${v.message}`);
    });

    if (errors.length) setError(tf("images.some_rejected", "Some images were rejected:\n{{details}}", { details: errors.join("\n") }));
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
        const uploadUrl = isAdminMode && product?.id
          ? `${productApiBase}/${product.id}/upload-image`
          : "/seller/products/upload-image";
        const res = await api.post(uploadUrl, fd, {
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
        setError(tf("images.upload_failed", "Failed to upload {{name}}: {{error}}", { name: file.name, error: err.message }));
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

  // ?? form change ???????????????????????????????????????????????????????????????

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

  // ?? step validation ????????????????????????????????????????????????????????????

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
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const goToStep = (step) => {
    if (createdProductId || completedSteps.has(step - 1) || step === 1) {
      setCurrentStep(step);
    }
  };

  // ?? submit steps 1-4 (core product) ??????????????????????????????????????????

  const handleCoreSubmit = async () => {
    if (loading || isUploadingImages) return;
    setLoading(true);
    setError("");
    setLimitErrorData(null);

    try {
      const priceNum    = parseFloat(formData.price);
      const moqNum      = parseInt(formData.moq, 10);
      const categoryNum = parseInt(formData.category_id, 10);
      if (Number.isNaN(priceNum) || formData.price === "") {
        setError(tf("errors.valid_price", "Please enter a valid price."));
        setLoading(false);
        return;
      }
      if (Number.isNaN(moqNum) || moqNum < 1) {
        setError(tf("errors.valid_moq", "Please enter a valid minimum order quantity (MOQ)."));
        setLoading(false);
        return;
      }
      if (Number.isNaN(categoryNum)) {
        setError(tf("errors.select_category", "Please select a category."));
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        price:          priceNum,
        moq:            moqNum,
        quantity_step: moqNum,   // always equal to MOQ ? backend derives it the same way
        category_id:    categoryNum,
        discount_price: (() => {
          if (!formData.discount_price) return null;
          const d = parseFloat(formData.discount_price);
          return Number.isNaN(d) ? null : d;
        })(),
        weight_kg:     formData.weight_kg     ? parseFloat(formData.weight_kg)     : null,
        shipping_cost: formData.shipping_cost ? parseFloat(formData.shipping_cost) : null,
        is_featured:   formData.is_featured  || false,
        is_new:        formData.is_new !== undefined ? formData.is_new : true,
        // Digital fields - only send if product_type is digital
        file_url:  formData.product_type === "digital" ? formData.file_url  || null : null,
        file_type: formData.product_type === "digital" ? formData.file_type || null : null,
      };

      // Remove quantity from payload ? stock is per-variant now
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
        response = await api.put(`${productApiBase}/${product.id}`, payload);
        setSuccessMessage(
          isAdminMode
            ? tf("messages.admin_updated", "Product updated successfully.")
            : tf("messages.updated", "Product updated! Now set up your variants in Step 5.")
        );
        setCreatedProductId(product.id);
      } else {
        response = await api.post("/seller/products", payload);
        setSuccessMessage(tf("messages.created", "Product created! Now define your options and variants in Step 5."));
        const created = response.data?.data;
        const newId = created?.id ?? created?.data?.id;
        setCreatedProductId(newId ?? null);
        if (!newId) {
          setError(tf("errors.missing_created_id", "Product was created but the response did not include an id. Refresh and open the product to add variants."));
        }
      }

      localStorage.removeItem(STORAGE_KEYS.PRODUCT_DRAFT);
      localStorage.removeItem(STORAGE_KEYS.IMAGE_PREVIEWS);

      if (isAdminMode) {
        setCompletedSteps(new Set([1, 2, 3, 4]));
        setShowSuccessPopup(true);
        return;
      }

      // Mark steps 1-4 complete and advance to step 5
      setCompletedSteps(new Set([1, 2, 3, 4]));
      setCurrentStep(5);
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).flat().join(", "));
      } else if (err.response?.data?.error === "product_limit_reached") {
        const limitData = err.response?.data?.data || {};
        setLimitErrorData(limitData);
        setError(tf("errors.product_limit_reached", "Your {{plan}} plan product limit ({{limit}} products) has been reached. Upgrade your plan to keep adding products.", {
          plan: limitData.plan_name || tf("labels.current_plan", "current"),
          limit: limitData.plan_limit ?? limitData.current_count ?? "",
        }));
      } else {
        setError(err.response?.data?.message || err.message || tf("errors.generic", "Something went wrong."));
      }
    } finally {
      setLoading(false);
    }
  };

  // ?? finish (called from step 5) ????????????????????????????????????????????

  const handleFinish = () => {
    setShowSuccessPopup(true);
  };

  // ?? effects ????????????????????????????????????????????????????????????????

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
        const res = await api.get(`${productApiBase}/${product.id}/edit`);
        const data = sanitizeProductData(res.data.data);
        const images = (res.data.data.images || []).map((img, idx) => {
          // `img.url` is the absolute display URL built by the backend.
          // `img.path` is the relative storage path to round-trip on save.
          // Use getImageUrl() as a safety net in case the backend ever sends
          // a bare relative path (e.g. from an older record) so the <img loading="lazy">
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
        const rest = { ...data };
        delete rest.images;
        setFormData((prev) => ({ ...prev, ...rest }));
        setCreatedProductId(product.id);
      } catch { setError(tf("errors.load_product", "Failed to load product details.")); }
    };

    if (product?.id) {
      loadProduct();
    } else {
      const saved = localStorage.getItem(STORAGE_KEYS.IMAGE_PREVIEWS);
      if (saved) { try { setImagePreviews(JSON.parse(saved)); } catch {
        // Ignore malformed local image preview drafts.
      } }
    }
    fetchCategories();
  }, [product, fetchCategories, productApiBase]);

  // Auto-save draft
  useEffect(() => {
    if (product) return;
    try {
      const draft = { ...formData };
      delete draft.seller_id;
      localStorage.setItem(STORAGE_KEYS.PRODUCT_DRAFT, JSON.stringify(draft));
    } catch {
      // Ignore localStorage write failures, such as private browsing limits.
    }
  }, [formData, product]);

  useEffect(() => {
    if (product) return;
    try {
      const toSave = imagePreviews.map((p) => ({ url: p.url, is_primary: p.is_primary, angle: p.angle, isExisting: p.isExisting }));
      localStorage.setItem(STORAGE_KEYS.IMAGE_PREVIEWS, JSON.stringify(toSave));
    } catch {
      // Ignore localStorage write failures, such as private browsing limits.
    }
  }, [imagePreviews, product]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentStep]);

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

  // ?? step content ??????????????????????????????????????????????????????????

  const renderStepContent = () => {
    switch (currentStep) {

      // ?? STEP 1: Basic Info ?????????????????????????????????????????????????
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{tf("sections.basic_title", "Basic Information")}</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">{tf("sections.basic_subtitle", "English fields are required")}</p>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {tf("labels.product_type", "Product Type")} *
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
                    <p className="font-medium text-sm text-gray-900 dark:text-slate-100">{productTypeLabel(pt)}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{productTypeHint(pt)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.name_en", "Product Name (English)")} *</label>
                <input type="text" name="name_en" value={formData.name_en} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.name_en", "Enter product name in English")} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.name_mm", "Product Name (Myanmar)")} <span className="text-xs text-gray-400">({optionalLabel})</span></label>
                <input type="text" name="name_mm" value={formData.name_mm} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.name_mm", "Enter product name in Myanmar")} />
              </div>
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.description_en", "Description (English)")} *</label>
                <textarea name="description_en" rows="4" value={formData.description_en} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.description_en", "Describe your product in detail...")} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.description_mm", "Description (Myanmar)")} <span className="text-xs text-gray-400">({optionalLabel})</span></label>
                <textarea name="description_mm" rows="4" value={formData.description_mm} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.description_mm", "Describe in Myanmar...")} />
              </div>
            </div>

            {/* Category + Condition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.category", "Category")} *</label>
                {loadingCategories ? (
                  <div className="flex items-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600" />
                    <span className="ml-2 text-gray-600 dark:text-slate-400">{tf("messages.loading_categories", "Loading categories...")}</span>
                  </div>
                ) : categories.length > 0 ? (
                  <select name="category_id" value={formData.category_id} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                    <option value="">{tf("placeholders.select_category", "Select a category")}</option>
                    {categories.map((parent) => (
                      <optgroup key={parent.id} label={catName(parent)}>
                        {parent.children?.length > 0
                          ? parent.children.map((c) => <option key={c.id} value={c.id}>{catName(c)}</option>)
                          : <option disabled>{tf("messages.no_sub_categories", "No sub-categories")}</option>}
                      </optgroup>
                    ))}
                  </select>
                ) : (
                  <div className="text-center py-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-600">
                    <p className="text-gray-500 dark:text-slate-400 text-sm mb-2">
                      {catError ? tf("errors.load_categories", "Failed to load categories.") : tf("messages.no_categories", "No categories available.")}
                    </p>
                    <button type="button" onClick={fetchCategories}
                      className="text-xs text-green-700 dark:text-green-400 underline">{tf("actions.try_again", "Try again")}</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.condition", "Condition")} *</label>
                <select name="condition" value={formData.condition} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                  {PRODUCT_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{conditionLabel(c)}</option>)}
                </select>
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                  {conditionDescription(PRODUCT_CONDITIONS.find((c) => c.value === formData.condition) || PRODUCT_CONDITIONS[0])}
                </p>
              </div>
            </div>

            {/* Brand / Model / Material / Origin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[["brand", tf("labels.brand", "Brand")], ["model", tf("labels.model", "Model")], ["material", tf("labels.material", "Material")], ["origin", tf("labels.origin", "Country of Origin")]].map(([name, label]) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {label} <span className="text-xs text-gray-400">({optionalLabel})</span>
                  </label>
                  <input type="text" name={name} value={formData[name]} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder={tf(`placeholders.${name}`, label)} />
                </div>
              ))}
            </div>

            {/* Digital file fields */}
            {formData.product_type === "digital" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.file_url_required", "File URL *")}</label>
                  <input type="url" name="file_url" value={formData.file_url} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder={tf("placeholders.image_url", "https://?/image.jpg")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.file_type", "File Type")}</label>
                  <input type="text" name="file_type" value={formData.file_type} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder={tf("placeholders.file_type", "e.g. PDF, ZIP, MP4")} />
                </div>
              </div>
            )}
          </div>
        );

      // ?? STEP 2: Pricing & B2B ??????????????????????????????????????????????
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{tf("sections.pricing_title", "Pricing & B2B")}</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                {tf("sections.pricing_subtitle", "Set the base price and B2B rules. Per-variant pricing is configured in Step 5.")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.base_price", "Base Price (MMK)")} *</label>
                <input type="number" name="price" step="0.01" min="0" value={formData.price} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.base_price", "0.00")} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.discount_price", "Discount Price (MMK)")} <span className="text-xs text-gray-400">({optionalLabel})</span></label>
                <input type="number" name="discount_price" step="0.01" min="0" value={formData.discount_price} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.discount_price", "0.00")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {tf("labels.moq", "MOQ (Minimum Order Qty)")} *
                </label>
                <input type="number" name="moq" min="1" value={formData.moq} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="1" />
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                  {tf("hints.moq", "Buyers must order at least this quantity.")}
                  {formData.moq > 1 && (
                    <span className="block text-amber-600 dark:text-amber-400 mt-0.5">
                      {tf("hints.valid_quantities", "Valid quantities: {{a}}, {{b}}, {{c}}... (step = MOQ)", { a: formData.moq, b: Number(formData.moq) * 2, c: Number(formData.moq) * 3 })}
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.quantity_unit", "Quantity Unit")} *</label>
                <select name="quantity_unit" value={formData.quantity_unit} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                  {QUANTITY_UNITS.map((u) => <option key={u.value} value={u.value}>{quantityUnitLabel(u)}</option>)}
                </select>
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">{tf("hints.quantity_unit", "Unit for stock and ordering (e.g. kg, meter, piece).")}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.lead_time", "Lead Time")} <span className="text-xs text-gray-400">({optionalLabel})</span></label>
                <input type="text" name="lead_time" value={formData.lead_time} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.lead_time", "e.g. 3-5 days")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.weight", "Weight (kg)")} <span className="text-xs text-gray-400">({optionalLabel})</span></label>
                <input type="number" step="0.01" min="0" name="weight_kg" value={formData.weight_kg} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.weight", "Product weight")} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{tf("labels.packaging_details", "Packaging Details")} <span className="text-xs text-gray-400">({optionalLabel})</span></label>
                <input type="text" name="packaging_details" value={formData.packaging_details} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.packaging_details", "e.g. Carton box, 12 pcs per carton")} />
              </div>
            </div>

            {/* ?? Wholesale Tier Pricing ??????????????????????????????????????? */}
            <div className="pt-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gray-100 dark:bg-slate-700" />
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Volume / Wholesale Pricing
                </span>
                <div className="h-px flex-1 bg-gray-100 dark:bg-slate-700" />
              </div>
              <WholesaleTiersEditor
                productId={createdProductId || (product?.id ?? null)}
                basePrice={parseFloat(formData.price) || 0}
                moq={parseInt(formData.moq, 10) || 1}
                quantityUnit={formData.quantity_unit || 'piece'}
              />
            </div>
          </div>
        );

      // ?? STEP 3: Media & Specs (unchanged from original) ????????????????????
      case 3:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{tf("sections.media_title", "Media & Specifications")}</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{tf("sections.media_subtitle", "Add images and product specifications")}</p>
            </div>

            {/* Image upload */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {tf("labels.product_images", "Product Images")} * <span className="text-xs font-normal text-gray-500">{tf("labels.image_count", "({{count}} image(s))", { count: imagePreviews.length })}</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex gap-1">
                    <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageFromUrl(); } }}
                      placeholder={tf("placeholders.image_url", "https://?/image.jpg")}
                      className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1.5 w-48 focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" />
                    <button type="button" onClick={addImageFromUrl} disabled={!urlInput.trim()}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 text-gray-700 dark:text-slate-300">
                      {tf("actions.add_url", "Add URL")}
                    </button>
                  </div>
                  {imagePreviews.length > 0 && (
                    <button type="button" onClick={() => setCancelModal("clear-images")}
                      className="px-3 py-1.5 text-sm border border-red-300 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                      {tf("actions.clear_all", "Clear All")}
                    </button>
                  )}
                </div>
              </div>

              {isUploadingImages && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{tf("messages.uploading_images", "Uploading images...")}</span>
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
                    {imagePreviews.length > 0 ? tf("actions.add_more_images", "Add more images") : tf("actions.click_upload_images", "Click to upload images")}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-slate-500 mt-1 text-center">
                    {tf("hints.image_formats", "PNG, JPG, WebP up to 5 MB each")}
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
                        <img loading="lazy" src={getImageUrl(image.url)} alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewImage(image.url)} />
                        {image.is_primary && (
                          <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center">
                            <CheckCircleIcon className="h-3 w-3 mr-1" /> {tf("labels.primary", "Primary")}
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <select value={image.angle} onChange={(e) => updateImageAngle(index, e.target.value)}
                            className="text-xs bg-black/60 text-white border-none rounded px-1.5 py-0.5 focus:ring-0">
                            {IMAGE_ANGLES.map((a) => <option key={a.value} value={a.value}>{a.icon} {imageAngleLabel(a)}</option>)}
                          </select>
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <div className="flex flex-col space-y-1">
                            <button type="button" onClick={() => setPrimaryImage(index)}
                              className={`px-2 py-1 rounded text-xs flex items-center ${image.is_primary ? "bg-green-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}>
                              <StarIcon className="h-3 w-3 mr-1" />{image.is_primary ? tf("labels.primary", "Primary") : tf("actions.set_primary", "Set Primary")}
                            </button>
                            <button type="button" onClick={() => removeImage(index)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs flex items-center hover:bg-red-700">
                              <TrashIcon className="h-3 w-3 mr-1" /> {tf("actions.remove", "Remove")}
                            </button>
                            <button type="button" onClick={() => setPreviewImage(image.url)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center hover:bg-blue-700">
                              <EyeIcon className="h-3 w-3 mr-1" /> {tf("actions.preview", "Preview")}
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
                  {tf("labels.specifications", "Product Specifications")} <span className="text-xs text-gray-400">({optionalLabel})</span>
                </label>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <input type="text" name="key" placeholder={tf("placeholders.spec_name", "Spec name (e.g. Material)")}
                      value={specInput.key} onChange={(e) => setSpecInput((p) => ({ ...p, key: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" />
                  </div>
                  <div className="md:col-span-2">
                    <input type="text" name="value" placeholder={tf("placeholders.spec_value", "Spec value (e.g. Cotton)")}
                      value={specInput.value} onChange={(e) => setSpecInput((p) => ({ ...p, value: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <button type="button" onClick={addSpecification} disabled={!specInput.key || !specInput.value}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center">
                      <PlusIcon className="h-4 w-4 mr-1" /> {tf("actions.add_spec", "Add")}
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

      // STEP 4: Shipping & More
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{tf("sections.shipping_title", "Shipping & More")}</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{tf("sections.shipping_subtitle", "Delivery, warranty, and flags")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div key="shipping_cost">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {tf("labels.shipping_cost", "Shipping Cost (MMK)")} <span className="text-xs text-gray-400">({optionalLabel})</span>
                </label>
                <input type="number" name="shipping_cost" value={formData.shipping_cost} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.shipping_cost", "0.00")} />
              </div>
              <div key="shipping_time">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {tf("labels.shipping_time", "Shipping Time")} <span className="text-xs text-gray-400">({optionalLabel})</span>
                </label>
                <input type="text" name="shipping_time" value={formData.shipping_time} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.shipping_time", "e.g. 3-5 business days")} />
              </div>
              <div key="warranty_period">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {tf("labels.warranty_period", "Warranty Period")} <span className="text-xs text-gray-400">({optionalLabel})</span>
                </label>
                <input type="text" name="warranty_period" value={formData.warranty_period} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.warranty_period", "e.g. 12 months")} />
              </div>
              <div key="return_policy">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {tf("labels.return_policy", "Return Policy")} <span className="text-xs text-gray-400">({optionalLabel})</span>
                </label>
                <input type="text" name="return_policy" value={formData.return_policy} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder={tf("placeholders.return_policy", "e.g. 30 days return")} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {tf("labels.warranty_type", "Warranty Type")} <span className="text-xs text-gray-400">({optionalLabel})</span>
              </label>
              <select name="warranty_type" value={formData.warranty_type} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                <option value="">{tf("placeholders.select_warranty_type", "Select warranty type")}</option>
                {WARRANTY_TYPES.map((w) => <option key={w.value} value={w.value}>{warrantyTypeLabel(w)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {tf("labels.additional_info", "Additional Information")} <span className="text-xs text-gray-400">({optionalLabel})</span>
              </label>
              <textarea name="additional_info" rows="3" value={formData.additional_info} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                placeholder={tf("placeholders.additional_info", "Any additional notes...")} />
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="free_shipping" checked={formData.free_shipping} onChange={handleChange} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700 dark:text-slate-300">{tf("labels.free_shipping", "Free Shipping")}</span>
              </label>
              {!formData.free_shipping && (
                <div className="flex items-center gap-2">
                  <input type="number" name="shipping_cost" value={formData.shipping_cost} onChange={handleChange} placeholder={tf("placeholders.shipping_cost", "0.00")}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800" />
                  <span className="text-xs text-gray-400">{tf("labels.shipping_cost_free", "Shipping cost ? leave 0 to mark it as free")}</span>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <input id="is_active" name="is_active" type="checkbox" checked={formData.is_active} onChange={handleChange}
                  className="h-4 w-4 flex-shrink-0 text-green-600 focus:ring-green-500 border-gray-300 rounded sm:h-5 sm:w-5" />
                <label htmlFor="is_active" className="min-w-0 text-sm font-medium leading-5 text-gray-900 dark:text-slate-100">{tf("labels.is_active", "Make this product active and visible")}</label>
              </div>
              {isAdminMode && (
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <input id="is_featured" name="is_featured" type="checkbox" checked={!!formData.is_featured} onChange={handleChange}
                    className="h-4 w-4 flex-shrink-0 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded sm:h-5 sm:w-5" />
                  <label htmlFor="is_featured" className="min-w-0 text-sm font-medium leading-5 text-gray-900 dark:text-slate-100">{tf("labels.is_featured", "Feature on homepage")}</label>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <input id="is_new" name="is_new" type="checkbox" checked={formData.is_new} onChange={handleChange}
                  className="h-4 w-4 flex-shrink-0 text-amber-600 focus:ring-amber-500 border-gray-300 rounded sm:h-5 sm:w-5" />
                <label htmlFor="is_new" className="min-w-0 text-sm font-medium leading-5 text-gray-900 dark:text-slate-100">{tf("labels.is_new", "Mark as new product")}</label>
              </div>
            </div>
          </div>
        );

      // ── STEP 5: Options & Variants ─────────────────────────────────────────
      case 5:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{tf("sections.variants_title", "Options & Variants")}</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                {tf("sections.variants_subtitle", "Define the choices buyers can select (Color, Size, etc.), then generate and price your variants.")}
              </p>
              {!createdProductId && (
                <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                  <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
                  {tf("messages.complete_steps_first", "Complete Steps 1-4 first to save the product, then configure variants here.")}
                </div>
              )}
            </div>

            {createdProductId ? (
              <>
                {/* Step A: Define options */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">{tf("sections.step_a_options", "Step A - Define Options")}</p>
                  <ProductOptionsEditor
                    productId={createdProductId}
                    onSaved={() => {}}
                  />
                </div>

                {/* Step B: Generate & price variants */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">{tf("sections.step_b_variants", "Step B - Generate & Price Variants")}</p>
                  <VariantTable
                    productId={createdProductId}
                    onUpdated={() => {}}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button type="button" onClick={handleFinish}
                    className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-sm transition-colors">
                    <CheckCircleIcon className="h-5 w-5" />
                    {tf("actions.finish_listing", "Done - Finish Listing")}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 dark:text-slate-500">
                <p className="text-sm">{tf("messages.save_steps_first", "Save the product in Steps 1-4 first.")}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ?? image preview modal ????????????????????????????????????????????????????

  const ImagePreviewModal = () => {
    if (!previewImage) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="relative max-w-4xl max-h-[90vh] mx-4">
          <button onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/75">
            <XMarkIcon className="h-6 w-6" />
          </button>
          <img loading="lazy" src={getImageUrl(previewImage)} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      </div>
    );
  };

  // ?? whether the current nav button is "Submit" or "Next" ??????????????????

  const isLastInfoStep = currentStep === 4;
  const isVariantsStep = currentStep === 5;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <ImagePreviewModal />

      {/* Leave modal */}
      {cancelModal === "leave" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">{tf("modals.leave_title", "Leave without saving?")}</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">{tf("modals.leave_body", "Your draft has been auto-saved.")}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelModal(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300">{tf("actions.keep_editing", "Keep Editing")}</button>
              <button onClick={confirmCancel} className="px-4 py-2 bg-gray-800 dark:bg-slate-700 text-white rounded-lg text-sm font-medium">{tf("actions.leave", "Leave")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Clear images modal */}
      {cancelModal === "clear-images" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">{tf("modals.remove_images_title", "Remove all images?")}</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">{tf("modals.cannot_undone", "This cannot be undone.")}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelModal(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300">{tf("actions.cancel", "Cancel")}</button>
              <button onClick={() => { setImagePreviews([]); setImagesModified(true); setCancelModal(false); }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">{tf("actions.remove_all", "Remove All")}</button>
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
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">{tf("messages.all_done", "All Done!")}</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">{successMessage}</p>
            <p className="text-sm text-gray-500 dark:text-slate-500">{tf("messages.redirecting", "Redirecting...")}</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header + step indicators */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 mb-8">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {product ? tf("titles.edit", "Edit Product") : tf("titles.new", "New Listing")}
              </h1>
              <p className="text-gray-500 dark:text-slate-400 mt-0.5 text-sm">
                {product ? tf("titles.edit_subtitle", "Update your product details") : tf("titles.new_subtitle", "Create a new product listing")}
                {!product && <span className="text-blue-600 dark:text-blue-400 ml-2">{tf("messages.draft_saved", "? Draft auto-saved")}</span>}
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
                <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">{stepTitle(steps[currentStep - 1])}</span>
                <span className="text-xs font-bold text-green-700 dark:text-green-400">{tf("steps.count", "Step {{current}} of {{total}}", { current: currentStep, total: steps.length })}</span>
              </div>
              <div className="flex gap-1.5">
                {steps.map((step) => (
                  <button key={step.id} onClick={() => goToStep(step.id)}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      currentStep === step.id ? "bg-green-500" : completedSteps.has(step.id) ? "bg-green-400" : "bg-gray-200 dark:bg-slate-600"
                    }`} aria-label={stepTitle(step)} />
                ))}
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden sm:flex items-start">
              {steps.map((step, index) => {
                const done    = completedSteps.has(step.id);
                const current = currentStep === step.id;
                const last    = index === steps.length - 1;
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
                        {stepTitle(step)}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 text-center w-16 leading-tight">{stepDescription(step)}</span>
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
            <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
              <div className="flex items-start">
                <ExclamationCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
              {limitErrorData && !isAdminMode && (
                <button
                  type="button"
                  onClick={() => navigate("/seller/dashboard?tab=subscription")}
                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {tf("actions.upgrade_plan", "Upgrade plan")}
                </button>
              )}
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
            <div className="flex flex-wrap justify-between items-center gap-3 px-4 sm:px-8 py-4 sm:py-5 border-t border-gray-200 dark:border-slate-700">
              <div>
                {currentStep > 1 && (
                  <button type="button" onClick={prevStep}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium sm:px-6 sm:py-3">
                    <ChevronLeftIcon className="h-4 w-4" /> {tf("actions.previous", "Previous")}
                  </button>
                )}
              </div>
              <div>
                {isLastInfoStep ? (
                  /* Step 4 ? Submit core product then advance to Step 5 */
                  <button type="button" onClick={handleCoreSubmit} disabled={loading || isUploadingImages}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-sm disabled:opacity-50 transition-colors sm:px-8 sm:py-3">
                    {loading ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />{product ? tf("actions.updating", "Updating...") : tf("actions.creating", "Creating...")}</>
                    ) : (
                      <><CheckCircleIcon className="h-4 w-4" />{isAdminMode ? tf("actions.update", "Update") : product ? tf("actions.update_continue", "Update & Continue") : tf("actions.save_continue", "Save & Continue")}</>
                    )}
                  </button>
                ) : (
                  <button type="button" onClick={nextStep} disabled={!validateStep(currentStep)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors sm:px-6 sm:py-3">
                    {tf("actions.next", "Next")} <ChevronRightIcon className="h-4 w-4" />
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
