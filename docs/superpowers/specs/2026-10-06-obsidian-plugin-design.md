# Weilanx Base Table · Obsidian 插件设计

日期:2026-10-06
状态:待评审

## 目标

在 Obsidian 里用和 VS Code 版相同的表格界面打开、编辑多维表格文件,桌面端和手机端都可用。两个插件放在同一个仓库,共用数据层和界面,每次 Release 同时发布两端。

## 已确定的决定

| 问题 | 结论 |
| --- | --- |
| 扩展名 | Obsidian 核心插件 Bases 占用了 `.base`(YAML)。两端统一改用 **`.wbase`**;VS Code 继续能打开旧的 `.base`,并提供「转换为 .wbase」命令 |
| 仓库 | 同一仓库,统一版本号;Release 附带 `weilanx-base-table.vsix` + Obsidian 的 `main.js` / `manifest.json` / `styles.css` |
| Obsidian 第一版功能 | 与 VS Code 版对齐(视图、筛选、排序、分组、冻结、字段配置、多选复制、撤销重做、导出),另加:手机端、`[[笔记]]` 链接、跟随 Obsidian 主题 |
| 架构 | 方案 A:`src/core` 纯数据层 + 共享界面 `webview/` + 两个宿主外壳 |

## 1. 代码结构

```
src/core/        types.ts     数据类型(原 src/base/types.ts)
                 doc.ts       parseDoc(text) / serializeDoc(doc) / toTable(doc) / normalizeView
                 ops.ts       纯函数,入参出参都是 BaseDoc:updateCell addRow deleteRow saveViews
                              setField renameField addField duplicateField deleteField
                              reorderFields moveRowTo replaceAll
                 links.ts     renameLinks(doc, oldName, newName) → 改了几处
src/vscode/      extension.ts panel.ts tree.ts
                 fsStore.ts   readDoc(file) / writeDoc(file, doc)(原子写);mutate(file, op) = 读 → op → 写
src/obsidian/    main.ts      Plugin:注册视图、扩展名、命令、改名监听、设置
                 view.ts      WbaseView extends TextFileView,挂载 React 界面
                 host.ts      实现界面的 Host 接口,把界面的消息转成 core/ops 调用
webview/src/     host.ts      Host 接口 + setHost();VS Code 的默认实现(postMessage)
                 其余组件基本不动
```

- `src/base/reader.ts`、`writer.ts` 拆成 `core/doc.ts` + `core/ops.ts` + `vscode/fsStore.ts`,行为保持不变,现有 16 个单测迁到新模块并全部通过。
- 界面和宿主之间的消息类型(`OutMsg` / `InMsg`)不变。`webview/src/vscode.ts` 改名为 `host.ts`,`post` / `onMessage` 委托给当前 Host。VS Code 构建默认使用 postMessage 实现;Obsidian 视图在渲染前调用 `setHost()` 注入自己的实现。界面组件里 `import { post, onMessage }` 的写法不用改。

## 2. Obsidian 宿主

**视图**:`WbaseView extends TextFileView`,`registerExtensions(["wbase"], VIEW_TYPE)`。

- `setViewData(data)`:用 `parseDoc` 解析,推送 `tableData` 给界面。解析失败时显示错误提示和「以文本查看」按钮,不覆盖文件。
- 界面发来修改消息:用 `core/ops` 改内存里的 doc,然后 `requestSave()`。Obsidian 会防抖保存,调用 `getViewData()` 拿到 `serializeDoc(doc)` 写回。
- 外部修改(同步、git、Agent):TextFileView 自己会重新调用 `setViewData`,界面整表刷新;本地正在编辑的输入框不受影响(Cell 已有「聚焦时不覆盖」逻辑)。
- 多个视图同时打开同一文件时,依赖 Obsidian 的同步机制,不做额外处理。

**界面挂载**:React 直接渲染进 `contentEl`,不用 iframe。卸载时 `root.unmount()`。

**快捷键**:用视图自己的 `scope` 注册 `Mod+Z` 撤销、`Mod+Shift+Z` / `Mod+Y` 重做,只在表格视图获得焦点时生效,不设全局默认热键(符合社区插件规范)。用户可在命令面板执行「撤销 / 重做 / 新增记录 / 导出」。

**全局监听的隔离**:Table 现在在 `window` 上监听 keydown(Esc、Cmd+C)和 `document` 的 copy 事件。Obsidian 里没有 iframe 隔离,改为:只有当事件目标在本表格的根元素内(或焦点在根元素内)时才处理,避免多个表格互相影响或劫持编辑器里的复制。

**导出**:在表格同目录下 `vault.create` 生成文件(重名自动加序号),完成后用 Notice 提示并提供打开入口。

**新建表格**:命令「新建多维表格」和文件列表右键菜单「新建多维表格」,在当前目录创建 `新建表格.wbase` 并打开。

**命令名语言**:按 Obsidian 当前语言(`moment.locale()` 以 `zh` 开头)选择中文或英文。表格界面本身目前只有中文,与 VS Code 版一致。

## 3. 主题适配

共享样式只使用 `--vscode-*` 变量(带兜底值)。Obsidian 版额外加载一段映射,只作用于视图根元素 `.wbt-root`:

| VS Code 变量 | Obsidian 变量 |
| --- | --- |
| `--vscode-editor-background` | `--background-primary` |
| `--vscode-foreground` | `--text-normal` |
| `--vscode-descriptionForeground` | `--text-muted` |
| `--vscode-focusBorder` | `--interactive-accent` |
| `--vscode-list-hoverBackground` | `--background-modifier-hover` |
| `--vscode-editorWidget-background` | `--background-secondary` |
| `--vscode-editorWidget-border` / `--vscode-panel-border` | `--background-modifier-border` |
| `--vscode-charts-blue/green/orange/purple/red/yellow` | `--color-blue/green/orange/purple/red/yellow` |
| `--vscode-font-family` / `--vscode-font-size` | `--font-interface` / `--font-ui-medium` |

**样式隔离**:`webview/src/style.css` 里的 `html` / `body` / `*` 等全局选择器改为 `.wbt-root` 作用域,VS Code webview 的 `body` 加上同一个类名。Obsidian 版把这份 CSS 打包进 `styles.css`,不会影响 Obsidian 其他界面。

## 4. 手机端

- 全部通过 Vault 接口读写,不使用 Node 的 `fs` / `path`;`manifest.json` 设 `isDesktopOnly: false`。
- `@media (hover: none)`:行号列始终显示复选框(没有悬停);隐藏拖拽把手(HTML5 拖拽在触屏上不可用,手机端第一版不支持拖拽排序行和列,其余功能可用)。
- 工具栏允许换行,弹层宽度不超过屏幕宽度。
- 复制:手机端没有 Cmd+C,底部浮条的「复制」按钮用 `navigator.clipboard.writeText`。

## 5. 笔记链接

- 文本类字段(`text` / `longtext` / `link`)的值如果整体是 `[[笔记名]]` 或 `[[笔记名|显示文字]]`,单元格显示为可点击的链接,点击调用 `Host.openLink(target)`。Obsidian 实现为 `workspace.openLinkText(target, 当前文件路径)`;VS Code 实现为在工作区里查找同名 `.md` 打开,找不到就提示。
- 改名同步:监听 `vault.on("rename")`,仅处理 Markdown 文件且文件名(basename)改变的情况。遍历库里所有 `.wbase`,用 `core/links.renameLinks` 把 `[[旧名]]`、`[[旧名|…]]`、`[[旧名#…]]` 替换为新名,有改动的文件用 `vault.process` 原子写回。插件设置里可以关闭这个行为(默认开启)。

## 6. `.wbase` 迁移(VS Code 侧)

- `customEditors.selector`、语言图标、侧边目录树、文件监听都同时匹配 `*.base` 和 `*.wbase`。
- 「创建多维表格」改为创建 `.wbase`。
- 新命令「转换为 .wbase」(右键 `.base` 文件 / 命令面板):重命名文件,内容不变。
- Material Icon Theme 的自动关联补上 `*.wbase`。
- `examples/选题库.base` 改名为 `选题库.wbase`;README、官网、`docs/install-for-agents.md`、skill(`weilanx-base-table`)同步更新,skill 和 `bt.mjs` 继续两种扩展名都支持。

## 7. 构建与发布

- 新增 `esbuild.obsidian.mjs`:入口 `src/obsidian/main.ts`,打包 React 和界面代码为 CommonJS 的 `main.js`;`obsidian`、`electron`、`@codemirror/*` 设为 external;CSS 合并为 `styles.css`。
- 仓库根目录新增 `manifest.json`(id `weilanx-base-table`,name `Weilanx Base Table`,`minAppVersion` 1.5.0)和 `versions.json`;开发依赖新增 `obsidian`。
- npm 脚本:`build:obsidian`、`package:obsidian`(产出到 `dist/obsidian/`)、`release`(两端一起打包)。
- 版本号统一到 0.18.0。Obsidian 要求 Release 的 tag 与 `manifest.json` 版本完全一致(不带 `v`),从这一版起 tag 用 `0.18.0` 的形式;`releases/latest/download/...` 的下载链接不受影响。
- Agent 安装:`docs/install-for-agents.md` 和 `scripts/install.sh` 增加 Obsidian 部分。给定库路径后,下载 3 个文件到 `<库>/.obsidian/plugins/weilanx-base-table/`,并把 id 写入 `.obsidian/community-plugins.json` 启用,提醒用户重启 Obsidian 或在设置里刷新插件。
- 上架 Obsidian 社区插件市场需要向 `obsidian-releases` 仓库提 PR 并通过审核,本期把文件结构准备好,提交审核另行处理。

## 8. 测试

- **单元测试**(`node --test`):`core/ops`(从现有测试迁移)、`core/doc`(解析容错、序列化格式)、`core/links`(三种链接写法、不误伤相似名字、返回改动数)。
- **界面回归**:VS Code 版构建后,用 playwright-cli 无头浏览器把现有交互(多选、复制、批量删除、撤销)跑一遍。
- **Obsidian 视图**:写一个测试页,用最小的 `obsidian` 桩实现挂载 `WbaseView`,在无头浏览器里检查:主题变量映射生效、样式不外溢、两个表格同时打开时复制和 Esc 互不干扰、窄屏(390px)下复选框常显。
- **真机验收**:把构建产物装进 `obsidian-plugin-dev` 库,在 Obsidian 桌面端打开 `选题库.wbase`,验证编辑、保存、外部修改刷新、`[[笔记]]` 跳转和改名同步。手机端由你在真机上验收。

## 不在本期范围

- 表格界面英文化
- 在 Markdown 笔记里嵌入表格(`![[x.wbase]]`)
- 手机端拖拽排序
- 提交 Obsidian 社区市场审核
