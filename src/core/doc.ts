// 文档的解析 / 序列化 / 转成界面用的表格形态。纯函数,不碰文件系统,VS Code 与 Obsidian 共用。
import { BaseDoc, BaseTable, FilterCond, Row, SortSpec, ViewDef } from "./types";

/** 支持的扩展名:.wbase 为主,.base 为旧版(VS Code 继续兼容) */
export const EXTENSIONS = ["wbase", "base"] as const;
export const isTableFile = (name: string): boolean => /\.(wbase|base)$/i.test(name);

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

/** 空白文本视为空表;缺失的部分用空壳兜底 */
export function emptyDoc(): BaseDoc {
  return { fields: {}, views: [], records: [] };
}

/**
 * 解析文件文本为文档。strict=true 时 JSON 语法错误会抛出(Obsidian 用来避免把坏文件覆盖成空表);
 * 默认宽松,解析失败返回空文档。
 */
export function parseDoc(text: string, strict = false): BaseDoc {
  const raw = text.trim();
  if (!raw) return emptyDoc();
  let doc: Partial<BaseDoc>;
  try {
    doc = JSON.parse(raw) as Partial<BaseDoc>;
  } catch (err) {
    if (strict) throw err;
    return emptyDoc();
  }
  return {
    fields: doc.fields && typeof doc.fields === "object" ? doc.fields : {},
    views: Array.isArray(doc.views) ? doc.views : [],
    records: Array.isArray(doc.records) ? doc.records : [],
  };
}

/** 序列化:缩进 2、末尾换行,git 友好 */
export function serializeDoc(doc: BaseDoc): string {
  return JSON.stringify(doc, null, 2) + "\n";
}

/** 文档 → 界面用的表格。缺视图时用「全部」视图兜底 */
export function toTable(doc: BaseDoc, path: string): BaseTable {
  let views = doc.views.map(normalizeView);
  if (views.length === 0) views = [{ name: "全部" }];
  const rows: Row[] = doc.records.map((rec, i) => {
    const { id, ...values } = rec as { id?: unknown } & Record<string, unknown>;
    return { id: typeof id === "string" && id ? id : `_row${i}`, values };
  });
  return { path, fields: doc.fields, views, rows };
}

/** 新建表格的起始内容:一个主字段 + 一个带配色的状态字段 + 「全部」视图 */
export function starterDoc(): BaseDoc {
  return {
    fields: {
      标题: { type: "text", primary: true },
      状态: {
        type: "select",
        options: ["待办", "进行中", "已完成"],
        colors: { 待办: "gray", 进行中: "blue", 已完成: "green" },
      },
    },
    views: [{ name: "全部" }],
    records: [],
  };
}
