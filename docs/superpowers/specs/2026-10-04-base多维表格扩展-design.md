# `.base` 多维表格 VS Code 扩展 — 设计文档

- 日期:2026-10-04
- 状态:已通过头脑风暴,待进入实现计划

## 1. 概述

一个 VS Code 扩展,在编辑器里提供「多维表格」能力(类似飞书多维表格 / Notion Database)。

每一张表是一个 **`.base` 目录包(bundle)**,同时服务两类使用者:

- **对人(在 VS Code 里管理)**:`.base` 呈现为**一个文件**,双击用扩展打开成**一张表格 UI**,简洁、少层级。
- **对 Agent**:`.base` 内部是展开的 Markdown —— **每条记录一个 `.md`**,Agent 可直接 `Read` 到最细粒度,越读越了解用户。

同一份数据,两种视角,**零转换、零压缩**。

## 2. 目标

- 底层数据对 Agent 友好:细粒度、语义清晰、可直接读改、git 可逐条 diff
- 上层对人简洁:VS Code 里是一张表,不被一堆文件/文件夹淹没
- 可视化编辑层:表格内联编辑并写回、筛选、排序、列显隐、多视图切换
- 7 种字段类型覆盖内容创作场景(选题库、发布排期等)

## 3. 非目标(YAGNI,二期再说)

多表关联(relation)、公式字段、看板/日历/画廊视图、实时文件监听自动刷新、多人协作、附件/媒体管理。

## 4. 存储模型

### 4.1 `.base` = bundle(目录包)

`.base` 是一个普通目录,扩展名为 `.base`。不压缩。对人伪装成单文件(见 §10),对 Agent / git 是透明的 Markdown 目录。

### 4.2 内部结构(扁平一层)

```
选题库.base/
├── _base.md                         表配置:字段定义(schema) + 多视图
├── 如何vibecoding出有审美的网站.md    一条记录
├── 假期电量条.md                      一条记录
└── …
```

扁平一层,不嵌套。解包看也清爽。记录文件名 = 记录标题(主字段)。

### 4.3 记录 `.md`

```markdown
---
状态: 已发布
平台: [B站, 小红书]
发布日期: 2026-10-01
---
正文:这条选题的脚本思路、要点、复盘……(Agent 读正文了解更深)
```

- frontmatter 存结构化字段值
- 正文存长内容(自由 Markdown);编辑写回时**正文原样保留**

### 4.4 `_base.md`(schema + views)

```markdown
---
fields:
  标题:   {type: text, primary: true}
  状态:   {type: select, options: [待做, 进行中, 已发布], colors: {待做: gray, 进行中: blue, 已发布: green}}
  平台:   {type: multi,  options: [B站, 小红书, 抖音, X]}
  发布日期: {type: date}
views:
  - {name: 待做,    filter: "状态 = 待做",   sort: "发布日期 asc"}
  - {name: 本周发布, filter: "发布日期 本周", hiddenCols: [平台]}
  - {name: 全部}
---
```

- `fields`:字段定义(名、类型、选项、颜色、是否主字段)
- `views`:多视图,每个 = `{name, filter, sort, hiddenCols}`
- `primary: true` 的字段作为记录文件名来源

## 5. 架构(两个组件,职责隔离)

### 5.1 Extension 主进程(TypeScript / Node)

**唯一碰磁盘的一方**。职责:

- 命令注册(「打开多维表格」)+ 打开 Webview Panel
- 读 `.base` 目录:枚举所有记录 md + `_base.md`,用 `gray-matter` 解析成表数据
- 写回:单条记录 frontmatter 更新、新建/删除记录 md、视图配置写回 `_base.md`
- 校验与错误上报(解析失败、字段类型不匹配等)

### 5.2 Webview(React + Vite)

**不碰磁盘**。职责:

- 表格渲染(行列、列宽、列显隐)
- 筛选 / 排序 / 多视图切换(前端求值)
- 内联编辑控件:每种字段类型一个编辑器(文本框、单选下拉、多选标签、日期选择、数字、复选、链接)
- 增 / 删行交互
- 通过 `postMessage` 向主进程要数据、提交改动

### 5.3 通信协议(postMessage)

Webview → 主进程:`loadTable`、`updateCell{file, field, value}`、`addRow{values}`、`deleteRow{file}`、`saveView{view}`
主进程 → Webview:`tableData{fields, views, rows}`、`updateOk{file}`、`error{message}`

## 6. 数据流

- **打开**:命令/双击 → 主进程读全目录 → 解析 → `tableData` 推给 webview 渲染
- **改一格**:webview 改值 → `updateCell` → 主进程**只重写那条 md 的 frontmatter(正文保留)** → `updateOk`
- **增/删行**:webview → `addRow`/`deleteRow` → 主进程建/删 md 文件
- **筛选/排序/切视图**:webview 前端处理;视图配置改动 → `saveView` → 写回 `_base.md`

## 7. 字段类型(MVP 7 种)

| 类型 | frontmatter 表示 | 编辑控件 |
|---|---|---|
| 文本 text | 字符串 | 文本框(多行可展开) |
| 单选 select | 字符串(options 之一) | 下拉(带颜色) |
| 多选 multi | 字符串数组 | 多选标签 |
| 日期 date | `YYYY-MM-DD` | 日期选择器 |
| 数字 number | 数字 | 数字输入 |
| 复选 checkbox | `true`/`false` | 勾选框 |
| 链接 link | URL 字符串 | 带跳转的文本框 |

## 8. 筛选 / 视图模型

- `view = {name, filter?, sort?, hiddenCols?}`
- `filter`:简单表达式字符串(如 `状态 = 待做`、`发布日期 本周`),前端解析求值;MVP 支持 `=`、`!=`、`包含`、相对日期(本周/本月)
- `sort`:`字段 asc|desc`
- 切视图只改前端展示;修改视图定义写回 `_base.md`

## 9. 写回策略

- 用 `gray-matter` 解析/序列化:改 frontmatter、**保留正文与注释**
- 单条记录独立写,互不影响;diff 干净
- 原子写(写临时文件再 rename),避免写坏

## 10. 「人简洁 / Agent 好读」的落实

- **人**:打开 `.base` 时扩展把 `<base>/**` 加入该工作区的 `files.exclude`(或等效机制),资源管理器里 `.base` 折叠为单条目;主界面是 webview 一张表
- **Agent**:`.base` 内 md 直接可读;`_base.md` 让 Agent 一眼看懂字段含义,再按需读单条记录

## 11. 技术栈

- VS Code Extension(TypeScript),打包 esbuild
- Webview:React + Vite
- frontmatter:gray-matter
- (可选)`@vscode/webview-ui-toolkit` 对齐 VS Code 主题

## 12. 开放问题 / 待验证(实现阶段处理)

1. **`.base` 在资源管理器折叠为单文件的可行性**:VS Code 没有 macOS Finder 那样的原生 bundle 概念,资源管理器默认会展开目录。候选方案:`files.exclude` 隐藏内部、或自定义 `FileSystemProvider`、或接受可展开但主要通过扩展入口打开。实现前先验证最简可行方案。
2. 扩展最终命名(当前工程名 `vscode-base-table`)。
3. `filter` 表达式的语法边界(MVP 先做最小集)。

## 13. 未来扩展(二期)

看板/日历/画廊视图、多表关联、公式、文件监听自动刷新、附件。
