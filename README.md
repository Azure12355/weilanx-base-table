<div align="right">
  <details>
    <summary>🌐 Language</summary>
    <div>
      <div align="right">
        <p><a href="./README.md">English</a></p>
        <p><a href="./README.zh-CN.md">简体中文</a></p>
      </div>
    </div>
  </details>
</div>

<h1 align="center">
  <a href="https://github.com/Azure12355/weilanx-base-table/releases">
    <img src="./media/logo.png" width="150" height="150" alt="Weilanx Base Table" /><br>
  </a>
</h1>

<p align="center">English | <a href="./README.zh-CN.md">中文</a> | <a href="https://azure12355.github.io/weilanx-base-table/">Official Site</a> | <a href="#-install-with-an-ai-agent">For Agents</a> | <a href="#-quick-start">Quick Start</a> | <a href="#-file-format">File Format</a> | <a href="#-development">Development</a> | <a href="https://github.com/Azure12355/weilanx-base-table/issues">Feedback</a><br></p>

<div align="center">

[![][vscode-shield]][vscode-link]
[![][typescript-shield]][typescript-link]
[![][react-shield]][react-link]
[![][obsidian-shield]][obsidian-link]
[![][i18n-shield]][i18n-link]

</div>
<div align="center">

[![][release-shield]][release-link]
[![][stars-shield]][stars-link]
[![][issues-shield]][issues-link]
[![][license-shield]][license-link]
[![][pr-shield]][pr-link]

</div>

# 📊 Weilanx Base Table

Weilanx Base Table turns a single `.wbase` file into a **multidimensional table** (think Airtable / Feishu Base) with multiple views, filters, sorting, grouping and inline editing. It runs in **VS Code** (and Cursor, Windsurf) and in **Obsidian** on desktop and mobile, and both open the same file.

Under the hood a `.wbase` file is **plain JSON**: one structured document holding fields, views and records. Humans get a spreadsheet-like UI; AI agents get a file they can read in one `JSON.parse` and edit with a few lines of code.

❤️ Like it? Give it a star 🌟 — it helps a lot!

# 🌠 Screenshot

![Grid view](./media/readme/grid.png)

![Group by field](./media/readme/group.png)

![Multi-select and copy](./media/readme/select.png)

# 🌟 Key Features

1. **Views**:

- 🗂 Multiple views per table — create, duplicate, rename, delete, drag to reorder tabs
- 🔍 Filters with multiple conditions (AND / OR) and 16 operators
- ↕️ Multi-field sorting
- 📁 Collapsible grouping by any field
- ❄️ Frozen columns, adjustable row height (compact / medium / tall)

2. **Fields**:

- 🔤 8 field types: text, long text, single select, multi select, date, number, checkbox, link
- 🎨 Colored option tags that follow your VS Code theme
- 📅 5 date formats; number formats (plain / percent / currency) with precision and thousands separators
- ↔️ Resize, drag to reorder, hide, duplicate and align columns from a unified field panel

3. **Editing**:

- ✏️ Inline editing with optimistic updates — no flicker, saved to disk instantly
- ☑️ Hover a row number to multi-select, Shift-click for ranges, select all from the header
- 📋 `Cmd/Ctrl+C` copies selected records as TSV + HTML — pastes cleanly into Excel, Google Sheets, Feishu, WPS
- ↩️ Undo / redo (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, `Ctrl+Y`), batch delete in one undo step
- 🖱 Drag rows to reorder, click a truncated cell to see its full content

4. **VS Code Integration**:

- 📂 A dedicated sidebar lists every `.wbase` file in your workspace
- ⌨️ All shortcuts are real VS Code keybindings — rebind them in Keyboard Shortcuts
- 🌐 English and Simplified Chinese UI, following your VS Code display language
- 📤 Export to CSV, Excel (`.xls`) or full JSON
- 🎨 Custom file icon (with Material Icon Theme support)

5. **Obsidian**:

- 📱 Same table UI on desktop and mobile, following your Obsidian theme (light, dark and community themes)
- 🔗 `[[Note]]` links in cells open the note; renaming a note updates the links in every table
- ⌨️ `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` work inside the table without taking over global hotkeys
- 🛟 A broken file (sync conflict, bad hand edit) shows an error instead of being overwritten

6. **Agent Friendly**:

- 🤖 Single-file JSON with a stable `id` per record — trivial for AI agents to read and write
- 🔄 External edits to the file are picked up live by the open table

# 🤖 Install with an AI Agent

Most people let their coding agent do it. Paste this into **Claude Code**, **Codex**, **Cursor** or any agent with a terminal:

```text
Install the Weilanx Base Table plugin for me (VS Code / Obsidian).
Follow https://github.com/Azure12355/weilanx-base-table/blob/main/docs/install-for-agents.md
and verify the install before reporting back.
```

Or run the installer yourself (macOS / Linux). It finds VS Code, Cursor, Windsurf and Insiders, installs into each, and verifies the result:

```bash
curl -fsSL https://raw.githubusercontent.com/Azure12355/weilanx-base-table/main/scripts/install.sh | bash
```

For Obsidian, pass your vault path:

```bash
curl -fsSL https://raw.githubusercontent.com/Azure12355/weilanx-base-table/main/scripts/install.sh | bash -s -- --obsidian "/path/to/vault"
```

> Only one editor? Add `BT_EDITOR=cursor` before `bash`. Agent-oriented steps, verification and troubleshooting live in [`docs/install-for-agents.md`](./docs/install-for-agents.md).

# 🚀 Quick Start

**VS Code**

1. Download [`weilanx-base-table.vsix`](https://github.com/Azure12355/weilanx-base-table/releases/latest/download/weilanx-base-table.vsix) from the latest release, or build it yourself (see [Development](#-development)).
2. In VS Code: Extensions panel → `···` → **Install from VSIX...**, or run `code --install-extension weilanx-base-table.vsix --force`
3. Open any `.wbase` file (try [`examples/选题库.wbase`](./examples/选题库.wbase)) or run **Base Table: Create Base Table (.wbase)** from the Command Palette.

**Obsidian**

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/Azure12355/weilanx-base-table/releases/latest) into `<vault>/.obsidian/plugins/weilanx-base-table/`, or install with [BRAT](https://github.com/TfTHacker/obsidian42-brat) using `Azure12355/weilanx-base-table`.
2. Enable **Weilanx Base Table** under Settings → Community plugins.
3. Open any `.wbase` file, or run **Create new base table** from the command palette.

> **Why `.wbase`?** Obsidian's core Bases plugin owns the `.base` extension. Older `.base` tables still open in VS Code; right-click one and choose **Convert to .wbase** to use it in Obsidian too.

# 📄 File Format

A `.wbase` file is a JSON document like this:

```json
{
  "fields": {
    "Title":  { "type": "text", "primary": true },
    "Status": { "type": "select", "options": ["Todo", "Doing", "Done"],
                "colors": { "Todo": "gray", "Doing": "blue", "Done": "green" } },
    "Tags":   { "type": "multi", "options": ["Docs", "Bug", "Feature"] },
    "Due":    { "type": "date" },
    "Notes":  { "type": "longtext" }
  },
  "views": [
    { "name": "All" },
    { "name": "Todo", "filters": [{ "field": "Status", "op": "is", "value": "Todo" }] },
    { "name": "Done", "filters": [{ "field": "Status", "op": "is", "value": "Done" }],
      "sorts": [{ "field": "Due", "dir": "desc" }] }
  ],
  "records": [
    { "id": "r_001", "Title": "Write the README", "Status": "Done",
      "Tags": ["Docs"], "Due": "2026-10-05", "Notes": "Follow the Cherry Studio layout." }
  ]
}
```

- **Field types**: `text` · `longtext` · `select` · `multi` · `date` · `number` · `checkbox` · `link`
- **Records** carry a stable `id`; every other key is a field value. Empty values are omitted.
- **Primary field** (`primary: true`) is a normal field marked as the title column; it cannot be deleted.
- **Filter ops**: `is` `isNot` `contains` `notContains` `empty` `notEmpty` `before` `after` `eq` `ne` `gt` `lt` `gte` `lte` `checked` `unchecked`
- **Sort dir**: `asc` / `desc`

# ⚙️ Settings

| Setting | Default | Description |
| --- | --- | --- |
| `baseTable.rowHeight` | `medium` | Default row height: `compact` / `medium` / `tall` |
| `baseTable.showRowNumbers` | `true` | Show the row number column |
| `baseTable.fontSize` | `0` | Cell font size in px, `0` follows the editor |
| `baseTable.colorfulTags` | `true` | Colored tags for select options |
| `baseTable.wrapText` | `false` | Wrap text in cells instead of truncating |

# 🔧 Development

```bash
npm install
npm run build        # webview (vite) + extension (esbuild)
npm test             # data layer unit tests
npm run typecheck

npm run package            # build + produce weilanx-base-table.vsix
npm run build:obsidian     # Obsidian plugin -> dist/obsidian/{main.js,manifest.json,styles.css}
npm run dev:obsidian -- --out "/path/to/vault/.obsidian/plugins/weilanx-base-table"   # rebuild on change
```

Press **F5** in VS Code to launch an Extension Development Host, then open `examples/选题库.wbase`.

Code layout: `src/core` (format and edit operations, shared), `webview/src` (table UI, shared), `src/vscode` and `src/obsidian` (host shells).

# 📝 Roadmap

- 🗃 Kanban, calendar and gallery views
- 🔗 Linked records across tables
- 🧮 Formula fields
- 🌐 Localize the in-table UI (toolbar, panels) in English
- 📝 Embed a table in a note with `![[table.wbase]]` (Obsidian)
- 🏪 Publish to the Obsidian community plugin directory

# 🤝 Contributing

Issues and pull requests are welcome! Please run `npm test` and `npm run typecheck` before submitting a PR.

# 📜 License

[MIT](./LICENSE) © Azure12355

<!-- badges -->
[vscode-shield]: https://img.shields.io/badge/VS%20Code-%5E1.90-007ACC?logo=visualstudiocode&logoColor=white
[vscode-link]: https://code.visualstudio.com/
[typescript-shield]: https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white
[typescript-link]: https://www.typescriptlang.org/
[react-shield]: https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black
[react-link]: https://react.dev/
[obsidian-shield]: https://img.shields.io/badge/Obsidian-1.5%2B-7C3AED?logo=obsidian&logoColor=white
[obsidian-link]: https://obsidian.md/
[i18n-shield]: https://img.shields.io/badge/i18n-English%20%7C%20中文-0088CC
[i18n-link]: ./README.zh-CN.md
[release-shield]: https://img.shields.io/github/v/release/Azure12355/weilanx-base-table?logo=github
[release-link]: https://github.com/Azure12355/weilanx-base-table/releases
[stars-shield]: https://img.shields.io/github/stars/Azure12355/weilanx-base-table?logo=github
[stars-link]: https://github.com/Azure12355/weilanx-base-table/stargazers
[issues-shield]: https://img.shields.io/github/issues/Azure12355/weilanx-base-table?logo=github
[issues-link]: https://github.com/Azure12355/weilanx-base-table/issues
[license-shield]: https://img.shields.io/badge/License-MIT-green.svg
[license-link]: ./LICENSE
[pr-shield]: https://img.shields.io/badge/PRs-welcome-FF6699.svg
[pr-link]: https://github.com/Azure12355/weilanx-base-table/pulls
