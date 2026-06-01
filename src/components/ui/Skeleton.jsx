import React from "react";

// Base animated pulse box
export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`} />
);

// ── Primitive building blocks ─────────────────────────────────────────────

export const SkeletonText = ({ className = "" }) => (
  <Skeleton className={`h-4 rounded ${className}`} />
);

export const SkeletonAvatar = ({ className = "" }) => (
  <Skeleton className={`rounded-full ${className}`} />
);

export const SkeletonButton = ({ className = "" }) => (
  <Skeleton className={`h-9 rounded-lg ${className}`} />
);

// ── Card skeletons ────────────────────────────────────────────────────────

export const SkeletonProductCard = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full animate-pulse">
    <div className="w-full aspect-square bg-gray-200 dark:bg-slate-700" />
    <div className="p-3 flex flex-col flex-grow gap-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex-grow" />
      <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
        <Skeleton className="h-5 w-1/3 mb-2" />
        <Skeleton className="h-8 rounded-xl" />
      </div>
    </div>
  </div>
);

export const SkeletonSellerCard = () => (
  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-gray-100 dark:border-slate-700 overflow-hidden animate-pulse">
    <div className="p-3 sm:p-4">
      <div className="flex items-start space-x-3">
        <SkeletonAvatar className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-3 w-3 rounded-sm" />
            ))}
            <Skeleton className="h-3 w-8 ml-1" />
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-9 rounded-lg" />
    </div>
  </div>
);

export const SkeletonListRow = () => (
  <div className="flex items-center gap-4 py-3 px-4 animate-pulse">
    <SkeletonAvatar className="w-10 h-10 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-6 w-16 rounded-full" />
  </div>
);

// ── Full-page skeleton layouts ────────────────────────────────────────────

export const SkeletonProductDetail = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
    {/* Back button */}
    <Skeleton className="h-5 w-16 mb-6" />

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Left: main image + thumbnails */}
      <div className="space-y-4">
        <Skeleton className="w-full h-80 lg:h-96 rounded-lg" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="w-16 h-16 rounded-md" />
          ))}
        </div>
      </div>

      {/* Right: product info */}
      <div className="space-y-4">
        {/* Category + condition badges */}
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        {/* Product name */}
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-6 w-1/2" />
        {/* Price block */}
        <div className="flex items-end gap-3">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-6 w-24" />
        </div>
        {/* Short description */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        {/* Variant option groups (e.g. Color / Size swatches) */}
        <div className="space-y-3 pt-2">
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-4 w-12" />
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-16 rounded-md" />
            ))}
          </div>
        </div>
        {/* Quantity stepper + CTA buttons */}
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-11 w-28 rounded-md" />
          <Skeleton className="h-11 flex-1 rounded-md" />
          <Skeleton className="h-11 w-11 rounded-md" />
        </div>
        {/* B2B / MOQ info row */}
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
        {/* Seller info card */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-slate-800">
          <SkeletonAvatar className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>

    {/* Tabs section below the grid (Description / Specs / Reviews) */}
    <div className="mt-12 space-y-4">
      <div className="flex gap-6 border-b border-gray-200 dark:border-slate-700 pb-0">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-t-md" />
        ))}
      </div>
      <div className="space-y-3 pt-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  </div>
);

export const SkeletonBlogDetail = () => (
  <main className="bg-white dark:bg-slate-950 min-h-screen animate-pulse">
    <article>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-5 w-28" />

        <div className="mt-8 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-10 w-full sm:h-12" />
            <Skeleton className="h-10 w-5/6 sm:h-12" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Skeleton className="aspect-[16/7] w-full rounded-lg" />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 border-b border-gray-100 pb-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-5 w-28" />
          <div className="flex flex-wrap gap-2">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-9 w-24 rounded-md" />
            ))}
          </div>
        </div>

        <div className="space-y-7">
          {[...Array(4)].map((_, paragraphIndex) => (
            <div key={paragraphIndex} className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-2 border-t border-gray-100 pt-6 dark:border-slate-800">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>
    </article>
  </main>
);

export const SkeletonSellerProfile = () => (
  <div className="bg-gray-50 dark:bg-slate-900 min-h-screen">
    {/* Banner */}
    <Skeleton className="w-full h-44 sm:h-60 rounded-none" />

    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Store header */}
      <div className="relative -mt-14 sm:-mt-16 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-end gap-4">
            <SkeletonAvatar className="w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-white dark:ring-slate-900 flex-shrink-0" />
            <div className="mb-2 space-y-2">
              <Skeleton className="h-7 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700 mb-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-t-lg" />
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
        {[...Array(8)].map((_, i) => (
          <SkeletonProductCard key={i} />
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonSellersPage = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
    {/* Hero — static green gradient, no skeleton needed, just replicate the shape */}
    <div className="bg-gradient-to-r from-green-600 to-emerald-700 py-16 sm:py-20 px-4">
      <div className="max-w-7xl mx-auto text-center space-y-4">
        <Skeleton className="h-10 w-64 mx-auto bg-white/20 dark:bg-white/10" />
        <Skeleton className="h-5 w-96 max-w-full mx-auto bg-white/20 dark:bg-white/10" />
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search + filter bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 animate-pulse">
        <div className="flex flex-col md:flex-row gap-4">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
      </div>

      {/* Seller grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <SkeletonSellerCard key={i} />
        ))}
      </div>
    </div>
  </div>
);

export default Skeleton;
