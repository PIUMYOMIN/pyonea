import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { getImageUrl } from "../utils/imageHelpers";
import SEO from "../components/SEO/SEO";

// ── Cart skeleton ─────────────────────────────────────────────────────────────
const SkeletonCartItem = () => (
  <li className="py-6 flex gap-4 animate-pulse">
    <div className="w-24 h-24 rounded-md bg-gray-200 dark:bg-slate-700 flex-shrink-0" />
    <div className="flex-1 space-y-3">
      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
      <div className="flex items-center gap-3 mt-2">
        <div className="h-8 w-28 bg-gray-200 dark:bg-slate-700 rounded" />
        <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
    <div className="space-y-2 text-right">
      <div className="h-6 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
      <div className="h-4 w-16 bg-gray-200 dark:bg-slate-700 rounded ml-auto" />
    </div>
  </li>
);

const SkeletonOrderSummary = () => (
  <div className="bg-gray-50 dark:bg-slate-900 rounded-lg px-6 py-6 space-y-4 animate-pulse">
    <div className="h-5 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
    <div className="space-y-3 pt-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex justify-between">
          <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      ))}
    </div>
    <div className="h-px bg-gray-200 dark:bg-slate-700 mt-2" />
    <div className="flex justify-between pt-2">
      <div className="h-6 w-28 bg-gray-200 dark:bg-slate-700 rounded" />
      <div className="h-6 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
    </div>
    <div className="h-11 bg-gray-200 dark:bg-slate-700 rounded-md mt-4" />
    <div className="h-11 bg-gray-200 dark:bg-slate-700 rounded-md" />
  </div>
);

// ── Inline confirm — avoids window.confirm blocking the UI thread ─────────────
const RemoveButton = ({ onConfirm, isLoading, t }) => {
  const [confirming, setConfirming] = useState(false);

  if (isLoading) {
    return (
      <span className="flex items-center text-sm text-red-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-1" />
        {t("cart.removing", "Removing...")}
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-gray-600 dark:text-slate-400">{t("cart.remove_confirm", "Remove?")}</span>
        <button
          onClick={() => { setConfirming(false); onConfirm(); }}
          className="text-red-600 font-semibold hover:underline"
        >{t("cart.yes", "Yes")}</button>
        <button
          onClick={() => setConfirming(false)}
          className="text-gray-500 dark:text-slate-400 hover:underline"
        >{t("cart.no", "No")}</button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center text-red-600 hover:text-red-500 text-sm"
    >
      <TrashIcon className="h-4 w-4 mr-1" /> {t("cart.remove", "Remove")}
    </button>
  );
};

// ── Main Cart component ───────────────────────────────────────────────────────
const Cart = () => {
  const { t } = useTranslation();
  const {
    cartItems,
    cartSummary,
    removeFromCart,
    updateQuantity,
    subtotal,
    totalItems,
    clearCart,
    loading,
  } = useCart();
  const navigate = useNavigate();
  const [clearingCart, setClearingCart]   = useState(false);
  const [confirmClear, setConfirmClear]   = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [removingItemId, setRemovingItemId] = useState(null);
  const [error, setError]                 = useState(null);

  // t already declared above
  const formatMMK = (amount) => {
    const num = Number(amount) || 0;
    const formattedNumber = new Intl.NumberFormat("en-MM", {
      minimumFractionDigits: 0,
    }).format(num);
    return `${formattedNumber} ${t('common.currency.mmk', 'MMK')}`;
  };

  const handleUpdateQuantity = async (cartItemId, newQuantity, minOrder = 1) => {
    if (newQuantity < minOrder) return;
    if (updatingItemId === cartItemId) return;
    setError(null);
    setUpdatingItemId(cartItemId);
    try {
      await updateQuantity(cartItemId, newQuantity);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (cartItemId) => {
    if (removingItemId === cartItemId) return;
    setError(null);
    setRemovingItemId(cartItemId);
    try {
      await removeFromCart(cartItemId);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleClearCart = async () => {
    setError(null);
    setClearingCart(true);
    setConfirmClear(false);
    try {
      await clearCart();
    } catch (err) {
      setError(err.message);
    } finally {
      setClearingCart(false);
    }
  };

  const hasUnavailableItems = cartItems.some((item) => !item.is_available);
  const hasQuantityIssues   = cartItems.some((item) => !item.is_quantity_valid);
  const canCheckout         = cartItems.length > 0 && !hasUnavailableItems && !hasQuantityIssues;

  // ── Loading skeleton (first load only — while cartItems still empty) ─────────
  if (loading && cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <SEO title={t("cart.seo_title", "My Cart")} description={t("cart.seo_description", "Your shopping cart on Pyonea.")} noindex={true} />
        <div className="max-w-2xl mx-auto lg:max-w-none">
          <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-8" />
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
            <section className="lg:col-span-7">
              <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                {[...Array(3)].map((_, i) => <SkeletonCartItem key={i} />)}
              </ul>
            </section>
            <section className="mt-16 lg:mt-0 lg:col-span-5">
              <SkeletonOrderSummary />
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ── Rendered cart ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <SEO title={t("cart.seo_title", "My Cart")} description={t("cart.seo_description", "Your shopping cart on Pyonea.")} noindex={true} />
      <div className="max-w-2xl mx-auto lg:max-w-none">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100">
          {t("cart.title", "Shopping Cart")} ({totalItems} {totalItems === 1 ? t("cart.item_count_one", "item") : t("cart.item_count_other", "items")})
        </h1>

        {/* Inline error banner */}
        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700
                          text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-start justify-between gap-3">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="flex-shrink-0">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="bg-gray-200 dark:bg-slate-700 border-2 border-dashed border-gray-300 dark:border-slate-600
                            rounded-xl w-32 h-32 mx-auto flex items-center justify-center">
              <XMarkIcon className="h-12 w-12 text-gray-400 dark:text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-slate-100">{t("cart.empty_title", "Your cart is empty")}</h2>
            <p className="mt-2 text-lg text-gray-500 dark:text-slate-500">{t("cart.empty_message", "Start adding products to your cart")}</p>
            <div className="mt-10">
              <Link
                to="/products"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base
                           font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                {t("cart.continue_shopping", "Continue Shopping")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {(hasUnavailableItems || hasQuantityIssues) && (
              <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {hasUnavailableItems && t("cart.unavailable_warning", "Some items are no longer available.") + " "}
                  {hasQuantityIssues   && t("cart.quantity_warning", "Some items have quantity issues.") + " "}
                  {t("cart.review_before_checkout", "Please review your cart before checkout.")}
                </p>
              </div>
            )}

            <div className="mt-8 lg:grid lg:grid-cols-12 lg:gap-x-12">
              {/* ── Items ────────────────────────────────────────────────────── */}
              <section className="lg:col-span-7">
                <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                  {cartItems.map((item) => {
                    const isUpdating     = updatingItemId === item.id;
                    const isRemoving     = removingItemId === item.id;
                    const minOrder       = item.min_order ?? 1;
                    const quantityStep   = item.quantity_step ?? 1;
                    const stockLimit     = item.stock ?? Infinity;
                    const unitLabel      = item.quantity_unit ?? "pcs";

                    // Active wholesale tier: highest tier whose min_qty ≤ current quantity
                    const activeTier = item.wholesale_tiers?.length
                      ? [...item.wholesale_tiers]
                          .sort((a, b) => b.min_qty - a.min_qty)
                          .find(t => item.quantity >= t.min_qty) ?? null
                      : null;
                    // Next tier the buyer could unlock by increasing quantity
                    const nextTier = item.wholesale_tiers?.length
                      ? item.wholesale_tiers
                          .slice()
                          .sort((a, b) => a.min_qty - b.min_qty)
                          .find(t => t.min_qty > item.quantity) ?? null
                      : null;

                    return (
                      <li
                        key={item.id}
                        className={`py-6 flex gap-4 transition-opacity ${isRemoving ? "opacity-40" : ""}`}
                      >
                        {/* Thumbnail */}
                        <div className="flex-shrink-0 w-24 h-24 rounded-md overflow-hidden
                                        border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="w-full h-full object-contain object-center"
                            onError={(e) => { e.target.src = getImageUrl(null); }}
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 flex flex-col min-w-0">
                          <div className="flex justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-medium text-gray-900 dark:text-slate-100 truncate">
                                <Link
                                  to={`/products/${item.slug ?? item.product_id}`}
                                  className="hover:text-green-600 dark:hover:text-green-400"
                                >
                                  {item.name}
                                </Link>
                              </h4>

                              <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-500">
                                {item.category}
                              </p>

                              {/* Variant options badge row */}
                              {item.selected_options &&
                                Object.keys(item.selected_options).length > 0 && (
                                  <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                                    {Object.entries(item.selected_options)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join(" · ")}
                                  </p>
                                )}

                              {/* Stock count */}
                              {item.stock != null && item.is_available && (
                                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                                  {t("cart.stock_available", "{{stock}} {{unit}} in stock", { stock: item.stock, unit: unitLabel })}
                                </p>
                              )}

                              {/* Warnings */}
                              {!item.is_available && (
                                <p className="mt-1 text-sm text-red-500 font-medium">
                                  {t("cart.product_unavailable", "Product no longer available")}
                                </p>
                              )}
                              {item.is_available && !item.is_quantity_valid && (
                                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400 font-medium">
                                  {t("cart.only_stock_available", "Only {{stock}} {{unit}} available", { stock: item.stock, unit: unitLabel })}
                                </p>
                              )}
                            </div>

                            {/* Price */}
                            <div className="text-right flex-shrink-0">
                              {item.selling_price != null && item.selling_price < item.price ? (
                                <>
                                  <p className="text-base font-bold text-red-600">
                                    {formatMMK(item.selling_price)}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-slate-600 line-through">
                                    {formatMMK(item.price)}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                    = {formatMMK(item.selling_price * item.quantity)}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-base font-bold text-green-700 dark:text-green-400">
                                    {formatMMK(item.price)}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                    = {formatMMK(item.subtotal)}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Qty stepper + remove */}
                          <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded">
                              <button
                                onClick={() =>
                                  handleUpdateQuantity(item.id, Math.max(item.quantity - quantityStep, minOrder), minOrder)
                                }
                                disabled={
                                  item.quantity <= minOrder || isUpdating || !item.is_available
                                }
                                className="px-3 py-1 text-gray-600 dark:text-slate-400
                                           hover:bg-gray-100 dark:hover:bg-slate-700
                                           disabled:opacity-40 disabled:cursor-not-allowed"
                                title={t("cart.min_order_with_unit", "Min. order: {{quantity}} {{unit}}", { quantity: minOrder, unit: unitLabel })}
                              >
                                −
                              </button>

                              <div className="relative">
                                <input
                                  type="number"
                                  min={minOrder}
                                  step={quantityStep}
                                  max={stockLimit === Infinity ? undefined : stockLimit}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const raw     = parseInt(e.target.value, 10) || minOrder;
                                    const clamped = Math.min(Math.max(raw, minOrder), stockLimit);
                                    // Snap to nearest valid step
                                    let snapped = clamped;
                                    if (quantityStep > 1) {
                                      const remainder = (clamped - minOrder) % quantityStep;
                                      snapped = remainder === 0
                                        ? clamped
                                        : clamped + (quantityStep - remainder);
                                    }
                                    handleUpdateQuantity(item.id, snapped, minOrder);
                                  }}
                                  disabled={isUpdating || !item.is_available}
                                  className="w-14 text-center border-0 focus:ring-0 bg-transparent
                                             text-gray-900 dark:text-slate-100 text-sm py-1"
                                />
                                {isUpdating && (
                                  <div className="absolute inset-0 flex items-center justify-center
                                                  bg-white/70 dark:bg-slate-800/70 rounded">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500" />
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  const next = item.quantity + quantityStep;
                                  if (next > stockLimit) return;
                                  handleUpdateQuantity(item.id, next, minOrder);
                                }}
                                disabled={
                                  item.quantity + quantityStep > stockLimit || isUpdating || !item.is_available
                                }
                                className="px-3 py-1 text-gray-600 dark:text-slate-400
                                           hover:bg-gray-100 dark:hover:bg-slate-700
                                           disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>

                            <RemoveButton
                              onConfirm={() => handleRemoveItem(item.id)}
                              isLoading={isRemoving}
                              t={t}
                            />
                          </div>

                          {/* MOQ + step hint */}
                          {(minOrder > 1 || quantityStep > 1) && (
                            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                              {minOrder > 1 && t("cart.min_order_with_unit", "Min. order: {{quantity}} {{unit}}", { quantity: minOrder, unit: unitLabel })}
                              {minOrder > 1 && quantityStep > 1 && quantityStep !== minOrder && " · "}
                              {quantityStep > 1 && quantityStep !== minOrder && t("cart.order_steps", "Order in steps of {{quantity}}", { quantity: quantityStep })}
                            </p>
                          )}

                          {/* Active volume pricing tier */}
                          {activeTier && (
                            <p className="mt-1 text-xs text-green-700 dark:text-green-400 font-medium">
                              {t("cart.volume_tier_active", "Volume tier active: {{discount}} for >= {{quantity}} {{unit}}", {
                                discount: activeTier.discount_pct > 0 ? `-${activeTier.discount_pct}%` : "",
                                quantity: activeTier.min_qty,
                                unit: unitLabel,
                              })}
                              {activeTier.label ? ` (${activeTier.label})` : ""}
                            </p>
                          )}
                          {/* Next tier nudge */}
                          {!activeTier && nextTier && (
                            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                              {t("cart.unlock_volume_pricing", "Add {{quantity}} more to unlock {{discount}} pricing", {
                                quantity: nextTier.min_qty - item.quantity,
                                discount: nextTier.discount_pct > 0 ? `-${nextTier.discount_pct}%` : t("cart.volume", "volume"),
                              })}
                            </p>
                          )}
                          {activeTier && nextTier && (
                            <p className="mt-1 text-xs text-amber-500 dark:text-amber-400">
                              {t("cart.unlock_better_tier", "Add {{quantity}} more to unlock {{discount}} tier", {
                                quantity: nextTier.min_qty - item.quantity,
                                discount: nextTier.discount_pct > 0 ? `-${nextTier.discount_pct}%` : t("cart.better", "a better"),
                              })}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Clear cart */}
                <div className="mt-6">
                  {confirmClear ? (
                    <span className="flex items-center gap-3 text-sm">
                      <span className="text-gray-600 dark:text-slate-400">{t("cart.clear_cart_confirm", "Clear entire cart?")}</span>
                      <button
                        onClick={handleClearCart}
                        disabled={clearingCart}
                        className="text-red-600 font-semibold hover:underline disabled:opacity-50"
                      >
                        {clearingCart ? t("cart.clearing", "Clearing...") : t("cart.yes_clear", "Yes, clear")}
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="text-gray-500 dark:text-slate-400 hover:underline"
                      >
                        {t("cart.cancel", "Cancel")}
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="flex items-center text-sm font-medium text-red-600 hover:text-red-500"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" /> {t("cart.clear_cart", "Clear all items")}
                    </button>
                  )}
                </div>
              </section>

              {/* ── Order summary ─────────────────────────────────────────────── */}
              <section className="mt-16 bg-gray-50 dark:bg-slate-900 rounded-lg px-6 py-6
                                  lg:mt-0 lg:col-span-5 self-start sticky top-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100">{t("cart.order_summary", "Order Summary")}</h2>

                <dl className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-600 dark:text-slate-400">
                      {t("cart.subtotal", "Subtotal")} ({totalItems} {totalItems === 1 ? t("cart.item_count_one", "item") : t("cart.item_count_other", "items")})
                    </dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {formatMMK(subtotal)}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-700 pt-4">
                    <dt className="text-sm text-gray-600 dark:text-slate-400">
                      {t("cart.shipping", "Shipping")}{" "}
                      <span className="text-xs text-gray-400 dark:text-slate-600">({t("cart.estimated_short", "est.")})</span>
                    </dt>
                    <dd className="text-sm text-gray-500 dark:text-slate-500 italic">
                      {t("cart.calculated_at_checkout", "Calculated at checkout")}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-700 pt-4">
                    <dt className="text-sm text-gray-600 dark:text-slate-400">
                      {t("cart.tax", "Tax")}{" "}
                      <span className="text-xs text-gray-400 dark:text-slate-600">(5%)</span>
                    </dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {formatMMK(
                        cartSummary?.tax ?? Math.round(subtotal * 0.05 * 100) / 100
                      )}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-700 pt-4">
                    <dt className="text-lg font-bold text-gray-900 dark:text-slate-100">
                      {t("cart.estimated_total", "Estimated Total")}
                    </dt>
                    <dd className="text-lg font-bold text-green-700 dark:text-green-400">
                      {formatMMK(
                        cartSummary?.total ??
                          Math.round(
                            (subtotal + Math.round(subtotal * 0.05 * 100) / 100) * 100
                          ) / 100
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => navigate("/checkout")}
                    disabled={!canCheckout}
                    className={`w-full rounded-md py-3 px-4 text-base font-medium text-white transition-colors
                      ${canCheckout
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-400 cursor-not-allowed"
                      }`}
                  >
                    {t("cart.checkout", "Proceed to Checkout")}
                  </button>
                  <Link
                    to="/products"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600
                               rounded-md py-3 px-4 text-center text-base font-medium
                               text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 block"
                  >
                    {t("cart.continue_shopping", "Continue Shopping")}
                  </Link>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart;
