import type { DateFormat, FieldDef } from "../../src/core/types";

/** 把数字按字段配置格式化成显示文本 */
export function formatNumber(value: unknown, def: FieldDef): string {
  if (value == null || value === "") return "";
  let n = Number(value);
  if (!isFinite(n)) return String(value);

  const style = def.numberStyle ?? "plain";
  if (style === "percent") n = n * 100;

  let body: string;
  if (def.precision != null && def.precision >= 0) {
    body = n.toFixed(def.precision);
  } else {
    body = String(n);
  }
  if (def.thousands) {
    const [int, dec] = body.split(".");
    const sign = int.startsWith("-") ? "-" : "";
    const digits = sign ? int.slice(1) : int;
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    body = sign + grouped + (dec ? "." + dec : "");
  }

  if (style === "percent") return body + "%";
  if (style === "currency") return (def.currency || "¥") + body;
  return body;
}

const PAD = (n: number) => String(n).padStart(2, "0");
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/** 把 YYYY-MM-DD 字符串按格式显示 */
export function formatDate(value: unknown, fmt: DateFormat = "iso"): string {
  const s = value ? String(value).slice(0, 10) : "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  const [, y, mo, d] = m;
  switch (fmt) {
    case "slash":
      return `${y}/${mo}/${d}`;
    case "us":
      return `${mo}/${d}/${y}`;
    case "cn":
      return `${y}年${Number(mo)}月${Number(d)}日`;
    case "cn-short":
      return `${Number(mo)}月${Number(d)}日`;
    case "iso":
    default:
      return `${y}-${mo}-${d}`;
  }
}

/** 带星期(供可选展示) */
export function weekdayOf(value: unknown): string {
  const s = value ? String(value).slice(0, 10) : "";
  const t = Date.parse(s);
  if (isNaN(t)) return "";
  return "周" + WEEK[new Date(t).getDay()];
}
