// A cell that starts with = + - @ (or a tab/CR) is run as a formula by Excel
// and Sheets, so an animal tagged `=HYPERLINK(...)` could execute on the
// owner's machine when they open an export. A leading apostrophe makes the
// spreadsheet treat it as plain text.
const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCell(value) {
  let str = String(value ?? "");
  if (FORMULA_START.test(str)) str = `'${str}`;
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCSV(columns, rows) {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(filename, columns, rows) {
  // BOM so Excel opens UTF-8 (accented breed names etc.) correctly.
  downloadBlob(filename, new Blob(["﻿", toCSV(columns, rows)], { type: "text/csv;charset=utf-8;" }));
}
