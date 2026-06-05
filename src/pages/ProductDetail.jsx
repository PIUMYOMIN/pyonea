import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";
import useSEO from "../hooks/useSEO";
import { getImageUrl } from "../utils/imageHelpers";
import {
  StarIcon,
  ShoppingCartIcon,
  HeartIcon,
  ArrowLeftIcon,
  XMarkIcon,
  ShareIcon,
  CheckIcon,
  LinkIcon,
} from "@heroicons/react/24/solid";
import { ExclamationCircleIcon, CursorArrowRaysIcon } from "@heroicons/react/24/outline";
import api from "../utils/api";
import { DEFAULT_PLACEHOLDER, SITE_PUBLIC_URL } from "../config";
import { SkeletonProductDetail } from "../components/ui/Skeleton";
import MoreFromSellerDesktopCarousel from "../components/ui/MoreFromSellerDesktopCarousel";
import VariantPicker from "../components/ui/VariantPicker";
import ProductImageGallery from "../components/ui/ProductImageGallery";
import ProductCard from "../components/ui/ProductCard";
import myanmarLocationsEng from "../data/myanmar-locations-eng.json";
import myanmarLocationsMm from "../data/myanmar-locations-mm.json";

const buildDeliveryNameLookup = () => {
  const state = {};
  const city = {};
  const township = {};

  const engLocs = myanmarLocationsEng.locations || [];
  const mmLocs = myanmarLocationsMm.locations || [];

  engLocs.forEach((engRegion, rIdx) => {
    const mmRegion = mmLocs[rIdx];
    if (!mmRegion) return;

    const engStateName = engRegion.region_state;
    const mmStateName = mmRegion.region_state;
    if (engStateName && mmStateName) state[engStateName] = mmStateName;

    (engRegion.cities || []).forEach((engCity, cIdx) => {
      const mmCity = mmRegion?.cities?.[cIdx];
      if (!mmCity) return;

      const engCityName = engCity.city;
      const mmCityName = mmCity.city;
      if (engCityName && mmCityName) city[engCityName] = mmCityName;

      (engCity.townships || []).forEach((engTownship, tIdx) => {
        const mmTownship = mmCity?.townships?.[tIdx];
        if (!mmTownship) return;

        if (engTownship && mmTownship) township[engTownship] = mmTownship;
      });
    });
  });

  return { state, city, township };
};

const DELIVERY_NAME_LOOKUP = buildDeliveryNameLookup();

const isPrimaryImage = (image) => (
  image?.is_primary === true ||
  image?.is_primary === 1 ||
  image?.is_primary === "1" ||
  image?.primary === true ||
  image?.primary === 1 ||
  image?.primary === "1"
);

const getPrimaryProductImage = (images = []) => {
  if (!Array.isArray(images) || images.length === 0) return null;
  return images.find(isPrimaryImage) || images[0];
};

const toPositiveInt = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveQuantityStep = (rawStep, moq) => {
  const safeMoq = toPositiveInt(moq, 1);
  const parsedStep = toPositiveInt(rawStep, safeMoq);
  return parsedStep > 1 ? parsedStep : safeMoq;
};

const snapQuantityToStep = (value, moq, step) => {
  const safeMoq = toPositiveInt(moq, 1);
  const safeStep = toPositiveInt(step, safeMoq);
  const parsed = Number.parseInt(value, 10);
  const clamped = Math.max(Number.isFinite(parsed) ? parsed : safeMoq, safeMoq);

  if (safeStep <= 1) return clamped;

  const remainder = (clamped - safeMoq) % safeStep;
  return remainder === 0 ? clamped : clamped + (safeStep - remainder);
};

const getMaxValidQuantity = (availableStock, moq, step, isPhysical) => {
  if (!isPhysical) return undefined;

  const stock = Number.parseInt(availableStock, 10);
  if (!Number.isFinite(stock) || stock <= 0) return 0;

  const safeMoq = toPositiveInt(moq, 1);
  if (stock < safeMoq) return 0;

  const safeStep = toPositiveInt(step, safeMoq);
  if (safeStep <= 1) return stock;

  return safeMoq + Math.floor((stock - safeMoq) / safeStep) * safeStep;
};


const ProductDetail = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const currencyLabel = t("common.currency.mmk", "MMK");
  const urlLang = new URLSearchParams(location.search).get("lang");
  const activeLang = urlLang?.startsWith("my")
    ? "my"
    : i18n.language?.startsWith("my")
      ? "my"
      : "en";

  const loc = (en, mm) => activeLang === "my" ? (mm || en) : (en || mm);
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, hasRole } = useAuth();
  const { isCompared, addToCompare, removeFromCompare } = useCompare();

  const [product, setProduct]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [quantity, setQuantity]           = useState(1);
  const [activeImage, setActiveImage]     = useState(0);
  const variantSectionRef = useRef(null);

  // ── Variant state ───────────────────────────────────────────────────────────
  // selectedVariant: the fully-matched ProductVariant object (or null)
  // selectedOptions: { "Color": "Red", "Size": "M", "Engraving": "John" }
  const [selectedVariant, setSelectedVariant]   = useState(null);
  const [selectedOptions, setSelectedOptions]   = useState({});
  const [variantError, setVariantError]         = useState("");

  // ── Review / wishlist / UI state ────────────────────────────────────────────
  const [reviewText, setReviewText]             = useState("");
  const [reviewFlash, setReviewFlash]           = useState(null);
  const [reviewPopup, setReviewPopup]           = useState(null);
  const [rating, setRating]                     = useState(0);
  const [reviews, setReviews]                   = useState([]);
  const [deliveryAreas, setDeliveryAreas]           = useState([]);
  const [deliveryLoading, setDeliveryLoading]       = useState(false);
  const [deliveryTickerIdx, setDeliveryTickerIdx]   = useState(0);
  // Per-word animation keys — only the key for the word that changed increments,
  // causing React to remount just that <span> and replay the slide-up animation.
  // (region = hours, city = minutes, township = seconds)
  const [deliveryAnimKeys, setDeliveryAnimKeys]     = useState({ region: 0, city: 0, township: 0 });
  // Refs let the interval read/write current values without stale closures
  const deliveryIdxRef       = useRef(0);
  const deliveryPrevLabelRef = useRef(null);

  const [showReviewForm, setShowReviewForm]     = useState(false);


  const [isInWishlist, setIsInWishlist]         = useState(false);
  const [addingToCart, setAddingToCart]         = useState(false);
  const [wishlistLoading, setWishlistLoading]   = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [copied, setCopied]                     = useState(false);
  const [shareOpen, setShareOpen]               = useState(false);
  const [successMessage, setSuccessMessage]     = useState(null);

  const [moreFromSeller, setMoreFromSeller] = useState([]);
  const [moreFromSellerLoading, setMoreFromSellerLoading] = useState(false);

  const flashReview = (msg, type = "success") => {
    setReviewFlash({ msg, type });
    setTimeout(() => setReviewFlash(null), 3500);
  };

  const fallbackTitle       = t("productDetail.title");
  const fallbackDescription = t("productDetail.description_meta");
  const primaryProductImage = useMemo(() => getPrimaryProductImage(product?.images), [product?.images]);
  const primaryProductImageUrl = primaryProductImage ? getImageUrl(primaryProductImage) : undefined;

  // ── Fetch product ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProductData = async () => {
      setLoading(true);
      setError(null);

      try {
        const productResponse = await api.get(`/products/${slug}`);
        const productData = productResponse.data.data?.product ?? productResponse.data.data;

        // Normalise images
        let formattedImages = [];
        if (productData.images) {
          if (Array.isArray(productData.images)) {
            formattedImages = productData.images;
          } else if (typeof productData.images === "string") {
            try { formattedImages = JSON.parse(productData.images); }
            catch { formattedImages = [{ url: productData.images, angle: "front", is_primary: true }]; }
          }
        }

        // Normalise specifications
        let formattedSpecifications = {};
        if (productData.specifications) {
          if (typeof productData.specifications === "string") {
            try { formattedSpecifications = JSON.parse(productData.specifications); }
            catch { formattedSpecifications = {}; }
          } else if (typeof productData.specifications === "object") {
            formattedSpecifications = productData.specifications;
          }
        }

        const normalizedProduct = {
          ...productData,
          images:         formattedImages,
          specifications: formattedSpecifications,
          review_count:   productData.review_count   || 0,
          average_rating: parseFloat(productData.average_rating) || 0,
        };
        setProduct(normalizedProduct);

        // Reviews
        // Prefer product detail payload if it includes reviews; fall back to reviews endpoint.
        if (Array.isArray(productData?.reviews)) {
          setReviews(productData.reviews);
        } else {
          try {
            const revRes = await api.get(`/reviews/products/${productData.id}`);
            // Some endpoints return a Laravel ResourceCollection nested as { data: { data: [...] } }
            const payload = revRes?.data?.data;
            const list = Array.isArray(payload)
              ? payload
              : (payload?.data && Array.isArray(payload.data) ? payload.data : []);
            setReviews(list);
          } catch {
            setReviews([]);
          }
        }

        // Delivery zones (buyer-visible)
        const sellerKey = productData?.seller?.store_slug || productData?.seller?.id;
        if (sellerKey) {
          setDeliveryLoading(true);
          try {
            const dzRes = await api.get(`/sellers/${sellerKey}/delivery-areas`);
            setDeliveryAreas(dzRes.data.data || []);
          } catch {
            setDeliveryAreas([]);
          } finally {
            setDeliveryLoading(false);
          }
        } else {
          setDeliveryAreas([]);
        }

        // Wishlist check (buyers only)
        if (user && hasRole('buyer')) {
          try {
            const wishlistResponse = await api.get("/wishlist");
            const wishlist = wishlistResponse.data.data || [];
            setIsInWishlist(wishlist.some((item) => item.id === productData.id));
          } catch (wishlistError) {
            if (wishlistError.response?.status !== 403) {
              console.warn("Could not fetch wishlist:", wishlistError);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
        setError(err.response?.data?.message || t("productDetail.failed_load"));
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [slug, user, hasRole, t]);


  // ── VariantPicker callback ───────────────────────────────────────────────────
  // Called every time the buyer changes their option selection.
  const handleVariantChange = (variant, options) => {
    setSelectedVariant(variant);
    setSelectedOptions(options);
    setVariantError("");

    // If the selected variant has its own image, switch the main image to it
    if (variant?.image && product?.images) {
      const variantImgIdx = product.images.findIndex(
        (img) => (img.url ?? img) === variant.image
      );
      if (variantImgIdx >= 0) setActiveImage(variantImgIdx);
    }

    // Reset quantity to effective MOQ whenever variant changes
    const moq = toPositiveInt(variant?.moq ?? product?.moq, 1);
    // Snap initial quantity to the nearest valid step above MOQ
    setQuantity(moq);
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  // Active wholesale tier: highest tier whose min_qty ≤ current quantity.
  // Applies to both simple and variant products — product-level tiers are
  // universal and the CartController will apply the same logic server-side.
  const activeTier = useMemo(() => {
    if (!product?.wholesale_tiers?.length) return null;
    return [...product.wholesale_tiers]
      .sort((a, b) => b.min_qty - a.min_qty)
      .find(t => quantity >= t.min_qty) ?? null;
  }, [product?.wholesale_tiers, quantity]);

  // Price to display:
  //   1. Wholesale tier price (quantity threshold met) — overrides everything
  //   2. Selected variant's own price
  //   3. Active sale price (simple products only)
  //   4. Product base price
  const displayPrice = activeTier?.price_per_unit
    ?? selectedVariant?.price
    ?? (product?.is_currently_on_sale ? product?.selling_price : null)
    ?? product?.price;

  // Base price used for savings calculation:
  //   • When a variant is selected: savings are relative to the variant price
  //   • Otherwise: relative to the product's base price
  const baseComparePrice = parseFloat(selectedVariant?.price ?? product?.price ?? 0);

  // Effective discount percentage for the badge.
  const displayDiscountPct = activeTier
    ? (activeTier.discount_pct ?? 0)
    : (!selectedVariant && product?.is_currently_on_sale ? (product?.effective_discount_pct ?? 0) : 0);

  // Per-unit savings shown below the price
  const displayDiscountSaved = activeTier
    ? Math.max(0, baseComparePrice - parseFloat(activeTier.price_per_unit))
    : (!selectedVariant && product?.is_currently_on_sale ? (product?.discount_saved ?? 0) : 0);

  // Stock available for the current selection
  const availableStock = selectedVariant != null
    ? (selectedVariant.quantity ?? 0)
    : (product?.total_stock ?? product?.quantity ?? 0);

  // Effective MOQ
  const effectiveMoq = toPositiveInt(selectedVariant?.moq ?? product?.moq, 1);

  // Effective quantity step. If legacy product data has step=1, MOQ is the step.
  const effectiveStep = resolveQuantityStep(
    selectedVariant?.quantity_step ?? product?.quantity_step,
    effectiveMoq
  );

  const maxValidQuantity = getMaxValidQuantity(
    availableStock,
    effectiveMoq,
    effectiveStep,
    product?.product_type === "physical"
  );

  // Whether the product uses the variant system
  const hasVariants = product?.has_variants || (product?.options?.length > 0);

  // Are all required options selected (and matched to a variant)?
  const variantReady = !hasVariants || selectedVariant !== null;

  const unitLabel = (product?.quantity_unit || product?.min_order_unit || "piece").slice(0, 20);

  const sellerVerified =
    !!product?.seller?.is_verified ||
    product?.seller?.verification_status === "verified" ||
    product?.seller?.status === "approved" ||
    product?.seller?.status === "active";

  const stockBelowMoq = product?.product_type === "physical" && variantReady && availableStock > 0 && availableStock < effectiveMoq;
  const stockText = product?.product_type === "physical"
    ? (variantReady
        ? (stockBelowMoq
            ? t("productDetail.stock_limit_error", { stock: availableStock, unit: product?.quantity_unit ?? t("productDetail.units") })
            : availableStock > 0
              ? t("productDetail.in_stock_count", { count: availableStock })
              : t("productDetail.out_of_stock"))
        : t("productDetail.select_options_for_stock"))
    : t("productDetail.available");
  const stockIsOut = product?.product_type === "physical" && variantReady && availableStock < effectiveMoq;

  const primaryCtaLabel =
    addingToCart        ? t("productDetail.adding")
    : stockIsOut        ? t("productDetail.out_of_stock")
    : (hasVariants && !selectedVariant) ? t("productDetail.select_options")
    : t("productDetail.add_to_cart");

  // ── Add to cart ─────────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!user) { navigate("/login"); return false; }

    // Guard: if product has variants, buyer must select a valid combo first
    if (hasVariants && !selectedVariant) {
      const requiredOption = product.options?.find((o) => o.is_required);
      setVariantError(
        requiredOption
          ? t("productDetail.select_required_option", { option: requiredOption.name })
          : t("productDetail.select_options_before_cart")
      );
      return false;
    }

    if (quantity < effectiveMoq) {
      setVariantError(t("productDetail.minimum_order_error", {
        quantity: effectiveMoq,
        unit: product?.quantity_unit ?? t("productDetail.pieces")
      }));
      return false;
    }

    // Step validation
    if (effectiveStep > 1) {
      const remainder = (quantity - effectiveMoq) % effectiveStep;
      if (remainder !== 0) {
        const nextValid = effectiveMoq + Math.ceil((quantity - effectiveMoq) / effectiveStep) * effectiveStep;
        setVariantError(t("productDetail.step_error", { step: effectiveStep, next: nextValid }));
        return false;
      }
    }

    if (product?.product_type === "physical" && quantity > availableStock) {
      setVariantError(t("productDetail.stock_limit_error", {
        stock: availableStock,
        unit: product?.quantity_unit ?? t("productDetail.units")
      }));
      return false;
    }

    setAddingToCart(true);
    setVariantError("");
    try {
      const result = await addToCart(
        product.id,
        quantity,
        selectedVariant?.id ?? null,
        Object.keys(selectedOptions).length > 0 ? selectedOptions : null
      );
      setSuccessMessage(result.message || t("productDetail.added_to_cart"));
      return true;
    } catch (error) {
      setSuccessMessage({ type: "error", message: error?.message || t("productDetail.add_to_cart_failed") });
      return false;
    } finally {
      setAddingToCart(false);
    }

  };

  const handlePrimaryCta = async () => {
    if (hasVariants && !selectedVariant) {
      variantSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setVariantError((prev) => prev || t("productDetail.select_options_before_continue"));
      return;
    }
    await handleAddToCart();
  };

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ── Delivery labels (memoised so the ticker interval can compare prev vs next) ─
  // Must be declared BEFORE the useEffect that depends on it.
  const deliveryLabels = useMemo(() => {
    const isMM = i18n.language === "my" || i18n.language?.startsWith("my");
    const localName = (type, value) =>
      isMM ? (DELIVERY_NAME_LOOKUP[type]?.[value] || value) : value;

    return deliveryAreas.map((area) => {
      if (area.area_type === "country") {
        return { region: t("productDetail.delivery_whole_myanmar"), city: null, township: null };
      }
      const region = area.state || area.region || null;
      if (!region) return null;
      return {
        region:   localName("state",    region),
        city:     area.city     ? localName("city",     area.city)     : null,
        township: area.township ? localName("township", area.township) : null,
      };
    }).filter(Boolean);
  }, [deliveryAreas, i18n.language, t]);

  // Delivery zones ticker — clock-style per-word slide-up animation.
  // Region changes slowest (like hours), city next (like minutes), township most often (seconds).
  // Only the key for a word that actually changed increments, so only that <span> remounts
  // and replays the slide-up animation — identical to the digit trick in a digital clock.
  useEffect(() => {
    // Reset refs whenever the labels array changes (e.g. language switch or zone reload)
    deliveryIdxRef.current = 0;
    deliveryPrevLabelRef.current = null;
    setDeliveryTickerIdx(0);
    setDeliveryAnimKeys({ region: 0, city: 0, township: 0 });

    if (!deliveryLabels || deliveryLabels.length <= 1) return;

    const interval = setInterval(() => {
      const nextIdx   = (deliveryIdxRef.current + 1) % deliveryLabels.length;
      const prevLabel = deliveryPrevLabelRef.current;
      const nextLabel = deliveryLabels[nextIdx];

      deliveryIdxRef.current       = nextIdx;
      deliveryPrevLabelRef.current = nextLabel;

      setDeliveryTickerIdx(nextIdx);
      setDeliveryAnimKeys((k) => ({
        region:   (!prevLabel || nextLabel.region   !== prevLabel.region)   ? k.region   + 1 : k.region,
        city:     (!prevLabel || nextLabel.city     !== prevLabel.city)     ? k.city     + 1 : k.city,
        township: (!prevLabel || nextLabel.township !== prevLabel.township) ? k.township + 1 : k.township,
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [deliveryLabels]);


  const handleBuyNow = async () => {
    // Variants exist but none selected — scroll to picker and surface the error.
    // Don't attempt checkout; buyer must choose options first.
    if (hasVariants && !selectedVariant) {
      variantSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setVariantError((prev) => prev || t("productDetail.select_options_before_purchase"));
      return;
    }

    // handleAddToCart returns true on success, false on validation/API failure.
    // Only navigate to cart when we know the item was actually added.
    const added = await handleAddToCart();
    if (added) navigate("/cart");
  };

  const handleAddToWishlist = async () => {
    if (!user) { navigate("/login"); return; }
    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        await api.delete(`/wishlist/${product.id}`);
        setIsInWishlist(false);
        setSuccessMessage(t("productDetail.removed_from_wishlist"));
      } else {
        await api.post("/wishlist", { product_id: product.id });
        setIsInWishlist(true);
        setSuccessMessage(t("productDetail.added_to_wishlist"));
      }
    } catch (error) {
      setSuccessMessage({ type: "error", message: error.response?.data?.message || t("productDetail.wishlist_update_failed") });
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleReviewAction = () => {
    if (!user) { navigate("/login"); return; }
    if (user.role === "admin" || user.role === "seller") {
      flashReview(t("productDetail.only_buyers_review"), "error"); return;
    }
    setShowReviewForm(!showReviewForm);
  };

  const compared = product?.id ? isCompared(product.id) : false;
  const handleToggleCompare = () => {
    if (!product?.id) return;
    if (compared) {
      removeFromCompare(product.id);
      return;
    }
    const result = addToCompare(product);
    if (!result.success) {
      setSuccessMessage({ type: "error", message: result.message });
    } else {
      setSuccessMessage(result.message);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (rating === 0) { flashReview(t("productDetail.select_rating_error"), "error"); return; }

    setSubmittingReview(true);
    try {
      const response = await api.post(`/buyer/reviews/product/${product.id}`, {
        product_id: product.id, rating, comment: reviewText,
      });
      setReviews([response.data.data, ...reviews]);
      setProduct((prev) => ({
        ...prev,
        average_rating: parseFloat(response.data.product_rating) || 0,
        review_count:   response.data.product_review_count,
      }));
      setReviewText(""); setRating(0); setShowReviewForm(false);
      setSuccessMessage(response.data.message || t("productDetail.review_submitted"));
    } catch (error) {
      setReviewPopup({ msg: error.response?.data?.message || t("productDetail.review_submit_failed"), type: "error" });
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── Share ────────────────────────────────────────────────────────────────────
  const shareData = useMemo(() => {
    if (!product) return null;
    const url   = `${SITE_PUBLIC_URL}/products/${product.slug_en || product.slug || slug}?lang=${activeLang}`;
    const title = loc(product.name_en, product.name_mm) || t("productDetail.product");
    const text  = t("productDetail.share_text", { title });
    const description = t("productDetail.share_description", { url });
    const image = primaryProductImageUrl || null;
    const enc   = encodeURIComponent;
    return {
      url,
      title,
      text,
      description,
      image,
      // Share URLs
      facebook:  `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      whatsapp:  `https://wa.me/?text=${enc(`${text} ${url}`)}`,
      // Viber deep link is mobile-app focused; keep it but explain in UI.
      viber:     `viber://forward?text=${enc(`${text} ${url}`)}`,
      telegram:  `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
      twitter:   `https://x.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
    };
  }, [product, slug, activeLang, t, primaryProductImageUrl]);

  const handleShare = async () => {
    if (!shareData) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareData.title, text: shareData.text, url: shareData.url });
        return;
      } catch {
        // ignore user-cancelled share errors
      }
    }
    setShareOpen(prev => !prev);
  };


  const handleCopyLink = async () => {
    if (!shareData) return;
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore clipboard failures
    }

  };

  // Close share panel when clicking outside
  useEffect(() => {
    if (!shareOpen) return;
    const handler = (e) => {
      if (!e.target.closest('[data-share-panel]')) setShareOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareOpen]);

  // ── Initialise quantity to product MOQ on load (simple products only) ───────
  // For variant products, handleVariantChange already sets quantity = variant MOQ.
  // For simple products the quantity state starts at 1 which may be below product.moq,
  // so we snap it up once the product is available and no variant system is in use.
  useEffect(() => {
    if (!product) return;
    const moq = toPositiveInt(product.moq, 1);
    const step = resolveQuantityStep(product.quantity_step, moq);
    setQuantity(prev => snapQuantityToStep(prev, moq, step));
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // More from this seller (best-effort, non-blocking)
  useEffect(() => {
    if (!product?.id) return;
    const sellerId = product?.seller_id || product?.seller?.id;
    if (!sellerId) return;

    let cancelled = false;
    (async () => {
      setMoreFromSellerLoading(true);
      try {
        const params = new URLSearchParams({
          per_page: "12",
          page: "1",
          seller_id: String(sellerId),
          sort_by: "created_at",
          sort_order: "desc",
          fields: "id,name_en,name_mm,slug_en,price,selling_price,images,average_rating,review_count,quantity,total_stock,in_stock,is_active,moq,min_order_unit,quantity_unit,category_id,seller_id,is_on_sale,is_currently_on_sale,effective_discount_pct,discount_percentage,has_variants,category,seller",
        });
        const res = await api.get(`/products?${params.toString()}`);
        const data = res.data.data || res.data || [];
        const list = Array.isArray(data) ? data : [];
        const filtered = list.filter((p) => p.id !== product.id).slice(0, 12);
        if (!cancelled) setMoreFromSeller(filtered);
      } catch {
        if (!cancelled) setMoreFromSeller([]);
      } finally {
        if (!cancelled) setMoreFromSellerLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [product?.id, product?.seller_id, product?.seller?.id]);
  const productDisplayName = product ? (loc(product.name_en, product.name_mm) || t("productDetail.product")) : "";
  const productAltText = product
    ? t("productDetail.seo_image_alt", { title: productDisplayName })
    : undefined;
  const pageTitle = product
    ? t("productDetail.seo_title", { title: productDisplayName })
    : fallbackTitle;
  const pageDescription = product
    ? t("productDetail.seo_description", { title: productDisplayName, moq: effectiveMoq || 1 }).slice(0, 160)
    : fallbackDescription;
  const pagePath = product ? `/products/${product.slug_en || product.slug || slug}` : `/products/${slug}`;
  const pageUrl = `${pagePath}?lang=${activeLang}`;
  const absolutePageUrl = `${SITE_PUBLIC_URL}${pageUrl}`;

  const productSchema = useMemo(() => {
    if (!product) return null;

    const safePrice = parseFloat(displayPrice);
    const sellerName = product.seller?.store_name || product.seller?.name || null;
    return {
      "@context": "https://schema.org",
      "@type":    "Product",
      name:        loc(product.name_en, product.name_mm) || product.name_en || product.name_mm,
      description: loc(product.description_en, product.description_mm) || product.description_en || product.description_mm,
      image: product.images?.map((img) => getImageUrl(img)),
      sku: product.sku,
      ...(sellerName && { brand: { "@type": "Brand", name: sellerName } }),
      offers: {
        "@type":       "Offer",
        price:          Number.isFinite(safePrice) ? safePrice : 0,
        priceCurrency: "MMK",
        availability:  availableStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: absolutePageUrl,
      },
      ...(product.review_count > 0 && {
        aggregateRating: {
          "@type":      "AggregateRating",
          ratingValue:  product.average_rating,
          reviewCount:  product.review_count,
        },
      }),
    };
  }, [product, displayPrice, availableStock, activeLang, absolutePageUrl]);

  const pageSchema = useMemo(() => {
    if (!product) return null;

    const productName = loc(product.name_en, product.name_mm) || (product.name_en || product.name_mm || t("productDetail.product"));
    const productUrl = absolutePageUrl;

    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: t("header.home"),
              item: `${SITE_PUBLIC_URL}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: t("header.products"),
              item: `${SITE_PUBLIC_URL}/products`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: productName,
              item: productUrl,
            },
          ],
        },
        // Keep the existing Product JSON-LD for rich results
        productSchema,
      ].filter(Boolean),
    };
  }, [product, productSchema, slug, activeLang, t, absolutePageUrl]);

  const SeoComponent = useSEO({
    title:       pageTitle,
    description: pageDescription,
    image:       primaryProductImageUrl,
    imageAlt:    productAltText,
    url:         pageUrl,
    type:        "product",
    schema:      pageSchema,
    locale:      activeLang === "my" ? "my_MM" : "en_US",
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  // Show skeleton until data is ready — early return so nothing else renders
  if (loading) {
    return (
      <>
        {SeoComponent}
        <SkeletonProductDetail />
      </>
    );
  }

  // Error state — no product loaded
  if (error && !product) {
    return (
      <>
        {SeoComponent}
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">{t("productDetail.not_found")}</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-4">{error}</p>
          <button onClick={() => navigate("/products")}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
            {t("productDetail.back_to_products")}
          </button>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        {SeoComponent}
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t("productDetail.not_found")}</h2>
        </div>
      </>
    );
  }

  return (
    <>
      {SeoComponent}

      {/* ── Non-blocking toast ─────────────────────────────────────────────── */}
      {successMessage && (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
          <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-4 border
            ${successMessage?.type === "error"
              ? "bg-red-50 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
              : "bg-green-50 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300"
            }`}>
            <span className="text-sm font-medium">
              {typeof successMessage === "string" ? successMessage : successMessage.message}
            </span>
            <button onClick={() => setSuccessMessage(null)} className="flex-shrink-0">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Review error popup ────────────────────────────────────────────── */}
      {reviewPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl p-6 bg-white dark:bg-slate-800
            ${reviewPopup.type === "error" ? "border border-red-200 dark:border-red-700" : "border border-green-200 dark:border-green-700"}`}>
            <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4
              ${reviewPopup.type === "error" ? "bg-red-100 dark:bg-red-900/40" : "bg-green-100 dark:bg-green-900/40"}`}>
              {reviewPopup.type === "error"
                ? <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                  </svg>
                : <CheckIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              }
            </div>
            <p className={`text-center text-sm font-medium mb-5 ${reviewPopup.type === "error" ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>
              {reviewPopup.msg}
            </p>
            <button onClick={() => setReviewPopup(null)}
              className={`block w-full py-2.5 rounded-xl text-sm font-semibold transition-colors
                ${reviewPopup.type === "error" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}>
              OK
            </button>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-8 overflow-x-hidden">
          {/* Back button */}
          <button onClick={() => navigate(-1)} className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-md px-1 text-sm font-medium text-green-600 hover:text-green-700">
            <ArrowLeftIcon className="h-5 w-5 flex-shrink-0" /> {t("productDetail.back")}
          </button>

          <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">

            {/* ── Left: Images ────────────────────────────────────────────── */}
            <div className="min-w-0 space-y-4">
              <ProductImageGallery
                images={product.images}
                getImageUrl={(img) => getImageUrl(img) || DEFAULT_PLACEHOLDER}
                alt={productAltText}
                initialIndex={activeImage}
                onIndexChange={setActiveImage}
                priority={true}
                autoplay={true}
                autoplayDelayMs={2500}
                className="w-full"
              />
            </div>

            {/* ── Right: Product info ──────────────────────────────────────── */}
            <div className="min-w-0 space-y-6">

              {/* Name */}
              <div>
                <h1 className="break-words text-2xl lg:text-3xl font-bold text-gray-900 dark:text-slate-100">
                  {loc(product.name_en, product.name_mm) || t("productDetail.product")}
                </h1>
                {product.name_en && product.name_mm && (
                  <p className="mt-1 break-words text-base text-gray-600 dark:text-slate-400 sm:text-lg">
                    {loc(product.name_mm, product.name_en)}
                  </p>
                )}
            </div>
            
            {/* Delivery zones moved to secondary section below CTAs */}

              {/* Rating */}
              <div className="flex flex-wrap items-center gap-y-1">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon key={star} className={`h-5 w-5 ${
                      star <= Math.round(product.average_rating || 0) ? "text-yellow-400" : "text-gray-300 dark:text-slate-600"}`} />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600 dark:text-slate-400 sm:text-base">
                  {product.average_rating?.toFixed(1) || "0.0"} ({t("productDetail.reviews_count", { count: product.review_count || 0 })})
                </span>
              </div>

              {/* ── Out-of-stock banner — shown prominently before price ──── */}
              {product.product_type === "physical" && variantReady && availableStock === 0 && (
                <div className="flex items-start gap-3 rounded-xl border-2 border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/30 px-4 py-3.5">
                  <span className="mt-0.5 text-xl leading-none">🚫</span>
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-300 text-sm sm:text-base">
                      {hasVariants && selectedVariant
                        ? t("productDetail.variant_out_of_stock")
                        : t("productDetail.product_out_of_stock")}
                    </p>
                    <p className="mt-0.5 text-xs text-red-500 dark:text-red-400">
                      {t("productDetail.out_of_stock_hint", "You can still browse details or contact the seller.")}
                    </p>
                  </div>
                </div>
              )}

              {/* Price — shows variant price when selected */}
              <div>
                {displayDiscountPct > 0 ? (
                  <>
                    <div className="flex min-w-0 flex-wrap items-center gap-2 mb-2">
                      <span className="inline-block bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {t("productDetail.discount_off", { percent: Math.round(displayDiscountPct) })}
                      </span>
                      {activeTier && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                          🎉 {t("productDetail.volume_price_active")}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="min-w-0 break-words text-2xl font-bold text-red-600">
                        {parseFloat(displayPrice).toLocaleString()} {currencyLabel}
                      </h2>
                      <span className="text-base text-gray-400 line-through dark:text-slate-600 sm:text-lg">
                        {parseFloat(baseComparePrice || product.price).toLocaleString()} {currencyLabel}
                      </span>
                    </div>
                    {displayDiscountSaved > 0 && (
                      <p className="text-sm text-green-600 font-medium mt-0.5">
                        {t("productDetail.you_save", { amount: parseFloat(displayDiscountSaved).toLocaleString() })}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h2 className="min-w-0 break-words text-2xl font-semibold text-green-600">
                      {parseFloat(displayPrice).toLocaleString()} {currencyLabel}
                    </h2>
                    {activeTier && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 animate-pulse">
                        🎉 {t("productDetail.volume_price_active")}
                      </span>
                    )}
                    {hasVariants && !selectedVariant && (
                      <span className="text-sm text-gray-500 dark:text-slate-400">{t("productDetail.starting_price")}</span>
                    )}
                  </div>
                )}
                <p className="text-gray-500 dark:text-slate-500 mt-1">{t("productDetail.tax_exclusive")}</p>
              </div>

              {/* Key info chips (near price) */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex min-w-0 items-center px-2.5 py-1 rounded-full text-xs font-medium
                                 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700">
                  <span className="truncate">{t("productDetail.moq")}: {effectiveMoq} {unitLabel}</span>
                </span>
                <span className="inline-flex min-w-0 items-center px-2.5 py-1 rounded-full text-xs font-medium
                                 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700">
                  <span className="truncate">{t("productDetail.unit")}: {unitLabel}</span>
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                  stockIsOut
                    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                    : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                }`}>
                  {stockText}
                </span>
                {sellerVerified && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                   bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {t("productDetail.verified_seller")}
                  </span>
                )}
                {!deliveryLoading && deliveryLabels?.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                   bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                    {t("productDetail.delivery_zones_available")}
                  </span>
                )}
              </div>

              {/* ── Variant Picker ─────────────────────────────────────────── */}
              {hasVariants && (
                <div ref={variantSectionRef} className="min-w-0 scroll-mt-24 rounded-xl border border-gray-200 p-3 dark:border-slate-700 sm:p-4">
                  <VariantPicker
                    options={product.options ?? []}
                    variants={product.variants ?? []}
                    onVariantChange={handleVariantChange}
                  />
                </div>
              )}

              {/* Variant validation error */}
              {variantError && (
                <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400
                                bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700
                                rounded-lg px-3 py-2">
                  <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="min-w-0">{variantError}</span>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-2">{t("productDetail.description")}</h3>
                <p className="break-words text-gray-700 dark:text-slate-300 leading-relaxed">
                  {loc(product.description_en, product.description_mm) || t("productDetail.no_description")}
                </p>
              </div>

              {/* Specifications */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t("productDetail.specifications")}</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="border-t border-gray-200 dark:border-slate-700 pt-2">
                        <dt className="font-medium text-gray-900 dark:text-slate-100 text-sm">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
                        </dt>
                        <dd className="break-words text-gray-700 dark:text-slate-300 text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Key info chips above cover MOQ/stock */}

              {/* Wholesale pricing table — product-level tiers apply universally */}
              {product.wholesale_tiers?.length > 0 && (
                <div className="min-w-0 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 sm:p-4">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-2">
                    {t("productDetail.volume_pricing")}
                  </p>
                  <div className="overflow-x-auto">
                  <table className="min-w-[520px] w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 dark:text-slate-400 border-b border-amber-200 dark:border-amber-800">
                        <th className="pb-1 font-medium">{t("productDetail.min_qty")}</th>
                        <th className="pb-1 font-medium">{t("productDetail.price_per_unit", { unit: product.quantity_unit ?? t("productDetail.piece") })}</th>
                        <th className="pb-1 font-medium">{t("productDetail.discount")}</th>
                        <th className="pb-1 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.wholesale_tiers.map((tier) => {
                        const isActive = activeTier?.min_qty === tier.min_qty;
                        return (
                          <tr
                            key={tier.min_qty}
                            className={`border-b border-amber-100 dark:border-amber-900 last:border-0 ${
                              isActive ? "bg-amber-100 dark:bg-amber-800/30 font-semibold" : ""
                            }`}
                          >
                            <td className="py-1 text-gray-700 dark:text-slate-300">
                              ≥ {tier.min_qty} {product.quantity_unit ?? "pcs"}
                            </td>
                            <td className="py-1 text-green-700 dark:text-green-400">
                              {new Intl.NumberFormat("my-MM").format(tier.price_per_unit)} Ks
                            </td>
                            <td className="py-1 text-red-600 dark:text-red-400">
                              {tier.discount_pct > 0 ? `-${tier.discount_pct}%` : "—"}
                            </td>
                            <td className="py-1 text-xs text-gray-500 dark:text-slate-400">
                              {tier.label ?? ""}
                              {isActive && (
                                <span className="ml-1 inline-block bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded text-xs">
                                   {t("productDetail.applied")}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  {/* Next tier nudge — show when buyer is below the next tier threshold */}
                  {(() => {
                    const nextTier = product.wholesale_tiers
                      .slice()
                      .sort((a, b) => a.min_qty - b.min_qty)
                      .find(t => t.min_qty > quantity);
                    if (!nextTier) return null;
                    const needed = nextTier.min_qty - quantity;
                    return (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                        💡 {t("productDetail.add_more_for_tier", {
                          count: needed,
                          unit: product.quantity_unit ?? t("productDetail.pieces"),
                          discount: nextTier.discount_pct > 0 ? `-${nextTier.discount_pct}%` : t("productDetail.better_price"),
                        })}
                      </p>
                    );
                  })()}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="quantity" className="font-medium text-gray-800 dark:text-slate-200">
                    {t("productDetail.quantity")}
                  </label>

                  {/* Stepper — decrement */}
                  <button
                    type="button"
                    aria-label={t("productDetail.decrease_quantity")}
                    onClick={() => {
                      const prev = quantity - effectiveStep;
                      setQuantity(Math.max(prev, effectiveMoq));
                    }}
                    disabled={quantity <= effectiveMoq}
                    className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-slate-600
                               bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200
                               hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    −
                  </button>

                  <input
                    type="number"
                    id="quantity"
                    min={effectiveMoq}
                    max={maxValidQuantity || undefined}
                    step={effectiveStep}
                    value={quantity}
                    onChange={(e) => {
                      const snapped = snapQuantityToStep(e.target.value, effectiveMoq, effectiveStep);
                      setQuantity(maxValidQuantity ? Math.min(snapped, maxValidQuantity) : snapped);
                    }}
                    className="w-20 text-center px-2 py-2 border border-gray-300 dark:border-slate-600
                               bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-md"
                  />

                  {/* Stepper — increment */}
                  <button
                    type="button"
                    aria-label={t("productDetail.increase_quantity")}
                    onClick={() => {
                      const next = quantity + effectiveStep;
                      if (maxValidQuantity !== undefined && next > maxValidQuantity) return;
                      setQuantity(next);
                    }}
                    disabled={maxValidQuantity !== undefined && quantity + effectiveStep > maxValidQuantity}
                    className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-slate-600
                               bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200
                               hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    +
                  </button>

                  <span className="text-sm text-gray-500 dark:text-slate-400">
                    {product.quantity_unit ?? t("productDetail.pieces")}
                  </span>
                </div>

                {/* Step hint — only shown when step > 1 */}
                {effectiveStep > 1 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t("productDetail.order_multiples", {
                      step: effectiveStep,
                      first: effectiveMoq,
                      second: effectiveMoq + effectiveStep,
                      third: effectiveMoq + effectiveStep * 2
                    })}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-stretch">
                {stockIsOut ? (
                  <button
                    disabled
                    className="col-span-2 inline-flex min-h-12 min-w-0 items-center justify-center rounded-md
                               bg-gray-300 dark:bg-slate-700 px-4 py-3 text-sm font-semibold
                               text-gray-500 dark:text-slate-400 cursor-not-allowed sm:px-5"
                  >
                    <span>🚫</span>
                    <span className="ml-2 truncate">{t("productDetail.out_of_stock")}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePrimaryCta}
                      disabled={addingToCart}
                      className={`col-span-2 inline-flex min-h-12 min-w-0 items-center justify-center rounded-md px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1 sm:px-5
                        ${variantReady
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-amber-500 hover:bg-amber-600"}`}
                    >
                      {addingToCart ? (
                        <>
                          <div className="mr-2 h-5 w-5 flex-shrink-0 animate-spin rounded-full border-b-2 border-white" />
                           <span className="truncate">{t("productDetail.adding")}</span>
                        </>
                      ) : variantReady ? (
                        <>
                          <ShoppingCartIcon className="mr-2 h-5 w-5 flex-shrink-0" />
                          <span className="truncate">{t("productDetail.add_to_cart")}</span>
                        </>
                      ) : (
                        <>
                          <CursorArrowRaysIcon className="mr-2 h-5 w-5 flex-shrink-0" />
                          <span className="truncate">{t("productDetail.select_options")}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleBuyNow}
                      disabled={addingToCart}
                      className="col-span-2 inline-flex min-h-12 min-w-0 items-center justify-center rounded-md bg-gray-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1 sm:px-5"
                    >
                      <span className="truncate">{t("productDetail.buy_now")}</span>
                    </button>
                  </>
                )}

                <div className="col-span-2 grid grid-cols-3 gap-3 sm:col-span-1 sm:flex sm:items-stretch sm:gap-2">
                  <button
                    onClick={handleAddToWishlist}
                    disabled={wishlistLoading}
                    title={isInWishlist ? t("productDetail.remove_from_wishlist") : t("productDetail.add_to_wishlist")}
                    className="inline-flex h-12 min-w-0 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 sm:w-12"
                  >
                    {wishlistLoading
                      ? <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-green-600" />
                      : <HeartIcon className={`h-5 w-5 ${isInWishlist ? "text-red-500 fill-current" : ""}`} />
                    }
                  </button>

                  {/* ── Share button + dropdown ──────────────────────────── */}
                  <div className="relative min-w-0" data-share-panel>
                    <button
                      onClick={handleShare}
                      title={t("productDetail.share_product")}
                      className={`inline-flex h-12 w-full items-center justify-center rounded-md border transition sm:w-12
                        ${shareOpen
                          ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-600"
                          : "border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}
                    >
                      <ShareIcon className="h-5 w-5" />
                    </button>

                    {shareOpen && shareData && (
                      <div className="absolute right-0 top-full mt-2 z-50 w-56
                                      bg-white dark:bg-slate-800 border border-gray-200
                                      dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">

                      {/* Product image + title preview */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                        {shareData.image && (
                          <img
                            src={shareData.image}
                            alt={shareData.title}
                            className="h-10 w-10 rounded-md object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2 leading-snug">
                            {shareData.title}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-gray-400 dark:text-slate-500">
                            {shareData.url}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleCopyLink();
                          }}
                          title={t("productDetail.copy_link")}
                          aria-label={t("productDetail.copy_link")}
                          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full
                                     border border-gray-200 text-gray-600 transition-colors
                                     hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          {copied
                            ? <CheckIcon className="h-4 w-4 text-green-500" />
                            : <LinkIcon className="h-4 w-4" />
                          }
                        </button>
                      </div>

                      {/* Platform links */}
                      {[
                        { label: "Facebook",  href: shareData.facebook,  icon: "f",  desc: t("productDetail.share_facebook"), color: "hover:bg-blue-50 dark:hover:bg-blue-900/20" },
                        { label: "WhatsApp",  href: shareData.whatsapp,  icon: "W",  desc: t("productDetail.share_whatsapp"), color: "hover:bg-green-50 dark:hover:bg-green-900/20" },
                        { label: "Viber",     href: shareData.viber,     icon: "V",  desc: t("productDetail.share_viber"), color: "hover:bg-purple-50 dark:hover:bg-purple-900/20" },
                        { label: "Telegram",  href: shareData.telegram,  icon: "T",  desc: t("productDetail.share_telegram"), color: "hover:bg-sky-50 dark:hover:bg-sky-900/20" },
                        { label: "X (Twitter)", href: shareData.twitter, icon: "X",  desc: t("productDetail.share_x"), color: "hover:bg-gray-100 dark:hover:bg-slate-700" },
                      ].map(({ label, href, icon, desc, color }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setShareOpen(false)}
                          className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${color}`}
                        >
                          <span className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-full
                                           bg-gray-100 dark:bg-slate-700
                                           text-gray-800 dark:text-slate-200
                                           flex items-center justify-center text-xs font-bold">
                            {icon}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-800 dark:text-slate-200 leading-tight">
                              {label}
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-slate-400 leading-tight">
                              {desc}
                            </span>
                          </span>
                        </a>
                      ))}

                      {/* Copy link */}
                      <button
                        onClick={() => { handleCopyLink(); setShareOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                   border-t border-gray-100 dark:border-slate-700
                                   hover:bg-gray-50 dark:hover:bg-slate-700
                                   text-gray-700 dark:text-slate-300 transition-colors"
                      >
                        {copied
                          ? <><CheckIcon className="h-4 w-4 text-green-500" /> {t("productDetail.copied")}</>
                          : <><LinkIcon className="h-4 w-4" /> {t("productDetail.copy_link")}</>
                        }
                      </button>

                      {/* Description hint */}
                      <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700">
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 leading-snug">
                          {shareData.description}
                        </p>
                      </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleCompare}
                    className={`inline-flex h-12 min-w-0 items-center justify-center rounded-md border px-3 text-xs font-semibold transition sm:min-w-24 sm:text-sm ${
                      compared
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}
                    title={compared ? t("productDetail.remove_from_compare") : t("productDetail.add_to_compare")}
                  >
                    <span className="truncate">{compared ? t("productDetail.compared") : t("productDetail.compare")}</span>
                  </button>
                </div>
              </div>

              {/* Secondary: delivery zones */}
              {product.seller && (
                <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                  {deliveryLoading ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">{t("productDetail.delivery_loading")}</p>
                  ) : deliveryLabels.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {t("productDetail.delivery_not_set")}
                    </p>
                  ) : (() => {
                    const safeIdx    = deliveryTickerIdx % deliveryLabels.length;
                    const activeLabel = deliveryLabels[safeIdx];

                    return (
                      <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                        <style>{`
                          @keyframes dzSlideUp {
                            0%   { opacity: 0; transform: translateY(20px) rotateX(45deg); filter: blur(2px); }
                            100% { opacity: 1; transform: translateY(0)   rotateX(0deg);   filter: blur(0);   }
                          }
                          .dz-word {
                            display: inline-block;
                            transform-origin: center bottom;
                            animation: dzSlideUp 420ms ease-out both;
                            perspective: 800px;
                          }
                        `}</style>

                        <p className="text-xs text-gray-500 dark:text-slate-500 mb-2">{t("productDetail.delivering_to")}</p>

                        <div
                          aria-live="polite"
                          aria-label={[activeLabel.region, activeLabel.city, activeLabel.township].filter(Boolean).join(" → ")}
                          className="flex items-center gap-1 h-5 text-gray-900 dark:text-slate-100 text-xs overflow-hidden"
                        >
                          <span key={deliveryAnimKeys.region} className="dz-word truncate max-w-[130px]">
                            {activeLabel.region}
                          </span>

                          {activeLabel.city && (
                            <>
                              <span className="text-gray-400 dark:text-slate-500 flex-shrink-0 text-xs">→</span>
                              <span key={`c-${deliveryAnimKeys.city}`} className="dz-word truncate max-w-[110px]">
                                {activeLabel.city}
                              </span>
                            </>
                          )}

                          {activeLabel.township && (
                            <>
                              <span className="text-gray-400 dark:text-slate-500 flex-shrink-0 text-xs">→</span>
                              <span key={`t-${deliveryAnimKeys.township}`} className="dz-word truncate max-w-[100px]">
                                {activeLabel.township}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Out of stock — compact reminder near CTAs */}
              {product.product_type === "physical" && variantReady && availableStock === 0 && (
                <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <span>🚫</span>
                  {hasVariants && selectedVariant
                    ? t("productDetail.variant_out_of_stock")
                    : t("productDetail.product_out_of_stock")}
                </p>
              )}

              {/* Seller info */}
              {product.seller && (
                <div className="pt-6 border-t border-gray-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold mb-3">{t("productDetail.seller_info")}</h3>
                  <Link
                    to={`/sellers/${product.seller.store_slug || product.seller.id}`}
                    className="flex items-center hover:bg-gray-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
                  >
                    <div className="bg-gray-200 dark:bg-slate-700 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-full w-12 h-12 flex items-center justify-center">
                      <span className="text-gray-500 dark:text-slate-400 text-sm">{t("productDetail.shop")}</span>
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-green-600 hover:text-green-700">
                        {product.seller.store_name || product.seller.name}
                      </p>
                      <p className="text-gray-600 dark:text-slate-400 text-sm">
                        {product.seller.average_rating ?? 4.7} ★
                      </p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* More from this seller */}
          {(moreFromSellerLoading || moreFromSeller.length > 0) && (
            <div className="mt-14">
              <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t("productDetail.more_from_seller")}</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-500">
                    {t("productDetail.more_from_seller_subtitle")}
                  </p>
                </div>
                {product?.seller && (
                  <Link
                    to={`/sellers/${product.seller.store_slug || product.seller.id}`}
                    className="text-sm font-medium text-green-600 hover:text-green-700"
                  >
                    {t("productDetail.view_store")}
                  </Link>
                )}
              </div>

              {moreFromSellerLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 animate-pulse">
                      <div className="aspect-square bg-gray-200 dark:bg-slate-700 rounded-t-2xl" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded-xl mt-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <MoreFromSellerDesktopCarousel
                  moreFromSeller={moreFromSeller}
                />
              )}
            </div>
          )}

          {/* ── Reviews ───────────────────────────────────────────────────── */}
          <div className="mt-16">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="break-words text-xl font-bold text-gray-900 dark:text-slate-100 sm:text-2xl">
                {t("productDetail.customer_reviews")} ({product.review_count || 0})
              </h2>
              <button onClick={handleReviewAction}
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                {t("productDetail.write_review")}
              </button>
            </div>

            {showReviewForm && (
              <div className="mt-6 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-lg font-medium mb-4">{t("productDetail.write_review")}</h3>
                {reviewFlash && (
                  <div className={`mb-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
                    reviewFlash.type === "success"
                      ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300"
                      : "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"}`}>
                    {reviewFlash.msg}
                  </div>
                )}
                <form onSubmit={handleSubmitReview}>
                  <div className="mb-4">
                    <label className="block text-gray-700 dark:text-slate-300 mb-2">{t("productDetail.your_rating")}</label>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none mr-1">
                          <StarIcon className={`h-8 w-8 ${star <= rating ? "text-yellow-400" : "text-gray-300 dark:text-slate-600"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="review" className="block text-gray-700 dark:text-slate-300 mb-2">{t("productDetail.your_review")}</label>
                    <textarea id="review" rows="4"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700
                                 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                      required placeholder={t("productDetail.review_placeholder")} />
                  </div>
                  <div className="flex flex-wrap justify-end gap-3">
                    <button type="button" onClick={() => setShowReviewForm(false)}
                      className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                      {t("productDetail.cancel")}
                    </button>
                    <button type="submit" disabled={submittingReview}
                      className="inline-flex min-h-10 items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                      {submittingReview ? (
                        <><div className="mr-2 h-4 w-4 flex-shrink-0 animate-spin rounded-full border-b-2 border-white" /><span className="truncate">{t("productDetail.submitting")}</span></>
                      ) : t("productDetail.submit_review")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-6">
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-slate-500 text-lg">{t("productDetail.no_reviews_title")}</p>
                  <p className="text-gray-400 dark:text-slate-600">{t("productDetail.no_reviews_subtitle")}</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 dark:border-slate-700 pb-6">
                    <div className="flex min-w-0 items-start">
                      <div className="bg-gray-200 dark:bg-slate-700 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-full w-10 h-10 flex flex-shrink-0 items-center justify-center">
                        <span className="text-gray-500 dark:text-slate-400 text-xs">{t("productDetail.user")}</span>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <h4 className="break-words font-medium">
                          {review.buyer?.name || review.user?.name || review.user || t("productDetail.anonymous")}
                        </h4>
                        {(review.buyer?.company || review.user?.company_name) && (
                          <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                            {review.buyer?.company || review.user?.company_name}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-y-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <StarIcon key={star} className={`h-4 w-4 ${star <= review.rating ? "text-yellow-400" : "text-gray-300 dark:text-slate-600"}`} />
                            ))}
                          </div>
                          <span className="ml-2 text-sm text-gray-500 dark:text-slate-500">
                            {/* Backend already formats created_at for reviews (e.g. "May 05, 2026"). */}
                            {review.created_at || "—"}
                          </span>
                        </div>
                        <p className="mt-3 break-words text-gray-700 dark:text-slate-300 leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      {/* Sticky mobile CTA (bottom bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur
                      border-t border-gray-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-slate-500 truncate">{t("productDetail.price")}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
              {parseFloat(displayPrice).toLocaleString()} {currencyLabel}
            </p>
          </div>
          {stockIsOut ? (
            <button
              disabled
              className="ml-auto inline-flex min-h-11 max-w-[52vw] items-center justify-center rounded-xl
                         bg-gray-300 dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold
                         text-gray-500 dark:text-slate-400 cursor-not-allowed"
            >
              <span>🚫</span>
              <span className="ml-1.5 truncate">{t("productDetail.out_of_stock")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrimaryCta}
              disabled={addingToCart}
              className={`ml-auto inline-flex min-h-11 max-w-[52vw] items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50
                ${variantReady ? "bg-green-600 hover:bg-green-700" : "bg-amber-500 hover:bg-amber-600"}`}
            >
              {variantReady
                ? <ShoppingCartIcon className="mr-1.5 h-4 w-4 flex-shrink-0" />
                : <CursorArrowRaysIcon className="mr-1.5 h-4 w-4 flex-shrink-0" />}
              <span className="truncate">{primaryCtaLabel}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductDetail;
