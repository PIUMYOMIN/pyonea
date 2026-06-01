// src/config/index.js
/** Canonical origin for SEO, Open Graph, JSON-LD, and shared links (no trailing slash). */
export const SITE_PUBLIC_URL = String(import.meta.env.VITE_APP_URL || "https://pyonea.com").replace(
  /\/+$/,
  ""
);

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || '/storage';
export const DEFAULT_PLACEHOLDER = import.meta.env.VITE_DEFAULT_PRODUCT_IMAGE || '/placeholder-product.png';
export const IMAGE_PROXY_URL = String(import.meta.env.VITE_IMAGE_PROXY_URL || "").replace(/\/+$/, "");
