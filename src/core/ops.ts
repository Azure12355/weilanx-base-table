// 文档修改操作:入参是文档对象,原地修改。不碰文件系统,VS Code 与 Obsidian 共用。
import { BaseDoc, FieldDef, ViewDef, genId } from "./types";

function indexOf(doc: BaseDoc, id: string): number {
  return doc.records.findIndex((r) => r["id"] === id);
}

/** 改单条记录的某个字段。value 为 null/undefined/空串时删除该键,保持记录整洁 */
export function updateCell(doc: BaseDoc, id: string, field: string, value: unknown): void {
  const i = indexOf(doc, id);
  if (i < 0) return;
  if (value == null || value === "") delete doc.records[i][field];
  else doc.records[i][field] = value;
}

/** 新增一条记录,返回新记录 id */
export function addRow(doc: BaseDoc, values: Record<string, unknown> = {}): string {
  const taken = new Set(doc.records.map((r) => r["id"]));
  let id = genId();
  while (taken.has(id)) id = genId();
  const rec: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(values)) {
    if (v != null && v !== "") rec[k] = v;
  }
  doc.records.push(rec);
  return id;
}

export function deleteRow(doc: BaseDoc, id: string): void {
  const i = indexOf(doc, id);
  if (i >= 0) doc.records.splice(i, 1);
}

export function saveViews(doc: BaseDoc, views: ViewDef[]): void {
  doc.views = views;
}

// ---------- 字段(列) ----------

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
export function setField(doc: BaseDoc, name: string, patch: Partial<FieldDef>): void {
  const merged: Record<string, unknown> = { ...(doc.fields[name] ?? {}), ...patch };
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
  doc.fields[name] = merged as unknown as FieldDef;
}

/** 字段改名:schema key(保序)+ 视图引用 + 所有记录的键 */
export function renameField(doc: BaseDoc, oldName: string, newName: string): void {
  if (!newName || oldName === newName) return;
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
}

/** 新增字段,可选插入在 after 字段之后(否则末尾),返回去重后的字段名 */
export function addField(doc: BaseDoc, name: string, def: FieldDef, after?: string): string {
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
  return unique;
}

/** 整份覆盖(撤销/重做用) */
export function replaceAll(doc: BaseDoc, next: Partial<BaseDoc>): void {
  doc.fields = next.fields ?? {};
  doc.views = Array.isArray(next.views) ? next.views : [];
  doc.records = Array.isArray(next.records) ? next.records : [];
}

/** 按给定名字顺序重排字段;未列出的字段按原顺序追加末尾 */
export function reorderFields(doc: BaseDoc, names: string[]): void {
  const next: Record<string, FieldDef> = {};
  for (const n of names) if (doc.fields[n] && !(n in next)) next[n] = doc.fields[n];
  for (const [k, v] of Object.entries(doc.fields)) if (!(k in next)) next[k] = v;
  doc.fields = next;
}

/** 交换两条记录的位置 */
export function moveRow(doc: BaseDoc, id: string, targetId: string): void {
  const i = indexOf(doc, id);
  const j = indexOf(doc, targetId);
  if (i < 0 || j < 0) return;
  [doc.records[i], doc.records[j]] = [doc.records[j], doc.records[i]];
}

/** 把一条记录移到目标记录处;before=true 插在目标之前,否则之后 */
export function moveRowTo(doc: BaseDoc, id: string, targetId: string, before = true): void {
  const i = indexOf(doc, id);
  if (i < 0 || id === targetId) return;
  const [rec] = doc.records.splice(i, 1);
  const j = indexOf(doc, targetId);
  if (j < 0) {
    doc.records.splice(i, 0, rec);
    return;
  }
  doc.records.splice(before ? j : j + 1, 0, rec);
}

/** 复制字段:原字段后插入「副本」,连带复制所有记录的值;副本不是主字段 */
export function duplicateField(doc: BaseDoc, name: string): string {
  const src = doc.fields[name];
  if (!src) return name;
  let unique = `${name} 副本`;
  let n = 2;
  while (unique in doc.fields) unique = `${name} 副本 ${n++}`;
  const copy: FieldDef = { ...src };
  delete copy.primary;
  const next: Record<string, FieldDef> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    next[k] = v;
    if (k === name) next[unique] = copy;
  }
  doc.fields = next;
  for (const rec of doc.records) if (name in rec) rec[unique] = rec[name];
  return unique;
}

/** 删除字段:schema + 视图引用 + 所有记录的键(主字段不可删) */
export function deleteField(doc: BaseDoc, name: string): void {
  if (doc.fields[name]?.primary) throw new Error("主字段不可删除");
  delete doc.fields[name];
  removeFromViews(doc.views, name);
  for (const rec of doc.records) delete rec[name];
}
