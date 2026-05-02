import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";
import api from "../../utils/api";

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmtK = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1_000)         return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return v.toLocaleString();
};
const fmtMMK  = (n) => `${fmtK(n)} MMK`;
const fullMMK = (n) =>
  new Intl.NumberFormat("my-MM", { style: "currency", currency: "MMK", minimumFractionDigits: 0 })
    .format(Number(n) || 0);
const mmkNum = (n) => Math.round(Number(n) || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const todayStr = () => new Date().toISOString().slice(0, 10);

// ── Excel Export ───────────────────────────────────────────────────────────────
async function exportToExcel(sheetsData, filename) {
  const wb = XLSX.utils.book_new();

  sheetsData.forEach(({ name, rows, colWidths }) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    if (colWidths) ws["!cols"] = colWidths.map(w => ({ wch: w }));
    else {
      const widths = rows[0]?.map((_, ci) =>
        Math.min(45, Math.max(10, ...rows.map(r => String(r[ci] ?? "").length)))
      ) ?? [];
      ws["!cols"] = widths.map(w => ({ wch: w }));
    }
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  XLSX.writeFile(wb, filename);
}

// ── Period presets ─────────────────────────────────────────────────────────────
const PERIODS = [
  { key: "today",      label: "Today" },
  { key: "yesterday",  label: "Yesterday" },
  { key: "week",       label: "This Week" },
  { key: "last_week",  label: "Last Week" },
  { key: "month",      label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "quarter",    label: "This Quarter" },
  { key: "year",       label: "This Year" },
  { key: "custom",     label: "Custom Range" },
];

const GROUP_BY = [
  { key: "day",   label: "Daily" },
  { key: "week",  label: "Weekly" },
  { key: "month", label: "Monthly" },
];

// ── Status badge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    delivered:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    confirmed:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    processing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    shipped:    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    cancelled:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    refunded:   "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
  }[status] ?? "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${cfg}`}>
      {status}
    </span>
  );
};

// ── Summary Card ───────────────────────────────────────────────────────────────
const SCard = ({ label, value, sub, accent }) => {
  const accents = {
    emerald: "border-l-4 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
    teal:    "border-l-4 border-teal-400 bg-teal-50 dark:bg-teal-900/20",
    blue:    "border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/20",
    amber:   "border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20",
    purple:  "border-l-4 border-purple-400 bg-purple-50 dark:bg-purple-900/20",
    red:     "border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20",
    gray:    "border-l-4 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50",
  };
  return (
    <div className={`rounded-xl p-4 shadow-sm ${accents[accent] ?? accents.gray}`}>
      <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const FinancialReports = () => {
  const [period,   setPeriod]   = useState("month");
  const [groupBy,  setGroupBy]  = useState("day");
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate,   setToDate]   = useState(todayStr());
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [exporting,setExporting]= useState(false);
  const [error,    setError]    = useState("");
  const [search,   setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState(null);

  const fetch = useCallback(async (p = period, gb = groupBy) => {
    setLoading(true);
    setError("");
    try {
      const params = { period: p, group_by: gb };
      if (p === "custom") { params.from = fromDate; params.to = toDate; }
      const res = await api.get("/admin/financial-report", { params });
      if (res.data.success) setData(res.data);
      else setError(res.data.message || "Failed to load report.");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [period, groupBy, fromDate, toDate]);

  useEffect(() => { fetch(); }, []);

  const handleFetch = () => fetch(period, groupBy);

  // ── Filtered orders for table ───────────────────────────────────────────────
  const filteredOrders = (data?.orders ?? []).filter(o => {
    const matchSearch = !search ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.seller_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.order_status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Excel Export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const s = data.summary;
      const pd = `${s.from} to ${s.to}`;

      // Sheet 1 — Summary
      const summarySheet = [
        ["PYONEA FINANCIAL REPORT"],
        [`Period: ${pd}  |  Generated: ${new Date().toLocaleString()}`],
        [],
        ["ORDERS", ""],
        ["Total Orders",              s.total_orders],
        ["Delivered Orders",          s.delivered_orders],
        ["Pending Orders",            s.pending_orders],
        ["Cancelled Orders",          s.cancelled_orders],
        [],
        ["GMV (GROSS MERCHANDISE VALUE)", ""],
        ["Total GMV (MMK)",           mmkNum(s.total_gmv)],
        ["Total Subtotal (MMK)",      mmkNum(s.total_subtotal)],
        ["Total Shipping (MMK)",      mmkNum(s.total_shipping)],
        ["Total Tax (MMK)",           mmkNum(s.total_tax)],
        ["Total Coupon Discounts (MMK)", mmkNum(s.total_coupon_discount)],
        [],
        ["COMMISSION", ""],
        ["Total Commission (MMK)",          mmkNum(s.total_commission)],
        ["Commission Confirmed (MMK)",      mmkNum(s.total_commission_confirmed)],
        ["Commission Pending (MMK)",        mmkNum(s.total_commission_pending)],
        ["Total Seller Payout (MMK)",       mmkNum(s.total_seller_payout)],
        [],
        ["DELIVERY FEES (PLATFORM)", ""],
        ["Total Delivery Fees (MMK)",          mmkNum(s.total_delivery_fees)],
        ["Delivery Fees Confirmed (MMK)",      mmkNum(s.total_delivery_fees_confirmed)],
        ["Delivery Fees Pending (MMK)",        mmkNum(s.total_delivery_fees_pending)],
        [],
        ["PLATFORM REVENUE", ""],
        ["Total Platform Revenue (MMK)",   mmkNum(s.platform_revenue)],
        ["Platform Revenue Pending (MMK)", mmkNum(s.platform_revenue_pending)],
      ];

      // Sheet 2 — Orders Detail
      const orderHeaders = [
        "Order #", "Order Date", "Delivered At",
        "Buyer Name", "Buyer Email",
        "Seller / Store", "Seller Email",
        "Product Items",
        "Subtotal (MMK)", "Shipping (MMK)", "Tax (MMK)", "Coupon Discount (MMK)", "Total (MMK)",
        "Commission Rate", "Commission (MMK)", "Commission Status",
        "Commission Confirmed (MMK)", "Commission Pending (MMK)",
        "Delivery Fee (MMK)", "Delivery Fee Status",
        "Delivery Confirmed (MMK)", "Delivery Pending (MMK)",
        "Seller Payout (MMK)",
        "Order Status", "Payment Method", "Payment Status", "Escrow Status",
      ];
      const orderRows = (data.orders ?? []).map(o => [
        o.order_number,
        fmtDate(o.order_date),
        fmtDate(o.delivered_at),
        o.buyer_name,
        o.buyer_email,
        o.seller_name,
        o.seller_email,
        o.items_summary,
        mmkNum(o.subtotal),
        mmkNum(o.shipping_fee),
        mmkNum(o.tax_amount),
        mmkNum(o.coupon_discount),
        mmkNum(o.total_amount),
        `${(o.commission_rate * 100).toFixed(1)}%`,
        mmkNum(o.commission_amount),
        o.commission_status,
        mmkNum(o.commission_confirmed),
        mmkNum(o.commission_pending),
        mmkNum(o.delivery_fee),
        o.delivery_fee_status,
        mmkNum(o.delivery_fee_confirmed),
        mmkNum(o.delivery_fee_pending),
        mmkNum(o.seller_payout),
        o.order_status,
        o.payment_method,
        o.payment_status,
        o.escrow_status,
      ]);

      // Sheet 3 — Trend
      const trendHeaders = ["Period", "Orders", "GMV (MMK)", "Tax (MMK)", "Commission (MMK)", "Delivery Fees (MMK)", "Platform Revenue (MMK)"];
      const trendRows = (data.trend ?? []).map(t => [
        t.period, t.orders,
        mmkNum(t.gmv), mmkNum(t.tax), mmkNum(t.commission),
        mmkNum(t.delivery_fee), mmkNum(t.platform),
      ]);

      // Sheet 4 — Commission Detail
      const commHeaders = [
        "Order #", "Order Date", "Seller", "Subtotal (MMK)",
        "Commission Rate", "Commission (MMK)", "Status", "Seller Payout (MMK)",
      ];
      const commRows = (data.orders ?? []).map(o => [
        o.order_number, fmtDate(o.order_date), o.seller_name,
        mmkNum(o.subtotal),
        `${(o.commission_rate * 100).toFixed(1)}%`,
        mmkNum(o.commission_amount),
        o.commission_status,
        mmkNum(o.seller_payout),
      ]);

      // Sheet 5 — Delivery Fee Detail
      const delivHeaders = [
        "Order #", "Order Date", "Seller", "Fee (MMK)", "Fee Status",
        "Confirmed (MMK)", "Pending (MMK)",
      ];
      const delivRows = (data.orders ?? [])
        .filter(o => o.delivery_fee > 0)
        .map(o => [
          o.order_number, fmtDate(o.order_date), o.seller_name,
          mmkNum(o.delivery_fee), o.delivery_fee_status,
          mmkNum(o.delivery_fee_confirmed), mmkNum(o.delivery_fee_pending),
        ]);

      await exportToExcel([
        { name: "Summary",        rows: summarySheet },
        { name: "Orders Detail",  rows: [orderHeaders, ...orderRows] },
        { name: "Trend",          rows: [trendHeaders, ...trendRows] },
        { name: "Commission",     rows: [commHeaders, ...commRows] },
        { name: "Delivery Fees",  rows: delivRows.length > 0 ? [delivHeaders, ...delivRows] : [delivHeaders, ["No platform delivery fees in this period"]] },
      ], `pyonea-financial-report-${s.from}-to-${s.to}.xlsx`);

    } catch (e) {
      setError(e.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const s = data?.summary;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Financial Reports</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Orders · Tax · Commission · Delivery Fees · Platform Revenue
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!data || exporting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700
                     text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exporting ? "Exporting…" : "Export Excel (5 sheets)"}
        </button>
      </div>

      {/* ── Period selector ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 space-y-4">
        {/* Period tabs */}
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                period === p.key
                  ? "bg-green-600 text-white border-green-600"
                  : "text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        {period === "custom" && (
          <div className="flex flex-wrap gap-3 items-center">
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
            </div>
          </div>
        )}

        {/* Group by + fetch */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-slate-400">Trend view:</span>
            {GROUP_BY.map(g => (
              <button key={g.key} onClick={() => setGroupBy(g.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  groupBy === g.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}>
                {g.label}
              </button>
            ))}
          </div>
          <button onClick={handleFetch}
            className="ml-auto px-4 py-1.5 bg-gray-900 dark:bg-slate-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-slate-500">
            Load Report
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          {error}
          <button onClick={handleFetch} className="ml-2 underline font-medium">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500" />
        </div>
      ) : s ? (
        <>
          {/* ── Period label ─────────────────────────────────────────────────── */}
          <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">
            Report period: <span className="text-gray-700 dark:text-slate-300 font-semibold">{s.from} → {s.to}</span>
          </p>

          {/* ── Summary cards row 1: Orders ───────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Orders</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SCard label="Total Orders"      value={s.total_orders.toLocaleString()}     sub="" accent="gray" />
              <SCard label="Delivered"         value={s.delivered_orders.toLocaleString()} sub="Completed" accent="emerald" />
              <SCard label="Pending"           value={s.pending_orders.toLocaleString()}   sub="Awaiting" accent="amber" />
              <SCard label="Cancelled"         value={s.cancelled_orders.toLocaleString()} sub="" accent="red" />
            </div>
          </div>

          {/* ── Summary cards row 2: GMV ──────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Gross Merchandise Value</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SCard label="Total GMV"      value={fmtMMK(s.total_gmv)}      sub="All orders" accent="blue" />
              <SCard label="Shipping Fees"  value={fmtMMK(s.total_shipping)} sub="Paid by buyers" accent="gray" />
              <SCard label="Tax Collected"  value={fmtMMK(s.total_tax)}      sub="5% VAT" accent="purple" />
              <SCard label="Coupon Discounts" value={fmtMMK(s.total_coupon_discount)} sub="Deducted" accent="red" />
            </div>
          </div>

          {/* ── Summary cards row 3: Commission ──────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Commission</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SCard label="Total Commission"     value={fmtMMK(s.total_commission)}           sub="All orders" accent="teal" />
              <SCard label="Commission Confirmed" value={fmtMMK(s.total_commission_confirmed)}  sub="Collected ✓" accent="emerald" />
              <SCard label="Commission Pending"   value={fmtMMK(s.total_commission_pending)}    sub="Awaiting delivery" accent="amber" />
              <SCard label="Total Seller Payout"  value={fmtMMK(s.total_seller_payout)}         sub="After commission" accent="blue" />
            </div>
          </div>

          {/* ── Summary cards row 4: Delivery Fees ───────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Platform Delivery Fees</p>
            <div className="grid grid-cols-3 gap-3">
              <SCard label="Total Delivery Fees"     value={fmtMMK(s.total_delivery_fees)}           sub="Platform deliveries" accent="blue" />
              <SCard label="Delivery Fees Confirmed" value={fmtMMK(s.total_delivery_fees_confirmed)}  sub="Collected ✓" accent="emerald" />
              <SCard label="Delivery Fees Pending"   value={fmtMMK(s.total_delivery_fees_pending)}    sub="Awaiting collection" accent="amber" />
            </div>
          </div>

          {/* ── Summary cards row 5: Platform Revenue ────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Platform Revenue (Pyonea Earns)</p>
            <div className="grid grid-cols-2 gap-3">
              <SCard label="Confirmed Platform Revenue"
                value={fmtMMK(s.platform_revenue)}
                sub="Commission confirmed + Delivery confirmed"
                accent="emerald" />
              <SCard label="Pending Platform Revenue"
                value={fmtMMK(s.platform_revenue_pending)}
                sub="Commission pending + Delivery pending"
                accent="amber" />
            </div>
          </div>

          {/* ── Trend chart ───────────────────────────────────────────────────── */}
          {data.trend?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">
                Revenue Trend ({GROUP_BY.find(g => g.key === groupBy)?.label})
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.trend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <Tooltip formatter={(v, name) => [fullMMK(v), name]} />
                    <Legend />
                    <Bar dataKey="gmv"          name="GMV"          fill="#e2e8f0" radius={[3,3,0,0]} />
                    <Bar dataKey="commission"   name="Commission"   fill="#10b981" radius={[3,3,0,0]} stackId="platform" />
                    <Bar dataKey="delivery_fee" name="Delivery Fees" fill="#3b82f6" radius={[3,3,0,0]} stackId="platform" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Orders Table ─────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Table toolbar */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex-1">
                Order Details ({filteredOrders.length} orders)
              </h3>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search order, buyer, seller…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-green-500 w-52 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                  <option value="all">All Status</option>
                  {["pending","confirmed","processing","shipped","delivered","cancelled","refunded"].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  <tr>
                    {["Order #","Date","Buyer","Seller","Items","Subtotal","Shipping","Tax","Total",
                      "Commission","Comm. Status","Delivery Fee","Fee Status","Status"].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={15} className="px-5 py-10 text-center text-gray-400 dark:text-slate-500">No orders found.</td></tr>
                  ) : filteredOrders.map(o => (
                    <React.Fragment key={o.order_id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-3 py-3 font-mono font-semibold text-gray-900 dark:text-slate-100">{o.order_number}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-slate-400">{o.order_date?.slice(0,10)}</td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-gray-900 dark:text-slate-100">{o.buyer_name}</p>
                          <p className="text-gray-400 dark:text-slate-500 text-[10px]">{o.buyer_email}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-gray-900 dark:text-slate-100">{o.seller_name}</p>
                        </td>
                        <td className="px-3 py-3 max-w-32">
                          <p className="truncate text-gray-600 dark:text-slate-300">{o.items_summary}</p>
                          <p className="text-gray-400 dark:text-slate-500 text-[10px]">{o.items_count} item{o.items_count !== 1 ? "s" : ""}</p>
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-gray-900 dark:text-slate-100">{fmtMMK(o.subtotal)}</td>
                        <td className="px-3 py-3 text-right text-gray-500 dark:text-slate-400">{fmtMMK(o.shipping_fee)}</td>
                        <td className="px-3 py-3 text-right text-gray-500 dark:text-slate-400">{fmtMMK(o.tax_amount)}</td>
                        <td className="px-3 py-3 text-right font-bold text-gray-900 dark:text-slate-100">{fmtMMK(o.total_amount)}</td>
                        <td className="px-3 py-3 text-right">
                          <p className="font-medium text-teal-700 dark:text-teal-400">{fmtMMK(o.commission_amount)}</p>
                          <p className="text-gray-400 dark:text-slate-500 text-[10px]">{(o.commission_rate * 100).toFixed(1)}%</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            o.commission_status === "collected"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : o.commission_status === "waived"
                              ? "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
                              : o.commission_status === "due"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}>
                            {o.commission_status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-blue-700 dark:text-blue-400">
                          {o.delivery_fee > 0 ? fmtMMK(o.delivery_fee) : "—"}
                        </td>
                        <td className="px-3 py-3">
                          {o.delivery_fee > 0 ? (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              o.delivery_fee_status === "collected"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : o.delivery_fee_status === "outstanding"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400"
                            }`}>
                              {o.delivery_fee_status}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3"><StatusBadge status={o.order_status} /></td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setExpandedOrder(expandedOrder === o.order_id ? null : o.order_id)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-[10px] font-medium whitespace-nowrap"
                          >
                            {expandedOrder === o.order_id ? "▲ Hide" : "▼ Items"}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded item rows */}
                      {expandedOrder === o.order_id && (
                        <tr className="bg-green-50 dark:bg-green-900/10">
                          <td colSpan={15} className="px-6 py-3">
                            <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 mb-2">Product Items</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 dark:text-slate-500">
                                  <th className="text-left pb-1">Product</th>
                                  <th className="text-right pb-1">Qty</th>
                                  <th className="text-right pb-1">Unit Price</th>
                                  <th className="text-right pb-1">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
{(o.items ?? []).map((item, i) => (
                                  <tr key={item.id || item.product_id || item.sku || `item-${o.order_id}-${i}`} className="border-t border-green-100 dark:border-green-900/30">
                                    <td className="py-1 text-gray-700 dark:text-slate-300">{item.name}</td>
                                    <td className="py-1 text-right text-gray-600 dark:text-slate-400">{item.qty}</td>
                                    <td className="py-1 text-right text-gray-600 dark:text-slate-400">{fmtMMK(item.price)}</td>
                                    <td className="py-1 text-right font-medium text-gray-900 dark:text-slate-100">{fmtMMK(item.subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-slate-400">
                              <span>Payment: <strong className="text-gray-700 dark:text-slate-300">{o.payment_method?.replace(/_/g," ")}</strong></span>
                              <span>Escrow: <strong className="text-gray-700 dark:text-slate-300">{o.escrow_status}</strong></span>
                              <span>Delivered: <strong className="text-gray-700 dark:text-slate-300">{o.delivered_at?.slice(0,10) ?? "—"}</strong></span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default FinancialReports;
