// [[笔记]] 链接:解析单元格值、笔记改名时批量替换。纯函数。
import { BaseDoc } from "./types";

/** 单元格值整体是 [[目标]] / [[目标|显示]] / [[目标#标题]] 时返回目标与显示文字 */
export function parseWikiLink(value: unknown): { target: string; label: string } | null {
  if (typeof value !== "string") return null;
  const m = value.trim().match(/^\[\[([^\]|]+?)(\|([^\]]+))?\]\]$/);
  if (!m) return null;
  const target = m[1].trim();
  return { target, label: (m[3] ?? target).trim() };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * 笔记改名:把文档里所有字符串值中的 [[旧名]]、[[旧名|…]]、[[旧名#…]] 换成新名。
 * 只替换完整的链接目标,不会误伤 [[旧名续集]] 这类前缀相同的名字。返回替换次数。
 */
export function renameLinks(doc: BaseDoc, oldName: string, newName: string): number {
  if (!oldName || oldName === newName) return 0;
  const re = new RegExp(`\\[\\[${escapeRe(oldName)}(?=[\\]|#])`, "g");
  let count = 0;
  const swap = (s: string): string =>
    s.replace(re, () => {
      count++;
      return `[[${newName}`;
    });
  for (const rec of doc.records) {
    for (const [k, v] of Object.entries(rec)) {
      if (k === "id") continue;
      if (typeof v === "string" && v.includes("[[")) rec[k] = swap(v);
      else if (Array.isArray(v)) rec[k] = v.map((x) => (typeof x === "string" && x.includes("[[") ? swap(x) : x));
    }
  }
  return count;
}
