import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  readBase,
  readDoc,
  updateCell,
  addRow,
  deleteRow,
  saveViews,
  setField,
  renameField,
  addField,
  duplicateField,
  reorderFields,
  moveRow,
  moveRowTo,
  deleteField,
} from "../src/vscode/fsStore";
import { BaseDoc, FieldDef } from "../src/core/types";

const FIELDS: Record<string, FieldDef> = {
  标题: { type: "text", primary: true },
  状态: { type: "select", options: ["待做", "进行中", "已发布"] },
  平台: { type: "multi", options: ["B站", "小红书", "抖音"] },
  正文: { type: "longtext" },
};

function makeBase(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "base-"));
  const file = path.join(dir, "选题库.base");
  const doc: BaseDoc = {
    fields: FIELDS,
    views: [
      { name: "全部" },
      { name: "待做", filters: [{ field: "状态", op: "is", value: "待做" }] },
    ],
    records: [
      { id: "r1", 标题: "vibecoding教程", 状态: "已发布", 平台: ["B站", "小红书"], 正文: "这条选题的脚本思路……" },
      { id: "r2", 标题: "假期电量条", 状态: "进行中", 平台: ["抖音"] },
    ],
  };
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
  return file;
}

test("readBase 读出字段、视图、记录,带稳定 id", () => {
  const f = makeBase();
  const t = readBase(f);
  assert.equal(Object.keys(t.fields).length, 4);
  assert.equal(t.views.length, 2);
  assert.equal(t.rows.length, 2);
  const row = t.rows.find((r) => r.id === "r1")!;
  assert.equal(row.values["标题"], "vibecoding教程");
  assert.equal(row.values["状态"], "已发布");
  assert.deepEqual(row.values["平台"], ["B站", "小红书"]);
  assert.equal(row.values["id"], undefined); // id 不混进字段值
});

test("updateCell 改普通字段:只改该记录,其它记录不动", () => {
  const f = makeBase();
  updateCell(f, "r1", "状态", "进行中");
  const doc = readDoc(f);
  assert.equal(doc.records.find((r) => r["id"] === "r1")!["状态"], "进行中");
  assert.equal(doc.records.find((r) => r["id"] === "r2")!["状态"], "进行中"); // r2 原本就是进行中,未被污染
  assert.equal(doc.records.find((r) => r["id"] === "r1")!["正文"], "这条选题的脚本思路……"); // 正文还在
});

test("updateCell 改主字段:改值不改 id", () => {
  const f = makeBase();
  updateCell(f, "r2", "标题", "假期电量显示");
  const t = readBase(f);
  const row = t.rows.find((r) => r.id === "r2")!;
  assert.equal(row.values["标题"], "假期电量显示");
});

test("updateCell 清空值:删除该键", () => {
  const f = makeBase();
  updateCell(f, "r1", "状态", null);
  const doc = readDoc(f);
  assert.equal("状态" in doc.records.find((r) => r["id"] === "r1")!, false);
});

test("addRow 新增记录,生成 id,空值不写入", () => {
  const f = makeBase();
  const id = addRow(f, { 标题: "新选题", 状态: "待做", 平台: "" });
  assert.match(id, /^r_/);
  const doc = readDoc(f);
  const rec = doc.records.find((r) => r["id"] === id)!;
  assert.equal(rec["标题"], "新选题");
  assert.equal(rec["状态"], "待做");
  assert.equal("平台" in rec, false); // 空值不写
  assert.equal(readBase(f).rows.length, 3);
});

test("deleteRow 按 id 删除记录", () => {
  const f = makeBase();
  deleteRow(f, "r2");
  const t = readBase(f);
  assert.equal(t.rows.length, 1);
  assert.equal(t.rows[0].id, "r1");
});

test("saveViews 写回视图,保留 fields 与 records", () => {
  const f = makeBase();
  saveViews(f, [{ name: "全部" }, { name: "已发布", filters: [{ field: "状态", op: "is", value: "已发布" }] }]);
  const t = readBase(f);
  assert.equal(t.views.length, 2);
  assert.equal(t.views[1].name, "已发布");
  assert.equal(Object.keys(t.fields).length, 4); // fields 没丢
  assert.equal(t.rows.length, 2); // records 没丢
});

test("setField 改字段属性(对齐/选项)", () => {
  const f = makeBase();
  setField(f, "状态", { align: "center" });
  assert.equal(readBase(f).fields["状态"].align, "center");
});

test("renameField:schema + 视图 + 所有记录的键一起改(含主字段)", () => {
  const f = makeBase();
  renameField(f, "状态", "进度");
  const t = readBase(f);
  assert.ok("进度" in t.fields);
  assert.ok(!("状态" in t.fields));
  assert.equal(t.rows.find((r) => r.id === "r1")!.values["进度"], "已发布");
  assert.equal(t.rows.find((r) => r.id === "r1")!.values["状态"], undefined);

  renameField(f, "标题", "题目");
  const t2 = readBase(f);
  assert.ok("题目" in t2.fields);
  assert.equal(t2.rows.find((r) => r.id === "r1")!.values["题目"], "vibecoding教程");
});

test("addField 在指定字段后插入,保持列顺序", () => {
  const f = makeBase();
  const name = addField(f, "优先级", { type: "number" }, "状态");
  const keys = Object.keys(readBase(f).fields);
  assert.equal(name, "优先级");
  assert.equal(keys[keys.indexOf("状态") + 1], "优先级");
});

test("duplicateField 复制字段:紧随其后插入副本并连带复制记录值,副本非主字段", () => {
  const f = makeBase();
  const name = duplicateField(f, "状态");
  assert.equal(name, "状态 副本");
  const t = readBase(f);
  const keys = Object.keys(t.fields);
  assert.equal(keys[keys.indexOf("状态") + 1], "状态 副本");
  assert.equal(t.fields["状态 副本"].type, "select"); // 同类型
  assert.equal(t.fields["状态 副本"].primary, undefined);
  assert.equal(t.rows.find((r) => r.id === "r1")!.values["状态 副本"], "已发布"); // 值也复制
});

test("duplicateField 复制主字段:副本不再是主字段", () => {
  const f = makeBase();
  const name = duplicateField(f, "标题");
  const t = readBase(f);
  assert.equal(t.fields[name].primary, undefined);
  assert.equal(t.fields["标题"].primary, true); // 原主字段不变
});

test("reorderFields 按给定顺序重排字段,未列出的追加末尾", () => {
  const f = makeBase();
  reorderFields(f, ["平台", "标题"]); // 只列出两个
  const keys = Object.keys(readBase(f).fields);
  assert.equal(keys[0], "平台");
  assert.equal(keys[1], "标题");
  assert.ok(keys.includes("状态")); // 未列出的仍在
  assert.ok(keys.includes("正文"));
});

test("moveRow 交换两条记录位置", () => {
  const f = makeBase();
  const before = readBase(f).rows.map((r) => r.id);
  assert.deepEqual(before, ["r1", "r2"]);
  moveRow(f, "r1", "r2");
  const after = readBase(f).rows.map((r) => r.id);
  assert.deepEqual(after, ["r2", "r1"]);
});

test("moveRowTo 把记录移动到目标之前/之后", () => {
  const f = makeBase();
  addRow(f, { 标题: "第三条" }); // r1, r2, 第三条
  const ids0 = readBase(f).rows.map((r) => r.id);
  // 把 r1 移到最后一条之后
  moveRowTo(f, ids0[0], ids0[2], false);
  const ids1 = readBase(f).rows.map((r) => r.id);
  assert.deepEqual(ids1, [ids0[1], ids0[2], ids0[0]]);
  // 再把它移到最前(目标之前)
  moveRowTo(f, ids0[0], ids0[1], true);
  const ids2 = readBase(f).rows.map((r) => r.id);
  assert.deepEqual(ids2, [ids0[0], ids0[1], ids0[2]]);
});

test("deleteField 删字段 + 所有记录的键;主字段不可删", () => {
  const f = makeBase();
  deleteField(f, "平台");
  const t = readBase(f);
  assert.ok(!("平台" in t.fields));
  assert.equal(t.rows.find((r) => r.id === "r1")!.values["平台"], undefined);
  assert.throws(() => deleteField(f, "标题")); // 主字段
});
