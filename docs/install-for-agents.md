# Install Weilanx Base Table (instructions for AI agents)

You are installing **Weilanx Base Table** for the user. It exists for two hosts:

- **VS Code** and VS Code based editors (Cursor, Windsurf, Insiders, VSCodium): extension id `weilanx.weilanx-base-table`. Follow sections 1 to 4.
- **Obsidian** (desktop and mobile): plugin id `weilanx-base-table`. Jump to [Obsidian](#obsidian).

If the user did not say which one, check what they use (an Obsidian vault has a `.obsidian/` folder) or ask. Follow the steps in order and report the result.

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
- Open any `.wbase` file (older `.base` files also open; right-click one and choose **Convert to .wbase** to share it with Obsidian), or run **Base Table: Create Base Table (.wbase)** from the Command Palette.
- A sample table lives at `examples/选题库.wbase` in the repository.

## Obsidian

1. Find the vault path (the folder that contains `.obsidian/`). Ask the user if you cannot tell.
2. **macOS / Linux, one command:**

   ```bash
   curl -fsSL https://raw.githubusercontent.com/Azure12355/weilanx-base-table/main/scripts/install.sh | bash -s -- --obsidian "/path/to/vault"
   ```

   **Manual (any OS):** download these three files from the latest release into `<vault>/.obsidian/plugins/weilanx-base-table/`:

   ```
   https://github.com/Azure12355/weilanx-base-table/releases/latest/download/main.js
   https://github.com/Azure12355/weilanx-base-table/releases/latest/download/manifest.json
   https://github.com/Azure12355/weilanx-base-table/releases/latest/download/styles.css
   ```

   then add `"weilanx-base-table"` to the JSON array in `<vault>/.obsidian/community-plugins.json` (create the file as `["weilanx-base-table"]` if it does not exist).
3. **Verify:** the three files exist in the plugin folder and `community-plugins.json` contains the id.
4. **Tell the user:** restart Obsidian (or toggle the plugin under Settings → Community plugins). If Restricted mode is on, they must turn it off first. Then open any `.wbase` file, or run **Create new base table** from the command palette.

For a phone, install on desktop first and let Obsidian Sync / iCloud copy the plugin folder, or use the BRAT plugin with the repository URL `Azure12355/weilanx-base-table`.

## Working with .wbase files

A `.wbase` file (older versions: `.base`) is plain JSON with three keys: `fields`, `views` and `records`.
Every record has a stable `id`; other keys are field values. See the [README](../README.md#-file-format) for the full format.

## Uninstall

```bash
code --uninstall-extension weilanx.weilanx-base-table          # VS Code
rm -rf "/path/to/vault/.obsidian/plugins/weilanx-base-table"   # Obsidian (also remove the id from community-plugins.json)
```
