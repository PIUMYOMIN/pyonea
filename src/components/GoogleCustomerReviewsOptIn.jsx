import { useEffect } from "react";

const SCRIPT_ID = "google-customer-reviews-platform";
const CALLBACK_NAME = "renderOptIn";
const MERCHANT_ID = 5795794062;
const DEFAULT_DELIVERY_DAYS = 7;

const parseAddress = (address) => {
  if (!address) return {};
  if (typeof address === "string") {
    try {
      return JSON.parse(address);
    } catch {
      return {};
    }
  }
  return address;
};

const toGoogleDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const fallbackDeliveryDate = (order) => {
  const base = new Date(order?.created_at || order?.createdAt || Date.now());
  if (Number.isNaN(base.getTime())) return "";
  base.setDate(base.getDate() + DEFAULT_DELIVERY_DAYS);
  return toGoogleDate(base);
};

const normalizeCountryCode = (value) => {
  if (!value) return "MM";
  const country = String(value).trim();
  if (/^(myanmar|burma)$/i.test(country)) return "MM";
  if (/^[a-z]{2}$/i.test(country)) return country.toUpperCase();
  return "MM";
};

const getOrderId = (order) =>
  order?.order_number || order?.orderNumber || order?.id || "";

const getEmail = (order, shippingAddress) =>
  order?.customer_email ||
  order?.customerEmail ||
  order?.buyer?.email ||
  order?.user?.email ||
  shippingAddress?.email ||
  "";

const getEstimatedDeliveryDate = (order) =>
  toGoogleDate(
    order?.estimated_delivery ||
      order?.estimatedDelivery ||
      order?.estimated_delivery_date ||
      order?.delivery?.estimated_delivery_date ||
      order?.delivery?.estimated_delivery
  ) || fallbackDeliveryDate(order);

const getProductsWithGtin = (items = []) =>
  items
    .map((item) => item?.gtin || item?.product?.gtin || item?.product_gtin)
    .filter(Boolean)
    .map((gtin) => ({ gtin: String(gtin) }));

const GoogleCustomerReviewsOptIn = ({ order }) => {
  useEffect(() => {
    if (!order || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const shippingAddress = parseAddress(order.shipping_address || order.shippingAddress);
    const orderId = getOrderId(order);
    const email = getEmail(order, shippingAddress);
    const deliveryCountry = normalizeCountryCode(
      order.delivery_country ||
        order.deliveryCountry ||
        shippingAddress.country_code ||
        shippingAddress.country
    );
    const estimatedDeliveryDate = getEstimatedDeliveryDate(order);

    if (!orderId || !email || !deliveryCountry || !estimatedDeliveryDate) {
      return;
    }

    const sessionKey = `google-customer-reviews-opt-in:${orderId}`;
    if (window.sessionStorage?.getItem(sessionKey)) {
      return;
    }

    const products = getProductsWithGtin(order.items);
    const payload = {
      merchant_id: MERCHANT_ID,
      order_id: String(orderId),
      email: String(email),
      delivery_country: deliveryCountry,
      estimated_delivery_date: estimatedDeliveryDate,
      ...(products.length > 0 ? { products } : {}),
    };

    const renderOptIn = () => {
      if (!window.gapi?.load) return;
      window.gapi.load("surveyoptin", () => {
        window.gapi.surveyoptin.render(payload);
        window.sessionStorage?.setItem(sessionKey, "1");
      });
    };

    window[CALLBACK_NAME] = renderOptIn;

    if (window.gapi?.load) {
      renderOptIn();
      return;
    }

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", renderOptIn, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://apis.google.com/js/platform.js?onload=${CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, [order]);

  return null;
};

export default GoogleCustomerReviewsOptIn;
