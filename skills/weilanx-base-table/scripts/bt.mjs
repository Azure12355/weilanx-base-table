#!/usr/bin/env node
// bt.mjs: zero-dependency CLI for Weilanx Base Table files (.base / .wbase, plain JSON).
// Keeps the same invariants as the VS Code / Obsidian plugin:
//   stable record ids, empty values omitted, field renames propagated, atomic 2-space writes.
// Run `node bt.mjs help` for usage.

import fs from "node:fs";
import path from "node:path";

const TYPES = ["text", "longtext", "select", "multi", "date", "number", "checkbox", "link"];
const COLORS = ["blue", "green", "orange", "purple", "red", "yellow", "gray", "grey"];
const OPS = {
  text: ["contains", "notContains", "is", "isNot", "empty", "notEmpty"],
  longtext: ["contains", "notContains", "is", "isNot", "empty", "notEmpty"],
  link: ["contains", "notContains", "is", "isNot", "empty", "notEmpty"],
  select: ["is", "isNot", "empty", "notEmpty"],
  multi: ["contains", "notContains", "empty", "notEmpty"],
  date: ["is", "before", "after", "empty", "notEmpty"],
  number: ["eq", "ne", "gt", "lt", "gte", "lte", "empty", "notEmpty"],
  checkbox: ["checked", "unchecked"],
};
const NO_VALUE_OPS = new Set(["empty", "notEmpty", "checked", "unchecked"]);
// 允许在 --where 里用符号简写
const OP_ALIASES = { "=": "is", "==": "is", "!=": "isNot", "~": "contains", "!~": "notContains", ">": "gt", "<": "lt", ">=": "gte", "<=": "lte" };

// ---------------------------------------------------------------- io

function die(msg) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(1);
}

function readDoc(file) {
  if (!fs.existsSync(file)) die(`file not found: ${file}`);
  const raw = fs.readFileSync(file, "utf8").trim();
  let doc = {};
  if (raw) {
    try {
      doc = JSON.parse(raw);
    } catch (e) {
      die(`${file} is not valid JSON: ${e.message}`);
    }
  }
  return {
    fields: doc.fields && typeof doc.fields === "object" ? doc.fields : {},
    views: Array.isArray(doc.views) ? doc.views : [],
    records: Array.isArray(doc.records) ? doc.records : [],
  };
}

function writeDoc(file, doc) {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(doc, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

function genId(taken) {
  let id;
  do id = "r_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  while (taken.has(id));
  taken.add(id);
  return id;
}

const primaryOf = (fields) => Object.keys(fields).find((k) => fields[k]?.primary);

// ---------------------------------------------------------------- args

function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      const val = next === undefined || next.startsWith("--") ? true : (i++, next);
      (opts[key] ??= []).push(val);
    } else pos.push(a);
  }
  const one = (k) => (opts[k] ? opts[k][opts[k].length - 1] : undefined);
  const all = (k) => opts[k] ?? [];
  return { pos, one, all, has: (k) => k in opts };
}

// "字段=值" → [字段, 值];字段名可含空格,只按第一个 = 切
function splitAssign(s) {
  const i = s.indexOf("=");
  if (i <= 0) die(`expected field=value, got: ${s}`);
  return [s.slice(0, i).trim(), s.slice(i + 1)];
}

// ---------------------------------------------------------------- values

function truthy(s) {
  return ["true", "1", "yes", "y", "是", "✓", "x", "checked"].includes(String(s).trim().toLowerCase());
}

function normDate(s) {
  const t = String(s).trim();
  if (!t) return "";
  const m = t.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
  if (!m) die(`invalid date "${t}" (use YYYY-MM-DD)`);
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** 把用户给的值按字段类型转换;返回 undefined 表示清空 */
function coerce(def, raw, fieldName, warnings) {
  if (raw === null || raw === undefined) return undefined;
  const type = def?.type ?? "text";
  if (typeof raw === "string" && raw.trim() === "" && type !== "checkbox") return undefined;
  switch (type) {
    case "number": {
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[,，\s]/g, ""));
      if (Number.isNaN(n)) die(`field "${fieldName}" is a number, got "${raw}"`);
      return n;
    }
    case "checkbox":
      return typeof raw === "boolean" ? raw : truthy(raw);
    case "date":
      return normDate(raw) || undefined;
    case "multi": {
      const arr = Array.isArray(raw) ? raw.map(String) : String(raw).split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
      for (const v of arr) ensureOption(def, v, fieldName, warnings);
      return arr.length ? [...new Set(arr)] : undefined;
    }
    case "select": {
      const v = String(raw).trim();
      ensureOption(def, v, fieldName, warnings);
      return v;
    }
    default:
      return String(raw);
  }
}

function ensureOption(def, v, fieldName, warnings) {
  def.options ??= [];
  if (!def.options.includes(v)) {
    def.options.push(v);
    warnings.push(`added option "${v}" to field "${fieldName}"`);
  }
}

function setValue(rec, field, value) {
  if (value === undefined) delete rec[field];
  else rec[field] = value;
}

// ---------------------------------------------------------------- filters

function parseWhere(expr, fields) {
  // 形式:字段 op 值 / 字段 op;op 可以是名字(contains)或符号(= != ~ > ...)
  // 字段名可能含空格或括号,按最长匹配,且字段名后必须紧跟空格、符号或结尾
  const names = Object.keys(fields).sort((a, b) => b.length - a.length);
  const field = names.find((n) => expr.startsWith(n) && (expr.length === n.length || /^[\s=!~<>]/.test(expr.slice(n.length))));
  if (!field) die(`--where "${expr}": unknown field. Fields: ${Object.keys(fields).join(", ")}`);
  const rest = expr.slice(field.length).trim();
  const m = rest.match(/^(>=|<=|!=|!~|==|=|~|>|<|[A-Za-z]+)\s*(.*)$/);
  if (!m) die(`--where "${expr}": expected "<field> <op> <value>"`);
  const op = OP_ALIASES[m[1]] ?? m[1];
  const allowed = OPS[fields[field].type] ?? OPS.text;
  if (!allowed.includes(op)) die(`--where "${expr}": op "${op}" not valid for ${fields[field].type} field. Use: ${allowed.join(", ")}`);
  const cond = { field, op };
  if (!NO_VALUE_OPS.has(op)) cond.value = fields[field].type === "number" ? Number(m[2]) : m[2];
  return cond;
}

const str = (x) => String(x ?? "");
function evalCond(rec, c) {
  const val = rec[c.field];
  const t = c.value;
  const empty = val == null || val === "" || (Array.isArray(val) && val.length === 0);
  switch (c.op) {
    case "empty": return empty;
    case "notEmpty": return !empty;
    case "checked": return val === true;
    case "unchecked": return val !== true;
    case "is": return Array.isArray(val) ? val.map(str).includes(str(t)) : str(val) === str(t);
    case "isNot": return Array.isArray(val) ? !val.map(str).includes(str(t)) : str(val) !== str(t);
    case "contains": return Array.isArray(val) ? val.map(str).includes(str(t)) : str(val).includes(str(t));
    case "notContains": return Array.isArray(val) ? !val.map(str).includes(str(t)) : !str(val).includes(str(t));
    case "before": return str(val) !== "" && str(val) < str(t);
    case "after": return str(val) !== "" && str(val) > str(t);
    case "eq": return !empty && Number(val) === Number(t);
    case "ne": return Number(val) !== Number(t);
    case "gt": return !empty && Number(val) > Number(t);
    case "lt": return !empty && Number(val) < Number(t);
    case "gte": return !empty && Number(val) >= Number(t);
    case "lte": return !empty && Number(val) <= Number(t);
    default: return true;
  }
}

function sortRecords(recs, sorts, fields) {
  return [...recs].sort((a, b) => {
    for (const s of sorts) {
      const av = a[s.field], bv = b[s.field];
      const ae = av == null || av === "", be = bv == null || bv === "";
      // 空值无论升序降序都排在最后
      if (ae || be) { if (ae && be) continue; return ae ? 1 : -1; }
      const r = fields[s.field]?.type === "number" ? Number(av) - Number(bv) : str(av).localeCompare(str(bv), "zh");
      if (r !== 0) return s.dir === "desc" ? -r : r;
    }
    return 0;
  });
}

function parseSort(s, fields) {
  const [f, d] = s.split(":");
  if (!fields[f]) die(`--sort: unknown field "${f}"`);
  return { field: f, dir: d === "desc" ? "desc" : "asc" };
}

/** 选中记录:--view 的条件 + --where 追加条件;--any 改为 OR */
function select(doc, a) {
  let conds = [];
  let match = "all";
  let sorts = [];
  const viewName = a.one("view");
  if (viewName) {
    const v = doc.views.find((x) => x.name === viewName);
    if (!v) die(`view "${viewName}" not found. Views: ${doc.views.map((x) => x.name).join(", ")}`);
    conds = [...(v.filters ?? [])].filter((c) => c.field);
    match = v.filterMatch === "any" ? "any" : "all";
    sorts = [...(v.sorts ?? [])];
  }
  for (const w of a.all("where")) conds.push(parseWhere(String(w), doc.fields));
  if (a.has("any")) match = "any";
  let out = doc.records.filter((r) => !conds.length || (match === "any" ? conds.some((c) => evalCond(r, c)) : conds.every((c) => evalCond(r, c))));
  if (a.all("sort").length) sorts = a.all("sort").map((s) => parseSort(String(s), doc.fields));
  if (sorts.length) out = sortRecords(out, sorts, doc.fields);
  return out;
}

// ---------------------------------------------------------------- output

function cellText(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (v === true) return "✓";
  if (v === false) return "";
  return String(v);
}

function printRecords(recs, cols, format) {
  recs = recs.map((r) => {
    const o = { id: r.id };
    for (const c of cols) if (c in r) o[c] = r[c];
    return o;
  });
  if (format === "json") return console.log(JSON.stringify(recs, null, 2));
  if (format === "jsonl") return recs.forEach((r) => console.log(JSON.stringify(r)));
  const head = ["id", ...cols];
  if (format === "csv") {
    const esc = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    console.log(head.map(esc).join(","));
    for (const r of recs) console.log(head.map((c) => esc(cellText(r[c]))).join(","));
    return;
  }
  // markdown table(默认,对 Agent 和人都好读)
  const esc = (s) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  console.log("| " + head.map(esc).join(" | ") + " |");
  console.log("|" + head.map(() => " --- ").join("|") + "|");
  for (const r of recs) console.log("| " + head.map((c) => esc(cellText(r[c]))).join(" | ") + " |");
}

function visibleCols(doc, a) {
  const pick = a.one("fields");
  if (pick) {
    const cols = String(pick).split(",").map((s) => s.trim());
    for (const c of cols) if (!doc.fields[c]) die(`--fields: unknown field "${c}"`);
    return cols;
  }
  const viewName = a.one("view");
  const hidden = new Set(viewName ? doc.views.find((v) => v.name === viewName)?.hiddenCols ?? [] : []);
  return Object.keys(doc.fields).filter((f) => !hidden.has(f));
}

// ---------------------------------------------------------------- field schema parsing

/** "名称:类型[:选项1|选项2]" */
function parseFieldSpec(spec) {
  const [name, type = "text", opts] = spec.split(":");
  if (!name) die(`bad field spec "${spec}"`);
  if (!TYPES.includes(type)) die(`bad type "${type}" in "${spec}". Types: ${TYPES.join(", ")}`);
  const def = { type };
  if (opts && (type === "select" || type === "multi")) def.options = opts.split("|").filter(Boolean);
  return [name.trim(), def];
}

function parseColors(list) {
  const out = {};
  for (const s of list) {
    const [k, c] = splitAssign(String(s));
    if (!COLORS.includes(c)) die(`color "${c}" not allowed. Use: ${COLORS.join(", ")}`);
    out[k] = c;
  }
  return out;
}

// ---------------------------------------------------------------- csv

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ""));
}

// ---------------------------------------------------------------- validate

function validate(doc) {
  const errors = [], warnings = [];
  const prim = Object.keys(doc.fields).filter((k) => doc.fields[k]?.primary);
  if (prim.length === 0) warnings.push("no primary field (set primary:true on the title field)");
  if (prim.length > 1) errors.push(`more than one primary field: ${prim.join(", ")}`);
  for (const [name, def] of Object.entries(doc.fields)) {
    if (!TYPES.includes(def?.type)) errors.push(`field "${name}": invalid type "${def?.type}"`);
    if ((def.type === "select" || def.type === "multi") && def.options && !Array.isArray(def.options)) errors.push(`field "${name}": options must be an array`);
    for (const [opt, c] of Object.entries(def.colors ?? {})) {
      if (!COLORS.includes(c)) warnings.push(`field "${name}": color "${c}" for "${opt}" is not a known color`);
    }
  }
  const ids = new Set();
  doc.records.forEach((r, i) => {
    const where = `record #${i + 1}${r.id ? ` (${r.id})` : ""}`;
    if (typeof r.id !== "string" || !r.id) errors.push(`${where}: missing string id`);
    else if (ids.has(r.id)) errors.push(`${where}: duplicate id`);
    else ids.add(r.id);
    for (const [k, v] of Object.entries(r)) {
      if (k === "id") continue;
      const def = doc.fields[k];
      if (!def) { warnings.push(`${where}: key "${k}" is not a defined field`); continue; }
      if (v === null || v === "") warnings.push(`${where}: "${k}" is empty; omit the key instead`);
      else if (def.type === "number" && typeof v !== "number") errors.push(`${where}: "${k}" must be a number`);
      else if (def.type === "checkbox" && typeof v !== "boolean") errors.push(`${where}: "${k}" must be true/false`);
      else if (def.type === "multi" && !Array.isArray(v)) errors.push(`${where}: "${k}" must be an array`);
      else if (def.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) errors.push(`${where}: "${k}" must be YYYY-MM-DD`);
      if (def.type === "select" && def.options && !def.options.includes(String(v))) warnings.push(`${where}: "${k}" value "${v}" is not in options`);
      if (def.type === "multi" && Array.isArray(v) && def.options) for (const x of v) if (!def.options.includes(String(x))) warnings.push(`${where}: "${k}" value "${x}" is not in options`);
    }
  });
  doc.views.forEach((v) => {
    if (!v.name) errors.push("a view has no name");
    const refs = [...(v.filters ?? []).map((c) => c.field), ...(v.sorts ?? []).map((s) => s.field), v.group?.field, ...(v.hiddenCols ?? [])].filter(Boolean);
    for (const f of refs) if (!doc.fields[f]) errors.push(`view "${v.name}": references missing field "${f}"`);
    for (const c of v.filters ?? []) {
      const t = doc.fields[c.field]?.type;
      if (t && !(OPS[t] ?? []).includes(c.op)) warnings.push(`view "${v.name}": op "${c.op}" is unusual for ${t} field "${c.field}"`);
    }
  });
  const names = doc.views.map((v) => v.name);
  if (new Set(names).size !== names.length) warnings.push("duplicate view names");
  return { errors, warnings };
}

// ---------------------------------------------------------------- commands

function applySets(doc, rec, a, warnings) {
  for (const s of a.all("set")) {
    const [f, v] = splitAssign(String(s));
    if (!doc.fields[f]) die(`unknown field "${f}". Fields: ${Object.keys(doc.fields).join(", ")} (add it with field-add)`);
    setValue(rec, f, coerce(doc.fields[f], v, f, warnings));
  }
  const json = a.one("json");
  if (json) {
    let obj;
    try { obj = JSON.parse(String(json)); } catch (e) { die(`--json: ${e.message}`); }
    for (const [f, v] of Object.entries(obj)) {
      if (f === "id") continue;
      if (!doc.fields[f]) die(`unknown field "${f}"`);
      setValue(rec, f, coerce(doc.fields[f], v, f, warnings));
    }
  }
  for (const f of a.all("unset")) delete rec[String(f)];
}

function flushWarnings(w) {
  for (const x of w) process.stderr.write(`note: ${x}\n`);
}

const commands = {
  info(a) {
    const file = a.pos[0];
    const doc = readDoc(file);
    const prim = primaryOf(doc.fields);
    console.log(`# ${path.basename(file)}  (${doc.records.length} records)`);
    console.log("\n## Fields");
    for (const [n, d] of Object.entries(doc.fields)) {
      const extra = [];
      if (n === prim) extra.push("primary");
      if (d.options?.length) extra.push(`options: ${d.options.join(" | ")}`);
      if (d.numberStyle) extra.push(d.numberStyle);
      if (d.dateFormat) extra.push(`format ${d.dateFormat}`);
      console.log(`- ${n}: ${d.type}${extra.length ? `  (${extra.join("; ")})` : ""}`);
    }
    console.log("\n## Views");
    for (const v of doc.views) {
      const parts = [];
      if (v.filters?.length) parts.push("where " + v.filters.map((c) => `${c.field} ${c.op}${c.value !== undefined ? " " + c.value : ""}`).join(v.filterMatch === "any" ? " OR " : " AND "));
      if (v.sorts?.length) parts.push("sort " + v.sorts.map((s) => `${s.field} ${s.dir}`).join(", "));
      if (v.group) parts.push(`group by ${v.group.field}`);
      if (v.hiddenCols?.length) parts.push(`hide ${v.hiddenCols.join(", ")}`);
      console.log(`- ${v.name}${parts.length ? ": " + parts.join("; ") : ""}`);
    }
  },

  query(a) {
    const doc = readDoc(a.pos[0]);
    let recs = select(doc, a);
    const total = recs.length;
    const limit = a.one("limit");
    if (limit) recs = recs.slice(0, Number(limit));
    if (a.has("count")) return console.log(total);
    printRecords(recs, visibleCols(doc, a), a.one("format") ?? "md");
    if (limit && total > recs.length) process.stderr.write(`(showing ${recs.length} of ${total})\n`);
  },

  get(a) {
    const doc = readDoc(a.pos[0]);
    const r = doc.records.find((x) => x.id === a.pos[1]);
    if (!r) die(`record "${a.pos[1]}" not found`);
    console.log(JSON.stringify(r, null, 2));
  },

  add(a) {
    const file = a.pos[0];
    const doc = readDoc(file);
    const warnings = [];
    const taken = new Set(doc.records.map((r) => r.id));
    const rec = { id: genId(taken) };
    applySets(doc, rec, a, warnings);
    if (Object.keys(rec).length === 1 && !a.has("allow-empty")) die("nothing to add; pass --set field=value or --json '{...}'");
    doc.records.push(rec);
    writeDoc(file, doc);
    flushWarnings(warnings);
    console.log(rec.id);
  },

  update(a) {
    const file = a.pos[0];
    const doc = readDoc(file);
    const ids = a.pos.slice(1);
    let targets;
    if (ids.length) {
      targets = ids.map((id) => doc.records.find((r) => r.id === id) ?? die(`record "${id}" not found`));
    } else if (a.all("where").length) {
      targets = select(doc, a);
    } else die("update needs record ids or --where");
    const warnings = [];
    for (const r of targets) applySets(doc, r, a, warnings);
    writeDoc(file, doc);
    flushWarnings(warnings);
    console.log(`updated ${targets.length} record(s)`);
  },

  delete(a) {
    const file = a.pos[0];
    const doc = readDoc(file);
    const ids = new Set(a.pos.slice(1));
    if (!ids.size && a.all("where").length) for (const r of select(doc, a)) ids.add(r.id);
    if (!ids.size) die("delete needs record ids or --where");
    const before = doc.records.length;
    doc.records = doc.records.filter((r) => !ids.has(r.id));
    writeDoc(file, doc);
    console.log(`deleted ${before - doc.records.length} record(s)`);
  },

  "field-add"(a) {
    const file = a.pos[0];
    const doc = readDoc(file);
    const [name, def] = parseFieldSpec(`${a.pos[1]}:${a.one("type") ?? "text"}${a.one("options") ? ":" + String(a.one("options")).split(",").join("|") : ""}`);
    if (doc.fields[name]) die(`field "${name}" already exists`);
    if (a.all("color").length) def.colors = parseColors(a.all("color"));
    if (a.has("primary")) {
      for (const d of Object.values(doc.fields)) delete d.primary;
      def.primary = true;
    }
    const after = a.one("after");
    const next = {};
    let inserted = false;
    for (const [k, v] of Object.entries(doc.fields)) {
      next[k] = v;
      if (k === after) { next[name] = def; inserted = true; }
    }
    if (!inserted) next[name] = def;
    doc.fields = next;
    writeDoc(file, doc);
    console.log(`added field "${name}" (${def.type})`);
  },

  "field-set"(a) {
    const file = a.pos[0];
    const name = a.pos[1];
    const doc = readDoc(file);
    const def = doc.fields[name] ?? die(`field "${name}" not found`);
    if (a.one("type")) {
      const t = String(a.one("type"));
      if (!TYPES.includes(t)) die(`bad type "${t}"`);
      def.type = t;
    }
    if (a.one("options")) def.options = String(a.one("options")).split(",").map((s) => s.trim()).filter(Boolean);
    if (a.all("add-option").length) for (const o of a.all("add-option")) if (!(def.options ??= []).includes(String(o))) def.options.push(String(o));
    if (a.all("color").length) def.colors = { ...(def.colors ?? {}), ...parseColors(a.all("color")) };
    for (const k of ["align", "dateFormat", "numberStyle", "currency"]) if (a.one(k)) def[k] = String(a.one(k));
    if (a.one("precision")) def.precision = Number(a.one("precision"));
    if (a.has("thousands")) def.thousands = a.one("thousands") !== "false";
    writeDoc(file, doc);
    console.log(`updated field "${name}"`);
  },

  "field-rename"(a) {
    const [file, oldName, newName] = a.pos;
    const doc = readDoc(file);
    if (!doc.fields[oldName]) die(`field "${oldName}" not found`);
    if (doc.fields[newName]) die(`field "${newName}" already exists`);
    const next = {};
    for (const [k, v] of Object.entries(doc.fields)) next[k === oldName ? newName : k] = v;
    doc.fields = next;
    for (const v of doc.views) {
      for (const c of v.filters ?? []) if (c.field === oldName) c.field = newName;
      for (const s of v.sorts ?? []) if (s.field === oldName) s.field = newName;
      if (v.group?.field === oldName) v.group.field = newName;
      if (v.hiddenCols) v.hiddenCols = v.hiddenCols.map((c) => (c === oldName ? newName : c));
      if (v.colWidths && oldName in v.colWidths) { v.colWidths[newName] = v.colWidths[oldName]; delete v.colWidths[oldName]; }
    }
    for (const r of doc.records) if (oldName in r) {
      const out = {};
      for (const [k, val] of Object.entries(r)) out[k === oldName ? newName : k] = val;
      Object.keys(r).forEach((k) => delete r[k]);
      Object.assign(r, out);
    }
    writeDoc(file, doc);
    console.log(`renamed "${oldName}" to "${newName}"`);
  },

  "field-delete"(a) {
    const [file, name] = a.pos;
    const doc = readDoc(file);
    if (!doc.fields[name]) die(`field "${name}" not found`);
    if (doc.fields[name].primary) die("cannot delete the primary field");
    delete doc.fields[name];
    for (const v of doc.views) {
      if (v.filters) v.filters = v.filters.filter((c) => c.field !== name);
      if (v.sorts) v.sorts = v.sorts.filter((s) => s.field !== name);
      if (v.group?.field === name) delete v.group;
      if (v.hiddenCols) v.hiddenCols = v.hiddenCols.filter((c) => c !== name);
      if (v.colWidths) delete v.colWidths[name];
    }
    for (const r of doc.records) delete r[name];
    writeDoc(file, doc);
    console.log(`deleted field "${name}"`);
  },

  "view-add"(a) {
    const [file, name] = a.pos;
    const doc = readDoc(file);
    if (!name) die("view-add needs a name");
    const existing = doc.views.findIndex((v) => v.name === name);
    if (existing >= 0 && !a.has("replace")) die(`view "${name}" exists (pass --replace to overwrite)`);
    const v = { name };
    const filters = a.all("where").map((w) => parseWhere(String(w), doc.fields));
    if (filters.length) v.filters = filters;
    if (a.has("any")) v.filterMatch = "any";
    const sorts = a.all("sort").map((s) => parseSort(String(s), doc.fields));
    if (sorts.length) v.sorts = sorts;
    if (a.one("group")) {
      const g = String(a.one("group"));
      if (!doc.fields[g]) die(`--group: unknown field "${g}"`);
      v.group = { field: g };
    }
    if (a.one("hide")) v.hiddenCols = String(a.one("hide")).split(",").map((s) => s.trim());
    if (a.one("frozen")) v.frozen = Number(a.one("frozen"));
    if (existing >= 0) doc.views[existing] = v;
    else doc.views.push(v);
    writeDoc(file, doc);
    console.log(`${existing >= 0 ? "replaced" : "added"} view "${name}"`);
  },

  "view-delete"(a) {
    const [file, name] = a.pos;
    const doc = readDoc(file);
    const n = doc.views.length;
    doc.views = doc.views.filter((v) => v.name !== name);
    if (doc.views.length === n) die(`view "${name}" not found`);
    writeDoc(file, doc);
    console.log(`deleted view "${name}"`);
  },

  create(a) {
    const file = a.pos[0];
    if (!file) die("create needs a file path");
    if (fs.existsSync(file) && !a.has("force")) die(`${file} already exists (pass --force to overwrite)`);
    const specs = a.all("field").map((s) => parseFieldSpec(String(s)));
    if (!specs.length) specs.push(["标题", { type: "text" }]);
    const fields = {};
    specs.forEach(([n, d], i) => { fields[n] = i === 0 ? { ...d, primary: true } : d; });
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    writeDoc(file, { fields, views: [{ name: String(a.one("view") ?? "全部") }], records: [] });
    console.log(`created ${file} with fields: ${Object.keys(fields).join(", ")}`);
  },

  "import-csv"(a) {
    const [file, csvPath] = a.pos;
    const doc = readDoc(file);
    const rows = parseCSV(fs.readFileSync(csvPath, "utf8"));
    if (rows.length < 2) die("CSV needs a header row and at least one data row");
    const [head, ...data] = rows;
    const map = head.map((h) => h.trim());
    const unknown = map.filter((h) => h !== "id" && !doc.fields[h]);
    if (unknown.length && !a.has("add-fields")) die(`CSV columns not in table: ${unknown.join(", ")} (pass --add-fields to create them as text)`);
    for (const h of unknown) doc.fields[h] = { type: "text" };
    const taken = new Set(doc.records.map((r) => r.id));
    const warnings = [];
    for (const row of data) {
      const rec = { id: genId(taken) };
      map.forEach((h, i) => { if (h !== "id") setValue(rec, h, coerce(doc.fields[h], row[i] ?? "", h, warnings)); });
      doc.records.push(rec);
    }
    writeDoc(file, doc);
    flushWarnings(warnings);
    console.log(`imported ${data.length} record(s)`);
  },

  export(a) {
    const doc = readDoc(a.pos[0]);
    printRecords(select(doc, a), visibleCols(doc, a), a.one("format") ?? "csv");
  },

  validate(a) {
    const doc = readDoc(a.pos[0]);
    const { errors, warnings } = validate(doc);
    for (const w of warnings) console.log(`warning: ${w}`);
    for (const e of errors) console.log(`error: ${e}`);
    console.log(errors.length ? `INVALID (${errors.length} error(s))` : `OK (${doc.records.length} records, ${warnings.length} warning(s))`);
    if (errors.length) process.exit(2);
  },
};

const HELP = `bt.mjs: edit Weilanx Base Table files (.base / .wbase)

  info <file>                                 fields, options, views, record count
  query <file> [--view V] [--where "F op X"]... [--any] [--sort F[:desc]]...
               [--fields a,b] [--limit N] [--count] [--format md|csv|json|jsonl]
  get <file> <id>
  add <file> --set F=V ... | --json '{"F":V}'      prints the new id
  update <file> <id>... | --where ...  --set F=V ... [--unset F]
  delete <file> <id>... | --where ...
  field-add <file> <name> --type T [--options a,b] [--color opt=blue] [--after F] [--primary]
  field-set <file> <name> [--type T] [--options a,b] [--add-option x] [--color opt=red]
            [--align left|center|right] [--dateFormat iso|slash|us|cn|cn-short]
            [--numberStyle plain|percent|currency] [--precision N] [--currency ¥] [--thousands]
  field-rename <file> <old> <new>
  field-delete <file> <name>
  view-add <file> <name> [--where ...] [--any] [--sort F[:desc]] [--group F] [--hide a,b] [--frozen N] [--replace]
  view-delete <file> <name>
  create <file> --field "Name:type[:opt1|opt2]" ...   first field becomes primary
  import-csv <file> <csv> [--add-fields]
  export <file> [--view V] [--where ...] [--format csv|md|json|jsonl]
  validate <file>                             exit code 2 on errors

Types: ${TYPES.join(", ")}
Where ops: is isNot contains notContains empty notEmpty before after eq ne gt lt gte lte checked unchecked
           (symbols also work: = != ~ !~ > < >= <=)
Colors: blue green orange purple red yellow gray`;

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "help" || cmd === "--help") {
  console.log(HELP);
  process.exit(0);
}
const fn = commands[cmd];
if (!fn) die(`unknown command "${cmd}". Run: node bt.mjs help`);
const args = parseArgs(rest);
if (!args.pos[0] && cmd !== "help") die(`${cmd} needs a file path`);
fn(args);
