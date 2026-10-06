// .base 多维表格的核心数据类型
//
// 底层存储:一个 .base 文件就是一个 JSON 文档,结构为
//   { fields: {...}, views: [...], records: [...] }
// records 里每条是扁平对象:{ id, 字段名: 值, ... },Agent 可整文件 JSON.parse 读取。

export type FieldType =
  | "text"
  | "longtext"
  | "select"
  | "multi"
  | "date"
  | "number"
  | "checkbox"
  | "link";

/** 日期显示格式 */
export type DateFormat = "iso" | "slash" | "us" | "cn" | "cn-short";
/** 数字显示样式 */
export type NumberStyle = "plain" | "percent" | "currency";

export interface FieldDef {
  type: FieldType;
  /** 主字段:每张表一个,作为记录的标题列,不可删除 */
  primary?: boolean;
  /** select / multi 的可选项 */
  options?: string[];
  /** select / multi 选项颜色:{选项: 颜色名} */
  colors?: Record<string, string>;
  /** 单元格对齐:left(默认)/ center / right */
  align?: "left" | "center" | "right";
  /** date:日期显示格式,默认 iso(YYYY-MM-DD) */
  dateFormat?: DateFormat;
  /** number:显示样式,默认 plain */
  numberStyle?: NumberStyle;
  /** number:小数位数(0-4),不设则原样 */
  precision?: number;
  /** number(currency):货币符号,默认 ¥ */
  currency?: string;
  /** number:是否使用千分位分隔,默认 false */
  thousands?: boolean;
}

export interface FilterCond {
  field: string;
  /** 操作符,随字段类型不同:contains/notContains/is/isNot/empty/notEmpty/before/after/eq/ne/gt/lt/gte/lte/checked/unchecked */
  op: string;
  value?: unknown;
}

export interface SortSpec {
  field: string;
  dir: "asc" | "desc";
}

export interface GroupSpec {
  field: string;
}

export interface ViewDef {
  name: string;
  /** 多条件筛选 */
  filters?: FilterCond[];
  /** 条件关系:all=全部满足(AND),any=任一满足(OR);默认 all */
  filterMatch?: "all" | "any";
  /** 多字段依次排序 */
  sorts?: SortSpec[];
  /** 按字段分组 */
  group?: GroupSpec;
  /** 当前视图隐藏的列 */
  hiddenCols?: string[];
  /** 列宽(字段名 → px) */
  colWidths?: Record<string, number>;
  /** 冻结前 N 列 */
  frozen?: number;
  /** 向后兼容:旧的字符串写法 */
  filter?: string;
  sort?: string;
}

export interface Row {
  /** 记录的稳定标识(主字段值会变、可能重复,行标识不能靠它) */
  id: string;
  /** 字段值(不含 id) */
  values: Record<string, unknown>;
}

export interface BaseTable {
  /** .base 文件绝对路径 */
  path: string;
  fields: Record<string, FieldDef>;
  views: ViewDef[];
  rows: Row[];
}

/** 磁盘上的 JSON 文档形态:records 为扁平对象数组(含 id) */
export interface BaseDoc {
  fields: Record<string, FieldDef>;
  views: ViewDef[];
  records: Record<string, unknown>[];
}

/** 取主字段名(primary:true 的字段);没有则返回 undefined */
export function primaryField(fields: Record<string, FieldDef>): string | undefined {
  for (const [name, def] of Object.entries(fields)) {
    if (def.primary) return name;
  }
  return undefined;
}

/** 生成一个短的、唯一的记录 id */
export function genId(): string {
  return "r_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}
