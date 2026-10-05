import * as fs from "fs";
import { BaseDoc, FieldDef, ViewDef, genId, primaryField } from "./types";
import { readDoc } from "./reader";

/** 原子写:写临时文件再 rename,避免写坏 */
function atomicWrite(file: string, content: string): void {
  const tmp = file + ".tmp-" + process.pid + "-" + Date.now();
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, file);
}

/** 把整个文档格式化写回(缩进 2,末尾换行,git 友好) */
function writeDoc(file: string, doc: BaseDoc): void {
  atomicWrite(file, JSON.stringify(doc, null, 2) + "\n");
}

/** 找某条记录,返回其在 records 里的下标(未找到返回 -1) */
function indexOf(doc: BaseDoc, id: string): number {
  return doc.records.findIndex((r) => r["id"] === id);
}

/**
 * 更新单条记录的某个字段。value 为 null/undefined/空串时删除该键,保持记录整洁。
 * 主字段只是普通字段,改值不影响记录 id。
 */
export function updateCell(file: string, id: string, field: string, value: unknown): void {
  const doc = readDoc(file);
  const i = indexOf(doc, id);
  if (i < 0) return;
  if (value == null || value === "") delete doc.records[i][field];
  else doc.records[i][field] = value;
  writeDoc(file, doc);
}

/** 新增一条记录,返回新记录 id */
export function addRow(file: string, values: Record<string, unknown> = {}): string {
  const doc = readDoc(file);
  const id = genId();
  const rec: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(values)) {
    if (v != null && v !== "") rec[k] = v;
  }
  doc.records.push(rec);
  writeDoc(file, doc);
  return id;
}

/** 删除一条记录 */
export function deleteRow(file: string, id: string): void {
  const doc = readDoc(file);
  const i = indexOf(doc, id);
  if (i < 0) return;
  doc.records.splice(i, 1);
  writeDoc(file, doc);
}

/** 写回视图配置 */
export function saveViews(file: string, views: ViewDef[]): void {
  const doc = readDoc(file);
  doc.views = views;
  writeDoc(file, doc);
}

// ---------- 字段(列)操作 ----------

function renameInViews(views: ViewDef[], oldName: string, newName: string): void {
  for (const v of views ?? []) {
    for (const c of v.filters ?? []) if (c.field === oldName) c.field = newName;
    for (const s of v.sorts ?? []) if (s.field === oldName) s.field = newName;
    if (v.group?.field === oldName) v.group.field = newName;
    if (v.hiddenCols) v.hiddenCols = v.hiddenCols.map((c) => (c === oldName ? newName : c));
    if (v.colWidths && oldName in v.colWidths) {
      v.colWidths[newName] = v.colWidths[oldName];
      delete v.colWidths[oldName];
    }
  }
}

function removeFromViews(views: ViewDef[], name: string): void {
  for (const v of views ?? []) {
    if (v.filters) v.filters = v.filters.filter((c) => c.field !== name);
    if (v.sorts) v.sorts = v.sorts.filter((s) => s.field !== name);
    if (v.group?.field === name) delete v.group;
    if (v.hiddenCols) v.hiddenCols = v.hiddenCols.filter((c) => c !== name);
    if (v.colWidths) delete v.colWidths[name];
  }
}

/** 改字段属性(type/options/colors/align 等);传 undefined 的键会被删除 */
export function setField(file: string, name: string, patch: Partial<FieldDef>): void {
  const doc = readDoc(file);
  const merged: Record<string, unknown> = { ...(doc.fields[name] ?? {}), ...patch };
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
  doc.fields[name] = merged as unknown as FieldDef;
  writeDoc(file, doc);
}

/** 字段改名:schema key(保序)+ 视图引用 + 所有记录的键 */
export function renameField(file: string, oldName: string, newName: string): void {
  if (!newName || oldName === newName) return;
  const doc = readDoc(file);
  if (newName in doc.fields) throw new Error(`已存在字段「${newName}」`);
  const next: Record<string, FieldDef> = {};
  for (const [k, v] of Object.entries(doc.fields)) next[k === oldName ? newName : k] = v;
  doc.fields = next;
  renameInViews(doc.views, oldName, newName);
  for (const rec of doc.records) {
    if (oldName in rec) {
      rec[newName] = rec[oldName];
      delete rec[oldName];
    }
  }
  writeDoc(file, doc);
}

/** 新增字段,可选插入在 after 字段之后(否则末尾),返回去重后的字段名 */
export function addField(file: string, name: string, def: FieldDef, after?: string): string {
  const doc = readDoc(file);
  let unique = name;
  let n = 2;
  while (unique in doc.fields) unique = `${name} ${n++}`;
  const next: Record<string, FieldDef> = {};
  let inserted = false;
  for (const [k, v] of Object.entries(doc.fields)) {
    next[k] = v;
    if (k === after) {
      next[unique] = def;
      inserted = true;
    }
  }
  if (!inserted) next[unique] = def;
  doc.fields = next;
  writeDoc(file, doc);
  return unique;
}

/** 用整份文档覆盖写入(撤销/重做用) */
export function replaceAll(file: string, doc: Partial<BaseDoc>): void {
  writeDoc(file, {
    fields: doc.fields ?? {},
    views: Array.isArray(doc.views) ? doc.views : [],
    records: Array.isArray(doc.records) ? doc.records : [],
  });
}

/** 按给定名字顺序重排字段;未列出的字段按原顺序追加末尾 */
export function reorderFields(file: string, names: string[]): void {
  const doc = readDoc(file);
  const next: Record<string, FieldDef> = {};
  for (const n of names) if (doc.fields[n] && !(n in next)) next[n] = doc.fields[n];
  for (const [k, v] of Object.entries(doc.fields)) if (!(k in next)) next[k] = v;
  doc.fields = next;
  writeDoc(file, doc);
}

/** 交换两条记录在 records 里的位置(用于上下移动行) */
export function moveRow(file: string, id: string, targetId: string): void {
  const doc = readDoc(file);
  const i = indexOf(doc, id);
  const j = doc.records.findIndex((r) => r["id"] === targetId);
  if (i < 0 || j < 0) return;
  [doc.records[i], doc.records[j]] = [doc.records[j], doc.records[i]];
  writeDoc(file, doc);
}

/** 把一条记录移动到目标记录所在位置;before=true 插在目标之前,否则之后(用于拖拽排序) */
export function moveRowTo(file: string, id: string, targetId: string, before = true): void {
  const doc = readDoc(file);
  const i = indexOf(doc, id);
  if (i < 0 || id === targetId) return;
  const [rec] = doc.records.splice(i, 1);
  const j = doc.records.findIndex((r) => r["id"] === targetId);
  if (j < 0) {
    doc.records.splice(i, 0, rec); // 目标不存在,放回原位
    return;
  }
  doc.records.splice(before ? j : j + 1, 0, rec);
  writeDoc(file, doc);
}

/** 复制字段:在原字段后插入一个带「副本」后缀的同类型字段,并连带复制所有记录的值 */
export function duplicateField(file: string, name: string): string {
  const doc = readDoc(file);
  const src = doc.fields[name];
  if (!src) return name;
  let unique = `${name} 副本`;
  let n = 2;
  while (unique in doc.fields) unique = `${name} 副本 ${n++}`;
  const copy: FieldDef = { ...src };
  delete copy.primary; // 副本不能是主字段
  const next: Record<string, FieldDef> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    next[k] = v;
    if (k === name) next[unique] = copy;
  }
  doc.fields = next;
  for (const rec of doc.records) if (name in rec) rec[unique] = rec[name];
  writeDoc(file, doc);
  return unique;
}

/** 删除字段:schema + 视图引用 + 所有记录的键(主字段不可删) */
export function deleteField(file: string, name: string): void {
  const doc = readDoc(file);
  if (doc.fields[name]?.primary) throw new Error("主字段不可删除");
  delete doc.fields[name];
  removeFromViews(doc.views, name);
  for (const rec of doc.records) delete rec[name];
  writeDoc(file, doc);
}

/** 主字段名(供 panel 等使用) */
export { primaryField };
