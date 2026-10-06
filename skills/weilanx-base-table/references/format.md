# Weilanx Base Table file format

One file = one table. Extension `.wbase` (VS Code plugin 0.18+ and Obsidian) or the older `.base` (VS Code only; Obsidian reserves `.base` for its core Bases plugin). Content is identical. UTF-8 JSON, 2-space indent, trailing newline.

```json
{
  "fields":  { "<field name>": FieldDef, ... },
  "views":   [ ViewDef, ... ],
  "records": [ { "id": "r_...", "<field name>": value, ... }, ... ]
}
```

Key order in `fields` is the column order. Order of `records` is the default row order.

## Fields

| type | stored value | notes |
| --- | --- | --- |
| `text` | string | single line |
| `longtext` | string | may contain `\n` |
| `select` | string | should be one of `options` |
| `multi` | string array | each item should be in `options` |
| `date` | `"YYYY-MM-DD"` string | |
| `number` | number | never a numeric string |
| `checkbox` | `true` / `false` | |
| `link` | string (URL) | `[[Note]]` / `[[Note|label]]` renders as a note link in Obsidian (also allowed in `text`) |

FieldDef keys:

| key | applies to | meaning |
| --- | --- | --- |
| `type` | all | one of the types above (required) |
| `primary` | one field | `true` marks the title column; exactly one per table, cannot be deleted |
| `options` | select, multi | allowed values, in display order |
| `colors` | select, multi | `{ "<option>": "<color>" }`, colors: `blue green orange purple red yellow gray` (unlisted options get an automatic color) |
| `align` | all | `left` (default), `center`, `right` |
| `dateFormat` | date | display only: `iso` 2026-10-05 (default), `slash` 2026/10/05, `us` 10/05/2026, `cn` 2026年10月5日, `cn-short` 10月5日 |
| `numberStyle` | number | `plain` (default), `percent`, `currency` |
| `precision` | number | decimal places 0-4 |
| `currency` | number | symbol for `currency` style, default `¥` |
| `thousands` | number | `true` shows 1,234 |

Display options never change the stored value: a `percent` field still stores `0.25`.

## Records

- `id`: required, unique, stable string. Generated as `r_` + random base36 (for example `r_k3x9a1lmn2`). Never derived from the title, never changed.
- Every other key is a field name. Keys for empty values are omitted entirely (no `""`, `null`, `[]`).
- Keys that are not defined in `fields` are ignored by the plugin; `validate` warns about them.

## Views

```json
{
  "name": "已发布",
  "filters": [ { "field": "状态", "op": "is", "value": "已发布" } ],
  "filterMatch": "all",
  "sorts": [ { "field": "播放量", "dir": "desc" } ],
  "group": { "field": "分类" },
  "hiddenCols": ["参考链接"],
  "colWidths": { "标题": 240 },
  "frozen": 1
}
```

| key | meaning |
| --- | --- |
| `name` | tab label, unique |
| `filters` | conditions; `filterMatch` `all` (AND, default) or `any` (OR) |
| `sorts` | applied in order; `dir` `asc` / `desc` |
| `group` | group rows by one field (collapsible in the UI) |
| `hiddenCols` | field names hidden in this view |
| `colWidths` | px widths; key `__rownum__` is the row number column |
| `frozen` | number of leading columns frozen while scrolling |

A table with no views shows a default 「全部」 view.

## Filter ops by type

| type | ops |
| --- | --- |
| text, longtext, link | `contains` `notContains` `is` `isNot` `empty` `notEmpty` |
| select | `is` `isNot` `empty` `notEmpty` |
| multi | `contains` `notContains` `empty` `notEmpty` (matches whole items) |
| date | `is` `before` `after` `empty` `notEmpty` (string compare on YYYY-MM-DD) |
| number | `eq` `ne` `gt` `lt` `gte` `lte` `empty` `notEmpty` |
| checkbox | `checked` `unchecked` (no value) |

`empty` / `notEmpty` / `checked` / `unchecked` take no `value`.

## Legacy keys

Old files may have `"filter": "状态=已发布"` or `"sort": "播放量 desc"` strings on a view. The plugin upgrades them to `filters` / `sorts` on load; prefer the structured keys when writing.
