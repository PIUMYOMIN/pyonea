// src/utils/imageHelpers.jsx
import { IMAGE_BASE_URL, DEFAULT_PLACEHOLDER, SITE_PUBLIC_URL } from "../config";

const toAbsoluteUrl = (url) => {
  if (!url || url.startsWith('http') || url.startsWith('data:')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${SITE_PUBLIC_URL}${path}`;
};

/**
 * Returns a WebP-optimised URL for backend images.
 * If the backend (Laravel + Intervention Image or Spatie Media) supports
 * query-param conversions, this will serve WebP automatically.
 * Falls back silently to the original URL for CDN / external images.
 *
 * Usage: getWebPUrl(url, { width: 400, quality: 80 })
 */
export const getWebPUrl = (url, { width, quality = 80 } = {}) => {
  if (!url || url.startsWith('data:')) return url;

  // External URLs (CDN, S3, etc.) — skip transformation
  if (!url.includes(IMAGE_BASE_URL) && url.startsWith('http')) return url;

  try {
    const u = new URL(url.startsWith('http') ? url : `${IMAGE_BASE_URL}/${url}`);
    u.searchParams.set('format', 'webp');
    u.searchParams.set('quality', String(quality));
    if (width) u.searchParams.set('w', String(width));
    return u.toString();
  } catch {
    return url;
  }
};

/**
 * Generates a srcSet string for responsive images.
 * widths: array of pixel widths, e.g. [200, 400, 800]
 */
export const getSrcSet = (url, widths = [200, 400, 800]) => {
  if (!url || url.startsWith('data:')) return '';
  return widths
    .map((w) => `${getWebPUrl(url, { width: w })} ${w}w`)
    .join(', ');
};

export const getImageUrl = (image) => {
  if (image == null) return DEFAULT_PLACEHOLDER;     // FIX: catches both null and undefined

  if (typeof image === 'string') {
    if (!image) return DEFAULT_PLACEHOLDER;          // empty string guard
    if (image.startsWith('http')) return image;
    const cleanPath = image.replace('public/', '');
    return toAbsoluteUrl(`${IMAGE_BASE_URL}/${cleanPath}`);
  }

  if (typeof image === 'object') {
    if (image.url != null && image.url !== '') {
      if (image.url.startsWith('http')) return image.url;
      const cleanPath = image.url.replace('public/', '');
      return toAbsoluteUrl(`${IMAGE_BASE_URL}/${cleanPath}`);
    }
    if (image.path != null && image.path !== '') {
      if (image.path.startsWith('http')) return image.path;
      const cleanPath = image.path.replace('public/', '');
      return toAbsoluteUrl(`${IMAGE_BASE_URL}/${cleanPath}`);
    }
  }

  return DEFAULT_PLACEHOLDER;
};
