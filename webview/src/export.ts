import type { BaseTable, FieldDef, Row } from "../../src/base/types";

/** 单元格导出文本:多选用「, 」连接,复选用是/空,其余转字符串 */
export function cellText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (value === true) return "是";
  if (value === false) return "";
  return String(value);
}

function csvEscape(s: string): string {
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** 导出为 CSV(带 BOM,Excel 直接识别中文) */
export function toCSV(cols: string[], rows: Row[]): string {
  const head = cols.map(csvEscape).join(",");
  const body = rows.map((r) => cols.map((c) => csvEscape(cellText(r.values[c]))).join(",")).join("\n");
  return "﻿" + head + "\n" + body + "\n";
}

function htmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 导出为 Excel(HTML 表格形态的 .xls,Excel/WPS 可直接打开) */
export function toXLS(cols: string[], rows: Row[]): string {
  const head = "<tr>" + cols.map((c) => `<th>${htmlEscape(c)}</th>`).join("") + "</tr>";
  const body = rows
    .map((r) => "<tr>" + cols.map((c) => `<td>${htmlEscape(cellText(r.values[c]))}</td>`).join("") + "</tr>")
    .join("");
  return `<html><head><meta charset="utf-8"></head><body><table border="1">${head}${body}</table></body></html>`;
}

/** 导出为完整 JSON 文档(fields + views + records) */
export function toJSONDoc(table: BaseTable): string {
  const records = table.rows.map((r) => ({ id: r.id, ...r.values }));
  const doc: { fields: Record<string, FieldDef>; views: unknown; records: unknown } = {
    fields: table.fields,
    views: table.views,
    records,
  };
  return JSON.stringify(doc, null, 2) + "\n";
}

function tsvEscape(s: string): string {
  return /[\t\n"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** 复制选中记录:纯文本 TSV + HTML 表格,粘贴到 Excel / 飞书 / WPS 都能自动分格(不含表头) */
export function toClipboard(cols: string[], rows: Row[]): { text: string; html: string } {
  const text = rows.map((r) => cols.map((c) => tsvEscape(cellText(r.values[c]))).join("\t")).join("\n");
  const html =
    "<table>" +
    rows.map((r) => "<tr>" + cols.map((c) => `<td>${htmlEscape(cellText(r.values[c]))}</td>`).join("") + "</tr>").join("") +
    "</table>";
  return { text, html };
}
