import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  ShoppingCartIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import useSEO from "../hooks/useSEO";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../utils/api";
import { getImageUrl } from "../utils/imageHelpers";
import { DEFAULT_PLACEHOLDER } from "../config";

const STORAGE_KEY = "pyonea_bulk_order_lines_v1";

const lineKey = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ln-${Date.now()}-${Math.random()}`);

const productToLine = (p) => {
  const moq          = Math.max(1, parseInt(String(p.moq ?? 1), 10) || 1);
  const quantityStep = resolveQuantityStep(p.quantity_step, moq);
  const basePrice    = Number(p.selling_price ?? p.price ?? 0) || 0;
  const wholesaleTiers = Array.isArray(p.wholesale_tiers) ? p.wholesale_tiers : [];

  const sellerUserId = p.seller?.id ?? p.seller_id ?? null;
  const sellerLabel =
    p.seller?.store_name ||
    p.seller?.name ||
    (sellerUserId ? `Seller #${sellerUserId}` : "—");
  const rawImg =
    p.image ??
    (Array.isArray(p.images) && p.images.length
      ? typeof p.images[0] === "string"
        ? p.images[0]
        : p.images[0]?.url || p.images[0]
      : null);

  // Compute the effective unit price at MOQ quantity (accounts for any tier that applies immediately).
  const activeTierAtMoq = wholesaleTiers.length
    ? [...wholesaleTiers].sort((a, b) => b.min_qty - a.min_qty).find(t => moq >= t.min_qty)
    : null;
  const unitPrice = activeTierAtMoq ? Number(activeTierAtMoq.price_per_unit) : basePrice;

  return {
    key: lineKey(),
    productId: p.id,
    name: p.name_en || p.name_mm || `Product #${p.id}`,
    slug: p.slug_en,
    categoryId: p.category_id,
    sellerUserId,
    sellerLabel,
    unitLabel: (p.quantity_unit || p.min_order_unit || "piece").slice(0, 20),
    moq,
    quantityStep,
    basePrice,
    wholesaleTiers,
    unitPrice,
    hasVariants: !!p.has_variants,
    variantOptions: [],
    variantsLoading: false,
    selectedVariantId: null,
    image: rawImg,
    quantity: String(moq),
  };
};

const parseQty = (q) => {
  const n = parseInt(String(q).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

const toPositiveInt = (value, fallback = 1) => {
  const parsed = parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveQuantityStep = (rawStep, moq) => {
  const safeMoq = toPositiveInt(moq, 1);
  const parsedStep = toPositiveInt(rawStep, safeMoq);
  return parsedStep > 1 ? parsedStep : safeMoq;
};

const snapQuantityToStep = (quantity, moq, step) => {
  const safeMoq = toPositiveInt(moq, 1);
  const safeStep = resolveQuantityStep(step, safeMoq);
  let q = parseQty(quantity);

  if (q < safeMoq) q = safeMoq;
  if (safeStep <= 1) return q;

  const rem = (q - safeMoq) % safeStep;
  return rem === 0 ? q : q + (safeStep - rem);
};

/** Laravel RFQ rule: `deadline` must be strictly after today. */
const minRfqDeadline = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const defaultRfqDeadline = () => {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  return d.toISOString().slice(0, 10);
};

const BulkOrderTool = () => {
  const { t, i18n } = useTranslation();
  const { user, hasRole } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const fmtMmk = (n) => {
    const num = Number.isFinite(n) ? n : 0;
    const formattedNumber = new Intl.NumberFormat("en-MM", { maximumFractionDigits: 0 }).format(num);
    return `${formattedNumber} ${t('common.currency.mmk', 'MMK')}`;
  };

  const SeoComponent = useSEO({
    title: t("bulk_order.seo_title", "Bulk order tool | Pyonea"),
    description: t(
      "bulk_order.seo_desc",
      "Build a multi-product wholesale list from Pyonea, export or copy it, add to cart, or send grouped RFQs to sellers."
    ),
    url: "/bulk-order-tool",
  });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [lines, setLines] = useState([]);
  const [deadline, setDeadline] = useState(defaultRfqDeadline);
  const [buyerNotes, setBuyerNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const searchTimer = useRef(null);

  const isBuyer = hasRole("buyer");

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    if (!debouncedSearch) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedSearch,   // backend reads `q`, not `search`
        per_page: "12",
        sort: "newest",       // backend reads `sort`, not `sort_by`/`sort_order`
      });
      const res = await api.get(`/products?${params.toString()}`);
      const data = res.data.data || res.data || [];
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        // Normalise lines from old saved data that may be missing new fields
        const normalised = parsed.map((l) => ({
          ...l,
          moq:             toPositiveInt(l.moq, 1),
          quantityStep:    resolveQuantityStep(l.quantityStep, l.moq),
          variantOptions:    Array.isArray(l.variantOptions) ? l.variantOptions : [],
          variantsLoading:   false,
          selectedVariantId: l.selectedVariantId ?? null,
        }));
        setLines(normalised);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const minimal = lines.map(({ key, productId, name, slug, categoryId, sellerUserId, sellerLabel, unitLabel, moq, quantityStep, basePrice, wholesaleTiers, unitPrice, hasVariants, variantOptions, selectedVariantId, quantity }) => ({
        key,
        productId,
        name,
        slug,
        categoryId,
        sellerUserId,
        sellerLabel,
        unitLabel,
        moq,
        quantityStep,
        basePrice,
        wholesaleTiers,
        unitPrice,
        hasVariants,
        variantOptions: variantOptions ?? [],
        selectedVariantId: selectedVariantId ?? null,
        quantity,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      /* ignore */
    }
  }, [lines]);

  const addProduct = (p) => {
    setActionMsg(null);
    let isNew = false;
    let newKey = null;
    setLines((prev) => {
      const ex = prev.find((l) => l.productId === p.id);
      if (ex) {
        const moq = toPositiveInt(ex.moq ?? p.moq, 1);
        const step = resolveQuantityStep(p.quantity_step ?? ex.quantityStep, moq);
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: String(parseQty(l.quantity) + step) } : l
        );
      }
      const line = productToLine(p);
      isNew = true;
      newKey = line.key;
      return [...prev, line];
    });
    // Fetch variants once when a variant-product is first added
    if (p.has_variants) {
      // Use a microtask so newKey is set before the async call
      Promise.resolve().then(() => {
        if (isNew && newKey) {
          fetchVariantsForLine(newKey, p.slug_en || p.id);
        }
      });
    }
  };

  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key));

  const updateQty = (key, value) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: value } : l)));
  };

  // Update selected variant on a line and sync moq / unitPrice to that variant
  const updateVariant = (key, variantId) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const v = l.variantOptions.find((o) => String(o.id) === String(variantId));
        if (!v) return { ...l, selectedVariantId: null };
        const moq  = toPositiveInt(v.moq ?? l.moq, 1);
        const step = resolveQuantityStep(v.quantity_step ?? l.quantityStep, moq);
        return {
          ...l,
          selectedVariantId: variantId,
          moq,
          quantityStep: step,
          basePrice: v.price,
          unitPrice: v.price,
          quantity: String(moq),
        };
      })
    );
  };

  // Fetch full variant list for a product-with-variants line (runs once per product)
  const fetchVariantsForLine = async (key, slugOrId) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, variantsLoading: true } : l)));
    try {
      const res = await api.get(`/products/${slugOrId}`);
      const product = res.data?.data ?? res.data;
      const variants = Array.isArray(product?.variants) ? product.variants : [];
      const options = variants
        .filter((v) => v.is_active)
        .map((v) => ({
          id: v.id,
          label: v.label || v.sku || `Variant #${v.id}`,
          price: Number(v.price ?? 0),
          in_stock: v.in_stock ?? (v.quantity > 0),
          moq: toPositiveInt(v.moq, 1),
          quantity_step: resolveQuantityStep(v.quantity_step, v.moq),
        }));
      setLines((prev) =>
        prev.map((l) =>
          l.key === key ? { ...l, variantOptions: options, variantsLoading: false } : l
        )
      );
    } catch {
      setLines((prev) => prev.map((l) => (l.key === key ? { ...l, variantsLoading: false } : l)));
    }
  };

  const validatedLines = useMemo(() => {
    return lines.map((l) => {
      const moq = toPositiveInt(l.moq, 1);
      const step = resolveQuantityStep(l.quantityStep, moq);
      const q = snapQuantityToStep(l.quantity, moq, step);

      // 3. Resolve effective unit price from wholesale tiers at quantity q
      const tiers = Array.isArray(l.wholesaleTiers) ? l.wholesaleTiers : [];
      const activeTier = tiers.length
        ? [...tiers].sort((a, b) => b.min_qty - a.min_qty).find(t => q >= t.min_qty)
        : null;
      const unitPrice = activeTier
        ? Number(activeTier.price_per_unit)
        : (l.basePrice ?? l.unitPrice ?? 0);

      const subtotal = q * unitPrice;
      return {
        ...l,
        moq,
        quantityStep: step,
        quantityNum: q,
        unitPrice,
        activeTier: activeTier ?? null,
        subtotal,
        valid: !!l.sellerUserId && !!l.categoryId,
      };
    });
  }, [lines]);

  const grandTotal = useMemo(() => validatedLines.reduce((s, l) => s + l.subtotal, 0), [validatedLines]);

  const bySeller = useMemo(() => {
    const map = new Map();
    for (const l of validatedLines) {
      if (!l.sellerUserId) continue;
      if (!map.has(l.sellerUserId)) {
        map.set(l.sellerUserId, { sellerUserId: l.sellerUserId, sellerLabel: l.sellerLabel, lines: [] });
      }
      map.get(l.sellerUserId).lines.push(l);
    }
    return [...map.values()];
  }, [validatedLines]);

  const buildSpecText = (sellerLines) =>
    sellerLines
      .map((l) =>
        t("bulk_order.spec_line", "• {{name}} (Product ID: {{id}}) - Qty: {{qty}} {{unit}} - Est. {{price}} / {{unit}} - Line: {{subtotal}}", {
          name: l.name,
          id: l.productId,
          qty: l.quantityNum,
          unit: l.unitLabel,
          price: fmtMmk(l.unitPrice),
          subtotal: fmtMmk(l.subtotal),
        })
      )
      .join("\n");

  const buildSummaryText = () => {
    const head = t("bulk_order.summary_head", "Pyonea bulk order draft\nDeadline: {{deadline}}\n", { deadline });
    const body = validatedLines
      .map((l) => `${l.name}\t${l.quantityNum}\t${l.unitLabel}\t${l.unitPrice}\t${l.subtotal}\t${l.sellerLabel}`)
      .join("\n");
    const totals = t("bulk_order.summary_total", "\nTotal (estimate): {{total}}", { total: fmtMmk(grandTotal) });
    const notes = buyerNotes ? t("bulk_order.summary_notes", "\nNotes:\n{{notes}}", { notes: buyerNotes }) : "";
    return head + t("bulk_order.summary_columns", "Product\tQty\tUnit\tUnitPrice\tSubtotalMMK\tSeller\n") + body + totals + notes;
  };

  const exportCsv = () => {
    const rows = [
      [
        t("bulk_order.csv_product_id", "Product ID"),
        t("bulk_order.csv_product_name", "Product name"),
        t("bulk_order.csv_quantity", "Quantity"),
        t("bulk_order.csv_unit", "Unit"),
        t("bulk_order.csv_moq", "MOQ"),
        t("bulk_order.csv_unit_price", "Unit price (MMK)"),
        t("bulk_order.csv_line_total", "Line total (MMK)"),
        t("bulk_order.csv_seller", "Seller"),
        t("bulk_order.csv_has_variants", "Has variants"),
      ],
      ...validatedLines.map((l) => [
        l.productId,
        `"${(l.name || "").replace(/"/g, '""')}"`,
        l.quantityNum,
        l.unitLabel,
        l.moq,
        l.unitPrice,
        l.subtotal,
        `"${(l.sellerLabel || "").replace(/"/g, '""')}"`,
        l.hasVariants ? t("bulk_order.yes", "yes") : t("bulk_order.no", "no"),
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pyonea-bulk-order-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setActionMsg({ type: "success", text: t("bulk_order.csv_saved", "CSV file downloaded.") });
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      setActionMsg({ type: "success", text: t("bulk_order.copied", "Summary copied to clipboard.") });
    } catch {
      setActionMsg({ type: "error", text: t("bulk_order.copy_failed", "Could not copy. Try exporting CSV.") });
    }
  };

  const addLinesToCart = async () => {
    if (!user) {
      navigate("/login", { state: { from: "/bulk-order-tool" } });
      return;
    }
    if (!isBuyer) {
      setActionMsg({ type: "error", text: t("bulk_order.cart_buyers_only", "Only buyer accounts can use the cart.") });
      return;
    }

    // Simple products are always eligible; variant products need a variant selected
    const eligible     = validatedLines.filter((l) => l.quantityNum > 0 && (!l.hasVariants || l.selectedVariantId));
    const needsVariant = validatedLines.filter((l) => l.hasVariants && !l.selectedVariantId);

    if (!eligible.length) {
      setActionMsg({
        type: "error",
        text: t("bulk_order.no_cart_lines", "Select a variant for each product that requires one before adding to cart."),
      });
      return;
    }

    if (needsVariant.length) {
      setActionMsg({
        type: "error",
        text: t("bulk_order.variant_required", "Please select a variant for: {{names}}", {
          names: needsVariant.map((l) => l.name).join(", "),
        }),
      });
      return;
    }

    setSubmitting(true);
    setActionMsg(null);
    let ok = 0;
    try {
      for (const l of eligible) {
        await addToCart(l.productId, l.quantityNum, l.selectedVariantId ?? null);
        ok++;
      }
      setActionMsg({ type: "success", text: t("bulk_order.cart_added", "{{count}} item(s) added to cart.", { count: ok }) });
    } catch (e) {
      setActionMsg({ type: "error", text: e.message || t("bulk_order.cart_partial", "Some items could not be added.") });
    } finally {
      setSubmitting(false);
    }
  };

  const sendRfqs = async () => {
    if (!user) {
      navigate("/login", { state: { from: "/bulk-order-tool" } });
      return;
    }
    if (!isBuyer) {
      setActionMsg({ type: "error", text: t("bulk_order.rfq_buyers_only", "Log in with a buyer account to send RFQs.") });
      return;
    }
    const groups = bySeller.filter((g) => g.lines.every((l) => l.valid));
    if (!groups.length) {
      setActionMsg({
        type: "error",
        text: t("bulk_order.rfq_no_groups", "Add products with seller and category data (use catalog search)."),
      });
      return;
    }
    const invalidQty = validatedLines.some((l) => l.quantityNum < l.moq);
    if (invalidQty) {
      setActionMsg({ type: "error", text: t("bulk_order.moq_error", "Each line must meet the product MOQ.") });
      return;
    }

    setSubmitting(true);
    setActionMsg(null);
    const created = [];
    try {
      for (const g of groups) {
        const spec = [
          buildSpecText(g.lines),
          buyerNotes ? t("bulk_order.rfq_buyer_notes", "\n\nBuyer notes:\n{{notes}}", { notes: buyerNotes }) : "",
        ].join("");
        const totalQty = g.lines.reduce((s, l) => s + l.quantityNum, 0);
        const unit = (g.lines[0].unitLabel || "piece").slice(0, 20);
        const payload = {
          product_name: t("bulk_order.rfq_product_name", "Bulk order - {{count}} product(s)", { count: g.lines.length }),
          category_id: g.lines[0].categoryId,
          quantity: Math.max(0.001, totalQty),
          unit,
          specifications: spec.slice(0, 5000),
          deadline: `${deadline}T23:59:59`,
          currency: "MMK",
          broadcast: false,
          seller_ids: [g.sellerUserId],
        };
        const res = await api.post("/rfq", payload);
        if (res.data?.success && res.data?.data?.id) created.push(res.data.data.id);
      }
      setActionMsg({
        type: "success",
        text: t("bulk_order.rfq_sent", "Sent {{n}} RFQ(s) to sellers.", { n: created.length }),
      });
      setLines([]);
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => navigate("/rfq"), 1200);
    } catch (err) {
      const errs = err.response?.data?.errors;
      const msg = errs
        ? Object.values(errs)
            .flat()
            .join(" ")
        : err.response?.data?.message || err.message || t("bulk_order.rfq_failed", "RFQ failed.");
      setActionMsg({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {SeoComponent}
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 theme-transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t("bulk_order.title", "Bulk order tool")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-slate-400 max-w-3xl text-sm sm:text-base">
              {t(
                "bulk_order.subtitle",
                "Search the catalog, add multiple products, then export your list, copy a summary, add simple SKUs to your cart, or send one RFQ per seller with full line details."
              )}
            </p>
          </div>

          {actionMsg && (
            <div
              className={`mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
                actionMsg.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
                  : "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-100"
              }`}
            >
              {actionMsg.type === "error" ? (
                <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <PaperAirplaneIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <span>{actionMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Search & results */}
            <div className="xl:col-span-5 space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <MagnifyingGlassIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  {t("bulk_order.search_title", "Find products")}
                </h2>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("bulk_order.search_placeholder", "Search by product name…")}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-green-500/40"
                  />
                </div>
                <div className="mt-4 max-h-[min(70vh,520px)] overflow-y-auto space-y-2">
                  {!debouncedSearch && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 py-6 text-center">
                      {t("bulk_order.search_hint", "Type to search live catalog results.")}
                    </p>
                  )}
                  {debouncedSearch && searchLoading && (
                    <div className="flex justify-center py-8">
                      <div className="h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {debouncedSearch && !searchLoading && searchResults.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 py-6 text-center">
                      {t("bulk_order.no_results", "No products found.")}
                    </p>
                  )}
                  {searchResults.map((p) => {
                    const rawImg =
                      p.image ??
                      (Array.isArray(p.images) && p.images.length
                        ? typeof p.images[0] === "string"
                          ? p.images[0]
                          : p.images[0]?.url || p.images[0]
                        : null);
                    const name =
                      i18n.language === "my"
                        ? (p.name_mm || p.name_en || "Product")
                        : (p.name_en || p.name_mm || "Product");
                    const sellerLabel =
                      p.seller?.store_name ||
                      p.seller?.name ||
                      (p.seller_id ? `Seller #${p.seller_id}` : "—");
                    const alreadyAdded = lines.some((l) => l.productId === p.id);
                    return (
                    <div
                      key={p.id}
                      className="flex gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                    >
                      <img
                        src={getImageUrl(rawImg) || DEFAULT_PLACEHOLDER}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover bg-gray-100 dark:bg-slate-700 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">{name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <BuildingStorefrontIcon className="h-3.5 w-3.5" />
                          {sellerLabel}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400 mt-1 font-medium">
                          {(() => {
                            const moq = toPositiveInt(p.moq, 1);
                            const step = resolveQuantityStep(p.quantity_step, moq);
                            return (
                              <>
                                {fmtMmk(p.selling_price ?? p.price)} - {t("bulk_order.moq_label", "MOQ")} {moq}
                                {step > 1 && (
                                  <span className="ml-1 text-gray-500 dark:text-slate-400">- {t("bulk_order.step_label", "step")} {step}</span>
                                )}
                              </>
                            );
                          })()}
                          {p.has_variants && (
                            <span className="ml-2 text-amber-600 dark:text-amber-400">
                              {t("bulk_order.variants_label", "(variants — cart from product page)")}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addProduct(p)}
                        className={`self-center flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          alreadyAdded
                            ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        <PlusIcon className="h-4 w-4" />
                        {alreadyAdded ? t("bulk_order.add_more", "+More") : t("bulk_order.add", "Add")}
                      </button>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Lines & actions */}
            <div className="xl:col-span-7 space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CubeIcon className="h-5 w-5 text-indigo-500" />
                    {t("bulk_order.list_title", "Your bulk list")}
                    <span className="text-sm font-normal text-gray-500 dark:text-slate-400">({lines.length})</span>
                  </h2>
                  {lines.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setLines([]);
                        localStorage.removeItem(STORAGE_KEY);
                        setActionMsg({ type: "success", text: t("bulk_order.cleared", "List cleared.") });
                      }}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      {t("bulk_order.clear", "Clear all")}
                    </button>
                  )}
                </div>

                {lines.length === 0 ? (
                  <div className="px-5 py-16 text-center text-gray-500 dark:text-slate-400 text-sm">
                    {t("bulk_order.empty", "Add products from the search panel. Quantities default to each product’s MOQ.")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-slate-700/60 text-left text-xs uppercase text-gray-500 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3">{t("bulk_order.col_product", "Product")}</th>
                          <th className="px-4 py-3">{t("bulk_order.col_seller", "Seller")}</th>
                          <th className="px-4 py-3">{t("bulk_order.col_variant", "Variant")}</th>
                          <th className="px-4 py-3">{t("bulk_order.col_price", "Unit price")}</th>
                          <th className="px-4 py-3">{t("bulk_order.col_qty", "Qty")}</th>
                          <th className="px-4 py-3 text-right">{t("bulk_order.col_line", "Line")}</th>
                          <th className="px-4 py-3 w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {validatedLines.map((l) => (
                          <tr key={l.key} className="dark:text-slate-200">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={getImageUrl(l.image) || DEFAULT_PLACEHOLDER}
                                  alt=""
                                  className="h-9 w-9 rounded-md object-cover flex-shrink-0 bg-gray-100 dark:bg-slate-700"
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{l.name}</p>
                                  {l.slug && (
                                    <Link
                                      to={`/products/${l.slug}`}
                                      className="text-[11px] text-green-600 dark:text-green-400 hover:underline"
                                    >
                                      {t("bulk_order.view_product", "View")}
                                    </Link>
                                  )}

                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-300 max-w-[120px]">
                              {l.sellerLabel}
                            </td>
                            {/* Variant column */}
                            <td className="px-4 py-3 min-w-[140px]">
                              {l.hasVariants ? (
                                l.variantsLoading ? (
                                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
                                    <div className="h-3.5 w-3.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                                    {t("bulk_order.loading_variants", "Loading…")}
                                  </div>
                                ) : !Array.isArray(l.variantOptions) || l.variantOptions.length === 0 ? (
                                  <span className="text-xs text-red-500 dark:text-red-400">
                                    {t("bulk_order.variants_unavailable", "Unavailable")}
                                  </span>
                                ) : (
                                  <select
                                    value={l.selectedVariantId ?? ""}
                                    onChange={(e) => updateVariant(l.key, e.target.value || null)}
                                    className={`w-full rounded-lg border px-2 py-1.5 text-xs bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 ${
                                      !l.selectedVariantId
                                        ? "border-amber-400 dark:border-amber-500"
                                        : "border-gray-200 dark:border-slate-600"
                                    }`}
                                  >
                                    <option value="">{t("bulk_order.select_variant", "— Select —")}</option>
                                    {(l.variantOptions ?? []).map((v) => (
                                      <option key={v.id} value={v.id} disabled={!v.in_stock}>
                                        {v.label}{!v.in_stock ? ` (${t("bulk_order.out_of_stock", "Out of stock")})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                )
                              ) : (
                                <span className="text-xs text-gray-400 dark:text-slate-500">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {fmtMmk(l.unitPrice)}
                              {l.activeTier && (
                                <span className="ml-1 inline-block bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                  {l.activeTier.discount_pct > 0 ? `-${l.activeTier.discount_pct}%` : t("bulk_order.tier_label", "Tier")}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={l.moq}
                                step={l.quantityStep}
                                value={l.quantity}
                                onChange={(e) => updateQty(l.key, e.target.value)}
                                onBlur={() => updateQty(l.key, String(l.quantityNum))}
                                className="w-20 border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                              />
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {t("bulk_order.moq_label", "MOQ")} {l.moq}
                                {l.quantityStep > 1 && ` - ${t("bulk_order.step_label", "step")} ${l.quantityStep}`}
                                {" "}{l.unitLabel}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{fmtMmk(l.subtotal)}</td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => removeLine(l.key)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                                title={t("bulk_order.remove", "Remove")}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {lines.length > 0 && (
                  <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 bg-gray-50/80 dark:bg-slate-900/30">
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {t("bulk_order.estimated_total", "Estimated total")}: {fmtMmk(grandTotal)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={exportCsv}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        {t("bulk_order.export_csv", "Export CSV")}
                      </button>
                      <button
                        type="button"
                        onClick={copySummary}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        {t("bulk_order.copy", "Copy summary")}
                      </button>
                      <button
                        type="button"
                        onClick={addLinesToCart}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <ShoppingCartIcon className="h-4 w-4" />
                        {t("bulk_order.add_cart", "Add to cart")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RFQ panel */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {t("bulk_order.rfq_title", "Send as RFQ (buyers)")}
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {t(
                    "bulk_order.rfq_help",
                    "Creates one open RFQ per seller with your line items in the specification. Choose a response deadline (must be after today)."
                  )}
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                      {t("bulk_order.deadline", "Response deadline")}
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      min={minRfqDeadline()}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                      {t("bulk_order.notes", "Notes for sellers (optional)")}
                    </label>
                    <textarea
                      value={buyerNotes}
                      onChange={(e) => setBuyerNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100"
                      placeholder={t("bulk_order.notes_ph", "Delivery preferences, certifications, etc.")}
                    />
                  </div>
                </div>

                {bySeller.length > 0 && (
                  <div className="rounded-xl border border-gray-100 dark:border-slate-600 p-3 text-xs text-gray-600 dark:text-slate-400">
                    <p className="font-semibold text-gray-800 dark:text-slate-200 mb-2">
                      {t("bulk_order.rfq_preview", "Will send {{n}} RFQ(s):", { n: bySeller.length })}
                    </p>
                    <ul className="space-y-1">
                      {bySeller.map((g) => (
                        <li key={g.sellerUserId}>
                          {t("bulk_order.rfq_preview_line", "• {{seller}} - {{count}} line(s)", {
                            seller: g.sellerLabel,
                            count: g.lines.length,
                          })}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  onClick={sendRfqs}
                  disabled={submitting || !lines.length}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                  {submitting ? t("bulk_order.sending", "Sending…") : t("bulk_order.send_rfq", "Send RFQs to sellers")}
                </button>

                {!user && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    <Link to="/login" className="text-green-600 dark:text-green-400 font-medium">
                      {t("bulk_order.login", "Log in")}
                    </Link>{" "}
                    {t("bulk_order.login_suffix", "as a buyer to use cart and RFQ actions.")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BulkOrderTool;
