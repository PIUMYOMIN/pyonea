// utils/exportExcel.js
// Pure-JS Excel export — no server roundtrip, no extra npm package.
// Uses SheetJS (xlsx) loaded from CDN via dynamic import when needed.
import * as XLSX from "xlsx";

/**
 * Export data to .xlsx file.
 * @param {Array<Array>} rows  - 2D array; first row = headers
 * @param {string} sheetName  - worksheet tab name
 * @param {string} filename   - e.g. "sales-report-2026-03.xlsx"
 */
export const exportToExcel = async (rows, sheetName = "Report", filename = "report.xlsx") => {
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto-column widths based on max content length in each column
  const colWidths = rows[0].map((_, ci) =>
    Math.min(40, Math.max(10, ...rows.map(r => String(r[ci] ?? "").length)))
  );
  ws["!cols"] = colWidths.map(w => ({ wch: w }));

  // Style header row bold (requires xlsx-style — skip if unavailable, silently)
  try {
    rows[0].forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (ws[ref]) ws[ref].s = { font: { bold: true } };
    });
  } catch (_) {}

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
};

/** Format MMK for Excel cells (plain number, not formatted string) */
export const mmkCell = (n) => Math.round(Number(n) || 0);

/** Today's date string for filenames */
export const todayStr = () => new Date().toISOString().slice(0, 10);
