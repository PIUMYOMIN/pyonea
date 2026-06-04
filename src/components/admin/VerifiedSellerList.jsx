// components/admin/VerifiedSellerList.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  FunnelIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  StarIcon,
  IdentificationIcon,
  BuildingStorefrontIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  XMarkIcon,
  CheckBadgeIcon,
  DocumentArrowDownIcon,
  ArchiveBoxArrowDownIcon,
} from "@heroicons/react/24/outline";
import { CheckBadgeIcon as CheckBadgeSolid } from "@heroicons/react/24/solid";
import api from "../../utils/api";

// ── Config ────────────────────────────────────────────────────────────────────

const VERIFICATION_LEVEL_CFG = {
  basic:   { label: "Basic",    cls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300" },
  verified:{ label: "Verified", cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
  premium: { label: "Premium",  cls: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
};

const BADGE_CFG = {
  verified:  { label: "✓ Verified",  cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
  premium:   { label: "★ Premium",   cls: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
  featured:  { label: "◆ Featured",  cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
  top_rated: { label: "▲ Top Rated", cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
};

const NRC_STATUS_CFG = {
  verified:   { label: "✓ Verified",  cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
  pending:    { label: "Pending",     cls: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" },
  mismatch:   { label: "⚠ Mismatch", cls: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
  rejected:   { label: "✕ Rejected", cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
  unverified: { label: "—",           cls: "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const Badge = ({ value, cfg, fallbackLabel }) => {
  const meta = cfg[value] ?? {
    label: fallbackLabel ?? value ?? "—",
    cls: "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  );
};

const SortIcon = ({ col, sortBy, sortDir }) => {
  if (sortBy !== col) return <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />;
  return sortDir === "asc"
    ? <ChevronUpIcon className="h-4 w-4 text-indigo-500" />
    : <ChevronDownIcon className="h-4 w-4 text-indigo-500" />;
};

// ── Logo — resolves relative storage paths to absolute backend URL ─────────────
const STORAGE_BASE = (import.meta.env.VITE_IMAGE_BASE_URL ?? "http://localhost:8000/storage").replace(/\/$/, "");

const resolveLogoUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  // Strip any leading /storage/ so we don't double-prefix
  const clean = url.replace(/^\/?storage\//, "");
  return `${STORAGE_BASE}/${clean}`;
};

const SellerLogo = ({ url, name }) => {
  const [broken, setBroken] = useState(false);
  const resolved = resolveLogoUrl(url);

  if (!resolved || broken) {
    return (
      <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
        <BuildingStorefrontIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
      </div>
    );
  }
  return (
    <img
      src={resolved}
      alt={name}
      onError={() => setBroken(true)}
      className="h-8 w-8 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-slate-600"
    />
  );
};

// ── Per-row Excel + ZIP bundle ───────────────────────────────────────────────

function suggestZipAssetFilename(label, url, mimeType) {
  const pathPart = (url.split("?")[0].split("/").pop() || "").trim();
  if (pathPart && /\.[a-z0-9]{2,5}$/i.test(pathPart)) {
    try {
      return decodeURIComponent(pathPart);
    } catch {
      return pathPart;
    }
  }
  const ext =
    mimeType?.includes("pdf") ? "pdf"
      : mimeType?.includes("png") ? "png"
      : mimeType?.includes("webp") ? "webp"
      : mimeType?.includes("gif") ? "gif"
      : mimeType?.includes("jpeg") || mimeType?.includes("jpg") ? "jpg"
      : "bin";
  const base = (label || "document").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "document";
  return `${base}.${ext}`;
}

async function fetchWithAuthBlob(absUrl) {
  // Many storage/CDN endpoints serve files publicly but do NOT allow CORS
  // requests with Authorization headers (preflight fails). <img> tags still
  // work, but fetch() with auth headers can be blocked and would cause ZIP
  // assets (NRC/ID photos) to be skipped.
  //
  // Strategy:
  // 1) Try a plain public GET first (no auth headers, no credentials).
  // 2) If that fails (private endpoint), retry with Bearer + credentials mode.

  const tryPlain = async () => {
    const r = await fetch(absUrl, { method: "GET", credentials: "omit" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.blob();
  };

  try {
    return await tryPlain();
  } catch {
    // fallback to authenticated fetch (for protected endpoints)
    const token = localStorage.getItem("token");
    const useCreds = import.meta.env.VITE_API_WITH_CREDENTIALS !== "false";
    const res = await fetch(absUrl, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: useCreds ? "include" : "omit",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  }
}

const buildSellerProfileWorkbook = (seller) => {
  const rows = [
    ["Field", "Value"],
    ["Store ID", seller.store_id ?? ""],
    ["Store Name", seller.store_name ?? ""],
    ["Store Slug", seller.store_slug ?? ""],
    ["Store Status", seller.status ?? ""],
    ["", ""],
    ["OWNER INFORMATION", ""],
    ["Owner Name", seller.owner_name ?? ""],
    ["Owner Email", seller.owner_email ?? ""],
    ["Owner Phone", seller.owner_phone ?? ""],
    ["Member Since", seller.member_since ?? ""],
    ["", ""],
    ["CONTACT INFORMATION", ""],
    ["Contact Email", seller.contact_email ?? ""],
    ["Contact Phone", seller.contact_phone ?? ""],
    ["", ""],
    ["BUSINESS INFORMATION", ""],
    ["Business Type", seller.business_type ?? ""],
    ["Business Reg. No.", seller.business_registration_number ?? ""],
    ["Tax ID", seller.tax_id ?? ""],
    ["Address", seller.address ?? ""],
    ["City", seller.city ?? ""],
    ["State", seller.state ?? ""],
    ["Country", seller.country ?? ""],
    ["", ""],
    ["VERIFICATION", ""],
    ["Verification Level", seller.verification_level ?? ""],
    ["Badge Type", seller.badge_type ?? ""],
    ["Verified At", seller.verified_at ? new Date(seller.verified_at).toLocaleString() : ""],
    ["Verified By", seller.verified_by ?? ""],
    ["", ""],
    ["NRC / NATIONAL ID", ""],
    ["NRC Number", seller.nrc_full ?? ""],
    ["NRC Verification Status", seller.nrc_verification_status ?? ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 44 }];

  const headerFill  = { fgColor: { rgb: "16A34A" } };
  const sectionFill = { fgColor: { rgb: "DCFCE7" } };
  const white       = { rgb: "FFFFFF" };
  const darkGreen   = { rgb: "166534" };

  rows.forEach((row, r) => {
    const A = XLSX.utils.encode_cell({ r, c: 0 });
    const B = XLSX.utils.encode_cell({ r, c: 1 });
    if (!ws[A]) return;

    if (r === 0) {
      [A, B].forEach(ref => {
        if (ws[ref]) ws[ref].s = { font: { bold: true, color: white }, fill: headerFill, alignment: { horizontal: "left" } };
      });
    } else if (row[0] && row[1] === "" && row[0].trim() !== "" && row[0] === row[0].toUpperCase()) {
      [A, B].forEach(ref => {
        if (ws[ref]) ws[ref].s = { font: { bold: true, color: darkGreen }, fill: sectionFill };
      });
    } else if (row[0] !== "") {
      if (ws[A]) ws[A].s = { font: { bold: true } };
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Seller Profile");
  return wb;
};

const downloadSellerExcel = (seller) => {
  const wb = buildSellerProfileWorkbook(seller);
  const safe = (seller.store_name ?? "seller").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  XLSX.writeFile(wb, `verified_seller_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

const sellerExportBasenames = (seller) => {
  const safe = (seller.store_name ?? "seller").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);
  return {
    safe,
    dateStr,
    xlsx: `verified_seller_${safe}_${dateStr}.xlsx`,
    zip: `verified_seller_${safe}_bundle_${dateStr}.zip`,
  };
};

async function downloadSellerProfileZip(seller) {
  const JSZip = (await import("jszip")).default;
  const { xlsx: xlsxName, zip: zipName } = sellerExportBasenames(seller);
  const zip = new JSZip();
  const docsFolder = zip.folder("documents");
  if (!docsFolder) throw new Error("Could not create documents folder in ZIP.");

  const wb = buildSellerProfileWorkbook(seller);
  const xlsxBuf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  zip.file(xlsxName, xlsxBuf);

  const usedNames = new Set();
  const uniqueEntryName = (desired) => {
    let name = desired;
    let i = 2;
    while (usedNames.has(name)) {
      const dot = desired.lastIndexOf(".");
      if (dot > 0) {
        name = `${desired.slice(0, dot)}_${i}${desired.slice(dot)}`;
      } else {
        name = `${desired}_${i}`;
      }
      i++;
    }
    usedNames.add(name);
    return name;
  };

  const appendBlob = async (url, label) => {
    if (!url) return;
    const blob = await fetchWithAuthBlob(url);
    const raw = suggestZipAssetFilename(label, url, blob.type);
    const entry = uniqueEntryName(raw);
    docsFolder.file(entry, await blob.arrayBuffer());
  };

  const docPairs = [
    [seller.store_logo_url, "store_logo"],
    [seller.identity_document_front_url, "identity_document_front"],
    [seller.identity_document_back_url, "identity_document_back"],
    [seller.business_registration_document_url, "business_registration"],
    [seller.tax_registration_document_url, "tax_registration"],
    [seller.business_certificate_url, "business_certificate"],
    [seller.certificate_url, "certificate"],
  ];

  for (const [url, label] of docPairs) {
    try {
      await appendBlob(url, label);
    } catch (err) {
      console.warn("[VerifiedSellerList] ZIP skipped:", label, err);
    }
  }

  if (Array.isArray(seller.additional_documents)) {
    for (let i = 0; i < seller.additional_documents.length; i++) {
      const ad = seller.additional_documents[i];
      if (!ad?.url) continue;
      const label = (ad.name || `additional_${i + 1}`).replace(/[/\\?%*:|"<>]/g, "_");
      try {
        await appendBlob(ad.url, label);
      } catch (err) {
        console.warn("[VerifiedSellerList] ZIP skipped additional:", label, err);
      }
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const href = URL.createObjectURL(zipBlob);
  const a = Object.assign(document.createElement("a"), { href, download: zipName, rel: "noopener" });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VerifiedSellerList() {
  const [sellers, setSellers]         = useState([]);
  const [summary, setSummary]         = useState({ total: 0, basic: 0, verified: 0, premium: 0, nrc_verified: 0 });
  const [loading, setLoading]         = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]             = useState(null);
  const [rowDownloading, setRowDownloading] = useState({});
  const [rowZipLoading, setRowZipLoading] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [total, setTotal]             = useState(0);
  const PER_PAGE = 20;

  // Filters & sort
  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [levelFilter, setLevelFilter]         = useState("");
  const [badgeFilter, setBadgeFilter]         = useState("");
  const [nrcFilter, setNrcFilter]             = useState("");
  const [showFilters, setShowFilters]         = useState(false);
  const [sortBy, setSortBy]                   = useState("verified_at");
  const [sortDir, setSortDir]                 = useState("desc");

  const debounceRef = useRef(null);
  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(val); setCurrentPage(1); }, 400);
  };

  const buildParams = useCallback((overrides = {}) => {
    const p = new URLSearchParams();
    p.set("per_page", PER_PAGE); p.set("page", currentPage);
    p.set("sort_by", sortBy);   p.set("sort_dir", sortDir);
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (levelFilter)     p.set("verification_level", levelFilter);
    if (badgeFilter)     p.set("badge_type", badgeFilter);
    if (nrcFilter)       p.set("nrc_status", nrcFilter);
    Object.entries(overrides).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    return p;
  }, [currentPage, sortBy, sortDir, debouncedSearch, levelFilter, badgeFilter, nrcFilter]);

  const fetchList = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/admin/seller/verified-list?${buildParams()}`);
      const { data, summary: sum, meta } = res.data;
      setSellers(data?.data ?? []);
      setSummary(sum ?? {});
      setTotal(meta?.total ?? 0);
      setLastPage(meta?.last_page ?? 1);
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to load verified sellers.");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const handleBulkExport = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/admin/seller/verified-list/export?${buildParams({ page: undefined, per_page: undefined })}`, { responseType: "blob" });
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" })),
        download: `verified_sellers_${new Date().toISOString().slice(0, 10)}.csv`,
      });
      document.body.appendChild(a); a.click(); a.remove();
    } catch { alert("Export failed. Please try again."); }
    finally { setDownloading(false); }
  };

  const handleRowExcel = (seller) => {
    setRowDownloading(prev => ({ ...prev, [seller.id]: true }));
    try { downloadSellerExcel(seller); }
    finally { setTimeout(() => setRowDownloading(prev => { const n = {...prev}; delete n[seller.id]; return n; }), 800); }
  };

  const handleRowZip = async (seller) => {
    setRowZipLoading(prev => ({ ...prev, [seller.id]: true }));
    try {
      await downloadSellerProfileZip(seller);
    } catch (e) {
      console.error(e);
      alert("ZIP export failed. Ensure the API returns document URLs and storage is reachable with your admin session.");
    } finally {
      setRowZipLoading(prev => {
        const next = { ...prev };
        delete next[seller.id];
        return next;
      });
    }
  };

  const clearFilters = () => {
    setSearch(""); setDebouncedSearch(""); setLevelFilter(""); setBadgeFilter(""); setNrcFilter(""); setCurrentPage(1);
  };
  const hasActiveFilters = debouncedSearch || levelFilter || badgeFilter || nrcFilter;

  const SortableTh = ({ col, label }) => (
    <th onClick={() => handleSort(col)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors">
      <div className="flex items-center gap-1">{label}<SortIcon col={col} sortBy={sortBy} sortDir={sortDir} /></div>
    </th>
  );

  const Th = ({ children, center }) => (
    <th className={`px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ${center ? "text-center" : "text-left"}`}>
      {children}
    </th>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <ShieldCheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verified seller directory</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{total.toLocaleString()} verified seller{total !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchList} disabled={loading} title="Refresh"
            className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={handleBulkExport} disabled={downloading || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-colors disabled:opacity-60 shadow-sm">
            <ArrowDownTrayIcon className="h-4 w-4" />
            {downloading ? "Downloading…" : "Export All (CSV)"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Verified", value: summary.total,       Icon: ShieldCheckIcon,    cls: "text-green-600 dark:text-green-400",   bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Basic",          value: summary.basic,        Icon: CheckBadgeIcon,     cls: "text-sky-600 dark:text-sky-400",       bg: "bg-sky-50 dark:bg-sky-900/20" },
          { label: "Verified Level", value: summary.verified,     Icon: CheckBadgeSolid,    cls: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
          { label: "Premium",        value: summary.premium,      Icon: StarIcon,           cls: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
          { label: "NRC Verified",   value: summary.nrc_verified, Icon: IdentificationIcon, cls: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/20" },
        ].map(({ label, value, Icon, cls, bg }) => (
          <div key={label} className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-slate-700 ${bg}`}>
            <Icon className={`h-6 w-6 flex-shrink-0 ${cls}`} />
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p>
              <p className={`text-xl font-bold ${cls}`}>{(value ?? 0).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" value={search} onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search store name, email, owner, NRC…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/40" />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters || hasActiveFilters ? "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}>
            <FunnelIcon className="h-4 w-4" /> Filters
            {hasActiveFilters && <span className="w-2 h-2 bg-green-500 rounded-full" />}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-500 text-sm hover:bg-red-50 transition-colors">
              <XMarkIcon className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 dark:border-slate-700">
            {[
              { label: "Verification Level", val: levelFilter, set: v => { setLevelFilter(v); setCurrentPage(1); }, opts: [["","All Levels"],["basic","Basic"],["verified","Verified"],["premium","Premium"]] },
              { label: "Badge Type",         val: badgeFilter, set: v => { setBadgeFilter(v); setCurrentPage(1); }, opts: [["","All Badges"],["verified","Verified"],["premium","Premium"],["featured","Featured"],["top_rated","Top Rated"]] },
              { label: "NRC Status",         val: nrcFilter,   set: v => { setNrcFilter(v);   setCurrentPage(1); }, opts: [["","All NRC"],["verified","✓ Verified"],["pending","Pending"],["mismatch","⚠ Mismatch"],["rejected","✕ Rejected"],["unverified","Unverified"]] },
            ].map(({ label, val, set, opts }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
                <select value={val} onChange={e => set(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500/40">
                  {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-red-500">
            <p className="font-semibold mb-2">Failed to load data</p>
            <p className="text-sm text-gray-500">{error}</p>
            <button onClick={fetchList} className="mt-4 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors">Retry</button>
          </div>
        ) : loading && sellers.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <ArrowPathIcon className="h-8 w-8 animate-spin" />
              <span className="text-sm">Loading verified sellers…</span>
            </div>
          </div>
        ) : sellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ShieldCheckIcon className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">No verified sellers found</p>
            {hasActiveFilters && <button onClick={clearFilters} className="mt-3 text-sm text-green-600 hover:underline">Clear filters</button>}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-800/60">
                  <tr>
                    <Th>#</Th>
                    <SortableTh col="store_name" label="Store" />
                    <Th>Owner</Th>
                    <Th>Contact</Th>
                    <SortableTh col="verification_level" label="Level" />
                    <Th>Badge</Th>
                    <Th>NRC</Th>
                    <SortableTh col="verified_at" label="Verified At" />
                    <Th>Verified By</Th>
                    <Th center>Export</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {sellers.map((seller, idx) => (
                    <tr key={seller.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">

                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{(currentPage - 1) * PER_PAGE + idx + 1}</td>

                      {/* Store + logo */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <SellerLogo url={seller.store_logo_url} name={seller.store_name} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">{seller.store_name}</p>
                            <p className="text-xs text-gray-400 font-mono">{seller.store_id || seller.store_slug}</p>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-1.5">
                          <UserCircleIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 dark:text-slate-200 truncate max-w-[130px]">{seller.owner_name ?? "—"}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <CalendarDaysIcon className="h-3 w-3" />{seller.member_since ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1 text-xs text-gray-600 dark:text-slate-300">
                            <EnvelopeIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[150px]">{seller.contact_email || seller.owner_email || "—"}</span>
                          </p>
                          <p className="flex items-center gap-1 text-xs text-gray-500">
                            <PhoneIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            {seller.contact_phone || seller.owner_phone || "—"}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3"><Badge value={seller.verification_level} cfg={VERIFICATION_LEVEL_CFG} /></td>
                      <td className="px-4 py-3"><Badge value={seller.badge_type} cfg={BADGE_CFG} fallbackLabel="—" /></td>

                      {/* NRC */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <Badge value={seller.nrc_verification_status ?? "unverified"} cfg={NRC_STATUS_CFG} />
                          {seller.nrc_full && <p className="text-xs font-mono text-gray-400 truncate max-w-[120px]">{seller.nrc_full}</p>}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-slate-300">
                        {seller.verified_at ? new Date(seller.verified_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{seller.verified_by ?? "—"}</td>

                      {/* Per-row Excel + ZIP bundle */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex flex-col sm:flex-row gap-1.5 justify-center items-stretch sm:items-center">
                          <button
                            type="button"
                            onClick={() => handleRowExcel(seller)}
                            disabled={!!rowDownloading[seller.id] || !!rowZipLoading[seller.id]}
                            title={`Download ${seller.store_name} as Excel`}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            {rowDownloading[seller.id]
                              ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                              : <DocumentArrowDownIcon className="h-3.5 w-3.5" />}
                            .xlsx
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRowZip(seller)}
                            disabled={!!rowDownloading[seller.id] || !!rowZipLoading[seller.id]}
                            title={`Download ${seller.store_name} profile (.xlsx) and documents as .zip`}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 text-xs font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/40 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            {rowZipLoading[seller.id]
                              ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                              : <ArchiveBoxArrowDownIcon className="h-3.5 w-3.5" />}
                            .zip
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500">
                  Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{lastPage}</span> — {total.toLocaleString()} total
                </p>
                <div className="flex items-center gap-1">
                  {[["«", () => setCurrentPage(1), currentPage === 1], ["‹ Prev", () => setCurrentPage(p => Math.max(1, p - 1)), currentPage === 1]].map(([l, a, d]) => (
                    <button key={l} onClick={a} disabled={d} className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">{l}</button>
                  ))}
                  {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                    let p;
                    if (lastPage <= 5) p = i + 1;
                    else if (currentPage <= 3) p = i + 1;
                    else if (currentPage >= lastPage - 2) p = lastPage - 4 + i;
                    else p = currentPage - 2 + i;
                    return (
                      <button key={p} onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${p === currentPage ? "bg-green-600 text-white border-green-600" : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}>
                        {p}
                      </button>
                    );
                  })}
                  {[["Next ›", () => setCurrentPage(p => Math.min(lastPage, p + 1)), currentPage === lastPage], ["»", () => setCurrentPage(lastPage), currentPage === lastPage]].map(([l, a, d]) => (
                    <button key={l} onClick={a} disabled={d} className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">{l}</button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {loading && sellers.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700 flex items-center gap-2 text-xs text-gray-400">
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Refreshing…
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500 text-center max-w-2xl mx-auto">
        <strong>.xlsx</strong> downloads the profile spreadsheet only. The{" "}
        <strong>.zip</strong> bundle includes the same spreadsheet plus uploaded files (store logo, ID/NRC images, registration documents, extras) under{" "}
        <code className="text-[11px]">documents/</code>.
        Files that cannot be fetched are skipped. Use <strong>Export All (CSV)</strong> for a bulk list of all matching sellers.
      </p>
    </div>
  );
}
