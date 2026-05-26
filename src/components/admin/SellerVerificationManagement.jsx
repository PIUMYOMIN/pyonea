// components/admin/SellerVerificationManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  EyeIcon,
  DocumentIcon,
  UserCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
  PhotoIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
} from "@heroicons/react/24/solid";
import DataTable from "../ui/DataTable";
import api from "../../utils/api";
import { NRC_TYPES } from "../seller/NrcInput";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_BASE = (import.meta.env.VITE_IMAGE_BASE_URL ?? "").replace(/\/$/, "");

/**
 * Public storage URL for viewing (same host as uploaded files — avoids broken /storage on Vite-only origin).
 */
const docUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const clean = String(path).replace(/^\/?storage\/?/, "");
  if (STORAGE_BASE) return `${STORAGE_BASE}/${clean}`;
  return `/storage/${clean}`;
};

function suggestDownloadFilename(label, url, mimeType) {
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

/** Fetch file with admin auth, save as download (avoids cross-origin <a download> quirks). */
async function downloadDocumentWithAuth(absUrl, label) {
  const token = localStorage.getItem("token");
  const useCreds = import.meta.env.VITE_API_WITH_CREDENTIALS !== "false";
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(absUrl, {
    method: "GET",
    headers,
    credentials: useCreds ? "include" : "omit",
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const name = suggestDownloadFilename(label, absUrl, blob.type);
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

const ImageLightbox = ({ url, title, onClose }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Document preview"}
      >
        <div className="flex w-full flex-shrink-0 items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-white/90">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
          >
            Close (Esc)
          </button>
        </div>
        <img loading="lazy"
          src={url}
          alt={title || "ID document"}
          className="max-h-[min(88vh,900px)] max-w-full object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
};

/** Determine if a URL points to a PDF */
const isPdf = (url) => {
  if (!url) return false;
  return url.toLowerCase().includes(".pdf");
};

/** Determine if a URL points to an image */
const isImage = (url) => {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);
};

/** Return Tailwind colour classes for a given verification status */
const statusColor = (status) => {
  const map = {
    pending:      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
    under_review: "bg-blue-100   dark:bg-blue-900/30   text-blue-800   dark:text-blue-300   border-blue-300   dark:border-blue-700",
    verified:     "bg-green-100  dark:bg-green-900/30  text-green-800  dark:text-green-300  border-green-300  dark:border-green-700",
    rejected:     "bg-red-100    dark:bg-red-900/30    text-red-800    dark:text-red-300    border-red-300    dark:border-red-700",
  };
  return map[status] ?? "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300 border-gray-300 dark:border-slate-600";
};

const NRC_STATUS_CFG = {
  unverified: { label: "Unverified",  cls: "bg-gray-100   dark:bg-slate-700           text-gray-500   dark:text-slate-400" },
  pending:    { label: "Pending",     cls: "bg-yellow-100 dark:bg-yellow-900/30        text-yellow-800 dark:text-yellow-300" },
  verified:   { label: "✓ Verified",  cls: "bg-green-100  dark:bg-green-900/30         text-green-800  dark:text-green-300" },
  mismatch:   { label: "⚠ Mismatch", cls: "bg-orange-100 dark:bg-orange-900/30        text-orange-800 dark:text-orange-300" },
  rejected:   { label: "✕ Rejected",  cls: "bg-red-100    dark:bg-red-900/30           text-red-800    dark:text-red-300" },
};

const STORE_STATUS_OPTS = [
  { v: "active",        label: "🟢 Active"         },
  { v: "approved",      label: "✅ Approved"        },
  { v: "pending",       label: "⏳ Pending Review"  },
  { v: "suspended",     label: "🔴 Suspended"       },
  { v: "rejected",      label: "❌ Rejected"        },
  { v: "closed",        label: "🚫 Closed"          },
  { v: "setup_pending", label: "🔧 Setup Pending"   },
];

// ── Document card: preview + open in tab + authenticated download ────────────
const DocButton = ({ url, label, colour = "blue" }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadErr, setDownloadErr] = useState(null);
  const [lightbox, setLightbox] = useState(false);

  if (!url) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-slate-700/60 text-gray-400 dark:text-slate-500 rounded-xl text-sm border border-dashed border-gray-200 dark:border-slate-600">
        <DocumentIcon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{label}</span>
        <span className="ml-auto text-xs opacity-60">Not uploaded</span>
      </div>
    );
  }

  const colourMap = {
    blue:   "border-blue-200  dark:border-blue-800  bg-blue-50/50  dark:bg-blue-900/15",
    green:  "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/15",
    purple: "border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/15",
    amber:  "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/15",
  };

  const FileIcon = isPdf(url) ? DocumentTextIcon : isImage(url) ? PhotoIcon : DocumentArrowDownIcon;
  const fileType = isPdf(url) ? "PDF" : isImage(url) ? "Image" : "File";
  const image = isImage(url);

  const onDownload = async () => {
    setDownloadErr(null);
    setDownloading(true);
    try {
      await downloadDocumentWithAuth(url, label);
    } catch (e) {
      console.error(e);
      setDownloadErr(e?.message || "Download failed — try Open in new tab.");
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`overflow-hidden rounded-xl border ${colourMap[colour] ?? colourMap.blue}`}>
      {image && (
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="group relative block w-full border-b border-gray-200/80 dark:border-slate-600/80 bg-gray-900/[0.03] dark:bg-black/20"
        >
          <img loading="lazy"
            src={url}
            alt=""
            className="mx-auto max-h-56 w-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.02]"
          />
          <span className="absolute bottom-2 right-2 rounded bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Preview · click to enlarge
          </span>
        </button>
      )}

      <div className={`flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm ${image ? "" : "pt-3"}`}>
        <FileIcon className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-slate-400" />
        <span className="min-w-0 flex-1 truncate font-medium text-gray-800 dark:text-slate-200">{label}</span>
        <span className="shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:bg-slate-800 dark:text-slate-400">
          {fileType}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-gray-200/80 px-3 py-2 dark:border-slate-600/80">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:flex-none"
        >
          <EyeIcon className="h-3.5 w-3.5" /> Open
        </a>
        <button
          type="button"
          disabled={downloading}
          onClick={onDownload}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 sm:flex-none"
        >
          <DocumentArrowDownIcon className={`h-3.5 w-3.5 ${downloading ? "animate-pulse" : ""}`} />
          {downloading ? "Saving…" : "Download"}
        </button>
      </div>
      {downloadErr && (
        <p className="border-t border-amber-200/80 bg-amber-50/90 px-3 py-1.5 text-[11px] text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {downloadErr}
        </p>
      )}
      {lightbox && <ImageLightbox url={url} title={label} onClose={() => setLightbox(false)} />}
    </div>
  );
};

// ── NRC National ID Card ───────────────────────────────────────────────────────
const NrcCard = ({ seller }) => {
  const hasNrc = seller.nrc_division && seller.nrc_township_code && seller.nrc_type && seller.nrc_number;
  const nrcStatus = NRC_STATUS_CFG[seller.nrc_verification_status] ?? NRC_STATUS_CFG.unverified;
  const typeMeta  = NRC_TYPES.find((t) => t.value === seller.nrc_type);

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-blue-950/30 overflow-hidden shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 bg-indigo-600 dark:bg-indigo-700">
        <div className="flex items-center gap-2 text-white">
          <IdentificationIcon className="h-5 w-5" />
          <span className="text-sm font-bold tracking-wide uppercase">Myanmar NRC — မှတ်ပုံတင်</span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${nrcStatus.cls}`}>
          {nrcStatus.label}
        </span>
      </div>

      {/* NRC number display */}
      <div className="px-5 pt-4 pb-2">
        {hasNrc ? (
          <>
            <p className="font-mono text-2xl font-bold text-indigo-900 dark:text-indigo-100 tracking-widest">
              {seller.nrc_full || `${seller.nrc_division}/${seller.nrc_township_code}(${seller.nrc_type})${seller.nrc_number}`}
            </p>
            {seller.nrc_full_mm && (
              <p className="text-base text-indigo-700 dark:text-indigo-300 mt-1 font-medium">{seller.nrc_full_mm}</p>
            )}
          </>
        ) : (
          <p className="text-gray-400 dark:text-slate-500 italic text-sm">NRC number not submitted</p>
        )}
      </div>

      {/* Breakdown grid */}
      {hasNrc && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-4">
          {[
            { label: "Division / တိုင်း",       value: seller.nrc_division },
            { label: "Township Code / မြို့နယ်", value: seller.nrc_township_code + (seller.nrc_township_mm ? ` (${seller.nrc_township_mm})` : "") },
            { label: "ID Type / အမျိုးအစား",     value: typeMeta ? `${typeMeta.en} (${typeMeta.mm})` : seller.nrc_type },
            { label: "Serial No. / နံပါတ်",      value: seller.nrc_number },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/60 dark:bg-slate-800/50 rounded-xl px-3 py-2">
              <p className="text-[10px] font-semibold text-indigo-400 dark:text-indigo-500 uppercase tracking-widest mb-0.5">{label}</p>
              <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200 font-mono truncate">{value || "—"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Verification timestamps */}
      {seller.nrc_verified_at && (
        <div className="px-5 pb-3 text-xs text-indigo-500 dark:text-indigo-400">
          Verified on {new Date(seller.nrc_verified_at).toLocaleDateString()} 
          {seller.nrc_verification_notes && <span className="ml-2 text-gray-500 dark:text-slate-400">— {seller.nrc_verification_notes}</span>}
        </div>
      )}
    </div>
  );
};

// ── NRC tab: larger preview + open + download (no whole-card <a> wrapper) ─────
const DocPreview = ({ url, alt, label }) => {
  const [lightbox, setLightbox] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadErr, setDownloadErr] = useState(null);

  if (!url) return null;
  const image = isImage(url);

  const onDownload = async () => {
    setDownloadErr(null);
    setDownloading(true);
    try {
      await downloadDocumentWithAuth(url, label || alt || "nrc_document");
    } catch (e) {
      console.error(e);
      setDownloadErr("Download failed — opened in a new tab instead.");
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border-2 border-indigo-200 shadow-sm transition-all dark:border-indigo-800">
      {image ? (
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="group relative block w-full bg-gray-900/[0.04] dark:bg-black/25"
        >
          <img loading="lazy"
            src={url}
            alt={alt}
            className="mx-auto max-h-[min(420px,55vh)] w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.01]"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 pb-2 pt-8 text-left">
            <span className="text-[11px] font-semibold text-white drop-shadow">{label} — tap to enlarge</span>
          </div>
        </button>
      ) : (
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-6">
          <DocumentTextIcon className="h-12 w-12 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">PDF / file</span>
          <p className="text-center text-[11px] text-indigo-500/90 dark:text-indigo-400/90">{label}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-indigo-200/80 bg-indigo-600/95 px-3 py-2 dark:border-indigo-700/80">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 sm:flex-none"
        >
          <EyeIcon className="h-3.5 w-3.5" /> Open
        </a>
        <button
          type="button"
          disabled={downloading}
          onClick={onDownload}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 sm:flex-none"
        >
          <DocumentArrowDownIcon className={`h-3.5 w-3.5 ${downloading ? "animate-pulse" : ""}`} />
          {downloading ? "…" : "Download"}
        </button>
      </div>
      {downloadErr && (
        <p className="bg-amber-50 px-3 py-1 text-[11px] text-amber-900 dark:bg-amber-900/25 dark:text-amber-100">{downloadErr}</p>
      )}
      {lightbox && <ImageLightbox url={url} title={label} onClose={() => setLightbox(false)} />}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const SellerVerificationManagement = () => {
  const [pendingSellers, setPendingSellers] = useState([]);
  const [loading, setLoading]              = useState(false);
  const [actionLoading, setActionLoading]  = useState(false);
  const [error, setError]                  = useState(null);
  const [actionError, setActionError]      = useState(null);
  const [actionSuccess, setActionSuccess]  = useState(null);
  const [searchTerm, setSearchTerm]        = useState("");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [verificationData, setVerificationData] = useState({
    verification_level: "verified",
    badge_type: "verified",
    notes: "",
  });
  const [rejectReason, setRejectReason]    = useState("");
  const [confirmModal, setConfirmModal]    = useState(null);   // 'approve' | 'reject' | null
  const [nrcPanel, setNrcPanel]           = useState(null);   // { seller, status, notes }
  const [statusPanel, setStatusPanel]     = useState(null);   // { seller, status, reason }
  const [nrcLoading, setNrcLoading]       = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [activeTab, setActiveTab]         = useState("info"); // 'info' | 'nrc' | 'documents'

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchPendingSellers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/admin/seller/verification-review");
      const data = response.data.data?.data ?? response.data.data ?? [];
      setPendingSellers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load verification queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingSellers();
    const interval = setInterval(() => {
      if (!selectedSeller) fetchPendingSellers();
    }, 30_000);
    return () => clearInterval(interval);
  }, [selectedSeller, fetchPendingSellers]);

  // Reset tab when seller changes
  useEffect(() => {
    if (selectedSeller) setActiveTab("info");
  }, [selectedSeller?.id]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selectedSeller) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/admin/seller/${selectedSeller.id}/verify`, {
        verification_level: verificationData.verification_level,
        badge_type:         verificationData.badge_type,
        notes:              verificationData.notes ||
          `Seller approved by admin on ${new Date().toLocaleDateString()}`,
      });
      setConfirmModal(null);
      setSelectedSeller(null);
      setVerificationData({ verification_level: "verified", badge_type: "verified", notes: "" });
      setActionSuccess(`${selectedSeller.store_name} has been verified successfully.`);
      await fetchPendingSellers();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
        (err.response?.data?.missing_fields
          ? "Profile incomplete: " + Object.values(err.response.data.missing_fields).join(", ")
          : err.message || "Failed to approve seller")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSeller) return;
    if (!rejectReason.trim()) {
      setActionError("Please provide a reason for rejection before submitting.");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/admin/seller/${selectedSeller.id}/reject`, { reason: rejectReason });
      setConfirmModal(null);
      setSelectedSeller(null);
      setRejectReason("");
      setActionSuccess(`${selectedSeller.store_name} has been rejected.`);
      await fetchPendingSellers();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || "Failed to reject seller");
    } finally {
      setActionLoading(false);
    }
  };

  const openConfirm = (type) => {
    if (type === "reject" && !rejectReason.trim()) {
      setActionError("Please enter a rejection reason before proceeding.");
      return;
    }
    setActionError(null);
    setConfirmModal(type);
  };

  const handleNrcVerify = async () => {
    if (!nrcPanel) return;
    setNrcLoading(true);
    try {
      await api.post(`/admin/seller/${nrcPanel.seller.id}/verify-nrc`, {
        nrc_verification_status: nrcPanel.status,
        nrc_verification_notes:  nrcPanel.notes || null,
      });
      setNrcPanel(null);
      setActionSuccess("NRC verification status updated.");
      await fetchPendingSellers();
    } catch (e) {
      setActionError(e.response?.data?.message || "NRC verify failed.");
    } finally {
      setNrcLoading(false);
    }
  };

  const handleSetStatus = async () => {
    if (!statusPanel) return;
    setStatusLoading(true);
    try {
      await api.patch(`/admin/seller/${statusPanel.seller.id}/set-status`, {
        status: statusPanel.status,
        reason: statusPanel.reason || null,
      });
      setStatusPanel(null);
      setActionSuccess(`Seller status changed to ${statusPanel.status}.`);
      await fetchPendingSellers();
    } catch (e) {
      setActionError(e.response?.data?.message || "Status change failed.");
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Document helpers ──────────────────────────────────────────────────────
  const getDocumentCount = (seller) =>
    [
      seller.identity_document_front,
      seller.identity_document_back,
      seller.business_registration_document,
      seller.tax_registration_document,
    ].filter(Boolean).length;

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      header: "Store Info",
      accessor: "store",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.store_logo ? (
            <img loading="lazy"
              src={docUrl(row.store_logo)}
              alt={row.store_name}
              className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
              <BuildingStorefrontIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            </div>
          )}
          <div>
            <div className="font-semibold text-gray-900 dark:text-slate-100">{row.store_name}</div>
            <div className="text-xs text-gray-400 dark:text-slate-500">ID: {row.store_id || "N/A"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Owner / Contact",
      accessor: "business",
      cell: (row) => (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-slate-100">
            <UserCircleIcon className="h-4 w-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
            {row.user?.name || "Unknown"}
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400 text-xs">
            <EnvelopeIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate max-w-[160px]">{row.contact_email}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400 text-xs">
            <PhoneIcon className="h-3.5 w-3.5 flex-shrink-0" />
            {row.contact_phone || "—"}
          </div>
        </div>
      ),
    },
    {
      header: "NRC",
      accessor: "nrc",
      cell: (row) => {
        const nrcStat = NRC_STATUS_CFG[row.nrc_verification_status] ?? NRC_STATUS_CFG.unverified;
        return (
          <div className="space-y-1">
            {row.nrc_full ? (
              <p className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">
                {row.nrc_full}
              </p>
            ) : (
              <span className="text-xs text-gray-400 dark:text-slate-500 italic">Not submitted</span>
            )}
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${nrcStat.cls}`}>
              {nrcStat.label}
            </span>
          </div>
        );
      },
    },
    {
      header: "Documents",
      accessor: "documents",
      cell: (row) => {
        const count = getDocumentCount(row);
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm">
              <DocumentIcon className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              <span className={`font-medium ${count > 0 ? "text-green-700 dark:text-green-400" : "text-gray-400 dark:text-slate-500"}`}>
                {count} / 4 uploaded
              </span>
            </div>
            {row.document_status && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${statusColor(row.document_status)}`}>
                {row.document_status}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Submitted",
      accessor: "submitted",
      cell: (row) => (
        <div className="text-sm">
          <div className="flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4 text-gray-400 dark:text-slate-500" />
            <span className="text-gray-700 dark:text-slate-300">
              {new Date(row.documents_submitted_at || row.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {row.documents_submitted ? "✓ Submitted" : "Draft"}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => (
        <div className="space-y-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor(row.verification_status)}`}>
            {row.verification_status}
          </span>
          <div className="text-xs text-gray-400 dark:text-slate-500">Profile: {row.status}</div>
        </div>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      cell: (row) => (
        <div className="flex gap-2">
          <a
            href={`/sellers/${row.store_slug || row.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <EyeIcon className="h-3.5 w-3.5" /> View
          </a>
          <button
            onClick={() => setSelectedSeller(row)}
            className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline font-medium"
          >
            <ShieldCheckIcon className="h-3.5 w-3.5" /> Review
          </button>
        </div>
      ),
    },
  ];

  const filteredSellers = pendingSellers.filter(
    (s) =>
      s.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    pending:     pendingSellers.filter((s) => s.verification_status === "pending").length,
    underReview: pendingSellers.filter((s) => s.verification_status === "under_review").length,
    verified:    pendingSellers.filter((s) => s.verification_status === "verified").length,
    rejected:    pendingSellers.filter((s) => s.verification_status === "rejected").length,
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            {confirmModal === "approve" ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Confirm Verification</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">
                  Verify <strong>{selectedSeller?.store_name}</strong> as{" "}
                  <strong>{verificationData.verification_level}</strong>?
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
                  The seller will receive a verified badge and their store will become active.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Confirm Rejection</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                  Reject verification for <strong>{selectedSeller?.store_name}</strong>? The seller will be notified.
                </p>
              </>
            )}

            {actionError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmModal(null); setActionError(null); }}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal === "approve" ? handleApprove : handleReject}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${
                  confirmModal === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading
                  ? "Processing…"
                  : confirmModal === "approve"
                  ? "Verify Seller"
                  : "Reject Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Banner ── */}
      {actionSuccess && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-800 dark:text-green-300">
          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-green-600 dark:text-green-400 hover:text-green-800">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending Review",  value: stats.pending,     color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
          { label: "Under Review",    value: stats.underReview, color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-900/20"   },
          { label: "Verified",        value: stats.verified,    color: "text-green-600 dark:text-green-400",   bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Rejected",        value: stats.rejected,    color: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/20"     },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl shadow-sm p-4 border border-transparent ${s.bg} dark:border-slate-700`}>
            <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Pending applications</h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">Review documents and national ID, then approve or reject</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search sellers…"
                className="pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm w-52 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={fetchPendingSellers}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 text-sm"
            >
              <ArrowPathIcon className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
          </div>
        )}

        {error && !loading && (
          <div className="p-4 m-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Error loading data</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{error}</p>
                <button onClick={fetchPendingSellers} className="mt-2 text-sm text-red-700 dark:text-red-400 underline">
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && <DataTable columns={columns} data={filteredSellers} striped hoverable />}

        {!loading && !error && filteredSellers.length === 0 && (
          <div className="text-center py-14 text-gray-400 dark:text-slate-500">
            <ShieldCheckIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-gray-500 dark:text-slate-400">No sellers in verification queue</p>
            <p className="text-sm mt-1">Sellers who submit documents will appear here</p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Review Modal
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedSeller && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 overflow-y-auto z-50">
          <div className="relative top-6 mx-auto p-4 w-full max-w-5xl pb-12">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">

              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                <div className="flex items-center gap-3">
                  {selectedSeller.store_logo ? (
                    <img loading="lazy" src={docUrl(selectedSeller.store_logo)} alt={selectedSeller.store_name}
                      className="h-10 w-10 rounded-xl object-cover border-2 border-white/30" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <BuildingStorefrontIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold">{selectedSeller.store_name}</h3>
                    <p className="text-xs text-indigo-200">
                      Store ID: {selectedSeller.store_id} · {selectedSeller.user?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedSeller(null); setActionError(null); }}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40">
                {[
                  { id: "info",      label: "Seller Info",         icon: UserCircleIcon      },
                  { id: "nrc",       label: "National ID (NRC)",   icon: IdentificationIcon  },
                  { id: "documents", label: "Documents",            icon: DocumentIcon        },
                  { id: "verify",    label: "Verify / Reject",      icon: ShieldCheckIcon     },
                ].map((tabItem) => {
                  const TabIcon = tabItem.icon;
                  return (
                    <button
                      key={tabItem.id}
                      onClick={() => setActiveTab(tabItem.id)}
                      className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === tabItem.id
                          ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500"
                          : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <TabIcon className="h-4 w-4" />
                      {tabItem.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {/* Inline action error */}
                {actionError && (
                  <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 flex gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {actionError}
                  </div>
                )}

                {/* ── TAB: Seller Info ── */}
                {activeTab === "info" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Contact & business */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        Contact Information
                      </h4>
                      {[
                        [UserCircleIcon,       selectedSeller.user?.name || "Unknown",                    "Owner"],
                        [EnvelopeIcon,         selectedSeller.contact_email,                              "Contact Email"],
                        [PhoneIcon,            selectedSeller.contact_phone || "—",                      "Contact Phone"],
                        [BuildingStorefrontIcon, selectedSeller.business_type || "Not specified",         "Business Type"],
                        [MapPinIcon,           `${selectedSeller.address || "—"}, ${selectedSeller.city || "—"}`,
                                               `${selectedSeller.state || ""} ${selectedSeller.country || "Myanmar"}`],
                      ].map(([rowIcon, value, label], i) => {
                        const RowIcon = rowIcon;
                        return (
                          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-900/40 rounded-xl">
                            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                              <RowIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{label}</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-slate-100 mt-0.5">{value}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right: Store status & timestamps */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        Store Status
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Profile Status",      value: selectedSeller.status },
                          { label: "Verification Status", value: selectedSeller.verification_status },
                          { label: "Document Status",     value: selectedSeller.document_status || "—" },
                          { label: "Docs Submitted",      value: selectedSeller.documents_submitted ? "Yes" : "No" },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-gray-50 dark:bg-slate-900/40 rounded-xl p-3">
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-slate-100 mt-0.5 capitalize">{value}</p>
                          </div>
                        ))}
                      </div>

                      {selectedSeller.documents_submitted_at && (
                        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                          <ClockIcon className="h-5 w-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Documents Submitted</p>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mt-0.5">
                              {new Date(selectedSeller.documents_submitted_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedSeller.rejection_reason && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Rejection Reason</p>
                          <p className="text-sm text-red-700 dark:text-red-300">{selectedSeller.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB: NRC / National Identification ── */}
                {activeTab === "nrc" && (
                  <div className="space-y-5">
                    {/* NRC Card */}
                    <NrcCard seller={selectedSeller} />

                    {/* NRC document images */}
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm uppercase tracking-wide mb-3">
                        NRC Document Images
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Front Side</p>
                          {selectedSeller.identity_document_front ? (
                            <DocPreview
                              url={docUrl(selectedSeller.identity_document_front)}
                              alt="NRC Front"
                              label="NRC Front Side"
                            />
                          ) : (
                            <div className="h-32 rounded-xl bg-gray-50 dark:bg-slate-700/40 border-2 border-dashed border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
                              Not uploaded
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Back Side</p>
                          {selectedSeller.identity_document_back ? (
                            <DocPreview
                              url={docUrl(selectedSeller.identity_document_back)}
                              alt="NRC Back"
                              label="NRC Back Side"
                            />
                          ) : (
                            <div className="h-32 rounded-xl bg-gray-50 dark:bg-slate-700/40 border-2 border-dashed border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
                              Not uploaded
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick NRC verdict */}
                    <div className="bg-gray-50 dark:bg-slate-900/40 rounded-xl p-4">
                      <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Set NRC Verification Status</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        {["verified", "mismatch", "rejected", "pending"].map((st) => (
                          <button
                            key={st}
                            onClick={() => setNrcPanel({ seller: selectedSeller, status: st, notes: "" })}
                            className={`py-2 px-2 text-xs font-bold rounded-xl border-2 transition-all ${
                              (NRC_STATUS_CFG[st] || NRC_STATUS_CFG.unverified).cls
                            } border-current hover:opacity-70`}
                          >
                            {(NRC_STATUS_CFG[st] || NRC_STATUS_CFG.unverified).label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Clicking a status will open a confirmation panel to save the NRC verdict.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── TAB: Documents ── */}
                {activeTab === "documents" && (
                  <div className="space-y-6">
                    {/* Identity documents */}
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                        <IdentificationIcon className="h-4 w-4 text-indigo-500" />
                        Identity Documents
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DocButton url={docUrl(selectedSeller.identity_document_front)} label="ID / NRC Front" colour="blue" />
                        <DocButton url={docUrl(selectedSeller.identity_document_back)}  label="ID / NRC Back"  colour="blue" />
                      </div>
                    </div>

                    {/* Business documents */}
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                        <BuildingStorefrontIcon className="h-4 w-4 text-green-500" />
                        Business Documents
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DocButton url={docUrl(selectedSeller.business_registration_document)} label="Business Registration" colour="green" />
                        <DocButton url={docUrl(selectedSeller.tax_registration_document)}      label="Tax Registration"      colour="green" />
                        {selectedSeller.business_certificate && (
                          <DocButton url={docUrl(selectedSeller.business_certificate)} label="Business Certificate" colour="green" />
                        )}
                      </div>
                    </div>

                    {/* Additional documents */}
                    {Array.isArray(selectedSeller.additional_documents) && selectedSeller.additional_documents.length > 0 && (
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                          <DocumentIcon className="h-4 w-4 text-purple-500" />
                          Additional Documents
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedSeller.additional_documents.map((doc, i) => (
                            <DocButton
                              key={i}
                              url={doc.url || docUrl(doc.path)}
                              label={doc.name || `Additional Document ${i + 1}`}
                              colour="purple"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Document status note */}
                    {selectedSeller.document_rejection_reason && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <div className="flex gap-2">
                          <InformationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Document Rejection Reason</p>
                            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{selectedSeller.document_rejection_reason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB: Verify / Reject ── */}
                {activeTab === "verify" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Approval settings */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        Verification Settings
                      </h4>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                          Verification Level
                        </label>
                        <select
                          value={verificationData.verification_level}
                          onChange={(e) => setVerificationData({ ...verificationData, verification_level: e.target.value })}
                          className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        >
                          <option value="basic">Basic</option>
                          <option value="verified">Verified</option>
                          <option value="premium">Premium</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                          Badge Type
                        </label>
                        <select
                          value={verificationData.badge_type}
                          onChange={(e) => setVerificationData({ ...verificationData, badge_type: e.target.value })}
                          className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        >
                          <option value="verified">Verified</option>
                          <option value="premium">Premium</option>
                          <option value="featured">Featured</option>
                          <option value="top_rated">Top Rated</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                          Approval Notes
                        </label>
                        <textarea
                          value={verificationData.notes}
                          onChange={(e) => setVerificationData({ ...verificationData, notes: e.target.value })}
                          rows={3}
                          className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 resize-none"
                          placeholder="Optional notes for the seller…"
                        />
                      </div>

                      <button
                        onClick={() => openConfirm("approve")}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold disabled:opacity-50 transition-colors"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        Verify Seller
                      </button>
                    </div>

                    {/* Rejection section */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-red-600 dark:text-red-400 text-sm uppercase tracking-wide">
                        Rejection
                      </h4>

                      <div>
                        <label className="block text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                          Rejection Reason <span className="text-gray-400 font-normal">(required)</span>
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={5}
                          className="w-full border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 resize-none"
                          placeholder="Explain clearly why this seller is being rejected…"
                        />
                      </div>

                      <button
                        onClick={() => openConfirm("reject")}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold disabled:opacity-50 transition-colors"
                      >
                        <XCircleIcon className="h-5 w-5" />
                        Reject Verification
                      </button>

                      {/* Change Status */}
                      <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                        <button
                          onClick={() => setStatusPanel({ seller: selectedSeller, status: selectedSeller.status || "pending", reason: "" })}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 text-sm font-semibold transition-colors"
                        >
                          ⚡ Change Store Status
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-700">
                <a
                  href={`/sellers/${selectedSeller.store_slug || selectedSeller.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-sm"
                >
                  <EyeIcon className="h-4 w-4" /> View Store
                </a>
                <div className="flex gap-2 text-xs text-gray-400 dark:text-slate-500">
                  <span>Submitted: {selectedSeller.documents_submitted_at
                    ? new Date(selectedSeller.documents_submitted_at).toLocaleDateString()
                    : "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NRC Verification Panel ── */}
      {nrcPanel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <IdentificationIcon className="h-5 w-5 text-indigo-500" />
                NRC Verification
              </h3>
              <button onClick={() => setNrcPanel(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 font-mono text-lg font-bold text-indigo-900 dark:text-indigo-200 tracking-widest text-center">
                {nrcPanel.seller.nrc_full || "—"}
              </div>
              {nrcPanel.seller.nrc_full_mm && (
                <p className="text-center text-sm text-indigo-600 dark:text-indigo-400">{nrcPanel.seller.nrc_full_mm}</p>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">NRC Verification Result</label>
                <select
                  value={nrcPanel.status}
                  onChange={(e) => setNrcPanel((p) => ({ ...p, status: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {Object.entries(NRC_STATUS_CFG).map(([v, { label }]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Admin Notes (optional)</label>
                <textarea
                  rows={3}
                  value={nrcPanel.notes}
                  onChange={(e) => setNrcPanel((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. NRC matches document, photo clear…"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setNrcPanel(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button
                onClick={handleNrcVerify}
                disabled={nrcLoading}
                className="px-5 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {nrcLoading ? "Saving…" : "Save NRC Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Change Panel ── */}
      {statusPanel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-slate-100">⚡ Change Seller Status</h3>
              <button onClick={() => setStatusPanel(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Store: <strong className="text-gray-900 dark:text-slate-100">{statusPanel.seller.store_name}</strong>
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-2">New Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STORE_STATUS_OPTS.map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setStatusPanel((p) => ({ ...p, status: opt.v }))}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all ${
                        statusPanel.status === opt.v
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                          : "border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-gray-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Reason (optional)</label>
                <textarea
                  rows={2}
                  value={statusPanel.reason}
                  onChange={(e) => setStatusPanel((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Reason for status change…"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setStatusPanel(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button
                onClick={handleSetStatus}
                disabled={statusLoading}
                className="px-5 py-2 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50"
              >
                {statusLoading ? "Saving…" : "Apply Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerVerificationManagement;
