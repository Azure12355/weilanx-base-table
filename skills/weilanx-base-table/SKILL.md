---
name: weilanx-base-table
description: Read, query and edit Weilanx Base Table files, the local multidimensional tables stored as plain JSON in `.base` or `.wbase` files (opened as tables by the Weilanx Base Table VS Code / Obsidian plugin). Use this skill whenever the user wants to look things up in, summarize, add / update / delete records in, add or rename fields of, create views for, import CSV into, export, validate or create such a table, including requests like "往选题库里加几条""把状态是进行中的改成已发布""这个 .base 里播放量最高的是哪些""给表格加一个优先级字段""新建一个读书清单多维表格", even if they only mention the file name or say "多维表格 / base 表 / 表格文件" for a local file. Do NOT use it for Feishu / Lark online Bitable (use lark-base), Excel / CSV-only work, or Obsidian's own YAML Bases.
---

# Weilanx Base Table

A Weilanx Base Table is one JSON file (`.wbase`; older tables use `.base`, same content) holding a whole table:

```json
{
  "fields":  { "标题": { "type": "text", "primary": true }, "状态": { "type": "select", "options": ["待做", "已发布"] } },
  "views":   [ { "name": "全部" }, { "name": "待做", "filters": [{ "field": "状态", "op": "is", "value": "待做" }] } ],
  "records": [ { "id": "r_k3x9a1lmn2", "标题": "Git 入门", "状态": "已发布" } ]
}
```

The user usually has the file open in VS Code or Obsidian, and the plugin re-renders the table as soon as the file changes (Obsidian picks it up within a second or two). So every edit you make is visible to them immediately, and a malformed edit breaks their table in front of them. That is why edits go through the bundled script instead of hand-written JSON.

## The script

`scripts/bt.mjs` (Node 18+, no dependencies) does every read and write. Call it with the absolute path of this skill's directory:

```bash
BT="node <skill-dir>/scripts/bt.mjs"
$BT help
```

It keeps the invariants the plugin relies on: every record gets a unique stable `id`; empty values are removed instead of stored as `""`/`null`; values are converted to the field's type (`"1,200"` becomes `1200`, `"B站,小红书"` becomes an array, `"2026/11/3"` becomes `"2026-11-03"`, `"是"` becomes `true`); new select / multi values are added to the field's options; renaming or deleting a field also updates every view and record; writes are atomic and formatted with 2-space indentation so git diffs stay small.

## Workflow

1. **Look before you touch.** Run `$BT info <file>` first. It lists field names and types, select options, and views. Field names are usually Chinese and must match exactly, including full-width brackets like `预计时长(分钟)`.
2. **Read with `query`.** Output is a markdown table by default; use `--format json` when you need to process values.
   ```bash
   $BT query t.base --view 已发布 --fields 标题,播放量 --limit 10
   $BT query t.base --where "播放量 > 30000" --where "分类 = 编程" --sort 播放量:desc
   $BT query t.base --where "平台 ~ YouTube" --any --where "状态 = 待做" --count
   ```
   `--where "<field> <op> <value>"` accepts op names or symbols: `=` is, `!=` isNot, `~` contains, `!~` notContains, `> < >= <=`, plus `empty`, `notEmpty`, `checked`, `unchecked`, `before`, `after` (dates). Conditions are AND unless `--any`. `--view` applies that view's saved filters and sort, and extra `--where` narrows further.
3. **Write with the matching command.**
   ```bash
   $BT add t.base --set "标题=用 AI 写周报" --set "状态=待做" --set "平台=B站,小红书"   # prints new id
   $BT update t.base r_demo_03 --set "状态=已发布" --unset 备注
   $BT update t.base --where "状态 = 进行中" --set "状态=已发布"                     # bulk
   $BT delete t.base --where "标题 ~ 测试"
   $BT field-add t.base 优先级 --type select --options 高,中,低 --color 高=red --after 状态
   $BT field-rename t.base 播放量 "播放量(次)"
   $BT view-add t.base 高优待做 --where "状态 = 待做" --where "优先级 = 高" --sort 发布日期 --hide 备注
   $BT create books.wbase --field "书名:text" --field "状态:select:想读|在读|读完" --field "评分:number"
   $BT import-csv books.wbase books.csv          # header row must match field names
   $BT export t.base --view 已发布 --format csv > published.csv
   ```
   For many records at once, prefer one command per record in a loop, or `import-csv`, over editing the JSON by hand.
4. **Validate after writing.** `$BT validate <file>` exits with code 2 and lists problems if anything is wrong. Fix errors before telling the user you are done; warnings are worth mentioning only when they matter.
5. **Report back in plain words**: what changed, how many records, and any notes the script printed (for example `added option "科技" to field "分类"`, which means a new select option was created; tell the user so a typo does not silently become a new category).

## Judgment calls

- **Destructive or bulk changes** (`delete`, `field-delete`, `update --where` touching many rows): run the same `--where` through `query --count` first, and if the number is surprising or the user's wording is ambiguous, show the matching titles and confirm before writing.
- **Unknown field in the user's request**: the script refuses to write unknown fields. Check `info` for the closest existing name (users often say 「日期」 for 「发布日期」). Only add a new field when the user clearly wants one, choosing the type from the data: options-like values → `select`/`multi`, yes/no → `checkbox`, amounts → `number`, `YYYY-MM-DD` → `date`, URLs → `link`, paragraphs → `longtext`.
- **Select values**: reuse an existing option when the user's word is a near match (「已完成」 vs 「完成」); only let the script add a new option when it is genuinely new.
- **New tables use `.wbase`.** Plugin 0.18+ opens both extensions in VS Code; Obsidian only opens `.wbase` (its core Bases plugin owns `.base`). If the user's VS Code plugin is older than 0.18 and only opens `.base`, create `.base` instead. Never rename an existing file's extension unless asked.
- **Links to notes**: in Obsidian vaults, a text / link cell whose whole value is `[[Note name]]` (or `[[Note|label]]`) renders as a clickable note link. Use that form when the user wants a record to point at a note.
- **Never change `id`s** and never reuse one; ids are how the plugin tracks rows, the primary field value is just the title.
- **The primary field** (`primary: true`) cannot be deleted; there is exactly one per table, the first column.
- **Answering questions** ("哪几条播放量最高", "还有多少待做") is a `query` job; do not modify the file for read-only requests.
- If you must edit the JSON directly (an operation the script does not cover, such as reordering records), keep the shape above, then run `validate`.

## Reference

Read `references/format.md` when you need the full schema: every field type and its display options (`dateFormat`, `numberStyle`, `precision`, `currency`, `thousands`, `align`), the view keys (`filters`, `filterMatch`, `sorts`, `group`, `hiddenCols`, `colWidths`, `frozen`), which filter ops apply to which type, and the allowed color names.
