import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import { useTranslation } from "react-i18next";

// Deterministic gradient from category name — consistent across renders
const gradientFromName = (name = "") => {
  const gradients = [
    "from-green-400 to-emerald-600",
    "from-blue-400 to-cyan-600",
    "from-purple-400 to-violet-600",
    "from-orange-400 to-amber-600",
    "from-pink-400 to-rose-600",
    "from-teal-400 to-green-600",
    "from-indigo-400 to-blue-600",
    "from-yellow-400 to-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
};

// Auto-cycles through items with a swipe-up animation
const SlidingText = ({ items }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 2200);
    return () => clearInterval(id);
  }, [items.length]);

  if (!items.length) return null;

  return (
    <div className="relative h-5 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          className="absolute inset-0 flex items-center text-xs text-green-700 font-medium"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{    y: -16, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {items[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

const CategoryCard = ({ category }) => {
  const { i18n } = useTranslation();

  if (!category || category.products_count === 0) return null;

  const loc = (en, mm) =>
    i18n.language === "my" ? (mm || en) : (en || mm);

  const displayName = loc(category.name_en, category.name_mm);
  const gradient    = gradientFromName(displayName);

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Only children that have products
  const activeChildren = (category.children || []).filter(
    (c) => (c.products_count || 0) > 0
  );

  // e.g. ["2 Power Banks", "1 Bluetooth Speaker"]
  const slidingItems = activeChildren.map(
    (c) => `${c.products_count} ${loc(c.name_en, c.name_mm)}`
  );

  // Best-effort discount percentage from category payload (or its children).
  const discountKeys = [
    "max_discount_percentage",
    "discount_percentage",
    "discount_percent",
    "top_discount_percentage",
    "best_discount_percentage",
  ];
  const categoryPct = Math.max(...discountKeys.map((k) => toNum(category?.[k])), 0);
  const childrenPct = Math.max(
    ...activeChildren.map((c) => Math.max(...discountKeys.map((k) => toNum(c?.[k])), 0)),
    0
  );
  const maxDiscountPct = Math.round(Math.max(categoryPct, childrenPct));

  return (
    <motion.div
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-gray-200 dark:border-slate-700 overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link to={`/products?category=${category.id}`} className="block">

        {/* ── Image / Gradient placeholder ────────────── */}
        <div className="relative aspect-square overflow-hidden">
          {category.image ? (
            <LazyLoadImage
              src={category.image}
              alt={displayName}
              effect="blur"
              className="w-full h-full object-cover"
              placeholderSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 300 300'%3E%3Crect width='300' height='300'
                fill='%23f3f4f6'/%3E%3C/svg%3E"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            // Colourful gradient tile used until an image is uploaded via admin
            <div className={`w-full h-full bg-gradient-to-br ${gradient}
                             flex items-center justify-center`}>
              <span className="text-white text-center font-bold text-sm px-3 leading-snug
                               drop-shadow-sm line-clamp-3">
                {displayName}
              </span>
            </div>
          )}
          {maxDiscountPct > 0 && (
            <div className="absolute top-2 left-2">
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight shadow-sm">
                Up to {maxDiscountPct}% OFF
              </span>
            </div>
          )}
        </div>

        {/* ── Parent category name ─────────────────────── */}
        <div className="px-2 pt-2 sm:px-3 sm:pt-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 line-clamp-1">
            {displayName}
          </h3>
        </div>

        {/* ── Swipe-up child category + count ─────────── */}
        {slidingItems.length > 0 && (
          <div className="bg-green-300 px-2 py-2 sm:px-3 sm:py-3 mt-1">
            <SlidingText items={slidingItems} />
          </div>
        )}

      </Link>
    </motion.div>
  );
};

export default CategoryCard;