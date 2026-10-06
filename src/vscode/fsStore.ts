// VS Code 侧的文件读写:读文件 → 调 core 的纯函数 → 原子写回。对外保持原来按文件路径调用的接口。
import * as fs from "fs";
import { BaseDoc, BaseTable, FieldDef, ViewDef } from "../core/types";
import { parseDoc, serializeDoc, toTable } from "../core/doc";
import * as ops from "../core/ops";

export function readDoc(file: string): BaseDoc {
  let raw = "";
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    raw = "";
  }
  return parseDoc(raw);
}

export function readBase(file: string): BaseTable {
  return toTable(readDoc(file), file);
}

/** 原子写:写临时文件再 rename,避免写坏 */
export function writeDoc(file: string, doc: BaseDoc): void {
  const tmp = file + ".tmp-" + process.pid + "-" + Date.now();
  fs.writeFileSync(tmp, serializeDoc(doc), "utf8");
  fs.renameSync(tmp, file);
}

/** 读 → 改 → 写,返回操作的返回值 */
function mutate<T>(file: string, fn: (doc: BaseDoc) => T): T {
  const doc = readDoc(file);
  const out = fn(doc);
  writeDoc(file, doc);
  return out;
}

export const updateCell = (file: string, id: string, field: string, value: unknown) =>
  mutate(file, (d) => ops.updateCell(d, id, field, value));
export const addRow = (file: string, values: Record<string, unknown> = {}) => mutate(file, (d) => ops.addRow(d, values));
export const deleteRow = (file: string, id: string) => mutate(file, (d) => ops.deleteRow(d, id));
export const saveViews = (file: string, views: ViewDef[]) => mutate(file, (d) => ops.saveViews(d, views));
export const setField = (file: string, name: string, patch: Partial<FieldDef>) => mutate(file, (d) => ops.setField(d, name, patch));
export const renameField = (file: string, oldName: string, newName: string) =>
  mutate(file, (d) => ops.renameField(d, oldName, newName));
export const addField = (file: string, name: string, def: FieldDef, after?: string) =>
  mutate(file, (d) => ops.addField(d, name, def, after));
export const replaceAll = (file: string, next: Partial<BaseDoc>) => mutate(file, (d) => ops.replaceAll(d, next));
export const reorderFields = (file: string, names: string[]) => mutate(file, (d) => ops.reorderFields(d, names));
export const moveRow = (file: string, id: string, targetId: string) => mutate(file, (d) => ops.moveRow(d, id, targetId));
export const moveRowTo = (file: string, id: string, targetId: string, before = true) =>
  mutate(file, (d) => ops.moveRowTo(d, id, targetId, before));
export const duplicateField = (file: string, name: string) => mutate(file, (d) => ops.duplicateField(d, name));
export const deleteField = (file: string, name: string) => mutate(file, (d) => ops.deleteField(d, name));
