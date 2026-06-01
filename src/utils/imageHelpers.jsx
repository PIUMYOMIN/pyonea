// src/utils/imageHelpers.jsx
import { IMAGE_BASE_URL, DEFAULT_PLACEHOLDER, IMAGE_PROXY_URL, SITE_PUBLIC_URL } from "../config";

const toAbsoluteUrl = (url) => {
  if (!url || url.startsWith("http") || url.startsWith("data:")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${SITE_PUBLIC_URL}${path}`;
};

const isPublicHttpUrl = (url) => {
  try {
    const parsed = new URL(url);
    return (
      /^https?:$/i.test(parsed.protocol) &&
      !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
};

const isStorageImageUrl = (url) => {
  try {
    return new URL(url).pathname.includes("/storage/");
  } catch {
    return false;
  }
};

const getImageProxyUrl = (url, { width, quality = 80 } = {}) => {
  if (!IMAGE_PROXY_URL || !isPublicHttpUrl(url) || !isStorageImageUrl(url)) {
    return url;
  }

  const params = new URLSearchParams({
    url: url.replace(/^https?:\/\//i, ""),
    output: "webp",
    q: String(quality),
  });

  if (width) params.set("w", String(width));

  return `${IMAGE_PROXY_URL}/?${params.toString()}`;
};

const toStorageUrl = (path) => {
  const cleanPath = String(path || "")
    .replace("public/", "")
    .replace(/^\/?storage\//, "");

  return toAbsoluteUrl(`${IMAGE_BASE_URL}/${cleanPath}`);
};

/**
 * Returns a real transformed WebP URL for public backend storage images.
 * Localhost/dev images are left untouched because public image proxies cannot
 * fetch private local URLs.
 */
export const getWebPUrl = (url, { width, quality = 80 } = {}) => {
  if (!url || url.startsWith("data:")) return url;

  try {
    const source = url.startsWith("http") ? url : toStorageUrl(url);
    return getImageProxyUrl(source, { width, quality });
  } catch {
    return url;
  }
};

/**
 * Generates a srcSet string for responsive images.
 * widths: array of pixel widths, e.g. [200, 400, 800]
 */
export const getSrcSet = (url, widths = [200, 400, 800]) => {
  if (!url || url.startsWith("data:")) return "";
  return widths
    .map((w) => `${getWebPUrl(url, { width: w })} ${w}w`)
    .join(", ");
};

export const getImageUrl = (image) => {
  if (image == null) return DEFAULT_PLACEHOLDER;

  if (typeof image === "string") {
    if (!image) return DEFAULT_PLACEHOLDER;
    if (image.startsWith("http")) return image;
    return toStorageUrl(image);
  }

  if (typeof image === "object") {
    if (image.url != null && image.url !== "") {
      if (image.url.startsWith("http")) return image.url;
      return toStorageUrl(image.url);
    }
    if (image.path != null && image.path !== "") {
      if (image.path.startsWith("http")) return image.path;
      return toStorageUrl(image.path);
    }
  }

  return DEFAULT_PLACEHOLDER;
};
