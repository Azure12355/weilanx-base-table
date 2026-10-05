import * as fs from "fs";
import { BaseDoc, BaseTable, FieldDef, FilterCond, Row, SortSpec, ViewDef } from "./types";

/** 把旧的字符串 filter/sort 升级成结构化,保证前端只处理结构化形态 */
export function normalizeView(view: ViewDef): ViewDef {
  const out: ViewDef = { ...view };
  if (!out.filters && typeof out.filter === "string") {
    const m = out.filter.match(/^(.+?)\s*(!=|=|包含)\s*(.+)$/);
    if (m) {
      const op = m[2] === "=" ? "is" : m[2] === "!=" ? "isNot" : "contains";
      out.filters = [{ field: m[1].trim(), op, value: m[3].trim() } as FilterCond];
    }
  }
  if (!out.sorts && typeof out.sort === "string") {
    const parts = out.sort.trim().split(/\s+/);
    out.sorts = [{ field: parts[0], dir: parts[1] === "desc" ? "desc" : "asc" } as SortSpec];
  }
  delete out.filter;
  delete out.sort;
  return out;
}

/** 解析一个 .base 文件为磁盘文档形态,缺字段用空壳兜底。 */
export function readDoc(file: string): BaseDoc {
  let raw = "";
  try {
    raw = fs.readFileSync(file, "utf8").trim();
  } catch {
    raw = "";
  }
  let doc: Partial<BaseDoc> = {};
  if (raw) {
    try {
      doc = JSON.parse(raw) as Partial<BaseDoc>;
    } catch {
      doc = {};
    }
  }
  return {
    fields: doc.fields ?? {},
    views: Array.isArray(doc.views) ? doc.views : [],
    records: Array.isArray(doc.records) ? doc.records : [],
  };
}

/** 读取一个 .base 文件为 BaseTable。缺视图时用「全部」视图兜底。 */
export function readBase(file: string): BaseTable {
  const doc = readDoc(file);
  const fields: Record<string, FieldDef> = doc.fields;
  let views = doc.views.map(normalizeView);
  if (views.length === 0) views = [{ name: "全部" }];

  const rows: Row[] = doc.records.map((rec, i) => {
    const { id, ...values } = rec as { id?: unknown } & Record<string, unknown>;
    return { id: typeof id === "string" && id ? id : `_row${i}`, values };
  });

  return { path: file, fields, views, rows };
}
