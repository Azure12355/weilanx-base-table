# Weilanx Base Table (VS Code 扩展)

把一个 `.base` 文件当**多维表格**来管理:筛选、多视图、内联编辑。底层是对 **AI Agent 友好**的单文件 JSON —— 整张表一个结构化文档,Agent `JSON.parse` 一次读全,写代码即可匹配筛选。

侧边栏有专属的「多维表格」目录树,列出工作区内所有 `.base`,点击即开。

## 一个 `.base`,两种视角

- **对人**:`选题库.base` 在 VS Code 里是一张表格 UI(视图切换、筛选、点格子改值)。双击即打开。
- **对 Agent**:`.base` 就是一个 JSON 文件,`Read` 一次拿到字段定义 + 视图 + 全部记录,结构化、无歧义。

## 存储格式

一个 `.base` 文件就是这样一份 JSON:

```json
{
  "fields": {
    "标题":   { "type": "text", "primary": true },
    "状态":   { "type": "select", "options": ["待做", "进行中", "已发布"],
               "colors": { "待做": "gray", "进行中": "blue", "已发布": "green" } },
    "平台":   { "type": "multi",  "options": ["B站", "小红书", "抖音", "X"] },
    "发布日期": { "type": "date" },
    "备注":   { "type": "longtext" }
  },
  "views": [
    { "name": "全部" },
    { "name": "待做",   "filters": [{ "field": "状态", "op": "is", "value": "待做" }] },
    { "name": "已发布", "filters": [{ "field": "状态", "op": "is", "value": "已发布" }],
      "sorts": [{ "field": "发布日期", "dir": "desc" }] }
  ],
  "records": [
    { "id": "r_vibecoding", "标题": "vibecoding 教程", "状态": "已发布",
      "平台": ["B站", "小红书"], "发布日期": "2026-09-20", "备注": "脚本思路、要点、复盘……" }
  ]
}
```

- 字段类型:`text` · `longtext` · `select` · `multi` · `date` · `number` · `checkbox` · `link`
- 每条记录带稳定 `id`(行标识,主字段值会变、可能重复,不能当标识);其余键即字段值,空值不写入
- 主字段(`primary: true`)是普通字段,只标记为标题列、不可删除
- 筛选 `op`:`is` / `isNot` / `contains` / `notContains` / `empty` / `notEmpty` / `before` / `after` / `eq` / `ne` / `gt` / `lt` / `gte` / `lte` / `checked` / `unchecked`;排序 `dir`:`asc` / `desc`

## 开发 / 调试

```bash
npm install
npm run build        # 打包 webview(vite) + 扩展(esbuild)
npm test             # 数据层单测
npm run typecheck
```

在 VS Code 里按 **F5** 启动「扩展开发宿主」,然后:

- 直接双击 `examples/选题库.base` 打开(自定义编辑器)
- 或命令面板运行 **「打开多维表格 (.base)」**,或资源管理器右键 `.base` 文件 → 「打开多维表格」

## 打包安装

```bash
npx @vscode/vsce package      # 生成 .vsix
# VS Code: 扩展面板 → "..." → Install from VSIX
```

## 设计文档

见 `docs/superpowers/specs/2026-10-04-base多维表格扩展-design.md`。

## 功能

- 视图:多视图切换、新建/复制/重命名/删除、**标签拖拽排序**;筛选(多条件 AND/OR)、排序(多字段)、**分组(可折叠)**
- 字段:类型切换(文本/长文本/单选/多选/日期/数字/复选/链接)、选项+配色、对齐、列宽拖拽、**列拖拽换位**、隐藏、复制字段、冻结列;顶部**字段配置**面板统一管理
- 类型专属配置:日期格式(5 种)、数字格式(数值/百分比/货币)+ 小数位 + 千分位
- 行:**拖拽排序**(hover 行号列出现拖拽把手;有排序时松手弹回)、行号列可调宽、删除
- 编辑:内联乐观更新、长文本弹层编辑、单选/多选弹层带勾选态、点击外部自动关闭(浮层互斥);**点击聚焦自动展开截断内容**,失焦收起
- **撤销 / 重做**:右上角按钮或 Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z
- **导出**:右上角导出为 CSV / Excel(.xls)/ 完整 JSON
- **新建**:命令面板「创建多维表格 (.base)」或资源管理器右键文件夹 → 创建
- **侧边栏目录树**:活动栏「多维表格」视图列出工作区所有 `.base`,带自定义文件图标

二期规划:看板/日历/画廊视图、多表关联、公式。
