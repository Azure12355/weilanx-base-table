import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDoc, serializeDoc, toTable, isTableFile } from "../src/core/doc";
import { parseWikiLink, renameLinks } from "../src/core/links";
import * as ops from "../src/core/ops";
import { BaseDoc } from "../src/core/types";

test("parseDoc:空文本得到空表,缺失部分兜底", () => {
  assert.deepEqual(parseDoc(""), { fields: {}, views: [], records: [] });
  assert.deepEqual(parseDoc('{"fields":{"a":{"type":"text"}}}').records, []);
});

test("parseDoc:宽松模式吞掉语法错误,严格模式抛出", () => {
  assert.deepEqual(parseDoc("{oops").records, []);
  assert.throws(() => parseDoc("{oops", true));
});

test("serializeDoc:缩进 2 + 末尾换行,可往返", () => {
  const doc: BaseDoc = { fields: { 标题: { type: "text", primary: true } }, views: [], records: [{ id: "r1", 标题: "x" }] };
  const text = serializeDoc(doc);
  assert.ok(text.endsWith("}\n"));
  assert.ok(text.includes('\n  "fields"'));
  assert.deepEqual(parseDoc(text), doc);
});

test("toTable:无视图时补「全部」,旧字符串 filter 升级为结构化", () => {
  assert.equal(toTable(parseDoc("{}"), "x").views[0].name, "全部");
  const t = toTable({ fields: {}, views: [{ name: "v", filter: "状态=已发布" }], records: [] }, "x");
  assert.deepEqual(t.views[0].filters, [{ field: "状态", op: "is", value: "已发布" }]);
});

test("isTableFile:识别 .wbase 与旧版 .base", () => {
  assert.ok(isTableFile("a/选题库.wbase"));
  assert.ok(isTableFile("b.base"));
  assert.ok(!isTableFile("c.md"));
});

test("ops 原地修改文档:addRow 生成不重复 id", () => {
  const doc: BaseDoc = { fields: {}, views: [], records: [] };
  const ids = new Set(Array.from({ length: 50 }, () => ops.addRow(doc, { 标题: "x" })));
  assert.equal(ids.size, 50);
  assert.equal(doc.records.length, 50);
});

test("parseWikiLink:三种写法", () => {
  assert.deepEqual(parseWikiLink("[[读书笔记]]"), { target: "读书笔记", label: "读书笔记" });
  assert.deepEqual(parseWikiLink("[[读书笔记|笔记]]"), { target: "读书笔记", label: "笔记" });
  assert.deepEqual(parseWikiLink("[[读书笔记#摘抄]]"), { target: "读书笔记#摘抄", label: "读书笔记#摘抄" });
  assert.equal(parseWikiLink("看 [[读书笔记]]"), null); // 不是整体链接
  assert.equal(parseWikiLink(3), null);
});

test("renameLinks:替换完整目标,保留别名与标题,不误伤前缀相同的名字", () => {
  const doc: BaseDoc = {
    fields: {},
    views: [],
    records: [
      { id: "r1", 笔记: "[[旧名]]", 备注: "参考 [[旧名|这篇]] 和 [[旧名#第二节]]" },
      { id: "r2", 笔记: "[[旧名续集]]", 标签: ["[[旧名]]", "其他"] },
      { id: "[[旧名]]" },
    ],
  };
  const n = renameLinks(doc, "旧名", "新名");
  assert.equal(n, 4);
  assert.equal(doc.records[0]["笔记"], "[[新名]]");
  assert.equal(doc.records[0]["备注"], "参考 [[新名|这篇]] 和 [[新名#第二节]]");
  assert.equal(doc.records[1]["笔记"], "[[旧名续集]]");
  assert.deepEqual(doc.records[1]["标签"], ["[[新名]]", "其他"]);
  assert.equal(doc.records[2]["id"], "[[旧名]]"); // id 不动
});

test("renameLinks:名字含正则特殊字符", () => {
  const doc: BaseDoc = { fields: {}, views: [], records: [{ id: "r", a: "[[C++ (入门)]]" }] };
  assert.equal(renameLinks(doc, "C++ (入门)", "C++ 入门"), 1);
  assert.equal(doc.records[0]["a"], "[[C++ 入门]]");
});
