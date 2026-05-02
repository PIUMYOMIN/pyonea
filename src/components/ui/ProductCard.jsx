import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PhotoIcon, ShoppingCartIcon, AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid, StarIcon } from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { IMAGE_BASE_URL, DEFAULT_PLACEHOLDER } from "../../config";
import { useTranslation } from "react-i18next";

// ── Image URL helper ──────────────────────────────────────────────────────────
const getImageUrl = (image) => {
  if (!image) return DEFAULT_PLACEHOLDER;
  if (typeof image === "string") {
    if (image.startsWith("http")) return image;
    return `${IMAGE_BASE_URL}/${image.replace("public/", "")}`;
  }
  if (typeof image === "object") {
    const src = image.url || image.path || "";
    if (!src) return DEFAULT_PLACEHOLDER;
    if (src.startsWith("http")) return src;
    return `${IMAGE_BASE_URL}/${src.replace("public/", "")}`;
  }
  return DEFAULT_PLACEHOLDER;
};

// ── Format price in MMK ───────────────────────────────────────────────────────
const formatMMK = (amount) =>
  new Intl.NumberFormat("my-MM", {
    style: "currency",
    currency: "MMK",
    minimumFractionDigits: 0,
  }).format(amount || 0);

// ── Star rating row ───────────────────────────────────────────────────────────
const Stars = ({ rating, count }) => {
  const filled = Math.round(rating || 0);
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon
            key={i}
            className={`h-3 w-3 ${i <= filled ? "text-amber-400" : "text-gray-200 dark:text-gray-600"}`}
          />
        ))}
      </div>
      {(rating > 0 || count > 0) && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">
          {rating ? Number(rating).toFixed(1) : ""}
          {count > 0 && ` (${count})`}
        </span>
      )}
    </div>
  );
};



// ── Main component ────────────────────────────────────────────────────────────
const ProductCard = ({ product, className = "" }) => {
  const { i18n } = useTranslation();
  const loc = (en, mm) => (i18n.language === "my" ? mm || en : en || mm);
  const { user } = useAuth();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { cartItems, addToCart } = useCart();
  const navigate = useNavigate();

// const [toast, setToast]             = useState(null);
  const [imageError, setImageError]   = useState(false);
  const [isInCart, setIsInCart]       = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);

  const slug      = product.slug_en || product.slug || product.id;
  const productId = product.id || product.product_id;
  const imageUrl  = product.images?.[0]
    ? getImageUrl(product.images[0])
    : product.image
    ? getImageUrl(product.image)
    : DEFAULT_PLACEHOLDER;
  const isInWishlist = !!wishlist?.some((w) => w.id === productId);

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
 
  const basePrice = toNum(product.price);
 
  // Prefer the canonical server-computed values; fall back to local derivation
  // for any edge case where the API response is missing a field.
  const isOnSale = product.is_currently_on_sale
    ?? (product.is_on_sale && (
      (toNum(product.selling_price) > 0 && toNum(product.selling_price) < basePrice) ||
      toNum(product.discount_percentage) > 0
    ));
 
  const effectivePrice = isOnSale
    ? (toNum(product.selling_price) > 0 && toNum(product.selling_price) < basePrice
        ? toNum(product.selling_price)
        : basePrice * (1 - toNum(product.discount_percentage) / 100))
    : basePrice;
 
  // effective_discount_pct is the authoritative badge value from the backend.
  // Fall back to local calculation if it's absent.
  const discountPct = isOnSale
    ? Math.max(
        0,
        toNum(product.effective_discount_pct) ||
        (basePrice > 0 ? Math.round(((basePrice - effectivePrice) / basePrice) * 100) : 0)
      )
    : 0;
  

  const isBuyer       = !user || user.type === "buyer";
  const isUnavailable = !product.is_active;
  // `in_stock` is provided by ProductListResource (calls Model::isInStock()).
  // It returns true for digital/service products (no stock limit) and for
  // physical products that have at least one active variant with quantity > 0,
  // OR have no variants at all. Fall back to true when the field is absent
  // (e.g. on a detail page that doesn't use ProductListResource).
  const isOutOfStock  = product.is_active && product.in_stock === false;

  useEffect(() => {
    setIsInCart(!!cartItems?.some((c) => c.product_id === productId));
  }, [cartItems, productId]);

  // const flash = useCallback((msg, type = "success") => {
  //   setToast({ msg, type });
  //   setTimeout(() => setToast(null), 2200);
  // }, []);

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login", { state: { returnTo: window.location.pathname } });
      return;
    }
    if (wishLoading) return;
    setWishLoading(true);
    try {
      if (isInWishlist) {
        await removeFromWishlist(productId);
        // flash("Removed from wishlist");
      } else {
        await addToWishlist(productId);
        // flash("Added to wishlist ♡");
      }
    } catch {
      // flash("Could not update wishlist", "error");
    } finally {
      setWishLoading(false);
    }
  };

  const hasVariants = !!product.has_variants;

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/login", { state: { returnTo: window.location.pathname } });
      return;
    }
    // Products with variants can't be added directly from a card — send the
    // user to the detail page so they can pick their options first.
    if (hasVariants) {
      navigate(`/products/${slug}`);
      return;
    }
    if (isUnavailable || isOutOfStock || isInCart || cartLoading) return;
    setCartLoading(true);
    try {
      await addToCart(productId, 1);
    } catch (err) {
      console.warn("Add to cart failed:", err.message);
    } finally {
      setCartLoading(false);
    }
  };

  const sellerName =
    product.seller?.seller_profile?.store_name ||
    product.seller?.store_name ||
    product.seller?.name;

  const cartLabel = isUnavailable  ? "Unavailable"
    : isOutOfStock                 ? "Out of Stock"
    : isInCart                     ? "In Cart"
    : cartLoading                  ? "Adding…"
    : hasVariants                  ? "Select Options"
    :                                "Add to Cart";

  return (
    <motion.div
      className={`group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden
                  flex flex-col h-full
                  border border-gray-100 dark:border-gray-700
                  shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-gray-900/40
                  hover:border-gray-200 dark:hover:border-gray-600
                  transition-all duration-300 ease-out ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Image ───────────────────────────────────────────────────────────── */}
      <div className="relative flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-700 aspect-square">
        <Link to={`/products/${slug}`} className="block w-full h-full">
          {!imageError ? (
            <LazyLoadImage
              src={imageUrl}
              alt={loc(product.name_en, product.name_mm) || "Product"}
              effect="blur"
              wrapperClassName="w-full h-full"
              className="w-full h-full object-cover
                         transition-transform duration-500 ease-out
                         group-hover:scale-105"
              placeholderSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23e5e7eb'/%3E%3C/svg%3E"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center
                            bg-gray-100 dark:bg-gray-700">
              <PhotoIcon className="h-10 w-10 text-gray-300 dark:text-gray-500 mb-1" />
              <span className="text-xs text-gray-400 dark:text-gray-500">No image</span>
            </div>
          )}
        </Link>

        {/* Toast removed */}

        {/* ── Badges ── */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discountPct > 0 && !isOutOfStock && !isUnavailable && (
            <span className="bg-red-500 text-white text-[10px] font-bold
                             px-2 py-0.5 rounded-full leading-tight shadow-sm">
              -{Math.round(discountPct)}%
            </span>
          )}
          {product.is_new && !isOutOfStock && !isUnavailable && (
            <span className="bg-green-500 text-white text-[10px] font-bold
                             px-2 py-0.5 rounded-full leading-tight shadow-sm">
              NEW
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-gray-800/75 text-white text-[10px] font-bold
                             px-2 py-0.5 rounded-full leading-tight backdrop-blur-sm">
              Sold Out
            </span>
          )}
          {isUnavailable && !isOutOfStock && (
            <span className="bg-gray-400/90 text-white text-[10px] font-bold
                             px-2 py-0.5 rounded-full leading-tight">
              N/A
            </span>
          )}
        </div>

        {/* ── Wishlist button ── */}
        {isBuyer && (
          <button
            onClick={toggleWishlist}
            disabled={wishLoading}
            className="absolute top-2 right-2
                       flex items-center justify-center
                       hover:scale-110 active:scale-95
                       transition-all duration-150 focus:outline-none
                       focus:ring-2 focus:ring-transparent focus:ring-offset-1
                       disabled:opacity-60"
          >
            {isInWishlist
              ? <HeartSolid   className="h-4 w-4 text-red-500" />
              : <HeartOutline className="h-4 w-4 text-gray-400 group-hover:text-red-400 transition-colors" />
            }
          </button>
        )}

        {/* ── Category chip (bottom-left) ── */}
        {(product.category?.name_en || product.category?.name_mm) && (
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-medium
                             text-gray-700 dark:text-gray-200
                             bg-white/80 dark:bg-gray-900/75 backdrop-blur-sm
                             px-2 py-0.5 rounded-full">
              {loc(product.category?.name_en, product.category?.name_mm)}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-grow px-3 pt-2.5 pb-3">

        {/* Product name */}
        <Link to={`/products/${slug}`} className="block mb-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100
                         line-clamp-2 leading-snug
                         group-hover:text-green-600 dark:group-hover:text-green-400
                         transition-colors duration-150">
            {loc(product.name_en, product.name_mm) || product.name || "Unnamed Product"}
          </h3>
        </Link>

        {/* Rating */}
        <Stars rating={product.average_rating} count={product.review_count} />

        {/* Seller name */}
        {sellerName && (
          <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500 truncate">
            by {sellerName}
          </p>
        )}

        <div className="flex-grow" />

        {/* ── Price ─────────────────────────────────────────────────────────── */}
        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-end justify-between gap-1 flex-wrap">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {discountPct > 0 ? (
                <>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400 leading-none">
                    {formatMMK(effectivePrice)}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 line-through leading-none">
                    {formatMMK(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-sm font-bold text-green-700 dark:text-green-400 leading-none">
                  {formatMMK(product.price)}
                </span>
              )}
            </div>

            {/* MOQ chip */}
            {product.moq > 1 && (
              <span className="text-[10px] font-medium whitespace-nowrap
                               text-gray-500 dark:text-gray-400
                               bg-gray-100 dark:bg-gray-700
                               border border-gray-200 dark:border-gray-600
                               px-1.5 py-0.5 rounded-md">
                MOQ {product.moq}
              </span>
            )}
          </div>
        </div>

        {/* ── Add to Cart / Select Options button ───────────────────────────── */}
        {isBuyer && (
          <button
            onClick={handleAddToCart}
            disabled={isUnavailable || isOutOfStock || isInCart || cartLoading}
            className={`mt-2 w-full rounded-xl py-2 text-xs font-semibold
                        flex items-center justify-center gap-1.5
                        transition-all duration-150 focus:outline-none
                        focus:ring-2 focus:ring-offset-1
                        dark:focus:ring-offset-gray-800
                        ${isUnavailable || isOutOfStock
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed focus:ring-gray-300"
                          : isInCart
                          ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 cursor-default focus:ring-green-500"
                          : hasVariants
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:ring-blue-500"
                          : "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-sm focus:ring-green-500"
                        }`}
            aria-label={cartLabel}
          >
            {!isUnavailable && !isOutOfStock && (
              hasVariants
                ? <AdjustmentsHorizontalIcon className="h-3.5 w-3.5 flex-shrink-0" />
                : <ShoppingCartIcon className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            {cartLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default ProductCard;