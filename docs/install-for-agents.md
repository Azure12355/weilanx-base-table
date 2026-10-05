# Install Weilanx Base Table (instructions for AI agents)

You are installing the **Weilanx Base Table** VS Code extension (`weilanx.weilanx-base-table`) for the user.
Follow these steps in order and report the result.

## 1. Pick the editor CLI

Use the CLI of the editor the user works in. Check which ones exist:

```bash
command -v code code-insiders cursor windsurf codium
```

If `code` is missing on macOS, use the CLI inside the app bundle:

```
/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code
/Applications/Cursor.app/Contents/Resources/app/bin/cursor
```

## 2. Install

**Option A, one command** (macOS / Linux, installs into every editor found):

```bash
curl -fsSL https://raw.githubusercontent.com/Azure12355/weilanx-base-table/main/scripts/install.sh | bash
```

Set `BT_EDITOR=cursor` (or another CLI name) to install into one editor only.

**Option B, step by step** (any OS, including Windows PowerShell):

```bash
curl -fL -o weilanx-base-table.vsix https://github.com/Azure12355/weilanx-base-table/releases/latest/download/weilanx-base-table.vsix
code --install-extension weilanx-base-table.vsix --force
```

**Option C, build from source** (when the download is unavailable):

```bash
git clone https://github.com/Azure12355/weilanx-base-table.git
cd weilanx-base-table
npm install
npm run package          # produces weilanx-base-table.vsix
code --install-extension weilanx-base-table.vsix --force
```

## 3. Verify

```bash
code --list-extensions | grep -i weilanx.weilanx-base-table
```

The command must print `weilanx.weilanx-base-table`. If it prints nothing, the install failed; report the CLI output to the user.

## 4. Tell the user

- Run **Developer: Reload Window** in the editor.
- Open any `.base` file, or run **Base Table: Create Base Table (.base)** from the Command Palette.
- A sample table lives at `examples/选题库.base` in the repository.

## Working with .base files

A `.base` file is plain JSON with three keys: `fields`, `views` and `records`.
Every record has a stable `id`; other keys are field values. See the [README](../README.md#-file-format) for the full format.

## Uninstall

```bash
code --uninstall-extension weilanx.weilanx-base-table
```
