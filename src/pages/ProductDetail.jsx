import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
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
} from "@heroicons/react/24/solid";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import api from "../utils/api";
import { DEFAULT_PLACEHOLDER } from "../config";
import { SkeletonProductDetail } from "../components/ui/Skeleton";
import VariantPicker from "../components/ui/VariantPicker";

const ProductDetail = () => {
  const { t, i18n } = useTranslation();
  const loc = (en, mm) => i18n.language === "my" ? (mm || en) : (en || mm);
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [quantity, setQuantity]           = useState(1);
  const [activeImage, setActiveImage]     = useState(0);

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
  const [showReviewForm, setShowReviewForm]     = useState(false);
  const [isInWishlist, setIsInWishlist]         = useState(false);
  const [addingToCart, setAddingToCart]         = useState(false);
  const [wishlistLoading, setWishlistLoading]   = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [copied, setCopied]                     = useState(false);
  const [successMessage, setSuccessMessage]     = useState(null);

  const flashReview = (msg, type = "success") => {
    setReviewFlash({ msg, type });
    setTimeout(() => setReviewFlash(null), 3500);
  };

  const fallbackTitle       = "Product Details";
  const fallbackDescription = "View product details on Pyonea marketplace.";

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

        setProduct({
          ...productData,
          images:         formattedImages,
          specifications: formattedSpecifications,
          review_count:   productData.review_count   || 0,
          average_rating: parseFloat(productData.average_rating) || 0,
        });

        // Reviews
        try {
          const revRes = await api.get(`/reviews/products/${productData.id}`);
          setReviews(revRes.data.data || []);
        } catch { setReviews([]); }

        // Wishlist check (buyers only)
        if (user && user.role === "buyer") {
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
        setError(err.response?.data?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [slug, user]);

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
    const moq = variant?.moq ?? product?.moq ?? 1;
    setQuantity(moq);
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  // Show the variant price when one is selected, otherwise the base product price
  const displayPrice = selectedVariant?.price
    ?? (product?.is_currently_on_sale ? product?.selling_price : null)
    ?? product?.price;

  // Effective discount percentage for the badge — only when no variant selected
  // (variants are not discounted at the product level).
  const displayDiscountPct = !selectedVariant && product?.is_currently_on_sale
    ? (product?.effective_discount_pct ?? 0)
    : 0;
  
  // How much the buyer saves (shown below the price)
  const displayDiscountSaved = !selectedVariant && product?.is_currently_on_sale
    ? (product?.discount_saved ?? 0)
    : 0;

  // Stock available for the current selection
  const availableStock = selectedVariant != null
    ? (selectedVariant.quantity ?? 0)
    : product?.total_stock ?? 0;

  // Effective MOQ
  const effectiveMoq = selectedVariant?.moq ?? product?.moq ?? 1;

  // Whether the product uses the variant system
  const hasVariants = product?.has_variants || (product?.options?.length > 0);

  // Are all required options selected (and matched to a variant)?
  const variantReady = !hasVariants || selectedVariant !== null;

  // ── Add to cart ─────────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!user) { navigate("/login"); return; }

    // Guard: if product has variants, buyer must select a valid combo first
    if (hasVariants && !selectedVariant) {
      const requiredOption = product.options?.find((o) => o.is_required);
      setVariantError(
        requiredOption
          ? `Please select a ${requiredOption.name} before adding to cart.`
          : "Please select your options before adding to cart."
      );
      return;
    }

    if (quantity < effectiveMoq) {
      setVariantError(`Minimum order quantity is ${effectiveMoq} ${product?.quantity_unit ?? "piece(s)"}.`);
      return;
    }

    if (product?.product_type === "physical" && quantity > availableStock) {
      setVariantError(`Only ${availableStock} ${product?.quantity_unit ?? "unit(s)"} available in stock.`);
      return;
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
      setSuccessMessage(result.message || "Product added to cart successfully!");
    } catch (error) {
      setSuccessMessage({ type: "error", message: error.message || "Failed to add product to cart" });
    } finally {
      setAddingToCart(false);
    }
  };

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate("/cart");
  };

  const handleAddToWishlist = async () => {
    if (!user) { navigate("/login"); return; }
    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        await api.delete(`/wishlist/${product.id}`);
        setIsInWishlist(false);
        setSuccessMessage("Removed from wishlist");
      } else {
        await api.post("/wishlist", { product_id: product.id });
        setIsInWishlist(true);
        setSuccessMessage("Added to wishlist");
      }
    } catch (error) {
      setSuccessMessage({ type: "error", message: error.response?.data?.message || "Failed to update wishlist" });
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleReviewAction = () => {
    if (!user) { navigate("/login"); return; }
    if (user.role === "admin" || user.role === "seller") {
      flashReview("Only buyers can write reviews.", "error"); return;
    }
    setShowReviewForm(!showReviewForm);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (rating === 0) { flashReview("Please select a rating.", "error"); return; }

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
      setSuccessMessage(response.data.message || "Review submitted successfully!");
    } catch (error) {
      setReviewPopup({ msg: error.response?.data?.message || "Failed to submit review.", type: "error" });
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── Share ────────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const url   = `${window.location.origin}/products/${product?.slug_en || product?.slug || slug}`;
    const title = loc(product?.name_en, product?.name_mm) || "Product";
    const text  = `Check out ${title} on Pyonea`;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  // ── SEO ──────────────────────────────────────────────────────────────────────
  const pageTitle       = product ? (loc(product.name_en, product.name_mm) || "Product") : fallbackTitle;
  const pageDescription = product
    ? (loc(product.description_en, product.description_mm) || "").slice(0, 150)
    : fallbackDescription;
  const pageImage = product?.images?.[0] ? getImageUrl(product.images[0]) : DEFAULT_PLACEHOLDER;
  const pageUrl   = product ? `/products/${product.slug || slug}` : `/products/${slug}`;

  const productSchema = useMemo(() => {
    if (!product) return null;
    return {
      "@context": "https://schema.org",
      "@type":    "Product",
      name:        product.name_en || product.name_mm,
      description: product.description_en || product.description_mm,
      image: product.images?.map((img) => getImageUrl(img)),
      sku: product.sku,
      brand: product.seller ? { "@type": "Brand", name: product.seller.store_name || product.seller.name } : undefined,
      offers: {
        "@type":       "Offer",
        price:          displayPrice,
        priceCurrency: "MMK",
        availability:  availableStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: `https://pyonea.com/products/${product.slug || product.id}`,
      },
      aggregateRating: product.review_count > 0 ? {
        "@type":      "AggregateRating",
        ratingValue:  product.average_rating,
        reviewCount:  product.review_count,
      } : undefined,
    };
  }, [product, displayPrice, availableStock]);

  const SeoComponent = useSEO({
    title:       pageTitle,
    description: pageDescription.slice(0, 155) || "View product details on Pyonea — Myanmar's trusted B2B marketplace.",
    image:       product?.images?.[0] ? getImageUrl(product.images[0]) : undefined,
    url:         pageUrl,
    schema:      productSchema,
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">Product Not Found</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-4">{error}</p>
          <button onClick={() => navigate("/products")}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
            Back to Products
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Product Not Found</h2>
        </div>
      </>
    );
  }

  return (
    <>
      {SeoComponent}

      {/* ── Non-blocking toast (bottom-right, not a full overlay) ─────────── */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <button onClick={() => navigate(-1)} className="flex items-center text-green-600 hover:text-green-700 mb-6">
            <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* ── Left: Images ────────────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="bg-gray-100 dark:bg-slate-800 rounded-lg h-80 lg:h-96 flex items-center justify-center overflow-hidden">
                <img
                  src={getImageUrl(
                    typeof product.images[activeImage] === "string"
                      ? product.images[activeImage]
                      : product.images[activeImage]?.url
                  )}
                  alt={loc(product.name_en, product.name_mm) || "Product"}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => { e.target.src = DEFAULT_PLACEHOLDER; }}
                />
              </div>

              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((img, index) => (
                    <button key={index} onClick={() => setActiveImage(index)}
                      className={`bg-gray-100 dark:bg-slate-800 rounded h-20 flex items-center justify-center overflow-hidden border-2 transition-colors
                        ${activeImage === index ? "border-green-500" : "border-transparent dark:border-transparent hover:border-slate-600"}`}>
                      <img
                        src={getImageUrl(typeof img === "string" ? img : img.url)}
                        alt={`View ${index + 1}`}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => { e.target.src = DEFAULT_PLACEHOLDER; }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Right: Product info ──────────────────────────────────────── */}
            <div className="space-y-6">

              {/* Name */}
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-slate-100">
                  {loc(product.name_en, product.name_mm) || "Product"}
                </h1>
                {product.name_en && product.name_mm && (
                  <p className="text-lg text-gray-600 dark:text-slate-400 mt-1">
                    {loc(product.name_mm, product.name_en)}
                  </p>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon key={star} className={`h-5 w-5 ${
                      star <= Math.round(product.average_rating || 0) ? "text-yellow-400" : "text-gray-300 dark:text-slate-600"}`} />
                  ))}
                </div>
                <span className="ml-2 text-gray-600 dark:text-slate-400">
                  {product.average_rating?.toFixed(1) || "0.0"} ({product.review_count || 0} reviews)
                </span>
              </div>

              {/* Price — shows variant price when selected */}
              <div>
                {displayDiscountPct > 0 ? (
                  <>
                    <span className="inline-block bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2">
                      -{Math.round(displayDiscountPct)}% OFF
                    </span>
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-2xl font-bold text-red-600">
                        {parseFloat(displayPrice).toLocaleString()} MMK
                      </h2>
                      <span className="text-lg text-gray-400 dark:text-slate-600 line-through">
                        {parseFloat(product.price).toLocaleString()} MMK
                      </span>
                    </div>
                    {displayDiscountSaved > 0 && (
                      <p className="text-sm text-green-600 font-medium mt-0.5">
                        You save {parseFloat(displayDiscountSaved).toLocaleString()} MMK
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-semibold text-green-600">
                      {parseFloat(displayPrice).toLocaleString()} MMK
                    </h2>
                    {hasVariants && !selectedVariant && (
                      <span className="text-sm text-gray-500 dark:text-slate-400">starting price</span>
                    )}
                  </div>
                )}
                <p className="text-gray-500 dark:text-slate-500 mt-1">Tax inclusive</p>
              </div>

              {/* ── Variant Picker ─────────────────────────────────────────── */}
              {hasVariants && (
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-1">
                  <VariantPicker
                    options={product.options ?? []}
                    variants={product.variants ?? []}
                    onVariantChange={handleVariantChange}
                  />
                </div>
              )}

              {/* Variant validation error */}
              {variantError && (
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400
                                bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700
                                rounded-lg px-3 py-2">
                  <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
                  {variantError}
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                  {loc(product.description_en, product.description_mm) || "No description"}
                </p>
              </div>

              {/* Specifications */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Specifications</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="border-t border-gray-200 dark:border-slate-700 pt-2">
                        <dt className="font-medium text-gray-900 dark:text-slate-100 text-sm">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
                        </dt>
                        <dd className="text-gray-700 dark:text-slate-300 text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* MOQ + stock info */}
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
                <span>
                  <span className="font-medium text-gray-800 dark:text-slate-200">MOQ:</span>{" "}
                  {effectiveMoq} {product.quantity_unit ?? "piece(s)"}
                </span>
                {product.product_type === "physical" && (
                  <span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">Stock:</span>{" "}
                    {hasVariants && !selectedVariant
                      ? `${product.total_stock ?? 0} total`
                      : `${availableStock} ${product.quantity_unit ?? "unit(s)"}`}
                  </span>
                )}
              </div>

              {/* Quantity selector */}
              <div className="flex items-center space-x-4">
                <label htmlFor="quantity" className="font-medium text-gray-800 dark:text-slate-200">
                  Quantity
                </label>
                <input
                  type="number"
                  id="quantity"
                  min={effectiveMoq}
                  max={product.product_type === "physical" ? (availableStock || undefined) : undefined}
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(parseInt(e.target.value) || effectiveMoq, effectiveMoq))}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-slate-600
                             bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-md"
                />
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  {product.quantity_unit ?? "piece(s)"}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || (product.product_type === "physical" && availableStock === 0 && variantReady)}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 transition
                             flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingToCart ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCartIcon className="h-5 w-5 mr-2" />
                      Add to Cart
                    </>
                  )}
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={addingToCart || (product.product_type === "physical" && availableStock === 0 && variantReady)}
                  className="flex-1 bg-gray-800 text-white py-3 px-6 rounded-md hover:bg-gray-900
                             transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>

                <button
                  onClick={handleAddToWishlist}
                  disabled={wishlistLoading}
                  title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                  className="p-3 rounded-md border border-gray-300 dark:border-slate-600
                             text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800
                             transition disabled:opacity-50"
                >
                  {wishlistLoading
                    ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
                    : <HeartIcon className={`h-6 w-6 ${isInWishlist ? "text-red-500 fill-current" : ""}`} />
                  }
                </button>

                <button
                  onClick={handleShare}
                  title={copied ? "Link copied" : "Share product"}
                  className={`p-3 rounded-md border transition flex items-center justify-center
                    ${copied
                      ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-600"
                      : "border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}
                >
                  {copied ? <CheckIcon className="h-6 w-6" /> : <ShareIcon className="h-6 w-6" />}
                </button>
              </div>

              {/* Out of stock */}
              {product.product_type === "physical" && variantReady && availableStock === 0 && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700
                                text-red-700 dark:text-red-300 px-4 py-3 rounded">
                  {hasVariants && selectedVariant
                    ? "This variant is currently out of stock."
                    : "This product is currently out of stock."}
                </div>
              )}

              {/* Seller info */}
              {product.seller && (
                <div className="pt-6 border-t border-gray-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold mb-3">Seller Information</h3>
                  <Link
                    to={`/sellers/${product.seller.store_slug || product.seller.id}`}
                    className="flex items-center hover:bg-gray-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
                  >
                    <div className="bg-gray-200 dark:bg-slate-700 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-full w-12 h-12 flex items-center justify-center">
                      <span className="text-gray-500 dark:text-slate-400 text-sm">Shop</span>
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

          {/* ── Reviews ───────────────────────────────────────────────────── */}
          <div className="mt-16">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                Customer Reviews ({product.review_count || 0})
              </h2>
              <button onClick={handleReviewAction}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                Write a Review
              </button>
            </div>

            {showReviewForm && (
              <div className="mt-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-lg font-medium mb-4">Write a Review</h3>
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
                    <label className="block text-gray-700 dark:text-slate-300 mb-2">Your Rating</label>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none mr-1">
                          <StarIcon className={`h-8 w-8 ${star <= rating ? "text-yellow-400" : "text-gray-300 dark:text-slate-600"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="review" className="block text-gray-700 dark:text-slate-300 mb-2">Your Review</label>
                    <textarea id="review" rows="4"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700
                                 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                      required placeholder="Share your experience with this product..." />
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button type="button" onClick={() => setShowReviewForm(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                      Cancel
                    </button>
                    <button type="submit" disabled={submittingReview}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center">
                      {submittingReview ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Submitting...</>
                      ) : "Submit Review"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-6">
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-slate-500 text-lg">No reviews yet</p>
                  <p className="text-gray-400 dark:text-slate-600">Be the first to review this product!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 dark:border-slate-700 pb-6">
                    <div className="flex items-start">
                      <div className="bg-gray-200 dark:bg-slate-700 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-full w-10 h-10 flex items-center justify-center">
                        <span className="text-gray-500 dark:text-slate-400 text-xs">User</span>
                      </div>
                      <div className="ml-4 flex-1">
                        <h4 className="font-medium">
                          {review.buyer?.name || review.user?.name || review.user || "Anonymous"}
                        </h4>
                        <div className="flex items-center mt-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <StarIcon key={star} className={`h-4 w-4 ${star <= review.rating ? "text-yellow-400" : "text-gray-300 dark:text-slate-600"}`} />
                            ))}
                          </div>
                          <span className="ml-2 text-sm text-gray-500 dark:text-slate-500">
                            {review.created_at ? new Date(review.created_at).toLocaleDateString("en-GB") : "—"}
                          </span>
                        </div>
                        <p className="mt-3 text-gray-700 dark:text-slate-300 leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
    </>
  );
};

export default ProductDetail;